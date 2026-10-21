#!/usr/bin/env sh
set -eu

python -m pip install -r backend/requirements.txt
corepack enable
corepack prepare pnpm@10.28.2 --activate
pnpm install --frozen-lockfile
VITE_API_MODE=real VITE_API_BASE_URL= pnpm build
