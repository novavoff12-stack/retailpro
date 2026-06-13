
ALTER TABLE public.guilds ADD COLUMN IF NOT EXISTS auto_review_request boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  guild_id text NOT NULL,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  user_discord_id text NOT NULL,
  stars smallint NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, user_discord_id)
);

CREATE INDEX IF NOT EXISTS reviews_bot_id_idx ON public.reviews(bot_id);
CREATE INDEX IF NOT EXISTS reviews_guild_id_idx ON public.reviews(guild_id);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
ON public.reviews FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Owners can delete reviews"
ON public.reviews FOR DELETE
TO authenticated
USING (public.owns_bot(bot_id));
