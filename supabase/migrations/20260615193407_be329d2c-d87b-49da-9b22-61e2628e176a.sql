
ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS review_slug text;
CREATE UNIQUE INDEX IF NOT EXISTS bots_review_slug_key
  ON public.bots (lower(review_slug)) WHERE review_slug IS NOT NULL;
ALTER TABLE public.bots DROP CONSTRAINT IF EXISTS bots_review_slug_format;
ALTER TABLE public.bots ADD CONSTRAINT bots_review_slug_format
  CHECK (review_slug IS NULL OR review_slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$');
