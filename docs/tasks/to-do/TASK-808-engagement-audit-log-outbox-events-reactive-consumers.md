# TASK-808 — Engagement Audit Log + Outbox Events v1 + Reactive Consumers

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-014`
- Status real: `Diseño aprobado`
- Domain: `commercial / platform`
- Blocked by: `TASK-801, TASK-802, TASK-803, TASK-804, TASK-805, TASK-806`
- Branch: `task/TASK-808-engagement-audit-log-outbox-reactive-consumers`

## Summary

Tabla `engagement_audit_log` append-only con triggers anti-update / anti-delete (patrón TASK-535/TASK-768). 9 outbox events versionados v1 (`service.engagement.*_v1`). Reactive consumers en ops-worker que ejecutan: lifecycle flip de `organizations` con campos canónicos `lifecycle_stage_source/by/since` (TASK-535/542 contract); HubSpot conditional `WHERE engagement_kind='regular' AND hubspot_deal_id IS NULL`. Es la capa async que cierra el Epic.

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
  - UPDATE `organizations` SET `lifecycle_stage='active_client'`, `lifecycle_stage_source='quote_converted'`, `lifecycle_stage_by=<actor>`, `lifecycle_stage_since=NOW()` (4 campos coordinados).
  - HubSpot deal creation conditional `WHERE engagement_kind='regular' AND hubspot_deal_id IS NULL` (Open Q6 — verificar path real existe).
- Conversion flow §8 implementado como helper TS atómico (`conversion-tx.ts`) — los 5 INSERTs core en una transacción + outbox event in-tx.

## Architecture Alignment

Spec: `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §3.2 Capa 8 + §5.4 + §5.5 + §8.

Patrones canónicos:

- TASK-535/TASK-768 — append-only audit log con triggers PG anti-mutation.
- TASK-771/773 — outbox + reactive consumer + dead_letter (canonical async path).
- TASK-542 — lifecycle history poblando los 4 campos coordinados (source/by/since + auto-snapshot via trigger).
- TASK-721 — asset uploader para `report_asset_id` referenciado en outcome.

Reglas obligatorias:

- `engagement_audit_log` es append-only. Triggers `engagement_audit_log_no_update` + `engagement_audit_log_no_delete` enforce.
- Outbox events versionados v1 declarados en `GREENHOUSE_EVENT_CATALOG_V1.md` antes del reactive consumer.
- Conversion flow es transaccional atómico — los 5 INSERTs commitean juntos o rollback completo (§8).
- Lifecycle flip puebla 4 campos coordinados — NO solo `lifecycle_stage`.
- HubSpot path conditional — pilotos quedan con `hubspot_deal_id=NULL` permanentemente.
- Reactive consumer es idempotent (at-least-once delivery — patrón canónico outbox).

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
- `src/lib/commercial/sample-sprints/conversion-tx.ts` — `convertEngagement({ serviceId, outcomeKind, decisionRationale, ...})` — wrap §8 BEGIN/COMMIT con los 5 INSERTs core + outbox event.

Reactive consumer (`services/ops-worker/handlers/engagement-converted.ts`):

- Lee `service.engagement.converted` v1 events.
- UPDATE `organizations` con 4 campos lifecycle coordinados.
- HubSpot deal creation conditional (verify path exists — Open Q6).
- Idempotent: usa `consumed_at` + `consumed_by` columns en outbox para dedup.

Reactive consumer para `service.engagement.cancelled`:

- Triggers email manual notification a operator owner (no automatic email to client — Delta v1.2 B2 deferral).

Tests:

- Unit: triggers PG rechazan UPDATE y DELETE en audit_log.
- Integration: conversion flow happy path commits 5 inserts + 1 outbox event atomically.
- Integration: conversion flow falla en step 4 → ROLLBACK completo verifiable.
- Integration: reactive consumer flipea lifecycle con 4 campos correctos.
- Integration: reactive consumer falla 5 veces → event va a dead_letter.

## Acceptance Criteria

- DDL + triggers aplicados y verificados (try UPDATE → expected error).
- 9 events declarados en EVENT_CATALOG.
- 2 helpers TS + 1 reactive consumer con tests cubriendo happy + rollback + dead_letter paths.
- Lifecycle flip pueble 4 campos coordinados (verificable via SQL post-conversion).
- `pnpm test` + `pnpm lint` + `pnpm build` verde.
- ops-worker deploy script actualizado para incluir nuevos consumers.

## Dependencies

- Blocked by: TASK-801, TASK-802, TASK-803, TASK-804, TASK-805, TASK-806 (consumer puede emit events para todas las primitivas).
- Bloquea: TASK-809 (UI dispara conversion_tx + emite events).

## References

- Spec: §3.2 Capa 8 + §5.4 + §5.5 + §8 + §8.1
- Patrón: TASK-535/542 lifecycle history + TASK-768 append-only audit + TASK-771/773 outbox
- Epic: `docs/epics/to-do/EPIC-014-sample-sprints-engagement-platform.md`
