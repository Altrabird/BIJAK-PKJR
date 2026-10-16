// Boot, menus, Create-a-Murid, settings. Modes: Taman Bijak (life.js), Piala Lalu Lintas (piala.js), Mod Bina (bina.js).
import * as THREE from 'three';
import { E, initEngine, loadModels, startLoop, setDusk } from './engine.js';
import { HUD, screen, modal, esc, $ } from './hud.js';
import { TOWN } from './maps.js';
import { createGame } from './game.js';
import { startMission, stopLife, missionPicker, lifeGame } from './life.js';
import { SKINS, HAIRS, makePerson } from './people.js';
import { SAVE, persist } from './save.js';
import { sfx, unlockAudio, say } from './audio.js';
import { watchIcons } from './icons.js';

let attract = null, current = null;   // current: { stop() }

async function boot() {
  watchIcons(document.getElementById('ui'));
  const load = screen(`<div style="text-align:center"><h1 style="margin:0;font-size:48px">BIJAK <span style="color:#f6b31b">PKJR</span></h1><p>Memuatkan dunia…</p><div class="bar"><i id="ld"></i></div></div>`, '');
  load.id = 'loading';
  initEngine(document.getElementById('c'), SAVE.settings.quality);
  HUD.init();
  HUD.onMenu(pauseMenu);
  await loadModels(f => { $('#ld').style.width = Math.round(f * 100) + '%'; });
  startLoop();
  load.remove();
  if (location.hash.startsWith('#bina=')) return openBina(location.hash.slice(6));
  menu();
}

// slowly orbiting live town behind the menus
function startAttract() {
  if (attract) return;
  attract = createGame(TOWN, { cars: 16, npcs: 14, bad: 0.05, staff: true });
  attract.player.mode = 'frozen';
  attract.player.person.root.visible = false;
  E.cam.follow = null; E.cam.want.set(0, 0, 0); E.cam.distWant = 105; E.cam.pitch = 0.75;
  attract.hooks.push(dt => { E.cam.yawWant += dt * 0.04; });
}
function stopAttract() { if (attract) { attract.dispose(); attract = null; } E.cam.pitch = 0.95; E.cam.distWant = 34; }

function stopCurrent() { if (current) { current.stop(); current = null; } stopLife(); HUD.show(false); HUD.kerbClose(); HUD.vctlClose(); document.querySelectorAll('.slip,.screen').forEach(s => s.remove()); }

function menu() {
  stopCurrent(); startAttract(); setDusk(0);
  const s = screen(`
    <div class="logo"><h1>BIJAK <span>PKJR</span></h1><div>Pendidikan Keselamatan Jalan Raya</div></div>
    <div class="menu-grid">
      <button class="mode" data-m="life"><span class="ico">🏡</span><b>Taman Bijak</b><small>Hidup sehari-hari: ke sekolah, naik bas, berbasikal. Buat keputusan yang selamat!</small></button>
      <button class="mode" data-m="piala"><span class="ico">🏆</span><b>Piala Lalu Lintas</b><small>Pertandingan di taman lalu lintas: Pejalan Kaki, Basikal, Kereta Pedal & Kuiz.</small></button>
      <button class="mode" data-m="bina"><span class="ico">🛠️</span><b>Mod Bina</b><small>Bina taman lalu lintas sendiri, uji dan kongsi dengan kelas.</small></button>
    </div>
    <div class="menu-foot">
      <button class="btn ghost" data-m="murid">👤 Watak</button>
      <button class="btn ghost" data-m="tetapan">⚙️ Tetapan</button>
      <button class="btn ghost" data-m="kredit">ℹ️ Kredit</button>
    </div>
    <div class="homage">Penghormatan kepada <b>Pertandingan Lalu Lintas Shell</b> (Shell Traffic Games, Sarawak 1963–2015), kini Sarawak Traffic Games: anugerah Pejalan Kaki Terbaik, Penunggang Basikal Terbaik, Pemandu Kereta Pedal Terbaik dan Kuiz.</div>`, '');
  s.id = 'menu';
  s.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
    unlockAudio(); sfx('click');
    const m = b.dataset.m;
    if (m === 'life') { s.remove(); ensureMurid(() => lifeMenu()); }
    if (m === 'piala') { s.remove(); ensureMurid(() => openPiala()); }
    if (m === 'bina') { s.remove(); openBina(); }
    if (m === 'murid') { s.remove(); createMurid(() => menu()); }
    if (m === 'tetapan') settings();
    if (m === 'kredit') credits();
  });
}

function ensureMurid(next) { if (SAVE.murid) next(); else createMurid(next); }

function lifeMenu() {
  missionPicker(SAVE.murid, idx => {
    stopAttract();
    current = { stop: stopLife, game: lifeGame };
    startMission(idx, SAVE.murid, () => { stopCurrent(); lifeMenu(); startAttract(); });
  }, () => menu());
}

async function openPiala() {
  const { pialaMenu } = await import('./piala.js');
  pialaMenu({
    murid: SAVE.murid,
    start: () => { stopAttract(); },
    setCurrent: c => { current = c; },
    exit: () => { stopCurrent(); menu(); },
  });
}

async function openBina(code) {
  stopAttract();
  const { startBina } = await import('./bina.js');
  current = startBina({ code, exit: () => { stopCurrent(); location.hash = ''; menu(); } });
}

// ---------- Create-a-Murid ----------
function createMurid(next) {
  const m = { nama: '', jantina: 'lelaki', tudung: false, skin: SKINS[1], hair: HAIRS[0], ...(SAVE.murid || {}) };
  const s = screen(`<div class="card cam-card"><h2>👤 Cipta Watak Murid</h2>
    <div class="cam-grid">
      <div><label class="lbl">Nama</label><input type="text" id="cm-nama" maxlength="16" placeholder="Nama awak" value="${esc(m.nama)}"></div>
      <div><label class="lbl">Jantina</label><div class="seg" id="cm-j"><button data-v="lelaki">👦 Lelaki</button><button data-v="perempuan">👧 Perempuan</button></div></div>
      <div id="cm-tw"><label class="lbl">Tudung</label><div class="seg" id="cm-t"><button data-v="1">Bertudung</button><button data-v="0">Tidak</button></div></div>
      <div><label class="lbl">Warna kulit</label><div class="swatches" id="cm-skin">${SKINS.map(c => `<button class="sw" data-v="${c}" style="background:#${c.toString(16).padStart(6, '0')}"></button>`).join('')}</div></div>
      <div><label class="lbl">Warna rambut</label><div class="swatches" id="cm-hair">${HAIRS.map(c => `<button class="sw" data-v="${c}" style="background:#${c.toString(16).padStart(6, '0')}"></button>`).join('')}</div></div>
    </div>
    <div class="row end" style="margin-top:14px"><button class="btn green" id="cm-ok">Simpan & Mula ▶</button></div></div>`, 'cam-screen');
  // live 3D preview: put the murid in front of the attract camera
  let prev = null;
  const preview = () => {
    if (prev) E.scene.remove(prev.root);
    prev = makePerson({ ...m, role: 'murid' });
    prev.root.scale.setScalar(3.2);
    E.scene.add(prev.root);
  };
  const tick = dt => {
    if (!prev) return;
    // stand the preview in front of the camera, on the right-hand side of the screen
    const cam = E.camera, f = new THREE.Vector3(), r = new THREE.Vector3(), u = new THREE.Vector3();
    cam.getWorldDirection(f); r.crossVectors(f, cam.up).normalize(); u.crossVectors(r, f).normalize();
    prev.root.position.copy(cam.position).addScaledVector(f, 26).addScaledVector(r, 7 * Math.min(1.6, cam.aspect / 1.2)).addScaledVector(u, -3);
    prev.root.rotation.y += dt * 0.8;
    prev.animate(dt, 0);
  };
  E.onTick.push(tick);
  const sync = () => {
    s.querySelectorAll('#cm-j button').forEach(b => b.classList.toggle('sel', b.dataset.v === m.jantina));
    s.querySelectorAll('#cm-t button').forEach(b => b.classList.toggle('sel', (b.dataset.v === '1') === m.tudung));
    $('#cm-tw', s).classList.toggle('hidden', m.jantina !== 'perempuan');
    s.querySelectorAll('#cm-skin button').forEach(b => b.classList.toggle('sel', +b.dataset.v === m.skin));
    s.querySelectorAll('#cm-hair button').forEach(b => b.classList.toggle('sel', +b.dataset.v === m.hair));
    preview();
  };
  s.querySelectorAll('#cm-j button').forEach(b => b.onclick = () => { m.jantina = b.dataset.v; if (m.jantina === 'lelaki') m.tudung = false; sfx('click'); sync(); });
  s.querySelectorAll('#cm-t button').forEach(b => b.onclick = () => { m.tudung = b.dataset.v === '1'; sfx('click'); sync(); });
  s.querySelectorAll('#cm-skin button').forEach(b => b.onclick = () => { m.skin = +b.dataset.v; sfx('click'); sync(); });
  s.querySelectorAll('#cm-hair button').forEach(b => b.onclick = () => { m.hair = +b.dataset.v; sfx('click'); sync(); });
  $('#cm-ok', s).onclick = () => {
    m.nama = $('#cm-nama', s).value.trim().slice(0, 16) || (m.jantina === 'perempuan' ? 'Aisyah' : 'Adam');
    SAVE.murid = m; persist(); sfx('chime');
    s.remove(); E.scene.remove(prev.root); E.onTick = E.onTick.filter(f => f !== tick);
    next();
  };
  sync();
}

function settings() {
  const st = SAVE.settings;
  const s = screen(`<div class="card"><h2>⚙️ Tetapan</h2>
    <div class="stack">
      <div><label class="lbl">Tahap murid</label><div class="seg" id="st-t"><button data-v="1">Tahap 1 (dengan petunjuk)</button><button data-v="2">Tahap 2</button></div></div>
      <div><label class="lbl">Kualiti grafik (muat semula)</label><div class="seg" id="st-q"><button data-v="hi">Tinggi</button><button data-v="lo">Ringan (PC makmal)</button></div></div>
      <div><label class="lbl">Kemajuan</label><button class="btn red" id="st-reset">Padam semua kemajuan</button></div>
    </div>
    <div class="row end" style="margin-top:14px"><button class="btn green" id="st-ok">Siap</button></div></div>`);
  const sync = () => {
    s.querySelectorAll('#st-t button').forEach(b => b.classList.toggle('sel', +b.dataset.v === st.tahap));
    s.querySelectorAll('#st-q button').forEach(b => b.classList.toggle('sel', b.dataset.v === st.quality));
  };
  s.querySelectorAll('#st-t button').forEach(b => b.onclick = () => { st.tahap = +b.dataset.v; persist(); sync(); });
  s.querySelectorAll('#st-q button').forEach(b => b.onclick = () => { const q = b.dataset.v; if (q !== st.quality) { st.quality = q; persist(); location.reload(); } });
  $('#st-reset', s).onclick = async () => {
    const r = await modal('<h2>Padam kemajuan?</h2><p>Semua bintang, Mata Bijak, watak dan peta binaan dalam pelayar ini akan dipadam.</p>', [['Batal', 'ghost'], ['Padam', 'red']]);
    if (r === 1) { try { localStorage.removeItem('bijakpkjr.v1'); } catch { /* ignore */ } location.reload(); }
  };
  $('#st-ok', s).onclick = () => { sfx('click'); s.remove(); };
  sync();
}

function credits() {
  modal(`<h2>ℹ️ Kredit</h2>
    <p><b>BIJAK PKJR</b>: permainan 3D Pendidikan Keselamatan Jalan Raya untuk murid sekolah rendah.</p>
    <p>Diilhamkan oleh <b>Pertandingan Lalu Lintas Shell</b> (Shell Traffic Games, Sarawak, 1963–2015) yang kini diteruskan sebagai Sarawak Traffic Games, dan modul PKJR (JKJR & KPM).</p>
    <p>Model 3D CC0 dari Poly Pizza: Kenney, Quaternius, Kay Lousberg, scaranto. Watak, bas, basikal, sekolah, papan tanda dan lampu isyarat dibina dalam kod. Enjin: three.js (MIT). Suara: TTS neural ms-MY.</p>
    <p>Kawalan: klik tanah untuk berjalan · klik kanan/seret untuk putar kamera · roda tetikus untuk zum · Q/E putar · W/A/S/D tunggang · Z/C isyarat · H loceng.</p>`, [['Tutup', 'green']]);
}

async function pauseMenu() {
  const g = current && current.game ? current.game() : null;
  if (g) g.paused = true;
  const r = await modal('<h2>⏸️ Rehat</h2><p>Permainan dihentikan sebentar.</p>', [['Keluar ke Menu', 'red'], ['Sambung', 'green']]);
  if (g) g.paused = false;
  if (r === 0) { stopCurrent(); menu(); }
}

window.__bijak = { E, SAVE, say, lifeGame, current: () => current };   // handle for tests
boot();
