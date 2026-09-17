export function enumerateSeedShards({ seedStart = 0, seedEnd, shardSize }) {
  if (!Number.isSafeInteger(seedStart) || seedStart < 0) throw new TypeError('seedStart must be a non-negative safe integer');
  if (!Number.isSafeInteger(seedEnd) || seedEnd <= seedStart) throw new TypeError('seedEnd must be greater than seedStart');
  if (!Number.isSafeInteger(shardSize) || shardSize <= 0) throw new TypeError('shardSize must be a positive safe integer');

  const shards = [];
  let shardId = 0;
  for (let start = seedStart; start < seedEnd; start += shardSize) {
    const end = Math.min(seedEnd, start + shardSize);
    shards.push({
      shardId,
      seedStart: start,
      seedEnd: end,
      nextSeed: start,
    });
    shardId += 1;
  }
  return shards;
}

export function boundedBatchRange(shard, batchSize) {
  if (!shard || !Number.isSafeInteger(shard.nextSeed) || !Number.isSafeInteger(shard.seedEnd)) {
    throw new TypeError('valid shard checkpoint required');
  }
  if (!Number.isSafeInteger(batchSize) || batchSize <= 0) throw new TypeError('batchSize must be a positive safe integer');
  if (shard.nextSeed > shard.seedEnd) throw new RangeError('nextSeed cannot exceed seedEnd');

  return {
    seedStart: shard.nextSeed,
    seedEnd: Math.min(shard.seedEnd, shard.nextSeed + batchSize),
  };
}
