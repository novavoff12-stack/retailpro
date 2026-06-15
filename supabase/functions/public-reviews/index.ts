import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const botIdParam = url.searchParams.get("bot_id");
    const slugParam = url.searchParams.get("slug");

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    let botQuery = db.from("bots").select("id,bot_name,avatar_url,review_slug");
    if (slugParam) {
      if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/i.test(slugParam)) {
        return new Response(JSON.stringify({ error: "invalid slug" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      botQuery = botQuery.ilike("review_slug", slugParam);
    } else if (botIdParam) {
      if (!/^[0-9a-f-]{36}$/i.test(botIdParam)) {
        return new Response(JSON.stringify({ error: "invalid bot_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      botQuery = botQuery.eq("id", botIdParam);
    } else {
      return new Response(JSON.stringify({ error: "bot_id or slug required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: bot } = await botQuery.maybeSingle();
    if (!bot) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: reviews } = await db
      .from("reviews")
      .select("stars,comment,created_at,user_username")
      .eq("bot_id", bot.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const list = reviews ?? [];
    const count = list.length;
    const avg = count ? list.reduce((s, r: any) => s + r.stars, 0) / count : 0;
    const breakdown = [1, 2, 3, 4, 5].map((s) => ({
      stars: s,
      count: list.filter((r: any) => r.stars === s).length,
    }));

    return new Response(
      JSON.stringify({
        bot: { id: bot.id, name: bot.bot_name, avatar_url: bot.avatar_url, slug: bot.review_slug },
        stats: { count, average: avg, breakdown },
        reviews: list,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
