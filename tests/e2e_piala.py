# Usage: python -m http.server 8765 (in the project folder), then: python tests/e2e_piala.py [args]
# Bot for Piala Lalu Lintas: walk station by clicking gates (with kerb drill), bike/kart by teleporting through gates, quiz by answering.
import sys, time, os
from playwright.sync_api import sync_playwright
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots'); os.makedirs(OUT, exist_ok=True)
URL = os.environ.get('BIJAK_URL', 'http://127.0.0.1:8765/index.html')
team = len(sys.argv) > 1 and sys.argv[1] == 'team'
G = "__bijak.current() && __bijak.current().game && __bijak.current().game()"
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    logs = []
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type == 'error' and '404' not in m.text else None)
    pg.add_init_script("localStorage.setItem('bijakpkjr.v1', JSON.stringify({murid:{nama:'Adam',jantina:'lelaki',tudung:false,skin:14263418,hair:1774608}}))")
    pg.goto(URL)
    pg.wait_for_selector('#menu', timeout=60000)
    pg.click('[data-m=piala]'); time.sleep(1)
    if team: pg.click('#pl-m button[data-v=team]'); time.sleep(0.3)
    pg.screenshot(path=os.path.join(OUT, 'pl_setup.png'))
    pg.click('#pl-go'); time.sleep(0.8)
    for station in range(4):
        pg.screenshot(path=os.path.join(OUT, f'pl_brief{station}.png'))
        pg.click('.btn.green'); time.sleep(4.5)
        if station == 3:
            for q in range(10):
                if q == 0: pg.screenshot(path=os.path.join(OUT, 'pl_quiz.png'))
                pg.click('.choice[data-ok]' if q % 4 else '.choice:not([data-ok])'); time.sleep(0.3); pg.click('#qz-n'); time.sleep(0.3)
        else:
            pg.screenshot(path=os.path.join(OUT, f'pl_s{station}.png'))
            for k in range(600):
                time.sleep(0.4)
                if pg.query_selector('.card h2') and 'markah' in (pg.inner_text('.card h2') or ''): break
                st = pg.evaluate(f"(() => {{ const G = {G}; if (!G || !G.gates) return null; const P = G.player; const n = G.gates.findIndex(g => g.visible); return {{ mode: P.mode, state: P.walker.state, n, kerb: !!document.querySelector('.kerb') }}; }})()")
                if not st: continue
                if station == 0:
                    if st['kerb']:
                        for a in ['ArrowRight','ArrowLeft','ArrowRight']: pg.keyboard.press(a); time.sleep(0.2)
                        for w in range(160):   # slow software GL stretches the light cycle in real time
                            ok = pg.evaluate(f"(() => {{ const G = {G}; const w = G.player.walker; const c = w.kerb ? w.kerb.cross : -1; if (c >= 0) {{ const cr = G.map.crossings[c]; if (cr.type === 'pelican') G.sig.press(c); if (cr.type !== 'zebra') return G.sig.pedGreen(c) && !G.sig.pedFlash(c); }} return !G.traffic.cars.some(k => k.v > 0.5 && Math.hypot(k.x - w.x, k.z - w.z) < 10); }})()")
                            if ok: break
                            time.sleep(0.4)
                        pg.keyboard.press('Space')
                    elif st['state'] == 'idle' and st['n'] >= 0:
                        pg.evaluate(f"(() => {{ const G = {G}; const g = G.gates[G.gates.findIndex(g => g.visible)]; G.player.walkTo(g.position.x, g.position.z); }})()")
                else:
                    # hop the vehicle through the next gate (rules are not the point of this smoke test)
                    if st['n'] >= 0:
                        pg.evaluate(f"(() => {{ const G = {G}; const g = G.gates[G.gates.findIndex(g => g.visible)]; const v = G.player.veh; v.position.x = g.position.x; v.position.z = g.position.z; G.player.ride.tile = G.map.tileAt(v.position.x, v.position.z); }})()")
                        time.sleep(0.3)
                    elif G and station == 2:
                        pg.evaluate(f"(() => {{ const G = {G}; const v = G.player.veh; v.position.x = G.bay.x; v.position.z = G.bay.z; G.player.yaw = G.bay.yaw; G.player.speed = 0; }})()")
        time.sleep(1)
        pg.screenshot(path=os.path.join(OUT, f'pl_res{station}.png'))
        print('station', station, pg.inner_text('.card h2'))
        pg.click('.btn.green'); time.sleep(1)
    time.sleep(1)
    pg.screenshot(path=os.path.join(OUT, 'pl_final.png'))
    print('final:', pg.inner_text('.card')[:400])
    pg.click('.btn.green'); time.sleep(1)
    pg.screenshot(path=os.path.join(OUT, 'pl_sijil.png'))
    print('\n'.join(logs)[:2000])
    b.close()
