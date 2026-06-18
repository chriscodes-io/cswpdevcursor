#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f backend/.env ]]; then
  cp deploy/env.production.example backend/.env
  echo "Created backend/.env — add your Agiled credentials before production deploy."
fi

echo "Building and starting backend..."
docker compose up -d --build

echo "Waiting for health check..."
for _ in {1..20}; do
  if curl -sf http://127.0.0.1:3001/health >/dev/null; then
    echo "Backend is healthy."
    curl -s http://127.0.0.1:3001/health
    echo
    exit 0
  fi
  sleep 1
done

echo "Backend failed health check. Logs:"
docker compose logs backend --tail 50
exit 1
