// Small things on the page that need a script: the scene, the weather and the clock.
// Without JavaScript the page reads the same, just without them.

// The scene is decoration, so it loads once the page has settled
if (document.querySelector(".monkey3d")) {
  const load = () => import("/monkey.min.js");
  "requestIdleCallback" in window ? requestIdleCallback(load, { timeout: 2000 }) : setTimeout(load, 300);
}

// The weather in Lutsk, from /weather.json (functions/weather.json.js). It goes on <html> as
// data-weather, where the scenes and the falling bits read it, and next to the clock.
let weather = null;
if (!document.documentElement.dataset.weather)
  fetch("/weather.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((w) => {
      if (!w?.kind) return;
      weather = w;
      document.documentElement.dataset.weather = w.kind;
      document.dispatchEvent(new Event("weather"));
      tick?.();
      storm();
    })
    .catch(() => {});

// In a storm, now and then a flash lights up the whole page for a moment; the scenes in
// monkey.js listen for it and light up with it
function storm() {
  if (document.documentElement.dataset.weather !== "storm") return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const flash = () => {
    const length = 120 + Math.random() * 100;
    document.documentElement.classList.add("flash");
    document.dispatchEvent(new CustomEvent("flash", { detail: length / 1000 }));
    setTimeout(() => document.documentElement.classList.remove("flash"), length);
    setTimeout(flash, 6000 + Math.random() * 10000);
  };
  setTimeout(flash, 3000 + Math.random() * 4000);
}
storm();

// The time in Lutsk, so people in other time zones know when I'm around
const clock = document.querySelector(".clock");
let tick = null;
if (clock) {
  const zone = "Europe/Kyiv";
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const offset = new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "shortOffset" });
  tick = () => {
    const now = new Date();
    const hhmm = time.format(now);
    const utc = offset.formatToParts(now).find((p) => p.type === "timeZoneName").value.replace("GMT", "UTC");
    // At night the monkey sleeps too (see monkey.js)
    const night = Number(hhmm.slice(0, 2)) < 6;
    const sky = weather?.text ? `, ${weather.temp} °C and ${weather.text}` : "";
    clock.textContent = night
      ? `It’s ${hhmm} in Lutsk (${utc})${sky}, so I’m probably asleep. Write anyway, I’ll answer in the morning.`
      : `It’s ${hhmm} in Lutsk (${utc})${sky}.`;
  };
  tick();
  clock.hidden = false;
  setInterval(tick, 30_000);
}
