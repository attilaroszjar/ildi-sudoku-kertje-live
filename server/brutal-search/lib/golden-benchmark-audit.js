import { createRequire } from 'node:module';
import { censusGoldenStall } from './golden-stall-census.js';

const require = createRequire(import.meta.url);
const Contracts = require('../../../games/classic-human/contracts.js');
const Human = require('../../../games/classic-human/index.js');
const Rating = require('../../../games/classic-human/rating.js');
const PoolEvaluator = require('../../../games/classic-human/pool-evaluator.js');

const PRODUCTION_FINDER_OPTIONS = Object.freeze({
  'forcing-chain': Object.freeze({ maxSteps: 24 }),
  'forcing-net': Object.freeze({ maxSteps: 24 }),
  'digit-forcing-chain': Object.freeze({ maxSteps: 24 }),
  'digit-forcing-net': Object.freeze({ maxSteps: 24 }),
});

const MAX_CAPABILITY_FINDER_OPTIONS = Object.freeze({
  'forcing-chain': Object.freeze({ maxSteps: 32, candidateBudget: 24 }),
  'forcing-net': Object.freeze({ maxSteps: 32, seedBudget: 12 }),
  'digit-forcing-chain': Object.freeze({ maxSteps: 32 }),
  'digit-forcing-net': Object.freeze({ maxSteps: 32 }),
});

export const GOLDEN_PROFILES = Object.freeze({
  PRODUCTION_BRUTAL: Object.freeze({
    id: 'production-brutal',
    maxSteps: 10000,
    allowUniqueness: true,
    allowServerPreferred: true,
    allowServerOnly: false,
    finderOptions: PRODUCTION_FINDER_OPTIONS,
  }),
  MAX_CAPABILITY: Object.freeze({
    id: 'max-capability',
    maxSteps: 10000,
    allowUniqueness: true,
    allowServerPreferred: true,
    allowServerOnly: true,
    finderOptions: MAX_CAPABILITY_FINDER_OPTIONS,
  }),
});

function gridString(grid) {
  if (!Array.isArray(grid) || grid.length !== 9) return null;
  let out = '';
  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== 9) return null;
    for (const value of row) out += String(value || 0);
  }
  return /^[0-9]{81}$/.test(out) ? out : null;
}

function replayState(puzzle, steps) {
  const state = new Human.ClassicHumanState(puzzle);
  for (const step of steps || []) {
    if (!state.apply(step)) throw new Error('golden trace replay failed');
  }
  return state;
}

export function evaluateGoldenPuzzle(puzzle, profile = GOLDEN_PROFILES.PRODUCTION_BRUTAL) {
  const solutionCount = Contracts.countSolutions(puzzle, 2);
  const solved = Human.solve(puzzle, {
    maxSteps: profile.maxSteps,
    allowUniqueness: profile.allowUniqueness,
    allowServerPreferred: profile.allowServerPreferred,
    allowServerOnly: profile.allowServerOnly,
    finderOptions: profile.finderOptions,
  });
  const rating = Rating.rateSolve(solved);
  const finalGrid = gridString(solved.finalState);
  const stallDiagnostics = solved.status === 'STALLED'
    ? censusGoldenStall(replayState(puzzle, solved.steps), profile)
    : Object.freeze({});
  return Object.freeze({
    profile: profile.id,
    solverVersion: PoolEvaluator.SOLVER_VERSION,
    raterVersion: PoolEvaluator.RATER_VERSION,
    exactSolutionCount: solutionCount,
    solveStatus: solved.status || null,
    solvedLogically: solved.status === 'SOLVED_LOGICALLY',
    score: rating.score,
    rawScore: rating.rawScore,
    band: rating.band,
    scoreStatus: rating.scoreStatus,
    hardestTechnique: rating.hardestTechnique,
    advancedSteps: rating.advancedSteps,
    dependencyDepth: rating.dependencyDepth,
    totalSteps: rating.totalSteps,
    placements: rating.placements,
    eliminations: rating.eliminations,
    usesServerPreferred: rating.usesServerPreferred,
    usesServerOnly: rating.usesServerOnly,
    rating,
    trace: rating.trace,
    finalGrid,
    stallDiagnostics,
  });
}

export function compactGoldenResult(benchmark, result) {
  const stall = result.stallDiagnostics || {};
  return Object.freeze({
    benchmark: benchmark.benchmark_key || benchmark.benchmarkKey,
    profile: result.profile,
    unique: result.exactSolutionCount === 1,
    status: result.solveStatus,
    solved: result.solvedLogically,
    score: result.score,
    band: result.band,
    hardest: result.hardestTechnique,
    steps: result.totalSteps,
    advancedSteps: result.advancedSteps,
    dependencyDepth: result.dependencyDepth,
    serverPreferred: result.usesServerPreferred,
    serverOnly: result.usesServerOnly,
    stall: result.solveStatus === 'STALLED' ? {
      eligibleFinders: stall.eligibleFinders ?? null,
      state: stall.state ?? null,
      nonzero: stall.nonzero ?? {},
      errorCount: stall.errors ? Object.keys(stall.errors).length : 0,
      zeroCount: Array.isArray(stall.zero) ? stall.zero.length : 0,
    } : null,
  });
}
