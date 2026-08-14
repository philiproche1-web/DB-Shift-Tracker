// supabase/functions/send-reminders/index.ts
//
// Runs on a pg_cron schedule (see supabase/migrations/0015_push_scheduler_cron.sql).
// For every driver with at least one push subscription: figures out if
// they're due the shift-not-logged nudge (19:00 UTC, nothing logged for
// today) or the break-end reminder (N minutes before today's shift's
// break ends, N = their own breakReminderMinutes setting), sends via
// web-push, dedupes against push_notification_log, and removes dead
// subscriptions (410/404 from the push service) as it goes. Stamps
// push_scheduler_runs on every pass that completes — including passes where
// zero reminders were due — so a stale heartbeat is externally detectable.
// A pass that throws before finishing deliberately leaves no stamp: that is
// exactly the "scheduler is broken" case the health check exists to catch.
//
// fixedRestPattern note: roster-data.json carries a top-level
// `fixedRestPattern` field (sibling to `duties`) that Phil can edit
// independently of any code deploy — the client already picks this up
// live via applyRosterData() in src/lib/roster.js. dayInfo() defaults to
// its own baked-in FIXED_REST_PATTERN when no 4th argument is passed, so
// we must fetch and thread this field through explicitly or the server's
// rest-day calculation could silently diverge from the client's.
// See docs/superpowers/specs/2026-08-13-web-push-notifications-design.md.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { today, addDays, periodForDate, dayInfo, shiftBreakEnd } from "../../../src/lib/pushDuty.js";

const ROSTER_REMOTE_URL = "https://raw.githubusercontent.com/philiproche1-web/DB-Shift-Tracker/main/public/roster-data.json";
const SHIFT_NOT_LOGGED_HOUR_UTC = 19;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

// roster-data.json is ~191KB and changes rarely, but this function runs on a
// 1-5 minute cron — re-fetching it every invocation is a lot of unauthenticated
// bandwidth against raw.githubusercontent.com and a plausible source of
// intermittent failures. A Deno Edge Function instance can stay warm between
// invocations, so module-level state is a usefully long-lived cache.
const ROSTER_CACHE_TTL_MS = 10 * 60 * 1000;
const ROSTER_FETCH_TIMEOUT_MS = 15000;
let cachedRoster: { duties: any[]; fixedRestPattern: any[] } | null = null;
let cachedAt = 0;

async function fetchRosterData(): Promise<{ duties: any[]; fixedRestPattern: any[] }> {
  if (cachedRoster && Date.now() - cachedAt < ROSTER_CACHE_TTL_MS) return cachedRoster;

  const res = await fetch(ROSTER_REMOTE_URL, {
    signal: AbortSignal.timeout(ROSTER_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error("Invalid roster data: HTTP " + res.status);

  let json: any;
  try {
    json = await res.json();
  } catch (e: any) {
    throw new Error("Invalid roster data: body was not JSON (" + e?.message + ")");
  }
  if (!Array.isArray(json?.duties) || !Array.isArray(json?.fixedRestPattern)) {
    throw new Error("Invalid roster data: missing or non-array duties/fixedRestPattern");
  }

  cachedRoster = { duties: json.duties, fixedRestPattern: json.fixedRestPattern };
  cachedAt = Date.now();
  return cachedRoster;
}

async function sendToDriver(userId: string, title: string, body: string): Promise<void> {
  const { data: subs, error } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId);
  if (error) {
    console.error(`[send-reminders] failed to load subscriptions for ${userId}:`, error);
    return;
  }
  for (const sub of subs || []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
        JSON.stringify({ title, body })
      );
    } catch (e: any) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      } else {
        console.error(`[send-reminders] push send failed for ${userId} (sub ${sub.id}):`, e?.message || e);
      }
    }
  }
}

// Claims the dedup slot BEFORE sending rather than checking-then-marking after,
// so two overlapping invocations (a slow pass overlapping the next cron tick)
// can't both pass the check and both send. Returns true only if this caller won
// the claim and should proceed to send. A unique-violation (23505) on
// push_notification_log's (user_id, shift_date, reminder_type) constraint means
// another invocation already claimed it — skip, not an error. Any other error
// also skips: fail safe, never send what we can't dedupe.
async function tryClaimReminder(userId: string, shiftDate: string, reminderType: string): Promise<boolean> {
  const { error } = await supabase
    .from("push_notification_log")
    .insert({ user_id: userId, shift_date: shiftDate, reminder_type: reminderType });
  if (!error) return true;
  if (error.code === "23505") return false;
  console.error(`[send-reminders] dedup claim failed for ${userId} / ${reminderType} / ${shiftDate}:`, error);
  return false;
}

// How far past break-end the reminder window stays open. fireAt is
// breakEnd - leadMins, so without this the window is exactly leadMins wide —
// a driver whose breakReminderMinutes is below the cron interval (1-4 min is
// a valid setting, cron runs every 1-5 min) could have their entire window
// fall between two ticks and silently never be reminded. Widening the upper
// end is safe because tryClaimReminder guarantees at-most-once delivery
// regardless of window width; 30 minutes is a sanity cap so a scheduler
// outage doesn't produce a reminder hours after the break actually ended.
const BREAK_END_WINDOW_GRACE_MS = 30 * 60000;

async function runScheduler() {
  const { duties, fixedRestPattern } = await fetchRosterData();
  const now = new Date();
  const todayDate = today();
  // Overnight duties are dated by the day they START but their break can end
  // after midnight (roster convention: `be` up to "27:24"). By the time that
  // instant arrives, today() has already rolled to the next date, so looking
  // only at "today's" shift would never evaluate them — the ~10 overnight
  // duties in the roster could structurally never fire a break-end reminder.
  const yesterdayDate = addDays(todayDate, -1);
  const hourUtc = now.getUTCHours();

  const { data: driverIds, error: driverIdsError } = await supabase.from("push_subscriptions").select("user_id");
  // Must not be swallowed: a failed query yields null, which would look
  // exactly like "zero drivers, nothing to do" — and (before the heartbeat
  // moved out of a finally block) still reported green to UptimeRobot.
  if (driverIdsError) {
    console.error("[send-reminders] failed to load driver subscription list:", driverIdsError);
    throw new Error("Could not load driver subscription list: " + driverIdsError.message);
  }
  const uniqueDrivers = [...new Set((driverIds || []).map((r: { user_id: string }) => r.user_id))];

  for (const userId of uniqueDrivers) {
    // Per-driver isolation: one driver's malformed app_data (e.g. periods
    // explicitly null, so the `= []` default doesn't apply) must not abort
    // the pass for every driver after them.
    try {
      const [
        { data: appDataRow, error: appDataError },
        { data: settingsRow, error: settingsError },
        { data: profileRow, error: profileError },
      ] = await Promise.all([
        supabase.from("app_data").select("data").eq("user_id", userId).maybeSingle(),
        supabase.from("settings").select("data").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      ]);
      // A failed read comes back as { data: null, error }, not a throw — without
      // checking error here it's indistinguishable from "this driver genuinely
      // has no data yet" and gets silently skipped by the check below. Throwing
      // surfaces it to the catch at the bottom of this loop, which logs it with
      // the user id while still isolating the failure to this one driver.
      if (appDataError) throw new Error(`app_data query failed: ${appDataError.message}`);
      if (settingsError) throw new Error(`settings query failed: ${settingsError.message}`);
      // profileRow only feeds restConfig below, and every field there is read
      // through `?.` with a falsy/empty default — a missing or errored profile
      // row already degrades to "no custom rest-day override", which is the
      // same, intentionally-supported default as a driver who never set one up.
      // So this is logged for visibility but not thrown: it doesn't block
      // reminders for this driver, it just means rest-day info falls back to
      // the roster's own FIXED_REST_PATTERN default, same as no profile row.
      if (profileError) {
        console.error(`[send-reminders] profile lookup failed for ${userId}, continuing with default rest config:`, profileError);
      }
      if (!appDataRow?.data || !settingsRow?.data) continue;
      const settings = settingsRow.data;
      if (settings.notificationsEnabled === false) continue;

      const { periods = [], activePeriodId = null } = appDataRow.data;
      const restConfig = {
        enabled: !!profileRow?.custom_rest_days_enabled,
        weekdays: new Set(profileRow?.custom_rest_weekdays || []),
        since: profileRow?.custom_rest_days_since || null,
      };

      const period = periodForDate(periods, todayDate, activePeriodId);
      const info = period ? dayInfo(period, todayDate, restConfig, fixedRestPattern) : null;

      // Shift-not-logged nudge — once, at SHIFT_NOT_LOGGED_HOUR_UTC, only if
      // still unlogged (not a shift, not a real or auto rest day).
      if (info && hourUtc >= SHIFT_NOT_LOGGED_HOUR_UTC && info.status === "unlogged") {
        if (await tryClaimReminder(userId, todayDate, "shift_not_logged")) {
          await sendToDriver(userId, "Log today's shift", "Nothing logged yet for today in Shift Tracker.");
        }
      }

      // Break-end reminder — fires in the lead-time window before the shift's
      // break ends. `claimDate` is the SHIFT's own date, not necessarily
      // today's, because push_notification_log's unique constraint is
      // (user_id, shift_date, reminder_type) and an overnight shift must
      // dedupe against the date it was logged under.
      const maybeSendBreakEnd = async (shift: any, claimDate: string) => {
        if (!shift) return;
        const breakEnd = shiftBreakEnd(shift, duties);
        if (!breakEnd) return;
        const leadMins = settings.breakReminderMinutes || 10;
        const fireAt = new Date(breakEnd.getTime() - leadMins * 60000);
        if (now < fireAt || now >= new Date(breakEnd.getTime() + BREAK_END_WINDOW_GRACE_MS)) return;
        if (await tryClaimReminder(userId, claimDate, "break_end")) {
          await sendToDriver(userId, "Break ending soon", `Your break ends in about ${leadMins} minutes.`);
        }
      };

      if (settings.breakReminderEnabled !== false) {
        if (info?.status === "shift") {
          await maybeSendBreakEnd(info.shift, todayDate);
        }
        // Yesterday's shift, for the overnight case. The window check above
        // rejects ordinary daytime shifts from yesterday on its own — their
        // break-end is many hours past the 30-minute grace cap — so this only
        // ever fires for a break that genuinely rolls past midnight. Uses the
        // raw shift rather than dayInfo(): we only care whether a shift exists
        // and when its break ends, not its logged/rest-day status.
        const yPeriod = periodForDate(periods, yesterdayDate, activePeriodId);
        const yShift = yPeriod ? (yPeriod.shifts || []).find((s: any) => s.date === yesterdayDate) : null;
        if (yShift) {
          await maybeSendBreakEnd(yShift, yesterdayDate);
        }
      }
    } catch (e: any) {
      console.error(`[send-reminders] skipping driver ${userId} after error:`, e?.message || e);
    }
  }

  // Heartbeat, stamped only once the pass has actually completed. Per-driver
  // failures are caught inside the loop and still count as a completed pass;
  // a top-level throw (roster fetch, driver-list query) skips this entirely
  // so UptimeRobot's staleness check can see a genuinely broken scheduler —
  // which is the whole reason push_scheduler_runs exists (see migration 0014).
  const { error: heartbeatError } = await supabase
    .from("push_scheduler_runs")
    .insert({ ran_at: new Date().toISOString() });
  if (heartbeatError) {
    console.error("[send-reminders] heartbeat insert failed:", heartbeatError);
  }
}

// Deployed with --no-verify-jwt (see runbook) so this endpoint can be polled
// by a free-tier uptime monitor that can't send a custom Authorization
// header. That removes Supabase's platform-level gate for BOTH paths below,
// so the real trigger path (no ?status=1) must check auth itself — it
// compares the caller's Authorization header against this function's own
// service_role key, which only pg_cron's scheduled invocation (see migration
// 0015) actually has. The ?status=1 health-check path is deliberately left
// open to anyone: it only ever returns a timestamp/boolean, nothing
// driver-identifying or actionable, so requiring auth there would just be
// friction for no security benefit — and is exactly what forced this whole
// change, since a free-tier monitor can't provide one.
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.get("status") === "1") {
    const { data, error } = await supabase
      .from("push_scheduler_runs")
      .select("ran_at")
      // Ordered by the primary key, not ran_at: id is monotonic with insert
      // order (identity column, rows only ever appended) so it gives the same
      // latest row, but it's already indexed — ran_at isn't, and this endpoint
      // is polled against a table that grows every 2 minutes forever.
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    // A failed query yields null data, which reads identically to "no runs
    // yet" in the response. Both leave lastRunAgoSeconds null, which fails
    // toward alerting (the monitor's numeric threshold won't match) — the
    // safe direction — but the error itself must still be visible in the
    // logs, and the response says which of the two it was.
    if (error) {
      console.error("[send-reminders] status query failed:", error);
    }
    const lastRunAgoSeconds = data ? (Date.now() - new Date(data.ran_at).getTime()) / 1000 : null;
    const status = error ? "query_failed" : data ? "ok" : "no_runs_recorded";
    return new Response(JSON.stringify({ lastRunAgoSeconds, status }), { headers: { "Content-Type": "application/json" } });
  }
  // Only the scheduled cron invocation (which sends this exact key, see
  // migration 0015) may trigger a real send — --no-verify-jwt means anyone
  // could otherwise reach this and send real pushes to drivers mid-break.
  const authHeader = req.headers.get("Authorization") || "";
  if (authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    await runScheduler();
  } catch (e: any) {
    // No heartbeat is written on this path — the pass did not complete, so
    // the stamp must stay stale and let the health check go red.
    console.error("[send-reminders] run aborted:", e?.message || e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
