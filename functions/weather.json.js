// Cloudflare Pages Function: /weather.json, the weather in Lutsk right now, from Open-Meteo
// (no key needed). The page reads it to set the scenes' weather and say it next to the clock.
// Served from this site, so the page's Content-Security-Policy can stay closed to other hosts.
const LUTSK = "latitude=50.75&longitude=25.34";

// WMO weather codes, as Open-Meteo reports them, to what the scenes show and what the page says
function describe(code) {
  if (code <= 1) return ["clear", code ? "mostly clear" : "clear sky"];
  if (code === 2) return ["clear", "partly cloudy"];
  if (code === 3) return ["cloudy", "overcast"];
  if (code === 45 || code === 48) return ["fog", "fog"];
  if (code >= 51 && code <= 57) return ["rain", "drizzle"];
  if (code === 61 || code === 80) return ["rain", "light rain"];
  if ((code >= 62 && code <= 67) || code === 81 || code === 82) return ["rain", "rain"];
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ["snow", "snow"];
  if (code >= 95) return ["storm", "a thunderstorm"];
  return ["clear", ""];
}

export async function onRequest() {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${LUTSK}&current=weather_code,temperature_2m&timezone=Europe%2FKyiv`,
      { cf: { cacheTtl: 1800, cacheEverything: true } },
    );
    if (!response.ok) throw new Error(`Open-Meteo answered ${response.status}`);
    const { current } = await response.json();
    const [kind, text] = describe(current.weather_code);
    return reply({ kind, text, temp: Math.round(current.temperature_2m) }, 1800);
  } catch {
    // No weather: the page shows its usual scene
    return reply({ kind: null }, 300);
  }
}

function reply(body, seconds) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${seconds}` },
  });
}
