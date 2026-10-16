// Traffic lights, pelican crossings and AI vehicles (left-hand traffic).
import { key, DIR, OPP, lanePath, polyLen, polyAt, exits, sideBetween, isStraight, roadRoute } from './map.js';
import { E } from './engine.js';
import { Y_ROAD } from './world.js';
import { makeCar, setLights } from './vehicles.js';

// ---------------- signals ----------------
const PHASES = [['NS', 'G', 12], ['NS', 'A', 3], ['-', 'R', 2], ['EW', 'G', 12], ['EW', 'A', 3], ['-', 'R', 2]];
const CYCLE = PHASES.reduce((a, p) => a + p[2], 0);

export class Signals {
  constructor(map) {
    this.map = map; this.t = {};
    for (let j = 0; j < map.H; j++) for (let i = 0; i < map.W; i++) if (map.at(i, j) === 'L') this.t[key(i, j)] = (i * 7 + j * 3) % CYCLE;
    this.pel = map.crossings.map(c => c.type === 'pelican' ? { st: 'idle', t: 10 } : null);
  }
  update(dt) {
    for (const k in this.t) this.t[k] = (this.t[k] + dt) % CYCLE;
    this.pel.forEach(p => {
      if (!p) return;
      p.t += dt;
      const next = { wait: ['amber', 2.5], amber: ['walk', 2.5], walk: ['clear', 8], clear: ['idle', 2] }[p.st];
      if (next && p.t >= next[1]) { p.st = next[0]; p.t = 0; }
    });
  }
  phase(k) {
    let t = this.t[k] ?? 0;
    for (const p of PHASES) { if (t < p[2]) return { axis: p[0], c: p[1], left: p[2] - t }; t -= p[2]; }
    return { axis: '-', c: 'R', left: 0 };
  }
  carLight(k, axis) { const p = this.phase(k); return p.axis === axis ? p.c : 'R'; }
  pelicanCar(id) { const s = this.pel[id]?.st; return s === 'amber' ? 'A' : (s === 'walk' || s === 'clear') ? 'R' : 'G'; }
  pedGreen(id) {
    const cr = this.map.crossings[id];
    if (cr.type === 'zebra') return true;
    if (cr.type === 'pelican') return this.pel[id].st === 'walk';
    const p = this.phase(key(...cr.signal.tile));
    return p.c === 'G' && p.axis !== cr.axis;
  }
  pedFlash(id) {
    const cr = this.map.crossings[id];
    if (cr.type === 'pelican') return this.pel[id].st === 'walk' && this.pel[id].t > 5;
    if (cr.type === 'signal') { const p = this.phase(key(...cr.signal.tile)); return p.c === 'G' && p.axis !== cr.axis && p.left < 3; }
    return false;
  }
  press(id) { const p = this.pel[id]; if (p && p.st === 'idle' && p.t > 4) { p.st = 'wait'; p.t = 0; return true; } return false; }
}

// ---------------- AI vehicles ----------------
let NEXT_ID = 1;

export class Traffic {
  constructor(map, signals, opts = {}) {
    this.map = map; this.sig = signals; this.cars = []; this.locks = new Map();
    this.opts = { vmax: 8, bad: 0, kinds: null, ...opts };
    this.onNearMiss = null;   // (obstacleRef, car) => void
    this.onHorn = null;
    this.onHit = null;        // (pedObstacle, car) => void   a car struck a pedestrian
    this.onViolation = null;  // (car, why) => void            a driver broke a rule (police may chase)
    this.onSummons = null;    // (car, police) => void          police finished pulling the car over
  }

  spawnRandom(n) {
    const roads = [];
    for (let j = 0; j < this.map.H; j++) for (let i = 0; i < this.map.W; i++)
      if (this.map.at(i, j) === 'r' && isStraight(this.map.conn(i, j))) roads.push([i, j]);
    for (let k = 0; k < n && roads.length; k++) {
      const t = roads.splice((Math.random() * roads.length) | 0, 1)[0];
      const c = this.map.conn(...t);
      this.add({ tile: t, ent: c[(Math.random() * c.length) | 0], s: 3 });
    }
  }

  // opts: tile, ent, mesh, kind, route [[i,j]...], vmax, half (half length), bad, s
  add(o) {
    const car = {
      id: NEXT_ID++, tile: o.tile, ent: o.ent, s: o.s || 0, v: 0,
      vmax: o.vmax ?? this.opts.vmax * (0.85 + Math.random() * 0.3), half: o.half ?? this.opts.half ?? 2.3,
      bad: o.bad ?? (Math.random() < this.opts.bad), route: o.route || null, ri: 0,
      mesh: o.mesh || (this.opts.make ? this.opts.make() : makeCar(this.opts.kinds ? this.opts.kinds[(Math.random() * this.opts.kinds.length) | 0] : o.kind)),
      stopAt: null, wait: 0, stopped: {}, blockT: 0, arrived: false, hold: 0,
    };
    car.runRed = car.bad && Math.random() < 0.6;
    if (car.route) { car.ri = car.route.findIndex(t => t[0] === o.tile[0] && t[1] === o.tile[1]); }
    car.ext = this.pickExit(car, car.tile, car.ent);
    car.path = lanePath(this.map, ...car.tile, car.ent, car.ext); car.len = polyLen(car.path);
    this.planNext(car);
    E.scene.add(car.mesh);
    this.place(car);
    this.cars.push(car);
    return car;
  }

  remove(car) {
    E.scene.remove(car.mesh);
    this.cars = this.cars.filter(c => c !== car);
    for (const [k, v] of this.locks) if (v === car.id) this.locks.delete(k);
  }
  clear() { for (const c of [...this.cars]) this.remove(c); }

  pickExit(car, tile, ent) {
    // a chasing police car takes the same exit as the car it is following
    const t = car.chase;
    if (t && t.tile[0] === tile[0] && t.tile[1] === tile[1]) return t.ext;
    if (car.route) {
      const idx = car.route.findIndex((t, k) => k >= car.ri && t[0] === tile[0] && t[1] === tile[1]);
      if (idx >= 0 && idx < car.route.length - 1) return sideBetween(tile, car.route[idx + 1]);
      // last tile of the route: wander from here on
    }
    const ex = exits(this.map, ...tile, ent, true);
    return ex[(Math.random() * ex.length) | 0];
  }

  planNext(car) {
    const ni = [car.tile[0] + DIR[car.ext][0], car.tile[1] + DIR[car.ext][1]];
    if (!this.map.conn(...ni).length) { car.next = null; return; }
    const ent = OPP[car.ext], ext = this.pickExit(car, ni, ent);
    const path = lanePath(this.map, ...ni, ent, ext);
    car.next = { tile: ni, ent, ext, path, len: polyLen(path) };
  }

  place(car) {
    const p = polyAt(car.path, car.s);
    car.x = p.x; car.z = p.z; car.dx = p.dx; car.dz = p.dz;
    car.mesh.position.set(p.x, Y_ROAD, p.z);
    car.mesh.rotation.y = Math.atan2(p.dx, p.dz);
  }

  // distance from the car's FRONT BUMPER to the next stop line for signals / junctions / crossings (Infinity if none)
  controlGap(car, dt) {
    const m = this.map, sig = this.sig, rem = car.len - car.s, front = car.s + car.half;
    let gap = Infinity;
    const nt = car.next?.tile, nch = nt ? m.at(...nt) : '.';
    const axisOf = side => DIR[side][0] ? 'EW' : 'NS';

    // signalised junction ahead
    if (nch === 'L') {
      const cr = m.crossings.find(c => c.type === 'signal' && c.tile[0] === car.tile[0] && c.tile[1] === car.tile[1]);
      const stop = cr ? 5.4 : car.len - 1, d = stop - front;   // crossing band starts 1.1 m past the line
      const light = sig.carLight(key(...nt), axisOf(car.ext));
      if (d > -0.2) {
        if (light === 'R' && car.runRed && !car.siren && d < 1.5 && car.v > 1) this.violation(car, 'LAMPU_MERAH');
        if (light === 'R' && !car.runRed && !car.siren) gap = Math.min(gap, d);
        // amber: stop if we comfortably can (bad drivers push through)
        else if (light === 'A' && !car.bad && !car.siren && d > car.v * car.v / 10) gap = Math.min(gap, d);
      }
    }
    // pelican / zebra in this tile or the next
    const crossCheck = (tile, base) => {
      const cr = m.crossings.find(c => (c.type === 'pelican' || c.type === 'zebra') && c.tile[0] === tile[0] && c.tile[1] === tile[1]);
      if (!cr) return;
      const d = base + 2 - front;   // stop line 1.5 m before the 3 m band in the middle of the tile
      if (d < -0.2 || d > 25) return;
      if (cr.type === 'pelican' && sig.pelicanCar(cr.id) !== 'G') {
        if (!(sig.pelicanCar(cr.id) === 'A' && d < 3)) gap = Math.min(gap, d);
      }
      if (cr.type === 'zebra' && this.zebraBusy(cr, car)) gap = Math.min(gap, d);
    };
    crossCheck(car.tile, 0);
    if (nt) crossCheck(nt, car.len);

    // unsignalised junction: lock (+ full stop at BERHENTI)
    if (nt && (nch === 'x' || (nch === 'r' && m.conn(...nt).length >= 3))) {
      const k = key(...nt), dist = rem - 0.6 - car.half;
      if (nch === 'x' && !car.stopped[k]) {
        gap = Math.min(gap, dist);
        if (dist < 1.2 && car.v < 0.3) { car.wait += dt; if (car.wait > 0.8) { car.stopped[k] = true; car.wait = 0; } }
      } else if (dist < 6) {
        const owner = this.locks.get(k);
        if (owner && owner !== car.id && car.blockT < 7) gap = Math.min(gap, dist);
        else if (!owner) this.locks.set(k, car.id);
      }
    }
    // mission stop point (bus stop, drop-off): measured to the car's centre, as the missions place them
    if (car.stopAt) {
      const st = car.stopAt;
      if (st.tile[0] === car.tile[0] && st.tile[1] === car.tile[1]) gap = Math.min(gap, st.s - car.s);
      else if (nt && st.tile[0] === nt[0] && st.tile[1] === nt[1]) gap = Math.min(gap, rem + st.s);
    }
    return gap;
  }

  zebraBusy(cr, car) {
    for (const o of this.obstacles) {
      if (o.kind !== 'ped') continue;
      const da = cr.axis === 'EW' ? Math.abs(o.x - cr.x) : Math.abs(o.z - cr.z);
      const dc = cr.axis === 'EW' ? Math.abs(o.z - cr.z) : Math.abs(o.x - cr.x);
      if (da < 1.7 && dc < 3.6) return true;                                 // on the zebra
      if (!car.bad && da < 2.2 && dc < 5.2 && o.waiting && o.cross === cr.id) return true;   // waiting at the kerb to use this zebra
    }
    return false;
  }

  // points ahead along current + next lane path, every metre
  ahead(car, dist = 18) {
    const out = [];
    for (let d = 1; d <= dist; d += 1) {
      const s = car.s + d;
      let p;
      if (s <= car.len) p = polyAt(car.path, s);
      else if (car.next && s - car.len <= car.next.len) p = polyAt(car.next.path, s - car.len);
      else break;
      out.push([p.x, p.z, d]);
    }
    return out;
  }

  junctionAt(x, z) {
    const t = this.map.tileAt(x, z), ch = this.map.at(...t);
    return ch === 'L' || ch === 'x' || (ch === 'r' && this.map.conn(...t).length >= 3);
  }
  // does a car at (x, z) heading (dx, dz) stand on a crossing or in a junction?
  blocking(x, z, dx, dz, half) {
    for (let d = -half; d <= half; d += 0.5) { const px = x + dx * d, pz = z + dz * d; if (this.map.crossAt(px, pz) >= 0 || this.junctionAt(px, pz)) return true; }
    return false;
  }

  violation(car, why) {
    if (car.violated || car.siren) return;
    car.violated = why;
    this.onViolation && this.onViolation(car, why);
  }

  // police car `p` follows `car` through the road network and pulls it over
  chase(p, car) {
    p.chase = car; p.siren = true; p.vmax = 12;
    p.route = roadRoute(this.map, p.tile, car.tile); p.ri = 0;
  }

  update(dt, obstacles = []) {
    this.obstacles = obstacles;
    const gone = [];
    const night = (E.dusk || 0) > 0.5;
    // crossing bands with someone on them: drivers stop at the band, not at the person
    const busy = new Set();
    for (const o of obstacles) if (o.kind === 'ped') { const id = this.map.crossAt(o.x, o.z); if (id >= 0) busy.add(id); }
    for (const car of this.cars) {
      if (car.temp && car.leaving && (car.leaving -= dt) < 0 && Math.hypot(car.x - E.cam.target.x, car.z - E.cam.target.z) > 45) { gone.push(car); continue; }
      if (car.arrived) { if (car.temp) gone.push(car); continue; }
      if (car.hold > 0) { car.hold -= dt; car.v = 0; continue; }
      // pulled over: creep on until clear of junctions and crossings, then stop
      let gap = car.pulled ? (this.blocking(car.x, car.z, car.dx, car.dz, car.half) ? 4 : 0) : this.controlGap(car, dt);
      // anything physically in our path
      const pts = this.ahead(car, Math.max(10, car.v * 2.5 + 6));
      let pedHit = null, band = -1, bandLen = 0;
      for (const [x, z, d] of pts) {
        // first keep-clear zone ahead: a crossing band (3 m) or a junction box (10 m)
        if (band < 0 && d > car.half) { if (this.map.crossAt(x, z) >= 0) { band = d; bandLen = 3.5; } else if (this.junctionAt(x, z)) { band = d; bandLen = 10; } }
        if (d - car.half > gap) break;
        if (busy.size && !(car.bad && d > 4)) { const id = this.map.crossAt(x, z); if (id >= 0 && busy.has(id)) { const g = d - car.half - 1.2; if (g < gap) { gap = g; pedHit = null; } } }
        for (const o of obstacles) {
          if (o.kind === 'ped' && car.bad && d > 4) continue;   // careless drivers notice people late
          const r = o.kind === 'ped' ? 1.3 : (o.half || 1.2) + 0.4;
          if (Math.abs(o.x - x) < r && Math.abs(o.z - z) < r) { const g = d - car.half - (o.kind === 'ped' ? 0.8 : o.half || 1); if (g < gap) { gap = g; pedHit = o.kind === 'ped' ? o : null; } }
        }
        for (const c of this.cars) {
          if (c === car) continue;
          if (Math.abs(c.x - x) < 1.5 && Math.abs(c.z - z) < 1.5) {
            let g = d - car.half - c.half - 0.6 - Math.max(0, car.v - c.v) * 0.8;   // keep a time gap when closing in
            // queueing: never stop on a crossing; wait before it unless the whole car fits past it
            const front = car.half + g;
            // (only while the line is still ahead: a car already on or in the zone just follows on)
            const line = band - car.half - 1.2;
            if (band >= 0 && line > -0.2 && front > band - 1 && front - 2 * car.half < band + bandLen) g = Math.min(g, line);
            if (g < gap) { gap = g; pedHit = null; }
          }
        }
      }
      // speed control
      const brake = 5, allowed = gap === Infinity ? car.vmax : Math.sqrt(2 * brake * Math.max(0, gap));
      if (pedHit && car.v > 2 && car.v * car.v / (2 * Math.max(gap, 0.1)) > 6.5) this.onNearMiss && this.onNearMiss(pedHit, car);
      if (gap < 0.25 && car.v < 1.5) car.v = 0;   // faster than that, a car can only brake at 10 m/s² (and may not stop in time)
      else if (car.v > allowed) car.v = Math.max(allowed, car.v - 10 * dt);
      else car.v = Math.min(car.vmax, allowed, car.v + 2.6 * dt);
      car.blockT = car.v < 0.2 ? car.blockT + dt : 0;
      if (pedHit && car.blockT > 1.6 && !pedHit.honked) { pedHit.honked = true; this.onHorn && this.onHorn(car); }

      // police: pull the target over once right behind it, then issue the summons
      const tg = car.chase;
      if (tg) {
        const d = Math.hypot(tg.x - car.x, tg.z - car.z), done = { chase: null, siren: false, route: null, vmax: 8, leaving: 20 };
        car.chaseT = (car.chaseT || 0) + dt;
        if (!this.cars.includes(tg) || car.chaseT > 90) { tg.pulled = false; Object.assign(car, done); }   // lost them
        else {
          if (d < 14) tg.pulled = true;
          // stopped behind them (cars may have queued in between): issue the summons
          if (tg.pulled && d < 30 && tg.v < 0.2 && car.v < 0.3 && (car.ticket = (car.ticket || 0) + dt) > 3) {
            this.onSummons && this.onSummons(tg, car);
            Object.assign(tg, { pulled: false, bad: false, runRed: false, violated: null });
            Object.assign(car, done);
          }
        }
      }

      car.s += car.v * dt;
      while (car.s >= car.len) {
        if (!car.next) { car.s = car.len; car.v = 0; car.arrived = true; break; }
        // release junction lock when leaving it
        const k = key(...car.tile);
        if (this.locks.get(k) === car.id) this.locks.delete(k);
        car.s -= car.len;
        Object.assign(car, { tile: car.next.tile, ent: car.next.ent, ext: car.next.ext, path: car.next.path, len: car.next.len });
        delete car.stopped[key(...car.tile)];   // full stop is needed again next time we approach
        car.runRed = car.bad && Math.random() < 0.6;
        if (car.chase) { car.route = roadRoute(this.map, car.tile, car.chase.tile); car.ri = 0; }
        if (car.route) { const idx = car.route.findIndex((t, n) => n >= car.ri && t[0] === car.tile[0] && t[1] === car.tile[1]); if (idx >= 0) car.ri = idx; if (car.ri >= car.route.length - 1 && car.onRouteEnd) car.onRouteEnd(car); }
        this.planNext(car);
      }
      this.place(car);
      setLights(car.mesh, night || car.siren);
      // a pedestrian inside the front of a moving car is hit
      if (car.v > 1.2 && this.onHit) for (const o of obstacles) {
        if (o.kind !== 'ped' || o.injured) continue;
        const lx = o.x - car.x, lz = o.z - car.z, along = lx * car.dx + lz * car.dz, lat = Math.abs(lx * car.dz - lz * car.dx);
        if (along > 0 && along < car.half + 0.35 && lat < 1.05) {
          this.onHit(o, car);
          car.hold = 4; car.v = 0;
          this.violation(car, 'LANGGAR_ORANG');
          break;
        }
      }
    }
    gone.forEach(c => this.remove(c));
  }
}
