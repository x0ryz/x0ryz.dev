// Small things on the page that need a script: the scene, the copy buttons and the clock.
// Without JavaScript the page reads the same, just without them.

// The scene is decoration, so it loads once the page has settled
if (document.querySelector(".monkey3d")) {
  const load = () => import("/monkey.min.js");
  "requestIdleCallback" in window ? requestIdleCallback(load, { timeout: 2000 }) : setTimeout(load, 300);
}

// Copy the email address: a mailto link does nothing for people without a mail app
for (const button of document.querySelectorAll("button.copy")) {
  button.hidden = !navigator.clipboard;
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = "copied";
    } catch {
      button.textContent = "press Ctrl+C";
      getSelection().selectAllChildren(button.previousElementSibling);
    }
    clearTimeout(button.timer);
    button.timer = setTimeout(() => (button.textContent = "copy"), 2000);
  });
}

// The time in Lutsk, so people in other time zones know when I'm around
const clock = document.querySelector(".clock");
if (clock) {
  const zone = "Europe/Kyiv";
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const offset = new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "shortOffset" });
  const tick = () => {
    const now = new Date();
    const hhmm = time.format(now);
    const utc = offset.formatToParts(now).find((p) => p.type === "timeZoneName").value.replace("GMT", "UTC");
    // At night the monkey sleeps too (see monkey.js)
    const night = Number(hhmm.slice(0, 2)) < 6;
    clock.textContent = night
      ? `It’s ${hhmm} in Lutsk (${utc}), so I’m probably asleep. Write anyway, I’ll answer in the morning.`
      : `It’s ${hhmm} in Lutsk (${utc}).`;
  };
  tick();
  clock.hidden = false;
  setInterval(tick, 30_000);
}
