import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendOrderConfirmationEmail } from "./send-order-email";

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  PRINTFUL_API_TOKEN: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
}

interface OrderItem {
  productId: string;
  name: string;
  size: string;
  color: string;
  quantity: number;
  price?: number;
  image?: string;
}

// Product catalog for reconstructing full item details from compact metadata
const PRODUCT_CATALOG: Record<string, { name: string; price: number; image: string }> = {
  "1": { name: "LIVE BY FAITH, NOT BY SIGHT", price: 4000, image: "/images/products/live-by-faith-front.png" },
  "2": { name: "COMFORT KILLS POTENTIAL", price: 4000, image: "/images/products/comfort-kills-potential-front.png" },
  "3": { name: "HIS PAIN, OUR GAIN", price: 4000, image: "/images/products/his-pain-our-gain-front.png" },
  "4": { name: "IT IS WRITTEN", price: 4000, image: "/images/products/it-is-written-front.png" },
};

// Mapping of product ID + size to Printful sync variant ID
const VARIANT_MAP: Record<string, Record<string, number>> = {
  "1": { "S": 5187387218, "M": 5187387219, "L": 5187387220, "XL": 5187387221, "2XL": 5187387222, "3XL": 5187387223 },
  "2": { "S": 5187387226, "M": 5187387227, "L": 5187387228, "XL": 5187387229, "2XL": 5187387230, "3XL": 5187387231 },
  "3": { "S": 5187387212, "M": 5187387213, "L": 5187387214, "XL": 5187387215, "2XL": 5187387216, "3XL": 5187387217 },
  "4": { "S": 5187387240, "M": 5187387241, "L": 5187387242, "XL": 5187387243, "2XL": 5187387244, "3XL": 5187387245 },
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const {
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET,
    PRINTFUL_API_TOKEN,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  } = context.env;

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2026-01-28.clover" as any,
  });

  const signature = context.request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await context.request.text();
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: unknown) {
    console.error("Webhook signature verification failed");
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      // Parse order items from metadata (supports both compact and legacy formats)
      const rawItems = JSON.parse(session.metadata?.order_items || "[]");
      const orderItems: OrderItem[] = rawItems.map((item: any) => {
        // Compact format: {p, s, c, q} — reconstruct full details from catalog
        if (item.p !== undefined) {
          const product = PRODUCT_CATALOG[item.p];
          return {
            productId: item.p,
            name: product?.name || "Unknown Product",
            size: item.s,
            color: item.c,
            quantity: item.q,
            price: product?.price || 4000,
            image: product?.image || "",
          };
        }
        // Legacy format: full item objects
        return item;
      });

      if (orderItems.length === 0) {
        console.error("No order items in session metadata");
        return new Response("OK", { status: 200 });
      }

      // Get shipping details (2026-01-28.clover moved to collected_information)
      const sessionAny = session as any;
      const shipping =
        sessionAny.collected_information?.shipping_details ||
        session.shipping_details;
      if (!shipping?.address) {
        console.error("No shipping address in session");
        return new Response("OK", { status: 200 });
      }

      const customerEmail =
        session.customer_details?.email ||
        sessionAny.collected_information?.email;
      const giftMessage = session.metadata?.gift_message || "";

      // Idempotency check BEFORE creating Printful order to prevent duplicates on retry
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: existingOrder } = await supabase
          .from("orders")
          .select("id")
          .eq("stripe_session_id", session.id)
          .single();

        if (existingOrder) {
          console.log("Order already processed for session:", session.id);
          return new Response("OK", { status: 200 });
        }
      }

      // Build Printful order items
      const printfulItems = orderItems
        .map((item) => {
          const variantId = VARIANT_MAP[item.productId]?.[item.size];
          if (!variantId) {
            console.error(
              `No variant ID for product ${item.productId} size ${item.size}`
            );
            return null;
          }
          return {
            sync_variant_id: variantId,
            quantity: item.quantity,
          };
        })
        .filter(Boolean);

      // Create Printful order
      let printfulOrderId: string | null = null;

      if (printfulItems.length > 0) {
        const printfulOrder: Record<string, unknown> = {
          recipient: {
            name: shipping.name || "Customer",
            address1: shipping.address.line1 || "",
            address2: shipping.address.line2 || "",
            city: shipping.address.city || "",
            state_code: shipping.address.state || "",
            country_code: shipping.address.country || "US",
            zip: shipping.address.postal_code || "",
            email: session.customer_details?.email || "",
          },
          items: printfulItems,
          ...(giftMessage
            ? {
                gift: { subject: "UPL1FT", message: giftMessage },
                packing_slip: {
                  email: "support@upl1ft.org",
                  message: giftMessage,
                },
              }
            : {}),
        };

        const printfulResponse = await fetch(
          "https://api.printful.com/orders?confirm=true",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${PRINTFUL_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(printfulOrder),
          }
        );

        const printfulResult = await printfulResponse.json();

        if (!printfulResponse.ok) {
          console.error("Printful order creation failed:", printfulResult);
        } else {
          console.log("Printful order created:", printfulResult);
          printfulOrderId = printfulResult?.result?.id?.toString() || null;
        }
      }

      // Save order to Supabase
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Find user by metadata user_id or by email match
        let userId: string | null = session.metadata?.user_id || null;

        if (!userId && customerEmail) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", customerEmail)
            .single();
          userId = profile?.id || null;
        }

        const { error: insertError } = await supabase.from("orders").insert({
          user_id: userId || null,
          stripe_session_id: session.id,
          stripe_payment_intent_id:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
          printful_order_id: printfulOrderId,
          status: "confirmed",
          items: orderItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            price: item.price || 4000,
            image: item.image || "",
          })),
          subtotal: session.amount_subtotal || 0,
          shipping: 0,
          discount_amount: session.total_details?.amount_discount || 0,
          total: session.amount_total || 0,
          discount_code: session.metadata?.discount_code || null,
          shipping_name: shipping.name,
          shipping_address: {
            line1: shipping.address.line1 || "",
            line2: shipping.address.line2 || "",
            city: shipping.address.city || "",
            state: shipping.address.state || "",
            postal_code: shipping.address.postal_code || "",
            country: shipping.address.country || "US",
          },
          customer_email: customerEmail || null,
          gift_message: giftMessage || null,
        });

        if (insertError) {
          console.error("Failed to save order to Supabase:", insertError);
        } else {
          console.log("Order saved to Supabase");
        }

        // Record discount redemption if applicable
        if (session.metadata?.discount_code) {
          const { data: discountData } = await supabase
            .from("discount_codes")
            .select("id")
            .eq("code", session.metadata.discount_code)
            .single();

          if (discountData) {
            // Atomic increment to avoid race conditions
            await supabase.rpc("increment_discount_uses", {
              discount_id: discountData.id,
            });

            const { data: savedOrder } = await supabase
              .from("orders")
              .select("id")
              .eq("stripe_session_id", session.id)
              .single();

            await supabase.from("discount_redemptions").insert({
              discount_code_id: discountData.id,
              user_id: userId || null,
              order_id: savedOrder?.id || null,
            });
          }
        }
      }

      // Send order confirmation email
      if (customerEmail) {
        await sendOrderConfirmationEmail(context.env, {
          to: customerEmail,
          orderItems: orderItems.map((item) => ({
            name: item.name,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            price: item.price || 4000,
          })),
          subtotal: session.amount_subtotal || 0,
          discountAmount: session.total_details?.amount_discount || 0,
          total: session.amount_total || 0,
          shippingName: shipping.name || "Customer",
          shippingAddress: {
            line1: shipping.address.line1 || "",
            line2: shipping.address.line2 || "",
            city: shipping.address.city || "",
            state: shipping.address.state || "",
            postal_code: shipping.address.postal_code || "",
            country: shipping.address.country || "US",
          },
          giftMessage: giftMessage || undefined,
        });
      }
    } catch (err: unknown) {
      console.error("Error processing webhook:", err);
      // Return 500 so Stripe retries on transient failures
      return new Response("Processing error", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
};
