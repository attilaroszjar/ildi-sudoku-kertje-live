import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testDir = path.join(root, 'tests');

const files = fs.readdirSync(testDir)
  .filter(name => name.endsWith('.test.js'))
  .sort()
  .map(name => `tests/${name}`);

function isWallClockPerformanceTest(file) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  return (
    /performance\.now\s*\(/.test(src) ||
    /\bp95Ms\b/.test(src) ||
    /\bp95\b[\s\S]{0,160}\b1000\b/.test(src)
  );
}

const performance = files.filter(isWallClockPerformanceTest);
const functional = files.filter(file => !isWallClockPerformanceTest(file));

function run(label, selected, concurrency) {
  console.log(
    `TEST_SUITE ${label} START files=${selected.length} concurrency=${concurrency}`
  );

  const out = spawnSync(
    process.execPath,
    ['--test', `--test-concurrency=${concurrency}`, ...selected],
    {
      cwd: root,
      stdio: 'inherit'
    }
  );

  const rc = Number.isInteger(out.status) ? out.status : 1;

  console.log(`TEST_SUITE ${label} ${rc === 0 ? 'PASS' : 'FAIL'} rc=${rc}`);
  return rc;
}

const functionalRc = run('FUNCTIONAL', functional, 8);

if (functionalRc !== 0) {
  process.exitCode = functionalRc;
} else {
  const performanceRc = run('PERFORMANCE', performance, 1);
  process.exitCode = performanceRc;
}
