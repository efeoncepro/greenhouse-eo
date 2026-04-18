# TASK-421 — Finance Metric Targets Editable + Effective-Dating (v2)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-416, TASK-417, TASK-419`
- Branch: `task/TASK-421-finance-metric-targets-editable-effective-dating`

## Summary

Implementar v2 del contrato de targets: tabla `greenhouse_finance.metric_targets` con effective-dating (`effective_from`, `superseded_at`) y scope (`organization_id`, `client_id`, opcional), admin UI en Settings para que el CFO pueda editar targets sin cambiar código, y extender `getMetric(id, { asOf })` para resolver el target vigente en esa fecha.

## Why This Task Exists

v1 del registry declara `target.defaultValue` como constante en código. Eso funciona para bootstrapping pero no escala: cambiar target de `net_margin_pct` requiere PR, deploy y aprobación de ingeniería. Un CFO razonable debería poder ajustarlos en Settings. Además, comparaciones históricas ("margen de marzo vs **target de marzo**") requieren que targets tengan versión temporal; sin eso, cambios de target retroactivamente distorsionan métricas de semáforo.

## Goal

- Migration `greenhouse_finance.metric_targets` con `metric_id`, `scope_kind`, `scope_id`, `target_value`, `effective_from`, `superseded_at`, `set_by_user_id`
- `getMetric(id, { asOf })` resuelve target vigente a la fecha dada
- Admin UI `Settings → Finance → Metric Targets` (tabla editable con history per-metric)
- Backfill inicial: para cada métrica con `target.source = 'editable_per_org'` poblar una fila con `defaultValue`
- Event outbox `finance.metric_target.set` para auditabilidad

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` §4.3 (reader asOf) + §6.3
- Patrón de effective-dating en `compensation_versions` / `leave_policies` como referencias

Reglas obligatorias:

- Effective-dating estricto: `effective_from <= asOf < superseded_at` (o `superseded_at IS NULL`)
- Scope hierarchy: target per-client tiene precedencia sobre per-org; si no hay ninguno, usa `defaultValue` del registry
- Auditabilidad: toda edición publica evento outbox
- Only users con rol `finance_manager` o `efeonce_admin` pueden editar

## Dependencies & Impact

### Depends on

- TASK-416, TASK-417, TASK-419 (foundation, reader, patrón dashboard)

### Blocks / Impacts

- TASK-423 (per-scope thresholds) puede construirse encima de este
- Signal engine empieza a usar thresholds `vs_target` correctamente

### Files owned

- `migrations/####_finance-metric-targets.sql`
- `src/app/api/admin/finance/metric-targets/**`
- `src/views/greenhouse/admin/MetricTargetsView.tsx` (o sección en Settings)
- `src/lib/finance/metric-registry/reader.ts` (extender getMetric)

## Current Repo State

### Already exists (tras TASK-417)

- `getMetric(id, { asOf })` con `asOf` aceptado pero no resuelto contra DB

### Gap

- No existe tabla de targets
- No hay UI de edición
- No hay auditabilidad de cambios de target

## Scope

### Slice 1 — Schema

- Migration crea tabla con índices (metric_id + scope, effective_from range)
- Backfill inicial desde registry
- Tipos Kysely regenerados

### Slice 2 — Reader cutover

- `getMetric(id, { asOf, scopeKind, scopeId })` lee tabla con precedencia (client > org > registry default)
- Cache por request para evitar N lookups en dashboards

### Slice 3 — Admin UI

- View en Settings enumerando métricas editables con historial
- Edit form con validación (target dentro de rango razonable por unit)
- Publish outbox event on save

### Slice 4 — Consumer adoption

- `getMetricSeverityColor` (de TASK-419) respeta thresholds `vs_target` con target resuelto as-of
- Signal engine consume target real para threshold comparison

## Out of Scope

- Per-scope thresholds (no solo target) → TASK-423
- Enforcement runtime de quality gates → TASK-422

## Acceptance Criteria

- [ ] Tabla + migration + types aplicados
- [ ] Admin UI funcional con validación
- [ ] `getMetric({ asOf })` retorna target histórico correcto
- [ ] Signal engine consume target dinámico
- [ ] Outbox event emitido en cada edición
- [ ] `pnpm build`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` limpios

## Verification

- `pnpm migrate:up` y `pnpm db:generate-types` limpios
- Manual: cambiar target de `net_margin_pct` en UI, validar que semáforo de dashboard refleja el cambio después del próximo render
- Validación histórica: target set para enero-marzo ≠ target actual; dashboard de febrero usa el de febrero

## Closing Protocol

- [ ] Lifecycle + carpeta sincronizados
- [ ] Delta en `GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` confirmando v2 targets
- [ ] Documentar en `docs/documentation/finance/metricas-canonicas.md` que targets son editables

## Follow-ups

- TASK-423 per-scope thresholds (complemento natural)
