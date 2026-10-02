import { sendEmail } from "./_resend";

interface Env {
  RESEND_API_KEY: string;
  ADMIN_EMAIL?: string;
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
  trackingToken?: string;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailHtml(data: OrderEmailData): string {
  const itemsHtml = data.orderItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #333;">
          <strong style="color: #C9A227;">${escapeHtml(item.name)}</strong><br/>
          <span style="color: #999; font-size: 13px;">Size: ${escapeHtml(item.size)} / Color: ${escapeHtml(item.color)} &times; ${item.quantity}</span>
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
    .filter((line): line is string => !!line)
    .map(escapeHtml)
    .join("<br/>");

  // No gift-message block: the print partner cannot put a note in the parcel, so the
  // email must not suggest that one is included.

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

    <!-- Shipping -->
    <div style="background: #111; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #C9A227; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px 0;">Ships To</h3>
      <p style="color: #ccc; margin: 0; line-height: 1.6;">
        ${escapeHtml(data.shippingName)}<br/>
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

    <!-- Track Order CTA -->
    ${data.trackingToken ? `
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="https://upl1ft.org/orders/track?token=${data.trackingToken}" style="display: inline-block; background: #C9A227; color: #000; padding: 14px 32px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 13px;">Track Your Order</a>
    </div>
    ` : ""}

    <!-- Continue Shopping -->
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
  try {
    return await sendEmail(env, data.to, "Order Confirmed — UPL1FT", buildEmailHtml(data));
  } catch (err: any) {
    console.error("Failed to send order email:", err.message);
    return false;
  }
}

// --- Admin Order Notification ---

interface AdminOrderEmailData {
  to: string;
  orderItems: {
    productId?: string;
    name: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  discountAmount: number;
  total: number;
  customerEmail: string;
  shippingName: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  fulfillment: AdminFulfillment;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  giftMessage?: string;
  discountCode?: string;
}

// What exists in Printify for this payment. Mirrors FulfillmentReport in _order-processing.ts.
export interface AdminFulfillment {
  state: "created" | "partial" | "not_created" | "pending_retry" | "not_configured";
  printifyOrderId: string | null;
  adopted: boolean;
  isRetry: boolean;
  unavailable: { productId: string; size: string; color: string; quantity: number; reason: string }[];
  errorDetail: string | null;
}

interface AdminBanner {
  ok: boolean;
  subject: string;
  headline: string;
  lines: string[];
}

// What to do after making an order by hand in Printify, so the site knows about it.
const AFTER_HAND_ORDER =
  "After creating it by hand, copy the Printify order id (24 characters, at the end of the order's web address in Printify) into this order's printful_order_id field in Supabase (Table Editor, orders). Tracking and the shipped email then work, and the site treats the payment as ordered. Do not use Resend in Stripe for this payment afterwards.";

function describeFulfillment(f: AdminFulfillment, itemName: (productId: string) => string): AdminBanner {
  const missing = f.unavailable.map(
    (u) => `${itemName(u.productId)}, ${u.color} / ${u.size} x ${u.quantity} (${u.reason.replace(/_/g, " ")})`
  );
  const id = f.printifyOrderId || "";

  if (f.state === "created") {
    const lines = [
      "The site sends it to production by itself, usually within a minute. Nothing to do. You only hear about it again if that fails.",
    ];
    if (f.adopted) {
      lines.push(
        "Printify already had this order from an earlier attempt, so no second order was made. Open it in Printify and check that it lists every item below. If one is missing, refund that item in Stripe or add it in Printify by hand."
      );
    }
    if (f.isRetry) lines.push("This is the follow-up to an earlier notice about this payment: it has now gone through.");
    return { ok: true, subject: "New Order — UPL1FT", headline: `Printify order created (ID: ${id})`, lines };
  }

  if (f.state === "partial") {
    return {
      ok: false,
      subject: "ACTION NEEDED: Partial Printify Order — UPL1FT",
      headline: `PARTIAL: Printify order ${id} was created without some items`,
      lines: [
        ...missing.map((m) => `Not ordered: ${m}`),
        "The customer paid for everything. Refund the missing items in Stripe, or add them in Printify by hand once they are available.",
        `Do not create the other items again: they are already in Printify order ${id}.`,
      ],
    };
  }

  if (f.state === "pending_retry") {
    return {
      ok: false,
      subject: "Heads Up: Printify Order Pending — UPL1FT",
      headline: "WAITING: Printify could not be reached, so nothing has been ordered yet",
      lines: [
        "The site tries again automatically each time Stripe re-sends this payment notice, for about three days. You will get a 'Printify order created' email when it goes through.",
        "Do NOT create this order by hand in Printify while that is running: the site would then place it a second time.",
        "If the cause is on our side (for example an expired Printify API token), set the new PRINTIFY_API_TOKEN on the Cloudflare Pages project and then redeploy the site: a changed value only reaches the live site with a new deployment (Cloudflare Pages, Deployments, Retry deployment). After that the next retry places the order. To place it at once, open this payment's event in Stripe (Developers, Events) and choose Resend.",
        "To stop the automatic retry (before refunding the customer, for example), set this order's status to cancelled in Supabase (Table Editor, orders). The site never orders a cancelled row.",
        `Only if three days pass with no 'created' email: create the order by hand from the details below. ${AFTER_HAND_ORDER}`,
        ...(f.errorDetail ? [`Printify said: ${f.errorDetail}`] : []),
      ],
    };
  }

  if (f.state === "not_configured") {
    return {
      ok: false,
      subject: "URGENT: Printify Not Configured — UPL1FT",
      headline: "NOT ORDERED: the Printify API token is missing in Cloudflare",
      lines: [
        "Create this order by hand in Printify from the details below. Then add PRINTIFY_API_TOKEN to the Cloudflare Pages project and redeploy the site so the value takes effect.",
        AFTER_HAND_ORDER,
      ],
    };
  }

  // A color or size Printify does not have at all (as opposed to one that is sold
  // out) means the checkout was opened before the catalog changed.
  const notInCatalog = f.unavailable.some((u) => u.reason === "no_such_variant" || u.reason === "unknown_product");
  return {
    ok: false,
    subject: "URGENT: Printify Order Not Created — UPL1FT",
    headline: "NOT ORDERED: nothing exists in Printify for this payment",
    lines: [
      ...missing.map((m) => `Unavailable: ${m}`),
      ...(f.errorDetail ? [`Printify said: ${f.errorDetail}`] : []),
      notInCatalog
        ? "At least one item is not in the Printify catalog, so this checkout was probably opened before the catalog changed. Offer the customer a color that exists and order it by hand in Printify, or refund them in Stripe."
        : "The site will not try this one again. Create the order by hand in Printify from the details below, or refund the customer in Stripe.",
      AFTER_HAND_ORDER,
    ],
  };
}

function buildAdminEmailHtml(data: AdminOrderEmailData, banner: AdminBanner): string {
  const itemsHtml = data.orderItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #333; color: #fff;">${escapeHtml(item.name)}</td>
        <td style="padding: 8px; border: 1px solid #333; color: #ccc;">${escapeHtml(item.color)}</td>
        <td style="padding: 8px; border: 1px solid #333; color: #ccc;">${escapeHtml(item.size)}</td>
        <td style="padding: 8px; border: 1px solid #333; color: #ccc; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #333; color: #fff; text-align: right;">${formatCents(item.price * item.quantity)}</td>
      </tr>`
    )
    .join("");

  const addressLines = [
    data.shippingAddress.line1,
    data.shippingAddress.line2,
    `${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postal_code}`,
  ]
    .filter((line): line is string => !!line)
    .map(escapeHtml)
    .join("<br/>");

  const statusColor = banner.ok ? "#4ade80" : "#ef4444";
  const statusIcon = banner.ok ? "&#10003;" : "&#9888;";
  const bannerLinesHtml = banner.lines
    .map(
      (line) =>
        `<p style="color: ${banner.ok ? "#9ca3af" : "#f87171"}; margin: 6px 0 0 0; font-size: 13px; line-height: 1.5;">${escapeHtml(line)}</p>`
    )
    .join("");

  const discountHtml = data.discountCode
    ? `<tr><td style="padding: 4px 8px; color: #999;">Discount Code</td><td style="padding: 4px 8px; color: #4ade80;">${escapeHtml(data.discountCode)} (-${formatCents(data.discountAmount)})</td></tr>`
    : "";

  // Only orders paid from a checkout opened before the gift note was removed carry one.
  const giftHtml = data.giftMessage
    ? `<tr><td style="padding: 4px 8px; color: #999;">Gift Note</td><td style="padding: 4px 8px; color: #ccc; font-style: italic;">"${escapeHtml(data.giftMessage)}" (not sent to Printify: the parcel has no note)</td></tr>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="font-size: 24px; letter-spacing: 4px; color: #C9A227; margin: 0;">UPL1FT</h1>
      <p style="color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">Admin Order Notification</p>
    </div>

    <!-- Fulfillment (Printify) Status Banner -->
    <div style="background: ${banner.ok ? "#001a00" : "#1a0000"}; border: 1px solid ${statusColor}; padding: 16px; margin-bottom: 24px; text-align: center;">
      <span style="font-size: 24px;">${statusIcon}</span>
      <p style="color: ${statusColor}; font-weight: bold; margin: 8px 0 4px 0; font-size: 16px;">
        ${escapeHtml(banner.headline)}
      </p>
      ${bannerLinesHtml}
    </div>

    <!-- Order Items -->
    <div style="background: #111; padding: 16px; margin-bottom: 16px;">
      <h3 style="color: #C9A227; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px 0;">Items</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #1a1a1a;">
          <th style="padding: 8px; border: 1px solid #333; color: #C9A227; text-align: left; font-size: 12px;">Product</th>
          <th style="padding: 8px; border: 1px solid #333; color: #C9A227; text-align: left; font-size: 12px;">Color</th>
          <th style="padding: 8px; border: 1px solid #333; color: #C9A227; text-align: left; font-size: 12px;">Size</th>
          <th style="padding: 8px; border: 1px solid #333; color: #C9A227; text-align: center; font-size: 12px;">Qty</th>
          <th style="padding: 8px; border: 1px solid #333; color: #C9A227; text-align: right; font-size: 12px;">Price</th>
        </tr>
        ${itemsHtml}
      </table>
      <p style="color: #C9A227; font-weight: bold; text-align: right; margin: 12px 0 0 0; font-size: 18px;">Total: ${formatCents(data.total)}</p>
    </div>

    <!-- Customer & Shipping -->
    <div style="background: #111; padding: 16px; margin-bottom: 16px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 4px 8px; color: #999;">Customer</td><td style="padding: 4px 8px; color: #fff;">${escapeHtml(data.customerEmail)}</td></tr>
        <tr><td style="padding: 4px 8px; color: #999;">Ship To</td><td style="padding: 4px 8px; color: #ccc;">${escapeHtml(data.shippingName)}<br/>${addressLines}</td></tr>
        ${discountHtml}
        ${giftHtml}
      </table>
    </div>

    <!-- Stripe IDs -->
    <div style="background: #111; padding: 16px; margin-bottom: 16px;">
      <h3 style="color: #C9A227; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">Stripe Reference</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 4px 8px; color: #999; font-size: 12px;">Session</td><td style="padding: 4px 8px; color: #ccc; font-size: 12px; word-break: break-all;">${escapeHtml(data.stripeSessionId)}</td></tr>
        ${data.stripePaymentIntentId ? `<tr><td style="padding: 4px 8px; color: #999; font-size: 12px;">Payment</td><td style="padding: 4px 8px; color: #ccc; font-size: 12px;">${escapeHtml(data.stripePaymentIntentId)}</td></tr>` : ""}
      </table>
    </div>

    <div style="text-align: center; border-top: 1px solid #222; padding-top: 16px;">
      <p style="color: #444; font-size: 11px; margin: 0;">UPL1FT Admin Notification</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendAdminOrderNotification(
  env: Env,
  data: AdminOrderEmailData
): Promise<boolean> {
  const nameOf = (productId: string) => {
    const hit = data.orderItems.find((item: any) => item.productId === productId);
    return hit ? hit.name : `product ${productId}`;
  };
  const banner = describeFulfillment(data.fulfillment, nameOf);

  try {
    return await sendEmail(env, data.to, banner.subject, buildAdminEmailHtml(data, banner));
  } catch (err: any) {
    console.error("Failed to send admin email:", err.message);
    return false;
  }
}
