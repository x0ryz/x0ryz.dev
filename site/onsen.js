// The page ends in a hot spring, like the one the monkey sits in: a strip of water at the
// bottom with rocks at the sides, steam rising behind the contact links and, in spring and
// autumn, petals or leaves drifting on it. Drawn in squares, like the voxels.
(() => {
  const box = document.querySelector(".onsen");
  if (!box) return;
  const canvas = box.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const season = document.documentElement.dataset.season;
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const CELL = 8;
  const WATER = 7; // rows of water at rest
  const COLORS = {
    light: {
      water: ["#7fb3d5", "#88badb", "#76abcf"],
      crest: "#b9d9ec",
      rock: ["#6b717b", "#7b818b", "#5d636c", "#868c95", "#737984"],
      steam: "#ffffff",
    },
    dark: {
      water: ["#3b6f96", "#41779f", "#35678c"],
      crest: "#6f9cbf",
      rock: ["#3f454e", "#4a505a", "#373c44", "#545a64", "#444a53"],
      steam: "#c9d6e4",
    },
  };
  const FLOAT = { spring: ["#f6b6c9", "#f9cfdb"], autumn: ["#d2462a", "#e0782c", "#e8b23a"] }[season] || [];
  const SNOW = season === "winter" ? "#ffffff" : null;

  // The same noise for a cell on every frame, so rocks and water keep their texture
  const hash = (a, b = 0) => {
    const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  let cols = 0;
  let rows = 0;
  let rocks = [];
  function resize() {
    const ratio = Math.min(devicePixelRatio, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    cols = Math.ceil(w / CELL);
    rows = Math.ceil(h / CELL);
    // A mound of rocks at each side and a couple poking out of the water
    const side = Math.max(4, Math.round(cols * 0.09));
    // Two rocks in the middle on a wide page, one on a phone
    const middle = cols < 80 ? [[0.62, 0.05]] : [[0.3, 0.035], [0.71, 0.028]];
    rocks = Array.from({ length: cols }, (_, c) => {
      const edge = Math.min(c, cols - 1 - c) / side;
      let height = edge < 1 ? Math.round(WATER + 6 - edge * edge * 6 + hash(c) * 2) : 0;
      for (const [at, size] of middle) {
        const d = Math.abs(c - Math.round(cols * at)) / Math.max(3, Math.round(cols * size));
        if (d <= 1) height = Math.max(height, Math.round(WATER + 2.5 - d * d * 3 + hash(c, 1)));
      }
      return height;
    });
  }

  const steam = Array.from({ length: 14 }, (_, i) => ({ x: hash(i, 2), phase: hash(i, 3), size: hash(i, 4) < 0.5 ? 1 : 1.5 }));
  const floaters = Array.from({ length: FLOAT.length ? 5 : 0 }, (_, i) => ({ x: hash(i, 5), color: FLOAT[i % FLOAT.length], speed: 0.004 + hash(i, 6) * 0.006 }));

  const surface = (c, t) => WATER + Math.round(Math.sin(c * 0.35 + t * 1.3) * 0.6 + Math.sin(c * 0.11 - t * 0.6) * 0.7);

  function draw(t) {
    const look = COLORS[dark.matches ? "dark" : "light"];
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cell = (c, r, color, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(c * CELL, h - (r + 1) * CELL, CELL, CELL);
    };

    // Steam rises from the water and fades on the way up
    for (const s of steam) {
      const p = (t * 0.08 + s.phase) % 1;
      const x = s.x * cols * CELL + Math.sin(t * 0.7 + s.phase * 9) * 12;
      const y = h - (WATER + 1) * CELL - p * (h - (WATER + 2) * CELL);
      const size = CELL * s.size;
      ctx.globalAlpha = 0.4 * Math.sin(p * Math.PI);
      ctx.fillStyle = look.steam;
      ctx.fillRect(Math.round(x / 4) * 4, Math.round(y / 4) * 4, size, size);
    }

    for (let c = 0; c < cols; c++) {
      const top = surface(c, t);
      for (let r = 0; r <= top; r++) cell(c, r, r === top ? look.crest : look.water[Math.floor(hash(c, r) * 3)]);
      const rock = rocks[c];
      for (let r = 0; r < rock; r++) {
        const snowy = SNOW && r === rock - 1 && rock > WATER;
        cell(c, r, snowy ? SNOW : look.rock[Math.floor(hash(c, r + 50) * look.rock.length)]);
      }
    }

    // Petals or leaves drifting on the surface, between the rocks
    for (const f of floaters) {
      const c = Math.floor(((f.x + t * f.speed) % 1) * cols);
      if (rocks[c]) continue;
      cell(c, surface(c, t) + 1, f.color);
    }
    ctx.globalAlpha = 1;
  }

  // Shown first, so the canvas has a size to draw at
  box.classList.add("ready");
  resize();
  addEventListener("resize", resize);
  if (still) return draw(0);

  // Only animate while the bottom of the page is in view
  let visible = false;
  let frame = 0;
  const loop = (now) => {
    draw(now / 1000);
    frame = visible ? requestAnimationFrame(loop) : 0;
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !frame) frame = requestAnimationFrame(loop);
  }).observe(box);
})();
