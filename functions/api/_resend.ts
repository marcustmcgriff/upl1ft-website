// The one place that talks to Resend, the service that sends the site's email.
//
// This file exports no onRequest handler, so Cloudflare Pages does not route it. It
// imports nothing, so tests/resend.test.mjs can load it directly with Node.
//
// A send that fails for a temporary reason (rate limit, Resend outage, network) is
// tried once more. Resend allows two requests a second per account, and one paid
// order sends the customer email and the owner email back to back, so a 429 is the
// failure most likely to happen. Both tries carry the same Idempotency-Key, so a
// first try that did go through is not delivered twice.

export interface MailEnv {
  RESEND_API_KEY?: string;
  // Local testing only: send to a stand-in server. Never set in production.
  RESEND_API_BASE?: string;
}

export const MAIL_FROM = "UPL1FT <orders@upl1ft.org>";

const RESEND_URL = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 5000;
const RETRY_DELAY_MS = 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// true when Resend accepted the message. Never throws.
export async function sendEmail(
  env: MailEnv,
  to: string,
  subject: string,
  html: string,
  retryDelayMs: number = RETRY_DELAY_MS
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured, skipping email:", subject);
    return false;
  }

  const idempotencyKey = crypto.randomUUID();

  for (let attempt = 1; attempt <= 2; attempt++) {
    let temporary = true;
    try {
      const response = await fetch(env.RESEND_API_BASE ? `${env.RESEND_API_BASE}/emails` : RESEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, html }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      if (response.ok) return true;
      // 4xx other than 429 (a rejected address, a bad key) will not get better by itself.
      temporary = response.status === 429 || response.status >= 500;
      console.error("Email failed:", subject, response.status, `(try ${attempt})`);
    } catch (err) {
      console.error("Email threw:", subject, err instanceof Error ? err.message : String(err), `(try ${attempt})`);
    }
    if (!temporary || attempt === 2) return false;
    await sleep(retryDelayMs);
  }
  return false;
}
