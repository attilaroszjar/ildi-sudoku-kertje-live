#!/usr/bin/env bash
set -euo pipefail

UNIT_NAME="ildi-sudoku-brutal-search.service"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT_SRC="$ROOT_DIR/systemd/$UNIT_NAME"
UNIT_DST="/etc/systemd/system/$UNIT_NAME"
ENV_FILE="/home/daniel/infra/env/ildi-sudoku-brutal.env"
DANIEL_HOME="/home/daniel"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "SERVICE_INSTALL:FAIL:run-as-root"
  exit 1
fi

for cmd in install systemctl systemd-analyze sudo sed mktemp sort tail dirname find env rm; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "SERVICE_INSTALL:FAIL:missing-$cmd"; exit 1; }
done

[[ -f "$ENV_FILE" ]] || { echo "SERVICE_INSTALL:FAIL:missing-env"; exit 1; }
[[ -f "$UNIT_SRC" ]] || { echo "SERVICE_INSTALL:FAIL:missing-unit"; exit 1; }

grep -q '^ILDI_SUDOKU_RESEARCH_DATABASE_URL=' "$ENV_FILE" || { echo "SERVICE_INSTALL:FAIL:missing-db-url"; exit 1; }
if grep -q '^ILDI_BRUTAL_WORKER_ENABLED=1$' "$ENV_FILE"; then
  echo "SERVICE_INSTALL:FAIL:worker-must-remain-disabled"
  exit 1
fi

NODE_BIN=""
for candidate in \
  /usr/local/bin/node \
  /usr/bin/node \
  "$DANIEL_HOME/.local/bin/node" \
  "$DANIEL_HOME/.volta/bin/node" \
  "$DANIEL_HOME/.asdf/shims/node"; do
  if [[ -x "$candidate" ]]; then
    NODE_BIN="$candidate"
    break
  fi
done

if [[ -z "$NODE_BIN" ]]; then
  NVM_NODE="$(find "$DANIEL_HOME/.nvm/versions/node" -mindepth 3 -maxdepth 3 -type f -path '*/bin/node' -perm -u+x -print 2>/dev/null | sort -V | tail -n 1 || true)"
  if [[ -n "$NVM_NODE" ]]; then
    NODE_BIN="$NVM_NODE"
  fi
fi

[[ -n "$NODE_BIN" && -x "$NODE_BIN" ]] || { echo "SERVICE_INSTALL:FAIL:missing-node-for-daniel"; exit 1; }

NODE_DIR="$(dirname "$NODE_BIN")"
NPM_BIN="$NODE_DIR/npm"
if [[ ! -x "$NPM_BIN" ]]; then
  NPM_BIN="$(sudo -u daniel -H env PATH="$NODE_DIR:/usr/local/bin:/usr/bin:/bin" bash -c 'command -v npm' 2>/dev/null || true)"
fi
[[ -n "$NPM_BIN" && -x "$NPM_BIN" ]] || { echo "SERVICE_INSTALL:FAIL:missing-npm-for-daniel"; exit 1; }

RUNTIME_PATH="$NODE_DIR:/usr/local/bin:/usr/bin:/bin"
echo "NODE_BIN:$NODE_BIN"
echo "NPM_BIN:$NPM_BIN"

cd "$ROOT_DIR"
sudo -u daniel -H env PATH="$RUNTIME_PATH" "$NPM_BIN" install --omit=dev --ignore-scripts --no-audit --no-fund >/dev/null
sudo -u daniel -H env PATH="$RUNTIME_PATH" "$NODE_BIN" worker.mjs | grep -qx 'BRUTAL_WORKER:DISABLED' || { echo "SERVICE_INSTALL:FAIL:worker-not-fail-closed"; exit 1; }

TMP_DIR="$(mktemp -d)"
TMP_UNIT="$TMP_DIR/$UNIT_NAME"
VERIFY_LOG="$TMP_DIR/verify.log"
trap 'rm -rf "$TMP_DIR"' EXIT
sed "s|@NODE_BIN@|$NODE_BIN|g" "$UNIT_SRC" > "$TMP_UNIT"
if ! systemd-analyze verify "$TMP_UNIT" >"$VERIFY_LOG" 2>&1; then
  echo "SERVICE_INSTALL:FAIL:systemd-verify"
  tail -n 20 "$VERIFY_LOG"
  exit 1
fi

install -m 0644 -o root -g root "$TMP_UNIT" "$UNIT_DST"
systemctl daemon-reload
systemctl disable "$UNIT_NAME" >/dev/null 2>&1 || true
systemctl stop "$UNIT_NAME" >/dev/null 2>&1 || true

ENABLED="$(systemctl is-enabled "$UNIT_NAME" 2>/dev/null || true)"
ACTIVE="$(systemctl is-active "$UNIT_NAME" 2>/dev/null || true)"
[[ "$ENABLED" == "disabled" ]] || { echo "SERVICE_INSTALL:FAIL:enabled=$ENABLED"; exit 1; }
[[ "$ACTIVE" == "inactive" ]] || { echo "SERVICE_INSTALL:FAIL:active=$ACTIVE"; exit 1; }

echo "ENV_FILE:$ENV_FILE"
echo "UNIT:$UNIT_DST"
echo "WORKER_FAIL_CLOSED:OK"
echo "SERVICE_ENABLED:$ENABLED"
echo "SERVICE_ACTIVE:$ACTIVE"
echo "SERVICE_INSTALL:PASS"
