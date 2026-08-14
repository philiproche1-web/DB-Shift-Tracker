-- Security Advisor found two issues on the trigger functions:
--
-- 1. set_updated_at_to_now() had no search_path pinned, leaving it
--    vulnerable to search-path hijacking (a malicious object earlier in
--    the resolution path could shadow what the function calls).
--
-- 2. force_user_id_to_auth_uid(), handle_new_user() and
--    record_audit_entry() are `security definer` and, like every Postgres
--    function, were created with EXECUTE granted to PUBLIC by default.
--    That makes them directly callable by anon/authenticated over
--    PostgREST (e.g. POST /rest/v1/rpc/handle_new_user), even though
--    they're only meant to run as triggers. Revoking EXECUTE closes that
--    path; trigger firing is unaffected since it doesn't check EXECUTE
--    on the invoking role.
alter function public.set_updated_at_to_now() set search_path = public;

revoke execute on function public.force_user_id_to_auth_uid() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.record_audit_entry() from public, anon, authenticated;
