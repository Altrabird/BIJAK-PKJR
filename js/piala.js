// Mod Pertandingan "Piala Lalu Lintas": homage to the Shell Traffic Games.
// Four stations, same award categories as the real event: Pejalan Kaki, Basikal, Kereta Pedal, Kuiz.
import * as THREE from 'three';
import { E } from './engine.js';
import { GARDEN } from './maps.js';
import { DIR, left } from './map.js';
import { createGame } from './game.js';
import { HUD, modal, screen, esc, $ } from './hud.js';
import { makeKart } from './vehicles.js';
import { makePerson } from './people.js';
import { RULES } from './rules.js';
import { pickQuiz } from './quiz.js';
import { signURL } from './signs.js';
import { say, sfx } from './audio.js';
import { SAVE, persist } from './save.js';

export const LEVELS = [
  { n: 1, name: 'Peringkat Sekolah', karts: 2, npcs: 4, bad: 0, quiz: 1, dusk: 0 },
  { n: 2, name: 'Peringkat Daerah', karts: 4, npcs: 6, bad: 0.1, quiz: 2, dusk: 0 },
  { n: 3, name: 'Peringkat Negeri', karts: 6, npcs: 8, bad: 0.2, quiz: 3, dusk: 0.35 },
];

export const STATIONS = [
  { id: 'pejalan', e: '🚶', title: 'Pejalan Kaki', award: 'Pejalan Kaki Terbaik', mode: 'walk', start: [2, 2],
    cps: [[0, 3], [2, 3], [4, 4], [6, 4], [6, 6], [8, 4], [10, 4]], par: 170,
    brief: 'Lalui semua pintu hijau mengikut nombor. Lintas hanya di lintasan, buat latihan kerb (kanan-kiri-kanan) dan patuhi lampu orang.' },
  { id: 'basikal', e: '🚲', title: 'Penunggang Basikal', award: 'Penunggang Basikal Terbaik', mode: 'bike', start: [2, 9, 'E'],
    cps: [[5, 8, 'N'], [5, 3, 'N'], [7, 1, 'E'], [9, 3, 'S'], [9, 7, 'S'], [7, 9, 'W']], par: 150,
    brief: 'Tunggang di sebelah KIRI. Beri isyarat (Z kiri / C kanan) sebelum membelok di simpang. Berhenti penuh di tanda BERHENTI. Patuhi lampu isyarat dan beri laluan kepada pejalan kaki.' },
  { id: 'kereta', e: '🏎️', title: 'Pemandu Kereta Pedal', award: 'Pemandu Kereta Pedal Terbaik', mode: 'kart', start: [1, 7, 'N'],
    cps: [[1, 3, 'N'], [3, 1, 'E'], [5, 3, 'S'], [5, 7, 'S'], [7, 9, 'E'], [9, 7, 'N'], [7, 5, 'W'], [5, 4, 'N']], park: [6, 3], par: 230,
    brief: 'Pandu kereta pedal di lorong kiri, beri isyarat, berhenti di tanda BERHENTI dan lampu merah. Akhir sekali, letak kereta di dalam petak KUNING dengan lurus dan berhenti.' },
  { id: 'kuiz', e: '📝', title: 'Kuiz PKJR', award: 'Prestasi Terbaik Kuiz', mode: 'quiz',
    brief: '10 soalan tentang papan tanda dan peraturan jalan raya. 10 markah setiap jawapan betul.' },
];

const medal = m => m >= 90 ? '🥇' : m >= 75 ? '🥈' : m >= 60 ? '🥉' : '🎗️';
const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

let G = null, ctx = null;

export function pialaMenu(c) {
  ctx = c;
  const un = SAVE.piala.unlocked || 1;
  const s = screen(`<div class="card"><h2>🏆 Piala Lalu Lintas</h2>
    <p>Pertandingan di <b>Taman Lalu Lintas</b>, diilhamkan oleh Pertandingan Lalu Lintas Shell (1963–2015) di Sarawak. Empat stesen, empat anugerah: <b>Pejalan Kaki</b>, <b>Basikal</b>, <b>Kereta Pedal</b> dan <b>Kuiz</b>. Polis trafik akan mengeluarkan saman di tempat jika anda melanggar peraturan!</p>
    <div class="stack">
      <div><label class="lbl">Peringkat</label><div class="seg" id="pl-l">${LEVELS.map(l => `<button data-v="${l.n}" ${l.n > un ? 'disabled' : ''}>${l.n > un ? '🔒 ' : ''}${l.name.replace('Peringkat ', '')}</button>`).join('')}</div></div>
      <div><label class="lbl">Penyertaan</label><div class="seg" id="pl-m"><button data-v="solo">👤 Individu</button><button data-v="team">👥 Pasukan (4 orang)</button></div></div>
      <div id="pl-team" class="hidden stack">
        <input type="text" id="pl-tn" maxlength="24" placeholder="Nama pasukan / sekolah" value="SK Taman Bijak">
        ${STATIONS.map((st, i) => `<input type="text" class="pl-n" maxlength="16" placeholder="${st.e} Ahli ${i + 1}: ${st.title}" value="${i === 0 ? esc(c.murid.nama) : ''}">`).join('')}
        <small>Ahli 1 bertanding di stesen Pejalan Kaki, ahli 2 Basikal, ahli 3 Kereta Pedal, ahli 4 Kuiz. Main bergilir-gilir di komputer yang sama.</small>
      </div>
      ${bestTable()}
    </div>
    <div class="row end" style="margin-top:14px"><button class="btn ghost" id="pl-back">◀ Menu</button><button class="btn green" id="pl-go">Mula Pertandingan ▶</button></div></div>`);
  let lvl = Math.min(un, 3), mode = 'solo';
  const sync = () => {
    s.querySelectorAll('#pl-l button').forEach(b => b.classList.toggle('sel', +b.dataset.v === lvl));
    s.querySelectorAll('#pl-m button').forEach(b => b.classList.toggle('sel', b.dataset.v === mode));
    $('#pl-team', s).classList.toggle('hidden', mode !== 'team');
  };
  s.querySelectorAll('#pl-l button').forEach(b => b.onclick = () => { if (!b.disabled) { lvl = +b.dataset.v; sfx('click'); sync(); } });
  s.querySelectorAll('#pl-m button').forEach(b => b.onclick = () => { mode = b.dataset.v; sfx('click'); sync(); });
  $('#pl-back', s).onclick = () => { s.remove(); c.exit(); };
  $('#pl-go', s).onclick = () => {
    sfx('click');
    const names = mode === 'team' ? [...s.querySelectorAll('.pl-n')].map((x, i) => x.value.trim().slice(0, 16) || `Ahli ${i + 1}`) : STATIONS.map(() => c.murid.nama);
    const team = mode === 'team' ? ($('#pl-tn', s).value.trim().slice(0, 24) || 'Pasukan') : c.murid.nama;
    s.remove();
    runCompetition(LEVELS[lvl - 1], mode, team, names);
  };
  sync();
}

function bestTable() {
  const b = SAVE.piala.best || {};
  const rows = LEVELS.filter(l => b[l.n] != null).map(l => `<tr><td>${l.name}</td><td class="n">${b[l.n]}%</td><td>${medal(b[l.n])}</td></tr>`);
  return rows.length ? `<div><label class="lbl">Rekod terbaik</label><table class="score">${rows.join('')}</table></div>` : '';
}

async function runCompetition(L, mode, team, names) {
  ctx.start();
  say('piala_mula');
  const results = [];
  for (let i = 0; i < STATIONS.length; i++) {
    const st = STATIONS[i], who = names[i];
    const go = await modal(`<h2>${st.e} Stesen ${i + 1}: ${esc(st.title)}</h2>
      <p><b>Peserta:</b> ${esc(who)} · <b>${esc(L.name)}</b></p><p>${esc(st.brief)}</p>
      ${st.par ? `<p>⏱️ Masa sasaran: <b>${fmt(st.par)}</b>. Bonus masa jika lebih cepat, tetapi keselamatan lebih penting!</p>` : ''}`,
      [['Tarik Diri', 'ghost'], ['Mula! ▶', 'green']]);
    if (go === 0) { stopPiala(); ctx.exit(); return; }
    const r = st.mode === 'quiz' ? await runQuiz(L, who) : await runStation(st, L, who);
    if (!r) return;                     // quit from the pause menu
    results.push({ st, who, ...r });
    sfx('cheer'); say('stesen_tamat');
    await modal(`<h2>${medal(r.marks)} ${esc(st.title)}: ${r.marks} markah</h2>
      ${r.time != null ? `<p>Masa: ${fmt(r.time)}${r.bonus ? ` · bonus masa +${r.bonus}` : ''}${r.missed ? ` · pintu tertinggal ${r.missed} (−${r.missed * 10})` : ''}</p>` : ''}
      ${r.log && r.log.length ? `<p>Saman:</p><div class="offences">${r.log.map(id => `<div class="offence"><b>🚨 ${esc(RULES[id].t)} (−${RULES[id].pen})</b>${esc(RULES[id].why)}</div>`).join('')}</div>` : (r.log ? '<p>Tiada saman. Cemerlang!</p>' : '')}`,
      [[i < 3 ? 'Stesen Seterusnya ▶' : 'Lihat Keputusan 🏆', 'green']]);
  }
  stopPiala();
  showResults(L, mode, team, results);
}

export function stopPiala() { if (G) { G.dispose(); G = null; } HUD.show(false); }

// ---------------- driving / walking stations ----------------
function runStation(st, L, who) {
  return new Promise(resolve => {
    stopPiala();
    const colors = [0x1e88e5, 0x43a047, 0xfdd835, 0x8e24aa, 0xfb8c00, 0x00acc1];
    G = createGame(GARDEN, {
      cars: L.karts, npcs: L.npcs, bad: L.bad, dusk: L.dusk, vmax: 3.4, half: 1.0,
      make: () => makeKart(colors[(Math.random() * colors.length) | 0]), murid: { ...SAVE.murid, nama: who },
    });
    ctx.setCurrent({ stop: stopPiala, game: () => G });
    decorate(G);
    const P = G.player, map = G.map;
    HUD.show(); HUD.setMurid(P.murid); HUD.setTitle(`${st.e} ${st.title}`, '⏱️ 0:00');
    const steps = st.cps.map((c, i) => `Pintu ${i + 1}`).concat(st.park ? ['Letak kereta dalam petak'] : []);
    HUD.setObjectives(st.title, steps, 0);

    const [sx, sz] = map.center(st.start[0], st.start[1]);
    if (st.mode === 'walk') { P.walker.place(sx, sz); E.cam.want.set(sx, 0, sz); }
    else {
      const d = DIR[st.start[2]], l = left(d);
      P.helmet = true; P.lightsOn = L.dusk > 0.3;
      P.mount(st.mode === 'kart' ? 'kart' : 'bike', { at: [sx + l[0] * 1.75, sz + l[1] * 1.75], yaw: Math.atan2(d[0], d[1]), color: 0xe53935 });
    }
    E.cam.target.copy(P.pos);

    // checkpoint gates
    const gates = st.cps.map(([i, j, dir], k) => {
      const [cx, cz] = map.center(i, j);
      const off = dir ? left(DIR[dir]) : [0, 0];
      return gate(cx + off[0] * 1.75, cz + off[1] * 1.75, String(k + 1));
    });
    let bay = null;
    if (st.park) bay = parkingBay(map, st.park);
    G.gates = gates; G.bay = bay;
    let next = 0, t = 0, done = false, parkT = 0;
    gates.forEach((g, k) => g.visible = k === 0);
    P.frozen = true;
    HUD.banner('3', 800); sfx('beep');
    setTimeout(() => HUD.banner('2', 800), 900);
    setTimeout(() => HUD.banner('1', 800), 1800);
    setTimeout(() => { HUD.banner('MULA!', 900); say('stesen_mula'); sfx('whistle'); P.frozen = false; }, 2700);

    const finish = () => {
      if (done) return; done = true;
      G.paused = true;
      const missed = gates.length - next;
      const pen = P.stats.log.reduce((a, id) => a + RULES[id].pen, 0);
      const bonus = missed ? 0 : Math.max(0, Math.round((st.par - t) / st.par * 10));
      const marks = Math.max(0, Math.min(100, 100 - pen - missed * 10 + bonus));
      gates.forEach(g => E.scene.remove(g)); if (bay) E.scene.remove(bay.mesh);
      setTimeout(() => resolve({ marks, time: t, bonus, missed, log: [...P.stats.log] }), 400);
    };
    G.hooks.push(dt => {
      if (done || P.frozen) return;
      t += dt;
      HUD.setTitle(`${st.e} ${st.title}`, `⏱️ ${fmt(t)}`);
      gates.forEach(g => { g.rotation.y += dt; });
      const p = P.pos;
      if (next < gates.length) {
        const g = gates[next];
        if (Math.hypot(p.x - g.position.x, p.z - g.position.z) < (st.mode === 'walk' ? 2.2 : 2.6)) {
          sfx('chime'); g.visible = false; next++;
          if (next < gates.length) gates[next].visible = true;
          HUD.setObjectives(st.title, steps, next);
          if (next === gates.length && !st.park) finish();
          if (next === gates.length && bay) { bay.mesh.visible = true; HUD.toast('Letak kereta di dalam petak kuning', 'info'); }
        }
      } else if (bay && P.mode === 'ride') {
        // parked: inside the bay, roughly straight, stopped for a second
        const dx = p.x - bay.x, dz = p.z - bay.z, inside = Math.abs(dx) < bay.hw && Math.abs(dz) < bay.hd;
        const yawOk = Math.abs(Math.sin(P.yaw - bay.yaw)) < 0.42;
        if (inside && Math.abs(P.speed) < 0.05) {
          parkT += dt;
          if (parkT > 1) { if (yawOk) P.good('PARKIR_OK'); else P.offence('PARKIR_SALAH'); finish(); }
        } else parkT = 0;
        const [ti, tj] = map.tileAt(p.x, p.z);
        if (map.at(ti, tj) === 'q' && Math.abs(P.speed) < 0.05 && !inside) { parkT += dt; if (parkT > 2.5) { P.offence('PARKIR_SALAH'); finish(); } }
      }
      if (t > st.par * 2) { HUD.toast('Masa tamat!', 'bad'); finish(); }
    });
  });
}

function gate(x, z, label) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.12, 8, 28), new THREE.MeshBasicMaterial({ color: 0x2bff5a }));
  ring.position.y = 1.7; g.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.05, 28), new THREE.MeshBasicMaterial({ color: 0x2bff5a, transparent: true, opacity: 0.35 }));
  beam.position.y = 0.08; g.add(beam);
  const c = document.createElement('canvas'); c.width = c.height = 128; const x2 = c.getContext('2d');
  x2.fillStyle = '#1c5bb8'; x2.beginPath(); x2.arc(64, 64, 60, 0, 7); x2.fill();
  x2.fillStyle = '#fff'; x2.font = '800 80px Arial'; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillText(label, 64, 70);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthTest: false })); sp.scale.set(1.4, 1.4, 1); sp.position.y = 4; g.add(sp);
  g.position.set(x, 0, z);
  E.scene.add(g);
  return g;
}

function parkingBay(map, [i, j]) {
  const [cx, cz] = map.center(i, j);
  // middle bay, open toward the road (west of the car park in GARDEN)
  const roadW = map.at(i - 1, j) !== 'q' && 'rLzpx'.includes(map.at(i - 1, j));
  const along = roadW || 'rLzpx'.includes(map.at(i + 1, j)) ? 'EW' : 'NS';
  const hw = along === 'EW' ? 2.6 : 1.0, hd = along === 'EW' ? 1.0 : 2.6;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, hd * 2), new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0.55 }));
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(cx, 0.06, cz); mesh.visible = false;
  E.scene.add(mesh);
  return { mesh, x: cx, z: cz, hw, hd, yaw: along === 'EW' ? Math.PI / 2 : 0 };
}

// judges' tent with banner, and the polis judge
function decorate(G) {
  const map = G.map, [x, z] = map.center(...map.places.pentas);
  const g = new THREE.Group();
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.8, 4), new THREE.MeshLambertMaterial({ color: 0xe53935 })); roof.position.y = 3.6; roof.rotation.y = Math.PI / 4; g.add(roof);
  for (const [a, b] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.8), new THREE.MeshLambertMaterial({ color: 0xffffff })); p.position.set(a, 1.4, b); g.add(p); }
  const table = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.9, 0.9), new THREE.MeshLambertMaterial({ color: 0x1c5bb8 })); table.position.set(0, 0.45, 1.2); g.add(table);
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160; const x2 = c.getContext('2d');
  x2.fillStyle = '#f6c51b'; x2.fillRect(0, 0, 1024, 160); x2.fillStyle = '#1c5bb8'; x2.font = '900 92px Arial'; x2.textAlign = 'center'; x2.textBaseline = 'middle';
  x2.fillText('PIALA LALU LINTAS', 512, 84);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1), new THREE.MeshLambertMaterial({ map: tx, side: THREE.DoubleSide })); ban.position.set(0, 2.5, 2.7); g.add(ban);
  const juri = makePerson({ role: 'polis', jantina: 'lelaki' }); juri.root.position.set(0, 0, 0.3); g.add(juri.root);
  const juri2 = makePerson({ role: 'awam', jantina: 'perempuan', tudung: true, shirt: 0x1c5bb8, bag: false }); juri2.root.position.set(1.2, 0, 0.3); g.add(juri2.root);
  g.position.set(x, 0, z); g.rotation.y = Math.PI;
  E.scene.add(g);
  G.statics.push({ root: g, update: dt => { juri.animate(dt, 0); juri2.animate(dt, 0); } });
}

// ---------------- quiz ----------------
function runQuiz(L, who) {
  return new Promise(resolve => {
    // keep the garden alive behind the quiz, camera slowly circling the judges' tent
    if (G) {
      HUD.show(false); HUD.vctlClose(); G.player.mode = 'frozen'; G.player.person.root.visible = false;
      E.cam.follow = null; E.cam.want.set(...G.map.center(...G.map.places.pentas).flatMap((v, k) => k ? [0, v] : [v])); E.cam.distWant = 30;
      G.hooks.push(dt => { E.cam.yawWant += dt * 0.08; });
    }
    const qs = pickQuiz(L.quiz, 10);
    let i = 0, score = 0;
    const s = screen(`<div class="card" id="qz"></div>`);
    const show = () => {
      if (i >= qs.length) { s.remove(); resolve({ marks: score * 10, time: null, log: null }); return; }
      const q = qs[i];
      $('#qz', s).innerHTML = `<div class="qprog"><span>📝 Kuiz PKJR · ${esc(who)}</span><span>Soalan ${i + 1}/10 · Markah ${score * 10}</span></div>
        ${q.sign ? `<img class="quiz-img" alt="Papan tanda" src="${signURL(q.sign)}">` : ''}
        <div class="quiz-q">${esc(q.q)}</div>
        <div class="choices">${q.a.map((a, k) => `<button class="choice" data-k="${k}"${k === q.c ? ' data-ok="1"' : ''}><span class="e">${'ABC'[k]}</span><span>${esc(a)}</span></button>`).join('')}</div><div id="qz-fb"></div>`;
      s.querySelectorAll('.choice').forEach(b => b.onclick = () => {
        const k = +b.dataset.k, ok = k === q.c;
        s.querySelectorAll('.choice').forEach(x => x.disabled = true);
        b.classList.add(ok ? 'right' : 'wrong'); s.querySelector(`.choice[data-k="${q.c}"]`).classList.add('right');
        if (ok) { score++; sfx('chime'); say('kuiz_betul'); } else { sfx('bad'); say('kuiz_salah'); }
        $('#qz-fb', s).innerHTML = `<div class="feedback">${ok ? '✅ Betul!' : '❌ Kurang tepat.'} ${esc(q.why)}</div><div class="row end" style="margin-top:10px"><button class="btn green" id="qz-n">${i < 9 ? 'Seterusnya ▶' : 'Selesai'}</button></div>`;
        $('#qz-n', s).onclick = () => { sfx('click'); i++; show(); };
      });
    };
    show();
  });
}

// ---------------- results + sijil ----------------
async function showResults(L, mode, team, results) {
  const avg = Math.round(results.reduce((a, r) => a + r.marks, 0) / results.length);
  const place = avg >= 85 ? '🏆 JOHAN' : avg >= 70 ? '🥈 NAIB JOHAN' : avg >= 55 ? '🥉 TEMPAT KETIGA' : '🎗️ PENYERTAAN';
  SAVE.piala.best = SAVE.piala.best || {};
  SAVE.piala.best[L.n] = Math.max(SAVE.piala.best[L.n] || 0, avg);
  let unlockedMsg = '';
  if (avg >= 70 && L.n < 3 && (SAVE.piala.unlocked || 1) <= L.n) { SAVE.piala.unlocked = L.n + 1; unlockedMsg = `<p>🔓 <b>${LEVELS[L.n].name}</b> kini dibuka!</p>`; }
  SAVE.xp += avg; persist();
  if (avg >= 85) say('johan');
  sfx('cheer');
  const r = await modal(`<h2>🏆 Keputusan ${esc(L.name)}</h2>
    <p style="text-align:center;font-size:28px;font-weight:800;margin:6px 0">${place}</p>
    <p style="text-align:center"><b>${esc(team)}</b> · Purata <b>${avg}%</b></p>
    <table class="score"><tr><th>Anugerah</th><th>Peserta</th><th style="text-align:right">Markah</th><th></th></tr>
    ${results.map(x => `<tr><td>${x.st.e} ${esc(x.st.award)}</td><td>${esc(x.who)}</td><td class="n">${x.marks}</td><td class="medal">${medal(x.marks)}</td></tr>`).join('')}</table>
    ${unlockedMsg}`, [['Menu', 'ghost'], ['Main Lagi', ''], ['🖨️ Sijil', 'green']]);
  if (r === 2) return sijil(L, mode, team, results, place, avg);
  if (r === 1) return pialaMenu(ctx);
  ctx.exit();
}

async function sijil(L, mode, team, results, place, avg) {
  const date = new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });
  const people = mode === 'team' ? results.map(r => ({ name: r.who, line: `${r.st.award} · ${r.marks} markah ${medal(r.marks)}` })) : [{ name: results[0].who, line: `Purata markah ${avg}%` }];
  const s = screen(`<div class="card" style="max-width:720px"><div class="stack">${people.map(p => `<div class="sijil">
    <small>BIJAK PKJR · Taman Lalu Lintas</small><h1>SIJIL PENYERTAAN</h1><p>Dengan ini disahkan bahawa</p>
    <div class="nm">${esc(p.name)}</div><p>${mode === 'team' ? `mewakili <b>${esc(team)}</b> ` : ''}telah menyertai <b>Piala Lalu Lintas, ${esc(L.name)}</b></p>
    <p><b>${esc(p.line)}</b></p><p>${place}</p><small>${date} · Sempena penghormatan kepada Pertandingan Lalu Lintas Shell</small></div>`).join('')}</div>
    <div class="row end" style="margin-top:14px"><button class="btn ghost" id="sj-x">Tutup</button><button class="btn green" id="sj-p">🖨️ Cetak</button></div></div>`);
  $('#sj-p', s).onclick = () => window.print();
  $('#sj-x', s).onclick = () => { s.remove(); ctx.exit(); };
}
