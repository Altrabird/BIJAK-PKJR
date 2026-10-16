// A playable scene: map + world + signals + traffic + NPC pedestrians + player.
import { parseMap, doorPoint, CELL } from './map.js';
import { E, setDusk } from './engine.js';
import { buildWorld } from './world.js';
import { Signals, Traffic } from './traffic.js';
import { Walker, onRoadCell } from './walker.js';
import { makePerson, randomCitizen } from './people.js';
import { Player } from './player.js';
import { sfx } from './audio.js';
import { addIncidents } from './incidents.js';
import { makeMinimap } from './minimap.js';

// opts: cars, npcs, vmax, bad, kinds, dusk, murid, staff (pengawas/polis)
export function createGame(def, opts = {}) {
  const map = parseMap(def);
  const G = { map, opts, npcs: [], statics: [], hooks: [], t: 0, paused: false, bus: null };
  G.world = buildWorld(map);
  G.sig = new Signals(map);
  G.traffic = new Traffic(map, G.sig, { vmax: opts.vmax ?? 8, bad: opts.bad ?? 0, kinds: opts.kinds, make: opts.make, half: opts.half });
  G.traffic.spawnRandom(opts.cars ?? 10);
  setDusk(opts.dusk || 0);
  G.world.setNight((opts.dusk || 0) > 0.5);

  // walkable spots NPCs wander between
  const spots = Object.values(map.places).map(p => doorPoint(map, p));
  for (let k = 0; k < 40; k++) {
    const x = (Math.random() - 0.5) * map.W * 10, z = (Math.random() - 0.5) * map.H * 10;
    if (map.cellAt(x, z) === CELL.WALK) spots.push([x, z]);
  }
  G.spots = spots;
  for (let k = 0; k < (opts.npcs ?? 10) && spots.length; k++) {
    const [x, z] = spots[(Math.random() * spots.length) | 0];
    const kid = Math.random() < 0.4;
    const p = kid ? makePerson({ jantina: Math.random() < 0.5 ? 'perempuan' : 'lelaki', tudung: Math.random() < 0.6 }) : randomCitizen();
    const w = new Walker(map, p, x, z, kid ? 1.5 : 1.3);
    w.npc = true; w.rest = Math.random() * 4;
    G.npcs.push(w);
  }
  if (opts.staff !== false) addStaff(G);

  G.player = new Player(G, opts.murid);
  G.traffic.onNearMiss = (o) => {
    if (o.ref !== G.player) return;
    sfx('brake'); sfx('horn');
    // crossing legally on a green man: the driver was careless, not the murid
    const id = map.crossAt(o.x, o.z), cr = id >= 0 ? map.crossings[id] : null;
    if (cr && cr.type !== 'zebra' && G.sig.pedGreen(id)) { G.player.warnOnce('Hati-hati! Pemandu itu tidak berhati-hati.'); return; }
    G.player.offence('NYARIS');
  };
  G.traffic.onHorn = () => sfx('horn');
  G.incidents = addIncidents(G);
  G.minimap = makeMinimap(G);

  // NPC kerb behaviour: obey ped lights, look both ways at zebras, never cross into near traffic
  const carsNear = (x, z, r, vmin) => G.traffic.cars.some(c => c.v > vmin && Math.hypot(c.x - x, c.z - z) < r);
  // a car (moving or stopped) with any part of its body on this crossing: wait, never walk through it
  const carOnCrossing = id => G.traffic.cars.some(c => {
    for (let d = -c.half; d <= c.half; d += 0.5) if (map.crossAt(c.x + c.dx * d, c.z + c.dz * d) === id) return true;
    return false;
  });
  G.npcKerb = (w, k) => {
    w.person.head.rotation.y = Math.sin(k.t * 3) * 0.9;
    if (k.cross >= 0) {
      const cr = map.crossings[k.cross];
      if (cr.type === 'pelican') G.sig.press(cr.id);
      if (carOnCrossing(cr.id)) return false;
      if (cr.type !== 'zebra') return G.sig.pedGreen(cr.id) && !G.sig.pedFlash(cr.id) && k.t > 0.8;
      return k.t > 1.4 && !carsNear(cr.x, cr.z, 9, 2.5);
    }
    return k.t > 2 && !carsNear(w.x, w.z, 16, 0.5);
  };

  G.update = dt => {
    if (G.paused) return;
    G.t += dt;
    G.sig.update(dt);
    const obs = [];
    const p = G.player.obstacle();
    if (p) obs.push(p);
    for (const w of G.npcs) {
      const c = map.cellAt(w.x, w.z);
      if (onRoadCell(c) || w.waiting) obs.push({ x: w.x, z: w.z, kind: 'ped', waiting: w.waiting && !onRoadCell(c), cross: w.kerb?.cross, injured: w.injured, ref: w });
    }
    for (const s of G.statics) if (s.obstacle) obs.push(s.obstacle);
    G.traffic.update(dt, obs);
    G.incidents.update(dt);
    for (const w of G.npcs) {
      if (w.injured) continue;
      if (w.state === 'idle') {
        w.person.head.rotation.y *= 0.9;
        w.rest -= dt;
        if (w.rest <= 0) { const [x, z] = G.spots[(Math.random() * G.spots.length) | 0]; if (!w.goTo(x, z)) w.rest = 2; }
      }
      w.update(dt, { kerb: G.npcKerb, arrive: ww => { ww.rest = 3 + Math.random() * 6; }, crossed: ww => { ww.person.head.rotation.y = 0; } });
    }
    for (const s of G.statics) s.update && s.update(dt);
    G.player.update(dt);
    G.world.paint(G.sig);
    for (const h of G.hooks) h(dt);
    G.minimap.update(dt);
  };

  G.dispose = () => {
    G.traffic.clear();
    G.npcs.forEach(w => w.remove());
    G.statics.forEach(s => E.scene.remove(s.root));
    G.player.dispose();
    G.world.dispose();
    G.minimap.dispose();
    E.onTick = E.onTick.filter(f => f !== G.update);
  };
  E.onTick.push(G.update);
  return G;
}

// pengawas lalu lintas at zebras next to a school, polis trafik at signalised junctions
function addStaff(G) {
  const map = G.map;
  for (const cr of map.crossings) {
    const nearSchool = map.clusters.some(c => c.ch === 'S' && Math.abs(cr.tile[0] - (c.i0 + c.i1) / 2) < 3 && Math.abs(cr.tile[1] - (c.j0 + c.j1) / 2) < 3);
    if (cr.type === 'zebra' && nearSchool) {
      const p = makePerson({ role: 'pengawas', jantina: 'lelaki' });
      const off = cr.axis === 'EW' ? [2.6, 4.4] : [4.4, 2.6];
      p.root.position.set(cr.x + off[0], 0.15, cr.z + off[1]);
      p.root.rotation.y = cr.axis === 'EW' ? Math.PI : -Math.PI / 2;   // face the road
      E.scene.add(p.root);
      G.statics.push({ root: p.root, update: dt => { p.pose = G.npcs.some(w => w.state === 'kerb' && w.kerb && w.kerb.cross === cr.id) || (G.player.walker.state === 'kerb' && G.player.walker.kerb?.cross === cr.id) ? 'stop' : 'stand'; p.animate(dt, 0); } });
    }
  }
  for (let j = 0; j < map.H; j++) for (let i = 0; i < map.W; i++) if (map.at(i, j) === 'L') {
    const p = makePerson({ role: 'polis', jantina: 'lelaki', skin: 0xd9a47a });
    const [cx, cz] = map.center(i, j);
    p.root.position.set(cx + 4.6, 0.15, cz + 4.6); p.root.rotation.y = -Math.PI * 0.75;
    E.scene.add(p.root);
    G.polis = p;
    G.statics.push({ root: p.root, update: dt => p.animate(dt, 0) });
  }
}
