# Usage: python -m http.server 8765 (in the project folder), then: python tests/e2e_traffic.py
# Runs two minutes of town traffic at fixed steps and checks that stopped cars keep crossings clear and nobody
# walks through them (they used to stop with the front half on the zebra), then checks a careless driver hitting someone brings an ambulance.
import time, os, json
from playwright.sync_api import sync_playwright
URL = os.environ.get('BIJAK_URL', 'http://127.0.0.1:8765/index.html')
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 640, 'height': 400}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('bijakpkjr.v1', JSON.stringify({murid:{nama:'Uji',jantina:'lelaki',tudung:false,skin:14263418,hair:1774608}, missions:{sekolah:1}}))")
    pg.goto(URL); pg.wait_for_selector('#menu', timeout=90000)
    pg.click('[data-m=life]'); time.sleep(1); pg.click('.mission[data-i="7"]'); time.sleep(2)
    r = json.loads(pg.evaluate("""(async () => {
      const { polyAt } = await import('./js/map.js');
      const G = __bijak.lifeGame(), T = G.traffic, m = G.map;
      let stopped = 0, onBand = 0, through = 0;
      for (let k = 0; k < 2400; k++) {
        G.update(0.05);
        for (const c of T.cars) {
          if (c.v > 0.05 || c.hold > 0) continue;
          stopped++;
          let on = false;
          for (let d = -c.half + 0.3; d <= c.half - 0.3; d += 0.5) if (m.crossAt(c.x + c.dx * d, c.z + c.dz * d) >= 0) { on = true; break; }
          if (!on) continue;
          onBand++;
          // someone walking inside the stopped car's outline: what players saw as people walking through cars
          if (G.npcs.some(w => { if (w.injured || w.state !== 'walk') return false; const lx = w.x - c.x, lz = w.z - c.z; return Math.abs(lx * c.dx + lz * c.dz) < c.half + 0.2 && Math.abs(lx * c.dz - lz * c.dx) < 1.0; })) through++;
        }
      }
      // a careless driver with someone standing 5 m ahead in its lane, on the clearest stretch of road
      const clear = k => k.len - k.s > 6 && !T.cars.some(o => o !== k && Math.hypot(o.x - k.x, o.z - k.z) < 15);
      const c = T.cars.filter(k => !k.temp && clear(k)).sort((a, b) => T.controlGap(b, 0) - T.controlGap(a, 0))[0];
      Object.assign(c, { bad: true, v: 7.5, vmax: 8.5 });
      const pt = polyAt(c.path, c.s + 5), w = G.npcs[0]; w.place(pt.x, pt.z); w.rest = 999;
      let hit = false, picked = false;
      for (let k = 0; k < 1600 && !picked; k++) { G.update(0.05); hit = hit || !!w.injured; picked = hit && !G.incidents.patients.length; }
      return JSON.stringify({ stopped, onBand, through, hit, picked });
    })()"""))
    print(r)
    # before the fix 26-36% of stopped-car samples stood on a crossing and people walked through them.
    # Some waiting is realistic (a turning car inside the junction behind people on their green man),
    # so allow a little of that, but people walking through a stopped car for at most 2 s (40 samples).
    ok = r['stopped'] > 100 and r['onBand'] <= r['stopped'] * 0.10 and r['through'] <= 40 and r['hit'] and r['picked']
    print('page errors:', errs)
    print('RESULT', 'PASS' if ok and not errs else 'FAIL')
    b.close()
