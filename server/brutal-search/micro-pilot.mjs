import { createPostgresStore } from './lib/postgres-store.js';
import { createPersistentPhaseBPipeline } from './lib/phase-b-pipeline.js';
import { runBoundedPilot } from './lib/bounded-pilot.js';
import { sampleResources } from './lib/pilot-instrumentation.js';

const MAX_LOAD_PER_CPU = 0.75;
const MIN_FREE_MEMORY_MB = 1024;

function envInt(name, fallback, min, max) {
  const raw = process.env[name];
  const value = raw == null || raw === '' ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} must be an integer in [${min}, ${max}]`);
  }
  return value;
}

function compactReport(result, corpus, campaign) {
  const report = result.report;
  const last = report.batchMetrics.at(-1) || null;
  return {
    campaignId: campaign.id,
    stopReason: result.stopReason,
    nextSeed: result.nextSeed,
    batches: report.batches,
    elapsedMs: Math.round(report.elapsedMs),
    seedsPerSecond: Number(report.seedsPerSecond.toFixed(3)),
    fingerprintWritesPerSeed: Number(report.fingerprintWritesPerSeed.toFixed(3)),
    materializationWritesPerSeed: Number(report.materializationWritesPerSeed.toFixed(3)),
    corpusWritesPerSeed: Number(report.corpusWritesPerSeed.toFixed(3)),
    checkpointWritesPerSeed: Number(report.checkpointWritesPerSeed.toFixed(3)),
    dbWritesPerSeed: Number(report.dbWritesPerSeed.toFixed(3)),
    searched: report.totals.searchedCount,
    generated: report.totals.generatedCount,
    structuralRejects: report.totals.structuralRejectCount,
    duplicates: report.totals.duplicateCount,
    nonUnique: report.totals.nonUniqueCount,
    prescreenRejects: report.totals.prescreenRejectCount,
    fullAudit: report.totals.fullAuditCount,
    brutalRejects: report.totals.brutalRejectCount,
    candidates: report.totals.candidateCount,
    accepted: report.totals.acceptedCount,
    fingerprints: corpus.fingerprints,
    corpusRecords: corpus.records,
    loadPerCpu: last ? Number(last.resources.loadPerCpu.toFixed(3)) : null,
    freeMemoryMb: last ? Math.round(last.resources.freeMemoryMb) : null,
    rssMb: last ? Math.round(last.resources.rssMb) : null,
    nearMiss: result.diagnostics,
  };
}

async function main() {
  if (process.env.ILDI_BRUTAL_MICRO_PILOT !== '1') {
    console.log('BRUTAL_MICRO_PILOT:DISABLED');
    return;
  }

  const connectionString = process.env.ILDI_SUDOKU_RESEARCH_DATABASE_URL;
  if (!connectionString) throw new Error('ILDI_SUDOKU_RESEARCH_DATABASE_URL is required');

  const seedStart = envInt('ILDI_BRUTAL_PILOT_SEED_START', 0, 0, Number.MAX_SAFE_INTEGER - 50);
  const seedCount = envInt('ILDI_BRUTAL_PILOT_SEED_COUNT', 25, 1, 50);
  const batchSize = envInt('ILDI_BRUTAL_PILOT_BATCH_SIZE', 5, 1, 10);
  const seedEnd = seedStart + seedCount;

  const preflight = sampleResources();
  if (preflight.loadPerCpu >= MAX_LOAD_PER_CPU) {
    console.log(`BRUTAL_MICRO_PILOT:PRECHECK_STOP:LOAD_PRESSURE:${preflight.loadPerCpu.toFixed(3)}`);
    return;
  }
  if (preflight.freeMemoryMb < MIN_FREE_MEMORY_MB) {
    console.log(`BRUTAL_MICRO_PILOT:PRECHECK_STOP:MEMORY_PRESSURE:${Math.round(preflight.freeMemoryMb)}`);
    return;
  }

  const store = createPostgresStore({ connectionString, maxConnections: 2 });
  let campaign = null;
  try {
    campaign = await store.createPilotCampaign({ seedStart, seedEnd });
    const pipeline = createPersistentPhaseBPipeline({ store });
    const result = await runBoundedPilot({
      processBatch: pipeline.processBatch,
      campaign,
      seedStart,
      seedEnd,
      batchSize,
      policy: {
        maxSeeds: seedCount,
        maxBatches: Math.ceil(seedCount / batchSize),
        maxElapsedMs: 120000,
        maxBatchMs: 30000,
        maxLoadPerCpu: MAX_LOAD_PER_CPU,
        minFreeMemoryMb: MIN_FREE_MEMORY_MB,
        maxDbWritesPerSeed: 1.10,
      },
    });

    const corpus = await store.countClassicCorpus(campaign.id);
    const summary = compactReport(result, corpus, campaign);
    const terminalStatus = ['RANGE_COMPLETE', 'MAX_SEEDS', 'MAX_BATCHES'].includes(result.stopReason) ? 'COMPLETE' : 'PAUSED';
    await store.finalizePilotCampaign({
      campaignId: campaign.id,
      acceptedCount: result.report.totals.acceptedCount,
      report: summary,
      status: terminalStatus,
    });

    console.log(`BRUTAL_MICRO_PILOT:${terminalStatus}`);
    console.log(`BRUTAL_MICRO_PILOT_REPORT:${JSON.stringify(summary)}`);
  } catch (error) {
    if (campaign) {
      try {
        await store.finalizePilotCampaign({
          campaignId: campaign.id,
          acceptedCount: 0,
          report: { error: error.message },
          status: 'FAILED',
        });
      } catch (_) {}
    }
    throw error;
  } finally {
    await store.close();
  }
}

main().catch((error) => {
  console.error(`BRUTAL_MICRO_PILOT:FAIL:${error.message}`);
  process.exitCode = 1;
});
