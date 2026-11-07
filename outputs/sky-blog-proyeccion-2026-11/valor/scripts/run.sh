#!/usr/bin/env bash
# Usage: bash outputs/sky-blog-proyeccion-2026-11/valor/scripts/run.sh <script.ts> [args...]
# Loads the public GSC OAuth client id from the ops-worker's active revision into the process env only
# (never written to disk) and points the client secret at its Secret Manager ref. Run from repo root.
set -euo pipefail
CID=$(gcloud run services describe ops-worker --region us-east4 --project efeonce-group --format=json \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(next((e.get('value','') for c in d['spec']['template']['spec']['containers'] for e in c.get('env',[]) if e['name']=='GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID'),''))")
export GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID="$CID"
export GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET_SECRET_REF=greenhouse-search-console-oauth-client-secret
exec pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs "$@"
