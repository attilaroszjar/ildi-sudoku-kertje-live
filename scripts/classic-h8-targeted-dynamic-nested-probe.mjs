import { createRequire } from 'node:module';
import { GOLDEN_PROFILES, evaluateGoldenPuzzle } from '../server/brutal-search/lib/golden-benchmark-audit.js';

const require = createRequire(import.meta.url);
const corpus = require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C = require('../games/classic-human/contracts.js');
const H = require('../games/classic-human/index.js');
const D = require('../games/classic-human/dynamic-forcing.js');
const N = require('../games/classic-human/nested-forcing.js');

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

function coord(cell) {
  const [r, c] = C.rowCol(cell);
  return { row: r + 1, col: c + 1 };
}

function summarizeBranch(branch) {
  return {
    status: branch.status,
    reason: branch.reason,
    directUsed: branch.directUsed ?? null,
    nestedUsed: branch.nestedUsed ?? null,
    workUsed: branch.workUsed ?? null,
    stepCount: (branch.steps || []).length,
    techniqueCounts: (branch.steps || []).reduce((acc, step) => {
      acc[step.techniqueId] = (acc[step.techniqueId] || 0) + 1;
      return acc;
    }, {}),
    trace: (branch.steps || []).slice(0, 16).map((step) => ({
      technique: step.techniqueId,
      placements: (step.placements || []).length,
      eliminations: (step.eliminations || []).length,
    })),
  };
}

function exactSolutionsUnderAssumption(state, target) {
  const grid = state.cloneGrid();
  const [r, c] = C.rowCol(target.cell);
  grid[r][c] = target.digit;
  return C.countSolutions(grid, 1);
}

const evaluated = evaluateGoldenPuzzle(record.puzzle, GOLDEN_PROFILES.MAX_CAPABILITY);
const base = replayState(record.puzzle, evaluated.trace);
const rows = [];

for (const target of TARGETS) {
  const xy = coord(target.cell);
  const dynamic = D.runDynamicBranch(base, { cell: target.cell, digit: target.digit, value: true }, {
    directSteps: 32,
    nestedSteps: 6,
    candidateBudget: 12,
    seedBudget: 6,
    innerSteps: 24,
  });
  const nested = N.runNestedBranch(base, { cell: target.cell, digit: target.digit, value: true }, {
    directSteps: 32,
    nestedSteps: 2,
    dynamicCandidateBudget: 8,
    dynamicNestedSteps: 4,
    dynamicInnerSteps: 16,
    workBudget: 12,
  });
  rows.push({
    ...target,
    ...xy,
    exactSolutionsUnderAssumption: exactSolutionsUnderAssumption(base, target),
    dynamic: summarizeBranch(dynamic),
    nested: summarizeBranch(nested),
  });
}

console.log(`CLASSIC_H8_TARGETED_DYNAMIC_NESTED ${JSON.stringify({
  id: TARGET_ID,
  baselineStatus: evaluated.solveStatus,
  baselineSteps: evaluated.totalSteps,
  targetCount: rows.length,
  dynamicContradictions: rows.filter((x) => x.dynamic.status === 'CONTRADICTION').length,
  nestedContradictions: rows.filter((x) => x.nested.status === 'CONTRADICTION').length,
  rows,
})}`);
