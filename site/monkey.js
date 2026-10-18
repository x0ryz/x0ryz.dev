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

// The head is its own part, so it can turn to look around: the head and cheek fur from the
// chin up, the ears, and whatever sits on top
const NECK = { y: 11, z: 0 };
const inHead = (x, y, z) =>
  y >= NECK.y &&
  (y >= 17 ||
    (x / 11) ** 2 + ((y - 14.5) / 5.5) ** 2 + ((z - 0.5) / 6.5) ** 2 <= 1 ||
    (x / 9) ** 2 + ((y - 18) / 8.5) ** 2 + (z / 8) ** 2 <= 1);
const head = new Map();
for (const [k, c] of monkey) {
  if (!inHead(...parse(k))) continue;
  head.set(k, c);
  monkey.delete(k);
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
// The scene is drawn in a dock fixed to the window. It sits exactly over its place in the
// intro, and once the intro scrolls away it shrinks into the corner and keeps you company,
// where the window is wide enough to leave the corner free of text.
const dock = document.createElement("div");
dock.className = "monkey-dock";
dock.appendChild(renderer.domElement);
document.body.appendChild(dock);

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
// Parts that turn around a pivot: the mesh is offset back so the group sits at the pivot
function pivoted(mesh, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  mesh.position.set(-x, -y, -z);
  group.add(mesh);
  return group;
}
const headPart = pivoted(voxelMesh(head), 0, NECK.y, NECK.z);
headPart.rotation.order = "YXZ";
monkeyGroup.add(headPart);
// A lid for each eye, so the monkey can peek with one eye while it sleeps
const lidMeshes = [-1, 1].map((s) => {
  const eye = new Map([...lids].filter(([k]) => Math.sign(parse(k)[0]) === s));
  const mesh = voxelMesh(eye, (x, y, z) => eye.has(key(x, y, z)) || head.has(key(x, y, z)));
  mesh.position.set(0, -NECK.y, -NECK.z);
  mesh.visible = false;
  headPart.add(mesh);
  return mesh;
});
const armParts = [-1, 1].map((s) => {
  const part = pivoted(voxelMesh(arms.get(s)), s * SHOULDER.x, SHOULDER.y, SHOULDER.z);
  part.children[0].material.clippingPlanes = poolFloor;
  monkeyGroup.add(part);
  return part;
});
monkeyGroup.traverse((mesh) => mesh.material && (mesh.material.clippingPlanes = poolFloor));
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

// Now and then something lands on the monkey's head: a snowflake, a petal or a leaf.
// It sits there for a moment, then the monkey shakes it off. A visit only starts when the
// monkey will stay awake until it is over, and shaking wakes the monkey up again, so it
// never dozes off around the time a visitor comes.
const visitor = particle(
  SEASON === "winter" ? 1.4 : [2, 0.4, 1.6],
  { winter: C.snow, spring: 0xf6b6c9, summer: 0x7fae5e, autumn: 0xe0782c }[SEASON],
  0,
);
headPart.add(visitor);
// The top of the head, over the snow cap in winter, from the neck
const HEAD_TOP = (SEASON === "winter" ? 30 : 28.4) - NECK.y;
const FALL = 2.5;
const SIT = 4.5;
const SHAKE = 0.8;
let visit = -1;
let perch = [0, 0];
let fling = 1;
let shake = 0;

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
  dock.style.width = dock.style.height = `${s}px`;
  const half = 14;
  Object.assign(camera, { left: -half, right: half, top: half, bottom: -half });
  camera.updateProjectionMatrix();
}
resize();

const DOCK = 200;
const GAP = 16;
const roomy = matchMedia("(min-width: 56rem) and (min-height: 30rem)");
const firstBody = document.querySelector(".row .body");
function canDock() {
  if (reduceMotion || !roomy.matches || !firstBody) return false;
  // Text keeps to the measure (42rem); the dock needs that much room to its right
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const textEnd = firstBody.getBoundingClientRect().left + rem * 42;
  return innerWidth - textEnd >= DOCK - 30;
}
let placing = false;
function place() {
  placing = false;
  const r = box.getBoundingClientRect();
  let [x, y, scale, p] = [r.left, r.top, 1, 0];
  if (canDock()) {
    // 0 while the intro's spot is in view, 1 once most of it has scrolled away
    const q = Math.min(1, Math.max(0, -r.top / (r.height * 0.7)));
    p = q * q * (3 - 2 * q);
    x += (innerWidth - DOCK - GAP - x) * p;
    y += (innerHeight - DOCK - GAP - y) * p;
    scale += (DOCK / r.width - 1) * p;
  }
  dock.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  // On its way and in the corner it rides over the page, above the section rules
  dock.classList.toggle("docked", p > 0);
}
const schedulePlace = () => placing || ((placing = true), requestAnimationFrame(place));
addEventListener("scroll", schedulePlace, { passive: true });
addEventListener("resize", schedulePlace);
new ResizeObserver(() => (resize(), place())).observe(box);

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
// The first visitor comes soon after the scene shows up, while the monkey is still awake
let nextVisit = now() + 4;
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
new IntersectionObserver(([e]) => (onScreen = e.isIntersecting)).observe(dock);

// Looking around: the head turns toward the pointer anywhere on the page, and back to the
// laptop when the pointer rests for a few seconds or leaves the page
const look = { x: 0, y: 0, at: -Infinity };
const track = (e) => Object.assign(look, { x: e.clientX, y: e.clientY, at: now() });
addEventListener("pointermove", track, { passive: true });
addEventListener("pointerdown", track, { passive: true });
document.documentElement.addEventListener("pointerleave", () => (look.at = -Infinity));
const headCenter = new THREE.Vector3();
const toViewer = new THREE.Vector3();
const lookPlane = new THREE.Plane();
const lookPoint = new THREE.Vector3();
let yaw = 0;
let pitch = 0;
function lookAt() {
  if (reduceMotion || now() - look.at > 4) return null;
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((look.x - r.left) / r.width) * 2 - 1, -((look.y - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  // The pointer on a plane through the head, facing the viewer, then pulled toward the viewer,
  // so the monkey looks out of the picture at it rather than sideways
  monkeyGroup.localToWorld(headCenter.set(0, 18, 0));
  camera.getWorldDirection(toViewer).negate();
  lookPlane.setFromNormalAndCoplanarPoint(toViewer, headCenter);
  if (!raycaster.ray.intersectPlane(lookPlane, lookPoint)) return null;
  lookPoint.addScaledVector(toViewer, 12);
  const d = monkeyGroup.worldToLocal(lookPoint).sub({ x: 0, y: 18, z: 0 });
  return {
    yaw: THREE.MathUtils.clamp(Math.atan2(d.x, d.z), -0.6, 0.6),
    pitch: THREE.MathUtils.clamp(Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.3, 0.35),
    side: Math.sign(d.x) || 1,
    near: Math.abs(pointer.x) < 1.4 && Math.abs(pointer.y) < 1.4,
  };
}

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

  // A visitor on the head: it falls, sits, and is shaken off (or knocked off by a pat)
  const awakeFor = Math.max(nightInKyiv() ? 0 : IDLE - (now() - lastActive), wakeUntil - now());
  if (visit < 0 && !reduceMotion && !asleep && pet < 0 && now() > nextVisit && awakeFor > SIT + SHAKE + 2) {
    visit = 0;
    perch = [(Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3];
    fling = Math.random() < 0.5 ? -1 : 1;
  }
  if (visit >= 0) {
    visit += dt;
    if (asleep && visit < SIT) visit = SIT + SHAKE * 2;
    if (pet >= 0 && visit < SIT) visit = SIT;
    const top = HEAD_TOP;
    if (visit < FALL) {
      // Drifts down, swaying
      const p = visit / FALL;
      visitor.position.set(perch[0] + Math.sin(p * 7) * 1.5 * (1 - p), top + 14 * (1 - p), perch[1]);
      visitor.rotation.set(Math.sin(p * 9) * 0.6 * (1 - p), p * 3, 0);
      visitor.material.opacity = Math.min(1, p * 4);
    } else if (visit < SIT) {
      visitor.position.set(perch[0], top, perch[1]);
      visitor.rotation.set(0, 3, 0);
    } else {
      // The monkey shakes its head and the visitor flies off and fades
      const f = visit - SIT;
      shake = f < SHAKE ? Math.sin(f * 30) * 0.2 * (1 - f / SHAKE) : 0;
      visitor.position.set(perch[0] + fling * f * 7, top + f * 6 - f * f * 9, perch[1] + f * 2);
      visitor.rotation.set(f * 8, f * 5, f * 6);
      visitor.material.opacity = Math.max(0, 1 - f / 1.3);
      if (f > 1.3) {
        visit = -1;
        lastActive = now();
        shake = 0;
        nextVisit = now() + 25 + Math.random() * 20;
      }
    }
  }
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

  // Where the head looks: at the pointer, or down at the laptop. Asleep, it only lifts its head
  // a little to peek at a pointer close by, with the eye on that side.
  const want = lookAt();
  const peek = asleep && want && want.near ? want.side : 0;
  const follow = asleep ? (peek ? 0.5 : 0) : want ? 1 : 0;
  const yawTo = follow ? want.yaw * follow : 0;
  const pitchTo = follow ? want.pitch * follow : asleep ? -0.05 : -0.12;
  const ease = Math.min(1, dt * (asleep ? 3 : 6));
  yaw += (yawTo - yaw) * ease;
  pitch += (pitchTo - pitch) * ease;
  headPart.rotation.set(-pitch, yaw + shake, 0);

  if (pet >= 0) for (const lid of lidMeshes) lid.visible = pet < 1.2;
  else if (asleep) lidMeshes.forEach((lid, i) => (lid.visible = peek !== (i ? 1 : -1)));
  else if (!reduceMotion) {
    for (const lid of lidMeshes) lid.visible = t > nextBlink && t < nextBlink + 0.14;
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
dock.classList.add("ready");
