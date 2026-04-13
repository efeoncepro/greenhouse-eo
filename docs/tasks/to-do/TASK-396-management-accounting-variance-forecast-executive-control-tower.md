# TASK-396 — Management Accounting Variance, Forecast & Executive Control Tower

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno estructural`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-392, TASK-395`
- Branch: `task/TASK-396-management-accounting-variance-forecast-control-tower`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Esta task convierte Management Accounting en una superficie directiva real: variance analysis, forecast continuo, alertas de desviacion y una control tower ejecutiva para leer el negocio por periodo, scope y driver. Toma los actuals confiables y el planning engine para entregar lectura accionable, no solo tablas.

## Why This Task Exists

Sin variance ni forecast, el modulo seguiria describiendo el pasado. El valor enterprise aparece cuando Greenhouse puede explicar desvio contra plan, proyectar cierre y priorizar focos de accion. Este bloque conecta el motor de actuals con el motor de planning y lo lleva a una superficie de control para liderazgo.

## Goal

- Implementar variance analysis y forecast sobre el contrato de planning
- Exponer una control tower ejecutiva para leadership y finance
- Hacer visible deltas, riesgos y explicaciones por scope y driver

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Toda variance debe poder rastrearse a actual, plan y driver versionados
- Forecast no puede escribirse por encima del budget baseline; debe vivir como capa separada
- La UI ejecutiva debe mostrar numero, delta, explicacion y severidad, no solo una tabla de comparacion

## Normative Docs

- `src/views/greenhouse/finance/FinanceIntelligenceView.tsx`
- `src/views/greenhouse/finance/ClientEconomicsView.tsx`
- `src/app/api/finance/intelligence/client-economics/route.ts`
- `docs/tasks/to-do/TASK-395-management-accounting-planning-engine-budgets-drivers-approval-governance.md`
- `docs/tasks/to-do/TASK-393-management-accounting-period-governance-restatements-reclassification.md`

## Dependencies & Impact

### Depends on

- `TASK-392`
- `TASK-395`
- `TASK-393`
- `src/views/greenhouse/finance/FinanceIntelligenceView.tsx`
- `src/views/greenhouse/finance/ClientEconomicsView.tsx`

### Blocks / Impacts

- `TASK-398`
- reporting ejecutivo del modulo finance
- futura capa de Nexa / insights sobre economics

### Files owned

- `src/views/greenhouse/finance/FinanceIntelligenceView.tsx`
- `src/views/greenhouse/finance/ClientEconomicsView.tsx`
- `src/app/api/finance/intelligence/client-economics/route.ts`
- `src/app/api/finance/intelligence/client-economics/trend/route.ts`
- `docs/tasks/to-do/TASK-396-management-accounting-variance-forecast-executive-control-tower.md`

## Current Repo State

### Already exists

- Vistas de Finance Intelligence y Client Economics
- Endpoints de client economics y tendencias
- Base de actuals mensuales materializados

### Gap

- No hay variance formal contra budget / forecast
- No existe forecast continuo ni control tower ejecutiva
- Las superficies actuales no explican drivers ni severidad de desviaciones

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Variance engine consumible

- Implementar comparacion actual vs plan por metrica, scope y periodo
- Soportar lectura MTD, QTD y YTD con deltas absolutos y porcentuales

### Slice 2 — Forecast & signals

- Incorporar latest estimate / rolling forecast sobre el mismo contrato de plan
- Generar flags de riesgo, trend y outliers explicables

### Slice 3 — Executive control tower

- Redisenar las vistas ejecutivas para comunicar performance, drivers, riesgos y seguimiento
- Incluir drilldowns minimos por cliente, BU o entity segun disponibilidad del scope

## Out of Scope

- IA generativa o copilot de decisiones como parte obligatoria de este release
- Planeacion detallada por proyecto o servicio si no existe como dimension canonica
- Reporting legal / tributario

## Detailed Spec

La control tower debe mostrar al menos:

- actual, plan, forecast
- variance absoluta y porcentual
- riesgo de cierre
- drivers explicativos prioritarios
- semaforizacion por severidad
- conciencia de periodo restated cuando aplique

## Acceptance Criteria

- [ ] Existe variance engine por periodo y scope
- [ ] Existe capa de forecast separada del budget baseline
- [ ] Finance Intelligence / Client Economics exponen una lectura ejecutiva util
- [ ] La UI comunica drivers, deltas y severidad
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Verification

- `pnpm build`
- `pnpm test`
- Validacion manual de la control tower con datos de ejemplo

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se documentaron claramente las diferencias entre actual, plan y forecast en la UI

## Follow-ups

- `TASK-398`
