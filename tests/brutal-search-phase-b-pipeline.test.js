import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PHASE_B_VERSION,
  PRESCREEN_SOLVED_SCORE_FLOOR,
  REJECTION,
  createPhaseBPipeline,
  shouldAdvanceFromPrescreen,
  stablePuzzleFingerprint,
} from '../server/brutal-search/lib/phase-b-pipeline.js';

const PUZZLE = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const RECORD = Object.freeze({ puzzleHash: 'fixture', band: 'brutal' });

function acceptedAudit() {
  return { reason: 'ACCEPTED', record: RECORD };
}

function baseServices(overrides = {}) {
  return {
    generate: async (seed) => ({ puzzle: PUZZLE, seed, generatorProfile: 'fixture', targetBand: 'brutal' }),
    countSolutions: async () => 1,
    prescreen: async () => ({ pass: true }),
    fullAudit: async () => acceptedAudit(),
    claimFingerprint: async () => true,
    materialize: async () => {},
    ...overrides,
  };
}

test('stable fingerprint is deterministic and version domain is explicit', () => {
  assert.equal(stablePuzzleFingerprint(PUZZLE), stablePuzzleFingerprint(PUZZLE));
  assert.match(stablePuzzleFingerprint(PUZZLE), /^fnv1a64-v1:/);
  assert.equal(PHASE_B_VERSION, 'classic-brutal-phase-b-v1');
});

test('solved prescreen only advances the evidence-backed near-Brutal score window', () => {
  assert.equal(PRESCREEN_SOLVED_SCORE_FLOOR, 220);
  assert.equal(shouldAdvanceFromPrescreen('SOLVED_LOGICALLY', { score: 219 }), false);
  assert.equal(shouldAdvanceFromPrescreen('SOLVED_LOGICALLY', { score: 220 }), true);
  assert.equal(shouldAdvanceFromPrescreen('SOLVED_LOGICALLY', { score: 240 }), true);
});

test('incomplete prescreen remains eligible for full audit while invalid does not', () => {
  assert.equal(shouldAdvanceFromPrescreen('STALLED', { score: null }), true);
  assert.equal(shouldAdvanceFromPrescreen('STEP_LIMIT', { score: null }), true);
  assert.equal(shouldAdvanceFromPrescreen('INVALID', null), false);
});

test('cheap structural rejection happens before uniqueness or human solving', async () => {
  let uniquenessCalls = 0;
  let prescreenCalls = 0;
  const pipeline = createPhaseBPipeline(baseServices({
    generate: async () => ({ puzzle: '0'.repeat(81), generatorProfile: 'fixture', seed: 1 }),
    countSolutions: async () => { uniquenessCalls += 1; return 2; },
    prescreen: async () => { prescreenCalls += 1; return { pass: true }; },
  }));
  const out = await pipeline.processSeed(1);
  assert.equal(out.reason, REJECTION.STRUCTURAL);
  assert.equal(out.counters.structuralRejectCount, 1);
  assert.equal(uniquenessCalls, 0);
  assert.equal(prescreenCalls, 0);
});

test('duplicate rejection happens before exact uniqueness', async () => {
  let uniquenessCalls = 0;
  const pipeline = createPhaseBPipeline(baseServices({
    claimFingerprint: async () => false,
    countSolutions: async () => { uniquenessCalls += 1; return 1; },
  }));
  const out = await pipeline.processSeed(2);
  assert.equal(out.reason, REJECTION.DUPLICATE);
  assert.equal(out.counters.duplicateCount, 1);
  assert.equal(uniquenessCalls, 0);
});

test('non-unique rejection happens before human prescreen', async () => {
  let prescreenCalls = 0;
  const pipeline = createPhaseBPipeline(baseServices({
    countSolutions: async () => 2,
    prescreen: async () => { prescreenCalls += 1; return { pass: true }; },
  }));
  const out = await pipeline.processSeed(3);
  assert.equal(out.reason, REJECTION.NON_UNIQUE);
  assert.equal(out.counters.nonUniqueCount, 1);
  assert.equal(prescreenCalls, 0);
});

test('prescreen rejection prevents full audit', async () => {
  let auditCalls = 0;
  const pipeline = createPhaseBPipeline(baseServices({
    prescreen: async () => ({ pass: false, reason: 'BELOW_BRUTAL_WINDOW' }),
    fullAudit: async () => { auditCalls += 1; return acceptedAudit(); },
  }));
  const out = await pipeline.processSeed(4);
  assert.equal(out.reason, REJECTION.PRESCREEN);
  assert.equal(out.counters.prescreenRejectCount, 1);
  assert.equal(auditCalls, 0);
});

test('only full-audit ACCEPTED candidates are materialized', async () => {
  const materialized = [];
  const pipeline = createPhaseBPipeline(baseServices({
    materialize: async (row) => materialized.push(row),
  }));
  const out = await pipeline.processSeed(5, { campaign: { id: 9 } });
  assert.equal(out.reason, REJECTION.ACCEPTED);
  assert.equal(out.counters.fullAuditCount, 1);
  assert.equal(out.counters.candidateCount, 1);
  assert.equal(out.counters.acceptedCount, 1);
  assert.equal(materialized.length, 1);
  assert.equal(materialized[0].seed, 5);
  assert.equal(materialized[0].record, RECORD);
});

test('bounded batch aggregates counters and advances exactly to seedEnd', async () => {
  const pipeline = createPhaseBPipeline(baseServices({
    claimFingerprint: async ({ seed }) => seed !== 11,
    prescreen: async (_puzzle, context) => ({ pass: context.shard.shardId !== 99 }),
  }));
  const out = await pipeline.processBatch({
    campaign: { id: 1 },
    shard: { shardId: 7 },
    seedStart: 10,
    seedEnd: 13,
  });
  assert.equal(out.nextSeed, 13);
  assert.equal(out.counters.searchedCount, 3);
  assert.equal(out.counters.generatedCount, 3);
  assert.equal(out.counters.duplicateCount, 1);
  assert.equal(out.counters.fullAuditCount, 2);
  assert.equal(out.counters.acceptedCount, 2);
  assert.deepEqual(out.accepted.map((row) => row.seed), [10, 12]);
});
