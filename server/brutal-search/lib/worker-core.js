import { boundedBatchRange } from './shards.js';

export const WORKER_OUTCOME = Object.freeze({
  TARGET_REACHED: 'TARGET_REACHED',
  NO_WORK: 'NO_WORK',
  PRESSURE_BACKOFF: 'PRESSURE_BACKOFF',
  BATCH_CHECKPOINTED: 'BATCH_CHECKPOINTED',
});

export async function runWorkerIteration({
  store,
  campaignId,
  workerId,
  batchSize,
  leaseSeconds = 120,
  pressureGate = async () => false,
  processBatch,
}) {
  if (!store) throw new TypeError('store is required');
  if (typeof processBatch !== 'function') throw new TypeError('processBatch is required');

  const campaign = await store.getCampaign(campaignId);
  if (!campaign) throw new Error(`campaign not found: ${campaignId}`);
  if (campaign.acceptedCount >= campaign.targetCount || campaign.status === 'TARGET_REACHED') {
    await store.markTargetReached(campaignId);
    return { outcome: WORKER_OUTCOME.TARGET_REACHED };
  }

  if (await pressureGate()) {
    return { outcome: WORKER_OUTCOME.PRESSURE_BACKOFF };
  }

  const shard = await store.claimShard({ campaignId, workerId, leaseSeconds });
  if (!shard) return { outcome: WORKER_OUTCOME.NO_WORK };

  const range = boundedBatchRange(shard, batchSize);
  const result = await processBatch({
    campaign,
    shard,
    seedStart: range.seedStart,
    seedEnd: range.seedEnd,
  });

  if (!result || !Number.isSafeInteger(result.nextSeed)) {
    throw new TypeError('processBatch must return a safe-integer nextSeed');
  }

  const checkpoint = await store.checkpointShard({
    campaignId,
    shardId: shard.shardId,
    workerId,
    nextSeed: result.nextSeed,
    counters: result.counters ?? {},
  });

  return {
    outcome: WORKER_OUTCOME.BATCH_CHECKPOINTED,
    shardId: shard.shardId,
    seedStart: range.seedStart,
    seedEnd: range.seedEnd,
    checkpoint,
  };
}
