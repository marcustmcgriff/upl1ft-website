// Tests for functions/api/_order-processing.ts: what happens after Stripe says an
// order is paid. Run with: npm test  (Node 24 or newer). Everything outside the
// function (database, Printify, email) is a fake that records what was asked of it.

import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const { processPaidOrder } = await import(pathToFileURL(path.join(here, "../functions/api/_order-processing.ts")).href);

const SESSION = "cs_live_a1b2c3d4e5f6";

const input = (over = {}) => ({
  sessionId: SESSION,
  paymentIntentId: "pi_1",
  items: [{ productId: "4", name: "IT IS WRITTEN", size: "L", color: "Black", quantity: 1, price: 6000, image: "/x.jpg" }],
  shippingName: "Jane Doe",
  shippingAddress: { line1: "1 Main St", line2: "", city: "Springfield", state: "IL", postal_code: "62701", country: "US" },
  customerEmail: "jane@example.com",
  customerPhone: "",
  userIdHint: null,
  subtotal: 6000,
  discountAmount: 0,
  total: 6000,
  discountCode: null,
  giftMessage: null,
  eventAgeMinutes: 0,
  ...over,
});

const LINE = { product_id: "p4", variant_id: 102265, quantity: 1 };
const GONE = { productId: "4", size: "2XL", color: "Black", quantity: 1, reason: "out_of_stock" };

// A small world with an orders table and a Printify that can be told how to behave.
function world(options = {}) {
  const w = {
    rows: new Map(), // sessionId -> { printifyOrderId, trackingToken, status }
    printifyOrders: new Map(), // externalId -> id
    customerEmails: [],
    adminEmails: [], // reports that were delivered
    adminAttempts: 0,
    adminFails: false, // the email service refuses the owner email
    submitted: [],
    discounts: [],
    createCalls: 0,
    resolveCalls: 0,
    findCalls: 0,
    lookupFails: false,
    insertResult: null, // force "error" or "duplicate"
    linkFails: false,
    claim: true, // what claimUnfinishedOrder answers: true, false or "error"
    findFails: false,
    resolve: () => ({ lineItems: [LINE], unavailable: [], unknown: [], unknownDetail: null }),
    create: null, // override for createOrder
    configured: true,
    ...options,
  };

  const deps = {
    db: options.noDb
      ? null
      : {
          async findOrderBySession(sessionId) {
            if (w.lookupFails) return "error";
            if (w.hideRowOnce) {
              // The other delivery has not written its row yet at this instant.
              w.hideRowOnce = false;
              return null;
            }
            return w.rows.get(sessionId) || null;
          },
          async findUserIdByEmail() {
            return "user-1";
          },
          async insertOrder(row) {
            if (w.insertResult) return w.insertResult;
            if (w.rows.has(row.sessionId)) return "duplicate";
            w.rows.set(row.sessionId, { printifyOrderId: null, trackingToken: row.trackingToken, status: "confirmed" });
            return "inserted";
          },
          async claimUnfinishedOrder() {
            return w.claim;
          },
          async linkPrintifyOrder(sessionId, id) {
            if (w.linkFails) return false;
            w.rows.get(sessionId).printifyOrderId = id;
            return true;
          },
          async recordDiscount(code) {
            w.discounts.push(code);
          },
        },
    printify: {
      get configured() {
        return w.configured;
      },
      async resolve(lines) {
        w.resolveCalls++;
        return w.resolve(lines);
      },
      async create(args) {
        w.createCalls++;
        if (w.create) return w.create(args);
        // Like the real thing: one order per external id.
        if (w.printifyOrders.has(args.externalId)) {
          return { id: w.printifyOrders.get(args.externalId), adopted: true, transient: false, error: null };
        }
        const id = `order-${w.printifyOrders.size + 1}`;
        w.printifyOrders.set(args.externalId, id);
        return { id, adopted: false, transient: false, error: null };
      },
      async findExisting(sessionId) {
        w.findCalls++;
        if (w.findFails) return { ok: false, id: null, detail: "HTTP 503" };
        return { ok: true, id: w.printifyOrders.get(sessionId) || null, detail: null };
      },
      async submitWhenReady(id) {
        w.submitted.push(id);
      },
    },
    email: {
      async customerConfirmation(order, token) {
        w.customerEmails.push({ to: order.customerEmail, token });
      },
      async admin(order, report) {
        w.adminAttempts++;
        if (w.adminFails) return false;
        w.adminEmails.push(report);
        return true;
      },
    },
    newTrackingToken: () => "token-1",
    defer: (work) => {
      w.deferred = (w.deferred || []).concat(work);
    },
    log: () => {},
  };
  w.run = async (over) => {
    const result = await processPaidOrder(deps, input(over));
    await Promise.all(w.deferred || []);
    return result;
  };
  return w;
}

test("a paid order is saved, ordered, submitted and announced once", async () => {
  const w = world();
  const result = await w.run();
  assert.deepEqual(result, { httpStatus: 200, outcome: "created" });
  assert.equal(w.rows.get(SESSION).printifyOrderId, "order-1");
  assert.deepEqual(w.customerEmails, [{ to: "jane@example.com", token: "token-1" }]);
  assert.equal(w.adminEmails.length, 1);
  assert.equal(w.adminEmails[0].state, "created");
  assert.equal(w.adminEmails[0].printifyOrderId, "order-1");
  assert.equal(w.adminEmails[0].isRetry, false);
  assert.equal(w.adminEmails[0].adopted, false);
  assert.deepEqual(w.submitted, ["order-1"]);
  assert.equal(w.findCalls, 0, "a first attempt never needs to search Printify");
});

test("Stripe sending the same event again changes nothing", async () => {
  const w = world();
  await w.run();
  const again = await w.run();
  assert.deepEqual(again, { httpStatus: 200, outcome: "already_processed" });
  assert.equal(w.printifyOrders.size, 1);
  assert.equal(w.createCalls, 1, "Printify is not asked to create again");
  assert.equal(w.customerEmails.length, 1);
  assert.equal(w.adminEmails.length, 1);
});

test("the row is written before Printify is called", async () => {
  const w = world({
    create: () => {
      assert.ok(w.rows.has(SESSION), "row exists when Printify is called");
      return { id: "order-1", adopted: false, transient: false, error: null };
    },
  });
  await w.run();
  assert.equal(w.createCalls, 1);
});

test("Printify being unreachable is retried, not reported as failed", async () => {
  const w = world();
  w.resolve = () => ({ lineItems: [], unavailable: [], unknown: [{ productId: "4" }], unknownDetail: "HTTP 503" });
  const first = await w.run();
  assert.deepEqual(first, { httpStatus: 500, outcome: "pending_retry" });
  assert.equal(w.createCalls, 0);
  assert.equal(w.customerEmails.length, 1, "the customer is told the order is confirmed: it is paid and saved");
  assert.equal(w.adminEmails.length, 1);
  assert.equal(w.adminEmails[0].state, "pending_retry");
  assert.equal(w.adminEmails[0].errorDetail, "HTTP 503");

  // Still down on Stripe's next delivery: no second alert.
  const second = await w.run({ eventAgeMinutes: 6 });
  assert.equal(second.httpStatus, 500);
  assert.equal(w.adminEmails.length, 1);
  assert.equal(w.customerEmails.length, 1);

  // Printify is back.
  w.resolve = () => ({ lineItems: [LINE], unavailable: [], unknown: [], unknownDetail: null });
  const third = await w.run({ eventAgeMinutes: 40 });
  assert.deepEqual(third, { httpStatus: 200, outcome: "created" });
  assert.equal(w.rows.get(SESSION).printifyOrderId, "order-1");
  assert.equal(w.customerEmails.length, 1, "no second confirmation");
  assert.equal(w.adminEmails.length, 2);
  assert.equal(w.adminEmails[1].state, "created");
  assert.equal(w.adminEmails[1].isRetry, true);
});

test("a payment that is still waiting a day later is announced again", async () => {
  const w = world();
  w.resolve = () => ({ lineItems: [], unavailable: [], unknown: [{ productId: "4" }], unknownDetail: "HTTP 401" });
  await w.run();
  await w.run({ eventAgeMinutes: 5 * 60 });
  assert.equal(w.adminEmails.length, 1, "not on every retry");
  await w.run({ eventAgeMinutes: 22 * 60 });
  assert.equal(w.adminEmails.length, 2, "but again once it has waited most of a day");
  assert.equal(w.adminEmails[1].state, "pending_retry");
  assert.equal(w.adminEmails[1].isRetry, true);
  assert.equal(w.customerEmails.length, 1);
});

test("an order that Printify already has is reused, never duplicated", async () => {
  const w = world();
  // First attempt: Printify creates the order, then the answer is lost.
  w.create = (args) => {
    w.printifyOrders.set(args.externalId, "order-1");
    return { id: null, adopted: false, transient: true, error: "no answer from Printify" };
  };
  const first = await w.run();
  assert.deepEqual(first, { httpStatus: 500, outcome: "pending_retry" });

  w.create = null;
  const second = await w.run();
  assert.deepEqual(second, { httpStatus: 200, outcome: "created" });
  assert.equal(w.printifyOrders.size, 1);
  assert.equal(w.rows.get(SESSION).printifyOrderId, "order-1");
  const last = w.adminEmails[w.adminEmails.length - 1];
  assert.equal(last.adopted, true);
  assert.equal(last.printifyOrderId, "order-1");
});

test("an order whose answer was lost is found even after its items sold out", async () => {
  const w = world();
  w.create = (args) => {
    w.printifyOrders.set(args.externalId, "order-1");
    return { id: null, adopted: false, transient: true, error: "no answer from Printify" };
  };
  await w.run();

  // Before Stripe's next delivery every line sells out. Printify still holds order-1.
  w.create = null;
  w.resolve = () => ({ lineItems: [], unavailable: [GONE], unknown: [], unknownDetail: null });
  const second = await w.run();
  assert.deepEqual(second, { httpStatus: 200, outcome: "created" }, "not reported as 'nothing exists in Printify'");
  assert.equal(w.rows.get(SESSION).printifyOrderId, "order-1");
  assert.deepEqual(w.submitted, ["order-1"]);
  assert.equal(w.createCalls, 1, "no second create");
  const last = w.adminEmails[w.adminEmails.length - 1];
  assert.equal(last.state, "created");
  assert.equal(last.adopted, true);
  assert.deepEqual(last.unavailable, [], "today's stock says nothing about an order made earlier");
});

test("an order that could not be saved on the row is not called partial after stock changes", async () => {
  const w = world({ linkFails: true });
  const first = await w.run();
  assert.deepEqual(first, { httpStatus: 500, outcome: "created_unlinked" });

  w.linkFails = false;
  w.resolve = () => ({ lineItems: [LINE], unavailable: [GONE], unknown: [], unknownDetail: null });
  const second = await w.run();
  assert.deepEqual(second, { httpStatus: 200, outcome: "created" });
  assert.equal(w.printifyOrders.size, 1);
  assert.equal(w.rows.get(SESSION).printifyOrderId, "order-1");
  const last = w.adminEmails[w.adminEmails.length - 1];
  assert.equal(last.state, "created");
  assert.equal(last.adopted, true);
});

test("when Printify cannot be searched on a retry, nothing is reported as missing", async () => {
  const w = world();
  w.resolve = () => ({ lineItems: [], unavailable: [], unknown: [{ productId: "4" }], unknownDetail: "HTTP 503" });
  await w.run();

  w.resolve = () => ({ lineItems: [], unavailable: [GONE], unknown: [], unknownDetail: null });
  w.findFails = true;
  const second = await w.run();
  assert.deepEqual(second, { httpStatus: 500, outcome: "pending_retry" });
  assert.equal(w.adminEmails.length, 1, "no 'not ordered' notice while the answer is unknown");

  // The search works again and finds nothing: now it really is not ordered.
  w.findFails = false;
  const third = await w.run();
  assert.deepEqual(third, { httpStatus: 200, outcome: "not_created" });
  assert.equal(w.adminEmails[1].state, "not_created");
  assert.equal(w.adminEmails[1].isRetry, true);
  assert.equal(w.createCalls, 0);
});

test("a rejected order is reported with Printify's reason and not retried", async () => {
  const w = world({ create: () => ({ id: null, adopted: false, transient: false, error: "HTTP 400 - zip is invalid" }) });
  const result = await w.run();
  assert.deepEqual(result, { httpStatus: 200, outcome: "not_created" });
  assert.equal(w.adminEmails[0].state, "not_created");
  assert.match(w.adminEmails[0].errorDetail, /zip is invalid/);
  assert.deepEqual(w.submitted, []);
});

test("sold-out lines are named, and the rest is still ordered", async () => {
  const w = world();
  w.resolve = () => ({ lineItems: [LINE], unavailable: [GONE], unknown: [], unknownDetail: null });
  const result = await w.run();
  assert.deepEqual(result, { httpStatus: 200, outcome: "partial" });
  assert.equal(w.adminEmails[0].state, "partial");
  assert.equal(w.adminEmails[0].printifyOrderId, "order-1");
  assert.deepEqual(w.adminEmails[0].unavailable, [GONE]);
});

test("nothing is created when every line is sold out", async () => {
  const w = world();
  w.resolve = () => ({ lineItems: [], unavailable: [GONE], unknown: [], unknownDetail: null });
  const result = await w.run();
  assert.deepEqual(result, { httpStatus: 200, outcome: "not_created" });
  assert.equal(w.createCalls, 0);
  assert.equal(w.adminEmails[0].state, "not_created");
  assert.deepEqual(w.adminEmails[0].unavailable, [GONE]);
});

test("a notice the owner must act on is sent again when the email service refuses it", async () => {
  const w = world({ adminFails: true });
  w.resolve = () => ({ lineItems: [], unavailable: [GONE], unknown: [], unknownDetail: null });
  const first = await w.run();
  assert.deepEqual(first, { httpStatus: 500, outcome: "not_created_unnotified" }, "Stripe is asked to deliver again");
  assert.equal(w.adminEmails.length, 0);

  w.adminFails = false;
  const second = await w.run();
  assert.deepEqual(second, { httpStatus: 200, outcome: "not_created" });
  assert.equal(w.adminEmails.length, 1);
  assert.equal(w.customerEmails.length, 1, "the customer is not emailed twice");

  const noToken = world({ configured: false, adminFails: true });
  assert.deepEqual(await noToken.run(), { httpStatus: 500, outcome: "not_configured_unnotified" });
  noToken.adminFails = false;
  assert.deepEqual(await noToken.run(), { httpStatus: 200, outcome: "not_configured" });
  assert.equal(noToken.adminEmails.length, 1);
});

test("a database that cannot be read stops everything before any side effect", async () => {
  const w = world({ lookupFails: true });
  const result = await w.run();
  assert.deepEqual(result, { httpStatus: 500, outcome: "db_unavailable" });
  assert.equal(w.createCalls, 0);
  assert.equal(w.customerEmails.length, 0);
  assert.equal(w.adminEmails.length, 0);
});

test("a row that cannot be written stops everything before any side effect", async () => {
  const w = world({ insertResult: "error" });
  const result = await w.run();
  assert.deepEqual(result, { httpStatus: 500, outcome: "db_insert_failed" });
  assert.equal(w.createCalls, 0);
  assert.equal(w.customerEmails.length, 0);
});

test("a second delivery leaves a payment alone while the first is still working on it", async () => {
  const w = world();
  // The other delivery wrote the row moments ago and has not finished.
  w.rows.set(SESSION, { printifyOrderId: null, trackingToken: "token-0", status: "confirmed" });
  w.claim = false;
  const result = await w.run();
  assert.deepEqual(result, { httpStatus: 500, outcome: "busy" });
  assert.equal(w.resolveCalls, 0);
  assert.equal(w.createCalls, 0, "Printify never gets the same order from two attempts at once");
  assert.equal(w.customerEmails.length, 0);
  assert.equal(w.adminEmails.length, 0);

  // Later the first attempt turns out to have died: this one takes over.
  w.claim = true;
  const later = await w.run();
  assert.deepEqual(later, { httpStatus: 200, outcome: "created" });
  assert.equal(w.createCalls, 1);
  assert.equal(w.customerEmails.length, 0, "only the delivery that wrote the row sends the confirmation");
  assert.equal(w.adminEmails[0].isRetry, true);
});

test("losing the race to write the row means waiting, not ordering", async () => {
  // Both deliveries look, neither sees a row, the other one inserts first.
  const w = world({ hideRowOnce: true });
  w.rows.set(SESSION, { printifyOrderId: null, trackingToken: "token-0", status: "confirmed" });
  const result = await w.run();
  assert.deepEqual(result, { httpStatus: 500, outcome: "busy" });
  assert.equal(w.createCalls, 0);
  assert.equal(w.customerEmails.length, 0);
});

test("a claim that cannot be made because the database is down is retried", async () => {
  const w = world({ claim: "error" });
  w.rows.set(SESSION, { printifyOrderId: null, trackingToken: "token-0", status: "confirmed" });
  assert.deepEqual(await w.run(), { httpStatus: 500, outcome: "db_unavailable" });
  assert.equal(w.createCalls, 0);
});

test("a cancelled order is never ordered or pushed to production", async () => {
  // Waiting for Printify, then refunded and cancelled by the owner.
  const w = world();
  w.rows.set(SESSION, { printifyOrderId: null, trackingToken: "token-0", status: "cancelled" });
  const result = await w.run();
  assert.deepEqual(result, { httpStatus: 200, outcome: "cancelled_not_ordered" });
  assert.equal(w.resolveCalls, 0);
  assert.equal(w.createCalls, 0);
  assert.equal(w.adminEmails.length, 0);

  // Already in Printify and cancelled: a repeat delivery does not submit it.
  const linked = world();
  linked.rows.set(SESSION, { printifyOrderId: "order-7", trackingToken: "token-0", status: "cancelled" });
  assert.deepEqual(await linked.run(), { httpStatus: 200, outcome: "cancelled_not_ordered" });
  assert.deepEqual(linked.submitted, []);
});

test("if the Printify id cannot be saved, Stripe is asked to deliver again and the order is found", async () => {
  const w = world({ linkFails: true });
  const first = await w.run();
  assert.deepEqual(first, { httpStatus: 500, outcome: "created_unlinked" });
  assert.equal(w.adminEmails[0].printifyOrderId, "order-1", "the owner still learns the order exists");

  w.linkFails = false;
  const second = await w.run();
  assert.deepEqual(second, { httpStatus: 200, outcome: "created" });
  assert.equal(w.printifyOrders.size, 1);
  assert.equal(w.rows.get(SESSION).printifyOrderId, "order-1");
});

test("a missing Printify token is reported and not retried", async () => {
  const w = world({ configured: false });
  const result = await w.run();
  assert.deepEqual(result, { httpStatus: 200, outcome: "not_configured" });
  assert.equal(w.adminEmails[0].state, "not_configured");
  assert.equal(w.customerEmails.length, 1);
  assert.equal(w.resolveCalls, 0);
});

test("a discount is recorded once, by the attempt that wrote the row", async () => {
  const w = world();
  await w.run({ discountCode: "TEST99" });
  await w.run({ discountCode: "TEST99" });
  assert.deepEqual(w.discounts, ["TEST99"]);
});

test("an already-linked order is nudged towards production on a repeat delivery", async () => {
  const w = world();
  await w.run();
  w.submitted.length = 0;
  await w.run();
  assert.deepEqual(w.submitted, ["order-1"]);
});

test("email trouble never loses the order", async () => {
  const w = world();
  const result = await processPaidOrder(
    {
      db: null,
      printify: {
        configured: true,
        resolve: async () => ({ lineItems: [LINE], unavailable: [], unknown: [], unknownDetail: null }),
        create: async () => ({ id: "order-9", adopted: false, transient: false, error: null }),
        findExisting: async () => ({ ok: true, id: null, detail: null }),
        submitWhenReady: async (id) => {
          w.submitted.push(id);
        },
      },
      email: {
        customerConfirmation: async () => {
          throw new Error("resend down");
        },
        admin: async () => {
          throw new Error("resend down");
        },
      },
      newTrackingToken: () => "t",
      defer: () => {},
      log: () => {},
    },
    input()
  );
  assert.deepEqual(result, { httpStatus: 200, outcome: "created" });
});

test("a crash while asking Printify is treated as temporary", async () => {
  const w = world();
  w.resolve = () => {
    throw new Error("boom");
  };
  const result = await w.run();
  assert.deepEqual(result, { httpStatus: 500, outcome: "pending_retry" });
  assert.equal(w.adminEmails[0].errorDetail, "boom");
});
