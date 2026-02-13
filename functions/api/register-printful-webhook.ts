/**
 * One-time utility: registers the Printful webhook.
 * DELETE THIS FILE after successful registration.
 *
 * Call via: GET https://upl1ft.org/api/register-printful-webhook
 */

interface Env {
  PRINTFUL_API_TOKEN: string;
  SITE_URL: string;
}

const PRINTFUL_STORE_ID = "17677297";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const webhookUrl = `${env.SITE_URL || "https://upl1ft.org"}/api/printful-webhook`;

  try {
    // First, check existing webhooks
    const existing = await fetch("https://api.printful.com/webhooks", {
      headers: {
        Authorization: `Bearer ${env.PRINTFUL_API_TOKEN}`,
        "X-PF-Store-Id": PRINTFUL_STORE_ID,
      },
    });
    const existingData = (await existing.json()) as any;

    // Register webhook
    const response = await fetch("https://api.printful.com/webhooks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.PRINTFUL_API_TOKEN}`,
        "X-PF-Store-Id": PRINTFUL_STORE_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
        types: [
          "package_shipped",
          "order_updated",
        ],
      }),
    });

    const data = await response.json();

    return new Response(
      JSON.stringify(
        {
          status: response.ok ? "success" : "error",
          webhookUrl,
          existingWebhooks: existingData,
          registrationResult: data,
        },
        null,
        2
      ),
      {
        status: response.ok ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
