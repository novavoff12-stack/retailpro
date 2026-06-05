ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS worker_lease_id text,
  ADD COLUMN IF NOT EXISTS worker_lease_until timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_bots_worker_lease_until
ON public.bots(worker_lease_until);

CREATE TABLE public.modmail_pending_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  guild_id text NOT NULL,
  user_discord_id text NOT NULL,
  prompt_id text NOT NULL CHECK (char_length(prompt_id) >= 12),
  content text NOT NULL DEFAULT '',
  attachment_urls text[] NOT NULL DEFAULT '{}',
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (bot_id, user_discord_id),
  UNIQUE (bot_id, user_discord_id, prompt_id)
);

GRANT ALL ON public.modmail_pending_prompts TO service_role;

ALTER TABLE public.modmail_pending_prompts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_modmail_pending_prompts_expiry
ON public.modmail_pending_prompts(expires_at);

CREATE OR REPLACE FUNCTION public.claim_bot_worker(
  _bot_id uuid,
  _worker_lease_id text,
  _lease_until timestamp with time zone
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _claimed boolean;
BEGIN
  UPDATE public.bots
  SET
    worker_lease_id = _worker_lease_id,
    worker_lease_until = _lease_until,
    updated_at = now()
  WHERE id = _bot_id
    AND bot_running = true
    AND (
      worker_lease_id IS NULL
      OR worker_lease_id = _worker_lease_id
      OR worker_lease_until IS NULL
      OR worker_lease_until < now()
    )
  RETURNING true INTO _claimed;

  RETURN COALESCE(_claimed, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_bot_worker(uuid, text, timestamp with time zone) TO service_role;