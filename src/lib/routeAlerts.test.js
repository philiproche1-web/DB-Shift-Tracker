import { describe, it, expect, beforeEach } from "vitest";
import { isActiveOn, alertsForZone, fetchRouteAlerts } from "./routeAlerts.js";

beforeEach(() => { localStorage.clear(); });

describe("isActiveOn", () => {
  it("is false before starts_on", () => {
    expect(isActiveOn({ starts_on: "2026-08-01", ends_on: null }, "2026-07-31")).toBe(false);
  });
  it("is true on starts_on with no ends_on", () => {
    expect(isActiveOn({ starts_on: "2026-08-01", ends_on: null }, "2026-08-01")).toBe(true);
  });
  it("is true between starts_on and ends_on inclusive", () => {
    expect(isActiveOn({ starts_on: "2026-08-01", ends_on: "2026-08-10" }, "2026-08-10")).toBe(true);
  });
  it("is false after ends_on", () => {
    expect(isActiveOn({ starts_on: "2026-08-01", ends_on: "2026-08-10" }, "2026-08-11")).toBe(false);
  });
});

describe("alertsForZone", () => {
  const alerts = [
    { id: "1", zone: "Zone 1", starts_on: "2026-08-01", ends_on: null },
    { id: "2", zone: null, starts_on: "2026-08-01", ends_on: null },
    { id: "3", zone: "Zone 2", starts_on: "2026-08-01", ends_on: null },
    { id: "4", zone: "Zone 1", starts_on: "2026-09-01", ends_on: null },
  ];
  it("includes zone-matched and garage-wide alerts, excludes other zones and inactive dates", () => {
    const result = alertsForZone(alerts, "Zone 1", "2026-08-05");
    expect(result.map((a) => a.id)).toEqual(["1", "2"]);
  });
});

describe("fetchRouteAlerts", () => {
  it("returns and caches data on success", async () => {
    const data = [{ id: "1", garage: "Summerhill" }];
    const supabase = { from: () => ({ select: () => ({ eq: () => ({ order: () => Promise.resolve({ data, error: null }) }) }) }) };

    const result = await fetchRouteAlerts(supabase, "Summerhill");

    expect(result).toEqual(data);
    expect(JSON.parse(localStorage.getItem("dbus_route_alerts_cache"))).toEqual(data);
  });

  it("falls back to the cache when the fetch errors", async () => {
    localStorage.setItem("dbus_route_alerts_cache", JSON.stringify([{ id: "cached" }]));
    const supabase = { from: () => ({ select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: new Error("offline") }) }) }) }) };

    const result = await fetchRouteAlerts(supabase, "Summerhill");

    expect(result).toEqual([{ id: "cached" }]);
  });

  it("returns an empty array when the fetch errors and there's no cache", async () => {
    const supabase = { from: () => ({ select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: new Error("offline") }) }) }) }) };

    const result = await fetchRouteAlerts(supabase, "Summerhill");

    expect(result).toEqual([]);
  });
});
