# TASK-807 — Commercial Health Reliability Subsystem (NEW)

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-014`
- Status real: `Cerrada 2026-05-07`
- Domain: `commercial / platform`
- Blocked by: `TASK-801, TASK-803, TASK-804, TASK-805`
- Branch: `develop` (por instruccion explicita del usuario; no se creo branch task)

## Summary

Crea **subsystem nuevo `Commercial Health`** en el reliability registry — primer subsystem operativo del módulo Commercial (mirror del precedent TASK-672 `Finance Data Quality`). Wirea 6 reliability signals: `overdue_decision`, `budget_overrun`, `zombie`, `unapproved_active`, `conversion_rate_drop`, `stale_progress`. Visible en la surface real vigente `/admin/ops-health` y en el Reliability Control Plane consumido por Admin Center/API.

## Approved Mockup Context

- Mockup del programa aprobado por usuario el 2026-05-07.
- Ruta: `/agency/sample-sprints/mockup`.
- Artefactos: `src/app/(dashboard)/agency/sample-sprints/mockup/page.tsx` y `src/views/greenhouse/agency/sample-sprints/mockup/SampleSprintsMockupView.tsx`.
- El subsystem real debe preservar la superficie aprobada de `Commercial Health`: rollup con severidad máxima, seis signals, counts steady/non-steady y runbook breve por signal.

## Why This Task Exists

Sin signals + subsystem rollup, los Sample Sprints derivan en zombies invisibles: pilotos activos sin outcome durante meses, Sprints sin approval que silenciosamente queman costos, Sprints con budget overrun sin alerta, conversion rate trending down sin warning. La spec V1.2 establece 6 signals canónicos. El módulo reliability `commercial` ya existía por TASK-813, pero el subsystem operativo `Commercial Health` no existía y debía formalizarse explícitamente.

## Goal

- Subsystem `Commercial Health` registrado en reliability registry con metadata canónica (mirror de `Finance Data Quality`).
- 6 signals registradas:
  - `commercial.engagement.overdue_decision` (drift, error, steady=0)
  - `commercial.engagement.budget_overrun` (drift, warning, steady=0)
  - `commercial.engagement.zombie` (drift, error, steady=0)
  - `commercial.engagement.unapproved_active` (drift, error, steady=0)
  - `commercial.engagement.conversion_rate_drop` (drift, warning, threshold dinámico)
  - `commercial.engagement.stale_progress` (drift, warning, steady=0)
- 6 reliability queries en `src/lib/reliability/queries/engagement-*.ts`.
- Cada signal con runbook stub (Open Q — runbooks completos en V2).
- Visible en `/admin/ops-health` bajo subsystem rollup y en `getReliabilityOverview()`.

## Architecture Alignment

Spec: `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §5.3.

Patrones canónicos:

- TASK-672 — Platform Health V1 contract + reliability registry pattern.
- TASK-535/542 — query reliability con steady=0 + threshold-based.

Reglas obligatorias:

- Subsystem `Commercial Health` se registra como nuevo en el registry (NO existe hoy).
- Cada signal tiene `kind` + `severity` + `steady` declarados explícitamente.
- Queries son read-only (nunca mutan estado).
- `conversion_rate_drop` threshold default 30% — configurable via env `GREENHOUSE_COMMERCIAL_ENGAGEMENT_CONVERSION_RATE_THRESHOLD` (`0.3` o `30`).

## Implementation Decisions 2026-05-07

- **Branch:** se ejecuta sobre `develop` por instrucción explícita del usuario; no se crea branch task.
- **Módulo vs subsystem:** `commercial` ya existía en `STATIC_RELIABILITY_REGISTRY` desde TASK-813. TASK-807 no crea otro módulo paralelo; agrega `Commercial Health` como `OperationsSubsystem` y mapea `subsystem.commercial_health` al módulo `commercial`.
- **Ruta visible:** el repo usa `/admin/ops-health` como surface real de Ops Health. Las referencias legacy a `/admin/operations` quedan tratadas como nomenclatura histórica.
- **`stale_progress`:** ya estaba implementado por TASK-805 en `src/lib/reliability/queries/engagement-stale-progress.ts`; TASK-807 lo reutiliza y mueve su conteo a la primitive compartida `src/lib/commercial/sample-sprints/health.ts`.
- **`zombie`:** no existe `transition_event` en runtime. La definición real es service non-regular elegible, activo, `start_date > 90d`, sin `engagement_outcomes` y sin `engagement_lineage` como parent/child.
- **`budget_overrun`:** usa actual cost desde `greenhouse_serving.commercial_cost_attribution_v2` agrupado por `service_id` y `attribution_intent IN ('pilot','trial','poc','discovery')`; no usa solo `gtm_investment_pnl` porque esa view filtra `terms_kind='no_cost'`.
- **`conversion_rate_drop`:** se calcula sobre outcomes terminales trailing 6m de services non-regular no archived/no unmapped. Si no hay outcomes, queda `ok` porque no hay denominador evaluable.

## Slice Scope

Reliability queries (`src/lib/reliability/queries/`):

1. `engagement-overdue-decision.ts` — engagements con `phase_kind='reporting'` cerrada hace +14d sin `engagement_outcome`.
2. `engagement-budget-overrun.ts` — engagements donde `actual_cost > expected * 1.2`.
3. `engagement-zombie.ts` — `engagement_kind != 'regular'` AND `status='active'` AND start > 90d sin outcome ni lineage.
4. `engagement-unapproved-active.ts` — services con `engagement_kind != 'regular'` AND `status != 'pending_approval'` sin approval `status='approved'`.
5. `engagement-conversion-rate-drop.ts` — trailing 6m conversion rate < threshold.
6. `engagement-stale-progress.ts` — engagement activo sin snapshot > 10 días (usa query de TASK-805).

Subsystem registration (en `src/lib/reliability/registry.ts` o equivalente canónico):

```ts
{
  name: 'Commercial Health',
  description: 'Reliability signals for Sample Sprints and engagement governance',
  signals: [
    'commercial.engagement.overdue_decision',
    'commercial.engagement.budget_overrun',
    'commercial.engagement.zombie',
    'commercial.engagement.unapproved_active',
    'commercial.engagement.conversion_rate_drop',
    'commercial.engagement.stale_progress',
  ],
  rollupSeverity: 'max',  // si cualquier signal es error, subsystem es error
}
```

UI integration: `/admin/ops-health` consume `OperationsSubsystem` y ahora incluye `Commercial Health`; Admin Center/API consumen `getReliabilityOverview()`.

Tests:

- Unit cada query: caso steady (count=0) y caso non-steady.
- Integration: `getReliabilityOverview()` incluye subsystem `Commercial Health`.

## Delivered Slices

- `src/lib/commercial/sample-sprints/health.ts` — primitive read-only reusable de conteos y threshold.
- `src/lib/reliability/queries/engagement-{overdue-decision,budget-overrun,zombie,unapproved-active,conversion-rate-drop}.ts` — cinco readers nuevos con degradación honesta.
- `src/lib/reliability/queries/engagement-stale-progress.ts` — reutilizado, ahora consume la primitive compartida.
- `src/lib/reliability/signals.ts` — builder `buildCommercialHealthSignals()` + mapping `Commercial Health -> commercial`.
- `src/lib/operations/get-operations-overview.ts` — builder `buildCommercialHealthSubsystem()` con seis metrics y rollup max severity.
- `src/lib/reliability/get-reliability-overview.ts` — inyección de las seis signals en paralelo.
- `src/lib/reliability/registry.ts` — módulo `commercial` actualizado con `expectedSignalKinds: ['subsystem','drift','lag']`.
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx` — whitelist incluye `Commercial Health`.
- `src/app/(dashboard)/admin/page.tsx` — Admin Center usa `getReliabilityOverview()` para hidratar readers async.

## Verification 2026-05-07

- `pnpm pg:doctor` OK.
- `pnpm test src/lib/reliability/queries/engagement-commercial-health.test.ts src/lib/reliability/queries/engagement-stale-progress.test.ts src/lib/reliability/signals.test.ts src/lib/operations/get-operations-overview.test.ts` OK (18 tests).
- `pnpm exec tsc --noEmit --pretty false` OK.
- `pnpm lint` OK.
- `pnpm test` OK (606 files / 3531 passed / 5 skipped).
- `pnpm design:lint` OK (0 errors / 0 warnings).
- `pnpm build` OK.
- Runtime smoke directo via `pnpm tsx -e` no aplica para estos readers porque importan `server-only`; se cubre con `pg:doctor`, tests focales, tsc, lint, test completo y build Next.

## Acceptance Criteria

- 6 queries TS con tests cubriendo steady + non-steady.
- Subsystem registrado y visible en `/admin/ops-health`.
- Runbook stub operativo queda expresado en summaries/details de cada signal; runbooks completos siguen como V2.
- `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm exec tsc --noEmit --pretty false`, `pnpm design:lint` y `pnpm pg:doctor` verdes.

## Dependencies

- Blocked by: TASK-801, TASK-803, TASK-804, TASK-805 (cada query lee tablas de slices previos).
- Bloquea: TASK-809 (UI muestra signals en dashboard de pilots).

## References

- Spec: §5.3 (6 signals)
- Patrón: TASK-672 (Platform Health V1) + `src/lib/reliability/queries/`
- Epic: `docs/epics/to-do/EPIC-014-sample-sprints-engagement-platform.md`
