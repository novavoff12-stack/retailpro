
ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS last_error_at timestamptz,
  ADD COLUMN IF NOT EXISTS boot_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS boot_notified_signature text;
