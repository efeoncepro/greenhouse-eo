# TASK-808 — Engagement Audit Log + Outbox Events v1 + Reactive Consumers

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-014`
- Status real: `Cerrada 2026-05-07 en develop`
- Domain: `commercial / platform`
- Blocked by: `TASK-801, TASK-802, TASK-803, TASK-804, TASK-805, TASK-806`
- Branch: `develop` (por instruccion explicita del usuario; no crear branch task)

## Summary

Tabla `engagement_audit_log` append-only con triggers anti-update / anti-delete (patrón TASK-535/TASK-768). 9 outbox events versionados v1 (`service.engagement.*` con `payload_json.version=1`, sin sufijo `_v1`). Reactive consumers en el registry canónico que ejecutan: promoción lifecycle vía `promoteParty()` (TASK-535/542 contract); HubSpot service→deal queda diferido porque el runtime real solo tiene comando canónico Quote Builder → Deal. Es la capa async que cierra el Epic sin side-effects inline.

## Approved Mockup Context

- Mockup del programa aprobado por usuario el 2026-05-07.
- Ruta: `/agency/sample-sprints/mockup`.
- Artefactos: `src/app/(dashboard)/agency/sample-sprints/mockup/page.tsx` y `src/views/greenhouse/agency/sample-sprints/mockup/SampleSprintsMockupView.tsx`.
- Audit log, outbox y conversion helpers reales deben alimentar el audit feed/event preview aprobados sin mover side effects inline a la UI.

## Why This Task Exists

Sin audit log, no hay forensic trail de decisiones críticas (approval, outcome, lineage, conversión). Sin outbox + reactive consumers, los side effects post-conversión (lifecycle flip, HubSpot deal creation) viven inline en el request handler — exactamente el anti-pattern que TASK-771/773 cerró para finance. El path canónico async (Cloud Scheduler + ops-worker) es la única forma resiliente de propagar cambios downstream.

## Goal

- Tabla `engagement_audit_log` con DDL §3.2 Capa 8 + 2 functions + 2 triggers anti-mutation.
- 9 outbox events declarados en `GREENHOUSE_EVENT_CATALOG_V1.md`:
  - `service.engagement.declared` v1
  - `service.engagement.approved` v1
  - `service.engagement.rejected` v1
  - `service.engagement.capacity_overridden` v1
  - `service.engagement.phase_completed` v1
  - `service.engagement.progress_snapshot_recorded` v1
  - `service.engagement.outcome_recorded` v1
  - `service.engagement.cancelled` v1
  - `service.engagement.converted` v1
- Reactive consumer para `service.engagement.converted`:
  - llama `promoteParty({ toStage:'active_client', source:'quote_converted' })` para poblar lifecycle history, campos coordinados, client/profile side-effects y eventos party.
  - registra en metadata cuando HubSpot deal creation queda diferido por falta de comando canónico service→deal.
- Conversion flow §8 implementado como helper TS atómico (`conversion.ts`) — outcome + terms opcionales + lineage opcional + audit + outbox event en una transacción.

## Architecture Alignment

Spec: `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §3.2 Capa 8 + §5.4 + §5.5 + §8.

Patrones canónicos:

- TASK-535/TASK-768 — append-only audit log con triggers PG anti-mutation.
- TASK-771/773 — outbox + reactive consumer + dead_letter (canonical async path).
- TASK-542 — lifecycle history y campos coordinados via `promoteParty()`.
- TASK-721 — asset uploader para `report_asset_id` referenciado en outcome.

Reglas obligatorias:

- `engagement_audit_log` es append-only. Triggers `engagement_audit_log_no_update` + `engagement_audit_log_no_delete` enforce.
- Outbox events versionados v1 declarados en `GREENHOUSE_EVENT_CATALOG_V1.md`; la version vive en `payload_json.version`.
- Conversion flow es transaccional atómico — los 5 INSERTs commitean juntos o rollback completo (§8).
- Lifecycle flip usa `promoteParty()` — NO update directo a `organizations`.
- HubSpot path service→deal queda diferido hasta crear comando canónico con governance/rate-limit/idempotency; no se llama directo al bridge Cloud Run desde TASK-808.
- Reactive consumer es idempotent via `greenhouse_sync.outbox_reactive_log(event_id, handler)` (at-least-once delivery — patrón canónico outbox).

## Slice Scope

DDL (§3.2 Capa 8):

```sql
CREATE TABLE greenhouse_commercial.engagement_audit_log (...);
CREATE INDEX engagement_audit_service_idx ON ... (service_id, occurred_at DESC);
CREATE OR REPLACE FUNCTION greenhouse_commercial.engagement_audit_no_update() ...;
CREATE OR REPLACE FUNCTION greenhouse_commercial.engagement_audit_no_delete() ...;
CREATE TRIGGER engagement_audit_log_no_update ...;
CREATE TRIGGER engagement_audit_log_no_delete ...;
```

Outbox events declaration (`docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`):

- 9 events nuevos con schema JSON canónico, version v1.

Helpers TS:

- `src/lib/commercial/sample-sprints/audit-log.ts` — `recordAuditEvent({ serviceId, eventKind, actorUserId, payloadJson, reason? })`.
- `src/lib/commercial/sample-sprints/conversion.ts` — `convertEngagement({ serviceId, decisionRationale, ...})` — wrap §8 BEGIN/COMMIT con outcome + terms/lineage cuando aplican + audit + outbox event.

Reactive consumer (`src/lib/sync/projections/engagement-converted.ts`):

- Lee `service.engagement.converted` v1 events.
- Promueve lifecycle via `promoteParty()`.
- HubSpot deal creation service→deal diferida y documentada en payload/metadata.
- Idempotent: dedup por `outbox_reactive_log`.

Reactive consumer para `service.engagement.cancelled`:

- Crea notificacion interna `system_event` para follow-up manual; no envia email automatico a cliente (Delta v1.2 B2 deferral).

Tests:

- Unit: triggers PG rechazan UPDATE y DELETE en audit_log.
- Integration: conversion flow happy path commits 5 inserts + 1 outbox event atomically.
- Integration: conversion flow falla en step 4 → ROLLBACK completo verifiable.
- Integration: reactive consumer flipea lifecycle con 4 campos correctos.
- Integration: reactive consumer falla 5 veces → event va a dead_letter.

## Acceptance Criteria

- DDL + triggers aplicados y verificados (try UPDATE → expected error).
- 9 events declarados en EVENT_CATALOG.
- Helpers TS + reactive projections con tests cubriendo publish/audit y lifecycle/notification paths.
- Lifecycle flip pueble 4 campos coordinados (verificable via SQL post-conversion).
- `pnpm test` + `pnpm lint` + `pnpm build` verde.
- ops-worker deploy script sin cambios: se registran projections en dominios existentes (`cost_intelligence` y `notifications`) ya drenados por Cloud Scheduler.

## Open Questions Resolved

- **Q6 HubSpot deal creation:** no existe comando canónico service→deal. El path real robusto es `createDealFromQuoteContext()` para Quote Builder, con governance, attempts, rate-limit, metadata HubSpot y upsert local. TASK-808 no bypassa esa capa; deja metadata `deferred_no_canonical_service_to_deal_command` para follow-up.
- **Reactive idempotency:** `outbox_events.consumed_at/consumed_by` no existe. La deduplicación canónica vive en `greenhouse_sync.outbox_reactive_log(event_id, handler)`.
- **Lifecycle flip:** no hacer SQL directo sobre `organizations`; `promoteParty()` es el writer canónico.
- **Projection domain:** no se crea domain `commercial`; converted usa `cost_intelligence` y cancelled usa `notifications`, ambos con scheduler existente.

## Dependencies

- Blocked by: TASK-801, TASK-802, TASK-803, TASK-804, TASK-805, TASK-806 (consumer puede emit events para todas las primitivas).
- Bloquea: TASK-809 (UI dispara conversion_tx + emite events).

## References

- Spec: §3.2 Capa 8 + §5.4 + §5.5 + §8 + §8.1
- Patrón: TASK-535/542 lifecycle history + TASK-768 append-only audit + TASK-771/773 outbox
- Epic: `docs/epics/to-do/EPIC-014-sample-sprints-engagement-platform.md`
