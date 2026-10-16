# Usage: python -m http.server 8765 (in the project folder), then: python tests/e2e_missions.py [args]
# Generic mission bot: picks the safe answer on choice cards, does kerb drills, walks to the goal, boards the bus,
# and for the bike mission rides a bit with the keyboard then hops near the goal.
import sys, time, os
from playwright.sync_api import sync_playwright
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots'); os.makedirs(OUT, exist_ok=True)
URL = os.environ.get('BIJAK_URL', 'http://127.0.0.1:8765/index.html')
mission = int(sys.argv[1]) if len(sys.argv) > 1 else 0
JS_STATE = """(() => { const G = __bijak.lifeGame(); if (!G) return null; const P = G.player, w = P.walker;
 return {mode: P.mode, state: w.state, x: P.pos.x, z: P.pos.z, safe: P.stats.safe, saman: P.stats.saman, log: P.stats.log,
 goal: G.goal ? [G.goal.x, G.goal.z] : null, choice: !!document.querySelector('.choice'), go: !!document.querySelector('#c-go'),
 kerb: !!document.querySelector('.kerb'), done: !!document.querySelector('.big-stars'), fail: (document.querySelector('.card h2')||{}).textContent,
 bus: G.bus ? {v: G.bus.v, tile: G.bus.tile} : null, paused: G.paused}; })()"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    logs = []
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error','warning') and '404' not in m.text else None)
    pg.add_init_script("localStorage.setItem('bijakpkjr.v1', JSON.stringify({murid:{nama:'Adam',jantina:'lelaki',tudung:false,skin:14263418,hair:1774608}, missions:{sekolah:1,kedai:1,bas:1,kereta:1,motor:1,basikal:1}}))")
    pg.goto(URL)
    pg.wait_for_selector('#menu', timeout=60000)
    pg.click('[data-m=life]'); time.sleep(0.5)
    pg.click(f'.mission[data-i="{mission}"]'); time.sleep(2.5)
    pg.screenshot(path=os.path.join(OUT, f'm{mission}_0.png'))
    lastgoal = None; n = 0; rode = 0; shots = 1
    for k in range(400):
        time.sleep(0.5)
        st = pg.evaluate(JS_STATE)
        if st is None: print('no game'); break
        if st['done']: pg.screenshot(path=os.path.join(OUT, f'm{mission}_end.png')); print('DONE', st); break
        if st['fail'] and 'Misi belum' in st['fail']: print('FAIL', st); break
        if st['choice'] and not st['go']:
            if shots < 4: pg.screenshot(path=os.path.join(OUT, f'm{mission}_{shots}.png')); shots += 1
            pg.click('.choice[data-ok]'); time.sleep(0.4)
            pg.click('#c-go'); continue
        if st['kerb']:
            for a in ['ArrowRight', 'ArrowLeft', 'ArrowRight']: pg.keyboard.press(a); time.sleep(0.2)
            for w in range(80):
                ok = pg.evaluate("(() => { const G = __bijak.lifeGame(); const w = G.player.walker; const c = w.kerb ? w.kerb.cross : -1; if (c >= 0) { const cr = G.map.crossings[c]; if (cr.type === 'pelican') G.sig.press(c); if (cr.type !== 'zebra') return G.sig.pedGreen(c) && !G.sig.pedFlash(c); } const bus = G.bus; if (bus && !bus.gone) return false; return !G.traffic.cars.some(k => k.v > 1 && Math.hypot(k.x - w.x, k.z - w.z) < 14); })()")
                if ok: break
                time.sleep(0.5)
            pg.keyboard.press('Space'); continue
        if st['bus'] and st['mode'] == 'walk' and st['bus']['v'] < 0.05 and st['bus']['tile'] == [1, 13]:
            pg.evaluate("(() => { const G = __bijak.lifeGame(); G.onPick && G.onPick(G.bus.mesh); })()")
        if st['mode'] == 'ride':
            if rode < 12:
                pg.keyboard.down('w'); time.sleep(1.0); pg.keyboard.up('w'); rode += 1
                if rode == 3: pg.screenshot(path=os.path.join(OUT, f'm{mission}_ride.png'))
            else:
                pg.evaluate("(() => { const G = __bijak.lifeGame(); const v = G.player.veh; v.position.x = G.goal.x - 3; v.position.z = G.goal.z; })()")
            continue
        if st['mode'] == 'walk' and st['goal'] and st['state'] == 'idle':
            pg.evaluate("(() => { const G = __bijak.lifeGame(); G.player.walkTo(G.goal.x, G.goal.z); })()")
        if st['mode'] == 'passenger' and n % 10 == 0:
            pg.screenshot(path=os.path.join(OUT, f'm{mission}_pass.png'))
        n += 1
    print('final', st)
    print('\n'.join(logs)[:2500])
    b.close()
