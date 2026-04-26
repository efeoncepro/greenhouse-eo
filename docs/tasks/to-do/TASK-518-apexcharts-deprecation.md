# TASK-518 — ApexCharts deprecation; consolidate all charts on Recharts

## Delta 2026-04-26 — diferida; estrategia "migración oportunista"

**Audit 2026-04-26**: el portal está hoy **100% en ApexCharts** (32 archivos consumen `react-apexcharts`/`AppReactApexCharts`). Recharts está en `package.json` desde hace tiempo pero **0 callsites en views** — solo existe el re-export `src/libs/Recharts.tsx`. La premisa original ("convivir 2 chart libs es deuda técnica") era teórica; en runtime no hay coexistencia.

**Distribución del inventario** (32 archivos):

| Dominio | Archivos | Tipos |
| --- | --- | --- |
| `views/greenhouse/dashboard/*` | 5 | radialBar, line, area |
| `views/greenhouse/finance/*` | 4 | bar, line, donut (MRR/ARR, intelligence) |
| `views/greenhouse/people/tabs/*` | 3 | bar, area |
| `components/agency/*` | 3 | bar stacked, line (ICO, Spaces, Pulse) |
| `views/greenhouse/payroll/*` | 2 | bar |
| `views/greenhouse/hr-core/*` | 2 | bar, donut |
| Otros + wrappers | 13 | mix (radialBar, sparkline, donut) |

**Decisión 2026-04-26**: TASK-518 se difiere — **no se ejecuta como PR megalítico**. Razones:

1. ROI inmediato bajo: ~150-200 KB de bundle JS a ganar; sin reportes de TTI lento ni a11y por contrato.
2. Riesgo visual real: 32 archivos críticos del negocio (MrrArrDashboardView, FinanceDashboardView, PortfolioHealthCard, IcoCharts, PulseGlobalCharts) sin tests visuales (no hay Chromatic ni snapshots de charts). Migración 1:1 requiere QA manual por dominio.
3. Look específico de Apex (`radialBar` con gradient + centered label + animation curve) no es swap mecánico a Recharts — necesita decisiones UX consensuadas.
4. Costo de oportunidad: TASK-640 (Nubox v2) y TASK-519 (datepicker → MUI X) tienen valor de negocio directo. TASK-518 es deuda técnica pura.
5. No bloquea nada upstream: ninguna task depende de esto.

**Estrategia adoptada — "migración oportunista"**:

- Toda vista **nueva** con chart usa **Recharts**. Esta regla queda fijada en `CLAUDE.md` y en el skill `greenhouse-dev` para que ningún agente introduzca un import nuevo de `react-apexcharts`.
- Cada vez que se toque una vista existente con chart por otra razón (feature, fix, refactor), se migra ese chart específico **en el mismo PR**. Disuelve los 32 archivos en N PRs pequeños sin congelar el portal en un PR de "migrar todo".
- Cuenta de archivos Apex baja de 32 → 31 → 30 → ... naturalmente con el tiempo. Sin deadline rígido.

**Rank movido `P3` → `P4`**. Sale del backlog activo.

**Trigger conditions para reactivar como task explícita** (cualquiera de las 4):

1. Cliente enterprise levanta requirement de a11y por contrato (Apex no es WCAG-compliant out-of-the-box).
2. Apex publica un CVE no parchado.
3. Se decide rebrand visual del portal — usar la migración como trigger natural.
4. Cliente reporta TTI lento en mobile y bundle es la causa raíz (medido con Lighthouse en `dev-greenhouse.efeoncepro.com`).

Cuando se cumpla el trigger, esta spec se relee, el rank se mueve a P2, y se ejecuta como PR coordinado con QA visual por dominio.

## Status

- Lifecycle: `to-do — diferida hasta trigger condition`
- Priority: `P4` (era P3 — degradada 2026-04-26 tras audit)
- Impact: `Medio` (consistencia visual + a11y + bundle)
- Effort: `Medio-Alto` (32 archivos; QA visual manual)
- Type: `refactor` + `dependency`
- Status real: `Diferida — migración oportunista vigente; sin deadline`
- Rank: `Trigger-driven` (no planificable hasta condición disparadora)
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-518-apexcharts-deprecation` (cuando se reactive)

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
