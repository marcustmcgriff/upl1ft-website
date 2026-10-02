// Server-side product catalog: the single source of truth for prices, for which
// products can be bought, and for the picture shown per color.
// Imported by create-checkout-session.ts, webhook.ts and stock.ts.
// This file exports no onRequest handler, so Cloudflare Pages does not route it.
//
// Keep in sync with lib/data/products.ts (the storefront copy). tests/catalog.test.mjs
// fails when the two disagree on price, colors, sizes or which products are live.

export interface CatalogProduct {
  name: string;
  price: number; // cents
  live: boolean; // false = "Coming Soon": shown on the site, rejected at checkout
  colors: string[];
  sizes: string[];
  images: Record<string, string>; // color -> image path under public/
  image: string; // fallback image
}

const SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];
const COLORS = ["Pine Green", "Black"];

// Browsers keep product photos for hours. The version in the address makes them fetch
// new photos at once: raise it whenever the files under public/images/products change,
// here and in lib/data/products.ts (tests/catalog.test.mjs fails when they differ).
export const PHOTO_VERSION = "3";

function photo(file: string): string {
  return `/images/products/${file}?v=${PHOTO_VERSION}`;
}

function colorImages(folder: string, view: string): Record<string, string> {
  return {
    "Pine Green": photo(`${folder}/pine-${view}.jpg`),
    Black: photo(`${folder}/black-${view}.jpg`),
  };
}

export const PRODUCT_CATALOG: Record<string, CatalogProduct> = {
  "4": {
    name: "IT IS WRITTEN",
    price: 6000,
    live: true,
    colors: COLORS,
    sizes: SIZES,
    images: colorImages("it-is-written", "back"),
    image: photo("it-is-written/pine-back.jpg"),
  },
  "2": {
    name: "COMFORT KILLS POTENTIAL",
    price: 6000,
    live: false,
    colors: COLORS,
    sizes: SIZES,
    images: colorImages("comfort-kills-potential", "back"),
    image: photo("comfort-kills-potential/pine-back.jpg"),
  },
  "3": {
    name: "HIS PAIN, OUR GAIN",
    price: 6000,
    live: false,
    colors: COLORS,
    sizes: SIZES,
    images: colorImages("his-pain-our-gain", "back"),
    image: photo("his-pain-our-gain/pine-back.jpg"),
  },
  "1": {
    name: "LIVE BY FAITH, NOT BY SIGHT",
    price: 6000,
    live: false,
    colors: COLORS,
    sizes: SIZES,
    images: colorImages("live-by-faith", "front"),
    image: photo("live-by-faith/pine-front.jpg"),
  },
};

// Own-property lookup, so ids like "constructor" or "__proto__" never match.
export function getCatalogProduct(id: unknown): CatalogProduct | null {
  if (typeof id !== "string") return null;
  return Object.prototype.hasOwnProperty.call(PRODUCT_CATALOG, id) ? PRODUCT_CATALOG[id] : null;
}

// Picture for an order line: the photo of the color that was bought.
export function catalogImage(id: string, color?: string): string {
  const product = getCatalogProduct(id);
  if (!product) return "";
  if (color && Object.prototype.hasOwnProperty.call(product.images, color)) return product.images[color];
  return product.image;
}

// A cart line is {p,s,c,q} JSON in one Stripe metadata value (500 characters max).
// Twelve lines (one product in both colors and all six sizes) fit; checkout also
// measures the real value and refuses a cart that would not fit.
export const MAX_CART_LINES = 12;
export const MAX_QTY_PER_LINE = 10;
