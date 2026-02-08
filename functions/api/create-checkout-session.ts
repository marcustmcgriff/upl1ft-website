import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

interface Env {
  STRIPE_SECRET_KEY: string;
  SITE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
  image: string;
}

// Server-side product catalog — single source of truth for prices
const PRODUCT_CATALOG: Record<string, { name: string; price: number; image: string }> = {
  "1": { name: "LIVE BY FAITH, NOT BY SIGHT", price: 4000, image: "/images/products/live-by-faith-front.png" },
  "2": { name: "COMFORT KILLS POTENTIAL", price: 4000, image: "/images/products/comfort-kills-potential-front.png" },
  "3": { name: "HIS PAIN, OUR GAIN", price: 4000, image: "/images/products/his-pain-our-gain-front.png" },
  "4": { name: "IT IS WRITTEN", price: 4000, image: "/images/products/it-is-written-front.png" },
};

const VALID_SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];
const VALID_COLORS = ["Faded Black"];
const MAX_CART_ITEMS = 20;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { STRIPE_SECRET_KEY, SITE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } =
    context.env;

  const origin = SITE_URL || "https://upl1ft.org";
  const requestOrigin = context.request.headers.get("Origin") || "";
  const allowedOrigin = requestOrigin === origin ? requestOrigin : origin;
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2025-03-31.basil",
  });

  try {
    const body = (await context.request.json()) as {
      items: CartItem[];
      discountCode?: string;
      giftMessage?: string;
    };
    const { items, discountCode, giftMessage } = body;

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: "Cart is empty" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (items.length > MAX_CART_ITEMS) {
      return new Response(
        JSON.stringify({ error: `Maximum ${MAX_CART_ITEMS} items per order` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Extract user ID and email from auth header if present
    let userId: string | null = null;
    let userEmail: string | null = null;
    const authHeader = context.request.headers.get("Authorization");
    if (
      authHeader?.startsWith("Bearer ") &&
      SUPABASE_URL &&
      SUPABASE_SERVICE_ROLE_KEY
    ) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.split(" ")[1];
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      userId = user?.id || null;
      userEmail = user?.email || null;
    }

    // Validate and apply discount code if provided
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
        const notExpired =
          !discount.expires_at || new Date(discount.expires_at) > now;
        const started =
          !discount.starts_at || new Date(discount.starts_at) <= now;
        const hasUses =
          discount.max_uses === null ||
          discount.current_uses < discount.max_uses;
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

    // Validate all items against server-side catalog
    for (const item of items) {
      const product = PRODUCT_CATALOG[item.productId];
      if (!product) {
        return new Response(
          JSON.stringify({ error: `Unknown product: ${item.productId}` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) {
        return new Response(
          JSON.stringify({ error: "Invalid quantity" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      if (!VALID_SIZES.includes(item.size)) {
        return new Response(
          JSON.stringify({ error: `Invalid size: ${item.size}` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      if (!VALID_COLORS.includes(item.color)) {
        return new Response(
          JSON.stringify({ error: `Invalid color: ${item.color}` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
      items.map((item) => {
        const product = PRODUCT_CATALOG[item.productId]!;
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: product.name,
              description: `Size: ${item.size} / Color: ${item.color}`,
              images: [`${origin}${product.image}`],
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
      metadata: {
        // Compact format to stay within Stripe's 500-char metadata limit
        // Webhook reconstructs full item details from product catalog
        order_items: JSON.stringify(
          items.map((item) => ({
            p: item.productId,
            s: item.size,
            c: item.color,
            q: item.quantity,
          }))
        ),
        user_id: userId || "",
        discount_code: validatedDiscountCode,
        gift_message: giftMessage?.slice(0, 200) || "",
      },
      return_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    });

    return new Response(
      JSON.stringify({ clientSecret: session.client_secret }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err: unknown) {
    console.error("Stripe error:", err);
    return new Response(
      JSON.stringify({ error: "Checkout failed. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};
