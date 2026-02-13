import { createClient } from "@supabase/supabase-js";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  PRINTFUL_WEBHOOK_SECRET?: string;
  SITE_URL: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getCarrierTrackingUrl(carrier: string, trackingNumber: string, trackingUrl?: string): string {
  if (trackingUrl) return trackingUrl;
  const c = carrier.toLowerCase();
  if (c.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  if (c.includes("dhl")) return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
  return `https://www.google.com/search?q=${encodeURIComponent(carrier + " tracking " + trackingNumber)}`;
}

function buildShippedEmailHtml(data: {
  shippingName: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  shipDate: string | null;
  estimatedDelivery: string | null;
  items: any[];
  trackingToken: string;
  siteUrl: string;
}): string {
  const carrierTrackingUrl = getCarrierTrackingUrl(data.carrier, data.trackingNumber, data.trackingUrl);

  const itemsHtml = data.items
    .map((item: any) => {
      const imageUrl = item.image
        ? (item.image.startsWith("http") ? item.image : `${data.siteUrl}${item.image}`)
        : "";
      const imageHtml = imageUrl
        ? `<td style="padding: 12px 12px 12px 0; border-bottom: 1px solid #333; vertical-align: top; width: 64px;">
            <img src="${imageUrl}" alt="${escapeHtml(item.name)}" width="64" height="64" style="display: block; border-radius: 4px; object-fit: cover;" />
          </td>`
        : "";
      return `
      <tr>
        ${imageHtml}
        <td style="padding: 12px 0; border-bottom: 1px solid #333; vertical-align: top;">
          <strong style="color: #C8A24A;">${escapeHtml(item.name)}</strong><br/>
          <span style="color: #999; font-size: 13px;">Size: ${escapeHtml(item.size)} / Color: ${escapeHtml(item.color)} &times; ${item.quantity}</span>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #333; text-align: right; vertical-align: top; color: #E8E3D7;">
          ${formatCents(item.price * item.quantity)}
        </td>
      </tr>`;
    })
    .join("");

  const shipDateHtml = data.shipDate
    ? `<div style="padding: 8px 0; border-bottom: 1px solid #222;">
        <span style="color: #999; font-size: 13px;">Shipped</span><br/>
        <span style="color: #E8E3D7; font-size: 14px;">${formatDate(data.shipDate)}</span>
      </div>`
    : "";

  const estDeliveryHtml = data.estimatedDelivery
    ? `<div style="padding: 8px 0;">
        <span style="color: #999; font-size: 13px;">Estimated Delivery</span><br/>
        <span style="color: #C8A24A; font-size: 14px; font-weight: bold;">${formatDate(data.estimatedDelivery)}</span>
      </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 28px; letter-spacing: 4px; color: #C8A24A; margin: 0;">UPL1FT</h1>
      <p style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px;">Rise Above. Walk In Purpose.</p>
    </div>

    <!-- Shipped Banner -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="font-size: 48px; margin-bottom: 12px;">&#128666;</div>
      <h2 style="color: #C8A24A; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; margin: 0;">Your Order Has Shipped</h2>
      <p style="color: #999; margin-top: 8px;">Your gear is on its way, ${escapeHtml(data.shippingName.split(" ")[0])}.</p>
    </div>

    <!-- Tracking Info — stacked layout for mobile -->
    <div style="background: #111; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #C8A24A; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px 0;">Shipment Details</h3>
      <div style="padding: 8px 0; border-bottom: 1px solid #222;">
        <span style="color: #999; font-size: 13px;">Carrier</span><br/>
        <span style="color: #E8E3D7; font-size: 14px;">${escapeHtml(data.carrier)}</span>
      </div>
      <div style="padding: 8px 0; border-bottom: 1px solid #222;">
        <span style="color: #999; font-size: 13px;">Tracking Number</span><br/>
        <a href="${carrierTrackingUrl}" style="color: #C8A24A; font-family: monospace; font-size: 14px; text-decoration: none; word-break: break-all;">${escapeHtml(data.trackingNumber)}</a>
      </div>
      ${shipDateHtml}
      ${estDeliveryHtml}
    </div>

    <!-- Order Items -->
    <div style="background: #111; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #C8A24A; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px 0;">What's In Your Package</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${itemsHtml}
      </table>
    </div>

    <!-- Track Order CTA -->
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${carrierTrackingUrl}" style="display: inline-block; background: #C8A24A; color: #000; padding: 16px 40px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 14px;">Track Your Order</a>
    </div>

    <!-- Continue Shopping -->
    <div style="text-align: center; margin-bottom: 40px;">
      <a href="${data.siteUrl}/shop" style="color: #C8A24A; text-decoration: none; font-size: 14px; letter-spacing: 1px;">Continue Shopping &rarr;</a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; border-top: 1px solid #222; padding-top: 24px;">
      <p style="color: #666; font-size: 12px; margin: 0;">
        UPL1FT &mdash; Faith-Forward Streetwear<br/>
        <a href="${data.siteUrl}" style="color: #C8A24A; text-decoration: none;">upl1ft.org</a>
      </p>
      <p style="color: #444; font-size: 11px; margin-top: 12px;">
        &ldquo;For we walk by faith, not by sight.&rdquo; &mdash; 2 Corinthians 5:7
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildDeliveredEmailHtml(data: {
  shippingName: string;
  items: any[];
  trackingToken: string;
  siteUrl: string;
}): string {
  const itemsHtml = data.items
    .map((item: any) => {
      const imageUrl = item.image
        ? (item.image.startsWith("http") ? item.image : `${data.siteUrl}${item.image}`)
        : "";
      const imageHtml = imageUrl
        ? `<td style="padding: 10px 12px 10px 0; border-bottom: 1px solid #333; vertical-align: top; width: 64px;">
            <img src="${imageUrl}" alt="${escapeHtml(item.name)}" width="64" height="64" style="display: block; border-radius: 4px; object-fit: cover;" />
          </td>`
        : "";
      return `
      <tr>
        ${imageHtml}
        <td style="padding: 10px 0; border-bottom: 1px solid #333; vertical-align: top;">
          <strong style="color: #C8A24A;">${escapeHtml(item.name)}</strong><br/>
          <span style="color: #999; font-size: 13px;">Size: ${escapeHtml(item.size)}</span>
        </td>
      </tr>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 28px; letter-spacing: 4px; color: #C8A24A; margin: 0;">UPL1FT</h1>
      <p style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px;">Rise Above. Walk In Purpose.</p>
    </div>

    <!-- Delivered Banner -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="font-size: 48px; margin-bottom: 12px;">&#10003;</div>
      <h2 style="color: #C8A24A; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; margin: 0;">Your Order Has Arrived</h2>
      <p style="color: #999; margin-top: 8px;">Wear it with purpose, ${escapeHtml(data.shippingName.split(" ")[0])}.</p>
    </div>

    <!-- Items Delivered -->
    <div style="background: #111; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #C8A24A; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px 0;">What Was Delivered</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${itemsHtml}
      </table>
    </div>

    <!-- Shop More CTA -->
    <div style="text-align: center; margin-bottom: 16px;">
      <a href="${data.siteUrl}/shop" style="display: inline-block; background: #C8A24A; color: #000; padding: 16px 40px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 14px;">Explore New Drops</a>
    </div>

    <div style="text-align: center; margin-bottom: 40px;">
      <a href="${data.siteUrl}/orders/track?token=${data.trackingToken}" style="color: #C8A24A; text-decoration: none; font-size: 14px; letter-spacing: 1px;">View Order Details &rarr;</a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; border-top: 1px solid #222; padding-top: 24px;">
      <p style="color: #666; font-size: 12px; margin: 0;">
        UPL1FT &mdash; Faith-Forward Streetwear<br/>
        <a href="${data.siteUrl}" style="color: #C8A24A; text-decoration: none;">upl1ft.org</a>
      </p>
      <p style="color: #444; font-size: 11px; margin-top: 12px;">
        &ldquo;For we walk by faith, not by sight.&rdquo; &mdash; 2 Corinthians 5:7
      </p>
    </div>
  </div>
</body>
</html>`;
}

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

    // Check if status actually changed (avoid duplicate emails)
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

    // Send notification email if status changed to shipped
    if (statusChanged && newStatus === "shipped" && order.customer_email && trackingNumber) {
      const siteUrl = env.SITE_URL || "https://upl1ft.org";

      try {
        const emailHtml = buildShippedEmailHtml({
          shippingName: order.shipping_name || "Customer",
          carrier: carrier || "Standard Shipping",
          trackingNumber,
          trackingUrl,
          shipDate,
          estimatedDelivery,
          items: order.items || [],
          trackingToken: order.tracking_token,
          siteUrl,
        });

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "UPL1FT <orders@upl1ft.org>",
            to: [order.customer_email],
            subject: "Your Order Has Shipped — UPL1FT",
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          console.log("Shipment notification email sent to:", order.customer_email);
        } else {
          console.error("Shipment email failed:", await emailResponse.text());
        }
      } catch (emailErr: any) {
        console.error("Failed to send shipment email:", emailErr.message);
      }
    }

    // Send delivered email if status changed to delivered
    if (statusChanged && newStatus === "delivered" && order.customer_email) {
      const siteUrl = env.SITE_URL || "https://upl1ft.org";

      try {
        const emailHtml = buildDeliveredEmailHtml({
          shippingName: order.shipping_name || "Customer",
          items: order.items || [],
          trackingToken: order.tracking_token,
          siteUrl,
        });

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "UPL1FT <orders@upl1ft.org>",
            to: [order.customer_email],
            subject: "Your Order Has Arrived — UPL1FT",
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          console.log("Delivery notification email sent to:", order.customer_email);
        } else {
          console.error("Delivery email failed:", await emailResponse.text());
        }
      } catch (emailErr: any) {
        console.error("Failed to send delivery email:", emailErr.message);
      }
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
