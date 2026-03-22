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

As of 2026-03:
- Greenhouse has one inbound webhook route for HR attendance:
  - `POST /api/hr/core/attendance/webhook/teams`
- that route is protected by a shared secret, but it is domain-specific
- Greenhouse also has a token-based integrations API under `/api/integrations/v1/*`
- that API is sync-oriented, not webhook-oriented
- outbound webhooks are explicitly not implemented yet
- PostgreSQL already emits operational truth into `greenhouse_sync.outbox_events`
- the current outbox consumer publishes only to BigQuery, not to external subscribers

This means the repo already has:
- a transactional event source
- a retry/failure vocabulary in `greenhouse_sync`
- real integration pressure

But it still lacks:
- a canonical webhook envelope
- subscription and delivery tracking
- generic inbound receipt storage
- reusable signature handling
- one shared operational model for retries and dead letters

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

Recommended route:
- `/api/webhooks/[endpointKey]`

Responsibilities:
- read raw body without mutating it first
- verify auth/signature
- persist `webhook_inbox_events`
- dispatch to handler registry
- return fast acknowledgement

### Outbound dispatcher

Recommended trigger:
- Vercel cron or Cloud Run worker on a short cadence

Recommended path for MVP:
- `/api/cron/webhook-dispatch`

Responsibilities:
- read pending outbox events
- resolve matching subscriptions
- upsert `webhook_deliveries`
- execute deliveries with signing
- write attempt logs
- schedule retries

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

## Initial Adoption Plan

### Phase 1 - Foundation
- canonical tables in `greenhouse_sync`
- shared signing and verification helpers
- shared event envelope
- delivery worker and receipt logging

### Phase 2 - First inbound adopter
- migrate Teams attendance ingestion to the generic inbound gateway

### Phase 3 - First outbound adopters
- fan out one or two existing outbox-backed event families to webhook subscriptions
- recommended first domains: `finance` and `hr.leave_request`

### Phase 4 - Operational visibility
- admin or internal read-only surface for receipts, deliveries, failures, and dead letters

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
