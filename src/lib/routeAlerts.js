// Diversions, roadworks, and other route notices, scoped per garage (and
// optionally per zone). Fetched from Supabase and cached locally the same
// way the roster is, so an alert seen once still shows with no signal.
const ALERTS_CACHE_KEY = "dbus_route_alerts_cache";

export function isActiveOn(alert, date) {
  if (alert.starts_on > date) return false;
  if (alert.ends_on && alert.ends_on < date) return false;
  return true;
}

// zone-less alerts (garage-wide) match every zone; zone-scoped alerts only
// match that zone.
export function alertsForZone(alerts, zone, date) {
  return alerts.filter((a) => isActiveOn(a, date) && (!a.zone || a.zone === zone));
}

export async function fetchRouteAlerts(supabase, garage) {
  try {
    const { data, error } = await supabase
      .from("route_alerts")
      .select("*")
      .eq("garage", garage)
      .order("starts_on", { ascending: true });
    if (error || !data) throw error || new Error("no data");
    try { localStorage.setItem(ALERTS_CACHE_KEY, JSON.stringify(data)); } catch {}
    return data;
  } catch {
    try {
      const cached = JSON.parse(localStorage.getItem(ALERTS_CACHE_KEY) || "null");
      return Array.isArray(cached) ? cached : [];
    } catch { return []; }
  }
}
