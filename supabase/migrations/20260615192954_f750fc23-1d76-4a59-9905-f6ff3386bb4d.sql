
-- Restrict reviews SELECT to bot owners; public review page uses service-role edge function
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
CREATE POLICY "Owners can read reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (public.owns_bot(bot_id));
REVOKE SELECT ON public.reviews FROM anon;

-- Lock down SECURITY DEFINER worker-claim function: only service_role should call it
REVOKE EXECUTE ON FUNCTION public.claim_bot_worker(uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_bot_worker(uuid, text, timestamptz) TO service_role;
