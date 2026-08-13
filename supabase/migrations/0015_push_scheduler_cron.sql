-- Invokes the send-reminders Edge Function every 2 minutes via pg_cron +
-- pg_net. project_url and service_role_key are read from Vault secrets
-- (set once via the Supabase dashboard, see Task 10's runbook in
-- docs/superpowers/specs/2026-08-13-web-push-notifications-design.md) —
-- never hardcoded here, so this file is safe to commit.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'send-reminders-every-2-min',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'push_scheduler_function_url') || '/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'push_scheduler_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
