# TASK-055 - Finance Intelligence Cost Coverage Repair

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Parcial`
- Rank: `21`
- Domain: `finance`
- GitHub Project: `Greenhouse Delivery`

## Delta 2026-03-26

- Se activó el trabajo de la lane y se corrigió el primer gap reactivo del pipeline: `client_economics` ya no depende solo de `assignment/membership` ni del mes actual.
- La proyección reactiva ahora escucha eventos de `finance` y `payroll`, deriva `year/month` desde payloads reales y recomputa el período afectado.
- `cost_allocations` comenzó a publicar eventos outbox canónicos (`finance.cost_allocation.created/deleted`) y payroll ahora publica cambios de período (`updated/calculated/approved`) con `year/month`.
- Cerrado parcialmente por trabajo en `TASK-055`; siguen abiertos el bridge laboral histórico por período y la cobertura canónica de costos.

## Delta 2026-03-26 (bridge laboral histórico)

- El view `greenhouse_serving.client_labor_cost_allocation` dejó de resolver assignments con `CURRENT_DATE`; ahora usa solape entre `start_date/end_date` y la ventana del `payroll_period`.
- Se aplicó de nuevo `scripts/setup-postgres-finance-intelligence-p2.sql` sobre Postgres y el view quedó materializado con la nueva semántica histórica.
- La verificación runtime confirmó que el view hoy devuelve `0` filas no por bug temporal sino porque el período visible `2026-03` sigue en estado `draft`; todavía no hay payroll `approved/exported` para poblar costo laboral canónico.

## Delta 2026-03-26 (auditoría febrero payroll)

- Se corrigió `scripts/backfill-postgres-payroll.ts` para que use `GOOGLE_APPLICATION_CREDENTIALS_JSON` vía `getGoogleCredentials()` en vez de caer al refresh token OAuth del host (`invalid_rapt`).
- Con el backfill ya autenticando correctamente, BigQuery devolvió `0` filas para `greenhouse.payroll_periods`, `greenhouse.payroll_entries` y `greenhouse.compensation_versions`.
- Conclusión operativa: el payroll de febrero no falta solo en PostgreSQL; tampoco está materializado en la fuente BigQuery que este repo usa como origen de backfill.

## Delta 2026-03-26 (cálculo real de febrero con Payroll)

- Se materializó `2026-02` usando las herramientas reales de Payroll (`create/update period -> calculate -> approve`) con `UF = 39779.29`.
- Resultado: período `2026-02` aprobado con `2` entries calculadas (`daniela-ferreira`, `melkin-hernandez`).
- `client_labor_cost_allocation` siguió vacío para `2026-02` por una razón válida de datos: los assignments activos de ambos miembros comienzan el `2026-03-13`, así que no existe solape temporal con febrero para atribuir costo a cliente.
- Conclusión: el pipeline ya no está bloqueado por falta de payroll en febrero; el gap remanente para Finance Intelligence es que no existe asignación cliente-período compatible con ese payroll.

## Summary

Corregir la integridad del pipeline que alimenta `Finance > Intelligence` y los snapshots de `greenhouse_finance.client_economics`, para que la rentabilidad por Space no vuelva a mostrar márgenes ficticios por falta de costos canonizados.

La task cubre tres problemas conectados: cobertura insuficiente de costos en `client_economics`, puente laboral histórico mal alineado al período y consumo UI/API de snapshots incompletos como si fueran financieramente válidos.

## Why This Task Exists

El runtime actual permite que `Finance > Intelligence` muestre rentabilidad engañosa:

- existen snapshots con revenue cargado y costos casi cero
- el view `greenhouse_serving.client_labor_cost_allocation` puede vaciar costo histórico porque depende de assignments activos en `CURRENT_DATE` en vez del período evaluado
- `computeClientEconomicsSnapshots()` inicializa `indirectCosts` en `0` y hoy no las materializa desde una fuente operativa
- la UI puede terminar leyendo snapshots persistidos de backfill manual como si fueran datos financieramente completos

Auditoría concreta de marzo 2026 para `Sky Airline`:

- `greenhouse_finance.client_economics` tenía snapshot con:
  - `total_revenue_clp = 13804000`
  - `direct_costs_clp = 1225`
  - `headcount_fte = 3.0`
  - `notes = Backfill from Codex for organization finance visibility`
- al mismo tiempo, las fuentes canónicas de costo para ese período estaban vacías:
  - `greenhouse_finance.cost_allocations`
  - `greenhouse_finance.expenses` con `allocated_client_id`
  - `greenhouse_serving.client_labor_cost_allocation`

Eso rompe la confianza del módulo: el problema ya no es ausencia de features sino correctness de la señal económica.

## Goal

- Garantizar que `client_economics` solo exponga márgenes cuando exista cobertura mínima defendible de costos
- Corregir el bridge laboral histórico para que use assignments válidos para el período, no para `CURRENT_DATE`
- Materializar una cobertura operativa verificable de costos directos, laborales e indirectos/allocation-backed por cliente y período
- Dejar contratos explícitos de completitud para snapshots, trends y consumers de Organization/Agency/Finance
- Cerrar el loop con recompute determinístico y validación operativa mensual

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/FINANCE_DUAL_STORE_CUTOVER_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

Reglas obligatorias:

- `client_economics` sigue siendo snapshot operacional en PostgreSQL; no reintroducir BigQuery como write model silencioso
- la llave de negocio para FI es `client_id`; payroll/labor cost debe seguir anclado a `member_id`
- la corrección no debe inventar costos ni “rellenar” márgenes heurísticos cuando la cobertura no existe
- cualquier fallback o estado degradado debe ser explícito en API y UI
- los cálculos batch y projections deben ser idempotentes por período
- la data histórica no puede depender de `CURRENT_DATE` para resolver memberships/assignments de meses anteriores

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-015-financial-intelligence-layer.md`
- `docs/tasks/complete/TASK-051-finance-payroll-bridge-postgres-alignment.md`
- `src/lib/finance/postgres-store-intelligence.ts`
- `src/lib/finance/payroll-cost-allocation.ts`
- `scripts/setup-postgres-finance-intelligence-p2.sql`
- `src/lib/sync/projections/client-economics.ts`
- `src/app/api/cron/economics-materialize/route.ts`
- `greenhouse_finance.client_economics`
- `greenhouse_finance.cost_allocations`
- `greenhouse_finance.expenses`
- `greenhouse_serving.client_labor_cost_allocation`

### Impacts to

- `TASK-010 - Organization Economics Dashboard`
- `TASK-015 - Financial Intelligence Layer`
- `TASK-051 - Finance Payroll Bridge Postgres Alignment`
- `Agency > Organizations > Finanzas`
- `Finance > Intelligence`
- `Organization economics` read models
- futuros consumers de margin por BU/campaign/service line

### Files owned

- `src/lib/finance/postgres-store-intelligence.ts`
- `src/lib/finance/payroll-cost-allocation.ts`
- `src/app/api/finance/intelligence/client-economics/route.ts`
- `src/app/api/finance/intelligence/client-economics/trend/route.ts`
- `src/app/api/cron/economics-materialize/route.ts`
- `src/lib/sync/projections/client-economics.ts`
- `scripts/setup-postgres-finance-intelligence-p2.sql`
- `src/views/greenhouse/finance/ClientEconomicsView.tsx`
- `src/lib/account-360/organization-economics.ts`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`

## Current Repo State

### Ya existe

- `client_economics` está materializado en `greenhouse_finance`
- el módulo ya tiene UI activa en `/finance/intelligence`
- existe engine server-side `computeClientEconomicsSnapshots()`
- existe bridge laboral `computeClientLaborCosts()` sobre `greenhouse_serving.client_labor_cost_allocation`
- existe route de trend y cron de materialización
- la UI ya fue endurecida para ocultar márgenes incompletos en vez de mostrar `100% / Óptimo`

### Gap actual

1. **Cobertura de costos incompleta**
- `computeClientEconomicsSnapshots()` depende de `cost_allocations`, `expenses.allocated_client_id` y `client_labor_cost_allocation`
- si esas fuentes están vacías, persiste snapshots con revenue casi puro

2. **Bridge laboral histórico incorrecto**
- `client_labor_cost_allocation` depende de assignments activos “hoy”
- eso invalida snapshots históricos o meses retroactivos

3. **Indirectos sin materialización clara**
- `indirectCosts` se inicializa en `0`
- no hay contrato explícito de cuándo y cómo se puebla overhead/indirect allocation

4. **Recompute sin criterio de completitud**
- hoy el sistema puede recomputar y persistir snapshots aunque no tenga cobertura mínima
- falta distinguir “snapshot calculado” de “snapshot confiable para consumo ejecutivo”

5. **Consumers cross-surface**
- Organization Finance, Finance Intelligence y tendencias dependen del mismo snapshot
- si un snapshot es malo, el error se propaga a varias vistas

## Scope

### Slice 1 - Contrato de completitud para client_economics

- definir semántica explícita de snapshot:
  - revenue completo
  - costos directos completos o incompletos
  - costos laborales completos o incompletos
  - indirectos/overhead completos o incompletos
- agregar flags o metadatos canónicos de completitud en el payload runtime
- impedir que márgenes se expongan como válidos cuando la cobertura no supere el umbral acordado
- alinear GET principal, trend route y consumers secundarios con el mismo contrato

### Slice 2 - Reparación del bridge laboral histórico

- auditar `scripts/setup-postgres-finance-intelligence-p2.sql`
- reemplazar dependencia de `CURRENT_DATE` por una lógica dependiente del período de cálculo
- validar que payroll cost allocation soporte recompute histórico por `year/month`
- agregar tests de histórico para asegurar que un período pasado no dependa de memberships/assignments actuales

### Slice 3 - Cobertura canónica de costos directos e indirectos

- auditar por qué `cost_allocations` está vacío en períodos con revenue
- definir el flujo mínimo para poblar:
  - `expenses.allocated_client_id`
  - `cost_allocations`
  - cualquier costo indirecto/overhead que deba entrar al snapshot
- decidir explícitamente si indirectos:
  - quedan fuera por ahora con flag de incompletitud, o
  - se computan desde allocation rules reales
- documentar la fuente canónica por tipo de costo

### Slice 4 - Recompute y materialización operativa

- endurecer `computeClientEconomicsSnapshots()` para:
  - detectar cobertura insuficiente
  - no promocionar snapshots débiles como fully valid
- revisar `src/lib/sync/projections/client-economics.ts`
- revisar `src/app/api/cron/economics-materialize/route.ts`
- dejar recompute mensual reproducible e idempotente
- definir runbook de backfill por período afectado

### Slice 5 - Consumers y smoke end-to-end

- validar `Finance > Intelligence`
- validar `Agency > Organizations > Finanzas`
- validar tendencias multi-período
- asegurar que export CSV y breakdown table no vuelvan a mostrar márgenes engañosos

## Out of Scope

- rediseñar la UI de Finance Intelligence
- rehacer el dashboard financiero general
- resolver toda la contabilidad analítica del negocio en esta misma lane
- introducir una taxonomía nueva de BU/service line fuera del catálogo vigente
- reemplazar completamente el modelo de `client_economics` por otro concepto

## Acceptance Criteria

- [ ] `greenhouse_serving.client_labor_cost_allocation` puede recomputarse históricamente por período sin depender de `CURRENT_DATE`
- [ ] existe un contrato explícito de completitud para snapshots de `client_economics`
- [ ] `computeClientEconomicsSnapshots()` no expone márgenes válidos cuando faltan costos mínimos defendibles
- [ ] trend route, GET principal y consumers cross-surface usan la misma semántica de completitud
- [ ] se documenta y valida la fuente canónica para:
  - costo laboral
  - costo directo asignado
  - costo indirecto / overhead
- [ ] existe al menos un backfill/recompute exitoso para un período real afectado (`2026-03` mínimo) con validación de datos antes/después
- [ ] `Finance > Intelligence` deja de mostrar `100% / Óptimo` para snapshots incompletos y muestra datos válidos o degradación explícita
- [ ] `Agency > Organizations > Finanzas` queda alineado con la misma semántica
- [ ] hay tests unitarios para:
  - completitud de snapshots
  - bridge laboral histórico
  - trend sanitization
- [ ] `pnpm test` pasa para la suite nueva/afectada
- [ ] `pnpm exec tsc --noEmit --pretty false` pasa

## Verification

- `pnpm pg:doctor --profile=runtime`
- `pnpm test`
- `pnpm exec tsc --noEmit --pretty false`
- query ad hoc antes/después sobre:
  - `greenhouse_finance.client_economics`
  - `greenhouse_finance.cost_allocations`
  - `greenhouse_finance.expenses`
  - `greenhouse_serving.client_labor_cost_allocation`
- smoke manual en:
  - `/finance/intelligence`
  - surface de Organization Finance vinculada al mismo snapshot

## Open Questions

- ¿`indirectCosts` debe persistirse ya como allocation real o basta con flaggear snapshot incompleto hasta cerrar esa foundation?
- ¿conviene agregar una tabla o vista auxiliar de `client_economics_coverage` para auditoría y observabilidad del pipeline?
- ¿el recompute mensual debe correr solo por cron o también por triggers reactivos sobre payroll/expenses/allocations?

## Rollout Notes

- No promover snapshots viejos a “correctos” solo porque existen filas persistidas
- Si la reparación cambia semántica de márgenes históricos, comunicarlo en `changelog.md` y en cualquier surface ejecutiva afectada
- Cualquier backfill manual debe dejar traza clara de período, alcance y fuente

## Follow-ups

- extender `materialization-health` para mostrar cobertura de `client_economics`, no solo freshness
- agregar observabilidad de `% de snapshots completos` por período
- evaluar si `Organization Economics` debe dejar de leer snapshots incompletos aunque existan
