import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isWeatherCacheFresh, weatherIconKind, fetchWeather } from "./weather.js";

describe("isWeatherCacheFresh", () => {
  it("is fresh within 45 minutes", () => {
    const now = 1000000;
    expect(isWeatherCacheFresh({tempC:10, code:0, fetchedAt: now - 44*60*1000}, now)).toBe(true);
  });
  it("is stale after 45 minutes", () => {
    const now = 1000000;
    expect(isWeatherCacheFresh({tempC:10, code:0, fetchedAt: now - 46*60*1000}, now)).toBe(false);
  });
  it("is not fresh when there's no cache", () => {
    expect(isWeatherCacheFresh(null)).toBe(false);
    expect(isWeatherCacheFresh(undefined)).toBe(false);
  });
});

describe("weatherIconKind", () => {
  it("maps known WMO codes to icon kinds", () => {
    expect(weatherIconKind(0)).toBe("clear");
    expect(weatherIconKind(2)).toBe("cloudy");
    expect(weatherIconKind(45)).toBe("fog");
    expect(weatherIconKind(61)).toBe("rain");
    expect(weatherIconKind(71)).toBe("snow");
    expect(weatherIconKind(95)).toBe("storm");
  });
  it("falls back to cloudy for an unknown code", () => {
    expect(weatherIconKind(9999)).toBe("cloudy");
  });
});

describe("fetchWeather", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("returns a fresh cached value without calling fetch", async () => {
    localStorage.setItem("dbus_weather_cache", JSON.stringify({tempC:12, code:1, fetchedAt: Date.now()}));
    const result = await fetchWeather();
    expect(result).toEqual({tempC:12, code:1});
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches, caches, and returns fresh data when no cache exists", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ current_weather: { temperature: 14.6, weathercode: 3 } }) });
    const result = await fetchWeather();
    expect(result).toEqual({tempC:15, code:3});
    const cached = JSON.parse(localStorage.getItem("dbus_weather_cache"));
    expect(cached.tempC).toBe(15);
    expect(cached.code).toBe(3);
  });

  it("falls back to a stale cache on fetch failure", async () => {
    localStorage.setItem("dbus_weather_cache", JSON.stringify({tempC:8, code:61, fetchedAt: Date.now() - 60*60*1000}));
    fetch.mockRejectedValue(new Error("network down"));
    const result = await fetchWeather();
    expect(result).toEqual({tempC:8, code:61});
  });

  it("returns null when the fetch fails and there is no cache at all", async () => {
    fetch.mockRejectedValue(new Error("network down"));
    const result = await fetchWeather();
    expect(result).toBeNull();
  });
});
