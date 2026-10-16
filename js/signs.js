// JPJ-style road signs drawn on canvas: used as 3D textures and as quiz pictures.
import * as THREE from 'three';
import { mat } from './engine.js';

const S = 256, RED = '#d0202a', BLUE = '#1c5bb8', YEL = '#f6c51b', BLK = '#111', WHT = '#fff';

export const SIGN_NAMES = {
  berhenti: 'Berhenti', beri_laluan: 'Beri Laluan', lintasan: 'Lintasan Pejalan Kaki', kawasan_sekolah: 'Kawasan Sekolah',
  had_laju_30: 'Had Laju 30 km/j', dilarang_masuk: 'Dilarang Masuk', lampu_isyarat: 'Lampu Isyarat di Hadapan',
  laluan_basikal: 'Laluan Basikal', bas: 'Perhentian Bas', dilarang_letak: 'Dilarang Meletak Kenderaan',
  bulatan: 'Bulatan di Hadapan', awas_pejalan: 'Awas Pejalan Kaki', dilarang_pusing_u: 'Dilarang Pusing U',
  dilarang_basikal: 'Basikal Dilarang', simpang_empat: 'Simpang Empat di Hadapan', jalan_licin: 'Jalan Licin',
};

function ctx2d() { const c = document.createElement('canvas'); c.width = c.height = S; return [c, c.getContext('2d')]; }
function poly(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); }
function text(g, t, y, size, color) {
  g.fillStyle = color; g.font = `900 ${size}px Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(t, S / 2, y, S * 0.84);
}
function diamond(g) {
  poly(g, [[128, 6], [250, 128], [128, 250], [6, 128]]); g.fillStyle = BLK; g.fill();
  poly(g, [[128, 18], [238, 128], [128, 238], [18, 128]]); g.fillStyle = YEL; g.fill();
}
function ring(g, fill = WHT) {
  g.beginPath(); g.arc(128, 128, 122, 0, 7); g.fillStyle = RED; g.fill();
  g.beginPath(); g.arc(128, 128, 96, 0, 7); g.fillStyle = fill; g.fill();
}
function walker(g, x, y, s, c = BLK) {
  g.strokeStyle = c; g.fillStyle = c; g.lineWidth = s * 0.13; g.lineCap = 'round';
  g.beginPath(); g.arc(x, y - s * 0.78, s * 0.14, 0, 7); g.fill();
  g.beginPath();
  g.moveTo(x, y - s * 0.6); g.lineTo(x - s * 0.04, y - s * 0.1);           // body
  g.moveTo(x - s * 0.04, y - s * 0.1); g.lineTo(x - s * 0.3, y + s * 0.35); // back leg
  g.moveTo(x - s * 0.04, y - s * 0.1); g.lineTo(x + s * 0.24, y + s * 0.35); // front leg
  g.moveTo(x, y - s * 0.52); g.lineTo(x - s * 0.28, y - s * 0.22);         // arms
  g.moveTo(x, y - s * 0.52); g.lineTo(x + s * 0.26, y - s * 0.28);
  g.stroke();
}
function bike(g, x, y, s, c) {
  g.strokeStyle = c; g.lineWidth = s * 0.07; g.lineCap = 'round';
  g.beginPath(); g.arc(x - s * 0.42, y, s * 0.26, 0, 7); g.stroke();
  g.beginPath(); g.arc(x + s * 0.42, y, s * 0.26, 0, 7); g.stroke();
  g.beginPath();
  g.moveTo(x - s * 0.42, y); g.lineTo(x - s * 0.08, y - s * 0.38); g.lineTo(x + s * 0.3, y - s * 0.38); g.lineTo(x + s * 0.42, y);
  g.moveTo(x - s * 0.42, y); g.lineTo(x + s * 0.05, y); g.lineTo(x - s * 0.08, y - s * 0.38);
  g.moveTo(x + s * 0.05, y); g.lineTo(x + s * 0.3, y - s * 0.38);
  g.moveTo(x - s * 0.08, y - s * 0.38); g.lineTo(x - s * 0.12, y - s * 0.48); g.moveTo(x - s * 0.2, y - s * 0.48); g.lineTo(x - s * 0.02, y - s * 0.48);
  g.moveTo(x + s * 0.3, y - s * 0.38); g.lineTo(x + s * 0.26, y - s * 0.55);
  g.stroke();
}
function slash(g) { g.strokeStyle = RED; g.lineWidth = 22; g.beginPath(); g.moveTo(60, 60); g.lineTo(196, 196); g.stroke(); }

const DRAW = {
  berhenti(g) {
    const o = (r) => Array.from({ length: 8 }, (_, k) => { const a = Math.PI / 8 + k * Math.PI / 4; return [128 + r * Math.cos(a), 128 + r * Math.sin(a)]; });
    poly(g, o(126)); g.fillStyle = WHT; g.fill();
    poly(g, o(116)); g.fillStyle = RED; g.fill();
    text(g, 'BERHENTI', 132, 46, WHT);
  },
  beri_laluan(g) {
    poly(g, [[6, 14], [250, 14], [128, 244]]); g.fillStyle = RED; g.fill();
    poly(g, [[44, 36], [212, 36], [128, 196]]); g.fillStyle = WHT; g.fill();
    text(g, 'BERI', 72, 32, BLK); text(g, 'LALUAN', 106, 30, BLK);
  },
  lintasan(g) {
    g.fillStyle = BLUE; g.fillRect(8, 8, 240, 240);
    poly(g, [[128, 26], [232, 222], [24, 222]]); g.fillStyle = WHT; g.fill();
    g.fillStyle = BLK; for (let k = 0; k < 5; k++) g.fillRect(64 + k * 28, 196, 16, 16);
    walker(g, 128, 168, 110);
  },
  kawasan_sekolah(g) { diamond(g); walker(g, 102, 160, 86); walker(g, 160, 168, 66); },
  had_laju_30(g) { ring(g); text(g, '30', 134, 110, BLK); },
  dilarang_masuk(g) { g.beginPath(); g.arc(128, 128, 122, 0, 7); g.fillStyle = RED; g.fill(); g.fillStyle = WHT; g.fillRect(40, 106, 176, 44); },
  lampu_isyarat(g) {
    diamond(g); g.fillStyle = BLK; g.fillRect(100, 54, 56, 150);
    [['#e33', 82], ['#fc3', 128], ['#3c4', 174]].forEach(([c, y]) => { g.beginPath(); g.arc(128, y, 18, 0, 7); g.fillStyle = c; g.fill(); });
  },
  laluan_basikal(g) { g.beginPath(); g.arc(128, 128, 122, 0, 7); g.fillStyle = BLUE; g.fill(); bike(g, 128, 150, 150, WHT); },
  bas(g) {
    g.fillStyle = BLUE; g.fillRect(8, 8, 240, 240); g.fillStyle = WHT; g.fillRect(48, 70, 160, 96);
    g.fillStyle = BLUE; g.fillRect(60, 82, 40, 34); g.fillRect(108, 82, 40, 34); g.fillRect(156, 82, 40, 34);
    g.fillStyle = BLK; g.beginPath(); g.arc(84, 170, 16, 0, 7); g.arc(172, 170, 16, 0, 7); g.fill();
    text(g, 'BAS', 218, 44, WHT);
  },
  dilarang_letak(g) {
    g.beginPath(); g.arc(128, 128, 122, 0, 7); g.fillStyle = RED; g.fill();
    g.beginPath(); g.arc(128, 128, 96, 0, 7); g.fillStyle = BLUE; g.fill(); slash(g);
  },
  bulatan(g) {
    diamond(g); g.strokeStyle = BLK; g.lineWidth = 16;
    for (let k = 0; k < 3; k++) {
      const a = k * 2.094; g.beginPath(); g.arc(128, 128, 48, a, a + 1.5); g.stroke();
      const ex = 128 + 48 * Math.cos(a + 1.5), ey = 128 + 48 * Math.sin(a + 1.5), t = a + 1.5 + Math.PI / 2;
      poly(g, [[ex + 18 * Math.cos(t), ey + 18 * Math.sin(t)], [ex + 16 * Math.cos(t - 2.2), ey + 16 * Math.sin(t - 2.2)], [ex + 16 * Math.cos(t + 2.2), ey + 16 * Math.sin(t + 2.2)]]);
      g.fillStyle = BLK; g.fill();
    }
  },
  awas_pejalan(g) { diamond(g); walker(g, 128, 160, 110); },
  dilarang_pusing_u(g) {
    ring(g); g.strokeStyle = BLK; g.lineWidth = 18; g.beginPath();
    g.moveTo(150, 190); g.lineTo(150, 110); g.arc(122, 110, 28, 0, Math.PI, true); g.lineTo(94, 160); g.stroke();
    poly(g, [[70, 150], [118, 150], [94, 190]]); g.fillStyle = BLK; g.fill(); slash(g);
  },
  dilarang_basikal(g) { ring(g); bike(g, 128, 150, 130, BLK); },
  simpang_empat(g) { diamond(g); g.fillStyle = BLK; g.fillRect(116, 50, 24, 156); g.fillRect(50, 116, 156, 24); },
  jalan_licin(g) {
    diamond(g); g.fillStyle = BLK; g.fillRect(96, 80, 64, 40); g.fillRect(90, 110, 76, 26);
    g.strokeStyle = BLK; g.lineWidth = 8; g.beginPath(); g.moveTo(96, 190); g.bezierCurveTo(120, 150, 70, 160, 110, 130); g.moveTo(160, 190); g.bezierCurveTo(186, 150, 136, 160, 150, 130); g.stroke();
  },
};

const canv = {}, tex = {};
export function signCanvas(id) {
  if (!canv[id]) { const [c, g] = ctx2d(); (DRAW[id] || DRAW.dilarang_masuk)(g); canv[id] = c; }
  return canv[id];
}
export const signURL = id => signCanvas(id).toDataURL();
export function signTexture(id) {
  if (!tex[id]) { tex[id] = new THREE.CanvasTexture(signCanvas(id)); tex[id].colorSpace = THREE.SRGBColorSpace; tex[id].anisotropy = 4; }
  return tex[id];
}

const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), plateGeo = new THREE.PlaneGeometry(0.85, 0.85);
// Sign on a pole; faces +Z (rotate the group to face traffic).
export function signMesh(id, h = 2.4) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(poleGeo, mat(0x8a8f96)); pole.position.y = 1.2; pole.scale.y = h / 2.4; pole.castShadow = true;
  const face = new THREE.Mesh(plateGeo, new THREE.MeshLambertMaterial({ map: signTexture(id), transparent: true, alphaTest: 0.5 }));
  face.position.set(0, h + 0.2, 0.06);
  const back = new THREE.Mesh(plateGeo, new THREE.MeshLambertMaterial({ map: signTexture(id), color: 0x777777, alphaTest: 0.5, side: THREE.BackSide }));
  back.position.set(0, h + 0.2, 0.05);
  g.add(pole, face, back);
  return g;
}
