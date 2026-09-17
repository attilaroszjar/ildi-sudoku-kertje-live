import { createRequire } from 'node:module';
import { GOLDEN_PROFILES, evaluateGoldenPuzzle } from '../server/brutal-search/lib/golden-benchmark-audit.js';

const require = createRequire(import.meta.url);
const corpus = require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C = require('../games/classic-human/contracts.js');
const H = require('../games/classic-human/index.js');
const S = require('../games/classic-human/solver.js');
const F = require('../games/classic-human/forcing.js');

const TARGET_ID = 'ai-escargot-2006';
const TARGETS = Object.freeze([
  { cell: 15, digit: 7, source: 'unlock-top-3' },
  { cell: 31, digit: 6, source: 'unlock-top-3' },
  { cell: 63, digit: 9, source: 'unlock-top-2' },
  { cell: 19, digit: 7, source: 'unlock-top-2' },
  { cell: 35, digit: 1, source: 'unlock-top-2' },
  { cell: 43, digit: 5, source: 'unlock-top-2' },
  { cell: 4, digit: 3, source: 'unlock-hidden-single' },
  { cell: 1, digit: 5, source: 'unlock-hidden-single' },
]);

const record = corpus.find((x) => x.id === TARGET_ID);
if (!record) throw new Error(`missing benchmark ${TARGET_ID}`);

function replayState(puzzle, trace) {
  const state = new H.ClassicHumanState(puzzle);
  for (const step of trace || []) {
    if (!state.apply(step)) throw new Error('trace replay failed');
  }
  return state;
}

function unresolvedCount(state) {
  let n = 0;
  for (let cell = 0; cell < 81; cell += 1) {
    const [r, c] = C.rowCol(cell);
    if (!state.grid[r][c]) n += 1;
  }
  return n;
}

function directNext(state) {
  const all = [];
  for (const finder of [S.findFullHouse, S.findNakedSingle, S.findHiddenSingle]) {
    for (const deduction of finder(state)) all.push(deduction);
  }
  if (!all.length) return null;
  all.sort(C.compareDeductions);
  return all[0];
}

function actionLabel(action) {
  const [r, c] = C.rowCol(action.cell);
  return `r${r + 1}c${c + 1}=${action.digit}`;
}

function probe(base, target) {
  const branch = F.cloneState(base);
  const [r, c] = C.rowCol(target.cell);
  const bit = C.bitForDigit(target.digit);
  if (!(branch.masks[target.cell] & bit)) {
    return { ...target, row: r + 1, col: c + 1, status: 'CANDIDATE_ABSENT' };
  }

  const grid = base.cloneGrid();
  grid[r][c] = target.digit;
  const exactSolutionsUnderAssumption = C.countSolutions(grid, 1);

  if (!branch.place(target.cell, target.digit)) {
    return {
      ...target,
      row: r + 1,
      col: c + 1,
      exactSolutionsUnderAssumption,
      status: 'CONTRADICTION',
      contradictionAt: 0,
      directSteps: 0,
      trace: [],
    };
  }

  const maxDirectSteps = unresolvedCount(base) - 1;
  const trace = [];
  for (let step = 0; step < maxDirectSteps && branch.valid; step += 1) {
    const deduction = directNext(branch);
    if (!deduction) break;
    const placements = (deduction.placements || []).map(actionLabel);
    const applied = branch.apply(deduction);
    trace.push({
      technique: deduction.techniqueId,
      placements,
      validAfter: branch.valid,
    });
    if (!applied || !branch.valid) break;
  }

  return {
    ...target,
    row: r + 1,
    col: c + 1,
    exactSolutionsUnderAssumption,
    status: branch.valid ? 'STABLE' : 'CONTRADICTION',
    contradictionAt: branch.valid ? null : trace.length,
    directSteps: trace.length,
    remainingUnresolved: unresolvedCount(branch),
    trace: trace.slice(0, 24),
  };
}

const evaluated = evaluateGoldenPuzzle(record.puzzle, GOLDEN_PROFILES.MAX_CAPABILITY);
const base = replayState(record.puzzle, evaluated.trace);
const rows = TARGETS.map((target) => probe(base, target));

console.log(`CLASSIC_H8_TARGETED_CONTRADICTION ${JSON.stringify({
  id: TARGET_ID,
  baselineStatus: evaluated.solveStatus,
  baselineSteps: evaluated.totalSteps,
  baselineUnresolved: unresolvedCount(base),
  directLogic: ['full-house', 'naked-single', 'hidden-single'],
  targetCount: rows.length,
  contradictionCount: rows.filter((x) => x.status === 'CONTRADICTION').length,
  rows,
})}`);
