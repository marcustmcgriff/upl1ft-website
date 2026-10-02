import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { resolveLineItems } from "./_printify";
import { getCatalogProduct, catalogImage, MAX_CART_LINES, MAX_QTY_PER_LINE } from "./_catalog";

interface Env {
  STRIPE_SECRET_KEY: string;
  PRINTIFY_API_TOKEN: string;
  PRINTIFY_SHOP_ID?: string;
  SITE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

// The payment form stays valid for an hour. Stock is checked when it is created, so a
// short life keeps a stale "in stock" answer from being paid for the next day.
const SESSION_LIFETIME_SECONDS = 60 * 60;

function getCorsHeaders(origin: string, siteUrl: string) {
  const allowedOrigin = origin === siteUrl ? origin : siteUrl;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export const onRequestOptions: PagesFunction<Env> = async (context) => {
  const origin = context.request.headers.get("Origin") || "";
  const siteUrl = context.env.SITE_URL || "https://upl1ft.org";
  return new Response(null, { headers: getCorsHeaders(origin, siteUrl) });
};

// Only these four fields are read from the browser. Names, prices and pictures come
// from the server catalog (_catalog.ts).
interface CartLine {
  productId: string;
  size: string;
  color: string;
  quantity: number;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { STRIPE_SECRET_KEY, SITE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = context.env;

  const origin = SITE_URL || "https://upl1ft.org";
  const requestOrigin = context.request.headers.get("Origin") || "";
  const corsHeaders = getCorsHeaders(requestOrigin, origin);

  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  if (!STRIPE_SECRET_KEY) {
    return reply(500, { error: "Stripe not configured" });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2026-01-28.clover" as any,
  });

  try {
    let body: { items?: unknown; discountCode?: unknown };
    try {
      body = (await context.request.json()) as typeof body;
    } catch {
      return reply(400, { error: "Invalid request" });
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];
    const discountCode = typeof body.discountCode === "string" ? body.discountCode : "";

    if (rawItems.length === 0) {
      return reply(400, { error: "Cart is empty" });
    }

    // ---- 1. Validate every line against the server catalog ----
    const merged = new Map<string, CartLine>();
    for (const raw of rawItems as any[]) {
      const productId = typeof raw?.productId === "string" ? raw.productId : "";
      const size = typeof raw?.size === "string" ? raw.size : "";
      const color = typeof raw?.color === "string" ? raw.color : "";
      const quantity = raw?.quantity;
      const line = { productId, size, color };

      const product = getCatalogProduct(productId);
      if (!product) {
        return reply(400, {
          error: "An item in your cart is no longer available. Please remove it and try again.",
          invalid: [line],
        });
      }
      if (!product.live) {
        return reply(400, {
          error: `${product.name} is coming soon and can't be ordered yet. Please remove it from your cart.`,
          invalid: [line],
        });
      }
      if (!product.colors.includes(color) || !product.sizes.includes(size)) {
        return reply(400, {
          error: `${product.name} is no longer offered in ${color || "that color"} / ${size || "that size"}. Please remove it from your cart and choose again.`,
          invalid: [line],
        });
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) {
        return reply(400, { error: `Quantity must be between 1 and ${MAX_QTY_PER_LINE} per item.`, invalid: [line] });
      }

      // The same shirt added twice is one line.
      const key = `${productId}|${size}|${color}`;
      const existing = merged.get(key);
      if (existing) existing.quantity += quantity;
      else merged.set(key, { productId, size, color, quantity });
    }

    const items = Array.from(merged.values());

    if (items.length > MAX_CART_LINES) {
      return reply(400, { error: `Maximum ${MAX_CART_LINES} different items per order.` });
    }
    const overQuantity = items.find((item) => item.quantity > MAX_QTY_PER_LINE);
    if (overQuantity) {
      return reply(400, { error: `Quantity must be between 1 and ${MAX_QTY_PER_LINE} per item.`, invalid: [overQuantity] });
    }

    // Compact format: the webhook rebuilds names and prices from the catalog.
    // Stripe allows 500 characters per metadata value.
    const orderItemsMeta = JSON.stringify(items.map((item) => ({ p: item.productId, s: item.size, c: item.color, q: item.quantity })));
    if (orderItemsMeta.length > 500) {
      return reply(400, { error: "That is too many different items for one order. Please split it into two orders." });
    }

    // ---- 2. Live stock check, so nobody pays for a shirt that cannot be made ----
    if (context.env.PRINTIFY_API_TOKEN) {
      // The customer is waiting for the payment form: one short try. A slow or
      // silent Printify counts as "could not ask" (see below), not as a long wait.
      const stock = await resolveLineItems(context.env, items, { timeoutMs: 4000, retry: false });
      if (stock.unavailable.length > 0) {
        const first = stock.unavailable[0];
        const name = getCatalogProduct(first.productId)?.name || "This item";
        return reply(409, {
          error: `${name} in ${first.color} / ${first.size} is sold out right now. Please remove it or choose another size or color.`,
          unavailable: stock.unavailable.map((u) => ({ productId: u.productId, size: u.size, color: u.color })),
        });
      }
      if (stock.unknown.length > 0) {
        // Printify could not be asked (outage, rate limit, expired token). That is not
        // "sold out": take the order. If the item really cannot be made, the payment
        // webhook tells the owner straight away.
        console.error("Stock check skipped, Printify unavailable:", stock.unknownDetail);
      }
    }

    // ---- 3. Who is buying, and any discount ----
    let userId: string | null = null;
    let userEmail: string | null = null;
    const authHeader = context.request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ") && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.split(" ")[1];
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      userId = user?.id || null;
      userEmail = user?.email || null;
    }

    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
    let validatedDiscountCode = "";

    if (discountCode && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data: discount } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", discountCode.toUpperCase().trim())
        .eq("active", true)
        .single();

      if (discount) {
        const now = new Date();
        const notExpired = !discount.expires_at || new Date(discount.expires_at) > now;
        const started = !discount.starts_at || new Date(discount.starts_at) <= now;
        const hasUses = discount.max_uses === null || discount.current_uses < discount.max_uses;
        const memberOk = !discount.members_only || userId;

        if (notExpired && started && hasUses && memberOk) {
          const coupon = await stripe.coupons.create({
            ...(discount.discount_type === "percentage"
              ? { percent_off: discount.discount_value }
              : { amount_off: discount.discount_value, currency: "usd" }),
            duration: "once",
            name: discount.code,
          });
          discounts = [{ coupon: coupon.id }];
          validatedDiscountCode = discount.code;
        }
      }
    }

    // ---- 4. Create the Stripe session ----
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
      const product = getCatalogProduct(item.productId)!;
      const image = catalogImage(item.productId, item.color);
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            description: `Size: ${item.size} / Color: ${item.color}`,
            ...(image ? { images: [`${origin}${image}`] } : {}),
            metadata: {
              product_id: item.productId,
              size: item.size,
              color: item.color,
            },
          },
          unit_amount: product.price, // Server-side price, NOT client-supplied
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      line_items,
      ...(discounts.length > 0 ? { discounts } : {}),
      ...(userEmail ? { customer_email: userEmail } : {}),
      payment_intent_data: {
        statement_descriptor: "UPL1FT",
      },
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 0, currency: "usd" },
            display_name: "Free Shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 5 },
              maximum: { unit: "business_day", value: 10 },
            },
          },
        },
      ],
      expires_at: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
      metadata: {
        order_items: orderItemsMeta,
        user_id: userId || "",
        discount_code: validatedDiscountCode,
      },
      return_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    });

    return reply(200, { clientSecret: session.client_secret });
  } catch (err: unknown) {
    console.error("Stripe error:", err);
    return reply(500, { error: "Checkout failed. Please try again." });
  }
};
