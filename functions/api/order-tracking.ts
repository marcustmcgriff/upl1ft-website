import { createClient } from "@supabase/supabase-js";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PRINTFUL_API_TOKEN: string;
}

const PRINTFUL_STORE_ID = "17677297";
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
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PRINTFUL_API_TOKEN } =
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
        .select("id, status, tracking_number, tracking_url, carrier, printful_order_id, items, created_at, shipping_name, total, subtotal, shipping, discount_amount, discount_code")
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
        .select("id, status, tracking_number, tracking_url, carrier, printful_order_id, items, created_at, shipping_name, total, subtotal, shipping, discount_amount, discount_code")
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

    // If no Printful order ID, return current order data
    if (!order.printful_order_id) {
      return new Response(
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
    }

    // Fetch tracking from Printful
    const printfulResponse = await fetch(
      `https://api.printful.com/orders/${order.printful_order_id}`,
      {
        headers: {
          Authorization: `Bearer ${PRINTFUL_API_TOKEN}`,
          "X-PF-Store-Id": PRINTFUL_STORE_ID,
        },
      }
    );

    if (!printfulResponse.ok) {
      console.error("Printful tracking fetch failed:", printfulResponse.status);
      return new Response(
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
    }

    const printfulData = (await printfulResponse.json()) as any;
    const printfulOrder = printfulData.result;

    // Map Printful status to our status
    let newStatus = order.status;
    const printfulStatus = printfulOrder?.status;

    if (printfulStatus === "fulfilled" || printfulStatus === "shipped") {
      newStatus = "shipped";
    } else if (printfulStatus === "canceled" || printfulStatus === "cancelled") {
      newStatus = "cancelled";
    } else if (
      printfulStatus === "inprocess" ||
      printfulStatus === "pending"
    ) {
      newStatus = "processing";
    }

    // Extract tracking info from shipments
    let trackingNumber = order.tracking_number;
    let trackingUrl = order.tracking_url;
    let carrier = order.carrier;
    let shipDate: string | null = null;
    let estimatedDelivery: string | null = null;

    if (printfulOrder?.shipments && printfulOrder.shipments.length > 0) {
      const shipment = printfulOrder.shipments[0];
      trackingNumber = shipment.tracking_number || trackingNumber;
      trackingUrl = shipment.tracking_url || trackingUrl;
      carrier = shipment.carrier || carrier;
      shipDate = shipment.ship_date || null;
      estimatedDelivery = shipment.estimated_delivery || null;

      // Compute estimated delivery as ship_date + 7 business days if not provided
      if (shipDate && !estimatedDelivery) {
        const ship = new Date(shipDate);
        let businessDays = 0;
        const est = new Date(ship);
        while (businessDays < 7) {
          est.setDate(est.getDate() + 1);
          const day = est.getDay();
          if (day !== 0 && day !== 6) businessDays++;
        }
        estimatedDelivery = est.toISOString().split("T")[0];
      }

      if (shipment.ship_date) {
        newStatus = "shipped";
      }
    }

    // Update order in Supabase if anything changed
    if (
      newStatus !== order.status ||
      trackingNumber !== order.tracking_number ||
      trackingUrl !== order.tracking_url ||
      carrier !== order.carrier
    ) {
      await supabase
        .from("orders")
        .update({
          status: newStatus,
          tracking_number: trackingNumber,
          tracking_url: trackingUrl,
          carrier: carrier,
        })
        .eq("id", order.id);
    }

    return new Response(
      JSON.stringify({
        status: newStatus,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        carrier: carrier,
        ship_date: shipDate,
        estimated_delivery: estimatedDelivery,
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
