import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  LogOut,
  Bot as BotIcon,
  Copy,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  Shield,
  RefreshCcw,
  Server,
} from "lucide-react";

interface Bot {
  id: string;
  application_id: string;
  public_key: string;
  bot_token: string;
  bot_name: string | null;
  status: string;
}

interface Guild {
  id: string;
  bot_id: string;
  guild_id: string;
  guild_name: string | null;
  modmail_category_id: string | null;
  staff_role_id: string | null;
  log_channel_id: string | null;
  welcome_message: string;
  close_message: string;
  confirmation_emoji: string;
}

const STEPS = [
  { id: 1, title: "Create Discord App", desc: "Register your application on Discord" },
  { id: 2, title: "Add Credentials", desc: "Paste your IDs and tokens" },
  { id: 3, title: "Invite & Verify", desc: "Add bot to your server and check it works" },
  { id: 4, title: "Configure Server", desc: "Guild, role, category, messages" },
];

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [bot, setBot] = useState<Bot | null>(null);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGuild, setSavingGuild] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  // bot form
  const [appId, setAppId] = useState("");
  const [pubKey, setPubKey] = useState("");
  const [token, setToken] = useState("");
  const [name, setName] = useState("");

  // guild config form
  const [guildId, setGuildId] = useState("");
  const [guildName, setGuildName] = useState("");
  const [staffRoleId, setStaffRoleId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [logChannelId, setLogChannelId] = useState("");
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const [closeMsg, setCloseMsg] = useState("");
  const [confirmEmoji, setConfirmEmoji] = useState("✅");

  useEffect(() => {
    if (!loading && !user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: botRow } = await supabase
        .from("bots").select("*").eq("owner_user_id", user.id).maybeSingle();
      if (botRow) {
        setBot(botRow as Bot);
        setAppId(botRow.application_id);
        setPubKey(botRow.public_key);
        setToken(botRow.bot_token);
        setName(botRow.bot_name ?? "");

        const { data: g } = await supabase
          .from("guilds").select("*").eq("bot_id", botRow.id).maybeSingle();
        if (g) {
          setGuild(g as Guild);
          setGuildId(g.guild_id);
          setGuildName(g.guild_name ?? "");
          setStaffRoleId(g.staff_role_id ?? "");
          setCategoryId(g.modmail_category_id ?? "");
          setLogChannelId(g.log_channel_id ?? "");
          setWelcomeMsg(g.welcome_message);
          setCloseMsg(g.close_message);
          setConfirmEmoji(g.confirmation_emoji);
        }
      }
      setFetching(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!appId.trim() || !pubKey.trim() || !token.trim()) {
      toast.error("Application ID, Public Key and Bot Token are required");
      return;
    }
    if (!/^\d{17,20}$/.test(appId.trim())) {
      toast.error("Application ID should be a 17–20 digit Discord snowflake");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("bots")
      .upsert(
        {
          owner_user_id: user.id,
          application_id: appId.trim(),
          public_key: pubKey.trim(),
          bot_token: token.trim(),
          bot_name: name.trim() || null,
          status: "active",
        },
        { onConflict: "owner_user_id" },
      )
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setBot(data as Bot);
    toast.success(bot ? "Bot updated" : "Bot saved — continue to step 3");
  };

  const handleVerify = async () => {
    if (!bot) return;
    setVerifying(true);
    const { data, error } = await supabase.functions.invoke("discord-bot-admin", {
      body: { action: "verify", bot_id: bot.id },
    });
    setVerifying(false);
    if (error || !data?.ok) {
      toast.error(data?.error ?? error?.message ?? "Verification failed");
      return;
    }
    setBot((b) => b ? { ...b, status: data.ready ? "ready" : "active", bot_name: b.bot_name ?? data.bot.username } : b);
    if (data.ready) {
      toast.success(`Verified! Bot is in ${data.guilds.length} server${data.guilds.length === 1 ? "" : "s"}.`);
      // pre-fill first guild if not set
      if (!guildId && data.guilds[0]) {
        setGuildId(data.guilds[0].id);
        setGuildName(data.guilds[0].name);
      }
    } else {
      toast.message("Bot token works, but the bot isn't in any server yet — invite it first.");
    }
  };

  const handleRegister = async () => {
    if (!bot) return;
    setRegistering(true);
    const { data, error } = await supabase.functions.invoke("discord-bot-admin", {
      body: { action: "register-commands", bot_id: bot.id },
    });
    setRegistering(false);
    if (error || !data?.ok) {
      toast.error(data?.error ?? error?.message ?? "Failed to register commands");
      return;
    }
    toast.success(`Registered: /${data.registered.join(", /")} — may take up to 1h to appear globally.`);
  };

  const handleSaveGuild = async () => {
    if (!bot) return;
    if (!guildId.trim() || !categoryId.trim() || !staffRoleId.trim()) {
      toast.error("Guild ID, Support Role ID and Category ID are required");
      return;
    }
    setSavingGuild(true);
    const payload = {
      bot_id: bot.id,
      guild_id: guildId.trim(),
      guild_name: guildName.trim() || null,
      staff_role_id: staffRoleId.trim(),
      modmail_category_id: categoryId.trim(),
      log_channel_id: logChannelId.trim() || null,
      welcome_message: welcomeMsg.trim() || "Hi! Thanks for reaching out. A staff member will be with you shortly.",
      close_message: closeMsg.trim() || "Your ticket has been closed. Feel free to message us again if you need anything.",
      confirmation_emoji: confirmEmoji.trim() || "✅",
    };
    const { data, error } = await supabase
      .from("guilds")
      .upsert(payload, { onConflict: "bot_id,guild_id" })
      .select()
      .single();
    setSavingGuild(false);
    if (error) return toast.error(error.message);
    setGuild(data as Guild);
    toast.success("Server configuration saved");
  };

  const interactionsUrl = bot
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discord-interactions?bot_id=${bot.id}`
    : "";

  const inviteUrl = bot
    ? `https://discord.com/oauth2/authorize?client_id=${bot.application_id}&scope=bot+applications.commands&permissions=534723950672`
    : "";

  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const credsValid = useMemo(
    () => Boolean(bot && bot.application_id && bot.public_key && bot.bot_token),
    [bot],
  );
  const isReady = bot?.status === "ready";
  const guildConfigured = Boolean(guild && guild.staff_role_id && guild.modmail_category_id);

  const currentStep = !bot ? 2 : !isReady ? 3 : !guildConfigured ? 4 : 4;

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-accent flex items-center justify-center">
              <BotIcon className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <div className="font-bold leading-none">Modmail</div>
              <div className="text-xs text-muted-foreground mt-0.5">Setup Dashboard</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-10 max-w-4xl space-y-8 px-4">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-accent">
              {guildConfigured && isReady ? "All set" : credsValid ? "Almost there" : "Let's get you set up"}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {guildConfigured && isReady ? "Your modmail bot is live" : "Set up your Modmail bot"}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Users DM your bot directly to open tickets. Staff reply with{" "}
            <code className="text-foreground">?reply</code> and close with{" "}
            <code className="text-foreground">?close</code>.
          </p>

          <div className="mt-8 grid sm:grid-cols-4 gap-3">
            {STEPS.map((s) => {
              const done = s.id < currentStep || (s.id === 4 && guildConfigured) || (s.id === 3 && isReady);
              const active = s.id === currentStep && !done;
              return (
                <div
                  key={s.id}
                  className={`rounded-xl border p-4 transition-smooth ${
                    active
                      ? "border-accent bg-accent/5 shadow-soft"
                      : done
                      ? "border-border bg-secondary/40"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-accent" />
                    ) : (
                      <Circle className={`h-5 w-5 ${active ? "text-accent" : "text-muted-foreground"}`} />
                    )}
                    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      Step {s.id}
                    </span>
                  </div>
                  <div className="font-semibold text-sm">{s.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Step 1 */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <Badge variant="secondary" className="mb-2">Step 1</Badge>
                <CardTitle>Create a Discord application</CardTitle>
                <CardDescription className="mt-1">
                  Open the Discord Developer Portal, create a new app, then add a bot to it.
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">
                  Open Developer Portal <ExternalLink className="ml-2 h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Click <span className="text-foreground font-medium">New Application</span> and give it a name.</li>
              <li>Open the <span className="text-foreground font-medium">Bot</span> tab → <span className="text-foreground font-medium">Reset Token</span> and copy it.</li>
              <li>On <span className="text-foreground font-medium">General Information</span>, copy the <span className="text-foreground font-medium">Application ID</span> and <span className="text-foreground font-medium">Public Key</span>.</li>
            </ol>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="mb-2 w-fit">Step 2</Badge>
            <CardTitle>Add your credentials</CardTitle>
            <CardDescription>Stored encrypted, only used to talk to Discord on your behalf.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Bot name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Modmail Bot" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appId">Application ID</Label>
                <Input id="appId" value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="123456789012345678" inputMode="numeric" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pubKey">Public Key</Label>
              <Input id="pubKey" value={pubKey} onChange={(e) => setPubKey(e.target.value)} placeholder="64-character hex string" className="font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Bot Token</Label>
              <div className="relative">
                <Input id="token" type={showToken ? "text" : "password"} value={token} onChange={(e) => setToken(e.target.value)} placeholder="MTI..." className="font-mono text-xs pr-10" />
                <button type="button" onClick={() => setShowToken((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showToken ? "Hide token" : "Show token"}>
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3 w-3" /> Never share this token publicly.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
                {saving ? "Saving…" : bot ? "Update bot" : "Save & continue"}
                {!saving && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
              {bot && (
                <Badge variant="outline" className="gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${isReady ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {bot.status}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card className={!bot ? "opacity-60 pointer-events-none" : ""}>
          <CardHeader>
            <Badge variant="secondary" className="mb-2 w-fit">Step 3</Badge>
            <CardTitle>Invite & verify</CardTitle>
            <CardDescription>
              Add the bot to your Discord server, then verify the token works.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <Label>Invite link</Label>
                <span className="text-xs text-muted-foreground">Includes the permissions Modmail needs</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-secondary p-3 rounded-md break-all font-mono">{inviteUrl || "—"}</code>
                <Button size="icon" variant="outline" onClick={() => copy(inviteUrl, "invite")} disabled={!inviteUrl}>
                  {copiedKey === "invite" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button asChild className="mt-3 w-full sm:w-auto" disabled={!inviteUrl}>
                <a href={inviteUrl || "#"} target="_blank" rel="noreferrer">
                  Invite bot to server <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>

            <Separator />

            <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
              <div>
                <div className="font-medium text-sm flex items-center gap-2">
                  <RefreshCcw className="h-3.5 w-3.5" /> Verify connection
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Checks the bot token is valid and that the bot has joined at least one server.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <Button onClick={handleVerify} disabled={!bot || verifying}>
                  <RefreshCcw className={`h-4 w-4 mr-2 ${verifying ? "animate-spin" : ""}`} />
                  {verifying ? "Verifying…" : "Verify bot"}
                </Button>
                {isReady && (
                  <Badge variant="outline" className="gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Ready
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 4 — Server configuration */}
        <Card className={!isReady ? "opacity-60 pointer-events-none" : ""}>
          <CardHeader>
            <Badge variant="secondary" className="mb-2 w-fit">Step 4</Badge>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" /> Configure your server
            </CardTitle>
            <CardDescription>
              Tell the bot which server, role, and category to use. Enable Developer Mode in Discord, then right-click anything → Copy ID.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guildId">Guild (Server) ID *</Label>
                <Input id="guildId" value={guildId} onChange={(e) => setGuildId(e.target.value)} placeholder="123456789012345678" inputMode="numeric" className="font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guildName">Server name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input id="guildName" value={guildName} onChange={(e) => setGuildName(e.target.value)} placeholder="My Community" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staffRoleId">Support Role ID *</Label>
                <Input id="staffRoleId" value={staffRoleId} onChange={(e) => setStaffRoleId(e.target.value)} placeholder="Role allowed to /reply and /close" inputMode="numeric" className="font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Modmail Category ID *</Label>
                <Input id="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder="Category where ticket channels are created" inputMode="numeric" className="font-mono text-xs" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="logChannelId">Log Channel ID <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input id="logChannelId" value={logChannelId} onChange={(e) => setLogChannelId(e.target.value)} placeholder="Channel for ticket transcripts" inputMode="numeric" className="font-mono text-xs" />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="welcome">Welcome message</Label>
              <Textarea id="welcome" value={welcomeMsg} onChange={(e) => setWelcomeMsg(e.target.value)} placeholder="DM'd to user when their ticket opens" rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="close">Close message</Label>
              <Textarea id="close" value={closeMsg} onChange={(e) => setCloseMsg(e.target.value)} placeholder="DM'd to user when their ticket closes" rows={2} />
            </div>
            <div className="space-y-2 max-w-[200px]">
              <Label htmlFor="emoji">Confirmation emoji</Label>
              <Input id="emoji" value={confirmEmoji} onChange={(e) => setConfirmEmoji(e.target.value)} placeholder="✅" className="text-center text-lg" />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSaveGuild} disabled={savingGuild}>
                {savingGuild ? "Saving…" : guild ? "Update configuration" : "Save configuration"}
              </Button>
              {guildConfigured && (
                <Badge variant="outline" className="gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Configured
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pb-8">
          Need help? Check the{" "}
          <a href="https://discord.com/developers/docs/interactions/receiving-and-responding" target="_blank" rel="noreferrer" className="underline hover:text-foreground">
            Discord interactions docs
          </a>.
        </p>
      </main>
    </div>
  );
};

export default Dashboard;
