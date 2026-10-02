import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeStatus, type SiteStatus } from "./_printify";
import { DEFAULT_ADMIN_EMAIL, sendAdminAlert, sendDeliveredEmail, sendShippedEmail } from "./_shipment-emails";

// Writes what Printify reports onto the order row and sends the matching email. Used
// by both printify-webhook.ts (Printify tells us) and order-tracking.ts (the customer
// opens the order), so whichever notices a change first handles it and the other
// finds nothing left to do. This file exports no onRequest handler, so Cloudflare
// Pages does not route it.
//
// Emails follow changes of the row, not events: an email goes out only from the call
// whose write changed the row. That is what keeps a second event, or a page view,
// from sending it twice.

const SITE_URL = "https://upl1ft.org";

export interface SyncRow {
  id: string;
  status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  customer_email: string | null;
  shipping_name: string | null;
  items: unknown;
  tracking_token: string | null;
  printful_order_id?: string | null; // holds the Printify order id
}

export interface SyncInput {
  derivedStatus: SiteStatus | null;
  // The parcel in the tracking slot (see deriveOrderState in _printify.ts).
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  parcelShipDate?: string | null; // when that parcel left
  // false when the slot fell back to a parcel that left before another one, which the
  // customer has already been told about. Left out means "not known": treated as news.
  parcelIsLatest?: boolean;
  shipDate: string | null; // when the first parcel of the order left
  estimatedDelivery: string | null;
}

export interface SyncResult {
  status: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  dbError: boolean;
}

interface SyncEnv {
  RESEND_API_KEY?: string;
  ADMIN_EMAIL?: string;
}

function httpsOnly(url: string | null | undefined): string | null {
  return typeof url === "string" && /^https:\/\//i.test(url) ? url : null;
}

export async function applyOrderUpdate(
  supabase: SupabaseClient,
  env: SyncEnv,
  row: SyncRow,
  input: SyncInput
): Promise<SyncResult> {
  const status = mergeStatus(row.status, input.derivedStatus);
  const storedNumber = row.tracking_number || null;
  const trackingNumber = input.trackingNumber || storedNumber;
  const trackingChanged = trackingNumber !== storedNumber;
  // A new number is another parcel: its link and carrier come with it, never from
  // the parcel that was in the slot before.
  const trackingUrl = trackingChanged
    ? httpsOnly(input.trackingUrl)
    : httpsOnly(input.trackingUrl) || row.tracking_url || null;
  const carrier = trackingChanged ? input.carrier || null : input.carrier || row.carrier || null;
  const result: SyncResult = { status, trackingNumber, trackingUrl, carrier, dbError: false };

  const statusChanged = status !== row.status;
  const detailsChanged = trackingUrl !== (row.tracking_url || null) || carrier !== (row.carrier || null);
  if (!statusChanged && !trackingChanged && !detailsChanged) return result;

  // Compare-and-set: write only if the row still looks the way it was read. When two
  // requests see the same change at the same moment, one write lands and only that
  // request emails the customer.
  let update = supabase
    .from("orders")
    .update({
      status,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      carrier,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("status", row.status);
  // An empty string (a cell cleared by hand in Supabase) is matched as what it is.
  update =
    row.tracking_number === null || row.tracking_number === undefined
      ? update.is("tracking_number", null)
      : update.eq("tracking_number", row.tracking_number);

  const { data: written, error } = await update.select("id");
  if (error) {
    console.error("Order update failed:", error.code, error.message);
    result.dbError = true;
    return result;
  }
  if (!written || written.length === 0) return result; // someone else just wrote it

  console.log(`Order ${row.id}: ${row.status} -> ${status}`);

  const ownerEmail = env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;

  if (statusChanged && status === "cancelled") {
    await sendAdminAlert(env, ownerEmail, "ACTION NEEDED: Printify Order Cancelled — UPL1FT", "An order was cancelled in Printify", [
      "If you cancelled it yourself, there is nothing more to do here.",
      "Otherwise the customer has paid and is waiting: open the order in Printify (Orders) to see why it was cancelled, then make a new order by hand or refund the customer in Stripe.",
      `Customer: ${row.customer_email || "unknown"}`,
      ...(row.printful_order_id ? [`Printify order: ${row.printful_order_id}`] : []),
    ]);
    return result;
  }

  if (!row.customer_email) return result;
  const items = Array.isArray(row.items) ? row.items : [];

  const firstParcel = statusChanged && status === "shipped";
  // A changed number is only news when it is the parcel that shipped last. When a
  // later parcel is delivered first, the slot falls back to an earlier one, and that
  // one has had its email.
  const anotherParcel = !statusChanged && status === "shipped" && trackingChanged && input.parcelIsLatest !== false;

  let sent: boolean | null = null; // null: no email was due
  if ((firstParcel || anotherParcel) && trackingNumber) {
    sent = await sendShippedEmail(env, row.customer_email, {
      shippingName: row.shipping_name || "Customer",
      carrier: carrier || "Standard Shipping",
      trackingNumber,
      trackingUrl,
      shipDate: input.parcelShipDate || input.shipDate,
      estimatedDelivery: input.estimatedDelivery,
      items,
      trackingToken: row.tracking_token,
      siteUrl: SITE_URL,
    });
  } else if (statusChanged && status === "delivered") {
    sent = await sendDeliveredEmail(env, row.customer_email, {
      shippingName: row.shipping_name || "Customer",
      items,
      trackingToken: row.tracking_token,
      siteUrl: SITE_URL,
    });
  }

  if (sent === false) {
    // The row already shows the change, so nothing will send this email again.
    const what = status === "delivered" ? "arrived" : "shipped";
    console.error(`Order ${row.id}: the "${what}" email could not be sent`);
    await sendAdminAlert(
      env,
      ownerEmail,
      "ACTION NEEDED: Customer Email Not Sent — UPL1FT",
      `The "${what}" email for an order could not be sent`,
      [
        `Customer: ${row.customer_email}`,
        ...(trackingNumber ? [`Tracking: ${carrier || "carrier unknown"} ${trackingNumber}`] : []),
        ...(trackingUrl ? [`Tracking link: ${trackingUrl}`] : []),
        "The site will not send this email again. Please pass the news on to the customer yourself.",
      ]
    );
  }

  return result;
}
