import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const corpus = require('../tests/fixtures/classic-curated-brutal-benchmarks.json');
const C = require('../games/classic-human/contracts.js');
const H = require('../games/classic-human/index.js');

const TARGET_ID = 'ai-escargot-2006';
const TARGET = Object.freeze({ cell: 43, digit: 5 }); // r5c8!=5 exact frontier elimination
const record = corpus.find((x) => x.id === TARGET_ID);
if (!record) throw new Error(`missing benchmark ${TARGET_ID}`);

const options = Object.freeze({
  allowUniqueness: true,
  allowServerPreferred: true,
  allowServerOnly: true,
  finderOptions: Object.freeze({
    'forcing-chain': Object.freeze({ maxSteps: 32, candidateBudget: 24 }),
    'forcing-net': Object.freeze({ maxSteps: 32, seedBudget: 12 }),
    'digit-forcing-chain': Object.freeze({ maxSteps: 32 }),
    'digit-forcing-net': Object.freeze({ maxSteps: 32 }),
    'dynamic-forcing-chain': Object.freeze({
      directSteps: 32,
      nestedSteps: 6,
      innerCandidateBudget: 12,
      innerSeedBudget: 6,
      innerSteps: 24,
      candidateBudget: 16,
    }),
    'nested-forcing-chain': Object.freeze({
      seeds: Object.freeze([TARGET]),
      directSteps: 32,
      nestedSteps: 2,
      dynamicCandidateBudget: 8,
      dynamicNestedSteps: 4,
      dynamicInnerSteps: 16,
      workBudget: 12,
    }),
  }),
});

function label(action, relation) {
  const [r, c] = C.rowCol(action.cell);
  return `r${r + 1}c${c + 1}${relation}${action.digit}`;
}

function unresolved(finalState) {
  let n = 0;
  for (const row of finalState) for (const v of row) if (!v) n += 1;
  return n;
}

const started = performance.now();
const result = H.solve(record.puzzle, options);
const nestedIndexes = [];
const counts = {};
for (let i = 0; i < result.steps.length; i += 1) {
  const step = result.steps[i];
  counts[step.techniqueId] = (counts[step.techniqueId] || 0) + 1;
  if (step.techniqueId === 'nested-forcing-chain') nestedIndexes.push(i);
}
const firstNestedIndex = nestedIndexes.length ? nestedIndexes[0] : null;
const firstNested = firstNestedIndex == null ? null : result.steps[firstNestedIndex];
const targetEliminated = result.steps.some((step) =>
  (step.eliminations || []).some((e) => e.cell === TARGET.cell && e.digit === TARGET.digit)
);

console.log(`CLASSIC_H8_NESTED_SEED_INJECTION ${JSON.stringify({
  id: TARGET_ID,
  injectedSeed: { row: 5, col: 8, digit: 5 },
  status: result.status,
  totalSteps: result.steps.length,
  unresolved: unresolved(result.finalState),
  targetEliminated,
  nestedUses: nestedIndexes.length,
  firstNestedStep: firstNestedIndex == null ? null : firstNestedIndex + 1,
  firstNested: firstNested ? {
    placements: (firstNested.placements || []).map((x) => label(x, '=')),
    eliminations: (firstNested.eliminations || []).map((x) => label(x, '!=')),
    complexity: firstNested.complexity || null,
    explanationData: firstNested.explanationData || null,
  } : null,
  techniqueCounts: counts,
  elapsedMs: Math.round((performance.now() - started) * 10) / 10,
})}`);
