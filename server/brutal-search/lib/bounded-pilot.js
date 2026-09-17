import { createPilotObserver } from './pilot-instrumentation.js';
import { summarizeDiagnostics } from './near-miss-diagnostics.js';

export async function runBoundedPilot({
  processBatch,
  campaign,
  seedStart,
  seedEnd,
  batchSize = 25,
  policy,
  observer = createPilotObserver({ policy }),
}) {
  if (typeof processBatch !== 'function') throw new TypeError('processBatch is required');
  if (!Number.isSafeInteger(seedStart) || !Number.isSafeInteger(seedEnd) || seedStart < 0 || seedEnd <= seedStart) {
    throw new RangeError('invalid pilot seed range');
  }
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 100) {
    throw new RangeError('batchSize must be an integer in [1, 100]');
  }

  let nextSeed = seedStart;
  let stopReason = null;
  const diagnostics = [];
  while (nextSeed < seedEnd && !stopReason) {
    const snapshot = observer.snapshot();
    const remainingPilotSeeds = observer.policy.maxSeeds - snapshot.totals.searchedCount;
    const remainingBatches = observer.policy.maxBatches - snapshot.batches;
    if (remainingPilotSeeds <= 0) { stopReason = 'MAX_SEEDS'; break; }
    if (remainingBatches <= 0) { stopReason = 'MAX_BATCHES'; break; }

    const batchEnd = Math.min(seedEnd, nextSeed + batchSize, nextSeed + remainingPilotSeeds);
    observer.beginBatch();
    const result = await processBatch({
      campaign,
      shard: null,
      seedStart: nextSeed,
      seedEnd: batchEnd,
    });
    if (!result || result.nextSeed !== batchEnd || !result.counters) {
      throw new Error('pilot processBatch must checkpoint exactly the requested bounded range');
    }
    if (Array.isArray(result.diagnostics)) diagnostics.push(...result.diagnostics);
    const metric = observer.endBatch(result.counters);
    nextSeed = batchEnd;
    stopReason = metric.stopReason;
  }

  if (!stopReason && nextSeed >= seedEnd) stopReason = 'RANGE_COMPLETE';
  return Object.freeze({
    stopReason,
    nextSeed,
    report: observer.snapshot(),
    diagnostics: summarizeDiagnostics(diagnostics),
  });
}
