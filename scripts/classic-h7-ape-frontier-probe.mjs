import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { GOLDEN_PROFILES, evaluateGoldenPuzzle } from '../server/brutal-search/lib/golden-benchmark-audit.js';

const require = createRequire(import.meta.url);
const corpus = require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C = require('../games/classic-human/contracts.js');
const H = require('../games/classic-human/index.js');
const L = require('../games/classic-human/links.js');
const ALS = require('../games/classic-human/als.js');

const targetId = process.argv[2] || 'ai-escargot-2006';
const record = corpus.find((x) => x.id === targetId);
if (!record) throw new Error(`Unknown benchmark id: ${targetId}`);
const PROFILE = GOLDEN_PROFILES.MAX_CAPABILITY;
const MAX_ALS_CELLS = 4;
const MAX_BASE_PAIRS = 4096;

function replayState(puzzle, trace) {
  const state = new H.ClassicHumanState(puzzle);
  for (const step of trace || []) if (!state.apply(step)) throw new Error('trace replay failed');
  return state;
}
function falseCandidates(state) {
  const grid = state.cloneGrid();
  const out = new Set();
  for (let cell = 0; cell < 81; cell += 1) {
    const [r, c] = C.rowCol(cell);
    if (grid[r][c]) continue;
    for (const digit of C.digitsFromMask(state.masks[cell])) {
      const probe = grid.map((row) => row.slice());
      probe[r][c] = digit;
      if (C.countSolutions(probe, 1) === 0) out.add(`${cell}:${digit}`);
    }
  }
  return out;
}
function digitCells(state, als, digit) {
  const bit = C.bitForDigit(digit);
  return als.cells.filter((cell) => state.masks[cell] & bit);
}
function seesAll(cell, cells) { return cells.every((x) => L.sees(cell, x)); }
function pairRejected(state, a, b, p, q, alsList) {
  if (L.sees(a, b) && p === q) return true;
  if (p === q) return false;
  for (const als of alsList) {
    if (!(als.mask & C.bitForDigit(p)) || !(als.mask & C.bitForDigit(q))) continue;
    const pc = digitCells(state, als, p);
    const qc = digitCells(state, als, q);
    if (!pc.length || !qc.length) continue;
    if ((seesAll(a, pc) && seesAll(b, qc)) || (seesAll(a, qc) && seesAll(b, pc))) return true;
  }
  return false;
}
function apeForPair(state, a, b, alsList) {
  const ad = C.digitsFromMask(state.masks[a]);
  const bd = C.digitsFromMask(state.masks[b]);
  const survivors = [];
  for (const p of ad) for (const q of bd) if (!pairRejected(state, a, b, p, q, alsList)) survivors.push([p, q]);
  if (!survivors.length) return [];
  const out = [];
  for (const p of ad) if (!survivors.some((x) => x[0] === p)) out.push({ cell: a, digit: p });
  for (const q of bd) if (!survivors.some((x) => x[1] === q)) out.push({ cell: b, digit: q });
  return out;
}

const started = performance.now();
const baseline = evaluateGoldenPuzzle(record.puzzle, PROFILE);
const state = replayState(record.puzzle, baseline.trace);
const falseSet = falseCandidates(state);
const alsList = ALS.enumerateAls(state, { maxCells: MAX_ALS_CELLS });
const unsolved = [];
for (let cell = 0; cell < 81; cell += 1) {
  const [r, c] = C.rowCol(cell);
  if (!state.grid[r][c]) unsolved.push(cell);
}
const findings = new Map();
let pairCount = 0;
for (let i = 0; i < unsolved.length && pairCount < MAX_BASE_PAIRS; i += 1) {
  for (let j = i + 1; j < unsolved.length && pairCount < MAX_BASE_PAIRS; j += 1) {
    pairCount += 1;
    const a = unsolved[i], b = unsolved[j];
    const elims = apeForPair(state, a, b, alsList);
    for (const e of elims) {
      const key = `${e.cell}:${e.digit}`;
      if (!findings.has(key)) findings.set(key, { elimination: e, base: [a, b], aligned: L.sees(a, b), falseCandidate: falseSet.has(key) });
    }
  }
}
const rows = [...findings.values()].sort((x, y) =>
  Number(y.falseCandidate) - Number(x.falseCandidate) || x.elimination.cell - y.elimination.cell || x.elimination.digit - y.elimination.digit
);
console.log(`CLASSIC_H7_APE_FRONTIER_PROBE ${JSON.stringify({
  id: record.id,
  baselineStatus: baseline.solveStatus,
  baselineSteps: baseline.totalSteps,
  alsCount: alsList.length,
  maxAlsCells: MAX_ALS_CELLS,
  basePairsProbed: pairCount,
  apeEliminations: rows.length,
  falseApeEliminations: rows.filter((x) => x.falseCandidate).length,
  alignedFindings: rows.filter((x) => x.aligned).length,
  examples: rows.slice(0, 16),
  elapsedMs: Math.round((performance.now() - started) * 10) / 10,
})}`);
