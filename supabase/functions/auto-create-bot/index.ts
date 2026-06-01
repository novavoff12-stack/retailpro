// Auto-create a bot row from just a bot token.
// POST { bot_token, application_name? }
//  - Verifies the token with Discord
//  - Pulls application_id + public_key automatically from Discord
//  - Optionally renames the application
// Requires the caller to be signed in (uses auth header).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const DISCORD_API = "https://discord.com/api/v10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { bot_token, application_name } = await req.json();
    if (!bot_token || typeof bot_token !== "string") {
      return json({ error: "bot_token is required" }, 400);
    }

    // 1) Fetch the bot user (also verifies the token)
    const meRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bot ${bot_token}` },
    });
    if (!meRes.ok) {
      return json({ error: `Discord rejected the bot token (${meRes.status})` }, 400);
    }
    const me = await meRes.json();

    // 2) Fetch the application — has id, verify_key (public_key), flags, etc.
    const appRes = await fetch(`${DISCORD_API}/applications/@me`, {
      headers: { Authorization: `Bot ${bot_token}` },
    });
    if (!appRes.ok) {
      const txt = await appRes.text();
      return json({ error: `Could not fetch application: ${txt}` }, 400);
    }
    const app = await appRes.json();
    const application_id: string = app.id;
    const public_key: string = app.verify_key;

    // 3) Optional: rename the application & enable the gateway intent flags
    //    Privileged intent bitfield: MESSAGE_CONTENT (1<<19) | GUILD_MEMBERS (1<<14) | GUILD_PRESENCES (1<<13 — we DON'T request this)
    const desiredFlags = (1 << 19) | (1 << 14); // message_content + guild_members
    const patchBody: Record<string, unknown> = {
      flags: (app.flags ?? 0) | desiredFlags,
    };
    if (application_name && typeof application_name === "string") {
      patchBody.description = app.description ?? "Modmail bot powered by RetailPro";
    }
    // PATCH /applications/@me lets us set description, interactions_endpoint_url, flags, etc.
    // (Renaming the bot user requires PATCH /users/@me with `username`.)
    await fetch(`${DISCORD_API}/applications/@me`, {
      method: "PATCH",
      headers: { Authorization: `Bot ${bot_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    }).catch(() => null);

    if (application_name && typeof application_name === "string") {
      await fetch(`${DISCORD_API}/users/@me`, {
        method: "PATCH",
        headers: { Authorization: `Bot ${bot_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ username: application_name }),
      }).catch(() => null);
    }

    // 4) Upsert into bots table (one bot per application_id per owner)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: existing } = await admin
      .from("bots")
      .select("*")
      .eq("owner_user_id", user.id)
      .eq("application_id", application_id)
      .maybeSingle();

    let bot;
    if (existing) {
      const { data, error } = await admin
        .from("bots")
        .update({
          bot_token,
          public_key,
          bot_name: application_name ?? me.username,
          status: "active",
          bot_running: true,
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      bot = data;
    } else {
      const { data, error } = await admin
        .from("bots")
        .insert({
          owner_user_id: user.id,
          application_id,
          public_key,
          bot_token,
          bot_name: application_name ?? me.username,
          status: "active",
          bot_running: true,
        })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      bot = data;
    }

    return json({
      ok: true,
      bot: {
        id: bot.id,
        application_id,
        public_key,
        bot_name: bot.bot_name,
        discord_user: { id: me.id, username: me.username, avatar: me.avatar },
      },
      note:
        "Privileged intents requested via API. If Discord still says 'Disallowed intents', toggle them on at https://discord.com/developers/applications/" +
        application_id + "/bot",
    });
  } catch (e) {
    console.error("[auto-create-bot]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
