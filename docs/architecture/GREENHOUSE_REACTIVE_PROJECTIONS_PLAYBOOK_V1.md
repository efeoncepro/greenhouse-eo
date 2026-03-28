# Greenhouse Reactive Projections Playbook v1

## Overview

Este playbook documenta cómo registrar, operar y monitorear proyecciones reactivas en Greenhouse. El sistema permite que cualquier módulo declare qué eventos de dominio invalidan sus snapshots serving, y el consumer reactivo se encarga del refresh en tiempo real.

`payroll_receipts_delivery` ya está definido como la primera proyección operativa del dominio Payroll sobre `payroll_period.exported`.

La implementación actual ya publica el evento, lo enruta por el projection registry y genera la entrega de recibos, pero la cola persistente todavía debe terminar de cerrar su ciclo operativo para que la durabilidad sea literal y no solo conceptual.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Domain Store    │────▶│  Outbox Events    │────▶│  Reactive Consumer  │
│  (writes)        │     │  (greenhouse_sync │     │  (partitioned by    │
│                  │     │   .outbox_events) │     │   domain)           │
└─────────────────┘     └──────────────────┘     └────────┬────────────┘
                                                          │
                                               ┌──────────▼──────────┐
                                               │  Projection Registry │
                                               │  (declarative map    │
                                               │   event → refresh)   │
                                               └──────────┬──────────┘
                                                          │
                                    ┌─────────────────────┼─────────────────────┐
                                    │                     │                     │
                              ┌─────▼─────┐         ┌────▼─────┐        ┌─────▼──────┐
                              │  Refresh   │         │  Refresh │        │  Refresh   │
                              │  Queue     │         │  Handler │        │  Log       │
                              │ (persist)  │         │ (execute)│        │ (observe)  │
                              └───────────┘         └──────────┘        └────────────┘
```

## How to Add a New Projection

### Step 1 — Create the projection file

```
src/lib/sync/projections/my-projection.ts
```

```typescript
import 'server-only'
import type { ProjectionDefinition } from '../projection-registry'

export const myProjection: ProjectionDefinition = {
  // Unique name — used in logs, observability, and queue dedup
  name: 'my_serving_snapshot',

  // Human-readable description
  description: 'What this projection computes and why it refreshes',

  // Domain partition — determines which cron processes it
  // Options: 'organization' | 'people' | 'finance' | 'notifications' | 'delivery'
  domain: 'finance',

  // Which outbox event types trigger a refresh
  // Use constants from src/lib/sync/event-catalog.ts
  triggerEvents: [
    'income.created',
    'expense.updated',
    'assignment.created'
  ],

  // Extract the entity scope from the event payload
  // Returns null to skip (event doesn't affect this projection)
  extractScope: (payload) => {
    const clientId = payload.clientId as string | undefined
    if (clientId) return { entityType: 'client', entityId: clientId }
    return null
  },

  // Idempotent refresh function
  // - Must be safe to call multiple times for the same entity
  // - Must handle missing data gracefully (return null, don't throw)
  // - Should be scoped to the specific entity, not a global recompute
  refresh: async (scope, _payload) => {
    // Targeted: only recompute for this specific entity
    await recomputeSnapshotForClient(scope.entityId)
    return `refreshed my_serving_snapshot for client ${scope.entityId}`
  },

  // Max retries before dead-lettering (default: 2)
  maxRetries: 2
}
```

### Step 2 — Register in the index

```typescript
// src/lib/sync/projections/index.ts
import { myProjection } from './my-projection'

// Inside ensureProjectionsRegistered():
registerProjection(myProjection)
```

### Step 3 — Done

No other files to modify. The domain cron already runs for your domain.

## Domain Partitioning

Each projection belongs to exactly one domain. Crons run in parallel per domain:

| Domain | Cron Route | What it processes |
|--------|-----------|-------------------|
| `organization` | `/api/cron/outbox-react-org` | Organization 360 invalidation |
| `people` | `/api/cron/outbox-react-people` | ICO member metrics refresh |
| `finance` | `/api/cron/outbox-react-finance` | Client economics recompute |
| `notifications` | `/api/cron/outbox-react-notify` | Notification dispatch |
| `delivery` | (future) | Delivery projection refresh |

The catch-all `/api/cron/outbox-react` still works for processing ALL domains sequentially (useful for testing or low-volume environments).

### Adding a new domain

1. Add the domain to the `ProjectionDomain` type in `projection-registry.ts`
2. Create a new cron route following the pattern in `outbox-react-org/route.ts`
3. Register it in Vercel cron config (`vercel.json`) if needed

## Refresh Queue

The persistent queue (`greenhouse_sync.projection_refresh_queue`) ensures refresh intents survive outbox event expiration.
The reactive consumer also persists `greenhouse_sync.outbox_reactive_log` as its idempotency / retry ledger. The ledger is keyed by `(event_id, handler)` so each projection handler can react independently to the same outbox event; both tables are part of the shared reactive control plane and should be provisioned up front.

Current hardening note:

- la cola persistente ya cierra su ciclo con completion/failure observables y sigue siendo la referencia operacional de durabilidad
- `projected_payroll` y `payroll_receipts_delivery` son los consumidores de referencia de este control plane
- el contrato operacional sigue siendo: intents persistentes, ledger reactivo idempotente y observabilidad por queue health

### How it works

1. Consumer detects event → enqueues refresh intent
2. Consumer executes refresh immediately
3. If refresh succeeds → queue item marked `completed`
4. If refresh fails → item stays `pending` for retry (up to `maxRetries`)
5. After max retries → item marked `failed` (dead-letter)
6. Completed items purged after 24h

### Queue features

- **Dedup**: Same (projection, entity_type, entity_id) collapses into one pending item
- **Priority**: Higher priority items processed first (`FOR UPDATE SKIP LOCKED`)
- **Atomic claim**: No double-processing even with concurrent crons
- **Backpressure**: Failed items don't block the queue

## Observability

### Admin endpoint

```
GET /api/internal/projections
```

Returns:
- All registered projections with their trigger events
- Per-projection 24h stats: events processed, successful, dead-letters, retrying, lag hours
- Queue stats: pending, processing, completed, failed
- Global health boolean

### Materialization health

```
GET /api/cron/materialization-health
```

Returns staleness checks for all materialized data sources (ICO, economics, member metrics).

### What to monitor

| Signal | Healthy | Attention | Action |
|--------|---------|-----------|--------|
| Dead letters | 0 | > 0 | Check `/api/internal/projections` for error details |
| Queue pending | < 10 | > 50 | Consumer may be falling behind — check cron execution |
| Queue failed | 0 | > 0 | Manual intervention needed — check `last_error` |
| Lag hours | < 2h | > 6h | Check if crons are running |

## Migrating Existing Crons

For modules that already have nightly crons (e.g., `economics-materialize`, `ico-member-sync`):

1. **Create a projection** that handles the targeted refresh (per-entity)
2. **Keep the existing cron** as a nightly safety net (full batch recompute)
3. The reactive path handles 90%+ of refreshes in real-time
4. The nightly cron catches anything the reactive path missed

```
Reactive path (real-time, per-entity):
  event → consumer → targeted refresh → queue completed

Nightly safety net (batch, all entities):
  cron → full recompute → overwrite stale snapshots
```

Both paths are idempotent — running them in parallel is safe.

## Event Catalog Reference

All available domain events are defined in `src/lib/sync/event-catalog.ts`. Key event types:

| Event | Typical projections |
|-------|-------------------|
| `assignment.created/updated/removed` | organization_360, ico_member_metrics, client_economics |
| `membership.created/updated/deactivated` | organization_360, client_economics |
| `member.created/updated` | ico_member_metrics |
| `service.created` | notification_dispatch |
| `identity.reconciliation.approved` | notification_dispatch |
| `finance.dte.discrepancy_found` | notification_dispatch |
| `identity.profile.linked` | notification_dispatch |

To add new events: extend `EVENT_TYPES` in `event-catalog.ts` and call `publishOutboxEvent()` from your domain store.

## Existing reusable example — member capacity economics

Greenhouse ya tiene un ejemplo real de este patrón en:

- proyección: `src/lib/sync/projections/member-capacity-economics.ts`
- store: `src/lib/member-capacity-economics/store.ts`
- tabla serving: `greenhouse_serving.member_capacity_economics`

Qué resuelve:

- combina assignments, payroll/compensation, FX y señal operativa por `member_id + period`
- evita que `Agency`, `People` o `My` recalculen fórmulas parecidas con semánticas distintas

Cuándo reutilizar esta proyección:

- cuando un consumer necesite capacidad/economía por miembro y período
- cuando se agregue una nueva fuente que deba enriquecer esa lectura

Cuándo no crear una proyección nueva:

- si el problema es un nuevo campo derivado del mismo snapshot
- si el problema es un nuevo consumer del mismo snapshot
- si falta agregar un nuevo trigger o una nueva fuente al mismo dominio

Referencia arquitectónica:

- `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`

## File Reference

| File | Purpose |
|------|---------|
| `src/lib/sync/projection-registry.ts` | Registry types and API |
| `src/lib/sync/projections/index.ts` | Registration entry point |
| `src/lib/sync/projections/*.ts` | Individual projection definitions |
| `src/lib/sync/reactive-consumer.ts` | Event processing with registry lookup |
| `src/lib/sync/refresh-queue.ts` | Persistent queue with dedup and retry |
| `src/lib/sync/event-catalog.ts` | Domain event type definitions |
| `src/lib/sync/publish-event.ts` | Outbox event publisher |
| `src/app/api/cron/outbox-react-*/route.ts` | Domain-partitioned cron routes |
| `src/app/api/internal/projections/route.ts` | Observability endpoint |
| `src/app/api/cron/materialization-health/route.ts` | Staleness health check |
