# TASK-423 — Finance Metric Per-Scope Thresholds (v2)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-421`
- Branch: `task/TASK-423-finance-metric-per-scope-thresholds`

## Summary

Extender el sistema de targets editables (TASK-421) para soportar **thresholds** per-scope, no solo target values. Un cliente con margen histórico del 60% y otro con 15% no deben compartir el mismo "critical below 10%"; cada uno necesita thresholds calibrados a su realidad. Resuelve el problema de falsos positivos / negativos en el signal engine cuando opera sobre portfolio heterogéneo.

## Why This Task Exists

v1 del registry declara thresholds globales (`optimal`, `attention`, `critical` fijos). TASK-421 agrega targets editables por client/org. Pero el **threshold** (la banda alrededor del target) sigue siendo global. Para un portfolio con clientes muy dispares, esto causa que el mismo threshold sea demasiado laxo para unos y demasiado estricto para otros. Signal engine emite signals espurias o omite signals reales.

## Goal

- Extensión de `greenhouse_finance.metric_targets` o tabla hermana con `thresholds_json` per-scope
- `getMetric({ asOf, scopeId })` resuelve thresholds vigentes con precedencia client > org > registry default
- Admin UI permite editar thresholds por métrica + scope
- Signal engine consume thresholds resueltos por scope, no globales
- Dashboard semáforo usa thresholds resueltos

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` §11 (debt #3)
- TASK-421 como foundation

Reglas obligatorias:

- Resolución de thresholds usa misma precedencia que targets (client > org > registry)
- Cambiar thresholds NO invalida histórico de signals ya materializadas
- Admin UI requiere rol finance_manager o efeonce_admin

## Dependencies & Impact

### Depends on

- TASK-421 (metric_targets foundation)

### Blocks / Impacts

- Signal engine gana precisión en portfolio heterogéneo
- Reduce ruido en Nexa insights

### Files owned

- Migration que extiende `metric_targets` o crea `metric_thresholds`
- `src/lib/finance/metric-registry/reader.ts` extendido
- Admin UI extendida para edit thresholds

## Current Repo State

### Already exists (tras TASK-421)

- `metric_targets` tabla con target_value per-scope
- `getMetric({ asOf, scopeId })` resuelve target

### Gap

- Thresholds siguen siendo globales en código

## Scope

### Slice 1 — Schema extension

- Agregar columna `thresholds_json` a `metric_targets` (o crear tabla `metric_thresholds`)
- Backfill con defaults del registry

### Slice 2 — Reader extension

- Resolver thresholds con mismo pattern de target
- Cache por request

### Slice 3 — Admin UI

- Sección en `Settings → Finance → Metric Targets` para editar thresholds
- Validación: attention debe contener optimal, critical debe contener attention

### Slice 4 — Consumer adoption

- `getMetricSeverityColor(metricId, value, { scopeId })` respeta thresholds resueltos
- Signal engine consume thresholds per-scope

## Out of Scope

- Detection strategy per-scope (combinar Z-score vs absolute per-cliente): considerarlo en TASK dedicada si emerge necesidad

## Acceptance Criteria

- [ ] Migration + backfill aplicados
- [ ] `getMetric` retorna thresholds resueltos
- [ ] Admin UI permite edición con validación
- [ ] Signal engine usa thresholds per-scope
- [ ] Regression: signals pre-cutover permanecen consistentes
- [ ] `pnpm build`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` limpios

## Verification

- Test específico: 2 clientes con historial diferente, mismo threshold crítico global → configurar threshold per-cliente → verificar que signals se comportan como se espera

## Closing Protocol

- [ ] Delta en spec documentando thresholds per-scope
- [ ] Lifecycle + carpeta sincronizados

## Follow-ups

- Detection strategy mixta per-scope si la demanda aparece
