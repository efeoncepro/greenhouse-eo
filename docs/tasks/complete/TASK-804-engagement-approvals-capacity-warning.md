# TASK-804 — Engagement Approvals Workflow + Capacity Warning Soft

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-014`
- Status real: `Cerrada 2026-05-07 en develop`
- Domain: `commercial`
- Blocked by: `TASK-801, TASK-803`
- Branch: `develop` (por instrucción explícita del usuario; no crear branch task)

## Summary

Tabla `engagement_approvals` con state machine `pending → approved | rejected | withdrawn`. Capability granular `commercial.engagement.approve` (EFEONCE_ADMIN hoy + COMMERCIAL_LEAD futuro). Helper TS `getMemberCapacityForPeriod` para capacity warning soft (NO hard blocker). Approval con override required: si capacity > 100%, aprobador debe declarar `capacity_override_reason ≥ 10 chars` y el snapshot del warning se persiste en `capacity_warning_json`.

## Approved Mockup Context

- Mockup del programa aprobado por usuario el 2026-05-07.
- Ruta: `/agency/sample-sprints/mockup`.
- Artefactos: `src/app/(dashboard)/agency/sample-sprints/mockup/page.tsx` y `src/views/greenhouse/agency/sample-sprints/mockup/SampleSprintsMockupView.tsx`.
- El approval/capacity warning real debe preservar el flujo aprobado: warning soft, override reason auditado y tabla de capacidad por miembro.

## Why This Task Exists

Sin approval workflow, cualquier vendedor puede declarar Sample Sprints "sin costo" sin gobierno y quemar capacidad del equipo. Sin capacity warning, los aprobadores aprueban a ciegas (Valentina podría estar al 95% y nadie lo ve). Sin override audit, los hard blockers generan falsos negativos cuando el sistema no conoce vacaciones futuras o transitions.

## Goal

- Tabla `engagement_approvals` con DDL §3.2 Capa 7 incluyendo `capacity_warning_json` + `capacity_override_reason`.
- Capability `commercial.engagement.approve` registrada (EFEONCE_ADMIN allowed source).
- Helper `getMemberCapacityForPeriod(memberId, fromDate, toDate)` retorna `{ totalFte, allocatedFte, availableFte, conflictingAssignments[] }`.
- Approval flow: si capacity > 100% para algún miembro propuesto → UI/API muestra warning + requiere override_reason. Sin warning, override_reason puede quedar NULL.
- State machine: services con `engagement_kind != 'regular'` y sin approval row aprobada quedan en `status='pending_approval'`. NO se materializan cost attributions hasta approval.

## Architecture Alignment

Spec: `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §3.2 Capa 7 + §5.1 + §5.2.

Patrones canónicos:

- TASK-742 — capability granular dedicada + approval workflow (7 capas defense)
- TASK-700/765 — state machine con CHECK enum
- TASK-760/761/762 — FK actor pattern

Reglas obligatorias:

- `commercial.engagement.approve` separada de `services.create` — no reutilizar capability genérica.
- Capacity warning es **soft**: aprobador puede forzar pero debe declarar `capacity_override_reason`.
- Snapshot del warning se persiste en `capacity_warning_json` para audit (incluso si no se usa override).
- Sin approval `status='approved'`, no se materializa cost attribution (gate enforced en TASK-806 reclassifier).

## Slice Scope

DDL (§3.2 Capa 7):

```sql
CREATE TABLE greenhouse_commercial.engagement_approvals (...);
CREATE INDEX engagement_approvals_pending_idx ON ... (status, decision_deadline) WHERE status = 'pending';
```

Capability registration (`src/config/capabilities.ts` o equivalente canónico):

- `commercial.engagement.declare` — route_group=commercial / EFEONCE_ADMIN
- `commercial.engagement.approve` — EFEONCE_ADMIN
- `commercial.engagement.read` — route_group=commercial / route_group=agency / EFEONCE_ADMIN

Helpers TS (`src/lib/commercial/sample-sprints/`):

- `approvals.ts` — `requestApproval`, `approveEngagement` (con capacity check + optional override), `rejectEngagement`, `withdrawApproval`.
- `capacity-checker.ts` — `getMemberCapacityForPeriod(memberId, fromDate, toDate)` cruzando `client_team_assignments`.

Tests:

- Unit: capacity calculation con assignments overlapping.
- Integration: approval flow happy path.
- Integration: approval con capacity > 100% sin override_reason → rejected.
- Integration: approval con capacity > 100% + override_reason → accepted, persiste snapshot.
- Capability test: usuario sin EFEONCE_ADMIN no puede aprobar.

## Acceptance Criteria

- DDL aplicada y verificada.
- 4 helpers TS con tests unitarios.
- 5 integration tests cubren flow completo.
- Capability tests verifican gating.
- `pnpm test` + `pnpm lint` + `pnpm build` verde.

## Dependencies

- Blocked by: TASK-801, TASK-803.
- Bloquea: TASK-806 (reclassifier requiere approval gate), TASK-808, TASK-809.

## References

- Spec: §3.2 Capa 7 + §5.1 + §5.2
- Patrón: TASK-742 (auth resilience 7-capas)
- Epic: `docs/epics/to-do/EPIC-014-sample-sprints-engagement-platform.md`

## Implementation Notes

- Migration aplicada: `migrations/20260507145320864_task-804-engagement-approvals-capacity-warning.sql`.
- Tabla creada: `greenhouse_commercial.engagement_approvals`.
- Runtime drift resuelto:
  - `service_id` implementado como `TEXT`, no `UUID`.
  - actor FKs quedan nullable en DB por `ON DELETE SET NULL`; helpers exigen actor input.
  - `commercial.engagement.approve` ya existía en catálogo/runtime; se reutilizó y se agregaron tests de gating.
  - `services.status` no tiene CHECK; `pending_approval` es representable sin DDL adicional.
- Helpers creados:
  - `src/lib/commercial/sample-sprints/capacity-checker.ts`
  - `src/lib/commercial/sample-sprints/approvals.ts`
- Approval flow:
  - `requestApproval` valida service elegible TASK-813 + non-regular y marca `services.status='pending_approval'`.
  - `approveEngagement` calcula capacity snapshot, exige override si capacity >100% y marca el service `active`.
  - `rejectEngagement` y `withdrawApproval` preservan actor evidence y reason cuando aplica.
- Sin UI/API/outbox/reliability signals en este slice; TASK-809 y TASK-808 mantienen ownership.

## Verification

- `pnpm pg:doctor` — OK durante discovery.
- `pnpm vitest run src/lib/commercial/sample-sprints` — OK.
- `pnpm vitest run src/lib/commercial/sample-sprints/approvals.test.ts src/lib/entitlements/runtime.test.ts` — OK.
- `pnpm pg:connect:migrate` — OK; types regenerados en `src/types/db.d.ts`.
- `pnpm exec tsc --noEmit --pretty false` — OK.
- `pnpm lint` — OK.
- `pnpm build` — OK.
- `pnpm test` — 600/601 files OK; timeout aislado heredado en `src/views/greenhouse/hr-core/HrHierarchyView.test.tsx`.
- `pnpm vitest run src/views/greenhouse/hr-core/HrHierarchyView.test.tsx` — OK (4/4) tras el timeout del full run.
