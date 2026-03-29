# GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md

## Purpose

Define the canonical architecture for inbound and outbound webhooks in Greenhouse.

This document exists to avoid two bad patterns:
- one-off webhook routes that solve only one integration and then become dead ends
- direct synchronous callbacks from product request paths that bypass the existing outbox discipline

Use together with:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

## Scope

This document is about application-level webhooks for Greenhouse.

It is not about:
- GitHub repository webhooks
- replacing every external sync worker already living in sibling repos
- building a full event streaming platform

The goal is narrower and more practical:
- provide one reusable inbound webhook boundary
- provide one reusable outbound webhook delivery layer
- anchor both on the existing PostgreSQL outbox model
- keep delivery auditable, retryable, and idempotent

## Current State

As of 2026-03-29:

### Implemented (TASK-006 + TASK-125)

| Component | Status | Location |
|-----------|--------|----------|
| Canonical tables (5) | Provisioned | `greenhouse_sync.webhook_endpoints`, `webhook_inbox_events`, `webhook_subscriptions`, `webhook_deliveries`, `webhook_delivery_attempts` |
| Shared webhook library | Complete | `src/lib/webhooks/*` (signing, envelope, inbound, outbound, store, retry-policy, types) |
| Inbound gateway | Active | `POST /api/webhooks/[endpointKey]` |
| Outbound dispatcher | Active | `GET /api/cron/webhook-dispatch` (every 2 min via Vercel cron) |
| HMAC-SHA256 signing | Complete | `src/lib/webhooks/signing.ts` (timing-safe verification) |
| Canonical envelope | Complete | `src/lib/webhooks/envelope.ts` |
| Retry policy | Complete | 5 attempts: immediate, +1m, +5m, +15m, +60m → dead-letter |
| Teams attendance migration | Complete | Migrated to generic inbound gateway |
| Canary subscription | Deployable | `POST /api/admin/ops/webhooks/seed-canary` + `POST /api/internal/webhooks/canary` |
| Admin Center visibility | Active | Endpoint/subscription/delivery counters, dead-letter tracking, dispatch button |

### First Consumer: Canary Subscription (TASK-125)

The first outbound consumer is a self-loop canary that validates the full pipeline:

```
outbox_events (published) → webhook-dispatch cron (*/2 min) → matches subscription
  → creates delivery → HTTP POST to /api/internal/webhooks/canary
  → validates HMAC signature → returns 200 → delivery marked succeeded
```

- Subscription ID: `wh-sub-canary`
- Event filters: `assignment.*` + `member.*` (high volume, low risk)
- Target: same deployment via `VERCEL_URL`
- Secret contract: `WEBHOOK_CANARY_SECRET` o `WEBHOOK_CANARY_SECRET_SECRET_REF`
- Optional protection bypass:
  - `WEBHOOK_CANARY_VERCEL_PROTECTION_BYPASS_SECRET`
  - fallback `VERCEL_AUTOMATION_BYPASS_SECRET`
- Activation: Admin Center button "Activar canary subscription" or direct POST to `/api/admin/ops/webhooks/seed-canary`

### Not Yet Active

- No external consumers registered (first real external consumer is a future task)
- Budget/cost alerting via webhooks (TASK-103 scope)
- Slack notifications via webhook subscription (currently uses direct `sendSlackAlert()`, not the webhook pipeline)

## Architectural Decision

Greenhouse will standardize webhook infrastructure as a transport layer attached to `greenhouse_sync`.

The core rule is:
- domain modules emit internal events to `greenhouse_sync.outbox_events`
- inbound and outbound webhook mechanics live in shared sync tables and shared helpers
- route handlers do not own integration-specific persistence models by themselves

The webhook architecture has two halves:

### 1. Inbound webhooks

External systems call Greenhouse.

Flow:
1. request reaches a generic webhook boundary
2. authentication or signature verification happens at the edge
3. raw receipt is persisted before business processing
4. a handler processes the event idempotently
5. result is recorded as `processed`, `failed`, or `dead_letter`

### 2. Outbound webhooks

Greenhouse notifies external subscribers.

Flow:
1. domain write lands in PostgreSQL
2. domain emits an event to `greenhouse_sync.outbox_events`
3. webhook delivery worker fans out matching events to active subscriptions
4. every attempt is logged with status, response code, and retry timing
5. terminal failures move to dead-letter state without losing the original event

## Design Principles

1. Persist first, process second
- inbound webhooks must durably record the raw event before expensive processing

2. Async by default
- outbound webhook delivery must not happen inside the original product write request

3. Idempotent everywhere
- replaying the same inbound event or outbound event must be safe

4. Transport is not domain logic
- webhook signing, retries, and delivery status are infrastructure concerns
- business handlers remain domain-specific

5. One canonical event source
- product-originated outbound webhook delivery starts from `greenhouse_sync.outbox_events`
- do not invent a second event ledger per module

6. Minimal coupling to vendors
- internal event names and payloads should not mirror one vendor's terminology
- provider-specific adapters may translate at the edge

7. Auditable operations
- every inbound receipt and outbound delivery attempt must be queryable later

## Canonical Schema Placement

For MVP, webhook control-plane and transport tables live in `greenhouse_sync`.

Why `greenhouse_sync` and not a new schema:
- the repo already uses `greenhouse_sync` for outbox and sync failures
- inbound and outbound webhook transport is part of cross-system publication
- keeping the first version there minimizes migration cost and conceptual spread

If the control-plane grows later into a broader integrations platform, it can be split into `greenhouse_integrations`.

## Canonical Tables

### 1. `greenhouse_sync.webhook_endpoints`

Purpose:
- registry of inbound endpoints that Greenhouse accepts

Recommended fields:
- `webhook_endpoint_id`
- `endpoint_key`
- `provider_code`
- `handler_code`
- `auth_mode`
- `secret_ref`
- `active`
- `created_at`
- `updated_at`

### 2. `greenhouse_sync.webhook_inbox_events`

Purpose:
- append-only receipt log for inbound webhook traffic

Recommended fields:
- `webhook_inbox_event_id`
- `webhook_endpoint_id`
- `provider_code`
- `source_event_id`
- `idempotency_key`
- `headers_json`
- `payload_json`
- `raw_body_text`
- `signature_verified`
- `status` - `received`, `processed`, `failed`, `dead_letter`
- `error_message`
- `received_at`
- `processed_at`

Rules:
- unique key should prevent double-processing for the same source event
- raw payload must be retained for replay and debugging

### 3. `greenhouse_sync.webhook_subscriptions`

Purpose:
- registry of outbound subscribers

Recommended fields:
- `webhook_subscription_id`
- `subscriber_code`
- `target_url`
- `auth_mode`
- `secret_ref`
- `event_filters_json`
- `active`
- `paused_at`
- `created_at`
- `updated_at`

### 4. `greenhouse_sync.webhook_deliveries`

Purpose:
- current delivery state per `outbox_event x subscription`

Recommended fields:
- `webhook_delivery_id`
- `event_id`
- `webhook_subscription_id`
- `event_type`
- `status` - `pending`, `delivering`, `succeeded`, `retry_scheduled`, `dead_letter`
- `attempt_count`
- `next_retry_at`
- `last_http_status`
- `last_error_message`
- `created_at`
- `completed_at`

Rules:
- unique constraint on `(event_id, webhook_subscription_id)`
- this table is the dedupe anchor for outbound fanout

### 5. `greenhouse_sync.webhook_delivery_attempts`

Purpose:
- append-only audit log of every outbound attempt

Recommended fields:
- `webhook_delivery_attempt_id`
- `webhook_delivery_id`
- `attempt_number`
- `request_headers_json`
- `request_body_json`
- `response_status`
- `response_body`
- `started_at`
- `finished_at`
- `error_message`

## Canonical Event Envelope

Outbound webhook payloads should use one Greenhouse envelope:

```json
{
  "eventId": "outbox-evt-123",
  "eventType": "finance.expense.created",
  "aggregateType": "finance_expense",
  "aggregateId": "EXP-123",
  "occurredAt": "2026-03-22T12:00:00.000Z",
  "version": 1,
  "source": "greenhouse-eo",
  "data": {}
}
```

Rules:
- `eventType` is a Greenhouse domain event name, not a table name
- `data` may evolve, but the envelope shape stays stable
- schema versioning is explicit through `version`

Recommended first event families:
- `finance.*`
- `hr.leave_request.*`
- `ai_tooling.*`
- later: `identity.*`, `tenant.capabilities.*`, `services.*`

## Canonical Headers

Outbound deliveries should include:
- `x-greenhouse-event-id`
- `x-greenhouse-event-type`
- `x-greenhouse-delivery-id`
- `x-greenhouse-timestamp`
- `x-greenhouse-signature`

Recommended signing model for outbound:
- HMAC SHA-256 over `timestamp + "." + raw_body`

Recommended inbound verification order:
1. provider-native signature if the provider supports it
2. HMAC shared secret if Greenhouse owns both ends
3. bearer/shared secret only for internal MVP cases

## Runtime Components

### Inbound gateway

Route: `POST /api/webhooks/[endpointKey]`
File: `src/app/api/webhooks/[endpointKey]/route.ts`

Responsibilities:
- read raw body without mutating it first
- verify auth/signature via `src/lib/webhooks/signing.ts`
- persist `webhook_inbox_events` via `src/lib/webhooks/store.ts`
- dispatch to registered handler via `src/lib/webhooks/inbound.ts`
- return fast acknowledgement

### Outbound dispatcher

Route: `GET /api/cron/webhook-dispatch`
Schedule: `*/2 * * * *` (every 2 minutes via Vercel cron)
File: `src/app/api/cron/webhook-dispatch/route.ts`
Core: `src/lib/webhooks/dispatcher.ts`

Responsibilities:
- read published outbox events (last 24h, batch of 30)
- resolve matching subscriptions via filter logic in `src/lib/webhooks/outbound.ts`
- upsert `webhook_deliveries` (dedupe by `event_id + subscription_id`)
- execute deliveries with HMAC-SHA256 signing
- write attempt logs to `webhook_delivery_attempts`
- schedule retries per `src/lib/webhooks/retry-policy.ts`

### Canary endpoint

Route: `POST /api/internal/webhooks/canary`
File: `src/app/api/internal/webhooks/canary/route.ts`

Purpose: internal self-loop target for E2E validation. Validates HMAC signature, logs receipt, returns 200.

### Admin operations

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/ops/webhooks/dispatch` | POST | Manual dispatch trigger |
| `/api/admin/ops/webhooks/seed-canary` | POST | Register/reactivate canary subscription |
| `/api/internal/webhooks/inbox` | GET | Read-only inbox events |
| `/api/internal/webhooks/deliveries` | GET | Read-only delivery logs |
| `/api/internal/webhooks/failures` | GET | Read-only failure/dead-letter logs |

### File reference

| File | Purpose |
|------|---------|
| `src/lib/webhooks/store.ts` | Database operations (endpoints, subscriptions, deliveries, attempts) |
| `src/lib/webhooks/dispatcher.ts` | Main dispatch loop (match events → create deliveries → deliver) |
| `src/lib/webhooks/outbound.ts` | HTTP delivery + subscription filter matching |
| `src/lib/webhooks/inbound.ts` | Inbound webhook processing + handler dispatch |
| `src/lib/webhooks/signing.ts` | HMAC-SHA256 signing/verification + secret resolution |
| `src/lib/webhooks/envelope.ts` | Canonical webhook envelope builder |
| `src/lib/webhooks/types.ts` | TypeScript interfaces |
| `src/lib/webhooks/retry-policy.ts` | Retry delays + dead-letter logic |
| `scripts/setup-postgres-webhooks.sql` | Table schemas + seed data |
| `scripts/setup-postgres-webhooks.ts` | TypeScript provisioning runner |

## Retry and Dead-Letter Policy

Recommended MVP retry schedule:
- attempt 1: immediate
- attempt 2: +1 minute
- attempt 3: +5 minutes
- attempt 4: +15 minutes
- attempt 5: +60 minutes

After max attempts:
- mark delivery as `dead_letter`
- keep original event and attempt history intact

Rules:
- retry only for network failures and `5xx`
- do not blindly retry permanent `4xx` unless policy explicitly allows it

## Relationship With Existing Pieces

### Teams attendance webhook

The existing Teams attendance route is a valid first inbound use case, but it should migrate to the generic inbound gateway rather than remain a permanent special case.

### Integrations API V1

The token-based integrations API remains useful for pull, push, and reconciliation flows.

Webhooks do not replace it.

Instead:
- integrations API stays good for explicit sync contracts
- webhooks add near-real-time event delivery and invalidation

### Outbox to BigQuery

The current outbox consumer that publishes to BigQuery remains valid.

Webhook delivery is an additional downstream consumer of the same operational truth, not a replacement.

### Sibling repos

This architecture does not force immediate migration of:
- `notion-bigquery`
- `hubspot-bigquery`
- `notion-teams`
- `notion-frame-io`
- `kortex`

But it creates a reusable Greenhouse-side surface so future integrations do not require one-off product routes every time.

## Adoption Plan

### Phase 1 - Foundation — `complete` (TASK-006)
- Canonical tables in `greenhouse_sync` (5 tables)
- Shared signing and verification helpers (`src/lib/webhooks/signing.ts`)
- Shared event envelope (`src/lib/webhooks/envelope.ts`)
- Delivery worker and receipt logging (`src/lib/webhooks/dispatcher.ts`)
- Inbound gateway (`POST /api/webhooks/[endpointKey]`)
- Outbound dispatcher cron (`/api/cron/webhook-dispatch`, every 2 min)

### Phase 2 - First inbound adopter — `complete` (TASK-006)
- Teams attendance ingestion migrated to generic inbound gateway

### Phase 3 - First outbound consumer — `in-progress` (TASK-125)
- Internal canary subscription validates E2E pipeline
- Schema + subscription + deliveries ya fueron validados en `staging`
- Current blocker: self-loop target in protected Vercel environments returns `401 Authentication Required`
- Pending: define automation bypass or equivalent non-interactive target path for the canary

### Phase 4 - Operational visibility — `complete` (TASK-108, TASK-112)
- Admin Center shows endpoint/subscription/delivery counters
- Dead-letter and failure tracking visible in Ops Health
- Manual dispatch button available
- Canary activation button available

### Phase 5 - Real consumers — `to-do` (TASK-128)

Cinco slices ordenados por impacto vs esfuerzo:

#### 5a. Slack como consumer outbound (~1h)
- Subscription con `target_url` apuntando a un relay interno que formatea el envelope en texto legible para Slack
- Eventos: `payroll_period.closed`, `payroll_period.exported`, `finance.dte.discrepancy_found`
- Diferencia con `sendSlackAlert()` directo: auditable, con retries, dead-letter, visible en Admin Center

#### 5b. Invalidación de cache interna (~1.5h)
- Subscription self-loop a endpoint de invalidación
- `compensation_version.created` → invalidar payroll proyectado
- `assignment.created/updated` → invalidar capacity economics
- Reduce latencia de horas a minutos sin re-computar snapshots completos

#### 5c. Nubox push (~2h)
- Invertir el flujo de pull diario a push en tiempo real
- `finance.income.created` / `finance.expense.created` → push a API de Nubox
- Cron `nubox-sync` se mantiene como safety net de reconciliación

#### 5d. Notificaciones in-app via webhook bus (~2h) — mayor impacto en UX
- Consumer que recibe eventos del bus y llama a `dispatchNotification()` de `notification-service.ts`
- La campanita del navbar muestra actividad real alimentada por el bus de eventos
- Preferencias in-app/email del usuario se respetan automáticamente (TASK-023)
- Mapeo declarativo evento → notificación (recipients, título, action_url)
- Cada nuevo event type genera notificaciones con solo agregar un mapping

#### 5e. Data Node / consumers externos (futuro)
- Partners o servicios externos se suscriben a eventos vía API
- Requiere admin UI para gestión de subscriptions + documentación pública del event catalog

#### Diagrama de consumers

```
                              outbox_events
                                    │
                    ┌───────────────┼───────────────┬──────────────────┐
                    │               │               │                  │
              BigQuery pub    Reactive proj    Webhook dispatch    (future)
              (analytics)    (serving interno)       │
                                              ┌─────┼─────┬──────────┐
                                              │     │     │          │
                                          Slack   Cache  Nubox   In-app
                                          relay   inval  push    notifications
                                              │     │     │          │
                                           #channel stale  API    campanita
                                                   flag  call    + email
```

## Explicit Non-Goals For V1

- no guarantee of global ordering across all subscribers
- no exactly-once network delivery claim
- no replacement of external ETL repos in one step
- no requirement to expose every domain event externally from day one
- no UI-heavy subscription management console in MVP

## Why This Is Worth Doing

This architecture is useful for Greenhouse because it unlocks:
- lower latency than cron-only integrations
- less one-off webhook code per domain
- a reusable edge for HubSpot, Teams, and future providers
- external automation and Data Node style consumers
- a cleaner path for Notification System to reuse event delivery instead of inventing its own transport

The key is to treat webhooks as infrastructure on top of the existing outbox model, not as ad hoc API routes.
