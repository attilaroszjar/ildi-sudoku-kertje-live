import { createRequire } from 'node:module';
import { GOLDEN_PROFILES, evaluateGoldenPuzzle } from '../server/brutal-search/lib/golden-benchmark-audit.js';

const require = createRequire(import.meta.url);
const corpus = require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C = require('../games/classic-human/contracts.js');
const H = require('../games/classic-human/index.js');
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

const EXCLUDED = new Set([
  'aligned-pair-exclusion',
  'unique-rectangle',
  'unique-loop',
  'bug-plus-one',
  'forcing-chain',
  'forcing-net',
  'digit-forcing-chain',
  'digit-forcing-net',
  'dynamic-forcing-chain',
  'nested-forcing-chain',
]);

const VERIFIED_PROPAGATORS = Object.freeze(
  H.FINDERS.map((x) => x.id).filter((id) => !EXCLUDED.has(id))
);

const OPTIONS = Object.freeze({
  techniques: VERIFIED_PROPAGATORS,
  allowUniqueness: false,
  allowServerPreferred: true,
  allowServerOnly: false,
  finderOptions: Object.freeze({
    aic: Object.freeze({ maxEdges: 15 }),
    'grouped-aic': Object.freeze({ maxEdges: 12 }),
    'x-chain': Object.freeze({ maxEdges: 15 }),
    'xy-chain': Object.freeze({ maxCells: 12 }),
    'als-xz': Object.freeze({ maxCells: 4 }),
    'als-xy-wing': Object.freeze({ maxCells: 4 }),
    'als-chain': Object.freeze({ maxCells: 4, maxAls: 6 }),
    'death-blossom': Object.freeze({ maxStemCandidates: 3, maxCells: 4, maxPetalsPerDigit: 24, combinationBudget: 2048 }),
  }),
});

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

function labels(actions, op) {
  return (actions || []).slice(0, 8).map((a) => {
    const [r, c] = C.rowCol(a.cell);
    return `r${r + 1}c${c + 1}${op}${a.digit}`;
  });
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
      propagatedSteps: 0,
      techniqueCounts: {},
      trace: [],
    };
  }

  const maxSteps = 80;
  const trace = [];
  const techniqueCounts = {};
  for (let step = 0; step < maxSteps && branch.valid && !branch.isSolved(); step += 1) {
    const deduction = H.findNext(branch, OPTIONS);
    if (!deduction) break;
    techniqueCounts[deduction.techniqueId] = (techniqueCounts[deduction.techniqueId] || 0) + 1;
    const applied = branch.apply(deduction);
    if (trace.length < 24) {
      trace.push({
        technique: deduction.techniqueId,
        placements: labels(deduction.placements, '='),
        eliminations: labels(deduction.eliminations, '!='),
        validAfter: branch.valid,
      });
    }
    if (!applied || !branch.valid) break;
  }

  return {
    ...target,
    row: r + 1,
    col: c + 1,
    exactSolutionsUnderAssumption,
    status: branch.valid ? (branch.isSolved() ? 'SOLVED_UNDER_ASSUMPTION' : 'STABLE') : 'CONTRADICTION',
    contradictionAt: branch.valid ? null : Object.values(techniqueCounts).reduce((a, b) => a + b, 0),
    propagatedSteps: Object.values(techniqueCounts).reduce((a, b) => a + b, 0),
    remainingUnresolved: unresolvedCount(branch),
    techniqueCounts,
    trace,
  };
}

const evaluated = evaluateGoldenPuzzle(record.puzzle, GOLDEN_PROFILES.MAX_CAPABILITY);
const base = replayState(record.puzzle, evaluated.trace);
const rows = TARGETS.map((target) => probe(base, target));

console.log(`CLASSIC_H8_VERIFIED_PROPAGATION ${JSON.stringify({
  id: TARGET_ID,
  baselineStatus: evaluated.solveStatus,
  baselineSteps: evaluated.totalSteps,
  baselineUnresolved: unresolvedCount(base),
  propagatorCount: VERIFIED_PROPAGATORS.length,
  excluded: Array.from(EXCLUDED),
  targetCount: rows.length,
  contradictionCount: rows.filter((x) => x.status === 'CONTRADICTION').length,
  rows,
})}`);
