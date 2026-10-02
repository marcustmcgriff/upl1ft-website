// Tests for functions/api/_printify.ts. Run with: npm test  (Node 24 or newer).
// No network: fetch is replaced with a scripted fake.

import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const P = await import(pathToFileURL(path.join(here, "../functions/api/_printify.ts")).href);

const env = { PRINTIFY_API_TOKEN: "test-token", PRINTIFY_SHOP_ID: "111" };
const realFetch = globalThis.fetch;

// Each entry answers one request, in order. A function entry can inspect the request.
function script(answers) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const call = { url: String(url), method: init.method || "GET", body: init.body ? JSON.parse(init.body) : undefined };
    calls.push(call);
    const next = answers.shift();
    if (next === undefined) throw new Error(`unexpected request: ${call.method} ${call.url}`);
    const answer = typeof next === "function" ? next(call) : next;
    if (answer instanceof Error) throw answer;
    return new Response(answer.body === undefined ? "" : JSON.stringify(answer.body), { status: answer.status });
  };
  return calls;
}
test.afterEach(() => {
  globalThis.fetch = realFetch;
});

const product = {
  id: "6a34d07385a983abad0aae16",
  title: "IT IS WRITTEN",
  variants: [
    { id: 103451, title: "XL / Pine Green", is_enabled: true, is_available: true },
    { id: 102266, title: "XL / Black", is_enabled: true, is_available: true },
    { id: 102267, title: "2XL / Black", is_enabled: true, is_available: false },
    { id: 103465, title: "XL / Plum", is_enabled: false, is_available: false },
    { id: 999, title: "Navy / M", is_enabled: true, is_available: true },
  ],
};

test("parseVariantTitle finds the size whichever side it is on", () => {
  assert.deepEqual(P.parseVariantTitle("XL / Pine Green"), { size: "XL", color: "Pine Green" });
  assert.deepEqual(P.parseVariantTitle("Navy / M"), { size: "M", color: "Navy" });
  assert.equal(P.parseVariantTitle("Pine Green"), null);
  assert.equal(P.parseVariantTitle("Red / Blue"), null);
});

test("lookupVariant says why a variant cannot be ordered", () => {
  assert.equal(P.lookupVariant(product, "pine  green", "xl").variant.id, 103451);
  assert.equal(P.lookupVariant(product, "Navy", "M").variant.id, 999);
  assert.equal(P.lookupVariant(product, "Black", "2XL").problem, "out_of_stock");
  assert.equal(P.lookupVariant(product, "Plum", "XL").problem, "disabled");
  assert.equal(P.lookupVariant(product, "Faded Black", "XL").problem, "no_such_variant");
});

test("ids are matched as own properties only", () => {
  assert.equal(P.printifyProductId("4"), "6a34d07385a983abad0aae16");
  assert.equal(P.printifyProductId("constructor"), null);
  assert.equal(P.printifyProductId("__proto__"), null);
  assert.equal(P.printifyProductId(4), null);
  assert.equal(P.isPrintifyOrderId("6abee607070a1927b2035cab"), true);
  assert.equal(P.isPrintifyOrderId("162279684"), false);
  assert.equal(P.isPrintifyOrderId(null), false);
});

test("resolveLineItems separates sold out from could-not-ask", async () => {
  const calls = script([{ status: 200, body: product }]);
  const ok = await P.resolveLineItems(env, [
    { productId: "4", size: "XL", color: "Pine Green", quantity: 2 },
    { productId: "4", size: "2XL", color: "Black", quantity: 1 },
    { productId: "constructor", size: "M", color: "Black", quantity: 1 },
  ]);
  assert.equal(calls.length, 1, "one product fetch per product");
  assert.deepEqual(ok.lineItems, [{ product_id: "6a34d07385a983abad0aae16", variant_id: 103451, quantity: 2 }]);
  assert.deepEqual(ok.unavailable.map((u) => u.reason), ["out_of_stock", "unknown_product"]);
  assert.equal(ok.unknown.length, 0);

  script([{ status: 503, body: { message: "down" } }, { status: 503, body: { message: "down" } }]);
  const down = await P.resolveLineItems(env, [{ productId: "4", size: "XL", color: "Pine Green", quantity: 1 }]);
  assert.equal(down.unavailable.length, 0, "an outage is not sold out");
  assert.equal(down.unknown.length, 1);
  assert.match(down.unknownDetail, /HTTP 503/);

  script([{ status: 401, body: { message: "Unauthenticated." } }]);
  const expired = await P.resolveLineItems(env, [{ productId: "4", size: "XL", color: "Pine Green", quantity: 1 }]);
  assert.equal(expired.unknown.length, 1, "an expired token is not sold out either");

  const noToken = await P.resolveLineItems({ PRINTIFY_API_TOKEN: "" }, [{ productId: "4", size: "XL", color: "Pine Green", quantity: 1 }]);
  assert.equal(noToken.unknown.length, 1);
});

test("a read is tried a second time unless the caller is in a hurry", async () => {
  let calls = script([{ status: 503, body: {} }, { status: 200, body: product }]);
  assert.equal((await P.getProduct(env, "6a34d07385a983abad0aae16")).ok, true);
  assert.equal(calls.length, 2);

  calls = script([{ status: 503, body: {} }]);
  const hurried = await P.getProduct(env, "6a34d07385a983abad0aae16", { timeoutMs: 4000, retry: false });
  assert.equal(hurried.ok, false);
  assert.equal(hurried.transient, true);
  assert.equal(calls.length, 1);

  calls = script([{ status: 503, body: {} }]);
  const stock = await P.resolveLineItems(env, [{ productId: "4", size: "XL", color: "Pine Green", quantity: 1 }], { retry: false });
  assert.equal(stock.unknown.length, 1, "still not sold out, only unknown");
  assert.equal(calls.length, 1);

  calls = script([{ status: 500, body: {} }]);
  assert.equal((await P.submitIfReady(env, "x", { retry: false })).state, "error");
  assert.equal(calls.length, 1);
});

test("findOrderByExternalId finds the order made for a Stripe session", async () => {
  const list = {
    current_page: 1,
    data: [
      { id: "6abee607070a1927b2035cab", status: "on-hold", metadata: { order_type: "api", shop_order_id: "cs_live_abc12345678", shop_order_label: "UPL1FT 12345678" } },
      { id: "6a34d4aba7575389e705c504", status: "fulfilled", metadata: { order_type: "sample" } },
    ],
  };
  const calls = script([{ status: 200, body: list }]);
  assert.deepEqual(await P.findOrderByExternalId(env, "cs_live_abc12345678"), { ok: true, id: "6abee607070a1927b2035cab", detail: null });
  assert.match(calls[0].url, /\/shops\/111\/orders\.json\?limit=50&page=1$/);

  script([{ status: 200, body: list }]);
  assert.deepEqual(await P.findOrderByExternalId(env, "cs_live_other"), { ok: true, id: null, detail: null });

  script([{ status: 200, body: { current_page: 1, data: [] } }]);
  assert.deepEqual(await P.findOrderByExternalId(env, "cs_live_abc12345678"), { ok: true, id: null, detail: null });

  // "Could not ask" must never read as "there is no such order".
  script([{ status: 503, body: {} }, { status: 503, body: {} }]);
  const down = await P.findOrderByExternalId(env, "cs_live_abc12345678");
  assert.equal(down.ok, false);
  assert.equal(down.id, null);

  script([{ status: 200, body: { message: "unexpected" } }]);
  assert.equal((await P.findOrderByExternalId(env, "cs_live_abc12345678")).ok, false);
});

const address = { name: "Test Buyer", email: "buyer@example.com", line1: "1 Main St", city: "Springfield", state: "IL", postal_code: "62701", country: "US" };
const lineItems = [{ product_id: "p", variant_id: 1, quantity: 1 }];

test("createOrder creates without sending to production", async () => {
  const calls = script([{ status: 200, body: { id: "6abee607070a1927b2035cab" } }]);
  const result = await P.createOrder(env, { externalId: "cs_live_abc12345678", lineItems, address });
  assert.deepEqual(result, { id: "6abee607070a1927b2035cab", adopted: false, transient: false, error: null });
  assert.equal(calls.length, 1, "no send_to_production call");
  assert.match(calls[0].url, /\/shops\/111\/orders\.json$/);
  assert.equal(calls[0].body.external_id, "cs_live_abc12345678");
  assert.equal(calls[0].body.send_shipping_notification, false);
  assert.equal(calls[0].body.address_to.first_name, "Test");
  assert.equal(calls[0].body.address_to.last_name, "Buyer");
  assert.equal(calls[0].body.address_to.region, "IL");
});

test("createOrder reuses the order Printify already has for the payment", async () => {
  script([
    {
      status: 409,
      body: { status: "error", code: 8503, errors: { reason: "Order already exists for the given external_id." }, order: { id: "6abee607070a1927b2035cab" } },
    },
  ]);
  const result = await P.createOrder(env, { externalId: "cs_1", lineItems, address });
  assert.equal(result.id, "6abee607070a1927b2035cab");
  assert.equal(result.adopted, true);
});

test("createOrder sends one POST and reports what kind of failure it was", async () => {
  // A POST that got no clear answer may still be running at Printify, so it is never
  // sent a second time here. The caller tries again later.
  let calls = script([{ status: 503, body: {} }]);
  const outage = await P.createOrder(env, { externalId: "cs_2", lineItems, address });
  assert.equal(outage.id, null);
  assert.equal(outage.transient, true);
  assert.equal(calls.length, 1, "no second POST on top of one that may still be running");

  calls = script([new Error("socket hang up")]);
  const network = await P.createOrder(env, { externalId: "cs_3", lineItems, address });
  assert.equal(network.id, null);
  assert.equal(network.transient, true);
  assert.equal(calls.length, 1);

  calls = script([{ status: 400, body: { code: 8150, message: "Validation failed.", errors: { reason: "address_to.zip is invalid" } } }]);
  const invalid = await P.createOrder(env, { externalId: "cs_4", lineItems, address });
  assert.equal(invalid.id, null);
  assert.equal(invalid.transient, false, "a rejected order will not work later either");
  assert.equal(calls.length, 1);
  assert.match(invalid.error, /zip is invalid/);
});

test("a one-word name still produces a first and last name", async () => {
  const calls = script([{ status: 200, body: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" } }]);
  await P.createOrder(env, { externalId: "cs_5", lineItems, address: { ...address, name: "Cher" } });
  assert.equal(calls[0].body.address_to.first_name, "Cher");
  assert.equal(calls[0].body.address_to.last_name, "Cher");
});

test("submitIfReady only submits an order that is on hold and was never submitted", async () => {
  script([{ status: 200, body: { id: "x", status: "pending" } }]);
  assert.equal((await P.submitIfReady(env, "x")).state, "not_ready");

  script([{ status: 200, body: { id: "x", status: "cost-calculation" } }]);
  assert.equal((await P.submitIfReady(env, "x")).state, "not_ready");

  let calls = script([{ status: 200, body: { id: "x", status: "on-hold", sent_to_production_at: null } }, { status: 200, body: {} }]);
  assert.equal((await P.submitIfReady(env, "x")).state, "sent");
  assert.match(calls[1].url, /\/orders\/x\/send_to_production\.json$/);
  assert.equal(calls[1].method, "POST");

  calls = script([{ status: 200, body: { id: "x", status: "in-production", sent_to_production_at: "2026-10-01 10:00:00+00:00" } }]);
  assert.equal((await P.submitIfReady(env, "x")).state, "already_sent");
  assert.equal(calls.length, 1);

  script([{ status: 200, body: { id: "x", status: "on-hold", sent_to_production_at: "2026-10-01 10:00:00+00:00" } }]);
  assert.equal((await P.submitIfReady(env, "x")).state, "blocked", "back on hold after submission needs a person");

  script([{ status: 200, body: { id: "x", status: "canceled" } }]);
  assert.equal((await P.submitIfReady(env, "x")).state, "blocked");

  script([{ status: 200, body: { id: "x", status: "payment-not-received" } }]);
  assert.equal((await P.submitIfReady(env, "x")).state, "blocked");

  // Refused, and a second look shows it is still on hold. Not "blocked" yet: the
  // other submitter may have been first and Printify not caught up.
  script([
    { status: 200, body: { id: "x", status: "on-hold" } },
    { status: 400, body: { code: 8502, message: "Operation failed." } },
    { status: 200, body: { id: "x", status: "on-hold" } },
  ]);
  const refused = await P.submitIfReady(env, "x");
  assert.equal(refused.state, "refused");
  assert.match(refused.detail, /8502/);

  // Refused because the other submitter got there first: not a problem.
  script([
    { status: 200, body: { id: "x", status: "on-hold" } },
    { status: 400, body: { code: 8502, message: "Operation failed." } },
    { status: 200, body: { id: "x", status: "in-production", sent_to_production_at: "2026-10-01 10:00:00+00:00" } },
  ]);
  assert.equal((await P.submitIfReady(env, "x")).state, "already_sent");

  script([{ status: 200, body: { id: "x", status: "on-hold" } }, { status: 503, body: {} }]);
  assert.equal((await P.submitIfReady(env, "x")).state, "error");

  script([{ status: 500, body: {} }, { status: 500, body: {} }]);
  assert.equal((await P.submitIfReady(env, "x")).state, "error");
});

test("an order that still reads on-hold just after it was submitted is not a problem", async () => {
  const now = Date.parse("2026-10-01T10:05:00Z");
  const justSent = { id: "x", status: "on-hold", sent_to_production_at: "2026-10-01 10:00:00+00:00" };
  assert.equal(P.attentionReason(justSent, now), null, "five minutes after submission");
  assert.match(P.attentionReason(justSent, now + 60 * 60 * 1000), /on-hold/, "an hour after submission");

  const state = P.deriveOrderState(justSent, now);
  assert.equal(state.attention, null);
  assert.equal(state.status, "processing");
  assert.equal(state.readyToSubmit, false, "it is never submitted a second time");

  // submitIfReady reads the clock itself: a submission a minute ago counts as sent.
  const aMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const calls = script([{ status: 200, body: { id: "x", status: "on-hold", sent_to_production_at: aMinuteAgo } }]);
  assert.equal((await P.submitIfReady(env, "x")).state, "already_sent");
  assert.equal(calls.length, 1, "no second submission");
});

test("sendToProductionWhenReady looks again after a refusal", async () => {
  // The Printify webhook submitted the order a moment earlier; Printify refuses this
  // submission and needs one more poll before it shows the order as sent.
  const calls = script([
    { status: 200, body: { id: "x", status: "on-hold" } },
    { status: 400, body: { code: 8502, message: "Operation failed." } },
    { status: 200, body: { id: "x", status: "on-hold" } },
    { status: 200, body: { id: "x", status: "sending-to-production", sent_to_production_at: "2026-10-01 10:00:00+00:00" } },
  ]);
  const result = await P.sendToProductionWhenReady(env, "x", 2000, 20, 50);
  assert.equal(result.state, "already_sent");
  assert.equal(calls.length, 4);

  // A refusal that never clears is reported as such when the time is up.
  script(
    Array.from({ length: 60 }, (_, i) =>
      i % 3 === 1 ? { status: 400, body: { code: 8502, message: "Operation failed." } } : { status: 200, body: { id: "x", status: "on-hold" } }
    )
  );
  const stuck = await P.sendToProductionWhenReady(env, "x", 150, 30, 10);
  assert.equal(stuck.state, "refused");
  assert.match(stuck.detail, /8502/);
});

test("sendToProductionWhenReady waits through pending and cost-calculation", async () => {
  const calls = script([
    { status: 200, body: { id: "x", status: "pending" } },
    { status: 200, body: { id: "x", status: "cost-calculation" } },
    { status: 200, body: { id: "x", status: "on-hold" } },
    { status: 200, body: {} },
  ]);
  const result = await P.sendToProductionWhenReady(env, "x", 2000, 20, 50);
  assert.equal(result.state, "sent");
  assert.equal(calls.length, 4);
});

test("sendToProductionWhenReady gives up quietly when Printify stays busy", async () => {
  script(Array.from({ length: 50 }, () => ({ status: 200, body: { id: "x", status: "pending" } })));
  const result = await P.sendToProductionWhenReady(env, "x", 120, 30, 10);
  assert.equal(result.state, "not_ready");
  assert.equal(result.printifyStatus, "pending");
});

test("sendToProductionWhenReady starts no look it has no time to finish", async () => {
  // Budget 400 ms, and another look would need a 150 ms pause plus 300 ms: one look only.
  const calls = script(Array.from({ length: 50 }, () => ({ status: 200, body: { id: "x", status: "pending" } })));
  const result = await P.sendToProductionWhenReady(env, "x", 400, 150, 300);
  assert.equal(result.state, "not_ready");
  assert.equal(calls.length, 1);
});

test("sendToProductionWhenReady keeps looking after a failed read, without doubling it", async () => {
  const calls = script([
    { status: 503, body: {} },
    { status: 200, body: { id: "x", status: "on-hold" } },
    { status: 200, body: {} },
  ]);
  const result = await P.sendToProductionWhenReady(env, "x", 2000, 20, 50);
  assert.equal(result.state, "sent");
  assert.equal(calls.length, 3);
  assert.equal(calls[2].method, "POST");
});

// The shape of a real fulfilled order from this shop (two parcels).
const fulfilled = {
  id: "6a34d4aba7575389e705c504",
  status: "fulfilled",
  sent_to_production_at: "2026-06-19 05:36:57+00:00",
  fulfilled_at: "2026-06-23 04:24:51+00:00",
  line_items: [{ estimated_delivery_at: "2026-06-29T02:35:20.000Z" }, { estimated_delivery_at: "2026-06-29T05:36:57.000Z" }],
  shipments: [
    { carrier: "ONTRAC", number: "1LS1", url: "https://t.example/1", delivered_at: "2026-06-24 16:42:40+00:00", shipped_at: "2026-06-21 02:16:46+00:00" },
    { carrier: "USPS", number: "9400", url: "https://t.example/2", delivered_at: "2026-06-30 15:30:42+00:00", shipped_at: "2026-06-23 04:24:51+00:00" },
  ],
};

test("deriveOrderState reads delivery from the parcels", () => {
  const done = P.deriveOrderState(fulfilled);
  assert.equal(done.status, "delivered");
  assert.equal(done.allDelivered, true);
  assert.equal(done.shipmentCount, 2);
  assert.equal(done.shipDate, "2026-06-21T02:16:46.000Z");
  assert.equal(done.estimatedDelivery, "2026-06-29T12:00:00.000Z");
  assert.equal(done.attention, null);
  assert.equal(done.readyToSubmit, false);

  const oneLeft = structuredClone(fulfilled);
  oneLeft.status = "partially-fulfilled";
  oneLeft.shipments[1].delivered_at = null;
  const moving = P.deriveOrderState(oneLeft);
  assert.equal(moving.status, "shipped", "one delivered parcel does not deliver the order");
  assert.equal(moving.shipment.number, "9400", "the tracking slot shows the parcel still in transit");
  assert.equal(moving.shipmentShippedAt, "2026-06-23T04:24:51.000Z", "the ship date of the parcel in the slot");
  assert.equal(moving.shipmentIsLatest, true);
  assert.equal(moving.shipDate, "2026-06-21T02:16:46.000Z", "the order ship date stays that of the first parcel");

  // The later parcel arrives first: the slot falls back to the earlier one, which is
  // not news to the customer.
  const earlierLeft = structuredClone(fulfilled);
  earlierLeft.status = "partially-fulfilled";
  earlierLeft.shipments[0].delivered_at = null;
  const fallback = P.deriveOrderState(earlierLeft);
  assert.equal(fallback.status, "shipped");
  assert.equal(fallback.shipment.number, "1LS1");
  assert.equal(fallback.shipmentShippedAt, "2026-06-21T02:16:46.000Z");
  assert.equal(fallback.shipmentIsLatest, false);

  const none = P.deriveOrderState({ id: "x", status: "in-production" });
  assert.equal(none.shipment, null);
  assert.equal(none.shipmentShippedAt, null);
  assert.equal(none.shipmentIsLatest, false);

  assert.equal(P.deriveOrderState({ id: "x", status: "in-production", sent_to_production_at: "2026-06-19 05:36:57+00:00" }).status, "processing");
  assert.equal(P.deriveOrderState({ id: "x", status: "pending" }).status, null);
  assert.equal(P.deriveOrderState({ id: "x", status: "canceled" }).status, "cancelled");

  const fresh = P.deriveOrderState({ id: "x", status: "on-hold", sent_to_production_at: null });
  assert.equal(fresh.readyToSubmit, true);
  assert.equal(fresh.attention, null);

  const stuck = P.deriveOrderState({ id: "x", status: "on-hold", sent_to_production_at: "2026-06-19 05:36:57+00:00" });
  assert.equal(stuck.readyToSubmit, false);
  assert.match(stuck.attention, /on-hold/);
  assert.equal(P.deriveOrderState({ id: "x", status: "payment-not-received" }).attention, "payment-not-received");
});

test("an estimate is derived from the ship date when Printify gives none", () => {
  const state = P.deriveOrderState({
    id: "x",
    status: "fulfilled",
    shipments: [{ carrier: "USPS", number: "1", url: "", delivered_at: null, shipped_at: "2026-06-19 05:00:00+00:00" }],
  });
  // Friday 19 June + 7 business days = Tuesday 30 June
  assert.equal(state.estimatedDelivery, "2026-06-30T12:00:00.000Z");
});

test("an estimate that is not after the ship date is replaced", () => {
  const late = structuredClone(fulfilled);
  late.status = "partially-fulfilled";
  late.shipments = [{ carrier: "USPS", number: "9400", url: "https://t.example/2", delivered_at: null, shipped_at: "2026-06-30 15:00:00+00:00" }];
  // Printify still says Monday 29 June, but the parcel left on Tuesday 30 June.
  // 30 June + 7 business days = Thursday 9 July.
  assert.equal(P.deriveOrderState(late).estimatedDelivery, "2026-07-09T12:00:00.000Z");

  late.shipments[0].shipped_at = "2026-06-29 15:00:00+00:00";
  assert.equal(P.deriveOrderState(late).estimatedDelivery, "2026-07-08T12:00:00.000Z", "the same day is not after either");

  late.shipments[0].shipped_at = "2026-06-28 15:00:00+00:00";
  assert.equal(P.deriveOrderState(late).estimatedDelivery, "2026-06-29T12:00:00.000Z", "a later estimate is kept");

  // Before anything has shipped, the Printify estimate is all there is.
  assert.equal(
    P.deriveOrderState({ id: "x", status: "in-production", line_items: [{ estimated_delivery_at: "2026-06-29T02:35:20.000Z" }] }).estimatedDelivery,
    "2026-06-29T12:00:00.000Z"
  );
});

test("mergeStatus never moves an order backwards", () => {
  assert.equal(P.mergeStatus("confirmed", "processing"), "processing");
  assert.equal(P.mergeStatus("shipped", "processing"), "shipped");
  assert.equal(P.mergeStatus("delivered", "shipped"), "delivered");
  assert.equal(P.mergeStatus("processing", null), "processing");
  assert.equal(P.mergeStatus("processing", "cancelled"), "cancelled");
  assert.equal(P.mergeStatus("cancelled", "processing"), "cancelled", "a late event does not revive a cancelled order");
  assert.equal(P.mergeStatus("cancelled", "shipped"), "shipped", "unless Printify shows it really shipped");
  assert.equal(P.mergeStatus(null, "shipped"), "shipped");
});

test("toIso understands Printify's date format", () => {
  assert.equal(P.toIso("2026-06-23 04:24:51+00:00"), "2026-06-23T04:24:51.000Z");
  assert.equal(P.toIso("2026-06-29T02:35:20.000Z"), "2026-06-29T02:35:20.000Z");
  assert.equal(P.toIso(""), null);
  assert.equal(P.toIso("not a date"), null);
});

test("webhook signatures fail closed", async () => {
  const secret = "s3cret";
  const body = JSON.stringify({ type: "order:updated", resource: { id: "6abee607070a1927b2035cab" } });
  const good = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(await P.verifyWebhookSignature(secret, body, good), true);
  assert.equal(await P.verifyWebhookSignature(secret, body + " ", good), false);
  assert.equal(await P.verifyWebhookSignature(secret, body, null), false);
  assert.equal(await P.verifyWebhookSignature(secret, body, "sha256=nothex"), false);
  assert.equal(await P.verifyWebhookSignature("", body, good), false, "no secret configured means nothing is accepted");
  assert.equal(await P.verifyWebhookSignature(undefined, body, good), false);
  assert.equal(await P.verifyWebhookSignature("other", body, good), false);
});
