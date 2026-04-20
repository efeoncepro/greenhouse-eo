# Commercial Cost Worker

Dedicated Cloud Run worker for the commercial cost basis engine. It offloads long-running materialization work from Vercel so the portal can trigger or observe cost basis refreshes without living inside serverless time limits.

## Purpose

- Run commercial cost basis materialization on Cloud Run.
- Provide a stable HTTP surface for scheduled and manual jobs.
- Keep heavy bundle orchestration out of Vercel request lifecycles.

## Endpoints

Active endpoints:

- `GET /health`
- `POST /cost-basis/materialize`
- `POST /cost-basis/materialize/people`
- `POST /cost-basis/materialize/roles`
- `POST /cost-basis/materialize/tools`
- `POST /cost-basis/materialize/bundle`

Reserved endpoints that currently return `501` JSON:

- `POST /quotes/reprice-bulk`
- `POST /margin-feedback/materialize`

## Request shape

`POST /cost-basis/materialize` accepts a JSON body that is forwarded to `normalizeCommercialCostBasisRequest(...)`.

The scoped endpoints force the following `scope` values before normalization:

- `/cost-basis/materialize/people` -> `people`
- `/cost-basis/materialize/roles` -> `roles`
- `/cost-basis/materialize/tools` -> `tools`
- `/cost-basis/materialize/bundle` -> `bundle`

Example payload:

```json
{
  "year": 2026,
  "month": 4,
  "monthsBack": 1,
  "spaceId": "EO-SPACE-0001"
}
```

## Auth

- Primary protection is Cloud Run IAM with `--no-allow-unauthenticated`.
- Optional `CRON_SECRET` support is available through `Authorization: Bearer <token>`.
- If Cloud Run IAM already validated the request and stripped the header, the request is accepted.

## Local build

Build the container:

```bash
docker build -t commercial-cost-worker -f services/commercial-cost-worker/Dockerfile .
```

Run it locally with repo env vars:

```bash
docker run --rm -p 8080:8080 --env-file .env.local commercial-cost-worker
```

Health check:

```bash
curl -s http://localhost:8080/health
```

## Deploy

Deploy to Cloud Run:

```bash
ENV=staging bash services/commercial-cost-worker/deploy.sh
ENV=production bash services/commercial-cost-worker/deploy.sh
```

Deployment defaults:

- Service name: `commercial-cost-worker`
- Project: `efeonce-group`
- Region: `us-east4`
- Service account: `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`
- Runtime: Node 22
- Cloud Scheduler job: `commercial-cost-materialize-daily`

## Implementation contract

`server.ts` expects these exports from `src/lib/commercial-cost-worker/materialize`:

- `runCommercialCostBasisMaterialization`
- `normalizeCommercialCostBasisRequest`
- `type CommercialCostBasisScope`

The scaffold assumes `normalizeCommercialCostBasisRequest(...)` returns the request object consumed by `runCommercialCostBasisMaterialization(...)`, and that `CommercialCostBasisScope` includes at least `people`, `tools`, and `bundle`.
