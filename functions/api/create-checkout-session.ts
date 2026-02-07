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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { STRIPE_SECRET_KEY, SITE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } =
    context.env;

  if (!STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
      });
    }

    const origin = SITE_URL || "https://upl1ft.org";

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

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
      items.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            description: `Size: ${item.size} / Color: ${item.color}`,
            images: item.image ? [`${origin}${item.image}`] : [],
            metadata: {
              product_id: item.productId,
              size: item.size,
              color: item.color,
            },
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      ...(discounts.length > 0 ? { discounts } : {}),
      ...(userEmail ? { customer_email: userEmail } : {}),
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
        order_items: JSON.stringify(
          items.map((item) => ({
            productId: item.productId,
            name: item.name,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            price: Math.round(item.price * 100),
            image: item.image,
          }))
        ),
        user_id: userId || "",
        discount_code: validatedDiscountCode,
        gift_message: giftMessage?.slice(0, 200) || "",
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart?canceled=true`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Stripe error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Checkout failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
