// Vehicles. Every vehicle group faces +Z. GLB cars get headlights; bus/bicycle/motorcycle are procedural.
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
  k.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.r > 0.6 && o.material.color.g < 0.4) { o.material = o.material.clone(); o.material.color.set(color); } });
  g.add(k);
  return g;
}

function textTexture(lines, w, h, bg, fg) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach((t, i) => { x.font = `900 ${h / (lines.length + 0.6)}px Arial`; x.fillText(t, w / 2, h * (i + 1) / (lines.length + 1), w * 0.92); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function makeBus() {
  const g = new THREE.Group(), L = 9, W = 2.5;
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, 2.4, L), mat(0xf6c51b)); body.position.y = 1.7; body.castShadow = true; g.add(body);
  const band = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.25, L + 0.02), mat(0x111111)); band.position.y = 1.15; g.add(band);
  const win = new THREE.Mesh(new THREE.BoxGeometry(W + 0.03, 0.8, L - 1.2), mat(0x24324a)); win.position.set(0, 2.25, -0.3); g.add(win);
  const wind = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.9, 0.05), mat(0x2b3c58)); wind.position.set(0, 2.2, L / 2 + 0.01); g.add(wind);
  const label = textTexture(['BAS SEKOLAH'], 512, 96, '#f6c51b', '#111');
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.6), new THREE.MeshLambertMaterial({ map: label }));
    p.position.set(s * (W / 2 + 0.02), 1.55, -0.6); p.rotation.y = s * Math.PI / 2; g.add(p);
  }
  const front = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.4), new THREE.MeshLambertMaterial({ map: label }));
  front.position.set(0, 1.45, L / 2 + 0.03); g.add(front);
  const wheel = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 14); wheel.rotateZ(Math.PI / 2);
  for (const z of [-L / 2 + 1.6, L / 2 - 1.8]) for (const x of [-W / 2 + 0.1, W / 2 - 0.1]) {
    const w = new THREE.Mesh(wheel, mat(0x1a1a1a)); w.position.set(x, 0.5, z); g.add(w);
  }
  // door on the LEFT (kerb side in Malaysia), front. Facing +Z, left is +X.
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.9, 1.0), mat(0x2b3c58)); door.name = 'door';
  door.position.set(W / 2 + 0.02, 1.45, L / 2 - 1.3); g.add(door);
  addLights(g, L / 2 + 0.03, 0.9, 0.9);
  return g;
}

const tube = (len, r = 0.025) => new THREE.CylinderGeometry(r, r, len, 6);
export function makeBicycle(color = 0x1e88e5) {
  const g = new THREE.Group(), fr = mat(color), blk = mat(0x1a1a1a);
  const wheelGeo = new THREE.TorusGeometry(0.32, 0.035, 8, 20);
  for (const z of [-0.52, 0.52]) {
    const w = new THREE.Mesh(wheelGeo, blk); w.position.set(0, 0.34, z); w.rotation.y = Math.PI / 2; w.name = 'wheel'; g.add(w);
  }
  const add = (geo, m, x, y, z, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); o.castShadow = true; g.add(o); return o; };
  add(tube(0.75), fr, 0, 0.62, 0.05, Math.PI / 2);          // top tube
  add(tube(0.6), fr, 0, 0.5, -0.24, 0.6);                   // seat tube
  add(tube(0.62), fr, 0, 0.48, 0.32, -0.5);                 // down tube
  add(tube(0.45), fr, 0, 0.55, 0.5, -0.25);                 // fork
  add(new THREE.BoxGeometry(0.16, 0.05, 0.26), blk, 0, 0.82, -0.3);   // seat
  add(tube(0.5), blk, 0, 0.88, 0.48, 0, Math.PI / 2);       // handlebar
  const lamp = add(new THREE.BoxGeometry(0.1, 0.08, 0.06), mat(0xdddddd), 0, 0.78, 0.58); lamp.name = 'lamp';
  const refl = add(new THREE.BoxGeometry(0.1, 0.06, 0.03), mat(0xff3b30), 0, 0.72, -0.62); refl.name = 'reflector';
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.02), new THREE.MeshBasicMaterial({ color: 0xfff7c0 }));
  beam.position.set(0, 0.78, 0.62); beam.name = 'lights'; beam.visible = false; g.add(beam);
  return g;
}

export function makeMotorcycle() {
  const g = new THREE.Group(), blk = mat(0x1a1a1a);
  const wheelGeo = new THREE.TorusGeometry(0.3, 0.08, 8, 20);
  for (const z of [-0.6, 0.62]) { const w = new THREE.Mesh(wheelGeo, blk); w.position.set(0, 0.36, z); w.rotation.y = Math.PI / 2; g.add(w); }
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 1.1), mat(0xc62828)); body.position.set(0, 0.62, 0.05); body.castShadow = true; g.add(body);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.9), blk); seat.position.set(0, 0.88, -0.2); g.add(seat);
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.2), mat(0xc62828)); front.position.set(0, 0.9, 0.55); g.add(front);
  const bar = new THREE.Mesh(tube(0.7, 0.03), blk); bar.rotation.z = Math.PI / 2; bar.position.set(0, 1.18, 0.52); g.add(bar);
  addLights(g, 0.68, 0.95, 0.08);
  return g;
}
