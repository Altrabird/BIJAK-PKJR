// Vehicles. Every vehicle group faces +Z. All bodies are GLB models (assets/CREDITS.md); lights are added in code.
import * as THREE from 'three';
import { model, mat } from './engine.js';

const CARS = ['car_hatchback', 'car_wagon', 'car_taxi', 'car_hatchback', 'car_wagon'];
const lightGeo = new THREE.BoxGeometry(0.35, 0.18, 0.05);
const lightOn = new THREE.MeshBasicMaterial({ color: 0xfff6c8 }), tailOn = new THREE.MeshBasicMaterial({ color: 0xff2a2a });

function addLights(g, halfLen, y, halfW) {
  const L = new THREE.Group(); L.name = 'lights'; L.visible = false;
  for (const x of [-halfW, halfW]) {
    const f = new THREE.Mesh(lightGeo, lightOn); f.position.set(x, y, halfLen); L.add(f);
    const b = new THREE.Mesh(lightGeo, tailOn); b.position.set(x, y, -halfLen); L.add(b);
  }
  g.add(L);
}
export function setLights(v, on) { const l = v.getObjectByName('lights'); if (l) l.visible = on; }

export function makeCar(kind) {
  const g = new THREE.Group();
  g.add(model(kind || CARS[(Math.random() * CARS.length) | 0]));
  addLights(g, 2.12, 0.65, 0.62);
  return g;
}

export function makeKart(color = 0xe53935) {
  const g = new THREE.Group(), k = model('kart');
  // the body panels are the one strongly red material; tint them per kart
  k.traverse(o => { const c = o.isMesh && o.material?.color; if (c && c.r > 0.3 && c.g < 0.15 && c.b < 0.15) { o.material = o.material.clone(); o.material.color.set(color); } });
  g.add(k);
  return g;
}

const size = o => new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());

// where a person's root goes on each vehicle (people.js seats the hips SEAT_HIP above it); rider/pillion = motorcycle
export const SEATS = { bike: [0, 0.2, -0.2], kart: [0, -0.16, -0.15], rider: [0, 0.0, 0.0], pillion: [0, 0.08, -0.42] };

function textTexture(lines, w, h, bg, fg) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach((t, i) => { x.font = `900 ${h / (lines.length + 0.6)}px Arial`; x.fillText(t, w / 2, h * (i + 1) / (lines.length + 1), w * 0.92); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function makeBus() {
  const g = new THREE.Group(), m = model('bus'); g.add(m);
  const { x: W, y: H, z: L } = size(m);
  const label = textTexture(['BAS SEKOLAH'], 512, 96, '#f6c51b', '#111');
  const sign = (w, h) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: label }));
  for (const s of [-1, 1]) { const p = sign(L * 0.45, L * 0.055); p.position.set(s * (W / 2 + 0.03), H * 0.38, -L * 0.05); p.rotation.y = s * Math.PI / 2; g.add(p); }
  addLights(g, L / 2 + 0.02, H * 0.22, W * 0.36);
  return g;
}

export function makeBicycle(color = 0x1e88e5) {
  const g = new THREE.Group(), b = model('bicycle');
  b.traverse(o => { if (o.isMesh && o.material?.name === 'FF5722') { o.material = o.material.clone(); o.material.color.set(color); } });   // frame
  g.add(b);
  const { y: H, z: L } = size(b);
  const refl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.02), mat(0xff3b30)); refl.position.set(0, H * 0.55, -L / 2 + 0.05); refl.name = 'reflector'; g.add(refl);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.04), new THREE.MeshBasicMaterial({ color: 0xfff7c0 }));
  beam.position.set(0, H * 0.72, L / 2 - 0.12); beam.name = 'lights'; beam.visible = false; g.add(beam);
  return g;
}

export function makeMotorcycle() {
  const g = new THREE.Group(), m = model('motorcycle'); g.add(m);
  const { y: H, z: L } = size(m);
  addLights(g, L / 2 + 0.01, H * 0.55, 0.06);
  return g;
}

// flashing roof lights for emergency vehicles; incidents.js toggles them via userData.beacon
function addBeacon(g, y, colors) {
  const geo = new THREE.BoxGeometry(0.42, 0.14, 0.24);
  g.userData.beacon = colors.map((c, k) => {
    const b = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c }));
    b.position.set((k ? -1 : 1) * 0.3, y, 0); b.visible = false; g.add(b); return b;
  });
}

export function makePolice() {
  const g = makeCar('car_police');
  addBeacon(g, size(g).y + 0.05, [0xff2020, 0x2060ff]);
  return g;
}

export function makeAmbulance() {
  const g = new THREE.Group(), m = model('ambulance'); g.add(m);
  const { x: W, y: H, z: L } = size(m);
  addBeacon(g, H + 0.05, [0xff2020, 0xffffff]);
  addLights(g, L / 2 + 0.01, H * 0.3, W * 0.36);
  return g;
}
