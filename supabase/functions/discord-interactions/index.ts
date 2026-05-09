// Discord Interactions endpoint — handles slash commands & modmail DM relay
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature-ed25519, x-signature-timestamp",
};

// Ed25519 signature verification (Discord requirement)
async function verifySignature(publicKey: string, signature: string, timestamp: string, body: string) {
  try {
    const enc = new TextEncoder();
    const sigBytes = hexToBytes(signature);
    const keyBytes = hexToBytes(publicKey);
    const msg = enc.encode(timestamp + body);
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify("Ed25519", key, sigBytes, msg);
  } catch (e) {
    console.error("verify err", e);
    return false;
  }
}
function hexToBytes(hex: string) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  // Bot identification — pass ?bot_id=<uuid> in your interactions URL
  const botIdParam = url.searchParams.get("bot_id");
  if (!botIdParam) {
    return new Response("Missing bot_id query param", { status: 400, headers: corsHeaders });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: bot, error: botErr } = await admin.from("bots").select("*").eq("id", botIdParam).single();
  if (botErr || !bot) {
    return new Response("Bot not found", { status: 404, headers: corsHeaders });
  }

  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const body = await req.text();

  if (!signature || !timestamp || !(await verifySignature(bot.public_key, signature, timestamp, body))) {
    return new Response("invalid request signature", { status: 401, headers: corsHeaders });
  }

  const interaction = JSON.parse(body);

  // PING
  if (interaction.type === 1) {
    return Response.json({ type: 1 }, { headers: corsHeaders });
  }

  // Slash command
  if (interaction.type === 2) {
    const name = interaction.data?.name;
    if (name === "ping") {
      return Response.json(
        { type: 4, data: { content: `🏓 Pong from **${bot.bot_name ?? "bot"}**` } },
        { headers: corsHeaders },
      );
    }
    if (name === "modmail") {
      return Response.json(
        { type: 4, data: { content: "📬 Modmail is set up. DM me to open a ticket.", flags: 64 } },
        { headers: corsHeaders },
      );
    }
    return Response.json(
      { type: 4, data: { content: "Unknown command", flags: 64 } },
      { headers: corsHeaders },
    );
  }

  return new Response("Unhandled", { status: 400, headers: corsHeaders });
});
