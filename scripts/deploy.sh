#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-test}"  # usage: ./scripts/deploy.sh test|prod
APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$APP_ROOT/app"
RELEASES_DIR="$APP_ROOT/.releases"
RUN_DIR="$APP_ROOT/.run"

mkdir -p "$RELEASES_DIR" "$RUN_DIR"

if [[ "$ENV" == "test" ]]; then
  PORT=3001
  NAME="hello-test"
elif [[ "$ENV" == "prod" ]]; then
  PORT=3002
  NAME="hello-prod"
else
  echo "Usage: $0 [test|prod]"
  exit 1
fi

TS="$(date +%Y%m%d%H%M%S)"
DEST="$RELEASES_DIR/${NAME}_$TS"
PIDFILE="$RUN_DIR/${NAME}.pid"
LOGFILE="$RUN_DIR/${NAME}.log"

echo "==> Creating release at $DEST"
mkdir -p "$DEST"
rsync -a --exclude=node_modules "$APP_DIR/" "$DEST/"

echo "==> Installing dependencies"
cd "$DEST"
npm ci || npm install

# Stop previous process if running
if [[ -f "$PIDFILE" ]]; then
  OLD_PID="$(cat "$PIDFILE" || true)"
  if [[ -n "${OLD_PID:-}" ]] && ps -p "$OLD_PID" >/dev/null 2>&1; then
    echo "==> Stopping previous process (PID $OLD_PID)"
    kill "$OLD_PID" || true
    sleep 1
  fi
fi

echo "==> Starting app on PORT=$PORT"
( PORT="$PORT" NODE_ENV=production nohup node server.js >> "$LOGFILE" 2>&1 & echo $! > "$PIDFILE" )

echo "==> Started $(cat "$PIDFILE") (env: $ENV, port: $PORT)"
echo "==> Tail log: tail -f $LOGFILE"
