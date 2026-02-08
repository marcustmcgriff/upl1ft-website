interface Env {
  MAILCHIMP_API_KEY: string;
  MAILCHIMP_LIST_ID: string;
  MAILCHIMP_SERVER_PREFIX: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const {
    MAILCHIMP_API_KEY,
    MAILCHIMP_LIST_ID,
    MAILCHIMP_SERVER_PREFIX,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  } = context.env;

  const origin = context.request.headers.get("Origin") || "";
  const allowedOrigin = origin === "https://upl1ft.org" ? origin : "https://upl1ft.org";
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = (await context.request.json()) as { email: string };

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!MAILCHIMP_API_KEY || !MAILCHIMP_LIST_ID || !MAILCHIMP_SERVER_PREFIX) {
      // Mailchimp not configured yet — save email to Supabase for later import
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

          let userId: string | null = null;
          let isMember = false;
          const authHeader = context.request.headers.get("Authorization");
          if (authHeader) {
            const token = authHeader.replace("Bearer ", "");
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) {
              userId = user.id;
              isMember = true;
            }
          }

          await supabase.from("newsletter_subscribers").upsert(
            { email, source: "website", is_member: isMember, user_id: userId },
            { onConflict: "email" }
          );
        } catch (err) {
          console.error("Failed to save newsletter subscriber to Supabase:", err);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Welcome to the movement! You're on the list." }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if the subscriber is a logged-in member (verify token)
    let isMember = false;
    let verifiedUser: { id: string } | null = null;
    const authHeader = context.request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ") && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.split(" ")[1];
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        isMember = true;
        verifiedUser = user;
      }
    }

    // Add subscriber using POST
    const mailchimpUrl = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST_ID}/members`;

    const mailchimpResponse = await fetch(mailchimpUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`anystring:${MAILCHIMP_API_KEY}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        status: "subscribed",
        tags: isMember ? ["member", "website"] : ["website"],
        merge_fields: {
          SOURCE: "website",
        },
      }),
    });

    const mailchimpResult = (await mailchimpResponse.json()) as any;

    if (!mailchimpResponse.ok) {
      // Handle already-subscribed case gracefully
      if (
        mailchimpResult.title === "Member Exists" ||
        mailchimpResult.status === 400
      ) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "You're already subscribed!",
          }),
          {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      console.error("Mailchimp error:", mailchimpResult);
      return new Response(
        JSON.stringify({ error: "Failed to subscribe. Please try again." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Update Supabase profile if user is logged in
    if (isMember && verifiedUser && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase
          .from("profiles")
          .update({ newsletter_subscribed: true })
          .eq("id", verifiedUser.id);
      } catch (err) {
        console.error("Failed to update profile newsletter status:", err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Subscribed successfully!" }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err: any) {
    console.error("Newsletter subscribe error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};
