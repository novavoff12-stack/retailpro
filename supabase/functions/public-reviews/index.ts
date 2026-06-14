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
    const botId = url.searchParams.get("bot_id");
    if (!botId || !/^[0-9a-f-]{36}$/i.test(botId)) {
      return new Response(JSON.stringify({ error: "invalid bot_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const [{ data: bot }, { data: reviews }] = await Promise.all([
      db.from("bots").select("id,bot_name,avatar_url").eq("id", botId).maybeSingle(),
      db
        .from("reviews")
        .select("stars,comment,created_at,user_username")
        .eq("bot_id", botId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (!bot) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const list = reviews ?? [];
    const count = list.length;
    const avg = count ? list.reduce((s, r: any) => s + r.stars, 0) / count : 0;
    const breakdown = [1, 2, 3, 4, 5].map((s) => ({
      stars: s,
      count: list.filter((r: any) => r.stars === s).length,
    }));

    return new Response(
      JSON.stringify({
        bot: { id: bot.id, name: bot.bot_name, avatar_url: bot.avatar_url },
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
