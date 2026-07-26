// Current-weather chip for the Home greeting - Open-Meteo, no API key, no
// signup, free for this usage pattern. Fixed Dublin/Summerhill-area
// coordinates since only Summerhill has a live roster today (see
// lib/garages.js) - revisit if/when other garages go live.
const WEATHER_CACHE_KEY = "dbus_weather_cache";
const WEATHER_CACHE_MS = 45 * 60 * 1000;
const DUBLIN_LAT = 53.35;
const DUBLIN_LON = -6.26;

export function isWeatherCacheFresh(cache, now = Date.now()) {
  return !!cache && typeof cache.fetchedAt === "number" && (now - cache.fetchedAt) < WEATHER_CACHE_MS;
}

function readCache() {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeCache(tempC, code) {
  try { localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ tempC, code, fetchedAt: Date.now() })); } catch {}
}

export async function fetchWeather() {
  const cached = readCache();
  if (isWeatherCacheFresh(cached)) return { tempC: cached.tempC, code: cached.code };

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${DUBLIN_LAT}&longitude=${DUBLIN_LON}&current_weather=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("weather fetch failed");
    const json = await res.json();
    const tempC = Math.round(json.current_weather.temperature);
    const code = json.current_weather.weathercode;
    writeCache(tempC, code);
    return { tempC, code };
  } catch {
    // Offline or the API is down - a stale cached value beats showing nothing
    // if one exists; otherwise there's genuinely nothing to show.
    if (cached) return { tempC: cached.tempC, code: cached.code };
    return null;
  }
}

// Maps an Open-Meteo WMO weather code (https://open-meteo.com/en/docs) to
// one of a small set of icon kinds this app draws inline (see WeatherIcon
// in components/shared.jsx) - never throws, unknown codes fall back to the
// generic "cloudy" icon rather than the caller having to guard against an
// unrecognized kind.
export function weatherIconKind(code) {
  if (code === 0) return "clear";
  if ([1, 2, 3].includes(code)) return "cloudy";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "cloudy";
}
