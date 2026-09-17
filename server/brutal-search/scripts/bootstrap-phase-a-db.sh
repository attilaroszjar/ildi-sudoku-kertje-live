#!/usr/bin/env bash
set -euo pipefail

DB_NAME="ildi_sudoku_research"
ROLE_NAME="ildi_sudoku_worker"
PG_HOST="127.0.0.1"
PG_PORT="5433"
ENV_DIR="/home/daniel/infra/env"
ENV_FILE="$ENV_DIR/ildi-sudoku-brutal.env"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/migrations"
GATE_SQL="$ROOT_DIR/sql/phase-a-integration.sql"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "BOOTSTRAP:FAIL:run-as-root"
  exit 1
fi

for cmd in sudo psql createdb openssl install pg_isready; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "BOOTSTRAP:FAIL:missing-$cmd"; exit 1; }
done

if ! pg_isready -h "$PG_HOST" -p "$PG_PORT" -q; then
  echo "BOOTSTRAP:FAIL:postgres-unreachable:${PG_HOST}:${PG_PORT}"
  exit 1
fi

SERVER_PORT="$(sudo -u postgres psql -p "$PG_PORT" -Atqc "SELECT current_setting('port')")"
SERVER_VERSION="$(sudo -u postgres psql -p "$PG_PORT" -Atqc "SELECT current_setting('server_version')")"
if [[ "$SERVER_PORT" != "$PG_PORT" ]]; then
  echo "BOOTSTRAP:FAIL:unexpected-postgres-port:${SERVER_PORT}"
  exit 1
fi

echo "POSTGRES_ENDPOINT:${PG_HOST}:${PG_PORT}"
echo "POSTGRES_VERSION:${SERVER_VERSION}"

PASSWORD="$(openssl rand -hex 24)"

ROLE_EXISTS="$(sudo -u postgres psql -p "$PG_PORT" -Atqc "SELECT 1 FROM pg_roles WHERE rolname='${ROLE_NAME}'")"
if [[ "$ROLE_EXISTS" != "1" ]]; then
  sudo -u postgres psql -p "$PG_PORT" -v ON_ERROR_STOP=1 -qc "CREATE ROLE ${ROLE_NAME} LOGIN PASSWORD '${PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;"
else
  sudo -u postgres psql -p "$PG_PORT" -v ON_ERROR_STOP=1 -qc "ALTER ROLE ${ROLE_NAME} WITH LOGIN PASSWORD '${PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;"
fi

DB_EXISTS="$(sudo -u postgres psql -p "$PG_PORT" -Atqc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")"
if [[ "$DB_EXISTS" != "1" ]]; then
  sudo -u postgres createdb -p "$PG_PORT" --owner="$ROLE_NAME" "$DB_NAME"
else
  sudo -u postgres psql -p "$PG_PORT" -v ON_ERROR_STOP=1 -qc "ALTER DATABASE ${DB_NAME} OWNER TO ${ROLE_NAME};"
fi

sudo -u postgres psql -p "$PG_PORT" -v ON_ERROR_STOP=1 -qc "REVOKE ALL ON DATABASE ${DB_NAME} FROM PUBLIC; GRANT CONNECT ON DATABASE ${DB_NAME} TO ${ROLE_NAME};"

install -d -m 0750 -o daniel -g daniel "$ENV_DIR"
TMP_ENV="$(mktemp)"
trap 'rm -f "$TMP_ENV"' EXIT
printf 'ILDI_SUDOKU_RESEARCH_DATABASE_URL=postgresql://%s:%s@%s:%s/%s\n' "$ROLE_NAME" "$PASSWORD" "$PG_HOST" "$PG_PORT" "$DB_NAME" > "$TMP_ENV"
install -m 0600 -o daniel -g daniel "$TMP_ENV" "$ENV_FILE"

export PGPASSWORD="$PASSWORD"
PSQL_WORKER=(psql -h "$PG_HOST" -p "$PG_PORT" -U "$ROLE_NAME" -d "$DB_NAME" -v ON_ERROR_STOP=1)

if [[ "$("${PSQL_WORKER[@]}" -Atqc "SELECT current_user || ':' || current_setting('port')")" != "${ROLE_NAME}:${PG_PORT}" ]]; then
  echo "BOOTSTRAP:FAIL:worker-auth"
  exit 1
fi
echo "WORKER_AUTH:OK"

for migration in "$MIGRATIONS_DIR"/*.sql; do
  "${PSQL_WORKER[@]}" -f "$migration" >/dev/null
  echo "MIGRATION:$(basename "$migration"):OK"
done

"${PSQL_WORKER[@]}" -f "$GATE_SQL"
unset PGPASSWORD

OWNER="$(sudo -u postgres psql -p "$PG_PORT" -Atqc "SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname='${DB_NAME}'")"
ROLE_FLAGS="$(sudo -u postgres psql -p "$PG_PORT" -Atqc "SELECT rolsuper::int || ':' || rolcreatedb::int || ':' || rolcreaterole::int || ':' || rolreplication::int FROM pg_roles WHERE rolname='${ROLE_NAME}'")"
OBJECT_OWNER_MISMATCH="$(sudo -u postgres psql -p "$PG_PORT" -d "$DB_NAME" -Atqc "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('search','corpus','audit','calibration','production') AND c.relkind IN ('r','p','S','v','m') AND pg_get_userbyid(c.relowner) <> '${ROLE_NAME}'")"

[[ "$OWNER" == "$ROLE_NAME" ]] || { echo "BOOTSTRAP:FAIL:owner"; exit 1; }
[[ "$ROLE_FLAGS" == "0:0:0:0" ]] || { echo "BOOTSTRAP:FAIL:role-privileges"; exit 1; }
[[ "$OBJECT_OWNER_MISMATCH" == "0" ]] || { echo "BOOTSTRAP:FAIL:object-owner"; exit 1; }

echo "DATABASE:${DB_NAME}"
echo "ROLE:${ROLE_NAME}"
echo "ENV_FILE:${ENV_FILE}:0600"
echo "ROLE_PRIVILEGES:LIMITED"
echo "OBJECT_OWNERSHIP:OK"
echo "BOOTSTRAP:PASS"
