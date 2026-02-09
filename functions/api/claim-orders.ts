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

/**
 * Claims unclaimed guest orders when a user signs up or logs in.
 * Matches orders by customer_email where user_id is null.
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = context.env;

  const corsHeaders = getCorsHeaders(context.request);

  try {
    const authHeader = context.request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.split(" ")[1];
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user || !user.email) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Find unclaimed orders matching this user's email
    const { data: unclaimedOrders, error: fetchError } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_email", user.email)
      .is("user_id", null);

    if (fetchError) {
      console.error("Failed to fetch unclaimed orders:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to check orders" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!unclaimedOrders || unclaimedOrders.length === 0) {
      return new Response(
        JSON.stringify({ claimed: 0 }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Claim the orders by setting user_id
    const orderIds = unclaimedOrders.map((o) => o.id);
    const { error: updateError } = await supabase
      .from("orders")
      .update({ user_id: user.id })
      .in("id", orderIds);

    if (updateError) {
      console.error("Failed to claim orders:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to claim orders" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Claimed ${orderIds.length} orders for user ${user.id} (${user.email})`);

    return new Response(
      JSON.stringify({ claimed: orderIds.length }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err: any) {
    console.error("Claim orders error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to claim orders" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};
