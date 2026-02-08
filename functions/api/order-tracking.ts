import { createClient } from "@supabase/supabase-js";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PRINTFUL_API_TOKEN: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PRINTFUL_API_TOKEN } =
    context.env;

  const origin = context.request.headers.get("Origin") || "";
  const allowedOrigin = origin === "https://upl1ft.org" ? origin : "https://upl1ft.org";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = context.request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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

    const { orderId } = (await context.request.json()) as {
      orderId: string;
    };

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Order ID required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Fetch order from Supabase (verify ownership)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // If no Printful order ID, return current order data
    if (!order.printful_order_id) {
      return new Response(
        JSON.stringify({
          status: order.status,
          tracking_number: order.tracking_number,
          tracking_url: order.tracking_url,
          carrier: order.carrier,
        }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Fetch tracking from Printful
    const printfulResponse = await fetch(
      `https://api.printful.com/orders/@${order.printful_order_id}`,
      {
        headers: {
          Authorization: `Bearer ${PRINTFUL_API_TOKEN}`,
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

    if (printfulOrder?.shipments && printfulOrder.shipments.length > 0) {
      const shipment = printfulOrder.shipments[0];
      trackingNumber = shipment.tracking_number || trackingNumber;
      trackingUrl = shipment.tracking_url || trackingUrl;
      carrier = shipment.carrier || carrier;

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
        .eq("id", orderId);
    }

    return new Response(
      JSON.stringify({
        status: newStatus,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        carrier: carrier,
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
