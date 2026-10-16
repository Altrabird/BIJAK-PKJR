# BIJAK PKJR

A 3D browser game for **Pendidikan Keselamatan Jalan Raya (PKJR)** for Malaysian primary pupils. It plays like *The Sims*: you live in a neighbourhood and make safe choices on the road.
It is a tribute to the old **Pertandingan Lalu Lintas Shell** (Shell Traffic Games, Sarawak 1963–2015, revived as Sarawak Traffic Games).

**Play:** https://altrabird.github.io/BIJAK-PKJR/

## Modes
| Mode | What you do |
|---|---|
| 🏡 **Taman Bijak** | 7 daily missions plus free roam: walk to school, go to the shop, ride the school bus, ride in Ayah's car, ride pillion on a motorcycle, cycle to the park, walk at dusk. Needs bars (Keselamatan, Mata Bijak, Saman), a safety diamond above your head, and 1–3 stars per mission. |
| 🏆 **Piala Lalu Lintas** | A traffic garden with 4 stations, matching the real award categories: Pejalan Kaki, Penunggang Basikal, Pemandu Kereta Pedal and Kuiz. There are 3 levels (Sekolah → Daerah → Negeri). Play alone, or as a team of 4 taking turns on one PC. Ends with a printable sijil. |
| 🛠️ **Mod Bina** | Paint your own map (roads, traffic lights, BERHENTI junctions, zebra and pelican crossings, schools, bus stops…), test-play it with traffic, and share it as a link. |

## What it teaches
Left-hand traffic, the kerb drill (**kanan–kiri–kanan**), the green/red man, pelican buttons, zebra crossings, BERHENTI signs, hand signals, helmets, seat belts and back seats, getting out on the kerb side, waiting behind the yellow line, and not crossing in front of a stopped bus.
Every offence is listed in `js/rules.js`. The same list drives the saman slip, the polis voice, the mission report and the competition marks.

The town is alive: drivers stop behind the line before zebras and junctions and keep crossings clear, careless drivers
run red lights and are chased, pulled over and fined by a police car, and a car that hits someone knocks them down and an
ambulance comes to take them away. If it is you, the mission ends with an explanation.

## Controls
- **Walk:** click or tap the ground; 🏃 or hold Shift to run. At every kerb the game stops you for the kerb drill: ← kiri, → kanan, Space lintas, B pelican button. Clicking across the road again also crosses (skipping the drill still earns a saman).
- **Ride:** W/A/S/D or the on-screen joystick. Z / C give left / right signals, H rings the bell.
- **Camera:** hold right-click and drag (or two fingers) to look all the way round and tilt, mouse wheel or pinch to zoom, Q/E to turn 45°.
- **Map:** the GTA-style minimap (bottom left) turns with the camera and pins the mission destination; M or a click opens the full map.
- **Settings:** Tahap 1 shows hints during the kerb drill. *Ringan* graphics mode suits older lab PCs.

## Tech
Static site with no build step: `index.html` plus ES modules in `js/`, and Three.js 0.160 vendored in `vendor/`.
- The buildings, cars and trees are CC0 models from Poly Pizza (Kenney, Quaternius, Kay Lousberg) in `assets/models/`.
- People are realistic CC0 humans made with MakeHuman/MPFB in Blender (`tools/build_people.py`), with walk/run/idle
  clips baked from Quaternius. The game tints their clothes into uniforms. UI icons are Fluent Emoji 3D (MIT).
- The bicycle, kart, scooter and school bus are CC-BY 3.0 models from Poly Pizza (credited in `assets/CREDITS.md`).
- The school, surau, signs and traffic lights are built in code.
- Voices are pre-rendered Malaysian Malay (`ms-MY` Yasmin / Osman). To add new lines, run `node tools/make_voice.mjs`.
- Progress is saved in the browser's `localStorage` only. There is no server.

## Tests
```bash
npm test
```
`npm test` runs the pure-logic tests (map, lanes, A*, share codes, rules and quiz data).

For the end-to-end runs (Playwright with Chromium), serve the folder with `python -m http.server 8765`, then run:

```bash
python tests/e2e_missions.py 0
```
```bash
python tests/e2e_piala.py
```
```bash
python tests/e2e_bina.py
```

`e2e_missions.py` takes a mission number from 0 to 6. Screenshots go to `tests/shots/`.

## Credits
See [assets/CREDITS.md](assets/CREDITS.md).
