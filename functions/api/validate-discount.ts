import { createClient } from "@supabase/supabase-js";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = context.env;
  const corsHeaders = getCorsHeaders(context.request);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ valid: false, error: "Service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { code, subtotal } = (await context.request.json()) as {
      code: string;
      subtotal: number; // in cents
    };

    if (!code) {
      return new Response(
        JSON.stringify({ valid: false, error: "No code provided" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Look up discount code
    const { data: discount, error: dbError } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .eq("active", true)
      .single();

    const invalidCode = () =>
      new Response(
        JSON.stringify({ valid: false, error: "Invalid or expired code" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    if (dbError || !discount) {
      return invalidCode();
    }

    // Validate eligibility (single generic error for all failure reasons)
    const now = new Date();
    const notExpired = !discount.expires_at || new Date(discount.expires_at) > now;
    const started = !discount.starts_at || new Date(discount.starts_at) <= now;
    const hasUses = discount.max_uses === null || discount.current_uses < discount.max_uses;

    let memberOk = !discount.members_only;
    if (discount.members_only) {
      const authHeader = context.request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        const { data: { user } } = await supabase.auth.getUser(token);
        memberOk = !!user;
      }
    }

    if (!notExpired || !started || !hasUses || !memberOk) {
      return invalidCode();
    }

    // Minimum order amount — specific error kept as a UX hint (not a security disclosure)
    if (discount.min_order_amount > 0 && subtotal < discount.min_order_amount) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: `Minimum order of $${(discount.min_order_amount / 100).toFixed(2)} required`,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.discount_type === "percentage") {
      discountAmount = Math.round((subtotal * discount.discount_value) / 100);
    } else {
      discountAmount = Math.min(discount.discount_value, subtotal);
    }

    return new Response(
      JSON.stringify({
        valid: true,
        discount_type: discount.discount_type,
        discount_value: discount.discount_value,
        discount_amount: discountAmount,
        description: discount.description,
        code: discount.code,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ valid: false, error: "Failed to validate code" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};
