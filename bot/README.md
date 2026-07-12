# Modmail Gateway Bot

Always-on Discord bot that opens a ticket when a user **DMs the bot** (no commands required).
Staff reply with `?reply <text>` and close with `?close` or `?close <reason>` inside the ticket channel.

Shares the same database as the Lovable dashboard.

## Deploy on DigitalOcean App Platform

The bot runs as a **Worker** service (no HTTP port needed — it holds a Discord gateway
connection). App Platform's Node buildpack detects `bot/package.json` and uses the
`Procfile` (`worker: node src/index.js`) automatically.

1. Push this repo to GitHub (the `bot/` folder is a standalone service — point App
   Platform's **Source Directory** at `bot`).
2. On [cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps) →
   **Create App → GitHub** → pick the repo and branch.
3. In the resource list, **delete any auto-detected Web Service** and click
   **Add Resource → Worker**. Point it at the `bot` directory.
   - Build command: *(leave empty — buildpack runs `npm install`)*
   - Run command: `node src/index.js`
   - Instance size: **Basic — 512 MB** is enough.
4. Under **Environment Variables** (Worker scope, mark secrets as *Encrypted*):
   - `DISCORD_BOT_TOKEN` — your bot token
   - `SUPABASE_URL` — `https://wgubtalkareywkwitktb.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` — from your Lovable Cloud backend settings
   - `BOT_ID` *(optional)* — the `bots.id` UUID this worker should serve
5. **Create Resources** → deploy. In **Runtime Logs** you should see
   `Logged in as <bot>#0000`.

### Optional: deploy from spec file

`bot/.do/app.yaml` contains a ready-made app spec. Edit the `github.repo` field to
match your fork, then create the app with `doctl`:

```bash
doctl apps create --spec bot/.do/app.yaml
```

Add secrets in the DO dashboard after the first deploy (spec files can't hold plain
secret values).

## Discord developer portal

Enable these **Privileged Gateway Intents** on the bot:
- `MESSAGE CONTENT INTENT` ✅
- `SERVER MEMBERS INTENT` ✅ (recommended)
- `DIRECT MESSAGES` is non-privileged but DMs to the bot must be allowed in the user's settings.

## Behaviour

- **User DMs the bot** → bot creates a private channel under the configured Modmail Category,
  pings the support role, posts the user's message, and DMs them the welcome message + ✅ react.
- **User sends more DMs** → relayed into the same ticket channel.
- **Staff `?reply <text>`** in the ticket channel → DM'd to the user as a rich embed with staff
  name + avatar; staff message gets a ✅ confirmation react.
- **Staff `?close [reason]`** → DMs close message (with reason if given), marks ticket closed,
  deletes the channel after 5s.
