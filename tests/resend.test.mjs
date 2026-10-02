// Tests for functions/api/_resend.ts: the one function that sends email.
// Run with: npm test  (Node 24 or newer). fetch is replaced by a script of answers.

import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const { sendEmail, MAIL_FROM } = await import(pathToFileURL(path.join(here, "../functions/api/_resend.ts")).href);

const env = { RESEND_API_KEY: "re_test" };
const realFetch = globalThis.fetch;
const realError = console.error;

// Each entry is an HTTP status, or "throw" for a request that never gets an answer.
function script(answers) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
    const answer = answers.shift();
    if (answer === undefined) throw new Error("unexpected extra request");
    if (answer === "throw") throw new Error("network down");
    return new Response(answer === 200 ? '{"id":"e1"}' : '{"message":"no"}', { status: answer });
  };
  return calls;
}

test.beforeEach(() => {
  console.error = () => {};
});
test.afterEach(() => {
  globalThis.fetch = realFetch;
  console.error = realError;
});

test("a send that works is sent once", async () => {
  const calls = script([200]);
  assert.equal(await sendEmail(env, "jane@example.com", "Hello", "<p>hi</p>", 0), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.deepEqual(calls[0].body, { from: MAIL_FROM, to: ["jane@example.com"], subject: "Hello", html: "<p>hi</p>" });
  assert.equal(calls[0].headers.Authorization, "Bearer re_test");
});

test("a rate limit is tried once more, with the same idempotency key", async () => {
  const calls = script([429, 200]);
  assert.equal(await sendEmail(env, "jane@example.com", "Hello", "<p>hi</p>", 0), true);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].headers["Idempotency-Key"], "the key is sent");
  assert.equal(calls[0].headers["Idempotency-Key"], calls[1].headers["Idempotency-Key"]);
});

test("an outage and a dead connection are tried once more, then reported", async () => {
  let calls = script([503, 200]);
  assert.equal(await sendEmail(env, "jane@example.com", "Hello", "<p>hi</p>", 0), true);
  assert.equal(calls.length, 2);

  calls = script(["throw", "throw"]);
  assert.equal(await sendEmail(env, "jane@example.com", "Hello", "<p>hi</p>", 0), false);
  assert.equal(calls.length, 2, "two tries, no more");
});

test("a refused message is not tried again", async () => {
  const calls = script([422]);
  assert.equal(await sendEmail(env, "not-an-address", "Hello", "<p>hi</p>", 0), false);
  assert.equal(calls.length, 1);
});

test("two different emails never share an idempotency key", async () => {
  const calls = script([200, 200]);
  await sendEmail(env, "jane@example.com", "One", "<p>1</p>", 0);
  await sendEmail(env, "jane@example.com", "Two", "<p>2</p>", 0);
  assert.notEqual(calls[0].headers["Idempotency-Key"], calls[1].headers["Idempotency-Key"]);
});

test("without an API key nothing is sent", async () => {
  const calls = script([]);
  assert.equal(await sendEmail({}, "jane@example.com", "Hello", "<p>hi</p>", 0), false);
  assert.equal(calls.length, 0);
});
