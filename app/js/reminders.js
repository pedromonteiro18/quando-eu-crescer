/* ═══════════════════════════════════════════════════════════════════════════
   REMINDERS — one local notification, always for tomorrow evening, always
   rescheduled onto the same id rather than stacked. This is the piece
   DESIGN.md §4 and progress.js describe as needing "a service worker with
   push, a server, and on iOS an installed app — none of which a web page
   has." The native shell is that installed app, so this module is the other
   half of that sentence.

   It touches nothing outside itself: window.Capacitor exists only inside the
   native shell (injected by the iOS or Android runtime before any app script runs), so
   every export below is a silent no-op in the browser. The web app is
   unaffected by this file existing at all.
   ═══════════════════════════════════════════════════════════════════════════ */

import { t } from "./i18n.js";

const REMINDER_ID = 1;
const HOUR = 19; // local time the reminder fires, same evening slot every day

function plugin() {
  const cap = typeof window !== "undefined" ? window.Capacitor : null;
  return cap && cap.isNativePlatform && cap.isNativePlatform() ? cap.Plugins?.LocalNotifications : null;
}

async function ensurePermission(ln) {
  try {
    const have = await ln.checkPermissions();
    if (have.display === "granted") return true;
    const asked = await ln.requestPermissions();
    return asked.display === "granted";
  } catch {
    return false;
  }
}

function tomorrowAt(hour) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/**
 * Call after a lesson finishes. Schedules the one reminder for tomorrow
 * evening, replacing whatever was there — so a missed day never leaves a
 * stack of stale notifications behind, just the one honest nudge.
 */
export async function remindStreak(days) {
  const ln = plugin();
  if (!ln) return;
  if (!(await ensurePermission(ln))) return;
  try {
    await ln.schedule({
      notifications: [{
        id: REMINDER_ID,
        title: t("reminder.title"),
        body: days > 1 ? t("reminder.bodyStreak", { days }) : t("reminder.body"),
        schedule: { at: tomorrowAt(HOUR) }
      }]
    });
  } catch {
    /* a reminder that fails to schedule is not worth surfacing to the learner */
  }
}
