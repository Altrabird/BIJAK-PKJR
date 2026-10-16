// The murid: walks by click (with kerb drill), rides a bicycle / kereta pedal, or sits as a passenger.
// All rule detection for the player lives here and reports through offence() / good().
import * as THREE from 'three';
import { E, pick } from './engine.js';
import { makePerson } from './people.js';
import { makeBicycle, makeKart, setLights, SEATS } from './vehicles.js';
import { Walker, heightAt, onRoadCell } from './walker.js';
import { CELL, DIR, OPP, left, right, sideOf, sideBetween, isRoad, isStraight, key } from './map.js';
import { RULES, GOOD } from './rules.js';
import { HUD } from './hud.js';
import { say, sfx } from './audio.js';
import { SAVE } from './save.js';

const PATTERN = ['R', 'L', 'R'];

export class Player {
  constructor(G, murid = {}) {
    this.G = G; this.map = G.map;
    this.murid = { nama: 'Murid', jantina: 'lelaki', tudung: false, skin: 0xd9a47a, hair: 0x1b1410, ...murid };
    this.person = makePerson({ ...this.murid, role: 'murid' });
    const [sx, sz] = G.map.center(...G.map.spawn);
    this.walker = new Walker(G.map, this.person, sx, sz, 1.7);
    this.mode = 'walk';            // walk | ride | passenger | frozen | injured
    this.stats = { safe: 100, xp: 0, saman: 0, log: [], good: [] };
    this.cool = {};
    this.helmet = false; this.lightsOn = false; this.brightClothes = true;
    this.input = { x: 0, y: 0 }; this.keys = {};
    this.signal = null; this.signalT = 0;
    this.plumbob = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshLambertMaterial({ color: 0x2bff5a, emissive: 0x0a6b22 }));
    this.plumbob.scale.y = 1.6;
    E.scene.add(this.plumbob);
    E.cam.follow = this.person.root;
    E.cam.want.copy(this.person.root.position); E.cam.target.copy(this.person.root.position);
    this.bindInput();
    this.runLock = false; this.runHold = false;   // run button toggles, Shift runs while held
    HUD.onRun(() => { this.runLock = !this.runLock; this.applySpeed(); });
    this.applySpeed();
    this.refresh();
  }
  applySpeed() {
    const run = this.runLock || this.runHold;
    this.walker.speed = run ? 3.3 : 1.7;   // m/s: a brisk walk, or a child's run
    HUD.setRun(run);
  }

  // ---------- scoring ----------
  offence(id, extra, quiet) {
    const now = this.G.t;
    if (this.cool[id] && now - this.cool[id] < 5) return;
    this.cool[id] = now;
    const r = RULES[id];
    this.stats.safe = Math.max(0, this.stats.safe - r.pen);
    this.stats.saman++;
    this.stats.log.push(id);
    if (!quiet) HUD.slip(id, extra);
    this.G.onOffence && this.G.onOffence(id);
    this.refresh();
  }
  good(id, quiet) {
    const now = this.G.t;
    if (!quiet && this.cool[id] && now - this.cool[id] < 4) return;
    this.cool[id] = now;
    const g = GOOD[id];
    this.stats.xp += g.pts; this.stats.safe = Math.min(100, this.stats.safe + 3);
    this.stats.good.push(id);
    if (!quiet) HUD.praise(id);
    this.G.onGood && this.G.onGood(id);
    this.refresh();
  }
  warnOnce(msg) { if (this.G.t - (this.cool.warn || -9) > 4) { this.cool.warn = this.G.t; HUD.toast(msg, 'warn'); } }
  refresh() { HUD.setStats({ safe: this.stats.safe, xp: SAVE.xp + this.stats.xp, saman: this.stats.saman }); }

  get pos() { return this.mode === 'ride' ? this.veh.position : this.person.root.position; }

  obstacle() {
    if (this.mode === 'ride') return { x: this.veh.position.x, z: this.veh.position.z, kind: 'veh', half: 0.9, ref: this };
    if (this.mode === 'injured') return { x: this.walker.x, z: this.walker.z, kind: 'ped', injured: true, ref: this };
    if (this.mode !== 'walk') return null;
    const w = this.walker, c = this.map.cellAt(w.x, w.z);
    if (onRoadCell(c) || w.state === 'kerb') return { x: w.x, z: w.z, kind: 'ped', waiting: w.state === 'kerb' && !onRoadCell(c), cross: w.kerb?.cross, ref: this };
    return null;
  }

  // ---------- input ----------
  bindInput() {
    const cv = E.renderer.domElement;
    this.onDown = e => {
      if (e.button !== 0 || this.mode !== 'walk' || this.G.paused) return;
      this.downAt = [e.clientX, e.clientY];
    };
    this.onUp = e => {
      if (e.button !== 0 || !this.downAt || this.mode !== 'walk' || this.G.paused || this.frozen) return;
      const moved = Math.hypot(e.clientX - this.downAt[0], e.clientY - this.downAt[1]); this.downAt = null;
      if (moved > 8) return;
      const h = pick(e.clientX, e.clientY, this.G.pickables || []);
      if (!h) return;
      if (h.obj && this.G.onPick) { this.G.onPick(h.obj); return; }
      this.walkTo(h.point.x, h.point.z);
    };
    this.onKey = e => {
      if (e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase(), down = e.type === 'keydown';
      this.keys[k] = down;
      if (k === 'shift' && this.runHold !== down) { this.runHold = down; this.applySpeed(); }
      if (!down) return;
      if (this.walker.state === 'kerb' && HUD.kerb) {
        const map = { arrowleft: 'L', a: 'L', arrowright: 'R', d: 'R', ' ': 'G', enter: 'G', b: 'P', escape: 'X' };
        if (map[k]) { e.preventDefault(); this.kerbAct(map[k]); }
      }
      if (this.mode === 'ride') {
        if (k === 'z') this.setSignal('L');
        if (k === 'c') this.setSignal('R');
        if (k === 'h') this.setSignal('bell');
      }
    };
    cv.addEventListener('pointerdown', this.onDown);
    cv.addEventListener('pointerup', this.onUp);
    addEventListener('keydown', this.onKey); addEventListener('keyup', this.onKey);
  }

  walkTo(x, z) {
    // clicking somewhere while waiting at the kerb means "cross now" (the drill is still judged: skipping it earns a saman);
    // without this, every click walked straight back to the same kerb and the road could never be crossed
    if (this.walker.state === 'kerb' && this.drill) this.kerbAct('G');
    if (this.walker.goTo(x, z)) { this.marker(x, z); sfx('click'); }
  }
  marker(x, z) {
    if (!this.mk) {
      this.mk = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.55, 24), new THREE.MeshBasicMaterial({ color: 0x2bff5a, transparent: true, opacity: 0.9 }));
      this.mk.rotation.x = -Math.PI / 2; E.scene.add(this.mk);
    }
    this.mk.position.set(x, heightAt(this.map, x, z) + 0.03, z); this.mk.visible = true; this.mkT = 1.2;
  }

  // ---------- kerb drill ----------
  kerbStart(w, k) {
    this.drill = { n: 0, looks: [], cross: k.cross, t: 0, waitedRed: false };
    const cr = k.cross >= 0 ? this.map.crossings[k.cross] : null;
    HUD.kerbOpen({ pelican: cr && cr.type === 'pelican', hint: this.easy ? 'R' : null, act: a => this.kerbAct(a) });
    say('kerb_berhenti');
    return false;      // the player decides when to go
  }
  kerbAct(a) {
    const d = this.drill; if (!d) return;
    sfx('click');
    const cr = d.cross >= 0 ? this.map.crossings[d.cross] : null;
    if (a === 'L' || a === 'R') {
      d.n = a === PATTERN[d.n] ? d.n + 1 : (a === 'R' ? 1 : 0);
      if (d.n > 3) d.n = 3;
      d.lookT = 0.9; d.lookDir = a;
      sfx('look'); say(a === 'L' ? 'kerb_kiri' : (d.n === 3 ? 'kerb_kanan2' : 'kerb_kanan'));
      HUD.kerbSeq(d.n);
      if (this.easy) HUD.kerbHint(d.n < 3 ? PATTERN[d.n] : (cr && cr.type === 'pelican' && this.G.sig.pelicanCar(cr.id) === 'G' ? 'P' : 'G'));
    } else if (a === 'P' && cr && cr.type === 'pelican') {
      if (this.G.sig.press(cr.id)) { sfx('beep'); say('tekan_butang'); }
    } else if (a === 'X') {
      HUD.kerbClose(); this.walker.stop(); this.drill = null; this.person.head.rotation.y = 0;
    } else if (a === 'G') {
      HUD.kerbClose();
      if (d.n < 3) this.offence('TIADA_KERB_DRILL'); else this.good('KERB_OK');
      if (cr && cr.type !== 'zebra') {
        if (!this.G.sig.pedGreen(cr.id)) this.offence('LINTAS_MERAH');
        else if (d.waitedRed) this.good('TUNGGU_HIJAU');
      }
      if (!cr) {
        const near = this.map.crossings.some(c => Math.hypot(c.x - this.walker.x, c.z - this.walker.z) < 45);
        if (near) this.offence('LINTAS_BUKAN_TEMPAT');
      } else if (cr.type === 'zebra') this.good('GUNA_LINTASAN');
      this.checkBus();
      this.drill = null; this.person.head.rotation.y = 0;
      this.walker.proceed();
    }
  }
  checkBus() {
    const b = this.G.bus;
    if (b && b.v < 0.5 && !b.gone && Math.hypot(b.x - this.walker.x, b.z - this.walker.z) < 14) this.offence('LINTAS_DEPAN_BAS');
  }

  // ---------- riding ----------
  mount(kind, opts = {}) {
    this.walker.stop(); HUD.kerbClose();
    const v = this.veh = new THREE.Group();
    const body = kind === 'kart' ? makeKart(opts.color) : makeBicycle(opts.color);
    v.add(body);
    this.vkind = kind;
    v.add(this.person.root);
    this.person.root.position.set(...SEATS[kind]);
    this.person.root.rotation.set(0, 0, 0);
    this.person.pose = kind === 'kart' ? 'sit' : 'pedal';
    this.person.setHelmet(this.helmet);
    const p = opts.at || [this.walker.x, this.walker.z];
    v.position.set(p[0], heightAt(this.map, ...p), p[1]);
    this.yaw = opts.yaw ?? this.walker.yaw;
    v.rotation.y = this.yaw;
    E.scene.add(v);
    this.speed = 0; this.vmax = kind === 'kart' ? 4.4 : 5.6;
    this.mode = 'ride';
    this.ride = { tile: this.map.tileAt(v.position.x, v.position.z), wrongT: 0, sideT: 0, lastStop: -99, lastStopPos: [0, 0], junc: null, warned: false, onCross: -1 };
    E.cam.follow = v;
    HUD.vctlOpen({ joy: (x, y) => { this.input.x = x; this.input.y = y; }, signal: s => this.setSignal(s) });
    setLights(body, this.lightsOn);
  }
  dismount(at) {
    if (this.mode !== 'ride') return;
    const v = this.veh, x = at ? at[0] : v.position.x, z = at ? at[1] : v.position.z;
    v.remove(this.person.root);
    E.scene.remove(v); this.veh = null;
    this.person.pose = 'stand'; this.person.setHelmet(false);
    this.person.root.position.set(x, 0, z);
    E.scene.add(this.person.root);
    this.walker.place(x, z);
    this.mode = 'walk';
    E.cam.follow = this.person.root;
    HUD.vctlClose();
  }
  setSignal(s) {
    if (s === 'bell') { sfx('bell'); return; }
    this.signal = this.signal === s ? null : s; this.signalT = this.G.t;
    HUD.vctlSignal(this.signal);
    this.person.armL.rotation.z = 0; this.person.armR.rotation.z = 0;
  }

  updateRide(dt) {
    const v = this.veh, m = this.map, R = this.ride, k = this.keys;
    const fwd = (k['w'] || k['arrowup'] ? 1 : 0) - (k['s'] || k['arrowdown'] ? 1 : 0) || -this.input.y;
    const steer = (k['a'] || k['arrowleft'] ? 1 : 0) - (k['d'] || k['arrowright'] ? 1 : 0) || -this.input.x;
    if (this.G.paused || this.frozen) { this.speed = 0; }
    else if (fwd > 0.1) this.speed = Math.min(this.vmax, this.speed + 2.6 * fwd * dt);
    else if (fwd < -0.1) this.speed = this.speed > 0 ? Math.max(0, this.speed - 7 * dt) : Math.max(-1.4, this.speed - 1.5 * dt);
    else this.speed *= Math.exp(-dt * 0.9);
    if (Math.abs(this.speed) < 0.02) this.speed = 0;
    this.yaw += steer * dt * 1.9 * Math.min(1, Math.abs(this.speed) / 1.5) * Math.sign(this.speed || 1);
    const dx = Math.sin(this.yaw), dz = Math.cos(this.yaw);
    let nx = v.position.x + dx * this.speed * dt, nz = v.position.z + dz * this.speed * dt;
    // buildings and trees stop you
    const probe = m.cellAt(nx + dx * 0.8 * Math.sign(this.speed), nz + dz * 0.8 * Math.sign(this.speed));
    if (probe === CELL.BLOCK) { this.speed = 0; nx = v.position.x; nz = v.position.z; }
    // other vehicles and people
    for (const c of this.G.traffic.cars) {
      const lx = nx - c.x, lz = nz - c.z, al = lx * c.dx + lz * c.dz, la = Math.abs(lx * c.dz - lz * c.dx);
      if (Math.abs(al) < c.half + 0.7 && la < 1.4) { this.crash(); nx = v.position.x; nz = v.position.z; break; }
    }
    for (const w of this.G.npcs) if (Math.hypot(w.x - nx, w.z - nz) < 0.8 && Math.abs(this.speed) > 0.5) { this.crash(); nx = v.position.x; nz = v.position.z; break; }
    v.position.x = nx; v.position.z = nz;
    v.position.y += (heightAt(m, nx, nz) - v.position.y) * Math.min(1, dt * 10);
    v.rotation.y = this.yaw;
    v.rotation.z = -steer * Math.min(1, this.speed / 4) * 0.12 * (this.vkind === 'bike' ? 1 : 0);
    HUD.vctlSpeed(Math.abs(this.speed) * 3.6 * (this.vkind === 'kart' ? 2.2 : 3));   // toy speedometer feels faster
    // hand signal pose
    if (this.vkind !== 'kart') {
      const pa = this.person;
      pa.armL.rotation.z = this.signal === 'L' ? 1.4 : 0; pa.armR.rotation.z = this.signal === 'R' ? -1.4 : 0;   // arm out sideways
    }
    this.person.animate(dt, Math.abs(this.speed));
    if (!this.frozen) this.rideRules(dt, nx, nz, dx, dz);
  }

  crash() {
    if (Math.abs(this.speed) > 0.6) { sfx('brake'); this.offence('LANGGAR'); }
    this.speed = -0.6 * Math.sign(this.speed || 1);
  }

  rideRules(dt, x, z, dx, dz) {
    const m = this.map, R = this.ride, G = this.G;
    const cell = m.cellAt(x, z), [ti, tj] = m.tileAt(x, z), ch = m.at(ti, tj);
    const sp = Math.abs(this.speed);
    if (sp > 1 && !R.warned) {
      R.warned = true;
      if (!this.helmet) this.offence('TIADA_TOPI_KELEDAR');
      if ((E.dusk || 0) > 0.5 && !this.lightsOn) this.offence('MALAM_TANPA_LAMPU');
    }
    if (sp < 0.3) { R.lastStop = G.t; R.lastStopPos = [x, z]; }
    // keep left
    if (cell === CELL.ROAD && isRoad(ch) && isStraight(m.conn(ti, tj)) && sp > 0.8) {
      const axis = m.axis(ti, tj), [cx, cz] = m.center(ti, tj);
      const hd = axis === 'EW' ? dx : dz;
      if (Math.abs(hd) > 0.5) {
        const mv = axis === 'EW' ? [Math.sign(hd), 0] : [0, Math.sign(hd)], l = left(mv);
        const lat = (x - cx) * l[0] + (z - cz) * l[1];
        R.wrongT = lat < -0.3 ? R.wrongT + dt : 0;
        if (R.wrongT > 1.2) { this.offence('MELAWAN_ARUS'); R.wrongT = -3; }
      }
    } else if (cell !== CELL.ROAD) R.wrongT = 0;
    // pavement
    if (cell === CELL.WALK && isRoad(ch) && sp > 1) { R.sideT += dt; if (R.sideT > 1) { this.offence('KAKI_LIMA'); R.sideT = -3; } } else R.sideT = Math.min(R.sideT, 0);
    // crossings: pelican red / people on the band
    const cid = m.crossAt(x, z);
    if (cid >= 0 && cid !== R.onCross && sp > 0.3) {
      const cr = m.crossings[cid];
      if (cr.type === 'pelican' && G.sig.pelicanCar(cid) === 'R') this.offence('LANGGAR_LAMPU_MERAH');
      const busy = G.npcs.some(w => Math.hypot(w.x - cr.x, w.z - cr.z) < 4.5 && (onRoadCell(m.cellAt(w.x, w.z)) || (w.waiting && cr.type === 'zebra')));
      if (busy) this.offence('TIDAK_BERI_LALUAN');
    }
    R.onCross = cid;
    // tile transitions: junction entry / exit
    const t = [ti, tj];
    if (t[0] !== R.tile[0] || t[1] !== R.tile[1]) {
      const prev = R.tile; R.tile = t;
      const adj = Math.abs(prev[0] - t[0]) + Math.abs(prev[1] - t[1]) === 1;
      if (adj && isRoad(ch) && m.conn(ti, tj).length >= 3 && isRoad(m.at(...prev))) {
        const ent = sideBetween(t, prev), axis = DIR[ent][0] ? 'EW' : 'NS';
        if (ch === 'L' && G.sig.carLight(key(ti, tj), axis) === 'R') this.offence('LANGGAR_LAMPU_MERAH');
        if (ch === 'x') {
          const stopped = G.t - R.lastStop < 5 && Math.hypot(R.lastStopPos[0] - x, R.lastStopPos[1] - z) < 7;
          if (stopped) this.good('BERHENTI_OK'); else this.offence('TIDAK_BERHENTI');
        }
        R.junc = { tile: t, ent };
      } else if (R.junc && adj && prev[0] === R.junc.tile[0] && prev[1] === R.junc.tile[1]) {
        const ext = sideBetween(prev, t), din = DIR[OPP[R.junc.ent]];
        const turn = ext === OPP[R.junc.ent] ? 'S' : ext === sideOf(left(din)) ? 'L' : ext === sideOf(right(din)) ? 'R' : 'U';
        if (turn === 'L' || turn === 'R') {
          const sig = this.signal && G.t - this.signalT < 12 ? this.signal : null;
          if (!sig) this.offence('TIADA_ISYARAT');
          else if (sig !== turn) this.offence('ISYARAT_SALAH');
          else this.good('ISYARAT_OK');
        }
        if (this.signal) this.setSignal(this.signal);   // auto-cancel like a real indicator
        R.junc = null;
      }
    }
  }

  // ---------- struck by a car (incidents.js animates the fall and sends the ambulance) ----------
  injure() { this.walker.stop(); this.drill = null; HUD.kerbClose(); this.mode = 'injured'; this.offence('DILANGGAR'); }
  recover(x, z) {
    this.person.root.rotation.set(0, 0, 0); this.person.root.visible = true;
    this.walker.place(x, z); this.mode = 'walk'; this.injured = false;
  }

  // ---------- passenger ----------
  board(vehicleMesh) {
    this.walker.stop(); HUD.kerbClose();
    this.mode = 'passenger';
    this.person.root.visible = false;
    E.cam.follow = vehicleMesh;
  }
  alight(x, z) {
    this.person.root.visible = true;
    this.walker.place(x, z);
    this.mode = 'walk';
    E.cam.follow = this.person.root;
  }

  // ---------- frame ----------
  update(dt) {
    if (this.mode === 'walk') {
      const w = this.walker, before = this.map.cellAt(w.x, w.z);
      w.update(dt, {
        kerb: (ww, k, t) => t === 0 ? this.kerbStart(ww, k) : false,
        arrive: () => this.G.onArrive && this.G.onArrive(),
        crossed: () => this.G.onCrossed && this.G.onCrossed(),
      });
      const after = this.map.cellAt(w.x, w.z);
      if (!onRoadCell(before) && onRoadCell(after) && !w.cleared) this.checkBus();
      // standing in the middle of the road
      this.roadT = after === CELL.ROAD ? (this.roadT || 0) + dt : 0;
      if (this.roadT > 6) { this.offence('BERJALAN_DI_JALAN'); this.roadT = 0; }
      // kerb waiting: show signal status, animate looking
      const d = this.drill;
      if (w.state === 'kerb' && d) {
        d.t += dt;
        const cr = d.cross >= 0 ? this.map.crossings[d.cross] : null;
        let html;
        if (!cr) html = '⚠️ Tiada lintasan di sini. Cari lintasan zebra atau lampu isyarat.';
        else if (cr.type === 'zebra') html = '🦓 Lintasan zebra: pastikan kenderaan sudah berhenti.';
        else {
          const g = this.G.sig.pedGreen(cr.id), fl = this.G.sig.pedFlash(cr.id);
          if (!g) d.waitedRed = true;
          html = g ? (fl ? '🟢 Lampu orang <b>berkelip</b>: jangan mula melintas' : '🟢 Lampu orang <b>HIJAU</b>: boleh melintas') : (cr.type === 'pelican' && this.G.sig.pelicanCar(cr.id) === 'G' ? '🔘 Tekan butang dan tunggu' : '🔴 Lampu orang <b>MERAH</b>: tunggu');
        }
        HUD.kerbSignal(html);
        if (d.lookT > 0) {
          d.lookT -= dt;
          // facing the road, traffic nearest you comes from your RIGHT (left-hand traffic)
          const target = d.lookDir === 'R' ? -1.1 : 1.1;
          this.person.head.rotation.y += (target * Math.sin(Math.min(1, d.lookT / 0.9) * Math.PI) - this.person.head.rotation.y) * Math.min(1, dt * 12);
        } else this.person.head.rotation.y *= 0.85;
      }
    } else if (this.mode === 'ride') this.updateRide(dt);

    if (this.mk && this.mk.visible) { this.mkT -= dt; this.mk.visible = this.mkT > 0; this.mk.scale.setScalar(1 + (1.2 - this.mkT) * 0.4); }
    // plumbob: safety colour, flashes red when a car is close while you are on the road
    const p = this.pos, pb = this.plumbob;
    pb.visible = this.mode === 'walk' || this.mode === 'ride';
    pb.position.set(p.x, p.y + (this.mode === 'ride' ? 2.5 : 2.05) + Math.sin(this.G.t * 2.5) * 0.06, p.z);
    pb.rotation.y += dt * 1.8;
    const s = this.stats.safe, onRoad = onRoadCell(this.map.cellAt(p.x, p.z));
    const danger = onRoad && this.G.traffic.cars.some(c => c.v > 1.5 && Math.hypot(c.x - p.x, c.z - p.z) < 10);
    const col = danger && (this.G.t * 6 | 0) % 2 ? 0xff2a2a : s > 60 ? 0x2bff5a : s > 30 ? 0xffc21a : 0xff3b30;
    pb.material.color.setHex(col); pb.material.emissive.setHex(col).multiplyScalar(0.35);
  }

  dispose() {
    const cv = E.renderer.domElement;
    cv.removeEventListener('pointerdown', this.onDown); cv.removeEventListener('pointerup', this.onUp);
    removeEventListener('keydown', this.onKey); removeEventListener('keyup', this.onKey);
    if (this.veh) E.scene.remove(this.veh);
    if (this.mk) E.scene.remove(this.mk);
    E.scene.remove(this.plumbob);
    this.walker.remove();
    HUD.kerbClose(); HUD.vctlClose();
  }
}
