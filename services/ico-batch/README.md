# ICO Batch Worker

Cloud Run service for heavy ICO Engine batch processing that exceeds Vercel's 120s function timeout.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| POST | `/ico/materialize` | Full ICO monthly materialization (12 steps) |
| POST | `/ico/llm-enrich` | LLM enrichment pipeline with prompt v2 |

## Request Body

```json
{ "year": 2026, "month": 4, "monthsBack": 3 }
```

All fields optional. Defaults to current month, `monthsBack=1`.

## Auth

Cloud Run IAM (`--no-allow-unauthenticated`). Cloud Scheduler uses OIDC service account token.

## Deploy

```bash
cd /path/to/greenhouse-eo
# IMPORTANT: Dockerfile must be at repo root for gcloud --source=.
cp services/ico-batch/Dockerfile ./Dockerfile
gcloud run deploy ico-batch-worker --project=efeonce-group --region=us-east4 --source=. [flags]
rm ./Dockerfile
# Or use the full script:
bash services/ico-batch/deploy.sh
```

## Manual Invocation

```bash
# Option A: Cloud Run proxy (easiest, handles auth automatically)
gcloud run services proxy ico-batch-worker --project=efeonce-group --region=us-east4 --port=9090
curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"year":2026,"month":3}' http://localhost:9090/ico/llm-enrich

# Option B: Identity token (for scripts / CI)
SERVICE_URL="https://ico-batch-worker-183008134038.us-east4.run.app"
TOKEN=$(gcloud auth print-identity-token \
  --impersonate-service-account=greenhouse-portal@efeonce-group.iam.gserviceaccount.com \
  --audiences=$SERVICE_URL)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"year":2026,"month":3}' "$SERVICE_URL/ico/llm-enrich"
```

## Architecture: Monorepo Cloud Run Build

This service imports `src/lib/` modules from the Greenhouse monorepo. Building it requires careful handling of several Next.js/pnpm quirks:

### Build Pipeline (Dockerfile multi-stage)

```
Builder stage:
  1. pnpm install --ignore-scripts  (skips icon bundling that needs src/assets/)
  2. npm install -g esbuild         (--ignore-scripts prevents esbuild binary install)
  3. esbuild --bundle --alias:@=./src --alias:server-only=shim --alias:next/server=shim
     → resolves @/ path aliases at build time
     → shims out Next.js-only modules

Runner stage:
  1. pnpm install --prod --ignore-scripts
  2. COPY dist/server.mjs from builder
  3. node dist/server.mjs
```

### Known Pitfalls

| Problem | Cause | Fix |
|---------|-------|-----|
| `--dockerfile` flag rejected | gcloud run deploy requires Dockerfile at source root | Copy Dockerfile to repo root before deploy |
| postinstall fails in Docker | `build:icons` needs `src/assets/` not copied | `--ignore-scripts` |
| `@/` path aliases not found at runtime | tsx CJS mode doesn't resolve tsconfig paths reliably | esbuild bundling at build time with `--alias:@=./src` |
| esbuild binary not found | `--ignore-scripts` skips esbuild's postinstall | `npm install -g esbuild` in builder stage |
| Source files missing in Cloud Build | `.gitignore` has `src/lib/ai/`, gcloud uses it as `.gcloudignore` | Create explicit `.gcloudignore` |
| `next/server` import fails at runtime | esbuild `--packages=external` keeps it as external import | Shim with `--alias:next/server=./stub.js` |
| BigQuery DELETE fails | Streaming buffer blocks deletes for ~30-90 min | Best-effort BigQuery write, always persist to PostgreSQL |

### Environment Variables (Cloud Run)

| Variable | Required | Purpose |
|----------|----------|---------|
| `GCP_PROJECT` | Yes | BigQuery project ID (`efeonce-group`) |
| `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` | Yes | Cloud SQL Connector instance |
| `GREENHOUSE_POSTGRES_DATABASE` | Yes | PostgreSQL database name |
| `GREENHOUSE_POSTGRES_USER` | Yes | PostgreSQL user (`greenhouse_app`) |
| `GREENHOUSE_POSTGRES_PASSWORD` | Yes | PostgreSQL password |
| `GREENHOUSE_POSTGRES_IP_TYPE` | No | `PUBLIC` (default) or `PRIVATE` |
| `GOOGLE_GENAI_USE_VERTEXAI` | No | `true` for Vertex AI Gemini |
| `GREENHOUSE_AGENT_MODEL` | No | Override Gemini model |

## Local Development

```bash
# Requires Cloud SQL Proxy on 127.0.0.1:15432 and .env.local configured
source .env.local
npx tsx --conditions=react-server services/ico-batch/server.ts
```

Note: `--conditions=react-server` resolves `import 'server-only'` to empty module. This only works locally; in Docker we use esbuild shimming instead.
