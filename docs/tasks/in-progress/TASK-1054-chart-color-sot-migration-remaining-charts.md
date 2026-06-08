# TASK-1054 — Migración de charts restantes al Chart SoT (axis-chart "Deep-bright")

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño — inventario cerrado (audit 2026-06-08), regla de mapeo definida`
- Rank: `TBD`
- Domain: `ui | design-system | finance | hr | delivery | agency`
- Blocked by: `none` (depende del SoT ya shipped en TASK-1053)
- Branch: `task/TASK-1054-chart-color-sot-migration-remaining-charts`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

TASK-1053 estableció el **Chart SoT** `src/@core/theme/axis-chart.ts` (paleta "Deep-bright" categorical + directional 4-tier) y migró ~5 superficies (CSC distribution, Pulse, KPI strip Home, runway, cashflow drawer). Un audit completo (2026-06-08) encontró **~11 charts más** que todavía colorean sus series desde `theme.palette.{success,warning,error,info}` (semánticos de UI) en lugar del Chart SoT. Esta task migra **el resto** a `GH_COLORS.chart.*`, sin semánticos ni hex inline, aplicando la regla de mapeo canónica.

## Why This Task Exists

El contrato canónico (TASK-1053, DESIGN.md §Chart, V1 §8.1.ter) dice: **toda serie de chart sale del Chart SoT; nunca `theme.palette` semántico para series** (el success ink es muy oscuro para "bueno", el warning ES el amber de alerta de UI → una serie verde/ámbar se confunde con un status). Hoy ~11 charts violan eso. No es un bug funcional pero rompe la coherencia visual + la regla de gobernanza, y reintroduce el problema que el operador reportó (charts con colores que no son la paleta declarada). El SoT ya existe; falta propagarlo a estas superficies.

## Goal

- Todas las superficies de chart consumen `GH_COLORS.chart.*` (categorical / directional / dark). Cero `theme.palette.{success,warning,error,info}` como color de serie. Cero hex de serie inline.
- Aplicar la **regla de mapeo** (abajo) consistente en todas.
- Paridad visual verificada (GVC) en las superficies clave + gates verdes.
- Cero regresión en lo ya migrado por TASK-1053.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `DESIGN.md` §"Chart colors derive from the SoT" (contrato agente)
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §8.1.ter (Chart palette)
- `src/@core/theme/axis-chart.ts` (SoT: `axisChartCategorical` / `axisChartCategoricalDark` / `axisChartDirectional` / `axisChartDirectionalDark`)
- `src/config/greenhouse-nomenclature.ts` (`GH_COLORS.chart.*` — el API de consumo)
- ADR `docs/architecture/GREENHOUSE_SEMANTIC_COLOR_SYSTEM_DECISION_V1.md`

Reglas obligatorias:

- **Categórica** (`GH_COLORS.chart.categorical`): series arbitrarias multi-serie (métricas, líneas, donut, part-to-whole). En orden, ≤6, **legend/labels obligatorios** (color nunca solo).
- **Directional** (`GH_COLORS.chart.directional.{positive,caution,negative,neutral}`): cashflow in/out, P&L +/−, deltas, **gradientes de salud** (óptimo→positive · atención→caution · crítico→negative). Siempre **signo +/− o ícono ▲/▼**.
- **Single-series** (regla refinada por análisis dataviz + modern-ui, 2026-06-08):
  - **neutral aislado** (chart en su propia card/página, sin otros adyacentes) → el **acento** (brand primary, `GH_COLORS.chart.primary`). Cohesión/restraint, no monótono (card/título/ícono diferencian — convención Stripe/Linear/Vercel).
  - **con significado de salud/dirección** (runway, margen, reliability) → **directional** (positive/caution/negative) — variedad *con sentido*, no decorativa.
  - **strips densos** (varios single-series adyacentes, ej. KPI strip) → diferenciar por **significado** (directional/categorical por card), NUNCA flat-azul. (El KPI strip de Home ya lo hace: verde=positivo, gris=neutral, azul=neutral-accent.)
- **NUNCA** `theme.palette.{success,warning,error,info}.main` como color de serie. **NUNCA** hex de serie inline ni arrays `*_COLORS` locales nuevos.
- Texto de chart (data-labels, axis labels) puede seguir usando `theme.palette.text.*` / `customColors` — eso es texto, no serie.
- Dark mode: usar `categoricalDark` / `directionalDark` donde el chart distinga modo.

Skills que gobiernan: `design-system-governance`, `dataviz-design` (colorblind/orden de series), `modern-ui` (restraint), `greenhouse-ux` (si toca layout/legend).

## Normative Docs

- `docs/tasks/complete/` o `in-progress/TASK-1053-feedback-semantic-color-system-direction-d.md` (Delta de ejecución — el patrón de migración ya aplicado a los primeros ~5 charts; replicar).

## Dependencies & Impact

### Depends on

- TASK-1053 (Chart SoT `axis-chart.ts` + `GH_COLORS.chart.*` + reglas en DESIGN.md/V1) — **ya shipped** en `develop`.

### Blocks / Impacts

- Coherencia visual de charts en payroll, people, finance, delivery, agency, economics.
- Cuando exista un lint rule `greenhouse/no-semantic-palette-in-chart-series` (follow-up sugerido), esta migración es el baseline 0.

### Files owned

- `src/views/greenhouse/finance/CashPositionView.tsx`
- `src/views/greenhouse/GreenhouseDeliveryAnalytics.tsx`
- `src/views/greenhouse/organizations/tabs/OrganizationEconomicsTab.tsx`
- `src/views/greenhouse/my/MyPerformanceView.tsx`
- `src/views/greenhouse/people/tabs/PersonIntelligenceTab.tsx`
- `src/views/greenhouse/payroll/PayrollPersonnelExpenseTab.tsx`
- `src/views/greenhouse/hr-core/HrLeaveView.tsx`
- `src/views/agency/AgencyEconomicsView.tsx`
- `src/views/greenhouse/people/tabs/PersonPayrollTab.tsx`
- `src/views/greenhouse/people/tabs/PersonEconomyTab.tsx`
- `src/views/greenhouse/payroll/MemberPayrollHistory.tsx`

## Current Repo State

### Already exists

- **Chart SoT completo** (`axis-chart.ts`): `axisChartCategorical` (6 Deep-bright) + dark + `axisChartDirectional` (positive/caution/negative/neutral) + dark. Expuesto vía `GH_COLORS.chart.{categorical,categoricalDark,directional,directionalDark}`.
- Patrón de consumo ya probado: Apex `colors: GH_COLORS.chart.categorical.slice(0,n)`; Recharts `stroke/fill={GH_COLORS.chart.categorical[i]}`; KPI sparkline `chartHexColor` en `StatsWithAreaChart`.
- Drift-guard `axis-semantic-drift.test.ts` (bloque chart palette). design:lint contrast probe.

### Gap — inventario de charts a migrar (audit 2026-06-08)

**Directional (cashflow/in-out):**

- `CashPositionView` — `cashIn=success`, `cashOut=error`, net line=`info` → `directional.{positive,negative,neutral}`.

**Categórica (multi-serie):**

- `GreenhouseDeliveryAnalytics` — rpa/otd/throughput/cycleTime (primary/success/info/warning) → `categorical[0..3]`.
- `OrganizationEconomicsTab` — 3 líneas (primary/warning/success) → `categorical[0..2]`.
- `MyPerformanceView` — rpa/otd (primary/success) → `categorical[0..1]`.
- `PersonIntelligenceTab` — calidad/dedicación/utilización (success/warning/info) → `categorical[0..2]`.
- `PayrollPersonnelExpenseTab` — 2 charts × 2 series (warning/success ; success/info) → `categorical[0..1]` cada uno.
- `HrLeaveView` — `colors: [theme.palette[conf.color].main]` por config → `categorical` (mapear el config a índices).
- `AgencyEconomicsView` — "gastos totales" = `error` (single-series) → ver regla single-series (neutral → accent; si se quiere connotar costo, `directional.negative` con criterio del operador).

**Single-series money trend (success green decorativo):**

- `PersonPayrollTab`, `PersonEconomyTab`, `MemberPayrollHistory` — `colors: [theme.palette.success.main]` → regla single-series (neutral aislado → accent; o `directional.positive` si se decide connotar "monto/positivo").

### NO migrar (verificado — no son series de chart)

- `CampaignDetailView` `TTM_STATUS_COLORS`/`TTM_CONFIDENCE_COLORS` → son `<Chip color>` (ThemeColor de UI), no chart.
- `PulseGlobalCharts:57` `dataLabels … colors:[customColors.midnight]` → color de **texto** de data-label, no serie.
- `src/app/public/quote/.../page.tsx` `stroke='#bb1954'` → ícono SVG en página pública (path exento de hex-lint); fuera de scope de charts.
- `src/emails/**` → emails tienen paleta propia aislada (diferido, TASK separada).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Directional (cashflow)

- `CashPositionView`: cashIn → `directional.positive`, cashOut → `directional.negative`, net/balance line → `directional.neutral` o `accent`. Confirmar que la UI ya lleva signo/ícono (regla directional); si no, agregarlo.
- GVC `/finance/cash-position` light + dark.

### Slice 2 — Categórica (multi-serie)

- Migrar los 7 charts multi-serie a `GH_COLORS.chart.categorical[0..N]` (Apex `colors:` array; Recharts `stroke/fill` por serie en orden).
- Mantener legends/labels (color nunca solo). Para charts con dark mode, usar `categoricalDark`.
- GVC de: delivery analytics, organization economics, person intelligence, payroll personnel expense.

### Slice 3 — Single-series (regla refinada)

- `PersonPayrollTab` / `PersonEconomyTab` / `MemberPayrollHistory`: aplicar regla single-series. Decisión por defecto: **accent** (neutral). Si el operador prefiere connotar monto, `directional.positive`.
- `AgencyEconomicsView` gastos: default accent; opción `directional.negative` (costo) si el operador lo pide.
- GVC de una superficie de cada tipo.

### Slice 4 — Cierre + (opcional) guardrail

- Re-correr el audit grep (cero `theme.palette.{success,warning,error,info}.main` en `colors:`/`stroke=`/`fill=` de charts).
- Doc sync: si emergen reglas nuevas, DESIGN.md §Chart + V1 §8.1.ter.
- **Follow-up sugerido (evaluar, no obligatorio en V1):** lint rule `greenhouse/no-semantic-palette-in-chart-series` que flagee `theme.palette.{success,warning,error,info}.main` dentro de `colors:`/`stroke=`/`fill=` en archivos de chart, con override para data-labels/text. Baseline 0 tras esta migración.

## Out of Scope

- El Chart SoT en sí (`axis-chart.ts`) — ya existe (TASK-1053). Esta task solo consume.
- Charts ya migrados por TASK-1053 (CSC distribution, Pulse, KPI strip Home, runway, cashflow drawer).
- Chips/badges de UI (`<Chip color>`), data-label text colors, íconos SVG, emails — no son series de chart.
- Sub-valores semánticos ink/tint/border/dark-fg + tonal-by-default (Fase B de TASK-1053).

## Acceptance Criteria

- [ ] Cero `theme.palette.{success,warning,error,info}.main` como color de serie en los 11 archivos owned (verificado por grep).
- [ ] Toda serie sale de `GH_COLORS.chart.*` (categorical/directional). Cero hex de serie inline ni `*_COLORS` locales nuevos.
- [ ] Regla single-series aplicada (accent / directional según significado) y registrada por chart.
- [ ] Cashflow/directional charts llevan signo o ícono (no color-solo).
- [ ] GVC light + dark de superficies clave (cash-position, delivery analytics, person intelligence, un payroll chart).
- [ ] Gates: `pnpm design:lint` 0/0 · `pnpm exec tsc --noEmit` · `pnpm test` (drift) · `pnpm build`.
- [ ] Doc closure: changelog + Handoff + (si aplica) DESIGN.md/V1. Lifecycle → complete + README/REGISTRY sync.
