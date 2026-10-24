#!/usr/bin/env bash
# Полный прогон доказательств: check + mock + smoke → docs/validation_log.txt
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT=4010
LOG="$ROOT/docs/validation_log.txt"
mkdir -p "$ROOT/docs"

if [[ ! -d node_modules/@stoplight ]]; then
  npm install
fi

# stop old mock
if lsof -t -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  kill -9 $(lsof -t -iTCP:"$PORT" -sTCP:LISTEN) 2>/dev/null || true
  sleep 0.5
fi

node scripts/check-specs.js | tee "$LOG"
# check-specs already writes LOG; re-read and append tree info
{
  echo ""
  echo "=== working tree ==="
  echo "date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "git status --short:"
  git status --short || true
  echo "git write-tree (content fingerprint): $(git write-tree 2>/dev/null || echo n/a)"
} >> "$LOG"

./node_modules/.bin/prism mock openapi.yaml -p "$PORT" -h 127.0.0.1 >/tmp/prism-profit-evidence.log 2>&1 &
PRISM_PID=$!
cleanup() { kill -9 "$PRISM_PID" 2>/dev/null || true; }
trap cleanup EXIT

for i in $(seq 1 20); do
  if curl -sf -o /dev/null "http://127.0.0.1:$PORT/public/products"; then
    break
  fi
  sleep 0.3
done

{
  echo ""
  echo "=== smoke (mock) ==="
  echo "date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  npm run smoke 2>&1 | grep -v 'npm warn'
} | tee -a "$LOG"

echo ""
echo "Evidence written: $LOG"
