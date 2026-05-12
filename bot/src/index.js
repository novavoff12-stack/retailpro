import 'dotenv/config';
import ws from 'ws';
import {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  BOT_ID,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.Message],
});

let botRow = null; // cached row from `bots` table

async function loadBotRow() {
  let q = db.from('bots').select('*');
  if (BOT_ID) q = q.eq('id', BOT_ID);
  const { data, error } = await q.limit(1).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(BOT_ID
    ? `No row in \`bots\` table with id=${BOT_ID}`
    : 'No bots found. Set BOT_ID env var or add a bot via the dashboard.');
  if (!data.bot_token) throw new Error('Bot row has no bot_token saved');
  botRow = data;
  console.log(`Serving bot row ${botRow.id} (${botRow.bot_name ?? 'unnamed'})`);
}

async function getGuildConfig(guildId) {
  const { data, error } = await db
    .from('guilds')
    .select('*')
    .eq('bot_id', botRow.id)
    .eq('guild_id', guildId)
    .maybeSingle();
  if (error) console.error('getGuildConfig', error);
  return data;
}

async function getFirstGuildConfig() {
  // For DM flow when we don't yet know which guild — pick the only configured guild for this bot.
  const { data, error } = await db
    .from('guilds')
    .select('*')
    .eq('bot_id', botRow.id)
    .limit(1);
  if (error) console.error('getFirstGuildConfig', error);
  return data?.[0] ?? null;
}

async function findOpenTicketByUser(discordUserId) {
  const { data } = await db
    .from('tickets')
    .select('*')
    .eq('bot_id', botRow.id)
    .eq('user_discord_id', discordUserId)
    .eq('status', 'open')
    .limit(1);
  return data?.[0] ?? null;
}

async function findOpenTicketByChannel(channelId) {
  const { data } = await db
    .from('tickets')
    .select('*')
    .eq('bot_id', botRow.id)
    .eq('channel_id', channelId)
    .eq('status', 'open')
    .limit(1);
  return data?.[0] ?? null;
}

async function logMessage(ticketId, author, content, isStaff) {
  await db.from('ticket_messages').insert({
    ticket_id: ticketId,
    author_discord_id: author.id,
    author_username: author.username ?? author.tag ?? null,
    content: content ?? '',
    is_staff: isStaff,
  });
}

// ---------- DM from a user ----------
client.on('messageCreate', async (msg) => {
  try {
    if (msg.author.bot) return;

    // DM channel = open / append to ticket
    if (msg.channel.type === ChannelType.DM) {
      const cfg = await getFirstGuildConfig();
      if (!cfg || !cfg.modmail_category_id) {
        await msg.reply('Modmail is not configured yet. Please try again later.');
        return;
      }
      const guild = await client.guilds.fetch(cfg.guild_id).catch(() => null);
      if (!guild) {
        await msg.reply('Modmail server unavailable.');
        return;
      }

      let ticket = await findOpenTicketByUser(msg.author.id);
      let channel;

      if (ticket && ticket.channel_id) {
        channel = await guild.channels.fetch(ticket.channel_id).catch(() => null);
      }

      if (!channel) {
        // Create a new ticket channel
        const overwrites = [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ];
        if (cfg.staff_role_id) {
          overwrites.push({
            id: cfg.staff_role_id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          });
        }

        channel = await guild.channels.create({
          name: `modmail-${msg.author.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90) || `modmail-${msg.author.id}`,
          type: ChannelType.GuildText,
          parent: cfg.modmail_category_id,
          permissionOverwrites: overwrites,
          topic: `Modmail with ${msg.author.tag} (${msg.author.id})`,
        });

        const { data: newTicket, error: tErr } = await db.from('tickets').insert({
          bot_id: botRow.id,
          guild_id: cfg.guild_id,
          user_discord_id: msg.author.id,
          channel_id: channel.id,
          status: 'open',
        }).select().single();
        if (tErr) {
          console.error('insert ticket', tErr);
          return;
        }
        ticket = newTicket;

        const headerEmbed = new EmbedBuilder()
          .setTitle('New modmail ticket')
          .setDescription(`From <@${msg.author.id}> (\`${msg.author.tag}\`)`)
          .setThumbnail(msg.author.displayAvatarURL())
          .setTimestamp(new Date());
        await channel.send({
          content: cfg.staff_role_id ? `<@&${cfg.staff_role_id}>` : undefined,
          embeds: [headerEmbed],
        });

        // Welcome DM
        try {
          await msg.author.send(cfg.welcome_message);
        } catch {}
      }

      // Relay user's message into the channel
      const userEmbed = new EmbedBuilder()
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setDescription(msg.content || '*(no text)*')
        .setColor(0x5865f2)
        .setTimestamp(new Date());
      const files = [...msg.attachments.values()].map((a) => a.url);
      await channel.send({ embeds: [userEmbed], files });

      await logMessage(ticket.id, msg.author, msg.content, false);

      // Confirmation reaction
      try {
        await msg.react(cfg.confirmation_emoji || '✅');
      } catch {}
      return;
    }

    // Guild channel = staff command
    if (msg.channel.type === ChannelType.GuildText && msg.channel.parentId) {
      const ticket = await findOpenTicketByChannel(msg.channel.id);
      if (!ticket) return;
      const cfg = await getGuildConfig(msg.guild.id);
      if (!cfg) return;

      // Staff role check
      if (cfg.staff_role_id) {
        const member = await msg.guild.members.fetch(msg.author.id).catch(() => null);
        if (!member?.roles.cache.has(cfg.staff_role_id)) return;
      }

      const content = msg.content.trim();

      // Helper: relay staff text to user as embed, repost as embed in channel,
      // delete the original staff message, and log it.
      const sendStaffReply = async (text, attachmentUrls = []) => {
        const user = await client.users.fetch(ticket.user_discord_id).catch(() => null);
        if (!user) {
          await msg.channel.send('Could not reach the user.');
          return;
        }
        const replyEmbed = new EmbedBuilder()
          .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
          .setDescription(text || '*(no text)*')
          .setColor(0x57f287)
          .setFooter({ text: 'Staff reply' })
          .setTimestamp(new Date());
        try {
          await user.send({ embeds: [replyEmbed], files: attachmentUrls });
          await msg.channel.send({ embeds: [replyEmbed], files: attachmentUrls });
          await logMessage(ticket.id, msg.author, text, true);
          try { await msg.delete(); } catch {}
        } catch (e) {
          await msg.channel.send(`Could not DM the user: ${e.message}`);
        }
      };

      // ?reply <text>
      if (content.toLowerCase().startsWith('?reply')) {
        let text = content.slice(6).trim();
        // Strip optional surrounding quotes: ?reply "hello"
        if ((text.startsWith('"') && text.endsWith('"')) ||
            (text.startsWith("'") && text.endsWith("'"))) {
          text = text.slice(1, -1).trim();
        }
        if (!text && msg.attachments.size === 0) {
          await msg.reply('Usage: `?reply <message>`');
          return;
        }
        const files = [...msg.attachments.values()].map((a) => a.url);
        await sendStaffReply(text, files);
        return;
      }

      // ?close [reason]
      if (content.toLowerCase().startsWith('?close')) {
        const reason = content.slice(6).trim();
        const user = await client.users.fetch(ticket.user_discord_id).catch(() => null);
        if (user) {
          const closeEmbed = new EmbedBuilder()
            .setTitle('Ticket closed')
            .setDescription(reason ? `${cfg.close_message}\n\n**Reason:** ${reason}` : cfg.close_message)
            .setColor(0xed4245)
            .setTimestamp(new Date());
          try { await user.send({ embeds: [closeEmbed] }); } catch {}
        }
        await db.from('tickets').update({
          status: 'closed',
          closed_at: new Date().toISOString(),
        }).eq('id', ticket.id);
        await msg.reply('Closing ticket in 5s…');
        setTimeout(() => msg.channel.delete().catch(() => {}), 5000);
        return;
      }

      // Any other non-command staff message → auto-relay as embed
      if (!content.startsWith('?')) {
        const files = [...msg.attachments.values()].map((a) => a.url);
        await sendStaffReply(content, files);
        return;
      }
    }
  } catch (err) {
    console.error('messageCreate handler', err);
  }
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Don't crash the process — Railway treats exit as a deploy failure and
// other bots/services on the same instance would go down too. Instead, log
// and keep retrying every 30s so when the user fixes the issue (e.g. enables
// privileged intents in the Discord dev portal) we reconnect automatically.
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

client.on('error', (err) => {
  console.error('[client error]', err);
});
client.on('shardError', (err) => {
  console.error('[shard error]', err);
});

async function startWithRetry() {
  while (true) {
    try {
      if (!botRow) await loadBotRow();
      await client.login(botRow.bot_token);
      return; // success
    } catch (err) {
      const msg = err?.message || String(err);
      console.error(`[startup] login failed: ${msg}`);
      if (/disallowed intents/i.test(msg)) {
        console.error('[startup] Enable "Message Content" and "Server Members" privileged intents in the Discord Developer Portal, then this will reconnect automatically.');
      }
      // Reset cached row so we re-read token in case it was rotated.
      botRow = null;
      try { client.destroy(); } catch {}
      console.log('[startup] retrying in 30s…');
      await new Promise((r) => setTimeout(r, 30_000));
    }
  }
}

startWithRetry();
