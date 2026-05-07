# TASK-805 — Engagement Progress Snapshots Weekly Cadence

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-014`
- Status real: `Cerrada 2026-05-07 en develop`
- Domain: `commercial`
- Blocked by: `TASK-801`
- Branch: `develop` (por instrucción explícita del usuario; no crear branch task)

## Summary

Slice 4.5 introducido en Delta v1.2 (B3). Tabla `engagement_progress_snapshots` con UNIQUE `(service_id, snapshot_date)` para tracking semanal. Capability `commercial.engagement.record_progress` (route_group=commercial/agency, no requiere admin). Helper TS canónico para registrar + leer snapshots. Reliability signal `commercial.engagement.stale_progress` (warning si > 10 días sin snapshot durante engagement activo).

## Approved Mockup Context

- Mockup del programa aprobado por usuario el 2026-05-07.
- Ruta: `/agency/sample-sprints/mockup`.
- Artefactos: `src/app/(dashboard)/agency/sample-sprints/mockup/page.tsx` y `src/views/greenhouse/agency/sample-sprints/mockup/SampleSprintsMockupView.tsx`.
- El recorder real debe alimentar el wizard semanal aprobado, incluyendo estado stale progress y error por duplicado `(service_id, snapshot_date)` de forma recuperable.

## Why This Task Exists

Sin snapshots durante operación, el reporte final del Sample Sprint es trabajo arqueológico al cierre — operador busca en Notion, Slack, emails, recuerda. La spec V1.2 lo identifica como precondición para auto-report V2 + forensic trail si el operador owner del Sprint deja la empresa mid-flight. Cadence semanal es deliberada (no daily — sería ruido; no monthly — pierde granularidad de Sprint de 4 semanas).

## Goal

- Tabla `engagement_progress_snapshots` creada con UNIQUE constraint anti-duplicado y index DESC para listing.
- Capability `commercial.engagement.record_progress` con allowed source amplio (operadores no necesitan ser admins).
- Helpers TS: `recordProgressSnapshot`, `listSnapshotsForService(serviceId)`, `getLatestSnapshot(serviceId)`.
- Reliability signal `commercial.engagement.stale_progress` integrada al subsystem `Commercial Health` (TASK-807 lo wirea al registry).

## Implementation Notes 2026-05-07

- Drift resuelto: `service_id` es `TEXT`, no `UUID`; DDL y helper siguen el contrato real de TASK-801.
- `commercial.engagement.record_progress` ya existía en catálogo/runtime; esta task agrega coverage explícito y no duplica capability.
- `metrics_json` queda flexible en V1, pero debe ser objeto JSON no vacío. Templates por `engagement_kind` quedan fuera de scope/V2.
- `stale_progress` se integra como signal del `moduleKey='commercial'`; TASK-807 conserva ownership del subsystem completo `Commercial Health`.
- Sin UI/API/outbox en este slice: TASK-809 conecta la surface aprobada y TASK-808 agrega audit/outbox.

## Architecture Alignment

Spec: `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §3.2 Capa 6.

Patrones canónicos:

- TASK-700/535 — UNIQUE constraint + append-only semantics (snapshot es histórico, no se actualiza).
- TASK-672 — reliability signal pattern.

Reglas obligatorias:

- Cadence canónica weekly: UNIQUE `(service_id, snapshot_date)` previene > 1 snapshot per día per service.
- `metrics_json` es schema-flexible en V1 (Open Q10 — V2 puede definir templates por engagement_kind).
- `recorded_by` FK a `client_users` ON DELETE SET NULL (preserve audit cuando operador deja empresa).
- Signal `stale_progress` thresh > 10 días (10 días = 1.5 semanas, tolerancia para fines de semana / días feriados / postergación corta).

## Slice Scope

DDL (§3.2 Capa 6):

```sql
CREATE TABLE greenhouse_commercial.engagement_progress_snapshots (...);
CREATE INDEX engagement_progress_service_date_idx ON ... (service_id, snapshot_date DESC);
```

Capability:

- `commercial.engagement.record_progress` — route_group=commercial / route_group=agency / EFEONCE_ADMIN

Helpers TS (`src/lib/commercial/sample-sprints/progress-recorder.ts`):

- `recordProgressSnapshot({ serviceId, snapshotDate, metricsJson, qualitativeNotes?, recordedBy })`
- `listSnapshotsForService(serviceId): EngagementProgressSnapshot[]`
- `getLatestSnapshot(serviceId): EngagementProgressSnapshot | null`

Reliability query (`src/lib/reliability/queries/engagement-stale-progress.ts`):

```sql
SELECT s.service_id, MAX(eps.snapshot_date) AS last_snapshot, CURRENT_DATE - MAX(eps.snapshot_date) AS days_since
FROM greenhouse_core.services s
LEFT JOIN greenhouse_commercial.engagement_progress_snapshots eps ON eps.service_id = s.service_id
WHERE s.engagement_kind != 'regular' AND s.status = 'active'
GROUP BY s.service_id
HAVING MAX(eps.snapshot_date) IS NULL OR CURRENT_DATE - MAX(eps.snapshot_date) > INTERVAL '10 days';
```

Tests:

- Unit: helpers CRUD.
- Integration: cadencia weekly cubre el caso "operador registra cada viernes".
- Constraint: 2 snapshots mismo día → rejected.
- Reliability: signal emite warning cuando engagement activo sin snapshot 11 días.

## Acceptance Criteria

- [x] DDL + index aplicados.
- [x] `db.d.ts` regenerado.
- [x] 3 helpers TS con tests.
- [x] Reliability signal query verificada con caso 0 (steady) y caso > 0 (warning).
- [x] Capability registrada y testeada.

## Closure 2026-05-07

- Migration aplicada: `20260507152450308_task-805-engagement-progress-snapshots.sql`.
- Helper entregado: `src/lib/commercial/sample-sprints/progress-recorder.ts`.
- Reliability entregado: `src/lib/reliability/queries/engagement-stale-progress.ts` + inyección en `get-reliability-overview`.
- Access model: sin nuevos `routeGroups`, `views` ni startup policy; se reutiliza `commercial.engagement.record_progress`.
- Validación: `pnpm pg:connect:migrate`, `pnpm pg:doctor`, focal tests, `pnpm exec tsc --noEmit --pretty false`, `pnpm lint`, `pnpm test`, `pnpm build`.

## Dependencies

- Blocked by: TASK-801.
- Bloquea: TASK-807 (signal wireup), TASK-809 (UI wizard semanal).

## References

- Spec: §3.2 Capa 6 + §5.3 (signal `stale_progress`)
- Delta v1.2 — B3 decision
- Epic: `docs/epics/to-do/EPIC-014-sample-sprints-engagement-platform.md`
