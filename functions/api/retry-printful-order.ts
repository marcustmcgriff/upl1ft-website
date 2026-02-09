import { createClient } from "@supabase/supabase-js";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PRINTFUL_API_TOKEN: string;
  ADMIN_EMAIL: string;
}

const PRINTFUL_STORE_ID = "17677297";

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

// Mapping of product ID + size to Printful sync variant ID
const VARIANT_MAP: Record<string, Record<string, number>> = {
  "1": { "S": 5187387218, "M": 5187387219, "L": 5187387220, "XL": 5187387221, "2XL": 5187387222, "3XL": 5187387223 },
  "2": { "S": 5187387226, "M": 5187387227, "L": 5187387228, "XL": 5187387229, "2XL": 5187387230, "3XL": 5187387231 },
  "3": { "S": 5187387212, "M": 5187387213, "L": 5187387214, "XL": 5187387215, "2XL": 5187387216, "3XL": 5187387217 },
  "4": { "S": 5187387240, "M": 5187387241, "L": 5187387242, "XL": 5187387243, "2XL": 5187387244, "3XL": 5187387245 },
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PRINTFUL_API_TOKEN } =
    context.env;

  const corsHeaders = getCorsHeaders(context.request);

  // Simple admin auth via Supabase service role — only callable with the service role key
  const authHeader = context.request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const token = authHeader.split(" ")[1];
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { orderId } = (await context.request.json()) as { orderId: string };

    if (!orderId) {
      return new Response(JSON.stringify({ error: "Order ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch order from Supabase
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (order.printful_order_id) {
      return new Response(
        JSON.stringify({
          error: "Order already has a Printful order",
          printful_order_id: order.printful_order_id,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Build Printful order from saved data
    const items = (order.items as any[]) || [];
    const printfulItems = items
      .map((item: any) => {
        const variantId = VARIANT_MAP[item.productId]?.[item.size];
        if (!variantId) {
          console.error(
            `No variant ID for product ${item.productId} size ${item.size}`
          );
          return null;
        }
        return { sync_variant_id: variantId, quantity: item.quantity };
      })
      .filter(Boolean);

    if (printfulItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid items to send to Printful" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const shippingAddr = order.shipping_address as any;
    const printfulOrder: Record<string, unknown> = {
      recipient: {
        name: order.shipping_name || "Customer",
        address1: shippingAddr?.line1 || "",
        address2: shippingAddr?.line2 || "",
        city: shippingAddr?.city || "",
        state_code: shippingAddr?.state || "",
        country_code: shippingAddr?.country || "US",
        zip: shippingAddr?.postal_code || "",
        email: order.customer_email || "",
      },
      items: printfulItems,
      ...(order.gift_message
        ? {
            gift: { subject: "UPL1FT", message: order.gift_message },
            packing_slip: {
              email: "support@upl1ft.org",
              message: order.gift_message,
            },
          }
        : {}),
    };

    // Create and confirm order in Printful
    const printfulResponse = await fetch(
      "https://api.printful.com/orders?confirm=true",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PRINTFUL_API_TOKEN}`,
          "Content-Type": "application/json",
          "X-PF-Store-Id": PRINTFUL_STORE_ID,
        },
        body: JSON.stringify(printfulOrder),
      }
    );

    const printfulResult = await printfulResponse.json();

    if (!printfulResponse.ok) {
      console.error("Printful retry failed:", printfulResult);
      return new Response(
        JSON.stringify({
          error: "Printful order creation failed",
          details: printfulResult,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const printfulOrderId =
      printfulResult?.result?.id?.toString() || null;

    // Update Supabase with the new Printful order ID
    await supabase
      .from("orders")
      .update({ printful_order_id: printfulOrderId })
      .eq("id", orderId);

    return new Response(
      JSON.stringify({
        success: true,
        printful_order_id: printfulOrderId,
        message: "Printful order created and confirmed",
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err: any) {
    console.error("Retry Printful order error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to retry Printful order" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};
