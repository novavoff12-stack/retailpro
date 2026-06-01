ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS ai_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_escalated boolean NOT NULL DEFAULT false;