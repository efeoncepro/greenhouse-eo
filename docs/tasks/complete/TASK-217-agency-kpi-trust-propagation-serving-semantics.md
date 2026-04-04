# TASK-217 - Agency KPI Trust Propagation & Serving Semantics

## Delta 2026-04-04 — Implementada y verificada

- `Agency > Pulse`, `Agency > Delivery` y `Agency > ICO Engine` ya consumen y renderizan trust semantics sin volver a interpretar KPIs con heurísticas locales de UI.
- `src/lib/agency/agency-queries.ts` ahora publica `rpaMetric`, `otdMetric` y `ftrMetric` con shape trust-aware reutilizando readers del `ICO Engine`.
- El aggregate Agency-level ya no promedia porcentajes o `RpA` por `space` de forma engañosa:
  - `OTD` usa agregación directa de counts clasificadas
  - `RpA` mensual usa weighting por `rpa_eligible_task_count`
  - `FTR` mensual usa weighting por `completed_tasks`
- La UI ahora distingue explícitamente:
  - `Dato confiable`
  - `Dato degradado`
  - `Sin dato confiable`
- Se creó el helper reusable `src/components/agency/metric-trust.tsx` para centralizar tono, microcopy, chips y footers de trust.
- `TASK-160` queda actualizada con delta para tratar esta lane como foundation cerrada de semántica trust-aware en consumers Agency.

## Delta 2026-04-04

- `TASK-217` ya fue auditada contra runtime real antes de implementación.
- La corrección principal de contrato es esta:
  - el trust runtime **sí existe** upstream en `ICO`
  - el gap real ya no es crear el trust model ni abrir una migración base nueva
  - el gap real es hacer que `Agency` lo consuma y lo renderice sin volver a interpretar KPIs localmente
- Estado real auditado:
  - `src/lib/ico-engine/read-metrics.ts` ya publica `MetricValue` con:
    - `benchmarkType`
    - `qualityGateStatus`
    - `confidenceLevel`
    - `dataStatus`
    - `evidence`
    - `trustEvidence`
  - `src/lib/ico-engine/performance-report.ts` ya expone `metricTrust` para el scorecard mensual Agency
  - `src/lib/agency/agency-queries.ts` sigue leyendo BigQuery directo y devolviendo números crudos para `Pulse` y `Delivery`
  - `src/views/agency/AgencyDeliveryView.tsx` y surfaces Agency vecinas siguen usando semáforos/thresholds locales sin exponer trust explícito
- Implicación operativa:
  - esta task debe enfocarse en:
    - response shaping Agency-level
    - adopción de readers canónicos del engine cuando aplique
    - estados UI trust-aware
    - componentes reutilizables de presentación
  - no debe reabrir fórmulas ICO ni duplicar benchmark/confidence policy dentro de `Agency`

## Delta 2026-04-03

- `TASK-216` ya quedó implementada:
  - el engine expone `benchmarkType`, `qualityGateStatus`, `confidenceLevel` y evidencia reusable por métrica
  - `greenhouse_serving.ico_member_metrics` y `greenhouse_serving.agency_performance_reports` ya persisten `metric_trust_json`
  - `People` y `Agency Performance Report` ya tienen contract/fallback de trust en serving
- Implicación:
  - esta task ya no debe abrir el contrato base de trust; debe enfocarse en `Agency` query surfaces, response shaping y estados UI sobre el metadata ya disponible
- `TASK-214` ya cerró la semántica base que `Agency` debe consumir:
  - completitud endurecida y compartida por todos los KPIs troncales del engine
  - buckets member-level y serving `ico_member_metrics` ya alineados con el contrato canónico
  - `Person 360` ya expone `overdue_carried_forward`, evitando consumers parciales del contexto de deuda
- Esta task debe tratar `TASK-214` como dependencia cerrada y enfocarse en propagación de trust metadata + estados UI, no en recalcular fórmulas o buckets.

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Cerrada`
- Rank: `4`
- Domain: `agency / ico / ui`

## Summary

Hacer que `Agency` consuma y muestre KPIs `ICO` con semántica de trust completa: valor, benchmark class, confidence level y quality gate status. La task evita que `Agency` vuelva a publicar números técnicamente calculados pero operativamente engañosos.

## Why This Task Exists

`Agency > Delivery` ya mostró el problema real:

- números calculados con insumo malo
- `OTD` absurdos o engañosos
- `RpA` nulo sin explicación suficiente

Aunque el engine mejore, si `Agency` no propaga bien la metadata de confianza, el usuario sigue viendo solo un número y asumiendo que es fiable.

## Goal

- Extender el contract de respuesta de `Agency` para transportar trust metadata junto al KPI.
- Diseñar estados explícitos de UI para valor válido, valor degradado y valor no confiable.
- Evitar duplicar fórmulas o heurísticas dentro de `agency-queries.ts`.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

Reglas obligatorias:

- `Agency` no recalcula fórmulas `ICO`
- `Agency` consume value + trust metadata desde el engine o serving canónico
- la UI debe distinguir `sin dato`, `dato degradado` y `dato válido`

## Dependencies & Impact

### Depends on

- `TASK-160`
- `TASK-214`
- `TASK-215`
- `TASK-216`

### Impacts to

- `Agency > Delivery`
- `Agency > Pulse`
- scorecards ejecutivos Agency
- futuros consumers de inteligencia Agency

### Files owned

- `src/lib/agency/agency-queries.ts`
- `src/lib/agency/*`
- `src/views/agency/AgencyDeliveryView.tsx`
- `src/views/agency/*`
- `src/components/agency/*`
- `docs/tasks/to-do/TASK-160-agency-enterprise-hardening.md`

## Current Repo State

### Ya existe

- `Agency > Delivery` consume el mes en curso live desde `ICO`
- `TASK-160` ya documenta que Agency debe preservar benchmark/confianza
- `Agency > ICO Engine` ya consume readers canónicos con `MetricValue[]`
- `People` ya demuestra el patrón correcto de response shaping trust-aware
- `greenhouse_serving.ico_member_metrics` y `greenhouse_serving.agency_performance_reports` ya persisten `metric_trust_json`

### Gap actual

- `Agency > Pulse` y `Agency > Delivery` no usan todavía el contrato trust-aware del engine
- la UI no distingue bien estados de confianza del KPI
- no existe un shape Agency shared para `valor + trust + presentación`
- `agency-queries.ts` sigue demasiado cerca de decisiones locales de interpretación
- no existe componente reusable para renderizar benchmark/confidence/quality gate

## Scope

### Slice 1 - Response shaping contract

- extender response types Agency para value + trust metadata
- fijar contrato para `benchmarkType`, `confidenceLevel`, `qualityGateStatus`
- reutilizar `MetricValue` / trust metadata existente antes de crear types nuevos

### Slice 2 - UI semantics

- diseñar estados y microcopy para:
  - valor válido
  - valor degradado
  - valor no confiable / unavailable

### Slice 3 - Ops and diagnostics

- exponer trust state en surfaces Agency y, si cabe en el lote, dejar hook simple para `Ops Health`
- dejar trazabilidad suficiente para debugging

## Out of Scope

- redefinir las fórmulas del engine
- arreglar upstreams de Notion
- rediseñar integralmente toda la experiencia Agency

## Acceptance Criteria

- [x] `Agency` consume KPIs `ICO` con metadata de trust, no solo con valor bruto
- [x] La UI distingue explícitamente `valid`, `degraded` y `unavailable`
- [x] `agency-queries.ts` no duplica fórmulas ni heurísticas `ICO`
- [x] `TASK-160` queda alineada como consumer hardening de esta semántica

## Verification

- `pnpm exec vitest run src/lib/agency/agency-queries.test.ts src/lib/agency/space-360.test.ts`
- `pnpm exec eslint src/lib/agency/agency-queries.ts src/components/agency/metric-trust.tsx src/components/agency/PulseGlobalKpis.tsx src/components/agency/SpaceHealthTable.tsx src/components/agency/IcoGlobalKpis.tsx src/components/agency/SpaceIcoScorecard.tsx src/views/agency/AgencyDeliveryView.tsx src/app/(dashboard)/agency/page.tsx src/lib/agency/space-360.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `rg -n "new Pool\\(" src`
- `pnpm lint`
- `pnpm build`
