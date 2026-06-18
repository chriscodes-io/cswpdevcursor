#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/backend"

echo "==> Installing dependencies"
npm install

echo "==> Building backend"
npm run build

echo "==> Starting backend on http://localhost:3001"
echo "    Health:  curl http://localhost:3001/health"
echo "    Agiled:  curl http://localhost:3001/api/crm/me"
echo "    Webhook: http://localhost:3001/webhooks/agiled"
echo
npm run dev
