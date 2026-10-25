# Usage: python -m http.server 8765 (in the project folder), then: python tests/e2e_anugerah.py
# Anugerah Murid Patuh Peraturan Jalan Raya: with 6 of 7 missions at 90%+ the menu shows 6/7 and no sijil;
# finishing the last mission safely awards it (award card -> sijil with the murid name) and saves the date.
# Screenshots go to tests/shots/.
import time, os, json, sys
sys.stdout.reconfigure(encoding="utf-8")   # the award text has emoji; Windows consoles default to cp1252
from playwright.sync_api import sync_playwright
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots'); os.makedirs(OUT, exist_ok=True)
URL = os.environ.get('BIJAK_URL', 'http://127.0.0.1:8765/index.html')
save = {'murid': {'nama': 'Aisyah', 'jantina': 'perempuan', 'tudung': True, 'skin': 14263418, 'hair': 1774608},
        'missions': {'sekolah': 2, 'kedai': 3, 'bas': 3, 'kereta': 3, 'motor': 3, 'basikal': 3, 'senja': 3},
        'score': {'sekolah': 75, 'kedai': 100, 'bas': 95, 'kereta': 100, 'motor': 92, 'basikal': 90, 'senja': 98}}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1100, 'height': 760}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(f"localStorage.setItem('bijakpkjr.v1', {json.dumps(json.dumps(save))})")
    pg.goto(URL); pg.wait_for_selector('#menu', timeout=90000)
    pg.click('[data-m=life]'); time.sleep(1)
    before = pg.inner_text('#mp-award'); no_btn = pg.query_selector('#mp-sijil') is None
    pg.screenshot(path=os.path.join(OUT, 'an_menu.png'))
    # mission 1 again, done safely: stand on the goal so it finishes with 100%
    pg.click('.mission[data-i="0"]'); time.sleep(2.5)
    pg.evaluate("(() => { const G = __bijak.lifeGame(); G.player.walker.place(G.goal.x, G.goal.z); })()")
    pg.wait_for_selector('.card h2:has-text("Tahniah")', timeout=60000)
    pg.screenshot(path=os.path.join(OUT, 'an_award.png'))
    pg.click('.card button.green'); pg.wait_for_selector('.sijil', timeout=5000)
    sijil = pg.inner_text('.sijil'); pg.screenshot(path=os.path.join(OUT, 'an_sijil.png'))
    stored = pg.evaluate("JSON.parse(localStorage.getItem('bijakpkjr.v1'))")
    print({'before': before, 'no_btn': no_btn, 'sijil': sijil[:160], 'score': stored['score']['sekolah'], 'anugerah': stored['anugerah']})
    ok = '6/7' in before and no_btn and 'MURID PATUH PERATURAN JALAN RAYA' in sijil and 'Aisyah' in sijil and stored['score']['sekolah'] >= 90 and stored['anugerah']
    print('page errors:', errs)
    print('RESULT', 'PASS' if ok and not errs else 'FAIL')
    b.close()
