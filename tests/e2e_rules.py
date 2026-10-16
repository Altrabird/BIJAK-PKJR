# Usage: python -m http.server 8765 (in the project folder), then: python tests/e2e_rules.py
# Checks that offences are actually detected: jaywalking, skipped kerb drill, riding against traffic, red light.
import time, os, json
from playwright.sync_api import sync_playwright
URL = os.environ.get('BIJAK_URL', 'http://127.0.0.1:8765/index.html')
G = "__bijak.lifeGame()"
def log(pg): return pg.evaluate(f"{G}.player.stats.log")
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('bijakpkjr.v1', JSON.stringify({murid:{nama:'Uji',jantina:'lelaki',tudung:false,skin:14263418,hair:1774608}, missions:{sekolah:1}}))")
    pg.goto(URL); pg.wait_for_selector('#menu', timeout=60000)
    pg.click('[data-m=life]'); time.sleep(0.5)
    pg.click('.mission[data-i="7"]'); time.sleep(2)
    ok = True
    # 1) jaywalk across row 14 at x of tile (4,14) - crossings exist nearby; skip the kerb drill
    pg.evaluate(f"(() => {{ const G = {G}; G.traffic.clear(); const [x, z] = G.map.center(4, 13); G.player.walker.place(x, z + 3.5); const [x2, z2] = G.map.center(4, 15); G.player.walkTo(x2, z2); }})()")
    for _ in range(30):
        time.sleep(0.3)
        if pg.query_selector('.kerb'): break
    pg.keyboard.press('Space'); time.sleep(4)
    l = log(pg); print('walk offences:', l)
    ok &= 'TIADA_KERB_DRILL' in l and 'LINTAS_BUKAN_TEMPAT' in l
    # 2) ride east in the WRONG (south) lane of row 14
    pg.evaluate(f"(() => {{ const G = {G}; const P = G.player; P.helmet = true; const [x, z] = G.map.center(2, 14); P.walker.place(x, z); P.mount('bike', {{ at: [x, z + 1.75], yaw: Math.PI / 2 }}); }})()")
    pg.keyboard.down('w')
    for _ in range(40):   # until detected: slow software GL stretches game time
        time.sleep(0.2)
        if 'MELAWAN_ARUS' in log(pg): break
    pg.keyboard.up('w'); time.sleep(0.5)
    l = log(pg); print('ride offences:', l)
    ok &= 'MELAWAN_ARUS' in l
    # 3) ride north through the L junction (7,8) on red: force EW green so NS is red
    pg.evaluate(f"(() => {{ const G = {G}; const P = G.player; G.sig.t['7,8'] = 18; const [x, z] = G.map.center(7, 9); P.veh.position.set(x - 1.75, 0, z + 2); P.yaw = Math.PI; P.speed = 0; P.ride.tile = [7, 9]; }})()")
    # hold W until the offence shows up (game time is capped per frame, so slow software GL needs longer)
    pg.keyboard.down('w')
    for _ in range(40):
        time.sleep(0.2)
        if 'LANGGAR_LAMPU_MERAH' in log(pg): break
    pg.keyboard.up('w'); time.sleep(0.5)
    l = log(pg); print('junction offences:', l)
    ok &= 'LANGGAR_LAMPU_MERAH' in l
    print('page errors:', errs)
    print('RESULT', 'PASS' if ok and not errs else 'FAIL')
    b.close()
