#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CANON="${CSWP_CANONICAL:-$HOME/Desktop/Desktop/cswp.dev/app}"

cd "$ROOT/backend"

if [ -d "$CANON/backend/.venv" ] && [ ! -d .venv ]; then
  echo "Copying Python venv from canonical repo..."
  rsync -a "$CANON/backend/.venv/" .venv/
  echo "Done."
  exit 0
fi

python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install fastapi uvicorn motor python-dotenv python-jose passlib bcrypt \
  beautifulsoup4 requests resend stripe pydantic email-validator python-multipart aiohttp

echo "Minimal backend venv ready. For full deps: pip install -r requirements.txt"
