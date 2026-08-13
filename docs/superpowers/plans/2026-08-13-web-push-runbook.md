# Web Push — Steps Only You Can Do

Do these in order, whenever suits — step 1 can happen any time; steps 2+ need the code from this plan merged first.

## 1. Generate the VAPID keypair (5 min)

This is a pair of keys that proves push messages come from this app.

1. On your machine, run: `npx web-push generate-vapid-keys`
2. You'll see a Public Key and a Private Key printed. Keep this terminal open.
3. In the Supabase dashboard → your project → Edge Functions → Secrets, add three secrets:
   - `VAPID_PUBLIC_KEY` = the Public Key from step 2
   - `VAPID_PRIVATE_KEY` = the Private Key from step 2
   - `VAPID_SUBJECT` = `mailto:philip.roche1@gmail.com`
4. Also add the Public Key to the app's build config: in the project's `.env` (or wherever `VITE_SUPABASE_URL` currently lives), add a line `VITE_VAPID_PUBLIC_KEY=<the Public Key>`. (There's a blank `VITE_VAPID_PUBLIC_KEY=` line in `.env.example` showing where it goes.)

## 2. Rebuild and redeploy the app (10 min)

**Don't skip this one — it's the step that's easy to assume is automatic and isn't.** That `VITE_VAPID_PUBLIC_KEY` line gets baked into the app when the app is *built*, not read live when it runs. So until the app is rebuilt and the new build put live, the version on your phone still has no key in it, and every attempt to turn notifications on will fail — the toggle will flick back off with a message saying push isn't set up yet.

1. In the project folder, run: `npm run build`. This regenerates the `dist` folder.
2. Put that new `dist` live the same way you normally deploy this app (Netlify Drop — drag the `dist` folder onto the drop page). If your usual routine differs from that at all, follow your usual routine; the only thing that matters is that the freshly built `dist` from step 1 is what goes live, not an older one.
3. Once it's live, open the app on your phone and do a hard refresh (or close and reopen it) so you're definitely on the new build rather than a cached copy.

Nothing else in this runbook depends on the rebuild until step 6 (the real-shift test), but doing it here means you don't have to remember it later.

## 3. Deploy the Edge Function (10 min)

1. Install the Supabase CLI if you don't have it: `npm install -g supabase`
2. From the project folder, run: `supabase login` (opens a browser to sign in)
3. Run: `supabase link --project-ref <your-project-ref>` (find the project ref in the dashboard URL, `https://supabase.com/dashboard/project/<project-ref>`)
4. Run: `supabase functions deploy send-reminders`
5. Note the URL it prints (`https://<project-ref>.supabase.co/functions/v1/send-reminders`) — you need it for step 4.
6. **Check the deploy actually worked, not just that it printed a URL.** This function pulls in a bit of shared code that lives outside its own folder, and it's possible for the deploy to silently fail to bundle it. Look at the output from step 4 (or re-run as `supabase functions deploy send-reminders --debug` if you want to be extra sure) and check there's no error mentioning a missing file or module. Then do one quick real test — run this in your terminal, swapping in your own function URL and the service_role key from dashboard Settings → API:
   ```bash
   curl -X POST https://<project-ref>.supabase.co/functions/v1/send-reminders -H "Authorization: Bearer <service_role_key>"
   ```
   **What to expect here:** you haven't run the migrations from step 4 yet, so the database table this function needs doesn't exist yet. That means an error mentioning `push_subscriptions` or "relation ... does not exist" is completely EXPECTED at this point — it just means step 4 hasn't happened, nothing is wrong. The only error that actually matters here is one about a missing module, file, or import — that means the deploy didn't bundle correctly, and that's the one to flag back to Claude rather than moving on. Anything else (including `{"ok":true}` if the table happens to already exist) means the deploy itself is fine.

   One more thing: this curl is a *live* call, not a dry run. If you (or anyone) runs it again later, once step 4's migrations are done, it will genuinely try to send a real push notification to any driver mid-break at that moment — so treat it as a real action once the tables exist, not something to re-run casually.

## 4. Set the cron secrets and run the migration (5 min)

1. In the Supabase dashboard → SQL Editor, run:
   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1', 'push_scheduler_function_url');
   select vault.create_secret('<your service_role key, from dashboard Settings > API>', 'push_scheduler_service_role_key');
   ```
   **Important on that first secret:** it must be the base functions URL only — ending in `/functions/v1`, with nothing after it. Do not paste the longer URL you noted in step 3.5 that already ends in `/send-reminders`. The scheduled job glues `/send-reminders` onto the end of whatever you save here itself, so if you save the longer URL you'll end up with `.../send-reminders/send-reminders`, which doesn't exist, and every single scheduled reminder run will fail with a 404 — quietly, in the background, so you'd have no reason to notice until a driver mentions they never got a reminder. Copy exactly `https://<project-ref>.supabase.co/functions/v1` and stop there.
2. Then run migrations `0013`, `0014`, `0015` in order (paste each file's contents into the SQL Editor and run — same as every migration so far).

## 5. Set up the UptimeRobot health check (10 min)

1. New UptimeRobot monitor, type "HTTP(s)".
2. URL: `https://<project-ref>.supabase.co/functions/v1/send-reminders?status=1`
3. Add header `Authorization: Bearer <anon key, from dashboard Settings > API>`.
4. Check interval: 15 minutes. Alert if the response doesn't contain `"lastRunAgoSeconds"` with a value under 600 (10 min) — UptimeRobot's "Keyword" monitor type with an assertion on the JSON is the simplest way to do this; if that's fiddly in the UI, a plain "up/down" HTTP check that just confirms the endpoint responds 200 is an acceptable first cut, you can tighten it later.
5. **Don't just trust that it's set up — watch it actually work once.** A monitor you've never seen catch a real problem hasn't really been proven. Once everything above is live, open this exact URL yourself in a browser (the `?status=1` on the end is what makes it return health info instead of actually sending reminders):
   ```
   https://<project-ref>.supabase.co/functions/v1/send-reminders?status=1
   ```
   (or `curl` it with the same `Authorization: Bearer <anon key>` header from step 3 above — do NOT reuse the plain curl from step 3, that one doesn't have `?status=1` and won't return `lastRunAgoSeconds`). Check the `lastRunAgoSeconds` number in the response — it should be well under 120 seconds, since the background job behind this runs every 2 minutes. If it's low like that, the whole chain (cron → function → health number) is genuinely working end to end, not just switched on and hoped for.
6. **Optional but worth doing: prove the alert actually fires, not just that the green check passes.** A monitor that's never seen a real failure hasn't really been tested — feel free to skip this if steps 1-5 already feel like enough, but it only takes a few minutes:
   - In the SQL Editor, run `select cron.unschedule('send-reminders-every-2-min');` — this pauses the background job that keeps the health number fresh, without touching anything else.
   - Wait about 15-20 minutes (past the 10-minute alert threshold you set above).
   - Confirm you actually get an UptimeRobot alert (email or app notification, whichever you set up).
   - Turn it back on by re-running migration `0015`'s SQL again in the SQL Editor — that recreates the same scheduled job.
   Seeing a real alert land is the only way to know the alarm actually works, not just that it's switched on.

## 6. Confirm on a real shift (whenever your next break is)

This one only works if step 2's rebuild-and-redeploy actually happened — you're testing the live app on your phone, so it has to be the build that has the VAPID key in it. Turn on notifications in Settings, lock your phone, wait for your actual break-end reminder time. This is the only step that proves push delivery genuinely works — everything before it can be verified in code review, this can't.

One thing worth knowing: if your own test shift happens to run past midnight (an overnight shift), that's actually the trickier case for this feature to get right, and it has been covered — but only by automated tests, not by an actual person watching a real overnight shift happen. If your test shift is a normal daytime one, that's completely fine for confirming the feature works, it just means the overnight case is still resting on the code being tested well rather than someone having watched it happen for real. Worth keeping an eye on the first time someone works an actual overnight shift with notifications on.
