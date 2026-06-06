#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  nvm use --delete-prefix v24.14.0 --silent 2>/dev/null || true
  nvm install 20
  nvm use --delete-prefix v20 --silent 2>/dev/null || nvm use 20
fi

echo "Using Node: $(node -v)"
lsof -ti :3000 | xargs kill -9 2>/dev/null || true

BROWSER=none PORT=3000 REACT_APP_BACKEND_URL=http://localhost:8001 npm start
