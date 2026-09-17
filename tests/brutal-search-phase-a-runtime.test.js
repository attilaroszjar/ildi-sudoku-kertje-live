import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('server runtime dependency stays isolated from offline application package', () => {
  const rootPackage = JSON.parse(read('package.json'));
  const workerPackage = JSON.parse(read('server/brutal-search/package.json'));
  assert.equal(rootPackage.dependencies, undefined);
  assert.equal(workerPackage.type, 'module');
  assert.equal(typeof workerPackage.dependencies.pg, 'string');
});

test('PostgreSQL store caps connection pool at two', () => {
  const source = read('server/brutal-search/lib/postgres-store.js');
  assert.match(source, /maxConnections\s*=\s*2/);
  assert.match(source, /maxConnections > 2/);
  assert.match(source, /application_name:\s*'ildi-sudoku-brutal-search'/);
});

test('worker is fail-closed until explicitly enabled and requires a pipeline', () => {
  const source = read('server/brutal-search/worker.mjs');
  assert.match(source, /ILDI_BRUTAL_WORKER_ENABLED !== '1'/);
  assert.match(source, /BRUTAL_WORKER:DISABLED/);
  assert.match(source, /ILDI_BRUTAL_PIPELINE_MODULE is required/);
  assert.match(source, /ILDI_BRUTAL_BATCH_SIZE', 100, 1, 500/);
});

test('systemd unit encodes Bridge-first resource limits and canonical env path', () => {
  const unit = read('server/brutal-search/systemd/ildi-sudoku-brutal-search.service');
  assert.match(unit, /EnvironmentFile=\/home\/daniel\/infra\/env\/ildi-sudoku-brutal\.env/);
  assert.match(unit, /ExecStart=@NODE_BIN@/);
  assert.match(unit, /Nice=19/);
  assert.match(unit, /IOSchedulingClass=idle/);
  assert.match(unit, /CPUQuota=15%/);
  assert.match(unit, /MemoryMax=512M/);
  assert.match(unit, /IOWeight=10/);
  assert.match(unit, /TasksMax=32/);
});

test('service installer resolves system or NVM runtime and leaves worker disabled and inactive', () => {
  const installer = read('server/brutal-search/scripts/install-phase-a-service.sh');
  assert.match(installer, /worker-must-remain-disabled/);
  assert.match(installer, /\.nvm\/versions\/node/);
  assert.match(installer, /sort -V \| tail -n 1/);
  assert.match(installer, /NODE_DIR="\$\(dirname "\$NODE_BIN"\)"/);
  assert.match(installer, /NPM_BIN="\$NODE_DIR\/npm"/);
  assert.match(installer, /sudo -u daniel -H env PATH="\$RUNTIME_PATH" "\$NODE_BIN" worker\.mjs/);
  assert.match(installer, /sed "s\|@NODE_BIN@\|\$NODE_BIN\|g"/);
  assert.match(installer, /systemd-analyze verify/);
  assert.match(installer, /systemctl disable/);
  assert.match(installer, /systemctl stop/);
  assert.doesNotMatch(installer, /systemctl enable --now/);
  assert.doesNotMatch(installer, /systemctl start/);
});

test('PostgreSQL integration gate covers seeding resume stale lease and target stop', () => {
  const sql = read('server/brutal-search/sql/phase-a-integration.sql');
  assert.match(sql, /search\.ensure_shards/);
  assert.match(sql, /stale-reclaim/);
  assert.match(sql, /resume-checkpoint/);
  assert.match(sql, /TARGET_REACHED/);
  assert.match(sql, /claim-after-target/);
});