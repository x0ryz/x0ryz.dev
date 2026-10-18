// The page ends in a hot spring: a few snow monkeys sit in it up to their shoulders, one of
// them dozing and one with a little one, steam curls up behind the contact links, and rocks
// close it in at the sides. Drawn in squares, like the voxels of the monkey at the top.
(() => {
  const box = document.querySelector(".onsen");
  if (!box) return;
  const canvas = box.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const season = document.documentElement.dataset.season || "winter";
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const CELL = 6;
  const WATER = 8; // rows of water at rest

  // Colours from the 3D scene (monkey.js); at night everything is dimmer and bluer
  const FUR = {
    winter: ["#bcc1c9", "#a4aab4", "#d3d7dd"],
    spring: ["#b9b1a6", "#a39a8e", "#cdc6bb"],
    summer: ["#9a7a5e", "#84674d", "#ae8f72"],
    autumn: ["#a89a8a", "#928473", "#bdb0a1"],
  }[season];
  const DAY = {
    water: ["#7fb3d5", "#88badb", "#76abcf"],
    crest: "#b9d9ec",
    rock: ["#6b717b", "#7b818b", "#5d636c", "#868c95", "#737984"],
    steam: "#9fb3c4",
  };
  const NIGHT = {
    water: ["#3b6f96", "#41779f", "#35678c"],
    crest: "#6f9cbf",
    rock: ["#3f454e", "#4a505a", "#373c44", "#545a64", "#444a53"],
    steam: "#8c9db0",
  };
  const dim = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
    return `rgb(${r * 0.55}, ${g * 0.58}, ${b * 0.7})`;
  };

  // A monkey from the front, up to its shoulders: F fur, f dark fur, R face, r dark face,
  // P ear, E eye, N nostril. Rows below the shoulders sit under the water.
  const MONKEY = [
    "....FFFFFF....",
    "..FFFFFFFFFF..",
    ".FFFFFFFFFFFF.",
    ".FFRRRFFRRRFF.",
    "PFRRRRRRRRRRFP",
    "PFRRERRRRERRFP",
    ".FRRRRRRRRRRF.",
    ".FfRRRNNRRRfF.",
    ".FFfRRRRRRfFF.",
    "FFFFfRrrRfFFFF",
    "FFFFFFFFFFFFFF",
    "FFFFFFFFFFFFFF",
    "FFFFFFFFFFFFFF",
  ];
  const SHOULDERS = 11; // the water comes up to this row
  // Shut eyes, for the one asleep
  const DOZING = MONKEY.map((line, r) => (r === 5 ? "PFRrrRRRRrrRFP" : line));
  // Something on the head of one of them: snow, a folded towel, a petal or a maple leaf
  // (drawn over the top of the head, its last row on the head's first)
  const HAT = {
    winter: ["...SSSSSSS....", "..SSSSSSSSSS.."],
    summer: ["....TTTTTT....", "....TBBBBT...."],
    spring: ["......p.......", ".....pp......."],
    autumn: ["......L.......", ".....LLL......", "......l......."],
  }[season];
  const HAT_COLORS = { S: "#ffffff", T: "#f4f1ea", B: "#7fb3d5", p: "#f6b6c9", L: "#e0782c", l: "#7a3b1d" };

  const hash = (a, b = 0) => {
    const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  let w = 0;
  let h = 0;
  let cols = 0;
  let rocks = [];
  let monkeys = [];
  function resize() {
    const ratio = Math.min(devicePixelRatio, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    cols = Math.ceil(w / CELL);
    // Rounded rocks at each side
    const side = Math.max(5, Math.round(cols * 0.08));
    rocks = Array.from({ length: cols }, (_, c) => {
      const e = Math.min(c, cols - 1 - c) / side;
      return e < 1 ? Math.round(WATER + 1 + Math.sqrt(1 - e * e) * 6 + hash(c) * 1.5) : 0;
    });
    // Three monkeys and a little one on a wide page, two and the little one on a phone
    const wide = cols >= 90;
    monkeys = (wide
      ? [{ at: 0.24, hat: true }, { at: 0.5, sleepy: true }, { at: 0.5, baby: true }, { at: 0.75 }]
      : [{ at: 0.3, hat: true }, { at: 0.66, sleepy: true }, { at: 0.66, baby: true }]
    ).map((m, i) => {
      const size = m.baby ? 4 : CELL;
      // The little one sits just to the right of the sleeper
      const x = Math.round(w * m.at - (m.baby ? -7.5 * CELL : 7 * CELL));
      return { ...m, size, x, phase: hash(i, 7) * 10, blink: 2 + hash(i, 8) * 4 };
    });
  }

  function drawMonkey(m, t, night) {
    const cs = m.size;
    const bob = still ? 0 : Math.round(Math.sin(t * 0.9 + m.phase) * 0.6) * cs;
    const surface = h - (WATER + 1) * CELL;
    const top = surface - SHOULDERS * cs + bob + (m.baby ? cs * 2 : 0);
    const blinking = !still && (t + m.phase) % m.blink < 0.15;
    const color = (ch) =>
      ({
        F: FUR[0],
        f: FUR[1],
        R: "#d4806f",
        r: "#b96a5d",
        P: "#cd7a6c",
        E: blinking ? "#d4806f" : "#231a17",
        N: "#8f3e38",
      })[ch];
    const sprite = (lines, row0, colorOf) =>
      lines.forEach((line, r) => {
        for (let c = 0; c < line.length; c++) {
          if (line[c] === ".") continue;
          const fill = colorOf(line[c]);
          ctx.fillStyle = night ? dim(fill) : fill;
          ctx.fillRect(m.x + c * cs, top + (row0 + r) * cs, cs, cs);
        }
      });
    sprite(m.sleepy ? DOZING : MONKEY, 0, color);
    if (m.hat) sprite(HAT, 1 - HAT.length, (ch) => HAT_COLORS[ch]);
    // Zs drifting up from the one asleep
    if (m.sleepy && !still) {
      for (const k of [0, 1]) {
        const p = ((t * 0.35 + k * 0.5) % 1);
        ctx.globalAlpha = Math.sin(p * Math.PI) * 0.8;
        ctx.fillStyle = night ? "#c9d1dc" : "#5b6574";
        const zx = m.x + 14 * cs + p * 18;
        const zy = top - p * 34;
        const z = 2 + Math.round(p * 2);
        for (const [dx, dy] of [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]]) ctx.fillRect(zx + dx * z, zy + dy * z, z, z);
        ctx.globalAlpha = 1;
      }
    }
  }

  const surface = (c, t) => WATER + Math.round(Math.sin(c * 0.3 + t * 1.3) * 0.6 + Math.sin(c * 0.09 - t * 0.6) * 0.7);
  const FLOAT = { spring: ["#f6b6c9", "#f9cfdb"], autumn: ["#d2462a", "#e0782c", "#e8b23a"] }[season] || [];
  const floaters = Array.from({ length: FLOAT.length ? 5 : 0 }, (_, i) => ({ x: hash(i, 5), color: FLOAT[i % FLOAT.length], speed: 0.004 + hash(i, 6) * 0.006 }));

  function draw(t) {
    const night = dark.matches;
    const look = night ? NIGHT : DAY;
    ctx.clearRect(0, 0, w, h);
    const cell = (c, r, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(c * CELL, h - (r + 1) * CELL, CELL, CELL);
    };

    // Steam: a few wisps curling up from the water, like the ♨ sign, fading as they rise
    const wisps = cols >= 90 ? [0.13, 0.37, 0.62, 0.88] : [0.15, 0.48, 0.85];
    ctx.fillStyle = look.steam;
    wisps.forEach((at, i) => {
      const base = h - (WATER + 2) * CELL;
      const tall = h * 0.75;
      for (let y = 0; y < tall; y += 4) {
        const k = y / tall;
        const x = w * at + Math.sin(y * 0.045 - t * 1.6 + i * 2) * (6 + k * 10);
        ctx.globalAlpha = 0.55 * (1 - k) * (0.6 + 0.4 * Math.sin(t * 1.1 + i * 3 + k * 4));
        ctx.fillRect(Math.round(x / 4) * 4, Math.round((base - y) / 4) * 4, 4, 4);
      }
    });
    ctx.globalAlpha = 1;

    for (const m of monkeys) drawMonkey(m, t, night);

    for (let c = 0; c < cols; c++) {
      const top = surface(c, t);
      for (let r = 0; r <= top; r++) cell(c, r, r === top ? look.crest : look.water[Math.floor(hash(c, r) * 3)]);
    }
    for (const f of floaters) {
      const c = Math.floor(((f.x + t * f.speed) % 1) * cols);
      if (!rocks[c]) cell(c, surface(c, t) + 1, f.color);
    }
    for (let c = 0; c < cols; c++) {
      const rock = rocks[c];
      for (let r = 0; r < rock; r++) {
        const snowy = season === "winter" && r === rock - 1;
        // Lighter on top, like the sun on round stones
        const shade = r >= rock - 2 ? 3 : Math.floor(hash(c, r + 50) * look.rock.length);
        cell(c, r, snowy ? (night ? "#c9d1dc" : "#ffffff") : look.rock[shade]);
      }
    }
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
