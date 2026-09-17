import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const corpus = require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C = require('../games/classic-human/contracts.js');
const H = require('../games/classic-human/index.js');

const MAX_FALSE_PROBES = 72;
const TARGET_ID = process.argv[2] || null;
const records = TARGET_ID ? corpus.filter((rec) => rec.id === TARGET_ID) : corpus;
if (TARGET_ID && records.length === 0) throw new Error(`unknown curated benchmark: ${TARGET_ID}`);
const CHEAP_OPTIONS = Object.freeze({
  allowUniqueness: true,
  allowServerPreferred: false,
  allowServerOnly: false,
});
const MAX_PROFILE = Object.freeze({
  allowUniqueness: true,
  allowServerPreferred: true,
  allowServerOnly: true,
  finderOptions: Object.freeze({
    'forcing-chain': Object.freeze({ maxSteps: 32, candidateBudget: 24 }),
    'forcing-net': Object.freeze({ maxSteps: 32, seedBudget: 12 }),
    'digit-forcing-chain': Object.freeze({ maxSteps: 32 }),
    'digit-forcing-net': Object.freeze({ maxSteps: 32 }),
  }),
});

function replayToStall(record) {
  const state = new H.ClassicHumanState(record.puzzle);
  const steps = [];
  while (state.valid && !state.isSolved() && steps.length < 10000) {
    const d = H.findNext(state, MAX_PROFILE);
    if (!d || !state.apply(d)) break;
    steps.push(d);
  }
  return { state, steps };
}

function replayTrace(record, steps) {
  const state = new H.ClassicHumanState(record.puzzle);
  for (const step of steps) {
    if (!state.apply(step)) throw new Error(`${record.id}: trace replay failed`);
  }
  return state;
}

function falseCandidates(state) {
  const grid = state.cloneGrid();
  const out = [];
  for (let cell = 0; cell < 81; cell += 1) {
    const [r, c] = C.rowCol(cell);
    if (grid[r][c]) continue;
    for (const digit of C.digitsFromMask(state.masks[cell])) {
      const probe = grid.map((row) => row.slice());
      probe[r][c] = digit;
      if (C.countSolutions(probe, 1) === 0) out.push({ cell, digit, row: r + 1, col: c + 1 });
    }
  }
  return out;
}

function balancedSample(items, limit) {
  if (items.length <= limit) return items.slice();
  const buckets = Array.from({ length: 9 }, () => []);
  for (const item of items) buckets[item.digit - 1].push(item);
  const out = [];
  let cursor = 0;
  while (out.length < limit) {
    let added = false;
    for (let d = 0; d < 9 && out.length < limit; d += 1) {
      if (cursor < buckets[d].length) {
        out.push(buckets[d][cursor]);
        added = true;
      }
    }
    if (!added) break;
    cursor += 1;
  }
  return out;
}

function actionCount(d) {
  return (d?.placements?.length || 0) + (d?.eliminations?.length || 0);
}

for (const record of records) {
  const started = performance.now();
  const baseline = replayToStall(record);
  const falses = falseCandidates(baseline.state);
  const sample = balancedSample(falses, MAX_FALSE_PROBES);
  const unlocks = [];
  const techniqueCounts = {};

  for (const item of sample) {
    const state = replayTrace(record, baseline.steps);
    if (!state.eliminate(item.cell, item.digit)) continue;
    const next = H.findNext(state, CHEAP_OPTIONS);
    if (!next) continue;
    const row = {
      removed: item,
      unlockTechnique: next.techniqueId,
      actions: actionCount(next),
      placements: next.placements?.length || 0,
      eliminations: next.eliminations?.length || 0,
    };
    unlocks.push(row);
    techniqueCounts[next.techniqueId] = (techniqueCounts[next.techniqueId] || 0) + 1;
  }

  unlocks.sort((a, b) =>
    b.actions - a.actions ||
    a.unlockTechnique.localeCompare(b.unlockTechnique) ||
    a.removed.cell - b.removed.cell ||
    a.removed.digit - b.removed.digit
  );

  console.log(`CLASSIC_POST40_FRONTIER_UNLOCK ${JSON.stringify({
    id: record.id,
    baselineSteps: baseline.steps.length,
    exactFalseCandidateCount: falses.length,
    probedFalseCandidates: sample.length,
    cheapEligibleFinders: H.eligibleFinders(CHEAP_OPTIONS).length,
    unlockCount: unlocks.length,
    unlockRate: sample.length ? Math.round((unlocks.length / sample.length) * 10000) / 10000 : 0,
    unlockTechniqueCounts: techniqueCounts,
    topUnlocks: unlocks.slice(0, 16),
    elapsedMs: Math.round((performance.now() - started) * 10) / 10,
  })}`);
}
