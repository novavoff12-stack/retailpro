# Modmail Gateway Bot

Always-on Discord bot that opens a ticket when a user **DMs the bot**.
Staff reply with `?reply <text>` and close with `?close` or `?close <reason>`.

Shares the same database as the Lovable dashboard.

## Deploy on Railway

1. Push this repo to GitHub.
2. On [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**.
3. Railway auto-detects `nixpacks.toml` / `railway.json` in the repo root and
   runs `cd bot && npm install` then `cd bot && node src/index.js`.
4. In **Variables**, add:
   - `DISCORD_BOT_TOKEN` — your bot token
   - `SUPABASE_URL` — `https://wgubtalkareywkwitktb.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` — from your Lovable Cloud backend settings
   - `BOT_ID` *(optional)* — the `bots.id` UUID this worker should serve
5. Deploy. In **Deploy Logs** you should see `login ok`.

The bot will not connect to Discord until the owner finishes the dashboard
setup wizard (staff role, modmail category, and log channel selected). If a
login fails 3 times in a row, the last error is shown on the dashboard.
