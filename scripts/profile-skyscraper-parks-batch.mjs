import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profiler = path.join(root, 'scripts', 'profile-skyscraper-parks-current.mjs');
const seeds = process.argv.slice(2).length
  ? process.argv.slice(2).map((value) => Number(value) >>> 0)
  : [92001, 92002, 92003, 92004, 92005];

const rows = [];
let failed = false;

for (const seed of seeds) {
  const run = spawnSync(process.execPath, [profiler, String(seed)], {
    cwd: root,
    encoding: 'utf8'
  });

  const stdout = run.stdout || '';
  const line = stdout.split(/\r?\n/).find((entry) => entry.startsWith('SKYSCRAPER_PARKS_CURRENT_HOST_REALM '));
  if (!line) {
    console.error(`SKYSCRAPER_PARKS_BATCH seed=${seed} missing profiler summary`);
    if (run.stderr) process.stderr.write(run.stderr);
    failed = true;
    continue;
  }

  let summary;
  try {
    summary = JSON.parse(line.slice('SKYSCRAPER_PARKS_CURRENT_HOST_REALM '.length));
  } catch (error) {
    console.error(`SKYSCRAPER_PARKS_BATCH seed=${seed} invalid profiler JSON: ${error.message}`);
    failed = true;
    continue;
  }

  const pass = run.status === 0
    && summary.unique === true
    && summary.variantEssential === true
    && summary.parkSolutions === 1
    && summary.parkBaseSolutions > 1
    && summary.productionArcLoaded === true;

  rows.push({
    seed,
    givens: summary.givens,
    generationMs: summary.generationMs,
    verifyMs: summary.verifyMs,
    parkSolutions: summary.parkSolutions,
    parkBaseSolutions: summary.parkBaseSolutions,
    genericVariantSolutions: summary.genericVariantSolutions,
    pass
  });

  if (!pass) failed = true;
}

const generationTimes = rows.map((row) => row.generationMs).filter(Number.isFinite);
const summary = {
  seeds: rows.length,
  passed: rows.filter((row) => row.pass).length,
  maxGenerationMs: generationTimes.length ? Math.max(...generationTimes) : null,
  avgGenerationMs: generationTimes.length
    ? Number((generationTimes.reduce((sum, value) => sum + value, 0) / generationTimes.length).toFixed(1))
    : null,
  rows
};

console.log('SKYSCRAPER_PARKS_BATCH_HOST_REALM', JSON.stringify(summary));
console.log('SKYSCRAPER_PARKS_BATCH_HOST_REALM_GATE:' + (!failed && rows.length === seeds.length ? 'PASS' : 'FAIL'));

if (failed || rows.length !== seeds.length) process.exitCode = 1;
