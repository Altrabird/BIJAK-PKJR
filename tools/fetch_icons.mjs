// Downloads Fluent Emoji 3D (MIT, Microsoft, via @lobehub/fluent-emoji-3d) for every emoji used in js/.
// Run: node tools/fetch_icons.mjs   (re-run after adding a new emoji to the UI)
import fs from 'fs';
import { EMOJI, LINE, key } from '../js/icons.js';
const used = new Set();
for (const f of fs.readdirSync('js')) for (const m of fs.readFileSync('js/' + f, 'utf8').matchAll(EMOJI)) if (!LINE[m[0].replace(/️/g, '')]) used.add(m[0]);
const BASE = 'https://cdn.jsdelivr.net/npm/@lobehub/fluent-emoji-3d@1.1.0/assets/';
for (const e of used) {
  const k = key(e), out = `assets/icons/${k}.webp`;
  if (fs.existsSync(out)) continue;
  const cps = [...e].map(c => c.codePointAt(0).toString(16).padStart(4, '0'));
  // the package names files by the fully-qualified sequence; try with and without FE0F
  const tries = [cps.join('-'), cps.filter(c => c !== 'fe0f').join('-'), [...cps.filter(c => c !== 'fe0f'), 'fe0f'].join('-')];
  let ok = false;
  for (const t of tries) { const r = await fetch(BASE + t + '.webp'); if (r.ok) { fs.writeFileSync(out, Buffer.from(await r.arrayBuffer())); ok = true; break; } }
  console.log(ok ? 'ok  ' : 'MISS', e, k);
}
