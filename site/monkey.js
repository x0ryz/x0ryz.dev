// Voxel snow monkey in an onsen, built from code and rendered with three.js.
// The scene follows the season set on <html> by the page: snow, sakura, bamboo or maple.
// Falling snow, petals, leaves and fireflies are drawn over the whole page by season.js.
// The model is laid out on a grid of half-size voxels: 2 grid units = 1 world unit.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const box = document.querySelector(".monkey3d");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const darkScheme = matchMedia("(prefers-color-scheme: dark)");

const C = {
  face: 0xd4806f,
  faceDark: 0xb96a5d,
  nostril: 0x8f3e38,
  eye: 0x231a17,
  glint: 0xf4f1ec,
  ear: 0xcd7a6c,
  snow: 0xffffff,
  rock: [0x6b717b, 0x7b818b, 0x5d636c, 0x868c95, 0x737984],
  stone: 0x8d9097,
  laptop: 0x3a4250,
  keys: 0x2b313c,
  screen: 0x4cc0a8,
};

const SEASON = document.documentElement.dataset.season || "winter";
// Fur is thick and light grey in winter and turns browner after the summer moult
const S = {
  winter: {
    fur: [0xbcc1c9, 0xa4aab4, 0xd3d7dd],
    ground: [C.snow], rocks: 0.55, cells: 0.8,
  },
  spring: {
    fur: [0xb9b1a6, 0xa39a8e, 0xcdc6bb],
    ground: [0xf6b6c9, 0xf9cfdb, 0xee9fb7], rocks: 0.45, cells: 0.35,
    float: [0xf6b6c9, 0xf9cfdb],
    canopy: [0xf6b6c9, 0xf9cfdb, 0xee9fb7, 0xfbe0e8],
  },
  summer: {
    fur: [0x9a7a5e, 0x84674d, 0xae8f72],
    ground: [0x6d9a52, 0x5c8746, 0x7fae5e], rocks: 0.6, cells: 0.85,
  },
  autumn: {
    fur: [0xa89a8a, 0x928473, 0xbdb0a1],
    ground: [0xd2462a, 0xe0782c, 0xe8b23a], rocks: 0.45, cells: 0.4,
    float: [0xd2462a, 0xe0782c, 0xe8b23a],
    canopy: [0xd2462a, 0xe0782c, 0xe8b23a, 0xc23a22],
  },
}[SEASON];

// Seeded random so the model looks the same on every load
let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const key = (x, y, z) => `${x},${y},${z}`;
const parse = (k) => k.split(",").map(Number);

// Voxels go into whichever map is current: the monkey moves on its own, the rest stays put
const monkey = new Map();
const scenery = new Map();
let vox = monkey;
const put = (x, y, z, c) => vox.set(key(x, y, z), typeof c === "function" ? c(x, y, z) : c);
const del = (x, y, z) => vox.delete(key(x, y, z));
const has = (x, y, z) => monkey.has(key(x, y, z)) || scenery.has(key(x, y, z));

function ellipsoid(cx, cy, cz, rx, ry, rz, color) {
  for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1) put(x, y, z, color);
}

function limb(from, to, r, color) {
  const steps = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) * 2);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    ellipsoid(...from.map((v, i) => v + (to[i] - v) * t), r, r, r, color);
  }
}

function block(x0, x1, y0, y1, z0, z1, color) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) put(x, y, z, color);
}

const fur = () => {
  const r = rand();
  return r < 0.12 ? S.fur[1] : r > 0.93 ? S.fur[2] : S.fur[0];
};

// --- Monkey ---
// Body sitting in the water, hunched forward
ellipsoid(0, 4, -2, 10, 9, 8, fur);
// Short tail sticking straight back out of the water
limb([0, 3, -9], [0, 4, -12], 1.2, fur);
ellipsoid(0, 4, -12.5, 1.1, 1.1, 1.1, S.fur[1]);
// Arms from the shoulders down to the keyboard, pink hands with fingers.
// Each arm is its own part, so the monkey can tuck them under itself when it sleeps.
const SHOULDER = { y: 8, z: 1, x: 8 };
const arms = new Map([[-1, new Map()], [1, new Map()]]);
for (const s of [-1, 1]) {
  vox = arms.get(s);
  limb([s * SHOULDER.x, SHOULDER.y, SHOULDER.z], [s * 5, 5, 9], 2.4, fur);
  ellipsoid(s * 4.5, 5, 11, 2, 1.4, 1.8, C.face);
  for (const f of [-1, 0, 1]) put(s * 4.5 + f, 4, 13, C.faceDark);
}
vox = monkey;
// Head and the thick fur around the cheeks
ellipsoid(0, 18, 0, 9, 8.5, 8, fur);
ellipsoid(0, 14.5, 0.5, 11, 5.5, 6.5, fur);

// Face: a red heart shape set into the fur
const FACE_Z = 6;
const inFace = (x, y) =>
  Math.hypot(x + 3, y - 20) <= 3.7 ||
  Math.hypot(x - 3, y - 20) <= 3.7 ||
  (y >= 11 && y <= 20 && Math.abs(x) <= 6.2 - Math.max(0, 15 - y) * 0.95);
for (let x = -7; x <= 7; x++)
  for (let y = 10; y <= 24; y++) {
    if (!inFace(x, y)) continue;
    for (let z = FACE_Z + 1; z <= 12; z++) del(x, y, z);
    put(x, y, FACE_Z, C.face);
    put(x, y, FACE_Z - 1, C.face);
  }
// Brow ridge over the eyes
for (let x = -6; x <= 6; x++) if (x !== 0) put(x, 20, FACE_Z + 1, C.faceDark);
put(0, 21, FACE_Z + 1, C.faceDark);
// Deep-set eyes with a glint; the lids cover them when the monkey blinks
const lids = new Map();
for (const s of [-1, 1]) {
  const ex = s * 3;
  for (const dx of [0, s]) for (const y of [17, 18]) {
    del(ex + dx, y, FACE_Z);
    put(ex + dx, y, FACE_Z - 1, C.eye);
    lids.set(key(ex + dx, y, FACE_Z), y === 18 ? C.faceDark : C.face);
  }
  put(ex, 18, FACE_Z - 1, C.glint);
}
// A flat macaque face: a low muzzle in the face colour, small nostrils and a thin mouth.
// A big pink snout read as a pig.
ellipsoid(0, 13.5, FACE_Z, 3.2, 2.6, 1.4, C.face);
put(-1, 15, FACE_Z + 1, C.nostril);
put(1, 15, FACE_Z + 1, C.nostril);
for (let x = -1; x <= 1; x++) put(x, 12, FACE_Z + 1, C.faceDark);
// Ears attached to the side of the head, with fur filling in behind them
for (const s of [-1, 1])
  for (let y = 17; y <= 21; y++)
    for (let z = -1; z <= 1; z++) {
      for (let x = 6; x <= 8; x++) if (!monkey.has(key(s * x, y, z))) put(s * x, y, z, fur);
      const rim = y === 17 || y === 21 || z !== 0;
      put(s * 9, y, z, rim ? C.ear : C.faceDark);
      if (y > 17 && y < 21) put(s * 10, y, z, C.ear);
    }
// Something on top of the head: snow in winter, a folded towel in summer, a petal or a leaf otherwise
if (SEASON === "winter") {
  for (const [k, c] of monkey) {
    const [x, y, z] = parse(k);
    if (y >= 25 && Math.hypot(x, z) <= 5.5 && c !== C.face) monkey.set(k, C.snow);
  }
  ellipsoid(0, 26.5, -0.5, 5, 1.6, 4, C.snow);
  ellipsoid(1, 28, -0.5, 2.5, 1, 2, C.snow);
} else if (SEASON === "summer") {
  block(-4, 4, 26, 27, -3, 2, (x, y, z) => (z === 0 ? 0x7fb3d5 : 0xf4f1ea));
} else if (SEASON === "spring") {
  put(-2, 27, 1, 0xf6b6c9);
  put(2, 27, -1, 0xf9cfdb);
  put(0, 27, -2, 0xee9fb7);
} else {
  // A maple leaf lying on the head
  for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 1], [-2, 1], [0, 2], [1, -1], [-1, -1]])
    put(dx, 27, dz, dz > 0 && dx !== 0 ? 0xe0782c : 0xd2462a);
  put(0, 27, -2, 0x7a3b1d);
}

// --- Scenery ---
vox = scenery;

// Laptop on the front rocks: a one-voxel base with thin key caps, and a one-voxel lid with
// a thin screen panel facing the monkey. The lid is its own part, so it can close flat.
const keyCaps = [];
const screen = [];
const laptopLid = new Map();
const HINGE = { y: 3.6, z: 18.5 };
for (let x = -8; x <= 8; x++) {
  for (let z = 10; z <= 18; z++) {
    put(x, 3, z, C.laptop);
    if (Math.abs(x) <= 6 && z >= 11 && z <= 15 && (x + z) % 2 === 0) keyCaps.push([x, 3.54, z]);
  }
  for (let y = 4; y <= 12; y++) {
    laptopLid.set(key(x, y, 19), C.laptop);
    if (Math.abs(x) <= 7 && y >= 5 && y <= 11) screen.push([x, y, 18.45]);
  }
}

// Rocks around the pool, many of them topped with snow, petals, moss or leaves
const POOL = 15;
for (let x = -22; x <= 22; x += 2)
  for (let z = -22; z <= 22; z += 2) {
    const d = Math.hypot(x + 1, z + 1);
    if (d < POOL || d >= 21) continue;
    const color = C.rock[Math.floor(rand() * C.rock.length)];
    const top = 1 + Math.floor(rand() * 3);
    for (let dx = 0; dx < 2; dx++)
      for (let dz = 0; dz < 2; dz++)
        for (let y = -3; y <= top; y++) if (!has(x + dx, y, z + dz)) put(x + dx, y, z + dz, color);
    if (rand() < S.rocks)
      for (let dx = 0; dx < 2; dx++)
        for (let dz = 0; dz < 2; dz++) {
          // Nothing on the rocks under the laptop, or it pokes through the base
          const underLaptop = Math.abs(x + dx) <= 9 && z + dz >= 9;
          if (rand() > S.cells || underLaptop || has(x + dx, top + 1, z + dz)) continue;
          put(x + dx, top + 1, z + dz, S.ground[Math.floor(rand() * S.ground.length)]);
          if (SEASON === "winter" && d > 18.5 && rand() < 0.4) put(x + dx, top + 2, z + dz, C.snow);
        }
  }

// Stone lantern on the back rocks; its windows glow at night
const L = { x: -13, z: -13 };
for (let x = L.x - 2; x <= L.x + 2; x++)
  for (let z = L.z - 2; z <= L.z + 2; z++)
    for (let y = 4; y <= 6; y++) scenery.delete(key(x, y, z));
block(L.x - 1, L.x + 1, -3, 4, L.z - 1, L.z + 1, C.rock[2]);
block(L.x - 1, L.x + 1, 5, 5, L.z - 1, L.z + 1, C.stone);
block(L.x, L.x, 6, 8, L.z, L.z, C.stone);
const windows = [];
for (let x = L.x - 1; x <= L.x + 1; x++)
  for (let z = L.z - 1; z <= L.z + 1; z++)
    for (let y = 9; y <= 10; y++) {
      if (x !== L.x && z !== L.z) put(x, y, z, C.stone);
      else windows.push([x, y, z]);
    }
block(L.x - 2, L.x + 2, 11, 11, L.z - 2, L.z + 2, C.stone);
if (SEASON === "winter") {
  block(L.x - 1, L.x + 1, 12, 12, L.z - 1, L.z + 1, C.snow);
  put(L.x, 13, L.z, C.snow);
} else {
  for (let x = L.x - 2; x <= L.x + 2; x++)
    for (let z = L.z - 2; z <= L.z + 2; z++)
      if (rand() < S.cells) put(x, 12, z, S.ground[Math.floor(rand() * S.ground.length)]);
}

// A tree behind the pool: sakura in spring, bamboo in summer, maple in autumn
const T = { x: 11, z: -13 };
const BARK = 0x6b4a3a;
if (S.canopy) {
  block(T.x, T.x + 1, -3, 17, T.z, T.z + 1, BARK);
  limb([T.x + 0.5, 14, T.z + 0.5], [T.x - 3, 19, T.z - 2], 0.8, BARK);
  limb([T.x + 0.5, 15, T.z + 0.5], [T.x + 4, 20, T.z + 3], 0.8, BARK);
  const leaf = () => S.canopy[Math.floor(rand() * S.canopy.length)];
  for (const [cx, cy, cz, rx, ry, rz] of [[T.x + 0.5, 22, T.z + 0.5, 5, 3.5, 4.5], [T.x - 3, 20, T.z - 2, 3.5, 2.5, 3], [T.x + 4, 21, T.z + 3, 3, 2.5, 3]])
    ellipsoid(cx, cy, cz, rx, ry, rz, () => (rand() < 0.15 ? undefined : leaf()));
  for (const [k, c] of [...scenery]) if (c === undefined) scenery.delete(k);
} else if (SEASON === "summer") {
  for (const [bx, bz, h] of [[10, -14, 24], [13, -12, 28], [14, -16, 20]]) {
    for (let y = -3; y <= h; y++) put(bx, y, bz, y % 5 === 0 ? 0x5c8746 : 0x7fae5e);
    for (const [ly, side] of [[h - 1, 1], [h - 5, -1], [h - 9, 1]])
      ellipsoid(bx + side * 2, ly, bz, 2, 0.6, 1.2, () => (rand() < 0.5 ? 0x6d9a52 : 0x7fae5e));
  }
}

// Water fills the pool around the body
const water = [];
for (let x = -POOL; x <= POOL; x++)
  for (let z = -POOL; z <= POOL; z++)
    if (Math.hypot(x + 0.5, z + 0.5) < POOL && !has(x, 0, z)) water.push([x, 0, z]);

// --- Rendering ---
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.localClippingEnabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute("aria-hidden", "true");
box.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const model = new THREE.Group();
model.scale.setScalar(0.5);
scene.add(model);
const cube = new THREE.BoxGeometry(1, 1, 1);
const m4 = new THREE.Matrix4();

// Each voxel map becomes one mesh of only the faces that can be seen. Every face corner is
// darkened by how many voxels crowd it (ambient occlusion), which gives the model its depth.
const N = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const AO = [0.5, 0.68, 0.84, 1];
const FACES = N.map((n) => {
  const a = n.findIndex((v) => v !== 0);
  const [b, c] = [0, 1, 2].filter((i) => i !== a);
  const axis = (i, s) => [0, 1, 2].map((j) => (j === i ? s : 0));
  let corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => {
    const side1 = n.map((x, i) => x + axis(b, u)[i]);
    const side2 = n.map((x, i) => x + axis(c, v)[i]);
    const corner = side1.map((x, i) => x + axis(c, v)[i]);
    return { pos: corner.map((x) => x / 2), side1, side2, corner };
  });
  // Keep the corners counter-clockwise when seen from outside
  const [p0, p1, p2] = corners.map((k) => new THREE.Vector3(...k.pos));
  if (p1.clone().sub(p0).cross(p2.clone().sub(p0)).dot(new THREE.Vector3(...n)) < 0) corners = corners.reverse();
  return { n, corners };
});

function voxelMesh(map, solid = (x, y, z) => map.has(key(x, y, z))) {
  const pos = [];
  const nor = [];
  const colors = [];
  const index = [];
  const base = new THREE.Color();
  for (const [k, hex] of map) {
    const [x, y, z] = parse(k);
    base.setHex(hex);
    for (const { n, corners } of FACES) {
      if (solid(x + n[0], y + n[1], z + n[2])) continue;
      const at = (o) => solid(x + o[0], y + o[1], z + o[2]);
      const ao = corners.map(({ side1, side2, corner }) => {
        const s1 = at(side1);
        const s2 = at(side2);
        return AO[s1 && s2 ? 0 : 3 - s1 - s2 - at(corner)];
      });
      const first = pos.length / 3;
      corners.forEach(({ pos: p }, i) => {
        pos.push(x + p[0], y + p[1], z + p[2]);
        nor.push(...n);
        colors.push(base.r * ao[i], base.g * ao[i], base.b * ao[i]);
      });
      // Split the quad along the diagonal that keeps the shading smooth
      const q = ao[0] + ao[2] > ao[1] + ao[3] ? [0, 1, 2, 0, 2, 3] : [1, 2, 3, 1, 3, 0];
      index.push(...q.map((i) => first + i));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(index);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// The monkey is cut off at the bottom of the pool, so it can sink without showing below the rocks
const poolFloor = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.75)];
const monkeyGroup = new THREE.Group();
monkeyGroup.add(voxelMesh(monkey));
const lidMesh = voxelMesh(lids, (x, y, z) => lids.has(key(x, y, z)) || monkey.has(key(x, y, z)));
lidMesh.visible = false;
monkeyGroup.add(lidMesh);
// Parts that turn around a pivot: the mesh is offset back so the group sits at the pivot
function pivoted(mesh, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  mesh.position.set(-x, -y, -z);
  group.add(mesh);
  return group;
}
const armParts = [-1, 1].map((s) => {
  const part = pivoted(voxelMesh(arms.get(s)), s * SHOULDER.x, SHOULDER.y, SHOULDER.z);
  part.children[0].material.clippingPlanes = poolFloor;
  monkeyGroup.add(part);
  return part;
});
for (const mesh of monkeyGroup.children) if (mesh.material) mesh.material.clippingPlanes = poolFloor;
model.add(monkeyGroup);
model.add(voxelMesh(scenery));

const waterMat = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.6, depthWrite: false });
const waterMesh = new THREE.InstancedMesh(cube, waterMat, water.length);
waterMesh.receiveShadow = true;
water.forEach(([x, y, z], i) => waterMesh.setMatrixAt(i, m4.makeTranslation(x, y, z)));
model.add(waterMesh);

const windowMat = new THREE.MeshBasicMaterial();
const windowMesh = new THREE.InstancedMesh(cube, windowMat, windows.length);
windows.forEach((p, i) => windowMesh.setMatrixAt(i, m4.makeTranslation(...p)));
model.add(windowMesh);
// The laptop screen glows and lights up the monkey's face
const screenMat = new THREE.MeshBasicMaterial({ color: C.screen });
// The screen fades to the colour of the keys as the lid closes
const screenOn = new THREE.Color(C.screen);
const screenOff = new THREE.Color(C.keys);
const screenMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.1), screenMat, screen.length);
screen.forEach((p, i) => screenMesh.setMatrixAt(i, m4.makeTranslation(...p)));
const keyMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(0.8, 0.08, 0.8),
  new THREE.MeshLambertMaterial({ color: C.keys }),
  keyCaps.length,
);
keyCaps.forEach((p, i) => keyMesh.setMatrixAt(i, m4.makeTranslation(...p)));
model.add(keyMesh);
const lidPart = pivoted(voxelMesh(laptopLid), 0, HINGE.y, HINGE.z);
lidPart.add(screenMesh);
screenMesh.position.set(0, -HINGE.y, -HINGE.z);
model.add(lidPart);
const screenLight = new THREE.PointLight(0x5fe3cb, 0, 12, 1.5);
screenLight.position.set(0, 9, 14);
model.add(screenLight);
let screenGlow = 0;

const lanternLight = new THREE.PointLight(0xffb45e, 0, 14, 1.5);
lanternLight.position.set(L.x, 10, L.z);
model.add(lanternLight);

// Stars, shown only at night
const stars = new THREE.InstancedMesh(
  new THREE.BoxGeometry(0.5, 0.5, 0.5),
  new THREE.MeshBasicMaterial({ color: 0xfff6d8 }),
  24,
);
for (let i = 0; i < 24; i++) {
  const a = rand() * Math.PI * 2;
  const r = 14 + rand() * 12;
  stars.setMatrixAt(i, m4.makeTranslation(Math.cos(a) * r, 30 + rand() * 18, Math.sin(a) * r));
}
model.add(stars);

// Small cubes used for steam and for petals or leaves on the water
const particle = (size, color, opacity) =>
  new THREE.Mesh(
    new THREE.BoxGeometry(...(Array.isArray(size) ? size : [size, size, size])),
    new THREE.MeshLambertMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );

const steam = Array.from({ length: 4 }, (_, j) => {
  const s = particle(1.4, 0xffffff, 0);
  const a = (j / 4) * Math.PI * 2 + 0.4;
  s.userData = { x: Math.cos(a) * 12, z: Math.sin(a) * 12, t: j / 4 };
  model.add(s);
  return s;
});

// Petals or leaves floating on the water, drifting slowly around the monkey
const floaters = (S.float || []).flatMap((color) =>
  Array.from({ length: 3 }, () => {
    const f = particle([1, 0.2, 0.8], color, 1);
    f.userData = { a: rand() * Math.PI * 2, r: 10.5 + rand() * 3 };
    model.add(f);
    return f;
  }),
);

// Ripples that spread across the water when the monkey moves
const RIPPLE_SEGMENTS = 56;
const ripples = [0, 0.35].map((delay) => {
  const mat = new THREE.MeshBasicMaterial({ color: 0xf4fbff, transparent: true, opacity: 0, depthWrite: false });
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.3, 1.2), mat, RIPPLE_SEGMENTS);
  mesh.visible = false;
  model.add(mesh);
  return { mesh, mat, delay };
});
function drawRipple(r, p) {
  r.mesh.visible = p > 0 && p < 1;
  if (!r.mesh.visible) return;
  const radius = 9.5 + p * 5.5;
  for (let i = 0; i < RIPPLE_SEGMENTS; i++) {
    const a = (i / RIPPLE_SEGMENTS) * Math.PI * 2;
    r.mesh.setMatrixAt(i, m4.makeTranslation(Math.round(Math.cos(a) * radius), 0.6, Math.round(Math.sin(a) * radius) - 1));
  }
  r.mesh.instanceMatrix.needsUpdate = true;
  r.mat.opacity = 1 - p * p;
}

// A heart that floats up when the monkey is petted
const heart = new THREE.Group();
// Unlit, so it stays bright pink at night too
const heartMat = new THREE.MeshBasicMaterial({ color: 0xff6f91, transparent: true, opacity: 0, depthWrite: false });
[".x.x.", "xxxxx", "xxxxx", ".xxx.", "..x.."].forEach((row, i) =>
  [...row].forEach((ch, j) => {
    if (ch !== "x") return;
    const v = new THREE.Mesh(cube, heartMat);
    v.position.set(j - 2, -i, 0);
    heart.add(v);
  }),
);
heart.visible = false;
model.add(heart);

// Two voxel Zs that drift up from the head while the monkey sleeps
const zs = [0, 1.2].map((delay) => {
  const g = new THREE.Group();
  const zMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  ["xxxxx", "...x.", "..x..", ".x...", "xxxxx"].forEach((row, i) =>
    [...row].forEach((ch, j) => {
      if (ch !== "x") return;
      const v = new THREE.Mesh(cube, zMat);
      v.position.set(j - 2, 2 - i, 0);
      g.add(v);
    }),
  );
  g.visible = false;
  g.userData = { delay, mat: zMat };
  model.add(g);
  return g;
});

const hemi = new THREE.HemisphereLight();
const sun = new THREE.DirectionalLight();
sun.position.set(-14, 22, 10);
// The sun (the moon at night) casts shadows from the monkey, tree and lantern
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 70 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
scene.add(hemi, sun);

// Day in the light theme, night with a lit lantern and stars in the dark theme
function applyTheme() {
  const night = darkScheme.matches;
  hemi.color.setHex(night ? 0x9fb2d6 : 0xffffff);
  hemi.groundColor.setHex(night ? 0x1d2433 : 0x8a93a3);
  hemi.intensity = night ? 0.9 : 1.6;
  sun.color.setHex(night ? 0xb8c8f0 : 0xffffff);
  sun.intensity = night ? 0.6 : 1.6;
  waterMat.color.setHex(night ? 0x3b6f96 : 0x7fb3d5);
  windowMat.color.setHex(night ? 0xffd27a : 0xcfc6b4);
  lanternLight.intensity = night ? 30 : 0;
  screenOn.setHex(night ? 0x7af5dc : C.screen);
  screenGlow = night ? 7 : 3;
  stars.visible = night;
  for (const z of zs) z.userData.mat.color.setHex(night ? 0xc9d1dc : 0x5b6574);
}
darkScheme.addEventListener("change", applyTheme);
applyTheme();

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
camera.position.set(20, 16, 28);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 5.5, 0);
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = true;
controls.autoRotate = !reduceMotion;
controls.autoRotateSpeed = 1.2;
controls.minPolarAngle = 0.4;
controls.maxPolarAngle = 1.35;

function resize() {
  const s = box.clientWidth;
  renderer.setSize(s, s);
  const half = 14;
  Object.assign(camera, { left: -half, right: half, top: half, bottom: -half });
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(box);
resize();

// Petting: a click on the monkey (not a drag), or Enter or Space when it has focus.
// It shuts its eyes, sways, the water ripples and a heart floats up.
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let down = null;
let pet = -1;
renderer.domElement.addEventListener("pointerdown", (e) => (down = [e.clientX, e.clientY]));
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  if (raycaster.intersectObject(monkeyGroup, true).length) startPet();
});
box.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  startPet();
});

// The monkey dozes off when nobody has played with it for 20 seconds, and sleeps from
// midnight to 6 am Kyiv time until someone pets it. Pointing at it or focusing it wakes
// it from a doze; petting keeps it awake for a minute, even at night.
// Uses the wall clock: the scene's own time stops while it is scrolled out of view.
const IDLE = 20;
const now = () => performance.now() / 1000;
let lastActive = now();
let wakeUntil = 0;
renderer.domElement.addEventListener("pointermove", () => (lastActive = now()));
box.addEventListener("focus", () => (lastActive = now()));
const kyivHour = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", hour: "numeric", hourCycle: "h23" });
const nightInKyiv = () => Number(kyivHour.format(new Date())) < 6;

function startPet() {
  if (pet >= 0) return;
  pet = 0;
  wakeUntil = now() + 60;
  lastActive = now();
}

let nextBlink = 2;
let rest = 0;
let wasAsleep = false;
let sinkRipple = -1;
const SINK = 8;
let onScreen = true;
new IntersectionObserver(([e]) => (onScreen = e.isIntersecting)).observe(box);

const clock = new THREE.Clock();
let t = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (!onScreen) return;
  t += dt;

  for (const s of steam) {
    const p = reduceMotion ? 0.3 : (t * 0.15 + s.userData.t) % 1;
    s.position.set(s.userData.x + Math.sin(p * 6 + s.userData.t * 9) * 1.2, 2 + p * 20, s.userData.z);
    s.material.opacity = 0.45 * Math.sin(p * Math.PI);
  }

  for (const f of floaters) {
    const u = f.userData;
    const a = u.a + (reduceMotion ? 0 : t * 0.05);
    f.position.set(Math.cos(a) * u.r, 0.6, Math.sin(a) * u.r - 1);
    f.rotation.y = a * 2;
  }

  if (pet >= 0) {
    pet += dt;
    const k = Math.max(0, 1 - pet / 1.4);
    monkeyGroup.rotation.z = reduceMotion ? 0 : Math.sin(pet * 9) * 0.05 * k;
    // The heart turns to face the camera, rises and fades
    heart.visible = true;
    heart.quaternion.copy(camera.quaternion);
    heart.position.set(0, 33 + pet * 2.5, 0);
    heart.scale.setScalar(Math.min(pet * 5, 1));
    heartMat.opacity = pet < 0.7 ? 1 : Math.max(0, 1 - (pet - 0.7) / 0.7);
    for (const r of ripples) drawRipple(r, reduceMotion ? 0 : (pet - r.delay) / 1);
    // The water level bobs a little with the sway
    waterMesh.position.y = reduceMotion ? 0 : Math.sin(pet * 9) * 0.25 * k;
    if (pet >= 1.4) {
      pet = -1;
      heart.visible = false;
      monkeyGroup.rotation.z = 0;
      for (const r of ripples) r.mesh.visible = false;
      waterMesh.position.y = 0;
    }
  }

  // Asleep: eyes shut, slow breathing and Zs; otherwise blink now and then
  const asleep = pet < 0 && now() > wakeUntil && (now() - lastActive > IDLE || nightInKyiv());
  // Asleep, the laptop closes and the monkey sinks into the water up to its chin, arms tucked under,
  // the way snow monkeys doze in a hot spring. Going under sends rings across the water.
  if (asleep && !wasAsleep) sinkRipple = 0;
  wasAsleep = asleep;
  rest += ((asleep ? 1 : 0) - rest) * (reduceMotion ? 1 : Math.min(1, dt * 1.5));
  lidPart.rotation.x = (-Math.PI / 2) * rest;
  screenMat.color.copy(screenOn).lerp(screenOff, rest);
  monkeyGroup.position.y = -SINK * rest;
  if (sinkRipple >= 0 && pet < 0) {
    sinkRipple += dt;
    for (const r of ripples) drawRipple(r, reduceMotion ? 0 : (sinkRipple - r.delay) / 1.4);
    if (sinkRipple > 2) {
      sinkRipple = -1;
      for (const r of ripples) r.mesh.visible = false;
    }
  }
  for (const arm of armParts) arm.rotation.x = 1.0 * rest;
  // The screen light flickers a little, like a page scrolling, and goes out with the lid
  screenLight.intensity = screenGlow * (1 - rest) * (reduceMotion ? 1 : 0.9 + 0.1 * Math.sin(t * 7) * Math.sin(t * 2.3));
  // Breathing: quick and shallow while awake, slow and deep while asleep
  monkeyGroup.scale.y = reduceMotion ? 1 : asleep ? 1 + Math.sin(t * 1.4) * 0.014 : 1 + Math.sin(t * 2.4) * 0.006;
  for (const z of zs) {
    const p = ((t + z.userData.delay) % 2.4) / 2.4;
    z.visible = asleep;
    if (!asleep) continue;
    const q = reduceMotion ? 0.5 : p;
    z.quaternion.copy(camera.quaternion);
    z.position.set(7 + q * 3, 26 - SINK * rest + q * 5, 2);
    z.scale.setScalar(0.35 + q * 0.4);
    z.userData.mat.opacity = reduceMotion ? 0.8 : Math.sin(p * Math.PI) * 0.9;
  }

  if (pet >= 0) lidMesh.visible = pet < 1.2;
  else if (asleep) lidMesh.visible = true;
  else if (!reduceMotion) {
    lidMesh.visible = t > nextBlink && t < nextBlink + 0.14;
    if (t > nextBlink + 0.14) nextBlink = t + 2.5 + Math.random() * 3.5;
  }

  controls.update(dt);
  renderer.render(scene, camera);
});
// Only a scene that has been built is a button: without WebGL or the script it stays an empty box
box.setAttribute("role", "button");
box.setAttribute("tabindex", "0");
box.setAttribute("aria-label", "Pet the monkey");
box.title = "Pet the monkey";
box.classList.add("ready");

// --- The hot spring at the foot of the page ---
// The same monkey a few times over, and a little one, soaking up to the shoulders in a long
// pool with rocks behind it and steam rising. Drawn by its own renderer, only while the foot
// of the page is in view.
const onsenBox = document.querySelector(".onsen");
if (onsenBox) {
  const LEVEL = 10; // the water comes up to the shoulders
  const DEEP = 9; // the oval pool's half depth, front to back; its half length follows the window
  const foot = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  foot.setPixelRatio(Math.min(devicePixelRatio, 2));
  foot.domElement.setAttribute("aria-hidden", "true");
  onsenBox.appendChild(foot.domElement);
  const footScene = new THREE.Scene();

  // Murkier than the water at the top, so the bodies under it don't show as grey shapes
  const footWater = waterMat.clone();
  footWater.opacity = 0.88;

  // The same light as the scene at the top, day or night
  const footHemi = new THREE.HemisphereLight();
  const footSun = new THREE.DirectionalLight();
  footSun.position.set(-14, 22, 10);
  footScene.add(footHemi, footSun);
  const syncLight = () => {
    footWater.color.copy(waterMat.color);
    footHemi.color.copy(hemi.color);
    footHemi.groundColor.copy(hemi.groundColor);
    footHemi.intensity = hemi.intensity;
    footSun.color.copy(sun.color);
    footSun.intensity = sun.intensity;
    lanternGlow.intensity = lanternLight.intensity;
  };


  // The pool: water all across the front, running out past the bottom of the page as if you
  // stood in it, and a shore only at the back, winding in coves and points. Stones line
  // the shore and stony ground lies behind them, carrying the season (snow in winter, a
  // scatter of petals, moss or leaves otherwise). Water and shore run on past both sides of
  // the page too. It is rebuilt to the width of the window from the same seed, so nothing
  // jumps when the window is resized.
  const GROUND = { winter: [C.snow, 0xeef1f5, 0xe2e7ee] }[SEASON] || [0x9a9fa6, 0x8d9097, 0xa6abb1];
  function buildPool(long) {
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const pick = (list) => list[Math.floor(r() * list.length)];
    // Where the shore is, from left to right: it winds back into coves and out into points
    const shore = (x) => -DEEP - 2 + 2.5 * (x / (long + 30)) ** 2 + 3.5 * Math.sin(x * 0.045 + 0.7) + 2 * Math.sin(x * 0.11 + 2.1);
    const map = new Map();
    vox = map;
    for (let x = -long - 30; x <= long + 30; x++) {
      const edge = Math.round(shore(x));
      const depth = 9 + Math.floor(r() * 4);
      for (let z = edge - depth; z <= edge; z++) {
        const sprinkle = SEASON !== "winter" && r() < S.cells * 0.12;
        put(x, LEVEL - 1, z, sprinkle ? pick(S.ground) : pick(GROUND));
        for (let y = LEVEL - 4; y < LEVEL - 1; y++) put(x, y, z, pick(C.rock));
      }
    }
    const boulder = (cx, cz, rx, top, rz) =>
      ellipsoid(Math.round(cx), LEVEL - 1, Math.round(cz), rx, top - LEVEL + 1, rz, () => pick(C.rock));
    // Stones of much the same height along the shore, and now and then a few running out into
    // the water as a point
    for (let x = -long - 30; x <= long + 30; x += 2.6 + r() * 2) {
      boulder(x, shore(x) - r(), 2.4 + r() * 1.6, LEVEL + 2.5 + r() * 1.5, 2 + r());
      if (r() < 0.15) boulder(x + 2, shore(x) - 5, 3 + r() * 1.5, LEVEL + 4 + r() * 2, 3);
      if (r() < 0.07)
        for (let k = 1; k <= 3; k++) boulder(x + (r() - 0.5) * 3, shore(x) + k * 2, 2.6 - k * 0.5 + r(), LEVEL + 2.2 - k * 0.6, 2);
    }
    // The season on some of the stones, sparser than at the top
    const tops = new Map();
    for (const k of map.keys()) {
      const [x, y, z] = parse(k);
      if (y >= LEVEL && !(tops.get(`${x},${z}`) >= y)) tops.set(`${x},${z}`, y);
    }
    for (const [xz, y] of tops) {
      if (r() > S.rocks * 0.3) continue;
      const [x, z] = xz.split(",").map(Number);
      map.set(key(x, y + 1, z), pick(S.ground));
    }
    vox = monkey;
    // One sheet of water from under the shore to well past the bottom of the view
    const water = new THREE.Mesh(new THREE.BoxGeometry(2 * long + 90, 1, 140), footWater);
    water.position.set(0, LEVEL - 0.9, 70 - DEEP - 4);
    const part = new THREE.Group();
    part.add(water, voxelMesh(map));
    part.userData.shore = shore;
    return part;
  }
  let pool = null;
  let poolLong = 0;

  // The stone lantern and the tree, lifted out of the scene at the top
  const lift = (keep) => {
    const map = new Map();
    for (const [k, c] of scenery) if (keep(...parse(k), c)) map.set(k, c);
    return map;
  };
  const near = (x, z, at, r) => Math.abs(x - at.x) <= r && Math.abs(z - at.z) <= r;
  const lantern = voxelMesh(lift((x, y, z) => near(x, z, L, 2) && (y >= 5 || near(x, z, L, 1))));
  const lanternWindows = new THREE.InstancedMesh(cube, windowMat, windows.length);
  windows.forEach((p, i) => lanternWindows.setMatrixAt(i, m4.makeTranslation(...p)));
  const lanternGlow = new THREE.PointLight(0xffb45e, 0, 14, 1.5);
  lanternGlow.position.set(L.x, 10, L.z);
  const lanternPart = new THREE.Group();
  lanternPart.add(lantern, lanternWindows, lanternGlow);
  // The whole trunk (or bamboo stalks) down to the rocks, and the leaves above the ground cover
  const TREE = new Set([BARK, ...(S.canopy || []), 0x5c8746, 0x7fae5e, 0x6d9a52]);
  const STALKS = new Set(["10,-14", "13,-12", "14,-16"]);
  const treePart = voxelMesh(
    lift((x, y, z, c) => near(x, z, T, 9) && TREE.has(c) && (c === BARK || y >= 6 || (SEASON === "summer" && STALKS.has(`${x},${z}`)))),
  );
  // A second lantern and tree for very wide windows, sharing the first ones' meshes
  const lanternPart2 = lanternPart.clone();
  const treePart2 = new THREE.Mesh(treePart.geometry, treePart.material);
  footScene.add(lanternPart, treePart, lanternPart2, treePart2);

  // Things around the spring, built from voxels like the rest: a wooden bucket and ladle,
  // a ♨ sign, a bamboo spout pouring into the water, and something of the season
  const WOOD = 0xa0784f;
  const WOOD_DARK = 0x7a5a3a;
  const BOARD = 0xd9c29a;
  const MARK = 0xc23a22;
  const BAMBOO = [0x7fae5e, 0x5c8746];
  // Each stands on a flat rock at the water's edge, so the shore stones don't hide it
  const build = (make, slab = 4) => {
    const map = new Map();
    vox = map;
    if (slab) ellipsoid(0, -2, 0, slab, 2, slab - 0.5, () => C.rock[Math.floor(rand() * C.rock.length)]);
    make();
    vox = monkey;
    return voxelMesh(map);
  };

  const bucket = build(() => {
    for (let y = 0; y <= 3; y++)
      for (let x = -3; x <= 3; x++)
        for (let z = -3; z <= 3; z++) {
          const d = Math.hypot(x, z);
          if (d <= 2.6 && (y === 0 || d >= 1.6)) put(x, y, z, y === 1 || y === 3 ? WOOD_DARK : WOOD);
        }
    // The ladle lies beside it
    ellipsoid(5, 0, 2, 1.2, 0.8, 1.2, WOOD);
    block(6, 10, 0, 0, 2, 2, WOOD_DARK);
  });

  // ♨ on a board between two posts
  const SIGN = ["..x.x.x..", ".x.x.x...", "..x.x.x..", ".........", "x.......x", ".x.....x.", "..xxxxx.."];
  const sign = build(() => {
    block(-5, -5, 0, 6, 0, 0, WOOD_DARK);
    block(5, 5, 0, 6, 0, 0, WOOD_DARK);
    for (let x = -5; x <= 5; x++)
      for (let y = 6; y <= 14; y++) put(x, y, 0, x === -5 || x === 5 || y === 6 || y === 14 ? WOOD_DARK : BOARD);
    SIGN.forEach((row, r) => [...row].forEach((c, i) => c === "x" && put(i - 4, 13 - r, 1, MARK)));
  });

  // A bamboo post with a pipe reaching out over the water
  const SPOUT = { y: 6, z: 8 }; // where the water leaves the pipe
  const spout = build(() => {
    for (let y = 0; y <= 8; y++) block(0, 1, y, y, 0, 1, y % 3 === 0 ? BAMBOO[1] : BAMBOO[0]);
    for (let z = 0; z <= SPOUT.z; z++) block(0, 1, 7 - Math.round(z / 8), 7 - Math.round(z / 8), z, z, z % 4 === 0 ? BAMBOO[1] : BAMBOO[0]);
  }, 3);
  const dropMat = new THREE.MeshLambertMaterial({ color: 0xd6ecf7, transparent: true, opacity: 0.85, depthWrite: false });
  const drops = Array.from({ length: 8 }, (_, i) => {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.6), dropMat);
    d.userData.at = i / 8;
    footScene.add(d);
    return d;
  });
  const splash = [0, 0.75].map((delay) => {
    const mat = new THREE.MeshBasicMaterial({ color: 0xf4fbff, transparent: true, opacity: 0, depthWrite: false });
    const ring = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.2, 0.7), mat, 20);
    footScene.add(ring);
    return { ring, mat, delay };
  });

  // Something of the season: a snowman, a heap of fallen leaves, a butterfly or a dragonfly
  const seasonal = new THREE.Group();
  let flyer = null;
  if (SEASON === "winter")
    seasonal.add(
      build(() => {
        ellipsoid(0, 2, 0, 2.6, 2.4, 2.6, C.snow);
        ellipsoid(0, 5.6, 0, 1.8, 1.7, 1.8, C.snow);
        put(-1, 6, 2, C.eye);
        put(1, 6, 2, C.eye);
        put(0, 5, 2, 0xe0782c);
        put(0, 5, 3, 0xe0782c);
        for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) put(sx * (3 + k), 3 + k, 0, BARK);
      }),
    );
  else if (SEASON === "autumn")
    seasonal.add(build(() => ellipsoid(0, 0, 0, 4, 2, 3, () => S.canopy[Math.floor(rand() * S.canopy.length)])));
  else {
    // A butterfly in spring, a dragonfly in summer, flitting about over the water
    const spring = SEASON === "spring";
    flyer = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, spring ? 1.4 : 3.2),
      new THREE.MeshLambertMaterial({ color: spring ? 0x5b4636 : 0x2f8a96 }),
    );
    flyer.add(body);
    const wingMat = new THREE.MeshLambertMaterial({
      color: spring ? 0xf9cfdb : 0xe2f3f6,
      transparent: !spring,
      opacity: spring ? 1 : 0.75,
    });
    flyer.userData.wings = (spring ? [[-1, 0], [1, 0]] : [[-1, -0.5], [1, -0.5], [-1, 0.6], [1, 0.6]]).map(([side, z]) => {
      const pivot = new THREE.Group();
      const wing = new THREE.Mesh(new THREE.BoxGeometry(spring ? 1.6 : 2.4, 0.08, spring ? 1.4 : 0.6), wingMat);
      wing.position.x = side * (spring ? 0.9 : 1.3);
      pivot.position.z = z;
      pivot.userData.side = side;
      pivot.add(wing);
      flyer.add(pivot);
      return pivot;
    });
    flyer.userData.spring = spring;
    flyer.scale.setScalar(1.8);
    flyer.userData.to = new THREE.Vector3();
    flyer.userData.next = 0;
    footScene.add(flyer);
  }
  footScene.add(bucket, sign, spout, seasonal);
  darkScheme.addEventListener("change", syncLight);
  syncLight();

  // The monkeys share the scene's monkey: its body and its eyelids. Here they are cut off just
  // under the water, or their bodies would hang out under the edge of the ground.
  const body = monkeyGroup.children[0];
  foot.localClippingEnabled = true;
  const underWater = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -(LEVEL - 1.5))];
  const bodyMat = body.material.clone();
  const lidMat = lidMesh.material.clone();
  bodyMat.clippingPlanes = lidMat.clippingPlanes = underWater;
  const soaker = (scale, turn, sleepy) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(body.geometry, bodyMat));
    const lid = new THREE.Mesh(lidMesh.geometry, lidMat);
    lid.visible = sleepy;
    g.add(lid);
    g.scale.setScalar(scale);
    g.rotation.y = turn;
    footScene.add(g);
    // Placed so the water line falls at the same height on the monkey at any size
    return { g, lid, sleepy, base: LEVEL * (1 - scale) - (sleepy ? 2 : 0), phase: Math.random() * 6, blink: 2 + Math.random() * 4 };
  };
  // A few monkeys, each up to something of its own: a mother dozing with her little one, one
  // looking about, one that dips under to the eyes now and then, and on very wide screens one
  // more, all of them facing you
  const mother = soaker(1.05, 0.25, true);
  const little = soaker(0.55, -0.6, false);
  const looker = Object.assign(soaker(1, 0.3, false), { look: true });
  const dipper = Object.assign(soaker(0.92, -0.2, false), { dip: true });
  const away = soaker(0.95, -0.35, false);
  const soakers = [mother, little, looker, dipper, away];

  // Steam: each wisp rises at its own pace, to its own height, swaying its own way, and when it
  // has faded it starts again somewhere new, more often near a monkey, so nothing repeats
  const footSteam = Array.from({ length: 26 }, () => {
    const s = particle(1, 0xffffff, 0);
    s.userData = { p: Math.random() };
    footScene.add(s);
    return s;
  });
  function puff(s, fresh) {
    const u = s.userData;
    const near = soakers.filter((m) => m.g.visible);
    const x =
      near.length && Math.random() < 0.6
        ? near[Math.floor(Math.random() * near.length)].g.position.x + (Math.random() - 0.5) * 20
        : (Math.random() * 2 - 1) * poolLong * 0.95;
    Object.assign(u, {
      x,
      z: 9 - Math.random() * 16,
      p: fresh ? Math.random() : 0,
      speed: 0.06 + Math.random() * 0.08,
      rise: 14 + Math.random() * 14,
      drift: (Math.random() - 0.5) * 6,
      sway: 0.8 + Math.random() * 1.6,
      swayAt: Math.random() * 6,
      peak: 0.45 + Math.random() * 0.35,
    });
    s.scale.setScalar(1.1 + Math.random() * 1.3);
  }
  const footFloat = (S.float || []).flatMap((color) =>
    Array.from({ length: 4 }, () => {
      const f = particle([1.4, 0.3, 1.1], color, 1);
      f.userData = { at: Math.random(), z: -10 + Math.random() * 20, speed: 0.004 + Math.random() * 0.004 };
      footScene.add(f);
      return f;
    }),
  );
  const steamColor = () => (darkScheme.matches ? 0x9aa9ba : 0xd8e0e8);
  darkScheme.addEventListener("change", () => footSteam.forEach((s) => s.material.color.setHex(steamColor())));
  footSteam.forEach((s) => s.material.color.setHex(steamColor()));

  const footCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  // Straight on, so the shore runs level across the page
  footCam.position.set(0, 62, 90);
  footCam.lookAt(0, LEVEL + 13, 0);
  let span = 0; // half the width of the pool in view
  function fit() {
    const w = onsenBox.clientWidth;
    const h = onsenBox.clientHeight;
    foot.setSize(w, h);
    // The same scale at any height: 19 units for every 120px
    const half = (19 * h) / 240;
    span = (half * w) / h;
    Object.assign(footCam, { left: -span, right: span, top: half, bottom: -half });
    footCam.updateProjectionMatrix();
    const wide = span > 60;
    // The pool fills the width, its rounded ends just inside the page (on a phone, at the edges)
    const long = Math.round(wide ? span - 9 : span - 3);
    if (Math.abs(long - poolLong) > 2) {
      if (pool) {
        footScene.remove(pool);
        pool.traverse((o) => o.geometry?.dispose());
        pool.children[1].material.dispose();
      }
      pool = buildPool(long);
      poolLong = long;
      footScene.add(pool);
    }
    // The lantern and the tree stand on the shore, toward the ends
    const shore = pool.userData.shore;
    const onShore = (part, x, back, at) => part.position.set(x - at.x, LEVEL - 1, shore(x) - back - at.z);
    onShore(lanternPart, -0.72 * long, 7, L);
    onShore(treePart, 0.74 * long, 8, T);
    const roomy = long > 105;
    lanternPart2.visible = treePart2.visible = roomy;
    onShore(lanternPart2, 0.3 * long, 7, L);
    onShore(treePart2, -0.33 * long, 9, T);
    // The new things on the shore; on a phone only the sign and the season's thing fit
    const ground = (part, x, back, lift = 3) => part.position.set(x, LEVEL + lift, shore(x) - back);
    bucket.visible = spout.visible = wide;
    ground(bucket, -0.45 * long, 0);
    ground(sign, wide ? 0.2 * long : 4, 6, 0);
    ground(spout, 0.64 * long, 0);
    ground(seasonal, wide ? -0.24 * long : -4, 0);
    if (flyer) flyer.userData.home = new THREE.Vector3(wide ? 0.32 * long : -2, LEVEL + 8, 10);
    // Spread unevenly and at different distances from the shore; the fourth grown-up only on
    // very wide screens. On a phone, the one looking about and the little one.
    for (const m of soakers) m.g.visible = false;
    const place = (m, x, z) => {
      m.g.visible = true;
      m.g.position.set(x, m.g.position.y, z);
    };
    if (wide) {
      place(looker, -0.62 * long, 5);
      place(mother, -0.06 * long, 8);
      place(little, -0.06 * long + 15, 10);
      place(dipper, 0.5 * long, 4);
      if (long > 105) place(away, 0.82 * long, 9);
    } else {
      place(looker, -10, 7);
      place(little, 11, 9);
    }
    footSteam.forEach((s) => puff(s, true));
    draw(0);
  }

  const footClock = new THREE.Clock();
  let ft = 0;
  function draw(dt) {
    ft += dt;
    for (const m of soakers) {
      let y = m.base;
      if (!reduceMotion) {
        // The little one bobs quicker
        y += Math.sin(ft * (m === little ? 1.6 : 0.9) + m.phase) * 0.35;
        // Every fourteen seconds or so, under to the eyes and back up
        const dive = (ft + m.phase) % 14;
        if (m.dip && dive < 3) y -= 6 * Math.sin((dive / 3) * Math.PI);
        // Turning slowly from side to side, lingering at each end
        if (m.look) m.g.rotation.y = 0.3 + 0.65 * Math.sin(ft * 0.3 + m.phase) ** 3;
      }
      m.g.position.y = y;
      if (!m.sleepy) m.lid.visible = !reduceMotion && (ft + m.phase) % m.blink < 0.14;
    }
    for (const s of footSteam) {
      const u = s.userData;
      if (!reduceMotion) {
        u.p += dt * u.speed;
        if (u.p >= 1) puff(s, false);
      }
      const p = u.p;
      s.position.set(u.x + u.drift * p + Math.sin(ft * u.sway + u.swayAt) * 1.2 * p, LEVEL + 0.5 + p * u.rise, u.z);
      s.rotation.y = u.swayAt + p * 2;
      s.material.opacity = u.peak * Math.sin(p * Math.PI) ** 1.5;
    }
    for (const f of footFloat) {
      const u = f.userData;
      const a = (u.at + (reduceMotion ? 0 : ft * u.speed)) % 1;
      // Drifting along the oval, never over its rim
      const x = (a * 2 - 1) * poolLong * 0.85;
      f.position.set(x, LEVEL - 0.2, u.z * 0.6 + 3);
      f.rotation.y = a * 20;
    }
    // Water pouring from the spout, rings spreading where it lands
    const out = spout.position;
    for (const d of drops) {
      d.visible = spout.visible;
      const p = reduceMotion ? d.userData.at : (ft * 1.6 + d.userData.at) % 1;
      d.position.set(out.x + 0.5, out.y + SPOUT.y - p * (out.y + SPOUT.y - LEVEL + 0.6), out.z + SPOUT.z + 0.5 + p * 0.6);
    }
    for (const { ring, mat, delay } of splash) {
      ring.visible = spout.visible && !reduceMotion;
      if (!ring.visible) continue;
      const p = ((ft + delay) % 1.5) / 1.5;
      const r = 0.8 + p * 4;
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        ring.setMatrixAt(i, m4.makeTranslation(out.x + Math.cos(a) * r, LEVEL - 0.3, out.z + SPOUT.z + 1.1 + Math.sin(a) * r * 0.8));
      }
      ring.instanceMatrix.needsUpdate = true;
      mat.opacity = 0.7 * (1 - p);
    }
    // The butterfly or the dragonfly: wanders, flapping, or darts and hovers
    if (flyer && flyer.userData.home) {
      const u = flyer.userData;
      if (ft > u.next) {
        u.to.copy(u.home).add(new THREE.Vector3((Math.random() - 0.5) * 30, Math.random() * 6, (Math.random() - 0.5) * 8));
        u.next = ft + (u.spring ? 1.5 : 2.5) + Math.random() * 2;
      }
      if (reduceMotion) flyer.position.copy(u.home);
      else flyer.position.lerp(u.to, Math.min(1, dt * (u.spring ? 1.2 : 4)));
      if (u.spring && !reduceMotion) flyer.position.y += Math.sin(ft * 7) * 0.08;
      const heading = Math.atan2(u.to.x - flyer.position.x, u.to.z - flyer.position.z);
      flyer.rotation.y += (heading - flyer.rotation.y) * Math.min(1, dt * 4);
      const flap = reduceMotion ? 0.3 : Math.sin(ft * (u.spring ? 12 : 40)) * (u.spring ? 0.9 : 0.4);
      for (const w of u.wings) w.rotation.z = w.userData.side * flap;
    }
    foot.render(footScene, footCam);
  }

  onsenBox.classList.add("ready");
  new ResizeObserver(fit).observe(onsenBox);
  darkScheme.addEventListener("change", () => draw(0));
  if (!reduceMotion)
    new IntersectionObserver(([e]) => {
      footClock.getDelta();
      foot.setAnimationLoop(e.isIntersecting ? () => draw(Math.min(footClock.getDelta(), 0.1)) : null);
    }).observe(onsenBox);
}
