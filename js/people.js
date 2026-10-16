// Procedural chibi people (murid, polis, pengawas, orang awam) with code-driven animation.
import * as THREE from 'three';
import { mat } from './engine.js';

export const SKINS = [0xf1c9a5, 0xd9a47a, 0xb87a4b, 0x8a5634];
export const HAIRS = [0x1b1410, 0x3b2516, 0x6b4423];
export const UNIFORM = {
  lelaki: { shirt: 0xffffff, pants: 0x223d8a },
  perempuan: { shirt: 0xffffff, pants: 0x2f5fb3 },
};

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const G = {
  leg: box(0.13, 0.5, 0.15), shoe: box(0.15, 0.08, 0.22), torso: box(0.38, 0.42, 0.23), arm: box(0.1, 0.38, 0.1),
  hand: new THREE.SphereGeometry(0.065, 8, 6), head: new THREE.SphereGeometry(0.25, 18, 14), eye: new THREE.SphereGeometry(0.035, 8, 6),
  hair: new THREE.SphereGeometry(0.265, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
  tudungHead: new THREE.SphereGeometry(0.28, 18, 12), tudungCape: new THREE.CylinderGeometry(0.2, 0.34, 0.36, 16, 1, true),
  skirt: new THREE.CylinderGeometry(0.2, 0.28, 0.52, 14), bag: box(0.3, 0.34, 0.14), cap: new THREE.CylinderGeometry(0.27, 0.25, 0.12, 16),
  capTop: new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16), helmet: new THREE.SphereGeometry(0.29, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
  vest: box(0.41, 0.36, 0.26), mouth: box(0.08, 0.018, 0.01),
};

function m(geo, color, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, mat(color)); o.position.set(x, y, z); o.castShadow = true; return o;
}

// opts: jantina, skin, hair, shirt, pants, tudung, bag, role ('murid'|'polis'|'pengawas'|'awam'), scale
export function makePerson(opts = {}) {
  const o = { jantina: 'lelaki', skin: SKINS[1], hair: HAIRS[0], role: 'murid', bag: true, ...opts };
  const uni = UNIFORM[o.jantina];
  const shirt = o.shirt ?? (o.role === 'polis' ? 0xf4f4f4 : uni.shirt);
  const pants = o.pants ?? (o.role === 'polis' ? 0x1b2440 : uni.pants);
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);

  const hipY = 0.58;
  const legL = new THREE.Group(), legR = new THREE.Group();
  // facing +Z, the character's left is +X
  legL.position.set(0.1, hipY, 0); legR.position.set(-0.1, hipY, 0);
  for (const L of [legL, legR]) {
    L.add(m(G.leg, o.jantina === 'perempuan' && o.role === 'murid' ? 0xffffff : pants, 0, -0.25, 0));
    L.add(m(G.shoe, 0x1a1a1a, 0, -0.52, 0.03));
  }
  body.add(legL, legR);
  if (o.jantina === 'perempuan' && o.role !== 'polis') {
    const sk = m(G.skirt, pants, 0, hipY - (o.role === 'murid' ? 0.2 : 0.26), 0);
    if (o.role !== 'murid') sk.scale.y = 1.2;
    body.add(sk);
  }

  const torso = m(G.torso, o.jantina === 'perempuan' && o.role === 'murid' ? pants : shirt, 0, hipY + 0.21, 0);
  body.add(torso);
  if (o.role === 'pengawas') body.add(m(G.vest, 0xf4e01c, 0, hipY + 0.24, 0));
  if (o.bag && o.role === 'murid') body.add(m(G.bag, 0x2c7be5, 0, hipY + 0.22, -0.17));

  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(0.25, hipY + 0.4, 0); armR.position.set(-0.25, hipY + 0.4, 0);
  for (const A of [armL, armR]) { A.add(m(G.arm, shirt, 0, -0.18, 0)); A.add(m(G.hand, o.skin, 0, -0.39, 0)); }
  body.add(armL, armR);

  const head = new THREE.Group(); head.position.y = hipY + 0.44; body.add(head);
  head.add(m(G.head, o.skin, 0, 0.25, 0));
  head.add(m(G.eye, 0x111111, -0.085, 0.28, 0.225), m(G.eye, 0x111111, 0.085, 0.28, 0.225));
  head.add(m(G.mouth, 0x8a3b2c, 0, 0.17, 0.245));
  if (o.tudung) {
    const t = m(G.tudungHead, 0xffffff, 0, 0.27, -0.02); t.scale.set(1, 1.02, 1.02); head.add(t);
    head.add(m(G.tudungCape, 0xffffff, 0, 0.0, 0));
    // keep the face visible: a skin-coloured oval in front
    const face = m(new THREE.SphereGeometry(0.2, 14, 10), o.skin, 0, 0.24, 0.1); face.scale.set(1, 1.15, 0.9); head.add(face);
    head.children[1].position.z = head.children[2].position.z = 0.285; head.children[3].position.z = 0.3;
  } else {
    const h = m(G.hair, o.hair, 0, 0.27, -0.01); h.rotation.x = -0.25; head.add(h);
  }
  let helmet = null;
  if (o.role === 'polis') {
    head.add(m(G.cap, 0x1b2440, 0, 0.46, 0)); head.add(m(G.capTop, 0xffffff, 0, 0.53, 0.02));
  }
  root.scale.setScalar(o.scale ?? (o.role === 'murid' || o.role === 'pengawas' ? 1 : 1.3));

  const P = {
    root, body, head, legL, legR, armL, armR, phase: Math.random() * 6, opts: o, pose: 'stand',
    setHelmet(on, color = 0xff6a00) {
      if (on && !helmet) { helmet = m(G.helmet, color, 0, 0.3, -0.01); head.add(helmet); }
      if (!on && helmet) { head.remove(helmet); helmet = null; }
    },
    // speed in m/s; pose 'stand' | 'sit' | 'pedal' | 'wave' | 'stop'
    animate(dt, speed = 0) {
      const p = P.pose;
      if (p === 'sit' || p === 'pedal') {
        P.phase += dt * (p === 'pedal' ? speed * 2.2 : 0);
        const s = p === 'pedal' ? Math.sin(P.phase) * 0.45 : 0;
        legL.rotation.x = -1.3 + s; legR.rotation.x = -1.3 - s;
        armL.rotation.x = armR.rotation.x = -1.1; body.position.y = 0;
        return;
      }
      if (p === 'stop') { armR.rotation.x = -1.6; armR.rotation.z = 0; armL.rotation.x = 0; legL.rotation.x = legR.rotation.x = 0; return; }
      if (p === 'wave') { P.phase += dt * 8; armR.rotation.x = -2.6; armR.rotation.z = Math.sin(P.phase) * 0.4; return; }
      armR.rotation.z = 0;
      if (speed > 0.1) {
        P.phase += dt * speed * 5.2;
        const s = Math.sin(P.phase) * Math.min(0.75, 0.3 + speed * 0.25);
        legL.rotation.x = s; legR.rotation.x = -s; armL.rotation.x = -s * 0.8; armR.rotation.x = s * 0.8;
        body.position.y = Math.abs(Math.cos(P.phase)) * 0.04;
      } else {
        P.phase += dt * 2;
        const k = 1 - Math.exp(-dt * 10);
        for (const L of [legL, legR, armL, armR]) L.rotation.x += (0 - L.rotation.x) * k;
        armL.rotation.z = 0.04 + Math.sin(P.phase) * 0.02; armR.rotation.z = -0.04 - Math.sin(P.phase) * 0.02;
        body.position.y = 0;
      }
    },
  };
  return P;
}

export function randomCitizen() {
  const shirts = [0xe85d75, 0x4caf50, 0xff9800, 0x7e57c2, 0x26a69a, 0xf06292, 0x8d6e63];
  const f = Math.random() < 0.5;
  return makePerson({
    jantina: f ? 'perempuan' : 'lelaki', role: 'awam', tudung: f && Math.random() < 0.7, bag: false,
    skin: SKINS[(Math.random() * 4) | 0], hair: HAIRS[(Math.random() * 3) | 0],
    shirt: shirts[(Math.random() * shirts.length) | 0], pants: [0x2d3142, 0x5d4037, 0x37474f][(Math.random() * 3) | 0],
  });
}
