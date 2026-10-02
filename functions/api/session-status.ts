import Stripe from "stripe";

// GET /api/session-status?session_id=cs_...
// Tells the confirmation page whether a checkout really finished.
//
// Stripe sends the customer back to the site after any attempt with a payment method
// that leaves the page (Klarna, Affirm, Cash App Pay, Amazon Pay), including an
// attempt that was declined or abandoned. In that case the session is still "open"
// and nothing was paid, so the page must not say "Order Confirmed".
//
// Only the two status words are returned. The session id is the unguessable value
// Stripe put in the customer's own return address.

interface Env {
  STRIPE_SECRET_KEY: string;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const sessionId = new URL(context.request.url).searchParams.get("session_id") || "";
  if (!/^cs_(live|test)_[A-Za-z0-9]{10,200}$/.test(sessionId)) {
    return json({ error: "Invalid session" }, 400);
  }
  if (!context.env.STRIPE_SECRET_KEY) {
    return json({ error: "Stripe not configured" }, 500);
  }

  try {
    const stripe = new Stripe(context.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover" as any,
    });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    // status: open | complete | expired.  payment_status: paid | unpaid | no_payment_required.
    return json({ status: session.status, payment_status: session.payment_status }, 200);
  } catch (err: any) {
    const unknown = err?.statusCode === 404 || err?.code === "resource_missing";
    if (!unknown) console.error("Session status lookup failed:", err?.message || String(err));
    return json({ error: unknown ? "Unknown session" : "Lookup failed" }, unknown ? 404 : 502);
  }
};
