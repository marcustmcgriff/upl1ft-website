import { createClient } from "@supabase/supabase-js";
import { deriveOrderState, getOrder, isPrintifyOrderId } from "./_printify";
import { applyOrderUpdate, type SyncRow } from "./_order-sync";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PRINTIFY_API_TOKEN: string;
  PRINTIFY_SHOP_ID?: string;
  RESEND_API_KEY?: string;
  ADMIN_EMAIL?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } =
    context.env;

  const corsHeaders = getCorsHeaders(context.request);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = (await context.request.json()) as {
      orderId?: string;
      trackingToken?: string;
    };

    let order: any = null;
    let orderError: any = null;

    const authHeader = context.request.headers.get("Authorization");

    if (body.trackingToken) {
      // Validate token format before querying
      if (!UUID_REGEX.test(body.trackingToken)) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Guest tracking: lookup by tracking token (no auth required)
      const result = await supabase
        .from("orders")
        .select("id, status, tracking_number, tracking_url, carrier, printful_order_id, items, created_at, shipping_name, total, subtotal, shipping, discount_amount, discount_code, customer_email, tracking_token")
        .eq("tracking_token", body.trackingToken)
        .single();
      order = result.data;
      orderError = result.error;
    } else if (authHeader) {
      // Authenticated tracking: verify user owns the order
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
      } = await supabase.auth.getUser(token);

      if (!user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (!body.orderId) {
        return new Response(
          JSON.stringify({ error: "Order ID required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      const result = await supabase
        .from("orders")
        .select("id, status, tracking_number, tracking_url, carrier, printful_order_id, items, created_at, shipping_name, total, subtotal, shipping, discount_amount, discount_code, customer_email, tracking_token")
        .eq("id", body.orderId)
        .eq("user_id", user.id)
        .single();
      order = result.data;
      orderError = result.error;
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Build shared order detail fields
    const orderDetails = {
      items: order.items || [],
      created_at: order.created_at,
      shipping_name: order.shipping_name,
      total: order.total,
      subtotal: order.subtotal,
      shipping: order.shipping,
      discount_amount: order.discount_amount,
      discount_code: order.discount_code,
    };

    // What is stored, for when Printify has nothing newer to say.
    const stored = () =>
      new Response(
        JSON.stringify({
          status: order.status,
          tracking_number: order.tracking_number,
          tracking_url: order.tracking_url,
          carrier: order.carrier,
          ship_date: null,
          estimated_delivery: null,
          ...orderDetails,
        }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );

    // The printful_order_id column holds the Printify order id. Orders made before the
    // supplier change hold a Printful id (digits only), which Printify cannot look up.
    if (!context.env.PRINTIFY_API_TOKEN || !isPrintifyOrderId(order.printful_order_id)) {
      return stored();
    }

    // The customer is waiting for the page: one short try, then what is stored.
    const fetched = await getOrder(context.env, order.printful_order_id, { timeoutMs: 4000, retry: false });
    if (!fetched.ok || !fetched.data) {
      return stored();
    }

    // The same reading of the Printify order, and the same write, that the Printify
    // webhook uses. Several parcels are handled, "delivered" comes from the parcels,
    // an order never moves backwards, and if this view is the first to notice that the
    // order shipped or arrived, the customer still gets the email.
    const state = deriveOrderState(fetched.data);
    const update = applyOrderUpdate(supabase, context.env, order as SyncRow, {
      derivedStatus: state.status,
      trackingNumber: state.shipment?.number || null,
      trackingUrl: state.shipment?.url || null,
      carrier: state.shipment?.carrier || null,
      parcelShipDate: state.shipmentShippedAt,
      parcelIsLatest: state.shipmentIsLatest,
      shipDate: state.shipDate,
      estimatedDelivery: state.estimatedDelivery,
    });
    // The write and its email must finish even if the visitor closes the page first.
    context.waitUntil(update.then(() => undefined, () => undefined));
    const applied = await update;

    return new Response(
      JSON.stringify({
        status: applied.status,
        tracking_number: applied.trackingNumber,
        tracking_url: applied.trackingUrl,
        carrier: applied.carrier,
        ship_date: state.shipDate,
        estimated_delivery: state.estimatedDelivery,
        ...orderDetails,
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err: any) {
    console.error("Order tracking error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch tracking info" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};
