#!/usr/bin/env bash
# Start Docker Compose stack and open the UI in the default browser when ready.
# Usage: ./scripts/run-in-docker.sh [--cn] [--port 3000] [--no-open]

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CN=0
PORT="${FRONTEND_PORT:-3000}"
NO_OPEN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cn) CN=1; shift ;;
    --port) PORT="$2"; shift 2 ;;
    --no-open) NO_OPEN=1; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ ! -f .env ]] && [[ -f .env.example ]]; then
  cp .env.example .env
  echo "Created .env from .env.example — set AI_API_KEY before using AI features."
fi

COMPOSE=(docker compose)
if [[ "$CN" -eq 1 ]]; then
  COMPOSE+=( -f docker-compose.yml -f docker-compose.cn.yml )
fi

echo "Starting containers..."
"${COMPOSE[@]}" up -d --build

URL="http://localhost:${PORT}/"
echo "Waiting for ${URL} ..."

deadline=$((SECONDS + 180))
ready=0
while [[ $SECONDS -lt $deadline ]]; do
  if curl -fsS -o /dev/null -m 3 "$URL" 2>/dev/null; then
    ready=1
    break
  fi
  sleep 2
done

if [[ "$ready" -ne 1 ]]; then
  echo "Timed out waiting for the UI. Check: docker compose logs -f" >&2
  exit 1
fi

echo "Ready: ${URL}"
if [[ "$NO_OPEN" -eq 0 ]]; then
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL"
  elif command -v open >/dev/null 2>&1; then
    open "$URL"
  else
    echo "Could not detect a browser opener; open ${URL} manually."
  fi
fi
