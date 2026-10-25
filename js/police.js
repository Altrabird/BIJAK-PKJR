// Polis surveillance: officers walk the pavements, ride patrol bikes and drive patrol cars through town.
// When the murid breaks a rule the nearest free unit is alerted, chases them and stops them for a talk;
// drivers who run a red light or hit someone are pulled over by a patrol unit too (incidents.js).
import * as THREE from 'three';
import { makePolice, makeRidden } from './vehicles.js';
import { makePerson } from './people.js';
import { Walker } from './walker.js';
import { isRoad, isStraight } from './map.js';
import { RULES } from './rules.js';
import { HUD } from './hud.js';
import { sfx } from './audio.js';

function bubble(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(28,60,140,.95)'; x.beginPath(); x.roundRect(6, 6, 244, 84, 18); x.fill();
  x.fillStyle = '#fff'; x.font = '900 46px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false })); s.scale.set(3, 1.1, 1);
  return s;
}

export function addPolice(G, { cars = 2, bikes = 3, foot = 3 } = {}) {
  const { map, traffic } = G, units = [];
  const roads = [];
  for (let j = 0; j < map.H; j++) for (let i = 0; i < map.W; i++) if (map.at(i, j) === 'r' && isStraight(map.conn(i, j))) roads.push([i, j]);
  const onRoad = (mesh, half, vmax, kind) => {
    if (!roads.length) return;
    const t = roads.splice((Math.random() * roads.length) | 0, 1)[0], c = map.conn(...t);
    const u = traffic.add({ tile: t, ent: c[(Math.random() * c.length) | 0], s: 3, mesh, half, vmax, bad: false });
    Object.assign(u, { police: kind, baseV: vmax });
    units.push(u);
  };
  for (let k = 0; k < cars; k++) onRoad(makePolice(), 2.3, 7.5, 'kereta peronda');
  for (let k = 0; k < bikes; k++) onRoad(makeRidden('motorcycle', true), 1.0, 9, 'motosikal peronda');
  // foot patrol wander like the townsfolk (G.npcs), so they also wait at kerbs and use crossings
  for (let k = 0; k < foot && G.spots.length; k++) {
    const [x, z] = G.spots[(Math.random() * G.spots.length) | 0];
    const w = new Walker(map, makePerson({ role: 'polis', jantina: 'lelaki', bag: false }), x, z, 1.3);
    Object.assign(w, { npc: true, rest: Math.random() * 4, foot: true });
    G.npcs.push(w); units.push(w);
  }

  // where the murid is, as a chase target traffic.js can route to (nearest road tile)
  const me = { isPlayer: true, x: 0, z: 0, v: 0, tile: null };
  const track = () => {
    const p = G.player.pos, [i, j] = map.tileAt(p.x, p.z);
    me.x = p.x; me.z = p.z;
    for (const [di, dj] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (isRoad(map.at(i + di, j + dj))) { me.tile = [i + di, j + dj]; break; }
  };
  const dist = (u, x, z) => Math.hypot(u.x - x, u.z - z);
  const free = u => !u.chase && !u.injured && (u.foot ? G.npcs.includes(u) : traffic.cars.includes(u));
  let chase = null;

  const release = u => {
    if (u.foot) { u.speed = 1.3; u.roadCost = undefined; u.stop(); u.rest = 3; u.chase = null; }
    else Object.assign(u, { chase: null, siren: false, route: null, vmax: u.baseV, pulled: false });
  };

  G.alarm = id => {
    if (chase || G.player.mode === 'passenger' || G.player.mode === 'injured') return;
    track();
    if (!me.tile) return;
    const u = units.filter(free).sort((a, b) => dist(a, me.x, me.z) - dist(b, me.x, me.z))[0];
    if (!u) return;
    chase = { u, id, t: 0 };
    if (u.foot) { u.chase = me; u.speed = 3.4; u.roadCost = 4; u.rest = 99; u.repath = 0; }
    else traffic.chase(u, me);
    sfx('whistle');
    HUD.toast(`🚨 Polis ${u.foot ? 'peronda' : u.police} nampak awak! ${RULES[id]?.t || ''}`, 'warn');
  };

  // a free patrol vehicle for incidents.js to send after a law-breaking driver
  const take = (x, z) => {
    const u = units.filter(v => !v.foot && free(v)).sort((a, b) => dist(a, x, z) - dist(b, x, z))[0];
    return u && dist(u, x, z) < 120 ? u : null;
  };

  const update = dt => {
    // after a summons the patrol car goes back to cruising
    for (const u of units) if (!u.foot && !u.chase && u.vmax !== u.baseV && traffic.cars.includes(u)) u.vmax = u.baseV;
    const c = chase;
    if (!c) return;
    const P = G.player, u = c.u;
    c.t += dt; track();
    if (c.stop !== undefined) {
      // stopped: the officer has a word, then everyone carries on
      if ((c.stop += dt) > 3) {
        P.frozen = false; P.person.root.remove(c.sprite);
        release(u); chase = null;
      }
      return;
    }
    const gone = u.foot ? !G.npcs.includes(u) || u.injured : !traffic.cars.includes(u);
    if (gone || P.mode === 'passenger' || P.mode === 'injured' || G.paused) { if (!gone) release(u); chase = null; P.frozen = false; return; }
    if (c.t > 60) { HUD.toast('Polis kehilangan jejak awak... kali ini.'); release(u); chase = null; return; }
    if (u.foot) {
      u.rest = 99;
      if ((u.repath -= dt) < 0 && u.state !== 'kerb') { u.repath = 0.8; if (dist(u, me.x, me.z) > 1.2) u.goTo(me.x, me.z); }   // re-planning at a kerb would restart the wait there
    } else if (dist(u, me.x, me.z) < 9) u.hold = 1;   // pull up beside the murid
    if (dist(u, me.x, me.z) < (u.foot ? 1.6 : 9)) {
      c.stop = 0;
      P.frozen = true; P.walker.stop(); P.walker.drive = null; if (P.mode === 'ride') P.speed = 0;
      if (u.foot) { u.stop(); u.yaw = Math.atan2(me.x - u.x, me.z - u.z); } else u.hold = 3;
      c.sprite = bubble('BERHENTI!'); c.sprite.position.set(0, 2.6, 0); P.person.root.add(c.sprite);
      sfx('whistle');
      HUD.toast(`👮 Polis menahan awak: ${RULES[c.id]?.t || 'kesalahan jalan raya'}. ${RULES[c.id]?.why || ''}`, 'warn');
    }
  };
  return { update, units, take, chasing: () => chase };
}
