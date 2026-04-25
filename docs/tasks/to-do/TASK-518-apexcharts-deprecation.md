# TASK-518 — ApexCharts deprecation; consolidate all charts on Recharts

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio` (consistencia visual + a11y + bundle)
- Effort: `Medio-Alto` (depende del inventario de charts Apex)
- Type: `refactor` + `dependency`
- Status real: `Backlog — Ola 3 stack modernization`
- Rank: `Post-TASK-511`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-518-apexcharts-deprecation`

## Summary

Eliminar `apexcharts 3.49` + `react-apexcharts 1.4` del stack. Consolidar todos los charts en `recharts 3.6` (ya presente). ApexCharts es 2018-era y no es React-nativo (wrapper sobre lib imperativa). Recharts es idiomatic React, mejor a11y, declarativo.

Parent: TASK-511 (Stack Modernization Roadmap) · Ola 3.

## Why This Task Exists

Convivir 2 chart libs es deuda técnica:
- Cada caso nuevo exige decisión arbitraria (¿Recharts o Apex?).
- Look visual inconsistente entre dashboards.
- Bundle duplicado (~150 KB extra).
- Apex tiene a11y limitada (no es SVG-first).

Recharts 3.x ya cubre sparkline + area + line + bar + donut + composed + radar. Tremor Blocks + Visx para casos edge.

## Goal

1. Audit: grep `react-apexcharts` / `ApexCharts` / `apexcharts` en `src/`; listar todos los consumers.
2. Per consumer, decidir migración:
   - Sparkline → Recharts `<LineChart>` compact.
   - Donut → Recharts `<PieChart>` con inner label.
   - RadialBar / Gauge → Recharts `<RadialBarChart>` o Visx.
   - Heatmap → Visx (Recharts no tiene heatmap nativo).
   - Treemap → Visx.
3. Migrar consumer por consumer (sub-commits).
4. Eliminar deps del `package.json`.
5. Docs: `GREENHOUSE_UI_PLATFORM_V1.md` section "Charts stack 2026" = Recharts canonical, Visx para custom.

## Acceptance Criteria

- [ ] Grep `apexcharts|react-apexcharts` devuelve 0 hits en `src/`.
- [ ] `package.json` sin `apexcharts` ni `react-apexcharts`.
- [ ] Todos los charts previos siguen renderizando con look + interactividad equivalente.
- [ ] Tests verdes (si hay snapshot tests de charts, actualizar).
- [ ] Smoke staging: dashboards con charts (Finance intelligence, MRR/ARR, Pulse) se ven bien.
- [ ] Gates tsc/lint/test/build verdes.

## Scope

Consumers típicos a migrar (inventariar en audit):
- `src/components/statistics-card/*` (widgets)
- `src/views/greenhouse/**/dashboard` charts
- `src/views/greenhouse/finance/intelligence/*`
- `MrrArrDashboardView`
- `SupportTracker`, `TotalEarning`, `RevenueReport`, etc.

## Out of Scope

- Rediseño visual de dashboards (preservar el look actual).
- Instalar Visx si no hay caso edge real (on-demand).

## Follow-ups

- TASK futura: considerar Tremor blocks si construimos más dashboards de finance.
