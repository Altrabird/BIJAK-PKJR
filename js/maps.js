// Map data. Legend:
// roads: r road (auto shape)  L traffic-light junction  x BERHENTI junction  z zebra  p pelican (button)
// ground: . grass  q car park  H B C houses  K kedai  S sekolah (multi-tile)  G bangunan  M surau
//         T tree  P palm  y taman permainan  w padang (multi-tile)  h perhentian bas

export const TOWN = {
  name: 'Taman Bijak',
  rows: [
    'PT.PT.TP.P.hTP.P',
    '.rrrrrrxrrzrrrr.',
    '.r.H.B.r.SSS..r.',
    '.rT...Tr.SSS..r.',
    '.r.y.y.r.wwww.r.',
    '.rP...Pr.wwww.r.',
    '.r.C.H.r.G..G.r.',
    '.rT.T.Tr.T.T.Tr.',
    '.rrrprrLrrrrrrr.',
    '.rT.T.Tr.T.T.Tr.',
    '.r.H.B.r.K.K.Mr.',
    '.rP...Pz..P...r.',
    '.r.C.H.r.G...Cr.',
    '.rhT.T.r.T.T.Tr.',
    '.rrrrrrxrrrrrrr.',
    'PT.PT.TP.PT.TP.P',
  ],
  places: {
    rumah: [5, 12], sekolah: [10, 2], kedai: [9, 10], surau: [13, 10], taman: [3, 4],
    rumahKawan: [3, 6], hentianRumah: [2, 13], hentianSekolah: [11, 0], padang: [10, 4],
  },
  spawn: [4, 12],
};

export const GARDEN = {
  name: 'Taman Lalu Lintas',
  rows: [
    'P.T.P.T.P.T',
    '.rrrrxrrrr.',
    '.r...r...r.',
    '.z.y.rq..r.',
    '.r...r...p.',
    '.rrrrLrrrr.',
    '.r...r...r.',
    '.r.T.z.T.r.',
    '.r...r...r.',
    '.rrrrxrrrr.',
    'P.T.P.T.P.T',
  ],
  places: { parkir: [6, 3], pentas: [8, 7] },
  spawn: [2, 2],
};

export const EMPTY = {
  name: 'Peta Baharu',
  rows: Array.from({ length: 12 }, (_, j) => (j === 1 || j === 10) ? '.rrrrrrrrrr.' : (j > 1 && j < 10 ? '.r........r.' : '............')),
  places: {}, spawn: [3, 3],
};
