// Path-following pedestrian used by both the player and NPCs. Stops at every kerb and asks `hooks.kerb`.
import { findPath, CELL, isRoad } from './map.js';
import { E } from './engine.js';
import { Y_ROAD, Y_WALK, Y_GRASS } from './world.js';

export function heightAt(map, x, z) {
  const c = map.cellAt(x, z);
  if (c === CELL.ROAD || c === CELL.CROSS) return Y_ROAD;
  const [i, j] = map.tileAt(x, z), ch = map.at(i, j);
  if (ch === 'q') return Y_ROAD;
  return isRoad(ch) ? Y_WALK : Y_GRASS;
}
export const onRoadCell = c => c === CELL.ROAD || c === CELL.CROSS;

export class Walker {
  constructor(map, person, x, z, speed = 1.6) {
    Object.assign(this, { map, person, x, z, speed, path: null, idx: 0, state: 'idle', cleared: false, waiting: false, v: 0, yaw: 0, kerb: null });
    this.root = person.root;
    this.root.position.set(x, heightAt(map, x, z), z);
    E.scene.add(this.root);
  }

  goTo(x, z) {
    const p = findPath(this.map, [this.x, this.z], [x, z]);
    if (!p || p.length < 2) return false;
    this.path = p; this.idx = 1; this.state = 'walk'; this.waiting = false; this.kerb = null;
    return true;
  }
  stop() { this.path = null; this.state = 'idle'; this.waiting = false; this.kerb = null; }
  // player confirmed crossing at the kerb
  proceed() { if (this.state === 'kerb') { this.cleared = true; this.state = 'walk'; this.waiting = false; } }
  place(x, z) { this.x = x; this.z = z; this.stop(); this.root.position.set(x, heightAt(this.map, x, z), z); }

  update(dt, hooks = {}) {
    const m = this.map;
    let moving = false;
    const here = m.cellAt(this.x, this.z), onRoad = onRoadCell(here);
    if (!onRoad && this.cleared && this.wasOnRoad) { this.cleared = false; hooks.crossed && hooks.crossed(this); }
    this.wasOnRoad = onRoad;

    if (this.state === 'kerb') {
      // NPCs re-check every frame; the player waits for proceed()
      if (hooks.kerb && hooks.kerb(this, this.kerb, dt)) this.proceed();
    }
    if (this.state === 'walk' && this.path) {
      const tg = this.path[this.idx];
      const nextRoad = tg[2] === CELL.ROAD || tg[2] === CELL.CROSS;
      if (!onRoad && nextRoad && !this.cleared) {
        this.state = 'kerb'; this.waiting = true;
        this.kerb = { cross: m.crossAt(tg[0], tg[1]), dir: [tg[0] - this.x, tg[1] - this.z], t: 0 };
        this.yaw = Math.atan2(this.kerb.dir[0], this.kerb.dir[1]);
        if (hooks.kerb && hooks.kerb(this, this.kerb, 0)) this.proceed();
      } else {
        const dx = tg[0] - this.x, dz = tg[1] - this.z, d = Math.hypot(dx, dz), step = this.speed * dt;
        if (d <= step) {
          this.x = tg[0]; this.z = tg[1]; this.idx++;
          if (this.idx >= this.path.length) { this.stop(); hooks.arrive && hooks.arrive(this); }
        } else {
          this.x += dx / d * step; this.z += dz / d * step; moving = true;
          this.yaw = Math.atan2(dx, dz);
        }
      }
    }
    if (this.state === 'kerb') this.kerb.t += dt;
    this.v = moving ? this.speed : 0;
    const r = this.root;
    r.position.x = this.x; r.position.z = this.z;
    r.position.y += (heightAt(m, this.x, this.z) - r.position.y) * Math.min(1, dt * 12);
    let dy = this.yaw - r.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    r.rotation.y += dy * Math.min(1, dt * 10);
    this.person.animate(dt, this.v);
  }

  remove() { E.scene.remove(this.root); }
}
