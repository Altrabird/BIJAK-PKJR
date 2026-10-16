// Swaps emoji in the UI for Fluent Emoji 3D images (assets/icons, MIT) and plain UI glyphs for Lucide line icons (ISC).
// Callers keep writing emoji in their HTML/text; a MutationObserver on #ui converts them as they appear.

export const EMOJI = /(?![©®™])\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*|[✕☰⟲⟳＋－←→]/gu;
export const key = e => [...e.replace(/️/g, '')].map(c => c.codePointAt(0).toString(16)).join('-');

const svg = (body, fill = 'none') => `<svg viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const SPEAKER = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/>';
export const LINE = {
  '▶': svg('<polygon points="6 3 20 12 6 21 6 3"/>', 'currentColor'),
  '◀': svg('<path d="m15 18-6-6 6-6"/>'),
  '⏹': svg('<rect width="16" height="16" x="4" y="4" rx="3"/>', 'currentColor'),
  '✕': svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  '☰': svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  '⟲': svg('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'),
  '⟳': svg('<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>'),
  '＋': svg('<path d="M5 12h14M12 5v14"/>'),
  '－': svg('<path d="M5 12h14"/>'),
  '←': svg('<path d="m12 19-7-7 7-7M19 12H5"/>'),
  '→': svg('<path d="M5 12h14M12 5l7 7-7 7"/>'),
  '🔊': svg(SPEAKER + '<path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>'),
  '🔇': svg(SPEAKER + '<path d="m22 9-6 6M16 9l6 6"/>'),
};

function icon(e) {
  const plain = e.replace(/️/g, '');
  if (LINE[plain]) { const s = document.createElement('span'); s.className = 'ln'; s.innerHTML = LINE[plain]; s.setAttribute('aria-label', e); return s; }
  const img = new Image();
  img.className = 'emo'; img.alt = e; img.draggable = false; img.src = `assets/icons/${key(e)}.webp`;
  // unknown emoji: fall back to the system glyph, in a span the observer leaves alone (else it would loop)
  img.onerror = () => { const t = document.createElement('span'); t.className = 'emo-txt'; t.textContent = e; img.replaceWith(t); };
  return img;
}

const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'TITLE']);
function iconify(root) {
  if (!root || SKIP.has(root.nodeName) || root.classList?.contains('emo-txt')) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), hits = [];
  for (let n; (n = w.nextNode());) if (!SKIP.has(n.parentNode.nodeName) && !n.parentNode.classList?.contains('emo-txt') && n.data.search(EMOJI) >= 0) hits.push(n);
  for (const n of hits) {
    const f = document.createDocumentFragment(); let last = 0;
    for (const m of n.data.matchAll(EMOJI)) { f.append(n.data.slice(last, m.index), icon(m[0])); last = m.index + m[0].length; }
    f.append(n.data.slice(last)); n.replaceWith(f);
  }
}

export function watchIcons(root) {
  iconify(root);
  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === 'characterData') iconify(m.target.parentNode);
      else m.addedNodes.forEach(n => iconify(n.nodeType === 3 ? n.parentNode : n));
    }
  }).observe(root, { childList: true, subtree: true, characterData: true });
}
