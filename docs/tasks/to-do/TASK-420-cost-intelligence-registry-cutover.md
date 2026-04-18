# TASK-420 — Cost Intelligence Consumer Cutover to Registry

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `refactor`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-416, TASK-417, TASK-419`
- Branch: `task/TASK-420-cost-intelligence-registry-cutover`

## Summary

Migrar las superficies de Cost Intelligence (TASK-070/071) para consumir labels, formatos y thresholds del `FinanceMetricRegistry`. Cost Intelligence sigue siendo owner de la materialization pipeline (`client_economics`, `operational_pl_snapshots`, `commercial_cost_attribution`) pero adopta el registry como fuente única de definiciones visibles.

## Why This Task Exists

Cost Intelligence ya es consumer cross-module (TASK-070 en implementación avanzada, TASK-071 propagando a Agency/Org 360/People/Home/Nexa). Cada superficie tiene labels de "margen bruto / margen neto / EBITDA" con leves variaciones. El registry cierra el drift y estandariza el lenguaje a lo largo del módulo. Este cutover delinea el boundary: Cost Intelligence = owner de cómputo; Registry = owner de contrato semántico.

## Goal

- Views de Cost Intelligence (`ClientEconomicsView`, `FinancePeriodClosureDashboardView`, consumers en Agency/Org 360/People/Home/Nexa) adoptan `getMetric` + `formatMetricValue`
- Labels en respuestas de API (`/api/finance/dashboard/pnl`, `/api/finance/dashboard/summary`) incluyen `metricId` como referencia para consumers
- Documentar el boundary en `GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` §5.1

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md`
- `docs/tasks/in-progress/TASK-070-cost-intelligence-finance-ui.md`
- `docs/tasks/in-progress/TASK-071-cost-intelligence-cross-module-consumers.md`

Reglas obligatorias:

- Cost Intelligence NO pierde ownership de su pipeline de materialization
- Registry provee contrato de labels; Cost Intelligence provee data
- Respuestas de API pueden incluir `metricId` como referencia sin romper shapes existentes

## Dependencies & Impact

### Depends on

- TASK-416 (Registry foundation)
- TASK-417 (Reader primitives)
- TASK-419 (patrón establecido en dashboard)

### Blocks / Impacts

- Cross-module consumers (Agency, Org 360, People, Home, Nexa) heredan labels del registry
- Cierra el boundary Cost Intelligence ↔ Registry declarado en la spec

### Files owned

- Views de Cost Intelligence (ClientEconomicsView, FinancePeriodClosureDashboardView)
- Componentes compartidos que consumen cost intelligence en Agency/Org 360/People/Home
- Endpoints que exponen labels (opcionalmente añadir `metricId` a respuesta)

## Current Repo State

### Already exists

- Cost Intelligence con pipeline completo materializando `client_economics`
- Cross-module consumers ya integrados (TASK-071)
- Labels duplicados entre superficies

### Gap

- No hay referencia a metricId canónico en respuestas
- Labels hardcoded en cada view/componente

## Scope

### Slice 1 — Inventario de consumers

- Listar todos los componentes/endpoints que muestran métricas de Cost Intelligence
- Agrupar por métrica canónica (revenue_accrual_clp, net_margin_pct, etc.)

### Slice 2 — Migrar views

- `ClientEconomicsView`, `FinancePeriodClosureDashboardView`, componentes de Agency/Org 360 consumers de cost intelligence
- Reemplazar labels y formats por `getMetric` + `formatMetricValue`

### Slice 3 — Agregar metricId a respuestas API

- Endpoints de Cost Intelligence incluyen `metricId` en la respuesta de cada métrica (non-breaking; solo agregado)
- Consumers pueden opcionalmente resolver metadata del registry en runtime

### Slice 4 — Actualizar spec TASK-070/071

- Delta en ambas tasks declarando que Cost Intelligence es consumer del registry
- Boundary explícito documentado

## Out of Scope

- Cambios en la materialization pipeline de Cost Intelligence
- Nuevas métricas de Cost Intelligence no cubiertas en registry v1 (si aparecen, entran al registry en TASK dedicada)

## Acceptance Criteria

- [ ] Inventario completo de consumers publicado en el delta
- [ ] Zero labels hardcoded de métricas canónicas en views de Cost Intelligence
- [ ] APIs exponen `metricId` opcional en respuestas (retrocompatible)
- [ ] `pnpm build`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` limpios

## Verification

- `pnpm dev` → navegar a Cost Intelligence views → validar labels consistentes con Finance Dashboard
- Validación manual en Agency > Organization 360 > Finance tab
- Validación en People > Person 360 > Finance tab

## Closing Protocol

- [ ] Lifecycle + carpeta sincronizados
- [ ] Delta en TASK-070/071 reconociendo consumer status
- [ ] `docs/tasks/README.md` actualizado

## Follow-ups

- Cualquier métrica nueva que Cost Intelligence compute debe entrar primero al registry
