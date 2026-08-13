// supabase/functions/send-reminders/index.ts
//
// Runs on a pg_cron schedule (see supabase/migrations/0015_push_scheduler_cron.sql).
// For every driver with at least one push subscription: figures out if
// they're due the shift-not-logged nudge (19:00 UTC, nothing logged for
// today) or the break-end reminder (N minutes before today's shift's
// break ends, N = their own breakReminderMinutes setting), sends via
// web-push, dedupes against push_notification_log, and removes dead
// subscriptions (410/404 from the push service) as it goes. Always stamps
// push_scheduler_runs so a stale heartbeat is externally detectable even
// if zero reminders were due this pass.
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
import { today, periodForDate, dayInfo, shiftBreakEnd } from "../../../src/lib/pushDuty.js";

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

async function fetchRosterData() {
  const res = await fetch(ROSTER_REMOTE_URL);
  const json = await res.json();
  return { duties: json.duties, fixedRestPattern: json.fixedRestPattern };
}

async function sendToDriver(userId, title, body) {
  const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId);
  for (const sub of subs || []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
        JSON.stringify({ title, body })
      );
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
}

async function alreadySent(userId, shiftDate, reminderType) {
  const { data } = await supabase
    .from("push_notification_log")
    .select("id")
    .eq("user_id", userId)
    .eq("shift_date", shiftDate)
    .eq("reminder_type", reminderType)
    .maybeSingle();
  return !!data;
}

async function markSent(userId, shiftDate, reminderType) {
  await supabase.from("push_notification_log").insert({ user_id: userId, shift_date: shiftDate, reminder_type: reminderType });
}

async function runScheduler() {
  const { duties, fixedRestPattern } = await fetchRosterData();
  const now = new Date();
  const todayDate = today();
  const hourUtc = now.getUTCHours();

  const { data: driverIds } = await supabase.from("push_subscriptions").select("user_id");
  const uniqueDrivers = [...new Set((driverIds || []).map((r) => r.user_id))];

  for (const userId of uniqueDrivers) {
    const [{ data: appDataRow }, { data: settingsRow }, { data: profileRow }] = await Promise.all([
      supabase.from("app_data").select("data").eq("user_id", userId).maybeSingle(),
      supabase.from("settings").select("data").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);
    if (!appDataRow?.data || !settingsRow?.data) continue;
    const settings = settingsRow.data;
    if (settings.notificationsEnabled === false) continue;

    const { periods = [], activePeriodId = null } = appDataRow.data;
    const period = periodForDate(periods, todayDate, activePeriodId);
    if (!period) continue;

    const restConfig = {
      enabled: !!profileRow?.custom_rest_days_enabled,
      weekdays: new Set(profileRow?.custom_rest_weekdays || []),
      since: profileRow?.custom_rest_days_since || null,
    };
    const info = dayInfo(period, todayDate, restConfig, fixedRestPattern);

    // Shift-not-logged nudge — once, at SHIFT_NOT_LOGGED_HOUR_UTC, only if
    // still unlogged (not a shift, not a real or auto rest day).
    if (hourUtc >= SHIFT_NOT_LOGGED_HOUR_UTC && info.status === "unlogged") {
      if (!(await alreadySent(userId, todayDate, "shift_not_logged"))) {
        await sendToDriver(userId, "Log today's shift", "Nothing logged yet for today in Shift Tracker.");
        await markSent(userId, todayDate, "shift_not_logged");
      }
    }

    // Break-end reminder — fires in the lead-time window before today's
    // shift's break ends.
    if (settings.breakReminderEnabled !== false && info.status === "shift") {
      const breakEnd = shiftBreakEnd(info.shift, duties);
      if (breakEnd) {
        const leadMins = settings.breakReminderMinutes || 10;
        const fireAt = new Date(breakEnd.getTime() - leadMins * 60000);
        if (now >= fireAt && now < breakEnd) {
          if (!(await alreadySent(userId, todayDate, "break_end"))) {
            await sendToDriver(userId, "Break ending soon", `Your break ends in about ${leadMins} minutes.`);
            await markSent(userId, todayDate, "break_end");
          }
        }
      }
    }
  }

  await supabase.from("push_scheduler_runs").insert({});
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.get("status") === "1") {
    const { data } = await supabase
      .from("push_scheduler_runs")
      .select("ran_at")
      .order("ran_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastRunAgoSeconds = data ? (Date.now() - new Date(data.ran_at).getTime()) / 1000 : null;
    return new Response(JSON.stringify({ lastRunAgoSeconds }), { headers: { "Content-Type": "application/json" } });
  }
  await runScheduler();
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
