// The storefront catalog (lib/data/products.ts) and the server catalog
// (functions/api/_catalog.ts) are separate files. This test fails when they disagree
// on anything a customer pays for or sees. Run with: npm test  (Node 24 or newer).

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import ts from "typescript";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const server = await import(pathToFileURL(path.join(root, "functions/api/_catalog.ts")).href);
const printify = await import(pathToFileURL(path.join(root, "functions/api/_printify.ts")).href);

// products.ts imports a type from another file, so it is compiled here instead of
// being loaded directly.
const source = readFileSync(path.join(root, "lib/data/products.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { products } = await import("data:text/javascript;base64," + Buffer.from(compiled).toString("base64"));

// Photo addresses carry a version ("?v=2") so browsers fetch new photos at once.
const onDisk = (p) => existsSync(path.join(root, "public", p.split("?")[0]));

test("both catalogs list the same products", () => {
  assert.deepEqual(products.map((p) => p.id).sort(), Object.keys(server.PRODUCT_CATALOG).sort());
  assert.deepEqual(Object.keys(printify.PRINTIFY_PRODUCT_MAP).sort(), Object.keys(server.PRODUCT_CATALOG).sort());
});

for (const product of products) {
  test(`${product.name}: storefront and server agree`, () => {
    const s = server.getCatalogProduct(product.id);
    assert.ok(s, "product exists on the server");
    assert.equal(s.name, product.name);
    assert.equal(s.price, Math.round(product.price * 100), "price");
    assert.deepEqual([...s.colors].sort(), [...product.colors].sort(), "colors");
    assert.deepEqual(s.sizes, product.sizes, "sizes");
    const purchasable = product.inStock && !product.comingSoon;
    assert.equal(s.live, purchasable, "can be bought on the site exactly when the server accepts it");
  });

  test(`${product.name}: every photo exists`, () => {
    const paths = new Set([...product.images, ...Object.values(product.colorImages || {}).flat()]);
    for (const p of paths) {
      assert.ok(p.startsWith("/"), `${p} is a local path`);
      assert.ok(onDisk(p), `${p} exists under public/`);
    }
    for (const color of product.colors) {
      assert.ok(product.colorImages?.[color]?.length > 0, `${color} has photos`);
      const serverImage = server.catalogImage(product.id, color);
      assert.ok(onDisk(serverImage), `server image for ${color} exists: ${serverImage}`);
    }
    assert.ok(onDisk(server.getCatalogProduct(product.id).image));
  });

  test(`${product.name}: photo addresses carry the current version`, () => {
    const paths = new Set([...product.images, ...Object.values(product.colorImages || {}).flat()]);
    for (const p of paths) assert.ok(p.endsWith(`?v=${server.PHOTO_VERSION}`), `${p} ends with ?v=${server.PHOTO_VERSION}`);
    for (const color of product.colors) {
      const fromServer = server.catalogImage(product.id, color);
      assert.ok(paths.has(fromServer), `the server's ${color} photo is one the storefront shows: ${fromServer}`);
    }
  });
}

test("catalog lookups ignore inherited keys", () => {
  assert.equal(server.getCatalogProduct("constructor"), null);
  assert.equal(server.getCatalogProduct("__proto__"), null);
  assert.equal(server.getCatalogProduct(4), null);
  assert.equal(server.catalogImage("4", "toString"), server.getCatalogProduct("4").image);
});

test("the largest cart the site can build fits in Stripe metadata", () => {
  const live = Object.entries(server.PRODUCT_CATALOG).filter(([, p]) => p.live);
  const lines = [];
  for (const [id, p] of live) for (const c of p.colors) for (const s of p.sizes) lines.push({ p: id, s, c, q: server.MAX_QTY_PER_LINE });
  // The worst case: the lines with the longest text, across every product on sale.
  lines.sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length);
  const biggest = lines.slice(0, server.MAX_CART_LINES);
  assert.ok(JSON.stringify(biggest).length <= 500, `${JSON.stringify(biggest).length} characters`);
});
