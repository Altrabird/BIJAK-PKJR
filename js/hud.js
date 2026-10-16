// DOM user interface: needs panel, objectives, kerb drill, saman slips, choice cards, dialogs.
import { RULES, GOOD } from './rules.js';
import { say, sfx, A } from './audio.js';
import { rotateCam, zoomCam } from './engine.js';

const ui = () => document.getElementById('ui');
export const $ = (sel, root = document) => root.querySelector(sel);
export function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// full-screen layer; returns the element (caller removes it)
export function screen(inner, cls = 'dim') {
  const s = el(`<div class="screen ${cls}">${inner}</div>`);
  ui().appendChild(s); return s;
}

// simple dialog: resolves with the index of the button pressed
export function modal(inner, buttons = [['Teruskan', 'green']]) {
  return new Promise(res => {
    const s = screen(`<div class="card">${inner}<div class="row end" style="margin-top:14px">${buttons.map(([t, c], i) => `<button class="btn ${c || ''}" data-i="${i}">${t}</button>`).join('')}</div></div>`);
    s.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { sfx('click'); s.remove(); res(+b.dataset.i); });
  });
}

export const HUD = {
  root: null, slipT: 0,
  init() {
    const h = this.root = el(`<div id="hud" class="hidden">
      <div class="needs">
        <div class="who"><div class="avatar" id="h-av">🙂</div><span id="h-name">Murid</span></div>
        <div class="need"><span>🛡️ Keselamatan</span><div class="meter"><i id="h-safe" style="width:100%"></i></div></div>
        <div class="need"><span>⭐ Mata Bijak</span><span class="stat" id="h-xp">0</span></div>
        <div class="need"><span>🚨 Saman</span><span class="stat" id="h-saman">0</span></div>
      </div>
      <div class="topbar"><span class="clock" id="h-clock">7:00 pagi</span><span id="h-title">Taman Bijak</span></div>
      <div class="tools">
        <button class="icon-btn" id="h-sound" title="Bunyi">🔊</button>
        <button class="icon-btn" id="h-menu" title="Menu">☰</button>
      </div>
      <div class="objective hidden" id="h-obj"></div>
      <div class="camtools">
        <button class="icon-btn" id="h-rl" title="Putar kamera (Q)">⟲</button>
        <button class="icon-btn" id="h-zi" title="Zum masuk">＋</button>
        <button class="icon-btn" id="h-zo" title="Zum keluar">－</button>
        <button class="icon-btn" id="h-rr" title="Putar kamera (E)">⟳</button>
      </div>
      <div class="toasts" id="h-toasts"></div>
    </div>`);
    ui().appendChild(h);
    $('#h-rl', h).onclick = () => rotateCam(1); $('#h-rr', h).onclick = () => rotateCam(-1);
    $('#h-zi', h).onclick = () => zoomCam(0.8); $('#h-zo', h).onclick = () => zoomCam(1.25);
    $('#h-sound', h).onclick = e => { A.on = !A.on; e.currentTarget.textContent = A.on ? '🔊' : '🔇'; if (!A.on && A.voice) A.voice.pause(); };
  },
  show(on = true) { this.root.classList.toggle('hidden', !on); },
  onMenu(fn) { $('#h-menu', this.root).onclick = () => { sfx('click'); fn(); }; },
  setMurid(m) { $('#h-name', this.root).textContent = m.nama; $('#h-av', this.root).textContent = m.jantina === 'perempuan' ? '👧' : '👦'; },
  setStats({ safe, xp, saman }) {
    const b = $('#h-safe', this.root);
    b.style.width = Math.max(0, safe) + '%';
    b.style.background = safe > 60 ? 'var(--green)' : safe > 30 ? 'var(--amber)' : 'var(--red)';
    $('#h-xp', this.root).textContent = xp; $('#h-saman', this.root).textContent = saman;
    $('#h-av', this.root).style.borderColor = safe > 60 ? 'var(--green)' : safe > 30 ? 'var(--amber)' : 'var(--red)';
  },
  setTitle(t, clock) { $('#h-title', this.root).textContent = t; if (clock) $('#h-clock', this.root).textContent = clock; },
  setObjectives(title, steps, now) {
    const o = $('#h-obj', this.root);
    if (!steps) { o.classList.add('hidden'); return; }
    o.classList.remove('hidden');
    o.innerHTML = `<h3>${esc(title)}</h3><ol>${steps.map((s, i) => `<li class="${i < now ? 'done' : i === now ? 'now' : ''}">${esc(s)}</li>`).join('')}</ol>`;
  },
  toast(msg, kind = '') {
    const t = el(`<div class="toast ${kind}">${esc(msg)}</div>`);
    $('#h-toasts', this.root).appendChild(t); setTimeout(() => t.remove(), 2600);
  },
  banner(txt, ms = 1800) { const b = el(`<div class="banner">${esc(txt)}</div>`); ui().appendChild(b); setTimeout(() => b.remove(), ms); },
  slip(id, extra = '') {
    const r = RULES[id]; if (!r) return;
    document.querySelectorAll('.slip').forEach(s => s.remove());
    const s = el(`<div class="slip"><div class="hd"><span>SAMAN PKJR</span><span>✕</span></div><h4>${esc(r.t)}</h4><p>${esc(r.why)}</p><div class="pen">−${r.pen} Keselamatan ${extra}</div><div class="stamp">POLIS</div></div>`);
    s.onclick = () => s.remove();
    ui().appendChild(s);
    clearTimeout(this.slipT); this.slipT = setTimeout(() => s.remove(), 6500);
    sfx('whistle'); setTimeout(() => say(id), 500);
  },
  praise(id) { const g = GOOD[id]; if (!g) return; this.toast(`${g.t}  +${g.pts}`); sfx('chime'); say(id); },

  // ---- kerb drill ----
  kerb: null,
  kerbOpen(o) {
    this.kerbClose();
    const k = this.kerb = el(`<div class="kerb">
      <div class="title">🛑 Berhenti di tepi jalan</div>
      <div class="seq"><span>Kanan</span><span>Kiri</span><span>Kanan</span></div>
      <div class="sig" id="k-sig"></div>
      <div class="row">
        <button class="btn ghost" data-a="L">👈 Lihat Kiri</button>
        <button class="btn ghost" data-a="R">Lihat Kanan 👉</button>
        ${o.pelican ? '<button class="btn amber" data-a="P">🔘 Tekan Butang</button>' : ''}
        <button class="btn green" data-a="G">🚶 Lintas!</button>
        <button class="btn red" data-a="X">✕</button>
      </div>
      <div class="keys">Papan kekunci: ← kiri · → kanan · Space lintas${o.pelican ? ' · B butang' : ''} · Esc batal</div>
    </div>`);
    $('#hud').appendChild(k);
    k.querySelectorAll('[data-a]').forEach(b => b.onclick = () => o.act(b.dataset.a));
    this.kerbHint(o.hint);
  },
  kerbSeq(n) { if (this.kerb) this.kerb.querySelectorAll('.seq span').forEach((s, i) => s.classList.toggle('ok', i < n)); },
  kerbHint(a) { if (this.kerb) this.kerb.querySelectorAll('[data-a]').forEach(b => b.classList.toggle('hint', b.dataset.a === a)); },
  kerbSignal(html) { if (this.kerb) $('#k-sig', this.kerb).innerHTML = html; },
  kerbClose() { if (this.kerb) { this.kerb.remove(); this.kerb = null; } },

  // ---- Sims-like choice card. options: {e, label, ok, rule, good, note} ----
  choice(title, q, opts) {
    // shuffle so the safe answer is not always first
    const options = opts.map(o => [Math.random(), o]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    return new Promise(res => {
      const s = screen(`<div class="card"><h2>${esc(title)}</h2><p>${esc(q)}</p><div class="choices">${options.map((o, i) =>
        `<button class="choice" data-i="${i}"${o.ok ? ' data-ok="1"' : ''}><span class="e">${o.e || '•'}</span><span>${esc(o.label)}</span></button>`).join('')}</div><div id="c-fb"></div></div>`);
      const btns = s.querySelectorAll('.choice');
      btns.forEach(b => b.onclick = () => {
        const o = options[+b.dataset.i];
        btns.forEach(x => x.disabled = true);
        b.classList.add(o.ok ? 'right' : 'wrong');
        if (!o.ok) { const r = options.findIndex(x => x.ok); if (r >= 0) btns[r].classList.add('right'); }
        const why = o.ok ? (o.note || GOOD[o.good || 'PILIHAN_BIJAK'].t) : (RULES[o.rule]?.why || o.note || '');
        $('#c-fb', s).innerHTML = `<div class="feedback">${o.ok ? '✅' : '⚠️'} ${esc(why)}</div><div class="row end" style="margin-top:10px"><button class="btn green" id="c-go">Teruskan</button></div>`;
        if (o.ok) { sfx('chime'); say(o.good || 'PILIHAN_BIJAK'); } else { sfx('bad'); say(o.rule); }
        $('#c-go', s).onclick = () => { sfx('click'); s.remove(); res(o); };
      });
    });
  },

  // ---- vehicle controls for touch screens ----
  vctl: null,
  vctlOpen(o) {
    this.vctlClose();
    const v = this.vctl = el(`<div class="vctl">
      <div class="joy" id="v-joy"><i></i></div>
      <div class="vbtns">
        <button class="icon-btn" data-s="L" title="Isyarat kiri (Z)">⬅️</button>
        <button class="icon-btn" data-s="bell" title="Loceng / hon (H)">🔔</button>
        <button class="icon-btn" data-s="R" title="Isyarat kanan (C)">➡️</button>
      </div>
      <div class="speed" id="v-spd">0 km/j</div>
    </div>`);
    $('#hud').appendChild(v);
    v.querySelectorAll('[data-s]').forEach(b => b.onclick = () => o.signal(b.dataset.s));
    const joy = $('#v-joy', v), knob = joy.firstElementChild;
    let id = null;
    const set = e => {
      const r = joy.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 2 - 1, y = (e.clientY - r.top) / r.height * 2 - 1;
      const l = Math.min(1, Math.hypot(x, y)), a = Math.atan2(y, x), cx = Math.cos(a) * l, cy = Math.sin(a) * l;
      knob.style.transform = `translate(${cx * 45}px, ${cy * 45}px)`;
      o.joy(cx, cy);
    };
    joy.addEventListener('pointerdown', e => { id = e.pointerId; joy.setPointerCapture(id); set(e); });
    joy.addEventListener('pointermove', e => { if (e.pointerId === id) set(e); });
    const end = () => { id = null; knob.style.transform = ''; o.joy(0, 0); };
    joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
  },
  vctlSignal(s) { if (this.vctl) this.vctl.querySelectorAll('[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === s)); },
  vctlSpeed(kmh) { if (this.vctl) $('#v-spd', this.vctl).textContent = `${Math.round(kmh)} km/j`; },
  vctlClose() { if (this.vctl) { this.vctl.remove(); this.vctl = null; } },
};
