import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import logo from "@/assets/retailpro-logo.jpg";

const ModmailLanding = () => {
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Modmail by RetailPro — Discord support, done right";
    const desc =
      "A modern modmail platform for Discord. Turn member DMs into private staff threads, manage tickets with slash commands, and ship support faster.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafaf9] text-neutral-900 antialiased">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-[#fafaf9]/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="RetailPro" className="h-7 w-7 rounded-md object-contain" />
            <span className="font-semibold text-[15px] tracking-tight">Modmail</span>
            <span className="hidden sm:inline text-xs text-neutral-400 ml-1">by RetailPro</span>
          </Link>
          <nav className="hidden md:flex items-center gap-9 text-sm text-neutral-600">
            <a href="#features" className="hover:text-neutral-900 transition-colors">Features</a>
            <a href="#how" className="hover:text-neutral-900 transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-neutral-900 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-neutral-900 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-md h-9 px-4">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Link to="/login" className="hidden sm:inline text-sm text-neutral-700 hover:text-neutral-900">Log in</Link>
                <Button asChild size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-md h-9 px-4">
                  <Link to="/login">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-10 md:pt-28 md:pb-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600 mb-7">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Early access — free during beta
          </div>
          <h1 className="text-[44px] md:text-[68px] leading-[1.02] font-semibold tracking-[-0.035em] text-neutral-900">
            Discord support
            <br />
            that doesn't get lost.
          </h1>
          <p className="mt-6 text-lg text-neutral-600 max-w-xl leading-relaxed">
            Modmail turns member DMs into clean, private staff threads — so your team can triage,
            collaborate, and close tickets without ever leaving Discord.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-md h-11 px-5 text-[15px]">
              <Link to="/login">Get started</Link>
            </Button>
            <a
              href="#how"
              className="inline-flex items-center gap-1.5 text-[15px] text-neutral-700 hover:text-neutral-900 px-2"
            >
              See how it works <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-5 text-xs text-neutral-500">No credit card required · Bring your own bot · Live in 5 minutes</p>
        </div>

        {/* Product mockup */}
        <div className="relative mt-16 md:mt-24">
          <div className="absolute -inset-x-8 -inset-y-4 bg-gradient-to-b from-transparent via-neutral-100/60 to-transparent rounded-[2rem] -z-10" />
          <div className="rounded-xl border border-neutral-200 bg-neutral-950 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
              <span className="ml-3 text-[11px] text-neutral-500 font-mono">modmail.retailpro.space/dashboard</span>
            </div>
            <div className="grid grid-cols-12 min-h-[420px] text-neutral-200">
              <aside className="col-span-3 border-r border-white/5 p-4 space-y-1 text-xs">
                <div className="text-neutral-500 uppercase tracking-wider text-[10px] mb-2 px-2">Tickets</div>
                {[
                  { name: "@aria", msg: "Order #4821 didn't arrive", unread: true },
                  { name: "@kenji", msg: "Refund request", unread: false },
                  { name: "@lior", msg: "Membership perks?", unread: false },
                  { name: "@sam", msg: "Bug on checkout", unread: true },
                ].map((t, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-md px-2 py-2 ${i === 0 ? "bg-white/5" : "hover:bg-white/[0.03]"}`}
                  >
                    <span className={`mt-1 h-1.5 w-1.5 rounded-full ${t.unread ? "bg-emerald-400" : "bg-neutral-600"}`} />
                    <div className="min-w-0">
                      <div className="text-neutral-200 truncate">{t.name}</div>
                      <div className="text-neutral-500 truncate text-[11px]">{t.msg}</div>
                    </div>
                  </div>
                ))}
              </aside>
              <main className="col-span-9 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <div className="text-sm font-medium">Order #4821 didn't arrive</div>
                    <div className="text-[11px] text-neutral-500 font-mono">ticket-0421 · claimed by @maya</div>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-neutral-400">snooze</span>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-neutral-400">close</span>
                  </div>
                </div>
                <div className="space-y-3 text-[13px]">
                  <div className="flex gap-3">
                    <div className="h-7 w-7 rounded-full bg-neutral-700 flex-shrink-0" />
                    <div>
                      <div className="text-neutral-400 text-[11px]">aria · 12:04</div>
                      <div className="text-neutral-200">Hey, my order from last week still hasn't shown up.</div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-7 w-7 rounded-full bg-emerald-500/80 flex-shrink-0" />
                    <div>
                      <div className="text-neutral-400 text-[11px]">maya (staff) · 12:06</div>
                      <div className="text-neutral-200">On it — pulling up your order now.</div>
                    </div>
                  </div>
                  <div className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-[12px] text-emerald-200/80">
                    AI draft suggestion · "Hi Aria, I can see your order shipped Tuesday but is delayed at customs. I've contacted the carrier and will update you within 24h."
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </section>

      {/* Logos / trust strip */}
      <section className="border-y border-neutral-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-wrap items-center justify-between gap-6 text-xs uppercase tracking-[0.15em] text-neutral-400">
          <span>Trusted by community teams</span>
          <div className="flex flex-wrap gap-x-10 gap-y-2 text-neutral-500 font-medium">
            <span>RetailPro</span>
            <span>NorthMart</span>
            <span>Stratus</span>
            <span>Volt Studios</span>
            <span>Greybox</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="max-w-2xl mb-16">
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-4">Features</div>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.05]">
            Built for teams who care about response time.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-x-12 gap-y-14">
          {[
            {
              title: "Threaded tickets",
              body: "Every DM becomes a private staff channel. Reply, claim, and resolve without losing the thread.",
            },
            {
              title: "Role-based access",
              body: "Bind Discord roles to staff permissions. The right people see the right tickets — no more, no less.",
            },
            {
              title: "Slash commands",
              body: "Open, claim, snooze, and close tickets with low-latency interactions handled at the edge.",
            },
            {
              title: "Multi-guild ready",
              body: "Run a single bot across every server you operate. Each guild keeps its own config and staff roles.",
            },
            {
              title: "Bring your own bot",
              body: "Use your Discord application. Your branding, your bot — our infrastructure does the heavy lifting.",
            },
            {
              title: "Reviews & transcripts",
              body: "Capture 1–5★ customer feedback at ticket close, and ship full transcripts to a shareable URL.",
            },
          ].map((f) => (
            <div key={f.title}>
              <div className="h-px w-10 bg-neutral-900 mb-5" />
              <h3 className="text-lg font-semibold mb-2 tracking-tight">{f.title}</h3>
              <p className="text-[15px] text-neutral-600 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-neutral-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32 grid md:grid-cols-12 gap-12">
          <div className="md:col-span-5">
            <div className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-4">How it works</div>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.05] mb-6">
              Live in under five minutes.
            </h2>
            <p className="text-neutral-600 text-[15px] leading-relaxed max-w-md">
              No servers to provision, no webhooks to wire by hand. Connect your bot, paste an
              endpoint, and you're handling real tickets.
            </p>
          </div>
          <ol className="md:col-span-7 space-y-6">
            {[
              { t: "Sign in with Discord", d: "We use Discord OAuth — no passwords, no extra accounts." },
              { t: "Add your bot credentials", d: "Paste your application's public key and bot token in the dashboard." },
              { t: "Set your interactions endpoint", d: "Copy the URL into Discord's developer portal. Done." },
              { t: "Invite & start handling tickets", d: "Member DMs immediately become private staff threads." },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-5 border-t border-neutral-200 pt-6 first:border-0 first:pt-0">
                <span className="font-mono text-sm text-neutral-400 mt-0.5">0{i + 1}</span>
                <div>
                  <div className="font-semibold text-[16px] mb-1">{s.t}</div>
                  <div className="text-neutral-600 text-[14px]">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="max-w-2xl mb-14">
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-4">Pricing</div>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.05]">
            Free while we're in beta.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-8">
            <div className="text-sm font-medium text-neutral-500 mb-2">Beta</div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-5xl font-semibold tracking-tight">£0</span>
              <span className="text-neutral-500">/month</span>
            </div>
            <p className="text-sm text-neutral-500 mb-6">Everything included while in early access.</p>
            <Button asChild className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-md h-10">
              <Link to="/login">Start free</Link>
            </Button>
            <ul className="mt-7 space-y-3 text-sm text-neutral-700">
              {["Unlimited tickets", "Unlimited staff seats", "Bring your own bot", "Transcripts & reviews", "Community support"].map(
                (f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-neutral-900" /> {f}
                  </li>
                ),
              )}
            </ul>
          </div>
          <div className="rounded-xl border border-neutral-900 bg-neutral-950 text-neutral-100 p-8 relative overflow-hidden">
            <div className="text-sm font-medium text-neutral-400 mb-2">Team (coming soon)</div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-5xl font-semibold tracking-tight">£9</span>
              <span className="text-neutral-400">/month</span>
            </div>
            <p className="text-sm text-neutral-400 mb-6">For growing communities that need more.</p>
            <Button disabled className="w-full bg-neutral-100 text-neutral-900 hover:bg-neutral-100 rounded-md h-10 opacity-80">
              Notify me
            </Button>
            <ul className="mt-7 space-y-3 text-sm text-neutral-300">
              {["Everything in Beta", "Priority queue & SLA", "AI reply suggestions", "Custom review page domain", "Email support"].map(
                (f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-neutral-100" /> {f}
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-neutral-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 grid md:grid-cols-12 gap-12">
          <div className="md:col-span-4">
            <div className="text-xs uppercase tracking-[0.18em] text-neutral-500 mb-4">FAQ</div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] leading-tight">
              Questions, answered.
            </h2>
          </div>
          <div className="md:col-span-8 divide-y divide-neutral-200">
            {[
              {
                q: "Do I need to host the bot myself?",
                a: "No. You bring the Discord application (the bot identity), we run the infrastructure that handles every interaction.",
              },
              {
                q: "Is my data safe?",
                a: "All tokens are encrypted at rest, never logged, and only your authenticated staff can access tickets through row-level security.",
              },
              {
                q: "Can I use it across multiple servers?",
                a: "Yes — one bot, many guilds. Each guild gets its own configuration and staff roles.",
              },
              {
                q: "What happens after the beta?",
                a: "Existing beta users keep their free tier. Paid plans only unlock additional capacity and premium features.",
              },
            ].map((f) => (
              <div key={f.q} className="py-5">
                <div className="font-semibold text-[16px] mb-1.5">{f.q}</div>
                <div className="text-neutral-600 text-[15px] leading-relaxed">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="rounded-2xl bg-neutral-950 text-neutral-100 px-8 md:px-16 py-16 md:py-24 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="relative max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.05] mb-5">
              Ready to give your members a better support experience?
            </h2>
            <p className="text-neutral-400 text-[15px] mb-8 max-w-lg">
              Spin up your modmail in five minutes. No credit card, no commitment.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-white hover:bg-neutral-200 text-neutral-900 rounded-md h-11 px-5 text-[15px]">
                <Link to="/login">Get started free</Link>
              </Button>
              <Button asChild variant="ghost" className="text-neutral-200 hover:text-white hover:bg-white/10 rounded-md h-11 px-5 text-[15px]">
                <a href="#features">Explore features</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200/70">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="RetailPro" className="h-6 w-6 rounded object-contain" />
            <span className="font-semibold text-sm">Modmail</span>
            <span className="text-neutral-400 text-sm">— a RetailPro product</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-neutral-500">
            <Link to="/terms" className="hover:text-neutral-900">Terms</Link>
            <Link to="/privacy" className="hover:text-neutral-900">Privacy</Link>
            <a href="https://retailpro.space" className="hover:text-neutral-900">RetailPro</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ModmailLanding;
