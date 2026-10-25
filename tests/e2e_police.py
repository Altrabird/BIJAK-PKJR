# Usage: python -m http.server 8765 (in the project folder), then: python tests/e2e_police.py
# Free walking: holding a direction key walks the murid straight off the kerb into the road (nothing stops them),
# that is judged as an offence, the nearest patrol unit is alerted, reaches the murid and stops them.
# Also checks the town traffic is a mix of vehicle kinds with different speeds and that patrols exist.
import time, os, json, sys
from playwright.sync_api import sync_playwright
URL = os.environ.get('BIJAK_URL', 'http://127.0.0.1:8765/index.html')
shot = sys.argv[1] if len(sys.argv) > 1 else None
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1000, 'height': 640}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('bijakpkjr.v1', JSON.stringify({murid:{nama:'Uji',jantina:'lelaki',tudung:false,skin:14263418,hair:1774608}, missions:{sekolah:1}}))")
    pg.goto(URL); pg.wait_for_selector('#menu', timeout=90000)
    pg.click('[data-m=life]'); time.sleep(1); pg.click('.mission[data-i="7"]'); time.sleep(2)
    r = json.loads(pg.evaluate("""(async () => {
      const { E } = await import('./js/engine.js');
      const G = __bijak.lifeGame(), P = G.player, m = G.map, T = G.traffic;
      const kinds = new Set(T.cars.map(c => c.kind)), speeds = T.cars.map(c => c.vmax);
      const units = G.patrol.units.map(u => u.foot ? 'foot' : u.police);
      // stand on a pavement cell next to a straight road away from crossings, facing it, camera looking along +x
      let spot = null;
      for (let j = 0; j < m.H && !spot; j++) for (let i = 0; i < m.W && !spot; i++) {
        if (m.at(i, j) !== 'r' || m.axis(i, j) !== 'EW' || m.conn(i, j).length !== 2) continue;
        const [cx, cz] = m.center(i, j);
        if (m.crossings.some(c => Math.hypot(c.x - cx, c.z - cz) < 12)) continue;
        if (m.cellAt(cx, cz - 4.2) === 0) spot = [cx, cz - 4.2];
      }
      P.walker.place(...spot);
      E.cam.yaw = E.cam.yawWant = Math.PI;   // camera north of the target looking south: "up" key = +z = toward the road
      P.keys.w = true;
      let onRoad = false;
      for (let k = 0; k < 40 && !onRoad; k++) { G.update(0.05); onRoad = m.cellAt(P.walker.x, P.walker.z) === 1; }
      P.keys.w = false;
      const offences = [...P.stats.log], chase = G.patrol.chasing();
      // walk back to the pavement and wait to be caught
      P.walker.place(...spot);
      let caught = false, t = 0;
      for (; t < 60 * 20 && !caught; t++) { G.update(0.05); caught = P.frozen; }
      return JSON.stringify({ kinds: [...kinds].length, smin: Math.min(...speeds), smax: Math.max(...speeds), units, onRoad, offences, alerted: !!chase, by: chase && (chase.u.foot ? 'foot' : chase.u.police), caught, secs: t * 0.05 });
    })()"""))
    print(r)
    if shot: time.sleep(1); pg.screenshot(path=shot)
    ok = r['onRoad'] and 'TIADA_KERB_DRILL' in r['offences'] and r['alerted'] and r['caught'] and r['smax'] - r['smin'] > 4 and len(r['units']) >= 6
    print('page errors:', errs)
    print('RESULT', 'PASS' if ok and not errs else 'FAIL')
    b.close()
