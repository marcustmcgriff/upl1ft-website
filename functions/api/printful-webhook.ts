import { createClient } from "@supabase/supabase-js";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PRINTFUL_WEBHOOK_SECRET?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    const body = (await context.request.json()) as any;
    const eventType = body.type;

    console.log("Printful webhook received:", eventType);

    // Only handle shipment events
    if (eventType !== "package_shipped" && eventType !== "order_updated") {
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const printfulOrder = body.data?.order;
    const shipment = body.data?.shipment;

    if (!printfulOrder) {
      console.error("No order data in Printful webhook");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const printfulOrderId = printfulOrder.id?.toString();
    if (!printfulOrderId) {
      console.error("No Printful order ID in webhook");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Look up our order by Printful order ID
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("printful_order_id", printfulOrderId)
      .single();

    if (orderError || !order) {
      console.error("Order not found for Printful ID:", printfulOrderId);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Determine new status
    let newStatus = order.status;
    const printfulStatus = printfulOrder.status?.toLowerCase();

    if (eventType === "package_shipped" || printfulStatus === "fulfilled" || printfulStatus === "shipped") {
      newStatus = "shipped";
    } else if (printfulStatus === "canceled" || printfulStatus === "cancelled") {
      newStatus = "cancelled";
    }

    // Extract tracking info from shipment
    const trackingNumber = shipment?.tracking_number || order.tracking_number;
    const trackingUrl = shipment?.tracking_url || order.tracking_url;
    const carrier = shipment?.carrier || order.carrier;
    const shipDate = shipment?.ship_date || null;
    let estimatedDelivery = shipment?.estimated_delivery || null;

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

    // Check if status or tracking actually changed
    const statusChanged = newStatus !== order.status;
    const trackingChanged = trackingNumber !== order.tracking_number;

    // Update order in Supabase
    if (statusChanged || trackingChanged) {
      await supabase
        .from("orders")
        .update({
          status: newStatus,
          tracking_number: trackingNumber,
          tracking_url: trackingUrl,
          carrier: carrier,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      console.log(`Order ${order.id} updated: ${order.status} → ${newStatus}`);
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("Printful webhook error:", err.message);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};
