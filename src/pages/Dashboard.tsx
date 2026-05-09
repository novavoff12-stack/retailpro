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
  Link as LinkIcon,
} from "lucide-react";

interface Bot {
  id: string;
  application_id: string;
  public_key: string;
  bot_token: string;
  bot_name: string | null;
  status: string;
}

const STEPS = [
  { id: 1, title: "Create Discord App", desc: "Register your application on Discord" },
  { id: 2, title: "Add Credentials", desc: "Paste your IDs and tokens" },
  { id: 3, title: "Connect Endpoint", desc: "Wire up interactions & invite the bot" },
];

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [bot, setBot] = useState<Bot | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  // form
  const [appId, setAppId] = useState("");
  const [pubKey, setPubKey] = useState("");
  const [token, setToken] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("bots")
      .select("*")
      .eq("owner_user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBot(data as Bot);
          setAppId(data.application_id);
          setPubKey(data.public_key);
          setToken(data.bot_token);
          setName(data.bot_name ?? "");
        }
        setFetching(false);
      });
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
    const payload = {
      owner_user_id: user.id,
      application_id: appId.trim(),
      public_key: pubKey.trim(),
      bot_token: token.trim(),
      bot_name: name.trim() || null,
      status: "active",
    };
    const { data, error } = await supabase
      .from("bots")
      .upsert(payload, { onConflict: "owner_user_id" })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBot(data as Bot);
    toast.success(bot ? "Bot updated" : "Bot created — let's connect it");
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
    [bot]
  );

  const currentStep = !bot ? 2 : credsValid ? 3 : 2;

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
        {/* Hero / progress */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-accent">
              {credsValid ? "Almost there" : "Let's get you set up"}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {credsValid ? "Your bot is ready to connect" : "Set up your Modmail bot"}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Follow the three steps below. It takes about 2 minutes — you'll need a Discord
            application from the developer portal.
          </p>

          {/* Step indicator */}
          <div className="mt-8 grid sm:grid-cols-3 gap-3">
            {STEPS.map((s) => {
              const done = s.id < currentStep;
              const active = s.id === currentStep;
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
                      <Circle
                        className={`h-5 w-5 ${active ? "text-accent" : "text-muted-foreground"}`}
                      />
                    )}
                    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      Step {s.id}
                    </span>
                  </div>
                  <div className="font-semibold">{s.title}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{s.desc}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Step 1 — Create app */}
        <Card className="overflow-hidden">
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
                <a
                  href="https://discord.com/developers/applications"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Developer Portal <ExternalLink className="ml-2 h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Click <span className="text-foreground font-medium">New Application</span> and give it a name.</li>
              <li>Open the <span className="text-foreground font-medium">Bot</span> tab → <span className="text-foreground font-medium">Reset Token</span> and copy it.</li>
              <li>On the <span className="text-foreground font-medium">General Information</span> tab, copy the <span className="text-foreground font-medium">Application ID</span> and <span className="text-foreground font-medium">Public Key</span>.</li>
            </ol>
          </CardContent>
        </Card>

        {/* Step 2 — Credentials */}
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="mb-2 w-fit">Step 2</Badge>
            <CardTitle>Add your credentials</CardTitle>
            <CardDescription>
              These are stored encrypted and only used to talk to Discord on your behalf.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Bot name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Modmail Bot"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appId">Application ID</Label>
                <Input
                  id="appId"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="123456789012345678"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pubKey">Public Key</Label>
              <Input
                id="pubKey"
                value={pubKey}
                onChange={(e) => setPubKey(e.target.value)}
                placeholder="64-character hex string"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Bot Token</Label>
              <div className="relative">
                <Input
                  id="token"
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="MTI..."
                  className="font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showToken ? "Hide token" : "Show token"}
                >
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
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {bot.status}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 3 — Connect */}
        <Card className={!bot ? "opacity-60 pointer-events-none" : ""}>
          <CardHeader>
            <Badge variant="secondary" className="mb-2 w-fit">Step 3</Badge>
            <CardTitle>Connect & invite</CardTitle>
            <CardDescription>
              Paste the URL into Discord, then invite the bot to your server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5" /> Interactions Endpoint URL
                </Label>
                <span className="text-xs text-muted-foreground">
                  Developer Portal → General Information
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-secondary p-3 rounded-md break-all font-mono">
                  {interactionsUrl || "Save your bot to generate this URL"}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copy(interactionsUrl, "url")}
                  disabled={!interactionsUrl}
                >
                  {copiedKey === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <Label>Invite link</Label>
                <span className="text-xs text-muted-foreground">
                  Includes the permissions Modmail needs
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-secondary p-3 rounded-md break-all font-mono">
                  {inviteUrl || "—"}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copy(inviteUrl, "invite")}
                  disabled={!inviteUrl}
                >
                  {copiedKey === "invite" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                asChild
                className="mt-3 w-full sm:w-auto"
                disabled={!inviteUrl}
              >
                <a href={inviteUrl || "#"} target="_blank" rel="noreferrer">
                  Invite bot to server <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pb-8">
          Need help? Check the{" "}
          <a
            href="https://discord.com/developers/docs/interactions/receiving-and-responding"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            Discord interactions docs
          </a>
          .
        </p>
      </main>
    </div>
  );
};

export default Dashboard;
