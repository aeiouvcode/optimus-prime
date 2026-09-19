import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ---------- renderer / scene ----------
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101013);
scene.fog = new THREE.Fog(0x101013, 18, 42);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120);
camera.position.set(6.4, 6.1, 13.6);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 4.7, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 4;
controls.maxDistance = 24;
controls.maxPolarAngle = 1.52;
controls.enablePan = false;

// ---------- lights ----------
const key = new THREE.DirectionalLight(0xfff2df, 2.4);
key.position.set(6, 11, 7);
scene.add(key);
const rim = new THREE.DirectionalLight(0x7fa8ff, 1.7);
rim.position.set(-7, 8, -7);
scene.add(rim);
scene.add(new THREE.HemisphereLight(0xcfc5b2, 0x17171c, 0.55));

// ---------- ground ----------
{
  const g = new THREE.Mesh(
    new THREE.CircleGeometry(34, 64),
    new THREE.MeshStandardMaterial({ color: 0x0c0c0f, roughness: 0.92, metalness: 0.05 })
  );
  g.rotation.x = -Math.PI / 2;
  scene.add(g);
  // soft contact shadow
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const grad = x.createRadialGradient(128, 128, 8, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.85)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.35)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = grad; x.fillRect(0, 0, 256, 256);
  const sh = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 8.5),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })
  );
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.01;
  scene.add(sh);
}

// ---------- materials ----------
const noiseTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const img = x.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 150 + Math.random() * 105;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
})();

function metal(color, rough, met = 1.0) {
  return new THREE.MeshStandardMaterial({
    color, roughness: rough, metalness: met,
    roughnessMap: noiseTex, envMapIntensity: 1.05
  });
}
function paint(color, rough = 0.32) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: rough, metalness: 0.72,
    clearcoat: 0.7, clearcoatRoughness: 0.28, envMapIntensity: 1.1
  });
}
const MAT = {
  silver:   metal(0x9ba0a6, 0.42),
  silverHi: metal(0xb9bec5, 0.3),
  steel:    metal(0x4a4e55, 0.5),
  gunmetal: metal(0x2c2e33, 0.55),
  dark:     metal(0x1d1e22, 0.62),
  blue:     paint(0x1d3f9e),
  blueDeep: paint(0x142c6e, 0.38),
  red:      paint(0xa91f24, 0.34),
  gold:     metal(0xc9973f, 0.38),
  rubber:   metal(0x17181b, 0.85, 0.2),
  eye:      new THREE.MeshStandardMaterial({ color: 0x0b1c33, emissive: 0x5fc4ff, emissiveIntensity: 4.2 })
};

// ---------- flame decal textures ----------
function flameTexture({ bg = '#a91f24', flame = '#1d3f9e', w = 256, h = 256, transparent = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (!transparent) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
  x.fillStyle = flame;
  // hot-rod licks rising from the bottom edge
  const licks = 5;
  for (let i = 0; i < licks; i++) {
    const x0 = (i / licks) * w, x1 = ((i + 1) / licks) * w, xm = (x0 + x1) / 2;
    const tipY = h * (0.18 + 0.28 * Math.abs(Math.sin(i * 2.3)));
    x.beginPath();
    x.moveTo(x0 - w * 0.06, h + 4);
    x.quadraticCurveTo(x0 + (xm - x0) * 0.4, h * 0.72, xm - (xm - x0) * 0.28, h * 0.6);
    x.quadraticCurveTo(xm - 6, h * 0.42, xm, tipY);            // left edge to tip
    x.quadraticCurveTo(xm + 7, h * 0.46, xm + (x1 - xm) * 0.3, h * 0.62);
    x.quadraticCurveTo(x1 - (x1 - xm) * 0.36, h * 0.74, x1 + w * 0.06, h + 4);
    x.closePath(); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const chestFlame = flameTexture({ bg: '#a91f24', flame: '#1d3f9e' });
const redFlameAlpha = flameTexture({ flame: '#a91f24', transparent: true });

// ---------- small builders ----------
function M(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m;
}
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => M(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
const cyl = (rt, rb, h, mat, seg = 20, x = 0, y = 0, z = 0) => M(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
const sph = (r, mat, x = 0, y = 0, z = 0, ws = 24, hs = 18) => M(new THREE.SphereGeometry(r, ws, hs), mat, x, y, z);

function rivetRow(parent, from, to, n, mat = MAT.silverHi, r = 0.028) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const p = new THREE.Vector3().lerpVectors(from, to, t);
    const rv = M(new THREE.CylinderGeometry(r, r, 0.03, 10), mat, p.x, p.y, p.z);
    rv.rotation.x = Math.PI / 2;
    parent.add(rv);
  }
}
// vertical vent slats on a plate face
function vents(parent, x, y, z, n, w, h, gap, mat = MAT.dark) {
  for (let i = 0; i < n; i++) {
    parent.add(box(w, h, 0.04, mat).translateX(x).translateY(y + i * (h + gap)).translateZ(z));
  }
}

// ---------- the build ----------
const turntable = new THREE.Group();
scene.add(turntable);
const bot = new THREE.Group();
turntable.add(bot);

// ===== pelvis / waist =====
{
  const pelvis = new THREE.Group(); bot.add(pelvis);
  pelvis.add(box(1.72, 0.55, 1.06, MAT.silver, 0, 5.18, 0));                 // belt
  pelvis.add(box(0.5, 0.34, 0.14, MAT.gold, 0, 5.2, 0.55));                  // buckle
  pelvis.add(box(1.2, 0.5, 0.9, MAT.gunmetal, 0, 4.82, 0));                  // hip core
  { const axle = cyl(0.24, 0.24, 0.5, MAT.dark, 16); axle.rotation.z = Math.PI / 2; axle.position.set(0, 4.82, 0); pelvis.add(axle); }
  for (const s of [-1, 1]) {
    const skirt = box(0.62, 1.0, 0.12, MAT.blue, s * 0.4, 4.72, 0.56);
    skirt.rotation.x = 0.24; pelvis.add(skirt);                              // front skirt plates
    const side = box(0.14, 0.85, 0.7, MAT.blueDeep, s * 0.98, 4.85, 0);
    side.rotation.z = -s * 0.12; pelvis.add(side);                           // side skirt
    pelvis.add(sph(0.3, MAT.steel, s * 0.78, 4.82, 0));                      // hip joint
  }
  // silver groin plate
  const groin = box(0.5, 0.62, 0.16, MAT.silver, 0, 4.78, 0.5);
  groin.rotation.x = 0.2; pelvis.add(groin);
}

// ===== torso =====
{
  const t = new THREE.Group(); bot.add(t);
  t.add(box(2.05, 1.9, 1.25, MAT.steel, 0, 6.55, 0));                        // chest core
  t.add(box(1.6, 0.9, 1.0, MAT.gunmetal, 0, 5.62, 0));                       // abs core
  // abdominal machinery
  t.add(box(0.9, 0.7, 0.2, MAT.dark, 0, 5.6, 0.5));
  for (let i = 0; i < 3; i++) t.add(box(0.7 - i * 0.12, 0.08, 0.06, MAT.silver, 0, 5.42 + i * 0.18, 0.6));
  { const g = cyl(0.12, 0.12, 0.1, MAT.gold, 14); g.rotation.x = Math.PI / 2; g.position.set(0, 5.92, 0.56); t.add(g); }

  // central grille - the signature Optimus vent between/below the windows
  const grille = new THREE.Group(); t.add(grille);
  grille.add(box(0.52, 1.06, 0.1, MAT.silverHi, 0, 6.42, 0.66));
  for (let i = 0; i < 7; i++) grille.add(box(0.4, 0.075, 0.05, MAT.dark, 0, 6.06 + i * 0.125, 0.72));
  grille.add(box(0.58, 0.09, 0.12, MAT.gold, 0, 6.98, 0.67));                // gold top bar

  for (const s of [-1, 1]) {
    // collarbone blades sweeping from neck to shoulders
    const collar = box(1.15, 0.22, 0.5, MAT.silverHi, s * 0.72, 7.5, 0.32);
    collar.rotation.z = s * 0.34; collar.rotation.y = -s * 0.15; t.add(collar);
    // chest windows: red panels carrying blue flames
    const winMats = [MAT.red, MAT.red, MAT.red, MAT.red,
      new THREE.MeshPhysicalMaterial({ map: chestFlame, roughness: 0.3, metalness: 0.55, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: 1.15 }),
      MAT.red];
    const win = M(new THREE.BoxGeometry(0.98, 1.06, 0.16), winMats, s * 0.63, 6.98, 0.6);
    win.rotation.y = s * 0.3; win.rotation.x = -0.1; t.add(win);
    // silver frame edging around each window
    const frame = box(1.1, 0.12, 0.1, MAT.silver, s * 0.66, 7.56, 0.55);
    frame.rotation.y = s * 0.3; t.add(frame);
    const frameSide = box(0.1, 1.1, 0.1, MAT.silver, s * 1.18, 6.95, 0.42);
    frameSide.rotation.y = s * 0.5; t.add(frameSide);
    // side ribs
    for (let i = 0; i < 3; i++)
      t.add(box(0.1, 0.34, 0.7 - i * 0.1, MAT.silver, s * 1.06, 6.2 + i * 0.42, -0.05 - i * 0.06));
    // pec undershadow
    const under = box(0.9, 0.3, 0.2, MAT.gunmetal, s * 0.62, 6.32, 0.55);
    under.rotation.y = s * 0.28; t.add(under);
  }
  rivetRow(t, new THREE.Vector3(-0.95, 7.62, 0.4), new THREE.Vector3(0.95, 7.62, 0.4), 9);

  // backpack + shoulder stacks
  t.add(box(1.7, 1.7, 0.6, MAT.gunmetal, 0, 6.9, -0.85));
  t.add(box(1.9, 0.4, 0.5, MAT.steel, 0, 7.6, -0.7));
  for (const s of [-1, 1]) for (const off of [0, 0.4]) {
    const st = cyl(0.15, 0.18, 1.6, MAT.silverHi, 18);
    st.position.set(s * (0.55 + off), 8.15, -0.85);
    st.rotation.x = -0.12; st.rotation.z = -s * 0.06;
    t.add(st);
    const band = cyl(0.175, 0.175, 0.12, MAT.gold, 18);
    band.position.set(s * (0.55 + off) + s * 0.03, 8.7, -0.95);
    band.rotation.x = -0.12; band.rotation.z = -s * 0.06;
    t.add(band);
    const tip = cyl(0.13, 0.13, 0.1, MAT.dark, 18);
    tip.position.set(s * (0.55 + off) + s * 0.05, 8.98, -1.05);
    tip.rotation.x = -0.12; t.add(tip);
  }
}

// ===== head =====
{
  const h = new THREE.Group(); h.position.set(0, 8.5, 0); bot.add(h);
  h.add(cyl(0.2, 0.26, 0.35, MAT.dark, 14).translateY(-0.42));               // neck
  // helmet shell
  const shell = sph(0.46, MAT.blue); shell.scale.set(1, 1.08, 1.02); h.add(shell);
  h.add(box(0.62, 0.34, 0.3, MAT.blue, 0, 0.32, 0.06));                      // crown ridge
  // face: silver battle mask
  h.add(box(0.5, 0.52, 0.24, MAT.silverHi, 0, -0.05, 0.32));
  h.add(box(0.4, 0.2, 0.1, MAT.silver, 0, 0.14, 0.42));                      // brow
  // mouthplate with vertical vents
  h.add(box(0.34, 0.3, 0.08, MAT.silver, 0, -0.22, 0.44));
  for (let i = 0; i < 5; i++) h.add(box(0.035, 0.24, 0.03, MAT.dark, -0.11 + i * 0.055, -0.22, 0.485));
  // cheek guards
  for (const s of [-1, 1]) {
    h.add(box(0.1, 0.34, 0.24, MAT.silver, s * 0.27, -0.12, 0.3));
    const fin = box(0.07, 0.66, 0.2, MAT.silver, s * 0.33, 0.62, -0.08);     // antenna spikes
    fin.rotation.z = -s * 0.1; h.add(fin);
    h.add(box(0.1, 0.22, 0.3, MAT.blueDeep, s * 0.4, 0.05, 0));              // ear pods
    const eye = box(0.13, 0.055, 0.03, MAT.eye, s * 0.13, 0.05, 0.45);
    eye.rotation.x = -0.15; h.add(eye);
  }
  // central crest
  const crest = box(0.09, 0.5, 0.44, MAT.blue, 0, 0.42, 0.08);
  crest.rotation.x = -0.12; h.add(crest);
  h.add(box(0.05, 0.4, 0.3, MAT.silverHi, 0, 0.44, 0.12).rotateX(-0.12));    // crest inlay
  h.add(cyl(0.06, 0.02, 0.2, MAT.silverHi, 10).translateY(0.72).translateZ(0.02)); // crest tip
}

// ===== arms =====
for (const s of [-1, 1]) {
  const a = new THREE.Group(); bot.add(a);
  a.add(sph(0.44, MAT.gunmetal, s * 1.52, 7.32, 0));                         // shoulder joint
  // pauldron: big blue arching shell
  const pau = M(new THREE.SphereGeometry(1.0, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.58), MAT.blue);
  pau.scale.set(1.12, 0.95, 1.22); pau.position.set(s * 1.78, 7.62, 0);
  pau.rotation.z = -s * 0.22; a.add(pau);
  const pauIn = sph(0.86, MAT.steel, s * 1.7, 7.45, 0);
  pauIn.scale.set(1.05, 0.8, 1.1); a.add(pauIn);
  // pauldron rim + rivets
  const rimT = M(new THREE.TorusGeometry(1.02, 0.05, 10, 40, Math.PI * 1.2), MAT.silver);
  rimT.position.set(s * 1.78, 7.66, 0); rimT.rotation.x = Math.PI / 2; rimT.rotation.z = -s * 0.2;
  rimT.scale.set(1.12, 1.22, 1); a.add(rimT);
  rivetRow(a, new THREE.Vector3(s * 1.3, 8.28, 0.62), new THREE.Vector3(s * 2.2, 8.28, 0.55), 5);
  // upper arm
  const ua = cyl(0.3, 0.34, 1.15, MAT.silver, 18);
  ua.position.set(s * 1.66, 6.62, 0); ua.rotation.z = -s * 0.06; a.add(ua);
  const bi = box(0.34, 1.0, 0.6, MAT.blue, s * 1.98, 6.66, 0);
  bi.rotation.z = -s * 0.06; a.add(bi);                                      // bicep armor
  a.add(sph(0.3, MAT.dark, s * 1.7, 5.95, 0));                               // elbow
  const spike = M(new THREE.ConeGeometry(0.1, 0.34, 12), MAT.silverHi, s * 1.7, 6.0, -0.34);
  spike.rotation.x = -Math.PI / 2.3; a.add(spike);                           // elbow spike
  // forearm - bulky blue gauntlet
  const fa = box(0.78, 1.45, 0.88, MAT.blue, s * 1.74, 5.05, 0);
  a.add(fa);
  a.add(box(0.82, 0.2, 0.92, MAT.silver, s * 1.74, 5.72, 0));                // forearm top trim
  a.add(box(0.84, 0.16, 0.9, MAT.blueDeep, s * 1.74, 4.36, 0));              // wrist trim
  for (let i = 0; i < 4; i++)                                                // outer vents
    a.add(box(0.05, 0.09, 0.6, MAT.dark, s * 2.15, 4.7 + i * 0.22, 0));
  // red flame decal on outer forearm
  const ff = M(new THREE.PlaneGeometry(0.55, 0.9),
    new THREE.MeshStandardMaterial({ map: redFlameAlpha, transparent: true, roughness: 0.4, metalness: 0.4 }));
  ff.position.set(s * 2.14, 5.0, 0); ff.rotation.y = s * Math.PI / 2; a.add(ff);
  // fist
  a.add(box(0.44, 0.42, 0.5, MAT.gunmetal, s * 1.74, 4.18, 0.06));
  for (let f = 0; f < 4; f++)
    a.add(box(0.09, 0.3, 0.1, MAT.steel, s * 1.74 + (f - 1.5) * 0.11, 3.94, 0.22));
  a.add(box(0.1, 0.26, 0.12, MAT.steel, s * 1.52, 4.14, 0.18).rotateZ(s * 0.5)); // thumb
}

// ===== legs =====
for (const s of [-1, 1]) {
  const l = new THREE.Group(); bot.add(l);
  // thigh
  l.add(box(0.72, 1.45, 0.82, MAT.gunmetal, s * 0.8, 4.0, 0));
  l.add(box(0.78, 1.25, 0.22, MAT.blue, s * 0.8, 4.05, 0.42));               // thigh front plate
  l.add(box(0.2, 1.2, 0.7, MAT.blueDeep, s * 1.18, 4.05, 0));                // thigh outer plate
  l.add(box(0.66, 0.14, 0.7, MAT.silver, s * 0.8, 4.62, 0));                 // thigh top trim
  // knee
  l.add(sph(0.34, MAT.dark, s * 0.82, 3.2, 0.05));
  l.add(box(0.5, 0.42, 0.2, MAT.silverHi, s * 0.82, 3.24, 0.38));
  // shin core + armor
  l.add(box(0.66, 1.85, 0.72, MAT.steel, s * 0.84, 2.15, -0.05));
  l.add(box(0.72, 1.7, 0.24, MAT.blue, s * 0.84, 2.2, 0.38));                // shin front
  l.add(box(0.3, 1.85, 0.85, MAT.blue, s * 1.24, 2.15, 0));                  // shin outer shell
  l.add(box(0.1, 1.5, 0.6, MAT.silver, s * 0.44, 2.2, 0.05));                // inner strut
  // outer shell ridge + red flame
  l.add(box(0.08, 1.2, 0.2, MAT.silverHi, s * 1.4, 2.3, 0.3));
  const sf = M(new THREE.PlaneGeometry(0.5, 1.1),
    new THREE.MeshStandardMaterial({ map: redFlameAlpha, transparent: true, roughness: 0.4, metalness: 0.4 }));
  sf.position.set(s * 1.4, 1.9, -0.05); sf.rotation.y = s * Math.PI / 2; l.add(sf);
  // rear pistons
  for (const off of [-0.14, 0.14]) {
    const p = cyl(0.06, 0.06, 1.5, MAT.silverHi, 10);
    p.position.set(s * 0.84 + off, 2.2, -0.48); l.add(p);
  }
  rivetRow(l, new THREE.Vector3(s * 1.41, 2.9, 0.25), new THREE.Vector3(s * 1.41, 1.5, 0.25), 5);
  // ankle + foot
  l.add(cyl(0.2, 0.24, 0.3, MAT.dark, 14).translateX(s * 0.84).translateY(0.62));
  l.add(box(0.78, 0.42, 1.25, MAT.silver, s * 0.84, 0.32, 0.18));            // foot body
  const toe = box(0.7, 0.3, 0.55, MAT.silverHi, s * 0.84, 0.24, 0.88);
  toe.rotation.x = 0.16; l.add(toe);                                         // toe plate
  const toeFlame = box(0.5, 0.2, 0.3, MAT.red, s * 0.84, 0.18, 1.1);
  toeFlame.rotation.x = 0.2; l.add(toeFlame);                                // red toe accent
  l.add(box(0.7, 0.34, 0.4, MAT.gunmetal, s * 0.84, 0.3, -0.5));             // heel
  for (const off of [-0.22, 0, 0.22])                                        // toe segments
    l.add(box(0.16, 0.12, 0.3, MAT.dark, s * 0.84 + off, 0.1, 0.98));
}

// slight heroic lean
bot.rotation.x = 0.01;

// ---------- ai mesh (parallel track reconstruction) ----------
const aiBot = new THREE.Group();
aiBot.visible = false;
turntable.add(aiBot);
let aiLoaded = false;
function loadAI() {
  if (aiLoaded) return;
  aiLoaded = true;
  const el = document.getElementById('loading');
  el.hidden = false;
  const assemble = async () => {
    const man = await (await fetch('ai-mesh/manifest.json')).json();
    const bufs = [];
    for (let i = 0; i < man.parts; i++) {
      const b = await (await fetch(`ai-mesh/part-${String(i).padStart(2, '0')}.bin`)).arrayBuffer();
      bufs.push(new Uint8Array(b));
    }
    const whole = new Uint8Array(man.bytes);
    let off = 0;
    for (const b of bufs) { whole.set(b, off); off += b.length; }
    return whole.buffer;
  };
  assemble().then((buf) => new GLTFLoader().parse(buf, '', (g) => {
    const root = g.scene;
    const bbox = new THREE.Box3().setFromObject(root);
    const size = bbox.getSize(new THREE.Vector3());
    const scale = 9.4 / size.y;
    root.scale.setScalar(scale);
    const c = bbox.getCenter(new THREE.Vector3());
    root.position.set(-c.x * scale, -bbox.min.y * scale, -c.z * scale);
    root.traverse((o) => {
      if (o.isMesh) {
        o.material.metalness = 0.45;
        o.material.roughness = 0.5;
        o.material.envMapIntensity = 1.0;
      }
    });
    aiBot.add(root);
    el.hidden = true;
  }, () => { el.textContent = 'ai mesh failed to load'; })).catch(() => { el.textContent = 'ai mesh failed to load'; });
}
const mcode = document.getElementById('mcode');
const mai = document.getElementById('mai');
function showModel(which) {
  bot.visible = which === 'code';
  aiBot.visible = which === 'ai';
  mcode.setAttribute('aria-pressed', String(which === 'code'));
  mai.setAttribute('aria-pressed', String(which === 'ai'));
  if (which === 'ai') loadAI();
}
mcode.addEventListener('click', () => showModel('code'));
mai.addEventListener('click', () => showModel('ai'));

// ---------- turntable ----------
let spinning = true;
const spinBtn = document.getElementById('spin');
spinBtn.addEventListener('click', () => {
  spinning = !spinning;
  spinBtn.textContent = `turntable: ${spinning ? 'on' : 'off'}`;
  spinBtn.setAttribute('aria-pressed', String(spinning));
});

// ---------- resize / loop ----------
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  if (spinning) turntable.rotation.y += dt * 0.28;
  controls.update();
  renderer.render(scene, camera);
});
