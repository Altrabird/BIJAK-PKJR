// GTA-style minimap in the HUD: the town around the player, turning with the camera, with the mission pin
// (held on the rim when it is far), police, ambulances and accidents. M or a click opens the full map.
import { E } from './engine.js';
import { T, RH, DIR, isRoad } from './map.js';
import { HUD } from './hud.js';

const PX = 2;                       // static layer: pixels per metre
const MINI = 92, ZOOM = 1.5;        // minimap radius (css px) and css px per metre
const COL = {
  grass: '#7fb069', walk: '#cfc9bd', road: '#454b55', line: '#f2f2f2', water: '#4aa3df',
  H: '#c0785c', B: '#c0785c', C: '#c0785c', K: '#e0a040', S: '#3f7fd1', G: '#8a93a3', M: '#3fae7a',
  T: '#2f6b2f', P: '#3c8a3c', y: '#f2c94c', w: '#5fbf5f', q: '#9aa1ab', h: '#1c5bb8',
};

function drawTown(map) {
  const W = map.W * T, H = map.H * T, c = document.createElement('canvas');
  c.width = W * PX; c.height = H * PX;
  const g = c.getContext('2d'), m = v => v * PX;
  g.fillStyle = COL.grass; g.fillRect(0, 0, c.width, c.height);
  for (let j = 0; j < map.H; j++) for (let i = 0; i < map.W; i++) {
    const ch = map.at(i, j), [cx, cz] = map.center(i, j), x0 = m(cx - T / 2 + W / 2), z0 = m(cz - T / 2 + H / 2), mx = m(cx + W / 2), mz = m(cz + H / 2);
    if (isRoad(ch)) {
      g.fillStyle = COL.walk; g.fillRect(x0, z0, m(T), m(T));
      g.fillStyle = COL.road; g.fillRect(mx - m(RH), mz - m(RH), m(2 * RH), m(2 * RH));
      for (const s of map.conn(i, j)) {
        const [dx, dz] = DIR[s];
        g.fillRect(dx ? (dx > 0 ? mx : x0) : mx - m(RH), dz ? (dz > 0 ? mz : z0) : mz - m(RH), dx ? m(T / 2) : m(2 * RH), dz ? m(T / 2) : m(2 * RH));
      }
    } else if (COL[ch]) {
      g.fillStyle = COL[ch];
      if ('TP'.includes(ch)) { g.beginPath(); g.arc(mx, mz, m(2.2), 0, Math.PI * 2); g.fill(); }
      else if (ch === 'h') g.fillRect(mx - m(2), mz - m(1), m(4), m(2));
      else { const p = 'Sw'.includes(ch) ? 0 : m(1); g.fillRect(x0 + p, z0 + p, m(T) - 2 * p, m(T) - 2 * p); }
    }
  }
  // zebra / pelican / junction crossings as white stripes
  g.fillStyle = COL.line;
  for (const cr of map.crossings) {
    const x = m(cr.x + W / 2), z = m(cr.z + H / 2);
    for (let k = -3; k <= 3; k++) cr.axis === 'EW' ? g.fillRect(x - m(1.5), z + m(k) - 1, m(3), 2) : g.fillRect(x + m(k) - 1, z - m(1.5), 2, m(3));
  }
  return c;
}

export function makeMinimap(G) {
  const map = G.map, W = map.W * T, H = map.H * T, town = drawTown(map);
  const cv = document.createElement('canvas'); cv.className = 'minimap'; cv.title = 'Peta (M)';
  HUD.root.appendChild(cv);
  const g = cv.getContext('2d', { willReadFrequently: true });   // small canvas: CPU raster beats a GPU round-trip (and software GL)
  let big = false, wait = 0;
  const toggle = () => { big = !big; cv.classList.toggle('big', big); wait = 0; };
  cv.onclick = toggle;
  const onKey = e => { if ((e.key === 'm' || e.key === 'M') && e.target.tagName !== 'INPUT') toggle(); };
  addEventListener('keydown', onKey);

  const target = () => G.goal || G.gates?.find(o => o.visible)?.position || null;

  function pin(x, y, r = 1) {
    g.save(); g.translate(x, y); g.scale(r, r);
    g.fillStyle = '#ffcc00'; g.strokeStyle = '#3a2a00'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-9, -12, -9, -22, 0, -22); g.bezierCurveTo(9, -22, 9, -12, 0, 0); g.fill(); g.stroke();
    g.fillStyle = '#3a2a00'; g.beginPath(); g.arc(0, -15, 3.2, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function arrow(x, y, a) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = '#ffffff'; g.strokeStyle = '#1c5bb8'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(0, -9); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  function blip(x, y, col, r = 4) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  function cross(x, y) { g.fillStyle = '#fff'; g.fillRect(x - 6, y - 6, 12, 12); g.fillStyle = '#e2383f'; g.fillRect(x - 5, y - 1.5, 10, 3); g.fillRect(x - 1.5, y - 5, 3, 10); }

  function markers(toScreen) {
    const flash = (G.t * 4 | 0) % 2;
    for (const c of G.traffic.cars) {
      const [x, y] = toScreen(c.x, c.z);
      if (c.mesh.userData.beacon) blip(x, y, c.siren && flash ? '#2060ff' : '#ff2020', 4.5);
      else blip(x, y, c.violated ? '#ff5050' : 'rgba(255,255,255,.75)', 2.5);
    }
    for (const p of G.incidents.patients) { const [x, y] = toScreen(p.root.position.x, p.root.position.z); cross(x, y); }
  }

  function update(dt) {
    if (HUD.root.classList.contains('hidden') || (wait -= dt) > 0) return;
    wait = 0.1;   // 10 redraws a second is plenty for a map
    const dpr = Math.min(2, devicePixelRatio || 1);
    const size = big ? Math.min(innerWidth, innerHeight) * 0.8 : MINI * 2;
    if (cv.width !== Math.round(size * dpr)) { cv.width = cv.height = Math.round(size * dpr); cv.style.width = cv.style.height = size + 'px'; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, size, size);
    const P = G.player.pos, tg = target();
    const heading = G.player.mode === 'ride' ? G.player.yaw : G.player.walker.yaw;
    if (big) {
      // whole town, north up
      const k = size / Math.max(W, H), ox = (size - W * k) / 2, oy = (size - H * k) / 2;
      const toScreen = (x, z) => [ox + (x + W / 2) * k, oy + (z + H / 2) * k];
      g.fillStyle = '#21304a'; g.fillRect(0, 0, size, size);
      g.drawImage(town, ox, oy, W * k, H * k);
      markers(toScreen);
      if (tg) pin(...toScreen(tg.x, tg.z), 1.3);
      arrow(...toScreen(P.x, P.z), Math.atan2(Math.sin(heading), -Math.cos(heading)));
      return;
    }
    // minimap: centred on the player, the camera's view direction points up
    const yaw = E.cam.yaw, cs = Math.cos(yaw), sn = Math.sin(yaw), R = MINI;
    const toScreen = (x, z) => { const dx = (x - P.x) * ZOOM, dz = (z - P.z) * ZOOM; return [R + dx * cs - dz * sn, R + dx * sn + dz * cs]; };
    g.save();
    g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.clip();
    g.fillStyle = COL.grass; g.fillRect(0, 0, size, size);
    g.save();
    g.translate(R, R); g.rotate(yaw); g.scale(ZOOM / PX, ZOOM / PX); g.translate(-(P.x + W / 2) * PX, -(P.z + H / 2) * PX);
    g.drawImage(town, 0, 0);
    g.restore();
    markers(toScreen);
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = 4; g.beginPath(); g.arc(R, R, R - 2, 0, Math.PI * 2); g.stroke();
    if (tg) {
      let [x, y] = toScreen(tg.x, tg.z);
      const dx = x - R, dy = y - R, d = Math.hypot(dx, dy), max = R - 14;
      if (d > max) { x = R + dx / d * max; y = R + dy / d * max; }   // off the minimap: hold it on the rim, like GTA
      pin(x, y + 8);
    }
    // player arrow: world heading (sin h, cos h) turned into screen space
    const hx = Math.sin(heading), hz = Math.cos(heading);
    arrow(R, R, Math.atan2(hx * cs - hz * sn, -(hx * sn + hz * cs)));
    g.fillStyle = 'rgba(255,255,255,.9)'; g.font = '800 13px "Baloo 2", sans-serif'; g.textAlign = 'center';
    const [nx, ny] = [R + sn * (R - 12), R - cs * (R - 12)];   // north = world -Z
    g.fillText('U', nx, ny + 4);
  }

  return { update, dispose() { cv.remove(); removeEventListener('keydown', onKey); } };
}
