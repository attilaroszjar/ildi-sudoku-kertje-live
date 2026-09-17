import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enumerateSeedShards, boundedBatchRange } from '../server/brutal-search/lib/shards.js';
import { runWorkerIteration, WORKER_OUTCOME } from '../server/brutal-search/lib/worker-core.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function makeStore({ acceptedCount = 0, targetCount = 10, shard = null } = {}) {
  const calls = [];
  return {
    calls,
    async getCampaign() {
      return { id: 1, status: 'RUNNING', acceptedCount, targetCount };
    },
    async markTargetReached(campaignId) {
      calls.push(['markTargetReached', campaignId]);
    },
    async claimShard(args) {
      calls.push(['claimShard', args]);
      return shard;
    },
    async checkpointShard(args) {
      calls.push(['checkpointShard', args]);
      return { nextSeed: args.nextSeed };
    },
  };
}

test('deterministic shard enumeration covers seed space exactly once', () => {
  assert.deepEqual(enumerateSeedShards({ seedStart: 10, seedEnd: 35, shardSize: 8 }), [
    { shardId: 0, seedStart: 10, seedEnd: 18, nextSeed: 10 },
    { shardId: 1, seedStart: 18, seedEnd: 26, nextSeed: 18 },
    { shardId: 2, seedStart: 26, seedEnd: 34, nextSeed: 26 },
    { shardId: 3, seedStart: 34, seedEnd: 35, nextSeed: 34 },
  ]);
});

test('bounded batch resumes from persisted checkpoint without crossing shard end', () => {
  assert.deepEqual(boundedBatchRange({ nextSeed: 240, seedEnd: 1000 }, 100), { seedStart: 240, seedEnd: 340 });
  assert.deepEqual(boundedBatchRange({ nextSeed: 960, seedEnd: 1000 }, 100), { seedStart: 960, seedEnd: 1000 });
});

test('worker stops before claiming when campaign target is reached', async () => {
  const store = makeStore({ acceptedCount: 10, targetCount: 10 });
  const result = await runWorkerIteration({
    store,
    campaignId: 1,
    workerId: 'test-worker',
    batchSize: 100,
    processBatch: async () => assert.fail('must not process'),
  });
  assert.equal(result.outcome, WORKER_OUTCOME.TARGET_REACHED);
  assert.deepEqual(store.calls, [['markTargetReached', 1]]);
});

test('worker pressure gate prevents shard claim', async () => {
  const store = makeStore();
  const result = await runWorkerIteration({
    store,
    campaignId: 1,
    workerId: 'test-worker',
    batchSize: 100,
    pressureGate: async () => true,
    processBatch: async () => assert.fail('must not process'),
  });
  assert.equal(result.outcome, WORKER_OUTCOME.PRESSURE_BACKOFF);
  assert.equal(store.calls.length, 0);
});

test('worker checkpoints only the bounded processed range', async () => {
  const store = makeStore({ shard: { shardId: 7, nextSeed: 450, seedEnd: 1000 } });
  const result = await runWorkerIteration({
    store,
    campaignId: 1,
    workerId: 'test-worker',
    batchSize: 100,
    processBatch: async ({ seedStart, seedEnd }) => {
      assert.equal(seedStart, 450);
      assert.equal(seedEnd, 550);
      return { nextSeed: 550, counters: { searchedDelta: 100 } };
    },
  });
  assert.equal(result.outcome, WORKER_OUTCOME.BATCH_CHECKPOINTED);
  assert.equal(store.calls[1][0], 'checkpointShard');
  assert.equal(store.calls[1][1].nextSeed, 550);
});

test('PostgreSQL migration encodes non-overlap, stale-lease recovery and monotonic checkpoint semantics', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'server/brutal-search/migrations/002_shard_leasing.sql'), 'utf8');
  assert.match(sql, /FOR UPDATE OF s SKIP LOCKED/);
  assert.match(sql, /lease_expires_at <= v_now/);
  assert.match(sql, /p_next_seed < v_shard\.next_seed/);
  assert.match(sql, /accepted_count >= c\.target_count/);
  assert.match(sql, /status = 'TARGET_REACHED'/);
});
