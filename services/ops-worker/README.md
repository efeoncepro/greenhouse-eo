# Ops Worker — Cloud Run Service

Standalone HTTP service that runs reactive projection consumers and projection-recovery processes outside of Vercel's serverless timeout. Co-located with Cloud SQL in `us-east4`.

## Endpoints

| Method | Path                       | Description                                      | Replaces (Vercel cron)           |
| ------ | -------------------------- | ------------------------------------------------ | -------------------------------- |
| GET    | `/health`                  | Health check                                     | —                                |
| POST   | `/reactive/process`        | Process all reactive events (all domains)        | `api/cron/outbox-react`          |
| POST   | `/reactive/process-domain` | Process domain-scoped events (default: delivery) | `api/cron/outbox-react-delivery` |
| POST   | `/reactive/recover`        | Recover orphaned projection queue items          | `api/cron/projection-recovery`   |

## Request Bodies

All endpoints accept optional JSON body:

```json
// /reactive/process
{ "batchSize": 50 }

// /reactive/process-domain
{ "domain": "delivery", "batchSize": 50 }

// /reactive/recover
{ "batchSize": 10, "staleMinutes": 30 }
```

## Cloud Scheduler Jobs

| Job Name                        | Schedule         | Endpoint                   |
| ------------------------------- | ---------------- | -------------------------- |
| `ops-reactive-process`          | `*/5 * * * *`    | `/reactive/process`        |
| `ops-reactive-process-delivery` | `2-59/5 * * * *` | `/reactive/process-domain` |
| `ops-reactive-recover`          | `*/15 * * * *`   | `/reactive/recover`        |

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
