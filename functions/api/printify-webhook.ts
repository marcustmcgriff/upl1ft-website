import { createClient } from "@supabase/supabase-js";
import {
  deriveOrderState,
  getOrder,
  isPrintifyOrderId,
  submitIfReady,
  verifyWebhookSignature,
  type SiteStatus,
} from "./_printify";
import { applyOrderUpdate, type SyncRow } from "./_order-sync";
import { DEFAULT_ADMIN_EMAIL, sendAdminAlert } from "./_shipment-emails";

// Printify -> site. Registered in Printify for order:updated, order:shipment:created
// and order:shipment:delivered, signed with PRINTIFY_WEBHOOK_SECRET.
//
// An event is only a nudge: the handler reads the order itself from Printify and works
// from that, so events that arrive late, twice or out of order cannot put the site in
// a wrong state. It then
//   - submits the order for production once Printify is ready for it,
//   - keeps the order row's status and tracking current,
//   - emails the customer when a parcel ships and when the order has arrived,
//   - emails the owner when Printify reports a problem.
//
// Printify retries a 4xx/5xx answer three times and then pauses the webhook for an
// hour, so 500 is kept for failures that a retry can fix.

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PRINTIFY_WEBHOOK_SECRET?: string;
  PRINTIFY_API_TOKEN: string;
  PRINTIFY_SHOP_ID?: string;
  RESEND_API_KEY?: string;
  ADMIN_EMAIL?: string;
}

// How long a row may read "processing" while Printify still shows the order on hold
// and never submitted, before that counts as a problem. What Printify reports in the
// moments after a submission has not been observed, so a short lag is normal.
const SUBMIT_SETTLE_MS = 10 * 60 * 1000;

const CANCELLED = new Set(["canceled", "cancelled"]);

const ok = () => new Response("OK", { status: 200 });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const env = context.env;

  try {
    const rawBody = await context.request.text();

    if (!env.PRINTIFY_WEBHOOK_SECRET) {
      // Fail closed: without the secret nobody can prove an event came from Printify.
      console.error("PRINTIFY_WEBHOOK_SECRET is not set; refusing webhook");
      return new Response("Webhook secret not configured", { status: 500 });
    }
    const signed = await verifyWebhookSignature(
      env.PRINTIFY_WEBHOOK_SECRET,
      rawBody,
      context.request.headers.get("X-Pfy-Signature")
    );
    if (!signed) {
      console.error("Printify webhook signature mismatch");
      return new Response("Invalid signature", { status: 401 });
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return ok();
    }

    const eventType = String(body?.type || "");
    const printifyOrderId = body?.resource?.id ? String(body.resource.id) : "";
    console.log("Printify webhook:", eventType, printifyOrderId);

    if (!eventType.startsWith("order:") || !isPrintifyOrderId(printifyOrderId)) {
      return ok();
    }

    // The printful_order_id column holds the Printify order id (name kept on purpose).
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: row, error: lookupError } = await supabase
      .from("orders")
      .select("id, status, tracking_number, tracking_url, carrier, customer_email, shipping_name, items, tracking_token, stripe_session_id, printful_order_id, updated_at")
      .eq("printful_order_id", printifyOrderId)
      .maybeSingle();

    if (lookupError) {
      console.error("Order lookup failed:", lookupError.code, lookupError.message);
      return new Response("Database unavailable", { status: 500 });
    }
    if (!row) {
      // Not an order this site placed (a sample made in Printify, say), or the row is
      // not linked yet. Nothing to do.
      return ok();
    }

    const adminEmail = env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;

    // ---- What does Printify say about the order now? ----
    let derivedStatus: SiteStatus | null = null;
    let trackingNumber: string | null = null;
    let trackingUrl: string | null = null;
    let carrier: string | null = null;
    let shipDate: string | null = null;
    let parcelShipDate: string | null = null;
    let parcelIsLatest: boolean | undefined;
    let estimatedDelivery: string | null = null;
    let attention: string | null = null;

    const got = await getOrder(env, printifyOrderId);
    if (got.ok && got.data) {
      const state = deriveOrderState(got.data);
      derivedStatus = state.status;
      attention = state.attention;
      shipDate = state.shipDate;
      estimatedDelivery = state.estimatedDelivery;
      if (state.shipment) {
        trackingNumber = state.shipment.number || null;
        trackingUrl = state.shipment.url || null;
        carrier = state.shipment.carrier || null;
        parcelShipDate = state.shipmentShippedAt;
        parcelIsLatest = state.shipmentIsLatest;
      }

      // Submit for production as soon as Printify is ready. The payment handler tries
      // this too, but Printify needs about 20 seconds after an order is created.
      // Only while the site has not submitted it yet (row still "confirmed"): an order
      // that is still on hold long AFTER the site submitted it was sent back by
      // Printify (stock, shipping, payment), and submitting it again would only hide
      // that. "Long after" because this event may simply be late, or Printify may
      // need a moment to show a submission.
      if (state.readyToSubmit && row.status !== "confirmed" && row.status !== "cancelled") {
        const sinceWrite = Date.now() - Date.parse(String(row.updated_at || ""));
        if (!(sinceWrite < SUBMIT_SETTLE_MS)) {
          attention = attention || "on hold again after the site submitted it";
        }
      }
      if (state.readyToSubmit && row.status === "confirmed") {
        let submitted = await submitIfReady(env, printifyOrderId);
        if (submitted.state === "refused" || submitted.state === "error") {
          // A refusal can mean the payment handler submitted it a moment ago, and a
          // failed call can be a blip. Look once more before deciding.
          await sleep(2000);
          submitted = await submitIfReady(env, printifyOrderId);
        }
        if (submitted.state === "sent" || submitted.state === "already_sent") {
          derivedStatus = "processing";
        } else if (submitted.state === "blocked" || submitted.state === "refused") {
          await sendAdminAlert(
            env,
            adminEmail,
            "ACTION NEEDED: Printify Order Not In Production — UPL1FT",
            `Printify order ${printifyOrderId} could not be sent to production`,
            [
              submitted.detail || "Printify refused the order.",
              "Open the order in Printify (Orders) to see why and fix it there.",
              "Do not create a new order for this payment: this one already exists.",
              `Customer: ${row.customer_email || "unknown"}`,
            ]
          );
        } else if (submitted.state === "error") {
          // Printify could not be reached twice. Nothing else brings this order to
          // production today, so have Printify send the event again.
          console.error("Could not submit order, asking for the event again:", submitted.detail);
          return new Response("Printify unavailable", { status: 500 });
        }
      }
    } else if (!got.ok && got.transient) {
      // Printify itself is unreachable; let it send the event again.
      console.error("Printify order fetch failed:", got.detail);
      return new Response("Printify unavailable", { status: 500 });
    } else {
      // The order could not be read (an expired token, for example). Use what the
      // event itself carries so tracking still reaches the customer.
      console.error("Printify order fetch failed, using event data:", got.ok ? "empty answer" : got.detail);
      const data = body?.resource?.data || {};
      if (eventType === "order:shipment:created") {
        derivedStatus = "shipped";
        const c = data.carrier || {};
        trackingNumber = typeof c.tracking_number === "string" ? c.tracking_number : null;
        trackingUrl = typeof c.tracking_url === "string" ? c.tracking_url : null;
        carrier = typeof c.code === "string" ? c.code : null;
        shipDate = typeof data.shipped_at === "string" ? data.shipped_at.replace(" ", "T") : null;
        parcelShipDate = shipDate;
      }
      // One "delivered" event may be one parcel of several, so it is not enough to
      // mark the whole order delivered.

      // A problem status must still reach the owner even though the order is unreadable.
      const reported = typeof data.status === "string" ? data.status.toLowerCase() : "";
      if (["payment-not-received", "has-issues", "unfulfillable", "source-check-failed", "canceled", "cancelled"].includes(reported)) {
        attention = reported;
        if (CANCELLED.has(reported)) derivedStatus = "cancelled";
      }
    }

    // Writes the row, emails the customer, and tells the owner when this event is
    // the one that turns the order to cancelled.
    const applied = await applyOrderUpdate(supabase, env, row as SyncRow, {
      derivedStatus,
      trackingNumber,
      trackingUrl,
      carrier,
      parcelShipDate,
      parcelIsLatest,
      shipDate,
      estimatedDelivery,
    });
    if (applied.dbError) {
      return new Response("Database unavailable", { status: 500 });
    }

    // Other problems (payment not received, has issues, back on hold) do not change
    // the row, so they are reported from the event that carries the status change.
    if (attention && !CANCELLED.has(attention) && eventType === "order:updated") {
      await sendAdminAlert(
        env,
        adminEmail,
        "ACTION NEEDED: Printify Order Has A Problem — UPL1FT",
        `Printify order ${printifyOrderId} is "${attention}"`,
        [
          "Open the order in Printify (Orders) to see what it needs.",
          "The customer has paid and is waiting: fix the order there, or refund them in Stripe.",
          `Customer: ${row.customer_email || "unknown"}`,
          `Stripe session: ${row.stripe_session_id || "unknown"}`,
        ]
      );
    }

    return ok();
  } catch (err: any) {
    console.error("Printify webhook error:", err?.message || String(err));
    return new Response("Internal error", { status: 500 });
  }
};
