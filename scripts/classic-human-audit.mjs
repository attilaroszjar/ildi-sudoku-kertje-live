import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = join(root, 'tests');

const allTests = readdirSync(testsDir)
  .filter((name) => /^classic-human-.*\.test\.js$/.test(name))
  .sort()
  .map((name) => join('tests', name));

const expensiveNames = new Set([
  'classic-human-forcing-core.test.js',
  'classic-human-forcing-chain.test.js',
  'classic-human-forcing-net.test.js',
  'classic-human-dynamic-forcing.test.js',
  'classic-human-dynamic-forcing-chain.test.js',
  'classic-human-nested-forcing-chain.test.js',
  'classic-human-phase-f-pipeline.test.js',
  'classic-human-phase-g-pipeline.test.js'
]);
const expensiveTests = allTests.filter((path) => expensiveNames.has(path.split('/').pop()));

const fullLimitMs = Number(process.env.CLASSIC_HUMAN_FULL_LIMIT_MS || 10000);
const expensiveLimitMs = Number(process.env.CLASSIC_HUMAN_EXPENSIVE_LIMIT_MS || 5000);

function tail(text, lines = 28) {
  return String(text || '').trim().split('\n').slice(-lines).join('\n');
}

function runGate(label, files, limitMs) {
  const started = performance.now();
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=8', ...files], {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 16 * 1024 * 1024
  });
  const elapsedMs = performance.now() - started;

  if (result.status !== 0) {
    console.error(`CLASSIC_HUMAN_AUDIT ${label} FAIL rc=${result.status} elapsed_ms=${elapsedMs.toFixed(1)}`);
    const out = [tail(result.stdout), tail(result.stderr)].filter(Boolean).join('\n');
    if (out) console.error(out);
    process.exit(result.status || 1);
  }
  if (elapsedMs > limitMs) {
    console.error(`CLASSIC_HUMAN_AUDIT ${label} PERF_FAIL elapsed_ms=${elapsedMs.toFixed(1)} limit_ms=${limitMs}`);
    process.exit(2);
  }
  console.log(`CLASSIC_HUMAN_AUDIT ${label} PASS tests=${files.length} elapsed_ms=${elapsedMs.toFixed(1)} limit_ms=${limitMs}`);
}

if (!allTests.length) {
  console.error('CLASSIC_HUMAN_AUDIT FAIL no classic-human tests found');
  process.exit(1);
}
if (expensiveTests.length !== expensiveNames.size) {
  const present = new Set(expensiveTests.map((path) => path.split('/').pop()));
  const missing = [...expensiveNames].filter((name) => !present.has(name));
  console.error(`CLASSIC_HUMAN_AUDIT FAIL missing_expensive_tests=${missing.join(',')}`);
  process.exit(1);
}

runGate('A_G_FULL', allTests, fullLimitMs);
runGate('EXPENSIVE', expensiveTests, expensiveLimitMs);
console.log(`CLASSIC_HUMAN_AUDIT PASS total_files=${allTests.length} expensive_files=${expensiveTests.length}`);
