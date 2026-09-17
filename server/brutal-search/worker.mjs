import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { createPostgresStore } from './lib/postgres-store.js';
import { runWorkerIteration } from './lib/worker-core.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function envInt(name, fallback, min, max) {
  const raw = process.env[name];
  const value = raw == null || raw === '' ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} must be an integer in [${min}, ${max}]`);
  }
  return value;
}

function pressureGateFactory() {
  const cpuCount = Math.max(1, os.cpus().length);
  const loadPerCpuLimit = Number(process.env.ILDI_BRUTAL_LOAD_PER_CPU_LIMIT ?? '0.75');
  const minFreeMemoryMb = envInt('ILDI_BRUTAL_MIN_FREE_MEMORY_MB', 1024, 128, 1_000_000);
  return async () => {
    const loadPerCpu = os.loadavg()[0] / cpuCount;
    const freeMemoryMb = os.freemem() / 1024 / 1024;
    return loadPerCpu >= loadPerCpuLimit || freeMemoryMb < minFreeMemoryMb;
  };
}

async function main() {
  if (process.env.ILDI_BRUTAL_WORKER_ENABLED !== '1') {
    console.log('BRUTAL_WORKER:DISABLED');
    return;
  }

  const connectionString = process.env.ILDI_SUDOKU_RESEARCH_DATABASE_URL;
  const campaignId = envInt('ILDI_BRUTAL_CAMPAIGN_ID', 0, 1, Number.MAX_SAFE_INTEGER);
  const batchSize = envInt('ILDI_BRUTAL_BATCH_SIZE', 100, 1, 500);
  const leaseSeconds = envInt('ILDI_BRUTAL_LEASE_SECONDS', 120, 10, 3600);
  const sleepMs = envInt('ILDI_BRUTAL_SLEEP_MS', 5000, 250, 3_600_000);
  const backoffMs = envInt('ILDI_BRUTAL_BACKOFF_MS', 60000, 1000, 3_600_000);
  const workerId = process.env.ILDI_BRUTAL_WORKER_ID || `${os.hostname()}:${process.pid}`;
  const pipelineModule = process.env.ILDI_BRUTAL_PIPELINE_MODULE;

  if (!connectionString) throw new Error('ILDI_SUDOKU_RESEARCH_DATABASE_URL is required');
  if (!pipelineModule) throw new Error('ILDI_BRUTAL_PIPELINE_MODULE is required when worker is enabled');

  const pipeline = await import(pathToFileURL(pipelineModule).href);
  if (typeof pipeline.processBatch !== 'function') {
    throw new TypeError('pipeline module must export processBatch');
  }

  const store = createPostgresStore({ connectionString, maxConnections: 2 });
  const pressureGate = pressureGateFactory();
  let stopping = false;
  const stop = () => { stopping = true; };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);

  try {
    while (!stopping) {
      const result = await runWorkerIteration({
        store,
        campaignId,
        workerId,
        batchSize,
        leaseSeconds,
        pressureGate,
        processBatch: pipeline.processBatch,
      });

      if (result.outcome === 'TARGET_REACHED') {
        console.log('BRUTAL_WORKER:TARGET_REACHED');
        break;
      }
      if (result.outcome === 'PRESSURE_BACKOFF') {
        await sleep(backoffMs);
        continue;
      }
      if (result.outcome === 'NO_WORK') {
        await sleep(backoffMs);
        continue;
      }
      await sleep(sleepMs);
    }
  } finally {
    await store.close();
  }
}

main().catch((error) => {
  console.error(`BRUTAL_WORKER:FAIL:${error.message}`);
  process.exitCode = 1;
});
