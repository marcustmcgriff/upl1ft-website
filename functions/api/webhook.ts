import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendOrderConfirmationEmail, sendAdminOrderNotification } from "./send-order-email";
import { DEFAULT_ADMIN_EMAIL, sendAdminAlert } from "./_shipment-emails";
import { resolveLineItems, createOrder, findOrderByExternalId, sendToProductionWhenReady } from "./_printify";
import { getCatalogProduct, catalogImage } from "./_catalog";
import { processPaidOrder, type OrderDeps, type PaidOrderInput, type ProcessItem } from "./_order-processing";

// Stripe webhook: a paid checkout becomes an order row, a Printify order and two emails.
// The steps and their failure handling live in _order-processing.ts; this file only
// reads the Stripe event and connects the real database, Printify and email to it.

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  PRINTIFY_API_TOKEN: string;
  PRINTIFY_SHOP_ID?: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  ADMIN_EMAIL: string;
}

// An order row with no Printify order counts as abandoned by the attempt that last
// touched it after this long. No single attempt can run longer than that.
const CLAIM_SECONDS = 90;

// Cart lines travel in Stripe metadata as compact {p,s,c,q} objects; names, prices and
// pictures come from the server catalog.
function parseItems(raw: string | undefined): ProcessItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item: any): ProcessItem | null => {
      if (!item || typeof item !== "object") return null;
      const compact = item.p !== undefined;
      const productId = String(compact ? item.p : item.productId ?? "");
      const size = String(compact ? item.s : item.size ?? "");
      const color = String(compact ? item.c : item.color ?? "");
      const quantity = Math.floor(Number(compact ? item.q : item.quantity));
      if (!productId || !size || !color || !Number.isFinite(quantity) || quantity < 1) return null;
      const product = getCatalogProduct(productId);
      return {
        productId,
        name: product?.name || String(item.name || "Unknown Product"),
        size,
        color,
        quantity,
        price: product ? product.price : Number(item.price) || 0,
        image: catalogImage(productId, color) || String(item.image || ""),
      };
    })
    .filter((item): item is ProcessItem => item !== null);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const env = context.env;

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-01-28.clover" as any,
  });

  const signature = context.request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await context.request.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    console.error("Webhook signature verification failed");
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  // Cards and wallets are paid when the session completes. Delayed methods (bank
  // debits) complete unpaid and report success or failure later with a second event.
  // An order is fulfilled once its session says it is paid, whichever event says so.
  // The Stripe endpoint has to be subscribed to all three events (it is, since
  // 2026-10-01; no delayed method was switched on in Stripe at that time).
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded" &&
    event.type !== "checkout.session.async_payment_failed"
  ) {
    return new Response("OK", { status: 200 });
  }

  // Stripe hangs up when an answer takes too long, and Cloudflare then cancels
  // whatever is still running for the request. Handing the work to waitUntil as well
  // lets it run on for up to 30 seconds, so an attempt that is cut off still links
  // the order it created and sends its emails. Stripe delivers the event again later.
  const work = handleEvent(context, stripe, event);
  context.waitUntil(work.then(() => undefined, () => undefined));
  return work;
};

async function handleEvent(
  context: Parameters<PagesFunction<Env>>[0],
  stripe: Stripe,
  event: Stripe.Event
): Promise<Response> {
  const env = context.env;
  const adminEmail = env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;

  try {
    let session = event.data.object as Stripe.Checkout.Session;
    const ageMinutes = Math.max(0, (Date.now() / 1000 - event.created) / 60);

    const paymentFacts = [
      `Stripe session: ${session.id}`,
      `Customer: ${session.customer_details?.email || "unknown"}`,
      `Amount: $${((session.amount_total || 0) / 100).toFixed(2)}`,
    ];

    if (event.type === "checkout.session.async_payment_failed") {
      console.log("Delayed payment failed:", session.id);
      await sendAdminAlert(env, adminEmail, "Heads Up: Bank Payment Failed — UPL1FT", "A delayed payment did not go through", [
        ...paymentFacts,
        "Nothing was ordered and no money was taken. There is nothing to do unless the customer gets in touch.",
      ]);
      return new Response("OK", { status: 200 });
    }

    // Only fulfil what has actually been paid for.
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      // Nothing is saved for an unpaid checkout, so say that one is waiting: if the
      // "paid" event never comes, this email is the only trace of it.
      console.log("Session completed but not paid yet:", session.id, session.payment_status);
      await sendAdminAlert(
        env,
        adminEmail,
        "Heads Up: Payment Pending — UPL1FT",
        "A checkout finished with a payment that has not cleared yet",
        [
          ...paymentFacts,
          "Nothing has been saved or ordered yet. The site places the order by itself when Stripe confirms the payment, and you then get the usual New Order email.",
          "If neither that email nor a 'payment failed' notice follows within about a week, open this payment in Stripe.",
        ]
      );
      return new Response("OK", { status: 200 });
    }

    // 2026-01-28.clover moved shipping details to collected_information.
    const shippingOf = (s: Stripe.Checkout.Session) =>
      (s as any).collected_information?.shipping_details || (s as any).shipping_details || null;

    let shipping = shippingOf(session);
    if (!shipping?.address) {
      // Not in the event payload: ask Stripe for the full session before giving up.
      try {
        session = await stripe.checkout.sessions.retrieve(session.id);
        shipping = shippingOf(session);
      } catch (err) {
        console.error("Could not retrieve session:", session.id);
      }
    }

    const items = parseItems(session.metadata?.order_items);

    // A checkout that was opened before a price change is paid at the old price.
    // Record what was charged, not today's catalog price. Every shirt has had one
    // price so far, which is what makes the split below right; a cart with mixed
    // prices keeps the catalog figures.
    const catalogSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const units = items.reduce((sum, item) => sum + item.quantity, 0);
    const charged = session.amount_subtotal;
    if (
      typeof charged === "number" &&
      charged > 0 &&
      units > 0 &&
      charged !== catalogSubtotal &&
      charged % units === 0 &&
      items.every((item) => item.price === items[0].price)
    ) {
      for (const item of items) item.price = charged / units;
    }

    if (items.length === 0 || !shipping?.address) {
      // Paid, but there is nothing this handler can order. A person has to look at it,
      // and delivering the event again would not change that.
      const problem = items.length === 0 ? "the cart items could not be read" : "there is no shipping address";
      console.error("Paid session cannot be processed:", session.id, problem);
      await sendAdminAlert(
        env,
        adminEmail,
        "URGENT: Paid Order Needs Manual Handling — UPL1FT",
        `A payment was received but ${problem}`,
        [
          `Stripe session: ${session.id}`,
          `Amount: $${((session.amount_total || 0) / 100).toFixed(2)}`,
          `Customer: ${session.customer_details?.email || "unknown"}`,
          "Nothing was ordered in Printify and no order was saved. Open the payment in Stripe to see what was bought, then fulfil or refund it by hand.",
        ]
      );
      return new Response("OK", { status: 200 });
    }

    const customerEmail =
      session.customer_details?.email || (session as any).collected_information?.email || null;

    const input: PaidOrderInput = {
      sessionId: session.id,
      paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
      items,
      shippingName: shipping.name || session.customer_details?.name || "Customer",
      shippingAddress: {
        line1: shipping.address.line1 || "",
        line2: shipping.address.line2 || "",
        city: shipping.address.city || "",
        state: shipping.address.state || "",
        postal_code: shipping.address.postal_code || "",
        country: shipping.address.country || "US",
      },
      customerEmail,
      customerPhone: session.customer_details?.phone || "",
      userIdHint: session.metadata?.user_id || null,
      subtotal: session.amount_subtotal || 0,
      discountAmount: session.total_details?.amount_discount || 0,
      total: session.amount_total || 0,
      discountCode: session.metadata?.discount_code || null,
      giftMessage: session.metadata?.gift_message || null,
      eventAgeMinutes: ageMinutes,
    };

    const supabase =
      env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
        ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
        : null;

    const emailItems = (order: PaidOrderInput) =>
      order.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        price: item.price,
      }));

    const deps: OrderDeps = {
      db: supabase
        ? {
            async findOrderBySession(sessionId) {
              const { data, error } = await supabase
                .from("orders")
                .select("printful_order_id, tracking_token, status")
                .eq("stripe_session_id", sessionId)
                .maybeSingle();
              if (error) {
                console.error("Order lookup failed:", error.code, error.message);
                return "error";
              }
              if (!data) return null;
              return {
                // The column keeps its old name; it now holds the Printify order id.
                printifyOrderId: data.printful_order_id || null,
                trackingToken: data.tracking_token || null,
                status: data.status || "confirmed",
              };
            },

            async findUserIdByEmail(email) {
              const { data } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
              return data?.id || null;
            },

            async insertOrder(row) {
              const { error } = await supabase.from("orders").insert({
                user_id: row.userId || null,
                stripe_session_id: row.sessionId,
                stripe_payment_intent_id: row.paymentIntentId,
                printful_order_id: null,
                tracking_token: row.trackingToken,
                status: "confirmed",
                items: row.items.map((item) => ({
                  productId: item.productId,
                  name: item.name,
                  size: item.size,
                  color: item.color,
                  quantity: item.quantity,
                  price: item.price,
                  image: item.image,
                })),
                subtotal: row.subtotal,
                shipping: 0,
                discount_amount: row.discountAmount,
                total: row.total,
                discount_code: row.discountCode,
                shipping_name: row.shippingName,
                shipping_address: row.shippingAddress,
                customer_email: row.customerEmail,
                gift_message: row.giftMessage,
              });
              if (!error) return "inserted";
              // 23505 = unique violation on stripe_session_id: the row is already there.
              if (error.code === "23505") return "duplicate";
              console.error("Failed to save order:", error.code, error.message);
              return "error";
            },

            async claimUnfinishedOrder(sessionId) {
              // The row is free when nothing has written to it for CLAIM_SECONDS. The
              // update is the claim: a database trigger sets updated_at to now on every
              // write, so the next attempt sees the row as taken.
              const cutoff = new Date(Date.now() - CLAIM_SECONDS * 1000).toISOString();
              const { data, error } = await supabase
                .from("orders")
                .update({ updated_at: new Date().toISOString() })
                .eq("stripe_session_id", sessionId)
                .is("printful_order_id", null)
                .lt("updated_at", cutoff)
                .select("id");
              if (error) {
                console.error("Order claim failed:", error.code, error.message);
                return "error";
              }
              return !!data && data.length > 0;
            },

            async linkPrintifyOrder(sessionId, printifyOrderId) {
              const { error } = await supabase
                .from("orders")
                .update({ printful_order_id: printifyOrderId, updated_at: new Date().toISOString() })
                .eq("stripe_session_id", sessionId);
              if (error) console.error("Failed to link Printify order:", error.code, error.message);
              return !error;
            },

            async recordDiscount(code, userId, sessionId) {
              const { data: discount } = await supabase
                .from("discount_codes")
                .select("id")
                .eq("code", code)
                .maybeSingle();
              if (!discount) return;
              await supabase.rpc("increment_discount_uses", { discount_id: discount.id });
              const { data: saved } = await supabase
                .from("orders")
                .select("id")
                .eq("stripe_session_id", sessionId)
                .maybeSingle();
              await supabase.from("discount_redemptions").insert({
                discount_code_id: discount.id,
                user_id: userId || null,
                order_id: saved?.id || null,
              });
            },
          }
        : null,

      printify: {
        configured: !!env.PRINTIFY_API_TOKEN,
        resolve: (lines) => resolveLineItems(env, lines),
        create: (args) =>
          createOrder(env, {
            externalId: args.externalId,
            label: args.label,
            lineItems: args.lineItems,
            address: args.address,
          }),
        findExisting: (sessionId) => findOrderByExternalId(env, sessionId),

        async submitWhenReady(printifyOrderId, sessionId) {
          try {
            const result = await sendToProductionWhenReady(env, printifyOrderId);
            if (result.state === "sent" || result.state === "already_sent") {
              if (supabase) {
                await supabase
                  .from("orders")
                  .update({ status: "processing", updated_at: new Date().toISOString() })
                  .eq("stripe_session_id", sessionId)
                  .eq("status", "confirmed");
              }
              console.log("Printify order in production:", printifyOrderId, result.state);
            } else if (result.state === "blocked" || result.state === "refused") {
              // "refused" here means Printify kept refusing for the whole wait.
              await sendAdminAlert(
                env,
                adminEmail,
                "ACTION NEEDED: Printify Order Not In Production — UPL1FT",
                `Printify order ${printifyOrderId} could not be sent to production`,
                [
                  result.detail || "Printify refused the order.",
                  "Open the order in Printify (Orders) to see why and fix it there.",
                  "Do not create a new order for this payment: this one already exists.",
                  `Stripe session: ${sessionId}`,
                ]
              );
            } else {
              // Printify was still preparing the order when the wait ran out, or could
              // not be reached. The Printify webhook submits it once it is ready, and
              // the shop's automatic order approval is the backstop. The owner was told
              // it would be automatic, so say that it has not happened yet.
              console.log("Printify order not submitted yet:", printifyOrderId, result.state, result.printifyStatus);
              await sendAdminAlert(
                env,
                adminEmail,
                "Heads Up: Printify Order Still Waiting — UPL1FT",
                `Printify order ${printifyOrderId} was created but is not in production yet`,
                [
                  "Printify had not finished preparing it when the site stopped waiting. This normally sorts itself out within minutes: Printify tells the site when the order is ready and the site submits it then.",
                  "If the order still shows On hold in Printify tomorrow, open it there and choose Send to production.",
                  "Do not create a new order for this payment: this one already exists.",
                  `Stripe session: ${sessionId}`,
                ]
              );
            }
          } catch (err) {
            console.error("submitWhenReady failed:", err instanceof Error ? err.message : String(err));
          }
        },
      },

      email: {
        async customerConfirmation(order, trackingToken) {
          if (!order.customerEmail) return;
          await sendOrderConfirmationEmail(env, {
            to: order.customerEmail,
            orderItems: emailItems(order),
            subtotal: order.subtotal,
            discountAmount: order.discountAmount,
            total: order.total,
            shippingName: order.shippingName,
            shippingAddress: order.shippingAddress,
            trackingToken: trackingToken || undefined,
          });
        },

        async admin(order, report) {
          return sendAdminOrderNotification(env, {
            to: adminEmail,
            orderItems: emailItems(order),
            subtotal: order.subtotal,
            discountAmount: order.discountAmount,
            total: order.total,
            customerEmail: order.customerEmail || "Unknown",
            shippingName: order.shippingName,
            shippingAddress: order.shippingAddress,
            fulfillment: report,
            stripeSessionId: order.sessionId,
            stripePaymentIntentId: order.paymentIntentId,
            giftMessage: order.giftMessage || undefined,
            discountCode: order.discountCode || undefined,
          });
        },
      },

      newTrackingToken: () => crypto.randomUUID(),
      defer: (work) => context.waitUntil(work),
      log: (message, detail) => console.log(message, detail ?? ""),
    };

    const result = await processPaidOrder(deps, input);
    console.log("Order processed:", session.id, result.outcome, result.httpStatus);

    if (result.outcome.startsWith("db_")) {
      // The order database did not answer, so nothing was saved, ordered or emailed.
      // Stripe re-sends for about three days. Tell the owner at the start and then
      // about once a day, not on every attempt (email does not depend on the database).
      if (ageMinutes < 10 || ageMinutes > 20 * 60) {
        await sendAdminAlert(
          env,
          adminEmail,
          "URGENT: Paid Order Waiting, Order Database Unreachable — UPL1FT",
          "A customer has paid but the order could not be saved",
          [
            "The order database (Supabase) is not answering, so nothing was ordered in Printify and the customer has not been sent a confirmation.",
            "Most likely the Supabase project is paused. Open supabase.com, resume the project, and the next retry completes this order by itself. The site retries each time Stripe re-sends the payment notice, for about three days.",
            `Customer: ${input.customerEmail || "unknown"}`,
            `Amount: $${(input.total / 100).toFixed(2)}`,
            `Items: ${input.items.map((item) => `${item.name}, ${item.color} / ${item.size} x ${item.quantity}`).join("; ")}`,
            `Ship to: ${input.shippingName}, ${input.shippingAddress.line1}, ${input.shippingAddress.city}, ${input.shippingAddress.state} ${input.shippingAddress.postal_code}`,
            `Stripe session: ${input.sessionId}`,
          ]
        );
      }
    }
    // 500 tells Stripe to deliver the event again later.
    return new Response(result.outcome, { status: result.httpStatus });
  } catch (err: unknown) {
    console.error("Error processing webhook:", err instanceof Error ? err.message : String(err));
    return new Response("Processing error", { status: 500 });
  }
}
