# Ops Worker — Cloud Run Service

Standalone HTTP service that runs reactive projection consumers and projection-recovery processes outside of Vercel's serverless timeout. Co-located with Cloud SQL in `us-east4`.

## Endpoints

| Method | Path                       | Description                                      | Replaces (Vercel cron)           |
| ------ | -------------------------- | ------------------------------------------------ | -------------------------------- |
| GET    | `/health`                  | Health check                                     | —                                |
| POST   | `/reactive/process`        | Process all reactive events (all domains)        | `api/cron/outbox-react`          |
| POST   | `/reactive/process-domain` | Process domain-scoped events (default: delivery) | `api/cron/outbox-react-delivery` |
| POST   | `/reactive/recover`        | Recover orphaned projection queue items          | `api/cron/projection-recovery`   |
| POST   | `/reliability-ai-watch`    | Reliability AI Observer (TASK-638, Gemini)       | — (no Vercel equivalent)         |
| POST   | `/cloud-cost-ai-watch`     | Cloud Cost Intelligence alerts + FinOps AI (TASK-769) | — (no Vercel equivalent)    |

## Request Bodies

All endpoints accept optional JSON body:

```json
// /reactive/process
{ "batchSize": 50 }

// /reactive/process-domain
{ "domain": "delivery", "batchSize": 50 }

// /reactive/recover
{ "batchSize": 10, "staleMinutes": 30 }

// /reliability-ai-watch
{ "triggeredBy": "cloud_scheduler" }   // optional: cron | manual | cloud_scheduler

// /cloud-cost-ai-watch
{ "triggeredBy": "cloud_scheduler", "dryRun": true }
```

### Reliability AI Observer (TASK-638)

`POST /reliability-ai-watch` runs the Reliability Control Plane AI Observer:

1. Verifies kill-switch — if `RELIABILITY_AI_OBSERVER_ENABLED=true` is not set
   on the Cloud Run service, the endpoint returns immediately with
   `skippedReason` and zero token cost (default OFF, opt-in).
2. Loads `getReliabilityOverview()` (canonical reliability snapshot).
3. Builds sanitized prompts (PII redaction: emails, UUIDs, hex tokens,
   Bearer/sk_/gho_ keys, Chilean RUTs).
4. Calls Gemini Flash via Vertex AI with `responseMimeType=application/json`
   and `temperature=0.1` (deterministic enough for fingerprint dedup).
5. Computes fingerprint per (overview, module) and persists to
   `greenhouse_ai.reliability_ai_observations` only when fingerprint differs
   from the latest stored value (dedup against repeated identical states).

Response body shape: `AiSweepSummary` with `sweepRunId`, `observationsEvaluated`,
`observationsPersisted`, `observationsSkipped`, `promptTokens`, `outputTokens`,
`skippedReason`, `model`.

To activate in production:

```bash
gcloud run services update ops-worker \
  --project=efeonce-group --region=us-east4 \
  --update-env-vars=RELIABILITY_AI_OBSERVER_ENABLED=true
```

To disable (kill-switch):

```bash
gcloud run services update ops-worker \
  --project=efeonce-group --region=us-east4 \
  --remove-env-vars=RELIABILITY_AI_OBSERVER_ENABLED
```

### Cloud Cost Intelligence (TASK-769)

`POST /cloud-cost-ai-watch` runs the Billing Export FinOps lane:

1. Loads `getGcpBillingOverview({ days: 30, forceRefresh: true })`.
2. Evaluates deterministic drivers (`forecast_risk`, `share_of_total`,
   `service_spike`, `resource_driver`).
3. Dispatches Teams alert first and Slack fallback only when a new fingerprint
   crosses warning/error and cooldown allows it.
4. Runs the AI copilot only when `CLOUD_COST_AI_COPILOT_ENABLED=true`.
5. Returns both `alertSummary` and `aiSummary` with counts and `skippedReason`.

Use `dryRun=true` for smoke checks; it does not query the dispatch table, send
notifications or persist fingerprints.

## Cloud Scheduler Jobs

| Job Name                        | Schedule         | Endpoint                   |
| ------------------------------- | ---------------- | -------------------------- |
| `ops-reactive-process`          | `*/5 * * * *`    | `/reactive/process`        |
| `ops-reactive-process-delivery` | `2-59/5 * * * *` | `/reactive/process-domain` |
| `ops-reactive-recover`          | `*/15 * * * *`   | `/reactive/recover`        |
| `ops-reliability-ai-watch`      | `0 */1 * * *`    | `/reliability-ai-watch`    |
| `ops-cloud-cost-ai-watch`       | `15 */6 * * *`   | `/cloud-cost-ai-watch`     |

## Run Tracking

Every invocation writes to `greenhouse_sync.source_sync_runs` with `source_system='reactive_worker'` and `triggered_by='ops_worker'`. This enables:

- Ops overview dashboard to show last successful run
- Alerting on missed runs
- Audit trail for all reactive processing

## Architecture

```
Cloud Scheduler
  ├─ ops-reactive-process          ─┐
  ├─ ops-reactive-process-delivery ─┤─→ Cloud Run (ops-worker)
  └─ ops-reactive-recover          ─┘     ├─ processReactiveEvents()
                                          ├─ claimOrphanedRefreshItems()
                                          └─ writes source_sync_runs
```

## Local Development

```bash
# Build image
docker build -t ops-worker -f services/ops-worker/Dockerfile .

# Run locally (needs .env.local with PG credentials)
docker run -p 8080:8080 --env-file .env.local ops-worker

# Test health
curl http://localhost:8080/health

# Test reactive processing
curl -X POST http://localhost:8080/reactive/process

# Test domain-scoped
curl -X POST -H 'Content-Type: application/json' \
  -d '{"domain":"delivery"}' \
  http://localhost:8080/reactive/process-domain
```

## Deploy

```bash
# From repo root
bash services/ops-worker/deploy.sh
```

## Safety Model

- **Idempotent**: `processReactiveEvents()` uses `FOR UPDATE SKIP LOCKED` + dedup via `outbox_reactive_log`
- **Dual-run safe**: Vercel cron and Cloud Run can run simultaneously without conflict
- **Rollback**: Re-add 3 cron entries to `vercel.json` and redeploy to Vercel
- **No schema changes**: Uses existing tables — no migration required

## GCP Configuration

| Setting         | Value                                                     |
| --------------- | --------------------------------------------------------- |
| Project         | `efeonce-group`                                           |
| Region          | `us-east4` (co-located with Cloud SQL)                    |
| Service Account | `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` |
| Memory          | 1Gi                                                       |
| CPU             | 1                                                         |
| Timeout         | 300s (5 min)                                              |
| Max Instances   | 2                                                         |
| Concurrency     | 1 (serialized)                                            |
| Auth            | IAM (`--no-allow-unauthenticated`)                        |
