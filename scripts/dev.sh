#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8001}"
AGILED_PORT="${AGILED_PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

kill_port() {
  lsof -ti ":$1" | xargs kill -9 2>/dev/null || true
}

start_backend() {
  cd "$ROOT"
  if [ ! -x backend/.venv/bin/python ]; then
    echo "Backend venv missing. Run: $ROOT/scripts/setup-backend.sh"
    exit 1
  fi
  kill_port "$BACKEND_PORT"
  echo "Starting Python API on http://localhost:$BACKEND_PORT"
  cd "$ROOT"
  exec backend/.venv/bin/uvicorn backend.server:app --reload --host 0.0.0.0 --port "$BACKEND_PORT"
}

start_agiled() {
  cd "$ROOT/services/agiled"
  kill_port "$AGILED_PORT"
  echo "Starting Agiled service on http://localhost:$AGILED_PORT"
  npm run dev
}

start_frontend() {
  cd "$ROOT/frontend"
  kill_port "$FRONTEND_PORT"
  export BROWSER=none
  export PORT="$FRONTEND_PORT"
  export REACT_APP_BACKEND_URL="${REACT_APP_BACKEND_URL:-http://localhost:$BACKEND_PORT}"
  echo "Starting frontend on http://localhost:$FRONTEND_PORT"
  npm start
}

case "${1:-all}" in
  backend) start_backend ;;
  agiled) start_agiled ;;
  frontend) start_frontend ;;
  all)
    kill_port "$BACKEND_PORT"
    kill_port "$AGILED_PORT"
    kill_port "$FRONTEND_PORT"
    cd "$ROOT"
    backend/.venv/bin/uvicorn backend.server:app --reload --host 0.0.0.0 --port "$BACKEND_PORT" &
    (cd services/agiled && npm run dev) &
    (cd frontend && BROWSER=none PORT="$FRONTEND_PORT" REACT_APP_BACKEND_URL="http://localhost:$BACKEND_PORT" npm start) &
    wait
    ;;
  *)
    echo "Usage: $0 [backend|agiled|frontend|all]"
    exit 1
    ;;
esac
