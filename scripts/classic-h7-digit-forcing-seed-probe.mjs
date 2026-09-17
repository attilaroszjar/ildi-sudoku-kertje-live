import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { GOLDEN_PROFILES, evaluateGoldenPuzzle } from '../server/brutal-search/lib/golden-benchmark-audit.js';

const require = createRequire(import.meta.url);
const corpus = require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C = require('../games/classic-human/contracts.js');
const H = require('../games/classic-human/index.js');
const DF = require('../games/classic-human/digit-forcing.js');

const targetId = process.argv[2] || 'ai-escargot-2006';
const record = corpus.find((x) => x.id === targetId);
if (!record) throw new Error(`unknown benchmark: ${targetId}`);

function replayState(puzzle, trace) {
  const state = new H.ClassicHumanState(puzzle);
  for (const step of trace || []) if (!state.apply(step)) throw new Error('trace replay failed');
  return state;
}

function allSeeds(state, arity) {
  const types = ['row', 'column', 'box'];
  const out = [];
  for (const houseType of types) {
    for (let houseIndex = 0; houseIndex < 9; houseIndex += 1) {
      for (let digit = 1; digit <= 9; digit += 1) {
        const positions = DF.candidatePositions(state, houseType, houseIndex, digit);
        if (positions.length === arity) out.push({ houseType, houseIndex, digit, positions });
      }
    }
  }
  return out;
}

function actionKey(x) { return `${x.cell}:${x.digit}`; }
function exactFalseCandidates(state) {
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

function summarizeSeed(seed, result, falseSet, index) {
  const falseElims = (result.eliminations || []).filter((x) => falseSet.has(actionKey(x)));
  return {
    index,
    house: `${seed.houseType[0]}${seed.houseIndex + 1}`,
    digit: seed.digit,
    positions: seed.positions,
    status: result.status,
    placements: (result.placements || []).length,
    eliminations: (result.eliminations || []).length,
    falseEliminations: falseElims.length,
    falseExamples: falseElims.slice(0, 6),
  };
}

const started = performance.now();
const evaluated = evaluateGoldenPuzzle(record.puzzle, GOLDEN_PROFILES.MAX_CAPABILITY);
const state = replayState(record.puzzle, evaluated.trace);
const falseSet = exactFalseCandidates(state);
const rows = [];

for (const arity of [2, 3]) {
  const seeds = allSeeds(state, arity);
  const defaultBudget = arity === 2 ? 16 : 12;
  const hits = [];
  for (let i = 0; i < seeds.length; i += 1) {
    const result = DF.analyzeSeed(state, seeds[i], { maxSteps: 32 });
    const row = summarizeSeed(seeds[i], result, falseSet, i + 1);
    if (row.placements || row.eliminations) hits.push(row);
  }
  rows.push({
    arity,
    seedCount: seeds.length,
    defaultBudget,
    actionableSeeds: hits.length,
    actionableWithinDefaultBudget: hits.filter((x) => x.index <= defaultBudget).length,
    actionableBeyondDefaultBudget: hits.filter((x) => x.index > defaultBudget).length,
    firstActionableIndex: hits.length ? hits[0].index : null,
    falseEliminationSeeds: hits.filter((x) => x.falseEliminations > 0).length,
    falseEliminationBeyondDefaultBudget: hits.filter((x) => x.index > defaultBudget && x.falseEliminations > 0).length,
    topBeyondBudget: hits.filter((x) => x.index > defaultBudget).slice(0, 12),
  });
}

console.log(`CLASSIC_H7_DIGIT_FORCING_SEED_PROBE ${JSON.stringify({
  id: record.id,
  baselineStatus: evaluated.solveStatus,
  baselineSteps: evaluated.totalSteps,
  exactFalseCandidateCount: falseSet.size,
  arities: rows,
  elapsedMs: Math.round((performance.now() - started) * 10) / 10,
})}`);
