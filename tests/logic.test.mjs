// Pure-logic tests (no browser): map parsing, lane geometry, A*, share codes, rules/quiz data.
// Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap, lanePath, polyLen, polyAt, findPath, roadRoute, doorPoint, encodeMap, decodeMap, exits, CELL, left, DIR } from '../js/map.js';
import { TOWN, GARDEN, EMPTY } from '../js/maps.js';
import { RULES, GOOD, LINES } from '../js/rules.js';
import { QUIZ, pickQuiz } from '../js/quiz.js';

test('maps parse with equal row lengths and expected crossings', () => {
  for (const d of [TOWN, GARDEN, EMPTY]) assert.ok(d.rows.every(r => r.length === d.rows[0].length), d.name);
  const m = parseMap(TOWN);
  const types = m.crossings.map(c => c.type).sort();
  assert.deepEqual(types, ['pelican', 'signal', 'signal', 'signal', 'signal', 'zebra', 'zebra']);
  assert.equal(parseMap(GARDEN).crossings.length, 7);
});

test('invalid junction/crossing tiles are normalised', () => {
  const m = parseMap({ rows: ['.....', '.rLz.', '.....'] });
  assert.equal(m.at(2, 1), 'r');   // L with only 2 connections
  assert.equal(m.at(3, 1), 'r');   // zebra at a dead end is not straight
});

test('left-hand traffic: lane is on the left of travel', () => {
  assert.deepEqual(left(DIR.E), [0, -1]);   // driving east, the left is north
  const m = parseMap(TOWN);
  const [cx, cz] = m.center(3, 1);          // straight EW tile
  const p = lanePath(m, 3, 1, 'W', 'E');    // entering from the west = moving east
  assert.ok(p.every(([, z]) => z < cz), 'eastbound lane is north of centre');
  assert.equal(Math.round(polyLen(p)), 10);
  const mid = polyAt(p, 5);
  assert.ok(Math.abs(mid.x - cx) < 0.01 && mid.dx === 1);
});

test('turn paths are curves and right turns are banned at signals', () => {
  const m = parseMap(TOWN);
  const turn = lanePath(m, 7, 8, 'S', 'W');   // northbound turning left
  assert.equal(turn.length, 9);
  // northbound at the L junction: right = east, so east must not be offered
  assert.ok(!exits(m, 7, 8, 'S', true).includes('E'));
  assert.ok(exits(m, 7, 8, 'S', false).includes('E'));
});

test('A* avoids roads except at crossings', () => {
  const m = parseMap(TOWN);
  const path = findPath(m, m.center(...m.spawn), doorPoint(m, m.places.sekolah));
  assert.ok(path && path.length > 2);
  const kinds = new Set(path.map(p => p[2]));
  assert.ok(!kinds.has(CELL.ROAD), 'never walks on plain road when a crossing exists');
  assert.ok(kinds.has(CELL.CROSS), 'uses a crossing');
  for (const p of path) assert.notEqual(m.cellAt(p[0], p[1]), CELL.BLOCK);
});

test('every mission place has a reachable door', () => {
  const m = parseMap(TOWN);
  const from = m.center(...m.spawn);
  for (const [k, p] of Object.entries(m.places)) {
    const d = doorPoint(m, p);
    assert.notEqual(m.cellAt(...d), CELL.BLOCK, k);
    assert.ok(findPath(m, from, d), `path to ${k}`);
  }
});

test('road routes used by missions exist', () => {
  const m = parseMap(TOWN);
  for (const [a, b] of [[[1, 9], [1, 13]], [[1, 13], [7, 14]], [[7, 14], [7, 1]], [[7, 1], [11, 1]], [[5, 14], [14, 14]], [[14, 14], [14, 8]], [[14, 8], [9, 8]], [[14, 14], [14, 10]]])
    assert.ok(roadRoute(m, a, b), `${a} -> ${b}`);
});

test('share code round-trips and rejects junk', () => {
  const d = { ...GARDEN, name: 'Ujian Kelas 4A' };
  const back = decodeMap(encodeMap(d));
  assert.deepEqual(back.rows, d.rows);
  assert.equal(back.name, d.name);
  assert.throws(() => decodeMap(encodeMap({ rows: ['ab<script>'], places: {}, spawn: [0, 0] })));
  assert.throws(() => decodeMap('not-base64!!'));
});

test('rules, praise and quiz data are complete', () => {
  for (const [k, r] of Object.entries(RULES)) assert.ok(r.t && r.why && r.say && r.pen > 0, k);
  for (const [k, g] of Object.entries(GOOD)) assert.ok(g.t && g.say && g.pts > 0, k);
  for (const [k, t] of Object.entries(LINES)) assert.ok(t.length > 2, k);
  for (const q of QUIZ) assert.ok(q.a[q.c] !== undefined && q.why, q.q);
  const qs = pickQuiz(3, 10);
  assert.equal(qs.length, 10);
  // shuffled answers still point at the original right answer (questions are identified by text + sign)
  for (const q of qs) { const o = QUIZ.find(x => x.q === q.q && x.sign === q.sign && x.a.includes(q.a[0])); assert.equal(o.a[o.c], q.a[q.c]); }
});
