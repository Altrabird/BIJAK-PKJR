# BIJAK PKJR — Pelan Pembinaan (Build Plan v0)

A browser 3D game (Three.js) for Pendidikan Keselamatan Jalan Raya. You play in a Sims-style neighbourhood
and at a traffic garden competition that pays homage to the old **Pertandingan Lalu Lintas Shell**.

---

## 1. References

| Source | What we take from it |
|---|---|
| **Shell Traffic Games** (Sarawak, 1963–2015, Shell + state govt), revived 2024 as **Sarawak Traffic Games** | Held at a **Taman Lalu Lintas** (traffic garden). Individual awards: **Pejalan Kaki Terbaik, Penunggang Basikal Terbaik, Pemandu Kereta Pedal Terbaik, Kuiz**, plus a team award. Levels go sekolah → bahagian/daerah → negeri. Traffic police are on site and **issue a saman on the spot** for offences. |
| **Shell Road Safety (Jakarta)** | Pupils in Tahun 4–6 rotate through **5 posts** in a simulated traffic town. |
| **PKJR (JKJR + KPM)** | Topics: pejalan kaki, penunggang basikal, perabot jalan, papan tanda, lampu isyarat, penumpang (tali pinggang, topi keledar), bas sekolah. Kerb drill: **Berhenti – Lihat Kanan, Kiri, Kanan – Dengar – Lintas**. |
| **The Sims** (design language only) | Isometric 3D camera, click-to-move, **needs bars**, an indicator above the head, daily routines, Build/Buy mode, thought bubbles. |

> **About REA:** I won't use REA to pull code or assets out of someone else's game. The code and art are
> copyrighted and it isn't needed. Game *mechanics* aren't copyrighted, so we copy the Sims *feel* and
> make all art and code ourselves. REA stays useful for debugging **our own** web build later.

---

## 2. Core loop (three modes)

### A. Mod Kehidupan — "Taman Bijak" (Sims-like)
- An isometric neighbourhood: rumah, sekolah, kedai runcit, masjid/surau, taman permainan, perhentian bas, balai polis.
- The player is a **murid** with a custom look (Create-a-Murid: name, uniform, kulit, rambut/tudung).
- **Daily missions** (one in-game day each), e.g.:
  1. Jalan kaki ke sekolah: lintasan zebra, kerb drill
  2. Naik bas sekolah: tunggu di belakang garisan, turun ikut pintu, jangan lintas di depan bas
  3. Kayuh basikal ke kedai: lorong kiri, isyarat tangan, topi keledar, lampu malam
  4. Naik kereta ibu bapa: tali pinggang, kerusi kanak-kanak, keluar ikut sisi kaki lima
  5. Membonceng motosikal: topi keledar diikat, duduk tegak
  6. Lintasan pelikan / jejantas / pengawas lalu lintas sekolah
  7. Hujan dan senja: pakaian terang, elak lopak
- **Needs bars** (the Sims "needs", adapted):
  - 🛡️ **Keselamatan**: drops on risky moves and refills on safe ones
  - ⭐ **Mata Bijak**: XP that unlocks new areas, clothes and vehicles
  - 🚨 **Saman**: demerit points. Three in a day = "Hari Tidak Selamat" replay
- **Indicator above the head** (our "plumbob"): a green/amber/red diamond showing live danger level.
- **Thought bubbles** show icons ("Lampu merah!", "Kereta datang dari kanan").

### B. Mod Pertandingan — "Piala Lalu Lintas" (Shell Traffic Games homage)
- A **traffic garden** with miniature roads, a roundabout, lights, zebra crossings and a level crossing.
- **4 stations** that match the real award categories:
  1. **Pejalan Kaki**: a timed route on foot; judged on kerb drill, crossings and pavement use
  2. **Penunggang Basikal**: hand signals, lane position, stopping at the Berhenti sign, roundabout
  3. **Pemandu Kereta Pedal**: signals, giving way, speed, parking in the box
  4. **Kuiz**: papan tanda, situational "apa patut buat?" questions, 10 per round
- The **Polis Trafik** NPC follows you and issues a **saman slip** (animated paper) on each offence, with the rule explained in BM.
- **Score sheet** like a real judge's: per-station score, time bonus and penalties, then a medal and printable **sijil** (PDF/print).
- **Team mode (hot-seat):** a 4-pupil school team rotates through the stations, giving a team total. This works in a PC lab without a server.
- **Progression:** Peringkat Sekolah → Daerah → Negeri, with harder traffic, AI drivers that break rules and night/rain rounds.

### C. Mod Bina — "Bina Taman Lalu Lintas" (Sims Build mode; later phase)
- A grid editor. Place jalan, simpang, bulatan, zebra, lampu isyarat, papan tanda, jejantas, perhentian bas.
- A teacher builds a scenario and **shares it as a code/URL**, and pupils play it.

---

## 3. Rule engine (the core of the game)
Every offence is **data**, not hard-coded logic: `rules.json` → `{ id, when, message_bm, message_en, pkjr_topic, penalty }`.

Examples of checks, run every frame against the player state:
- Crossing the road more than 30 m from a zebra/pelican when one exists → `LINTAS_BUKAN_TEMPAT`
- Stepping off the kerb without the kerb drill (camera look R-L-R detected) → `TIADA_KERB_DRILL`
- Entering a junction on red → `LANGGAR_LAMPU_MERAH`
- Cycling on the right side (**Malaysia drives on the LEFT**) → `MELAWAN_ARUS`
- No helmet / seatbelt when the vehicle starts → `TIADA_TOPI_KELEDAR` / `TIADA_TALI_PINGGANG`
- Walking in front of a stopped school bus → `LINTAS_DEPAN_BAS`

The same table feeds the saman slip, the quiz bank and the end-of-day report, so one list of rules teaches everything.

---

## 4. Tech stack (fits your other GitHub Pages projects)

| Layer | Choice | Why |
|---|---|---|
| Rendering | **Three.js** (pinned version, ES modules via importmap/CDN) | No build step, deploy straight to GitHub Pages |
| Code | Vanilla JS modules: `world/`, `traffic/`, `rules/`, `ui/`, `modes/` | Matches your other static apps |
| Assets | **Procedural low-poly in code** (roads, signs, buildings) + **headless Blender script → GLB** for hero models (murid, polis, kereta pedal, bas sekolah) | Same pipeline as Masak Bah / Threejs assets; 100% our own art |
| Signs | Drawn on canvas → texture (JPJ shapes: red-circle prohibition, blue mandatory, yellow-diamond warning, Berhenti octagon) | Crisp, editable, no image licensing |
| Traffic AI | Lane graph + waypoints; cars obey lights/zebra; some "bad drivers" at higher levels | Teaches caution: a zebra doesn't guarantee cars stop |
| Camera | Sims-style isometric orbit (fixed pitch, rotate 90° steps, zoom) + follow mode | |
| Input | Click/tap-to-move (pathfinding on a walk grid) + WASD/joystick for basikal/kereta pedal | Works on lab PCs and tablets |
| Audio | **ms-MY voice only** (edge-tts Yasmin/Osman, pre-rendered mp3) for polis, cikgu and narrator; synth SFX; optional ACE-Step theme song | Your Malaysian-accent rule |
| Save | localStorage (progress, sijil history) | Offline, no backend |
| Later | GAS leaderboard per school (optional), PWA offline install | Same as your other apps |

Performance budget: 60 fps on a school lab PC with integrated GPU → instanced meshes, baked-look lighting, one shadow light, ≤150 draw calls.

---

## 5. Milestones

| # | Milestone | Done means |
|---|---|---|
| **M0** | **Vertical slice** (build first) | One street block, a murid with click-to-move, a zebra crossing + traffic light, AI cars, kerb drill check, saman slip popup, Keselamatan bar. Playable in the browser. |
| M1 | Taman Bijak | Full neighbourhood, Create-a-Murid, 6–7 daily missions, needs bars, day report, save |
| M2 | Piala Lalu Lintas | Traffic garden, 4 stations, Polis Trafik judge, score sheet, sijil, hot-seat team mode, 3 levels |
| M3 | Mod Bina | Grid editor + share-by-code scenarios |
| M4 | Polish & ship | Blender hero models, BM voice-over, music, mobile touch, PWA, GitHub Pages, Playwright smoke tests |

---

## 6. Decisions needed from you before production
1. **Target pupils:** Tahap 1 (simpler, more guidance), Tahap 2 (competition age, like Shell's Tahun 4–6), or both with difficulty levels?
2. **Main device:** school PC lab, Android tablets/phones, or both? This sets the graphics budget.
3. **Language:** BM only, or BM + English toggle?
4. **Mode priority after M0:** Kehidupan first, or Pertandingan first (if you're aiming at a competition/event)?
5. **Multiplayer:** hot-seat team mode is enough, or do you want an online school leaderboard (GAS)?
6. **Art style:** chunky toy-like low-poly (Sims 4 / Animal Crossing feel), or more realistic Malaysian streets?
7. **Name:** keep "BIJAK PKJR", or a game title like "Piala Lalu Lintas" / "Taman Bijak"?

---

### Sources
- [Sarawak's rebranded traffic games to start Nov 23 (Borneo Post, 2024)](https://www.theborneopost.com/2024/10/30/sarawaks-rebranded-traffic-games-to-start-this-nov-23/)
- [Sarawak to expand traffic parks, revive road safety games (Borneo Post, 2025)](https://www.theborneopost.com/2025/06/21/sarawak-to-expand-traffic-parks-revive-road-safety-games-for-students/)
- [MOT Sarawak: Sarawak Traffic Games results](https://mot.sarawak.gov.my/web/subpage/news_view/675)
- [Shell Ajari Anak SD Tertib di Jalan (detikOto)](https://oto.detik.com/berita/d-1224090/shell-ajari-anak-sd-tertib-di-jalan)
- [Modul PKJR (Utusan Malaysia)](https://www.utusan.com.my/nasional/2019/02/modul-pkjr-dicadang-ganti-kelas-teori-memandu-enam-jam/)

---

## 7. Decisions taken in production (2026-10-16)
You gave full authority, so I used these defaults for the 7 open questions:
1. **Pupils:** both. *Tetapan → Tahap 1* gives kerb-drill hints, fewer cars and no rule-breaking drivers. Tahap 2 is the normal game.
2. **Devices:** lab PCs and tablets. There is touch support (tap to walk, joystick, pinch zoom) and a *Ringan* graphics mode.
3. **Language:** BM only. English was skipped.
4. **Order:** I built every milestone (M0–M4). Taman Bijak has 7 missions plus free roam, Piala Lalu Lintas has 4 stations and 3 levels, and Mod Bina has share links.
5. **Multiplayer:** hot-seat team of 4 on one PC. There is no online leaderboard.
6. **Art:** chunky toy-like low-poly. Buildings, cars and trees are CC0 models from Poly Pizza. The bus, bikes and the school are generated in code. *(Update: people are now realistic CC0 MakeHuman/MPFB characters, see `assets/CREDITS.md`.)*
7. **Name:** BIJAK PKJR. The competition mode is called *Piala Lalu Lintas*.

Not built: a roundabout tile, NPC pedestrians or vehicles that break rules on purpose beyond "bad drivers", a background music track, and an English toggle.
