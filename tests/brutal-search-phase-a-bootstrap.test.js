import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const bootstrap = fs.readFileSync(
  new URL('../server/brutal-search/scripts/bootstrap-phase-a-db.sh', import.meta.url),
  'utf8',
);

test('bootstrap isolates Brutal search database and credentials', () => {
  assert.match(bootstrap, /DB_NAME="ildi_sudoku_research"/);
  assert.match(bootstrap, /ROLE_NAME="ildi_sudoku_worker"/);
  assert.match(bootstrap, /NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION/);
  assert.match(bootstrap, /REVOKE ALL ON DATABASE \$\{DB_NAME\} FROM PUBLIC/);
  assert.match(bootstrap, /ENV_DIR="\/home\/daniel\/infra\/env"/);
  assert.match(bootstrap, /ENV_FILE="\$ENV_DIR\/ildi-sudoku-brutal\.env"/);
  assert.match(bootstrap, /install -m 0600 -o daniel -g daniel/);
  assert.doesNotMatch(bootstrap, /PASSWORD="[^$][^"]+"/);
});

test('bootstrap pins host PostgreSQL endpoint and validates worker auth before migrations', () => {
  assert.match(bootstrap, /PG_HOST="127\.0\.0\.1"/);
  assert.match(bootstrap, /PG_PORT="5433"/);
  assert.match(bootstrap, /pg_isready -h "\$PG_HOST" -p "\$PG_PORT"/);
  assert.match(bootstrap, /WORKER_AUTH:OK/);
  assert.match(bootstrap, /BOOTSTRAP:FAIL:worker-auth/);
  assert.match(bootstrap, /postgresql:\/\/%s:%s@%s:%s\/%s/);
});

test('bootstrap applies migrations in lexical order and runs rollback gate', () => {
  assert.match(bootstrap, /for migration in "\$MIGRATIONS_DIR"\/\*\.sql/);
  assert.match(bootstrap, /phase-a-integration\.sql/);
  assert.match(bootstrap, /BOOTSTRAP:PASS/);
});
