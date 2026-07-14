-- Allow up to 3 bots per user.
ALTER TABLE public.bots DROP CONSTRAINT IF EXISTS bots_owner_user_id_key;
CREATE INDEX IF NOT EXISTS idx_bots_owner_user_id ON public.bots (owner_user_id);
-- Prevent duplicate bots for the same Discord application per owner.
CREATE UNIQUE INDEX IF NOT EXISTS bots_owner_application_key
  ON public.bots (owner_user_id, application_id);

-- Enforce max 3 bots per owner at the DB level.
CREATE OR REPLACE FUNCTION public.enforce_bot_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.bots WHERE owner_user_id = NEW.owner_user_id) >= 3 THEN
    RAISE EXCEPTION 'You can have at most 3 bots per account.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_bot_limit_trg ON public.bots;
CREATE TRIGGER enforce_bot_limit_trg
BEFORE INSERT ON public.bots
FOR EACH ROW EXECUTE FUNCTION public.enforce_bot_limit();