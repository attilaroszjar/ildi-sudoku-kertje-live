import { createRequire } from 'node:module';
import { createSeedDiagnostic } from './near-miss-diagnostics.js';

const require = createRequire(import.meta.url);
const Generator = require('../../../games/classic-human/generator-adapter.js');
const Contracts = require('../../../games/classic-human/contracts.js');
const Human = require('../../../games/classic-human/index.js');
const Rating = require('../../../games/classic-human/rating.js');
const PoolEvaluator = require('../../../games/classic-human/pool-evaluator.js');
const PoolRecord = require('../../../games/classic-human/pool-record.js');

export const PHASE_B_VERSION = 'classic-brutal-phase-b-v1';
export const SOURCE_BAND = 'expert';
export const TARGET_BAND = 'brutal';
export const PRESCREEN_MAX_STEPS = 200;
export const PRESCREEN_SOLVED_SCORE_FLOOR = 220;
export const FULL_AUDIT_MAX_STEPS = 10000;

export const REJECTION = Object.freeze({
  INVALID: 'INVALID',
  STRUCTURAL: 'STRUCTURAL',
  DUPLICATE: 'DUPLICATE',
  NON_UNIQUE: 'NON_UNIQUE',
  PRESCREEN: 'PRESCREEN',
  BRUTAL_MISMATCH: 'BRUTAL_MISMATCH',
  ACCEPTED: 'ACCEPTED',
});

export function emptyCounters() {
  return {
    searchedCount: 0,
    generatedCount: 0,
    invalidCount: 0,
    structuralRejectCount: 0,
    duplicateCount: 0,
    nonUniqueCount: 0,
    prescreenRejectCount: 0,
    fullAuditCount: 0,
    brutalRejectCount: 0,
    diversityRejectCount: 0,
    candidateCount: 0,
    acceptedCount: 0,
  };
}

export function normalizePuzzle(value) {
  return PoolRecord.normalizePuzzle(value);
}

export function clueCount(puzzle) {
  return normalizePuzzle(puzzle).split('').reduce((sum, value) => sum + (value === '0' ? 0 : 1), 0);
}

export function stablePuzzleFingerprint(puzzle) {
  return PoolRecord.stableHash(normalizePuzzle(puzzle));
}

export function structuralFilter(puzzle, { minClues = 17, maxClues = 40 } = {}) {
  let normalized;
  try {
    normalized = normalizePuzzle(puzzle);
    const state = new Contracts.ClassicCandidateState(normalized);
    if (!state.valid) return { pass: false, reason: 'INVALID_GRID' };
  } catch (_) {
    return { pass: false, reason: 'INVALID_GRID' };
  }
  const clues = clueCount(normalized);
  if (clues < minClues || clues > maxClues) return { pass: false, reason: 'CLUE_WINDOW', clueCount: clues };
  return { pass: true, puzzle: normalized, clueCount: clues };
}

export function defaultGenerate(seed) {
  const generated = Generator.makeCandidate(seed, SOURCE_BAND);
  return {
    ...generated,
    targetBand: TARGET_BAND,
    generatorProfile: `${generated.generatorProfile}|${PHASE_B_VERSION}`,
  };
}

export function shouldAdvanceFromPrescreen(status, rating) {
  if (status === 'INVALID') return false;
  if (status !== 'SOLVED_LOGICALLY') return true;
  return Number.isFinite(rating && rating.score) && rating.score >= PRESCREEN_SOLVED_SCORE_FLOOR;
}

export function defaultPrescreen(puzzle) {
  const solved = Human.solve(puzzle, {
    maxSteps: PRESCREEN_MAX_STEPS,
    allowUniqueness: true,
    allowServerPreferred: false,
    allowServerOnly: false,
  });
  if (solved.status === 'INVALID') return { pass: false, reason: 'INVALID', status: solved.status, rating: null };
  const rating = Rating.rateSolve(solved);
  const pass = shouldAdvanceFromPrescreen(solved.status, rating);
  return {
    pass,
    reason: pass ? null : 'BELOW_BRUTAL_WINDOW',
    status: solved.status,
    rating,
  };
}

export function defaultFullAudit(candidate) {
  return PoolEvaluator.evaluatePoolCandidate({
    ...candidate,
    targetBand: TARGET_BAND,
    solverOptions: {
      maxSteps: FULL_AUDIT_MAX_STEPS,
      allowUniqueness: true,
      allowServerPreferred: true,
      allowServerOnly: false,
    },
  });
}

function increment(counters, name) {
  counters[name] += 1;
}

export function createPhaseBPipeline({
  generate = defaultGenerate,
  countSolutions = (puzzle) => Contracts.countSolutions(puzzle, 2),
  prescreen = defaultPrescreen,
  fullAudit = defaultFullAudit,
  claimFingerprint = async () => true,
  materialize = async () => {},
  structuralOptions,
} = {}) {
  async function processSeed(seed, context = {}) {
    const counters = emptyCounters();
    increment(counters, 'searchedCount');

    let candidate;
    try {
      candidate = await generate(seed, context);
      increment(counters, 'generatedCount');
    } catch (_) {
      increment(counters, 'invalidCount');
      return { reason: REJECTION.INVALID, counters };
    }

    const structural = structuralFilter(candidate && candidate.puzzle, structuralOptions);
    if (!structural.pass) {
      increment(counters, structural.reason === 'INVALID_GRID' ? 'invalidCount' : 'structuralRejectCount');
      return { reason: structural.reason === 'INVALID_GRID' ? REJECTION.INVALID : REJECTION.STRUCTURAL, counters };
    }

    const fingerprint = stablePuzzleFingerprint(structural.puzzle);
    const claimed = await claimFingerprint({
      domain: PHASE_B_VERSION,
      fingerprint,
      seed,
      campaign: context.campaign || null,
    });
    if (!claimed) {
      increment(counters, 'duplicateCount');
      return { reason: REJECTION.DUPLICATE, fingerprint, counters };
    }

    const solutions = await countSolutions(structural.puzzle);
    if (solutions !== 1) {
      increment(counters, 'nonUniqueCount');
      return { reason: REJECTION.NON_UNIQUE, fingerprint, solutionCount: solutions, counters };
    }

    const pre = await prescreen(structural.puzzle, context);
    const prescreenDiagnostic = createSeedDiagnostic({ seed, fingerprint, prescreen: pre || null });
    if (!pre || pre.pass !== true) {
      increment(counters, 'prescreenRejectCount');
      return { reason: REJECTION.PRESCREEN, fingerprint, diagnostic: prescreenDiagnostic, counters };
    }

    increment(counters, 'fullAuditCount');
    const audit = await fullAudit({
      ...candidate,
      puzzle: structural.puzzle,
      targetBand: TARGET_BAND,
    }, context);
    const diagnostic = createSeedDiagnostic({ seed, fingerprint, prescreen: pre, audit });

    if (!audit || audit.reason !== PoolEvaluator.REASONS.ACCEPTED || !audit.record) {
      if (audit && audit.reason === PoolEvaluator.REASONS.INVALID) increment(counters, 'invalidCount');
      else increment(counters, 'brutalRejectCount');
      return { reason: REJECTION.BRUTAL_MISMATCH, fingerprint, diagnostic, counters };
    }

    increment(counters, 'candidateCount');
    await materialize({
      fingerprint,
      seed,
      clueCount: structural.clueCount,
      record: audit.record,
      campaign: context.campaign || null,
    });
    increment(counters, 'acceptedCount');
    return { reason: REJECTION.ACCEPTED, fingerprint, record: audit.record, diagnostic, counters };
  }

  async function processBatch({ campaign, shard, seedStart, seedEnd }) {
    if (!Number.isSafeInteger(seedStart) || !Number.isSafeInteger(seedEnd) || seedEnd < seedStart) {
      throw new RangeError('invalid seed batch');
    }
    const counters = emptyCounters();
    const accepted = [];
    const diagnostics = [];
    for (let seed = seedStart; seed < seedEnd; seed += 1) {
      const result = await processSeed(seed, { campaign, shard });
      for (const key of Object.keys(counters)) counters[key] += result.counters[key] || 0;
      if (result.diagnostic) diagnostics.push(result.diagnostic);
      if (result.reason === REJECTION.ACCEPTED) accepted.push({ seed, fingerprint: result.fingerprint, record: result.record });
    }
    return { nextSeed: seedEnd, counters, accepted, diagnostics };
  }

  return { processSeed, processBatch };
}

export function createPersistentPhaseBPipeline({ store, ...options } = {}) {
  if (!store || typeof store.claimClassicFingerprint !== 'function' || typeof store.materializeClassicBrutalRecord !== 'function') {
    throw new TypeError('persistent Phase B pipeline requires a corpus-capable store');
  }
  return createPhaseBPipeline({
    ...options,
    claimFingerprint: async ({ domain, fingerprint, seed, campaign }) => {
      if (!campaign || !Number.isSafeInteger(campaign.id)) throw new TypeError('campaign.id is required for persistent fingerprinting');
      return store.claimClassicFingerprint({ domain, fingerprint, campaignId: campaign.id, seed });
    },
    materialize: async ({ fingerprint, seed, clueCount, record, campaign }) => {
      if (!campaign || !Number.isSafeInteger(campaign.id)) throw new TypeError('campaign.id is required for persistent materialization');
      await store.materializeClassicBrutalRecord({ campaignId: campaign.id, seed, fingerprint, clueCount, record });
    },
  });
}
