/**
 * One-time test: sends a sample shipment email.
 * DELETE THIS FILE after testing.
 *
 * Call via: GET https://upl1ft.org/api/test-shipment-email
 */

interface Env {
  RESEND_API_KEY: string;
  SITE_URL: string;
}

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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const siteUrl = env.SITE_URL || "https://upl1ft.org";

  const items = [
    { name: "COMFORT KILLS POTENTIAL", size: "L", color: "Faded Black", quantity: 1, price: 4000, image: "/images/products/comfort-kills-potential-front.png" },
  ];

  const shippingName = "Marcus McGriff";
  const carrier = "USPS";
  const trackingNumber = "9400111899223847652391";
  const carrierTrackingUrl = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  const shipDate = "2026-02-13";
  const estimatedDelivery = "2026-02-24";

  const itemsHtml = items
    .map((item) => {
      const imageUrl = `${siteUrl}${item.image}`;
      return `
      <tr>
        <td style="padding: 12px 12px 12px 0; border-bottom: 1px solid #333; vertical-align: top; width: 64px;">
          <img src="${imageUrl}" alt="${escapeHtml(item.name)}" width="64" height="64" style="display: block; border-radius: 4px; object-fit: cover;" />
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #333; vertical-align: top;">
          <strong style="color: #D4AF37;">${escapeHtml(item.name)}</strong><br/>
          <span style="color: #999; font-size: 13px;">Size: ${escapeHtml(item.size)} / Color: ${escapeHtml(item.color)} &times; ${item.quantity}</span>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #333; text-align: right; vertical-align: top; color: #E8E3D7;">
          ${formatCents(item.price * item.quantity)}
        </td>
      </tr>`;
    })
    .join("");

  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 28px; letter-spacing: 4px; color: #D4AF37; margin: 0;">UPL1FT</h1>
      <p style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px;">Rise Above. Walk In Purpose.</p>
    </div>

    <!-- Shipped Banner -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="font-size: 48px; margin-bottom: 12px;">&#128666;</div>
      <h2 style="color: #D4AF37; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; margin: 0;">Your Order Has Shipped</h2>
      <p style="color: #999; margin-top: 8px;">Your gear is on its way, ${escapeHtml(shippingName.split(" ")[0])}.</p>
    </div>

    <!-- Tracking Info — stacked layout for mobile -->
    <div style="background: #111; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #D4AF37; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px 0;">Shipment Details</h3>
      <div style="padding: 8px 0; border-bottom: 1px solid #222;">
        <span style="color: #999; font-size: 13px;">Carrier</span><br/>
        <span style="color: #E8E3D7; font-size: 14px;">${escapeHtml(carrier)}</span>
      </div>
      <div style="padding: 8px 0; border-bottom: 1px solid #222;">
        <span style="color: #999; font-size: 13px;">Tracking Number</span><br/>
        <a href="${carrierTrackingUrl}" style="color: #D4AF37; font-family: monospace; font-size: 14px; text-decoration: none; word-break: break-all;">${escapeHtml(trackingNumber)}</a>
      </div>
      <div style="padding: 8px 0; border-bottom: 1px solid #222;">
        <span style="color: #999; font-size: 13px;">Shipped</span><br/>
        <span style="color: #E8E3D7; font-size: 14px;">${formatDate(shipDate)}</span>
      </div>
      <div style="padding: 8px 0;">
        <span style="color: #999; font-size: 13px;">Estimated Delivery</span><br/>
        <span style="color: #D4AF37; font-size: 14px; font-weight: bold;">${formatDate(estimatedDelivery)}</span>
      </div>
    </div>

    <!-- Order Items -->
    <div style="background: #111; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #D4AF37; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px 0;">What's In Your Package</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${itemsHtml}
      </table>
    </div>

    <!-- Track Order CTA -->
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${carrierTrackingUrl}" style="display: inline-block; background: #D4AF37; color: #000; padding: 16px 40px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 14px;">Track Your Order</a>
    </div>

    <!-- Continue Shopping -->
    <div style="text-align: center; margin-bottom: 40px;">
      <a href="${siteUrl}/shop" style="color: #D4AF37; text-decoration: none; font-size: 14px; letter-spacing: 1px;">Continue Shopping &rarr;</a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; border-top: 1px solid #222; padding-top: 24px;">
      <p style="color: #666; font-size: 12px; margin: 0;">
        UPL1FT &mdash; Faith-Forward Streetwear<br/>
        <a href="${siteUrl}" style="color: #D4AF37; text-decoration: none;">upl1ft.org</a>
      </p>
      <p style="color: #444; font-size: 11px; margin-top: 12px;">
        &ldquo;For we walk by faith, not by sight.&rdquo; &mdash; 2 Corinthians 5:7
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "UPL1FT <orders@upl1ft.org>",
        to: ["marcustmcgriff@gmail.com"],
        subject: "Your Order Has Shipped — UPL1FT",
        html: emailHtml,
      }),
    });

    const result = await emailResponse.json();

    return new Response(
      JSON.stringify({
        status: emailResponse.ok ? "sent" : "error",
        result,
      }, null, 2),
      {
        status: emailResponse.ok ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
