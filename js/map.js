// Pure map logic: tile grid, road connectivity, lane paths, walk grid, A*.
// No three.js imports here so node tests can load it.

export const T = 10;            // tile size (m)
export const RH = 3.5;          // half road width (two 3.5 m lanes)
export const LANE = 1.75;       // lane centre offset from road centre
export const DIR = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
export const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
export const SIDES = ['N', 'E', 'S', 'W'];

// Left of travel direction = where you drive in Malaysia.
export const left = ([dx, dz]) => [dz, -dx];
export const right = ([dx, dz]) => [-dz, dx];
export const sideOf = ([dx, dz]) => SIDES.find(s => DIR[s][0] === dx && DIR[s][1] === dz);

export const isRoad = ch => 'rLzpx'.includes(ch);
export const BUILDING = 'HBCKSGM';           // chars that block walking
export const CELL = { WALK: 0, ROAD: 1, CROSS: 2, BLOCK: 3, DRIVE: 4 };

export const key = (i, j) => i + ',' + j;

export function parseMap(def) {
  const rows = def.rows, H = rows.length, W = rows[0].length;
  const g = rows.map(r => r.split(''));
  const at = (i, j) => (i < 0 || j < 0 || i >= W || j >= H) ? '.' : g[j][i];
  const conn = (i, j) => isRoad(at(i, j)) ? SIDES.filter(s => isRoad(at(i + DIR[s][0], j + DIR[s][1]))) : [];
  // normalise tiles a builder may have put in impossible places
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const ch = g[j][i], c = conn(i, j);
    if ((ch === 'L' || ch === 'x') && c.length < 3) g[j][i] = 'r';
    if ((ch === 'z' || ch === 'p') && !isStraight(c)) g[j][i] = 'r';
  }
  const map = { name: def.name || '', W, H, g, at, places: def.places || {}, spawn: def.spawn || [0, 0] };
  map.conn = conn;
  map.center = (i, j) => [(i - W / 2 + 0.5) * T, (j - H / 2 + 0.5) * T];
  map.tileAt = (x, z) => [Math.floor(x / T + W / 2), Math.floor(z / T + H / 2)];
  map.axis = (i, j) => { const c = conn(i, j); return c.includes('E') || c.includes('W') ? 'EW' : 'NS'; };
  map.crossings = findCrossings(map);
  buildWalkGrid(map);
  map.clusters = findClusters(map);
  return map;
}

export const isStraight = c => c.length === 2 && OPP[c[0]] === c[1];

// Pedestrian crossings: zebra/pelican tiles, plus the 4 arms of a signalised junction.
function findCrossings(map) {
  const out = [];
  const add = (i, j, type, offset, signal) => {
    const [cx, cz] = map.center(i, j), axis = map.axis(i, j);
    // band is 3 m wide along the road, spans the road width
    const ox = axis === 'EW' ? offset : 0, oz = axis === 'NS' ? offset : 0;
    out.push({ id: out.length, type, tile: [i, j], axis, x: cx + ox, z: cz + oz, signal, pressed: 0 });
  };
  for (let j = 0; j < map.H; j++) for (let i = 0; i < map.W; i++) {
    const ch = map.at(i, j);
    if (ch === 'z') add(i, j, 'zebra', 0);
    if (ch === 'p') add(i, j, 'pelican', 0);
    if (ch === 'L') for (const s of map.conn(i, j)) {
      const ni = i + DIR[s][0], nj = j + DIR[s][1];
      if (map.at(ni, nj) !== 'r' || !isStraight(map.conn(ni, nj))) continue;
      // band sits in the neighbour tile, on the edge touching the junction
      const off = -(DIR[s][0] + DIR[s][1]) * 3;
      add(ni, nj, 'signal', off, { tile: [i, j], axis: map.axis(ni, nj) });
    }
  }
  return out;
}

// 1 m walk grid. Road shape inside a road tile = centre square plus arms to connected sides.
function buildWalkGrid(map) {
  const gw = map.W * T, gh = map.H * T;
  const cell = new Uint8Array(gw * gh), cross = new Int16Array(gw * gh).fill(-1);
  for (let j = 0; j < map.H; j++) for (let i = 0; i < map.W; i++) {
    const ch = map.at(i, j), c = map.conn(i, j);
    for (let v = 0; v < T; v++) for (let u = 0; u < T; u++) {
      const lu = u + 0.5 - T / 2, lv = v + 0.5 - T / 2, idx = (j * T + v) * gw + i * T + u;
      let t = CELL.WALK;
      if (isRoad(ch)) {
        const inC = Math.abs(lu) < RH && Math.abs(lv) < RH;
        const arm = (c.includes('E') && lu >= RH && Math.abs(lv) < RH) || (c.includes('W') && lu <= -RH && Math.abs(lv) < RH)
          || (c.includes('S') && lv >= RH && Math.abs(lu) < RH) || (c.includes('N') && lv <= -RH && Math.abs(lu) < RH);
        if (inC || arm) t = CELL.ROAD;
        else if (drivewayNext(map, i, j, lu, lv)) t = CELL.DRIVE;
      } else if (BUILDING.includes(ch)) {
        // school tiles merge with school neighbours so the cluster has no gaps
        const ext = s => ch === 'S' && map.at(i + DIR[s][0], j + DIR[s][1]) === 'S' ? 5 : 4;
        if (lu > -ext('W') && lu < ext('E') && lv > -ext('N') && lv < ext('S')) t = CELL.BLOCK;
      } else if ('TP'.includes(ch)) {
        if (Math.abs(lu) < 0.8 && Math.abs(lv) < 0.8) t = CELL.BLOCK;
      } else if (ch === 'q') t = CELL.DRIVE;
      cell[idx] = t;
    }
  }
  // paint crossing bands over road cells
  for (const cr of map.crossings) {
    const along = 1.5, across = RH;
    for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) {
      const x = cr.x + dx, z = cr.z + dz;
      const a = cr.axis === 'EW' ? Math.abs(dx) : Math.abs(dz), b = cr.axis === 'EW' ? Math.abs(dz) : Math.abs(dx);
      if (a > along || b > across) continue;
      const cx = Math.floor(x + gw / 2), cz = Math.floor(z + gh / 2);
      if (cx < 0 || cz < 0 || cx >= gw || cz >= gh) continue;
      const idx = cz * gw + cx;
      if (cell[idx] === CELL.ROAD) { cell[idx] = CELL.CROSS; cross[idx] = cr.id; }
    }
  }
  Object.assign(map, { gw, gh, cell, cross });
  map.cellAt = (x, z) => {
    const cx = Math.floor(x + gw / 2), cz = Math.floor(z + gh / 2);
    return (cx < 0 || cz < 0 || cx >= gw || cz >= gh) ? CELL.BLOCK : cell[cz * gw + cx];
  };
  map.crossAt = (x, z) => {
    const cx = Math.floor(x + gw / 2), cz = Math.floor(z + gh / 2);
    return (cx < 0 || cz < 0 || cx >= gw || cz >= gh) ? -1 : cross[cz * gw + cx];
  };
}

// sidewalk cells of a road tile that touch a car-park tile become a driveway
function drivewayNext(map, i, j, lu, lv) {
  if (lu > RH && map.at(i + 1, j) === 'q') return Math.abs(lv) < RH;
  if (lu < -RH && map.at(i - 1, j) === 'q') return Math.abs(lv) < RH;
  if (lv > RH && map.at(i, j + 1) === 'q') return Math.abs(lu) < RH;
  if (lv < -RH && map.at(i, j - 1) === 'q') return Math.abs(lu) < RH;
  return false;
}

// Connected same-char groups for big multi-tile things (school, field).
function findClusters(map) {
  const seen = new Set(), out = [];
  for (let j = 0; j < map.H; j++) for (let i = 0; i < map.W; i++) {
    const ch = map.at(i, j);
    if (!'Sw'.includes(ch) || seen.has(key(i, j))) continue;
    const tiles = [], q = [[i, j]]; seen.add(key(i, j));
    while (q.length) {
      const [a, b] = q.pop(); tiles.push([a, b]);
      for (const s of SIDES) {
        const na = a + DIR[s][0], nb = b + DIR[s][1];
        if (map.at(na, nb) === ch && !seen.has(key(na, nb))) { seen.add(key(na, nb)); q.push([na, nb]); }
      }
    }
    const is = tiles.map(t => t[0]), js = tiles.map(t => t[1]);
    out.push({ ch, tiles, i0: Math.min(...is), i1: Math.max(...is), j0: Math.min(...js), j1: Math.max(...js) });
  }
  return out;
}

// Which side a building on (i,j) faces: nearest road within 3 tiles, else south.
export function facing(map, i, j) {
  for (let d = 1; d <= 3; d++) for (const s of SIDES) if (isRoad(map.at(i + DIR[s][0] * d, j + DIR[s][1] * d))) return s;
  return 'S';
}

// Point just outside a place's footprint, toward its road. Used as mission goal.
export function doorPoint(map, place) {
  const [i, j] = place;
  const cl = map.clusters.find(c => c.tiles.some(t => t[0] === i && t[1] === j));
  if (cl) {
    const ci = (cl.i0 + cl.i1) / 2, cj = (cl.j0 + cl.j1) / 2;
    const s = facing(map, Math.round(ci), Math.round(cj));
    const [x, z] = map.center(ci, cj);
    const hx = (cl.i1 - cl.i0 + 1) * T / 2, hz = (cl.j1 - cl.j0 + 1) * T / 2;
    return [x + DIR[s][0] * (hx - 0.6), z + DIR[s][1] * (hz - 0.6)];
  }
  const s = facing(map, i, j), [x, z] = map.center(i, j);
  return [x + DIR[s][0] * 4.6, z + DIR[s][1] * 4.6];
}

// ---------- lane geometry ----------
// Points (x,z) a car follows through tile (i,j), entering from side `ent`, leaving by side `ext`.
export function lanePath(map, i, j, ent, ext) {
  const [cx, cz] = map.center(i, j);
  const din = DIR[OPP[ent]], dout = DIR[ext];
  const li = left(din), lo = left(dout);
  const p0 = [cx + DIR[ent][0] * T / 2 + li[0] * LANE, cz + DIR[ent][1] * T / 2 + li[1] * LANE];
  const p2 = [cx + dout[0] * T / 2 + lo[0] * LANE, cz + dout[1] * T / 2 + lo[1] * LANE];
  if (ext === OPP[ent]) return [p0, p2];
  let c;
  if (ext === ent) c = [cx + din[0] * 2, cz + din[1] * 2];            // dead-end U-turn
  else c = din[0] !== 0 ? [p2[0], p0[1]] : [p0[0], p2[1]];            // corner of the two lane lines
  const pts = [];
  for (let k = 0; k <= 8; k++) {
    const t = k / 8, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t;
    pts.push([a * p0[0] + b * c[0] + d * p2[0], a * p0[1] + b * c[1] + d * p2[1]]);
  }
  return pts;
}

export function polyLen(pts) {
  let L = 0;
  for (let k = 1; k < pts.length; k++) L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
  return L;
}

// Position + heading at distance s along a polyline.
export function polyAt(pts, s) {
  for (let k = 1; k < pts.length; k++) {
    const dx = pts[k][0] - pts[k - 1][0], dz = pts[k][1] - pts[k - 1][1], l = Math.hypot(dx, dz);
    if (s <= l || k === pts.length - 1) {
      const t = l ? Math.min(1, Math.max(0, s / l)) : 0;
      return { x: pts[k - 1][0] + dx * t, z: pts[k - 1][1] + dz * t, dx: dx / (l || 1), dz: dz / (l || 1) };
    }
    s -= l;
  }
}

// Possible exits for a car entering (i,j) from side `ent`.
export function exits(map, i, j, ent, noRight) {
  const c = map.conn(i, j);
  let ex = c.filter(s => s !== ent);
  if (noRight && map.at(i, j) === 'L') {
    const r = sideOf(right(DIR[OPP[ent]]));
    if (ex.length > 1) ex = ex.filter(s => s !== r);
  }
  return ex.length ? ex : [ent];
}

// BFS over road tiles. Returns list of [i,j] from a to b inclusive, or null.
export function roadRoute(map, a, b) {
  const prev = new Map(), q = [a]; prev.set(key(...a), null);
  while (q.length) {
    const [i, j] = q.shift();
    if (i === b[0] && j === b[1]) break;
    for (const s of map.conn(i, j)) {
      const n = [i + DIR[s][0], j + DIR[s][1]], k = key(...n);
      if (!prev.has(k)) { prev.set(k, [i, j]); q.push(n); }
    }
  }
  if (!prev.has(key(...b))) return null;
  const out = []; let cur = b;
  while (cur) { out.unshift(cur); cur = prev.get(key(...cur)); }
  return out;
}

export function sideBetween(a, b) { return sideOf([b[0] - a[0], b[1] - a[1]]); }

// ---------- A* on the walk grid ----------
const COST = [1, 40, 1, Infinity, 1.2];

// roadCost: how much a pedestrian avoids walking on the road (NPCs keep to crossings; the player may choose to jaywalk)
export function findPath(map, from, to, roadCost = COST[CELL.ROAD]) {
  const { gw, gh, cell } = map;
  const sx = Math.floor(from[0] + gw / 2), sz = Math.floor(from[1] + gh / 2);
  let tx = Math.floor(to[0] + gw / 2), tz = Math.floor(to[1] + gh / 2);
  const inb = (x, z) => x >= 0 && z >= 0 && x < gw && z < gh;
  if (!inb(sx, sz) || !inb(tx, tz)) return null;
  if (cell[tz * gw + tx] === CELL.BLOCK) {      // clicked a building: walk to nearest free cell
    let best = null, bd = 1e9;
    for (let r = 1; r < 8 && !best; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const x = tx + dx, z = tz + dz;
      if (inb(x, z) && cell[z * gw + x] !== CELL.BLOCK) {
        const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = [x, z]; }
      }
    }
    if (!best) return null;
    [tx, tz] = best;
  }
  const N = gw * gh, g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1);
  const heap = new Heap(), start = sz * gw + sx, goal = tz * gw + tx;
  g[start] = 0; heap.push(start, 0);
  const closed = new Uint8Array(N);
  while (heap.size) {
    const cur = heap.pop();
    if (cur === goal) break;
    if (closed[cur]) continue; closed[cur] = 1;
    const cx = cur % gw, cz = (cur / gw) | 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = cx + dx, nz = cz + dz;
      if (!inb(nx, nz)) continue;
      const n = nz * gw + nx, c = cell[n] === CELL.ROAD ? roadCost : COST[cell[n]];
      if (c === Infinity) continue;
      if (dx && dz && (cell[cz * gw + nx] === CELL.BLOCK || cell[nz * gw + cx] === CELL.BLOCK)) continue;
      const ng = g[cur] + c * (dx && dz ? 1.4142 : 1);
      if (ng < g[n]) { g[n] = ng; came[n] = cur; heap.push(n, ng + Math.hypot(nx - tx, nz - tz)); }
    }
  }
  if (came[goal] === -1 && goal !== start) return null;
  const cells = [];
  for (let c = goal; c !== -1; c = came[c]) cells.unshift(c);
  const pts = cells.map(c => [c % gw - gw / 2 + 0.5, ((c / gw) | 0) - gh / 2 + 0.5, cell[c]]);
  return smooth(map, pts);
}

// Drop waypoints that lie in a straight walkable line; never smooth across road/crossing cells.
function smooth(map, pts) {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  let a = 0;
  while (a < pts.length - 1) {
    let b = a + 1;
    if (pts[a][2] === CELL.WALK || pts[a][2] === CELL.DRIVE)
      while (b + 1 < pts.length && (pts[b + 1][2] === CELL.WALK || pts[b + 1][2] === CELL.DRIVE) && lineWalkable(map, pts[a], pts[b + 1])) b++;
    out.push(pts[b]); a = b;
  }
  return out;
}

function lineWalkable(map, a, b) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d * 2);
  for (let k = 1; k < n; k++) {
    const t = k / n, c = map.cellAt(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
    if (c !== CELL.WALK && c !== CELL.DRIVE) return false;
  }
  return true;
}

class Heap {
  constructor() { this.k = []; this.p = []; }
  get size() { return this.k.length; }
  push(k, p) {
    const K = this.k, P = this.p; let i = K.length; K.push(k); P.push(p);
    while (i > 0) { const pa = (i - 1) >> 1; if (P[pa] <= P[i]) break; [K[pa], K[i]] = [K[i], K[pa]]; [P[pa], P[i]] = [P[i], P[pa]]; i = pa; }
  }
  pop() {
    const K = this.k, P = this.p, top = K[0], lk = K.pop(), lp = P.pop();
    if (K.length) {
      K[0] = lk; P[0] = lp; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < K.length && P[l] < P[m]) m = l;
        if (r < K.length && P[r] < P[m]) m = r;
        if (m === i) break;
        [K[m], K[i]] = [K[i], K[m]]; [P[m], P[i]] = [P[i], P[m]]; i = m;
      }
    }
    return top;
  }
}

// Map <-> share code (build mode). Rows joined by '/', base64url.
export function encodeMap(def) {
  const s = JSON.stringify({ r: def.rows.join('/'), p: def.places, s: def.spawn, n: def.name });
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeMap(code) {
  const s = decodeURIComponent(escape(atob(code.replace(/-/g, '+').replace(/_/g, '/'))));
  const o = JSON.parse(s);
  const rows = String(o.r).split('/');
  if (!rows.length || rows.some(r => r.length !== rows[0].length) || rows.length > 40 || rows[0].length > 40) throw new Error('peta rosak');
  if (!/^[.rLzpxqHBCKSGMTPywh]+$/.test(rows.join(''))) throw new Error('aksara tidak sah');
  return { rows, places: o.p || {}, spawn: o.s || [0, 0], name: String(o.n || 'Peta Kongsi').slice(0, 40) };
}
