// Renderer, lights, Sims-style camera, input picking, GLB model cache.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const E = {
  scene: new THREE.Scene(), clock: new THREE.Clock(), models: {}, onTick: [], hi: true,
};

export function initEngine(canvas, quality = 'hi') {
  E.hi = quality === 'hi';
  const r = E.renderer = new THREE.WebGLRenderer({ canvas, antialias: E.hi, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, E.hi ? 2 : 1));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = E.hi;
  r.shadowMap.type = THREE.PCFSoftShadowMap;

  const s = E.scene;
  s.background = new THREE.Color(0x9fd4f5);
  s.fog = new THREE.Fog(0x9fd4f5, 90, 220);
  E.hemi = new THREE.HemisphereLight(0xdff1ff, 0x6f9a52, 1.1);
  s.add(E.hemi);
  const sun = E.sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.castShadow = E.hi;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 160 });
  sun.shadow.bias = -0.0005;
  s.add(sun, sun.target);

  E.camera = new THREE.PerspectiveCamera(40, 1, 0.5, 400);
  E.cam = { target: new THREE.Vector3(), want: new THREE.Vector3(), yaw: Math.PI * 0.25, yawWant: Math.PI * 0.25, pitch: 0.95, dist: 34, distWant: 34, follow: null };
  resize();
  addEventListener('resize', resize);
  bindCameraInput(canvas);
  E.raycaster = new THREE.Raycaster();
  E.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
}

function resize() {
  const w = innerWidth, h = innerHeight;
  E.renderer.setSize(w, h, false);
  E.camera.aspect = w / h;
  E.camera.updateProjectionMatrix();
}

// ---- camera: follow target; right/middle-drag orbits 360° and tilts, two fingers turn/tilt/pinch, Q-E turn, wheel zooms ----
function bindCameraInput(el) {
  let drag = null, pinch = null;
  el.addEventListener('contextmenu', e => e.preventDefault());
  const tilt = dy => { E.cam.pitch = THREE.MathUtils.clamp(E.cam.pitch + dy * 0.006, 0.12, 1.45); };
  el.addEventListener('pointerdown', e => { if (e.button === 2 || e.button === 1) drag = { x: e.clientX, y: e.clientY }; });
  addEventListener('pointermove', e => {
    if (!drag) return;
    E.cam.yawWant -= (e.clientX - drag.x) * 0.008; tilt(e.clientY - drag.y);
    drag.x = e.clientX; drag.y = e.clientY;
  });
  addEventListener('pointerup', () => drag = null);
  el.addEventListener('wheel', e => { E.cam.distWant = THREE.MathUtils.clamp(E.cam.distWant * (e.deltaY > 0 ? 1.12 : 0.89), 10, 110); }, { passive: true });
  el.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
    }
  }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && pinch) {
      const [a, b] = e.touches, d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), x = (a.clientX + b.clientX) / 2, y = (a.clientY + b.clientY) / 2;
      E.cam.distWant = THREE.MathUtils.clamp(E.cam.distWant * pinch.d / d, 10, 110);
      E.cam.yawWant -= (x - pinch.x) * 0.01; tilt(y - pinch.y);
      pinch = { d, x, y };
    }
  }, { passive: true });
  el.addEventListener('touchend', () => pinch = null);
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'q' || e.key === 'Q') E.cam.yawWant += Math.PI / 4;
    if (e.key === 'e' || e.key === 'E') E.cam.yawWant -= Math.PI / 4;
  });
}

export function rotateCam(dir) { E.cam.yawWant += dir * Math.PI / 4; }
export function zoomCam(f) { E.cam.distWant = THREE.MathUtils.clamp(E.cam.distWant * f, 10, 110); }

function updateCamera(dt) {
  const c = E.cam, k = 1 - Math.exp(-dt * 6);
  if (c.follow) c.want.copy(c.follow.position);
  c.target.lerp(c.want, k);
  c.yaw += (c.yawWant - c.yaw) * k;
  c.dist += (c.distWant - c.dist) * k;
  const h = Math.cos(c.pitch) * c.dist;
  E.camera.position.set(c.target.x + Math.sin(c.yaw) * h, c.target.y + Math.sin(c.pitch) * c.dist, c.target.z + Math.cos(c.yaw) * h);
  E.camera.lookAt(c.target.x, c.target.y + 1, c.target.z);
  // shadow box follows the camera target
  E.sun.position.set(c.target.x + 30, 60, c.target.z + 20);
  E.sun.target.position.copy(c.target);
}

// Screen point -> ground (x,z), or hit on one of `objs`.
export function pick(clientX, clientY, objs) {
  const v = new THREE.Vector2(clientX / innerWidth * 2 - 1, -clientY / innerHeight * 2 + 1);
  E.raycaster.setFromCamera(v, E.camera);
  if (objs && objs.length) {
    const hit = E.raycaster.intersectObjects(objs, true)[0];
    if (hit) { let o = hit.object; while (o && !o.userData.pick) o = o.parent; if (o) return { obj: o, point: hit.point }; }
  }
  const p = new THREE.Vector3();
  return E.raycaster.ray.intersectPlane(E.ground, p) ? { point: p } : null;
}

export function startLoop() {
  E.renderer.setAnimationLoop(() => {
    const dt = Math.min(E.clock.getDelta(), 0.05);
    for (const f of E.onTick) f(dt);
    updateCamera(dt);
    E.renderer.render(E.scene, E.camera);
  });
}

// ---- time of day: 0 = noon, 1 = dusk ----
export function setDusk(t) {
  const day = new THREE.Color(0x9fd4f5), dusk = new THREE.Color(0x2c3561);
  const bg = day.clone().lerp(dusk, t);
  E.scene.background.copy(bg); E.scene.fog.color.copy(bg);
  E.sun.intensity = 2.2 * (1 - t * 0.85);
  E.sun.color.set(0xfff1d6).lerp(new THREE.Color(0xff9a5c), t);
  E.hemi.intensity = 1.1 * (1 - t * 0.55);
  E.dusk = t;
}

// ---- GLB cache. Every model is re-centred (x,z) with its base on y=0. ----
// fit: max footprint (m) for buildings; yaw: rotation so the model's front faces +Z.
const MODEL_CFG = {
  car_hatchback: {}, car_wagon: {}, car_taxi: {}, car_police: {},   // these already face +Z
  suv: { fit: 4.5 }, pickup: { fit: 5.2 }, van: { fit: 4.8 }, car_old: { fit: 4.4, yaw: Math.PI }, truck_old: { fit: 5.4, yaw: -Math.PI / 2 },
  lorry: { fit: 7.2, sx: 0.7 }, dump_truck: { fit: 7.2, yaw: Math.PI, sx: 0.62 }, tractor: { fit: 3.6 }, motorbike: { fit: 2.1, yaw: -Math.PI / 2 },
  bicycle: { fit: 1.5, yaw: Math.PI }, kart: { fit: 1.7, yaw: Math.PI / 2 }, motorcycle: { fit: 1.85 }, bus: { fit: 9.2 }, ambulance: { fit: 5.6 }, backpack: { fit: 0.32, yaw: Math.PI },
  house_a: { fit: 7.4 }, house_b: { fit: 7.8 }, house_c: { fit: 7.8 }, shop: { fit: 8.4 }, tower: { fit: 8.2 },
  palm: {}, tree_a: {}, tree_b: {}, tree_c: {}, streetlight: {},
  person_kid_m: { rig: true }, person_kid_f: { rig: true }, person_man: { rig: true }, person_woman: { rig: true },   // rigged people keep the raw glTF
};

export async function loadModels(onProgress) {
  const loader = new GLTFLoader(), names = Object.keys(MODEL_CFG);
  let done = 0;
  await Promise.all(names.map(n => new Promise(res => {
    loader.load(`assets/models/${n}.glb`, g => {
      E.models[n] = MODEL_CFG[n].rig ? g : normalise(g.scene, MODEL_CFG[n]);
      onProgress && onProgress(++done / names.length); res();
    }, undefined, err => { console.warn('model gagal', n, err); E.models[n] = null; onProgress && onProgress(++done / names.length); res(); });
  })));
}

function normalise(root, cfg) {
  const wrap = new THREE.Group();
  if (cfg.yaw) root.rotation.y = cfg.yaw;
  wrap.add(root);
  wrap.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(wrap);
  if (cfg.fit) {
    const s = cfg.fit / Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
    root.scale.multiplyScalar(s);
    if (cfg.sx) root.scale.x *= cfg.sx;   // chunky low-poly trucks are wider than a 3.5 m lane allows
    wrap.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(wrap);
  }
  const c = box.getCenter(new THREE.Vector3());
  root.position.x -= c.x; root.position.z -= c.z; root.position.y -= box.min.y;
  wrap.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    // leaf cards ship alpha-blended; cut them out instead so overlapping leaves don't flicker
    if (o.material.transparent && o.material.map) Object.assign(o.material, { transparent: false, alphaTest: 0.5, depthWrite: true });
  });
  return wrap;
}

export function model(name) {
  const m = E.models[name];
  return m ? m.clone() : new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 4), new THREE.MeshLambertMaterial({ color: 0xff00ff }));
}

// small shared material cache so procedural meshes don't create hundreds of materials
const mats = {};
export function mat(color, opts = {}) {
  const k = color + JSON.stringify(opts);
  return mats[k] || (mats[k] = new THREE.MeshLambertMaterial({ color, ...opts }));
}
