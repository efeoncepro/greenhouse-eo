# CODEX_TASK_Webhook_Infrastructure_MVP_v1

## Summary

Build the first reusable webhook infrastructure for Greenhouse so the portal can:
- accept inbound webhooks through one canonical gateway
- deliver outbound webhooks from `greenhouse_sync.outbox_events`
- log receipts, deliveries, retries, and dead letters

This task is intentionally infrastructure-first.
It is not "implement one more webhook route".

The architecture baseline is:
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

## Why This Task Exists

Greenhouse already has the ingredients for an event-driven edge, but not the platform:
- one domain-specific inbound webhook exists today for Teams attendance
- `greenhouse_sync.outbox_events` already exists
- integrations API exists, but outbound webhooks do not
- external sibling repos already rely on webhook-like flows around Notion, Frame.io, and Teams

Without a shared foundation, every new integration risks becoming:
- a one-off route
- a one-off auth model
- a one-off retry policy
- a one-off delivery log

## Goal

Deliver an MVP that proves the pattern end-to-end:
- one generic inbound webhook boundary
- one generic outbound dispatcher
- one canonical event envelope
- one auditable delivery model
- one migrated real use case

## Dependencies & Impact

### Depends on
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- existing `greenhouse_sync.outbox_events`
- current Teams attendance ingestion route

### Impacts to
- `CODEX_TASK_Notification_System.md` - should reuse the webhook/outbox transport, not invent a separate outbound delivery layer
- `CODEX_TASK_HR_Payroll_Attendance_Leave_Work_Entries_v1.md` - gives a better inbound seam for Teams attendance/timecards
- `CODEX_TASK_Services_Runtime_Closure_v1.md` - creates reusable webhook substrate for service sync and future HubSpot invalidation
- `Greenhouse_Data_Node_Architecture_v2.md` - provides event delivery surface for external consumers

### Files owned
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `scripts/setup-postgres-webhooks.sql`
- `scripts/setup-postgres-webhooks.ts`
- `src/lib/webhooks/*`
- `src/app/api/webhooks/[endpointKey]/route.ts`
- `src/app/api/cron/webhook-dispatch/route.ts`
- `src/app/api/internal/webhooks/*` if needed for read-only ops diagnostics
- migration of `src/app/api/hr/core/attendance/webhook/teams/route.ts` to the shared inbound foundation

## Current Repo State

What already exists:
- inbound webhook route:
  - `src/app/api/hr/core/attendance/webhook/teams/route.ts`
- shared-secret validation helper:
  - `src/lib/hr-core/shared.ts`
- outbox publisher to BigQuery:
  - `src/lib/sync/outbox-consumer.ts`
  - `src/app/api/cron/outbox-publish/route.ts`
- integrations API with token auth:
  - `/api/integrations/v1/*`

What does not exist yet:
- `webhook_endpoints`
- `webhook_inbox_events`
- `webhook_subscriptions`
- `webhook_deliveries`
- `webhook_delivery_attempts`
- generic webhook signing helpers
- generic outbound dispatcher
- dead-letter handling for webhook deliveries

## MVP Scope

### Slice 1 - PostgreSQL foundation in `greenhouse_sync`

Create canonical tables:
- `webhook_endpoints`
- `webhook_inbox_events`
- `webhook_subscriptions`
- `webhook_deliveries`
- `webhook_delivery_attempts`

Rules:
- keep MVP inside `greenhouse_sync`
- append-only where history matters
- dedupe inbound by source event identity
- dedupe outbound by `(event_id, subscription_id)`

Deliverables:
- SQL provisioning script
- TypeScript setup runner
- minimal indexes for pending and retry queries

### Slice 2 - Shared webhook library

Create `src/lib/webhooks/*` with:
- signature helpers
- raw body handling
- event envelope builder
- retry policy constants
- subscription filter matcher
- inbound handler registry contracts

Suggested files:
- `src/lib/webhooks/envelope.ts`
- `src/lib/webhooks/signing.ts`
- `src/lib/webhooks/inbound.ts`
- `src/lib/webhooks/outbound.ts`
- `src/lib/webhooks/retry-policy.ts`
- `src/lib/webhooks/store.ts`

### Slice 3 - Generic inbound gateway

Create:
- `POST /api/webhooks/[endpointKey]`

Behavior:
- verify auth/signature
- persist raw receipt
- dispatch to registered handler
- mark status
- keep failures replayable

Migrate first adopter:
- Teams attendance ingestion

Important:
- do not break the HR domain contract
- if needed, keep the legacy Teams route as a thin compatibility wrapper during cutover

### Slice 4 - Generic outbound dispatcher

Create:
- `GET /api/cron/webhook-dispatch`

Behavior:
- read pending `outbox_events`
- match active `webhook_subscriptions`
- create or resume `webhook_deliveries`
- send signed HTTP requests
- log attempts
- schedule retries or dead-letter

Use a stable envelope:
- `eventId`
- `eventType`
- `aggregateType`
- `aggregateId`
- `occurredAt`
- `version`
- `source`
- `data`

### Slice 5 - First outbound event family

Pick one already-outboxed domain family and expose it through subscriptions.

Recommended first options:
- `hr.leave_request.*`
- `finance.expense.*`
- `finance.income.*`

Selection rule:
- choose a domain that already writes through PostgreSQL and already emits outbox events
- avoid introducing a brand new domain event catalog in the same slice unless necessary

### Slice 6 - Minimal observability

Provide a minimal read path for operators:
- query recent inbound receipts
- query recent outbound deliveries
- inspect failed attempts and dead letters

This can be:
- internal API routes only for MVP
- no full UI console required yet

## Security Rules

- never store raw secrets in plain text rows if a config indirection is enough
- prefer provider-native signature verification when available
- for internal MVP senders, shared secret is acceptable
- capture raw body before JSON parsing when signature validation depends on exact bytes
- outbound signature should include timestamp to limit replay windows

## Verification

Minimum expected validation for the implementation turn:
- `pnpm lint`
- targeted unit tests for:
  - signature verification
  - event envelope builder
  - retry scheduling
  - dedupe behavior for inbound receipts
  - dedupe behavior for outbound deliveries
- manual local or preview verification of:
  - inbound Teams webhook through generic gateway
  - one outbound subscription receiving a signed test event

## Out of Scope

- UI-heavy subscription management console
- replacing sibling repos in one pass
- converting every existing integration to webhooks
- exactly-once delivery guarantees
- multi-region event transport

## Success Criteria

- Greenhouse has one canonical inbound webhook route
- Greenhouse can send one canonical outbound webhook from outbox-backed events
- every receipt and delivery attempt is auditable
- retries and dead letters are explicit, not implicit
- Teams attendance no longer stands alone as a permanent special-case route

## Notes For Future Agents

- If this task starts implementation, move it from `to-do/` to `in-progress/` and update `docs/tasks/README.md`.
- Do not let Notification System or another domain create a second outbound transport layer in parallel.
- Keep the first implementation small, testable, and reversible.
