// A note for whoever opens the browser console
console.log(
  [
    "   .-\"\"\"-.",
    "  / o   o \\    Hi! The monkey is built voxel by voxel in /monkey.js,",
    " |    ^    |   no model files, just code.",
    "  \\  '-'  /",
    "   '-...-'     Looking for a Python backend developer? hello@x0ryz.dev",
  ].join("\n"),
);

// A few seasonal particles over the whole page, in front of the scene and behind the text:
// snow, petals or leaves, and fireflies on summer nights. Small squares, like the voxels.
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.querySelector(".season-bg");
  const ctx = canvas.getContext("2d");
  const season = document.documentElement.dataset.season;
  const dark = matchMedia("(prefers-color-scheme: dark)");

  const LOOK = {
    winter: { light: ["#c3ccd8", "#d2d9e2"], dark: ["#8d99a9", "#b5bfcc"], size: 5, spin: false },
    spring: { light: ["#f2a7bf", "#f6c2d2"], dark: ["#c77a95", "#e29ab3"], size: 6, spin: true },
    autumn: { light: ["#d2462a", "#e0782c", "#e8b23a"], dark: ["#b5442b", "#c96a2c", "#c99a35"], size: 7, spin: true },
    summer: { light: [], dark: ["#d8f56a"], size: 4, spin: false, fireflies: true },
  }[season];
  if (!LOOK) return;

  const COUNT = LOOK.fireflies ? 8 : 10;
  let w = 0;
  let h = 0;
  const ratio = Math.min(devicePixelRatio, 2);
  function resize() {
    w = innerWidth;
    h = innerHeight;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  addEventListener("resize", resize);
  resize();

  const bits = Array.from({ length: COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    speed: 14 + Math.random() * 16,
    phase: Math.random() * 10,
    pick: Math.random(),
  }));

  let last = 0;
  let running = false;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const colors = dark.matches ? LOOK.dark : LOOK.light;
    ctx.clearRect(0, 0, w, h);
    // Nothing to draw (fireflies on a summer day): stop until the theme turns dark
    if (!colors.length) {
      running = false;
      return;
    }
    const t = now / 1000;
    for (const b of bits) {
      const s = LOOK.size;
      let x;
      let y;
      let alpha = 0.8;
      if (LOOK.fireflies) {
        // Wander around their spot and pulse
        x = b.x + Math.sin(t * 0.4 + b.phase) * 40;
        y = b.y + Math.sin(t * 0.3 + b.phase * 2) * 30;
        alpha = 0.2 + 0.8 * Math.max(0, Math.sin(t * 1.8 + b.phase));
        ctx.shadowColor = colors[0];
        ctx.shadowBlur = 10;
      } else {
        b.y += b.speed * dt;
        if (b.y > h + 10) {
          b.y = -10;
          b.x = Math.random() * w;
        }
        x = b.x + Math.sin(t * 0.6 + b.phase) * 30;
        y = b.y;
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = colors[Math.floor(b.pick * colors.length)];
      ctx.save();
      ctx.translate(x, y);
      if (LOOK.spin) ctx.rotate(t * 0.8 + b.phase);
      ctx.fillRect(-s / 2, -s / 2, s, LOOK.spin ? s * 0.6 : s);
      ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
  dark.addEventListener("change", start);
  start();
})();
