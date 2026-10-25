// Progress kept in this browser only. Every access is guarded: private windows may block storage.
const KEY = 'bijakpkjr.v1';
// missions: best stars; score: best Keselamatan %; anugerah: when the Murid Patuh award was earned
const DEFAULT = { murid: null, xp: 0, missions: {}, score: {}, anugerah: null, piala: { unlocked: 1, best: {} }, maps: {}, settings: { quality: 'hi', tahap: 2 } };

function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); return d ? { ...DEFAULT, ...d, settings: { ...DEFAULT.settings, ...d.settings }, piala: { ...DEFAULT.piala, ...d.piala } } : structuredClone(DEFAULT); }
  catch { return structuredClone(DEFAULT); }
}
export const SAVE = load();
export function persist() { try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch { /* storage unavailable */ } }
