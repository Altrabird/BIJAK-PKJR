// Mod Kehidupan "Taman Bijak": daily missions in the neighbourhood.
import * as THREE from 'three';
import { E } from './engine.js';
import { TOWN } from './maps.js';
import { doorPoint, roadRoute, DIR, left } from './map.js';
import { createGame } from './game.js';
import { HUD, modal, screen, esc } from './hud.js';
import { makeBus, makeCar, makeMotorcycle } from './vehicles.js';
import { makePerson } from './people.js';
import { RULES, GOOD } from './rules.js';
import { say, sfx } from './audio.js';
import { SAVE, persist } from './save.js';

export const MISSIONS = [
  { id: 'sekolah', e: '🏫', title: 'Ke Sekolah', desc: 'Jalan kaki dari rumah ke sekolah. Ingat latihan kerb!', clock: '7:00 pagi', type: 'walk', from: 'rumah', to: 'sekolah',
    steps: ['Klik di tanah untuk berjalan', 'Berhenti di tepi jalan & buat latihan kerb', 'Melintas di lintasan', 'Sampai di pintu pagar sekolah'] },
  { id: 'kedai', e: '🏪', title: 'Ke Kedai Runcit', desc: 'Ibu minta belikan roti. Lintas di lintasan zebra atau lampu isyarat.', clock: '10:00 pagi', type: 'walk', from: 'rumah', to: 'kedai',
    steps: ['Keluar dari rumah', 'Cari lintasan pejalan kaki', 'Tunggu lampu orang hijau / kenderaan berhenti', 'Sampai di kedai runcit'] },
  { id: 'bas', e: '🚌', title: 'Naik Bas Sekolah', desc: 'Tunggu bas di perhentian, naik dengan tertib dan turun dengan selamat.', clock: '6:45 pagi', type: 'bus', from: 'rumah', to: 'sekolah',
    steps: ['Jalan ke perhentian bas', 'Tunggu di belakang garisan kuning', 'Klik bas untuk naik', 'Turun & tunggu bas pergi', 'Lintas di zebra ke sekolah'] },
  { id: 'kereta', e: '🚗', title: 'Ikut Ayah Naik Kereta', desc: 'Ayah hantar ke kedai. Pilih cara yang selamat sebagai penumpang.', clock: '4:00 petang', type: 'car', from: 'rumah', to: 'kedai',
    steps: ['Pergi ke kereta ayah', 'Duduk & pakai tali pinggang', 'Keluar ikut pintu kaki lima', 'Masuk ke kedai'] },
  { id: 'motor', e: '🏍️', title: 'Membonceng Motosikal', desc: 'Ayah bawa ke surau dengan motosikal. Bonceng dengan selamat.', clock: '5:30 petang', type: 'motor', from: 'rumah', to: 'surau',
    steps: ['Pergi ke motosikal ayah', 'Pakai & ikat topi keledar', 'Duduk tegak dan berpegang', 'Turun dan masuk ke surau'] },
  { id: 'basikal', e: '🚲', title: 'Kayuh Basikal ke Taman', desc: 'Tunggang basikal ke taman permainan. W/A/S/D atau joystick, Z/C isyarat.', clock: '5:00 petang', type: 'bike', from: 'rumah', to: 'taman',
    steps: ['Pakai topi keledar', 'Tunggang di sebelah KIRI jalan', 'Isyarat sebelum membelok', 'Patuhi lampu & tanda BERHENTI', 'Sampai di taman permainan'] },
  { id: 'senja', e: '🌇', title: 'Senja ke Rumah Kawan', desc: 'Hari sudah senja. Guna lintasan pelikan: tekan butang, tunggu lampu hijau.', clock: '7:15 malam', type: 'walk', from: 'rumah', to: 'rumahKawan', dusk: 0.8,
    steps: ['Pakai baju cerah', 'Ke lintasan pelikan', 'Tekan butang & tunggu lampu orang hijau', 'Sampai di rumah kawan'] },
  { id: 'bebas', e: '🗺️', title: 'Jelajah Bebas', desc: 'Jelajah Taman Bijak. Tukar antara berjalan dan berbasikal bila-bila masa.', clock: '9:00 pagi', type: 'free', from: 'rumah',
    steps: ['Jelajah dengan selamat', 'Tekan 🚲 untuk berbasikal'] },
];

export function missionUnlocked(i) { return i === 0 || !!SAVE.missions[MISSIONS[i - 1].id] || i === MISSIONS.length - 1 && !!SAVE.missions[MISSIONS[0].id]; }

let G = null, goal = null;

export const lifeGame = () => G;
export function stopLife() { if (G) { G.dispose(); G = null; } clearGoal(); document.querySelectorAll('.life-btn').forEach(b => b.remove()); }

function setGoal(x, z, label) {
  clearGoal();
  const g = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 30, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0x2bff5a, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 15; g.add(beam);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.4, 32), new THREE.MeshBasicMaterial({ color: 0x2bff5a, transparent: true, opacity: 0.85 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.2; g.add(ring);
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g2 = c.getContext('2d');
  g2.fillStyle = 'rgba(28,91,184,.92)'; g2.beginPath(); g2.roundRect(8, 8, 496, 112, 56); g2.fill();
  g2.fillStyle = '#fff'; g2.font = '800 60px "Baloo 2", Arial'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(label, 256, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false })); sp.scale.set(8, 2, 1); sp.position.y = 7; g.add(sp);
  g.position.set(x, 0, z);
  E.scene.add(g);
  goal = { g, x, z, ring };
  if (G) G.goal = goal;
  return goal;
}
function clearGoal() { if (goal) { E.scene.remove(goal.g); goal = null; if (G) G.goal = null; } }

const PLACE_NAMES = { sekolah: 'Sekolah', kedai: 'Kedai Runcit', surau: 'Surau', taman: 'Taman Permainan', rumahKawan: 'Rumah Kawan', hentianRumah: 'Perhentian Bas', rumah: 'Rumah' };

// ---------------------------------------------------------------
export function startMission(idx, murid, onExit) {
  stopLife();
  const M = MISSIONS[idx], easy = SAVE.settings.tahap === 1;
  G = createGame(TOWN, { cars: easy ? 9 : 14, npcs: 12, bad: easy ? 0 : 0.12, dusk: M.dusk || 0, murid });
  const P = G.player, map = G.map;
  P.easy = easy;
  const home = doorPoint(map, map.places[M.from]);
  P.walker.place(...home);
  E.cam.want.set(home[0], 0, home[1]); E.cam.target.copy(E.cam.want);
  HUD.show(); HUD.setMurid(P.murid); HUD.setTitle(`${M.e} ${M.title}`, M.clock);
  let step = 0;
  const setStep = n => { step = n; HUD.setObjectives(M.title, M.steps, n); };
  setStep(0);
  P.refresh();
  let done = false;

  const finish = async (ok) => {
    if (done) return; done = true;
    G.paused = true;
    HUD.kerbClose(); HUD.vctlClose();
    const s = P.stats;
    if (!ok) {
      sfx('bad'); say('misi_gagal');
      const r = await modal(`<h2>😟 Misi belum berjaya</h2><p>Keselamatan awak jatuh terlalu rendah. Mari lihat apa yang perlu diperbaiki:</p>${offenceList(s.log)}`, [['Menu', 'ghost'], ['Cuba Lagi', 'green']]);
      return r === 1 ? startMission(idx, murid, onExit) : onExit();
    }
    const stars = s.saman === 0 ? 3 : s.safe >= 60 ? 2 : 1;
    const gained = s.xp + 50 + stars * 20;
    SAVE.xp += gained;
    SAVE.missions[M.id] = Math.max(SAVE.missions[M.id] || 0, stars);
    persist();
    sfx('cheer'); say('misi_selesai');
    const hasNext = idx + 1 < MISSIONS.length;
    const r = await modal(`<h2>🎉 Misi Selesai: ${esc(M.title)}</h2>
      <div class="big-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <p style="text-align:center"><b>+${gained} Mata Bijak</b> · Keselamatan ${s.safe}% · Saman ${s.saman}</p>
      ${s.good.length ? `<p>✅ Tindakan bijak: ${[...new Set(s.good)].map(g => esc(GOOD[g].t)).join(', ')}</p>` : ''}
      ${s.log.length ? `<p>Perlu diperbaiki:</p>${offenceList(s.log)}` : '<p>Hebat! Tiada saman langsung. Awak pengguna jalan raya yang bijak!</p>'}`,
      hasNext ? [['Menu', 'ghost'], ['Ulang', ''], ['Misi Seterusnya ▶', 'green']] : [['Menu', 'ghost'], ['Ulang', 'green']]);
    if (r === 1) startMission(idx, murid, onExit);
    else if (r === 2) startMission(idx + 1, murid, onExit);
    else onExit();
  };

  G.hooks.push(() => {
    if (!done && P.stats.safe <= 0) finish(false);
    if (goal) goal.ring.rotation.z += 0.02;
  });

  const goTo = (place, label, onReach, radius = 2.6) => {
    const [x, z] = typeof place === 'string' ? doorPoint(map, map.places[place]) : place;
    setGoal(x, z, label || PLACE_NAMES[place] || 'Destinasi');
    const h = () => {
      if (done || !goal) return;
      const p = P.pos;
      if (Math.hypot(p.x - goal.x, p.z - goal.z) < radius) { G.hooks = G.hooks.filter(f => f !== h); clearGoal(); onReach(); }
    };
    G.hooks.push(h);
  };

  // walking steps advance on events
  G.onGood = id => { if (id === 'KERB_OK' && step < 2 && M.type === 'walk') setStep(Math.max(step, 2)); };
  G.onCrossed = () => { if (M.type === 'walk' && step < M.steps.length - 1) setStep(M.steps.length - 1); };
  if (M.type === 'walk') {
    say(idx === 0 ? 'selamat_datang' : null);
    const begin = () => {
      setStep(1);
      goTo(M.to, null, () => finish(true));
    };
    if (M.dusk) {
      HUD.choice('Hari sudah senja', 'Apa yang patut awak pakai sebelum keluar berjalan?', [
        { e: '👕', label: 'Baju cerah dan bawa lampu suluh', ok: true, note: 'Pakaian cerah dan lampu suluh membantu pemandu nampak awak dari jauh.' },
        { e: '🖤', label: 'Baju hitam, cepat sikit sampai', ok: false, rule: 'BAJU_GELAP_MALAM' },
      ]).then(o => { if (!o.ok) P.offence('BAJU_GELAP_MALAM', '', true); else P.good('PILIHAN_BIJAK', true); setStep(1); begin(); });
    } else begin();
  }

  if (M.type === 'free') {
    const b = document.createElement('button');
    b.className = 'icon-btn life-btn'; b.textContent = '🚲'; b.title = 'Berbasikal / berjalan';
    Object.assign(b.style, { position: 'absolute', right: '12px', bottom: '70px', width: '60px', height: '60px', fontSize: '28px' });
    b.onclick = () => {
      sfx('click');
      if (P.mode === 'ride') { P.dismount(); b.textContent = '🚲'; }
      else { P.helmet = true; P.mount('bike'); b.textContent = '🚶'; }
    };
    document.getElementById('hud').appendChild(b);
  }

  if (M.type === 'bike') bikeMission(M, P, map, setStep, goTo, finish);
  if (M.type === 'bus') busMission(P, map, setStep, goTo, finish);
  if (M.type === 'car' || M.type === 'motor') rideAlong(M, P, map, setStep, goTo, finish);

  return G;
}

function offenceList(log) {
  const uniq = [...new Set(log)];
  return `<div class="offences">${uniq.map(id => `<div class="offence"><b>🚨 ${esc(RULES[id].t)}</b>${esc(RULES[id].why)}</div>`).join('')}</div>`;
}

// ---------------- bicycle ----------------
async function bikeMission(M, P, map, setStep, goTo, finish) {
  G.paused = true;
  const o1 = await HUD.choice('Sebelum menunggang', 'Apa yang perlu awak pakai?', [
    { e: '⛑️', label: 'Topi keledar, ikat talinya', ok: true, note: 'Topi keledar melindungi kepala. Ikat tali dengan kemas.' },
    { e: '🧢', label: 'Topi biasa pun cukup', ok: false, rule: 'TIADA_TOPI_KELEDAR' },
    { e: '🙅', label: 'Tak payah, dekat sahaja', ok: false, rule: 'TIADA_TOPI_KELEDAR' },
  ]);
  P.helmet = o1.ok;
  const o2 = await HUD.choice('Periksa basikal', 'Apa yang perlu diperiksa sebelum menunggang?', [
    { e: '🔧', label: 'Brek, tayar, loceng dan lampu', ok: true, note: 'Basikal yang baik keadaannya lebih selamat. Brek mesti berfungsi!' },
    { e: '🏁', label: 'Tak perlu periksa, terus kayuh laju', ok: false, rule: 'LANGGAR' },
  ]);
  if (o2.ok) P.good('PILIHAN_BIJAK', true);
  G.paused = false;
  // start on the grass next to the road east of home
  const [hx, hz] = map.center(6, 12);
  P.walker.place(hx + 2.5, hz);
  P.mount('bike', { yaw: Math.PI / 2 });
  setStep(1);
  HUD.toast('W/A/S/D atau joystick untuk menunggang · Z/C isyarat · H loceng', 'info');
  const [tx, tz] = map.center(...map.places.taman);
  goTo([tx, tz], 'Taman Permainan', () => { P.dismount(); finish(true); }, 9);
  G.onGood = id => { if (id === 'ISYARAT_OK') setStep(3); if (id === 'BERHENTI_OK') setStep(4); };
}

// ---------------- school bus ----------------
function busMission(P, map, setStep, goTo, finish) {
  const stop = map.places.hentianRumah, [sx, sz] = map.center(...stop);
  goTo([sx - 3.3, sz + 0.5], 'Perhentian Bas', () => {
    setStep(1);
    HUD.toast('Tunggu di belakang garisan kuning…', 'info');
    const wp = [[1, 9], [1, 13], [7, 14], [7, 1], [11, 1], [14, 1]];
    let route = [wp[0]];
    for (let k = 1; k < wp.length; k++) route = route.concat(roadRoute(map, wp[k - 1], wp[k]).slice(1));
    const bus = G.traffic.add({ tile: [1, 9], ent: 'N', mesh: makeBus(), half: 4.6, vmax: 6.5, route, s: 2, bad: false });
    bus.stopAt = { tile: [1, 13], s: 5.6 };
    G.bus = bus;
    let phase = 'come';
    G.pickables = [bus.mesh]; bus.mesh.userData.pick = true;
    G.hooks.push(() => {
      if (phase === 'come' && Math.hypot(bus.x - sx, bus.z - sz) < 22) {
        phase = 'arriving'; say('bas_tiba');
        // waiting line is 0.6 m in front of the shelter toward the road (road is west of the stop)
        const p = P.pos;
        if (p.x < sx - 3.3 - 0.6 || map.cellAt(p.x, p.z) !== 0) P.offence('BAS_GARISAN');
      }
      if (phase === 'arriving' && bus.v < 0.05 && bus.tile[0] === 1 && bus.tile[1] === 13) {
        phase = 'board'; setStep(2); HUD.toast('Bas sudah berhenti. Klik bas untuk naik.', 'info');
      }
      if (phase === 'ride' && bus.v < 0.05 && bus.tile[0] === 11 && bus.tile[1] === 1) {
        phase = 'drop'; setStep(3);
        const [dx, dz] = doorPoint(map, map.places.hentianSekolah);
        P.alight(dx, dz - 0.6);
        say('bas_turun');
        setTimeout(() => { bus.stopAt = null; }, 3000);
        goTo('sekolah', 'Sekolah', () => finish(true));
        setTimeout(() => setStep(4), 1500);
      }
      if (phase === 'drop' && !bus.gone && Math.hypot(bus.x - P.pos.x, bus.z - P.pos.z) > 20) { bus.gone = true; }
    });
    G.onPick = obj => {
      if (obj !== bus.mesh || phase !== 'board') return;
      if (Math.hypot(bus.x - P.pos.x, bus.z - P.pos.z) > 9) { HUD.toast('Dekati bas dahulu', 'warn'); return; }
      phase = 'ride'; P.board(bus.mesh); sfx('chime'); P.good('PILIHAN_BIJAK', true);
      bus.stopAt = { tile: [11, 1], s: 6.2 };
      G.pickables = [];
    };
  });
}

// ---------------- car / motorcycle passenger ----------------
function rideAlong(M, P, map, setStep, goTo, finish) {
  const moto = M.type === 'motor';
  let mesh;
  if (moto) {
    mesh = makeMotorcycle();
    const ayah = makePerson({ role: 'awam', jantina: 'lelaki', shirt: 0x2e7d32, pants: 0x37474f, bag: false });
    ayah.pose = 'sit'; ayah.animate(0, 0); ayah.setHelmet(true, 0x222222);
    ayah.root.position.set(0, 0.45, -0.05); ayah.root.scale.setScalar(1.15); mesh.add(ayah.root);
  } else mesh = makeCar('car_wagon');
  const wp = moto ? [[5, 14], [14, 14], [14, 10]] : [[5, 14], [14, 14], [14, 8], [9, 8]];
  let route = [wp[0]];
  for (let k = 1; k < wp.length; k++) route = route.concat(roadRoute(map, wp[k - 1], wp[k]).slice(1));
  const veh = G.traffic.add({ tile: [5, 14], ent: 'W', mesh, half: moto ? 1.1 : 2.3, vmax: 7, route, s: 5, bad: false });
  veh.stopAt = { tile: [5, 14], s: 5 }; veh.v = 0;
  const lane = (c, d) => { const l = left([c.dx, c.dz]); return [c.x + l[0] * d, c.z + l[1] * d]; };
  const [kx, kz] = lane(veh, 3.2);
  goTo([kx, kz], moto ? 'Motosikal Ayah' : 'Kereta Ayah', async () => {
    setStep(1); G.paused = true;
    if (moto) {
      const a = await HUD.choice('Sebelum membonceng', 'Ayah hulurkan topi keledar. Apa awak buat?', [
        { e: '⛑️', label: 'Pakai dan ikat tali sehingga kemas', ok: true, note: 'Tali yang diikat memastikan topi keledar tidak tercabut.' },
        { e: '🎒', label: 'Pakai tapi tak payah ikat', ok: false, rule: 'TOPI_TIDAK_DIIKAT' },
        { e: '🙅', label: 'Tak pakai, surau dekat sahaja', ok: false, rule: 'TIADA_TOPI_KELEDAR' },
      ]);
      if (a.ok) P.good('PILIHAN_BIJAK', true); else P.offence(a.rule, '', true);
      setStep(2);
      const b = await HUD.choice('Cara membonceng', 'Bagaimana awak patut duduk?', [
        { e: '🧍', label: 'Duduk tegak menghadap depan, kaki di pemijak, pegang pinggang ayah', ok: true },
        { e: '↔️', label: 'Duduk mengiring supaya selesa', ok: false, rule: 'BONCENG_TIDAK_PEGANG' },
        { e: '🙌', label: 'Lepas tangan dan melambai kawan', ok: false, rule: 'BONCENG_TIDAK_PEGANG' },
      ]);
      if (b.ok) P.good('PILIHAN_BIJAK', true); else P.offence(b.rule, '', true);
      // put the murid on the back seat, visibly
      P.person.root.visible = true; P.person.pose = 'sit'; P.person.setHelmet(a.ok || a.rule === 'TOPI_TIDAK_DIIKAT');
      P.board(mesh); P.person.root.visible = true;
      mesh.add(P.person.root); P.person.root.position.set(0, 0.45, -0.6); P.person.root.rotation.set(0, 0, 0);
    } else {
      const a = await HUD.choice('Masuk kereta', 'Di mana awak patut duduk?', [
        { e: '🪑', label: 'Kerusi belakang', ok: true, note: 'Kanak-kanak paling selamat di kerusi belakang.' },
        { e: '🚘', label: 'Kerusi depan sebelah ayah', ok: false, rule: 'DUDUK_DEPAN' },
      ]);
      if (a.ok) P.good('PILIHAN_BIJAK', true); else P.offence(a.rule, '', true);
      const b = await HUD.choice('Sebelum kereta bergerak', 'Apa yang perlu awak buat?', [
        { e: '🔒', label: 'Pakai tali pinggang keledar', ok: true, note: 'Tali pinggang wajib walaupun di kerusi belakang.' },
        { e: '😴', label: 'Baring di kerusi belakang', ok: false, rule: 'TIADA_TALI_PINGGANG' },
        { e: '🪟', label: 'Jenguk kepala keluar tingkap', ok: false, rule: 'TIADA_TALI_PINGGANG' },
      ]);
      if (b.ok) P.good('PILIHAN_BIJAK', true); else P.offence(b.rule, '', true);
      P.board(mesh);
    }
    G.paused = false;
    setStep(moto ? 3 : 2);
    const end = wp[wp.length - 1];
    veh.stopAt = { tile: end, s: 5 };
    const h = async () => {
      if (!(veh.v < 0.05 && veh.tile[0] === end[0] && veh.tile[1] === end[1] && veh.s > 3)) return;
      G.hooks = G.hooks.filter(f => f !== h);
      G.paused = true;
      if (!moto) {
        const c = await HUD.choice('Sudah sampai', 'Kereta sudah berhenti. Keluar ikut pintu mana?', [
          { e: '⬅️', label: 'Pintu kiri, sebelah kaki lima', ok: true, note: 'Keluar di sebelah kaki lima, jauh dari kenderaan yang lalu.' },
          { e: '➡️', label: 'Pintu kanan, sebelah jalan', ok: false, rule: 'KELUAR_SEBELAH_JALAN' },
        ]);
        if (c.ok) P.good('PILIHAN_BIJAK', true); else P.offence(c.rule, '', true);
      } else {
        mesh.remove(P.person.root); E.scene.add(P.person.root); P.person.pose = 'stand'; P.person.setHelmet(false);
      }
      G.paused = false;
      const [ax, az] = lane(veh, 3.4);
      P.alight(ax, az);
      setTimeout(() => { veh.stopAt = null; }, 2500);
      setStep(3);
      goTo(M.to, null, () => finish(true));
    };
    G.hooks.push(h);
  });
}

// ---------------- mission picker ----------------
export function missionPicker(murid, onStart, onBack) {
  const s = screen(`<div class="card"><h2>🏡 Taman Bijak</h2><p>Hai <b>${esc(murid.nama)}</b>! Pilih misi hari ini. ⭐ Mata Bijak: <b>${SAVE.xp}</b></p>
    <div class="missions">${MISSIONS.map((m, i) => {
      const st = SAVE.missions[m.id] || 0, un = missionUnlocked(i);
      return `<button class="mission" data-i="${i}" ${un ? '' : 'disabled'}><span class="n">${un ? m.e : '🔒'}</span><span><b>${i + 1}. ${esc(m.title)}</b><small>${esc(m.desc)}</small></span><span class="stars">${m.type === 'free' ? '' : '★'.repeat(st) + '☆'.repeat(3 - st)}</span></button>`;
    }).join('')}</div>
    <div class="row end" style="margin-top:12px"><button class="btn ghost" id="mp-back">◀ Menu</button></div></div>`);
  s.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { sfx('click'); s.remove(); onStart(+b.dataset.i); });
  s.querySelector('#mp-back').onclick = () => { sfx('click'); s.remove(); onBack(); };
}
