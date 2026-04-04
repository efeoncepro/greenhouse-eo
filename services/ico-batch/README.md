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
bash services/ico-batch/deploy.sh
```

## Manual Invocation

```bash
SERVICE_URL="https://ico-batch-worker-HASH.us-east4.run.app"
TOKEN=$(gcloud auth print-identity-token --audiences=$SERVICE_URL)

curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"year":2026,"month":3}' \
  "$SERVICE_URL/ico/llm-enrich"
```

## Local Development

```bash
# Requires Cloud SQL Proxy on 127.0.0.1:15432 and .env.local configured
npx tsx --conditions=react-server services/ico-batch/server.ts
```
