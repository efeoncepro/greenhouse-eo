# TASK-416 — Finance Metric Registry Foundation

## Delta 2026-05-05 — pre-execution hardening (4-pillar review)

Auditoría arch + finance pre-ejecución detectó 4 gaps que invalidan el contrato semántico si se cierra v1 sin abordarlos. Todos viven en Slice 2 (entradas base) — agrega scope, no agrega slices.

### Gap 1 — 5 métricas faltantes para board reporting / going concern

El set de 18 cubre P&L básico pero le falta cobertura de **treasury / runway** (lo primero que pregunta board y banco) y **FX P&L** (ya canonizado por TASK-699 pero no expuesto). Agregar a Slice 2:

| metricId | Fórmula canónica | Owner | Justificación |
|---|---|---|---|
| `cash_runway_months` | `cash_balance_clp / monthly_net_burn_clp` | finance_product | Métrica #1 going concern (IAS 1). Board/banco la piden mensual. Sin ella el dashboard no sirve para decisiones de capital. |
| `working_capital_clp` | `current_assets_clp - current_liabilities_clp` | finance_product | Operating health — junto con CCC define liquidez. |
| `gross_burn_clp` | `SUM(operating_expenses_clp)` mensual | finance_product | Total opex — distinción crítica vs net en SaaS/services. |
| `net_burn_clp` | `gross_burn_clp - revenue_cash_clp` | finance_product | Cash quemado neto — dirige decisiones de fundraising. |
| `fx_pnl_clp` | VIEW canónica `greenhouse_finance.fx_pnl_breakdown` (TASK-699) | finance_product | Exposición FX ya tiene VIEW + helper canónico; falta exponer como métrica del registry. **Anti-bandaid**: no recomputar inline, usar la VIEW. |

**Total v1 ajustado**: 23 métricas + 4 indicators (vs 18 + 4 declarado originalmente).

### Gap 2 — `labor_cost_clp` y `payroll_to_revenue_ratio` tienen ambigüedad semántica

La spec V1 no declara si el numerador es **gross salary** (sub-reportado ~40-50%) o **loaded cost** (incluye AFP 10% + Salud 7% + Cesantía 0.6% + SIS 1.49% + Mutual ~0.93% + bonos + capacitación + overhead). Bajo IFRS / Chile NIIF, P&L externo requiere **loaded cost absorption**, no gross.

**Decisión canónica** (validar con CFO en Slice 2):

- `labor_cost_clp` = **loaded cost** (1.4-1.7× gross). Documentar fórmula exacta en `description.es-CL`.
- `payroll_to_revenue_ratio` = `labor_cost_clp / net_revenue_clp` con loaded cost.
- Si emerge necesidad de gross-only (ej. headcount budget), agregar `labor_cost_gross_clp` separado, NO ambigüar el canónico.

### Gap 3 — Cost metrics no declaran filtro por `economic_category` (TASK-768)

`direct_costs_clp`, `indirect_costs_clp`, `labor_cost_clp` deben declarar explícito el filtro `economic_category` en `servingSource` para alinear con la dimension canónica TASK-768 (separada de `expense_type` fiscal). Sin esto:

- Riesgo de drift entre signal engine (que filtra por `economic_category`) y dashboard (que sumaría por `expense_type`).
- Reintroduce el anti-pattern raíz del bug Cash-Out 2026-05-03 (TASK-766/768 lo cerraron en lectores).

**Patrón canónico declarativo en `servingSource`**:

```ts
servingSource: {
  kind: 'materialized',
  table: 'expense_payments_normalized', // VIEW canónica TASK-766
  column: 'payment_amount_clp',
  filter: {
    economic_category: ['payroll', 'payroll_benefits', 'payroll_taxes'] // TASK-768 dimension
  }
}
```

Validador build-time (Slice 4) extiende para verificar que `filter.economic_category[]` solo contiene valores del enum canónico TASK-768 (11 valores expense, 8 income).

### Gap 4 — Hereda de TASK-266 y desbloquea i18n finance automáticamente

`LocalizedString` declarado en el contrato (TASK-416) significa que **TASK-266 child finance se cierra automáticamente al popular el shard `en-US` del registry**. Documentar en el spec del registry V1.1 (delta del closing protocol) que esta es la única forma canónica de localizar métricas finance — NO crear una segunda capa en `src/lib/copy/finance.ts`.

### Acceptance criteria recalibrados

- [ ] **23 métricas** + 4 indicators (vs 18 declarado), incluyendo las 5 agregadas
- [ ] `labor_cost_clp` documenta loaded cost en `description.es-CL` con fórmula explícita
- [ ] Cost metrics declaran `filter.economic_category[]` en `servingSource`
- [ ] Validador build-time verifica que valores de `filter.economic_category` están en enum canónico TASK-768
- [ ] Delta en `GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` declara que finance i18n se cierra via `LocalizedString` shard `en-US` (cierra dependency con TASK-266 child)

### Out of scope (resta declarado)

Todo lo demás del scope original se mantiene. Las 5 métricas agregadas no requieren slices nuevas — entran a Slice 2.

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-416-finance-metric-registry-foundation`

## Summary

Materializar el `FinanceMetricRegistry` v1 como fuente única de verdad de definiciones financieras. Crear el contrato TypeScript completo, las 18 entradas base (+ indicator registry separado), y el validador de build-time que asegura que cada `servingSource` apunta a tablas/columnas reales. No incluye consumers — solo la foundation lectora.

## Why This Task Exists

Hoy las métricas financieras se definen ad-hoc en 4+ lugares: `client_economics`, `/api/finance/dashboard/pnl`, `FinanceDashboardView`, y el registry local de TASK-245. Misma métrica aparece con labels distintos, escalas distintas (0.25 vs 25 para porcentajes), fórmulas divergentes. Sin un contrato único, el drift es inevitable y contamina signal engine + LLM prompts + dashboards. Ver `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` para la diagnosis completa.

## Goal

- `src/lib/finance/metric-registry/` con contrato TypeScript completo (LocalizedString, ServingSourceRef tipado, CausalLink, DetectionStrategy combinable)
- 18 entradas base pobladas: revenue_accrual_clp, revenue_cash_clp, net_revenue_clp, direct_costs_clp, indirect_costs_clp, labor_cost_clp, total_costs_clp, gross_margin_clp, gross_margin_pct, net_margin_clp, net_margin_pct, ebitda_clp, ebitda_pct, dso_days, dpo_days, payroll_to_revenue_ratio, headcount_fte, revenue_per_fte
- `FINANCE_INDICATOR_REGISTRY` separado para UF, USD_CLP, UTM, IPC
- Validador de build-time (script de lint) que falla CI si: (a) IDs duplicados, (b) DAG con ciclos, (c) dependsOn que no existen, (d) servingSource.materialized apunta a tabla/columna ausente de `src/types/db.d.ts`

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` — contrato completo
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — módulo Finance
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — canonicalAnchor
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` — contrato LLM glossary
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` — referencia de patrón (`ICO_METRIC_REGISTRY`)

Reglas obligatorias:

- Labels y shortNames como `LocalizedString` aunque v1 solo popule `es-CL`
- `servingSource` tipada (no string) — validada contra schema real en build
- `causalChain` direccional (`effect: positive|negative|non_monotonic`)
- `detection.strategies[]` con `combine: 'any' | 'all'`
- `aggregation.acrossScopes` declarativo para cada métrica
- Ownership declarado por entry

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` — ya publicado
- `src/types/db.d.ts` — para validación de servingSource

### Blocks / Impacts

- TASK-417 (Reader primitives) — depende directamente de este
- TASK-418 (Signal Engine cutover) — depende de este + TASK-417
- TASK-419 (Dashboard cutover) — depende de este + TASK-417
- TASK-420 (Cost Intelligence cutover) — depende de este + TASK-417

### Files owned

- `src/lib/finance/metric-registry/index.ts`
- `src/lib/finance/metric-registry/types.ts`
- `src/lib/finance/metric-registry/definitions/*.ts` (sharded si >15 entradas hace sense v1, sino un solo archivo)
- `src/lib/finance/metric-registry/indicators.ts`
- `src/lib/finance/metric-registry/validate.ts`
- `scripts/lint-metric-registry.ts`
- `docs/documentation/finance/metricas-canonicas.md` (nuevo doc funcional)
- Integration en `package.json` (lint script) o CI workflow

## Current Repo State

### Already exists

- `src/lib/finance/ai/finance-signal-types.ts` — registry ad-hoc con 6 métricas (será reemplazado en TASK-418)
- `src/lib/ico-engine/metric-registry.ts` — referencia de patrón funcional
- `src/types/db.d.ts` — schema real contra el que validar

### Gap

- No existe registry canónico financiero
- No existe validador que asegure coherencia entry ↔ schema real
- No existe documentación funcional de las métricas (audiencia no-técnica)

## Scope

### Slice 1 — Contrato TypeScript

- Crear types (LocalizedString, ServingSourceRef, CausalLink, DetectionStrategy, FinanceMetricScope, FinanceMetricDefinition)
- Re-exportar desde `index.ts`
- Test unitario básico: compila y los types son estrictos

### Slice 2 — 18 entradas base

- Poblar cada una siguiendo el contrato
- Ejemplos del doc V1 como guía (revenue_accrual_clp, net_margin_pct, dso_days ya especificados)
- Ownership: `finance_product` por default; `cost_intelligence` para EBITDA
- Targets defaultValue agreed con CFO (puede quedar a `null` si no hay consenso, con thresholds vs_prior_period)

### Slice 3 — Indicator registry separado

- `FINANCE_INDICATOR_REGISTRY` con UF, USD_CLP, UTM, IPC
- Mismo contrato pero con `basis='none'`, `calendar='external'`, `fxPolicy='none'`
- servingSource apunta a `greenhouse_finance.economic_indicators`

### Slice 4 — Validador de build-time

- Script `scripts/lint-metric-registry.ts` que:
  - Verifica metricId uniqueness
  - Detecta ciclos en DAG (dependsOn)
  - Valida que `servingSource.kind === 'materialized'` apunta a `schema.table.column` presente en `db.d.ts`
  - Valida que `dependsOn` y `llmGlossary.causalChain[].from` referencian metricIds existentes
- Integrar como step de `pnpm lint` o precommit hook

### Slice 5 — Documentación funcional

- `docs/documentation/finance/metricas-canonicas.md` enumerando las 18 métricas + 4 indicators con lenguaje no-técnico
- Metadata canónica (version, link a spec técnica)

## Out of Scope

- Reader primitives (`getMetric`, `formatMetricValue`, `aggregateMetric`) → TASK-417
- Cutover de consumers → TASK-418/419/420
- Targets editables en DB → TASK-421 (v2)
- Quality gates runtime enforcement → TASK-422 (v2)

## Acceptance Criteria

- [ ] 18 métricas base + 4 indicators definidas, cada una con todos los campos requeridos del contrato
- [ ] Validador corre en `pnpm lint` (o precommit) y falla ante inconsistencias
- [ ] Test unitario asegura que DAG es acíclica y todos los dependsOn resuelven
- [ ] `docs/documentation/finance/metricas-canonicas.md` publicado
- [ ] `pnpm build`, `pnpm lint`, `pnpm tsc --noEmit` limpios

## Verification

- `pnpm lint` (incluye nuevo lint del registry)
- `pnpm tsc --noEmit`
- `pnpm test` (unit tests de DAG + uniqueness)
- Validador manual: modificar un metricId para crear ciclo → lint debe fallar

## Closing Protocol

- [ ] Lifecycle marcado `complete`, archivo movido a `complete/`
- [ ] `docs/tasks/README.md` actualizado
- [ ] Actualizar `GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` con delta "v1.1 → v1.2: foundation implementada"
- [ ] Cross-check: TASK-417/418/419/420 quedan unblocked

## Follow-ups

- TASK-417 inmediatamente después (reader primitives)
- Validador runtime (load-time) que refuerce lo que hoy solo cubre el build — considerar en v2
