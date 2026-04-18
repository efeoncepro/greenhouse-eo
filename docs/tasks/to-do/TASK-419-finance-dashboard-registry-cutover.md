# TASK-419 — Finance Dashboard Cutover to Registry

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `refactor`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-416, TASK-417`
- Branch: `task/TASK-419-finance-dashboard-registry-cutover`

## Summary

Migrar `FinanceDashboardView` y endpoints relacionados para consumir labels, formatos, thresholds y tooltips del `FinanceMetricRegistry`. Elimina hardcoded Spanish strings en el dashboard y establece el patrón de consumo que Cost Intelligence (TASK-420) va a seguir. Incluye tooltips auto-generados desde `description` y semáforo basado en `thresholds` del registry.

## Why This Task Exists

Hoy `FinanceDashboardView.tsx` tiene ~30 strings hardcoded de labels de KPI, tooltips implícitos (o ausentes), formateo inline de CLP/percent, y colores de semáforo sin contrato central. Cada agregado nuevo agrega más strings sin revisión. El registry canónico permite un cutover donde labels, formatos y thresholds se declaran una sola vez y el componente los consume.

## Goal

- KPI cards del dashboard leen labels/shortNames/tooltips/thresholds del registry via `getMetric`
- Valores formateados con `formatMetricValue` (reemplaza `formatCLP`, `formatRate`, etc. inline)
- Semáforo de color de cada KPI sigue el contrato `thresholds` de la métrica
- Tooltips de cada KPI se generan de `description` (localizado, no inline)
- Zero strings hardcoded para nombres de métricas canónicas

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` — contrato
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — patrones de UI
- Convenciones Greenhouse-dev (HorizontalWithSubtitle, StatsWithAreaChart, AnimatedCounter)

Reglas obligatorias:

- No importar `FINANCE_METRIC_REGISTRY` directo; usar `getMetric`
- Respetar `visibility.clientPortal` si el dashboard pudiera verse desde portal cliente (hoy solo internal)
- `AnimatedCounter` + `formatMetricValue` combinados correctamente (string final via registry, counter anima solo el número)

## Dependencies & Impact

### Depends on

- TASK-416 (Registry foundation)
- TASK-417 (Reader primitives)

### Blocks / Impacts

- Patrón de consumo que TASK-420 replica
- Reduce costo de añadir métricas nuevas a superficies

### Files owned

- `src/views/greenhouse/finance/FinanceDashboardView.tsx`
- `src/views/greenhouse/finance/ClientEconomicsView.tsx` (labels canónicos)
- Posible extracción de helper `<MetricKpiCard metricId>` si emerge patrón repetido

## Current Repo State

### Already exists

- `FinanceDashboardView.tsx` con KPIs de Saldo, Facturación, Costos, DSO, DPO, Payroll Ratio
- `formatCLP`, `formatRate`, `formatIndicatorValue` inline
- Tooltips manuales o ausentes

### Gap

- Zero consumo del registry canónico
- Drift entre labels del dashboard y labels del signal engine

## Scope

### Slice 1 — KPI cards migradas

- Reemplazar labels hardcoded por `getMetric(metricId).resolvedLabel`
- Aplicar `formatMetricValue` en el `stats` prop
- Test visual comparando antes/después (snapshot)

### Slice 2 — Semáforo por thresholds

- Función `getMetricSeverityColor(metricId, value, target?)` que retorna `'success' | 'warning' | 'error'` según thresholds canónicos
- Aplica a avatarColor de HorizontalWithSubtitle (ej: DSO > 60 → error)

### Slice 3 — Tooltips desde description

- Cada KPI muestra tooltip auto-generado de `description`
- Componente wrapper `<MetricKpiCard>` si el patrón se repite

### Slice 4 — Indicators (UF, USD_CLP, UTM)

- Migrar los 3 KPI cards de indicators al `FINANCE_INDICATOR_REGISTRY`
- Formato de fecha + source siguen pattern actual

## Out of Scope

- Cost Intelligence views → TASK-420
- Client Portal enforcement → v2 (TASK-422 o separado)

## Acceptance Criteria

- [ ] `FinanceDashboardView.tsx` no contiene strings hardcoded para labels de métricas canónicas
- [ ] `formatCLP`, `formatRate` locales eliminados en favor de `formatMetricValue`
- [ ] Semáforo de color en KPIs viene de thresholds canónicos, no de condicionales inline
- [ ] Tooltips presentes en todos los KPI cards con texto del registry
- [ ] Visual snapshot antes/después sin regresiones
- [ ] `pnpm build`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` limpios

## Verification

- `pnpm dev` → navegar a `/finance` → validar labels + tooltips + colores
- Snapshot tests de FinanceDashboardView

## Closing Protocol

- [ ] Lifecycle + carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] Si emerge `<MetricKpiCard>` reutilizable, documentarlo en `GREENHOUSE_UI_PLATFORM_V1.md`

## Follow-ups

- TASK-420 (Cost Intelligence cutover) replica el patrón
