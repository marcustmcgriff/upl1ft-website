import { getProduct, lookupVariant, printifyProductId } from "./_printify";
import { getCatalogProduct } from "./_catalog";

// GET /api/stock?product=<site product id>
// Live availability from Printify for every color and size the site sells, so the
// product page can cross out sizes that cannot be made right now.
//
// Response: { product: "4", colors: { "Black": { "S": true, "2XL": false, ... }, ... } }
//   true  = can be ordered
//   false = sold out, switched off in Printify, or not offered
//   colors: null = Printify could not be asked; the page then leaves every size on
//                  and checkout does the final check.
// Good answers are cached at the edge for 5 minutes, failures for 1 minute.

interface Env {
  PRINTIFY_API_TOKEN: string;
  PRINTIFY_SHOP_ID?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

function json(body: unknown, status: number, edgeSeconds: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Browsers re-check after a minute; the edge keeps the answer for edgeSeconds.
      "Cache-Control": `public, max-age=${Math.min(60, edgeSeconds)}, s-maxage=${edgeSeconds}`,
      ...corsHeaders,
    },
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const productId = url.searchParams.get("product") || "";
  const product = getCatalogProduct(productId);
  const printifyId = printifyProductId(productId);

  if (!product || !printifyId) {
    return json({ error: "Unknown product" }, 404, 60);
  }
  if (!context.env.PRINTIFY_API_TOKEN) {
    return json({ product: productId, colors: null }, 200, 60);
  }

  // One cache entry per product, whatever else is in the query string.
  const cache = (caches as any).default as Cache;
  const cacheKey = new Request(`https://upl1ft.org/api/stock?product=${encodeURIComponent(productId)}`, { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  // The product page is waiting on this: one try, and a slow Printify means "unknown".
  const fetched = await getProduct(context.env, printifyId, { timeoutMs: 5000, retry: false });

  let response: Response;
  if (!fetched.ok || !fetched.data || !Array.isArray(fetched.data.variants)) {
    console.error("Stock lookup failed:", productId, fetched.ok ? "no variants" : fetched.detail);
    response = json({ product: productId, colors: null }, 200, 60);
  } else {
    const colors: Record<string, Record<string, boolean>> = {};
    for (const color of product.colors) {
      colors[color] = {};
      for (const size of product.sizes) {
        colors[color][size] = lookupVariant(fetched.data, color, size).variant !== null;
      }
    }
    response = json({ product: productId, colors, checked_at: new Date().toISOString() }, 200, 300);
  }

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
};
