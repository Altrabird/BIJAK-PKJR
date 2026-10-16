// Pre-render every voice line with Microsoft Edge neural TTS in Malaysian Malay.
// Polis lines (RULES) use Osman, cikgu/narrator lines use Yasmin. Existing mp3s are kept unless --force.
// Usage: node tools/make_voice.mjs [--force]
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { RULES, GOOD, LINES } from '../js/rules.js';

const OUT = new URL('../assets/voice/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const force = process.argv.includes('--force');
const jobs = [
  ...Object.entries(RULES).map(([k, r]) => [k, r.say, 'ms-MY-OsmanNeural']),
  ...Object.entries(GOOD).map(([k, g]) => [k, g.say, 'ms-MY-YasminNeural']),
  ...Object.entries(LINES).map(([k, t]) => [k, t, 'ms-MY-YasminNeural']),
].filter(([k]) => force || !existsSync(new URL(`${k}.mp3`, OUT)));

const run = ([k, text, voice]) => new Promise((res) => {
  const file = new URL(`${k}.mp3`, OUT).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  const p = spawn('python', ['-m', 'edge_tts', '--voice', voice, '--rate=-5%', '--text', text, '--write-media', decodeURIComponent(file)]);
  let err = '';
  p.stderr.on('data', d => err += d);
  p.on('close', code => { console.log(code === 0 ? 'ok  ' : 'FAIL', k, code ? err.slice(-200) : ''); res(code); });
});

const queue = [...jobs];
const workers = Array.from({ length: 4 }, async () => { while (queue.length) await run(queue.shift()); });
await Promise.all(workers);
console.log(`${jobs.length} line(s) processed`);
