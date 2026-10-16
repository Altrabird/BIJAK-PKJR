// Mod Bina: paint a tile map, test-play it with traffic and rules, save it, share it as a link.
import * as THREE from 'three';
import { E } from './engine.js';
import { TOWN, GARDEN, EMPTY } from './maps.js';
import { parseMap, encodeMap, decodeMap, T, isRoad } from './map.js';
import { buildWorld } from './world.js';
import { createGame } from './game.js';
import { HUD, modal, screen, esc, $, el } from './hud.js';
import { SAVE, persist } from './save.js';
import { sfx } from './audio.js';

const TOOLS = [
  ['Jalan', [['r', '🛣️', 'Jalan'], ['L', '🚦', 'Lampu isyarat'], ['x', '🛑', 'Simpang BERHENTI'], ['z', '🦓', 'Lintasan zebra'], ['p', '🔘', 'Lintasan pelikan'], ['q', '🅿️', 'Letak kereta']]],
  ['Bangunan', [['H', '🏠', 'Rumah'], ['B', '🏡', 'Rumah 2'], ['C', '🏘️', 'Rumah 3'], ['K', '🏪', 'Kedai'], ['S', '🏫', 'Sekolah'], ['G', '🏢', 'Bangunan'], ['M', '🕌', 'Surau'], ['h', '🚏', 'Hentian bas']]],
  ['Alam', [['.', '🟩', 'Rumput'], ['T', '🌳', 'Pokok'], ['P', '🌴', 'Pokok kelapa'], ['y', '🎠', 'Taman main'], ['w', '⚽', 'Padang']]],
  ['Lain', [['@', '⭐', 'Titik mula']]],
];

export function startBina({ code, exit }) {
  let def = structuredClone(EMPTY), name = 'Peta Saya', tool = 'r', world = null, game = null, map = null, testing = false;
  if (code) { try { def = decodeMap(code); name = def.name; } catch { modal('<h2>Pautan peta rosak</h2><p>Peta kosong dibuka.</p>'); } }

  const grid = new THREE.Group(); E.scene.add(grid);
  const hover = new THREE.Mesh(new THREE.PlaneGeometry(T, T), new THREE.MeshBasicMaterial({ color: 0x2c7be5, transparent: true, opacity: 0.35, depthWrite: false }));
  hover.rotation.x = -Math.PI / 2; hover.position.y = 0.3; E.scene.add(hover);
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(1.2), new THREE.MeshBasicMaterial({ color: 0xffc21a })); E.scene.add(star);

  function rebuild() {
    if (world) world.dispose();
    map = parseMap(def);
    def.rows = map.g.map(r => r.join(''));          // keep the normalised tiles
    world = buildWorld(map);
    grid.clear();
    const pts = [], hw = map.W * T / 2, hh = map.H * T / 2;
    for (let i = 0; i <= map.W; i++) pts.push(-hw + i * T, 0.25, -hh, -hw + i * T, 0.25, hh);
    for (let j = 0; j <= map.H; j++) pts.push(-hw, 0.25, -hh + j * T, hw, 0.25, -hh + j * T);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    grid.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })));
    const [sx, sz] = map.center(...def.spawn); star.position.set(sx, 3, sz);
  }
  function frame() {
    E.cam.follow = null; E.cam.want.set(0, 0, 0); E.cam.target.set(0, 0, 0);
    E.cam.pitch = 1.25; E.cam.yawWant = E.cam.yaw = 0;    // grid-aligned so painting follows the mouse
    E.cam.distWant = Math.max(def.rows.length, def.rows[0].length) * T * 1.15;
  }
  rebuild(); frame();

  // ---- UI ----
  const pal = el(`<div class="palette">${TOOLS.map(([h, list]) => `<h3>${h}</h3><div class="pal">${list.map(([c, e, n]) => `<button data-t="${c}" title="${n}"><span>${e}</span>${n}</button>`).join('')}</div>`).join('')}
    <small>Klik/seret untuk melukis · klik kanan untuk padam · Q/E putar · roda zum</small></div>`);
  const bar = el(`<div class="buildbar">
    <button class="btn green" data-b="test">▶ Uji</button><button class="btn" data-b="save">💾 Simpan</button>
    <button class="btn" data-b="share">🔗 Kongsi</button><button class="btn" data-b="open">📂 Buka</button>
    <button class="btn ghost" data-b="size">↔️ Saiz</button><button class="btn red" data-b="exit">✕ Keluar</button></div>`);
  const ui = document.getElementById('ui');
  ui.append(pal, bar);
  const selTool = t => { tool = t; pal.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('sel', b.dataset.t === t)); };
  pal.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { sfx('click'); selTool(b.dataset.t); });
  selTool('r');

  // ---- painting ----
  const cv = E.renderer.domElement;
  let painting = 0;
  const tileAtPointer = e => {
    const v = new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1);
    E.raycaster.setFromCamera(v, E.camera);
    const p = new THREE.Vector3();
    if (!E.raycaster.ray.intersectPlane(E.ground, p)) return null;
    const [i, j] = map.tileAt(p.x, p.z);
    return i >= 0 && j >= 0 && i < map.W && j < map.H ? [i, j] : null;
  };
  const paint = (t, ch) => {
    if (!t) return;
    const [i, j] = t;
    if (ch === '@') { if (isRoad(def.rows[j][i]) || 'HBCKSGM'.includes(def.rows[j][i])) return; def.spawn = [i, j]; rebuild(); return; }
    if (def.rows[j][i] === ch) return;
    def.rows[j] = def.rows[j].slice(0, i) + ch + def.rows[j].slice(i + 1);
    rebuild();
  };
  const down = e => { if (testing) return; painting = e.button === 2 ? 2 : e.button === 0 ? 1 : 0; if (painting) paint(tileAtPointer(e), painting === 2 ? '.' : tool); };
  const move = e => {
    if (testing) return;
    const t = tileAtPointer(e);
    hover.visible = !!t;
    if (t) { const [x, z] = map.center(...t); hover.position.set(x, 0.3, z); }
    if (painting === 1 && t && tool !== '@') paint(t, tool);   // right button only erases one tile (dragging it rotates the camera)
  };
  const up = () => { painting = 0; };
  cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); addEventListener('pointerup', up);

  // ---- toolbar ----
  let testBar = null;
  const startTest = () => {
    testing = true; pal.classList.add('hidden'); bar.classList.add('hidden'); grid.visible = hover.visible = star.visible = false;
    world.dispose(); world = null;
    const roads = def.rows.join('').split('').filter(c => isRoad(c)).length;
    game = createGame(def, { cars: Math.min(18, Math.round(roads / 7)), npcs: 8, murid: SAVE.murid || undefined });
    E.cam.pitch = 0.95; E.cam.distWant = 34; E.cam.yawWant = Math.PI / 4;
    HUD.show(); HUD.setTitle(`🛠️ Uji: ${name}`, 'Bebas'); HUD.setObjectives(null);
    if (SAVE.murid) HUD.setMurid(game.player.murid);
    testBar = el(`<div class="buildbar"><button class="btn" data-b="bike">🚲 Basikal</button><button class="btn amber" data-b="back">⏹ Kembali Bina</button></div>`);
    document.getElementById('hud').appendChild(testBar);
    testBar.querySelector('[data-b=back]').onclick = stopTest;
    testBar.querySelector('[data-b=bike]').onclick = e => {
      const P = game.player;
      if (P.mode === 'ride') { P.dismount(); e.currentTarget.textContent = '🚲 Basikal'; } else { P.helmet = true; P.mount('bike'); e.currentTarget.textContent = '🚶 Jalan kaki'; }
    };
  };
  const stopTest = () => {
    if (game) { game.dispose(); game = null; }
    if (testBar) { testBar.remove(); testBar = null; }
    HUD.show(false); HUD.vctlClose(); HUD.kerbClose();
    testing = false; pal.classList.remove('hidden'); bar.classList.remove('hidden'); grid.visible = star.visible = true;
    rebuild(); frame();
  };

  bar.querySelectorAll('[data-b]').forEach(b => b.onclick = async () => {
    sfx('click');
    const a = b.dataset.b;
    if (a === 'test') startTest();
    if (a === 'exit') exit();
    if (a === 'save') {
      const s = screen(`<div class="card"><h2>💾 Simpan peta</h2><input type="text" id="bn-n" maxlength="40" value="${esc(name)}"><div class="row end" style="margin-top:12px"><button class="btn ghost" id="bn-x">Batal</button><button class="btn green" id="bn-ok">Simpan</button></div></div>`);
      $('#bn-x', s).onclick = () => s.remove();
      $('#bn-ok', s).onclick = () => {
        name = $('#bn-n', s).value.trim().slice(0, 40) || 'Peta Saya'; def.name = name;
        SAVE.maps[name] = structuredClone(def); persist(); s.remove(); sfx('chime');
        modal(`<h2>💾 Disimpan</h2><p>Peta <b>${esc(name)}</b> disimpan dalam pelayar ini. Guna 🔗 Kongsi untuk menghantarnya kepada orang lain.</p>`, [['OK', 'green']]);
      };
    }
    if (a === 'share') {
      def.name = name;
      const url = `${location.origin}${location.pathname}#bina=${encodeMap(def)}`;
      let copied = false;
      try { await navigator.clipboard.writeText(url); copied = true; } catch { /* clipboard blocked */ }
      modal(`<h2>🔗 Kongsi peta</h2><p>${copied ? 'Pautan sudah disalin. ' : ''}Hantar pautan ini kepada murid. Mereka boleh membuka, menguji dan mengubah peta anda.</p><input type="text" readonly value="${esc(url)}" onclick="this.select()">`, [['Tutup', 'green']]);
    }
    if (a === 'open') {
      const saved = Object.keys(SAVE.maps || {});
      const presets = [['Taman Bijak (bandar)', TOWN], ['Taman Lalu Lintas', GARDEN], ['Peta kosong', EMPTY]];
      const s = screen(`<div class="card"><h2>📂 Buka peta</h2><div class="missions">
        ${presets.map(([n], k) => `<button class="mission" data-p="${k}"><span class="n">🗺️</span><span><b>${n}</b><small>Peta contoh</small></span><span></span></button>`).join('')}
        ${saved.map(n => `<button class="mission" data-s="${esc(n)}"><span class="n">💾</span><span><b>${esc(n)}</b><small>Peta simpanan</small></span><span></span></button>`).join('')}
        </div><div class="row end" style="margin-top:12px"><button class="btn ghost" id="bo-x">Batal</button></div></div>`);
      $('#bo-x', s).onclick = () => s.remove();
      s.querySelectorAll('[data-p]').forEach(x => x.onclick = () => { const [n, d] = presets[+x.dataset.p]; def = structuredClone(d); name = n; s.remove(); rebuild(); frame(); });
      s.querySelectorAll('[data-s]').forEach(x => x.onclick = () => { name = x.dataset.s; def = structuredClone(SAVE.maps[name]); s.remove(); rebuild(); frame(); });
    }
    if (a === 'size') {
      const r = await modal('<h2>↔️ Saiz peta</h2><p>Tukar saiz peta. Bahagian di luar saiz baharu akan dibuang.</p>', [['Batal', 'ghost'], ['12 × 12', ''], ['16 × 16', ''], ['20 × 20', '']]);
      if (r > 0) {
        const n = [0, 12, 16, 20][r];
        def.rows = Array.from({ length: n }, (_, j) => Array.from({ length: n }, (_, i) => def.rows[j]?.[i] ?? '.').join(''));
        def.spawn = [Math.min(def.spawn[0], n - 1), Math.min(def.spawn[1], n - 1)];
        rebuild(); frame();
      }
    }
  });

  return {
    game: () => game,
    stop() {
      if (game) game.dispose();
      if (world) world.dispose();
      E.scene.remove(grid, hover, star);
      cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move); removeEventListener('pointerup', up);
      pal.remove(); bar.remove(); if (testBar) testBar.remove();
      E.cam.pitch = 0.95; E.cam.yawWant = Math.PI / 4;
    },
  };
}
