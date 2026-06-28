#!/usr/bin/env bash
# Smoke-test a deployed CSWP API (Phase 1).
# Usage: ./deploy/verify-api.sh https://api.cswp.dev

set -euo pipefail

BASE="${1:-}"
if [[ -z "$BASE" ]]; then
  echo "Usage: $0 <api-base-url>" >&2
  echo "Example: $0 https://api.cswp.dev" >&2
  exit 1
fi

BASE="${BASE%/}"
echo "Checking $BASE/health ..."
health="$(curl -sf "$BASE/health")"
echo "$health" | python3 -m json.tool

echo "$health" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if data.get('dev_auth_fallback'):
    raise SystemExit('FAIL: dev_auth_fallback is still enabled')
if not data.get('mongodb'):
    raise SystemExit('FAIL: mongodb is not connected')
if data.get('allow_public_registration'):
    raise SystemExit('FAIL: public registration is enabled')
print('OK: production auth flags look correct')
"

echo "Checking registration is blocked ..."
code="$(curl -s -o /tmp/cswp-reg.json -w '%{http_code}' \
  -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{\"email\":\"probe@example.com\",\"name\":\"Probe\",\"password\":\"probe123\"}')"
if [[ "$code" != "403" ]]; then
  echo "FAIL: expected 403 on register, got $code" >&2
  cat /tmp/cswp-reg.json >&2
  exit 1
fi
echo "OK: registration blocked (403)"

echo "All Phase 1 API checks passed."
