# TASK-351 — Quotation Intelligence Automation: Pipeline, Renewals & Profitability

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-345, TASK-346, TASK-350`
- Branch: `task/TASK-351-quotation-intelligence-automation-pipeline-renewals-profitability`
- Legacy ID: `follow-on de GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1 §14-16`
- GitHub Issue: `none`

## Summary

Implementar la capa de inteligencia y automatización de Quotation: revenue pipeline projection, renewal lifecycle y profitability tracking contra ejecución real, apoyándose en projections existentes y en el `ops-worker`.

## Why This Task Exists

El valor real del módulo aparece cuando Greenhouse puede responder:

- cuánto pipeline comercial hay realmente y con qué probabilidad
- qué contratos están por renovarse o expirar
- cuánto se desvió el margen real respecto del cotizado

Hoy el repo tiene ingredients para esto:

- cost attribution
- member capacity economics
- ops-worker para crons y materializaciones

pero no existe todavía la projection específica de Quotation que los articule.

## Goal

- Materializar pipeline y forecast desde cotizaciones canónicas
- Automatizar renewals y alertas temporales relevantes
- Comparar cotizado vs ejecutado con drift drivers reutilizando el backbone financiero existente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- profitability tracking debe consumir projections y stores ya canónicos; no recalcular payroll o cost attribution en otro motor paralelo
- automations programadas deben correr en `ops-worker` cuando el workload lo amerite
- pipeline y renewals deben quedar auditables y re-materializables

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/documentation/operations/ops-worker-reactive-crons.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-350-quotation-to-cash-document-chain-bridge.md`
- `docs/tasks/complete/TASK-162-canonical-commercial-cost-attribution.md`
- `src/lib/sync/projections/commercial-cost-attribution.ts`
- `src/lib/sync/projections/member-capacity-economics.ts`
- `services/ops-worker/server.ts`

### Blocks / Impacts

- dashboard de pipeline / forecast
- renewal lifecycle
- profitability tracking
- alerting comercial/finance por drift

### Files owned

- `migrations/[verificar]-quotation-intelligence-automation.sql`
- `src/lib/commercial-cost-attribution/store.ts`
- `src/lib/sync/projections/commercial-cost-attribution.ts`
- `src/lib/sync/projections/member-capacity-economics.ts`
- `src/lib/finance/postgres-store-intelligence.ts`
- `src/lib/finance/reporting.ts`
- `src/app/api/finance/analytics/trends/route.ts`
- `src/app/api/finance/intelligence/client-economics/route.ts`
- `src/views/greenhouse/finance/FinanceIntelligenceView.tsx`
- `services/ops-worker/server.ts`
- `services/ops-worker/Dockerfile`
- `services/ops-worker/README.md`

## Current Repo State

### Already exists

- cost attribution comercial:
  - `src/lib/commercial-cost-attribution/store.ts`
  - `src/lib/sync/projections/commercial-cost-attribution.ts`
- capacity economics:
  - `src/lib/member-capacity-economics/store.ts`
  - `src/lib/sync/projections/member-capacity-economics.ts`
- worker operativo:
  - `services/ops-worker/server.ts`
  - `services/ops-worker/Dockerfile`

### Gap

- no existe aún projection específica de Quotation para pipeline, renewals ni profitability tracking contra ejecución real

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Revenue pipeline projection

- Materializar pipeline por cotización con probabilidades, métricas y aging
- Exponer readers útiles para Finance / Comercial

### Slice 2 — Renewal automation

- Implementar chequeo de vencimientos, alerts y draft de renovación cuando aplique
- Correr la automatización en el worker correcto

### Slice 3 — Profitability tracking

- Comparar quote aprobada/convertida contra revenue/cost real ejecutado
- Persistir drift drivers y severity accionable

## Out of Scope

- forecasting predictivo con ML
- dashboard ejecutivo final hiper pulido
- automatizaciones de cobranza

## Detailed Spec

La task debe dejar explícito:

- qué eventos rematerializan pipeline y profitability
- cuál es la métrica default del dashboard y cómo se cambia por business line
- cómo se detecta `expired_without_renewal` sin duplicar lógica con otros workers/reactive crons

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe projection de revenue pipeline para cotizaciones canónicas
- [ ] Renewal lifecycle puede alertar y/o generar draft según policy definida
- [ ] Profitability tracking compara cotizado vs ejecutado con drift severity y drivers
- [ ] Las automatizaciones relevantes quedan integradas al `ops-worker` o al runtime acordado

## Verification

- `pnpm pg:connect:migrate`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- `cd services/ops-worker && docker build .`
- validación manual de un caso de renewal due y un caso con margin drift significativo

## Closing Protocol

- [ ] Actualizar `services/ops-worker/README.md` si se agregan endpoints o jobs nuevos
- [ ] Dejar documentados en `Handoff.md` los triggers/reactive contracts agregados

## Follow-ups

- dashboards específicos por business line si el primer corte queda demasiado centrado en Finance

## Open Questions

- si la primera versión del profitability tracking debe vivir como tabla materializada mensual o con soporte adicional de drilldown diario
