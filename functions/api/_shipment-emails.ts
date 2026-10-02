// Branded "shipped" and "arrived" emails for customers, plus plain alerts for the owner.
// The customer emails are sent from _order-sync.ts; the owner alerts from webhook.ts,
// printify-webhook.ts and _order-sync.ts. This file exports no onRequest handler, so
// Cloudflare Pages does not route it.
//
// The customer templates are the ones the site used before the supplier's own
// notifications took over; they are back because UPL1FT now sends these itself
// (Printify's notification is switched off in _printify.ts).

import { sendEmail, type MailEnv } from "./_resend";

// Where owner alerts go when ADMIN_EMAIL is not set in Cloudflare.
export const DEFAULT_ADMIN_EMAIL = "upl1ftgen@gmail.com";

function escapeHtml(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Dates are shown as calendar days in US Eastern time. Every order ships within the
// US, so an evening shipment reads as that evening's date (as the carrier and the
// tracking page show it) and not as the next day, which it already is in UTC.
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
}

function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https:\/\//i.test(url) ? url : null;
}

export function carrierTrackingUrl(carrier: string, trackingNumber: string, trackingUrl?: string | null): string {
  const given = safeUrl(trackingUrl);
  if (given) return given;
  const c = (carrier || "").toLowerCase();
  const n = encodeURIComponent(trackingNumber);
  if (c.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${n}`;
  if (c.includes("dhl")) return `https://www.dhl.com/en/express/tracking.html?AWB=${n}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier} tracking ${trackingNumber}`)}`;
}

interface EmailItem {
  name?: string;
  size?: string;
  color?: string;
  quantity?: number;
  price?: number;
  image?: string;
}

function itemImageCell(item: EmailItem, siteUrl: string, padding: string): string {
  const image = item.image || "";
  const imageUrl = image ? (image.startsWith("http") ? image : `${siteUrl}${image}`) : "";
  if (!imageUrl) return "";
  return `<td style="padding: ${padding}; border-bottom: 1px solid #333; vertical-align: top; width: 64px;">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.name)}" width="64" height="64" style="display: block; border-radius: 4px; object-fit: cover;" />
          </td>`;
}

function header(): string {
  return `
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 28px; letter-spacing: 4px; color: #C8A24A; margin: 0;">UPL1FT</h1>
      <p style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px;">Rise Above. Walk In Purpose.</p>
    </div>`;
}

function footer(siteUrl: string): string {
  return `
    <div style="text-align: center; border-top: 1px solid #222; padding-top: 24px;">
      <p style="color: #666; font-size: 12px; margin: 0;">
        UPL1FT &mdash; Faith-Forward Streetwear<br/>
        <a href="${siteUrl}" style="color: #C8A24A; text-decoration: none;">upl1ft.org</a>
      </p>
      <p style="color: #444; font-size: 11px; margin-top: 12px;">
        &ldquo;For we walk by faith, not by sight.&rdquo; &mdash; 2 Corinthians 5:7
      </p>
    </div>`;
}

function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "friend";
}

export interface ShippedEmailData {
  shippingName: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  shipDate: string | null;
  estimatedDelivery: string | null;
  items: EmailItem[];
  trackingToken: string | null;
  siteUrl: string;
}

export function buildShippedEmailHtml(data: ShippedEmailData): string {
  const trackUrl = escapeHtml(carrierTrackingUrl(data.carrier, data.trackingNumber, data.trackingUrl));

  const itemsHtml = (data.items || [])
    .map(
      (item) => `
      <tr>
        ${itemImageCell(item, data.siteUrl, "12px 12px 12px 0")}
        <td style="padding: 12px 0; border-bottom: 1px solid #333; vertical-align: top;">
          <strong style="color: #C8A24A;">${escapeHtml(item.name)}</strong><br/>
          <span style="color: #999; font-size: 13px;">Size: ${escapeHtml(item.size)} / Color: ${escapeHtml(item.color)} &times; ${Number(item.quantity) || 1}</span>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #333; text-align: right; vertical-align: top; color: #E8E3D7;">
          ${formatCents((Number(item.price) || 0) * (Number(item.quantity) || 1))}
        </td>
      </tr>`
    )
    .join("");

  const shipDate = data.shipDate ? formatDate(data.shipDate) : "";
  const shipDateHtml = shipDate
    ? `<div style="padding: 8px 0; border-bottom: 1px solid #222;">
        <span style="color: #999; font-size: 13px;">Shipped</span><br/>
        <span style="color: #E8E3D7; font-size: 14px;">${shipDate}</span>
      </div>`
    : "";

  const estimated = data.estimatedDelivery ? formatDate(data.estimatedDelivery) : "";
  const estDeliveryHtml = estimated
    ? `<div style="padding: 8px 0;">
        <span style="color: #999; font-size: 13px;">Estimated Delivery</span><br/>
        <span style="color: #C8A24A; font-size: 14px; font-weight: bold;">${estimated}</span>
      </div>`
    : "";

  const orderLinkHtml = data.trackingToken
    ? `<div style="text-align: center; margin-bottom: 16px;">
      <a href="${data.siteUrl}/orders/track?token=${encodeURIComponent(data.trackingToken)}" style="color: #C8A24A; text-decoration: none; font-size: 14px; letter-spacing: 1px;">View Order Details &rarr;</a>
    </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    ${header()}

    <!-- Shipped Banner -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="font-size: 48px; margin-bottom: 12px;">&#128666;</div>
      <h2 style="color: #C8A24A; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; margin: 0;">Your Order Has Shipped</h2>
      <p style="color: #999; margin-top: 8px;">Your gear is on its way, ${escapeHtml(firstName(data.shippingName))}.</p>
    </div>

    <!-- Tracking Info: stacked layout for mobile -->
    <div style="background: #111; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #C8A24A; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px 0;">Shipment Details</h3>
      <div style="padding: 8px 0; border-bottom: 1px solid #222;">
        <span style="color: #999; font-size: 13px;">Carrier</span><br/>
        <span style="color: #E8E3D7; font-size: 14px;">${escapeHtml(data.carrier)}</span>
      </div>
      <div style="padding: 8px 0; border-bottom: 1px solid #222;">
        <span style="color: #999; font-size: 13px;">Tracking Number</span><br/>
        <a href="${trackUrl}" style="color: #C8A24A; font-family: monospace; font-size: 14px; text-decoration: none; word-break: break-all;">${escapeHtml(data.trackingNumber)}</a>
      </div>
      ${shipDateHtml}
      ${estDeliveryHtml}
    </div>

    <!-- Order Items -->
    <div style="background: #111; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #C8A24A; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 16px 0;">What's In Your Order</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${itemsHtml}
      </table>
    </div>

    <!-- Track Order CTA -->
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${trackUrl}" style="display: inline-block; background: #C8A24A; color: #000; padding: 16px 40px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 14px;">Track Your Order</a>
    </div>

    ${orderLinkHtml}

    <!-- Continue Shopping -->
    <div style="text-align: center; margin-bottom: 40px;">
      <a href="${data.siteUrl}/shop" style="color: #C8A24A; text-decoration: none; font-size: 14px; letter-spacing: 1px;">Continue Shopping &rarr;</a>
    </div>

    ${footer(data.siteUrl)}
  </div>
</body>
</html>`;
}

export interface DeliveredEmailData {
  shippingName: string;
  items: EmailItem[];
  trackingToken: string | null;
  siteUrl: string;
}

export function buildDeliveredEmailHtml(data: DeliveredEmailData): string {
  const itemsHtml = (data.items || [])
    .map(
      (item) => `
      <tr>
        ${itemImageCell(item, data.siteUrl, "10px 12px 10px 0")}
        <td style="padding: 10px 0; border-bottom: 1px solid #333; vertical-align: top;">
          <strong style="color: #C8A24A;">${escapeHtml(item.name)}</strong><br/>
          <span style="color: #999; font-size: 13px;">Size: ${escapeHtml(item.size)} / Color: ${escapeHtml(item.color)}</span>
        </td>
      </tr>`
    )
    .join("");

  const orderLinkHtml = data.trackingToken
    ? `<div style="text-align: center; margin-bottom: 40px;">
      <a href="${data.siteUrl}/orders/track?token=${encodeURIComponent(data.trackingToken)}" style="color: #C8A24A; text-decoration: none; font-size: 14px; letter-spacing: 1px;">View Order Details &rarr;</a>
    </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    ${header()}

    <!-- Delivered Banner -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="font-size: 48px; margin-bottom: 12px;">&#10003;</div>
      <h2 style="color: #C8A24A; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; margin: 0;">Your Order Has Arrived</h2>
      <p style="color: #999; margin-top: 8px;">Wear it with purpose, ${escapeHtml(firstName(data.shippingName))}.</p>
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

    ${orderLinkHtml}

    ${footer(data.siteUrl)}
  </div>
</body>
</html>`;
}

// Each of these answers true when the email service accepted the message.
export function sendShippedEmail(env: MailEnv, to: string, data: ShippedEmailData): Promise<boolean> {
  return sendEmail(env, to, "Your Order Has Shipped — UPL1FT", buildShippedEmailHtml(data));
}

export function sendDeliveredEmail(env: MailEnv, to: string, data: DeliveredEmailData): Promise<boolean> {
  return sendEmail(env, to, "Your Order Has Arrived — UPL1FT", buildDeliveredEmailHtml(data));
}

// A short plain alert for the store owner when an order needs a human.
export function sendAdminAlert(
  env: MailEnv,
  to: string,
  subject: string,
  heading: string,
  lines: string[]
): Promise<boolean> {
  const body = lines.map((l) => `<p style="color: #ccc; font-size: 14px; line-height: 1.5; margin: 0 0 10px 0;">${escapeHtml(l)}</p>`).join("");
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="font-size: 24px; letter-spacing: 4px; color: #C9A227; margin: 0;">UPL1FT</h1>
      <p style="color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">Admin Alert</p>
    </div>
    <div style="background: #1a0000; border: 1px solid #ef4444; padding: 16px; margin-bottom: 24px;">
      <p style="color: #ef4444; font-weight: bold; margin: 0; font-size: 16px;">${escapeHtml(heading)}</p>
    </div>
    <div style="background: #111; padding: 16px;">${body}</div>
  </div>
</body>
</html>`;
  return sendEmail(env, to, subject, html);
}
