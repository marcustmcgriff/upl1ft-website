interface Env {
  RESEND_API_KEY: string;
}

interface OrderEmailData {
  to: string;
  orderItems: {
    name: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  discountAmount: number;
  total: number;
  shippingName: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  giftMessage?: string;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function buildEmailHtml(data: OrderEmailData): string {
  const itemsHtml = data.orderItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #333;">
          <strong style="color: #C9A227;">${item.name}</strong><br/>
          <span style="color: #999; font-size: 13px;">Size: ${item.size} / Color: ${item.color} &times; ${item.quantity}</span>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #333; text-align: right; color: #fff;">
          ${formatCents(item.price * item.quantity)}
        </td>
      </tr>`
    )
    .join("");

  const addressLines = [
    data.shippingAddress.line1,
    data.shippingAddress.line2,
    `${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postal_code}`,
  ]
    .filter(Boolean)
    .join("<br/>");

  const giftHtml = data.giftMessage
    ? `
    <div style="background: #1a1a1a; padding: 16px; margin: 20px 0; border-left: 3px solid #C9A227;">
      <p style="margin: 0 0 4px 0; font-size: 12px; color: #C9A227; text-transform: uppercase; letter-spacing: 1px;">Gift Message</p>
      <p style="margin: 0; color: #ccc; font-style: italic;">&ldquo;${data.giftMessage}&rdquo;</p>
    </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 28px; letter-spacing: 4px; color: #C9A227; margin: 0;">UPL1FT</h1>
      <p style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px;">Rise Above. Walk In Purpose.</p>
    </div>

    <!-- Confirmation -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="font-size: 48px; margin-bottom: 12px;">&#10003;</div>
      <h2 style="color: #C9A227; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; margin: 0;">Order Confirmed</h2>
      <p style="color: #999; margin-top: 8px;">Thank you for your purchase. Your order is being prepared.</p>
    </div>

    <!-- Items -->
    <div style="background: #111; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #C9A227; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px 0;">Order Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${itemsHtml}
      </table>

      <table style="width: 100%; margin-top: 16px;">
        <tr>
          <td style="color: #999; padding: 4px 0;">Subtotal</td>
          <td style="color: #fff; text-align: right; padding: 4px 0;">${formatCents(data.subtotal)}</td>
        </tr>
        <tr>
          <td style="color: #999; padding: 4px 0;">Shipping</td>
          <td style="color: #fff; text-align: right; padding: 4px 0;">Free</td>
        </tr>
        ${
          data.discountAmount > 0
            ? `<tr>
          <td style="color: #4ade80; padding: 4px 0;">Discount</td>
          <td style="color: #4ade80; text-align: right; padding: 4px 0;">-${formatCents(data.discountAmount)}</td>
        </tr>`
            : ""
        }
        <tr>
          <td style="color: #C9A227; font-weight: bold; padding: 12px 0 0 0; border-top: 1px solid #333;">Total</td>
          <td style="color: #C9A227; font-weight: bold; text-align: right; padding: 12px 0 0 0; border-top: 1px solid #333; font-size: 18px;">${formatCents(data.total)}</td>
        </tr>
      </table>
    </div>

    ${giftHtml}

    <!-- Shipping -->
    <div style="background: #111; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #C9A227; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px 0;">Ships To</h3>
      <p style="color: #ccc; margin: 0; line-height: 1.6;">
        ${data.shippingName}<br/>
        ${addressLines}
      </p>
    </div>

    <!-- What's Next -->
    <div style="background: #111; padding: 24px; margin-bottom: 32px;">
      <h3 style="color: #C9A227; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px 0;">What Happens Next</h3>
      <ol style="color: #999; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li>Your order is sent to our fulfillment center</li>
        <li>Your items are printed and quality-checked</li>
        <li>Your package is shipped with tracking</li>
        <li>You receive your gear and walk in purpose</li>
      </ol>
    </div>

    <!-- CTA -->
    <div style="text-align: center; margin-bottom: 40px;">
      <a href="https://upl1ft.org/shop" style="display: inline-block; background: #C9A227; color: #000; padding: 14px 32px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 13px;">Continue Shopping</a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; border-top: 1px solid #222; padding-top: 24px;">
      <p style="color: #666; font-size: 12px; margin: 0;">
        UPL1FT &mdash; Faith-Forward Streetwear<br/>
        <a href="https://upl1ft.org" style="color: #C9A227; text-decoration: none;">upl1ft.org</a>
      </p>
      <p style="color: #444; font-size: 11px; margin-top: 12px;">
        &ldquo;For we walk by faith, not by sight.&rdquo; &mdash; 2 Corinthians 5:7
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendOrderConfirmationEmail(
  env: Env,
  data: OrderEmailData
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.log("RESEND_API_KEY not configured, skipping order email");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "UPL1FT <orders@upl1ft.org>",
        to: [data.to],
        subject: "Order Confirmed — UPL1FT",
        html: buildEmailHtml(data),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend email failed:", error);
      return false;
    }

    console.log("Order confirmation email sent to", data.to);
    return true;
  } catch (err: any) {
    console.error("Failed to send order email:", err.message);
    return false;
  }
}
