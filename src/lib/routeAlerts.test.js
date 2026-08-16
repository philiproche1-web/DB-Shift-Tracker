import { describe, it, expect, beforeEach } from "vitest";
import { isActiveOn, alertsForZone, alertWindowLabel, fetchRouteAlerts } from "./routeAlerts.js";

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

describe("North Street, Swords diversion (41C / 33)", () => {
  const zone1 = { zone: "Zone 1", type: "diversion", starts_on: "2026-08-11", ends_on: "2026-12-06" };
  const skerries = { zone: "Skerries", type: "diversion", starts_on: "2026-08-11", ends_on: "2026-12-06" };

  it("41C alert is live on Zone 1 for the full closure window, not before/after", () => {
    expect(isActiveOn(zone1, "2026-08-10")).toBe(false);
    expect(isActiveOn(zone1, "2026-08-11")).toBe(true);
    expect(isActiveOn(zone1, "2026-12-06")).toBe(true);
    expect(isActiveOn(zone1, "2026-12-07")).toBe(false);
  });

  it("33 alert only matches Skerries drivers, not Zone 1", () => {
    const alerts = [zone1, skerries];
    expect(alertsForZone(alerts, "Zone 1", "2026-09-01").map((a) => a.zone)).toEqual(["Zone 1"]);
    expect(alertsForZone(alerts, "Skerries", "2026-09-01").map((a) => a.zone)).toEqual(["Skerries"]);
  });

  it("renders the closure window as a date range", () => {
    expect(alertWindowLabel(zone1)).toBe("11 Aug – 6 Dec");
  });
});

describe("fetchRouteAlerts", () => {
  it("returns and caches data on success", async () => {
    const data = [{ id: "1", garage: "Summerhill" }];
    const supabase = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: () => Promise.resolve({ data, error: null }) }) }) }) }) };

    const result = await fetchRouteAlerts(supabase, "Summerhill");

    expect(result).toEqual(data);
    expect(JSON.parse(localStorage.getItem("dbus_route_alerts_cache"))).toEqual(data);
  });

  it("falls back to the cache when the fetch errors", async () => {
    localStorage.setItem("dbus_route_alerts_cache", JSON.stringify([{ id: "cached" }]));
    const supabase = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: new Error("offline") }) }) }) }) }) };

    const result = await fetchRouteAlerts(supabase, "Summerhill");

    expect(result).toEqual([{ id: "cached" }]);
  });

  it("returns an empty array when the fetch errors and there's no cache", async () => {
    const supabase = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: new Error("offline") }) }) }) }) }) };

    const result = await fetchRouteAlerts(supabase, "Summerhill");

    expect(result).toEqual([]);
  });
});
