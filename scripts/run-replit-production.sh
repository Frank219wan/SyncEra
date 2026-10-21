#!/usr/bin/env sh
set -eu

cd backend
AI_ADAPTER_MODULE=futureproof_ai.futureproof_adapter \
STATIC_DIR=../dist \
  python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-3000}"
