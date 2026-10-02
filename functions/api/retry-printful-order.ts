import { createClient } from "@supabase/supabase-js";
import { createOrder, isPrintifyOrderId, resolveLineItems, sendToProductionWhenReady } from "./_printify";

// Admin-only repair tool for an order whose Printify side did not go through.
//   - The order has no Printify order yet: create it (the Stripe session id is the
//     external id, so if Printify already has one for this payment it is reused).
//   - The order already has one: make sure it has been sent to production.
// The route keeps its old name (/api/retry-printful-order) so existing admin tooling
// keeps working.
//
// POST { orderId: "<orders.id>", allowPartial?: boolean }
//   allowPartial: order the available lines even if others are sold out.

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PRINTIFY_API_TOKEN: string;
  PRINTIFY_SHOP_ID?: string;
  ADMIN_EMAIL: string;
}

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = origin === "https://upl1ft.org" ? origin : "https://upl1ft.org";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export const onRequestOptions: PagesFunction<Env> = async (context) => {
  return new Response(null, { headers: getCorsHeaders(context.request) });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = context.env;

  const corsHeaders = getCorsHeaders(context.request);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  // Only the signed-in admin may call this.
  const authHeader = context.request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const token = authHeader.split(" ")[1];
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return json({ error: "Invalid token" }, 401);
  }

  const adminEmail = context.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) {
    return json({ error: "Admin access required" }, 403);
  }

  if (!context.env.PRINTIFY_API_TOKEN) {
    return json({ error: "Printify not configured" }, 500);
  }

  try {
    const body = (await context.request.json()) as { orderId?: string; allowPartial?: boolean };
    const orderId = body.orderId;
    if (!orderId) {
      return json({ error: "Order ID required" }, 400);
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return json({ error: "Order not found" }, 404);
    }
    if (order.status === "cancelled") {
      return json({ error: "This order is cancelled. Nothing was sent to Printify." }, 409);
    }

    const markProcessing = async () => {
      await supabase
        .from("orders")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", orderId)
        .eq("status", "confirmed");
    };

    // ---- Already linked: make sure it is in production ----
    if (order.printful_order_id) {
      if (!isPrintifyOrderId(order.printful_order_id)) {
        return json(
          { error: "This order was fulfilled by the previous supplier and cannot be retried.", printful_order_id: order.printful_order_id },
          400
        );
      }
      const submitted = await sendToProductionWhenReady(context.env, order.printful_order_id, 12000);
      if (submitted.state === "sent" || submitted.state === "already_sent") await markProcessing();
      return json({
        success: submitted.state === "sent" || submitted.state === "already_sent",
        printful_order_id: order.printful_order_id,
        production: submitted.state,
        printify_status: submitted.printifyStatus,
        detail: submitted.detail,
      });
    }

    // ---- Not linked: create (or find) the Printify order ----
    const items = Array.isArray(order.items) ? (order.items as any[]) : [];
    const resolved = await resolveLineItems(
      context.env,
      items.map((item: any) => ({
        productId: String(item.productId),
        size: String(item.size),
        color: String(item.color),
        quantity: Number(item.quantity) || 1,
      }))
    );

    if (resolved.unknown.length > 0) {
      return json({ error: "Printify could not be reached. Try again in a few minutes.", detail: resolved.unknownDetail }, 503);
    }
    if (resolved.lineItems.length === 0) {
      return json({ error: "None of the items can be ordered right now.", unavailable: resolved.unavailable }, 409);
    }
    if (resolved.unavailable.length > 0 && !body.allowPartial) {
      return json(
        {
          error: "Some items cannot be ordered right now. Send allowPartial: true to order the rest.",
          unavailable: resolved.unavailable,
        },
        409
      );
    }

    const shippingAddr = (order.shipping_address || {}) as any;
    const created = await createOrder(context.env, {
      // Same external id as the payment handler, so Printify returns the existing
      // order instead of making a second one if it already has it.
      externalId: order.stripe_session_id || `order-${order.id}`,
      label: `UPL1FT ${String(order.stripe_session_id || order.id).slice(-8)}`,
      lineItems: resolved.lineItems,
      address: {
        name: order.shipping_name || "Customer",
        email: order.customer_email || "",
        line1: shippingAddr.line1 || "",
        line2: shippingAddr.line2 || "",
        city: shippingAddr.city || "",
        state: shippingAddr.state || "",
        postal_code: shippingAddr.postal_code || "",
        country: shippingAddr.country || "US",
      },
    });

    if (!created.id) {
      return json({ error: "Printify order creation failed", detail: created.error }, created.transient ? 503 : 502);
    }

    // Link it only if nobody else has in the meantime.
    const { error: linkError } = await supabase
      .from("orders")
      .update({ printful_order_id: created.id, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .is("printful_order_id", null);
    if (linkError) {
      return json(
        { error: "The Printify order exists but could not be saved on the site order. Run this again.", printful_order_id: created.id },
        500
      );
    }

    const submitted = await sendToProductionWhenReady(context.env, created.id);
    const inProduction = submitted.state === "sent" || submitted.state === "already_sent";
    const waiting = submitted.state === "not_ready";
    if (inProduction) await markProcessing();

    let message: string;
    if (inProduction) {
      message = "Printify order is in production";
    } else if (waiting) {
      message = "Printify order exists. It goes to production once Printify finishes preparing it (run this again in a minute to check).";
    } else if (submitted.state === "error") {
      message = "Printify order exists, but Printify could not be reached to send it to production. Run this again in a minute.";
    } else {
      // blocked or refused: cancelled in Printify, a payment problem, or a refusal.
      message = `Printify order ${created.id} exists but cannot go to production${submitted.detail ? ` (${submitted.detail})` : ""}. Open it in Printify. If it is cancelled there, a new order for this payment has to be made by hand in Printify.`;
    }

    return json(
      {
        success: inProduction || waiting,
        printful_order_id: created.id,
        reused_existing_order: created.adopted,
        production: submitted.state,
        printify_status: submitted.printifyStatus,
        detail: submitted.detail,
        not_ordered: resolved.unavailable,
        message,
      },
      inProduction || waiting ? 200 : submitted.state === "error" ? 503 : 409
    );
  } catch (err: any) {
    console.error("Retry Printify order error:", err?.message || String(err));
    return json({ error: "Internal error" }, 500);
  }
};
