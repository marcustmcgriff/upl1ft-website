// Shared Printify helpers for Cloudflare Pages Functions.
//
// This file exports no onRequest handler, so Cloudflare Pages does not route it. It
// imports nothing, so the tests in tests/ can load it directly with Node.
//
// Printify replaced Printful as the fulfillment supplier (AS Colour 5080 blanks).
// Orders are created against the products saved in the UPL1FT Printify shop. A cart
// line is matched to a variant by the size and color parts of the variant title, so
// no variant ids are hard-coded.
//
// Facts this code relies on (checked against the live API on 2026-10-01):
//  - A new order is "pending", then "cost-calculation", and only reaches "on-hold"
//    about 15 to 25 seconds after it is created. send_to_production is refused before
//    that, so submission has to wait (sendToProductionWhenReady).
//  - Posting an order whose external_id already exists answers 409 (code 8503) and
//    returns the id of the existing order, which makes creation safe to repeat. This
//    was seen for a second POST sent AFTER the first had finished. What happens when
//    two POSTs overlap is not known, so createOrder never repeats a POST by itself.
//  - The orders list shows the external id as metadata.shop_order_id, newest order
//    first, up to 50 per page (findOrderByExternalId).
//  - Orders can be created by API for draft products in a shop with no sales channel.
//  - An empty phone number is accepted.
//  - The shop's order submission setting is "Automatically (24 hours)" (Printify,
//    Store settings, Order settings; seen on 2026-10-01). Printify therefore sends an
//    on-hold order to production by itself after a day. That is the backstop if every
//    attempt here fails; if the setting is ever changed to Manual, there is none.
//  - Access tokens expire one year after they are generated (this one: 2026-09-18).
//
// How those facts were checked: an order was created through this API for IT IS
// WRITTEN, XL, Pine Green, read back every second, posted a second time with the same
// external_id, and cancelled while on hold. Nothing was sent to production.

const PRINTIFY_API = "https://api.printify.com/v1";
const USER_AGENT = "UPL1FT-Store/1.0 (upl1ft.org)";
const REQUEST_TIMEOUT_MS = 8000;
const CREATE_TIMEOUT_MS = 15000; // creating an order takes about 5 seconds

export interface PrintifyEnv {
  PRINTIFY_API_TOKEN: string;
  PRINTIFY_SHOP_ID?: string;
  // Local testing only: point the helpers at a stand-in server. Never set in production.
  PRINTIFY_API_BASE?: string;
}

// Default shop: the UPL1FT store in Printify.
export const DEFAULT_PRINTIFY_SHOP_ID = "27973036";

// Site product id -> Printify product id (all AS Colour 5080, saved as drafts in Printify).
export const PRINTIFY_PRODUCT_MAP: Record<string, string> = {
  "4": "6a34d07385a983abad0aae16", // IT IS WRITTEN
  "2": "6a48f87392a4d3adbf008ffb", // COMFORT KILLS POTENTIAL
  "3": "6a49199f92a4d3adbf009c24", // HIS PAIN, OUR GAIN
  "1": "6a491bb162112a44f506f75c", // LIVE BY FAITH, NOT BY SIGHT
};

// Own-property lookup, so ids like "constructor" never match.
export function printifyProductId(siteProductId: unknown): string | null {
  if (typeof siteProductId !== "string") return null;
  return Object.prototype.hasOwnProperty.call(PRINTIFY_PRODUCT_MAP, siteProductId)
    ? PRINTIFY_PRODUCT_MAP[siteProductId]
    : null;
}

export interface PrintifyVariant {
  id: number;
  title: string; // "<Size> / <Color>", e.g. "XL / Pine Green"
  is_enabled: boolean;
  is_available: boolean;
}

export interface PrintifyProduct {
  id: string;
  title: string;
  variants: PrintifyVariant[];
}

export interface PrintifyShipment {
  carrier: string;
  number: string;
  url: string;
  delivered_at: string | null;
  shipped_at?: string | null;
}

export interface PrintifyOrder {
  id: string;
  status: string;
  shipments?: PrintifyShipment[];
  line_items?: { estimated_delivery_at?: string | null }[];
  sent_to_production_at?: string | null;
  fulfilled_at?: string | null;
  created_at?: string;
  // shop_order_id is the external_id the order was created with (the Stripe session id).
  metadata?: { shop_order_id?: string | number | null; shop_order_label?: string | null };
}

export interface OrderLineInput {
  productId: string;
  size: string;
  color: string;
  quantity: number;
}

export interface OrderAddressInput {
  name: string;
  email: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface PrintifyLineItem {
  product_id: string;
  variant_id: number;
  quantity: number;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

export interface ApiOk<T> {
  ok: true;
  status: number;
  data: T;
}

export interface ApiFailure {
  ok: false;
  status: number; // 0 = the request never got an answer (network error or timeout)
  transient: boolean; // true when trying again later could succeed (429, 5xx, network)
  detail: string;
  body?: any;
}

export type ApiResult<T> = ApiOk<T> | ApiFailure;

export function shopId(env: PrintifyEnv): string {
  return env.PRINTIFY_SHOP_ID || DEFAULT_PRINTIFY_SHOP_ID;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describeFailure(status: number, body: any, text: string): string {
  const parts: string[] = [`HTTP ${status}`];
  if (body && typeof body === "object") {
    if (body.code !== undefined) parts.push(`code ${body.code}`);
    if (typeof body.message === "string") parts.push(body.message);
    const reason = body.errors && typeof body.errors === "object" ? body.errors.reason : undefined;
    if (typeof reason === "string") parts.push(reason);
  } else if (text) {
    parts.push(text.slice(0, 160));
  }
  return parts.join(" - ").slice(0, 400);
}

async function request<T>(
  env: PrintifyEnv,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<ApiResult<T>> {
  if (!env.PRINTIFY_API_TOKEN) {
    return { ok: false, status: 0, transient: false, detail: "PRINTIFY_API_TOKEN is not configured" };
  }

  let res: Response;
  try {
    res = await fetch(`${env.PRINTIFY_API_BASE || PRINTIFY_API}/shops/${shopId(env)}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${env.PRINTIFY_API_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, transient: true, detail: `no answer from Printify (${message.slice(0, 160)})` };
  }

  let text = "";
  try {
    text = await res.text();
  } catch {
    text = "";
  }
  let parsed: any = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (res.ok) return { ok: true, status: res.status, data: parsed as T };

  return {
    ok: false,
    status: res.status,
    transient: res.status === 429 || res.status >= 500,
    detail: describeFailure(res.status, parsed, text),
    body: parsed,
  };
}

// How long a read may take. The default (8 seconds, tried once more when the first
// failure looks temporary) suits work nobody is waiting on. A caller with a customer
// waiting on the answer passes a short timeout and no second try.
export interface ReadOptions {
  timeoutMs?: number;
  retry?: boolean;
}

async function read<T>(env: PrintifyEnv, path: string, opts: ReadOptions = {}): Promise<ApiResult<T>> {
  const timeoutMs = opts.timeoutMs ?? REQUEST_TIMEOUT_MS;
  let result = await request<T>(env, "GET", path, undefined, timeoutMs);
  if (!result.ok && result.transient && opts.retry !== false) {
    await sleep(400);
    result = await request<T>(env, "GET", path, undefined, timeoutMs);
  }
  return result;
}

export function getProduct(env: PrintifyEnv, productId: string, opts?: ReadOptions): Promise<ApiResult<PrintifyProduct>> {
  return read<PrintifyProduct>(env, `/products/${productId}.json`, opts);
}

export function getOrder(env: PrintifyEnv, orderId: string, opts?: ReadOptions): Promise<ApiResult<PrintifyOrder>> {
  return read<PrintifyOrder>(env, `/orders/${orderId}.json`, opts);
}

export interface FindOrderResult {
  ok: boolean; // false when Printify could not be asked
  id: string | null; // the order made with this external id, when there is one
  detail: string | null;
}

// Looks for an order that was created with this external id (the Stripe session id).
// It reads the 50 newest orders only. That is enough for its one use: a repeat
// delivery of a payment, which comes within three days of the first attempt.
export async function findOrderByExternalId(
  env: PrintifyEnv,
  externalId: string,
  opts?: ReadOptions
): Promise<FindOrderResult> {
  const listed = await read<{ data?: PrintifyOrder[] }>(env, "/orders.json?limit=50&page=1", opts);
  if (!listed.ok) return { ok: false, id: null, detail: listed.detail };
  if (!listed.data || !Array.isArray(listed.data.data)) {
    return { ok: false, id: null, detail: "Printify returned no order list" };
  }
  const hit = listed.data.data.find(
    (order) => !!order && !!order.metadata && String(order.metadata.shop_order_id ?? "") === externalId
  );
  return { ok: true, id: hit && hit.id ? String(hit.id) : null, detail: null };
}

// Printify order ids are 24 hexadecimal characters. Old rows hold Printful ids (digits).
export function isPrintifyOrderId(id: unknown): id is string {
  return typeof id === "string" && /^[0-9a-f]{24}$/i.test(id);
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

const SIZE_TOKENS = new Set(["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "5xl", "xxl", "xxxl"]);

// Printify titles this blueprint's variants "<Size> / <Color>" (e.g. "XL / Pine Green"),
// but the part order differs between blueprints, so the size part is found by value.
export function parseVariantTitle(title: string): { size: string; color: string } | null {
  const parts = String(title || "")
    .split("/")
    .map((p) => p.trim());
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  if (SIZE_TOKENS.has(norm(parts[0]))) return { size: parts[0], color: parts[1] };
  if (SIZE_TOKENS.has(norm(parts[1]))) return { size: parts[1], color: parts[0] };
  return null;
}

export type VariantProblem = "no_such_variant" | "disabled" | "out_of_stock";

// The variant for a color + size (case and spacing are ignored), and why it cannot
// be ordered when it cannot.
export function lookupVariant(
  product: PrintifyProduct,
  color: string,
  size: string
): { variant: PrintifyVariant | null; problem: VariantProblem | null } {
  const wantColor = norm(String(color || ""));
  const wantSize = norm(String(size || ""));
  const match = (product.variants || []).find((v) => {
    const parsed = parseVariantTitle(v.title);
    return !!parsed && norm(parsed.color) === wantColor && norm(parsed.size) === wantSize;
  });
  if (!match) return { variant: null, problem: "no_such_variant" };
  if (!match.is_enabled) return { variant: null, problem: "disabled" };
  if (!match.is_available) return { variant: null, problem: "out_of_stock" };
  return { variant: match, problem: null };
}

export interface UnavailableLine extends OrderLineInput {
  reason: "unknown_product" | VariantProblem;
}

export interface ResolveResult {
  lineItems: PrintifyLineItem[];
  // Printify answered, and these lines cannot be ordered.
  unavailable: UnavailableLine[];
  // Printify could not be asked (expired token, rate limit, outage). NOT the same as sold out.
  unknown: OrderLineInput[];
  unknownDetail: string | null;
}

export async function resolveLineItems(
  env: PrintifyEnv,
  lines: OrderLineInput[],
  opts?: ReadOptions
): Promise<ResolveResult> {
  const products = new Map<string, ApiResult<PrintifyProduct>>();
  const out: ResolveResult = { lineItems: [], unavailable: [], unknown: [], unknownDetail: null };

  for (const line of lines) {
    const productId = printifyProductId(line.productId);
    if (!productId) {
      out.unavailable.push({ ...line, reason: "unknown_product" });
      continue;
    }
    if (!products.has(productId)) products.set(productId, await getProduct(env, productId, opts));
    const fetched = products.get(productId)!;
    if (!fetched.ok || !fetched.data || !Array.isArray(fetched.data.variants)) {
      out.unknown.push(line);
      out.unknownDetail = fetched.ok ? "Printify returned no variants" : fetched.detail;
      continue;
    }
    const { variant, problem } = lookupVariant(fetched.data, line.color, line.size);
    if (!variant) {
      out.unavailable.push({ ...line, reason: problem || "no_such_variant" });
      continue;
    }
    out.lineItems.push({ product_id: productId, variant_id: variant.id, quantity: line.quantity });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "Customer", last: "Customer" };
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

export interface CreateOrderResult {
  id: string | null;
  adopted: boolean; // Printify already had an order with this external id
  transient: boolean; // trying again later could succeed
  error: string | null;
}

// Creates the order. It does NOT send it to production: Printify refuses that until
// the order reaches "on-hold" (see sendToProductionWhenReady).
// The external id is the Stripe session id. Printify keeps it unique, so calling this
// twice for one payment returns the same order instead of making a second one.
export async function createOrder(
  env: PrintifyEnv,
  args: { externalId: string; label?: string; lineItems: PrintifyLineItem[]; address: OrderAddressInput }
): Promise<CreateOrderResult> {
  const { first, last } = splitName(args.address.name || "");
  const body = {
    external_id: args.externalId,
    label: args.label || `UPL1FT ${args.externalId.slice(-8)}`,
    line_items: args.lineItems,
    shipping_method: 1, // standard
    is_printify_express: false,
    is_economy_shipping: false,
    // UPL1FT sends its own branded shipping email (printify-webhook.ts).
    send_shipping_notification: false,
    address_to: {
      first_name: first,
      last_name: last,
      email: args.address.email || "",
      phone: args.address.phone || "",
      country: args.address.country || "US",
      region: args.address.state || "",
      address1: args.address.line1 || "",
      address2: args.address.line2 || "",
      city: args.address.city || "",
      zip: args.address.postal_code || "",
    },
  };

  // One POST, never repeated here. After a timeout or a 5xx the first request may
  // still be running at Printify, and a second one sent on top of it could make a
  // second order. The caller reports "try again later"; by then the first request has
  // finished, and a repeat either creates the order or gets 409 with the existing id.
  const result = await request<{ id: string }>(env, "POST", "/orders.json", body, CREATE_TIMEOUT_MS);

  if (result.ok) {
    const id = result.data && result.data.id ? String(result.data.id) : null;
    return id
      ? { id, adopted: false, transient: false, error: null }
      : { id: null, adopted: false, transient: true, error: "Printify answered without an order id" };
  }

  const existing = result.status === 409 && result.body && result.body.order ? result.body.order.id : null;
  if (existing) return { id: String(existing), adopted: true, transient: false, error: null };

  return { id: null, adopted: false, transient: result.transient, error: result.detail };
}

// Statuses that mean a human has to look at the order in Printify.
const ATTENTION_STATUSES = new Set([
  "payment-not-received",
  "has-issues",
  "unfulfillable",
  "source-check-failed",
  "canceled",
  "cancelled",
]);

const IN_PRODUCTION_STATUSES = new Set([
  "sending-to-production",
  "sending_to_production_delegate",
  "sending_to_production_delegate_sync",
  "in-production",
  "partially-fulfilled",
  "fulfilled",
  "checking-quality",
  "quality-approved",
  "ready-to-ship",
]);

function statusOf(order: PrintifyOrder): string {
  return String(order.status || "").toLowerCase();
}

// What Printify reports in the first moments after an order is submitted has not been
// observed. It may still read "on-hold" for a while, so that only counts as a problem
// once this much time has passed since the submission.
const SUBMIT_SETTLE_MS = 15 * 60 * 1000;

// Why the owner should look at this order, or null when it is progressing normally.
export function attentionReason(order: PrintifyOrder, now: number = Date.now()): string | null {
  const status = statusOf(order);
  if (ATTENTION_STATUSES.has(status)) return status;
  // Every order passes through on-hold once, before it is submitted. Back on hold
  // after submission means stock, shipping or payment trouble.
  if (status === "on-hold" && order.sent_to_production_at) {
    const sentAt = Date.parse(toIso(order.sent_to_production_at) || "");
    if (!isNaN(sentAt) && now - sentAt < SUBMIT_SETTLE_MS) return null;
    return "on-hold after it was submitted";
  }
  return null;
}

// sent          this call submitted the order
// already_sent  it had been submitted before
// not_ready     Printify is still preparing the order (pending, cost-calculation)
// refused       Printify refused the submission and the order still reads as never
//               submitted. Two things submit an order (the payment handler and the
//               Printify webhook); the other one may have been a moment ahead and
//               Printify not caught up yet. Look again before calling it a problem.
// blocked       the order needs a human (canceled, payment problem)
// error         Printify could not be reached; nothing is known
export type SubmitState = "sent" | "already_sent" | "not_ready" | "refused" | "blocked" | "error";

export interface SubmitResult {
  state: SubmitState;
  printifyStatus: string | null;
  detail: string | null;
}

// One look at the order: submit it for production if Printify is ready for that.
// A look is at most three requests (read, submit, read again), each bound by opts.
export async function submitIfReady(env: PrintifyEnv, orderId: string, opts?: ReadOptions): Promise<SubmitResult> {
  const got = await getOrder(env, orderId, opts);
  if (!got.ok || !got.data) {
    return { state: "error", printifyStatus: null, detail: got.ok ? "empty answer" : got.detail };
  }
  const order = got.data;
  const status = statusOf(order);

  const reason = attentionReason(order);
  if (reason) return { state: "blocked", printifyStatus: status, detail: `Printify status: ${reason}` };
  if (order.sent_to_production_at || IN_PRODUCTION_STATUSES.has(status)) {
    return { state: "already_sent", printifyStatus: status, detail: null };
  }
  if (status !== "on-hold") return { state: "not_ready", printifyStatus: status, detail: null };

  const sent = await request<unknown>(
    env,
    "POST",
    `/orders/${orderId}/send_to_production.json`,
    undefined,
    opts?.timeoutMs ?? REQUEST_TIMEOUT_MS
  );
  if (sent.ok) return { state: "sent", printifyStatus: status, detail: null };
  if (sent.transient) return { state: "error", printifyStatus: status, detail: sent.detail };

  // Refused. The other submitter may have got there a moment earlier: look again.
  const again = await getOrder(env, orderId, opts);
  if (again.ok && again.data && (again.data.sent_to_production_at || IN_PRODUCTION_STATUSES.has(statusOf(again.data)))) {
    return { state: "already_sent", printifyStatus: statusOf(again.data), detail: null };
  }
  return { state: "refused", printifyStatus: status, detail: sent.detail };
}

const LOOK_REQUEST_MS = 4000;

// Waits for a freshly created order to become ready (about 15 to 25 seconds), then
// submits it. Stops when budgetMs is used up and reports the last thing it saw
// (not_ready, refused or error); the Printify webhook and the shop's automatic
// approval pick it up from there.
//
// budgetMs covers everything, including the last look. Cloudflare ends background
// work 30 seconds after the response is sent, and the caller still has to update
// the order row or email the owner inside that time. So a look is only started
// while at least minLookMs is left (three requests of a second each), a read is not
// tried a second time, and each request gets a third of the time that is left.
export async function sendToProductionWhenReady(
  env: PrintifyEnv,
  orderId: string,
  budgetMs: number = 27000,
  pollMs: number = 2500,
  minLookMs: number = 3000
): Promise<SubmitResult> {
  const deadline = Date.now() + budgetMs;
  for (;;) {
    const remaining = Math.max(0, deadline - Date.now());
    const result = await submitIfReady(env, orderId, {
      timeoutMs: Math.max(250, Math.min(LOOK_REQUEST_MS, Math.floor(remaining / 3))),
      retry: false,
    });
    const settled = result.state === "sent" || result.state === "already_sent" || result.state === "blocked";
    if (settled) return result;
    if (deadline - Date.now() < pollMs + minLookMs) return result;
    await sleep(pollMs);
  }
}

// ---------------------------------------------------------------------------
// Order state for the site
// ---------------------------------------------------------------------------

export type SiteStatus = "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

// Printify writes dates as "2026-06-23 04:24:51+00:00". Returns ISO 8601, or null.
export function toIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(String(value).trim().replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Noon UTC on a calendar day, so the day reads the same in every US time zone.
function noonUtc(isoOrDate: string): string {
  return `${isoOrDate.slice(0, 10)}T12:00:00.000Z`;
}

function addBusinessDays(iso: string, days: number): string {
  const d = new Date(iso);
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d.toISOString();
}

// Business days added to a ship date when Printify's own estimate cannot be used.
const TRANSIT_BUSINESS_DAYS = 7;

export interface OrderState {
  // What the site should show, or null when Printify's status says nothing new.
  status: SiteStatus | null;
  // The parcel to show in the single tracking slot: the newest one still in transit,
  // otherwise the newest one.
  shipment: PrintifyShipment | null;
  // When that parcel left (ISO), and whether it is the parcel that shipped last.
  // It is not the last one when a later parcel was delivered first and the slot
  // fell back to an earlier parcel, which the customer has already been told about.
  shipmentShippedAt: string | null;
  shipmentIsLatest: boolean;
  shipmentCount: number;
  allDelivered: boolean;
  shipDate: string | null; // ISO, when the first parcel left
  estimatedDelivery: string | null; // ISO, noon UTC on the expected day
  attention: string | null;
  readyToSubmit: boolean; // waiting on hold and never submitted
}

export function deriveOrderState(order: PrintifyOrder, now: number = Date.now()): OrderState {
  const status = statusOf(order);
  const shipments = (order.shipments || []).filter((s) => s && (s.number || s.url));
  const byShippedAt = [...shipments].sort((a, b) => {
    const at = toIso(a.shipped_at) || "";
    const bt = toIso(b.shipped_at) || "";
    return at < bt ? -1 : at > bt ? 1 : 0;
  });
  const inTransit = byShippedAt.filter((s) => !s.delivered_at);
  const shipment = inTransit.length > 0 ? inTransit[inTransit.length - 1] : byShippedAt[byShippedAt.length - 1] || null;
  const allDelivered = shipments.length > 0 && shipments.every((s) => !!s.delivered_at);

  let siteStatus: SiteStatus | null = null;
  if (status === "canceled" || status === "cancelled") {
    siteStatus = "cancelled";
  } else if (shipments.length > 0) {
    // Printify keeps saying "fulfilled" after delivery; the parcels say when it arrived.
    siteStatus = allDelivered && status === "fulfilled" ? "delivered" : "shipped";
  } else if (IN_PRODUCTION_STATUSES.has(status) || !!order.sent_to_production_at) {
    siteStatus = "processing";
  }

  const shippedTimes = byShippedAt.map((s) => toIso(s.shipped_at)).filter((x): x is string => !!x);
  const shipDate = shippedTimes[0] || toIso(order.fulfilled_at) || null;
  const lastShipDate = shippedTimes[shippedTimes.length - 1] || shipDate;

  // Printify fixes its estimate when the order is submitted. When production runs
  // long, that day can fall on or before the day the last parcel actually left, and
  // "shipped June 30, estimated June 29" reads as a mistake. Count from the ship date
  // then, as when Printify gives no estimate at all.
  const fromShipDate = lastShipDate ? noonUtc(addBusinessDays(lastShipDate, TRANSIT_BUSINESS_DAYS)) : null;
  let estimatedDelivery: string | null = fromShipDate;
  const lineEstimates = (order.line_items || [])
    .map((li) => toIso(li && li.estimated_delivery_at))
    .filter((x): x is string => !!x)
    .sort();
  if (lineEstimates.length > 0) {
    const printifyEstimate = noonUtc(lineEstimates[lineEstimates.length - 1]);
    const usable = !lastShipDate || printifyEstimate.slice(0, 10) > lastShipDate.slice(0, 10);
    if (usable) estimatedDelivery = printifyEstimate;
  }

  return {
    status: siteStatus,
    shipment,
    shipmentShippedAt: shipment ? toIso(shipment.shipped_at) : null,
    shipmentIsLatest: !!shipment && shipment === byShippedAt[byShippedAt.length - 1],
    shipmentCount: shipments.length,
    allDelivered,
    shipDate,
    estimatedDelivery,
    attention: attentionReason(order, now),
    readyToSubmit: status === "on-hold" && !order.sent_to_production_at,
  };
}

const STATUS_RANK: Record<string, number> = { confirmed: 0, processing: 1, shipped: 2, delivered: 3 };

// The status to store, given what is stored and what Printify shows now. An order
// never moves backwards (delivered stays delivered), and a cancelled order comes
// back only if Printify shows it actually shipped.
export function mergeStatus(current: string | null | undefined, derived: SiteStatus | null): string {
  const now = current || "confirmed";
  if (!derived) return now;
  if (derived === "cancelled") return "cancelled";
  if (now === "cancelled") return derived === "shipped" || derived === "delivered" ? derived : "cancelled";
  const currentRank = STATUS_RANK[now];
  if (currentRank === undefined) return derived;
  return STATUS_RANK[derived] > currentRank ? derived : now;
}

// ---------------------------------------------------------------------------
// Webhook signature
// ---------------------------------------------------------------------------

// Printify signs each webhook: header "X-Pfy-Signature: sha256=<hex hmac of the raw body>".
// Fails closed: with no secret configured, nothing is accepted.
export async function verifyWebhookSignature(
  secret: string | null | undefined,
  rawBody: string,
  header: string | null
): Promise<boolean> {
  if (!secret || !header) return false;
  const provided = header.replace(/^sha256=/i, "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(provided)) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}
