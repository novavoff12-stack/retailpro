import 'dotenv/config';
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
  DISCORD_BOT_TOKEN,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  BOT_ID,
} = process.env;

if (!DISCORD_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars: DISCORD_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
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
  else q = q.eq('bot_token', DISCORD_BOT_TOKEN);
  const { data, error } = await q.limit(1).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No matching row in `bots` table for this token');
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

      // ?reply <text>
      if (content.toLowerCase().startsWith('?reply')) {
        const text = content.slice(6).trim();
        if (!text) {
          await msg.reply('Usage: `?reply <message>`');
          return;
        }
        const user = await client.users.fetch(ticket.user_discord_id).catch(() => null);
        if (!user) {
          await msg.reply('Could not reach the user.');
          return;
        }
        const replyEmbed = new EmbedBuilder()
          .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
          .setDescription(text)
          .setColor(0x57f287)
          .setTimestamp(new Date());
        try {
          await user.send({ embeds: [replyEmbed] });
          await msg.react(cfg.confirmation_emoji || '✅');
          await logMessage(ticket.id, msg.author, text, true);
        } catch (e) {
          await msg.reply(`Could not DM the user: ${e.message}`);
        }
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
    }
  } catch (err) {
    console.error('messageCreate handler', err);
  }
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

await loadBotRow();
await client.login(DISCORD_BOT_TOKEN);
