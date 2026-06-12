// Analytics helpers for GA4 and Meta Pixel.
// Both are no-ops unless the corresponding NEXT_PUBLIC_ env var is set at build time.

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
// "UPL1FT Pixel" dataset under the Sprucely, LLC business portfolio
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "2393561987796049";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackPageView(url: string) {
  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag("event", "page_view", { page_path: url });
  }
  if (META_PIXEL_ID && window.fbq) {
    window.fbq("track", "PageView");
  }
}

export function trackAddToCart(name: string, id: string, priceUsd: number) {
  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag("event", "add_to_cart", {
      currency: "USD",
      value: priceUsd,
      items: [{ item_id: id, item_name: name, price: priceUsd, quantity: 1 }],
    });
  }
  if (META_PIXEL_ID && window.fbq) {
    window.fbq("track", "AddToCart", {
      content_ids: [id],
      content_name: name,
      content_type: "product",
      currency: "USD",
      value: priceUsd,
    });
  }
}

export function trackBeginCheckout(totalUsd: number, itemCount: number) {
  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag("event", "begin_checkout", {
      currency: "USD",
      value: totalUsd,
    });
  }
  if (META_PIXEL_ID && window.fbq) {
    window.fbq("track", "InitiateCheckout", {
      currency: "USD",
      value: totalUsd,
      num_items: itemCount,
    });
  }
}

export function trackPurchase(totalUsd: number, itemCount: number, transactionId?: string) {
  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag("event", "purchase", {
      currency: "USD",
      value: totalUsd,
      transaction_id: transactionId,
    });
  }
  if (META_PIXEL_ID && window.fbq) {
    window.fbq("track", "Purchase", {
      currency: "USD",
      value: totalUsd,
      num_items: itemCount,
    });
  }
}
