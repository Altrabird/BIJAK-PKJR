// People (murid, polis, pengawas, orang awam): realistic CC0 humans made with MakeHuman/MPFB (assets/models/person_*.glb,
// Idle/Walk/Run baked from Quaternius clips), tinted per role, with code-driven pose overrides (look, signal, sit, pedal).
import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { E, mat } from './engine.js';

export const SKINS = [0xf1c9a5, 0xd9a47a, 0xb87a4b, 0x8a5634];
export const HAIRS = [0x1b1410, 0x3b2516, 0x6b4423];
export const UNIFORM = {
  lelaki: { shirt: 0xffffff, pants: 0x223d8a },
  perempuan: { shirt: 0xffffff, pants: 0x2f5fb3 },
};

const HEIGHT = 1.3, SEAT_HIP = 0.58;   // murid height at scale 1; hip height the vehicle seats were built for
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const G = {
  helmet: new THREE.SphereGeometry(0.112, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
  cap: new THREE.CylinderGeometry(0.1, 0.095, 0.06, 16), capTop: new THREE.CylinderGeometry(0.115, 0.115, 0.018, 16),
  // open at the front (+Z) so the face shows
  // set back from the skull centre so the face pokes out of the front
  tudung: new THREE.SphereGeometry(0.088, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.78),
  cape: new THREE.CylinderGeometry(0.068, 0.15, 0.12, 20, 1, true),
  bag: new THREE.BoxGeometry(0.24, 0.28, 0.11),
};

// tinted copies of the model's own materials, shared between people. Cloth/hair textures are grey (AO/luminance)
// so the colour is the tint; the skin texture is the lightest tone, so darker tones are a ratio of SKINS[0].
const paints = {}, light = new THREE.Color(SKINS[0]);
function paint(src, hex) {
  const k = src.uuid + hex;
  if (!paints[k]) {
    const c = new THREE.Color(hex);
    if (src.name === 'Skin') c.setRGB(c.r / light.r, c.g / light.g, c.b / light.b);
    // Lambert like the rest of the town (cheaper on lab PCs); hair/brow cards are cut out to avoid sorting issues
    paints[k] = new THREE.MeshLambertMaterial({ name: src.name, color: c, map: src.map, normalMap: src.normalMap, side: src.side, alphaTest: src.transparent ? 0.5 : 0 });
  }
  return paints[k];
}

// opts: jantina, skin, hair, shirt, pants, tudung, bag, dress, role ('murid'|'polis'|'pengawas'|'awam'), scale
export function makePerson(opts = {}) {
  const o = { jantina: 'lelaki', skin: SKINS[1], hair: HAIRS[0], role: 'murid', bag: true, ...opts };
  const uni = UNIFORM[o.jantina];
  const shirt = o.shirt ?? (o.role === 'polis' ? 0xf4f4f4 : o.role === 'pengawas' ? 0xf4e01c : uni.shirt);
  const pants = o.pants ?? (o.role === 'polis' ? 0x1b2440 : uni.pants);
  const kid = o.role === 'murid' || o.role === 'pengawas';
  const file = `person_${kid ? 'kid_' : ''}${o.jantina === 'lelaki' ? (kid ? 'm' : 'man') : (kid ? 'f' : 'woman')}`;
  const gl = E.models[file];
  const model = clone(gl.scene);
  if (!gl.userData.h) { model.updateMatrixWorld(true); gl.userData.h = new THREE.Box3().setFromObject(model).max.y; }
  model.scale.setScalar(HEIGHT / gl.userData.h);

  const shoes = o.role === 'murid' ? 0xf2f2f2 : 0x1d1d1d;   // murid wear white canvas shoes
  const colors = { Shirt: shirt, Pants: pants, Skin: o.skin, Hair: o.hair, Brows: o.hair, Shoes: shoes };
  model.traverse(m => {
    if (!m.isMesh) return;
    m.castShadow = true; m.frustumCulled = false;   // skinned bounds don't follow the animation
    m.material = paint(m.material, colors[m.material.name] ?? 0xffffff);
    if (o.tudung && m.material.name === 'Hair') m.visible = false;
  });

  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body); body.add(model);
  const bone = n => model.getObjectByName(n);   // MPFB game_engine rig
  const B = {
    head: bone('head'), torso: bone('spine_03'), armL: bone('upperarm_l'), armR: bone('upperarm_r'),
    foreL: bone('lowerarm_l'), foreR: bone('lowerarm_r'), legL: bone('thigh_l'), legR: bone('thigh_r'),
    shinL: bone('calf_l'), shinR: bone('calf_r'),
  };
  const anim = new Map(Object.values(B).map(b => [b, b.quaternion.clone()]));   // last animated pose, before overrides

  // a child of bone b with the character's axes (+Z forward, +X left) and root units, for accessories
  model.updateMatrixWorld(true);
  const socket = b => {
    const s = new THREE.Group(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    b.matrixWorld.decompose(p, q, sc);
    s.quaternion.copy(q).invert(); s.scale.set(1 / sc.x, 1 / sc.y, 1 / sc.z);
    b.add(s); return s;
  };
  const hipY = B.legL.getWorldPosition(new THREE.Vector3()).y;
  const headS = socket(B.head), torsoS = socket(B.torso);
  // centre of the skull; accessories are sized for a 0.15 m head (kids' heads are relatively bigger than adults')
  const headLen = HEIGHT - B.head.getWorldPosition(new THREE.Vector3()).y;
  const top = new THREE.Group(); top.position.set(0, headLen * 0.5, 0.012); top.scale.setScalar(headLen / 0.15); headS.add(top);

  const m = (geo, color, x = 0, y = 0, z = 0) => { const k = new THREE.Mesh(geo, mat(color)); k.position.set(x, y, z); k.castShadow = true; return k; };
  if (o.tudung) {
    const t = new THREE.Mesh(G.tudung, mat(0xffffff, { side: THREE.DoubleSide })); t.castShadow = true; t.position.z = -0.028; t.scale.set(1, 1.12, 1.12); top.add(t);
    top.add(m(G.cape, 0xffffff, 0, -0.12, -0.012));
  }
  if (o.role === 'polis') { top.add(m(G.cap, 0x1b2440, 0, 0.045, 0)); top.add(m(G.capTop, 0xffffff, 0, 0.08, 0.01)); }
  if (o.bag && o.role === 'murid') torsoS.add(m(G.bag, 0x2c7be5, 0, 0.02, -0.15));
  root.scale.setScalar(o.scale ?? (kid ? 1 : 1.3));

  const mixer = new THREE.AnimationMixer(model);
  const clip = n => gl.animations.find(a => a.name === n);
  const act = { idle: mixer.clipAction(clip('Idle')), walk: mixer.clipAction(clip('Walk')), run: mixer.clipAction(clip('Run')) };
  let cur = act.idle; cur.play();
  const go = a => { if (a === cur) return; a.reset().play(); cur.crossFadeTo(a, 0.25, true); cur = a; };

  // rotate a bone by `a` around an axis of the character's own space, on top of the animated pose
  const _m = new THREE.Quaternion(), _r = new THREE.Quaternion();
  const turn = (b, axis, a) => {
    if (!a) return;
    _m.identity(); for (let n = b.parent; n !== model; n = n.parent) _m.premultiply(n.quaternion);
    _r.setFromAxisAngle(axis, a).premultiply(_m.clone().invert()).multiply(_m);
    b.quaternion.premultiply(_r);
  };

  let helmet = null;
  const P = {
    root, body, model, phase: Math.random() * 6, opts: o, pose: 'stand',
    // callers set head.rotation.y (look) and armL/armR.rotation.z (arm out for signals); applied in animate()
    head: new THREE.Object3D(), armL: new THREE.Object3D(), armR: new THREE.Object3D(),
    setHelmet(on, color = 0xff6a00) {
      if (on && !helmet) { helmet = m(G.helmet, color, 0, -0.005, -0.005); helmet.scale.set(1, 1, 1.12); top.add(helmet); }
      if (!on && helmet) { top.remove(helmet); helmet = null; }
    },
    // speed in m/s; pose 'stand' | 'sit' | 'pedal' | 'wave' | 'stop'
    animate(dt, speed = 0) {
      const p = P.pose, seated = p === 'sit' || p === 'pedal', s = root.scale.x;
      if (seated || speed < 0.1) go(act.idle);
      else if (speed > 2.6) { go(act.run); act.run.timeScale = speed / (3.4 * s); }
      else { go(act.walk); act.walk.timeScale = Math.max(0.6, speed / (1.15 * s)); }
      // undo last frame's overrides; the mixer skips bones whose animated value hasn't changed, so they'd keep them
      for (const [b, q] of anim) b.quaternion.copy(q);
      mixer.update(dt);
      for (const [b, q] of anim) q.copy(b.quaternion);
      body.position.y = seated ? SEAT_HIP - hipY : 0;
      if (seated) {
        P.phase += dt * (p === 'pedal' ? speed * 2.2 : 0);
        const k = p === 'pedal' ? Math.sin(P.phase) * 0.45 : 0;
        turn(B.legL, X, -1.45 + k); turn(B.legR, X, -1.45 - k);
        turn(B.shinL, X, 1.45 - k * 0.6); turn(B.shinR, X, 1.45 + k * 0.6);
        if (!P.armL.rotation.z) turn(B.armL, X, -1.0);
        if (!P.armR.rotation.z) turn(B.armR, X, -1.0);
      }
      if (p === 'stop') { turn(B.armR, X, -1.55); turn(B.foreR, X, -1.3); }
      if (p === 'wave') { P.phase += dt * 8; turn(B.armR, Z, -2.5); turn(B.foreR, Z, Math.sin(P.phase) * 0.5); }
      turn(B.armL, Z, P.armL.rotation.z); turn(B.armR, Z, P.armR.rotation.z);
      turn(B.head, Y, P.head.rotation.y);
    },
  };
  P.animate(0, 0);
  return P;
}

export function randomCitizen() {
  const shirts = [0xe85d75, 0x4caf50, 0xff9800, 0x7e57c2, 0x26a69a, 0xf06292, 0x8d6e63];
  const f = Math.random() < 0.5;
  return makePerson({
    jantina: f ? 'perempuan' : 'lelaki', role: 'awam', tudung: f && Math.random() < 0.7, bag: false, dress: Math.random() < 0.5,
    skin: SKINS[(Math.random() * 4) | 0], hair: HAIRS[(Math.random() * 3) | 0],
    shirt: shirts[(Math.random() * shirts.length) | 0], pants: [0x2d3142, 0x5d4037, 0x37474f][(Math.random() * 3) | 0],
  });
}
