#!/usr/bin/env sh
set -eu

python -m pip install -r backend/requirements.txt
pnpm install --frozen-lockfile

(
  cd backend
  AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter \
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
) &
backend_pid=$!

cleanup() {
  kill "$backend_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

VITE_API_MODE=real VITE_API_BASE_URL= \
  pnpm dev --host 0.0.0.0 --port "${PORT:-3000}"
