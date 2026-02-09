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

    if (dbError || !discount) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid discount code" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check expiration
    if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: "This code has expired" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check start date
    if (discount.starts_at && new Date(discount.starts_at) > new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: "This code is not yet active" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check usage limit
    if (
      discount.max_uses !== null &&
      discount.current_uses >= discount.max_uses
    ) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "This code is no longer available",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check members-only
    if (discount.members_only) {
      const authHeader = context.request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({
            valid: false,
            error: "This code is for members only. Please sign in.",
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const token = authHeader.split(" ")[1];
      const {
        data: { user },
      } = await supabase.auth.getUser(token);

      if (!user) {
        return new Response(
          JSON.stringify({
            valid: false,
            error: "This code is for members only. Please sign in.",
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Check minimum order amount
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
