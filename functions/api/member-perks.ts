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

  // Require authentication — members only
  const authHeader = context.request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const token = authHeader.split(" ")[1];
  const { data: { user } } = await supabase.auth.getUser(token);

  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    // Server-side query with service role — fetch all fields for filtering, return only safe fields
    const now = new Date().toISOString();
    const { data: discounts } = await supabase
      .from("discount_codes")
      .select("code, discount_type, discount_value, description, min_order_amount, expires_at, max_uses, current_uses")
      .eq("members_only", true)
      .eq("active", true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .or(`starts_at.is.null,starts_at.lte.${now}`);

    // Filter out exhausted codes, then strip internal fields before returning
    const available = (discounts || [])
      .filter((d: any) => d.max_uses === null || d.current_uses < d.max_uses)
      .map(({ max_uses, current_uses, ...safe }) => safe);

    return new Response(
      JSON.stringify({ discounts: available }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("Member perks error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to load perks" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};
