import Stripe from "stripe";

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  PRINTFUL_API_TOKEN: string;
}

interface OrderItem {
  productId: string;
  name: string;
  size: string;
  color: string;
  quantity: number;
}

// Mapping of product ID + size to Printful sync variant ID
// These will be populated once products are synced to the Printful store
const VARIANT_MAP: Record<string, Record<string, number>> = {
  // Product ID -> { Size -> Printful Sync Variant ID }
  // "1": { "S": 0, "M": 0, "L": 0, "XL": 0, "2XL": 0, "3XL": 0 },
  // "2": { "S": 0, "M": 0, "L": 0, "XL": 0, "2XL": 0, "3XL": 0 },
  // "3": { "S": 0, "M": 0, "L": 0, "XL": 0, "2XL": 0, "3XL": 0 },
  // "4": { "S": 0, "M": 0, "L": 0, "XL": 0, "2XL": 0, "3XL": 0 },
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PRINTFUL_API_TOKEN } =
    context.env;

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2025-03-31.basil",
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
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      // Parse order items from metadata
      const orderItems: OrderItem[] = JSON.parse(
        session.metadata?.order_items || "[]"
      );

      if (orderItems.length === 0) {
        console.error("No order items in session metadata");
        return new Response("OK", { status: 200 });
      }

      // Get shipping details
      const shipping = session.shipping_details;
      if (!shipping?.address) {
        console.error("No shipping address in session");
        return new Response("OK", { status: 200 });
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

      if (printfulItems.length === 0) {
        console.error("No valid Printful items - variant mapping incomplete");
        // Still return 200 to acknowledge webhook
        return new Response("OK", { status: 200 });
      }

      // Create Printful order
      const printfulOrder = {
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
      };

      const printfulResponse = await fetch(
        "https://api.printful.com/orders",
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
      }
    } catch (err: any) {
      console.error("Error processing webhook:", err);
    }
  }

  return new Response("OK", { status: 200 });
};
