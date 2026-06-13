// Transcript reader. Requires an HMAC signature in the URL so transcript links
// can be safely shared in Discord channels without leaking access to anyone who
// guesses or forwards a bare ticket UUID.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function expectedSig(ticketId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SERVICE_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`transcript:${ticketId}`));
  // hex
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = new URL(req.url);
    let id = url.searchParams.get("id");
    if (!id) {
      const parts = url.pathname.split("/").filter(Boolean);
      id = parts[parts.length - 1];
    }
    if (!id || id.length < 12) {
      return new Response(JSON.stringify({ error: "invalid id" }), {
        status: 400,
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // Authorize: either valid HMAC signature OR authenticated bot-owner JWT.
    const sig = (url.searchParams.get("sig") ?? "").toLowerCase();
    const want = await expectedSig(id);
    let authorized = !!sig && timingSafeEqual(sig, want);

    if (!authorized) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (token) {
        try {
          const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
            global: { headers: { Authorization: `Bearer ${token}` } },
          });
          const { data: claims } = await userClient.auth.getClaims(token);
          const uid = claims?.claims?.sub as string | undefined;
          if (uid) {
            // Look up ticket -> bot -> owner
            const { data: t } = await db.from("tickets").select("bot_id").eq("id", id).maybeSingle();
            if (t?.bot_id) {
              const { data: b } = await db.from("bots").select("owner_user_id").eq("id", t.bot_id).maybeSingle();
              if (b?.owner_user_id === uid) authorized = true;
            }
          }
        } catch { /* ignore */ }
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...cors, "content-type": "application/json" },
      });
    }


    const { data: ticket, error: tErr } = await db
      .from("tickets")
      .select("id, guild_id, user_discord_id, status, category_name, opened_at, closed_at, closed_by_discord_id, closed_by_username")
      .eq("id", id)
      .maybeSingle();

    if (tErr) throw tErr;
    if (!ticket) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    const { data: messages, error: mErr } = await db
      .from("ticket_messages")
      .select("id, author_discord_id, author_username, content, is_staff, created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    if (mErr) throw mErr;

    return new Response(JSON.stringify({ ticket, messages: messages ?? [] }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
});
