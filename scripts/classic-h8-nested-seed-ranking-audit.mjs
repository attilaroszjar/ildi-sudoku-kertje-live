import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { GOLDEN_PROFILES, evaluateGoldenPuzzle } from '../server/brutal-search/lib/golden-benchmark-audit.js';

const require = createRequire(import.meta.url);
const corpus = require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C = require('../games/classic-human/contracts.js');
const H = require('../games/classic-human/index.js');

const TARGET_ID = 'ai-escargot-2006';
const KNOWN_TARGET = Object.freeze({ cell: 43, digit: 5 }); // r5c8=5, proven false by H8 nested probe
const record = corpus.find((x) => x.id === TARGET_ID);
if (!record) throw new Error(`missing benchmark ${TARGET_ID}`);

function replayState(puzzle, trace) {
  const state = new H.ClassicHumanState(puzzle);
  for (const step of trace || []) if (!state.apply(step)) throw new Error('trace replay failed');
  return state;
}

function houseCells(type, index) {
  const out = [];
  if (type === 'row') for (let c = 0; c < 9; c += 1) out.push(C.cellIndex(index, c));
  else if (type === 'column') for (let r = 0; r < 9; r += 1) out.push(C.cellIndex(r, index));
  else {
    const br = Math.floor(index / 3) * 3;
    const bc = (index % 3) * 3;
    for (let r = br; r < br + 3; r += 1) for (let c = bc; c < bc + 3; c += 1) out.push(C.cellIndex(r, c));
  }
  return out;
}

function supportCount(state, cells, digit) {
  const bit = C.bitForDigit(digit);
  let n = 0;
  for (const cell of cells) {
    const [r, c] = C.rowCol(cell);
    if (!state.grid[r][c] && (state.masks[cell] & bit)) n += 1;
  }
  return n;
}

function peerSet(cell) {
  const [r, c] = C.rowCol(cell);
  const box = C.boxIndex(r, c);
  const out = new Set();
  for (const x of houseCells('row', r)) if (x !== cell) out.add(x);
  for (const x of houseCells('column', c)) if (x !== cell) out.add(x);
  for (const x of houseCells('box', box)) if (x !== cell) out.add(x);
  return out;
}

function exactFalse(state, cell, digit) {
  const [r, c] = C.rowCol(cell);
  const grid = state.cloneGrid();
  grid[r][c] = digit;
  return C.countSolutions(grid, 1) === 0;
}

function features(state, cell, digit) {
  const [r, c] = C.rowCol(cell);
  const box = C.boxIndex(r, c);
  const rowSupport = supportCount(state, houseCells('row', r), digit);
  const colSupport = supportCount(state, houseCells('column', c), digit);
  const boxSupport = supportCount(state, houseCells('box', box), digit);
  const supports = [rowSupport, colSupport, boxSupport];
  const bit = C.bitForDigit(digit);
  let peerSameDigit = 0;
  let peerLowArity = 0;
  for (const peer of peerSet(cell)) {
    const [pr, pc] = C.rowCol(peer);
    if (state.grid[pr][pc]) continue;
    if (state.masks[peer] & bit) peerSameDigit += 1;
    if (C.bitCount(state.masks[peer]) <= 3) peerLowArity += 1;
  }
  return {
    cell,
    digit,
    row: r + 1,
    col: c + 1,
    cellArity: C.bitCount(state.masks[cell]),
    rowSupport,
    colSupport,
    boxSupport,
    minSupport: Math.min(...supports),
    supportSum: supports.reduce((a, b) => a + b, 0),
    peerSameDigit,
    peerLowArity,
  };
}

const evaluated = evaluateGoldenPuzzle(record.puzzle, GOLDEN_PROFILES.MAX_CAPABILITY);
const state = replayState(record.puzzle, evaluated.trace);
const started = performance.now();
const candidates = [];
for (let cell = 0; cell < 81; cell += 1) {
  const [r, c] = C.rowCol(cell);
  if (state.grid[r][c]) continue;
  for (const digit of C.digitsFromMask(state.masks[cell])) {
    const row = features(state, cell, digit);
    row.exactFalse = exactFalse(state, cell, digit);
    candidates.push(row);
  }
}

const rankers = {
  arity_then_support: (a, b) => a.cellArity - b.cellArity || a.minSupport - b.minSupport || a.supportSum - b.supportSum || b.peerLowArity - a.peerLowArity || a.cell - b.cell || a.digit - b.digit,
  support_then_arity: (a, b) => a.minSupport - b.minSupport || a.supportSum - b.supportSum || a.cellArity - b.cellArity || b.peerLowArity - a.peerLowArity || a.cell - b.cell || a.digit - b.digit,
  pressure: (a, b) => a.supportSum - b.supportSum || a.peerSameDigit - b.peerSameDigit || a.cellArity - b.cellArity || b.peerLowArity - a.peerLowArity || a.cell - b.cell || a.digit - b.digit,
};

const rankings = {};
for (const [name, compare] of Object.entries(rankers)) {
  const ordered = candidates.slice().sort(compare);
  const targetIndex = ordered.findIndex((x) => x.cell === KNOWN_TARGET.cell && x.digit === KNOWN_TARGET.digit);
  rankings[name] = {
    targetRank: targetIndex < 0 ? null : targetIndex + 1,
    falseInTop8: ordered.slice(0, 8).filter((x) => x.exactFalse).length,
    falseInTop16: ordered.slice(0, 16).filter((x) => x.exactFalse).length,
    falseInTop24: ordered.slice(0, 24).filter((x) => x.exactFalse).length,
    top16: ordered.slice(0, 16).map((x) => ({
      row: x.row,
      col: x.col,
      digit: x.digit,
      cellArity: x.cellArity,
      supports: [x.rowSupport, x.colSupport, x.boxSupport],
      peerSameDigit: x.peerSameDigit,
      peerLowArity: x.peerLowArity,
      exactFalse: x.exactFalse,
    })),
  };
}

const target = candidates.find((x) => x.cell === KNOWN_TARGET.cell && x.digit === KNOWN_TARGET.digit) || null;
console.log(`CLASSIC_H8_NESTED_SEED_RANKING ${JSON.stringify({
  id: TARGET_ID,
  baselineStatus: evaluated.solveStatus,
  baselineSteps: evaluated.totalSteps,
  candidateCount: candidates.length,
  target,
  rankings,
  elapsedMs: Math.round((performance.now() - started) * 10) / 10,
})}`);
