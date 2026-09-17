import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const corpus = require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C = require('../games/classic-human/contracts.js');
const H = require('../games/classic-human/index.js');
const N = require('../games/classic-human/nested-forcing.js');

const TARGET_ID = 'ai-escargot-2006';
const TOP_LIMITS = [8, 16, 24];
const record = corpus.find((x) => x.id === TARGET_ID);
if (!record) throw new Error(`missing benchmark ${TARGET_ID}`);

function replayToStall(puzzle) {
  const result = H.solve(puzzle, {
    allowUniqueness: true,
    allowServerPreferred: true,
    allowServerOnly: true,
    finderOptions: {
      'forcing-chain': { maxSteps: 32, candidateBudget: 24 },
      'forcing-net': { maxSteps: 32, seedBudget: 12 },
      'digit-forcing-chain': { maxSteps: 32 },
      'digit-forcing-net': { maxSteps: 32 },
    },
  });
  const state = new H.ClassicHumanState(puzzle);
  for (const step of result.steps) {
    if (!state.apply(step)) throw new Error('baseline replay failed');
  }
  return { result, state };
}

function supports(state, cell, digit) {
  const [r, c] = C.rowCol(cell);
  const bit = C.bitForDigit(digit);
  let row = 0, col = 0, box = 0;
  for (let cc = 0; cc < 9; cc += 1) {
    const idx = C.cellIndex(r, cc), [rr, rc] = C.rowCol(idx);
    if (!state.grid[rr][rc] && (state.masks[idx] & bit)) row += 1;
  }
  for (let rr = 0; rr < 9; rr += 1) {
    const idx = C.cellIndex(rr, c), [cr, cc] = C.rowCol(idx);
    if (!state.grid[cr][cc] && (state.masks[idx] & bit)) col += 1;
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr += 1) for (let cc = bc; cc < bc + 3; cc += 1) {
    const idx = C.cellIndex(rr, cc), [xr, xc] = C.rowCol(idx);
    if (!state.grid[xr][xc] && (state.masks[idx] & bit)) box += 1;
  }
  return [row, col, box];
}

function peers(cell) {
  const [r, c] = C.rowCol(cell);
  const set = new Set();
  for (let i = 0; i < 9; i += 1) {
    set.add(C.cellIndex(r, i));
    set.add(C.cellIndex(i, c));
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr += 1) for (let cc = bc; cc < bc + 3; cc += 1) set.add(C.cellIndex(rr, cc));
  set.delete(cell);
  return [...set];
}

function candidateRows(state) {
  const rows = [];
  for (let cell = 0; cell < 81; cell += 1) {
    const [r, c] = C.rowCol(cell);
    if (state.grid[r][c]) continue;
    const cellArity = C.bitCount(state.masks[cell]);
    for (const digit of C.digitsFromMask(state.masks[cell])) {
      const s = supports(state, cell, digit);
      const bit = C.bitForDigit(digit);
      const ps = peers(cell);
      const peerSameDigit = ps.filter((p) => {
        const [pr, pc] = C.rowCol(p);
        return !state.grid[pr][pc] && (state.masks[p] & bit);
      }).length;
      const peerLowArity = ps.filter((p) => {
        const [pr, pc] = C.rowCol(p);
        return !state.grid[pr][pc] && C.bitCount(state.masks[p]) <= 3;
      }).length;
      rows.push({
        cell, digit, row: r + 1, col: c + 1, cellArity,
        rowSupport: s[0], colSupport: s[1], boxSupport: s[2],
        minSupport: Math.min(...s), supportSum: s[0] + s[1] + s[2],
        peerSameDigit, peerLowArity,
      });
    }
  }
  return rows;
}

function sortPressure(a, b) {
  return a.minSupport - b.minSupport ||
    a.supportSum - b.supportSum ||
    a.peerSameDigit - b.peerSameDigit ||
    b.peerLowArity - a.peerLowArity ||
    a.cellArity - b.cellArity ||
    a.cell - b.cell || a.digit - b.digit;
}

function actionKey(a) { return `${a.cell}:${a.digit}`; }
function exactFalseSet(state) {
  const out = new Set();
  const grid = state.cloneGrid();
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

function summarizeAnalysis(row, analysis, falseSet) {
  const actions = [...(analysis.placements || []), ...(analysis.eliminations || [])];
  return {
    rank: row.rank,
    row: row.row,
    col: row.col,
    digit: row.digit,
    cellArity: row.cellArity,
    supports: [row.rowSupport, row.colSupport, row.boxSupport],
    exactFalse: falseSet.has(`${row.cell}:${row.digit}`),
    status: analysis.status,
    workUsed: analysis.workUsed ?? null,
    placements: (analysis.placements || []).length,
    eliminations: (analysis.eliminations || []).length,
    targetAction: actions.some((x) => x.cell === row.cell && x.digit === row.digit),
  };
}

const started = performance.now();
const { result, state } = replayToStall(record.puzzle);
const falseSet = exactFalseSet(state);
const ranked = candidateRows(state).sort(sortPressure).map((row, i) => ({ ...row, rank: i + 1 }));
const evaluated = [];
for (const row of ranked.slice(0, Math.max(...TOP_LIMITS))) {
  const analysis = N.analyzeNestedBinary(state, row.cell, row.digit, {
    directSteps: 32,
    nestedSteps: 2,
    dynamicCandidateBudget: 8,
    dynamicNestedSteps: 4,
    dynamicInnerSteps: 16,
    workBudget: 12,
  });
  evaluated.push(summarizeAnalysis(row, analysis, falseSet));
}

const summaries = {};
for (const limit of TOP_LIMITS) {
  const slice = evaluated.slice(0, limit);
  const actionable = slice.filter((x) => x.status !== 'NONE' && x.status !== 'INCONSISTENT');
  const forcedFalse = slice.filter((x) => x.status === 'FORCED_FALSE');
  summaries[`top${limit}`] = {
    tested: slice.length,
    actionable: actionable.length,
    forcedFalse: forcedFalse.length,
    soundForcedFalse: forcedFalse.filter((x) => x.exactFalse).length,
    firstActionableRank: actionable.length ? actionable[0].rank : null,
    firstForcedFalseRank: forcedFalse.length ? forcedFalse[0].rank : null,
  };
}

console.log(`CLASSIC_H8_TOP_SEED_ACTIONABILITY ${JSON.stringify({
  id: TARGET_ID,
  baselineStatus: result.status,
  baselineSteps: result.steps.length,
  ranking: 'pressure',
  candidateCount: ranked.length,
  summaries,
  hits: evaluated.filter((x) => x.status !== 'NONE' && x.status !== 'INCONSISTENT').slice(0, 16),
  elapsedMs: Math.round((performance.now() - started) * 10) / 10,
})}`);
