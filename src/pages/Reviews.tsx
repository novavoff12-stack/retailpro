import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Star } from "lucide-react";

interface ReviewData {
  bot: { id: string; name: string | null; avatar_url: string | null };
  stats: { count: number; average: number; breakdown: { stars: number; count: number }[] };
  reviews: { stars: number; comment: string | null; created_at: string; user_username: string | null }[];
}

function tierLabel(count: number) {
  if (count >= 100) return "100+ Customers";
  if (count >= 50) return "50+ Customers";
  if (count >= 25) return "25+ Customers";
  if (count >= 10) return "10+ Customers";
  if (count >= 1) return "1+ Customer";
  return "No reviews yet";
}

function Stars({ value, size = 20 }: { value: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <div key={i} className="relative" style={{ width: size, height: size }}>
            <Star className="text-muted-foreground/40 absolute inset-0" size={size} />
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="text-amber-400 fill-amber-400" size={size} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const Reviews = () => {
  const { botId } = useParams();
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!botId) return;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-reviews?bot_id=${botId}`;
    fetch(url, {
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, [botId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading reviews…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-destructive">
        {error ?? "Reviews unavailable"}
      </div>
    );
  }

  const { bot, stats, reviews } = data;
  const avg = stats.average;
  const tier = tierLabel(stats.count);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/40">
      <main className="container max-w-3xl py-12 sm:py-20 space-y-10">
        <header className="text-center space-y-4">
          {bot.avatar_url && (
            <img
              src={bot.avatar_url}
              alt={bot.name ?? "Bot"}
              className="h-20 w-20 rounded-full mx-auto ring-4 ring-background shadow-lg"
            />
          )}
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            {bot.name ?? "Customer"} Reviews
          </h1>
          <p className="text-muted-foreground">Real ratings from real customers.</p>
        </header>

        {/* Hero rating card */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 sm:p-12 shadow-xl">
          <div
            aria-hidden
            className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl"
          />
          <div className="relative grid sm:grid-cols-[auto_1fr] gap-8 items-center">
            <div className="text-center sm:text-left">
              <div className="text-6xl sm:text-7xl font-black tracking-tight tabular-nums">
                {avg.toFixed(1)}
                <span className="text-2xl text-muted-foreground font-medium">/5</span>
              </div>
              <div className="mt-3">
                <Stars value={avg} size={28} />
              </div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 ring-1 ring-amber-400/30">
                <Star className="h-3.5 w-3.5 fill-current" />
                {tier}
              </div>
            </div>

            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((s) => {
                const row = stats.breakdown.find((b) => b.stars === s);
                const c = row?.count ?? 0;
                const pct = stats.count ? (c / stats.count) * 100 : 0;
                return (
                  <div key={s} className="flex items-center gap-3 text-sm">
                    <span className="w-6 text-muted-foreground tabular-nums">{s}★</span>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs text-muted-foreground tabular-nums">
                      {c}
                    </span>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground pt-3">
                Based on {stats.count} review{stats.count === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </section>

        {/* Reviews list */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Latest reviews</h2>
          {reviews.length === 0 ? (
            <p className="text-muted-foreground text-sm">No reviews yet — be the first!</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Stars value={r.stars} size={16} />
                    <time className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </time>
                  </div>
                  {r.comment && (
                    <p className="mt-2 text-sm text-foreground/90">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Reviews;
