// What happens after Stripe says an order is paid.
//
// This file exports no onRequest handler, so Cloudflare Pages does not route it. It
// imports nothing: the database, Printify and email are passed in as `deps`, which
// lets tests/order-processing.test.mjs run every path with fakes.
//
// The rules it enforces:
//  1. The order row is written BEFORE Printify is called. The row is the claim on the
//     Stripe session, so a payment is never lost and never processed twice.
//  2. Stripe re-sends an event whenever it gets a 5xx. Every step here is safe to
//     repeat: the row is found again, and Printify answers a repeated order with the
//     id of the one that already exists.
//  3. Only one attempt works on a payment at a time. An attempt that finds a row
//     another attempt wrote or touched moments ago answers "busy" and leaves it alone,
//     so two attempts never send Printify the same order at the same moment.
//  4. The customer confirmation is sent once, by the attempt that wrote the row.
//  5. "Printify could not be reached" is not "the order failed": the handler answers
//     500 so Stripe tries again later (it keeps trying for about three days).
//  6. The owner is always told the truth about what exists in Printify, so nobody
//     creates a second order by hand for one that is already there. When a notice the
//     owner has to act on cannot be sent, Stripe is asked to deliver again.
//  7. A row the owner has set to "cancelled" is never ordered.

export interface ProcessItem {
  productId: string;
  name: string;
  size: string;
  color: string;
  quantity: number;
  price: number; // cents, per unit
  image: string;
}

export interface ShippingAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface PaidOrderInput {
  sessionId: string;
  paymentIntentId: string | null;
  items: ProcessItem[];
  shippingName: string;
  shippingAddress: ShippingAddress;
  customerEmail: string | null;
  customerPhone: string;
  userIdHint: string | null;
  subtotal: number;
  discountAmount: number;
  total: number;
  discountCode: string | null;
  giftMessage: string | null;
  // Minutes since Stripe created the event. Every delivery of one payment carries the
  // same event, so this tells the first attempts from the ones made a day later.
  eventAgeMinutes: number;
}

export interface ExistingOrder {
  printifyOrderId: string | null;
  trackingToken: string | null;
  status: string;
}

export interface NewOrderRow {
  userId: string | null;
  sessionId: string;
  paymentIntentId: string | null;
  trackingToken: string;
  items: ProcessItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  discountCode: string | null;
  shippingName: string;
  shippingAddress: ShippingAddress;
  customerEmail: string | null;
  giftMessage: string | null;
}

export interface OrderLine {
  productId: string;
  size: string;
  color: string;
  quantity: number;
}

export interface UnavailableLine extends OrderLine {
  reason: string;
}

export interface ResolveOutcome {
  lineItems: { product_id: string; variant_id: number; quantity: number }[];
  unavailable: UnavailableLine[];
  unknown: OrderLine[];
  unknownDetail: string | null;
}

export interface CreateOutcome {
  id: string | null;
  adopted: boolean; // true when Printify already had an order for this Stripe session
  transient: boolean; // true when trying again later could succeed
  error: string | null;
}

export interface FindOutcome {
  ok: boolean; // false when Printify could not be asked
  id: string | null;
  detail: string | null;
}

// created        Printify order exists; production submission follows.
// partial        Printify order exists, but some lines could not be ordered.
// not_created    Nothing exists in Printify and trying again will not help.
// pending_retry  Nothing could be done right now; Stripe will deliver the event again.
// not_configured The Printify token is missing.
export type FulfillmentState = "created" | "partial" | "not_created" | "pending_retry" | "not_configured";

export interface FulfillmentReport {
  state: FulfillmentState;
  printifyOrderId: string | null;
  // The order was made by an earlier attempt. What it contains was decided then, so
  // this attempt cannot say which lines are in it.
  adopted: boolean;
  isRetry: boolean;
  unavailable: UnavailableLine[];
  errorDetail: string | null;
}

export interface OrderDeps {
  // null when Supabase is not configured
  db: {
    findOrderBySession(sessionId: string): Promise<ExistingOrder | null | "error">;
    findUserIdByEmail(email: string): Promise<string | null>;
    insertOrder(row: NewOrderRow): Promise<"inserted" | "duplicate" | "error">;
    // Takes over a row that has no Printify order yet. false when another attempt
    // wrote or claimed the row within the last minute or two and may still be at work.
    claimUnfinishedOrder(sessionId: string): Promise<boolean | "error">;
    linkPrintifyOrder(sessionId: string, printifyOrderId: string): Promise<boolean>;
    recordDiscount(code: string, userId: string | null, sessionId: string): Promise<void>;
  } | null;
  printify: {
    configured: boolean;
    resolve(lines: OrderLine[]): Promise<ResolveOutcome>;
    create(args: {
      externalId: string;
      label: string;
      lineItems: ResolveOutcome["lineItems"];
      address: { name: string; email: string; phone: string } & ShippingAddress;
    }): Promise<CreateOutcome>;
    // The order Printify already holds for this Stripe session, if any.
    findExisting(sessionId: string): Promise<FindOutcome>;
    // Waits until Printify accepts the order for production, then submits it. Never throws.
    submitWhenReady(printifyOrderId: string, sessionId: string): Promise<void>;
  };
  email: {
    customerConfirmation(input: PaidOrderInput, trackingToken: string | null): Promise<void>;
    // true when the email service accepted the message
    admin(input: PaidOrderInput, report: FulfillmentReport): Promise<boolean>;
  };
  newTrackingToken(): string;
  // Keeps work running after the HTTP response has been sent (context.waitUntil).
  defer(work: Promise<unknown>): void;
  log(message: string, detail?: unknown): void;
}

export interface ProcessResult {
  httpStatus: 200 | 500;
  outcome: string;
}

// A payment still waiting for Printify is announced on the first attempt, and again
// on attempts made after this long (Stripe re-sends for about three days).
const REMINDER_AFTER_MINUTES = 20 * 60;

async function quietly(deps: OrderDeps, what: string, work: () => Promise<unknown>): Promise<void> {
  try {
    await work();
  } catch (err) {
    deps.log(`${what} failed`, err instanceof Error ? err.message : String(err));
  }
}

export async function processPaidOrder(deps: OrderDeps, input: PaidOrderInput): Promise<ProcessResult> {
  const db = deps.db;
  let isFirstAttempt = true;
  let trackingToken: string | null = null;

  // ---- 1. Claim the Stripe session by writing the order row ----
  if (db) {
    const existing = await db.findOrderBySession(input.sessionId);
    if (existing === "error") {
      // Nothing has been done yet, so it is safe to let Stripe deliver the event again.
      return { httpStatus: 500, outcome: "db_unavailable" };
    }

    if (existing) {
      if (existing.status === "cancelled") {
        // The owner cancelled this order (after a refund, say). Leave it alone.
        deps.log("Order row is cancelled, nothing ordered", input.sessionId);
        return { httpStatus: 200, outcome: "cancelled_not_ordered" };
      }
      if (existing.printifyOrderId) {
        // Already ordered. Make sure it is on its way to production, then stop.
        deps.defer(deps.printify.submitWhenReady(existing.printifyOrderId, input.sessionId));
        return { httpStatus: 200, outcome: "already_processed" };
      }
      // An earlier attempt wrote the row but did not get an order into Printify. Take
      // it over, unless that attempt may still be running.
      const claimed = await db.claimUnfinishedOrder(input.sessionId);
      if (claimed === "error") return { httpStatus: 500, outcome: "db_unavailable" };
      if (!claimed) return { httpStatus: 500, outcome: "busy" };
      isFirstAttempt = false;
      trackingToken = existing.trackingToken;
    } else {
      let userId = input.userIdHint;
      if (!userId && input.customerEmail) {
        try {
          userId = await db.findUserIdByEmail(input.customerEmail);
        } catch {
          userId = null;
        }
      }
      const token = deps.newTrackingToken();
      const inserted = await db.insertOrder({
        userId,
        sessionId: input.sessionId,
        paymentIntentId: input.paymentIntentId,
        trackingToken: token,
        items: input.items,
        subtotal: input.subtotal,
        discountAmount: input.discountAmount,
        total: input.total,
        discountCode: input.discountCode,
        shippingName: input.shippingName,
        shippingAddress: input.shippingAddress,
        customerEmail: input.customerEmail,
        giftMessage: input.giftMessage,
      });

      if (inserted === "error") {
        return { httpStatus: 500, outcome: "db_insert_failed" };
      }

      if (inserted === "duplicate") {
        // Another delivery of the same event wrote the row a moment ago and is working
        // on it right now. Stripe delivers again later; by then that attempt has
        // finished and this payment is either ordered or free to take over.
        return { httpStatus: 500, outcome: "busy" };
      }

      trackingToken = token;
      if (input.discountCode) {
        const code = input.discountCode;
        await quietly(deps, "discount bookkeeping", () => db.recordDiscount(code, userId, input.sessionId));
      }
      if (input.customerEmail) {
        await quietly(deps, "customer confirmation email", () =>
          deps.email.customerConfirmation(input, trackingToken)
        );
      }
    }
  } else if (input.customerEmail) {
    // No database configured: confirm by email and fulfil, as the site did before.
    await quietly(deps, "customer confirmation email", () => deps.email.customerConfirmation(input, null));
  }

  // ---- 2. Get the order into Printify ----
  const report = async (
    state: FulfillmentState,
    httpStatus: 200 | 500,
    extra: Partial<FulfillmentReport>,
    notify: boolean
  ): Promise<ProcessResult> => {
    let told = true;
    if (notify) {
      const full: FulfillmentReport = {
        state,
        printifyOrderId: null,
        adopted: false,
        isRetry: !isFirstAttempt,
        unavailable: [],
        errorDetail: null,
        ...extra,
      };
      try {
        told = await deps.email.admin(input, full);
      } catch (err) {
        told = false;
        deps.log("admin email failed", err instanceof Error ? err.message : String(err));
      }
    }
    // These two end with 200, so the email is the only thing that tells the owner a
    // paid order needs handling. If it could not be sent, have Stripe deliver the
    // event again: the next attempt gets here again and sends it.
    if (!told && httpStatus === 200 && (state === "not_created" || state === "not_configured")) {
      return { httpStatus: 500, outcome: `${state}_unnotified` };
    }
    return { httpStatus, outcome: state };
  };

  // Record the Printify order on the row and start production.
  const finish = async (
    printifyOrderId: string,
    adopted: boolean,
    unavailable: UnavailableLine[]
  ): Promise<ProcessResult> => {
    let linked = true;
    if (db) {
      try {
        linked = await db.linkPrintifyOrder(input.sessionId, printifyOrderId);
      } catch {
        linked = false;
      }
    }

    // Printify needs about 20 seconds before it accepts an order for production, so
    // submission continues after this handler has answered Stripe.
    deps.defer(deps.printify.submitWhenReady(printifyOrderId, input.sessionId));

    // An adopted order was put together by an earlier attempt, from the stock at that
    // time. This attempt's stock check says nothing about what it contains.
    const state: FulfillmentState = !adopted && unavailable.length > 0 ? "partial" : "created";
    const result = await report(
      state,
      linked ? 200 : 500,
      { printifyOrderId, adopted, unavailable: adopted ? [] : unavailable },
      true
    );
    // If the row could not be updated, ask Stripe to deliver again: the next attempt
    // finds the existing Printify order by its external id and links it.
    return linked ? result : { httpStatus: 500, outcome: `${state}_unlinked` };
  };

  const waitingNoticeDue = isFirstAttempt || input.eventAgeMinutes > REMINDER_AFTER_MINUTES;

  if (!deps.printify.configured) {
    return report("not_configured", 200, { errorDetail: "PRINTIFY_API_TOKEN is not set" }, true);
  }

  const lines: OrderLine[] = input.items.map((item) => ({
    productId: item.productId,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
  }));

  let resolved: ResolveOutcome;
  try {
    resolved = await deps.printify.resolve(lines);
  } catch (err) {
    resolved = {
      lineItems: [],
      unavailable: [],
      unknown: lines,
      unknownDetail: err instanceof Error ? err.message : String(err),
    };
  }

  if (resolved.unknown.length > 0) {
    // Printify could not be asked. Tell the owner, then let Stripe retry.
    return report("pending_retry", 500, { errorDetail: resolved.unknownDetail }, waitingNoticeDue);
  }

  if (!isFirstAttempt && resolved.unavailable.length > 0) {
    // A line cannot be ordered now. Before saying so, make sure an earlier attempt
    // did not already create the order while its answer got lost: the stock may
    // simply have changed since then.
    let found: FindOutcome;
    try {
      found = await deps.printify.findExisting(input.sessionId);
    } catch (err) {
      found = { ok: false, id: null, detail: err instanceof Error ? err.message : String(err) };
    }
    if (!found.ok) {
      return report("pending_retry", 500, { errorDetail: found.detail }, waitingNoticeDue);
    }
    if (found.id) {
      return finish(found.id, true, []);
    }
  }

  if (resolved.lineItems.length === 0) {
    // Every line is unavailable. Trying again will not change that by itself.
    return report("not_created", 200, { unavailable: resolved.unavailable }, true);
  }

  let created: CreateOutcome;
  try {
    created = await deps.printify.create({
      externalId: input.sessionId,
      label: `UPL1FT ${input.sessionId.slice(-8)}`,
      lineItems: resolved.lineItems,
      address: {
        name: input.shippingName || "Customer",
        email: input.customerEmail || "",
        phone: input.customerPhone || "",
        ...input.shippingAddress,
      },
    });
  } catch (err) {
    created = { id: null, adopted: false, transient: true, error: err instanceof Error ? err.message : String(err) };
  }

  if (!created.id) {
    if (created.transient) {
      return report(
        "pending_retry",
        500,
        { errorDetail: created.error, unavailable: resolved.unavailable },
        waitingNoticeDue
      );
    }
    return report("not_created", 200, { errorDetail: created.error, unavailable: resolved.unavailable }, true);
  }

  return finish(created.id, created.adopted, resolved.unavailable);
}
