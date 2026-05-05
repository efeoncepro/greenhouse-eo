# TASK-807 — Commercial Health Reliability Subsystem (NEW)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-014`
- Status real: `Diseño aprobado`
- Domain: `commercial / platform`
- Blocked by: `TASK-801, TASK-803, TASK-804, TASK-805`
- Branch: `task/TASK-807-commercial-health-reliability-subsystem`

## Summary

Crea **subsystem nuevo `Commercial Health`** en el reliability registry — primer subsystem del módulo Commercial (mirror del precedent TASK-672 `Finance Data Quality`). Wirea 6 reliability signals: `overdue_decision`, `budget_overrun`, `zombie`, `unapproved_active`, `conversion_rate_drop`, `stale_progress`. Visible en `/admin/operations`.

## Why This Task Exists

Sin signals + subsystem rollup, los Sample Sprints derivan en zombies invisibles: pilotos activos sin outcome durante meses, Sprints sin approval que silenciosamente queman costos, Sprints con budget overrun sin alerta, conversion rate trending down sin warning. La spec V1.2 establece 6 signals canónicos. El subsystem `Commercial Health` no existe hoy en `src/lib/reliability/` y debe crearse explícitamente.

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
- Visible en `/admin/operations` bajo subsystem rollup.

## Architecture Alignment

Spec: `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §5.3.

Patrones canónicos:

- TASK-672 — Platform Health V1 contract + reliability registry pattern.
- TASK-535/542 — query reliability con steady=0 + threshold-based.

Reglas obligatorias:

- Subsystem `Commercial Health` se registra como nuevo en el registry (NO existe hoy).
- Cada signal tiene `kind` + `severity` + `steady` declarados explícitamente.
- Queries son read-only (nunca mutan estado).
- `conversion_rate_drop` threshold default 30% — configurable via env / settings.

## Slice Scope

Reliability queries (`src/lib/reliability/queries/`):

1. `engagement-overdue-decision.ts` — engagements con `phase_kind='reporting'` cerrada hace +14d sin `engagement_outcome`.
2. `engagement-budget-overrun.ts` — engagements donde `actual_cost > expected * 1.2`.
3. `engagement-zombie.ts` — `engagement_kind != 'regular'` AND `status='active'` AND start > 90d sin transition_event.
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

UI integration: `/admin/operations` consume reliability registry, automaticamente muestra el nuevo subsystem.

Tests:

- Unit cada query: caso steady (count=0) y caso non-steady.
- Integration: `getReliabilityOverview()` incluye subsystem `Commercial Health`.

## Acceptance Criteria

- 6 queries TS con tests cubriendo steady + non-steady.
- Subsystem registrado y visible en `/admin/operations`.
- Runbook stubs creados (apuntan a Open Q V2 para detalle).
- `pnpm test` + `pnpm lint` verde.

## Dependencies

- Blocked by: TASK-801, TASK-803, TASK-804, TASK-805 (cada query lee tablas de slices previos).
- Bloquea: TASK-809 (UI muestra signals en dashboard de pilots).

## References

- Spec: §5.3 (6 signals)
- Patrón: TASK-672 (Platform Health V1) + `src/lib/reliability/queries/`
- Epic: `docs/epics/to-do/EPIC-014-sample-sprints-engagement-platform.md`
