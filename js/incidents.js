// Road incidents. A car that hits a pedestrian knocks them down and an ambulance drives in to fetch them;
// a driver who runs a red light or hits someone is chased by a police car, pulled over and given a summons.
import * as THREE from 'three';
import { E } from './engine.js';
import { makeAmbulance, makePolice } from './vehicles.js';
import { roadRoute, isStraight, isRoad, key, DIR, OPP, CELL, sideBetween } from './map.js';
import { heightAt } from './walker.js';
import { HUD } from './hud.js';
import { sfx } from './audio.js';

const WHY = { LAMPU_MERAH: 'melanggar lampu merah', LANGGAR_ORANG: 'melanggar pejalan kaki' };

// a straight road tile 3-6 tiles away by road, so emergency vehicles arrive from out of sight
function spawnTile(map, tile) {
  const dist = new Map([[key(...tile), 0]]), q = [tile], out = [];
  while (q.length) {
    const t = q.shift(), d = dist.get(key(...t));
    if (d >= 3 && map.at(...t) === 'r' && isStraight(map.conn(...t))) out.push(t);
    if (d >= 6) continue;
    for (const s of map.conn(...t)) {
      const n = [t[0] + DIR[s][0], t[1] + DIR[s][1]];
      if (!dist.has(key(...n))) { dist.set(key(...n), d + 1); q.push(n); }
    }
  }
  return out.length ? out[(Math.random() * out.length) | 0] : null;
}

// road tile at or next to (x, z): people can be thrown onto the verge
function roadTileNear(map, x, z) {
  const [i, j] = map.tileAt(x, z);
  for (const [di, dj] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (isRoad(map.at(i + di, j + dj))) return [i + di, j + dj];
  return null;
}

// nearest pavement/grass cell, to stand a recovered player on
function walkSpotNear(map, x, z) {
  for (let r = 0; r < 12; r++) for (let a = 0; a < 16; a++) {
    const px = x + Math.cos(a / 16 * Math.PI * 2) * r, pz = z + Math.sin(a / 16 * Math.PI * 2) * r;
    if (map.cellAt(px, pz) === CELL.WALK) return [px, pz];
  }
  return [x, z];
}

// emergency vehicle on a route ending at `to`, entering its first tile heading along the route
function dispatch(G, from, to, mesh, o = {}) {
  const route = roadRoute(G.map, from, to);
  if (!route || route.length < 2) return null;
  const v = G.traffic.add({ tile: from, ent: OPP[sideBetween(from, route[1])], route, mesh, bad: false, ...o });
  v.temp = true; v.siren = true;
  return v;
}

function stampSprite() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(226,56,63,.95)'; x.beginPath(); x.roundRect(6, 6, 244, 84, 18); x.fill();
  x.fillStyle = '#fff'; x.font = '900 52px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('SAMAN!', 128, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false })); s.scale.set(3.2, 1.2, 1);
  return s;
}

export function addIncidents(G) {
  const { map, traffic } = G;
  const falls = [], patients = [], stamps = [], later = [];   // later: [game time, fn], so pauses also pause recovery
  let police = null, sirenT = 0;
  const walkerOf = who => who === G.player ? G.player.walker : who;

  traffic.onHit = (o, car) => {
    const who = o.ref;
    if (who.injured) return;
    who.injured = true;
    const w = walkerOf(who), root = w.root;
    if (who === G.player) G.player.injure(); else w.stop();
    const sp = 2 + car.v * 0.45;
    falls.push({ w, root, vx: car.dx * sp, vz: car.dz * sp, vy: 2.2 + car.v * 0.15, axis: new THREE.Vector3(car.dz, 0, -car.dx), spin: 4 + car.v * 0.6, yaw: Math.atan2(car.dx, car.dz) });
    patients.push({ who, root, t: 0, amb: null, picked: -1 });
    sfx('brake'); sfx('thud');
    HUD.toast('Kemalangan! Ambulans sedang dipanggil.', 'warn');
  };

  traffic.onViolation = (car, why) => {
    if (police || car.temp || !WHY[why]) return;
    const st = spawnTile(map, car.tile);
    police = st && dispatch(G, st, car.tile, makePolice(), { half: 2.3 });
    if (!police) return;
    traffic.chase(police, car);
    HUD.toast(`Polis mengejar pemandu yang ${WHY[why]}!`, 'warn');
  };

  traffic.onSummons = (car, p) => {
    HUD.toast(`Polis trafik menyaman pemandu itu kerana ${WHY[car.violated] || 'melanggar peraturan'}.`);
    sfx('whistle');
    const s = stampSprite(); s.position.set(0, 3, 0); car.mesh.add(s);
    stamps.push({ s, car, t: 3 });
  };

  const update = dt => {
    // knocked-down people: thrown forward and up, tumbling, then lying flat on their back
    for (let k = falls.length - 1; k >= 0; k--) {
      const f = falls[k], r = f.root;
      f.vy -= 9.8 * dt;
      r.position.x += f.vx * dt; r.position.z += f.vz * dt; r.position.y += f.vy * dt;
      r.rotateOnWorldAxis(f.axis, f.spin * dt);
      const ground = heightAt(map, r.position.x, r.position.z);
      if (f.vy < 0 && r.position.y <= ground) {
        r.position.y = ground + 0.12;
        r.rotation.set(0, 0, 0); r.rotateY(f.yaw); r.rotateX(-Math.PI / 2);
        f.w.x = r.position.x; f.w.z = r.position.z;
        falls.splice(k, 1);
      }
    }
    // ambulances: sent after a moment, they stop beside the patient and take them away
    for (let k = patients.length - 1; k >= 0; k--) {
      const p = patients[k], pos = p.root.position;
      p.t += dt;
      if (!p.amb && p.t > 1.5) {
        const to = roadTileNear(map, pos.x, pos.z), st = to && spawnTile(map, to);
        p.amb = (st && dispatch(G, st, to, makeAmbulance(), { half: 2.8, vmax: 11 })) || 'none';
      }
      const a = p.amb, live = a && a !== 'none', d = live ? Math.hypot(a.x - pos.x, a.z - pos.z) : Infinity;
      if (live) a.stuckT = a.v < 0.3 ? (a.stuckT || 0) + dt : 0;
      // beside the patient, or held up in the queue behind the accident (paramedics walk the rest)
      if (p.picked < 0 && (p.t > 35 || d < 7 || (a?.stuckT > 2 && d < 35))) {
        p.picked = 0;
        if (live) a.hold = 3.5;
      }
      if (p.picked >= 0 && (p.picked += dt) > 2) {
        p.root.visible = false;
        if (live) { a.siren = false; a.leaving = 12; }
        patients.splice(k, 1);
        recover(p.who);
      }
    }
    if (police && (!traffic.cars.includes(police) || !police.chase)) police = null;
    // beacons flash, sirens wail when an emergency vehicle is near the camera
    const flash = (G.t * 5 | 0) % 2;
    let near = false;
    for (const c of traffic.cars) {
      const b = c.mesh.userData.beacon;
      if (b) { b[0].visible = c.siren && flash === 0; b[1].visible = c.siren && flash === 1; }
      if (c.siren && Math.hypot(c.x - E.cam.target.x, c.z - E.cam.target.z) < 60) near = true;
    }
    if (near && (sirenT -= dt) < 0) { sfx('siren'); sirenT = 1.25; }
    for (let k = stamps.length - 1; k >= 0; k--) if ((stamps[k].t -= dt) < 0) { stamps[k].car.mesh.remove(stamps[k].s); stamps.splice(k, 1); }
    for (let k = later.length - 1; k >= 0; k--) if (later[k][0] <= G.t) later.splice(k, 1)[0][1]();
  };

  // back on their feet after hospital: NPCs reappear somewhere in town, the player per mode (life.js fails the mission)
  function recover(who) {
    if (who === G.player) {
      if (G.onPlayerInjured) G.onPlayerInjured();
      else { const [x, z] = walkSpotNear(map, who.walker.x, who.walker.z); later.push([G.t + 1.5, () => G.player.recover(x, z)]); }
      return;
    }
    // off the road straight away (out of traffic's way), back on their feet a little later
    const [x, z] = G.spots[(Math.random() * G.spots.length) | 0];
    who.place(x, z);
    later.push([G.t + 4, () => { who.root.rotation.set(0, 0, 0); who.root.visible = true; who.injured = false; who.rest = 2; }]);
  }

  return { update, patients, police: () => police };
}
