REVOKE ALL ON FUNCTION public.claim_bot_worker(uuid, text, timestamp with time zone) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_bot_worker(uuid, text, timestamp with time zone) FROM anon;
REVOKE ALL ON FUNCTION public.claim_bot_worker(uuid, text, timestamp with time zone) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_bot_worker(uuid, text, timestamp with time zone) TO service_role;