# Usage: python -m http.server 8765 (in the project folder), then: python tests/e2e_bina.py [args]
import time, os
from playwright.sync_api import sync_playwright
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots'); os.makedirs(OUT, exist_ok=True)
URL = os.environ.get('BIJAK_URL', 'http://127.0.0.1:8765/index.html')
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}, permissions=['clipboard-read', 'clipboard-write'])
    pg = ctx.new_page()
    logs = []
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type == 'error' and '404' not in m.text else None)
    pg.goto(URL)
    pg.wait_for_selector('#menu', timeout=60000)
    pg.click('[data-m=bina]'); time.sleep(2)
    pg.screenshot(path=os.path.join(OUT, 'bn_0.png'))
    # paint a cross road through the middle and a zebra, a school and houses
    pg.click('.pal [data-t=r]')
    pg.mouse.move(640, 200); pg.mouse.down(); 
    for y in range(200, 560, 20): pg.mouse.move(640, y)
    pg.mouse.up()
    pg.click('.pal [data-t=z]'); pg.mouse.click(640, 300)
    pg.click('.pal [data-t=S]'); pg.mouse.click(720, 300); pg.mouse.click(720, 340)
    pg.click('.pal [data-t=H]'); pg.mouse.click(560, 400); pg.mouse.click(560, 460)
    pg.click('.pal [data-t=T]'); pg.mouse.click(520, 300)
    time.sleep(1)
    pg.screenshot(path=os.path.join(OUT, 'bn_1.png'))
    pg.click('[data-b=share]'); time.sleep(0.8)
    url = pg.input_value('.card input')
    print('share url length', len(url), url[:90])
    pg.click('.card .btn.green'); time.sleep(0.3)
    pg.click('[data-b=test]'); time.sleep(4)
    pg.screenshot(path=os.path.join(OUT, 'bn_test.png'))
    pg.click('[data-b=back]'); time.sleep(1)
    # open shared link fresh
    pg2 = ctx.new_page(); pg2.on('pageerror', lambda e: logs.append(f'PAGEERROR2: {e}'))
    pg2.goto(url); time.sleep(6)
    pg2.screenshot(path=os.path.join(OUT, 'bn_shared.png'))
    print('\n'.join(logs)[:2000])
    b.close()
