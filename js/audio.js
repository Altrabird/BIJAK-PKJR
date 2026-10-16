// Voice (pre-rendered ms-MY mp3 per key) + synthesised sound effects. No external sound files besides voice.
export const A = { on: true, voice: null, ctx: null };

function ctx() {
  if (!A.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) A.ctx = new C(); }
  if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
  return A.ctx;
}

export function say(k) {
  if (!A.on || !k) return;
  try {
    if (A.voice) A.voice.pause();
    A.voice = new Audio(`assets/voice/${k}.mp3`);
    A.voice.play().catch(() => {});
  } catch { /* no audio available */ }
}

function tone(f, t0, dur, type = 'sine', vol = 0.15, f2) {
  const c = ctx(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, c.currentTime + t0);
  if (f2) o.frequency.linearRampToValueAtTime(f2, c.currentTime + t0 + dur);
  g.gain.setValueAtTime(0, c.currentTime + t0);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
  o.connect(g).connect(c.destination); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05);
}
function noise(t0, dur, vol, freq) {
  const c = ctx(); if (!c) return;
  const b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 3;
  g.gain.setValueAtTime(vol, c.currentTime + t0); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t0 + dur);
  s.connect(f).connect(g).connect(c.destination); s.start(c.currentTime + t0);
}

const SFX = {
  click: () => tone(880, 0, 0.06, 'triangle', 0.08),
  horn: () => { tone(392, 0, 0.35, 'square', 0.07); tone(494, 0, 0.35, 'square', 0.06); },
  brake: () => noise(0, 0.6, 0.25, 2600),
  whistle: () => { tone(2200, 0, 0.18, 'sine', 0.12, 2400); tone(2300, 0.22, 0.45, 'sine', 0.12, 2100); },
  beep: () => { for (let k = 0; k < 4; k++) tone(1000, k * 0.25, 0.1, 'square', 0.05); },
  chime: () => [523, 659, 784, 1047].forEach((f, k) => tone(f, k * 0.11, 0.35, 'triangle', 0.1)),
  bad: () => { tone(330, 0, 0.25, 'sawtooth', 0.06); tone(247, 0.2, 0.35, 'sawtooth', 0.06); },
  look: () => tone(660, 0, 0.08, 'sine', 0.06),
  bell: () => { tone(1568, 0, 0.3, 'sine', 0.08); tone(1568, 0.18, 0.3, 'sine', 0.08); },
  cheer: () => { noise(0, 1.4, 0.12, 900); SFX.chime(); },
  siren: () => { tone(650, 0, 0.6, 'sawtooth', 0.04, 1000); tone(1000, 0.6, 0.6, 'sawtooth', 0.04, 650); },
  thud: () => { noise(0, 0.3, 0.5, 160); tone(90, 0, 0.25, 'sine', 0.2, 50); },
};
export function sfx(n) { if (A.on && SFX[n]) try { SFX[n](); } catch { /* ignore */ } }
export function unlockAudio() { ctx(); }
