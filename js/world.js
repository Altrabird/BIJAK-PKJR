// Builds the 3D world for a parsed map: ground, roads, markings, buildings, signs, signal heads.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { model, mat, E } from './engine.js';
import { T, RH, DIR, OPP, SIDES, left, isRoad, isStraight, facing, key } from './map.js';
import { signMesh } from './signs.js';

export const Y_ROAD = 0.03, Y_WALK = 0.16, Y_GRASS = 0;   // grass plane at 0, asphalt just above, kerbs raised

const rotFor = s => Math.atan2(DIR[s][0], DIR[s][1]);   // rotation.y that points +Z toward side s

export function buildWorld(map, opts = {}) {
  const root = new THREE.Group(), parts = { asphalt: [], walk: [], white: [], yellow: [], field: [], park: [] };
  const W = map.W * T, H = map.H * T;
  const heads = [];      // traffic signal heads {crossing|tile, kind, lamps}
  const lamps = [];      // street lamp bulbs (lit at dusk)

  // shared geometry for signal heads (declared before the tile loop uses them)
  const headGeo = new THREE.BoxGeometry(0.36, 1.0, 0.3), lampGeo = new THREE.SphereGeometry(0.12, 10, 8), poleGeo = new THREE.CylinderGeometry(0.07, 0.07, 3.2, 8);
  const pedGeo = new THREE.BoxGeometry(0.34, 0.62, 0.22), pedFace = new THREE.PlaneGeometry(0.26, 0.26);
  // ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W + 160, H + 160), mat(0x7cb55a));
  ground.rotation.x = -Math.PI / 2; ground.position.y = Y_GRASS; ground.receiveShadow = true; root.add(ground);

  const rect = (list, x, z, w, d, y, h = 0) => {
    const g = h ? new THREE.BoxGeometry(w, h, d) : new THREE.PlaneGeometry(w, d);
    if (h) g.translate(x, y - h / 2, z); else { g.rotateX(-Math.PI / 2); g.translate(x, y, z); }
    list.push(g);
  };
  // rectangle in tile-local axes: along = road axis direction
  const rectA = (list, cx, cz, axis, a, c, la, lc, y, h) =>
    axis === 'EW' ? rect(list, cx + a, cz + c, la, lc, y, h) : rect(list, cx + c, cz + a, lc, la, y, h);

  for (let j = 0; j < map.H; j++) for (let i = 0; i < map.W; i++) {
    const ch = map.at(i, j), [cx, cz] = map.center(i, j);
    if (isRoad(ch)) roadTile(i, j, ch, cx, cz);
    else if (ch === 'q') carPark(i, j, cx, cz);
    else placeThing(i, j, ch, cx, cz);
  }

  function roadTile(i, j, ch, cx, cz) {
    const c = map.conn(i, j);
    rect(parts.asphalt, cx, cz, 2 * RH, 2 * RH, Y_ROAD);
    const arm = (T / 2 - RH), ac = RH + arm / 2;
    for (const s of SIDES) {
      const [dx, dz] = DIR[s];
      const ww = dx ? arm : 2 * RH, dd = dx ? 2 * RH : arm;
      rect(c.includes(s) ? parts.asphalt : parts.walk, cx + dx * ac, cz + dz * ac, ww, dd, c.includes(s) ? Y_ROAD : Y_WALK, c.includes(s) ? 0 : Y_WALK);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) rect(parts.walk, cx + sx * ac, cz + sz * ac, arm, arm, Y_WALK, Y_WALK);

    const y = Y_ROAD + 0.01;
    if (isStraight(c)) {
      const axis = map.axis(i, j);
      const cr = map.crossings.find(k => k.tile[0] === i && k.tile[1] === j);
      const band = cr ? (axis === 'EW' ? cr.x - cx : cr.z - cz) : null;
      // centre dashes (skip over a crossing band)
      for (const a of [-3.75, -1.25, 1.25, 3.75]) if (band === null || Math.abs(a - band) > 2.8) rectA(parts.white, cx, cz, axis, a, 0, 1.4, 0.14, y);
      // yellow kerb lines
      for (const s of [-1, 1]) rectA(parts.yellow, cx, cz, axis, 0, s * (RH - 0.2), T, 0.12, y);
      if (cr) crossingMarks(cr, cx, cz, axis, band, y);
      // street lamp on every other tile
      if ((i + j) % 2 === 0 && !cr) {
        const lm = model('streetlight'), side = (i % 4 === 0) ? 1 : -1;
        const ox = axis === 'EW' ? 0 : side * 4.4, oz = axis === 'EW' ? side * 4.4 : 0;
        lm.position.set(cx + ox, Y_WALK, cz + oz);
        lm.rotation.y = Math.atan2(-ox, -oz) + Math.PI / 2;
        root.add(lm);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1b0 }));
        bulb.position.set(cx + ox * 0.75, 4.75, cz + oz * 0.75); bulb.visible = false; root.add(bulb); lamps.push(bulb);
      }
    } else if (c.length >= 3) {
      // junction: stop lines on each approach lane + signs
      for (const s of c) {
        const din = DIR[OPP[s]], l = left(din);
        const lx = cx + DIR[s][0] * (RH + 0.4) + l[0] * RH / 2, lz = cz + DIR[s][1] * (RH + 0.4) + l[1] * RH / 2;
        if (ch === 'x') {
          rect(parts.white, lx, lz, DIR[s][0] ? 0.35 : RH, DIR[s][0] ? RH : 0.35, y);
          addSign('berhenti', cx + DIR[s][0] * 4.5 + l[0] * 4.4, cz + DIR[s][1] * 4.5 + l[1] * 4.4, s);
        } else if (ch === 'r') {
          dashLine(lx, lz, DIR[s][0] ? 'NS' : 'EW', RH, y);
        }
      }
      if (ch === 'L') junctionSignals(i, j, cx, cz);
    }
  }

  function dashLine(x, z, axis, len, y) {
    for (let k = -len / 2 + 0.25; k < len / 2; k += 0.7) rect(parts.white, axis === 'EW' ? x + k : x, axis === 'EW' ? z : z + k, axis === 'EW' ? 0.4 : 0.3, axis === 'EW' ? 0.3 : 0.4, y);
  }

  function crossingMarks(cr, cx, cz, axis, band, y) {
    if (cr.type === 'zebra') {
      for (let c = -3; c <= 3; c += 1) rectA(parts.white, cx, cz, axis, band, c, 3, 0.5, y);
    } else {
      for (const e of [-1.5, 1.5]) for (let c = -3.25; c < 3.5; c += 0.75)
        rectA(parts.white, cx, cz, axis, band + e, c, 0.3, 0.35, y);
    }
    // stop / give-way lines for each direction, on that direction's lane
    for (const d of [-1, 1]) {                       // d = side of the band traffic comes from
      // left-hand traffic: coming from -along (moving +along) uses the lane on its left
      const lc = axis === 'EW' ? (d < 0 ? -RH / 2 : RH / 2) : (d < 0 ? RH / 2 : -RH / 2);
      rectA(parts.white, cx, cz, axis, band + d * 2.6, lc, 0.3, RH, y);
    }
    if (cr.type !== 'signal') for (const s of [-1, 1]) {
      // the lane next to kerb s carries traffic moving m; put the sign where that traffic arrives
      const kerb = axis === 'EW' ? [0, s] : [s, 0], m = [-kerb[1], kerb[0]];   // left(m) === kerb
      const x = cx + (axis === 'EW' ? band : 0) + kerb[0] * 4.4 - m[0] * 2.2, z = cz + (axis === 'NS' ? band : 0) + kerb[1] * 4.4 - m[1] * 2.2;
      addSign('lintasan', x, z, null, Math.atan2(-m[0], -m[1]));
    }
    if (cr.type === 'pelican') pelicanHeads(cr, cx, cz, axis, band);
  }

  function addSign(id, x, z, faceSide, rotY) {
    const s = signMesh(id); s.position.set(x, Y_WALK, z);
    s.rotation.y = rotY ?? rotFor(faceSide);
    root.add(s); return s;
  }

  // ---- signal heads ----
  function pole(x, z) {
    const p = new THREE.Mesh(poleGeo, mat(0x3a3f45)); p.position.set(x, Y_WALK + 1.6, z); p.castShadow = true; root.add(p); return p;
  }
  function carHead(x, z, rotY, ref) {
    const g = new THREE.Group(); g.position.set(x, Y_WALK + 3.1, z); g.rotation.y = rotY;
    g.add(new THREE.Mesh(headGeo, mat(0x1d2126)));
    const L = ['R', 'A', 'G'].map((c, k) => { const m = new THREE.Mesh(lampGeo, LAMP[c][0]); m.position.set(0, 0.3 - k * 0.3, 0.13); g.add(m); return m; });
    root.add(g); heads.push({ kind: 'car', ref, lamps: L });
  }
  function pedHead(x, z, rotY, ref, button) {
    const g = new THREE.Group(); g.position.set(x, Y_WALK + 2.2, z); g.rotation.y = rotY;
    g.add(new THREE.Mesh(pedGeo, mat(0x1d2126)));
    const red = new THREE.Mesh(pedFace, PED.R[0]); red.position.set(0, 0.15, 0.115);
    const grn = new THREE.Mesh(pedFace, PED.G[0]); grn.position.set(0, -0.15, 0.115);
    g.add(red, grn);
    if (button) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.12), mat(0xf6c51b)); b.position.set(0, -1.0, 0.1); g.add(b); }
    root.add(g); heads.push({ kind: 'ped', ref, red, grn });
  }
  function junctionSignals(i, j, cx, cz) {
    for (const s of map.conn(i, j)) {
      const din = DIR[OPP[s]], l = left(din);
      const cr = map.crossings.find(k => k.signal && k.signal.tile[0] === i && k.signal.tile[1] === j && k.tile[0] === i + DIR[s][0] && k.tile[1] === j + DIR[s][1]);
      // car head on the left kerb before the crossing, facing oncoming traffic
      const back = cr ? 5 + 4.7 : 4.6;
      const px = cx + DIR[s][0] * back + l[0] * 4.3, pz = cz + DIR[s][1] * back + l[1] * 4.3;
      pole(px, pz);
      carHead(px - l[0] * 0.3, pz - l[1] * 0.3, rotFor(s), { tile: [i, j], axis: DIR[s][0] ? 'EW' : 'NS' });
      if (cr) {
        // ped heads on both kerbs at the band, facing across
        for (const k of [-1, 1]) {
          const qx = cr.x + l[0] * 4.3 * k + DIR[s][0] * 1.7, qz = cr.z + l[1] * 4.3 * k + DIR[s][1] * 1.7;
          pole(qx, qz);
          pedHead(qx, qz, Math.atan2(-l[0] * k, -l[1] * k), { crossing: cr.id }, false);
        }
      }
    }
  }
  function pelicanHeads(cr, cx, cz, axis, band) {
    for (const d of [-1, 1]) {
      // traffic from side d moves in -d along; left kerb of that traffic
      const dir = axis === 'EW' ? [-d, 0] : [0, -d], l = left(dir);
      const ax = cr.x + (axis === 'EW' ? d * 3.2 : 0) + l[0] * 4.3, az = cr.z + (axis === 'NS' ? d * 3.2 : 0) + l[1] * 4.3;
      pole(ax, az);
      carHead(ax, az, Math.atan2(-dir[0], -dir[1]), { crossing: cr.id });
      pedHead(ax, az, Math.atan2(-l[0], -l[1]), { crossing: cr.id }, true);
    }
  }

  function carPark(i, j, cx, cz) {
    rect(parts.park, cx, cz, T, T, Y_ROAD + 0.005);
    const s = facing(map, i, j), along = DIR[s][0] ? 'EW' : 'NS';
    // 3 bays across, open toward the road
    for (const c of [-3.6, -1.2, 1.2, 3.6]) rectA(parts.white, cx, cz, along, 0, c, 6, 0.15, Y_ROAD + 0.02);
    rectA(parts.white, cx, cz, along, -DIR[s][0] * 3 - DIR[s][1] * 3, 0, 0.15, 7.4, Y_ROAD + 0.02);
  }

  function placeThing(i, j, ch, cx, cz) {
    const s = facing(map, i, j), r = rotFor(s);
    const put = (o, x = cx, z = cz, ry = r) => { o.position.set(x, Y_GRASS, z); o.rotation.y = ry; root.add(o); return o; };
    const MODEL = { H: 'house_a', B: 'house_b', C: 'house_c', K: 'shop', G: 'tower' };
    if (MODEL[ch]) put(model(MODEL[ch]));
    else if (ch === 'T') { const t = put(model(['tree_a', 'tree_b', 'tree_c'][Math.floor((rnd(i + 7, j) + 0.5) * 3)]), cx + rnd(i, j) * 2, cz + rnd(j, i) * 2, rnd(i + 3, j) * 6); t.scale.setScalar(0.8 + rnd(i, j + 5) * 0.3); }
    else if (ch === 'P') { const t = put(model('palm'), cx + rnd(i, j) * 2, cz + rnd(j, i) * 2, rnd(i + 3, j) * 6); t.scale.setScalar(0.85 + rnd(i, j + 5) * 0.3); }
    else if (ch === 'M') put(surau());
    else if (ch === 'y') put(playground());
    else if (ch === 'h') put(busStop(), cx + DIR[s][0] * 3.2, cz + DIR[s][1] * 3.2);
    else if (ch === 'S' || ch === 'w') {
      const cl = map.clusters.find(c => c.tiles[0][0] === i && c.tiles[0][1] === j);
      if (cl) put(ch === 'S' ? school(cl) : field(cl), ...map.center((cl.i0 + cl.i1) / 2, (cl.j0 + cl.j1) / 2), ch === 'S' ? rotFor(facing(map, Math.round((cl.i0 + cl.i1) / 2), Math.round((cl.j0 + cl.j1) / 2))) : 0);
    }
  }

  function school(cl) {
    const g = new THREE.Group(), w = (cl.i1 - cl.i0 + 1) * T, d = (cl.j1 - cl.j0 + 1) * T;
    const s = facing(map, Math.round((cl.i0 + cl.i1) / 2), Math.round((cl.j0 + cl.j1) / 2));
    const [bw, bd] = DIR[s][0] ? [d, w] : [w, d];            // width across the facing side
    const bx = bw - 3, depth = 6.5;
    const blk = new THREE.Mesh(new THREE.BoxGeometry(bx, 6.4, depth), mat(0xf3e3c3)); blk.position.set(0, 3.2, -bd / 2 + depth / 2 + 1.5); blk.castShadow = blk.receiveShadow = true; g.add(blk);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(bx + 0.6, 0.4, depth + 0.8), mat(0x3a6ea5)); roof.position.set(0, 6.6, blk.position.z); g.add(roof);
    for (let f = 0; f < 2; f++) for (let x = -bx / 2 + 1.5; x < bx / 2 - 1; x += 2.2) {
      const wdw = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 0.1), mat(0x7fb3d5)); wdw.position.set(x, 1.8 + f * 2.8, blk.position.z + depth / 2 + 0.03); g.add(wdw);
    }
    const corridor = new THREE.Mesh(new THREE.BoxGeometry(bx, 0.2, 1.4), mat(0xd9c9a3)); corridor.position.set(0, 3.25, blk.position.z + depth / 2 + 0.7); g.add(corridor);
    // board with school name
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#1c5bb8'; x.fillRect(0, 0, 512, 128); x.fillStyle = '#fff'; x.font = '900 46px Arial'; x.textAlign = 'center';
    x.fillText('SK TAMAN BIJAK', 256, 60); x.font = '700 28px Arial'; x.fillText('Sekolah Selamat, Murid Bijak', 256, 104);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshLambertMaterial({ map: tex })); board.position.set(0, 7.5, blk.position.z + depth / 2 + 0.05); g.add(board);
    // fence along the front with a gate gap in the middle
    const fz = bd / 2 - 0.4;
    for (const sgn of [-1, 1]) {
      const len = bw / 2 - 2.2;
      const fen = new THREE.Mesh(new THREE.BoxGeometry(len, 1.1, 0.1), mat(0x2e7d32)); fen.position.set(sgn * (2.2 + len / 2), 0.55, fz); g.add(fen);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 0.4), mat(0xf6c51b)); post.position.set(sgn * 2.1, 1.1, fz); g.add(post);
    }
    // flag pole with a simple Jalur Gemilang
    const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 8, 8), mat(0xcccccc)); fp.position.set(bw / 2 - 3, 4, fz - 3); g.add(fp);
    const fc = document.createElement('canvas'); fc.width = 280; fc.height = 140; const f = fc.getContext('2d');
    for (let k = 0; k < 14; k++) { f.fillStyle = k % 2 ? '#fff' : '#cc0001'; f.fillRect(0, k * 10, 280, 10); }
    f.fillStyle = '#010066'; f.fillRect(0, 0, 140, 80); f.fillStyle = '#ffcc00'; f.beginPath(); f.arc(58, 40, 26, 0, 7); f.fill();
    f.fillStyle = '#010066'; f.beginPath(); f.arc(66, 40, 22, 0, 7); f.fill(); f.fillStyle = '#ffcc00'; star(f, 102, 40, 16, 14);
    const ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), new THREE.MeshLambertMaterial({ map: ft, side: THREE.DoubleSide })); flag.position.set(bw / 2 - 2, 7.4, fz - 3); flag.name = 'flag'; g.add(flag);
    return g;
  }
  function star(f, x, y, r, n) {
    f.beginPath();
    for (let k = 0; k < n * 2; k++) { const a = k * Math.PI / n - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; f.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); }
    f.fill();
  }
  function field(cl) {
    const g = new THREE.Group(), w = (cl.i1 - cl.i0 + 1) * T - 3, d = (cl.j1 - cl.j0 + 1) * T - 3;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(0x5fa845)); f.rotation.x = -Math.PI / 2; f.position.y = 0.02; f.receiveShadow = true; g.add(f);
    const line = (x, z, a, b) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(a, b), mat(0xffffff)); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.03, z); g.add(l); };
    line(0, -d / 2 + 0.5, w - 1, 0.15); line(0, d / 2 - 0.5, w - 1, 0.15); line(-w / 2 + 0.5, 0, 0.15, d - 1); line(w / 2 - 0.5, 0, 0.15, d - 1); line(0, 0, 0.15, d - 1);
    for (const s of [-1, 1]) {
      const goal = new THREE.Group();
      for (const z of [-1.5, 1.5]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2, 0.12), mat(0xffffff)); p.position.set(0, 1, z); goal.add(p); }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.1), mat(0xffffff)); bar.position.y = 2; goal.add(bar);
      goal.position.x = s * (w / 2 - 1); g.add(goal);
    }
    return g;
  }
  function surau() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 7), mat(0xf5f5f0)); b.position.y = 2; b.castShadow = true; g.add(b);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.3, 7.6), mat(0x2e7d32)); roof.position.y = 4.15; g.add(roof);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x2e7d32)); dome.position.y = 4.3; g.add(dome);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1, 8), mat(0xf6c51b)); tip.position.y = 6.9; g.add(tip);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.1), mat(0x6d4c41)); door.position.set(0, 1.2, 3.52); g.add(door);
    const mn = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 8, 10), mat(0xf5f5f0)); mn.position.set(3, 4, -3); g.add(mn);
    const mt = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 10), mat(0x2e7d32)); mt.position.set(3, 8.6, -3); g.add(mt);
    return g;
  }
  function playground() {
    const g = new THREE.Group();
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), mat(0xe8d39a)); sand.rotation.x = -Math.PI / 2; sand.position.y = 0.02; g.add(sand);
    const red = mat(0xe53935), blue = mat(0x1e88e5);
    for (const x of [-3, -0.6]) for (const z of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6), red); p.position.set(x, 1.3, z * 1.0 - 1.5); p.rotation.x = z * 0.15; g.add(p); }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6), red); top.rotation.z = Math.PI / 2; top.position.set(-1.8, 2.55, -1.5); g.add(top);
    for (const x of [-2.4, -1.2]) { const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.3), blue); seat.position.set(x, 0.6, -1.5); g.add(seat); }
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 1.4), blue); tower.position.set(2, 0.8, 1.5); g.add(tower);
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 3), mat(0xfdd835)); slide.position.set(2, 0.85, -0.1); slide.rotation.x = -0.5; g.add(slide);
    return g;
  }
  function busStop() {
    const g = new THREE.Group();
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 1.8), mat(0x1c5bb8)); roof.position.y = 2.5; roof.castShadow = true; g.add(roof);
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 0.08), mat(0x90a4ae)); back.position.set(0, 1.3, -0.85); g.add(back);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.5), mat(0x8d6e63)); bench.position.set(0, 0.5, -0.5); g.add(bench);
    // yellow waiting line on the pavement
    const ln = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.15), mat(0xf6c51b)); ln.rotation.x = -Math.PI / 2; ln.position.set(0, 0.06, 0.6); g.add(ln);
    const s = signMesh('bas'); s.position.set(2.2, 0, 0.6); g.add(s);
    return g;
  }

  // school-zone signs on the road tiles that touch a school
  for (const cl of map.clusters.filter(c => c.ch === 'S')) {
    const ci = Math.round((cl.i0 + cl.i1) / 2), cj = Math.round((cl.j0 + cl.j1) / 2), s = facing(map, ci, cj);
    const bi = s === 'E' ? cl.i1 + 1 : s === 'W' ? cl.i0 - 1 : ci, bj = s === 'S' ? cl.j1 + 1 : s === 'N' ? cl.j0 - 1 : cj;
    const u = DIR[s][0] ? [0, 1] : [1, 0];
    for (const k of [-2, 2]) {
      const ti = bi + u[0] * k, tj = bj + u[1] * k;
      if (!isRoad(map.at(ti, tj))) continue;
      const [x, z] = map.center(ti, tj), m = [-u[0] * Math.sign(k), -u[1] * Math.sign(k)], l = left(m);
      addSign('kawasan_sekolah', x + l[0] * 4.4, z + l[1] * 4.4, null, Math.atan2(-m[0], -m[1]));
      addSign('had_laju_30', x + l[0] * 4.4 + m[0] * 1.4, z + l[1] * 4.4 + m[1] * 1.4, null, Math.atan2(-m[0], -m[1]));
    }
  }

  // merge static geometry per material
  const MAT = { asphalt: mat(0x41454c), walk: mat(0xc9c4b8), white: mat(0xf4f4f4), yellow: mat(0xf2c230), park: mat(0x50545b) };
  for (const [k, list] of Object.entries(parts)) {
    if (!list.length) continue;
    const mesh = new THREE.Mesh(mergeGeometries(list.map(g => g.index ? g.toNonIndexed() : g)), MAT[k] || mat(0x888888));
    mesh.receiveShadow = true; mesh.castShadow = k === 'walk';
    root.add(mesh);
    list.forEach(g => g.dispose());
  }

  E.scene.add(root);
  return {
    root, heads, lamps,
    // paint signal heads from current signal state
    paint(sig) {
      for (const h of heads) {
        if (h.kind === 'car') {
          const st = h.ref.crossing !== undefined ? sig.pelicanCar(h.ref.crossing) : sig.carLight(key(...h.ref.tile), h.ref.axis);
          h.lamps.forEach((m, k) => { const c = 'RAG'[k]; m.material = LAMP[c][st === c ? 1 : 0]; });
        } else {
          const g = sig.pedGreen(h.ref.crossing), flash = sig.pedFlash(h.ref.crossing) && (performance.now() % 600 < 300);
          h.red.material = PED.R[g ? 0 : 1]; h.grn.material = PED.G[g && !flash ? 1 : 0];
        }
      }
    },
    setNight(on) { lamps.forEach(b => b.visible = on); },
    dispose() {
      E.scene.remove(root);
      root.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
    },
  };
}

// deterministic pseudo-random in [-0.5, 0.5] so the town looks the same each load
function rnd(a, b) { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s) - 0.5; }

// lamp materials [off, on]
const LAMP = {
  R: [new THREE.MeshLambertMaterial({ color: 0x3a0d0d }), new THREE.MeshBasicMaterial({ color: 0xff2a2a })],
  A: [new THREE.MeshLambertMaterial({ color: 0x3a2a0d }), new THREE.MeshBasicMaterial({ color: 0xffb300 })],
  G: [new THREE.MeshLambertMaterial({ color: 0x0d3a14 }), new THREE.MeshBasicMaterial({ color: 0x2bff5a })],
};
function manTex(color, walking) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#111'; g.fillRect(0, 0, 64, 64); g.fillStyle = color; g.strokeStyle = color; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.arc(32, 12, 7, 0, 7); g.fill();
  g.beginPath(); g.moveTo(32, 20); g.lineTo(32, 40);
  if (walking) { g.moveTo(32, 40); g.lineTo(22, 58); g.moveTo(32, 40); g.lineTo(42, 58); g.moveTo(32, 26); g.lineTo(20, 36); g.moveTo(32, 26); g.lineTo(44, 34); }
  else { g.moveTo(32, 40); g.lineTo(28, 58); g.moveTo(32, 40); g.lineTo(36, 58); g.moveTo(32, 24); g.lineTo(26, 40); g.moveTo(32, 24); g.lineTo(38, 40); }
  g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const PED = {
  R: [new THREE.MeshBasicMaterial({ map: manTex('#4a1010', false) }), new THREE.MeshBasicMaterial({ map: manTex('#ff3030', false) })],
  G: [new THREE.MeshBasicMaterial({ map: manTex('#0f3a18', true) }), new THREE.MeshBasicMaterial({ map: manTex('#33ff66', true) })],
};
