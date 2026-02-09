import { createClient } from "@supabase/supabase-js";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
}

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = origin === "https://upl1ft.org" ? origin : "https://upl1ft.org";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export const onRequestOptions: PagesFunction<Env> = async (context) => {
  return new Response(null, { headers: getCorsHeaders(context.request) });
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildTrackingEmailHtml(orders: { tracking_token: string; status: string; created_at: string }[]): string {
  const orderRows = orders
    .map((o) => {
      const date = new Date(o.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const statusLabel = o.status.charAt(0).toUpperCase() + o.status.slice(1);
      return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #333; color: #ccc;">${date}</td>
        <td style="padding: 12px; border-bottom: 1px solid #333; color: #C9A227;">${escapeHtml(statusLabel)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #333; text-align: right;">
          <a href="https://upl1ft.org/orders/track?token=${encodeURIComponent(o.tracking_token)}" style="display: inline-block; background: #C9A227; color: #000; padding: 8px 16px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">Track</a>
        </td>
      </tr>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 28px; letter-spacing: 4px; color: #C9A227; margin: 0;">UPL1FT</h1>
      <p style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px;">Rise Above. Walk In Purpose.</p>
    </div>

    <div style="text-align: center; margin-bottom: 32px;">
      <h2 style="color: #C9A227; font-size: 20px; letter-spacing: 2px; text-transform: uppercase; margin: 0;">Your Tracking Links</h2>
      <p style="color: #999; margin-top: 8px;">Here are the tracking links for your recent orders.</p>
    </div>

    <div style="background: #111; padding: 24px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #1a1a1a;">
          <th style="padding: 8px 12px; color: #C9A227; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Date</th>
          <th style="padding: 8px 12px; color: #C9A227; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Status</th>
          <th style="padding: 8px 12px; color: #C9A227; text-align: right; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;"></th>
        </tr>
        ${orderRows}
      </table>
    </div>

    <!-- Signup CTA -->
    <div style="background: #111; padding: 24px; margin-bottom: 32px; text-align: center; border: 1px solid #C9A22733;">
      <p style="color: #C9A227; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">Join the Movement</p>
      <p style="color: #999; font-size: 13px; margin: 0 0 16px 0;">Create a free account to track orders instantly, unlock member-only discounts, and get early access to new drops.</p>
      <a href="https://upl1ft.org/signup" style="display: inline-block; background: #C9A227; color: #000; padding: 12px 28px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 12px;">Create Free Account</a>
    </div>

    <div style="text-align: center; border-top: 1px solid #222; padding-top: 24px;">
      <p style="color: #666; font-size: 12px; margin: 0;">
        UPL1FT &mdash; Faith-Forward Streetwear<br/>
        <a href="https://upl1ft.org" style="color: #C9A227; text-decoration: none;">upl1ft.org</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY } = context.env;
  const corsHeaders = getCorsHeaders(context.request);

  try {
    const { email } = (await context.request.json()) as { email: string };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.length > 254) {
      // Always return success to prevent email enumeration
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Look up orders by customer email that have a tracking token
    const { data: orders } = await supabase
      .from("orders")
      .select("tracking_token, status, created_at")
      .eq("customer_email", email.toLowerCase().trim())
      .not("tracking_token", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (orders && orders.length > 0) {
      // Send tracking email
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "UPL1FT <orders@upl1ft.org>",
          to: [email.toLowerCase().trim()],
          subject: "Your Tracking Links — UPL1FT",
          html: buildTrackingEmailHtml(orders),
        }),
      });
    }

    // Always return success to prevent email enumeration
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("Resend tracking error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};
