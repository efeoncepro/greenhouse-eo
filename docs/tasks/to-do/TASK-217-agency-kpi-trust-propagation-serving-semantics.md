# TASK-217 - Agency KPI Trust Propagation & Serving Semantics

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
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

- Extender el serving contract de `Agency` para transportar trust metadata junto al KPI.
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
- `docs/tasks/to-do/TASK-160-agency-enterprise-hardening.md`

## Current Repo State

### Ya existe

- `Agency > Delivery` consume el mes en curso live desde `ICO`
- `TASK-160` ya documenta que Agency debe preservar benchmark/confianza

### Gap actual

- no existe contrato runtime claro para transportar trust metadata
- la UI no distingue bien estados de confianza del KPI
- `agency-queries.ts` sigue demasiado cerca de decisiones locales de interpretación

## Scope

### Slice 1 - Serving contract

- extender response types para value + trust metadata
- fijar contrato para `benchmark_type`, `confidence_level`, `quality_gate_status`

### Slice 2 - UI semantics

- diseñar estados y microcopy para:
  - valor válido
  - valor degradado
  - valor no confiable / unavailable

### Slice 3 - Ops and diagnostics

- exponer trust state en surfaces Agency y/o `Ops Health`
- dejar trazabilidad suficiente para debugging

## Out of Scope

- redefinir las fórmulas del engine
- arreglar upstreams de Notion
- rediseñar integralmente toda la experiencia Agency

## Acceptance Criteria

- [ ] `Agency` consume KPIs `ICO` con metadata de trust, no solo con valor bruto
- [ ] La UI distingue explícitamente `valid`, `degraded` y `unavailable`
- [ ] `agency-queries.ts` no duplica fórmulas ni heurísticas `ICO`
- [ ] `TASK-160` queda alineada como consumer hardening de esta semántica

## Verification

- `pnpm exec eslint src/lib/agency/agency-queries.ts src/views/agency/*.tsx`
- `pnpm exec vitest run src/lib/agency/*.test.ts`
- validación manual de `Agency > Delivery` y/o preview visual
