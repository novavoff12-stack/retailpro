
-- Restrict admin role from blanket reading bot tokens
DROP POLICY IF EXISTS "Owners view own bot" ON public.bots;
CREATE POLICY "Owners view own bot" ON public.bots FOR SELECT
  USING (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Owners delete own bot" ON public.bots;
CREATE POLICY "Owners delete own bot" ON public.bots FOR DELETE
  USING (auth.uid() = owner_user_id);

-- Prevent admins from escalating roles; only service_role (bypasses RLS) can manage user_roles
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

-- Revoke EXECUTE on SECURITY DEFINER helpers from public roles.
-- These functions are only invoked from RLS policies (run as policy evaluator)
-- or from edge functions using service_role.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_bot(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_bot_worker(uuid, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
