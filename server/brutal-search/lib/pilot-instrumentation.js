import os from 'node:os';
import { performance } from 'node:perf_hooks';

const COUNTER_KEYS = Object.freeze([
  'searchedCount','generatedCount','invalidCount','structuralRejectCount','duplicateCount','nonUniqueCount',
  'prescreenRejectCount','fullAuditCount','brutalRejectCount','diversityRejectCount','candidateCount','acceptedCount',
]);

export const DEFAULT_PILOT_POLICY = Object.freeze({
  maxSeeds: 500,
  maxBatches: 10,
  maxElapsedMs: 120000,
  maxBatchMs: 30000,
  maxLoadPerCpu: 0.75,
  minFreeMemoryMb: 1024,
  maxDbWritesPerSeed: 1.10,
});

function safeInt(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative safe integer`);
  return value;
}

function finitePositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be finite and positive`);
  return value;
}

export function normalizePilotPolicy(raw = {}) {
  const policy = { ...DEFAULT_PILOT_POLICY, ...raw };
  safeInt(policy.maxSeeds, 'maxSeeds');
  safeInt(policy.maxBatches, 'maxBatches');
  finitePositive(policy.maxElapsedMs, 'maxElapsedMs');
  finitePositive(policy.maxBatchMs, 'maxBatchMs');
  finitePositive(policy.maxLoadPerCpu, 'maxLoadPerCpu');
  finitePositive(policy.minFreeMemoryMb, 'minFreeMemoryMb');
  finitePositive(policy.maxDbWritesPerSeed, 'maxDbWritesPerSeed');
  if (policy.maxSeeds < 1 || policy.maxBatches < 1) throw new RangeError('pilot limits must be at least one');
  return Object.freeze(policy);
}

export function sampleResources() {
  const cpuCount = Math.max(1, os.cpus().length);
  return Object.freeze({
    load1: os.loadavg()[0],
    loadPerCpu: os.loadavg()[0] / cpuCount,
    freeMemoryMb: os.freemem() / 1024 / 1024,
    rssMb: process.memoryUsage().rss / 1024 / 1024,
  });
}

export function emptyTotals() {
  return Object.fromEntries(COUNTER_KEYS.map((key) => [key, 0]));
}

export function addCounters(target, source = {}) {
  for (const key of COUNTER_KEYS) target[key] += safeInt(source[key] ?? 0, key);
  return target;
}

export function estimateFingerprintWrites(counters = {}) {
  return Math.max(0,
    (counters.generatedCount ?? 0) - (counters.invalidCount ?? 0) - (counters.structuralRejectCount ?? 0));
}

export function estimateMaterializationWrites(counters = {}) {
  return Math.max(0, counters.acceptedCount ?? 0);
}

export function estimateCorpusWrites(counters = {}) {
  return estimateFingerprintWrites(counters) + estimateMaterializationWrites(counters);
}

export const estimateDbWrites = estimateCorpusWrites;

export function funnelFromCounters(counters) {
  const searched = counters.searchedCount || 0;
  const fullAudit = counters.fullAuditCount || 0;
  return Object.freeze({
    searched,
    generated: counters.generatedCount || 0,
    structuralPass: Math.max(0, (counters.generatedCount || 0) - (counters.invalidCount || 0) - (counters.structuralRejectCount || 0)),
    exactUniquePass: Math.max(0, fullAudit + (counters.prescreenRejectCount || 0)),
    fullAudit,
    candidate: counters.candidateCount || 0,
    accepted: counters.acceptedCount || 0,
    acceptancePerSeed: searched ? (counters.acceptedCount || 0) / searched : 0,
    fullAuditPerSeed: searched ? fullAudit / searched : 0,
  });
}

export function evaluatePilotStop({ policy, totals, batches, elapsedMs, lastBatchMs, resources, fingerprintWrites }) {
  if (totals.searchedCount >= policy.maxSeeds) return 'MAX_SEEDS';
  if (batches >= policy.maxBatches) return 'MAX_BATCHES';
  if (elapsedMs >= policy.maxElapsedMs) return 'MAX_ELAPSED';
  if (lastBatchMs > policy.maxBatchMs) return 'BATCH_LATENCY';
  if (resources.loadPerCpu >= policy.maxLoadPerCpu) return 'LOAD_PRESSURE';
  if (resources.freeMemoryMb < policy.minFreeMemoryMb) return 'MEMORY_PRESSURE';
  const writesPerSeed = totals.searchedCount ? fingerprintWrites / totals.searchedCount : 0;
  if (writesPerSeed > policy.maxDbWritesPerSeed) return 'DB_WRITE_RATE';
  return null;
}

export function createPilotObserver({ policy: rawPolicy, clock = () => performance.now(), resourceSampler = sampleResources } = {}) {
  const policy = normalizePilotPolicy(rawPolicy);
  const totals = emptyTotals();
  const startedAt = clock();
  let batches = 0;
  let fingerprintWrites = 0;
  let materializationWrites = 0;
  let checkpointWrites = 0;
  let lastBatchStart = null;
  let lastBatchMs = 0;
  const batchMetrics = [];

  function beginBatch() {
    lastBatchStart = clock();
  }

  function endBatch(counters) {
    if (lastBatchStart == null) throw new Error('beginBatch must be called before endBatch');
    lastBatchMs = Math.max(0, clock() - lastBatchStart);
    lastBatchStart = null;
    batches += 1;
    addCounters(totals, counters);
    const estimatedFingerprintWrites = estimateFingerprintWrites(counters);
    const estimatedMaterializationWrites = estimateMaterializationWrites(counters);
    const estimatedCorpusWrites = estimatedFingerprintWrites + estimatedMaterializationWrites;
    fingerprintWrites += estimatedFingerprintWrites;
    materializationWrites += estimatedMaterializationWrites;
    checkpointWrites += 1;
    const resources = resourceSampler();
    const elapsedMs = Math.max(0, clock() - startedAt);
    const stopReason = evaluatePilotStop({ policy, totals, batches, elapsedMs, lastBatchMs, resources, fingerprintWrites });
    const metric = Object.freeze({
      batch: batches,
      batchMs: lastBatchMs,
      elapsedMs,
      seeds: counters.searchedCount || 0,
      seedsPerSecond: lastBatchMs > 0 ? ((counters.searchedCount || 0) * 1000) / lastBatchMs : 0,
      estimatedFingerprintWrites,
      estimatedMaterializationWrites,
      estimatedCorpusWrites,
      estimatedCheckpointWrites: 1,
      estimatedDbWrites: estimatedCorpusWrites + 1,
      resources,
      stopReason,
    });
    batchMetrics.push(metric);
    return metric;
  }

  function snapshot() {
    const elapsedMs = Math.max(0, clock() - startedAt);
    const corpusWrites = fingerprintWrites + materializationWrites;
    const estimatedDbWrites = corpusWrites + checkpointWrites;
    return Object.freeze({
      policy,
      batches,
      elapsedMs,
      totals: Object.freeze({ ...totals }),
      funnel: funnelFromCounters(totals),
      estimatedFingerprintWrites: fingerprintWrites,
      estimatedMaterializationWrites: materializationWrites,
      estimatedCorpusWrites: corpusWrites,
      estimatedCheckpointWrites: checkpointWrites,
      estimatedDbWrites,
      fingerprintWritesPerSeed: totals.searchedCount ? fingerprintWrites / totals.searchedCount : 0,
      materializationWritesPerSeed: totals.searchedCount ? materializationWrites / totals.searchedCount : 0,
      corpusWritesPerSeed: totals.searchedCount ? corpusWrites / totals.searchedCount : 0,
      checkpointWritesPerSeed: totals.searchedCount ? checkpointWrites / totals.searchedCount : 0,
      dbWritesPerSeed: totals.searchedCount ? estimatedDbWrites / totals.searchedCount : 0,
      seedsPerSecond: elapsedMs > 0 ? (totals.searchedCount * 1000) / elapsedMs : 0,
      batchMetrics: Object.freeze(batchMetrics.slice()),
    });
  }

  return Object.freeze({ beginBatch, endBatch, snapshot, policy });
}
