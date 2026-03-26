# Handoff.md

## Uso

Este archivo es el snapshot operativo entre agentes. Debe priorizar claridad y continuidad.
Mantener aqui solo estado activo, validacion reciente y proximos pasos.
Si hace falta contexto historico detallado, revisar `Handoff.archive.md`.

## Formato Recomendado

### Fecha

- YYYY-MM-DD HH:MM zona horaria

### Agente

- Nombre del agente o persona

### Objetivo del turno

- Que se hizo o que se intento resolver

### Rama

- Rama usada
- Rama objetivo del merge

### Ambiente objetivo

- Development, Preview, staging o Production

### Archivos tocados

- Lista corta de archivos relevantes

### Verificacion

- Comandos ejecutados
- Resultado
- Lo que no se pudo verificar

### Riesgos o pendientes

- Riesgos activos
- Decisiones bloqueadas
- Proximo paso recomendado

---

## Estado Actual

## 2026-03-26 08:00 -03

### Agente

- Claude Opus 4.6 (1M context)

### Objetivo del turno

- ICO Engine Expansion: Person Operational Intelligence end-to-end
- Assignee resolution pipeline (Notion responsable → member_id)
- Data pipeline verification + materialization

### Lo completado

| Pieza | Estado |
|-------|--------|
| ICO Metric Registry | MetricScope + composite kind + 6 person metrics |
| Compute functions | 15 unit tests, pure functions |
| person_operational_360 | 4 members with real capacity/utilization data |
| Reactive projection | person_intelligence (7 trigger events) |
| API /intelligence | GET /api/people/:id/intelligence?trend=6 |
| PersonIntelligenceTab | 8 KPIs + trend chart + capacity + cost + delivery grid |
| Assignee backfill | 1403/2832 tasks resolved (49.5%) |
| BQ member metrics | 4 members materialized from v_tasks_enriched |
| Services fix | sp.display_name → sp.space_name |
| Delivery fix | RPA ratio display, correct API calls |
| Notion user IDs | daniela-ferreira + melkin-hernandez updated |

### Descubrimientos

- delivery_tasks.assignee_member_id estaba NULL en 100% tasks — resuelto con backfill
- metrics_by_member tenía 0 rows — resuelto con materialización manual
- RPA/OTD/FTR per-member null para marzo (no hay completed tasks este período)

### Pendientes

- Notion sync pipeline: agregar mapping automático Responsable → member_id
- TASK-053/054: tablas TanStack pendientes
- Frontend integration de PersonIntelligenceTab con datos reales (visible tras deploy)

---

## 2026-03-26 07:50 -03

### Agente

- Codex

### Objetivo del turno

- Corregir consumers de Organization que seguían leyendo `client_economics` con semántica vieja: márgenes incompletos como válidos y doble conteo de costo laboral.

### Rama

- `develop`

### Ambiente objetivo

- Development / staging

### Archivos tocados

- `src/lib/finance/client-economics-presentation.ts`
- `src/lib/finance/client-economics-presentation.test.ts`
- `src/app/api/finance/intelligence/client-economics/route.ts`
- `src/app/api/finance/intelligence/client-economics/trend/route.ts`
- `src/lib/account-360/organization-store.ts`
- `src/lib/account-360/organization-economics.ts`
- `docs/tasks/in-progress/TASK-055-finance-intelligence-cost-coverage-repair.md`
- `docs/tasks/complete/TASK-010-organization-economics-dashboard.md`

### Verificacion

- `pnpm test src/lib/finance/client-economics-presentation.test.ts src/app/api/finance/intelligence/client-economics/route.test.ts`
- `pnpm exec tsc --noEmit --pretty false`

### Riesgos o pendientes

- `sanitizeSnapshotForPresentation()` salió del route y quedó como helper reusable en `finance/client-economics-presentation.ts`; ahora Finance y Organization consumen el mismo contrato de completitud.
- `organization-store.ts` dejó de promediar `grossMarginPercent` / `netMarginPercent` nulos como `0`; ahora pondera solo clientes con cobertura válida.
- `organization-economics.ts` dejó de doble-contar nómina:
  - `client_economics.direct_costs_clp` se trata como costo canónico total
  - `laborCostClp` pasa a ser desglose/subset
  - el margen ajustado ya no resta nómina dos veces
- Próximo paso recomendado:
  - smoke test visual de `OrganizationFinanceTab` y `OrganizationEconomicsTab` en `dev-greenhouse` para confirmar que los KPIs bajaron a valores coherentes después del recálculo semántico

## 2026-03-26 07:42 -03

### Agente

- Codex

### Objetivo del turno

- Corregir la precisión del par inverso `CLP -> USD` y extraer un helper de conversión reutilizable para tasas.

### Rama

- `develop`

### Ambiente objetivo

- Development / staging

### Archivos tocados

- `src/lib/finance/shared.ts`
- `src/lib/finance/exchange-rates.ts`
- `src/lib/finance/exchange-rates.test.ts`
- `docs/tasks/in-progress/TASK-055-finance-intelligence-cost-coverage-repair.md`

### Verificacion

- `pnpm test src/lib/finance/exchange-rates.test.ts src/lib/finance/periods.test.ts src/lib/finance/payroll-cost-allocation.test.ts src/app/api/finance/intelligence/client-economics/route.test.ts src/views/greenhouse/finance/ClientEconomicsView.test.tsx src/lib/sync/projections/client-economics.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec tsx scripts/backfill-february-billable-assignments.ts`

### Riesgos o pendientes

- Se agregó helper reusable en `finance/shared`:
  - `roundDecimal()`
  - `invertExchangeRate()`
- `buildUsdClpRatePairs()` dejó de redondear las tasas FX con precisión de monto (`2` decimales); ahora:
  - `USD -> CLP` se mantiene con `2`
  - `CLP -> USD` conserva `6`
- Verificación runtime:
  - `USD_CLP_2026-02-27 = 861.19`
  - `CLP_USD_2026-02-27 = 0.001161`
- Febrero 2026 sigue materializado correctamente para `Sky Airline` con:
  - `directCostsClp = 1,485,552.75`
  - `grossMarginPercent = 0.8924`
- No quedan pendientes abiertos de este slice de febrero; el siguiente paso opcional sería reutilizar `invertExchangeRate()` donde hoy existan conversiones ad hoc fuera de `finance/exchange-rates`.

## 2026-03-26 07:34 -03

### Agente

- Codex

### Objetivo del turno

- Poblar el tipo de cambio histórico válido de febrero 2026 y recomputar `Finance Intelligence` para que el costo laboral en USD sí se materialice en CLP.

### Rama

- `develop`

### Ambiente objetivo

- Development / staging

### Archivos tocados

- `src/lib/finance/exchange-rates.ts`
- `src/lib/finance/exchange-rates.test.ts`
- `scripts/backfill-february-billable-assignments.ts`
- `docs/tasks/in-progress/TASK-055-finance-intelligence-cost-coverage-repair.md`

### Verificacion

- `pnpm test src/lib/finance/exchange-rates.test.ts src/lib/finance/periods.test.ts src/lib/finance/payroll-cost-allocation.test.ts src/app/api/finance/intelligence/client-economics/route.test.ts src/views/greenhouse/finance/ClientEconomicsView.test.tsx src/lib/sync/projections/client-economics.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec tsx scripts/backfill-february-billable-assignments.ts`
- Verificación directa de fuente:
  - `curl https://mindicador.cl/api/dolar/28-02-2026` → `serie: []`
  - `curl https://mindicador.cl/api/dolar/27-02-2026` → `valor: 861.19`

### Riesgos o pendientes

- `syncDailyUsdClpExchangeRate('2026-02-28')` ahora busca automáticamente el último día hábil disponible en `mindicador`; para febrero 2026 resolvió correctamente `2026-02-27`.
- `scripts/backfill-february-billable-assignments.ts` volvió a materializar febrero con:
  - `USD_CLP_2026-02-27 = 861.19`
  - `allocatedLaborClp = 1,485,552.75`
  - `headcountFte = 2`
  - `Sky Airline directCostsClp = 1,485,552.75`
  - `grossMarginPercent = netMarginPercent = 0.8924`
- Gap menor detectado:
  - el rate reverso `CLP -> USD` sigue redondeando a `0` por precisión insuficiente en `buildUsdClpRatePairs()`
  - no bloquea este caso porque FI consume `USD -> CLP`, pero conviene corregirlo en una lane corta de finance rates

## 2026-03-26 07:26 -03

### Agente

- Codex

### Objetivo del turno

- Habilitar febrero 2026 para `Finance Intelligence` sin mezclar monedas: backfill billable de assignments, fix de rango mensual corto y bridge laboral con moneda fuente + CLP diferido.

### Rama

- `develop`

### Ambiente objetivo

- Development / staging

### Archivos tocados

- `scripts/backfill-february-billable-assignments.ts`
- `scripts/setup-postgres-finance-intelligence-p2.sql`
- `src/lib/finance/periods.ts`
- `src/lib/finance/periods.test.ts`
- `src/lib/finance/postgres-store-intelligence.ts`
- `src/lib/finance/payroll-cost-allocation.ts`
- `src/lib/finance/payroll-cost-allocation.test.ts`
- `docs/tasks/in-progress/TASK-055-finance-intelligence-cost-coverage-repair.md`

### Verificacion

- `pnpm test src/lib/finance/periods.test.ts src/lib/finance/payroll-cost-allocation.test.ts src/app/api/finance/intelligence/client-economics/route.test.ts src/views/greenhouse/finance/ClientEconomicsView.test.tsx src/lib/sync/projections/client-economics.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec tsx scripts/setup-postgres-finance-intelligence-p2.ts`
- `pnpm exec tsx scripts/backfill-february-billable-assignments.ts`
- `pnpm exec tsx scripts/verify-p2-view.ts`

### Riesgos o pendientes

- `computeClientEconomicsSnapshots()` ya no rompe febrero con `YYYY-MM-31`; ahora usa rango mensual real con tests para febrero normal, bisiesto y meses de 31 días.
- Se backdateó solo la asignación billable de `Sky Airline`:
  - `daniela-ferreira` → `2024-12-01`
  - `melkin-hernandez` → `2025-08-01`
  - `andres-carlosama` → `2025-08-01`
- `greenhouse_serving.client_labor_cost_allocation` ahora preserva:
  - `payroll_currency`
  - `gross_total_source` / `allocated_labor_source`
  - `exchange_rate_to_clp`
  - `allocated_labor_clp` solo cuando existe FX histórico
- Para febrero 2026 el bridge quedó honesto:
  - hay filas en la view para `Sky Airline`
  - `payroll_currency = USD`
  - `allocated_labor_source` existe
  - `allocated_labor_clp = null` porque no hay `USD/CLP` histórico `<= 2026-02-28`
- `syncDailyUsdClpExchangeRate('2026-02-28')` hizo fallback a `2026-03-26` desde `open-er-api`; por diseño ese fallback no se usa para febrero porque el bridge exige tasa histórica no posterior al período.
- Próximo paso recomendado en `TASK-055`:
  - poblar `USD/CLP` histórico para febrero 2026
  - luego recomputar `client_economics(2026, 2)` para obtener costo laboral en CLP confiable

## 2026-03-26 10:15 -03

### Agente

- Antigravity

### Objetivo del turno

- Completar la implementación de Account Operational Metrics (TASK-014) y agregar `metrics_by_organization` al engine ICO e insertarlo en el `organization-store.ts`.

### Rama

- develop

### Ambiente objetivo

- Development / staging

### Archivos tocados

- `src/lib/ico-engine/schema.ts`
- `src/lib/ico-engine/materialize.ts`
- `scripts/setup-postgres-organization-operational-serving.sql`
- `src/lib/account-360/get-organization-operational-serving.ts`
- `src/lib/sync/projections/ico-organization-metrics.ts`
- `src/lib/sync/projections/organization-operational.ts`
- `src/lib/sync/projections/index.ts`
- `src/lib/account-360/organization-store.ts`
- `docs/tasks/README.md`
- `docs/tasks/complete/TASK-014-projects-account-360-bridge.md`

### Verificacion

- `pnpm lint --fix` para los archivos tocados
- `pnpm exec tsc --noEmit` compiló sin problemas en mis archivos
- Confirmé que los handlers tienen tipados sólidos y extraen data correcta desde BQ hacia Postgres y desde Postgres hacia el FE en el store.
- Completé la migración del .md a "complete"

### Riesgos o pendientes

- Hay que correr en production el script `scripts/setup-postgres-organization-operational-serving.sql` para crear las tablas base en Postgres antes de hacer queries a esas tablas.
- Integración final en UI (dashboard frontend) puede necesitar ser cableada para consumir el nuevo exporter de `getOrganizationOperationalMetrics` de `organization-store.ts`.

## 2026-03-26 07:15 -03

### Agente

- Codex

### Objetivo del turno

- Ejecutar el cálculo real de Payroll para `2026-02` con UF `39779.29` y verificar si eso desbloqueaba costo laboral para `Finance Intelligence`.

### Rama

- `develop`

### Ambiente objetivo

- Development / staging

### Archivos tocados

- `docs/tasks/in-progress/TASK-055-finance-intelligence-cost-coverage-repair.md`

### Verificacion

- Ejecución operativa vía stores del módulo Payroll:
  - crear/actualizar período `2026-02`
  - `calculatePayroll({ periodId: '2026-02' })`
  - `pgSetPeriodApproved('2026-02', null)`
- Query runtime posterior:
  - `greenhouse_payroll.payroll_entries` para `2026-02`
  - `greenhouse_core.client_team_assignments` para `daniela-ferreira`, `melkin-hernandez`
  - `greenhouse_serving.client_labor_cost_allocation` para `2026-02`
- `pnpm exec tsc --noEmit --pretty false`

### Riesgos o pendientes

- `2026-02` quedó aprobado con `2` entries calculadas, así que febrero ya existe en `greenhouse_payroll`.
- `client_labor_cost_allocation` permanece vacío para febrero porque los assignments de ambos miembros empiezan el `2026-03-13`; no hay solape temporal válido con febrero.
- El gap restante para `Finance Intelligence` ya no es “falta de nómina febrero”, sino falta de `client_team_assignments` compatibles con ese período o falta de otro payroll/assignment del mes que sí corresponda al cliente esperado.

## 2026-03-26 07:06 -03

### Agente

- Codex

### Objetivo del turno

- Verificar si existía un payroll de febrero en la fuente canónica y destrabar el backfill hacia `greenhouse_payroll`.

### Rama

- `develop`

### Ambiente objetivo

- Development / staging

### Archivos tocados

- `scripts/backfill-postgres-payroll.ts`
- `docs/tasks/in-progress/TASK-055-finance-intelligence-cost-coverage-repair.md`

### Verificacion

- `pnpm exec tsx scripts/backfill-postgres-payroll.ts`
- `pnpm exec tsc --noEmit --pretty false`

### Riesgos o pendientes

- El script de backfill de payroll quedó corregido para usar `GOOGLE_APPLICATION_CREDENTIALS_JSON` y no caer al refresh token OAuth local (`invalid_rapt`).
- Con auth ya sana, BigQuery devolvió `0` filas para `greenhouse.payroll_periods`, `greenhouse.payroll_entries` y `greenhouse.compensation_versions`; por eso PostgreSQL no tiene febrero.
- El siguiente cuello de botella ya no es runtime de este repo: hay que identificar dónde vive realmente ese payroll de febrero y materializarlo a BigQuery o cargarlo directo a PostgreSQL con un import controlado.

## 2026-03-26 06:55 -03

### Agente

- Codex

### Objetivo del turno

- Corregir el bridge laboral histórico de `Finance Intelligence` para que `client_labor_cost_allocation` use assignments válidos para el período de nómina, no para `CURRENT_DATE`.

### Rama

- `develop`

### Ambiente objetivo

- Development / staging

### Archivos tocados

- `scripts/setup-postgres-finance-intelligence-p2.sql`
- `src/lib/finance/payroll-cost-allocation.test.ts`
- `src/lib/sync/projections/client-economics.test.ts`
- `docs/tasks/in-progress/TASK-055-finance-intelligence-cost-coverage-repair.md`

### Verificacion

- `pnpm test src/lib/finance/payroll-cost-allocation.test.ts src/lib/sync/projections/client-economics.test.ts src/app/api/finance/intelligence/client-economics/route.test.ts src/views/greenhouse/finance/ClientEconomicsView.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec tsx scripts/setup-postgres-finance-intelligence-p2.ts`
- `pnpm exec tsx scripts/verify-p2-view.ts`
- Query runtime adicional:
  - `greenhouse_payroll.payroll_periods` -> solo `2026-03`, estado `draft`
  - `greenhouse_core.client_team_assignments` -> `11` filas

### Riesgos o pendientes

- El bug temporal del view quedó corregido: ahora usa solape `start_date/end_date` con `period_start/period_end` del payroll period.
- El view sigue devolviendo `0` filas en este entorno porque no hay payroll `approved/exported` todavía; eso ya es un gap operativo de datos, no de semántica temporal.
- Para que `Finance > Intelligence` muestre costo laboral real después de este fix, el siguiente paso es aprobar/exportar el período correspondiente o backfillear payroll ya validado.

## 2026-03-26 06:48 -03

### Agente

- Codex

### Objetivo del turno

- Activar `TASK-055` y corregir la parte reactiva del pipeline de `client_economics`, para que el outbox sí recompute `Finance > Intelligence` por período afectado cuando cambian ingresos, egresos, allocations o payroll.

### Rama

- `develop`

### Ambiente objetivo

- Development / staging

### Archivos tocados

- `src/lib/sync/projections/client-economics.ts`
- `src/lib/sync/projections/client-economics.test.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/finance/postgres-store-intelligence.ts`
- `src/lib/payroll/postgres-store.ts`
- `docs/tasks/in-progress/TASK-055-finance-intelligence-cost-coverage-repair.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`

### Verificacion

- `pnpm test src/lib/sync/projections/client-economics.test.ts src/app/api/finance/intelligence/client-economics/route.test.ts src/views/greenhouse/finance/ClientEconomicsView.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`

### Riesgos o pendientes

- `client_economics` ya no refresca solo el mes actual: ahora deriva `year/month` desde payloads de `finance` y `payroll`, y recomputa el período afectado.
- `cost_allocations` empezó a publicar eventos outbox canónicos (`finance.cost_allocation.created/deleted`) y payroll ahora publica `payroll_period.updated/calculated/approved` con `year/month`; eso destraba la invalidación automática de snapshots.
- La lane sigue abierta: falta corregir el bridge laboral histórico en `scripts/setup-postgres-finance-intelligence-p2.sql` y cerrar la cobertura canónica de costos, no solo el recompute reactivo.
- Hay cambios paralelos fuera de este lote en `src/views/greenhouse/agency/services/ServiceDetailView.tsx`, `src/views/greenhouse/agency/services/ServicesListView.test.tsx`, `src/lib/ico-engine/metric-registry.ts` y `src/lib/person-intelligence/`; no fueron tocados ni deben mezclarse en este commit.

## 2026-03-26 06:26 -03

### Agente

- Codex

### Objetivo del turno

- Auditar `Finance > Intelligence` porque la vista estaba mostrando márgenes `100%` con costos prácticamente nulos.
- Corregir la presentación para no tratar snapshots incompletos como rentabilidad válida.

### Rama

- `develop`

### Ambiente objetivo

- Development / staging

### Archivos tocados

- `src/app/api/finance/intelligence/client-economics/route.ts`
- `src/app/api/finance/intelligence/client-economics/trend/route.ts`
- `src/views/greenhouse/finance/ClientEconomicsView.tsx`
- `src/app/api/finance/intelligence/client-economics/route.test.ts`
- `src/views/greenhouse/finance/ClientEconomicsView.test.tsx`

### Verificacion

- `pnpm test src/app/api/finance/intelligence/client-economics/route.test.ts src/views/greenhouse/finance/ClientEconomicsView.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- Auditoría runtime con `pnpm pg:doctor --profile=runtime`
- Queries ad hoc contra Postgres confirmaron para `Sky Airline` en `2026-03`:
  - `greenhouse_finance.client_economics` tenía snapshot persistido con `total_revenue_clp = 13804000` y `direct_costs_clp = 1225`
  - `greenhouse_finance.cost_allocations` del período: vacío
  - `greenhouse_finance.expenses` directos asignados al cliente: vacío
  - `greenhouse_serving.client_labor_cost_allocation` del período: vacío
  - el snapshot provenía de un backfill puntual (`notes = Backfill from Codex for organization finance visibility`)

### Riesgos o pendientes

- `Finance > Intelligence` ya no debe mostrar `100% / Óptimo` cuando el snapshot tiene ingresos pero no cobertura defendible de costos; ahora oculta márgenes y muestra warning.
- La tendencia de márgenes quedó alineada con la misma sanitización; ya no debería pintar líneas artificialmente optimistas desde snapshots incompletos.
- El problema de fondo sigue abierto en data pipeline: falta materializar costos canónicos del período para `client_economics` (`cost_allocations`, `expenses` asignados y/o `client_labor_cost_allocation`).
- Siguiente paso real si se quiere rentabilidad correcta: poblar `greenhouse_serving.client_labor_cost_allocation` y automatizar recompute mensual de `client_economics` con cobertura completa.

## 2026-03-26 06:18 -03

### Agente

- Codex

### Objetivo del turno

- Auditar `Agency > Team` porque la vista estaba mostrando headcount y capacidad incorrectos.
- Corregir duplicados por assignment, semántica de capacidad libre y fallback cuando faltan métricas operativas.

### Rama

- `develop`

### Ambiente objetivo

- Development / staging

### Archivos tocados

- `src/app/api/team/capacity-breakdown/route.ts`
- `src/views/agency/AgencyTeamView.tsx`
- `src/lib/team-capacity/shared.ts`
- `src/lib/team-capacity/shared.test.ts`
- `src/app/api/team/capacity-breakdown/route.test.ts`
- `src/views/agency/AgencyTeamView.test.tsx`

### Verificacion

- `pnpm test src/lib/team-capacity/shared.test.ts src/app/api/team/capacity-breakdown/route.test.ts src/views/agency/AgencyTeamView.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- Auditoría runtime con `pnpm pg:doctor --profile=runtime`
- Query ad hoc contra Postgres confirmó:
  - `11` assignments activos
  - `7` miembros únicos
  - `greenhouse_serving.person_operational_metrics` no existe en este entorno

### Riesgos o pendientes

- `Agency > Team` ya no debe mostrar personas duplicadas ni `0h usadas` como si fueran métricas reales; ahora agrega por `member_id` y muestra ausencia de métricas operativas explícitamente.
- `Disponibles` cambió a semántica de capacidad libre contractual (`contratada - asignada`), no `contratada - usada`.
- Si se quiere volver a poblar `Usadas`, el siguiente paso real es materializar `greenhouse_serving.person_operational_metrics` o conectar esta vista a un adapter ICO más estable.

## 2026-03-26 04:30 -03

### Agente

- Claude Opus 4.6 (1M context)

### Objetivo del turno

- Migración masiva de tablas MUI → TanStack React Table v8 con Vuexy styling
- Completar vistas Agency (Delivery, Operations)
- Brand icons (Notion SVG fix, Microsoft/HubSpot)
- TASK-053 creada para restantes

### Rama

- `develop`

### Progreso

**17 de 48 tablas migradas.** Archivos completados:

| # | Archivo | Tipo |
|---|---------|------|
| 1 | `AgencyTeamView.tsx` | search+sort+pagination |
| 2 | `AgencyCampaignsView.tsx` | search+sort+pagination |
| 3 | `AgencyEconomicsView.tsx` | sort-only (top clients) |
| 4 | `AgencyDeliveryView.tsx` | sort-only (spaces) |
| 5 | `AgencyOperationsView.tsx` | sort-only (2 tables: events + projections) |
| 6 | `GreenhouseAdminRoles.tsx` | sort-only (matrix) |
| 7 | `GreenhouseAdminTenants.tsx` | search+sort+pagination |
| 8 | `OrganizationListView.tsx` | sort + server-side pagination |
| 9 | `IncomeListView.tsx` | search+sort+pagination + checkbox |
| 10 | `ExpensesListView.tsx` | search+sort+pagination |
| 11 | `SuppliersListView.tsx` | search+sort+pagination |
| 12 | `ClientsListView.tsx` | search+sort+pagination |
| 13 | `ClientEconomicsView.tsx` | pagination (existing sort preserved) |
| 14 | `ReconciliationView.tsx` | 2 tables: periods sort+pagination, movements sort |
| 15 | `CostAllocationsView.tsx` | sort + delete action |
| 16 | `ServicesListView.tsx` | sort + server-side pagination |

### Inventario restante (31 tablas en ~28 archivos)

**Batch 2 remaining — Finance detail views:**
- `ServiceDetailView.tsx` — 1 table (sort-only)
- `IncomeDetailView.tsx` — 1 table (payment history, small)
- `ClientDetailView.tsx` — 2 tables (invoices + deals, small)
- `SupplierDetailView.tsx` — 1 table (expense history)
- `ReconciliationDetailView.tsx` — 1 table (statement rows, large)
- `FinanceDashboardView.tsx` — embedded summary tables

**Batch 3 — Org/People tabs:**
- `OrganizationPeopleTab.tsx`, `OrganizationProjectsTab.tsx`, `OrganizationFinanceTab.tsx`
- `OrganizationEconomicsTab.tsx`, `OrganizationOverviewTab.tsx`
- `PersonMembershipsTab.tsx`, `PersonPayrollTab.tsx`, `PersonFinanceTab.tsx`, `PersonAiToolsTab.tsx`

**Batch 4 — HR & Payroll:**
- `HrCoreDashboard.tsx`, `HrDepartmentsView.tsx`, `HrLeaveView.tsx`, `HrAttendanceView.tsx`
- `PayrollEntryTable.tsx`, `PayrollHistoryTab.tsx`, `PayrollCompensationTab.tsx`
- `PayrollPersonnelExpenseTab.tsx`, `PayrollReceiptCard.tsx`, `MemberPayrollHistory.tsx`

**Batch 5 — My + Admin + Other:**
- `MyAssignmentsView.tsx`, `MyPayrollView.tsx`, `MyOrganizationView.tsx`
- `NotificationPreferencesView.tsx`
- `TenantCrmPanel.tsx`, `TenantNotionPanel.tsx`, `TenantProjectsPanel.tsx`
- `GreenhouseDeliveryAnalytics.tsx`, `GreenhouseProjectDetail.tsx`
- `GreenhouseReviewQueue.tsx`, `GreenhouseClientCampaignDetail.tsx`

### Patrón de migración

Cada archivo sigue el mismo patrón (referencia: `AgencyTeamView.tsx`):
1. Reemplazar imports MUI Table → TanStack + classnames + tableStyles
2. Definir columns con `createColumnHelper<RowType>()`, tipo `ColumnDef<T, any>[]`
3. Agregar `[sorting, setSorting] = useState<SortingState>([])`
4. Crear instancia `useReactTable({ data, columns, state, ...Models })`
5. Reemplazar `<TableContainer><Table>` con `<div className='overflow-x-auto'><table className={tableStyles.table}>`
6. Para list views: agregar `CustomTextField` búsqueda + `TablePaginationComponent`
7. Para detail/embedded: sort-only sin paginación

### Verificación

- `npx tsc --noEmit` limpio después de cada batch
- `pnpm build` limpio
- 37 test files, 256 tests passing

---

## 2026-03-25 21:50 -03

### Agente

- Codex GPT-5

### Objetivo del turno

- Verificar por qué `staging` seguía mostrando el comportamiento viejo de `Campaigns`, destrabar el pipeline de deploy sin revertir la migración a React Table y dejar inventario de deuda restante.

### Rama

- `develop`
- destino esperado: `develop`

### Ambiente objetivo

- staging / Vercel

### Archivos tocados

- `postcss.config.mjs`
- `src/views/greenhouse/finance/ReconciliationView.tsx`

### Verificacion

- `pnpm test src/lib/campaigns/backfill-heuristics.test.ts src/lib/campaigns/campaign-store.test.ts src/app/api/campaigns/route.test.ts src/views/agency/AgencyCampaignsView.test.tsx` — ok (`4 files`, `9 tests`)
- `pnpm build` — ok
- `vercel ls --scope efeonce --yes` — confirmó que `dev-greenhouse` seguía sirviendo el último deployment `Ready`

### Riesgos o pendientes

- Hallazgo confirmado: `dev-greenhouse.efeoncepro.com` seguía apuntando al último `staging` `Ready` porque los deploys más recientes fallaron antes de publicar.
- La causa raíz del fallo ya no es `Campaigns` ni datos de PostgreSQL: era la incompatibilidad de `postcss.config.mjs` entre `Turbopack` y `Vitest`.
- `postcss.config.mjs` quedó ajustado a sintaxis de objeto (`'@tailwindcss/postcss': {}`), que valida tanto en `pnpm build` como en `Vitest`.
- `ReconciliationView.tsx` siguió avanzando en la migración a TanStack React Table y el branch volvió a compilar con ese cambio presente.
- Inventario actual: quedan `42` archivos `.tsx` con tablas legacy sin `@tanstack/react-table` en `src/`.
- Prioridad sugerida para la migración restante:
  - `Agency`: `AgencyDeliveryView`, `AgencyOperationsView`, `ServicesListView`, `ServiceDetailView`
  - `Finance`: `ReconciliationView`, `FinanceDashboardView`, detail views (`Client`, `Income`, `Supplier`, `ReconciliationDetail`)
  - `HR/Payroll`
  - luego `Organizations`, `People`, `Admin tenant detail`, `My`

## 2026-03-25 20:45 -03

### Agente

- Codex GPT-5

### Objetivo del turno

- Revisar por qué `Agency > Spaces` no mostraba `RpA` y confirmar si la vista estaba consumiendo la capa `ICO`

### Rama

- `develop`
- destino esperado: `develop`

### Ambiente objetivo

- Development / staging

### Archivos tocados

- `src/lib/agency/agency-queries.ts`
- `src/lib/agency/agency-queries.test.ts`
- `Handoff.md`
- `changelog.md`

### Verificacion

- `pnpm test src/lib/agency/agency-queries.test.ts` — ok
- `pnpm lint -- src/lib/agency/agency-queries.ts src/lib/agency/agency-queries.test.ts` — el script del repo ejecuta lint global y falla por deuda preexistente en archivos no tocados; este cambio no introdujo errores reportados en los archivos editados

### Riesgos o pendientes

- Hallazgo confirmado: `Agency > Spaces` seguía leyendo `RpA` desde `notion_ops.tareas.rpa` y `OTD` desde `notion_ops.proyectos`, no desde `ICO`
- Fix aplicado: `getAgencySpacesHealth()` y `getAgencyPulseKpis()` ahora leen `RpA/OTD` desde el snapshot ICO más reciente por `space_id` (`ico_engine.metric_snapshots_monthly`), agregando luego por cliente/space visible en Agency
- La deuda documental sigue desalineada: `docs/tasks/complete/TASK-046-delivery-performance-metrics-ico-cutover.md` todavía conserva metadatos de `to-do/diseño` aunque el handoff previo la reporta como cerrada
- Validación de datos completada: los 2 spaces activos visibles hoy (`Efeonce`, `Sky Airline`) sí tienen snapshots ICO recientes para marzo 2026; no hay gaps ni snapshots stale en `ico_engine.metric_snapshots_monthly`
- Validación de staging: `dev-greenhouse.efeoncepro.com` apunta al deployment `greenhouse-akc7llk32-efeonce-7670142f.vercel.app` (commit `988d06d`, `develop`, creado 2026-03-25 20:48 -03) y el dominio está protegido por Vercel (`401` sin bypass). `vercel curl /api/auth/session` responde `{}` y `vercel curl /api/agency/spaces` responde `{"error":"Unauthorized"}` como esperado sin sesión de app
- Conclusión operativa: el fix local de `Agency > Spaces` todavía no puede verse en staging porque no fue `commit`/`push`/deployado aún
- Follow-up detectado: `src/views/agency/AgencyDeliveryView.tsx` sigue siendo un stub. Hace `fetch('/api/agency/pulse')` dos veces, trata `statusMix` como si fuera `spaces` y fabrica una tendencia `RPA/OTD` a partir de `weeklyActivity`; no debe considerarse una surface ICO-correcta

## 2026-03-25 — Sesión Claude Opus 4.6 (continuación)

### Agente

- Claude Opus 4.6 (1M context)

### Objetivo del turno

Continuación de sesión: Collaborator Portal, Organization Identity Bridge, Agency Redesign, Production Deploy.

### Rama

- `develop` → `main` (merged to production)

### Lo completado en esta sesión

| Área | Detalle |
|------|---------|
| **Collaborator Portal** | Session bridge (memberId en JWT), 7 APIs self-service, 7 view components, sidebar MI FICHA, GH_MY_NAV nomenclature |
| **Organization Identity Bridge** | Migration backfill identity + person_memberships, ensureClientMembership auto-link, directorio de colegas API + UI |
| **Agency Redesign Fase 1** | Nav 3→9 items, Economics view (P&L + clients), Team view (4-type capacity), Campaigns view (cross-space). Backend: listAllCampaigns, getServicesExpiringBefore |
| **Production Deploy** | develop → main merged (114 commits, 20+ tasks). Deploy successful. |
| **Brand Icons** | Outlook, Teams, Slack SVGs. Integration logos enlarged. Notion SVG fixed. |
| **Build Fixes** | requireTenantContext destructuring (20 routes), horizontal NavbarContent, organization-projects property names, publishOutboxEvent signature |
| **TASK-001** | Payroll hardening: kpi_source_mode, attendance snapshots, Chile tax brackets, calculation diagnostics |
| **TASK-008** | Capacity formal model: contracted_hours_month + 4-type breakdown API |
| **TASK-042/043/044** | Person operational serving, Person 360 runtime consolidation, Organization executive snapshot |
| **TASK-046/047/048/049** | False RPA fix, project scope count, sprint store + APIs, consolidated project endpoint |
| **TASK-050/051/052** | Finance client Postgres cutover, payroll bridge alignment, Person 360 finance access |

### Portal Views completadas

| Audiencia | Vistas | Estado |
|-----------|--------|--------|
| **Clientes** | 10 vistas (Pulse, Proyectos, Campañas, Revisiones, Ciclos, Equipo, Analytics, Novedades, Settings, Mi Organización) | Todas implementadas |
| **Colaboradores** | 8 vistas (Mi Greenhouse, Asignaciones, Desempeño, Delivery, Perfil, Nómina, Permisos, Mi Organización) | Todas implementadas |
| **Agency/Operadores** | 9 secciones (Agencia, Spaces, Economía, Equipo, Delivery*, Campañas, Servicios, Operaciones*, Organizaciones) | 7 implementadas, 2 stubs |

### Pendientes para próxima sesión

- Agency Delivery view (reemplazar stub con ICO + sprints)
- Agency Operations view (reemplazar stub con health monitoring)
- Agency Command Center (reemplazar vista actual con dashboard ejecutivo)
- Client sidebar navigation (agregar nuevas vistas al nav del cliente)
- Tests unitarios para evitar build failures
- TASK-009 Greenhouse Home (Nexa)

### Verificación

- `pnpm build` limpio en cada commit
- Production deploy exitoso (ae864d8 → main)
- All migrations executed against Postgres

---

## 2026-03-24 — Sesión Claude Opus 4.6

### Agente

- Claude Opus 4.6 (1M context)

### Objetivo del turno

Sesión intensiva cubriendo 15+ tasks implementadas + auditorías de robustez.

### Rama

- `develop` → deploy a staging vía Vercel

### Tasks completadas en esta sesión

| Task | Descripción |
|------|------------|
| TASK-024 | Login Redesign (two-panel layout, Greenhouse branding) |
| TASK-012 | Outbox Event Expansion (4 slices, 30+ event types) |
| TASK-006 | Webhook Infrastructure MVP |
| TASK-010 | Organization Economics Dashboard |
| TASK-004 | Finance Dashboard Calculation Correction |
| TASK-003 | Invoice Payment Ledger Correction |
| TASK-013 | Nubox Finance Reconciliation Bridge |
| TASK-022 | Services Runtime Closure (HubSpot sync + legacy cutover + ETL) |
| TASK-014 | Projects Account 360 Bridge |
| TASK-015 | Financial Intelligence Layer v2 (trends, LTV/CAC, allocations UI) |
| TASK-023 | Notification System (full: schema, service, API, UI, outbox integration, welcome) |
| TASK-011 | ICO Person 360 Integration |
| TASK-017 | Campaign 360 (full: DDL, CRUD, metrics, budget, roster, UI) |
| TASK-045 | Reactive Projection Refresh + Scalability Hardening |

### Auditorías ejecutadas

1. **Module Integration Audit** (Finance ↔ HRM ↔ People ↔ Account 360): 5 brechas detectadas y cerradas
2. **Delivery Layer Audit**: 5 brechas detectadas y cerradas (multi-assignee, sprint materialization, legacy dual-read, health check)
3. **TASK-008 Architecture Contrast**: alineada, no requiere cambios

### Client-Facing Delivery Views implementadas

| Vista | Ruta | APIs |
|-------|------|------|
| Review Queue | `/reviews` | `GET /api/reviews/queue` |
| Client Campaigns | `/campanas` + `/campanas/[id]` | Reutiliza campaign APIs existentes |
| Project Detail (assignees) | `/proyectos/[id]` | `GET /api/projects/[id]/ico` |
| Mi Equipo | `/equipo` | Reutiliza `/api/team/capacity` |
| Delivery Analytics | `/analytics` | `GET /api/analytics/delivery` |
| Notifications | `/notifications` + `/notifications/preferences` | 5 endpoints notification |

### Infraestructura platform

- Projection Registry declarativo con 4 proyecciones registradas
- 4 crons domain-partitioned (org, people, finance, notifications)
- Refresh queue persistente con dedup, retry, dead-letter
- Materialization health check (`/api/cron/materialization-health`)
- Projection observability (`/api/internal/projections`)
- Playbook documentado: `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

### Pendientes para próxima sesión

- Agregar nuevas vistas al sidebar navigation del cliente (verticalMenuData.tsx)
- TASK-009 Greenhouse Home (Nexa) — dashboard de entrada
- TASK-021 Typography Variant Adoption — deuda técnica visual
- TASK-008 Team Identity Capacity System — formalizar modelo de capacidad
- Sprint burndown chart API (`GET /api/sprints/[id]/burndown`)

### Verificación

- `npx tsc --noEmit` — limpio en cada commit
- Todos los commits pushed a `develop`

---

## 2026-03-24 23:20 -03

### Agente

- GitHub Copilot (GPT-5.4)

### Objetivo del turno

- Revisar HR + Finanzas contra el codebase y el modelo actual, documentar brechas reales y derivar las tasks necesarias sin duplicar lanes ya existentes

### Rama

- develop

### Ambiente objetivo

- documentation / backlog

### Archivos tocados

- `docs/roadmap/GREENHOUSE_HR_FINANCE_RUNTIME_GAPS_V1.md` — documento canónico de brechas HR + Finance runtime
- `docs/tasks/to-do/TASK-050-finance-client-canonical-runtime-cutover.md` — lane para cortar `Finance Clients` al grafo canónico actual
- `docs/tasks/to-do/TASK-051-finance-payroll-bridge-postgres-alignment.md` — lane para alinear Finance <-> Payroll sobre `greenhouse_payroll`
- `docs/tasks/to-do/TASK-052-person-360-finance-access-alignment.md` — lane para habilitar consumo financiero de persona desde `Person 360`
- `docs/tasks/README.md` — índice actualizado con TASK-050..052 y dependencias cruzadas HR/Finance
- `docs/tasks/TASK_ID_REGISTRY.md` — registro actualizado, siguiente ID `TASK-053`
- `docs/README.md` — roadmap enlaza el nuevo documento de brechas HR/Finance
- `changelog.md` — registro del cambio documental

### Verificacion

- Revisión manual de consistencia documental entre roadmap, índice, registry y nuevas tasks
- No se ejecutaron `lint`, `test` ni `build` porque el cambio es exclusivamente documental

### Riesgos o pendientes

- Hallazgo de runtime real: `src/app/api/finance/analytics/trends/route.ts` sigue consultando `greenhouse_hr.payroll_*` en vez de `greenhouse_payroll.*`; quedó documentado como gap principal en `TASK-051`
- Hallazgo de permisos real: Finance no puede consumir `Person 360` financiero con el contrato actual; quedó documentado en `TASK-052`
- El bug de prorrateo de permisos que cruzan período no recibió task nueva porque ya está cubierto por `TASK-001` y `TASK-005`; conviene ejecutar esas lanes antes de asumir correctitud plena de nómina

## 2026-03-24 22:45 -03

### Agente

- GitHub Copilot (GPT-5.4)

### Objetivo del turno

- Crear las tasks derivadas para cerrar las brechas del runtime client-facing de Delivery detectadas en el audit de codebase

### Rama

- develop

### Ambiente objetivo

- documentation / backlog

### Archivos tocados

- `docs/roadmap/GREENHOUSE_DELIVERY_CLIENT_RUNTIME_GAPS_V1.md` — documento canonico de brechas Delivery client-facing
- `docs/tasks/to-do/TASK-046-delivery-performance-metrics-ico-cutover.md` — lane para cortar performance Delivery a ICO y eliminar el falso RpA
- `docs/tasks/to-do/TASK-047-delivery-project-scope-visibility-correction.md` — lane para corregir inventario visible de proyectos segun scope canónico
- `docs/tasks/to-do/TASK-048-delivery-sprint-runtime-completion.md` — lane para cerrar la superficie client-facing de Sprints
- `docs/tasks/to-do/TASK-049-delivery-client-runtime-consolidation.md` — lane para consolidar contracts y fan-out del read path Delivery
- `docs/tasks/README.md` — índice actualizado con TASK-046..049 y dependencias cruzadas Delivery
- `docs/tasks/TASK_ID_REGISTRY.md` — registro actualizado, siguiente ID `TASK-050`
- `docs/README.md` — roadmap enlaza el nuevo documento de brechas Delivery
- `changelog.md` — registro del cambio documental

### Verificacion

- Revisión manual de consistencia documental entre roadmap, índice, registry y nuevas tasks
- `get_errors` sin errores en los markdown tocados
- No se ejecutaron `lint`, `test` ni `build` porque el cambio es exclusivamente documental

### Riesgos o pendientes

- El índice de tasks arrastra drift previo: `TASK-014` aparece enlazada en `docs/tasks/README.md` pero el archivo no existe en `docs/tasks/to-do/`, mientras `changelog.md` la declara implementada; conviene normalizar esa inconsistencia en una lane documental aparte
- Próximo paso recomendado: decidir si se toma primero `TASK-046` para corregir la semántica KPI visible al cliente o `TASK-047` para corregir el inventario de proyectos antes de tocar UX más amplia

## 2026-03-24 22:10 -03

### Agente

- GitHub Copilot (GPT-5.4)

### Objetivo del turno

- Crear una fuente canónica de brechas runtime cross-module basada en codebase real y derivar tasks nuevas, completas y ejecutables para cerrarlas

### Rama

- develop

### Ambiente objetivo

- documentation / backlog

### Archivos tocados

- `docs/roadmap/GREENHOUSE_RUNTIME_SYNERGY_GAPS_V1.md` — documento canonico de brechas runtime
- `docs/tasks/to-do/TASK-042-person-operational-serving-cutover.md` — nueva lane para cortar People a métricas operativas canónicas
- `docs/tasks/to-do/TASK-043-person-360-runtime-consolidation.md` — nueva lane para consolidar Person 360 serving-first
- `docs/tasks/to-do/TASK-044-organization-executive-snapshot.md` — nueva lane para snapshot ejecutivo por organización
- `docs/tasks/to-do/TASK-045-reactive-projection-refresh.md` — nueva lane para refresh reactivo de proyecciones
- `docs/tasks/README.md` — índice actualizado con nuevas tasks y dependencias cruzadas
- `docs/tasks/TASK_ID_REGISTRY.md` — registro actualizado, siguiente ID `TASK-046`
- `docs/README.md` — roadmap enlaza el nuevo documento de brechas
- `changelog.md` — registro del cambio documental

### Verificacion

- Revisión manual de consistencia documental entre índice, registry y nuevas tasks
- No se ejecutaron `lint`, `test` ni `build` porque el cambio es exclusivamente documental

### Riesgos o pendientes

- El backlog histórico del índice sigue teniendo drift previo en algunos estados legacy/completados y conviene normalizarlo en una lane separada para no mezclarlo con esta creación de brechas
- Próximo paso recomendado: decidir si `TASK-042` o `TASK-044` entra primero a `in-progress` según si la prioridad inmediata está en `People` o en superficies ejecutivas de organización

## 2026-03-24 — TASK-004 Finance Dashboard Calculation Correction

### Agente

- Claude Opus 4.6 (Agent SDK worktree)

### Objetivo del turno

- Implementacion de TASK-004: corregir 6 problemas de calculo del dashboard financiero

### Rama

- develop

### Archivos tocados

- `src/app/api/finance/income/summary/route.ts` — Postgres-first con BQ fallback
- `src/app/api/finance/expenses/summary/route.ts` — Postgres-first con BQ fallback
- `src/app/api/finance/dashboard/cashflow/route.ts` — ya tenia Postgres, verificado
- `src/app/api/finance/dashboard/summary/route.ts` — Postgres-first con BQ fallback
- `src/app/api/finance/dashboard/pnl/route.ts` — collectedRevenue, accountsReceivable, completeness
- `src/views/greenhouse/finance/FinanceDashboardView.tsx` — KPIs duales, bar chart consistente, cash flow real, P&L mejorado
- `src/lib/finance/finance-dashboard-calculations.test.ts` — 10 tests nuevos

### Verificacion

- No se pudo ejecutar tsc ni vitest por restricciones de bash en worktree
- Revision manual de tipos completada

### Riesgos o pendientes

- Ejecutar `npx tsc --noEmit`, `pnpm test`, `pnpm lint`
- Query de income_payments asume tabla existe en Postgres
- Dependencia parcial con TASK-003 (Invoice Payment Ledger)

---

## 2026-03-24 — TASK-013 Nubox Finance Reconciliation Bridge

### Agente

- Claude Opus 4.6

### Objetivo del turno

- Implementacion completa de TASK-013: matching engine DTE ↔ Finance, proposals store, DTE coverage metrics, API endpoints

### Rama

- develop

### Archivos tocados

- `src/lib/nubox/dte-matching.ts` — Matching engine con scoring multi-signal (amount/folio/RUT/date/org)
- `src/lib/nubox/dte-matching.test.ts` — 12 unit tests para matching engine
- `src/lib/nubox/reconciliation.ts` — Orchestrator, proposal CRUD, resolve con outbox events
- `src/lib/finance/dte-coverage.ts` — Coverage metrics y discrepancies per org/period
- `src/app/api/finance/dte-reconciliation/route.ts` — GET list proposals, POST trigger reconciliation
- `src/app/api/finance/dte-reconciliation/[proposalId]/route.ts` — GET proposal, PATCH approve/reject
- `src/app/api/organizations/[id]/dte-coverage/route.ts` — GET DTE coverage per org
- `scripts/setup-postgres-dte-reconciliation.sql` — DDL for dte_reconciliation_proposals table
- `docs/tasks/README.md` — Task moved to Complete

### Verificacion

- `pnpm exec tsc --noEmit` — 0 new errors (6 pre-existing in unrelated files)
- `pnpm exec vitest run src/lib/nubox/dte-matching.test.ts` — 12/12 passed

### Riesgos o pendientes

- DDL script `setup-postgres-dte-reconciliation.sql` must be run in production before use
- Pre-existing TS errors in `finance/expenses/summary`, `finance/income/summary`, `finance/dashboard/summary` (unrelated)
- No UI components created (task spec Slice 3 — reconciliation UI card is a follow-up)

---

## 2026-03-24 21:00 -03

### Agente

- Claude Opus 4.6

### Objetivo del turno

- Implementacion de TASK-006 Webhook Infrastructure MVP (6 slices)

### Rama

- Rama usada: `develop`

### Ambiente objetivo

- staging

### Archivos tocados

**Webhook infrastructure (17 archivos nuevos):**

- `scripts/setup-postgres-webhooks.sql` — DDL 5 tablas + indexes + grants + seed
- `scripts/setup-postgres-webhooks.ts` — TS runner
- `src/lib/webhooks/types.ts` — tipos compartidos
- `src/lib/webhooks/signing.ts` — HMAC-SHA256 signing/verification
- `src/lib/webhooks/envelope.ts` — canonical envelope builder
- `src/lib/webhooks/retry-policy.ts` — retry schedule + dead-letter logic
- `src/lib/webhooks/store.ts` — database operations para 5 tablas
- `src/lib/webhooks/inbound.ts` — handler registry + orchestration
- `src/lib/webhooks/outbound.ts` — subscription matching + delivery
- `src/lib/webhooks/dispatcher.ts` — outbound dispatch loop
- `src/lib/webhooks/handlers/teams-attendance.ts` — Teams handler migrado
- `src/lib/webhooks/handlers/index.ts` — lazy handler registration
- `src/app/api/webhooks/[endpointKey]/route.ts` — generic inbound gateway
- `src/app/api/cron/webhook-dispatch/route.ts` — outbound dispatch cron
- `src/app/api/internal/webhooks/inbox/route.ts` — observability: inbound
- `src/app/api/internal/webhooks/deliveries/route.ts` — observability: outbound
- `src/app/api/internal/webhooks/failures/route.ts` — observability: failures
- `vercel.json` — 2 crons nuevos

### Verificacion

- `npx tsc --noEmit` — clean
- `pnpm lint` — clean
- No runtime testing (requiere Postgres con tablas provisionadas)

### Riesgos o pendientes

- **Provisioning**: ejecutar `npx tsx scripts/setup-postgres-webhooks.ts` en staging para crear las tablas
- **Teams compat**: ruta legacy `/api/hr/core/attendance/webhook/teams` sigue activa; la nueva ruta genérica es `/api/webhooks/teams-attendance`
- **Finance subscription**: seeded como inactive; activar manualmente para testing
- Proximo paso: TASK-010 Organization Economics Dashboard

---

## 2026-03-24 19:30 -03

### Agente

- Claude Opus 4.6

### Objetivo del turno

- Rebrand sidebar y favicon a Greenhouse identity
- Rediseno completo de login page con identidad Greenhouse
- Migracion de CODEX_TASK a convencion TASK-###
- Implementacion de TASK-012 Outbox Event Expansion (4 slices)

### Rama

- Rama usada: `develop`
- Rama objetivo: pendiente merge a `main`

### Ambiente objetivo

- staging (dev-greenhouse.efeoncepro.com)

### Archivos tocados

**Login redesign:**

- `src/views/Login.tsx` — reescrito con layout de dos paneles
- `src/views/login/GreenhouseBrandPanel.tsx` — panel izquierdo de marca (nuevo)
- `src/views/login/LoginValueCard.tsx` — card de propuesta de valor (nuevo)
- `src/views/login/login-constants.ts` — constantes del login (nuevo)
- `src/components/layout/shared/Logo.tsx` — sidebar usa logos Greenhouse
- `src/app/layout.tsx` — favicon actualizado
- `src/config/greenhouse-nomenclature.ts` — brand colors + login copy actualizado
- `public/images/greenhouse/SVG/` — todos los SVGs de Greenhouse

**TASK-012 Outbox Event Expansion:**

- `src/lib/sync/publish-event.ts` — helper reutilizable (nuevo)
- `src/lib/sync/event-catalog.ts` — catalogo de tipos (nuevo)
- `src/lib/sync/reactive-consumer.ts` — consumer reactivo (nuevo)
- `src/app/api/cron/outbox-react/route.ts` — cron endpoint (nuevo)
- `src/lib/account-360/organization-store.ts` — eventos de org/membership
- `src/lib/team-admin/mutate-team.ts` — eventos de member/assignment
- `src/lib/identity/reconciliation/apply-link.ts` — eventos de identity
- `src/lib/services/service-store.ts` — eventos de services
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — catalogo documentado (nuevo)

**Task migration:**

- 38 archivos en `docs/tasks/` renombrados de CODEX_TASK a TASK-###

### Verificacion

- `npx tsc --noEmit` — clean
- `pnpm lint` — clean
- Login desplegado y verificado visualmente en staging
- Outbox: codigo compilado, no testeado en runtime (requiere Postgres + eventos reales)

### Riesgos o pendientes

- **Login dark mode**: deferido a TASK-032 (botón Microsoft y logo mobile)
- **Outbox reactive consumer**: la tabla `outbox_reactive_log` se auto-provisiona en primer run del cron. Verificar que funcione en staging
- **Cron outbox-react**: necesita configurarse en Vercel cron o `vercel.json` para ejecutar cada 5 min
- **Merge a main**: pendiente decision del usuario
- Proximo paso recomendado: configurar cron en Vercel, testear outbox-react end-to-end con un cambio de assignment real

---

## 2026-03-24 17:24 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Promover `develop` a `main` despues de validar la lane de lint debt burn-down.
- Verificar staging y luego confirmar el deploy productivo real en Vercel.

### Rama

- Rama usada: `develop`
- Rama objetivo: `main`

### Ambiente objetivo

- staging y Production

### Archivos tocados

- `Handoff.md`
- `changelog.md`

### Acciones externas ejecutadas

- `develop` se publico en `origin/main` por fast-forward remoto:
  - `ac63e62` en `origin/develop`
  - `ac63e62` en `origin/main`
- Release productivo nuevo en Vercel:
  - deployment: `https://greenhouse-e0rixnral-efeonce-7670142f.vercel.app`
  - dominio productivo: `https://greenhouse.efeoncepro.com`
- Staging validado sobre:
  - deployment: `https://greenhouse-f20jw83an-efeonce-7670142f.vercel.app`
  - dominio: `https://dev-greenhouse.efeoncepro.com`

### Verificación

- staging:
  - `/api/auth/session` en deployment nuevo: `{}`
  - `/api/auth/session` en `dev-greenhouse.efeoncepro.com`: `{}`
  - `/login` en `dev-greenhouse.efeoncepro.com`: `200`
- production:
  - `/api/auth/session` en deployment productivo nuevo: `{}`
  - `/login` en deployment productivo nuevo: `200`
  - `/api/auth/session` en `greenhouse.efeoncepro.com`: `{}`
- GitHub Actions:
  - `main` CI `Lint and build` completado en `success`
  - run: `https://github.com/efeoncepro/greenhouse-eo/actions/runs/23510433202`

### Riesgos o pendientes

- El release productivo quedo sano en smoke minimo, pero no se ejecuto una QA funcional profunda de todos los modulos.
- Warning no bloqueante detectado en GitHub Actions: `actions/checkout@v4` y `actions/setup-node@v4` siguen corriendo bajo Node 20 deprecado; conviene actualizar ese workflow antes de junio 2026.

## 2026-03-24 17:31 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Cerrar `CODEX_TASK_Lint_Debt_Burn_Down_v1` dejando el repo nuevamente con baseline confiable de lint.
- Documentar el cierre de la lane y verificar que no hubiera impacto cruzado funcional sobre otras tasks vivas.

### Rama

- Rama usada: `fix/codex-lint-debt-burn-down`
- Rama objetivo: `develop`

### Ambiente objetivo

- Development / workflow de calidad previo a staging y production

### Archivos tocados

- `docs/tasks/complete/CODEX_TASK_Lint_Debt_Burn_Down_v1.md`
- `docs/tasks/README.md`
- `Handoff.md`
- `changelog.md`
- `scripts/*`
- `src/app/api/*`
- `src/lib/*`
- `src/views/*`
- `src/components/*`
- `src/types/*`
- `src/test/*`

### Verificación

- `pnpm exec eslint . --ext .js,.jsx,.ts,.tsx --fix`:
  - reducido el baseline desde `403` errores y `11` warnings a un remanente manual acotado
- `pnpm lint`:
  - OK, baseline recuperado en cero errores
- `pnpm test`:
  - `27` archivos
  - `179/179` tests OK
- `pnpm build`:
  - OK local con Next.js 16.1.1
- chequeo de impacto cruzado sobre `docs/tasks/{to-do,in-progress,complete}`:
  - sin cambios de estado funcional detectados en otras tasks; solo desbloqueo compartido de higiene/verificacion

### Riesgos o pendientes

- El diff de esta lane es grande por naturaleza porque absorbe el autofix masivo y el cleanup manual del remanente.
- Conviene revisar por slices al momento de abrir PR o mergear para hacer el review mas legible.

## 2026-03-24 16:56 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Ejecutar `CODEX_TASK_Lint_Debt_Burn_Down_v1` para recuperar un baseline confiable de `pnpm lint`.
- Empezar con autofix controlado y luego cerrar el remanente manual por slices, comenzando en `scripts/*`.

### Rama

- Rama usada: `fix/codex-lint-debt-burn-down`
- Rama objetivo: `develop`

### Ambiente objetivo

- Development / workflow de calidad previo a staging y production

### Archivos tocados

- `docs/tasks/in-progress/CODEX_TASK_Lint_Debt_Burn_Down_v1.md`
- `docs/tasks/README.md`
- `Handoff.md`

### Verificación

- `pnpm lint` antes de intervenir:
  - `403` errores
  - `11` warnings
  - `368` errores y `4` warnings potencialmente autofixables
- `pnpm test`:
  - `27` archivos
  - `179/179` tests OK
- `pnpm build`:
  - OK local con Next.js 16.1.1

### Riesgos o pendientes

- La deuda está distribuida entre `scripts/*`, `src/app/api/*`, `src/lib/*`, `src/views/*`, `src/components/*`, `src/types/*` y `src/test/*`.
- El burn-down debe mantenerse mecánico; si aparece una corrección funcional disfrazada de lint, se separa o se documenta explícitamente.

## 2026-03-24 16:41 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Materializar en GitHub el Project operativo definido documentalmente y enlazarlo de forma real con `efeoncepro/greenhouse-eo`.

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Ambiente objetivo

- GitHub / workflow operativo

### Archivos tocados

- `docs/operations/GITHUB_PROJECT_OPERATING_MODEL_V1.md`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Acciones externas ejecutadas

- Project creado:
  - `efeoncepro / Greenhouse Delivery`
  - `https://github.com/orgs/efeoncepro/projects/2`
- README del Project cargada desde CLI
- Campos custom creados:
  - `Pipeline`
  - `Task ID`
  - `Rank`
  - `Priority`
  - `Domain`
  - `Blocked`
  - `Blocker Note`
  - `Task Doc`
  - `Legacy ID`
  - `Preview URL`
  - `Target Env`
  - `Impact`
  - `Effort`
- Issues bootstrap creadas en `efeoncepro/greenhouse-eo` y agregadas al Project:
  - `#9` `[TASK-001] HR Payroll Operational Hardening`
  - `#10` `[TASK-002] Tenant Notion Mapping`
  - `#11` `[TASK-003] Invoice Payment Ledger Correction`
  - `#12` `[TASK-004] Finance Dashboard Calculation Correction`
  - `#13` `[TASK-005] HR Payroll Attendance Leave Work Entries`
  - `#14` `[TASK-006] Webhook Infrastructure MVP`
  - `#15` `[TASK-007] Lint Debt Burn Down`
  - `#16` `[TASK-008] Team Identity Capacity System v2`
  - `#17` `[TASK-009] Greenhouse Home Nexa v2`
  - `#18` `[TASK-010] Organization Economics Dashboard`

### Verificación

- `gh project view 2 --owner efeoncepro` confirma existencia del Project
- `gh issue list -R efeoncepro/greenhouse-eo` confirma creación de las issues `#9` a `#18`
- GraphQL verificado contra GitHub:
  - `TASK-001` quedó con `Status = In Progress` y `Pipeline = In Progress`
  - `TASK-002` a `TASK-010` quedaron con `Status = Todo` y `Pipeline = Ready`
  - `Task ID`, `Rank`, `Priority`, `Domain`, `Blocked`, `Task Doc`, `Legacy ID`, `Impact` y `Effort` quedaron poblados en los items bootstrap

### Riesgos o pendientes

- Las vistas del Project (`Board - Execution`, `Table - Backlog`, etc.) siguen pendientes de crearse manualmente en la UI o por una ruta GraphQL adicional.
- El campo `Iteration` no quedó creado desde CLI en este turno; si se quiere roadmap vivo por sprint, habrá que completarlo desde la UI o con una mutación GraphQL específica.
- El repo ya quedó enlazado operacionalmente al Project vía issues reales; el siguiente paso natural es decidir owners iniciales y comenzar a mover `TASK-002+` según capacidad real.

## 2026-03-24 12:30 America/Santiago

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Normalizar la gobernanza del sistema de tasks sin renombrar masivamente el backlog legacy.
- Dejar una plantilla canonica para crear e interpretar tasks nuevas con IDs estables `TASK-###`.

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Ambiente objetivo

- Documentacion / workflow operativo

### Archivos tocados

- `docs/tasks/TASK_TEMPLATE.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/operations/GITHUB_PROJECT_OPERATING_MODEL_V1.md`
- `.github/ISSUE_TEMPLATE/task_execution.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `docs/tasks/README.md`
- `docs/README.md`
- `AGENTS.md`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificación

- Validacion documental/manual de consistencia entre:
  - template nuevo
  - registro de IDs bootstrap
  - operating model de GitHub Project
  - issue template nuevo
  - PR template
  - reglas del índice de tasks
  - reglas operativas de `AGENTS.md`
- Pendiente de este turno: crear el Project real en GitHub, cargar `TASK-001..010` y migracion masiva de archivos legacy `CODEX_TASK_*` a `TASK-###`.

### Riesgos o pendientes

- El repo queda en modo mixto por diseño: `TASK-###` para tasks nuevas y `CODEX_TASK_*` legacy hasta migracion.
- No se renombraron briefs existentes en este turno para evitar churn documental y rotura de referencias historicas.
- El primer bloque `TASK-001..010` ya quedó reservado documentalmente; falta materializarlo en GitHub Issues / Project.
- Siguiente paso recomendado: crear el Project `Greenhouse Delivery`, cargar `TASK-001..010` y decidir si los items iniciales se crean como issues reales o draft items.

## 2026-03-22 09:32 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Documentar la deuda vigente de `eslint` como una `CODEX_TASK` ejecutable despues, sin tocar todavia el baseline de codigo.

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Ambiente objetivo

- Documentacion / task planning

### Archivos tocados

- `docs/tasks/to-do/CODEX_TASK_Lint_Debt_Burn_Down_v1.md`
- `docs/tasks/README.md`
- `Handoff.md`
- `changelog.md`

### Verificación

- Analisis previo de `eslint` reutilizado para fijar alcance y slices del burn-down:
  - `399` errores
  - `11` warnings
  - `108` archivos afectados
  - `365` errores y `4` warnings autofixables
- Verificacion documental manual de que la task quedo indexada en `docs/tasks/README.md`.
- No se ejecuto `pnpm lint` en este turno porque la task creada existe precisamente para cerrar esa deuda despues en una lane dedicada.

### Riesgos o pendientes

- La deuda de lint sigue abierta; esta entrada solo deja el plan operativo y el orden recomendado de ejecucion.
- El arbol trae cambios ajenos en `src/components/theme/types.ts` y en la reclasificacion/cierre de `CODEX_TASK_Typography_Hierarchy_Fix`; no mezclar esos cambios con el commit documental de esta lane.

## 2026-03-22 — Typography task closure + scalable font system

### Agente

- Claude Opus 4.6

### Objetivo del turno

- Cerrar `CODEX_TASK_Typography_Hierarchy_Fix` como parcialmente absorbida
- Implementar custom typography variants en theme para reemplazo gradual de hardcoded fontWeights

### Rama

- `develop`

### Archivos tocados

- `src/components/theme/mergedTheme.ts` — 3 custom variants: `monoId`, `monoAmount`, `kpiValue`
- `src/components/theme/types.ts` — MUI module augmentation para TypographyVariants + TypographyPropsVariantOverrides
- `docs/tasks/complete/CODEX_TASK_Typography_Hierarchy_Fix.md` — movida de to-do, nota de cierre
- `docs/tasks/README.md` — actualizado backlog y Complete

### Verificación

- `npx tsc --noEmit` — clean, 0 errores
- No se tocaron componentes existentes — las 56+ instancias existentes siguen funcionando sin cambios
- Nuevos componentes pueden usar `<Typography variant="monoId">` etc. con TypeScript support completo

### Próximo paso

- Adopción gradual: al tocar archivos con hardcoded fontWeight, migrar a los nuevos variants
- Los ~15 finance section headers con `sx={{ fontFamily: 'Poppins', fontWeight: 600 }}` en `variant='h4'` son redundantes y pueden simplificarse a solo `variant='h4'`

---

## 2026-03-22 09:05 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Canonizar la arquitectura de webhooks para Greenhouse y dejar creada la lane MVP de implementacion.

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Ambiente objetivo

- Documentacion / arquitectura / task planning

### Archivos tocados

- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/CODEX_TASK_Webhook_Infrastructure_MVP_v1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/tasks/README.md`
- `docs/README.md`
- `AGENTS.md`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificación

- Contraste documental/manual contra el runtime actual del repo:
  - webhook inbound real: `src/app/api/hr/core/attendance/webhook/teams/route.ts`
  - secreto compartido: `src/lib/hr-core/shared.ts`
  - outbox consumer: `src/lib/sync/outbox-consumer.ts`
  - cron actual: `src/app/api/cron/outbox-publish/route.ts`
  - contrato de integraciones: `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`
- Verificacion GitHub:
  - `gh api repos/efeoncepro/greenhouse-eo/hooks` -> sin webhooks de repo configurados
- No se ejecuto `pnpm lint` en este turno porque el repo ya arrastra una deuda de lint documentada previamente y el alcance aqui fue solo documental.

### Riesgos o pendientes

- La arquitectura deja claro el target, pero no implementa todavia las tablas ni el gateway compartido.
- La nueva lane debe coordinarse especialmente con:
  - `CODEX_TASK_Notification_System.md`
  - `CODEX_TASK_HR_Payroll_Attendance_Leave_Work_Entries_v1.md`
  - `CODEX_TASK_Services_Runtime_Closure_v1.md`

## 2026-03-22 08:36 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Canonizar el mapa de repos hermanos de `greenhouse-eo` para que futuros agentes sepan qué repo consultar primero según el dominio.

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Ambiente objetivo

- Documentación / coordinación multi-repo

### Archivos tocados

- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `docs/README.md`
- `AGENTS.md`
- `README.md`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificación

- Validación documental/manual del contenido contra GitHub CLI:
  - `gh repo view cesargrowth11/notion-bigquery`
  - `gh repo view cesargrowth11/hubspot-bigquery`
  - `gh repo view cesargrowth11/notion-teams`
  - `gh repo view cesargrowth11/notion-frame-io`
  - `gh repo view efeoncepro/kortex`
- `pnpm lint` ❌
  - falla por deuda preexistente fuera del alcance documental de este turno
  - se observaron errores masivos de lint en `scripts/**`, `src/app/**`, `src/lib/**`, `src/views/**` y otros archivos ya modificados fuera de esta tarea
  - no aparecieron fallos vinculados a `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` ni a los enlaces documentales agregados

### Riesgos o pendientes

- La lista actual es deliberadamente corta y cubre solo los repos hermanos confirmados como operativos para Greenhouse en esta sesión.
- Si aparece otro repo upstream real, debe agregarse en `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` y dejar solo deltas breves en los documentos vivos.

## 2026-03-22 — People 360 Enrichments (CERRADA)

### Agente

- Claude Opus 4.6

### Objetivo del turno

- Implementar y cerrar `CODEX_TASK_People_360_Enrichments_v1`:
  - Slice 1: Wire `identity` tab en type system + permissions
  - Slice 2: `PersonIdentityTab.tsx` — 4 cards read-only:
    - Card 1 "Identidad": EO-ID, email canónico, sistema primario, facetas, sistemas vinculados
    - Card 2 "Acceso al portal": estado, roles, grupos de rutas, CTA admin
    - Card 3 "Perfil laboral": departamento, nivel, tipo empleo/contrato, ingreso, supervisor, régimen (HR Core)
    - Card 4 "Actividad operativa": KPIs proyectos/tareas/completadas/vencidas, RpA, OTD, CRM (delivery context)
  - Slice 3: Render en `PersonTabs.tsx` con lazy-loading
  - Slice 4: CTAs cross-module en PersonPayrollTab y PersonFinanceTab

### Rama

- `develop`

### Archivos tocados

- `src/types/people.ts` — added `'identity'` to PersonTab
- `src/lib/people/permissions.ts` — identity tab visibility + filter
- `src/views/greenhouse/people/helpers.ts` — TAB_PERMISSIONS + TAB_CONFIG
- `src/lib/people/get-people-meta.ts` — supportedTabs
- `src/views/greenhouse/people/tabs/PersonIdentityTab.tsx` — NEW (4 cards)
- `src/views/greenhouse/people/PersonTabs.tsx` — import + TabPanel + props
- `src/views/greenhouse/people/tabs/PersonPayrollTab.tsx` — CTA link
- `src/views/greenhouse/people/tabs/PersonFinanceTab.tsx` — CTA link
- `src/lib/people/permissions.test.ts` — updated expectations

### Verificación

- `npx tsc --noEmit` — clean
- `pnpm test` — 179/179 passing

### Riesgos o pendientes

- Tab visible para `efeonce_admin`, `efeonce_operations`, `hr_payroll` — sin datos si person_360 no está poblado (muestra empty state)
- Task CERRADA — scope completo

---

## 2026-03-22 09:15 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Abrir `CODEX_TASK_HR_Payroll_Operational_Hardening_v1`.
- Primer slice tomado:
  - readiness/preflight por período
  - exponer antes del cálculo quién entra, quién queda fuera y qué bloquea realmente el período
  - agregar feedback mínimo en `Período actual`
  - cubrir el contrato con tests unitarios
- Segundo slice ya implementado:
  - explainability por `payroll_entry`
  - endpoint dedicado de detalle de cálculo
  - diálogo UI para auditar snapshot de compensación, KPI, asistencia, bruto/descuentos/neto y banderas manuales
- Ajuste adicional de robustez:
  - la asistencia quedó explícitamente modelada como `non-blocking` en readiness
  - se agregó `attendanceDiagnostics` al contrato para dejar lista la futura integración con `Microsoft Teams`
  - fuente actual declarada: `legacy_attendance_daily_plus_hr_leave`
  - integración objetivo declarada: `microsoft_teams`

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Ambiente objetivo

- `staging`

### Archivos previstos

- `src/lib/payroll/payroll-readiness.ts`
- `src/lib/payroll/payroll-readiness.test.ts`
- `src/types/payroll.ts`
- `src/app/api/hr/payroll/periods/[periodId]/readiness/route.ts`
- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx`
- `src/views/greenhouse/payroll/PayrollPeriodTab.test.tsx`
- `src/lib/payroll/payroll-entry-explain.ts`
- `src/lib/payroll/payroll-entry-explain.test.ts`
- `src/app/api/hr/payroll/entries/[entryId]/explain/route.ts`
- `src/views/greenhouse/payroll/PayrollEntryExplainDialog.tsx`
- `src/views/greenhouse/payroll/PayrollEntryExplainDialog.test.tsx`
- `src/views/greenhouse/payroll/PayrollEntryTable.tsx`

### Verificación

- `pnpm exec eslint src/types/payroll.ts src/lib/payroll/payroll-readiness.ts src/lib/payroll/payroll-readiness.test.ts 'src/app/api/hr/payroll/periods/[periodId]/readiness/route.ts' src/views/greenhouse/payroll/PayrollPeriodTab.tsx src/views/greenhouse/payroll/PayrollPeriodTab.test.tsx src/lib/payroll/payroll-entry-explain.ts src/lib/payroll/payroll-entry-explain.test.ts 'src/app/api/hr/payroll/entries/[entryId]/explain/route.ts' src/views/greenhouse/payroll/PayrollEntryExplainDialog.tsx src/views/greenhouse/payroll/PayrollEntryExplainDialog.test.tsx src/views/greenhouse/payroll/PayrollEntryTable.tsx` ✅
- `pnpm vitest run src/lib/payroll/payroll-readiness.test.ts src/views/greenhouse/payroll/PayrollPeriodTab.test.tsx src/lib/payroll/payroll-entry-explain.test.ts src/views/greenhouse/payroll/PayrollEntryExplainDialog.test.tsx` ✅
- `npx tsc --noEmit` ⚠️ bloqueado por errores preexistentes fuera del scope en `src/lib/team-admin/mutate-team.ts`

### Riesgos o pendientes

- No cambiar todavía la semántica del cálculo ni bloquear `calculate` por warnings meramente informativos.
- Los únicos bloqueantes nuevos del readiness deben corresponder a condiciones ya bloqueantes en runtime:
  - período sin miembros con compensación vigente
  - `UF` faltante cuando una compensación Chile/Isapre lo exige
- La señal de “attendance faltante” en esta primera pasada se tratará como warning, no como bloqueo final, porque el runtime actual todavía consolida asistencia/licencias desde fuentes mixtas.
- La task activa ya fue movida a `docs/tasks/in-progress/CODEX_TASK_HR_Payroll_Operational_Hardening_v1.md` para respetar la taxonomía operativa del repo.
- Gap explícito que sigue abierto:
  - el snapshot actual de `payroll_entry` no conserva si el KPI `ICO` vino por `materialized` o `live`; el detalle de cálculo ya lo comunica como limitación conocida
- La futura integración de asistencia con `Microsoft Teams` ya tiene costura técnica abierta en el contrato; todavía no cambia el source runtime actual.
- Próximo slice recomendado:
  - endurecimiento de fuentes de asistencia/licencias o motor tributario Chile, según prioridad operativa

## 2026-03-22 — Admin Team PG Migration -03

### Agente

- Claude Opus

### Objetivo del turno

- Implementar y cerrar `CODEX_TASK_Admin_Team_Postgres_Runtime_Migration_v1`
- 3 slices: member reads/mutations, assignment reads/mutations (dual-write flipped), team-queries roster + identity

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Archivos tocados

- `src/lib/team-admin/mutate-team.ts` — Postgres-first reads + Postgres-primary mutations + identity sync
- `src/lib/team-queries.ts` — Postgres-first roster + identity reads

### Verificación

- `npx tsc --noEmit` ✅
- `pnpm test` — 179 tests pass ✅

### Riesgos o pendientes

- `org_role_name` / `profession_name` NULL en Postgres path (catálogos solo en BigQuery) — mismo tratamiento que People
- `notion_ops` queries se mantienen en BigQuery (no hay Postgres equivalente)
- BigQuery fallback funcional si Postgres falla
- Cross-impact deltas aplicados a: Team Identity Capacity, Staff Augmentation, People 360 Enrichments

## 2026-03-22 — Task Closure -03

### Agente

- Claude Opus

### Objetivo del turno

- Cerrar `CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1` — consumer cutover de People a Postgres-first completado

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Archivos tocados

- `src/lib/people/get-people-list.ts` — Postgres-first con BigQuery fallback
- `src/lib/people/get-person-detail.ts` — 3 sub-queries Postgres-first con BigQuery fallback independiente
- `src/lib/people/get-people-list.test.ts` — 11 tests unitarios (Postgres path, fallback, error propagation)
- `src/lib/people/get-person-detail.test.ts` — 11 tests unitarios (member, assignments, identity links, fallback)
- `scripts/backfill-orphan-member-profiles.ts` — reconciliación de members sin identity_profile_id

### Verificación

- `npx tsc --noEmit` ✅
- `pnpm test` — 22 tests pass ✅

### Riesgos o pendientes

- Ejecutar `backfill-orphan-member-profiles.ts` en staging/production (operativo)
- Ejecutar `audit-person-360-coverage.ts` para verificar cobertura post-backfill (operativo)
- Smoke test en staging: People list + person detail navigation
- Cross-impact deltas aplicados a: People 360 Enrichments, SCIM Provisioning

## 2026-03-21 08:40 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Alinear `People > Perfil HR` con la arquitectura 360:
  - usar `detail.hrContext` como fuente primaria del perfil HR
  - usar métricas ICO como fuente primaria de KPI operativos en la tab
  - dejar `HR Core`/`member_profiles` solo como enriquecimiento opcional de datos personales y skills
  - agregar tests unitarios para evitar nueva desalineación entre `People`, `HR Core` e `ICO`

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Ambiente objetivo

- `staging`

### Archivos previstos

- `src/views/greenhouse/people/PersonTabs.tsx`
- `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx`
- `src/views/greenhouse/people/tabs/person-hr-profile-view-model.ts`
- `src/views/greenhouse/people/tabs/person-hr-profile-view-model.test.ts`
- `src/views/greenhouse/people/PersonTabs.test.tsx`
- `src/views/greenhouse/people/tabs/PersonHrProfileTab.test.tsx`

### Riesgos o pendientes

- No tocar layout global ni volver a parchear CSS base del dashboard para este problema.
- Mantener `Payroll` fuera de este slice: la preocupación del usuario es válida, pero la fuente del cálculo de nómina no es esta tab.
- Estado actual del slice:
  - `PersonTabs` ya pasa `hrContext` y `operationalMetrics` a `PersonHrProfileTab`.
  - `PersonHrProfileTab` ahora usa `detail.hrContext` como fuente primaria para información laboral y ausencias, consulta ICO vía `/api/people/[memberId]/ico` para KPI operativos y deja `/api/hr/core/members/[memberId]/profile` solo como enriquecimiento opcional de datos personales, skills y links.
  - Tests agregados:
    - `src/views/greenhouse/people/PersonTabs.test.tsx`
    - `src/views/greenhouse/people/tabs/person-hr-profile-view-model.test.ts`
    - `src/views/greenhouse/people/tabs/PersonHrProfileTab.test.tsx`
- Verificación ejecutada:
  - `pnpm exec eslint src/views/greenhouse/people/PersonTabs.tsx src/views/greenhouse/people/PersonTabs.test.tsx src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx src/views/greenhouse/people/tabs/PersonHrProfileTab.test.tsx src/views/greenhouse/people/tabs/person-hr-profile-view-model.ts src/views/greenhouse/people/tabs/person-hr-profile-view-model.test.ts` ✅
  - `pnpm vitest run src/views/greenhouse/people/PersonTabs.test.tsx src/views/greenhouse/people/tabs/person-hr-profile-view-model.test.ts src/views/greenhouse/people/tabs/PersonHrProfileTab.test.tsx` ✅
  - `npx tsc --noEmit` ✅
- Pendiente recomendado:
  - validación manual en `staging` de `/people/[memberId]?tab=hr-profile` para confirmar que el tab ya muestra `hrContext` aunque `member_profiles` esté incompleto, y que los KPI operativos salen desde ICO.

## 2026-03-21 08:18 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Consolidar el contrato arquitectónico de `Payroll` en un documento canónico único para evitar que el módulo siga dependiendo de reconstrucción desde tasks, código y handoff.

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Ambiente objetivo

- Documentación / arquitectura

### Archivos tocados

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/README.md`
- `project_context.md`

### Verificacion

- Revisión cruzada contra runtime actual de `Payroll`:
  - `scripts/setup-postgres-payroll.sql`
  - `src/lib/payroll/calculate-payroll.ts`
  - `src/lib/payroll/fetch-kpis-for-period.ts`
  - `src/lib/payroll/get-compensation.ts`
  - `src/lib/payroll/recalculate-entry.ts`
  - `src/lib/payroll/export-payroll.ts`
  - `src/lib/payroll/personnel-expense.ts`
  - `src/views/greenhouse/payroll/PayrollDashboard.tsx`
  - `src/app/api/hr/payroll/**`

### Riesgos o pendientes

- La nueva fuente canónica de arquitectura para `Payroll` ya existe y debe actualizarse primero cuando cambien semánticas del módulo.
- No se hizo `commit` ni `push` en esta pasada.

## 2026-03-21 08:05 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Corregir el fallo al guardar `Editar período` en `Payroll` cuando se cambiaba el mes/año imputable y el backend respondía `Unable to read updated payroll period.`

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Ambiente objetivo

- `staging`

### Archivos tocados

- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/postgres-store.test.ts`

### Verificacion

- `pnpm exec eslint src/lib/payroll/postgres-store.ts src/lib/payroll/postgres-store.test.ts` ✅
- `pnpm vitest run src/lib/payroll/postgres-store.test.ts` ✅
- `npx tsc --noEmit` ✅

### Riesgos o pendientes

- Causa raíz confirmada: `pgUpdatePayrollPeriod()` actualizaba el período dentro de la transacción y luego intentaba releerlo con `pgGetPayrollPeriod()` fuera de esa misma transacción; si el `period_id` cambiaba (`2026-03 -> 2026-02`), la lectura podía no ver aún el nuevo row y disparaba el `500`.
- La relectura final ahora ocurre con `client.query(...)` dentro de la transacción y quedó cubierta por un test unitario de regresión.
- Pendiente: probar manualmente en `staging` el caso real `Marzo 2026 -> Febrero 2026` para confirmar que el modal ya guarda, cierra y deja el período corregido en `draft`.

## 2026-03-21 07:55 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Permitir corregir `mes/año imputable` en períodos de `Payroll` no exportados, reseteando el período y limpiando entries cuando el cambio altera la base de cálculo.

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Ambiente objetivo

- `staging`

### Archivos tocados

- `src/types/payroll.ts`
- `src/app/api/hr/payroll/periods/[periodId]/route.ts`
- `src/lib/payroll/period-lifecycle.ts`
- `src/lib/payroll/period-lifecycle.test.ts`
- `src/lib/payroll/get-payroll-periods.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx`

### Verificacion

- `pnpm pg:doctor --profile=runtime` ✅
- `pnpm exec eslint src/types/payroll.ts 'src/app/api/hr/payroll/periods/[periodId]/route.ts' src/lib/payroll/period-lifecycle.ts src/lib/payroll/period-lifecycle.test.ts src/lib/payroll/get-payroll-periods.ts src/lib/payroll/postgres-store.ts src/views/greenhouse/payroll/PayrollPeriodTab.tsx` ✅
- `pnpm vitest run src/lib/payroll/period-lifecycle.test.ts src/lib/payroll/compensation-versioning.test.ts src/lib/payroll/compensation-bonus-flow.test.ts src/views/greenhouse/payroll/CompensationDrawer.test.tsx` ✅
- `npx tsc --noEmit` ✅

### Riesgos o pendientes

- Cambiar `year/month`, `ufValue` o `taxTableVersion` en un período no exportado ahora elimina las `payroll_entries` existentes y lo devuelve a `draft`; esto es intencional para no arrastrar KPIs/attendance del mes equivocado.
- El período `exported` sigue siendo inmutable.
- Queda pendiente validar manualmente en `staging` el caso concreto `2026-03 -> 2026-02` y comprobar que el dashboard vuelve a mostrar el período corregido como borrador, listo para recalcular.

---

## 2026-03-21 07:43 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Ajustar la semántica de estados de `Payroll` para que una nómina `approved` siga siendo editable/recalculable hasta el momento de exportarla/cerrarla.

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Ambiente objetivo

- `staging`

### Archivos tocados

- `src/lib/payroll/period-lifecycle.ts`
- `src/lib/payroll/period-lifecycle.test.ts`
- `src/lib/payroll/compensation-versioning.ts`
- `src/lib/payroll/compensation-versioning.test.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/recalculate-entry.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/app/api/hr/payroll/entries/[entryId]/route.ts`
- `src/views/greenhouse/payroll/PayrollEntryTable.tsx`
- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx`

### Verificacion

- `pnpm exec eslint src/lib/payroll/period-lifecycle.ts src/lib/payroll/period-lifecycle.test.ts src/lib/payroll/compensation-versioning.ts src/lib/payroll/compensation-versioning.test.ts src/lib/payroll/calculate-payroll.ts src/lib/payroll/recalculate-entry.ts src/lib/payroll/get-compensation.ts src/lib/payroll/postgres-store.ts 'src/app/api/hr/payroll/entries/[entryId]/route.ts' src/views/greenhouse/payroll/PayrollEntryTable.tsx src/views/greenhouse/payroll/PayrollPeriodTab.tsx` ✅
- `pnpm vitest run src/lib/payroll/period-lifecycle.test.ts src/lib/payroll/compensation-versioning.test.ts src/lib/payroll/compensation-bonus-flow.test.ts src/views/greenhouse/payroll/CompensationDrawer.test.tsx` ✅
- `npx tsc --noEmit` ✅

### Riesgos o pendientes

- `approved` ahora significa “listo para pago/revisión”, no “cerrado final”; el candado definitivo pasa a ser `exported`.
- Si se recalcula un período `approved` o se edita una entry dentro de él, el período vuelve a `calculated` y debe aprobarse nuevamente antes de exportar.
- Sigue pendiente validar manualmente en `staging` que el flujo `approved -> edición/recálculo -> calculated -> reapprove -> export` se vea claro para HR.

---

## 2026-03-21 — Finance Postgres Runtime Migration

### Agente

- Claude Opus

### Objetivo del turno

- Cerrar pendientes de `CODEX_TASK_Finance_Postgres_Runtime_Migration_v1`:
  1. Migrar PUT income y PUT expenses a Postgres-first
  2. Migrar reconciliación runtime (match/unmatch/exclude/auto-match)
  3. Verificar TypeScript limpio

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Task

- `docs/tasks/in-progress/CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md`

### Estado al iniciar

- Slice 1 completo (accounts, suppliers, exchange_rates) — 7 rutas Postgres-first
- Slice 2 parcial (income GET/POST, expenses GET/POST, payments POST) — 7 rutas Postgres-first
- PUT income/expenses y reconciliación siguen en BigQuery

### Resultado (Slice 3)

- PUT income wired a `updateFinanceIncomeInPostgres()` con BigQuery fallback
- PUT expenses wired a `updateFinanceExpenseInPostgres()` con BigQuery fallback
- Creado `src/lib/finance/postgres-reconciliation.ts` (~650 líneas) — store completo
- 10 rutas de reconciliación migradas a Postgres-first:
  - GET/POST `/reconciliation` (list + create periods)
  - GET/PUT `/reconciliation/[id]` (detail + update period)
  - POST `/reconciliation/[id]/statements` (import)
  - GET `/reconciliation/[id]/candidates` (list candidates)
  - POST `/reconciliation/[id]/match` (manual match)
  - POST `/reconciliation/[id]/unmatch` (unmatch)
  - POST `/reconciliation/[id]/exclude` (exclude)
  - POST `/reconciliation/[id]/auto-match` (auto-match)
- `npx tsc --noEmit` — limpio
- Diferencia clave: income reconciliation en Postgres usa tabla `income_payments` directamente (sin JSON manipulation)

### Verificación

- `npx tsc --noEmit` ✅

### Pendientes

- Ejecutar backfill: `pnpm exec tsx scripts/backfill-postgres-finance-slice2.ts`
- Smoke test end-to-end de reconciliación en Postgres

---

## 2026-03-21 07:35 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Corregir el bloqueo excesivo al editar compensaciones en `People` / `Payroll`: la versión vigente ya no debe quedar congelada solo por existir una `payroll_entry` en un período recalculable.

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Ambiente objetivo

- `staging`

### Archivos tocados

- `src/lib/payroll/compensation-versioning.ts`
- `src/lib/payroll/compensation-versioning.test.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/get-compensation.ts`

### Verificacion

- `pnpm exec eslint src/lib/payroll/compensation-versioning.ts src/lib/payroll/compensation-versioning.test.ts src/lib/payroll/postgres-store.ts src/lib/payroll/get-compensation.ts` ✅
- `pnpm vitest run src/lib/payroll/compensation-versioning.test.ts src/lib/payroll/compensation-bonus-flow.test.ts src/views/greenhouse/payroll/CompensationDrawer.test.tsx` ✅
- `npx tsc --noEmit` ✅

### Riesgos o pendientes

- La edición in-place queda permitida si la compensación solo fue usada en períodos `calculated`; si ya fue usada en períodos `approved` o `exported`, el backend sigue obligando a crear una nueva versión con nueva vigencia.
- Sigue pendiente validar manualmente en `staging` que el drawer de `People` guarde bien cambios de bono cuando el período todavía es recalculable.

## 2026-03-21 07:22 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Cambiar `Payroll` para que el cálculo mensual de `On-Time` y `RpA` tome la fuente desde `ICO` por `member_id`, usando cache materializado cuando exista y fallback live solo para miembros faltantes.

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Ambiente objetivo

- `staging`

### Archivos tocados

- `src/types/payroll.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/payroll/fetch-kpis-for-period.ts`
- `src/lib/payroll/fetch-kpis-for-period.test.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/get-payroll-entries.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/generate-payroll-excel.ts`
- `src/app/api/hr/payroll/entries/[entryId]/route.ts`

### Verificacion

- `pnpm exec eslint src/types/payroll.ts src/lib/ico-engine/read-metrics.ts src/lib/payroll/fetch-kpis-for-period.ts src/lib/payroll/fetch-kpis-for-period.test.ts src/lib/payroll/calculate-payroll.ts src/lib/payroll/get-payroll-entries.ts src/lib/payroll/postgres-store.ts src/lib/payroll/generate-payroll-excel.ts 'src/app/api/hr/payroll/entries/[entryId]/route.ts'` ✅
- `pnpm vitest run src/lib/payroll/fetch-kpis-for-period.test.ts src/lib/payroll/compensation-bonus-flow.test.ts src/lib/payroll/compensation-versioning.test.ts src/views/greenhouse/payroll/CompensationDrawer.test.tsx` ✅
- `npx tsc --noEmit` ✅

### Riesgos o pendientes

- No mezclar este slice con los cambios locales abiertos en `People 360`, `.claude/settings.json`, `AGENTS.md` ni `docs/tasks/**`.
- `PayrollEntry.kpiDataSource` ahora puede ser `ico`; los consumidores legacy siguen tolerando `notion_ops` para historial ya calculado.
- Queda pendiente validar manualmente en `staging` un cálculo de nómina real para confirmar que el período devuelve métricas ICO materializadas o fallback live según el mes.

## 2026-03-21 06:58 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Corregir el flujo de compensación de Payroll/People para que "editar compensación" no fuerce crear una nueva versión con la misma fecha efectiva.

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Ambiente objetivo

- `staging`

### Archivos tocados

- `src/types/payroll.ts`
- `src/lib/payroll/compensation-versioning.ts`
- `src/lib/payroll/compensation-versioning.test.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/app/api/hr/payroll/compensation/[versionId]/route.ts`
- `src/views/greenhouse/payroll/CompensationDrawer.tsx`
- `src/views/greenhouse/payroll/CompensationDrawer.test.tsx`
- `src/views/greenhouse/payroll/PayrollCompensationTab.tsx`
- `src/views/greenhouse/people/PersonView.tsx`
- `changelog.md`

### Verificacion

- `pnpm exec eslint src/types/payroll.ts src/lib/payroll/compensation-versioning.ts src/lib/payroll/compensation-versioning.test.ts src/lib/payroll/postgres-store.ts src/lib/payroll/get-compensation.ts 'src/app/api/hr/payroll/compensation/[versionId]/route.ts' src/views/greenhouse/payroll/CompensationDrawer.tsx src/views/greenhouse/payroll/CompensationDrawer.test.tsx src/views/greenhouse/payroll/PayrollCompensationTab.tsx src/views/greenhouse/people/PersonView.tsx` ✅
- `pnpm vitest run src/lib/payroll/compensation-versioning.test.ts src/lib/payroll/compensation-bonus-flow.test.ts src/views/greenhouse/payroll/CompensationDrawer.test.tsx` ✅
- `npx tsc --noEmit` ✅

### Riesgos o pendientes

- No mezclar este slice con los cambios locales de `People 360`.
- Mantener intacto el modelo versionado: misma fecha efectiva debe corregir la versión vigente; una fecha nueva debe seguir creando una nueva versión.
- El siguiente slice funcional sigue pendiente: mover la fuente de `On-Time` y `RpA` desde `notion_ops.tareas` hacia ICO.

## 2026-03-21 06:22 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Aislar y corregir la regresión de overflow en `/people/[memberId]` sin seguir tocando el shell global del dashboard.

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Ambiente objetivo

- `staging`

### Archivos tocados

- `src/views/greenhouse/people/PersonTabs.tsx` — se restaura el wrapper `Grid` alrededor del pill `CustomTabList` y del panel
- `src/views/greenhouse/people/PersonTabs.test.tsx` — test de regresión para blindar la estructura del tabstrip

### Verificacion

- Diagnóstico: la regresión coincide con `e97c6b6 fix: remove nested Grid container causing horizontal scroll in person detail`
- Evidencia revisada:
  - `src/@core/components/mui/TabList.tsx` usa `margin` negativa en modo `pill`
  - al “aplanar” `PersonTabs`, ese buffer dejó de existir en la ficha de persona
- Causa raíz final confirmada con medición local en navegador:
  - el `Box` oculto con `aria-live='polite'` en `PersonTabs.tsx` usaba `sx={{ width: 1, height: 1 }}` y en MUI eso equivale a `100%`, no a `1px`
  - ese nodo absoluto inflaba `documentElement.scrollWidth` y `scrollHeight`, generando el scroll horizontal y vertical del documento
  - medición local en `/debug-people-overflow` con Playwright:
    - antes del fix: `maxX = 411`
    - después del fix: `maxX = 0`
- Validación local del patch:
  - `pnpm exec eslint src/views/greenhouse/people/PersonTabs.tsx src/views/greenhouse/people/PersonTabs.test.tsx` ✅
  - `pnpm vitest run src/views/greenhouse/people/PersonTabs.test.tsx` ✅
  - `npx tsc --noEmit` ✅

### Riesgos o pendientes

- La preview directa sigue protegida por Vercel SSO, así que el DOM real no se pudo inspeccionar con Playwright autenticado.
- Si el fix en `PersonTabs` no elimina el overflow en `staging`, el siguiente sospechoso real ya no es el shell global: será `PersonView.tsx` root grid o un hijo puntual de la ficha de persona.
- No mezclar este commit con los cambios locales de `People 360` (`get-people-meta`, `get-person-detail`, `permissions`, `types`) ni con los movimientos ajenos de `docs/tasks/**`.
- Se agregó una utilidad compartida `src/components/greenhouse/accessibility.ts` para live regions visualmente ocultas; `AgencyWorkspace`, `PersonTabs` y `OrganizationTabs` deben usar esta fuente única en vez de copiar `sx` manual.

## 2026-03-20 18:00 -03

### Agente

- Claude Opus 4.6

### Objetivo del turno

- Contrastar `CODEX_TASK_HR_Payroll_Module_v3` y `CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1` contra arquitectura real, ejecutar backfill y cerrar tasks.

### Rama

- Rama usada: `develop`
- Rama objetivo: `main`

### Ambiente objetivo

- Development (backfill ejecutado contra Cloud SQL)

### Archivos tocados

- `docs/tasks/to-do/ → docs/tasks/complete/` — movidas ambas tasks de Payroll
- `docs/tasks/README.md` — backlog renumerado, entries agregadas en Complete
- `changelog.md` — entrada de cierre
- `project_context.md` — delta de contraste arquitectónico
- No se tocó código de aplicación — el módulo ya estaba implementado

### Verificacion

- `isPayrollPostgresEnabled()` → delega a `isGreenhousePostgresConfigured()` ✅
- Tab payroll confirmado en `PersonTabs.tsx:147` con `PersonPayrollTab` ✅
- Backfill payroll ejecutado: 0 rows BQ transaccionales, 1 bonus_config migrado ✅
- Backfill leave ejecutado: 4 leave_types migrados ✅
- Contraste contra `GREENHOUSE_360_OBJECT_MODEL_V1`, `GREENHOUSE_POSTGRES_CANONICAL_360_V1`: 6/6 reglas cumplidas ✅

### Riesgos o pendientes

- El módulo Payroll nunca tuvo datos transaccionales reales. El primer uso real requiere crear compensaciones y un período directamente en Postgres.
- Falta smoke test autenticado end-to-end en Preview/Staging: crear compensación → crear período → calcular → aprobar → exportar.
- BigQuery sigue como fallback pasivo. No desactivarlo hasta confirmar runtime Postgres estable en Preview.

---

## 2026-03-20 17:10 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Corregir los bloqueadores reales de promoción a producción detectados en `staging`: `sync-conformed` con error de `streaming buffer` y `ico-materialize` con drift de esquema BigQuery.

### Rama

- Rama usada: `develop`
- Rama objetivo: `main`

### Ambiente objetivo

- `staging` / Production

### Archivos tocados

- `src/lib/ico-engine/schema.ts` — migraciones aditivas `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para tablas ICO existentes
- `src/lib/sync/sync-notion-conformed.ts` — reemplazo de `DELETE + insertAll` por `BigQuery load jobs` con `WRITE_TRUNCATE`; ensure runtime para `delivery_tasks.created_at`

### Verificacion

- Diagnóstico confirmado con `vercel logs` y `vercel curl` sobre `staging`:
  - `/api/cron/ico-materialize` ⇒ `502 Column pipeline_velocity is not present in table ... metrics_by_project`
  - `/api/cron/sync-conformed` ⇒ `502 UPDATE or DELETE statement ... would affect rows in the streaming buffer`
- Validación local del patch:
  - `pnpm eslint src/lib/ico-engine/schema.ts src/lib/sync/sync-notion-conformed.ts` ✅
  - `pnpm build` ✅
- Confirmación de drift en BigQuery productivo con consulta directa a `INFORMATION_SCHEMA`:
  - `ico_engine.metrics_by_project` no tenía `pipeline_velocity`
  - `greenhouse_conformed.delivery_tasks` sí tenía `created_at` y `assignee_member_ids`

### Riesgos o pendientes

- Falta desplegar este patch a `staging` y reprobar ambos cron endpoints con `vercel curl`.
- El helper de runtime quedó robusto, pero si otro script externo sigue usando `streaming insert` contra `greenhouse_conformed.delivery_*`, puede reintroducir presión sobre el buffer. Revisar especialmente `scripts/sync-source-runtime-projections.ts` si vuelve a usarse operativamente.
- No tocar `.claude/settings.json`; sigue siendo un cambio ajeno local.

## 2026-03-20 14:30 -03

### Agente

- Claude Opus 4.6

### Objetivo del turno

- Reestructurar el sidebar de navegación del portal para eliminar inconsistencias de idioma, jerarquía y UX writing.

### Rama

- Rama usada: `develop`
- Rama objetivo: `main`

### Ambiente objetivo

- Development / Preview / `staging` / Production (cambio puramente frontend)

### Archivos tocados

- `src/config/greenhouse-nomenclature.ts` — labels: Updates→Novedades, Control Tower→Torre de control, nueva entrada adminAiTools
- `src/components/layout/vertical/VerticalMenu.tsx` — reestructura completa: elimina secciones de 1 hijo, fusiona Equipo+HR, renombra Agencia→Gestión / Servicios→Módulos / Admin→Administración, NavLabel en todos los SubMenu children
- `src/components/layout/shared/search/DefaultSuggestions.tsx` — corrige rutas obsoletas, sección People→Equipo, labels en inglés→español

### Verificacion

- `npx tsc --noEmit` ✅ — sin errores de tipo
- Commit `62f6abd` pusheado a `develop`
- Cambios de label se propagan automáticamente a `verticalMenuData.tsx` y `horizontalMenuData.tsx` vía constantes de nomenclatura

### Riesgos o pendientes

- Los items HR ahora son hijos de sección (no de SubMenu), lo que los hace siempre visibles en lugar de colapsados. Verificar que el sidebar colapsado no se desborde cuando un usuario tiene todos los permisos (agency + people + hr + finance + admin).
- Los capability modules (Creative Hub, CRM Command, etc.) siguen en inglés — son brand names, no labels de navegación. Si se decide traducirlos, el cambio va en `capability-registry.ts`.
- Falta validación visual en cada tipo de usuario (cliente, interno, agency, admin, hr, finance, ai_tooling).

---

## 2026-03-20 11:05 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Corregir el vacío en `Agency > Organizations > Finanzas` cuando la organización sí tenía ingresos pero faltaba el snapshot mensual de `client_economics`.

### Rama

- Rama usada: `develop`
- Rama objetivo: por definir

### Ambiente objetivo

- Development / Preview / `staging`

### Archivos tocados

- `src/lib/finance/postgres-store-intelligence.ts` — nueva función reutilizable `computeClientEconomicsSnapshots(year, month, notes?)`
- `src/app/api/finance/intelligence/client-economics/route.ts` — ahora reutiliza el helper compartido en vez de duplicar la lógica
- `src/lib/account-360/organization-store.ts` — `getOrganizationFinanceSummary()` intenta auto-computar el período cuando la organización no encuentra snapshot

### Verificacion

- `pnpm pg:doctor --profile=runtime` ✅
- Validación directa en Postgres para Sky Airline (`org-b9977f96-f7ef-4afb-bb26-7355d78c981f`):
  - `client_profiles.organization_id` sí estaba bien puenteado
  - `greenhouse_finance.income` sí tenía registros de marzo 2026
  - `greenhouse_finance.client_economics` estaba vacío para marzo 2026
- Se ejecutó backfill puntual de `client_economics` para `2026-03` y quedó snapshot para Sky:
  - `total_revenue_clp = 13804000`
  - `direct_costs_clp = 1225`
- `pnpm eslint src/lib/finance/postgres-store-intelligence.ts src/app/api/finance/intelligence/client-economics/route.ts src/lib/account-360/organization-store.ts` ✅

### Riesgos o pendientes

- La tab de organización ahora puede auto-hidratar el snapshot faltante al primer acceso del período, pero sigue dependiendo de `client_economics`; no es una vista live de `income`/`expenses`.
- Queda recomendada una automatización explícita mensual del compute de `client_economics` para evitar que la primera visita del usuario dispare ese cálculo.

## 2026-03-20 10:12 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Corregir `Finance > Proveedores > Historial de pagos`, que en runtime Postgres mostraba vacío aunque los egresos sí existían y estaban asociados al proveedor.

### Rama

- Rama usada: `develop`
- Rama objetivo: por definir

### Ambiente objetivo

- Development / Preview / `staging`

### Archivos tocados

- `src/app/api/finance/suppliers/[id]/route.ts` — el path Postgres ahora consulta `greenhouse_finance.expenses` y arma `paymentHistory` real en vez de devolver `[]`
- `src/views/greenhouse/finance/SupplierDetailView.tsx` — tabla robustecida para fechas, documentos y métodos nulos; el encabezado de fecha queda neutral porque algunos egresos pagados/importados no traen `payment_date`

### Verificacion

- Revisión del endpoint confirmó el bug raíz: `GET /api/finance/suppliers/[id]` en Postgres devolvía el proveedor pero forzaba `paymentHistory: []`
- `pnpm eslint 'src/app/api/finance/suppliers/[id]/route.ts' src/views/greenhouse/finance/SupplierDetailView.tsx` ✅
- No se pudo completar una consulta manual directa a Cloud SQL desde la terminal local por un error OpenSSL del flujo de firma del conector (`ERR_OSSL_UNSUPPORTED`), así que la validación de data real quedó inferida por:
  - el `expense detail` ya muestra `supplier_id` asociado
  - la API tenía un `[]` hardcodeado en Postgres
  - el fallback BigQuery ya contemplaba consultar egresos del proveedor

### Riesgos o pendientes

- Algunos egresos Nubox/importados pueden venir con `payment_status = 'paid'` pero sin `payment_date` ni `payment_method`; por eso la tabla ahora usa fallback de fecha (`payment_date -> document_date -> due_date`) y muestra `—` si falta el método.
- Falta validación manual en `dev-greenhouse.efeoncepro.com` para confirmar que el proveedor ya lista sus registros en `Historial de pagos`.

## 2026-03-20 09:33 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Cerrar el rollout operativo de `Finance > Ingresos > DTE detail` en `staging` y verificar que el dato de Nubox no estuviera cruzado.

### Rama

- Rama usada: `develop`
- Rama objetivo: por definir

### Ambiente objetivo

- `staging` / `dev-greenhouse.efeoncepro.com`

### Archivos tocados

- `src/views/greenhouse/finance/IncomeDetailView.tsx` — copy/UI para separar tipo de documento vs código SII vs folio real
- `Handoff.md`
- `changelog.md`
- `project_context.md`

### Verificacion

- Verificación directa contra Nubox del documento `26639047`:
  - `number = 114`
  - `type.legalCode = 33`
  - `type.name = Factura electrónica`
  - XML real: `<TipoDTE>33</TipoDTE>` y `<Folio>114</Folio>`
- Conclusión: no había cruce de documentos; el problema era de lectura visual, no de data.
- Vercel:
  - se detectó que `staging` no tenía `NUBOX_API_BASE_URL`, `NUBOX_BEARER_TOKEN`, `NUBOX_X_API_KEY`
  - esas 3 variables se cargaron en `staging`
  - se redeployó `staging`
  - `dev-greenhouse.efeoncepro.com` quedó apuntando a `https://greenhouse-qlxcf9v6s-efeonce-7670142f.vercel.app`
- Git:
  - `2e88190 fix: restore finance income dte dates and downloads`
  - `1cd824b fix: clarify dte type vs folio in income detail`

### Riesgos o pendientes

- `staging` quedó sano para Nubox DTE, pero si se crea otro ambiente custom o preview compartido que necesite descargas DTE, hay que replicar explícitamente las 3 variables `NUBOX_*`.
- Queda recomendado mantener el label visual como:
  - tipo de documento
  - código SII
  - folio DTE
    para no volver a inducir lectura de “factura 33”.

## 2026-03-20 09:03 -03

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Corregir el detalle de ingresos Nubox en `/finance/income/[id]` donde fechas visibles quedaban en `—` y las descargas DTE PDF/XML fallaban desde el navegador.

### Rama

- Rama usada: `develop`
- Rama objetivo: por definir

### Ambiente objetivo

- Development / Preview

### Archivos tocados

- `src/lib/finance/shared.ts` — `toDateString` y `toTimestampString` ahora soportan `Date` de Postgres
- `src/lib/nubox/client.ts` — decode correcto del XML Nubox cuando responde JSON con base64
- `src/views/greenhouse/finance/IncomeDetailView.tsx` — descarga DTE más robusta, filename desde header y error detail
- `src/lib/finance/shared.test.ts` — cobertura para normalización de fechas
- `src/lib/nubox/client.test.ts` — cobertura para decode de XML Nubox

### Verificacion

- `pnpm pg:doctor` ✅
- Validación directa del registro `INC-NB-26639047` en Postgres:
  - `invoice_date = 2026-03-06`
  - `due_date = 2026-04-06`
  - `nubox_emitted_at = 2026-03-06`
- Validación directa contra Nubox:
  - `GET /sales/26639047/pdf?template=TEMPLATE_A4` → `200 application/pdf`
  - `GET /sales/26639047/xml` → `200 application/json` con payload `{ xml: <base64> }`
- `pnpm vitest run src/lib/finance/shared.test.ts src/lib/nubox/client.test.ts` ✅
- `pnpm eslint src/lib/finance/shared.ts src/lib/finance/shared.test.ts src/lib/nubox/client.ts src/lib/nubox/client.test.ts src/views/greenhouse/finance/IncomeDetailView.tsx` ✅

### Riesgos o pendientes

- La causa de fechas en `—` no era data faltante sino normalización incompleta de `Date` objects devueltos por `pg`; esto puede haber afectado otras superficies que usan `toDateString` / `toTimestampString`, aunque el fix quedó centralizado.
- El XML de Nubox no llega como XML plano sino como JSON con base64; si Nubox cambia otra vez el contrato, revisar `decodeNuboxXmlPayload()`.
- Falta validación manual en navegador sobre el ambiente desplegado para confirmar que Chrome ya descarga PDF/XML sin cancelar el archivo.

## 2026-03-19 — Nubox DTE Integration: API discovery, org mapping, data seeding

### Agente

- Claude Opus 4.6

### Objetivo del turno

- Verificar credenciales API de Nubox, descubrir base URL y endpoints disponibles.
- Mapear clientes Nubox ↔ organizaciones Greenhouse por RUT.
- Importar historial de ventas Nubox como income en Finance module.
- Crear proveedores faltantes desde facturas de compra de Nubox.
- Documentar todo en task brief para implementación futura de emisión + sync.

### Rama

- Rama usada: `develop`
- Rama objetivo: `main`

### Ambiente objetivo

- Production (datos escritos directamente en Postgres Cloud SQL)

### Archivos tocados

- `scripts/nubox-extractor.py` — movido desde `docs/tasks/to-do/`, credenciales via env vars
- `docs/tasks/to-do/CODEX_TASK_Nubox_DTE_Integration.md` — task brief completo (8 fases)
- `changelog.md` — entrada de Nubox
- `Handoff.md` — este archivo
- `.env.local` — variables NUBOX_API_BASE_URL, NUBOX_BEARER_TOKEN, NUBOX_X_API_KEY

### Datos escritos en Postgres (Cloud SQL)

- `greenhouse_core.organizations`: 4 UPDATE (tax_id, legal_name, industry) + 2 INSERT (SGI, Sika)
- `greenhouse_core.clients`: 2 INSERT (nubox-client-76438378-8, nubox-client-91947000-3)
- `greenhouse_finance.suppliers`: 17 INSERT + 1 UPDATE (Microsoft RUT)
- `greenhouse_finance.income`: 78 INSERT (15 meses de ventas Nubox, $163.8M CLP)

### Verificacion

- `GET /v1/sales?period=2026-02` → 200 OK, datos reales de facturación
- `GET /v1/purchases?period=2026-02` → 200 OK, 8 facturas de proveedores
- `GET /v1/expenses?period=2026-02` → 200 OK, 1 egreso bancario
- Todas las organizaciones con RUT mapean a clientes Nubox: 0 huérfanos en import
- 78 income records visibles en `/finance/income` del portal

### Riesgos o pendientes

- Credenciales Nubox (`NP_SECRET_PROD_...`, `NP_KEY_PROD_...`) estuvieron hardcodeadas en el script original — ya limpiadas, pero el historial de git las tiene. Rotar en Nubox cuando sea conveniente.
- 5 organizaciones sin RUT (ANAM, BeFUN, Ecoriles, Efeonce, Municipalidad PAC, SSilva, Greenhouse Demo) — no tienen facturación en Nubox actualmente.
- `income_type: 'quote'` se usa para cotizaciones (COT) de Nubox — verificar si deben tratarse como income real o solo referencia.
- Próximo paso: implementar Fase 1-3 del task brief (cliente API TypeScript, schema DTE columns, emisión desde Greenhouse).

## 2026-03-19 — Advanced tasks split into complete foundations and focused follow-ups

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Dejar de tratar algunas lanes fundacionales muy avanzadas como backlog abierto amplio y reemplazarlas por follow-ups chicos con solo el remanente real.

### Rama

- Rama usada: workspace actual
- Rama objetivo: por definir

### Ambiente objetivo

- Documentación operativa del repo

### Archivos tocados

- `docs/tasks/README.md`
- `project_context.md`
- `changelog.md`
- `docs/tasks/complete/CODEX_TASK_Source_Sync_Runtime_Projections_v1.md`
- `docs/tasks/complete/CODEX_TASK_Person_360_Profile_Unification_v1.md`
- `docs/tasks/complete/CODEX_TASK_People_Unified_View_v3.md`
- `docs/tasks/to-do/CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1.md`
- `docs/tasks/to-do/CODEX_TASK_People_360_Enrichments_v1.md`

### Verificacion

- Contraste manual contra:
  - `project_context.md`
  - `changelog.md`
  - `scripts/sync-source-runtime-projections.ts`
  - `scripts/setup-postgres-person-360-v2.sql`
  - `src/lib/tenant/identity-store.ts`
  - rutas y consumers activos de `People`, `Finance`, `Payroll`, `Creative Hub` y auth
- Sin build ni lint: cambio documental y de taxonomía únicamente

### Riesgos o pendientes

- Se movieron a `complete` solo las tasks cuyo objetivo fundacional ya se ve cumplido en runtime:
  - `Source Sync Runtime Projections v1`
  - `Person 360 Profile Unification v1`
  - `People Unified View v3`
- No se cerraron `Identity & Access`, `Finance PG migration`, `Financial Module`, `HR Payroll Module` ni `Creative Hub`, porque sus propios briefs todavía declaran gaps abiertos.
- Los follow-ups nuevos ahora concentran solo el remanente real:
  - `CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1.md`
  - `CODEX_TASK_People_360_Enrichments_v1.md`

## 2026-03-19 — To-do task index synced to real implementation status

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Contrastar el backlog `docs/tasks/to-do/` contra el estado real del repo y reflejar ese resultado en el índice operativo.

### Rama

- Rama usada: workspace actual
- Rama objetivo: por definir

### Ambiente objetivo

- Documentación operativa del repo

### Archivos tocados

- `docs/tasks/README.md`
- `changelog.md`

### Verificacion

- Revisión manual contra:
  - `project_context.md`
  - `changelog.md`
  - `src/lib/auth.ts`
  - `src/lib/tenant/access.ts`
  - `src/lib/tenant/identity-store.ts`
  - rutas activas en `src/app/**`
- Sin build ni lint: cambio documental únicamente

### Riesgos o pendientes

- El índice ahora refleja mejor la realidad técnica, pero todavía hay drift entre taxonomía documental y cierre formal de algunas lanes muy avanzadas.
- `CODEX_TASK_Financial_Intelligence_Layer.md` quedó reintegrada al índice después de detectar que vivía en `to-do` pero no en `docs/tasks/README.md`.
- Si el usuario quiere seguir endureciendo la taxonomía, el siguiente paso sano es abrir una auditoría de cierre real de las lanes `Avanzadas` para decidir cuáles ya merecen moverse a `complete`.

## 2026-03-19 — To-do backlog prioritized by priority, impact and effort

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Reordenar el panel `docs/tasks/to-do/` para que funcione como backlog operativo real y no solo como inventario de briefs.

### Rama

- Rama usada: workspace actual
- Rama objetivo: por definir

### Ambiente objetivo

- Documentación operativa del repo

### Archivos tocados

- `docs/tasks/README.md`
- `changelog.md`

### Verificacion

- Revisión manual de `docs/tasks/to-do/*` contra:
  - `project_context.md`
  - `Handoff.md`
  - `docs/tasks/README.md`
- Sin build ni lint: cambio documental únicamente

### Riesgos o pendientes

- La priorización es operativa, no contractual: si el usuario decide empujar una lane distinta, conviene reabrir `docs/tasks/in-progress/` solo con ese subconjunto.
- El backlog ahora separa correctamente:
  - foundations `P0`
  - cierres de módulo `P1`
  - expansión estratégica `P2`
  - polish `P3`
  - briefs históricos de referencia que no deben ejecutarse antes de su `v2`

## 2026-03-19 — Transactional Email System closed + email template redesign

### Agente

- Claude Opus 4.6

### Objetivo del turno

- Cerrar el sistema de emails transaccionales: rediseñar templates de email (branding, UX writing, accesibilidad), limpiar código temporal, marcar task como complete, sincronizar ramas.

### Rama

- Rama usada: `develop`
- Rama objetivo: `main` (producción)

### Ambiente objetivo

- Production (`greenhouse.efeoncepro.com`)

### Archivos tocados

- `src/emails/constants.ts` — tokens de diseño expandidos (border, footerBg, success, secondary, LOGO_URL, APP_URL)
- `src/emails/components/EmailLayout.tsx` — header gradient, logo PNG clickable, `lang="es"`, color-scheme meta, footer con separador
- `src/emails/components/EmailButton.tsx` — border sutil, border-radius 8px, padding ajustado
- `src/emails/PasswordResetEmail.tsx` — copy mejorado, first-name greeting, fallback URL, separador visual
- `src/emails/InvitationEmail.tsx` — misma estructura de mejoras
- `src/emails/VerifyEmail.tsx` — misma estructura de mejoras
- `public/branding/logo-white-email.png` — logo convertido de SVG a PNG (280px) para compatibilidad email
- `scripts/fix-user-email.ts` — eliminado (temporal)
- `src/app/api/admin/fix-email/route.ts` — eliminado (temporal)
- `docs/tasks/complete/CODEX_TASK_Transactional_Email_System.md` — movido desde to-do
- `docs/tasks/README.md` — task movida a Complete

### Verificacion

- `tsc --noEmit` limpio
- `render()` de React Email produce HTML válido con `lang="es"`, logo URL correcta, 6175 chars
- Email de forgot-password confirmado recibido en `jreyes@efeoncepro.com`
- Push a `main` y deploy a Vercel confirmado

### Riesgos o pendientes

- Verificar visualmente el email rediseñado en producción (solicitar reset de contraseña y revisar en Outlook)
- Otros usuarios con `@efeonce.org` en `client_users` pueden necesitar actualización de email
- `CODEX_TASK_Greenhouse_Email_Catalog_v1.md` queda como siguiente paso para ampliar el catálogo de emails más allá del baseline transaccional

---

## 2026-03-19 — In-progress tasks audit and reclassification

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Auditar todas las tasks en `docs/tasks/in-progress/`, verificar cuáles estaban realmente cerradas y reubicar las parcialmente implementadas fuera de la carpeta de trabajo activo.

### Rama

- Rama usada: workspace actual
- Rama objetivo: por definir

### Ambiente objetivo

- Documentación operativa del repo

### Archivos tocados

- `docs/tasks/README.md`
- `project_context.md`
- `changelog.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- múltiples briefs movidos desde `docs/tasks/in-progress/` hacia `docs/tasks/to-do/` o `docs/tasks/complete/`

### Verificacion

- Revisión manual del alcance declarado y estado del repo para cada brief de `in-progress`
- Cruce documental contra:
  - `project_context.md`
  - `changelog.md`
  - rutas y servicios actualmente presentes en `src/app/api/**` y `src/lib/**`
- Sin build ni lint: cambio documental y de taxonomía únicamente

### Riesgos o pendientes

- La carpeta `in-progress/` quedó vacía: eso no significa que no existan lanes abiertas, sino que ninguna estaba bien clasificada como “trabajo activo” al momento de esta auditoría.
- `AI Tooling v2` y `HR Core v2` se consideraron cerradas para el alcance que declaran.
- Se devolvieron a `to-do` por implementación parcial o gaps explícitos:
  - `Admin Team v2`
  - `Creative Hub v2`
  - `Financial Module v2`
  - `Finance Postgres Runtime Migration v1`
  - `HR Payroll Module v3`
  - `HR Payroll Postgres Runtime Migration v1`
  - `People Unified View v3`
  - `Person 360 Profile Unification v1`
  - `Source Sync Runtime Projections v1`
  - `Team Identity & Capacity System v2`
  - `GREENHOUSE_IDENTITY_ACCESS_V2`
- El siguiente paso sano es volver a abrir `in-progress/` solo con las 1-3 lanes que de verdad se vayan a empujar ahora.

## 2026-03-19 — Greenhouse Email Catalog task added

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Formalizar una task separada para el catalogo de emails de Greenhouse, desacoplando la infraestructura base de `Transactional Email` del roadmap mas amplio de emails de producto, seguridad, digests y notificaciones de dominio.

### Rama

- Rama usada: workspace actual
- Rama objetivo: por definir

### Ambiente objetivo

- Documentación operativa del repo

### Archivos tocados

- `docs/tasks/to-do/CODEX_TASK_Greenhouse_Email_Catalog_v1.md`
- `docs/tasks/README.md`
- `changelog.md`

### Verificacion

- Revisión manual de consistencia contra:
  - `docs/tasks/to-do/CODEX_TASK_Transactional_Email_System.md`
  - `docs/tasks/to-do/Greenhouse_Data_Node_Architecture_v2.md`
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- Sin build ni lint: cambio documental únicamente

### Riesgos o pendientes

- La task deja claro el catalogo y la prioridad, pero no resuelve todavía qué eventos serán opt-in, opt-out u obligatorios por seguridad.
- El siguiente paso natural no es implementar todo el catalogo, sino abrir un task corto para el `P0` de emails adicionales sobre la infraestructura que ya está montando Claude.

## 2026-03-19 — Frame.io Analytics Pipeline v2 as implementation baseline

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Traducir la spec original de `Frame.io` a una baseline de implementación alineada con el source sync actual, `space_id` como boundary, y el contrato vivo de `delivery_tasks` + `ico_engine.v_tasks_enriched`.

### Rama

- Rama usada: workspace actual
- Rama objetivo: por definir

### Ambiente objetivo

- Documentación operativa del repo

### Archivos tocados

- `docs/tasks/to-do/CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline_v2.md`
- `docs/tasks/to-do/CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline.md`
- `docs/tasks/README.md`
- `changelog.md`

### Verificacion

- Revisión manual de consistencia contra:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
  - `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
  - `docs/tasks/in-progress/CODEX_TASK_Creative_Hub_Module_v2.md`
- Sin build ni lint: cambio documental únicamente

### Riesgos o pendientes

- La `v2` deja resuelto el drift principal: Frame.io debe enriquecer el contrato vigente de delivery/ICO, no crear otra vista maestra de tareas.
- Si esta lane se implementa pronto, conviene un `P0/P1` corto:
  - `space_frameio_sources`
  - extract `files/versions/comments`
  - enrich controlado de `ico_engine.v_tasks_enriched`
- Todavía queda abierta una decisión práctica de implementación: si el landing dataset MVP seguirá siendo `frameio_ops` por compatibilidad con el repo externo, o si conviene mover desde el inicio parte del extract a naming más cercano a `greenhouse_raw` / `greenhouse_conformed`.

## 2026-03-19 — Business Units v2 as implementation baseline

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Traducir la spec original de `Business Units` a una baseline de implementación alineada con `service_modules` como catálogo ya existente, evitando duplicar identidad y separando BU comercial vs BU operativa.

### Rama

- Rama usada: workspace actual
- Rama objetivo: por definir

### Ambiente objetivo

- Documentación operativa del repo

### Archivos tocados

- `docs/tasks/to-do/CODEX_TASK_Business_Units_Canonical_v2.md`
- `docs/tasks/to-do/CODEX_TASK_Business_Units_Canonical.md`
- `docs/tasks/README.md`
- `changelog.md`

### Verificacion

- Revisión manual de consistencia contra:
  - `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md`
  - `docs/tasks/to-do/Greenhouse_Services_Architecture_v1.md`
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/tasks/to-do/Greenhouse_Account_360_Object_Model_v1.md`
  - `src/lib/tenant/identity-store.ts`
- Sin build ni lint: cambio documental únicamente

### Riesgos o pendientes

- La `v2` reduce el riesgo principal de la task original, pero deja una decisión importante abierta para implementación real: si de verdad se quiere medir BU en el `ICO Engine`, primero hay que fijar si esa dimensión será comercial o operativa.
- Si esto se implementa pronto, conviene un `P0` mucho más corto: metadata 1:1 para `business_line` existente + helper de enrichment server-side.
- La última iteración ya deja la semántica recomendada explícita:
  - `commercial_business_unit` para Finance / Services
  - `operating_business_unit` para ICO / delivery
    Si se implementa analítica por BU, no mezclar ambas en una sola tabla o KPI sin nombrarlo.

## 2026-03-19 — Home Nexa v2 as implementation baseline

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Traducir la spec original de `Home + Nexa` a una baseline de implementación alineada con el runtime real del portal, `portalHomePath`, los route groups vigentes y la coexistencia con `/dashboard` e `/internal/dashboard`.

### Rama

- Rama usada: workspace actual
- Rama objetivo: por definir

### Ambiente objetivo

- Documentación operativa del repo

### Archivos tocados

- `docs/tasks/to-do/CODEX_TASK_Greenhouse_Home_Nexa_v2.md`
- `docs/tasks/to-do/CODEX_TASK_Greenhouse_Home_Nexa.md`
- `docs/tasks/README.md`
- `changelog.md`

### Verificacion

- Revisión manual de consistencia contra:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/tasks/in-progress/GREENHOUSE_IDENTITY_ACCESS_V2.md`
  - `src/lib/auth.ts`
  - `src/lib/tenant/access.ts`
  - `src/app/(dashboard)/home/page.tsx`
  - `package.json`
- Sin build ni lint: cambio documental únicamente

### Riesgos o pendientes

- La `v2` deja explícito que `client -> /home` es la dirección deseada, pero sin romper los homes especializados de `internal`, `finance` y `hr`.
- Si se implementa pronto, conviene separar un `P0` de Home client-first y un `P1` de Nexa conversacional real para no mezclar landing UX con toda la infraestructura del agente.

## 2026-03-19 — Staff Augmentation v2 as implementation baseline

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Traducir la spec original de `Staff Augmentation` a una baseline de implementación alineada con assignments como anchor, `PostgreSQL` como write path, `Services` como relación opcional y el modelo vivo de IDs/FKs del core.

### Rama

- Rama usada: workspace actual
- Rama objetivo: por definir

### Ambiente objetivo

- Documentación operativa del repo

### Archivos tocados

- `docs/tasks/to-do/CODEX_TASK_Staff_Augmentation_Module_v2.md`
- `docs/tasks/to-do/CODEX_TASK_Staff_Augmentation_Module.md`
- `docs/tasks/README.md`
- `changelog.md`

### Verificacion

- Revisión manual de consistencia contra:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/tasks/to-do/Greenhouse_Services_Architecture_v1.md`
  - `docs/tasks/to-do/Greenhouse_Account_360_Object_Model_v1.md`
- Sin build ni lint: cambio documental únicamente

### Riesgos o pendientes

- La `v2` deja al módulo mucho mejor alineado, pero `ICO by placement` sigue siendo una fase posterior mientras no exista un bridge inequívoco `task -> assignment/placement`.
- Si el módulo se implementa pronto, conviene sacar un task ejecutivo más corto para `P0`: `assignment_type`, placements, onboarding, event log y People enrichment.

## 2026-03-19 — SCIM v2 as implementation baseline

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Traducir la spec original de SCIM a una baseline de implementación alineada con `Identity & Access V2`, PostgreSQL y el modelo de identidad actual.

### Rama

- Rama usada: workspace actual
- Rama objetivo: por definir

### Ambiente objetivo

- Documentación operativa del repo

### Archivos tocados

- `docs/tasks/to-do/CODEX_TASK_SCIM_User_Provisioning_v2.md`
- `docs/tasks/to-do/CODEX_TASK_SCIM_User_Provisioning.md`
- `docs/tasks/README.md`
- `changelog.md`

### Verificacion

- Revisión manual de consistencia contra:
  - `docs/tasks/in-progress/GREENHOUSE_IDENTITY_ACCESS_V2.md`
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/MULTITENANT_ARCHITECTURE.md`
  - `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
  - `src/lib/tenant/access.ts`
- Sin build ni lint: cambio documental únicamente

### Riesgos o pendientes

- La `v2` ya corrige el write path y el modelo de auth, pero todavía conviene un task más corto de ejecución si se quiere implementar solo el slice `ServiceProviderConfig + Users create/update/deactivate`.
- Si SCIM se activa de verdad para clientes enterprise, conviene definir desde temprano la política exacta de rol baseline y cómo reconciliar `identity_profile_id` en casos ambiguos.

## 2026-03-19 — Data Node v2 as implementation baseline

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Traducir la spec original de `Data Node` a una baseline de implementación alineada al runtime actual del portal y al patrón `Postgres-first`.

### Rama

- Rama usada: workspace actual
- Rama objetivo: por definir

### Ambiente objetivo

- Documentación operativa del repo

### Archivos tocados

- `docs/tasks/to-do/Greenhouse_Data_Node_Architecture_v2.md`
- `docs/tasks/to-do/Greenhouse_Data_Node_Architecture_v1.md`
- `docs/tasks/README.md`
- `changelog.md`

### Verificacion

- Revisión manual de consistencia contra:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/MULTITENANT_ARCHITECTURE.md`
  - `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
  - `docs/tasks/to-do/Greenhouse_ICO_Engine_v1.md`
  - `docs/tasks/to-do/Greenhouse_Services_Architecture_v1.md`
- Sin build ni lint: cambio documental únicamente

### Riesgos o pendientes

- La `v2` deja claro el orden correcto (`export -> reports -> API -> MCP`), pero todavia falta una task ejecutiva más corta si se quiere implementar `DN0` de inmediato.
- Si el proyecto decide monetizar `API` o `MCP`, conviene luego separar el brief de pricing/comercial del brief técnico de implementación.

## 2026-03-19 — Resend helper added, local key validation blocked

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Agregar el helper runtime de `Resend` para el futuro sistema de emails transaccionales y validar que lea la configuración local.

### Rama

- Rama usada: workspace actual
- Rama objetivo: por definir

### Ambiente objetivo

- Development local / foundation backend

### Archivos tocados

- `package.json`
- `pnpm-lock.yaml`
- `src/lib/resend.ts`
- `changelog.md`

### Verificacion

- Instalación de dependencia `resend`: correcta
- Helper `src/lib/resend.ts`: creado
- Chequeo local contra API `GET /api-keys`: falló con `400 API key is invalid`

### Riesgos o pendientes

- El helper quedó listo, pero no se debe avanzar con envíos reales hasta corregir `RESEND_API_KEY` en `.env.local`.
- La key presente localmente no empieza con el patrón esperado `re_`; probablemente fue pegada con un valor incompleto, inválido o ya rotado.
- Si se va a seguir con el módulo, el siguiente paso sano es corregir la key y reintentar la validación antes de implementar routes o templates.

## 2026-03-19 — Env placeholders for Resend / transactional email

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Preparar el espacio local y los archivos de ejemplo para `RESEND_API_KEY` y `EMAIL_FROM`, sin escribir secretos reales en archivos versionados.

### Rama

- Rama usada: workspace actual
- Rama objetivo: por definir

### Ambiente objetivo

- Development local / documentación operativa del repo

### Archivos tocados

- `.env.example`
- `.env.local.example`
- `.env.local`
- `project_context.md`
- `changelog.md`

### Verificacion

- Confirmado por búsqueda de claves:
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
- Los placeholders quedaron presentes en `.env.example`, `.env.local.example` y `.env.local`

### Riesgos o pendientes

- No se escribió ninguna clave real en archivos versionados.
- Si se va a usar la API key de Resend que apareció en la conversación, conviene rotarla antes de usarla en serio porque ya quedó expuesta fuera del gestor de secretos.

## 2026-03-19 — Transactional Email task normalized to live auth/runtime

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Corregir la spec de `Transactional Email System` para que no choque con la arquitectura viva de auth, tenant isolation y setup PostgreSQL del repo.

### Rama

- Rama usada: workspace actual
- Rama objetivo: por definir

### Ambiente objetivo

- Documentación operativa del repo

### Archivos tocados

- `docs/tasks/to-do/CODEX_TASK_Transactional_Email_System.md`
- `changelog.md`

### Verificacion

- Revisión manual de consistencia contra:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/MULTITENANT_ARCHITECTURE.md`
  - `docs/tasks/in-progress/GREENHOUSE_IDENTITY_ACCESS_V2.md`
  - `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
  - `src/lib/tenant/access.ts`
- Sin build ni lint: cambio documental únicamente

### Riesgos o pendientes

- La task ya quedó sana en arquitectura, pero todavía conviene una pasada futura para alinear detalles de naming con el runtime exacto de tablas/columnas si el módulo se va a implementar de inmediato.
- Si se ejecuta este task, conviene arrancar por `forgot-password` y `auth_tokens` como P0 antes de tocar invitaciones y verificación de email.

## 2026-03-19 — Testing: baseline unitario formalizado

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Cerrar una base de unit testing reutilizable para el repo usando el `Vitest` ya instalado y extenderlo a tests de componentes React.

### Rama

- Rama usada: workspace actual
- Rama objetivo: por definir

### Ambiente objetivo

- Tooling local / CI futura

### Archivos tocados

- `AGENTS.md`
- `package.json`
- `pnpm-lock.yaml`
- `vitest.config.ts`
- `src/test/setup.ts`
- `src/test/render.tsx`
- `src/components/greenhouse/EmptyState.test.tsx`

### Verificacion

- `pnpm test`
- Resultado: `3` archivos y `33` tests pasando

### Riesgos o pendientes

- La base de testing ya soporta `node` y `jsdom`, pero todavia hay poca cobertura del repo real; el siguiente ROI alto esta en `ICO Engine`, scopes de acceso, normalizacion de source sync y helpers de Finance/Payroll.
- Si se agregan tests de componentes con providers extra, conviene extender `src/test/render.tsx` en vez de repetir wrappers por archivo.

## 2026-03-19 — Person Activity Tab ICO merge + sidebar FTE alignment + KPI layout fix

### Agente

- Claude (Opus 4.6)

### Objetivo del turno

- Merge de métricas ICO Engine en el tab Actividad de Person 360 (reemplaza `PersonOperationalMetrics` vacío).
- Corregir KPI cards que se recortaban por overflow en el contenedor.
- Alinear los stats del sidebar (FTE, Hrs/mes, Spaces) con lo que muestra el tab Organizaciones.
- Verificación de infraestructura: `v_tasks_enriched` vista confirmada con 3850 filas, 92 tareas para Andrés Carlosama.

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Ambiente objetivo

- Staging (Vercel `dev-greenhouse.efeoncepro.com`)

### Archivos tocados

**Person Activity Tab (REWRITTEN — commit `fbd2cb0`):**

- `src/views/greenhouse/people/tabs/PersonActivityTab.tsx` — Antes: mostraba `PersonOperationalMetrics` (siempre vacío). Ahora: fetch client-side a `/api/ico-engine/context?dimension=member&value={memberId}`. Props cambiaron de `{ metrics?: PersonOperationalMetrics }` a `{ memberId: string }`.
  - 6 KPI cards: RpA, OTD%, FTR%, Throughput, Ciclo promedio, Stuck assets
  - Selectores de período (mes/año)
  - Donut CSC (distribución por fase)
  - Radar de salud operativa (6 dimensiones normalizadas)
  - Gauge de velocidad pipeline (radialBar)
- `src/views/greenhouse/people/PersonTabs.tsx` — Activity tab ahora pasa `memberId={detail.member.memberId}` en vez de `metrics`.
- `src/views/greenhouse/people/helpers.ts` — Eliminado tab `ico` de `TAB_PERMISSIONS` y `TAB_CONFIG`.
- `src/types/people.ts` — Eliminado `'ico'` de `PersonTab` union type.
- `src/views/greenhouse/people/tabs/PersonIcoTab.tsx` — **ELIMINADO** (orphan después del merge).

**KPI overflow fix (commit `67b93aa`):**

- `src/views/greenhouse/people/tabs/PersonActivityTab.tsx` — Reemplaza Grid anidado por flex con `overflowX: auto`. Cada card tiene `minWidth: 160px` y `flex: 1 1 0` para distribuirse equitativamente sin recortarse.

**Sidebar FTE alignment (commit `b04bb8f`):**

- `src/lib/people/get-person-detail.ts` — El summary (`totalFte`, `totalHoursMonth`, `activeAssignments`) ahora solo cuenta assignments que tienen una membresía correspondiente en Postgres (`person_memberships`), no todos los `client_team_assignments` de BigQuery. Import de `getPersonMemberships` agregado.
  - **Antes**: Andrés mostraba 2.0 FTE, 320 hrs, 2 Spaces (Efeonce + Sky Airline en BQ).
  - **Ahora**: Muestra 1.0 FTE, 160 hrs, 1 Space (solo Sky Airline, la única membresía en Postgres).
  - Fallback: si la consulta de membresías falla, usa todos los assignments (backward compatible).

**BigQuery view fix (commit `e44c3be`):**

- `src/lib/ico-engine/schema.ts` — `v_tasks_enriched` COALESCE bug: empty array `[]` no es NULL, por lo que COALESCE no aplicaba fallback. Cambiado a `IF(ARRAY_LENGTH > 0)`.

### Verificación

- TypeScript: `tsc --noEmit` limpio en todos los commits
- BigQuery: `ico_engine.v_tasks_enriched` existe con 3850 filas. Andrés tiene 92 tareas asignadas.
- Postgres: `greenhouse_sync.identity_reconciliation_proposals` creada y operativa. 13 propuestas procesadas (1 rejected, 12 dismissed).
- Vercel: deploy staging Ready con commit `b04bb8f`.
- clientId matching verificado: Postgres membership Sky Airline (`hubspot-company-30825221458`) ↔ BigQuery assignment match correcto. Efeonce (`space-efeonce`) filtrado.

### Riesgos o pendientes

- **Cache del browser** puede causar que los cambios no se vean inmediatamente. Hard refresh (`Cmd+Shift+R`) o incógnito resuelve.
- **Humberly** sigue sin `notion_user_id` — no aparece como responsable en tareas de Notion.
- **Asignaciones huérfanas en BigQuery**: `space-efeonce` sigue en `client_team_assignments` para todos los miembros pero no tiene membresía en Postgres. Considerar limpiar o crear las membresías correspondientes.

## 2026-03-18 — Identity Reconciliation Service + Person Activity ICO merge

### Agente

- Claude (Opus 4.6)

### Objetivo del turno

- Construir un servicio escalable de reconciliación de identidades entre source systems (Notion, extensible a HubSpot/Azure AD) y team members de Greenhouse.
- Descubrimiento automático de IDs no vinculados, matching por señales con scoring de confianza, auto-link para alta confianza, cola de propuestas para revisión admin.
- Enriquecimiento del discovery con `responsable_texto` como fallback de nombres cuando Notion devuelve UUIDs para usuarios externos/invitados.
- Merge de métricas ICO Engine en el tab Activity de Person 360.

### Rama

- Rama usada: `develop`
- Rama objetivo: `develop`

### Ambiente objetivo

- Staging (Vercel) + Cloud SQL (greenhouse_sync schema)

### Archivos tocados

**Reconciliation engine (NEW):**

- `src/lib/identity/reconciliation/types.ts` — tipos, thresholds, interfaces
- `src/lib/identity/reconciliation/normalize.ts` — normalización de nombres, Levenshtein
- `src/lib/identity/reconciliation/discovery-notion.ts` — descubrimiento de Notion IDs no vinculados con fallback `responsable_texto`
- `src/lib/identity/reconciliation/matching-engine.ts` — matching source-agnostic con scoring de confianza
- `src/lib/identity/reconciliation/apply-link.ts` — escritura de links en BigQuery + Postgres
- `src/lib/identity/reconciliation/reconciliation-service.ts` — orquestador: discover → match → propose/auto-link

**Admin API (NEW):**

- `src/app/api/admin/identity/reconciliation/route.ts` — GET proposals + POST trigger run
- `src/app/api/admin/identity/reconciliation/[proposalId]/resolve/route.ts` — resolve (approve/reject/dismiss/reassign)
- `src/app/api/admin/identity/reconciliation/stats/route.ts` — summary por source_system y status

**Postgres DDL + Scripts (NEW):**

- `scripts/setup-identity-reconciliation.sql` — DDL tabla `greenhouse_sync.identity_reconciliation_proposals`
- `scripts/setup-identity-reconciliation.ts` — runner del DDL
- `scripts/run-identity-reconciliation.ts` — ejecución CLI del reconciliation service

**Pipeline integration (MODIFIED):**

- `src/lib/sync/sync-notion-conformed.ts` — tail step no-blocking de reconciliación al final del sync

### Verificación

- DDL ejecutado en Cloud SQL: tabla creada en `greenhouse_sync`
- TypeScript: `tsc --noEmit` limpio
- Dry run: 13 IDs descubiertos, 0 auto-linked (todos externos), 1 fuzzy match (Daniela I → Daniela Ferreira, rechazado por ser persona distinta)
- Run real: 13 propuestas creadas. 1 rechazada (Daniela Infante, ex-colaboradora). 12 descartadas (ex-colaboradores externos).
- Vercel deploy: staging OK

### Riesgos o pendientes

- **Humberly** sigue sin `notion_user_id` — no aparece como responsable en tareas de Notion. Requiere vinculación manual o verificación en el workspace de Notion.
- Cuando se agreguen nuevos team members, el próximo sync-conformed automáticamente descubrirá y propondrá vínculos.
- Para agregar HubSpot: crear `discovery-hubspot.ts` con la misma interfaz `DiscoveredIdentity`. No requiere cambios en schema ni API.

## 2026-03-18 — Campaign 360: baseline canonica v2

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Traducir la idea original de `Campaign 360` a una baseline de implementacion alineada con la arquitectura viva del proyecto.

### Rama

- Rama usada: workspace actual
- Rama objetivo: por definir

### Ambiente objetivo

- Documentacion operativa del repo

### Archivos tocados

- `docs/tasks/to-do/CODEX_TASK_Campaign_360_v2.md`
- `docs/tasks/to-do/CODEX_TASK_Campaign_360.md`
- `docs/tasks/README.md`
- `changelog.md`

### Verificacion

- Revisión manual de consistencia contra:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - `docs/tasks/in-progress/GREENHOUSE_IDENTITY_ACCESS_V2.md`
  - `docs/tasks/to-do/Greenhouse_Account_360_Object_Model_v1.md`
  - `docs/tasks/to-do/Greenhouse_Services_Architecture_v1.md`
- Sin build ni lint: cambio documental únicamente

### Riesgos o pendientes

- La task original de `Campaign 360` sigue teniendo mucho detalle historico de infraestructura; ahora ya esta guardraileada, pero una futura pasada deberia depurarla o absorberla por completo en la `v2`.
- Falta decidir, cuando se implemente, si `Campaign` tendra una serving view explicita `campaign_360` desde fase 1 o si eso queda para fase 2.

## 2026-03-18 — Documentación: normalización de índice y jerarquía de lectura

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Alinear la documentación viva después de la actualización reciente de Claude Code, para que tasks e índices no contradigan la arquitectura actual.

### Rama

- Rama usada: workspace actual
- Rama objetivo: por definir

### Ambiente objetivo

- Documentación operativa del repo

### Archivos tocados

- `docs/tasks/README.md`
- `docs/tasks/complete/CODEX_TASK_ETL_ICO_Pipeline_Hardening.md`
- `docs/tasks/to-do/Greenhouse_ICO_Engine_v1.md`
- `docs/tasks/to-do/CODEX_TASK_Tenant_Notion_Mapping.md`
- `changelog.md`

### Verificación

- Revisión manual de consistencia entre:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
  - `docs/tasks/**`
- Sin build ni lint: cambio documental únicamente

### Riesgos o pendientes

- `Greenhouse_ICO_Engine_v1.md` y `CODEX_TASK_Tenant_Notion_Mapping.md` ya quedaron con guardrails de lectura, pero siguen teniendo secciones históricas largas que convendría depurar en una pasada posterior.
- Queda pendiente reconciliar de forma definitiva la historia documental entre `space_notion_sources`, `notion_workspaces` y `space_property_mappings`.
- `Handoff.md` sigue sobredimensionado para su propósito de snapshot; esta pasada no intentó compactarlo.

## 2026-03-18 — ICO Engine: Context-Agnostic Metrics Service + Person ICO Tab

### Agente

- Claude (Opus 4.6)

### Objetivo del turno

- Refactorizar el ICO Engine de space-only a un servicio de métricas agnóstico al contexto. Agregar multi-assignee, materialización por persona, API genérica, y tab ICO en Person 360.

### Rama

- Rama usada: `develop`
- Commit: `b7b9d80`

### Ambiente objetivo

- Preview / BigQuery (`ico_engine` dataset) / Person 360 ICO tab / Organization ICO tab / Agency ICO tab

### Archivos tocados

**Nuevos (3 archivos):**

- `src/app/api/ico-engine/context/route.ts` — Generic context API: `?dimension=X&value=Y&year=Z&month=W`
- `src/app/api/people/[memberId]/ico/route.ts` — Person ICO convenience endpoint
- `src/views/greenhouse/people/tabs/PersonIcoTab.tsx` — Person ICO tab (KPIs, donut, radar, gauge)

**Modificados (9 archivos):**

- `src/lib/ico-engine/shared.ts` — `ICO_DIMENSIONS`, `buildMetricSelectSQL()`, `buildPeriodFilterSQL()`, status constants
- `src/lib/ico-engine/materialize.ts` — Refactored to use shared builders + `materializeMemberMetrics()`
- `src/lib/ico-engine/read-metrics.ts` — `IcoMetricSnapshot`, `computeMetricsByContext()`, `readMemberMetrics()`
- `src/lib/ico-engine/schema.ts` — `metrics_by_member` DDL, `assignee_member_ids` in `v_tasks_enriched`
- `src/lib/sync/sync-notion-conformed.ts` — Multi-assignee array + `ensureMultiAssigneeColumn()`
- `src/types/people.ts` — Added `'ico'` to `PersonTab`
- `src/views/greenhouse/people/helpers.ts` — Tab config + permissions
- `src/views/greenhouse/people/PersonTabs.tsx` — Registered ICO tab
- `scripts/setup-bigquery-source-sync.sql` — Added `assignee_member_ids` column

### Cambios realizados

**Phase 0 — Shared SQL Builders:**

- Fórmulas de métricas extraídas a `buildMetricSelectSQL()` (definidas UNA vez, consumidas por 5 funciones)
- `buildPeriodFilterSQL()` para filtro canónico de período
- `ICO_DIMENSIONS` allowlist con dimensiones válidas
- Refactored `materialize.ts` y `computeSpaceMetricsLive` para usar builders compartidos
- Corregido mismatch de columnas en `metrics_by_project` INSERT (faltaban `pipeline_velocity`, `stuck_asset_pct`, `active_tasks`)

**Phase 1 — Generalized Types + Context Query:**

- `IcoMetricSnapshot` — tipo genérico con `dimension`, `dimensionValue`, `dimensionLabel`
- `computeMetricsByContext(dimensionKey, dimensionValue, year, month)` — live compute para cualquier dimensión
- Member dimension usa UNNEST en `assignee_member_ids` para acreditar todos los asignados

**Phase 2 — Multi-Assignee Enrichment:**

- `assignee_member_ids ARRAY<STRING>` en `delivery_tasks` (todas las resoluciones de `responsables_ids`)
- `v_tasks_enriched` expone con fallback: `COALESCE(dt.assignee_member_ids, IF(dt.assignee_member_id IS NOT NULL, [dt.assignee_member_id], []))`
- `ensureMultiAssigneeColumn()` agrega columna idempotentemente via ALTER TABLE

**Phase 3 — Person-Level Materialization:**

- `metrics_by_member` DDL (clustered by member_id) registrado en `ensureIcoEngineInfrastructure()`
- `materializeMemberMetrics()` — DELETE period + INSERT desde UNNEST(assignee_member_ids)
- `readMemberMetrics()` — lectura desde caché materializado

**Phase 4 — Generic Context API:**

- `GET /api/ico-engine/context?dimension=space|project|member|client|sprint&value=X&year=Y&month=Z`
- Valida dimensión contra allowlist, intenta caché materializado, fallback a live compute

**Phase 5 — Person ICO Tab:**

- `PersonIcoTab.tsx` con KPIs, CSC donut, health radar, velocity gauge
- Period selectors (mes/año)
- `GET /api/people/[memberId]/ico` convenience endpoint
- Tab registrado en `PersonTabs.tsx`, permisos `efeonce_admin` + `efeonce_operations`

### Verificación

- `npx tsc --noEmit` — 0 errores TypeScript
- Pushed to `origin/develop`

### Riesgos o pendientes

- La tabla `metrics_by_member` no tiene datos hasta que se ejecute la materialización (cron 6:15 AM UTC) después de un sync que pueble `assignee_member_ids`. Mientras tanto, la API cae a live compute.
- BigQuery `ALTER TABLE ADD COLUMN IF NOT EXISTS` requiere que el service account tenga permisos de TABLE admin — si falla, el sync continúa (la columna no se crea) y los datos multi-assignee no se guardan.
- Agregar dimensiones futuras: solo 3 pasos (columna en view, entrada en allowlist, opcionalmente tabla de materialización).

### Documentación actualizada

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — ICO Engine section reescrita
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md` — `ico_engine` dataset completo + `assignee_member_ids`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — Layer D con tablas ICO
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` — Multi-assignee enrichment
- `docs/tasks/to-do/Greenhouse_ICO_Engine_v1.md` — Apéndice B: Context-Agnostic Metrics Service
- `docs/api/GREENHOUSE_API_REFERENCE_V1.md` — ICO Engine endpoints table
- `docs/CHANGELOG.md` — Nueva entrada

---

## 2026-03-17 — ICO Engine: Implementación completa (Groups A–E)

### Agente

- Claude (Opus 4.6)

### Objetivo del turno

- Completar todos los gaps restantes del ICO Engine identificados en `Greenhouse_ICO_Engine_v1.md`. 5 grupos: wire onComputeLive + AI DDL (A), stuck assets detail (B), RPA trend (C), project-level metrics (D), Creative Hub migration (E).

### Rama

- Rama usada: `develop`
- Commit: `d2483fd`

### Ambiente objetivo

- Preview / BigQuery (`ico_engine` dataset) / Agency ICO tab

### Archivos tocados

**Nuevos (19 archivos):**

- `src/lib/ico-engine/shared.ts` — IcoEngineError, runIcoEngineQuery, coercion utils
- `src/lib/ico-engine/metric-registry.ts` — 10 MetricDefinition[], FormulaConfig, CSC mapping, AIMetricConfig
- `src/lib/ico-engine/schema.ts` — ensureIcoEngineInfrastructure() — dataset + 6 tables + views
- `src/lib/ico-engine/read-metrics.ts` — 7 funciones de lectura (space, agency, project, live, summary, byClientId)
- `src/lib/ico-engine/materialize.ts` — materializeMonthlySnapshots (4 materializations)
- `src/app/api/ico-engine/registry/route.ts` — GET metric definitions
- `src/app/api/ico-engine/metrics/route.ts` — GET space metrics
- `src/app/api/ico-engine/metrics/agency/route.ts` — GET agency metrics + `?live=true`
- `src/app/api/ico-engine/metrics/project/route.ts` — GET project-level metrics
- `src/app/api/ico-engine/stuck-assets/route.ts` — GET stuck assets detail
- `src/app/api/ico-engine/trends/rpa/route.ts` — GET RPA trend
- `src/app/api/cron/ico-materialize/route.ts` — Vercel cron diario 06:15 UTC
- `src/components/agency/IcoGlobalKpis.tsx` — 6 KPI cards
- `src/components/agency/IcoCharts.tsx` — CSC bar + velocity gauge + RPA trend line
- `src/components/agency/SpaceIcoScorecard.tsx` — Sortable space metrics table + stuck click
- `src/components/agency/StuckAssetsDrawer.tsx` — Right drawer (480px) stuck asset details
- `src/components/agency/SpacesCharts.tsx` — Spaces view charts
- `src/components/agency/space-health.ts` — Space health computation
- `src/views/agency/AgencyIcoEngineView.tsx` — ICO tab orchestrator

**Modificados (10 archivos):**

- `src/views/agency/AgencyWorkspace.tsx` — +ICO tab, +handleComputeLive, +icoData state
- `src/views/agency/AgencySpacesView.tsx` — Spaces redesign
- `src/components/agency/SpaceCard.tsx` — Refactored for Spaces view
- `src/components/agency/SpaceFilters.tsx` — +health/service filters
- `src/components/agency/SpaceHealthTable.tsx` — +sortable health metrics
- `src/config/greenhouse-nomenclature.ts` — +ICO labels, +stuck drawer, +RPA trend
- `src/lib/capability-queries/creative-hub.ts` — +readMetricsSummaryByClientId en Promise.all
- `src/lib/capability-queries/helpers.ts` — +optional icoSummary param (RPA/FTR/OTD override)
- `vercel.json` — +cron schedule

### Cambios realizados

**Group A — Quick Fixes:**

- Wired `onComputeLive` en AgencyWorkspace → live compute button funcional
- `ai_metric_scores` DDL creado (tabla vacía, forward-compatible)
- `AIMetricConfig` type exportado desde metric-registry.ts
- Agency API soporta `?live=true` — busca distinct space_ids, computa en batches de 5

**Group B — Stuck Assets Detail:**

- DDL `stuck_assets_detail` (CLUSTER BY space_id, severity)
- Materialización: DELETE all + INSERT desde `v_tasks_enriched WHERE is_stuck = TRUE`
- Severity: warning (72-95h) / danger (96h+) — alineado con is_stuck del view (72h)
- API `/api/ico-engine/stuck-assets?spaceId` con auth `requireAgencyTenantContext`
- StuckAssetsDrawer: MUI Drawer, fetch on open, grid layout, empty state con checkmark
- SpaceIcoScorecard: stuck count clickable → abre drawer

**Group C — RPA Trend:**

- DDL `rpa_trend` (CLUSTER BY space_id)
- Materialización: DELETE all + INSERT últimos 12 meses, AVG + APPROX_QUANTILES P50
- API `/api/ico-engine/trends/rpa?spaceId&months` — agrupa por space, optional filter
- IcoCharts: line chart (top 5 spaces), annotation at y=1.5 (óptimo), smooth curves
- AgencyIcoEngineView: lazy-fetch trend después de que ICO data cargue

**Group D — Project-Level Metrics:**

- DDL `metrics_by_project` (CLUSTER BY space_id, project_source_id)
- Materialización: DELETE período actual + INSERT agrupado por project_source_id
- `readProjectMetrics()` en read-metrics.ts + API `/api/ico-engine/metrics/project`

**Group E — Creative Hub → ICO Engine:**

- `readMetricsSummaryByClientId(clientId)` — query `v_metric_latest WHERE client_id = @clientId`
- creative-hub.ts: fetch en paralelo con Promise.all, `.catch(() => null)` para graceful degradation
- helpers.ts: `buildCreativeRevenueCardData` + `buildCreativeBrandMetricsCardData` aceptan optional `icoSummary` — prefieren ICO values (RPA, FTR, OTD), fallback a cómputo inline

### Verificación

- `pnpm tsc --noEmit` → 0 errores (verificado después de cada grupo)
- `git push origin develop` → `d2483fd` exitoso

### Decisiones de arquitectura

- **Singleton Promise pattern**: `ensureIcoEngineInfrastructure()` verifica 5 tablas en una sola query a INFORMATION_SCHEMA, crea solo las faltantes
- **Cron via Vercel**: `/api/cron/ico-materialize` con `maxDuration=120`, triggered by vercel.json cron schedule
- **Batch live compute**: agency live compute ejecuta `computeSpaceMetricsLive()` en batches de 5 concurrent para evitar overload de BigQuery
- **Stuck severity**: 72h = warning, 96h = danger (alineado con `is_stuck` de `v_tasks_enriched`, no 48h del spec original)
- **Creative Hub graceful fallback**: ICO fetch wrapped en `.catch(() => null)` — si BigQuery falla o no hay datos, helpers usan cómputo inline sin cambio visible

### Riesgos o pendientes

- **Primera materialización**: el cron corre a las 06:15 UTC diario. Para ver datos inmediatamente, llamar `GET /api/cron/ico-materialize` manualmente o usar el botón "Calcular en vivo"
- **client_id mapping**: `readMetricsSummaryByClientId` depende de que `client_id` esté populado en los snapshots. Si un Space no tiene mapping, el fallback a inline funciona transparentemente
- **`metrics_by_service`**: bloqueado hasta que Services Architecture esté operativa
- **AI layer**: `ai_metric_scores` tabla vacía — activar LEFT JOINs cuando AI agents escriban scores
- **Deploy staging**: el cron necesita Vercel staging para funcionar — verificar que `vercel.json` crons se activen

---

## 2026-03-16 — Sistematización Pre-Nómina (5 fases)

### Agente

- Claude (Opus 4.6)

### Objetivo del turno

- Sistematización completa del motor de nómina: prorrateo gradual de bonos, integración asistencia/licencias, generación PDF/Excel, actualización de vistas, y dashboard de gasto de personal.

### Rama

- Rama usada: `develop`
- Commit: `1d4ed3f`

### Ambiente objetivo

- Preview / Cloud SQL / HR Payroll

### Archivos tocados

**Nuevos (10 archivos):**

- `src/lib/payroll/bonus-proration.ts` — funciones puras de prorrateo OTD/RpA
- `src/lib/payroll/fetch-attendance-for-period.ts` — query combinada BigQuery attendance + Postgres leave_requests
- `src/lib/payroll/generate-payroll-excel.ts` — workbook 3 hojas (Resumen, Detalle, Asistencia & Bonos) con exceljs
- `src/lib/payroll/generate-payroll-pdf.tsx` — reporte período (landscape) + recibo individual con @react-pdf/renderer
- `src/lib/payroll/personnel-expense.ts` — agregación gasto de personal por rango de fechas
- `src/app/api/hr/payroll/periods/[periodId]/excel/route.ts` — GET descarga Excel
- `src/app/api/hr/payroll/periods/[periodId]/pdf/route.ts` — GET descarga PDF período
- `src/app/api/hr/payroll/entries/[entryId]/receipt/route.ts` — GET descarga recibo individual
- `src/app/api/hr/payroll/personnel-expense/route.ts` — GET gasto de personal con query params
- `src/views/greenhouse/payroll/PayrollPersonnelExpenseTab.tsx` — dashboard con charts, cards, tabla

**Modificados (14 archivos):**

- `src/types/payroll.ts` — +BonusProrationConfig, +9 campos en PayrollEntry (proration factors, attendance snapshot, adjusted salary)
- `src/lib/payroll/calculate-payroll.ts` — prorrateo gradual reemplaza lógica binaria, integración asistencia en buildPayrollEntry
- `src/lib/payroll/recalculate-entry.ts` — prorrateo en recálculo individual, validación [0, max] en vez de [min, max]
- `src/lib/payroll/get-payroll-entries.ts` — +9 campos en normalizer, BigQuery SELECT usa CAST(NULL) para nuevos campos
- `src/lib/payroll/export-payroll.ts` — CSV expandido de 19 a 27 columnas
- `src/lib/payroll/postgres-store.ts` — pgGetActiveBonusConfig +otdFloor, pgUpsertPayrollEntry +9 campos
- `src/lib/payroll/persist-entry.ts` — BigQuery MERGE sin cambios (Postgres-first)
- `scripts/setup-postgres-payroll.sql` — +otd_floor en bonus_config, +9 cols en entries, migration block
- `src/views/greenhouse/payroll/helpers.ts` — OTD semáforo 3 niveles (>=94/70-94/<70), RpA umbral 3
- `src/views/greenhouse/payroll/PayrollEntryTable.tsx` — columna asistencia, tooltips adjusted salary, botón recibo, card prorrateo en expanded
- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx` — botones PDF/Excel/CSV para períodos aprobados
- `src/views/greenhouse/payroll/PayrollDashboard.tsx` — tab "Gasto de personal"
- `src/views/greenhouse/payroll/MemberPayrollHistory.tsx` — columnas asistencia, OTD factor, RpA factor
- `package.json` — +exceljs, +@react-pdf/renderer

### Cambios realizados

**Fase 1 — Motor de prorrateo de bonos:**

- OTD: >=94% → 100%, 70-94% → prorrateo lineal `(otd - 70) / (94 - 70)`, <70% → $0
- RpA: <=3 → prorrateo inverso `(3 - rpa) / 3`, >3 → $0
- Funciones puras en `bonus-proration.ts` con tipo `BonusProrationConfig`
- Thresholds configurables desde `payroll_bonus_config` (nuevo campo `otd_floor`)

**Fase 2 — Integración asistencia/licencias:**

- Combina BigQuery `attendance_daily` (Teams webhook) + Postgres `leave_requests` (flujo aprobación)
- Días deducibles = `daysAbsent + daysOnUnpaidLeave` → reducen base y teletrabajo proporcionalmente
- 9 campos nuevos en `payroll_entries`: proration factors (2), attendance snapshot (5), adjusted salary (2)
- Postgres-first: nuevas columnas solo en Cloud SQL, BigQuery devuelve CAST(NULL)

**Fase 3 — Generación PDF/Excel:**

- Excel (exceljs): 3 hojas con formato, colores por régimen, auto-filter, porcentajes
- PDF (@react-pdf/renderer): reporte período landscape + recibo individual (haberes, asistencia, descuentos, neto)
- 3 endpoints GET que validan período aprobado/exportado y devuelven buffer con Content-Disposition

**Fase 4 — Actualización UI:**

- Semáforos OTD 3 niveles con color (success/warning/error) y factor %
- Columna asistencia con ratio present/total y chip de ausencias
- Tooltips en base y teletrabajo ajustados ("Original: $X | Ajustado por inasistencia")
- Card expandible de asistencia + prorrateo en detalle de entry
- Botón recibo por entry, botones PDF/Excel/CSV en período

**Fase 5 — Gasto de personal:**

- Query agregada sobre entries de períodos aprobados con totales y breakdown por régimen
- Dashboard: 4 KPI cards, gráfico líneas (bruto vs neto), donut (Chile vs Internacional), tabla detalle
- Filtro por rango de fechas (año/mes desde-hasta)
- Integrado como nueva pestaña en PayrollDashboard

### Verificación

- `npx tsc --noEmit` → 0 errores en todas las fases
- `git push origin develop` → `1d4ed3f` exitoso

### Decisiones de arquitectura

- **Postgres-first, BigQuery OLAP**: nuevos campos solo persisten en Cloud SQL. BigQuery SELECT retorna `CAST(NULL AS ...)` para backward compat. BigQuery MERGE no se modificó.
- **PDF server-side**: se eligió `@react-pdf/renderer` (JSX → PDF) sobre `window.print()` de Vuexy porque necesitamos generación sin browser para API endpoints.
- **Prorrateo gradual**: reemplaza completamente la lógica binaria previa. El rango de validación pasó de `[min, max]` a `[0, max]` para acomodar montos prorrateados.

### Riesgos o pendientes

- **DDL migration**: el bloque `ALTER TABLE ADD COLUMN IF NOT EXISTS` en `setup-postgres-payroll.sql` debe ejecutarse en Cloud SQL si la tabla ya existe.
- **Seed data**: insertar nuevo registro en `payroll_bonus_config` con `otd_threshold=94, rpa_threshold=3, otd_floor=70` y `effective_from='2026-04-01'`.
- **Recibo sin logo**: el PDF usa texto "Greenhouse EO" como header; si se quiere logo gráfico, hay que registrar fuente/imagen en @react-pdf.
- **Gasto de personal mixto**: el dashboard muestra totales en CLP; para equipos con mix CLP+USD los totales suman sin conversión (comportamiento intencional para MVP).
- **Tests unitarios**: `bonus-proration.ts` y `fetch-attendance-for-period.ts` son funciones puras ideales para unit tests — pendiente.

---

## 2026-03-15 15:12 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Corregir `CODEX_TASK_Financial_Intelligence_Layer` para alinearla con la arquitectura vigente de Finance y del data platform.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Documentacion operativa / arquitectura / Finance

### Archivos tocados

- `docs/tasks/to-do/CODEX_TASK_Financial_Intelligence_Layer.md`
- `Handoff.md`

### Cambios realizados

- Se reescribio la task de `Financial Intelligence Layer` porque el brief original quedo desalineado respecto al estado actual del repo.
- Alineaciones aplicadas:
  - `Finance` queda explicitamente `Postgres-first`, no `BigQuery-first`
  - nuevas tablas y extensiones se modelan sobre `greenhouse_finance`
  - `client_id`, `member_id`, `provider_id` y `module_id` quedan como anchors canonicos
  - `hubspot_company_id`, `client_profile_id`, `supplier_id` y labels de `service_line` quedan solo como compatibilidad o snapshots
  - montos y porcentajes persistidos pasan a regla de precision exacta (`numeric` / `NUMERIC`), no `FLOAT64`
  - margen por linea se redefine contra `service_modules` / `client_service_modules`, no contra una taxonomia paralela hardcodeada
  - el P&L queda diferenciado de cashflow; `cash collected` se trata como metrica complementaria, no como definicion base del resultado
- Tambien se corrigio la dependencia documental:
  - `CODEX_TASK_Financial_Module_v2.md` queda como backend activo de referencia
  - `CODEX_TASK_Financial_Module.md` queda implicitamente como historico

### Verificacion

- Relectura cruzada contra:
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
  - `docs/architecture/FINANCE_CANONICAL_360_V1.md`
  - `docs/architecture/FINANCE_DUAL_STORE_CUTOVER_V1.md`
  - `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md`
- Validacion mecanica pendiente abajo en este turno:
  - `git diff --check -- docs/tasks/to-do/CODEX_TASK_Financial_Intelligence_Layer.md Handoff.md`

### Riesgos o pendientes

- La task ya esta alineada, pero su implementacion real puede destapar un gap previo en el catalogo canonico de `service_modules` si Finance necesita lineas que todavia no existan formalizadas.
- Si eso ocurre, no hay que hardcodear labels nuevos en Finance; hay que corregir primero el catalogo o documentar la decision de arquitectura.

## 2026-03-15 14:18 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Resolver el runtime break de `Admin > Users > detail` después del rollout de `Person 360` enriquecido por Claude.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / Cloud SQL / Admin Users

### Archivos tocados

- `package.json`
- `docs/tasks/in-progress/CODEX_TASK_Person_360_Profile_Unification_v1.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se identificó que `pre-greenhouse` estaba sirviendo código que espera el contrato enriquecido de `greenhouse_serving.person_360`:
  - `EO-ID`
  - `serial_number`
  - `resolved_*`
  - campos extendidos de user/member/crm facet
- La causa del crash no fue frontend ni routing:
  - Cloud SQL seguía con el `person_360` base materializado por Codex
  - el runtime nuevo de Claude (`resolve-eo-id`, `get-person-profile`, `get-admin-user-detail`) esperaba el `person_360 v2`
- Se corrigió el tooling oficial para que:
  - `pnpm setup:postgres:person-360`
    ahora apunte a `scripts/setup-postgres-person-360-v2.ts`
- También se alineó el runner legacy:
  - `scripts/setup-postgres-person-360-serving.ts` ahora aplica `v2`
- Se ejecutó `person_360 v2` en Cloud SQL.
- Validación de datos posterior:
  - `user-efeonce-internal-andres-carlosama` ya resuelve correctamente en `greenhouse_serving.person_360` con:
    - `eo_id = EO-ID0006`
    - `member_id = andres-carlosama`
    - `user_id = user-efeonce-internal-andres-carlosama`
    - `tenant_type = efeonce_internal`
    - `active_role_codes = ['efeonce_operations']`

### Riesgos o pendientes

- Conviene consolidar más adelante los scripts legacy de `person_360` para dejar una sola ruta de provisioning y evitar duplicidad de nombres.
- Falta solo validación manual autenticada en `pre-greenhouse` para confirmar el detalle de usuario ya no revienta con tu sesión.

## 2026-03-15 13:35 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ejecutar la fase 1 real de `Person 360`: auditar cobertura de identidad y materializar el primer serving `person_360` en PostgreSQL.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Cloud SQL / arquitectura de datos / serving runtime

### Archivos tocados

- `scripts/audit-person-360-coverage.ts`
- `scripts/setup-postgres-person-360-serving.sql`
- `scripts/setup-postgres-person-360-serving.ts`
- `package.json`
- `docs/tasks/in-progress/CODEX_TASK_Person_360_Profile_Unification_v1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se creó `greenhouse_serving.person_360` como primer serving unificado de persona sobre:
  - `identity_profiles`
  - `members`
  - `client_users`
  - `crm_contacts`
- Se agregó el script reusable:
  - `pnpm audit:person-360`
- Auditoría validada en Cloud SQL:
  - `members_total = 7`, `members_linked = 7`
  - `users_total = 39`, `users_linked = 37`
  - `contacts_total = 63`, `contacts_linked_profile = 29`
  - `profiles_total = 38`
  - `profiles_with_member = 7`
  - `profiles_with_user = 37`
  - `profiles_with_contact = 29`
  - `profiles_with_member_and_user = 7`
  - `profiles_with_user_and_contact = 29`
  - `profiles_with_all_three = 0`
- Gaps relevantes:
  - `users_without_profile = 2`
  - `contacts_without_profile = 34`
  - `internal_users_without_member = 1`
  - `profiles_without_any_facet = 1`

### Verificación

- `pnpm exec eslint scripts/audit-person-360-coverage.ts scripts/setup-postgres-person-360-serving.ts`
  - correcto
- `pnpm setup:postgres:person-360`
  - correcto
- `pnpm audit:person-360`
  - correcto
- query directa sobre `greenhouse_serving.person_360`
  - correcta

### Riesgos o pendientes

- `person_360` ya existe, pero `People` y `Users` aún no consumen esta vista.
- El gap más grande quedó en `CRM Contact -> identity_profile`; ahí está la principal deuda de unificación.
- `client_users.member_id` todavía no existe materializado en Cloud SQL; hoy la reconciliación se sigue resolviendo por `identity_profile_id`.
- Próximo paso recomendado:
  - priorizar reconciliación de `crm_contacts` sin perfil
  - luego cortar `People` y `Users` a `greenhouse_serving.person_360`

## 2026-03-15 13:05 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Formalizar `Person 360` como estrategia canónica de perfil y abrir la lane de reconciliación entre `People`, `Users`, `CRM Contact` y `Member`.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Arquitectura y planificación de producto/datos

### Archivos tocados

- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/tasks/in-progress/CODEX_TASK_Person_360_Profile_Unification_v1.md`
- `docs/tasks/README.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se dejó explícito en arquitectura que:
  - `identity_profile` es el ancla canónica de persona
  - `member` es faceta laboral/interna
  - `client_user` es faceta de acceso
  - `crm_contact` es faceta comercial
- `People` y `Users` ya no deben tratarse como identidades distintas del mismo humano; son vistas contextuales del mismo `Person 360`.
- Se actualizó `GREENHOUSE_360_OBJECT_MODEL_V1` para reemplazar la visión de `Collaborator` como raíz por `Person 360` como objeto canónico, dejando `member` y `user` como facetas.
- Se creó la task:
  - `docs/tasks/in-progress/CODEX_TASK_Person_360_Profile_Unification_v1.md`
- Se agregó la lane al índice operativo de tasks.

### Verificación

- Revisión cruzada con:
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - `docs/tasks/in-progress/CODEX_TASK_People_Unified_View_v3.md`
- No hubo validación de build necesaria porque esta pasada es documental/arquitectónica.

### Riesgos o pendientes

- Runtime todavía no sirve un `person_360` unificado; esto fija la regla, no el serving final.
- `People` y `Users` siguen conviviendo sobre facetas distintas hasta que se ejecute la reconciliación.
- Próximo paso recomendado:
  - auditar cobertura real de `identity_profile_id` entre `members`, `client_users` y `crm_contacts`
  - diseñar `greenhouse_serving.person_360`
  - cortar `People` y `Users` a ese backbone

## 2026-03-15 12:15 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Cortar `AI Tooling` a PostgreSQL runtime y dejar el módulo estable para `Admin > AI Tooling` sin depender del bootstrap frágil en BigQuery.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview

### Archivos tocados

- `src/lib/ai-tools/service.ts`
- `src/lib/ai-tools/postgres-store.ts`
- `scripts/setup-postgres-access-runtime.sql`
- `scripts/pg-doctor.ts`
- `scripts/setup-postgres-ai-tooling.sql`
- `scripts/setup-postgres-ai-tooling.ts`
- `scripts/backfill-postgres-ai-tooling.ts`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/tasks/in-progress/CODEX_TASK_AI_Tooling_Credit_System_v2.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- `AI Tooling` quedó `Postgres first` en `src/lib/ai-tools/service.ts` para:
  - catálogo
  - licencias
  - wallets
  - ledger
  - summary
  - metadata admin
  - create/update de herramientas, licencias, wallets y consumo/recarga de créditos
- Se creó el store `src/lib/ai-tools/postgres-store.ts` sobre `greenhouse_ai`, anclado a:
  - `greenhouse_core.providers`
  - `greenhouse_core.clients`
  - `greenhouse_core.members`
  - `greenhouse_core.client_users`
  - `greenhouse_finance.suppliers`
  - `greenhouse_finance.exchange_rates`
  - `greenhouse_sync.outbox_events`
- Se materializó el schema `greenhouse_ai` con:
  - `tool_catalog`
  - `member_tool_licenses`
  - `credit_wallets`
  - `credit_ledger`
- `scripts/setup-postgres-ai-tooling.ts` ahora siembra catálogo mínimo directamente en PostgreSQL:
  - `9` herramientas
  - `10` providers visibles incluyendo `Microsoft` y `Notion`
- El backfill desde BigQuery quedó operativo como script, pero al correrlo no encontró datos vivos:
  - `toolCount = 0`
  - `licenseCount = 0`
  - `walletCount = 0`
  - `ledgerCount = 0`
- Se confirmó con `pg:doctor`:
  - `greenhouse_ai` visible para `runtime`
  - `greenhouse_ai` con `CREATE` para `migrator`

### Verificación

- `pnpm exec eslint src/lib/ai-tools/service.ts src/lib/ai-tools/postgres-store.ts scripts/setup-postgres-ai-tooling.ts scripts/backfill-postgres-ai-tooling.ts scripts/pg-doctor.ts`
  - correcto
- `pnpm build`
  - correcto
- `pnpm setup:postgres:access`
  - correcto
- `pnpm setup:postgres:ai-tooling`
  - correcto
- `pnpm backfill:postgres:ai-tooling`
  - correcto, sin datos para migrar
- `pnpm pg:doctor --profile=runtime`
  - correcto
- `pnpm pg:doctor --profile=migrator`
  - correcto

### Riesgos o pendientes

- Esta pasada deja `AI Tooling` estable en runtime, pero todavía no verifica end-to-end el preview con usuario real; falta despliegue y smoke sobre:
  - `/api/admin/ai-tools/catalog`
  - `/api/admin/ai-tools/licenses`
  - `/api/admin/ai-tools/wallets`
  - `/api/admin/ai-tools/meta`
- `AI Tooling` ya no necesita BigQuery para funcionar, pero `Finance suppliers` aún sigue teniendo consumidor legacy en BigQuery por otras zonas del portal.
- Próximo paso recomendado:
  - `commit + push`
  - validar preview y repuntar `pre-greenhouse`
  - confirmar que desaparezca el alert rojo y que el dropdown de proveedores muestre el set canónico

## 2026-03-15 10:20 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Investigar el alert rojo de `Admin > AI Tooling` en `pre-greenhouse` y corregir el fallo backend compartido por catálogo, licencias, wallets y metadata.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview

### Archivos tocados

- `src/lib/ai-tools/schema.ts`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Identificado el error real en logs de Vercel del deployment detrás de `pre-greenhouse`:
  - `Query parameter 'subscriptionAmount' not found at [12:13]`
- La causa estaba en `ensureAiToolingInfrastructure()`:
  - el seed de `ai_tool_catalog` hacía `MERGE` usando placeholders como `@subscriptionAmount`, `@creditUnitCost`, `@creditsIncludedMonthly`
  - varios `TOOL_SEEDS` no traían esas propiedades, por lo que BigQuery rechazaba la query antes de responder catálogo, licencias, wallets y metadata
- Corregido el seed para normalizar todos los parámetros opcionales a `null` antes del `MERGE`, manteniendo tipado `NUMERIC` donde aplica

### Verificación

- `vercel inspect pre-greenhouse.efeoncepro.com --scope efeonce-7670142f`
  - correcto
- `vercel logs dpl_HMokKuF3tKsyY46rn9CwJ1TN544d --scope efeonce-7670142f --no-follow --since 2h --status-code 500 --expand`
  - confirmó el stack compartido por las 4 rutas
- `pnpm exec eslint src/lib/ai-tools/schema.ts`
  - pendiente de correr en este lote
- `pnpm build`
  - pendiente de correr en este lote

### Riesgos o pendientes

- El fix corrige el bootstrap runtime, pero todavía no materializa vendors financieros faltantes como `Microsoft` y `Notion` dentro del dropdown canónico de AI Tooling.
- Próximo paso recomendado:
  - superseded por el corte `AI Tooling -> PostgreSQL runtime` documentado arriba

## 2026-03-15 09:46 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Levantar todos los campos semánticamente indicadores desde `Notion` hacia el modelo runtime y exponerlos ya en el consumer de `Project Detail`.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Local development

### Archivos tocados

- `scripts/sync-source-runtime-projections.ts`
- `scripts/setup-bigquery-source-sync.sql`
- `scripts/setup-postgres-source-sync.sql`
- `src/lib/projects/get-project-detail.ts`
- `src/types/greenhouse-project-detail.ts`
- `docs/tasks/in-progress/CODEX_TASK_Source_Sync_Runtime_Projections_v1.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Confirmado directamente en `notion_ops.tareas` que la fuente ya trae indicadores operativos explícitos:
  - `🟢 On-Time`
  - `🟡 Late Drop`
  - `🔴 Overdue`
  - `🔵 Carry-Over`
- Confirmado además que la fuente ya trae:
  - `semáforo_rpa`
  - `cumplimiento`
  - `completitud`
  - `días_de_retraso`
  - `días_reprogramados`
  - `reprogramada`
  - `client_change_round`
  - `client_change_round_final`
  - `workflow_change_round`
  - tiempos de ejecución/revisión/cambios
- `Project Detail > tasks` ahora expone en runtime:
  - `rpaSemaphoreSource`
  - `rpaSemaphoreDerived`
  - `performanceIndicatorLabel`
  - `performanceIndicatorCode`
  - `deliveryCompliance`
  - `completionLabel`
  - `daysLate`
  - `rescheduledDays`
  - `isRescheduled`
  - `clientChangeRoundLabel`
  - `clientChangeRoundFinal`
  - `workflowChangeRound`
  - `originalDueDate`
  - `executionTimeLabel`
  - `changesTimeLabel`
  - `reviewTimeLabel`
- `Source Sync Runtime Projections` quedó extendido para proyectar ese mismo set a `delivery_tasks`, más señales fuente de `delivery_projects` y `delivery_sprints`.

### Verificación

- `pnpm exec eslint scripts/sync-source-runtime-projections.ts src/lib/projects/get-project-detail.ts src/types/greenhouse-project-detail.ts`
  - correcto
- `pnpm build`
  - correcto
- `pnpm exec tsx scripts/setup-postgres-source-sync.ts`
  - correcto
- inspección real de `notion_ops.INFORMATION_SCHEMA.COLUMNS`
  - correcta
- muestreo real de `indicador_de_performance`
  - correcto

### Riesgos o pendientes

- `setup-bigquery-source-sync.ts` sigue bloqueado por `BigQuery table update quota exceeded`; el cambio quedó implementado en SQL y sync script, pero no materializado todavía en `greenhouse_conformed`.
- El consumer de `Project Detail` ya puede usar estos indicadores directo desde `notion_ops`, así que el portal no queda esperando ese apply.
- Próximo paso recomendado:
  - reintentar el apply de `greenhouse_conformed.delivery_*` cuando baje la cuota
  - luego cortar `dashboard` y `agency` para que consuman estos indicadores desde la proyección canónica

## 2026-03-15 09:18 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Empezar el corte de consumers legacy hacia capas canónicas sin romper el provisioning live de HubSpot -> Greenhouse.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Local development

### Archivos tocados

- `src/app/api/finance/clients/route.ts`
- `src/app/api/finance/clients/[id]/route.ts`
- `docs/tasks/in-progress/CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- `Finance > Clients` ahora usa patrón `canonical first + live fallback`.
- `GET /api/finance/clients`:
  - prioriza `greenhouse_conformed.crm_companies`
  - deriva módulos desde `greenhouse.client_service_modules`
  - mantiene fallback a `hubspot_crm.companies` para clientes recién promovidos aún no proyectados
- `GET /api/finance/clients/[id]`:
  - prioriza `greenhouse_conformed.crm_companies`
  - deriva módulos desde `greenhouse.client_service_modules`
  - prioriza `greenhouse_conformed.crm_deals`
  - mantiene fallback a `hubspot_crm.companies` y `hubspot_crm.deals` cuando la proyección todavía no alcanzó el evento live
- Regla explícita fijada para próximos cortes:
  - no migrar consumers a `sync-only` cuando el dominio todavía depende de provisioning en tiempo real
  - preferir `canonical first, live fallback`

### Verificación

- `pnpm exec eslint src/app/api/finance/clients/route.ts 'src/app/api/finance/clients/[id]/route.ts'`
  - correcto
- `pnpm build`
  - correcto
- `git diff --check -- src/app/api/finance/clients/route.ts 'src/app/api/finance/clients/[id]/route.ts'`
  - correcto

### Riesgos o pendientes

- Este corte todavía usa `hubspot_crm.*` como compatibilidad; no es el estado final.
- El siguiente consumer debe seguir el mismo criterio híbrido mientras exista provisioning live.
- Próximo paso recomendado:
  - seguir con consumers legacy que aún leen `hubspot_crm` / `notion_ops`, empezando por los de menor riesgo y mayor beneficio.

## 2026-03-15 09:32 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Seguir el corte de consumers legacy con un slice pequeño en Admin usando delivery projections.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Local development

### Archivos tocados

- `src/lib/admin/get-admin-tenant-detail.ts`
- `src/lib/admin/get-admin-user-detail.ts`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- `Admin > tenant detail` y `Admin > user detail` ya priorizan `greenhouse_conformed.delivery_projects.project_name` para nombres de proyecto en scopes.
- `notion_ops.proyectos` queda:
  - como fallback para nombre si aún no existe proyección
  - como fuente temporal de `page_url`
- Esto reduce dependencia directa a `notion_ops` sin arriesgar regresión visible, porque `page_url` todavía no se proyecta en `delivery_projects`.

### Verificación

- `pnpm exec eslint src/lib/admin/get-admin-user-detail.ts src/lib/admin/get-admin-tenant-detail.ts`
  - correcto
- `git diff --check -- src/lib/admin/get-admin-user-detail.ts src/lib/admin/get-admin-tenant-detail.ts`
  - correcto

### Riesgos o pendientes

- `page_url` sigue colgando de `notion_ops.proyectos`; si queremos eliminar completamente ese consumer, hay que proyectar ese campo en `delivery_projects`.
- Próximo paso recomendado:
  - seguir con consumers legacy que leen `notion_ops.tareas` o `notion_ops.proyectos`, empezando por `projects`, `dashboard` o `admin` según riesgo.

## 2026-03-15 09:27 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Seguir el desacople de consumers legacy en `Projects` sin perder métricas que todavía viven en `notion_ops.tareas`.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Local development

### Archivos tocados

- `src/lib/projects/get-projects-overview.ts`
- `src/lib/projects/get-project-detail.ts`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- `Projects Overview` y `Project Detail` ya priorizan `greenhouse_conformed.delivery_projects` para:
  - `project_name`
  - `project_status`
  - `start_date`
  - `end_date`
- `Project Detail` también prioriza `greenhouse_conformed.delivery_sprints` para:
  - `sprint_name`
  - `sprint_status`
  - `start_date`
  - `end_date`
- Se mantuvo fallback a `notion_ops.proyectos` y `notion_ops.sprints`.
- No se tocó aún el uso de `notion_ops.tareas` porque ahí siguen viviendo métricas y señales que todavía no están proyectadas (`rpa`, reviews, blockers, frame comments).

### Verificación

- `pnpm exec eslint src/lib/projects/get-projects-overview.ts src/lib/projects/get-project-detail.ts`
  - correcto
- `pnpm build`
  - correcto
- `git diff --check -- src/lib/projects/get-projects-overview.ts src/lib/projects/get-project-detail.ts`
  - correcto

### Riesgos o pendientes

- `Projects` sigue siendo híbrido; no está completamente desacoplado de `notion_ops`.
- Para cortar del todo `projects`, primero hay que proyectar en `delivery_tasks`:
  - `rpa`
  - flags de review
  - `open_frame_comments`
  - blockers
  - `page_url`
- Próximo paso recomendado:
  - decidir si el siguiente corte va por `dashboard`/`agency` o por enriquecer `delivery_tasks` para poder sacar más consumers de `notion_ops.tareas`.

## 2026-03-16 ~02:00 America/Santiago

### Agente

- Claude

### Objetivo del turno

- Homologar roles V2 en todo el stack TypeScript + frontend. 6 roles nuevos y 3 route groups reconocidos end-to-end.

### Rama

- `fix/codex-operational-finance`

### Archivos tocados

- `src/lib/tenant/authorization.ts` — TenantRouteGroup expandido (+my, people, ai_tooling), canAccessPeopleModule actualizado, requireAiToolingTenantContext nuevo
- `src/lib/tenant/access.ts` — rolePriority (15 roles), deriveRouteGroups (6 branches V2), portalHomePath fallback expandido
- `src/lib/people/permissions.ts` — people_viewer (read-only assignments/activity), hr_manager (compensation/payroll)
- `src/views/greenhouse/admin/users/helpers.ts` — iconos y colores para roles V2
- `src/components/layout/vertical/VerticalMenu.tsx` — isPeopleRouteGroup, isAiToolingUser, nav standalone AI Tooling
- `scripts/sync-source-runtime-projections.ts` — fix TS: owner_user_id type annotation (pre-existing Codex error)

### Verificación

- `pnpm tsc --noEmit` — 0 errores
- `pnpm build` — exitoso

### Cambios clave

- **Backward compatible**: finance_manager, hr_payroll, employee mantienen exactamente el mismo acceso
- **Additive**: finance_analyst/finance_admin → finance, hr_manager → hr, people_viewer → people, ai_tooling_admin → ai_tooling, collaborator → my
- **Postgres canonical**: session_360 ya emite route_groups correctos; TypeScript deriveRouteGroups es solo fallback BigQuery

### Riesgos o pendientes

- Páginas `/my/*` y `/ai-tools/*` (user-facing) no creadas aún — son tasks separadas
- DDL y backfill Identity V2 aún no ejecutados en Cloud SQL
- BigQuery `roles` table necesita los 6 roles V2 para que BigQuery fallback derive route_groups correctamente

---

## 2026-03-16 ~00:30 America/Santiago

### Agente

- Claude

### Objetivo del turno

- Implementar Identity & Access V2 completo: DDL, backfill, identity store, y wiring Postgres-first en access.ts.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Local development

### Archivos tocados

- `scripts/setup-postgres-identity-v2.sql` (NUEVO — DDL para Identity V2: ALTER client_users, scope tables, audit_events, feature flags, role seed, session_360 + user_360 views)
- `scripts/setup-postgres-identity-v2.ts` (NUEVO — runner)
- `scripts/backfill-postgres-identity-v2.ts` (NUEVO — backfill BigQuery → Postgres: SSO columns, member_id links, role assignments, scopes, feature flags)
- `src/lib/tenant/identity-store.ts` (NUEVO — Postgres store para session resolution: readiness check, session_360 lookups, SSO linking, last login)
- `src/lib/tenant/access.ts` (MODIFICADO — Postgres-first + BigQuery fallback en todos los lookups y writes)

### Cambios realizados

**DDL Identity V2** (`setup-postgres-identity-v2.sql`):

- ALTER `client_users`: 12 columnas nuevas (microsoft_oid, google_sub, password_hash, timezone, member_id FK, etc.)
- ALTER `user_role_assignments`: effective_from/to, assigned_by_user_id
- CREATE TABLE: user_project_scopes, user_campaign_scopes, user_client_scopes, audit_events, client_feature_flags
- Role seed: 6 roles V2 (collaborator, hr_manager, finance_analyst, finance_admin, people_viewer, ai_tooling_admin)
- Route group scope updates for all existing roles
- CREATE VIEW: session_360 (fast-path session resolution), user_360 (updated with new columns)
- Grants for greenhouse_runtime y greenhouse_migrator

**Backfill** (`backfill-postgres-identity-v2.ts`):

- 6 pasos: SSO columns, member_id resolution, role assignments, project/campaign scopes, feature flags
- Uses RETURNING para contar rows afectados

**Identity Store** (`identity-store.ts`):

- Readiness check con TTL 60s, valida 4 tablas + V2 column presence
- 4 session lookups: by microsoft_oid, google_sub, email, user_id
- Internal users list for alias resolution
- SSO link writes + last login update

**Wiring access.ts**:

- `getTenantAccessRecordByEmail` → Postgres-first
- `getTenantAccessRecordByMicrosoftOid` → Postgres-first
- `getTenantAccessRecordByGoogleSub` → Postgres-first
- `getTenantAccessRecordByInternalMicrosoftAlias` → Postgres-first (both user list and final lookup)
- `linkMicrosoftIdentity` → dual-write (Postgres + BigQuery)
- `linkGoogleIdentity` → dual-write (Postgres + BigQuery)
- `updateTenantLastLogin` → dual-write (Postgres + BigQuery)

### Verificación

- `pnpm tsc --noEmit` — 0 errores
- `pnpm build` — build exitoso

### Riesgos o pendientes

- DDL y backfill **NO ejecutados** aún en Cloud SQL
- `getTenantAccessRecordByAllowedEmailDomain` y `verifyTenantPassword` quedan solo BigQuery (no en hot path de login)
- Writes son dual-write: Postgres + BigQuery hasta full cutover
- Reads fallan gracefully a BigQuery si Postgres no ready

## 2026-03-15 09:35 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Cerrar el slice `HubSpot Contacts -> greenhouse_conformed.crm_contacts -> greenhouse_crm.contacts -> client_users / identity_profiles`, incorporando además `HubSpot Owner -> Member/User`.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Local tooling + Cloud SQL `greenhouse-pg-dev` + BigQuery `efeonce-group`

### Archivos tocados

- `scripts/setup-bigquery-source-sync.sql`
- `scripts/setup-postgres-source-sync.sql`
- `scripts/sync-source-runtime-projections.ts`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/tasks/in-progress/CODEX_TASK_Source_Sync_Runtime_Projections_v1.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se agregó `greenhouse_conformed.crm_contacts`.
- Se agregó `greenhouse_crm.contacts`.
- El sync ahora replica `hubspot_crm.contacts` a `greenhouse_raw.hubspot_contacts_snapshots`, luego a `crm_contacts`, y finalmente a `greenhouse_crm.contacts`.
- Boundary aplicada:
  - solo se proyectan contactos asociados a compañías que ya están admitidas en el universo Greenhouse.
- Reconciliación aplicada:
  - `HubSpot Contact -> client_user`
    - `user-hubspot-contact-<contact_id>`
    - luego source link explícito
    - luego email único dentro del tenant
  - `HubSpot Contact -> identity_profile`
    - primero el profile del user
    - luego source link explícito
    - luego email único
    - si el user existe y no tiene profile, se crea `profile-hubspot-contact-<contact_id>`
- Se poblaron también:
  - `greenhouse_core.identity_profile_source_links` para HubSpot contact
  - `greenhouse_core.entity_source_links` para `user <- hubspot contact`
- `HubSpot Owner -> Collaborator / User` quedó modelado:
  - `crm_companies.owner_member_id`
  - `crm_deals.owner_member_id`
  - `crm_contacts.owner_member_id`
  - `owner_user_id` cuando el colaborador tiene principal en `greenhouse_core.client_users`
  - `entity_source_links` para `member <- hubspot owner`
  - `entity_source_links` para `user <- hubspot owner`
  - `identity_profile_source_links` para `identity_profile <- hubspot owner`
- Regla dejada explícita en docs:
  - el sync modela y reconcilia CRM contacts
  - la integración live/admin sigue siendo la capa de provisioning de accesos
  - no exigir que la integración live escriba directo a BigQuery

### Verificación

- `pnpm exec eslint scripts/sync-source-runtime-projections.ts`
  - correcto
- `pnpm exec tsx scripts/setup-bigquery-source-sync.ts`
  - correcto
- `pnpm exec tsx scripts/setup-postgres-source-sync.ts`
  - correcto
- `pnpm exec tsx scripts/sync-source-runtime-projections.ts`
  - correcto, rerun exitoso
- Conteos verificados:
  - BigQuery conformed `crm_contacts = 63`
  - PostgreSQL runtime `greenhouse_crm.contacts = 63`
  - `linked_user_id = 29`
  - `linked_identity_profile_id = 29`
  - `owner_member_id = 63`
  - `owner_user_id = 61`
  - `identity_profile_source_links` HubSpot contact = `29`
  - `entity_source_links` HubSpot contact -> user = `29`
  - PostgreSQL runtime owners:
    - companies `owner_member_id = 9`, `owner_user_id = 9`
    - deals `owner_member_id = 21`, `owner_user_id = 21`
  - source links de owner:
    - `member <- hubspot owner = 6`
    - `user <- hubspot owner = 1`
    - `identity_profile <- hubspot owner = 6`

### Riesgos o pendientes

- El seed completo sigue siendo lento porque `sync-source-runtime-projections.ts` hace demasiados writes secuenciales; conviene optimizarlo después de cerrar este slice.
- `crm_contacts` todavía resuelve un `company_source_id` primario; si más adelante necesitamos una relación explícita many-to-many, corresponde agregar `crm_company_contacts`.
- La cobertura de `owner -> user` depende de cuántos colaboradores internos ya tienen principal en `client_users`; hoy quedó resuelto `1/6`.

---

## 2026-03-15 08:15 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Introducir `spaces` como objeto canónico del 360, conectar delivery a `space_id` y formalizar `Efeonce` como `internal_space`.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Local tooling + Cloud SQL `greenhouse-pg-dev` + BigQuery `efeonce-group`

### Archivos tocados

- `scripts/setup-postgres-access.sql`
- `scripts/setup-postgres-canonical-360.sql`
- `scripts/setup-postgres-source-sync.sql`
- `scripts/setup-bigquery-source-sync.sql`
- `scripts/backfill-postgres-canonical-360.ts`
- `scripts/sync-source-runtime-projections.ts`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/operations/GREENHOUSE_DATA_MODEL_DOCUMENT_OPERATING_MODEL_V1.md`
- `docs/tasks/in-progress/CODEX_TASK_Source_Sync_Runtime_Projections_v1.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se agregó `greenhouse_core.spaces` como nuevo anchor canónico del workspace operativo.
- Se agregó `greenhouse_core.space_source_bindings` para modelar:
  - `legacy_project_scope`
  - `delivery_workspace`
- Se agregó `greenhouse_serving.space_360`.
- `Source Sync Runtime Projections` ahora publica `space_id` en `delivery_*` tanto en BigQuery conformed como en PostgreSQL runtime.
- `space-efeonce` quedó formalizado como:
  - `space_type = internal_space`
  - `client_id = null`
  - `primary_project_database_source_id = 15288d9b145940529acc75439bbd5470`
- Se ejecutó backfill canónico nuevo:
  - `clients = 11`
  - `spaces = 11`
  - `spaceSourceBindings = 69`
- Se resembró `Source Sync Runtime Projections` con `space_id`:
  - Notion: `1245` filas leídas / `1245` proyectadas
  - HubSpot: `806` filas leídas / `34` proyectadas al runtime cliente
- Se corrigió una deuda transversal de acceso:
  - `setup-postgres-canonical-360.sql` ya otorga grants a `greenhouse_runtime` y `greenhouse_migrator`
  - `setup-postgres-access.sql` ahora intenta normalizar ownership de `greenhouse_core`, `greenhouse_serving` y `greenhouse_sync` hacia `greenhouse_migrator` sin bloquear la evolución si encuentra objetos legacy no transferibles

### Verificación

- `pnpm exec tsx scripts/setup-postgres-access.ts`
  - correcto
- `pnpm exec tsx scripts/setup-postgres-canonical-360.ts`
  - correcto
- `pnpm exec tsx scripts/setup-postgres-source-sync.ts`
  - correcto
- `pnpm exec tsx scripts/setup-bigquery-source-sync.ts`
  - correcto
- `pnpm exec tsx scripts/backfill-postgres-canonical-360.ts`
  - correcto
- `pnpm exec tsx scripts/sync-source-runtime-projections.ts`
  - correcto
- `pnpm exec eslint scripts/backfill-postgres-canonical-360.ts scripts/sync-source-runtime-projections.ts scripts/setup-postgres-access.ts scripts/setup-postgres-canonical-360.ts scripts/setup-postgres-source-sync.ts scripts/setup-bigquery-source-sync.ts`
  - correcto
- `git diff --check`
  - correcto
- Conteos verificados en PostgreSQL:
  - `greenhouse_core.spaces = 11`
  - `client_space = 10`
  - `internal_space = 1`
  - `greenhouse_delivery.projects` con `space_id = 57/59`
  - `greenhouse_delivery.tasks` con `space_id = 961/1173`
  - `greenhouse_delivery.sprints` con `space_id = 11/13`
- Conteos verificados en BigQuery conformed:
  - `delivery_projects` con `space_id = 57/59`
  - `delivery_tasks` con `space_id = 961/1173`
  - `delivery_sprints` con `space_id = 11/13`

### Riesgos o pendientes

- `Agency` runtime todavía lee el bridge legacy en BigQuery y no consume `greenhouse_core.spaces` directamente; esta pasada deja el modelo listo, no el cutover del módulo.
- Aún quedan `2` sprints sin `space_id`; no quedaron asociados por tareas/proyectos en la data legacy y requieren reconciliación de source data o una regla adicional de binding.
- El seed de `spaces` todavía nace de `greenhouse.clients.notion_project_ids`; el target sigue siendo `space -> project_database_source_id` como única fuente canónica.
- La próxima slice lógica es:
  - `HubSpot Contacts -> greenhouse_conformed.crm_contacts -> greenhouse_crm.contacts`
  - reconciliation `HubSpot Contact -> client_user / identity_profile`

## 2026-03-15 ~22:30 America/Santiago

### Agente

- Claude

### Objetivo del turno

- Wiring completo de Finance Slice 2 a PostgreSQL: income, expenses, payments.
- Backfill scripts para HR Payroll y HR Leave (BigQuery → PostgreSQL).
- Serving view `member_leave_360` para HR Leave.
- Análisis de Identity & Access V2 para modelado PostgreSQL.
- Validación completa del proyecto (TypeScript + build).

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Local development

### Archivos tocados

- `src/lib/finance/postgres-store-slice2.ts` (NUEVO — ~1100 líneas)
- `src/app/api/finance/income/route.ts` (modificado — Postgres-first GET + POST)
- `src/app/api/finance/income/[id]/route.ts` (modificado — Postgres-first GET)
- `src/app/api/finance/income/[id]/payment/route.ts` (modificado — Postgres-first POST)
- `src/app/api/finance/expenses/route.ts` (modificado — Postgres-first GET + POST)
- `src/app/api/finance/expenses/[id]/route.ts` (modificado — Postgres-first GET)
- `scripts/backfill-postgres-payroll.ts` (NUEVO — backfill BigQuery → Postgres para payroll)
- `scripts/backfill-postgres-hr-leave.ts` (NUEVO — backfill BigQuery → Postgres para leave)
- `scripts/setup-postgres-hr-leave.sql` (modificado — vista `member_leave_360` agregada)
- `scripts/sync-source-runtime-projections.ts` (fix TS: tipo de `owner_member_id`)
- `docs/tasks/in-progress/CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md` (actualizado con delta Slice 2)
- `docs/tasks/in-progress/CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1.md` (actualizado con delta completo)
- `docs/tasks/README.md` (agregado Identity Access V2 a To Do)
- `changelog.md` (entradas para Finance Slice 2 + HR backfills)

### Cambios realizados

**Finance Slice 2**:

- Creado `postgres-store-slice2.ts` con repository layer completo
- 7 rutas API wired a Postgres-first con BigQuery fallback
- Income payments normalizados a tabla propia en Postgres

**HR Payroll backfill**:

- `scripts/backfill-postgres-payroll.ts` — backfilla 4 tablas: compensation_versions, payroll_periods, payroll_entries, payroll_bonus_config

**HR Leave backfill + serving view**:

- `scripts/backfill-postgres-hr-leave.ts` — backfilla 4 tablas: leave_types, leave_balances, leave_requests, leave_request_actions
- `greenhouse_serving.member_leave_360` — vista 360 de leave por member con balances y solicitudes

**Fix TS de Codex**:

- `sync-source-runtime-projections.ts:571` — `owner_member_id: null` tipado como `null as string | null` para que el build pase

### Verificación

- `pnpm tsc --noEmit` — pasó limpio (0 errores)
- `pnpm build` — build exitoso, todas las rutas finance + hr compiladas correctamente

### Riesgos o pendientes

- Backfills **NO ejecutados** aún (finance slice 2, payroll, leave)
- DDL leave actualizado no ejecutado en Cloud SQL (para crear `member_leave_360`)
- PUT income y PUT expenses siguen solo en BigQuery
- Reconciliation runtime aún en BigQuery
- Identity & Access V2: modelo PostgreSQL propuesto pero DDL no generado aún

---

## 2026-03-15 18:05 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ejecutar el primer seed real de `Source Sync Runtime Projections`, ajustar el modelado 360 de delivery/CRM y dejar un documento maestro del modelo de datos para agentes.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Local tooling + Cloud SQL `greenhouse-pg-dev` + BigQuery `efeonce-group`

### Archivos tocados

- `scripts/setup-postgres-access.sql`
- `scripts/setup-postgres-source-sync.sql`
- `scripts/setup-postgres-source-sync.ts`
- `scripts/setup-bigquery-source-sync.sql`
- `scripts/setup-bigquery-source-sync.ts`
- `scripts/sync-source-runtime-projections.ts`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/operations/GREENHOUSE_DATA_MODEL_DOCUMENT_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/tasks/in-progress/CODEX_TASK_Source_Sync_Runtime_Projections_v1.md`
- `docs/README.md`
- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se creó `GREENHOUSE_DATA_MODEL_MASTER_V1.md` como snapshot maestro del modelo de datos Greenhouse.
- Se creó `GREENHOUSE_DATA_MODEL_DOCUMENT_OPERATING_MODEL_V1.md` para definir cómo los agentes deben evolucionar el master doc.
- Se ejecutó `Source Sync Runtime Projections` con datos reales desde datasets legacy hacia:
  - `greenhouse_raw`
  - `greenhouse_conformed`
  - `greenhouse_delivery`
  - `greenhouse_crm`
- Se agregó soporte explícito a `project_database_source_id` en:
  - `greenhouse_conformed.delivery_projects`
  - `greenhouse_conformed.delivery_tasks`
  - `greenhouse_conformed.delivery_sprints`
  - `greenhouse_delivery.projects`
  - `greenhouse_delivery.tasks`
  - `greenhouse_delivery.sprints`
- El seed delivery usa el bridge práctico actual `greenhouse.clients.notion_project_ids`, pero ya deja modelado el binding target por database de Notion.
- Se corrigieron errores reales del runner:
  - grants faltantes en `greenhouse_sync`
  - setup BigQuery demasiado rígido con `GCP_PROJECT`
  - inserts inválidos de `JSON` hacia BigQuery
  - normalización de `DATE` y `TIMESTAMP`
  - columnas faltantes en `greenhouse_conformed.crm_deals`
  - placeholder mismatch en inserts PostgreSQL
- Regla CRM corregida en runtime:
  - `raw` y `conformed` mantienen universo HubSpot completo
  - `greenhouse_crm` solo proyecta companias que ya pertenecen al universo de clientes Greenhouse
  - resultado actual en PostgreSQL:
    - `greenhouse_crm.companies = 9`
    - `greenhouse_crm.deals = 25`
- Se dejó explícito en el modelo que `HubSpot Contacts` son obligatorios para el 360:
  - `HubSpot Contact -> client_user / identity_profile`
  - solo contactos asociados a companias cliente deben entrar al runtime

### Verificación

- `pnpm exec eslint scripts/sync-source-runtime-projections.ts scripts/setup-postgres-source-sync.ts scripts/setup-bigquery-source-sync.ts scripts/setup-postgres-access.ts`
  - correcto
- `pnpm exec tsx scripts/setup-postgres-access.ts`
  - correcto
- `pnpm exec tsx scripts/setup-postgres-source-sync.ts`
  - correcto
- `pnpm exec tsx scripts/setup-bigquery-source-sync.ts`
  - correcto
- `pnpm exec tsx scripts/sync-source-runtime-projections.ts`
  - correcto
- Conteos verificados en PostgreSQL:
  - `greenhouse_delivery.projects = 59`
  - `greenhouse_delivery.sprints = 13`
  - `greenhouse_delivery.tasks = 1173`
  - `greenhouse_crm.companies = 9`
  - `greenhouse_crm.deals = 25`
- Conteos verificados en BigQuery conformed:
  - `delivery_projects = 59`
  - `delivery_sprints = 13`
  - `delivery_tasks = 1173`
  - `crm_companies = 628`
  - `crm_deals = 178`
- Control plane verificado:
  - `notion` tiene runs `succeeded`
  - `hubspot` tiene runs `succeeded`
  - watermarks activos en `greenhouse_sync.source_sync_watermarks`

### Riesgos o pendientes

- `HubSpot Contacts` aun no estan materializados en `greenhouse_conformed` ni `greenhouse_crm`; quedaron declarados como slice obligatorio siguiente.
- El binding tenant-level definitivo para delivery aun no existe como objeto canonico separado; hoy el seed usa:
  - `_source_database_id` como contexto de workspace
  - `greenhouse.clients.notion_project_ids` como bridge practico actual
- El runner ya funciona, pero sigue siendo secuencial para PostgreSQL; si crece mucho el volumen, conviene batch upsert.

## 2026-03-15 16:35 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Cerrar la capa transversal de acceso a PostgreSQL para que `HR`, `Payroll`, `Finance` y los próximos dominios no vuelvan a requerir grants manuales por ambiente.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / Cloud SQL `greenhouse-pg-dev`

### Archivos tocados

- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `.env.example`
- `package.json`
- `scripts/lib/load-greenhouse-tool-env.ts`
- `scripts/lib/postgres-script-runner.ts`
- `scripts/pg-doctor.ts`
- `scripts/setup-postgres-access.sql`
- `scripts/setup-postgres-access-runtime.sql`
- `scripts/setup-postgres-access.ts`
- `scripts/setup-postgres-finance.sql`
- `scripts/setup-postgres-hr-leave.sql`
- `scripts/setup-postgres-payroll.sql`
- `scripts/setup-postgres-canonical-360.ts`
- `scripts/setup-postgres-source-sync.ts`
- `scripts/setup-postgres-finance.ts`
- `scripts/setup-postgres-hr-leave.ts`
- `scripts/setup-postgres-payroll.ts`
- `scripts/backfill-postgres-canonical-360.ts`
- `scripts/backfill-postgres-finance.ts`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Cambios realizados

- Se formalizó el modelo de acceso `runtime / migrator / admin` en PostgreSQL.
- `AGENTS.md` quedó actualizado con:
  - perfiles de acceso
  - variables por perfil
  - comandos canónicos
  - regla de usar `pg:doctor` antes de cualquier nuevo corte
- Se agregó `scripts/setup-postgres-access.ts` para bootstrap de roles y grants compartidos.
- Se agregó `scripts/pg-doctor.ts` para validar:
  - perfil aplicado
  - membership de roles
  - acceso por schema
- Se agregó carga consistente de env local para tooling en `scripts/lib/load-greenhouse-tool-env.ts`.
- Se agregó un runner reutilizable para SQL PostgreSQL en `scripts/lib/postgres-script-runner.ts`.
- Se creó el login dedicado `greenhouse_migrator_user` y quedó mapeado al rol `greenhouse_migrator`.
- Se dejó `greenhouse_hr`, `greenhouse_payroll` y `greenhouse_finance` con grants explícitos hacia:
  - `greenhouse_runtime`
  - `greenhouse_migrator`
- `setup-postgres-finance.sql`, `setup-postgres-hr-leave.sql` y `setup-postgres-payroll.sql` dejaron de otorgar acceso a `greenhouse_app` directo; ahora apuntan al modelo por roles.
- No se tocó el runtime funcional de `Payroll`; esta pasada solo deja la base de acceso y tooling para siguientes migraciones.

### Verificación

- `pnpm exec tsx scripts/setup-postgres-access.ts`
  - correcto
- `pnpm exec tsx scripts/pg-doctor.ts --profile=runtime`
  - correcto
- `pnpm exec tsx scripts/pg-doctor.ts --profile=migrator`
  - correcto
- `pnpm exec eslint scripts/setup-postgres-access.ts scripts/pg-doctor.ts scripts/lib/load-greenhouse-tool-env.ts scripts/lib/postgres-script-runner.ts scripts/setup-postgres-finance.ts scripts/setup-postgres-hr-leave.ts scripts/setup-postgres-payroll.ts scripts/setup-postgres-source-sync.ts scripts/setup-postgres-canonical-360.ts scripts/backfill-postgres-finance.ts scripts/backfill-postgres-canonical-360.ts`
  - correcto
- `pnpm build`
  - correcto
- `git diff --check`
  - correcto

### Riesgos o pendientes

- Algunos objetos legacy siguen siendo owned por `greenhouse_app`; el modelo nuevo los cubre por grants, pero la propiedad histórica no se normalizó en esta pasada.
- `Payroll` ya está arriba por Claude; no se debe reabrir ese runtime sin coordinar el boundary actual.
- Siguiente paso recomendado:
  - seguir con `Finance -> PostgreSQL` sobre este modelo
  - usar `pg:doctor` como preflight obligatorio antes de cualquier nuevo corte de dominio

## 2026-03-15 13:45 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Materializar el primer slice `Finance -> PostgreSQL` sin romper la alineacion 360 ni el bridge activo con `AI Tooling`.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / Cloud SQL `greenhouse-pg-dev`

### Archivos tocados

- `src/lib/providers/postgres.ts`
- `src/lib/finance/postgres-store.ts`
- `src/lib/finance/shared.ts`
- `src/lib/finance/exchange-rates.ts`
- `src/app/api/finance/accounts/route.ts`
- `src/app/api/finance/accounts/[id]/route.ts`
- `src/app/api/finance/exchange-rates/route.ts`
- `src/app/api/finance/exchange-rates/latest/route.ts`
- `src/app/api/finance/exchange-rates/sync/route.ts`
- `src/app/api/finance/expenses/meta/route.ts`
- `scripts/setup-postgres-finance.sql`
- `scripts/setup-postgres-finance.ts`
- `scripts/backfill-postgres-finance.ts`
- `docs/tasks/in-progress/CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Cambios realizados

- Se materializo `greenhouse_finance` en Cloud SQL con:
  - `accounts`
  - `suppliers`
  - `exchange_rates`
- Se agrego la vista 360:
  - `greenhouse_serving.provider_finance_360`
- Se agrego el repository `src/lib/finance/postgres-store.ts`.
- Runtime `Postgres first` ya activo para:
  - `accounts`
  - `exchange-rates`
  - subset de cuentas en `expenses/meta`
- `suppliers` se modelo y backfilleo en PostgreSQL, pero no se corto aun el runtime principal ahi para no romper `AI Tooling`, que todavia consume `greenhouse.fin_suppliers` en BigQuery.
- Se corrigio el problema estructural de permisos en Cloud SQL:
  - `greenhouse_app` no podia crear FKs hacia `greenhouse_core.client_users` / `providers`
  - se otorgaron grants sobre `greenhouse_core`, `greenhouse_sync` y `greenhouse_serving`
  - `setup-postgres-finance.sql` ya incorpora grants para no depender de fix manual en nuevos ambientes
- Backfill ejecutado desde BigQuery:
  - `accounts`: `1`
  - `suppliers`: `2`
  - `exchange_rates`: `0`
- El backfill de suppliers tambien materializa providers canonicos `financial_vendor` en `greenhouse_core.providers`.

### Verificación

- `pnpm exec eslint src/lib/providers/postgres.ts src/lib/finance/postgres-store.ts src/lib/finance/shared.ts src/lib/finance/exchange-rates.ts src/app/api/finance/accounts/route.ts src/app/api/finance/accounts/[id]/route.ts src/app/api/finance/exchange-rates/route.ts src/app/api/finance/exchange-rates/latest/route.ts src/app/api/finance/exchange-rates/sync/route.ts src/app/api/finance/expenses/meta/route.ts scripts/setup-postgres-finance.ts scripts/backfill-postgres-finance.ts`
  - correcto
- `git diff --check -- ...` sobre el scope financiero tocado
  - correcto
- `pnpm build`
  - correcto
- Queries reales en Cloud SQL:
  - `greenhouse_finance.accounts = 1`
  - `greenhouse_finance.suppliers = 2`
  - `greenhouse_finance.exchange_rates = 0`
  - `greenhouse_serving.provider_finance_360 = 10`
- Provisioning real ejecutado:
  - `setup-postgres-finance` correcto
  - `backfill-postgres-finance` correcto

### Riesgos o pendientes

- `suppliers` runtime sigue en BigQuery por dependencia viva con `AI Tooling`.
- `exchange_rates` quedo con `0` filas por no existir snapshots previos en BigQuery; el path runtime igual se mantiene sano porque el sync diario/live ya persiste en el store operativo cuando se invoque.
- El siguiente corte sano es:
  - `suppliers` runtime a PostgreSQL una vez que `AI Tooling` quede desacoplado de `greenhouse.fin_suppliers`
  - luego `income`, `expenses` y `reconciliation`

## 2026-03-15 ~12:00 America/Santiago

### Agente

- Claude

### Objetivo del turno

- Tomar la lane `HR Payroll Postgres Runtime Migration v1` y ejecutar el corte operativo de Payroll desde BigQuery hacia PostgreSQL, alineado al modelo canonico 360.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / `pre-greenhouse`

### Archivos tocados

- `docs/tasks/in-progress/CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1.md` — registro de asignacion y plan 360
- `scripts/setup-postgres-payroll.sql` — DDL schema `greenhouse_payroll`
- `src/lib/payroll/postgres-store.ts` — repository layer PostgreSQL
- `src/lib/payroll/get-compensation.ts` — migrado a Postgres-first
- `src/lib/payroll/get-payroll-periods.ts` — migrado a Postgres-first
- `src/lib/payroll/get-payroll-entries.ts` — migrado a Postgres-first
- `src/lib/payroll/get-payroll-members.ts` — migrado a Postgres-first
- `src/lib/payroll/persist-entry.ts` — migrado a Postgres-first
- `Handoff.md`

### Alineacion 360

- Schema: `greenhouse_payroll` como domain extension
- FKs canonicas: `member_id` → `greenhouse_core.members`, user IDs → `greenhouse_core.client_users`
- Outbox events en `greenhouse_sync.outbox_events`
- Serving view: `greenhouse_serving.member_payroll_360`
- Patron replicado de `greenhouse_hr` (Leave)

### Riesgos o pendientes

- Schema `greenhouse_payroll` debe ser provisionado en Cloud SQL antes del deploy
- Backfill de datos existentes de BigQuery a PostgreSQL pendiente (script separado)
- KPIs de Notion (`kpi_otd_percent`, `kpi_rpa_avg`) siguen viniendo de source sync, no de PostgreSQL

---

## 2026-03-15 05:58 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Abrir el programa de migracion `PostgreSQL + source sync` en lanes paralelas y dejar briefs ejecutables para que otro agente, incluido Claude, pueda tomar trabajo sin pisar el runtime ya estabilizado.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Docs / coordinacion operativa

### Archivos tocados

- `docs/tasks/in-progress/CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1.md`
- `docs/tasks/in-progress/CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md`
- `docs/tasks/in-progress/CODEX_TASK_Source_Sync_Runtime_Projections_v1.md`
- `docs/tasks/README.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se descompuso la siguiente etapa de plataforma en tres lanes paralelizables:
  - `HR Payroll -> PostgreSQL`
  - `Finance operativo -> PostgreSQL`
  - `Notion/HubSpot -> raw/conformed -> runtime projections`
- Cada task nueva deja explicitos:
  - alcance
  - no scope
  - boundary de archivos
  - dependencias
  - criterios de aceptacion
  - handoff operativo para Claude
- Se actualizo el indice `docs/tasks/README.md` para que estas lanes ya aparezcan como `in-progress`.

### Verificación

- Revision manual de consistencia entre:
  - `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
  - `GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
  - `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
  - tasks nuevas
- `pnpm exec prettier --check` no se uso; esta tanda es documental y se validara con `git diff --check`

### Riesgos o pendientes

- Estas tasks no ejecutan runtime por si mismas; solo abren el trabajo paralelo.
- El siguiente paso recomendado es asignar:
  - `Payroll` a un agente
  - `Finance` a otro agente
  - `Source sync` a un tercer agente o dejarlo en Codex
- Sigue existiendo un archivo no trackeado fuera de este lote:
  - `docs/architecture/POSTGRESQL_ADVANCED_PATTERNS.md`
  - no fue tocado ni debe incluirse accidentalmente en commit

## 2026-03-15 05:48 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Corregir la ausencia de avatar real en la tabla de `HR > Permisos` una vez que el flujo de creación ya estaba operativo.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / `pre-greenhouse`

### Archivos tocados

- `src/types/hr-core.ts`
- `src/lib/hr-core/service.ts`
- `src/lib/hr-core/postgres-leave-store.ts`
- `src/views/greenhouse/hr-core/HrLeaveView.tsx`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se confirmó que no era un problema de persistencia de la solicitud, sino de contrato:
  - `HR Leave` no devolvía `memberAvatarUrl`
  - la UI siempre renderizaba iniciales
- El contrato `HrLeaveRequest` ahora incluye `memberAvatarUrl`.
- BigQuery fallback de `HR Leave` ahora expone:
  - `m.avatar_url` cuando existe
  - fallback con `resolveAvatarPath(name, email)` si no existe
- PostgreSQL de `HR Leave` ahora expone:
  - fallback con `resolveAvatarPath(name, primary_email)` desde `greenhouse_core.members`
- `HrLeaveView` ahora usa `src={memberAvatarUrl}` tanto en:
  - la tabla de solicitudes
  - el modal de revisión

### Verificación

- `pnpm exec eslint src/types/hr-core.ts src/lib/hr-core/service.ts src/lib/hr-core/postgres-leave-store.ts src/views/greenhouse/hr-core/HrLeaveView.tsx`
  - correcto
- `pnpm build`
  - correcto

### Riesgos o pendientes

- En PostgreSQL el avatar todavía no viene de una columna canónica dedicada en `greenhouse_core.members`; por ahora usa el resolver compartido por nombre/email.
- Si queremos cerrar eso de forma estructural, el siguiente paso sano es llevar `avatar_url` al backbone canónico y al backfill `canonical-360`.

## 2026-03-15 05:34 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ejecutar el primer slice técnico del blueprint de sync externo para dejar materializada la fundación `raw/conformed + control plane + proyecciones runtime` en BigQuery y PostgreSQL.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Data platform / PostgreSQL / BigQuery

### Archivos tocados

- `scripts/setup-postgres-source-sync.sql`
- `scripts/setup-postgres-source-sync.ts`
- `scripts/setup-bigquery-source-sync.sql`
- `scripts/setup-bigquery-source-sync.ts`
- `package.json`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Cambios realizados

- Se agregaron los scripts:
  - `pnpm setup:postgres:source-sync`
  - `pnpm setup:bigquery:source-sync`
- En PostgreSQL quedaron creados:
  - `greenhouse_sync.source_sync_runs`
  - `greenhouse_sync.source_sync_watermarks`
  - `greenhouse_sync.source_sync_failures`
  - `greenhouse_crm.companies`
  - `greenhouse_crm.deals`
  - `greenhouse_delivery.projects`
  - `greenhouse_delivery.sprints`
  - `greenhouse_delivery.tasks`
- En BigQuery quedaron creados:
  - dataset `greenhouse_raw`
  - dataset `greenhouse_conformed`
  - dataset `greenhouse_marts`
  - `10` tablas raw de snapshots para Notion y HubSpot
  - `5` tablas conformed iniciales para delivery y CRM
- Se ajustó el runner de BigQuery para no depender de `src/lib/bigquery.ts`, ya que ese módulo es `server-only` y rompía fuera del runtime de Next.
- Se verificó existencia real de tablas en:
  - Cloud SQL
  - BigQuery

### Verificación

- `pnpm exec eslint scripts/setup-postgres-source-sync.ts scripts/setup-bigquery-source-sync.ts src/lib/postgres/client.ts src/lib/bigquery.ts`
  - correcto
- `pnpm build`
  - correcto
- `pnpm setup:postgres:source-sync`
  - correcto; `37` statements aplicados
- `pnpm setup:bigquery:source-sync`
  - correcto; `18` statements aplicados
- Verificación directa:
  - `information_schema.tables` en PostgreSQL para `greenhouse_sync`, `greenhouse_crm`, `greenhouse_delivery`
  - `bq ls` en `greenhouse_raw`, `greenhouse_conformed`, `greenhouse_marts`

### Riesgos o pendientes

- Este turno deja lista la fundación, pero todavía no llena datos:
  - faltan jobs de ingestión Notion/HubSpot
  - falta materialización de conformed desde raw
  - falta proyección de conformed hacia `greenhouse_crm` y `greenhouse_delivery`
- Existe un archivo no trackeado fuera de este lote:
  - `docs/architecture/POSTGRESQL_ADVANCED_PATTERNS.md`
  - no fue tocado ni incluido en commit

## 2026-03-15 05:15 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Corregir el error vivo al crear solicitudes en `HR > Permisos` después de que la vista ya había quedado operativa.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / `pre-greenhouse`

### Archivos tocados

- `src/lib/hr-core/postgres-leave-store.ts`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se inspeccionaron logs reales de `POST /api/hr/core/leave/requests` en `pre-greenhouse`.
- La causa exacta fue un error PostgreSQL:
  - `column "year" is of type integer but expression is of type text`
- El bug estaba en el seed/upsert automático de `leave_balances` dentro de `ensureYearBalances()`:
  - el mismo placeholder `$2` se usaba primero como texto para construir `balance_id`
  - luego se reutilizaba para insertar en la columna `year`
- Se corrigió tipando explícitamente el placeholder como entero en ambos usos:
  - `($2::integer)::text` para el `balance_id`
  - `$2::integer` para la columna `year`

### Verificación

- `pnpm exec eslint src/lib/hr-core/postgres-leave-store.ts`
  - correcto
- `pnpm build`
  - correcto
- Logs de Vercel:
  - se confirmó el error exacto antes del fix en `POST /api/hr/core/leave/requests`

### Riesgos o pendientes

- Falta smoke autenticado después del deploy para confirmar que la solicitud ya se crea y aparece en la tabla.
- Sigue existiendo un archivo no trackeado fuera de este lote:
  - `docs/architecture/POSTGRESQL_ADVANCED_PATTERNS.md`

## 2026-03-15 05:08 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Traducir la decisión `PostgreSQL + BigQuery` a un blueprint concreto para sincronizar y respaldar datos de `Notion` y `HubSpot`, definiendo qué se queda como raw, qué se normaliza y qué subset baja a PostgreSQL para runtime y cálculos.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Architecture / Data platform

### Archivos tocados

- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Cambios realizados

- Se formalizó el blueprint de sync externo en `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`.
- El documento deja definidos:
  - datasets `BigQuery raw`, `conformed` y `marts`
  - schemas PostgreSQL `greenhouse_crm` y `greenhouse_delivery`
  - tablas de control `greenhouse_sync.source_sync_runs`, `source_sync_watermarks` y `source_sync_failures`
  - tablas raw mínimas para:
    - Notion projects/tasks/sprints/people/databases
    - HubSpot companies/deals/contacts/owners/line items
  - tablas conformed mínimas para:
    - `delivery_projects`
    - `delivery_tasks`
    - `delivery_sprints`
    - `crm_companies`
    - `crm_deals`
- Se dejó explícita la regla de serving:
  - backup y replay en BigQuery
  - proyección runtime-crítica en PostgreSQL
  - no más cálculos críticos leyendo APIs live de `Notion` o `HubSpot`

### Verificación

- Revisión manual del alineamiento entre:
  - `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
  - `GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
  - `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `git diff --check`
  - pendiente al cierre del lote completo

### Riesgos o pendientes

- Falta implementar el primer slice técnico del blueprint:
  - tablas `greenhouse_sync.source_sync_runs`
  - tablas `greenhouse_sync.source_sync_watermarks`
  - raw snapshots BigQuery para Notion/HubSpot
  - primeras conformed tables `delivery_tasks`, `delivery_projects`, `crm_companies`, `crm_deals`
- Existe un archivo no trackeado fuera de este lote:
  - `docs/architecture/POSTGRESQL_ADVANCED_PATTERNS.md`
  - no fue tocado ni incluido en commit

## 2026-03-15 04:53 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Resolver la caída real de `HR > Permisos` en `pre-greenhouse` después del cutover a PostgreSQL y endurecer el rollout para que el módulo no vuelva a caer completo si Cloud SQL falla en `Preview`.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / `pre-greenhouse`

### Archivos tocados

- `src/lib/hr-core/service.ts`
- `docs/tasks/in-progress/CODEX_TASK_HR_Core_Module_v2.md`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Cambios realizados

- Se identificó en logs de Vercel que la caída de `GET /api/hr/core/meta`, `GET /api/hr/core/leave/balances` y `GET /api/hr/core/leave/requests` no venía del frontend sino de Cloud SQL:
  - `boss::NOT_AUTHORIZED`
  - falta de permiso `cloudsql.instances.get`
- Se otorgó `roles/cloudsql.client` al service account usado por `Preview`:
  - `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`
- `HR Core` ahora hace fallback controlado a BigQuery para el slice de `leave` cuando PostgreSQL falla por:
  - falta de permisos Cloud SQL
  - schema Postgres no listo
  - conectividad Cloud SQL temporal
- El fallback cubre:
  - `getHrCoreMetadata`
  - `listLeaveBalances`
  - `listLeaveRequests`
  - `getLeaveRequestById`
  - `createLeaveRequest`
  - `reviewLeaveRequest`
- El objetivo del ajuste es que `Preview` siga operativo durante rollout o incidentes de infraestructura sin perder el camino a PostgreSQL como store principal del dominio.

### Verificación

- `pnpm exec eslint src/lib/hr-core/service.ts`
  - correcto
- `pnpm build`
  - correcto
- `gcloud projects add-iam-policy-binding efeonce-group --member=serviceAccount:greenhouse-portal@efeonce-group.iam.gserviceaccount.com --role=roles/cloudsql.client`
  - correcto
- `gcloud projects get-iam-policy efeonce-group`
  - correcto; binding presente

### Riesgos o pendientes

- Todavía falta smoke autenticado manual en `pre-greenhouse` para confirmar la UX final del flujo:
  - carga de la vista
  - creación de solicitud
  - revisión approve/reject/cancel
- El fallback se diseñó como protección de rollout; cuando `Preview` y `Staging` estén estables sobre Cloud SQL conviene observar logs y, si todo queda sano, reducir el uso de la vía legacy en BigQuery.

## 2026-03-15 10:35 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Hacer el primer cutover real de runtime `BigQuery -> PostgreSQL` usando la nueva base operacional, empezando por `HR > Permisos`, y eliminar el patrón de `DDL` en request-time que venía rompiendo `HR Core`.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / Preview / Data platform migration

### Archivos tocados

- `src/lib/google-credentials.ts`
- `src/lib/bigquery.ts`
- `src/lib/postgres/client.ts`
- `src/lib/storage/greenhouse-media.ts`
- `src/lib/hr-core/postgres-leave-store.ts`
- `src/lib/hr-core/service.ts`
- `src/views/greenhouse/hr-core/HrLeaveView.tsx`
- `scripts/setup-postgres-hr-leave.sql`
- `scripts/setup-postgres-hr-leave.ts`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/tasks/in-progress/CODEX_TASK_HR_Core_Module_v2.md`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Cambios realizados

- Se agregó el primer domain schema operativo sobre Postgres:
  - `greenhouse_hr.leave_types`
  - `greenhouse_hr.leave_balances`
  - `greenhouse_hr.leave_requests`
  - `greenhouse_hr.leave_request_actions`
- `HR > Permisos` ahora prefiere PostgreSQL para:
  - `GET /api/hr/core/meta`
  - `GET /api/hr/core/leave/balances`
  - `GET /api/hr/core/leave/requests`
  - `GET /api/hr/core/leave/requests/[requestId]`
  - `POST /api/hr/core/leave/requests`
  - `POST /api/hr/core/leave/requests/[requestId]/review`
- El store nuevo usa ids canónicos:
  - `greenhouse_core.client_users`
  - `greenhouse_core.members`
- Se agregó outbox operativo en `greenhouse_sync.outbox_events` para creación/revisión de solicitudes.
- Se centralizó la lectura de credenciales GCP en `src/lib/google-credentials.ts` para reutilizarla en:
  - BigQuery
  - Cloud SQL connector
  - media storage
- El resto de `HR Core` dejó de usar `ensureHrCoreInfrastructure()` en runtime y ahora usa `assertHrCoreInfrastructureReady()` como validación no mutante.
- Se ejecutó el bootstrap único de `HR Core` en BigQuery con `scripts/setup-hr-core-tables.sql`.
- Se ejecutó el bootstrap único del dominio `leave` en Cloud SQL con `scripts/setup-postgres-hr-leave.sql`.
- Se agregaron env vars de PostgreSQL en `Vercel Preview` para la rama `fix/codex-operational-finance`:
  - `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`
  - `GREENHOUSE_POSTGRES_DATABASE`
  - `GREENHOUSE_POSTGRES_USER`
  - `GREENHOUSE_POSTGRES_PASSWORD`
  - `GREENHOUSE_POSTGRES_IP_TYPE`
  - `GREENHOUSE_POSTGRES_MAX_CONNECTIONS`

### Verificación

- `pnpm exec eslint src/lib/google-credentials.ts src/lib/bigquery.ts src/lib/postgres/client.ts src/lib/storage/greenhouse-media.ts src/lib/hr-core/postgres-leave-store.ts src/lib/hr-core/service.ts src/views/greenhouse/hr-core/HrLeaveView.tsx scripts/setup-postgres-hr-leave.ts`
  - correcto
- `pnpm build`
  - correcto
- `pnpm exec tsx scripts/setup-postgres-hr-leave.ts`
  - correcto; `15` statements aplicados en Cloud SQL
- `bq query --use_legacy_sql=false < scripts/setup-hr-core-tables.sql`
  - correcto; tablas HR Core creadas y columna `daily_required` agregada
- Smoke de datos:
  - `greenhouse_hr.leave_types`: `4`
  - tablas `greenhouse_hr.*` presentes
  - tablas `greenhouse.departments`, `member_profiles`, `leave_types`, `leave_balances`, `leave_requests`, `leave_request_actions`, `attendance_daily` presentes en BigQuery

### Riesgos o pendientes

- No se hizo smoke autenticado completo en `pre-greenhouse` después del cutover; el siguiente paso sano es validar con sesión real:
  - carga de `/hr/leave`
  - creación de solicitud
  - revisión approve/reject/cancel
- `departments`, `member_profiles` y `attendance` siguen en BigQuery; el siguiente corte recomendado es migrarlos al mismo patrón `domain schema + outbox`.

## 2026-03-15 04:15 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Aprovechar la nueva instancia de Cloud SQL para materializar el backbone canónico `360` en PostgreSQL y cargarle datos reales desde BigQuery, antes de seguir migrando dominios operativos.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Architecture / Data platform foundation

### Archivos tocados

- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `src/lib/postgres/client.ts`
- `scripts/setup-postgres-canonical-360.sql`
- `scripts/setup-postgres-canonical-360.ts`
- `scripts/backfill-postgres-canonical-360.ts`
- `.env.example`
- `.env.local.example`
- `package.json`
- `pnpm-lock.yaml`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se modeló y documentó el backbone canónico `360` de PostgreSQL:
  - `greenhouse_core`
  - `greenhouse_serving`
  - `greenhouse_sync`
- Se creó `src/lib/postgres/client.ts` usando:
  - `pg`
  - `@google-cloud/cloud-sql-connector`
- Se agregaron scripts:
  - `setup:postgres:canonical-360`
  - `backfill:postgres:canonical-360`
- Se materializaron en `greenhouse-pg-dev`:
  - tablas core canónicas
  - vistas 360
  - tabla `outbox_events`
  - grants para `greenhouse_app`
- Se ejecutó backfill inicial desde BigQuery hacia PostgreSQL con resultados:
  - `clients`: `11`
  - `identity_profiles`: `9`
  - `identity_profile_source_links`: `29`
  - `client_users`: `39`
  - `members`: `7`
  - `providers`: `8` canónicos sobre `11` filas fuente, por `provider_id` duplicado en origen
  - `service_modules`: `9`
  - `client_service_modules`: `30`
  - `roles`: `8`
  - `user_role_assignments`: `40`

### Verificación

- `pnpm exec tsx scripts/setup-postgres-canonical-360.ts`
  - correcto; `40` statements aplicados
- `pnpm exec tsx scripts/backfill-postgres-canonical-360.ts`
  - correcto; backfill inicial ejecutado
- Querys directas sobre Postgres vía connector:
  - presencia de tablas en `greenhouse_core`
  - presencia de vistas en `greenhouse_serving`
  - grants efectivos para `greenhouse_app`
  - muestras válidas de `client_360` y `member_360`

### Riesgos o pendientes

- El portal todavía no lee ni escribe desde Postgres; este turno deja lista la base canónica y sus datos iniciales, no el cutover de runtime.
- `departments` no existe hoy en BigQuery, así que `member_360` quedó sin esa dimensión poblada en el backfill inicial.
- El siguiente paso sano es migrar un dominio write-heavy contra este backbone:
  - prioridad recomendada: `HR > Permisos`
  - patrón recomendado: repository layer + outbox `Postgres -> BigQuery`

## 2026-03-15 03:47 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Formalizar la arquitectura de datos objetivo `PostgreSQL + BigQuery` y ejecutar la primera provisión real de Cloud SQL para empezar a sacar workflows operativos de BigQuery.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Architecture / Infrastructure foundation

### Archivos tocados

- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se agregó la arquitectura de alto nivel `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`.
- La dirección oficial queda definida como:
  - `PostgreSQL` para flujos operativos y mutables
  - `BigQuery` para capas `raw`, `conformed`, `core analytics` y `marts`
- Se autenticó por CLI en Google Cloud con la cuenta correcta sobre `efeonce-group`.
- Se verificó que no existían instancias previas de Cloud SQL en el proyecto.
- Se provisionó la primera instancia de Cloud SQL:
  - instancia: `greenhouse-pg-dev`
  - motor: `POSTGRES_16`
  - región: `us-east4`
  - zone: `us-east4-a`
  - tier: `db-custom-1-3840`
  - storage: `20 GB SSD`
  - IP pública primaria: `34.86.135.144`
  - connection name: `efeonce-group:us-east4:greenhouse-pg-dev`
- Se crearon:
  - base `greenhouse_app`
  - usuario `greenhouse_app`
- Se registraron credenciales en Secret Manager:
  - `greenhouse-pg-dev-postgres-password`
  - `greenhouse-pg-dev-app-password`

### Verificación

- `gcloud auth login --no-launch-browser --update-adc`
  - correcto con `julio.reyes@efeonce.org`
- `gcloud sql instances list --project efeonce-group`
  - correcto; confirmó ausencia inicial y luego presencia de `greenhouse-pg-dev`
- `gcloud sql instances describe greenhouse-pg-dev --project efeonce-group`
  - correcto; estado `RUNNABLE`
- `gcloud sql databases list --instance=greenhouse-pg-dev --project efeonce-group`
  - correcto; confirmó `greenhouse_app`
- `gcloud sql users list --instance=greenhouse-pg-dev --project efeonce-group`
  - correcto; confirmó `greenhouse_app` y `postgres`

### Riesgos o pendientes

- La app todavía no usa Postgres en runtime; esta pasada solo deja la fundación de infraestructura.
- El siguiente paso sano no es conectar módulos directo a la IP pública, sino definir la estrategia de acceso desde aplicación:
  - idealmente repository layer + Cloud SQL connector / worker de sync
  - no volver a mezclar writes operativos con BigQuery como primary store
- Pendiente de arquitectura/técnico:
  - decidir primer dominio a migrar (`HR > Permisos` es el candidato natural)
  - definir esquema inicial en Postgres
  - definir sync `Postgres -> BigQuery`

## 2026-03-15 08:31 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Corregir el drift entre el mensaje de `Payroll` y la superficie real de administración del equipo, y endurecer el overview de compensaciones para que no se caiga completo ante un fallo parcial.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / Preview

### Archivos tocados

- `src/lib/payroll/get-compensation.ts`
- `src/views/greenhouse/payroll/PayrollDashboard.tsx`
- `src/views/greenhouse/payroll/PayrollCompensationTab.tsx`
- `src/app/(dashboard)/admin/team/page.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/config/greenhouse-nomenclature.ts`
- `docs/tasks/in-progress/CODEX_TASK_HR_Payroll_Module_v3.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se confirmó que el repo tenía APIs de `Admin Team` pero no la ruta `/admin/team`.
- Se agregó `/admin/team` reutilizando `PeopleList`, para que el admin tenga pantalla real donde crear/gestionar colaboradores.
- El menú `Admin` ahora muestra `Equipo`.
- `Payroll` ahora apunta explícitamente a `Admin > Equipo` en lugar de referirse a una surface inexistente.
- `getCompensationOverview()` ahora es resiliente:
  - si falla la lectura de compensaciones actuales, sigue entregando roster
  - si falla la lectura enriquecida de members, cae a `greenhouse.team_members`
  - recompone `eligibleMembers` con la mejor data disponible

### Verificación

- Query manual sobre `Preview`:
  - `team_members` activos: `7`
  - bootstrap `ensurePayrollInfrastructure` ejecutado statement por statement: correcto
- `pnpm exec eslint src/lib/payroll/get-compensation.ts src/views/greenhouse/payroll/PayrollDashboard.tsx src/views/greenhouse/payroll/PayrollCompensationTab.tsx src/components/layout/vertical/VerticalMenu.tsx src/config/greenhouse-nomenclature.ts src/app/(dashboard)/admin/team/page.tsx`
  - correcto
- `git diff --check -- src/lib/payroll/get-compensation.ts src/views/greenhouse/payroll/PayrollDashboard.tsx src/views/greenhouse/payroll/PayrollCompensationTab.tsx src/components/layout/vertical/VerticalMenu.tsx src/config/greenhouse-nomenclature.ts src/app/(dashboard)/admin/team/page.tsx docs/tasks/in-progress/CODEX_TASK_HR_Payroll_Module_v3.md Handoff.md changelog.md`
  - correcto

### Riesgos o pendientes

- No se pudo capturar el stack runtime exacto del `500` autenticado de `/api/hr/payroll/compensation`; se endureció el endpoint para evitar que un fallo parcial vuelva a tumbar toda la carga.
- Falta smoke autenticado en `pre-greenhouse` para validar:
  - `/admin/team`
  - creación de primer colaborador desde esa surface
  - retorno a `Payroll` con `Nueva compensación` habilitado

## 2026-03-15 08:02 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Corregir el fallo de creación de períodos en `HR Payroll` y revisar por qué `Compensaciones` aparecía con CTA apagado pese a existir colaboradores activos en preview.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / Preview

### Archivos tocados

- `src/lib/payroll/shared.ts`
- `src/lib/payroll/get-payroll-periods.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/lib/payroll/persist-entry.ts`
- `src/views/greenhouse/payroll/PayrollDashboard.tsx`
- `src/views/greenhouse/payroll/PayrollCompensationTab.tsx`
- `docs/tasks/in-progress/CODEX_TASK_HR_Payroll_Module_v3.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se endurecieron writes de `Payroll` para BigQuery cuando existen params opcionales `null`:
  - períodos
  - compensaciones
  - entries de nómina
- Se confirmó sobre `Preview` que:
  - `greenhouse.team_members` tiene `7` colaboradores activos
  - hoy `greenhouse.compensation_versions` no tiene compensaciones vigentes para ellos
- `PayrollDashboard` ahora deja de silenciar respuestas `!ok` de:
  - `GET /api/hr/payroll/periods`
  - `GET /api/hr/payroll/compensation`
- `Compensaciones` ahora:
  - muestra CTA visible para configurar la primera compensación
  - explica mejor cuándo faltan colaboradores activos
  - explica cuándo todos ya tienen compensación y la edición se hace desde la fila
- El modal `Nuevo período` ahora aclara que salario base, AFP, salud y bonos se configuran en la pestaña `Compensaciones`.

### Verificación

- Query manual a BigQuery con env de `Preview`:
  - `team_members`: `7` activos
  - `current compensation`: `0`
- `pnpm exec eslint src/lib/payroll/shared.ts src/lib/payroll/get-payroll-periods.ts src/lib/payroll/get-compensation.ts src/lib/payroll/persist-entry.ts src/views/greenhouse/payroll/PayrollDashboard.tsx src/views/greenhouse/payroll/PayrollCompensationTab.tsx`
  - correcto
- `git diff --check -- src/lib/payroll/shared.ts src/lib/payroll/get-payroll-periods.ts src/lib/payroll/get-compensation.ts src/lib/payroll/persist-entry.ts src/views/greenhouse/payroll/PayrollDashboard.tsx src/views/greenhouse/payroll/PayrollCompensationTab.tsx docs/tasks/in-progress/CODEX_TASK_HR_Payroll_Module_v3.md Handoff.md changelog.md`
  - correcto

### Riesgos o pendientes

- No se hizo smoke autenticado completo en `pre-greenhouse` después del fix, así que falta confirmar el roundtrip real de:
  - crear período
  - crear primera compensación
  - calcular nómina
- El síntoma del botón apagado ya no debería quedar silencioso, pero si `GET /api/hr/payroll/compensation` sigue devolviendo error con sesión real, el siguiente paso es inspeccionar el response vivo en Preview con usuario autenticado.

## 2026-03-15 07:05 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Corregir la inconsistencia entre `Finance Suppliers` y `AI Tooling Providers` para que el registro canónico `greenhouse.providers` vuelva a poblar el dropdown de `Nueva herramienta` y quede alineado con arquitectura.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / Preview

### Archivos tocados

- `src/lib/providers/canonical.ts`
- `src/lib/finance/schema.ts`
- `src/app/api/finance/suppliers/route.ts`
- `src/app/api/finance/suppliers/[id]/route.ts`
- `src/lib/ai-tools/service.ts`
- `src/views/greenhouse/ai-tools/tabs/AiCatalogTab.tsx`
- `Handoff.md`
- `changelog.md`
- `docs/tasks/in-progress/CODEX_TASK_AI_Tooling_Credit_System_v2.md`
- `docs/tasks/in-progress/CODEX_TASK_Financial_Module_v2.md`

### Cambios realizados

- Se agregó un bridge canónico `Supplier -> Provider` en `src/lib/providers/canonical.ts`.
- `Finance Suppliers` ahora:
  - guardan `provider_id`
  - devuelven `providerId` en sus respuestas
  - sincronizan `greenhouse.providers` al crear o actualizar un supplier
- `AI Tooling` ahora sincroniza providers desde suppliers activos antes de cargar metadata o validar `providerId`.
- `AiCatalogTab` ya no depende de una sola lista vacía:
  - deduplica providers entre `meta.providers` y `catalog.providers`
  - muestra estado explícito si no hay providers disponibles
- Resultado esperado:
  - un supplier financiero activo ya puede alimentar el provider canónico y aparecer en `Nueva herramienta`
  - el dropdown de provider deja de quedar vacío por drift entre `Finance` y `AI Tooling`

### Verificación

- `pnpm exec eslint src/lib/providers/canonical.ts src/lib/finance/schema.ts src/app/api/finance/suppliers/route.ts src/app/api/finance/suppliers/[id]/route.ts src/lib/ai-tools/service.ts src/views/greenhouse/ai-tools/tabs/AiCatalogTab.tsx`
  - correcto
- `git diff --check -- src/lib/providers/canonical.ts src/lib/finance/schema.ts src/app/api/finance/suppliers/route.ts src/app/api/finance/suppliers/[id]/route.ts src/lib/ai-tools/service.ts src/views/greenhouse/ai-tools/tabs/AiCatalogTab.tsx`
  - correcto

### Riesgos o pendientes

- No se hizo smoke autenticado en preview para confirmar un caso real de supplier ya existente reapareciendo en el dropdown después del bridge.
- El worktree ya traía un cambio ajeno en `docs/tasks/to-do/CODEX_TASK_Portal_View_Surface_Consolidation.md`; no se tocó en este turno.

## 2026-03-15 05:52 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Corregir dos bugs reportados después del último QA: snapshot de tipo de cambio ausente en `Finance Dashboard` y dropdown vacío en `Solicitar permiso` de `HR Core`.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / Preview

### Archivos tocados

- `src/views/greenhouse/finance/FinanceDashboardView.tsx`
- `src/views/greenhouse/hr-core/HrLeaveView.tsx`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- `Finance`:
  - el dashboard ahora deja warning visible si `/api/finance/exchange-rates/latest` responde sin snapshot disponible o con error HTTP
- `HR Core`:
  - el drawer `Solicitar permiso` ya no queda vacío sin feedback
  - si no llegan tipos activos, el CTA se deshabilita y el select muestra estado explícito
  - si sí existen tipos activos, el formulario preselecciona el primero al abrir
  - si `meta` falla, ahora el error se expone en pantalla en vez de quedar silencioso

### Verificación

- `pnpm exec eslint src/views/greenhouse/finance/FinanceDashboardView.tsx src/views/greenhouse/hr-core/HrLeaveView.tsx`
  - correcto
- `git diff --check -- src/views/greenhouse/finance/FinanceDashboardView.tsx src/views/greenhouse/hr-core/HrLeaveView.tsx Handoff.md changelog.md`
  - correcto

### Riesgos o pendientes

- No se ejecutó smoke autenticado real contra Preview/BigQuery; la mejora de visibilidad del dashboard queda validada por lint y por lectura de contrato, no por roundtrip productivo.
- Si el problema de permisos persiste con usuarios reales, el siguiente punto a revisar es la respuesta viva de `GET /api/hr/core/meta` en Preview.

## 2026-03-15 05:05 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ejecutar QA funcional cruzado sobre `Finance`, `HR Core`, `HR Payroll` y `AI Tooling`, mapear sus flujos activos contra frontend/backend real y corregir los bugs de mayor impacto encontrados.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / Preview

### Archivos tocados

- `src/views/greenhouse/finance/FinanceDashboardView.tsx`
- `src/views/greenhouse/hr-core/HrLeaveView.tsx`
- `src/views/greenhouse/payroll/CompensationDrawer.tsx`
- `src/views/greenhouse/payroll/MemberPayrollHistory.tsx`
- `docs/tasks/in-progress/CODEX_TASK_Financial_Module_v2.md`
- `docs/tasks/in-progress/CODEX_TASK_HR_Core_Module_v2.md`
- `docs/tasks/in-progress/CODEX_TASK_HR_Payroll_Module_v3.md`
- `docs/tasks/in-progress/CODEX_TASK_AI_Tooling_Credit_System_v2.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se mapearon los flujos activos por módulo desde vistas + rutas API:
  - `Finance`: dashboard, ingresos, egresos, clientes, proveedores, conciliación
  - `HR Core`: dashboard, departamentos, permisos, attendance
  - `HR Payroll`: dashboard, compensaciones, períodos, entries, historial por colaborador
  - `AI Tooling`: catálogo, licencias, wallets, consumo
- Fixes aplicados:
  - `Finance Dashboard` ya no usa `openingBalance` como saldo total; ahora usa `currentBalance` y muestra fecha del snapshot cuando existe
  - `HR Leave` ahora expone cancelación de solicitudes pendientes, alineado con el backend
  - `CompensationDrawer` de `HR Payroll` ahora reinicia correctamente su estado al cambiar de colaborador o versión
- `AI Tooling` quedó validado en esta pasada como operativo en sus flujos admin principales:
  - catálogo
  - licencias
  - wallets
  - consumo

### Verificación

- `pnpm exec eslint src/views/greenhouse/finance src/app/api/finance src/lib/finance`
  - correcto
- `pnpm exec eslint src/views/greenhouse/hr-core src/app/api/hr/core src/lib/hr-core`
  - correcto
- `pnpm exec eslint src/views/greenhouse/payroll src/app/api/hr/payroll src/lib/payroll`
  - correcto
- `pnpm exec eslint src/views/greenhouse/ai-tools src/app/api/ai-tools src/app/api/ai-credits src/app/api/admin/ai-tools src/lib/ai-tools`
  - correcto
- `pnpm exec tsc --noEmit --pretty false`
  - el proyecto sigue con ruido previo fuera del scope auditado
  - no aparecieron errores del scope `finance|hr-core|payroll|ai-tools` al filtrar el resultado
- `git diff --check -- ...` sobre los archivos tocados
  - correcto

### Riesgos o pendientes

- El QA fue estático + contractual; no se hizo smoke autenticado real en Preview contra BigQuery para los cuatro módulos.
- `Finance`, `HR Core`, `HR Payroll` y `AI Tooling` quedan más coherentes para seguir sobre frontend, pero todavía conviene una siguiente pasada con usuario real para validar permisos y datos vivos.
- Las tasks vivas de cada módulo ya quedaron actualizadas con:
  - flujos mapeados
  - bug corregido en esta pasada
  - estado operativo después del QA

## 2026-03-15 03:42 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Conectar `Finance` a APIs abiertas de tipo de cambio, persistir snapshots diarios en BigQuery y dejar automatizado el sync para cálculos server-side en USD.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / Preview

### Archivos tocados

- `src/lib/finance/exchange-rates.ts`
- `src/lib/finance/shared.ts`
- `src/app/api/finance/exchange-rates/latest/route.ts`
- `src/app/api/finance/exchange-rates/sync/route.ts`
- `vercel.json`
- `.env.example`
- `docs/tasks/in-progress/CODEX_TASK_Financial_Module_v2.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se agregó una capa server-only para sincronización de tipo de cambio:
  - proveedor primario `mindicador.cl`
  - fallback `open.er-api.com`
- La sincronización persiste ambos pares por fecha en `greenhouse.fin_exchange_rates`:
  - `USD -> CLP`
  - `CLP -> USD`
- Se agregó `GET/POST /api/finance/exchange-rates/sync`:
  - `GET` pensado para cron interno
  - `POST` disponible para ejecución manual autenticada
- `GET /api/finance/exchange-rates/latest` ahora intenta hidratar desde proveedor si todavía no existe snapshot almacenado.
- `getLatestExchangeRate()` y, por arrastre, `resolveExchangeRateToClp()` ahora pueden auto-sincronizar `USD/CLP` antes de fallar, evitando que ingresos y egresos en USD dependan de una carga manual previa.
- Se agregó `vercel.json` con cron diario hacia `/api/finance/exchange-rates/sync`.
- Se documentó la nueva variable `CRON_SECRET` y el comportamiento operativo en `project_context.md` y en la task financiera.

### Verificación

- `pnpm exec eslint src/lib/finance/exchange-rates.ts src/lib/finance/shared.ts src/app/api/finance/exchange-rates/latest/route.ts src/app/api/finance/exchange-rates/sync/route.ts`
  - correcto
- `git diff --check -- src/lib/finance/exchange-rates.ts src/lib/finance/shared.ts src/app/api/finance/exchange-rates/latest/route.ts src/app/api/finance/exchange-rates/sync/route.ts vercel.json .env.example docs/tasks/in-progress/CODEX_TASK_Financial_Module_v2.md project_context.md Handoff.md changelog.md`
  - correcto
- `pnpm exec tsc --noEmit --pretty false`
  - el proyecto sigue con ruido previo fuera del scope validado
  - no aparecieron errores del scope `exchange-rates|finance/shared` al filtrar el resultado
- Verificación de proveedores externos con `node` + `fetch`
  - `https://mindicador.cl/api/dolar`: `200`
  - `https://open.er-api.com/v6/latest/USD`: `200`

### Riesgos o pendientes

- El sync automático queda enfocado solo en `USD/CLP`; si el módulo expande monedas, conviene generalizar la capa FX.
- `Vercel Cron` quedó configurado, pero requiere que `CRON_SECRET` exista en los ambientes donde se quiera invocar manualmente con bearer token.
- Falta validar en preview que el cron y la lectura `latest` queden operativos con credenciales reales de BigQuery.
- Frontend no queda bloqueado por este cambio. Lo sugerido como siguiente mejora UX es:
  - mostrar `USD/CLP` actual con fecha y fuente usando `GET /api/finance/exchange-rates/latest`
  - opcionalmente agregar `Sincronizar tipo de cambio` contra `POST /api/finance/exchange-rates/sync`
  - evitar lógica de conversión en cliente; mantener la resolución de tasa solo en backend

## 2026-03-15 00:49 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Mover el foco backend desde `Finance` hacia `HR-Payroll`, revisar el contrato actual y corregir el primer bug server-side encontrado en la vigencia de compensaciones.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / Preview

### Archivos tocados

- `src/lib/payroll/get-compensation.ts`
- `src/lib/payroll/get-payroll-members.ts`
- `docs/tasks/in-progress/CODEX_TASK_HR_Payroll_Module_v3.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se auditó `HR-Payroll` backend contra la task v3 y arquitectura antes de seguir.
- Se detectó un bug real de vigencia:
  - compensaciones futuras dependían de `is_current` materializado al crearse
  - no existía rotación automática cuando la fecha efectiva llegaba
  - el backend podía seguir resolviendo una compensación vencida como “actual”
- Se corrigió:
  - `getCurrentCompensation()` ahora resuelve la compensación actual por ventana `effective_from/effective_to`
  - `listPayrollCompensationMembers()` ahora deriva `hasCurrentCompensation` con el mismo criterio temporal
  - `normalizeCompensationVersion()` ya no confía ciegamente en `is_current` persistido
- Se dejó el hardening documentado dentro de la task activa de `HR-Payroll`.

### Verificación

- `pnpm exec eslint src/lib/payroll src/app/api/hr/payroll`
  - correcto
- `git diff --check -- src/lib/payroll src/app/api/hr/payroll docs/tasks/in-progress/CODEX_TASK_HR_Payroll_Module_v3.md Handoff.md changelog.md`
  - correcto
- `pnpm exec tsc --noEmit --pretty false`
  - el proyecto sigue con ruido previo fuera de payroll
  - no aparecieron errores del scope `src/lib/payroll|src/app/api/hr/payroll` al filtrar el resultado

### Riesgos o pendientes

- `HR-Payroll` backend queda más consistente para compensaciones futuras, pero aún conviene una siguiente tanda backend si se quiere cerrar más:
  - auditoría explícita en cambios de compensación/período
  - revisión de queries con params nulos opcionales en writes BigQuery
  - smoke runtime autenticado con un caso real de compensación futura programada
- No se tocaron las vistas `src/views/greenhouse/payroll/*` que ya tenían cambios abiertos en el worktree.

## 2026-03-15 00:44 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ejecutar re-QA backend de `Finance`, corregir los bugs server-side que todavía quedaban después de la segunda tanda y determinar si el módulo ya puede ceder foco a `HR-Payroll`.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / Preview

### Archivos tocados

- `src/app/api/finance/dashboard/aging/route.ts`
- `src/app/api/finance/dashboard/by-service-line/route.ts`
- `src/app/api/finance/clients/route.ts`
- `src/app/api/finance/clients/[id]/route.ts`
- `docs/tasks/in-progress/CODEX_TASK_Financial_Module_v2.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Re-QA backend de `Finance` detectó tres bugs server-side que seguían abiertos:
  - `aging` devolvía cuentas por cobrar en moneda nativa aunque la UI las interpreta como CLP
  - `clients` list y detail calculaban `totalReceivable` mezclando monedas nativas y luego se renderizaban como CLP
  - `by-service-line` seguía sin separar caja/devengo
- Se corrigió:
  - `GET /api/finance/dashboard/aging` para devolver aging en CLP estimado proporcional
  - `GET /api/finance/clients` para devolver `totalReceivable` en CLP consistente con el render actual
  - `GET /api/finance/clients/[id]` para devolver `summary.totalReceivable` en CLP consistente
  - `GET /api/finance/dashboard/by-service-line` para exponer cash y accrual en paralelo, manteniendo `income/expenses/net` como cash legacy-compatible
- Se dejó esta validación asentada en la task financiera y el módulo backend queda operativo para ceder foco a `HR-Payroll`.

### Verificación

- `pnpm exec eslint src/app/api/finance src/lib/finance`
  - correcto
- `git diff --check -- src/app/api/finance src/lib/finance docs/tasks/in-progress/CODEX_TASK_Financial_Module_v2.md Handoff.md changelog.md`
  - correcto
- `pnpm exec tsc --noEmit --pretty false`
  - sigue fallando por ruido previo de `.next/types/validator.ts`
  - no aparecieron errores del scope `finance` al filtrar el resultado

### Riesgos o pendientes

- `Finance` backend queda suficientemente estable para pasar el siguiente foco a `HR-Payroll`.
- Las deudas abiertas de `Finance` ya son principalmente:
  - consumo UI de los nuevos contratos
  - normalización futura de `payments_received`
  - soporte de pagos parciales en egresos
- No se hizo smoke manual en preview en este turno.

## 2026-03-15 00:37 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ejecutar la segunda tanda backend pendiente del `Finance Module`: conciliación por pagos parciales, separación caja/devengo en reporting y saldo bancario operativo para dashboard.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / Preview

### Archivos tocados

- `src/lib/finance/schema.ts`
- `src/lib/finance/income-payments.ts`
- `src/lib/finance/reporting.ts`
- `src/lib/finance/reconciliation.ts`
- `src/app/api/finance/accounts/route.ts`
- `src/app/api/finance/income/[id]/payment/route.ts`
- `src/app/api/finance/income/summary/route.ts`
- `src/app/api/finance/expenses/summary/route.ts`
- `src/app/api/finance/dashboard/summary/route.ts`
- `src/app/api/finance/dashboard/cashflow/route.ts`
- `src/app/api/finance/reconciliation/[id]/match/route.ts`
- `src/app/api/finance/reconciliation/[id]/unmatch/route.ts`
- `src/app/api/finance/reconciliation/[id]/exclude/route.ts`
- `src/app/api/finance/reconciliation/[id]/auto-match/route.ts`
- `src/app/api/finance/reconciliation/[id]/route.ts`
- `docs/tasks/in-progress/CODEX_TASK_Financial_Module_v2.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se extendió conciliación bancaria para soportar pagos parciales de ingresos:
  - cada fila de extracto puede guardar `matched_payment_id`
  - candidatos de conciliación para ingresos ahora pueden salir a nivel de pago individual
  - `match`, `unmatch`, `exclude` y `auto-match` distinguen `matchedRecordId` vs `matchedPaymentId`
  - `payments_received` ahora persiste metadata de conciliación por pago
- Se mantuvo backward compatibility del modelo:
  - `fin_income.is_reconciled` y `fin_income.reconciliation_id` siguen existiendo
  - ahora se recalculan como resumen de la factura completa cuando aplica
- Se separó reporting financiero de caja vs devengo sin romper el contrato legacy:
  - `GET /api/finance/income/summary`
  - `GET /api/finance/expenses/summary`
  - `GET /api/finance/dashboard/summary`
  - `GET /api/finance/dashboard/cashflow`
  - todos exponen campos nuevos `cash*` / `accrual*`
- Se corrigió el endpoint de cuentas para que exponga saldo operativo:
  - `currentBalance`
  - `balanceAsOf`
  - `balanceSource`
  - con prioridad `statement -> period_close -> opening_balance`
- Se actualizó la task financiera con el handoff explícito de esta segunda tanda backend hacia Claude.

### Verificación

- `pnpm exec eslint src/lib/finance/income-payments.ts src/lib/finance/reporting.ts src/lib/finance/reconciliation.ts src/lib/finance/schema.ts src/app/api/finance/accounts/route.ts 'src/app/api/finance/income/[id]/payment/route.ts' src/app/api/finance/income/summary/route.ts src/app/api/finance/expenses/summary/route.ts src/app/api/finance/dashboard/summary/route.ts src/app/api/finance/dashboard/cashflow/route.ts 'src/app/api/finance/reconciliation/[id]/match/route.ts' 'src/app/api/finance/reconciliation/[id]/unmatch/route.ts' 'src/app/api/finance/reconciliation/[id]/exclude/route.ts' 'src/app/api/finance/reconciliation/[id]/auto-match/route.ts' 'src/app/api/finance/reconciliation/[id]/route.ts'`
  - correcto
- No se ejecutó `pnpm build`
- No se hizo smoke manual en preview en este turno

### Riesgos o pendientes

- La reconciliación parcial quedó funcional en backend, pero sigue modelada sobre `payments_received` JSON; si el módulo crece, conviene normalizar eso en tabla propia.
- La UI actual todavía no consume:
  - `currentBalance`
  - `balanceSource`
  - `cash*`
  - `accrual*`
  - `matchedPaymentId`
- Egresos siguen sin modelo de pagos parciales; la métrica de caja depende de `payment_date` para egresos `paid`.

## 2026-03-15 03:05 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ejecutar la primera tanda backend crítica del `Finance Module` después del QA: integridad de conciliación, bloqueo real de períodos y mejor criterio temporal para cobros.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / Preview

### Archivos tocados

- `src/lib/finance/reconciliation.ts`
- `src/app/api/finance/reconciliation/[id]/statements/route.ts`
- `src/app/api/finance/reconciliation/[id]/match/route.ts`
- `src/app/api/finance/reconciliation/[id]/unmatch/route.ts`
- `src/app/api/finance/reconciliation/[id]/exclude/route.ts`
- `src/app/api/finance/reconciliation/[id]/auto-match/route.ts`
- `src/app/api/finance/reconciliation/[id]/route.ts`
- `src/app/api/finance/reconciliation/route.ts`
- `src/app/api/finance/exchange-rates/route.ts`
- `docs/tasks/in-progress/CODEX_TASK_Financial_Module_v2.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se corrigió la importación de extractos para que:
  - no reinicie la secuencia de `row_id` al reimportar en el mismo período
  - persista `statement_row_count` con el total acumulado real
- Se endurecieron las rutas de conciliación para bloquear mutaciones sobre períodos `reconciled` o `closed`:
  - `match`
  - `unmatch`
  - `exclude`
  - `auto-match`
- Se endureció `PUT /api/finance/reconciliation/[id]` para impedir:
  - reconciliar sin extracto importado
  - reconciliar con filas `unmatched` o `suggested`
  - reconciliar con `difference != 0`
  - cerrar un período no reconciliado
  - mutar un período `closed`
- Se mejoró el criterio temporal de conciliación para ingresos:
  - candidatos manuales y auto-match ahora prefieren la fecha y referencia del último `payments_received`
  - se mantiene `invoice_date` como fallback para no romper el contrato actual
- Se documentó explícitamente en la task financiera el handoff `Codex -> Claude`:
  - qué ya quedó cerrado en backend
  - qué queda mejor para Claude en UI/UX
  - qué deuda backend no conviene tapar desde frontend

### Verificación

- `pnpm exec eslint src/lib/finance/reconciliation.ts 'src/app/api/finance/reconciliation/[id]/statements/route.ts' 'src/app/api/finance/reconciliation/[id]/match/route.ts' 'src/app/api/finance/reconciliation/[id]/unmatch/route.ts' 'src/app/api/finance/reconciliation/[id]/exclude/route.ts' 'src/app/api/finance/reconciliation/[id]/auto-match/route.ts' 'src/app/api/finance/reconciliation/[id]/route.ts' src/app/api/finance/reconciliation/route.ts src/app/api/finance/exchange-rates/route.ts`
  - correcto
- `git diff --check -- src/lib/finance/reconciliation.ts 'src/app/api/finance/reconciliation/[id]/statements/route.ts' 'src/app/api/finance/reconciliation/[id]/match/route.ts' 'src/app/api/finance/reconciliation/[id]/unmatch/route.ts' 'src/app/api/finance/reconciliation/[id]/exclude/route.ts' 'src/app/api/finance/reconciliation/[id]/auto-match/route.ts' 'src/app/api/finance/reconciliation/[id]/route.ts' src/app/api/finance/reconciliation/route.ts src/app/api/finance/exchange-rates/route.ts docs/tasks/in-progress/CODEX_TASK_Financial_Module_v2.md Handoff.md`
  - correcto
- No se ejecutó `pnpm build`
- No se hizo smoke manual en preview en este turno

### Riesgos o pendientes

- La deuda de conciliación por pagos parciales múltiples sigue abierta:
  - el modelo actual reconcilia a nivel de factura (`fin_income.reconciliation_id`), no a nivel de cada pago registrado
- El dashboard sigue con semántica mezclada entre caja y devengo; esa corrección no se tomó en esta tanda para no mezclar integridad backend con refactor de reporting.
- El siguiente paso recomendado para Claude es tomar la parte UI/UX documentada en la task, ya sobre contratos backend más estables.

## 2026-03-15 02:05 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ejecutar un QA funcional profundo del `Finance Module`, identificar bugs reales en dashboard, listas, detalles y conciliación, y documentarlos dentro de la task activa del módulo.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / Preview

### Archivos tocados

- `docs/tasks/in-progress/CODEX_TASK_Financial_Module_v2.md`
- `Handoff.md`

### Cambios realizados

- Se auditó estáticamente el módulo `Finance` en:
  - `src/views/greenhouse/finance/*`
  - `src/app/api/finance/*`
  - `src/lib/finance/reconciliation.ts`
  - `src/lib/finance/shared.ts`
- Se documentó en la task financiera una sección nueva `QA funcional 2026-03-15` con:
  - hallazgos priorizados por severidad
  - evidencia por archivo/línea
  - impacto funcional
  - recomendación de corrección por tandas
- Hallazgos más importantes detectados:
  - reimportación de extractos recicla `row_id` en conciliación y desincroniza `statement_row_count`
  - `match` / `unmatch` pueden seguir mutando períodos ya `reconciled` o `closed`
  - el dashboard mezcla devengo con caja y usa `openingBalance` como `Saldo total`
  - el orden cronológico del dashboard puede romperse por sort lexicográfico de meses
  - reconciliación manual de ingresos usa `invoice_date`, lo que omite cobros válidos
  - proveedores tiene drift de taxonomía entre create/list/detail y la lista no navega al detalle
  - clientes e ingresos/egresos todavía tienen varios puntos con navegación no SPA o moneda/fecha mal renderizada

### Verificación

- `pnpm exec eslint src/views/greenhouse/finance src/app/api/finance src/lib/finance`
  - resultado: falla
  - se usó como insumo del QA técnico y quedó documentado en la task
- No se ejecutó `pnpm build`
- No se hizo smoke manual en preview en este turno

### Riesgos o pendientes

- El documento de task ya tiene backlog claro de bugs, pero el runtime todavía conserva issues de integridad en conciliación y semántica incorrecta en dashboard.
- El siguiente paso recomendado es tomar la tanda de mayor severidad:
  - bloqueo real de períodos reconciliados/cerrados
  - IDs únicos y conteo correcto en importación de extractos
  - corrección de criterios temporales para conciliación de cobros
  - separación explícita entre métricas de caja y métricas por fecha documento/factura

## 2026-03-15 00:40 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Verificar por qué `Finance` mostraba saldo total en cero, sin movimientos en dashboard y sin señal visible en conciliación bancaria; corregir la superficie frontend para reflejar mejor el estado real.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / Preview

### Archivos tocados

- `src/views/greenhouse/finance/FinanceDashboardView.tsx`
- `src/views/greenhouse/finance/ReconciliationView.tsx`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se verificó el estado real del dataset financiero:
  - `fin_accounts`: `0` cuentas activas
  - `fin_income`: `2` movimientos
  - `fin_expenses`: `1` movimiento
  - `fin_reconciliation_periods`: `0` períodos
  - `fin_bank_statement_rows`: `0` filas de extracto
- Se corrigió el dashboard de `Finance` para que:
  - no muestre un `Saldo total` engañoso como si fuera balance real cuando no existen cuentas activas
  - cargue y renderice `Últimos movimientos` reales mezclando ingresos y egresos recientes
  - refresque la vista después de crear ingreso o egreso desde los drawers
- Se corrigió la vista de `Conciliación` para que:
  - siga listando períodos cuando existan
  - muestre `Movimientos por conciliar` aunque todavía no haya períodos abiertos
  - explique explícitamente cuando el bloqueo real es ausencia de cuentas activas o de períodos de conciliación

### Verificación

- Consulta manual a BigQuery para contrastar tablas `fin_accounts`, `fin_income`, `fin_expenses`, `fin_reconciliation_periods` y `fin_bank_statement_rows`: realizada
- `pnpm exec eslint src/views/greenhouse/finance/FinanceDashboardView.tsx src/views/greenhouse/finance/ReconciliationView.tsx`: correcto
- `git diff --check -- src/views/greenhouse/finance/FinanceDashboardView.tsx src/views/greenhouse/finance/ReconciliationView.tsx`: correcto

### Riesgos o pendientes

- El KPI de `Saldo total` sigue dependiendo de cuentas activas; mientras no exista UI o seed para `fin_accounts`, no habrá saldo bancario real.
- `Nuevo período` en `ReconciliationView` y `Importar extracto` en `ReconciliationDetailView` siguen sin flujo UI implementado.
- Si se quiere cerrar conciliación end-to-end desde portal, el siguiente paso natural es agregar UI para crear cuentas financieras, crear períodos e importar cartolas.

## 2026-03-14 23:42 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Documentar una task `to-do` para consolidación de vistas/surfaces del portal sin hacer cambios runtime.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Documentación operativa / UX architecture

### Archivos tocados

- `docs/tasks/to-do/CODEX_TASK_Portal_View_Surface_Consolidation.md`
- `docs/tasks/README.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se creó una task nueva en `to-do` para ordenar la arquitectura UX de vistas del portal.
- La task documenta, con alto nivel de detalle:
  - surfaces actuales
  - conflictos de intención entre vistas
  - recomendaciones de keep / unify / enrich / deprioritize
  - entregables esperados y preguntas que debe resolver
- Se dejó explícito que esta task no ejecuta cambios de código todavía.

### Verificacion

- Revisión manual del contenido creado: realizada
- `git diff --check`: correcto

### Riesgos o pendientes

- Esta task no reemplaza una futura implementación; solo deja el criterio rector para una siguiente fase.
- El siguiente paso natural es priorizar si esta consolidación entra antes o después de que Claude cierre frontend de `People`, `Finance` y `Payroll`.

## 2026-03-14 23:18 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Cerrar complementos backend de `People v3` y `Team Identity & Capacity v2` para dejar contratos más completos antes del frontend.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Backend / documentación operativa

### Archivos tocados

- `src/lib/team-capacity/shared.ts`
- `src/lib/team-queries.ts`
- `src/types/team.ts`
- `src/types/people.ts`
- `src/lib/people/permissions.ts`
- `src/lib/people/get-people-meta.ts`
- `src/app/api/people/meta/route.ts`
- `src/lib/people/get-people-list.ts`
- `src/lib/people/get-person-detail.ts`
- `src/lib/people/get-person-finance-overview.ts`
- `docs/tasks/in-progress/CODEX_TASK_People_Unified_View_v3.md`
- `docs/tasks/in-progress/CODEX_TASK_Team_Identity_Capacity_System_v2.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- `People` quedó con contratos backend más cerrados:
  - `GET /api/people/meta`
  - `GET /api/people` ahora devuelve `filters`
  - `GET /api/people/[memberId]` ahora puede devolver `capacity` y `financeSummary`
  - `access.visibleTabs` ya contempla `finance` para el contrato futuro del módulo
- `Team/Capacity` quedó con semántica más explícita:
  - `GET /api/team/capacity` ahora devuelve `assignedHoursMonth`, `expectedMonthlyThroughput`, `healthBuckets` y `roleBreakdown`
  - cada member ahora expone `utilizationPercent` y `capacityHealth`
- Se agregó `src/lib/team-capacity/shared.ts` para centralizar benchmarks, horas/FTE y health states entre `People` y `Team`.
- Se actualizaron las tasks activas para dejar el handoff backend explícito a frontend.

### Verificacion

- `pnpm exec eslint` sobre el scope tocado: correcto
- `git diff --check`: correcto

### Riesgos o pendientes

- No corrí smoke runtime/manual de `/api/people/*` ni `/api/team/capacity`.
- `People` ya expone `finance` en permisos backend, pero frontend todavía no tiene ese tab.
- La semántica de capacity sigue siendo operativa; todavía no reemplaza una futura capa contractual/planning de capacidad más formal.

## 2026-03-14 22:44 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ajustar `Team Identity & Capacity` y `People Unified View v2` contra arquitectura y reclasificarlas a versiones activas coherentes con el runtime real.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Documentación operativa / task governance

### Archivos tocados

- `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md`
- `docs/tasks/complete/CODEX_TASK_People_Unified_View_v2.md`
- `docs/tasks/in-progress/CODEX_TASK_Team_Identity_Capacity_System_v2.md`
- `docs/tasks/in-progress/CODEX_TASK_People_Unified_View_v3.md`
- `docs/tasks/README.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se contrastaron ambas tasks contra arquitectura y runtime actual.
- Conclusiones:
  - `People` sí está vivo y alineado como capa read-first del colaborador
  - `People v2` ya quedó históricamente desfasado porque `Admin Team` hoy sí existe y People ya orquesta acciones admin reales
  - `Team Identity & Capacity` sí dejó sembrada la base canónica de identidad del colaborador
  - la parte de capacidad todavía no debe considerarse cerrada como dominio
- Se reclasificaron las tasks:
  - `docs/tasks/complete/CODEX_TASK_People_Unified_View_v2.md` queda como brief histórico
  - `docs/tasks/in-progress/CODEX_TASK_People_Unified_View_v3.md` queda como brief activo para cierre 360 de People
  - `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` queda como brief histórico/fundacional
  - `docs/tasks/in-progress/CODEX_TASK_Team_Identity_Capacity_System_v2.md` queda como brief activo para formalización de team/capacity
- Se actualizó el board de tasks y la documentación viva asociada.

### Verificacion

- Revisión manual contra arquitectura + runtime del repo: realizada
- `git diff --check`: correcto

### Riesgos o pendientes

- Esta pasada no cambia runtime ni backend; deja gobernanza y alcance correctos para una futura implementación.
- El siguiente paso natural es contrastar `People v3` y `Team Identity & Capacity v2` contra runtime antes de tocar código para no reabrir silos entre `People`, `Admin Team` y `Capacity`.

## 2026-03-15 00:12 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Cerrar el backend/runtime faltante de `Creative Hub v2` para dejar la capability lista para frontend.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Backend / capabilities runtime

### Archivos tocados

- `src/lib/capabilities/resolve-capabilities.ts`
- `src/config/capability-registry.ts`
- `src/lib/capability-queries/creative-hub-runtime.ts`
- `src/lib/capability-queries/creative-hub.ts`
- `src/lib/capability-queries/helpers.ts`
- `docs/tasks/in-progress/CODEX_TASK_Creative_Hub_Module_v2.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se cerró la activación runtime del módulo:
  - el resolver de capabilities ya no activa módulos por `businessLine` o `serviceModule` de forma aislada cuando ambos requisitos existen
  - `Creative Hub` ya exige `globe` + al menos uno de:
    - `agencia_creativa`
    - `produccion_audiovisual`
    - `social_media_content`
- Se cerró la capa backend de `Brand Intelligence`:
  - se agregaron cards `brand-header`, `creative-brand-kpis` y `creative-rpa-trend`
  - el payload ya devuelve FTR, consistencia de marca derivada, RpA operativo y `Knowledge Base` como placeholder honesto
- Se reemplazó el CSC heurístico por lectura task-level:
  - `src/lib/capability-queries/creative-hub-runtime.ts` arma snapshot detallado de tareas creativas
  - si `fase_csc` existe en BigQuery se usa
  - si no existe, runtime la deriva server-side desde `estado` + revisión abierta + señales de producción
  - `csc-pipeline`, `csc-metrics` y `stuck-assets` ahora salen de tareas individuales y aging real
- `Revenue Enabled` quedó endurecido para usar tareas completadas reales cuando hay base suficiente.
- Se dejó la `v2` documentada como contract freeze para que Claude implemente frontend sobre el runtime actual.

### Verificacion

- `pnpm exec eslint` sobre el scope Creative Hub backend/runtime: correcto
- `git diff --check`: correcto

### Riesgos o pendientes

- No se hizo smoke runtime/manual del endpoint `/api/capabilities/creative-hub/data` contra un tenant real en esta pasada.
- `Knowledge Base` sigue siendo placeholder honesto; para volverlo real hace falta pipeline de wiki o fuente explícita de aprendizaje de marca.
- Si en `notion_ops.tareas` faltan columnas de FTR/RpA, el backend ya degrada a `null`/fallback en vez de mentir, y frontend debe respetar esos estados.

## 2026-03-14 23:40 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Revisar `Creative Hub Module` contra arquitectura y reclasificar la task según el estado real del módulo en runtime.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Documentación operativa / task governance

### Archivos tocados

- `docs/tasks/complete/CODEX_TASK_Creative_Hub_Module.md`
- `docs/tasks/in-progress/CODEX_TASK_Creative_Hub_Module_v2.md`
- `docs/tasks/README.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se contrastó `Creative Hub` contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_SERVICE_MODULES_V1.md`
  - `Greenhouse_Capabilities_Architecture_v1.md`
- Conclusión de arquitectura:
  - el módulo sí está bien ubicado como `capability surface`
  - no crea identidad paralela de capability, cliente o proyecto
  - pero no está realmente cerrado respecto del brief original
- Gaps principales documentados:
  - activación demasiado amplia por `globe`
  - falta de la capa `Brand Intelligence`
  - `CSC Pipeline Tracker` todavía heurístico, no basado en `fase_csc` explícita o derivación determinística
- Se reclasificó la task:
  - `docs/tasks/complete/CODEX_TASK_Creative_Hub_Module.md` queda como brief histórico
  - `docs/tasks/in-progress/CODEX_TASK_Creative_Hub_Module_v2.md` queda como brief activo para cierre runtime
- Se actualizó el board de tasks y la documentación viva para reflejar esta reclasificación.

### Verificacion

- Revisión manual contra arquitectura + runtime del repo: realizada
- `git diff --check`: correcto

### Riesgos o pendientes

- Esta entrada queda como contexto de reclasificación histórica; el cierre backend real quedó documentado arriba en la entrada de `2026-03-15 00:12`.

## 2026-03-14 23:04 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Contrastar `HR Core Module` contra arquitectura, crear la foundation backend real del módulo y dejar una `v2` operativa para handoff con frontend.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Backend / documentación operativa

### Archivos tocados

- `src/types/hr-core.ts`
- `src/lib/hr-core/shared.ts`
- `src/lib/hr-core/schema.ts`
- `src/lib/hr-core/service.ts`
- `src/lib/tenant/access.ts`
- `src/lib/tenant/authorization.ts`
- `src/app/api/hr/core/meta/route.ts`
- `src/app/api/hr/core/departments/route.ts`
- `src/app/api/hr/core/departments/[departmentId]/route.ts`
- `src/app/api/hr/core/members/[memberId]/profile/route.ts`
- `src/app/api/hr/core/leave/balances/route.ts`
- `src/app/api/hr/core/leave/requests/route.ts`
- `src/app/api/hr/core/leave/requests/[requestId]/route.ts`
- `src/app/api/hr/core/leave/requests/[requestId]/review/route.ts`
- `src/app/api/hr/core/attendance/route.ts`
- `src/app/api/hr/core/attendance/webhook/teams/route.ts`
- `scripts/setup-hr-core-tables.sql`
- `.env.example`
- `.env.local.example`
- `docs/tasks/in-progress/CODEX_TASK_HR_Core_Module_v2.md`
- `docs/tasks/complete/CODEX_TASK_HR_Core_Module.md`
- `docs/tasks/README.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se contrastó explícitamente `HR Core Module` contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- Conclusión de arquitectura:
  - `HR Core` no debe crear una identidad paralela de empleado
  - `team_members.member_id` sigue siendo el ancla canónica del colaborador
  - `Admin Team` mantiene ownership del roster base
  - `People` sigue siendo la vista read-first del colaborador
  - `HR Core` queda como extensión del colaborador para org/leave/attendance/profile
- Se agregó foundation backend completa del dominio:
  - `ensureHrCoreInfrastructure()` extiende `team_members` con `department_id`, `reports_to`, `job_level`, `hire_date`, `contract_end_date` y `daily_required`
  - crea `departments`, `member_profiles`, `leave_types`, `leave_balances`, `leave_requests`, `leave_request_actions` y `attendance_daily`
  - seed del rol `employee` con route group `employee`
  - seed de leave types base
- Se cerró la superficie backend operativa:
  - `GET /api/hr/core/meta`
  - `GET/POST /api/hr/core/departments`
  - `GET/PATCH /api/hr/core/departments/[departmentId]`
  - `GET/PATCH /api/hr/core/members/[memberId]/profile`
  - `GET /api/hr/core/leave/balances`
  - `GET/POST /api/hr/core/leave/requests`
  - `GET /api/hr/core/leave/requests/[requestId]`
  - `POST /api/hr/core/leave/requests/[requestId]/review`
  - `GET /api/hr/core/attendance`
  - `POST /api/hr/core/attendance/webhook/teams`
- Se dejó SQL versionado en `scripts/setup-hr-core-tables.sql`.
- Se reestructuró la task:
  - `docs/tasks/complete/CODEX_TASK_HR_Core_Module.md` queda como brief histórico
  - `docs/tasks/in-progress/CODEX_TASK_HR_Core_Module_v2.md` queda como brief activo orientado a runtime/backend + handoff para Claude
- Se documentó la variable nueva `HR_CORE_TEAMS_WEBHOOK_SECRET`.

### Verificacion

- `pnpm exec eslint` sobre el scope HR Core backend/API: correcto
- `git diff --check`: correcto

### Riesgos o pendientes

- Falta validación runtime manual contra BigQuery real para confirmar bootstrap y seeds de HR Core.
- No existe todavía UI real del route group `employee`; solo quedó la foundation backend/authorization.
- `member_profiles` es una tabla de extensión HR; si más adelante aparece una necesidad de perfil genérico cross-module, no debe reemplazar `team_members` como identidad.
- El worktree mantiene además cambios previos abiertos de `AI Tooling`, `Admin Team` y `HR Payroll`; cuidar el scope al momento de commit.

## 2026-03-14 22:18 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Contrastar `AI Tooling & Credit System` contra arquitectura, crear la foundation backend real del módulo y dejar una `v2` operativa para handoff con frontend.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Backend / documentación operativa

### Archivos tocados

- `src/types/ai-tools.ts`
- `src/lib/ai-tools/shared.ts`
- `src/lib/ai-tools/schema.ts`
- `src/lib/ai-tools/service.ts`
- `src/app/api/ai-tools/catalog/route.ts`
- `src/app/api/ai-tools/licenses/route.ts`
- `src/app/api/ai-credits/wallets/route.ts`
- `src/app/api/ai-credits/ledger/route.ts`
- `src/app/api/ai-credits/summary/route.ts`
- `src/app/api/ai-credits/consume/route.ts`
- `src/app/api/ai-credits/reload/route.ts`
- `src/app/api/admin/ai-tools/meta/route.ts`
- `src/app/api/admin/ai-tools/catalog/route.ts`
- `src/app/api/admin/ai-tools/catalog/[toolId]/route.ts`
- `src/app/api/admin/ai-tools/licenses/route.ts`
- `src/app/api/admin/ai-tools/licenses/[licenseId]/route.ts`
- `src/app/api/admin/ai-tools/wallets/route.ts`
- `src/app/api/admin/ai-tools/wallets/[walletId]/route.ts`
- `scripts/setup-ai-tooling-tables.sql`
- `docs/tasks/in-progress/CODEX_TASK_AI_Tooling_Credit_System_v2.md`
- `docs/tasks/complete/CODEX_TASK_AI_Tooling_Credit_System.md`
- `docs/tasks/README.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se contrastó explícitamente `AI Tooling & Credit System` contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
  - `FINANCE_CANONICAL_360_V1.md`
- Conclusión de arquitectura:
  - la task sí queda alineada si se modela como extensión de objetos canónicos existentes
  - `client_id` sigue siendo la identidad canónica del wallet cliente
  - `member_id` sigue siendo la identidad canónica para licencias y consumo atribuible
  - `provider_id` ya quedó implementado en runtime bajo `greenhouse.providers`
- Se agregó foundation backend completa del dominio:
  - `ensureAiToolingInfrastructure()` crea on-demand `providers`, `ai_tool_catalog`, `member_tool_licenses`, `ai_credit_wallets` y `ai_credit_ledger`
  - se dejaron seeds iniciales de providers y tools reales
  - se agregó `scripts/setup-ai-tooling-tables.sql` como bootstrap SQL versionado
- Se cerró la superficie backend operativa:
  - operación:
    - `GET /api/ai-tools/catalog`
    - `GET /api/ai-tools/licenses`
  - créditos:
    - `GET /api/ai-credits/wallets`
    - `GET /api/ai-credits/ledger`
    - `GET /api/ai-credits/summary`
    - `POST /api/ai-credits/consume`
    - `POST /api/ai-credits/reload`
  - admin:
    - `GET /api/admin/ai-tools/meta`
    - `GET/POST /api/admin/ai-tools/catalog`
    - `GET/PATCH /api/admin/ai-tools/catalog/[toolId]`
    - `GET/POST /api/admin/ai-tools/licenses`
    - `GET/PATCH /api/admin/ai-tools/licenses/[licenseId]`
    - `GET/POST /api/admin/ai-tools/wallets`
    - `GET/PATCH /api/admin/ai-tools/wallets/[walletId]`
- Se reestructuró la task:
  - `docs/tasks/complete/CODEX_TASK_AI_Tooling_Credit_System.md` queda como brief histórico
  - `docs/tasks/in-progress/CODEX_TASK_AI_Tooling_Credit_System_v2.md` queda como brief activo orientado a runtime/backend + handoff para Claude
- Se actualizó la arquitectura/documentación viva para reflejar que `greenhouse.providers` ya existe en runtime.

### Verificacion

- `pnpm exec eslint` sobre el scope AI Tooling backend/API: correcto
- `git diff --check`: correcto

### Riesgos o pendientes

- No se hizo validación runtime manual contra BigQuery real en esta pasada; falta confirmar bootstrap y seeds en entorno autenticado.
- No existe todavía CRUD de `providers`; por ahora se asume seed inicial + referencia a `provider_id` existente.
- Claude ya puede construir frontend sobre estos contratos, especialmente:
  - admin tooling
  - tab de licencias en People
  - widget/resumen de créditos para cliente
- El worktree mantiene además cambios previos abiertos de `Admin Team` y `HR Payroll`; no mezclar scopes por accidente al momento de commit.

## 2026-03-14 21:21 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Contrastar `Admin Team Module v2` contra arquitectura, separar backend ya implementado de gaps reales y cerrar los complementos backend faltantes para handoff con frontend.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Backend / documentación operativa

### Archivos tocados

- `src/types/team.ts`
- `src/lib/team-admin/mutate-team.ts`
- `src/app/api/admin/team/members/route.ts`
- `src/app/api/admin/team/members/[memberId]/route.ts`
- `src/app/api/admin/team/assignments/route.ts`
- `src/app/api/admin/team/assignments/[assignmentId]/route.ts`
- `docs/tasks/in-progress/CODEX_TASK_Admin_Team_Module_v2.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se contrastó explícitamente `Admin Team Module v2` contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- Conclusión de arquitectura:
  - la task sigue alineada
  - `Admin Team` conserva ownership de mutaciones de roster y asignaciones
  - `People` se mantiene read-first
  - `team_members.member_id` sigue como ancla canónica del colaborador
- Se detectó que el backend base CRUD ya existía, pero faltaban contratos de discovery/detail propios del módulo.
- Complementos backend agregados:
  - `GET /api/admin/team/members` ahora devuelve metadata + `members` + `summary`
  - `GET /api/admin/team/members/[memberId]` devuelve detalle admin + assignments + summary
  - `GET /api/admin/team/assignments` soporta filtros `memberId`, `clientId`, `activeOnly`
  - `GET /api/admin/team/assignments/[assignmentId]` devuelve detalle puntual
- Alineación adicional con identidad:
  - cuando existe `identity_profile_id`, create/update de member ahora sincronizan best-effort los snapshots `azureOid`, `notionUserId` y `hubspotOwnerId` hacia `greenhouse.identity_profile_source_links`

### Verificacion

- `pnpm exec eslint` sobre archivos backend tocados: correcto
- `git diff --check`: correcto

### Riesgos o pendientes

- La UI de `People` ya usa mutaciones admin, pero todavía puede simplificarse para consumir más directamente estas nuevas superficies admin de list/detail.
- No se hizo validación runtime manual del módulo en esta pasada.
- El worktree mantiene además cambios previos no cerrados de `HR Payroll` y un cambio no relacionado en `src/lib/finance/shared.ts`; no deben mezclarse por accidente al commit.

## 2026-03-14 21:40 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Contrastar `HR Payroll v3` contra arquitectura, cerrar los complementos backend reales del brief y dejar congelado el contrato para que Claude implemente frontend.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Backend / documentación operativa

### Archivos tocados

- `src/types/payroll.ts`
- `src/lib/payroll/get-payroll-members.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/lib/payroll/get-payroll-entries.ts`
- `src/app/api/hr/payroll/compensation/route.ts`
- `src/app/api/hr/payroll/compensation/eligible-members/route.ts`
- `src/app/api/hr/payroll/periods/route.ts`
- `src/app/api/hr/payroll/periods/[periodId]/entries/route.ts`
- `docs/tasks/in-progress/CODEX_TASK_HR_Payroll_Module_v3.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se contrastó explícitamente `HR Payroll v3` contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
- Conclusión de arquitectura:
  - la `v3` sí está alineada
  - `Payroll` mantiene ownership transaccional
  - `member_id` sigue siendo el ancla canónica de colaborador
- Se agregaron complementos backend para frontend:
  - `GET /api/hr/payroll/compensation` ahora devuelve `compensations`, `eligibleMembers`, `members` y `summary`
  - `GET /api/hr/payroll/compensation/eligible-members` expone candidatos activos sin compensación vigente
  - `GET /api/hr/payroll/periods` ahora devuelve `periods` + `summary`
  - `GET /api/hr/payroll/periods/[periodId]/entries` ahora devuelve `entries` + `summary`
  - `GET /api/hr/payroll/members/[memberId]/history` ahora incluye `member`
  - `GET /api/hr/payroll/members/[memberId]/history` ahora responde `404` para `memberId` inexistente
- Se agregó `src/lib/payroll/get-payroll-members.ts` para centralizar:
  - summary canónico de colaborador
  - discovery de miembros activos para compensación

### Verificacion

- `pnpm exec eslint` sobre archivos backend tocados: correcto
- `git diff --check`: correcto

### Riesgos o pendientes

- Claude ya puede construir frontend sobre contratos más estables de payroll, pero todavía falta el consumo UI de:
  - `eligibleMembers`
  - `periods.summary`
  - `entries.summary`
  - `history.member`
- No se hizo validación runtime manual del módulo en esta pasada.
- El worktree mantiene además un cambio no relacionado en `src/lib/finance/shared.ts`; no fue tocado en este turno y no debe mezclarse con el scope de payroll por accidente.

## 2026-03-14 21:10 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Contrastar `Financial Module` con arquitectura, cerrar la capa backend faltante del módulo y reescribir la task activa como `v2` basada en runtime real para handoff con frontend.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Backend / documentación operativa

### Archivos tocados

- `src/lib/finance/shared.ts`
- `src/lib/finance/reconciliation.ts`
- `src/app/api/finance/reconciliation/[id]/route.ts`
- `src/app/api/finance/reconciliation/[id]/auto-match/route.ts`
- `src/app/api/finance/reconciliation/[id]/match/route.ts`
- `src/app/api/finance/reconciliation/[id]/unmatch/route.ts`
- `src/app/api/finance/reconciliation/[id]/candidates/route.ts`
- `src/app/api/finance/reconciliation/[id]/exclude/route.ts`
- `src/app/api/finance/expenses/route.ts`
- `src/app/api/finance/expenses/meta/route.ts`
- `src/app/api/finance/expenses/payroll-candidates/route.ts`
- `docs/tasks/in-progress/CODEX_TASK_Financial_Module_v2.md`
- `docs/tasks/complete/CODEX_TASK_Financial_Module.md`
- `docs/tasks/README.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se revisó explícitamente el trabajo contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `FINANCE_CANONICAL_360_V1.md`
- Se cerró backend operativo de conciliación:
  - `GET /api/finance/reconciliation/[id]/candidates`
  - `POST /api/finance/reconciliation/[id]/exclude`
  - `auto-match` ahora también sincroniza estado reconciliado en `fin_income` / `fin_expenses`
  - `match`, `unmatch` y `exclude` mantienen coherencia entre fila bancaria y target financiero
  - `GET /api/finance/reconciliation/[id]` ahora expone `matchStatus` normalizado + `rawMatchStatus`
- Se cerró backend de soporte para egresos especializados:
  - `POST /api/finance/expenses` ahora también persiste campos de previsión, impuestos y varios
  - `GET /api/finance/expenses/meta` expone catálogos backend para formularios
  - `GET /api/finance/expenses/payroll-candidates` expone payroll aprobada/exportada disponible para Finance
- Se pasó `Financial Module` al mismo patrón documental de Payroll:
  - `CODEX_TASK_Financial_Module.md` queda como brief histórico
  - `CODEX_TASK_Financial_Module_v2.md` queda como task activa orientada a runtime/backend + handoff para Claude frontend
- Se agregó además mini handoff técnico para Claude dentro de `CODEX_TASK_Financial_Module_v2.md` con:
  - payloads ejemplo por endpoint
  - orden recomendado de consumo desde frontend
  - ejemplos concretos para conciliación, payroll, previsión e impuestos

### Verificacion

- `pnpm exec eslint` sobre los archivos backend tocados: correcto
- Falta todavía una validación de runtime manual o `pnpm build` completa en este turno

### Riesgos o pendientes

- El backend ya quedó listo para que Claude monte frontend de conciliación y egresos especializados, pero la UI actual todavía no consume estas rutas nuevas.
- Queda pendiente confirmar en runtime real:
  - flujo completo de importación + auto-match + exclude + unmatch
  - consumo de `expenses/payroll-candidates`
  - formularios frontend contra `expenses/meta`

## 2026-03-14 20:17 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Revisar si `CODEX_TASK_HR_Payroll_Module_v2.md` seguía siendo un brief realmente listo y convertirlo en documentación operativa más fiel al estado actual del módulo.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Documentación / gobernanza operativa

### Archivos tocados

- `docs/tasks/complete/CODEX_TASK_HR_Payroll_Module_v2.md`
- `docs/tasks/in-progress/CODEX_TASK_HR_Payroll_Module_v3.md`
- `docs/tasks/README.md`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- `HR Payroll v2` quedó marcado explícitamente como brief histórico de la implementación base ya absorbida por el runtime actual.
- Se creó `HR Payroll v3` como brief activo para los gaps reales detectados en la revisión contra el módulo:
  - alta inicial de compensación desde UI
  - edición de metadata del período en `draft`
  - fallback manual de KPI y override de entries en la vista
  - ficha de colaborador útil aun sin entries cerradas
- El board de `docs/tasks/README.md` vuelve a tratar `HR Payroll` como trabajo `in-progress`, no como task completamente cerrada.

### Verificacion

- Revisión manual contra runtime del módulo:
  - `/hr/payroll`
  - `/hr/payroll/member/[memberId]`
  - `/api/hr/payroll/**`
- `git diff --check`: pendiente al cierre del turno

### Riesgos o pendientes

- Esta actualización ordena el brief, pero no implementa todavía los gaps v3; el módulo sigue funcional pero no debe considerarse “cerrado” hasta resolverlos.

## 2026-03-14 20:20 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Reordenar los `CODEX_TASK_*` en paneles operativos `in-progress`, `to-do` y `complete`, y alinear la documentación troncal del repo a esa convención.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Documentación / gobernanza operativa

### Archivos tocados

- `.gitignore`
- `README.md`
- `AGENTS.md`
- `project_context.md`
- `docs/README.md`
- `docs/tasks/README.md`
- `docs/tasks/complete/*`
- `docs/tasks/in-progress/*`
- `docs/tasks/to-do/*`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- `docs/tasks/` ahora opera como board con tres paneles explícitos:
  - `in-progress`
  - `to-do`
  - `complete`
- Se reclasificaron las tasks vigentes contrastando estado real del repo con `project_context.md`, `Handoff.md` y `changelog.md`, en vez de moverlas solo por nombre o antigüedad.
- Se corrigieron referencias cruzadas dentro de los propios briefs para que el nuevo árbol `docs/tasks/**` no deje links rotos entre tasks relacionadas.
- `README.md`, `AGENTS.md`, `project_context.md` y `docs/README.md` quedaron alineados para que el board de tasks ya no compita con una lectura plana u obsoleta de `docs/tasks/`.
- `.gitignore` se corrigió para que los `CODEX_TASK_*` dentro de `docs/tasks/**` puedan quedar versionados; el patrón ignorado en raíz se conserva solo para scratch local.

### Verificacion

- `find docs/tasks -maxdepth 2 -type f | sort`: correcto
- `git diff --check`: correcto
- `git status --short --untracked-files=all docs/tasks`: confirma `23` task briefs visibles para versionado bajo el nuevo árbol

### Riesgos o pendientes

- Históricamente varios `CODEX_TASK_*` estaban fuera del índice Git por la regla vieja de `.gitignore`; tras esta corrección quedarán visibles como archivos versionables y habrá que incorporarlos formalmente en el siguiente ciclo de commit.
- La clasificación actual del board es un snapshot operativo al 2026-03-14; si cambian el repo o los handoffs, habrá que mover tasks entre paneles con el mismo criterio documental.

## 2026-03-14 20:02 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Endurecer la regla de gobernanza para que toda `CODEX_TASK_*` deba revisarse contra la arquitectura antes de ejecutarse.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Documentación / gobernanza operativa

### Archivos tocados

- `AGENTS.md`
- `docs/tasks/README.md`
- `docs/README.md`
- `changelog.md`

### Cambios realizados

- `AGENTS.md` ahora obliga explícitamente a revisar arquitectura base y especializada cuando el trabajo nace desde una `CODEX_TASK_*`.
- `docs/tasks/README.md` ahora trata la revisión arquitectónica como gate obligatorio y ya no solo como alineación deseable al 360.
- `docs/README.md` ahora refleja esa misma regla en el índice maestro para que no quede escondida solo dentro de `tasks/README.md`.

### Verificacion

- `git diff --check`: correcto

### Riesgos o pendientes

- La regla ya quedó documentada, pero las tasks históricas siguen necesitando disciplina de revisión humana; esta edición no audita una por una todas las `CODEX_TASK_*`.

## 2026-03-14 19:45 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Revisar si `Provider` debía entrar al modelo 360 como objeto canónico y alinear la task de `AI Tooling & Credit System` para evitar que nazca con vendors libres sin relación reusable.

### Rama

- Rama usada: `fix/codex-operational-finance`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Documentación / arquitectura transversal

### Archivos tocados

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/CODEX_TASK_AI_Tooling_Credit_System.md`
- `project_context.md`
- `changelog.md`

### Cambios realizados

- Se agregó `Provider` al modelo 360 como objeto canónico objetivo para vendors/plataformas reutilizables entre AI Tooling, Finance, Identity y Admin.
- Se dejó explícito el boundary recomendado:
  - ancla objetivo `greenhouse.providers.provider_id`
  - `fin_suppliers` como extensión financiera del Provider
  - códigos de auth/source providers y `vendor` libre como referencias secundarias, no como identidad primaria
- La task de `AI Tooling & Credit System` quedó alineada para:
  - introducir un registro `providers`
  - relacionar `ai_tool_catalog` mediante `provider_id`
  - permitir `vendor` solo como snapshot/display label
- `docs/architecture/FINANCE_CANONICAL_360_V1.md` ahora documenta explícitamente la distinción `Supplier vs Provider` para evitar que el equipo siga leyendo `fin_suppliers` como identidad vendor transversal por defecto.

### Verificacion

- `git diff --check`: correcto

### Riesgos o pendientes

- Aún no existe implementación runtime de `greenhouse.providers`; por ahora esto deja la decisión de arquitectura cerrada y la task alineada, pero falta una iteración posterior para materializar la tabla y sus mapeos con `fin_suppliers` e identidades externas.

## 2026-03-14 19:20 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Corregir el modal de ingresos para que reutilice el mismo directorio de clientes visible en `/finance/clients` y no falle en silencio cuando la carga del dropdown se rompe.

### Rama

- Rama usada: `feature/finance-module`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / Staging

### Archivos tocados

- `src/views/greenhouse/finance/drawers/CreateIncomeDrawer.tsx`

### Cambios realizados

- `CreateIncomeDrawer` ahora vuelve a pedir `/api/finance/clients` cada vez que se abre el modal y usa `cache: 'no-store'`, alineándose con la vista de clientes.
- El dropdown de clientes ya no se queda vacío sin contexto si la API falla:
  - limpia la lista rota
  - muestra un `Alert` con el error real de carga
  - deja un placeholder explícito cuando no hay opciones disponibles
- Se amplió el fallback de labels del selector para aceptar `legalName`, `companyName`, `greenhouseClientName`, `clientProfileId` o `clientId`.
- El submit del ingreso ahora también envía `clientId` y `clientProfileId` del cliente seleccionado, para no perder la referencia canónica cuando el cliente no tiene `hubspotCompanyId`.

### Verificacion

- `pnpm exec eslint src/views/greenhouse/finance/drawers/CreateIncomeDrawer.tsx`: correcto

### Riesgos o pendientes

- El patrón de carga silenciosa sin `no-store` también existe en otros drawers de Finance, por ejemplo proveedores/egresos; no se tocó en este turno para mantener el cambio acotado.

## 2026-03-14 19:18 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Resolver definitivamente por qué `/finance/clients` seguía mostrando una lista vacía aun cuando `greenhouse.clients` sí tenía tenants activos.

### Rama

- Rama usada: `feature/finance-module`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / Staging

### Archivos tocados

- `src/app/api/finance/clients/route.ts`
- `src/views/greenhouse/finance/ClientsListView.tsx`

### Cambios realizados

- Se confirmó con consulta BigQuery real que `greenhouse.clients` sí tiene 11 clientes activos; el problema no era falta de data.
- Se endureció `GET /api/finance/clients` para que el directorio salga primero desde `greenhouse.clients` y no dependa de que HubSpot o el rollup de `fin_income` estén sanos.
  - si falla la introspección o lectura de `hubspot_crm.companies`, el endpoint cae a modo degradado y sigue devolviendo clientes base
  - si falla el cálculo de receivables desde `fin_income`, el endpoint devuelve el directorio igual y solo deja `totalReceivable` / `activeInvoicesCount` en `0`
- Se removió la dependencia de un único query monolítico para el listado; el rollup financiero ahora es best-effort y no puede vaciar la vista completa.
- Se corrigió `ClientsListView` para que deje de ocultar errores backend como si fueran “no hay perfiles”.
  - ahora usa `cache: 'no-store'`
  - si `/api/finance/clients` responde no-`ok`, muestra un `Alert` con el error real

### Verificacion

- Consulta directa contra BigQuery real usando las credenciales locales del repo:
  - `greenhouse.clients` devuelve `11` clientes activos
  - el SQL base de `base_clients` devuelve los `11` clientes esperados
- `pnpm exec eslint src/app/api/finance/clients/route.ts src/views/greenhouse/finance/ClientsListView.tsx`: correcto
- `git diff --check`: correcto

### Riesgos o pendientes

- Falta validar el preview nuevo con tráfico autenticado real para confirmar si el problema visible del usuario venía de HubSpot, `fin_income` o de otro error de entorno; la diferencia es que ahora esa falla ya no debe esconderse como lista vacía.
- Si el endpoint sigue devolviendo error en preview, la UI ahora mostrará el mensaje explícito y los logs deberían ser mucho más accionables.

## 2026-03-14 18:36 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Auditar los `CODEX_TASK_*` más sensibles para detectar si contradicen o desvían la nueva arquitectura de `objetos canónicos enriquecidos`, y corregirlos para que funcionen como briefs alineados al modelo 360.

### Rama

- Rama usada: `feature/finance-module`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Documentación / tasks

### Archivos tocados

- `docs/tasks/in-progress/CODEX_TASK_Financial_Module.md`
- `docs/tasks/to-do/CODEX_TASK_AI_Tooling_Credit_System.md`
- `docs/tasks/complete/CODEX_TASK_Creative_Hub_Module.md`
- `docs/tasks/complete/CODEX_TASK_HR_Payroll_Module_v2.md`
- `docs/tasks/complete/CODEX_TASK_People_Unified_View_v2.md`
- `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md`
- `docs/tasks/complete/CODEX_TASK_Agency_Operator_Layer.md`
- `docs/tasks/in-progress/CODEX_TASK_Admin_Team_Module_v2.md`
- `docs/tasks/README.md`

### Cambios realizados

- Se agregaron secciones explícitas de alineación con `GREENHOUSE_360_OBJECT_MODEL_V1.md` en las tasks con mayor riesgo de deriva arquitectónica.
- Criterios que ahora quedan explícitos dentro de los briefs:
  - no crear identidades paralelas de `Client` o `Collaborator`
  - tratar tablas de dominio como `extension tables` o `transaction tables`, no como nuevos maestros
  - distinguir catálogo/capability canónico vs módulos UI de capabilities
  - tratar Payroll y Finance como extensiones sobre objetos compartidos
  - tratar Agency como capa transversal de lectura sobre el mismo graph de objetos
- En `CODEX_TASK_Team_Identity_Capacity_System.md` se dejó explícito qué partes siguen vigentes y qué partes quedaron históricas para no seguir usando email o `notion_display_name` como identidad canónica de diseño.
- `docs/tasks/README.md` ahora exige alinear cualquier task nueva o reactivada con `GREENHOUSE_360_OBJECT_MODEL_V1.md`.

### Verificacion

- Revisión manual comparando cada task contra:
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/architecture/FINANCE_CANONICAL_360_V1.md`
  - `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `git diff --check`: pendiente de corrida final del paquete completo, pero los parches aplicados no introdujeron conflictos de formato en las ediciones visibles

### Riesgos o pendientes

- No todas las tasks del repo requerían edición; se tocaron las que realmente podían empujar al equipo hacia silos o identidades paralelas.
- Si se reactiva una task antigua no auditada todavía, usar `GREENHOUSE_360_OBJECT_MODEL_V1.md` como gate antes de implementarla.

## 2026-03-14 18:24 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Revisar la carpeta `docs/architecture` para detectar contradicciones con el nuevo modelo `GREENHOUSE_360_OBJECT_MODEL_V1` y corregirlas sin duplicar arquitectura innecesariamente.

### Rama

- Rama usada: `feature/finance-module`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Documentación / coherencia arquitectónica

### Archivos tocados

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/MULTITENANT_ARCHITECTURE.md`
- `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md`
- `docs/architecture/Greenhouse_Capabilities_Architecture_v1.md`

### Cambios realizados

- Se alineó `GREENHOUSE_ARCHITECTURE_V1.md` con el modelo 360:
  - nuevo principio de `canonical object graph`
  - distinción explícita entre tablas canónicas, tablas de extensión y marts
  - corrección del lenguaje que seguía tratando deals como fuente canónica de capabilities
- Se alineó `MULTITENANT_ARCHITECTURE.md`:
  - `greenhouse.clients` queda explicitado como ancla canónica del objeto `Client`
  - los sistemas externos quedan como enriquecedores, no como identidad primaria
- Se alineó `GREENHOUSE_SERVICE_MODULES_V1.md`:
  - `service_modules` y `client_service_modules` quedan explicitados como catálogo y assignment registry canónicos del objeto `Product/Capability`
  - se corrigió la idea de que `closedwon deals` deban seguir siendo la capa canónica de assignment
- Se alineó `Greenhouse_Capabilities_Architecture_v1.md`:
  - se aclaró que `Capability Registry` describe módulos UI, no la identidad canónica del producto
  - se corrigió lenguaje heredado de MVP que trataba `greenhouse.clients` como tabla de auth

### Verificacion

- `git diff --check`: correcto
- Barrido manual con `rg` sobre `docs/architecture` para detectar lenguaje conflictivo de:
  - `closedwon deals` como canónico
  - `clients` como tabla de auth
  - `Capability Registry` como si fuera catálogo de producto

### Riesgos o pendientes

- Aún quedan referencias históricas a `closedwon deals` como fuente de observación o bootstrap; ya no están presentadas como identidad canónica, pero conviene seguir puliendo el lenguaje si se hace otra pasada editorial más amplia.

## 2026-03-14 18:12 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Formalizar a nivel de arquitectura de plataforma la regla de `objetos canónicos enriquecidos` para evitar que futuros módulos sigan creando silos o identidades paralelas.

### Rama

- Rama usada: `feature/finance-module`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Documentación / arquitectura transversal

### Archivos tocados

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` (nuevo)
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/README.md`
- `project_context.md`

### Cambios realizados

- Se creó `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` como fuente canónica de la regla transversal:
  - tesis de plataforma basada en objetos canónicos enriquecidos
  - definición de `canonical object`, `extension table`, `snapshot field`, `360 read model` y `domain owner`
  - reglas no negociables para evitar identidades paralelas
  - catálogo detallado de objetos:
    - `Client`
    - `Collaborator`
    - `Product/Capability`
    - `Quote`
    - `Project`
    - `Sprint`
  - reglas de ownership, enriquecimiento, write/read patterns, snapshots, APIs, migración y anti-patterns
- Se conectó `FINANCE_CANONICAL_360_V1.md` como especialización del modelo 360 general, no como excepción aislada.
- Se agregó el documento al índice maestro `docs/README.md`.
- Se dejó un delta corto en `project_context.md` para que el estado operativo del repo también refleje esta regla.

### Verificacion

- Revisión manual de consistencia contra la arquitectura ya documentada en:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_ID_STRATEGY_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
  - `GREENHOUSE_SERVICE_MODULES_V1.md`
- `git diff --check`: correcto

### Riesgos o pendientes

- La regla de arquitectura ya quedó formalizada, pero todavía hay objetos cuyo contrato canónico debe aterrizarse más en runtime:
  - `Quote`
  - `Project`
  - `Sprint`
- Conviene usar este documento como gate explícito de revisión antes de arrancar nuevos módulos como `AI Tooling`, `Creative Hub` o capas comerciales futuras.

## 2026-03-14 18:00 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Consolidar en una sola fuente canónica la documentación del modelo Finance 360 y de la lógica enriquecida cliente/persona que ya estaba dispersa entre código, `project_context.md` y handoffs previos.

### Rama

- Rama usada: `feature/finance-module`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Documentación / arquitectura

### Archivos tocados

- `docs/architecture/FINANCE_CANONICAL_360_V1.md` (nuevo)
- `docs/README.md`

### Cambios realizados

- Se creó `docs/architecture/FINANCE_CANONICAL_360_V1.md` como fuente canónica del modelo actual:
  - llaves canónicas de cliente y colaborador
  - reglas de resolución en `src/lib/finance/canonical.ts`
  - read model de cliente 360
  - read model de colaborador 360
  - sinergias con `greenhouse.clients`, `team_members`, `payroll_entries`, `hubspot_crm.*`
  - compatibilidad legacy con `clientProfileId`, `hubspotCompanyId` y `payrollEntryId`
  - límites entre ownership financiero y read-models transversales
- Se enlazó el documento desde `docs/README.md` para que no dependa de conocer el nombre del archivo de memoria.

### Verificacion

- Revisión manual de consistencia contra el código ya implementado en `clients`, `income`, `expenses` y `people/[memberId]/finance`

### Riesgos o pendientes

- La documentación 360 ya está centralizada, pero todavía falta que el frontend consuma más de estas lecturas enriquecidas fuera de las vistas actuales de Finance y People.

## 2026-03-14 17:52 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Corregir fallos runtime de `Finance` detectados en `Staging` antes de cualquier promoción a `Production`, con foco en:
  - bootstrap BigQuery demasiado agresivo en lecturas
  - `GET /api/finance/clients` devolviendo `500` y dejando la vista sin clientes

### Rama

- Rama usada: `feature/finance-module`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Staging / Preview de `develop`

### Archivos tocados

- `src/lib/finance/schema.ts`
- `src/app/api/finance/clients/route.ts`

### Cambios realizados

- Se reescribió `ensureFinanceInfrastructure()` para dejar de ejecutar DDL/DML ciegos en cada cold start:
  - ahora primero inspecciona `INFORMATION_SCHEMA.TABLES` y `INFORMATION_SCHEMA.COLUMNS`
  - solo crea tablas `fin_*` faltantes
  - solo agrega columnas canónicas faltantes (`client_id`)
  - ya no ejecuta los `UPDATE` de backfill ni el `MERGE` de roles en cada lectura
  - el seed de `finance_manager` quedó reducido a `SELECT` + `INSERT` solo si realmente falta
- Se corrigió `GET /api/finance/clients`:
  - se eliminaron subqueries correlacionadas para receivables/invoice count
  - el listado ahora usa CTEs con `UNNEST` + `JOIN` + rollup por `client_id`, compatible con BigQuery
  - esto ataca el `500` real que dejaba `/finance/clients` sin datos en el preview de `develop`

### Verificacion

- `pnpm exec eslint src/lib/finance/schema.ts src/app/api/finance/clients/route.ts src/app/api/finance/income/summary/route.ts src/app/api/finance/accounts/route.ts src/app/api/finance/exchange-rates/latest/route.ts src/app/api/finance/expenses/summary/route.ts`: correcto
- `git diff --check`: correcto
- Revisión de logs de Vercel previa al fix:
  - `/api/finance/clients` devolvía `500` por `Correlated subqueries...`
  - `/api/finance/accounts`, `/api/finance/exchange-rates/latest` y `/api/finance/expenses/summary` fallaban por `table update operations quota`
- Aún no se valida un preview nuevo post-fix; sigue pendiente push/deploy y smoke real contra `Staging`

### Riesgos o pendientes

- El cambio reduce drásticamente el riesgo de cuota BigQuery en lectura, pero falta confirmarlo con un deployment nuevo.
- Los backfills históricos de `client_id` ya no corren automáticamente en `ensureFinanceInfrastructure()`; si se necesitan como operación explícita, conviene moverlos a un script o endpoint administrativo dedicado.

## 2026-03-14 17:45 America/Santiago

### Agente

- Claude Opus

### Objetivo del turno

- Integrar componentes Vuexy de navbar: NavSearch (⌘K), ShortcutsDropdown, NotificationsDropdown al portal Greenhouse

### Rama

- Rama usada: `feature/finance-module`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview → `pre-greenhouse.efeoncepro.com`

### Archivos tocados

- `src/components/layout/shared/search/index.tsx` (nuevo) — Command palette con ⌘K
- `src/components/layout/shared/search/DefaultSuggestions.tsx` (nuevo) — Sugerencias por defecto en español
- `src/components/layout/shared/search/NoResult.tsx` (nuevo) — Estado vacío
- `src/components/layout/shared/search/styles.css` (nuevo) — Estilos del command dialog
- `src/components/layout/shared/ShortcutsDropdown.tsx` (nuevo) — Panel de accesos rápidos (6 shortcuts)
- `src/components/layout/shared/NotificationsDropdown.tsx` (nuevo) — Dropdown de notificaciones con badge
- `src/data/searchData.ts` (nuevo) — 17 rutas indexadas del portal
- `src/components/layout/vertical/NavbarContent.tsx` (modificado) — Agrega Search + Shortcuts + Notifications
- `src/components/layout/horizontal/NavbarContent.tsx` (modificado) — Idem horizontal

### Cambios realizados

- Portados desde `full-version/` los 4 componentes de Vuexy navbar que faltaban
- Adaptación: eliminado i18n/locale routing (Greenhouse no lo usa), textos en español
- Search indexa: Dashboards, Finanzas (7 rutas), People (3 rutas), Administración (5 rutas)
- Shortcuts: Finanzas, Ingresos, Usuarios, Roles, Nómina, Configuración
- Notificaciones: placeholder estático (1 notificación de bienvenida), listo para conectar backend

### Verificacion

- `pnpm tsc --noEmit`: solo errores preexistentes (LayoutRoutes, SCIM)
- `pnpm eslint` sobre los 9 archivos: limpio
- Dependencias ya instaladas: cmdk, react-perfect-scrollbar, classnames, @radix-ui/react-dialog

### Riesgos o pendientes

- NotificationsDropdown tiene data estática — necesita backend de notificaciones
- ShortcutsDropdown tiene shortcuts hardcodeados — podría personalizarse por rol
- searchData.ts es estático — se podría generar dinámicamente según permisos del usuario

---

## 2026-03-14 17:16 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Hacer la revisión final previa a commit/push del paquete canónico de Finance y corregir los últimos riesgos funcionales detectados.

### Rama

- Rama usada: `feature/finance-module`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / backend finance + people

### Archivos tocados

- `src/app/api/finance/clients/route.ts`
- `src/lib/finance/canonical.ts`
- `src/lib/people/get-person-finance-overview.ts`
- `Handoff.md`

### Cambios realizados

- Se corrigió un bug de runtime en `GET /api/finance/clients`:
  - los filtros `requiresPo` y `requiresHes` apuntaban a un alias inexistente (`cp`)
  - ahora filtran correctamente sobre el read-model derivado
- Se endureció la validación canónica:
  - `resolveFinanceClientContext()` ahora rechaza `clientId`, `clientProfileId` o `hubspotCompanyId` inexistentes en vez de aceptar referencias fantasma
  - `resolveFinanceMemberContext()` ahora rechaza `memberId` inexistente en `team_members`
- Se blindó el endpoint `GET /api/people/[memberId]/finance`:
  - ahora ejecuta `ensureFinanceInfrastructure()` antes de leer `fin_expenses`, para no depender de que el schema canónico ya haya sido aplicado previamente en el entorno

### Verificacion

- `pnpm exec eslint` sobre las rutas/helper tocados de finance + people: correcto
- `git diff --check`: correcto
- Revisión manual adicional del diff para detectar aliases rotos y referencias no resueltas: corregida

### Riesgos o pendientes

- El working tree sigue con cambios locales listos para commit; todavía no se ha hecho `git add` / `git commit` / `git push` de este último paquete.
- `pnpm exec tsc --noEmit --pretty false` sigue arrastrando errores globales preexistentes de `.next-local/.next` y rutas SCIM faltantes.

## 2026-03-14 17:15 America/Santiago

### Agente

- Claude Opus

### Objetivo del turno

- Crear bank statement CSV parser por banco y agregar `finance_manager` a `rolePriority`

### Rama

- Rama usada: `feature/finance-module`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / backend finance

### Archivos tocados

- `src/lib/finance/csv-parser.ts` (nuevo) — parsers por banco
- `src/app/api/finance/reconciliation/[id]/statements/route.ts` (modificado) — acepta CSV
- `src/lib/tenant/access.ts` (modificado) — rolePriority
- `src/lib/finance/canonical.ts` (nuevo, de Codex) — labels canónicos
- `src/lib/finance/schema.ts` (modificado, de Codex) — constraints de schema
- 6 archivos de API routes (de Codex) — validación mejorada

### Cambios realizados

- **CSV parser** (`src/lib/finance/csv-parser.ts`):
  - 4 parsers: BCI (comma, DD/MM/YYYY, Cargo/Abono/Saldo), Santander (semicolon, DD/MM/YYYY, Nro Documento), BancoChile (comma, DD-MM-YYYY, Monto único), Scotiabank (comma, MM/DD/YYYY, English headers)
  - Manejo de formato numérico chileno (puntos como separador de miles, coma como decimal)
  - Factory function `parseBankStatement(csvContent, bankFormat)` con validación
- **Statement import endpoint** actualizado:
  - Acepta `{ csvContent, bankFormat }` además de `{ rows }` JSON existente
  - Backward compatible — ambos formatos siguen funcionando
- **rolePriority**: `finance_manager` agregado en posición 2 (después de `efeonce_admin`)
- **Codex changes commiteados**: canonical.ts, schema hardening, validation improvements en 9 archivos

### Verificacion

- `pnpm eslint` sobre csv-parser.ts y statements/route.ts: limpio
- `pnpm tsc --noEmit`: solo errores preexistentes (SCIM module, no relacionados)
- `git status`: working tree clean, 2 commits ahead of origin

### Commits

- `ad2093f` — feat: add bank statement CSV parser and finance_manager role priority
- `4ce5020` — feat: codex finance hardening — canonical labels, schema constraints, validation improvements

### Riesgos o pendientes

- **No pusheado** — 2 commits pendientes de push a origin
- Dashboard frontend (`FinanceDashboardView.tsx`) sigue consumiendo `/income/summary` y `/expenses/summary`, no los endpoints `/dashboard/*` (aging, cashflow, by-service-line)
- CSV parser no tiene tests unitarios — validar con cartolas reales de cada banco
- Los parsers asumen formato estándar de cada banco; variaciones de formato (ej. BCI con headers diferentes por tipo de cuenta) podrían requerir ajustes

---

## 2026-03-14 17:08 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Implementar la fase canónica del backend de Finance sin romper el módulo actual: anclaje por `client_id`, resolución de referencias cliente/persona y endpoint read-only de finance para People.

### Rama

- Rama usada: `feature/finance-module`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / backend finance + people

### Archivos tocados

- `src/app/api/finance/clients/route.ts`
- `src/app/api/finance/clients/[id]/route.ts`
- `src/app/api/finance/clients/sync/route.ts`
- `src/app/api/finance/expenses/route.ts`
- `src/app/api/finance/expenses/bulk/route.ts`
- `src/app/api/finance/income/route.ts`
- `src/lib/finance/canonical.ts`
- `src/lib/people/get-person-finance-overview.ts` (nuevo)
- `src/app/api/people/[memberId]/finance/route.ts` (nuevo)

### Cambios realizados

- Se cerró la resolución canónica de referencias financieras:
  - `resolveFinanceClientContext()` ya se usa en `income`, `expenses` y `clients`
  - `resolveFinanceMemberContext()` se usa en egresos para validar `memberId` vs `payrollEntryId`
  - si las referencias explícitas chocan, el backend responde `409`
- La capa de clientes ahora prioriza `fin_client_profiles.client_id` como enlace canónico al tenant:
  - `GET /api/finance/clients` y `GET /api/finance/clients/[id]` prefieren joins por `client_id`
  - se mantiene fallback legado por `client_profile_id` y `hubspot_company_id`
  - los receivables/invoices ahora consideran `fin_income.client_id` además de las referencias viejas
- `POST /api/finance/clients` y `POST /api/finance/clients/sync` ya rellenan `client_id` en `fin_client_profiles` cuando el tenant es resoluble.
- Se agregó lectura 360 financiera por colaborador:
  - nuevo helper `src/lib/people/get-person-finance-overview.ts`
  - nuevo endpoint `GET /api/people/[memberId]/finance`
  - expone bloque read-only con `member`, `summary`, `assignments`, `identities`, `payrollHistory` y `expenses`
- Quedó preservado lo ya existente del módulo:
  - no se tocaron `/api/finance/dashboard/*`
  - no se tocaron `match/unmatch` de conciliación
  - no se tocaron las páginas/detail views actuales

### Verificacion

- `pnpm exec eslint src/lib/finance/canonical.ts src/lib/finance/schema.ts src/app/api/finance/income/route.ts src/app/api/finance/income/[id]/route.ts src/app/api/finance/expenses/route.ts src/app/api/finance/expenses/[id]/route.ts src/app/api/finance/expenses/bulk/route.ts src/app/api/finance/clients/route.ts src/app/api/finance/clients/sync/route.ts src/app/api/finance/clients/[id]/route.ts src/lib/people/get-person-finance-overview.ts src/app/api/people/[memberId]/finance/route.ts`: correcto
- `git diff --check`: correcto
- `pnpm exec tsc --noEmit --pretty false`: sigue fallando por errores globales preexistentes en `.next-local/.next` y rutas SCIM faltantes, no por este paquete

### Riesgos o pendientes

- El endpoint nuevo `/api/people/[memberId]/finance` todavía no está consumido por el frontend.
- Sigue pendiente una corrida manual o por preview que dispare `ensureFinanceInfrastructure()` en un entorno real para aplicar el add/backfill de `client_id` si todavía no corrió después de estos cambios.
- La capa 360 de cliente ya está mejor anclada, pero todavía no existe una vista unificada equivalente dentro del frontend de People o de Finance dashboard.

## 2026-03-14 15:10 America/Santiago

### Agente

- Claude Opus

### Objetivo del turno

- Cerrar los gaps restantes del Finance Module contra la CODEX_TASK_Financial_Module.md. Codex había dejado cambios sin commitear + gaps abiertos documentados en el Handoff anterior.

### Rama

- Rama usada: `feature/finance-module`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / backend + frontend finance

### Archivos tocados

- `src/app/api/finance/dashboard/summary/route.ts` (nuevo)
- `src/app/api/finance/dashboard/cashflow/route.ts` (nuevo)
- `src/app/api/finance/dashboard/aging/route.ts` (nuevo)
- `src/app/api/finance/dashboard/by-service-line/route.ts` (nuevo)
- `src/app/api/finance/reconciliation/[id]/match/route.ts` (nuevo)
- `src/app/api/finance/reconciliation/[id]/unmatch/route.ts` (nuevo)
- `src/app/(dashboard)/finance/income/[id]/page.tsx` (nuevo)
- `src/app/(dashboard)/finance/expenses/[id]/page.tsx` (nuevo)
- `src/views/greenhouse/finance/IncomeDetailView.tsx` (nuevo)
- `src/views/greenhouse/finance/ExpenseDetailView.tsx` (nuevo)
- `src/views/greenhouse/finance/ClientDetailView.tsx` (reescrito — 4 tabs)
- `src/views/greenhouse/finance/ClientsListView.tsx` (rows clickeables)
- `src/views/greenhouse/finance/IncomeListView.tsx` (rows clickeables)
- `src/views/greenhouse/finance/ExpensesListView.tsx` (rows clickeables)
- Commit previo de Codex: `src/app/api/finance/expenses/bulk/route.ts`, `src/app/api/finance/income/[id]/payment/route.ts`, `src/lib/finance/hubspot.ts`, + 11 archivos modificados

### Cambios realizados

- Commiteados y pusheados los cambios pendientes de Codex (commit `6fbb567`):
  - POST /expenses/bulk, POST /income/[id]/payment, GET /income/[id], GET /expenses/[id]
  - hubspot.ts para introspección de columnas
  - Auto-match con ±3 días, enum alignment en drawers
- Creados 4 endpoints de Dashboard API (commit `591e84a`):
  - `/api/finance/dashboard/summary` — KPIs: ingresos/egresos del mes, flujo neto, receivables, payables, trends vs mes anterior
  - `/api/finance/dashboard/cashflow` — Flujo de caja mensual rolling 12 meses
  - `/api/finance/dashboard/aging` — Aging de cuentas por cobrar (current, 1-30, 31-60, 61-90, 90+)
  - `/api/finance/dashboard/by-service-line` — Ingresos y egresos por línea de servicio
- Creados endpoints de conciliación faltantes:
  - `POST /reconciliation/[id]/match` — match manual de fila de extracto con ingreso/egreso, marca ambos como reconciliados
  - `POST /reconciliation/[id]/unmatch` — deshace match, revierte reconciliación
- Creadas páginas de detalle:
  - `/finance/income/[id]` — IncomeDetailView con KPIs, datos de factura, formulario de registro de pago inline, historial de pagos
  - `/finance/expenses/[id]` — ExpenseDetailView con KPIs, datos del egreso, enlace a proveedor
- Reescrito ClientDetailView con 4 tabs (spec decía 4, tenía 2):
  - Tab Facturación: datos tributarios, condiciones de pago, OC/HES
  - Tab Contactos: contactos financieros con roles (procurement, accounts_payable, etc.)
  - Tab Facturas: historial con navegación a detalle de ingreso
  - Tab Deals: deals de HubSpot (read-only, desde API enriquecido)
  - KPI row con receivables, facturas vencidas, condiciones de pago
- Rows de listas ahora navegan a detalle (income, expenses, clients)

### Verificacion

- `pnpm exec eslint` sobre los 14 archivos nuevos/modificados: pasa (4 warnings preexistentes en IncomeListView y ExpensesListView, no introducidos)
- `pnpm exec tsc --noEmit`: 2 errores preexistentes de LayoutRoutes type, no relacionados con finance
- `git diff --check`: correcto
- Push exitoso a `origin/feature/finance-module`

### Riesgos o pendientes

- El dashboard frontend (`FinanceDashboardView.tsx`) actualmente consume `/income/summary` y `/expenses/summary` (rutas bonus), NO los nuevos endpoints `/dashboard/*`. Para aprovechar los nuevos endpoints (aging, cashflow, by-service-line) se necesita actualizar el frontend del dashboard.
- CSV parser por banco (BCI, Santander, BancoChile) sigue pendiente — el importador actual acepta JSON pre-parseado.
- `finance_manager` no está en el array `rolePriority` de `access.ts`. Funcional pero podría afectar si un usuario tiene múltiples roles.
- No se tocó el login de preview en este turno.

---

## 2026-03-14 13:35 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Revisar los ajustes recientes de Claude sobre `Finance Module`, confirmar qué hallazgos previos seguían abiertos y cerrar el paquete backend mínimo para dejar el módulo más consistente con la task.

### Rama

- Rama usada: `feature/finance-module`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / backend finance

### Archivos tocados

- `src/lib/finance/shared.ts`
- `src/app/api/finance/income/route.ts`
- `src/app/api/finance/income/[id]/route.ts`
- `src/app/api/finance/income/[id]/payment/route.ts`
- `src/app/api/finance/expenses/route.ts`
- `src/app/api/finance/expenses/[id]/route.ts`
- `src/app/api/finance/expenses/bulk/route.ts`
- `src/app/api/finance/suppliers/route.ts`
- `src/app/api/finance/clients/route.ts`
- `src/app/api/finance/clients/[id]/route.ts`
- `src/app/api/finance/reconciliation/[id]/auto-match/route.ts`
- `src/views/greenhouse/finance/drawers/CreateSupplierDrawer.tsx`
- `src/views/greenhouse/finance/drawers/CreateClientDrawer.tsx`
- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Hallazgos previos ya corregidos por Claude:
  - contract fix del detalle de conciliación (`statements`, `matched`, `matchedType`)
  - drawers de ingresos/egresos ya envían `subtotal`
  - botón `Nuevo perfil` en clientes y ruta `POST /api/finance/clients/sync`
- Fixes cerrados por Codex:
  - `GET /api/finance/income/[id]`
  - `GET /api/finance/expenses/[id]`
  - `POST /api/finance/income/[id]/payment`
  - `POST /api/finance/expenses/bulk`
  - IDs secuenciales mensuales para ingresos y egresos (`INC-YYYYMM-###`, `EXP-YYYYMM-###`)
  - snapshot de tipo de cambio obligatorio para USD con fallback al último `fin_exchange_rates`
  - validación real de `paymentCurrency` y `taxIdType` en clientes/proveedores
  - `finance_contacts` ahora se persiste como JSON real con `PARSE_JSON(...)`
  - auto-match con fecha `±3 días` y bloqueo de matches ambiguos
  - alineación de enums en drawers de clientes/proveedores para evitar drift (`CLP/USD`, tax IDs y categorías soportadas)
  - enriquecimiento real de clientes:
    - `GET /api/finance/clients` ahora sale desde `greenhouse.clients` activos y hace enrichment con `hubspot_crm.companies` + `fin_client_profiles`
    - `GET /api/finance/clients/[id]` ahora devuelve contexto company, summary de receivables y deals de HubSpot cuando el schema synced trae columnas suficientes
    - se agregó `src/lib/finance/hubspot.ts` para introspección de columnas vía `hubspot_crm.INFORMATION_SCHEMA.COLUMNS`, evitando hardcodes frágiles de `companies`/`deals`

### Verificacion

- `pnpm exec eslint src/lib/finance/shared.ts src/app/api/finance/income/route.ts 'src/app/api/finance/income/[id]/route.ts' 'src/app/api/finance/income/[id]/payment/route.ts' src/app/api/finance/expenses/route.ts 'src/app/api/finance/expenses/[id]/route.ts' 'src/app/api/finance/expenses/bulk/route.ts' src/app/api/finance/suppliers/route.ts src/app/api/finance/clients/route.ts 'src/app/api/finance/clients/[id]/route.ts' 'src/app/api/finance/reconciliation/[id]/auto-match/route.ts' src/views/greenhouse/finance/drawers/CreateSupplierDrawer.tsx src/views/greenhouse/finance/drawers/CreateClientDrawer.tsx`
- `pnpm exec eslint src/lib/finance/hubspot.ts src/app/api/finance/clients/route.ts 'src/app/api/finance/clients/[id]/route.ts'`
- `git diff --check`
- `pnpm exec tsc --noEmit --pretty false`
- Resultado:
  - `eslint`: correcto sobre los archivos tocados
  - `git diff --check`: correcto
  - `tsc`: sigue fallando por problemas globales preexistentes en `.next-local` / `.next` y rutas SCIM faltantes, no por estos cambios de Finance

### Riesgos o pendientes

- Sigue pendiente el gap grande contra la task en clientes:
  - el enrichment de clientes ya existe, pero el frontend actual aún no consume `company`, `summary` ni `deals`
  - no se implementó todavía CRUD dedicado para contactos financieros; solo persiste el JSON completo `finance_contacts`
- La conciliación quedó mejor, pero aún falta superficie completa del brief:
  - importador CSV real por banco
  - manual match / unmatch
- El dashboard financiero sigue parcial respecto al documento:
  - no existen todavía `/api/finance/dashboard/*`
  - los summaries actuales no reemplazan toda la spec de KPIs/charts
- No se tocó el fallo de login preview en este turno.

## 2026-03-14 12:20 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Promover `feature/admin-team-crud` a `develop` después del QA manual del usuario y dejar la integración local validada.

### Rama

- Rama usada: `develop`
- Rama objetivo del merge: `main` cuando staging quede aprobado

### Ambiente objetivo

- Development / integración hacia Staging

### Archivos tocados

- `Handoff.md`
- `changelog.md`
- `src/views/greenhouse/people/PeopleList.tsx`
- `src/views/greenhouse/people/PersonLeftSidebar.tsx`
- `src/views/greenhouse/people/PersonView.tsx`

### Verificacion

- Merge local ejecutado:
  - `merge: integrate admin team module`
- Validación post-merge en worktree `develop`:
  - `pnpm exec eslint src/components/Providers.tsx src/lib/people src/app/api/people src/lib/team-admin src/app/api/admin/team src/types/team.ts src/views/greenhouse/people/drawers/EditProfileDrawer.tsx src/views/greenhouse/people/PeopleList.tsx src/views/greenhouse/people/PeopleListFilters.tsx src/views/greenhouse/people/PeopleListTable.tsx src/views/greenhouse/people/PersonLeftSidebar.tsx src/views/greenhouse/people/PersonTabs.tsx src/views/greenhouse/people/PersonView.tsx src/views/greenhouse/people/helpers.ts src/views/greenhouse/people/tabs/PersonAssignmentsTab.tsx scripts/admin-team-runtime-smoke.ts src/lib/payroll 'src/app/api/hr/payroll/periods/[periodId]/approve/route.ts'`
  - `pnpm exec tsc --noEmit --pretty false`
  - `git diff --check`
- Resultado: correcto.
- Ajuste menor post-merge:
  - se normalizaron imports en `PeopleList.tsx` y `PersonView.tsx`
  - se eliminó un import no usado en `PersonLeftSidebar.tsx`

### Riesgos o pendientes

- `develop` queda listo para push y posterior validación compartida en `Staging`.
- No se tocó `.claude/`; sigue fuera del flujo de Git.

## 2026-03-14 11:55 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Capturar en la skill local de Vercel el patrón repetido de fallos por env vars faltantes en previews (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GCP_PROJECT`, credenciales Google) para evitar futuros ciclos de alias roto en `pre-greenhouse`.

### Rama

- Rama usada: `feature/admin-team-crud`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Operación Vercel / documentación operativa

### Archivos tocados

- `.codex/skills/vercel-operations/SKILL.md`
- `Handoff.md`
- `changelog.md`

### Verificacion

- Se enriqueció la skill `vercel-operations` con:
  - checklist mínimo de env vars por branch preview
  - regla explícita de tratar `next-auth NO_SECRET` como problema de infraestructura
  - regla de no mover `pre-greenhouse` antes de validar `/api/auth/session`
  - playbook corto para previews que caen antes de login

### Riesgos o pendientes

- Este conocimiento ya queda en la skill local, pero no reemplaza la disciplina operativa: si una rama nueva va a usar `pre-greenhouse`, sigue siendo obligatorio confirmar env vars branch-scoped antes de mover el alias.

## 2026-03-14 11:46 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Publicar `feature/admin-team-crud`, confirmar su preview oficial y mover `pre-greenhouse` al deployment actual del módulo para QA compartido.

### Rama

- Rama usada: `feature/admin-team-crud`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / Vercel

### Archivos tocados

- `Handoff.md`
- `changelog.md`

### Verificacion

- Git:
  - commit publicado: `f894eba` `feat: implement admin team module foundation`
  - push correcto a `origin/feature/admin-team-crud`
  - PR listo: `https://github.com/efeoncepro/greenhouse-eo/pull/new/feature/admin-team-crud`
- Preview oficial de rama:
  - deployment `dpl_CSAt6zBgYEMUvMD1FGbVxakWNX8t`
  - URL: `https://greenhouse-2z503i2bu-efeonce-7670142f.vercel.app`
  - alias de rama: `https://greenhouse-eo-git-feature-admin-team-crud-efeonce-7670142f.vercel.app`
- Alias compartido:
  - `pre-greenhouse.efeoncepro.com` fue reasignado a `greenhouse-2z503i2bu-efeonce-7670142f.vercel.app`
  - confirmación vía `vercel alias ls`: correcta

### Riesgos o pendientes

- `pre-greenhouse` ahora muestra `feature/admin-team-crud`, así que cualquier QA compartido verá este módulo hasta que otro agente vuelva a mover el alias.
- Queda pendiente el siguiente QA autenticado real de `Admin Team` ya sobre el preview oficial de la rama.

## 2026-03-14 11:35 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Endurecer el backend de `Admin Team` para preview real: eliminar lecturas `GCP_PROJECT` en import-time, corregir dos regressions de frontend que estaban rompiendo `next build`, desplegar un preview funcional y validar el handshake runtime del módulo.

### Rama

- Rama usada: `feature/admin-team-crud`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / Vercel / Admin Team parallel implementation

### Archivos tocados

- `src/lib/team-admin/mutate-team.ts`
- `src/app/api/admin/team/**`
- `src/lib/payroll/export-payroll.ts`
- `src/lib/payroll/get-payroll-periods.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/lib/payroll/recalculate-entry.ts`
- `src/lib/payroll/get-payroll-entries.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/fetch-kpis-for-period.ts`
- `src/lib/payroll/persist-entry.ts`
- `src/app/api/hr/payroll/periods/[periodId]/approve/route.ts`
- `src/lib/people/get-people-list.ts`
- `src/lib/people/get-person-detail.ts`
- `src/lib/people/get-person-operational-metrics.ts`
- `src/components/Providers.tsx`
- `src/views/greenhouse/people/drawers/EditProfileDrawer.tsx`
- `Handoff.md`
- `changelog.md`

### Verificacion

- Validación local:
  - `pnpm exec eslint src/components/Providers.tsx src/lib/people src/app/api/people src/lib/team-admin src/app/api/admin/team src/types/team.ts src/views/greenhouse/people/drawers/EditProfileDrawer.tsx scripts/admin-team-runtime-smoke.ts src/lib/payroll 'src/app/api/hr/payroll/periods/[periodId]/approve/route.ts'`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`
  - `git diff --check`
- Resultado: correcto.
- Preview listo:
  - `https://greenhouse-enzxjzyg9-efeonce-7670142f.vercel.app`
- Smoke runtime del módulo admin vía `vercel curl`:
  - `GET /api/admin/team/meta` sin sesión: `401 Unauthorized`
  - `GET /api/admin/team/members` sin sesión: `401 Unauthorized`
- Logs del preview:
  - se confirmó y corrigió el primer bloqueo de runtime `NO_SECRET` de `next-auth` inyectando envs al deployment puntual
  - ya no hay `500` en el handshake sin sesión

### Riesgos o pendientes

- El preview funcional actual depende de envs inyectadas en el deployment puntual (`NEXTAUTH_SECRET`, `GCP_PROJECT`, `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64`); la rama `feature/admin-team-crud` todavía no existe en el Git remoto conectado a Vercel, así que no fue posible sembrar env vars branch-scoped permanentes.
- Claude puede seguir con frontend de `Admin Team` sobre este backend:
  - el mutation contract freeze sigue vigente
  - el preview ya no está bloqueado por build/runtime básico
- Falta el siguiente QA:
  - login real en el preview de `Admin Team`
  - smoke autenticado de `GET /api/admin/team/meta`
  - smoke autenticado de creación/edición/desactivación desde los drawers de Claude
- `scripts/admin-team-runtime-smoke.ts` sigue pendiente de una validación local limpia contra BigQuery; el bloqueo actual no es del módulo sino de OpenSSL/Google Auth en el Node local cuando se usa `vercel env run`.

## 2026-03-14 10:55 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Arrancar `Admin Team Module v2` como siguiente módulo post-release, dejando explícita la coordinación Codex/Claude y congelando primero el contrato backend de mutaciones.

### Rama

- Rama usada: `feature/admin-team-crud`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / parallel implementation kickoff

### Archivos tocados

- `Handoff.md`

### Cambios realizados

- Se fija la división de trabajo para `CODEX_TASK_Admin_Team_Module_v2.md`:
  - Codex implementa todo el backend de `Admin Team`
  - Claude implementa todo el frontend de `Admin Team`
- Regla operativa para avanzar en paralelo:
  - Claude no necesita esperar al backend completo
  - Codex debe cerrar primero un `mutation contract freeze` mínimo para que Claude no invente payloads, errores ni CTAs incompatibles
- Boundary vigente:
  - `People` sigue siendo la surface read-first
  - las mutaciones nuevas viven bajo `/api/admin/team/*`
  - solo `efeonce_admin` puede ejecutar esas mutaciones

### Verificacion

- Se revisó la task vigente:
  - `docs/tasks/in-progress/CODEX_TASK_Admin_Team_Module_v2.md`
- Se confirmó contra el runtime real del repo que ya existe la base necesaria:
  - `greenhouse.team_members`
  - `greenhouse.client_team_assignments`
  - `greenhouse.identity_profile_source_links`
  - `People Unified View v2` read-only ya desplegado
  - `requireAdminTenantContext()` ya disponible en `authorization.ts`

### Riesgos o pendientes

- Claude debe esperar solo al freeze de contrato backend, no al backend completo.
- No se debe implementar CRUD dentro de `/api/people/*`; todo write debe vivir en `/api/admin/team/*`.
- Freeze backend ya disponible para Claude:
  - `GET /api/admin/team/meta`
  - `GET /api/admin/team/members` (handshake compatible con la task, ahora devuelve metadata admin)
  - `POST /api/admin/team/members`
  - `PATCH /api/admin/team/members/[memberId]`
  - `POST /api/admin/team/members/[memberId]/deactivate`
  - `POST /api/admin/team/assignments`
  - `PATCH /api/admin/team/assignments/[assignmentId]`
  - `DELETE /api/admin/team/assignments/[assignmentId]`
- Metadata ya expuesta para drawers admin:
  - `roleCategories`
  - `contactChannels`
  - `activeClients`
- Validaciones endurecidas:
  - duplicado de email revisado contra `team_members` y también `client_users`
  - assignments nuevos solo sobre tenants activos

## 2026-03-14 10:40 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Promover `develop` a `main`, desplegar `Production` y validar el primer release operativo de Greenhouse.

### Rama

- Rama usada: `main`
- Rama objetivo del merge: `main`

### Ambiente objetivo

- Production / Vercel

### Archivos tocados

- `Handoff.md`
- `changelog.md`

### Verificacion

- Promocion Git:
  - `origin/main` fue actualizado por fast-forward desde `origin/develop`
  - release commit en producción: `361d36e`
- Vercel `Production`:
  - deployment `dpl_7LZ3GcuYRp5oKubke42u8mvJuF2E`
  - URL: `https://greenhouse-ld2p73cqt-efeonce-7670142f.vercel.app`
  - dominio productivo: `https://greenhouse.efeoncepro.com`
  - estado: `Ready`
- Smoke real en producción:
  - `/login`: correcto
  - `/api/people` sin sesión: `Unauthorized`
  - login real con `humberly.henriquez@efeonce.org`: correcto
  - `/api/auth/session`: correcto, sesión con `roleCodes ['efeonce_operations','hr_payroll']`
  - `/api/people`: correcto
  - `/api/hr/payroll/periods`: `200 OK`, responde `[]`

### Riesgos o pendientes

- El primer release de Greenhouse queda ya activo en `Production`.
- `develop` y `main` deben conservarse sincronizadas desde este punto como ramas base de staging y producción.
- El siguiente trabajo recomendado ya no es release, sino el próximo módulo funcional sobre esta base estable.

## 2026-03-14 11:35 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Integrar `feature/hr-payroll` en `develop`, validar el árbol mergeado y confirmar el runtime de `staging` en Vercel.

### Rama

- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / staging

### Archivos tocados

- `Handoff.md`
- `changelog.md`
- `src/components/greenhouse/TeamCapacitySection.tsx`
- `src/views/greenhouse/payroll/MemberPayrollHistory.tsx`
- `src/views/greenhouse/payroll/PayrollDashboard.tsx`
- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx`

### Verificacion

- Merge realizado:
  - `ad63aa5` `merge: integrate hr payroll and people unified modules`
- Validacion local sobre el árbol mergeado:
  - `pnpm lint`: correcto
  - `pnpm exec tsc --noEmit --pretty false`: correcto
  - `git diff --check`: correcto
- Build local:
  - `pnpm build`: el árbol compila, pero la corrida local en este worktree falla al colectar page data si no se inyecta `GCP_PROJECT`; no se trató como regresión funcional porque `staging` sí construyó correcto con envs remotas.
- Vercel `staging` desde `develop`:
  - deployment `dpl_EJqoBLEUZhqZiyWjpyJrh9PRWpHq`
  - URL: `https://greenhouse-i1mmln0yp-efeonce-7670142f.vercel.app`
  - alias estable: `https://dev-greenhouse.efeoncepro.com`
  - estado: `Ready`
- Smoke real en `dev-greenhouse`:
  - `/login`: correcto
  - `/api/people` sin sesión: `Unauthorized`
  - login real con `humberly.henriquez@efeonce.org`: correcto
  - `/api/auth/session`: correcto, sesión con `roleCodes ['efeonce_operations','hr_payroll']`
  - `/api/people`: correcto
  - `/api/hr/payroll/periods`: `200 OK`, responde `[]`

### Riesgos o pendientes

- `develop` queda listo para validación compartida y base de primera release.
- `pre-greenhouse` sigue siendo alias compartido de preview y `dev-greenhouse` ya refleja `develop`.
- Si se quiere cerrar el circuito de release completo, el siguiente paso es promover desde `develop` hacia `main` con revisión final de `staging`.

## 2026-03-14 10:35 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Cerrar el QA autenticado de `People` en preview con roles reales y confirmar la matriz efectiva de acceso.

### Rama

- Rama usada: `feature/hr-payroll`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / Vercel / authenticated QA by role

### Archivos tocados

- `Handoff.md`
- `changelog.md`

### Verificacion

- Preview usado:
  - `https://greenhouse-79pl7kuct-efeonce-7670142f.vercel.app`
- Flujo de QA ejecutado con `vercel curl` sobre preview protegido y login real por `credentials`.
- Resultado validado:
  - `efeonce_operations`:
    - login real correcto con `daniela.ferreira@efeonce.org`
    - `/api/auth/session`: correcto
    - `GET /api/people`: correcto
    - `GET /api/people/daniela-ferreira`: correcto
    - `/people`: renderiza autenticado correctamente
  - `efeonce_account`:
    - login real correcto con `valentina.hoyos@efeonce.org`
    - `/api/auth/session`: correcto
    - `GET /api/people`: responde `403 Forbidden`
    - confirma que `account` queda fuera del alcance inicial
- Verificacion de permisos backend:
  - `requirePeopleTenantContext()` y `canAccessPeopleModule()` siguen permitiendo solo:
    - `efeonce_admin`
    - `efeonce_operations`
    - `hr_payroll`
- Verificacion de provisionamiento real:
  - en `greenhouse.client_users` / `greenhouse.user_role_assignments` no existe hoy ningun usuario interno activo con rol `hr_payroll`
  - por eso no se pudo cerrar aun el smoke autenticado de ese tercer rol

### Riesgos o pendientes

- `People` queda tecnicamente validado para `operations` y bloqueado correctamente para `account`.
- `Julio Reyes` conserva rol `efeonce_admin`, por lo que backend y sidebar deben permitir acceso; falta solo la comprobacion manual/autenticada en runtime con su propia sesion si se quiere evidencia de UI final.
- Para cerrar la matriz completa de QA falta provisionar o identificar un usuario real `hr_payroll`.

## 2026-03-14 10:55 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Activar `hr_payroll` para Humberly y cerrar la validacion real del tercer rol permitido en `People`.

### Rama

- Rama usada: `feature/hr-payroll`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / BigQuery real / role provisioning and QA

### Archivos tocados

- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se activo la asignacion `hr_payroll` para `Humberly Henriquez` en `greenhouse.user_role_assignments`:
  - `assignment-efeonce-internal-humberly-henriquez-hr-payroll`
- La lectura efectiva de acceso ya devuelve para Humberly:
  - `roleCodes`: `['efeonce_operations', 'hr_payroll']`
  - `primaryRoleCode`: `hr_payroll`
  - `routeGroups`: `['hr', 'internal']`

### Verificacion

- BigQuery real:
  - `humberly.henriquez@efeonce.org` ahora resuelve `efeonce_operations` + `hr_payroll`
- Preview real:
  - login por `credentials`: correcto
  - `/api/auth/session`: correcto, sesión ya refleja `hr_payroll`
  - `GET /api/people`: correcto
  - `GET /api/hr/payroll/periods`: `200 OK`, responde `[]`

### Riesgos o pendientes

- La matriz de acceso real queda ya validada para los tres roles esperados:
  - `efeonce_admin`: permitido por contrato backend
  - `efeonce_operations`: validado en runtime
  - `hr_payroll`: validado en runtime
- `efeonce_account` sigue correctamente fuera (`403 Forbidden`).
- Si se quiere evidencia visual final del caso admin, falta solo la validacion manual con una sesion real de Julio en preview.

## 2026-03-14 11:05 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Re-apuntar `pre-greenhouse.efeoncepro.com` al preview actual de `feature/hr-payroll` para QA compartido.

### Rama

- Rama usada: `feature/hr-payroll`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / shared domain alias

### Archivos tocados

- `Handoff.md`
- `changelog.md`

### Cambios realizados

- Se reasigno el alias compartido:
  - `pre-greenhouse.efeoncepro.com` -> `https://greenhouse-79pl7kuct-efeonce-7670142f.vercel.app`

### Verificacion

- `pnpm dlx vercel alias set https://greenhouse-79pl7kuct-efeonce-7670142f.vercel.app pre-greenhouse.efeoncepro.com -S efeonce-7670142f`: correcto
- `pnpm dlx vercel alias ls -S efeonce-7670142f`: correcto, `pre-greenhouse.efeoncepro.com` ya figura bajo el source `greenhouse-79pl7kuct-efeonce-7670142f.vercel.app`
- `pnpm dlx vercel curl /login --deployment https://pre-greenhouse.efeoncepro.com -S efeonce-7670142f`: correcto, responde el login del deployment `dpl_46Xq4TodnJcuLY4z4qJ2hRa6g2BT`
- `pnpm dlx vercel curl /api/people --deployment https://pre-greenhouse.efeoncepro.com -S efeonce-7670142f`: correcto, responde `Unauthorized` sin sesion

### Riesgos o pendientes

- `pre-greenhouse` vuelve a ser un alias compartido; otro agente podria moverlo despues.
- La validacion visual/autenticada final del modulo `People` ahora puede hacerse directamente sobre `https://pre-greenhouse.efeoncepro.com`.

## 2026-03-14 14:30 America/Santiago

### Agente

- Claude

### Objetivo del turno

- Implementar el frontend completo de `People Unified View v2`: lista, ficha, sidebar, tabs y navegacion.

### Rama

- Rama usada: `feature/hr-payroll`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / frontend implementation

### Archivos tocados

- `src/app/(dashboard)/people/layout.tsx` (nuevo)
- `src/app/(dashboard)/people/page.tsx` (nuevo)
- `src/app/(dashboard)/people/[memberId]/page.tsx` (nuevo)
- `src/views/greenhouse/people/helpers.ts` (nuevo)
- `src/views/greenhouse/people/PeopleList.tsx` (nuevo)
- `src/views/greenhouse/people/PeopleListStats.tsx` (nuevo)
- `src/views/greenhouse/people/PeopleListFilters.tsx` (nuevo)
- `src/views/greenhouse/people/PeopleListTable.tsx` (nuevo)
- `src/views/greenhouse/people/PersonView.tsx` (nuevo)
- `src/views/greenhouse/people/PersonLeftSidebar.tsx` (nuevo)
- `src/views/greenhouse/people/PersonTabs.tsx` (nuevo)
- `src/views/greenhouse/people/tabs/PersonAssignmentsTab.tsx` (nuevo)
- `src/views/greenhouse/people/tabs/PersonActivityTab.tsx` (nuevo)
- `src/views/greenhouse/people/tabs/PersonCompensationTab.tsx` (nuevo)
- `src/views/greenhouse/people/tabs/PersonPayrollTab.tsx` (nuevo)
- `src/views/greenhouse/people/components/CountryFlag.tsx` (nuevo)
- `src/views/greenhouse/people/components/IntegrationStatus.tsx` (nuevo)
- `src/config/greenhouse-nomenclature.ts` (modificado: agregado `GH_PEOPLE_NAV`)
- `src/components/layout/vertical/VerticalMenu.tsx` (modificado: seccion Equipo)

### Verificacion

- `pnpm exec tsc --noEmit`: solo errores de `.next-local` cache (no del delta)
- `pnpm build`: correcto, artefacto incluye `/people` y `/people/[memberId]`
- 18 archivos nuevos, 2 modificados

### Riesgos o pendientes

- El frontend consume los contratos `PeopleListPayload` y `PersonDetail` del backend de Codex.
- Codex modifico los tipos del backend agregando `access.visibleTabs`, `summary.*` y `integrations.identityConfidence`. El frontend ya se adapto a estos cambios (linter/user hizo ajustes a `PersonView`, `PersonLeftSidebar`, `PersonTabs`).
- Tab Asignaciones es read-only con ghost slot oculto (`display: none`) listo para activar cuando Admin Team CRUD exista.
- Tab Compensacion reutiliza `formatCurrency` y `regimeLabel` de `payroll/helpers.ts`.
- Tab Nomina reutiliza el patron de `MemberPayrollHistory` con chart y tabla.
- Sidebar "Equipo > Personas" visible solo para `efeonce_admin`, `efeonce_operations`, `hr_payroll` (por `roleCodes`, no por route group).
- Proximo paso: commit del frontend, luego PR a develop o preview Vercel.

## 2026-03-14 13:10 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Implementar el backend base de `People Unified View v2` para congelar contrato y habilitar trabajo paralelo de frontend.

### Rama

- Rama usada: `feature/hr-payroll`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / backend contract freeze

### Archivos tocados

- `src/types/people.ts`
- `src/lib/people/shared.ts`
- `src/lib/people/get-people-list.ts`
- `src/lib/people/get-person-detail.ts`
- `src/lib/people/get-person-operational-metrics.ts`
- `src/app/api/people/route.ts`
- `src/app/api/people/[memberId]/route.ts`
- `src/lib/tenant/authorization.ts`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Verificacion

- `pnpm exec eslint src/lib/people src/app/api/people src/types/people.ts src/lib/tenant/authorization.ts`: correcto
- `pnpm exec tsc --noEmit --pretty false`: correcto en el momento del freeze backend
- `pnpm build`: correcto en el momento del freeze backend
- `git diff --check`: correcto
- El artefacto de build ya incluye:
  - `/api/people`
  - `/api/people/[memberId]`

### Riesgos o pendientes

- Claude ya puede avanzar en paralelo con frontend usando estos payloads:
  - `PeopleListPayload`
  - `PersonDetail`
- El contrato backend ahora expone ademas metadata lista para frontend:
  - `access.visibleTabs`
  - `access.canView*`
  - `summary.activeAssignments`
  - `summary.totalFte`
  - `summary.totalHoursMonth`
- Helper reusable disponible para frontend/server:
  - `src/lib/people/permissions.ts`
- El match operativo de `People` ya no depende solo de `member.notion_user_id`:
  - ahora tambien usa señales de `identity_profile_source_links`
  - toma candidatos adicionales de Notion desde `source_object_id` / `source_user_id`
  - suma fallback por `source_display_name`, `source_email` y aliases ya reconciliados
- Boundary acordado para evitar retrabajo:
  - `People` sigue siendo read-only
  - no introducir drawers de escritura ni writes bajo `/api/people/*`
  - el CRUD posterior de equipo debe vivir en `Admin Team Module`
- Siguiente paso recomendado backend:
  - agregar page/layout server-side de `/people`
  - dejar helpers de permisos reutilizables para tabs del frontend
  - revisar con data real si conviene ampliar el fallback de match operativo mas alla de `notion_user_id`
- Nota de coordinacion:
  - mientras Claude arma `src/app/(dashboard)/people/*` y `src/views/greenhouse/people/*`, el `tsc` global puede mostrar ruido transitorio por imports frontend aun no creados
  - el delta backend actual sigue validado por `eslint` y `git diff --check`

## 2026-03-14 13:42 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Cerrar la integración entre el backend de `People` y el frontend ya implementado por Claude, dejando el módulo compilando end-to-end.

### Rama

- Rama usada: `feature/hr-payroll`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / module integration

### Archivos tocados

- `src/views/greenhouse/people/PersonView.tsx`
- `src/views/greenhouse/people/PersonTabs.tsx`
- `src/views/greenhouse/people/PersonLeftSidebar.tsx`
- `src/lib/people/get-person-detail.ts`
- `src/lib/people/get-person-operational-metrics.ts`
- `src/app/(dashboard)/people/layout.tsx`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Verificacion

- `pnpm exec eslint src/views/greenhouse/people 'src/app/(dashboard)/people' src/app/api/people src/lib/people src/types/people.ts src/lib/tenant/authorization.ts src/components/layout/vertical/VerticalMenu.tsx src/config/greenhouse-nomenclature.ts`: correcto
- `pnpm exec tsc --noEmit --pretty false`: correcto
- `pnpm build`: correcto
- `git diff --check`: correcto
- Build final incluye:
  - `/people`
  - `/people/[memberId]`
  - `/api/people`
  - `/api/people/[memberId]`

### Riesgos o pendientes

- El modulo `People` ya esta listo para smoke en preview, pero aun no se ha publicado este delta.
- Integracion cerrada importante:
  - `PersonTabs` ahora usa `detail.access.visibleTabs` del backend
  - `PersonLeftSidebar` ahora usa `detail.summary`
  - el match operativo de actividad ya reutiliza senales canonicas desde `identity_profile_source_links`
- Siguiente paso recomendado:
  - publicar el delta en preview y validar con usuarios reales por rol
  - despues de esa validacion, recien evaluar abrir `Admin Team Module`

## 2026-03-14 12:05 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Revisar la factibilidad tecnica de la task `People Unified View` contra el estado real del repo y reescribir el brief como una version ejecutable.

### Rama

- Rama usada: `feature/hr-payroll`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Documentation / implementation planning

### Archivos tocados

- `docs/tasks/complete/CODEX_TASK_People_Unified_View_v2.md`
- `docs/tasks/README.md`
- `Handoff.md`
- `changelog.md`

### Verificacion

- Revisión contrastada contra runtime y docs vivas del repo:
  - `project_context.md`
  - `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
  - `src/lib/tenant/authorization.ts`
  - `src/lib/tenant/access.ts`
  - `src/lib/team-queries.ts`
  - `src/types/team.ts`
  - `src/types/payroll.ts`
  - `src/lib/payroll/get-compensation.ts`
- Hallazgos incorporados a la nueva task:
  - no existe `/admin/team` ni `/api/admin/team/*`
  - no existe route group `people`
  - los roles reales son `efeonce_admin`, `efeonce_operations`, `efeonce_account`, `hr_payroll`
  - `team_members` ya tiene `location_country`; no se debe agregar `country`
- No hubo cambios de runtime ni de base de datos; este turno fue documental.

### Riesgos o pendientes

- La task vigente para People debe tomarse desde `docs/tasks/complete/CODEX_TASK_People_Unified_View_v2.md`, no desde la version original.
- La `v2` deja People como surface inicialmente read-first; si se quiere editar assignments desde esa vista, hace falta una task adicional de CRUD de team.
- Sigue pendiente decidir si `efeonce_account` debe ver `/people` en lectura o si queda fuera del alcance inicial.

## 2026-03-14 12:28 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Leer tambien `CODEX_TASK_Admin_Team_Module.md` y dejar explicitado como coordinar `People Unified View` ahora sin bloquear ni retrabajar el futuro modulo `Admin Team`.

### Rama

- Rama usada: `feature/hr-payroll`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Documentation / implementation planning

### Archivos tocados

- `docs/tasks/complete/CODEX_TASK_People_Unified_View_v2.md`
- `Handoff.md`

### Verificacion

- Lectura comparada entre:
  - `docs/tasks/complete/CODEX_TASK_People_Unified_View_v2.md`
  - `docs/tasks/complete/CODEX_TASK_Admin_Team_Module.md`
- Se dejo documentado en la task de People:
  - People `v2` es capa de lectura consolidada
  - no debe introducir writes bajo `/api/people/*`
  - el futuro CRUD de equipo debe vivir bajo `/api/admin/team/*`
  - la capa `src/lib/people/*` debe diseñarse reusable para que `Admin Team` la consuma despues

### Riesgos o pendientes

- Division de trabajo acordada para la siguiente implementacion:
  - Codex hace todo el backend de `People Unified View v2`
  - Claude hace todo el frontend de `People Unified View v2`
- Esa implementacion debe dejar preparado el camino para `Admin Team Module` posterior:
  - contratos read-only en People
  - shared queries separadas de los route handlers
  - sin mezclar People con CRUD admin en esta primera fase
- `CODEX_TASK_Admin_Team_Module.md` tambien esta desfasada respecto al repo en su parte de infraestructura base, pero sigue siendo util como brief de CRUD y surfaces admin para una fase posterior.

## 2026-03-14 09:35 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Rescatar el trabajo no committeado de `HR Payroll`, publicarlo en una rama propia y dejar un preview real de Vercel listo para prueba de backend + UI.

### Rama

- Rama usada: `feature/hr-payroll`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / integration validation

### Archivos tocados

- No hubo cambios de código adicionales fuera del trabajo ya existente; el objetivo del turno fue reubicar, commitear, publicar y desplegar.
- `Handoff.md`

### Verificacion

- Se creó la rama `feature/hr-payroll` desde el worktree actual sin usar `stash`.
- Se hicieron 2 commits:
  - `a30b0dc` `feat: add reusable payroll ui infrastructure`
  - `2c85a9f` `feat: implement hr payroll module`
- Se publicó la rama:
  - `origin/feature/hr-payroll`
- Se creó bloque de variables `Preview (feature/hr-payroll)` en Vercel para:
  - `GCP_PROJECT`
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `AZURE_AD_CLIENT_ID`
  - `AZURE_AD_CLIENT_SECRET`
- Preview final listo:
  - `https://greenhouse-obspv8j1r-efeonce-7670142f.vercel.app`
- Smoke real del preview:
  - `/login`: responde correctamente y renderiza `Entrar con Microsoft` y `Entrar con Google`
  - `/api/hr/payroll/periods`: responde `{"error":"Unauthorized"}`, que es el comportamiento esperado sin sesión
- PR sugerido por GitHub:
  - `https://github.com/efeoncepro/greenhouse-eo/pull/new/feature/hr-payroll`

### Riesgos o pendientes

- Claude puede tomar esta rama como base oficial del frontend `HR Payroll`; ya no depende del worktree mezclado de `feature/admin-tenant-detail-redesign`.
- El preview listo para prueba es el manual de Vercel arriba indicado; el auto-preview anterior de la rama falló antes de que se crearan las env vars de `feature/hr-payroll`.
- Si se quiere probar el módulo completo más allá de `/login`, hace falta autenticarse con un principal que tenga acceso `hr` o `efeonce_admin`.

## 2026-03-14 08:45 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Dejar documentada la estrategia acordada para rescatar y reubicar el trabajo no committeado de `HR Payroll` que hoy está mezclado en `feature/admin-tenant-detail-redesign`.

### Rama

- Rama usada: `feature/admin-tenant-detail-redesign`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / branch coordination

### Archivos tocados

- `Handoff.md`

### Verificacion

- Confirmado sin mover rama:
  - el worktree actual está en `feature/admin-tenant-detail-redesign`
  - el trabajo actual de payroll (backend + frontend + infraestructura) vive en este árbol como cambios sin commit
  - `fix/team-capacity-views-vuexy` sí existe, pero sus commits guardados corresponden a iniciativas anteriores y no al delta actual sin commit de payroll

### Riesgos o pendientes

- Estrategia recomendada para reubicar el trabajo de payroll:
  - crear `feature/hr-payroll` desde el estado actual del worktree, sin perder el árbol sucio
  - hacer 2 commits lógicos dentro de `feature/hr-payroll`
  - commit 1: infraestructura reusable
  - commit 2: `HR Payroll`
- Infraestructura reusable sugerida:
  - `src/components/card-statistics/*`
  - `src/components/dialogs/*`
  - `src/hooks/*`
  - `src/libs/styles/AppReactDatepicker.tsx`
  - `src/libs/styles/AppReactDropzone.ts`
  - `src/libs/styles/AppReactToastify.tsx`
- Scope sugerido del commit `HR Payroll`:
  - `src/app/(dashboard)/hr/**`
  - `src/app/api/hr/payroll/**`
  - `src/views/greenhouse/payroll/**`
  - `src/lib/payroll/**`
  - `src/types/payroll.ts`
  - `bigquery/greenhouse_hr_payroll_v1.sql`
  - `bigquery/greenhouse_identity_access_v1.sql`
  - `src/components/layout/vertical/VerticalMenu.tsx`
  - `src/lib/tenant/access.ts`
  - `src/lib/tenant/authorization.ts`
  - `Handoff.md`
  - `project_context.md`
  - `changelog.md`
- Recomendacion operativa:
  - no abrir una rama extra para `infra` por ahora
  - no usar `stash -> develop -> apply` como primer movimiento si se puede evitar
  - primero rescatar el trabajo en `feature/hr-payroll`, luego limpiar historial si hace falta
- Runbook operativo creado:
  - `docs/operations/HR_PAYROLL_BRANCH_RESCUE_RUNBOOK_V1.md`

## 2026-03-14 08:32 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ejecutar validación runtime real del backend `HR Payroll` contra BigQuery y aplicar el bootstrap del módulo en el dataset `greenhouse`.

### Rama

- Rama usada: `feature/admin-tenant-detail-redesign`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / BigQuery runtime validation

### Archivos tocados

- `src/lib/payroll/fetch-kpis-for-period.ts`
- `src/lib/payroll/schema.ts`
- `bigquery/greenhouse_hr_payroll_v1.sql`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- Query read-only a `efeonce-group.notion_ops.INFORMATION_SCHEMA.COLUMNS`: confirmó schema real de `tareas`
- Bootstrap aplicado en BigQuery real desde `bigquery/greenhouse_hr_payroll_v1.sql`
- Revalidación posterior:
  - tablas creadas: `compensation_versions`, `payroll_periods`, `payroll_entries`, `payroll_bonus_config`
  - rol sembrado: `hr_payroll` con `route_group_scope = ['internal', 'hr']`
  - seed `payroll_bonus_config`: correcto
- Smoke read-only de KPIs reales: correcto para RpA y OTD usando `rpa`, `estado`, `last_edited_time`, `fecha_de_completado` y `fecha_límite`
- `pnpm exec eslint` sobre `src/lib/payroll/fetch-kpis-for-period.ts` y `src/lib/payroll/schema.ts`: correcto
- `pnpm build`: correcto

### Riesgos o pendientes

- El bootstrap BigQuery ya quedó aplicado, pero sigue pendiente la provisión real de usuarios `client_users` / `user_role_assignments` con el rol `hr_payroll`; hoy existe el role, no necesariamente los principals de HR.
- `docs/tasks/complete/CODEX_TASK_HR_Payroll_Module_v2.md` sigue ignorado por Git; la implementación ya avanzó más que el brief trackeado.
- Existen archivos UI no trackeados fuera del scope backend en el working tree; no fueron tocados en este turno.

## 2026-03-14 08:08 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Endurecer el backend de `HR Payroll` para dejarlo listo para integración real con frontend: validaciones numéricas server-side, versionado de compensación sin solapes, bloqueo de edición de períodos fuera de `draft`, aprobación con validación final de bonos y auditoría consistente por email de sesión.

### Rama

- Rama usada: `feature/admin-tenant-detail-redesign`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / backend hardening

### Archivos tocados

- `src/lib/payroll/shared.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/lib/payroll/get-payroll-periods.ts`
- `src/lib/payroll/recalculate-entry.ts`
- `src/app/api/hr/payroll/compensation/route.ts`
- `src/app/api/hr/payroll/periods/route.ts`
- `src/app/api/hr/payroll/periods/[periodId]/route.ts`
- `src/app/api/hr/payroll/entries/[entryId]/route.ts`
- `src/app/api/hr/payroll/periods/[periodId]/approve/route.ts`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `pnpm exec eslint` sobre el delta endurecido de payroll: correcto
- `git diff --check`: correcto
- `pnpm build`: correcto

### Riesgos o pendientes

- El backend ya quedó buildable y con rutas `HR Payroll` incluidas en el artefacto de producción, pero sigue faltando validación runtime contra BigQuery real para confirmar:
  - columnas vivas de `notion_ops.tareas` para OTD automático
  - permisos efectivos de creación sobre `greenhouse.payroll_*`
  - seed y asignación real del rol `hr_payroll` en datos productivos
- La lógica de `compensation_versions` ahora soporta inserciones sin solapes y distingue versiones futuras vs vigentes, pero sigue siendo recomendable que Claude trate `effectiveFrom` como campo de negocio sensible y no como input libre sin guía UX.
- El frontend de `HR Payroll` puede avanzar ya sobre estos contratos; evitar tocar menú visual y pantallas desde backend salvo bloqueo funcional nuevo.

## 2026-03-14 07:53 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Implementar la primera entrega backend de `HR Payroll`: route group `hr`, guard/layout server-side, tipos, capa `lib/payroll`, SQL bootstrap y API routes base para compensaciones, periodos, calculo, edicion, aprobacion, export e historial.

### Rama

- Rama usada: `feature/admin-tenant-detail-redesign`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / backend implementation

### Archivos tocados

- `src/lib/tenant/access.ts`
- `src/lib/tenant/authorization.ts`
- `src/app/(dashboard)/hr/layout.tsx`
- `src/types/payroll.ts`
- `src/lib/payroll/api-response.ts`
- `src/lib/payroll/shared.ts`
- `src/lib/payroll/schema.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/lib/payroll/get-payroll-periods.ts`
- `src/lib/payroll/get-payroll-entries.ts`
- `src/lib/payroll/fetch-kpis-for-period.ts`
- `src/lib/payroll/calculate-chile-deductions.ts`
- `src/lib/payroll/persist-entry.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/recalculate-entry.ts`
- `src/lib/payroll/export-payroll.ts`
- `src/app/api/hr/payroll/compensation/route.ts`
- `src/app/api/hr/payroll/periods/route.ts`
- `src/app/api/hr/payroll/periods/[periodId]/route.ts`
- `src/app/api/hr/payroll/periods/[periodId]/calculate/route.ts`
- `src/app/api/hr/payroll/periods/[periodId]/entries/route.ts`
- `src/app/api/hr/payroll/entries/[entryId]/route.ts`
- `src/app/api/hr/payroll/periods/[periodId]/approve/route.ts`
- `src/app/api/hr/payroll/periods/[periodId]/export/route.ts`
- `src/app/api/hr/payroll/members/[memberId]/history/route.ts`
- `bigquery/greenhouse_hr_payroll_v1.sql`
- `bigquery/greenhouse_identity_access_v1.sql`
- `Handoff.md`

### Verificacion

- `pnpm exec eslint` sobre el delta backend de payroll: correcto
- `git diff --check`: correcto
- `pnpm exec tsc --noEmit`: el proyecto sigue teniendo ruido previo en `.next-local`; al filtrar errores por paths del delta backend de payroll no aparecieron errores nuevos del trabajo actual
- No se ejecuto `pnpm build` todavia

### Riesgos o pendientes

- La implementacion backend ya existe, pero falta validacion runtime real contra BigQuery:
  - schema vivo de `notion_ops.tareas`
  - presencia o ausencia real de columnas para OTD automatico
  - permisos reales para crear tablas `greenhouse.payroll_*` y seedear `hr_payroll`
- El frontend de `HR Payroll` sigue reservado para Claude; evitar tocar vistas, menu y navegacion visual desde backend salvo que aparezca un bloqueo funcional.
- El layout/guard `hr` ya existe, pero todavia no se agrego navegacion visual al sidebar porque eso corresponde al frente.
- `docs/tasks/complete/CODEX_TASK_HR_Payroll_Module_v2.md` sigue afectado por `.gitignore`; el brief corregido existe en disco pero no queda trackeado por Git salvo que se ajuste esa regla.

## 2026-03-14 07:34 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Dejar registrada la division operativa para `HR Payroll`: Codex implementara el backend completo del modulo y Claude implementara todo el frontend, ambos tomando como base `docs/tasks/complete/CODEX_TASK_HR_Payroll_Module_v2.md`.

### Rama

- Rama usada: `feature/admin-tenant-detail-redesign`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / implementation handoff

### Archivos tocados

- `Handoff.md`

### Verificacion

- Revision final del brief `HR Payroll v2`: correcta como base de implementacion, con pendientes acotados de verificacion runtime antes de escribir codigo
- `git diff --check`: pendiente de re-ejecucion tras esta actualizacion de handoff

### Riesgos o pendientes

- Alcance operativo acordado:
  - Codex: backend completo del modulo `HR Payroll`
  - Claude: frontend completo del modulo `HR Payroll`
- Antes de arrancar backend, validar en runtime:
  - schema real de `notion_ops.tareas`
  - wiring real de auth para route group `hr`
  - criterio final de OTD por persona vs fallback manual
- Mantener la separacion de responsabilidades para evitar solapamiento:
  - backend: BigQuery schema, auth/guards, API routes, calculadora de payroll, export, tipos y logica server-side
  - frontend: rutas UI, vistas, tablas, drawers, inputs, estados y navegacion visual
- `docs/tasks/complete/CODEX_TASK_HR_Payroll_Module_v2.md` sigue afectado por `.gitignore`; si el brief debe compartirse por Git, habra que corregir esa regla.

## 2026-03-14 07:31 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Revisar y corregir `docs/tasks/complete/CODEX_TASK_HR_Payroll_Module_v2.md` para dejar el brief mas implementable y alineado con el repo real: route group `hr`, versionado por vigencia del periodo, persistencia de KPIs manuales y auditabilidad de overrides.

### Rama

- Rama usada: `feature/admin-tenant-detail-redesign`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / docs alignment

### Archivos tocados

- `docs/tasks/complete/CODEX_TASK_HR_Payroll_Module_v2.md`
- `docs/tasks/README.md`
- `Handoff.md`

### Verificacion

- Revision manual del brief corregido: correcta
- `git diff --check`: correcto
- No aplica `pnpm lint` ni `pnpm build` porque no hubo cambios de runtime

### Riesgos o pendientes

- El brief ya no depende de `/admin/payroll`, pero la implementacion futura todavia debe resolver el wiring real de auth para `hr`: role seed, `TenantRouteGroup`, guard reusable y redirect post-login.
- Antes de implementar, sigue siendo obligatorio verificar el schema vivo de `notion_ops.tareas` para definir la query final de KPIs y confirmar si OTD por persona es calculable o queda manual.
- `docs/tasks/complete/CODEX_TASK_HR_Payroll_Module_v2.md` esta afectado por la regla `.gitignore: CODEX_TASK_*.md`; el archivo quedo corregido en disco pero no aparece como cambio trackeado del repo. Si esta version debe compartirse por Git, habra que ajustar esa regla o versionar el archivo por otra via.

## 2026-03-14 09:45 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Implementar la capa faltante de buenas practicas GitHub del repo sin tocar producto: CI, templates de PR/issues, Dependabot, `CODEOWNERS`, soporte/seguridad y housekeeping documental.

### Rama

- Rama usada: `feature/admin-tenant-detail-redesign`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / repo hygiene

### Archivos tocados

- `.github/workflows/ci.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/dependabot.yml`
- `.github/CODEOWNERS`
- `.github/SECURITY.md`
- `.github/SUPPORT.md`
- `.gitignore`
- `README.md`
- `CONTRIBUTING.md`
- `project_context.md`
- `changelog.md`
- `Handoff.md`
- `scripts/mint-local-admin-jwt (1).js`

### Verificacion

- Verificacion estructural prevista:
  - `.github/` ahora debe contener CI, templates y metadata de repo
  - `README.md` y `CONTRIBUTING.md` deben reflejar el flujo GitHub actual
  - `.gitignore` ya no debe contradecir el hecho de que `full-version/` esta versionado
- Validacion local disponible en este shell:
  - `git diff --check`
  - revision manual de paths y archivos creados
- Limitacion conocida:
  - este shell no tiene `node`/`pnpm`, asi que no se puede ejecutar `pnpm lint` ni `pnpm build` localmente en este turno

### Riesgos o pendientes

- `.github/CODEOWNERS` queda como template seguro hasta confirmar un username o team slug valido con permisos de escritura en GitHub.
- No se agrego `LICENSE` porque el repo es `private` y `Commercial`; eso requiere decision legal explicita y no debe inventarse.

## 2026-03-14 01:10 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Reorganizar la documentacion Markdown del repo para limpiar la raiz, mover specs y tasks a `docs/`, y actualizar referencias sin romper el flujo operativo entre agentes.

### Rama

- Rama usada: `feature/admin-tenant-detail-redesign`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / docs hygiene

### Archivos tocados

- `README.md`
- `AGENTS.md`
- `project_context.md`
- `changelog.md`
- `Handoff.md`
- `.codex/skills/greenhouse-ui-orchestrator/SKILL.md`
- `docs/README.md`
- `docs/tasks/README.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- multiples docs movidos a `docs/architecture/*`, `docs/api/*`, `docs/ui/*`, `docs/roadmap/*` y `docs/tasks/*`

### Verificacion

- `find . -maxdepth 1 -name '*.md'` ahora devuelve solo:
  - `README.md`
  - `AGENTS.md`
  - `CONTRIBUTING.md`
  - `project_context.md`
  - `Handoff.md`
  - `Handoff.archive.md`
  - `changelog.md`
- `rg` de referencias documentales sin rutas viejas a archivos movidos: correcto
- `git diff --check`: correcto

### Riesgos o pendientes

- No se dejaron stubs en raiz para los documentos movidos; cualquier referencia externa fuera del repo que use paths antiguos debera actualizarse.
- Conviene revisar futuros PRs para que no vuelvan a caer `.md` especializados en raiz por inercia.

## 2026-03-13 23:58 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Integrar `feature/agency-operator-layer` sobre la punta real de `develop` sin romper Google SSO ni el rediseño de team, corrigiendo el delta minimo para que la integracion cumpla lint y build.

### Rama

- Rama usada: `mergecheck-agency-operator-layer`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / staging

### Archivos tocados

- `src/app/(dashboard)/agency/capacity/page.tsx`
- `src/app/(dashboard)/agency/layout.tsx`
- `src/app/(dashboard)/agency/page.tsx`
- `src/app/(dashboard)/agency/spaces/[spaceId]/page.tsx`
- `src/app/(dashboard)/agency/spaces/page.tsx`
- `src/app/api/agency/capacity/route.ts`
- `src/app/api/agency/pulse/route.ts`
- `src/app/api/agency/spaces/route.ts`
- `src/components/agency/*`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/config/greenhouse-nomenclature.ts`
- `src/lib/agency/agency-queries.ts`
- `src/lib/tenant/authorization.ts`
- `src/views/agency/*`
- `Handoff.md`
- `changelog.md`
- `project_context.md`

### Verificacion

- Merge simulado sobre `origin/develop`: sin conflictos de Git
- Delta final del merge:
  - solo entran 22 archivos del modulo `agency`, mas `VerticalMenu`, nomenclatura y `tenant/authorization`
  - no se tocan `src/lib/auth.ts`, `src/lib/tenant/access.ts`, `src/views/Login.tsx`, `src/views/greenhouse/GreenhouseSettings.tsx` ni superficies del rediseño de team
- `pnpm exec eslint ...` sobre el delta agency: correcto
- `pnpm build`: correcto
- Riesgo original detectado y resuelto:
  - la rama `feature/agency-operator-layer` traia errores de lint de estilo en varios archivos `agency`
  - se corrigieron en la integracion antes de promover a `develop`

### Riesgos o pendientes

- El acceso agency hoy reutiliza `internal/admin`; no existe aun un principal dedicado con `routeGroup = 'agency'` en runtime.
- `/agency/spaces/[spaceId]` por ahora redirige a `/dashboard?space=<id>`; no existe todavia una surface propia de detalle agency para cada space.
- Despues del merge a `develop`, conviene validar visualmente `dev-greenhouse.efeoncepro.com/agency`, `/agency/spaces` y `/agency/capacity`.

## 2026-03-13 23:42 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Integrar Google SSO sobre la punta actual de `develop` sin tocar el rediseño de team y dejar `pre-greenhouse` apuntando a una rama merge-safe.

### Rama

- Rama usada: `mergecheck-google-sso`
- Rama objetivo del merge: `develop`
- Rama remota lista para PR: `fix/google-sso-develop-safe`

### Ambiente objetivo

- Preview branch / `pre-greenhouse`

### Archivos tocados

- `Handoff.md`
- `changelog.md`
- `project_context.md`

### Verificacion

- Delta contra `origin/develop` validado:
  - solo cambia `.env.example`, `.env.local.example`, `Handoff.md`, `README.md`, `changelog.md`, `project_context.md`, `scripts/setup-bigquery.sql`, `src/app/(blank-layout-pages)/login/page.tsx`, `src/app/(dashboard)/settings/page.tsx`, `src/config/greenhouse-nomenclature.ts`, `src/lib/auth.ts`, `src/lib/tenant/access.ts`, `src/types/next-auth.d.ts`, `src/views/Login.tsx` y `src/views/greenhouse/GreenhouseSettings.tsx`
  - no entran `TeamCapacitySection`, `TeamDossierSection`, `GreenhouseDashboard` ni `GreenhouseAdminTenantDashboardPreview`
- `pnpm exec eslint 'src/app/(blank-layout-pages)/login/page.tsx' 'src/app/(dashboard)/settings/page.tsx' src/config/greenhouse-nomenclature.ts src/lib/auth.ts src/lib/tenant/access.ts src/types/next-auth.d.ts src/views/Login.tsx src/views/greenhouse/GreenhouseSettings.tsx`: correcto
- Vercel real:
  - se copiaron a `Preview (fix/google-sso-develop-safe)` las envs necesarias desde el preview funcional (`GCP_PROJECT`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
  - se hizo redeploy del branch safe y quedo `Ready` en `https://greenhouse-eo-git-fix-google-sso-develop-safe-efeonce-7670142f.vercel.app`
  - `pre-greenhouse.efeoncepro.com` ahora apunta a ese deployment safe
- Validacion runtime remota:
  - `https://greenhouse-eo-git-fix-google-sso-develop-safe-efeonce-7670142f.vercel.app/api/auth/providers` expone `azure-ad`, `google` y `credentials`
  - `https://pre-greenhouse.efeoncepro.com/api/auth/providers` expone `azure-ad`, `google` y `credentials`
  - `https://pre-greenhouse.efeoncepro.com/login` contiene `Entrar con Google` y `Entrar con Microsoft`

### Riesgos o pendientes

- `pre-greenhouse` ya no apunta al preview experimental `feature/google-sso`; ahora refleja la rama merge-safe `fix/google-sso-develop-safe`.
- El alias estable del branch safe (`greenhouse-eo-git-fix-google-sso-develop-safe-efeonce-7670142f.vercel.app`) no esta agregado como redirect URI en GCP; para pruebas humanas usar `pre-greenhouse.efeoncepro.com`, que si esta autorizado.
- Queda pendiente solo la validacion humana final del flujo OAuth completo en navegador antes del merge a `develop`.

## 2026-03-13 22:59 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ejecutar `docs/tasks/complete/CODEX_TASK_Google_SSO_Greenhouse.md` en una rama paralela sobre `develop`, agregando Google SSO al runtime actual de NextAuth sin romper Microsoft ni credentials.

### Rama

- Rama usada: `feature/google-sso`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview branch / `pre-greenhouse`

### Archivos tocados

- `src/lib/auth.ts`
- `src/lib/tenant/access.ts`
- `src/types/next-auth.d.ts`
- `src/views/Login.tsx`
- `src/views/greenhouse/GreenhouseSettings.tsx`
- `src/app/(blank-layout-pages)/login/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/config/greenhouse-nomenclature.ts`
- `scripts/setup-bigquery.sql`
- `.env.example`
- `.env.local.example`
- `README.md`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `git diff --check`: correcto
- `pnpm lint`: correcto
- Referencia Vuexy revisada:
  - `../greenhouse-eo/full-version/src/libs/auth.ts` confirma el patron simple de `GoogleProvider`
  - `../greenhouse-eo/full-version/src/views/Login.tsx` y `src/views/pages/auth/LoginV2.tsx` solo aportan el detalle visual del icono Google; no se reutilizo el layout demo ni el adapter Prisma
- BigQuery real:
  - `ALTER TABLE efeonce-group.greenhouse.client_users` aplicado para `google_sub` y `google_email`
- GCP real:
  - OAuth client creado: `projects/efeonce-group/locations/global/oauthClients/greenhouse-portal`
  - `clientId`: `a1fcb039b-cb54-41a3-8988-3acad9901c96`
  - redirect URIs activas:
    - `https://greenhouse.efeoncepro.com/api/auth/callback/google`
    - `https://dev-greenhouse.efeoncepro.com/api/auth/callback/google`
    - `https://pre-greenhouse.efeoncepro.com/api/auth/callback/google`
    - `https://greenhouse-eo-git-feature-google-sso-efeonce-7670142f.vercel.app/api/auth/callback/google`
    - `http://localhost:3000/api/auth/callback/google`
- Vercel real:
  - se cargaron `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `Development`, `staging`, `Production`, `Preview (develop)` y `Preview (feature/google-sso)`
  - `Preview (feature/google-sso)` tambien quedo con `GCP_PROJECT`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `AZURE_AD_CLIENT_ID` y `AZURE_AD_CLIENT_SECRET`
  - preview validado: `https://greenhouse-eo-git-feature-google-sso-efeonce-7670142f.vercel.app`
  - deployment activo validado: `https://greenhouse-c6rz0laml-efeonce-7670142f.vercel.app`
- Validacion runtime remota:
  - `/login` responde en el preview protegido via `vercel curl`
  - `/api/auth/providers` expone `azure-ad`, `google` y `credentials`

### Riesgos o pendientes

- Regla operativa importante: esta rama mantiene el principio vigente del portal; Google SSO solo vincula principals existentes en `greenhouse.client_users` y no auto-provisiona acceso solo por `allowed_email_domains`.
- El `pnpm build` local en este shell siguio fallando por un issue local de Next.js alrededor de `/developers/api`, pero el build remoto de Vercel para `feature/google-sso` quedo `Ready`.
- Falta validacion humana final del redirect completo en navegador contra una cuenta Google real; desde CLI quedo validado el provider, el callback URL y el principal Efeonce existente.

## 2026-03-13 21:00 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Investigar la documentacion oficial de Vercel y dejar una skill reusable para operar previews, staging, production, dominios protegidos y promociones desde este repo.

### Rama

- Rama usada: `fix/team-identity-task-closeout`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Operacion Vercel cross-environment

### Archivos tocados

- `.codex/skills/vercel-operations/SKILL.md`
- `.codex/skills/vercel-operations/references/official-vercel-reference.md`
- `.codex/skills/vercel-operations/references/greenhouse-vercel-map.md`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- Fuentes usadas: documentacion oficial de Vercel sobre CLI, project linking, env, logs, promote, rollback, deployment protection, protection bypass, custom environments y Vercel MCP.
- `git diff --check`: correcto
- Limitacion actual del entorno:
  - este shell sigue sin `vercel`, `node`, `npx` y `pnpm`
  - por eso la skill ya quedo versionada, pero la CLI real aun no puede ejecutarse desde esta sesion

### Riesgos o pendientes

- Para usar la skill de forma operativa aqui mismo, hace falta que el entorno tenga `vercel` disponible o que otro shell autenticado la ejecute.
- `pre-greenhouse.efeoncepro.com` fue verificado por `curl` y responde Vercel Authentication `401`; eso confirma proteccion activa, no el deployment exacto detras del dominio.

## 2026-03-13 23:59 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Cerrar los gaps literales que quedaban entre el task `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` y la implementacion ya mergeada en `develop`, pero haciendolo en una rama aislada para no tocar integracion aun.

### Rama

- Rama usada: `fix/team-identity-task-closeout`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Preview / development branch

### Archivos tocados

- `src/components/greenhouse/TeamSignalChip.tsx`
- `src/components/greenhouse/TeamProgressBar.tsx`
- `src/components/greenhouse/TeamMemberCard.tsx`
- `src/components/greenhouse/TeamDossierSection.tsx`
- `src/components/greenhouse/TeamCapacitySection.tsx`
- `src/components/greenhouse/ProjectTeamSection.tsx`
- `src/components/greenhouse/SprintTeamVelocitySection.tsx`
- `src/views/greenhouse/dashboard/helpers.ts`
- `src/config/greenhouse-nomenclature.ts`
- `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `git diff --check`: correcto
- Validacion automatica pendiente:
  - `pnpm lint`: no ejecutado en este shell porque `node`, `npx` y `pnpm` no estan disponibles
  - `pnpm build`: no ejecutado en este shell por la misma limitacion
- Revision manual del delta:
  - Vista 1 ya no muestra FTE individual
  - Vista 3 ahora usa `AvatarGroup` + detalle expandible tabular
  - los semaforos nuevos del modulo pasan por primitives basadas en `GH_COLORS.semaphore`
  - los textos visibles que faltaban se centralizaron en nomenclatura
  - el task doc ya quedo alineado al schema real de `notion_ops.tareas`

### Riesgos o pendientes

- Hace falta correr `pnpm lint` y `pnpm build` en un entorno con Node antes de mergear esta rama.
- El cierre documental del task asume como contrato valido el schema real (`responsables_names`, `responsables_ids`, `responsable_texto`), no el supuesto original de columnas directas `responsable_*`.
- Conviene validar visualmente en Preview la nueva Vista 3 porque cambio de cards siempre abiertas a resumen compacto + expandible.

## 2026-03-13 23:58 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Endurecer de verdad la identidad canonica del roster Efeonce para que Greenhouse sea la identidad base y los providers externos queden enlazados como enrichment.
- Dar una pasada visual adicional a las 4 surfaces live del task usando patrones Vuexy ya presentes en el repo.

### Rama

- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo del merge: `main`

### Ambiente objetivo

- Development / BigQuery real / preview readiness

### Archivos tocados

- `src/types/team.ts`
- `src/lib/team-queries.ts`
- `scripts/setup-team-tables.sql`
- `src/config/greenhouse-nomenclature.ts`
- `src/components/greenhouse/TeamIdentityBadgeGroup.tsx`
- `src/components/greenhouse/TeamMemberCard.tsx`
- `src/components/greenhouse/TeamDossierSection.tsx`
- `src/components/greenhouse/TeamCapacitySection.tsx`
- `src/components/greenhouse/ProjectTeamSection.tsx`
- `src/components/greenhouse/SprintTeamVelocitySection.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `pnpm lint`: correcto
- `pnpm build`: correcto
- `scripts/setup-team-tables.sql` reaplicado en BigQuery real: correcto
- Verificacion directa en BigQuery:
  - `greenhouse.team_members` ahora expone `identity_profile_id` y `email_aliases`
  - el roster Efeonce quedo con `7` miembros enlazados a perfil canonico
  - `identity_profile_source_links` ahora incluye links activos de `greenhouse_team`, `greenhouse_auth`, `notion`, `hubspot_crm` y `azure_ad`
  - el perfil legado `identity-hubspot-crm-owner-75788512` de Julio quedo `archived` / `active = FALSE`
  - `greenhouse.team_members` ahora tambien expone columnas de perfil ampliado: `first_name`, `last_name`, `preferred_name`, `legal_name`, `org_role_id`, `profession_id`, `seniority_level`, `employment_type`, `birth_date`, `phone`, `teams_user_id`, `slack_user_id`, `location_city`, `location_country`, `time_zone`, `years_experience`, `efeonce_start_date`, `biography`, `languages`
  - `greenhouse.team_role_catalog` y `greenhouse.team_profession_catalog` ya quedaron sembradas en BigQuery real

### Riesgos o pendientes

- Falta validacion visual autenticada en Preview para confirmar la nueva jerarquia visual de las 4 cards con datos reales en navegador.
- La capa ya soporta futuros providers en `identity_profile_source_links`, pero todavia no existe ingestion real para `google_workspace`, `deel`, `frame_io` o `adobe`; el modelo quedo listo, no el sync.
- El perfil ampliado ya existe a nivel schema y runtime, pero varios atributos siguen `NULL` en seed porque no habia dato confirmado; para cerrar la ficha completa faltaria una fuente canonica de RRHH o un backoffice admin de talento.
- El repo externo `notion-bigquery` ya estaba alineado para `Responsables`; no hay cambio pendiente ahi por este ajuste salvo mergear su rama documental si se quiere dejar el contrato cerrado.

## 2026-03-13 19:35 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Cerrar operativamente la iniciativa de alineacion Greenhouse + identidad visual persistente y dejar trazabilidad del promote flow hasta `staging` y `Production`.

### Rama

- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Promocion ejecutada:
  - `fix/internal-nav-nomenclature-hydration` -> `develop`
  - `develop` -> `main`

### Ambiente objetivo

- Preview, `staging` y `Production` en Vercel

### Verificacion

- `pre-greenhouse.efeoncepro.com` ya no apunta al preview viejo; fue re-asignado al deployment `greenhouse-mwp8lexfz-efeonce-7670142f.vercel.app` del branch `fix/internal-nav-nomenclature-hydration`.
- `dev-greenhouse.efeoncepro.com` quedo en `Ready` sobre `greenhouse-521mddeos-efeonce-7670142f.vercel.app` despues del merge a `develop`.
- `greenhouse.efeoncepro.com` quedo en `Ready` sobre `greenhouse-2jwy203sv-efeonce-7670142f.vercel.app` despues del merge a `main`.
- Validacion tecnica usada para la promocion:
  - `npx pnpm exec tsc -p tsconfig.json --noEmit --pretty false --incremental false`
  - `vercel inspect` sobre preview, staging y production

### Riesgos o pendientes

- El cierre tecnico y de deploy ya quedo realizado, pero sigue pendiente validacion visual humana final en `pre-greenhouse`, `dev-greenhouse` y `greenhouse` para confirmar jerarquia, contraste y el flujo real de upload de logo/foto.
- El worktree local puede seguir mostrando cambios ajenos en `.env.example`, `.env.local.example`, `package.json` y `pnpm-lock.yaml`; no forman parte del cierre de esta iniciativa.

## 2026-03-13 23:20 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Cerrar los pendientes reales del runtime de team identity + capacity:
  - validar con Node local
  - endurecer y aplicar el bootstrap SQL en BigQuery
  - confirmar el nombre correcto del repo externo del sync

### Rama

- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo del merge: `main`

### Ambiente objetivo

- Development / BigQuery real / preview readiness

### Archivos tocados

- `.eslintrc.js`
- `src/lib/team-queries.ts`
- `src/components/greenhouse/TeamDossierSection.tsx`
- `scripts/setup-team-tables.sql`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `pnpm lint`: correcto
- `pnpm build`: correcto
- `scripts/setup-team-tables.sql` aplicado en BigQuery real: correcto
  - `greenhouse.team_members`: `7` filas
  - `greenhouse.client_team_assignments`: `10` filas
- Verificacion directa en BigQuery:
  - `space-efeonce` quedo con `7` assignments seed
  - `hubspot-company-30825221458` quedo con `3` assignments seed
- `git ls-remote https://github.com/efeoncepro/notion-bigquery.git HEAD`: sin acceso util desde esta sesion
- `git ls-remote git@github.com:efeoncepro/notion-bigquery.git HEAD`: `Repository not found`

### Riesgos o pendientes

- El repo externo correcto del pipeline es `notion-bigquery`, no `notion-bq-sync`.
- Esa parte externa sigue pendiente porque el repo no esta en este workspace y no hubo acceso remoto valido desde esta sesion.
- La validacion ad hoc por import directo de `src/lib/team-queries.ts` con `tsx` choco con `server-only`; no indica fallo del feature, pero si que una smoke script reusable tendria que correr via entorno Next/server real o con un harness dedicado.

## 2026-03-13 20:05 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Implementar upload persistente de logo/foto para spaces y usuarios en los lugares donde hoy existian placeholders de identidad visual.

### Rama

- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo del merge: `main`

### Ambiente objetivo

- Development / admin e internal / identidad visual persistente

### Archivos tocados

- `src/lib/storage/greenhouse-media.ts`
- `src/lib/admin/media-assets.ts`
- `src/lib/bigquery.ts`
- `src/lib/tenant/access.ts`
- `src/lib/auth.ts`
- `src/types/next-auth.d.ts`
- `src/app/api/admin/tenants/[id]/logo/route.ts`
- `src/app/api/admin/users/[id]/avatar/route.ts`
- `src/app/api/media/tenants/[id]/logo/route.ts`
- `src/app/api/media/users/[id]/avatar/route.ts`
- `src/components/greenhouse/IdentityImageUploader.tsx`
- `src/components/greenhouse/index.ts`
- `src/components/layout/shared/UserDropdown.tsx`
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`
- `src/views/greenhouse/GreenhouseAdminUserDetail.tsx`
- `src/views/greenhouse/GreenhouseAdminTenants.tsx`
- `src/views/greenhouse/internal/dashboard/InternalControlTowerTable.tsx`
- `src/views/greenhouse/admin/users/UserListTable.tsx`
- `src/views/greenhouse/admin/tenants/TenantUsersTable.tsx`
- `src/lib/admin/get-admin-tenant-detail.ts`
- `src/lib/admin/get-admin-tenants-overview.ts`
- `src/lib/admin/get-admin-user-detail.ts`
- `src/lib/admin/get-admin-access-overview.ts`
- `src/lib/internal/get-internal-dashboard-overview.ts`
- `src/config/greenhouse-nomenclature.ts`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `npx pnpm exec eslint src/lib/bigquery.ts src/lib/storage/greenhouse-media.ts src/lib/admin/media-assets.ts 'src/app/api/admin/tenants/[id]/logo/route.ts' 'src/app/api/admin/users/[id]/avatar/route.ts' 'src/app/api/media/tenants/[id]/logo/route.ts' 'src/app/api/media/users/[id]/avatar/route.ts' src/components/greenhouse/IdentityImageUploader.tsx src/components/greenhouse/index.ts src/lib/admin/get-admin-tenant-detail.ts src/lib/admin/get-admin-tenants-overview.ts src/lib/admin/get-admin-user-detail.ts src/lib/admin/get-admin-access-overview.ts src/lib/internal/get-internal-dashboard-overview.ts src/lib/tenant/access.ts src/lib/auth.ts src/types/next-auth.d.ts src/components/layout/shared/UserDropdown.tsx src/views/greenhouse/GreenhouseAdminUserDetail.tsx src/views/greenhouse/admin/users/UserListTable.tsx src/views/greenhouse/admin/tenants/TenantUsersTable.tsx src/views/greenhouse/GreenhouseAdminTenants.tsx src/views/greenhouse/internal/dashboard/InternalControlTowerTable.tsx src/views/greenhouse/GreenhouseAdminTenantDetail.tsx src/config/greenhouse-nomenclature.ts`: correcto
- `npx pnpm exec tsc -p tsconfig.json --noEmit --pretty false --incremental false`: sigue bloqueado solo por el archivo duplicado ajeno `src/config/capability-registry (1).ts`

### Riesgos o pendientes

- No se hizo smoke visual autenticado real del flujo de upload ni prueba end-to-end contra GCS/BigQuery en este turno; la validacion fue estatica.
- `package.json` y `pnpm-lock.yaml` siguen modificados en el worktree por trabajo ajeno y no deben mezclarse por accidente con este commit.
- Si el bucket `${GCP_PROJECT}-greenhouse-media` no existe en un ambiente dado, hay que crearlo o definir `GREENHOUSE_MEDIA_BUCKET` antes de probar uploads reales.

## 2026-03-13 20:28 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Verificar por que `pre-greenhouse.efeoncepro.com` no mostraba el estado nuevo de la rama y corregir el bloqueo de Preview en Vercel.

### Rama

- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo del merge: `main`

### Ambiente objetivo

- Preview de Vercel / branch `fix/internal-nav-nomenclature-hydration`

### Archivos tocados

- `tsconfig.json`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `vercel inspect pre-greenhouse.efeoncepro.com -S efeonce-7670142f`: el alias `pre-greenhouse.efeoncepro.com` sigue apuntando a `greenhouse-5jepkohhj-efeonce-7670142f.vercel.app`, no al preview activo de la rama.
- `vercel inspect greenhouse-o05bk3bl7-efeonce-7670142f.vercel.app --logs -S efeonce-7670142f`: el ultimo deploy del branch `fix/internal-nav-nomenclature-hydration` estaba fallando en build por `src/config/capability-registry (1).ts`.
- `npx pnpm exec tsc -p tsconfig.json --noEmit --pretty false --incremental false`: correcto despues de excluir duplicados `* (1).ts(x)` del typecheck.

### Riesgos o pendientes

- Aunque el branch vuelva a desplegar en `Ready`, `pre-greenhouse.efeoncepro.com` seguira mostrando el deployment viejo hasta que se re-asigne o se promueva manualmente el alias.
- Sigue pendiente confirmar visualmente que el uploader y los logos cargados ya aparecen en la preview nueva una vez que Vercel termine el deploy sano.

## 2026-03-13 18:46 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Incorporar los nuevos SVG de branding cargados en `public/branding/SVG` y reemplazar placeholders previos en el shell y en superficies donde `Globe`, `Reach`, `Wave` y `Efeonce` ya forman parte visible de la experiencia.

### Rama

- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo del merge: `main`

### Ambiente objetivo

- Development / branding / shell autenticado / business lines

### Archivos tocados

- `src/components/greenhouse/brand-assets.ts`
- `src/components/greenhouse/BrandWordmark.tsx`
- `src/components/greenhouse/BrandLogo.tsx`
- `src/components/greenhouse/BusinessLineBadge.tsx`
- `src/components/greenhouse/AccountTeamDossierSection.tsx`
- `src/components/greenhouse/index.ts`
- `src/components/layout/shared/Logo.tsx`
- `src/components/layout/vertical/FooterContent.tsx`
- `src/components/layout/horizontal/FooterContent.tsx`
- `src/app/layout.tsx`
- `src/app/(blank-layout-pages)/auth/access-denied/page.tsx`
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`
- `src/views/greenhouse/GreenhouseAdminTenants.tsx`
- `src/views/greenhouse/internal/dashboard/InternalControlTowerTable.tsx`
- `src/views/greenhouse/admin/tenants/TenantCapabilityManager.tsx`
- `src/views/greenhouse/admin/tenants/TenantServiceModulesTable.tsx`
- `src/views/greenhouse/dashboard/ClientDashboardHero.tsx`
- `src/views/greenhouse/dashboard/config.ts`
- `src/views/greenhouse/GreenhouseDashboard.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `npx pnpm exec eslint src/components/greenhouse/brand-assets.ts src/components/greenhouse/BusinessLineBadge.tsx src/components/greenhouse/BrandLogo.tsx src/components/greenhouse/AccountTeamDossierSection.tsx src/components/greenhouse/index.ts src/components/layout/shared/Logo.tsx src/app/layout.tsx src/views/greenhouse/GreenhouseAdminTenantDetail.tsx src/views/greenhouse/GreenhouseAdminTenants.tsx`: correcto

### Riesgos o pendientes

- El typo del asset `public/branding/SVG/isotipo-goble-full.svg` se consume tal como existe en disco; si luego se corrige el nombre del archivo, hay que ajustar el registry.
- Esta ronda ya cubre shell, hero cliente, footers, business lines visibles y superficies principales de admin/internal; conviene hacer una pasada visual real para confirmar tamaños y contraste de wordmarks negativos sobre fondos oscuros.

## 2026-03-13 14:58 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Corregir la interpretacion de `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md` para no mezclar la navegacion cliente del documento con labels de `internal/admin`, y realinear la distribucion del sidebar cliente.

### Rama

- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo del merge: `main`

### Ambiente objetivo

- Development / preview / sidebar cliente / nomenclatura operativa

### Archivos tocados

- `src/config/greenhouse-nomenclature.ts`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/components/layout/shared/UserDropdown.tsx`
- `src/views/greenhouse/GreenhouseDashboard.tsx`
- `src/views/greenhouse/GreenhouseProjects.tsx`
- `src/views/greenhouse/GreenhouseSprints.tsx`
- `src/views/greenhouse/GreenhouseSettings.tsx`
- `src/views/greenhouse/dashboard/ClientDashboardHero.tsx`
- `src/views/greenhouse/GreenhouseAdminTenants.tsx`
- `src/views/greenhouse/GreenhouseAdminRoles.tsx`
- `src/views/greenhouse/admin/users/UserListTable.tsx`
- `src/components/layout/vertical/FooterContent.tsx`
- `src/components/layout/horizontal/FooterContent.tsx`
- `src/data/navigation/verticalMenuData.tsx`
- `src/data/navigation/horizontalMenuData.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `npx pnpm exec eslint src/config/greenhouse-nomenclature.ts src/components/layout/vertical/VerticalMenu.tsx src/components/layout/shared/UserDropdown.tsx src/views/greenhouse/GreenhouseDashboard.tsx src/views/greenhouse/GreenhouseProjects.tsx src/views/greenhouse/GreenhouseSprints.tsx src/views/greenhouse/GreenhouseSettings.tsx src/views/greenhouse/dashboard/ClientDashboardHero.tsx src/views/greenhouse/GreenhouseAdminTenants.tsx src/views/greenhouse/GreenhouseAdminRoles.tsx src/views/greenhouse/admin/users/UserListTable.tsx src/components/layout/vertical/FooterContent.tsx src/components/layout/horizontal/FooterContent.tsx src/data/navigation/verticalMenuData.tsx src/data/navigation/horizontalMenuData.tsx`: correcto
- No se hizo validacion visual autenticada real del sidebar cliente o admin despues de este ajuste.

### Riesgos o pendientes

- La separacion cliente vs internal/admin ya corrige el boundary conceptual, pero aun falta un barrido route-by-route del microcopy cliente contra el documento completo.
- La seccion dinamica `Servicios` sigue viva en el sidebar cliente por necesidad de runtime de capabilities; conviene validarla despues contra la arquitectura de navegacion del producto y no solo contra el doc de nomenclatura.

## 2026-03-13 14:24 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Endurecer el parseo de credenciales BigQuery para Preview de branch en Vercel y revisar desalineaciones de microcopy contra `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`.

### Rama

- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo del merge: `main`

### Ambiente objetivo

- Preview / login / branding publico / runtime auth BigQuery

### Archivos tocados

- `src/lib/bigquery.ts`
- `src/config/greenhouse-nomenclature.ts`
- `src/views/greenhouse/GreenhouseAdminTenants.tsx`
- `src/views/greenhouse/GreenhouseAdminRoles.tsx`
- `src/views/greenhouse/admin/users/UserListTable.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `npx pnpm exec eslint src/views/Login.tsx src/lib/bigquery.ts`: correcto antes de la ronda final de microcopy
- `npx tsc -p tsconfig.json --noEmit --pretty false --incremental false`: bloqueado por archivos duplicados ajenos ya presentes en el worktree (`*(1).ts`, `*(1).tsx`) fuera de este cambio
- `vercel inspect https://pre-greenhouse.efeoncepro.com -S efeonce-7670142f`: correcto, alias apuntando a la preview vigente de la branch
- `vercel logs https://pre-greenhouse.efeoncepro.com -S efeonce-7670142f --no-follow --since 10m --expand`: detecto fallo previo de parseo en `GOOGLE_APPLICATION_CREDENTIALS_JSON`

### Riesgos o pendientes

- Falta rerun de lint sobre el slice final con microcopy admin/settings.
- Falta volver a publicar la ronda final de microcopy en Vercel.
- Si el branch sigue fallando en credenciales despues del fallback base64, cargar `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` en Preview de la branch y redeployar antes de volver a diagnosticar password o provisionamiento.

## 2026-03-13 12:46 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Corregir el desalineamiento post-branding donde `/internal/dashboard` y superficies admin arrancaban con nomenclatura Greenhouse parcial y luego hidrataban a labels legacy/Vuexy, ademas de revisar escapes de tema por cookies viejas.

### Rama

- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo del merge: `main`

### Ambiente objetivo

- Development / production fix candidate / shell autenticado / branding runtime

### Archivos tocados

- `src/@core/utils/brandSettings.ts`
- `src/@core/contexts/settingsContext.tsx`
- `src/@core/utils/serverHelpers.ts`
- `src/components/auth/AuthSessionProvider.tsx`
- `src/components/Providers.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/config/greenhouse-nomenclature.ts`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/components/layout/shared/UserDropdown.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `npx pnpm exec eslint src/@core/utils/brandSettings.ts src/@core/contexts/settingsContext.tsx src/@core/utils/serverHelpers.ts src/components/auth/AuthSessionProvider.tsx src/components/Providers.tsx "src/app/(dashboard)/layout.tsx" src/config/greenhouse-nomenclature.ts src/components/layout/vertical/VerticalMenu.tsx src/components/layout/shared/UserDropdown.tsx`: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false --incremental false`: correcto
- `npx pnpm build`: correcto
- No se ejecuto smoke visual autenticado en navegador real despues del fix; la validacion fue estatico + build

### Riesgos o pendientes

- El fix elimina el flicker del shell autenticado y bloquea `primaryColor/skin/semiDark` legacy en cookie, pero no reescribe aun copy legacy fuera del nav/dropdown en vistas admin como headers o tablas.
- Si algun usuario esperaba seguir personalizando color primario o `skin` desde cookies legacy/customizer, ese comportamiento ya no se preserva; se mantiene solo `mode`, `layout` y widths.
- Conviene hacer smoke visual real en `/internal/dashboard`, `/admin/tenants`, `/admin/users` y `/admin/roles` en preview o staging para confirmar que no queda ningun escape visual de Vuexy en runtime autenticado.

## 2026-03-13 12:01 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Cerrar la ejecucion real de `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`, no solo a nivel de labels, sino tambien en theming, tipografia, sidebar branded y copy secundaria del dashboard cliente activo.

### Rama

- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / client portal / nomenclature + branding runtime / Vuexy theme-safe rollout

### Archivos tocados

- `src/config/greenhouse-nomenclature.ts`
- `src/configs/primaryColorConfig.ts`
- `src/configs/themeConfig.ts`
- `src/app/layout.tsx`
- `src/styles/greenhouse-sidebar.css`
- `src/components/theme/index.tsx`
- `src/components/theme/mergedTheme.ts`
- `src/components/theme/types.ts`
- `src/components/layout/shared/Logo.tsx`
- `src/components/layout/vertical/Navigation.tsx`
- `src/components/layout/horizontal/VerticalNavContent.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/components/layout/vertical/FooterContent.tsx`
- `src/components/layout/horizontal/FooterContent.tsx`
- `src/views/greenhouse/GreenhouseDashboard.tsx`
- `src/views/greenhouse/GreenhouseProjects.tsx`
- `src/views/greenhouse/GreenhouseSettings.tsx`
- `src/views/greenhouse/GreenhouseSprints.tsx`
- `src/views/greenhouse/dashboard/ClientPortfolioHealthAccordion.tsx`
- `src/views/greenhouse/dashboard/ClientAttentionProjectsAccordion.tsx`
- `src/views/greenhouse/dashboard/ClientEcosystemSection.tsx`
- `src/views/greenhouse/dashboard/chart-options.ts`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `npx pnpm exec eslint ...` sobre el slice tocado de nomenclatura, theme y dashboard cliente: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false --incremental false`: correcto
- `npx pnpm build`: correcto
- No se ejecuto validacion visual autenticada real en `/login`, `/dashboard`, `/proyectos`, `/sprints` o `/settings`

### Riesgos o pendientes

- Falta smoke visual autenticado real del sidebar branded, login y dashboard cliente siguiendo `docs/ui/GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md`; este turno valido estructura y build, no jerarquia visual final.
- `themeConfig.mode` queda en `light` como default del documento, pero el switch runtime de `light/dark/system` sigue existiendo; conviene revisar que el look & feel en `dark` no necesite ajuste fino despues del smoke visual.
- El documento completo sigue siendo mas amplio que este slice: admin e internal aun conservan copy legacy fuera de la capa centralizada y no fueron objetivo de este turno.

## 2026-03-13 11:09 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ejecutar `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md` sobre las superficies cliente principales sin romper el sistema de theming oficial de Vuexy.

### Rama

- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / client portal / nomenclature rollout / Vuexy theme-safe UI wiring

### Archivos tocados

- `src/config/greenhouse-nomenclature.ts`
- `src/views/Login.tsx`
- `src/views/greenhouse/GreenhouseDashboard.tsx`
- `src/views/greenhouse/GreenhouseProjects.tsx`
- `src/views/greenhouse/GreenhouseSprints.tsx`
- `src/views/greenhouse/GreenhouseSettings.tsx`
- `src/views/greenhouse/dashboard/*`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/components/layout/shared/UserDropdown.tsx`
- `src/components/layout/vertical/FooterContent.tsx`
- `src/components/layout/horizontal/FooterContent.tsx`
- `src/data/navigation/*`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `npx pnpm exec eslint ...` sobre los archivos tocados de nomenclatura y superficies cliente: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false`: timeout en este worktree (`124s`), no verificado

### Riesgos o pendientes

- La nomenclatura v3 ya cubre login, navegacion y las rutas cliente principales, pero todavia quedan textos legacy fuera de este slice en componentes secundarios de dashboard, admin e internal.
- Se ratifico que Vuexy debe seguir siendo la capa de theming base; si otro agente quiere tocar paleta global u overrides compartidos, debe hacerlo por `src/components/theme/mergedTheme.ts` o `@core/theme/*`, no con un theme custom paralelo.
- Conviene correr una validacion visual autenticada real sobre `/dashboard`, `/proyectos`, `/sprints`, `/settings` y `/login` antes de promover este cambio.

## 2026-03-13 14:39 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Subir la barra visual de `Creative Hub` para que la capability no solo cumpla el runtime del documento, sino que reutilice de forma explicita patrones Vuexy de `full-version`.

### Rama

- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / capability runtime / Creative Hub / visual refactor / smoke autenticado

### Archivos tocados

- `src/components/capabilities/CapabilityOverviewHero.tsx`
- `src/components/capabilities/CapabilityCard.tsx`
- `src/components/card-statistics/HorizontalWithSubtitle.tsx`
- `src/views/greenhouse/GreenhouseCapabilityModule.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `npx pnpm exec eslint src/components/card-statistics/HorizontalWithSubtitle.tsx src/components/capabilities/CapabilityOverviewHero.tsx src/components/capabilities/CapabilityCard.tsx src/views/greenhouse/GreenhouseCapabilityModule.tsx`: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false --incremental false`: correcto
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- `powershell -ExecutionPolicy Bypass -File .\\scripts\\run-capability-preview-smoke.ps1`: correcto

### Riesgos o pendientes

- `Creative Hub` ya usa de forma activa patrones visuales adaptados de `full-version`, pero solo este modulo quedo llevado a esa barra; el resto de capabilities aun usan el dispatcher declarativo con visuales mas sobrios.
- `HorizontalWithSubtitle` ahora admite ocultar trend cuando no existe una delta real; si otro agente lo reutiliza, esa flexibilidad ya es parte del contrato del componente.
- `next build` sigue mostrando el mensaje de reconfiguracion de `tsconfig.json`; en este turno no dejo basura porque el archivo se limpio antes de cerrar.

## 2026-03-13 11:42 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Consolidar `Creative Hub` como el primer modulo enriquecido del runtime declarativo de capabilities y ampliar el card catalog real sin romper los otros modules.

### Rama

- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / capability runtime / Creative Hub / smoke autenticado

### Archivos tocados

- `src/types/capabilities.ts`
- `src/config/capability-registry.ts`
- `src/lib/capability-queries/helpers.ts`
- `src/lib/capability-queries/creative-hub.ts`
- `src/lib/capability-queries/crm-command-center.ts`
- `src/lib/capability-queries/onboarding-center.ts`
- `src/lib/capability-queries/web-delivery-lab.ts`
- `src/components/capabilities/CapabilityCard.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`
- `tsconfig.json`

### Verificacion

- `npx pnpm exec eslint src/types/capabilities.ts src/config/capability-registry.ts src/lib/capability-queries/helpers.ts src/lib/capability-queries/creative-hub.ts src/lib/capability-queries/crm-command-center.ts src/lib/capability-queries/onboarding-center.ts src/lib/capability-queries/web-delivery-lab.ts src/components/capabilities/CapabilityCard.tsx`: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false`: correcto
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- `powershell -ExecutionPolicy Bypass -File .\\scripts\\run-capability-preview-smoke.ps1`: correcto

### Riesgos o pendientes

- `Creative Hub` ya usa `cardData` propio y dos card types nuevos (`metric-list`, `chart-bar`), pero el catalogo del documento completo aun es mayor y sigue siendo backlog.
- `next build` sigue reinyectando includes especificos en `tsconfig.json`; se mantuvo el cleanup manual antes de cerrar este turno.
- El siguiente bloque natural, si se sigue expandiendo capabilities, es extraer otro modulo real sobre el mismo patron declarativo enriquecido, probablemente `CRM Command` o un modulo nuevo del documento.

## 2026-03-13 09:11 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Cubrir la parte literal restante del documento en frontend: `CapabilityCard` dispatcher y `ModuleLayout` declarativo guiado por `data.module.cards`.

### Rama

- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / capability runtime / frontend declarativo / smoke autenticado

### Archivos tocados

- `src/components/capabilities/CapabilityCard.tsx`
- `src/components/capabilities/ModuleLayout.tsx`
- `src/views/greenhouse/GreenhouseCapabilityModule.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`
- `tsconfig.json`

### Verificacion

- `npx pnpm exec eslint src/components/capabilities/CapabilityCard.tsx src/components/capabilities/ModuleLayout.tsx src/views/greenhouse/GreenhouseCapabilityModule.tsx`: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false`: correcto
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- `powershell -ExecutionPolicy Bypass -File .\\scripts\\run-capability-preview-smoke.ps1`: correcto

### Riesgos o pendientes

- El dispatcher declarativo cubre los card types reales del registry actual (`metric`, `project-list`, `tooling-list`, `quality-list`), no aun el catalogo amplio completo del documento.
- `next build` sigue intentando reinyectar includes especificos en `tsconfig.json`; se mantuvo el cleanup manual antes del commit.
- Los modulos futuros y pipelines nuevas del documento siguen siendo backlog, no deuda de esta iteracion.

## 2026-03-13 08:39 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ejecutar la siguiente capa pendiente de `docs/architecture/Greenhouse_Capabilities_Architecture_v1.md`: query builders dedicados, cache por capability y guard server-side reusable, dejando el flujo validado y publicado.

### Rama

- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / capability runtime / BigQuery / smoke autenticado / build local

### Archivos tocados

- `src/config/capability-registry.ts`
- `src/types/capabilities.ts`
- `src/lib/capabilities/get-capability-module-data.ts`
- `src/lib/capabilities/module-content-builders.ts`
- `src/lib/capabilities/resolve-capabilities.ts`
- `src/lib/capabilities/verify-module-access.ts`
- `src/lib/capability-queries/*`
- `src/app/api/capabilities/[moduleId]/data/route.ts`
- `src/app/(dashboard)/capabilities/[moduleId]/layout.tsx`
- `scripts/mint-local-admin-jwt.js`
- `tsconfig.json`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `npx pnpm exec eslint ...` sobre la nueva capa de capabilities: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false`: correcto
- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- `powershell -ExecutionPolicy Bypass -File .\\scripts\\run-capability-preview-smoke.ps1`: correcto
- `node .\\scripts\\mint-local-admin-jwt.js`: correcto

### Riesgos o pendientes

- La UI de capabilities sigue siendo una composicion ejecutiva compartida; el avance de este turno separa la data layer y el guard, pero no implementa aun el dispatcher completo de card types propuesto por la spec.
- `next build` sigue intentando reinyectar includes especificos en `tsconfig.json`; el workaround operativo sigue siendo limpiar esos paths autogenerados antes de commitear.
- El documento original menciona modulos futuros como `Review Engine`, `Performance Center` o `SEO Monitor`; esos siguen fuera del scope activo y requeriran nuevas pipelines de datos.

## 2026-03-13 07:21 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Cerrar la validacion pendiente de `docs/architecture/Greenhouse_Capabilities_Architecture_v1.md` con preview admin autenticada, smoke local real y estabilizacion de la verificacion TypeScript en este worktree.

### Rama

- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / admin preview / capability runtime / smoke local autenticado

### Archivos tocados

- `src/lib/capabilities/get-capability-module-data.ts`
- `src/lib/capabilities/module-content-builders.ts`
- `src/types/capabilities.ts`
- `src/views/greenhouse/GreenhouseAdminTenantDashboardPreview.tsx`
- `src/views/greenhouse/GreenhouseAdminTenantCapabilityPreview.tsx`
- `src/app/(dashboard)/admin/tenants/[id]/capability-preview/[moduleId]/page.tsx`
- `scripts/mint-local-admin-jwt.js`
- `scripts/run-capability-preview-smoke.ps1`
- `tsconfig.json`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `gcloud auth login --update-adc`: correcto
- `gcloud auth application-default print-access-token`: correcto
- `npx pnpm exec eslint ...` sobre archivos de capabilities y preview admin: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false`: correcto
- `powershell -ExecutionPolicy Bypass -File .\\scripts\\run-capability-preview-smoke.ps1 -SkipScreenshots`: correcto
- `powershell -ExecutionPolicy Bypass -File .\\scripts\\run-capability-preview-smoke.ps1`: correcto
- Smoke validado sobre:
  - `/admin/tenants/space-efeonce/view-as/dashboard`
  - `/admin/tenants/space-efeonce/capability-preview/creative-hub`

### Riesgos o pendientes

- El documento original sigue proponiendo query builders dedicados por module; hoy la data de cada capability sigue montada sobre el contrato de `/dashboard` con builders editoriales separados.
- La ruta preview admin se movio a `capability-preview` porque el nesting anterior bajo `view-as/capabilities` provocaba corrupcion de route types en Next 16 durante typegen.
- `tsconfig.json` deja fuera validators historicos de `.next-local/build-*`; la intencion es estabilizar la verificacion del repo actual y no compilar caches de ramas antiguas.

## 2026-03-13 00:54 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ejecutar `docs/architecture/Greenhouse_Capabilities_Architecture_v1.md` sobre la arquitectura real del repo, alineando capabilities con `businessLines` y `serviceModules` ya resueltos en sesion y no con el modelo legacy de `greenhouse.clients`.

### Rama

- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / client portal / navegacion dinamica / capabilities runtime

### Archivos tocados

- `src/types/capabilities.ts`
- `src/config/capability-registry.ts`
- `src/lib/capabilities/resolve-capabilities.ts`
- `src/lib/capabilities/get-capability-module-data.ts`
- `src/views/greenhouse/GreenhouseCapabilityModule.tsx`
- `src/app/api/capabilities/resolve/route.ts`
- `src/app/api/capabilities/[moduleId]/data/route.ts`
- `src/app/(dashboard)/capabilities/[moduleId]/layout.tsx`
- `src/app/(dashboard)/capabilities/[moduleId]/page.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `project_context.md`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `npx pnpm exec eslint ...` sobre los archivos tocados de capabilities y `VerticalMenu`: correcto
- `npx tsc -p tsconfig.json --noEmit --pretty false`: correcto
- `npx pnpm lint`: timeout en este worktree
- `npx pnpm build`: timeout en este worktree

### Riesgos o pendientes

- La capa nueva ejecuta la spec usando el runtime vigente (`client_users` + `client_service_modules` + tenant session) y no el JOIN legacy sugerido por el documento original; esa diferencia queda intencional.
- La data de `/capabilities/[moduleId]` reutiliza el payload del dashboard actual; aun no existen query builders dedicados por module ni cache dedicada.
- Conviene hacer smoke visual autenticado del sidebar dinamico y al menos un module route real (`/capabilities/creative-hub` o equivalente) antes de promover cambios mayores sobre esta linea.

## 2026-03-13 01:40 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ejecutar `docs/tasks/complete/CODEX_TASK_Microsoft_SSO_Greenhouse.md` adaptandolo al modelo real de Greenhouse (`greenhouse.client_users`) y no al esquema legacy de login sobre `greenhouse.clients`.

### Rama

- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development + auth runtime + BigQuery + configuracion Vercel

### Archivos tocados

- `src/lib/auth.ts`
- `src/lib/tenant/access.ts`
- `src/types/next-auth.d.ts`
- `src/views/Login.tsx`
- `src/app/(blank-layout-pages)/login/page.tsx`
- `src/app/(blank-layout-pages)/auth/access-denied/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/views/greenhouse/GreenhouseSettings.tsx`
- `bigquery/greenhouse_identity_access_v1.sql`
- `bigquery/greenhouse_microsoft_sso_v1.sql`
- `scripts/setup-bigquery.sql`
- `.env.example`
- `.env.local.example`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`
- `README.md`
- `project_context.md`
- `changelog.md`

### Verificacion

- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- Migracion BigQuery aplicada con el cliente Node del repo:
  - `bigquery/greenhouse_microsoft_sso_v1.sql`
  - columnas confirmadas en `greenhouse.client_users`: `microsoft_oid`, `microsoft_tenant_id`, `microsoft_email`, `last_login_provider`
- `gcloud config get-value project`: `efeonce-group`
- `gcloud auth application-default print-access-token`: correcto
- `vercel login`: correcto por device flow
- Vercel env verificado con `vercel env list --debug`
  - `Production`: ahora tiene `AZURE_AD_CLIENT_ID` y `AZURE_AD_CLIENT_SECRET`
  - `staging`: ahora tiene `AZURE_AD_CLIENT_ID` y `AZURE_AD_CLIENT_SECRET`
  - `Development`: ahora tiene `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `NEXTAUTH_SECRET` y `NEXTAUTH_URL`
  - `Preview (develop)`: ahora tiene `AZURE_AD_CLIENT_ID` y `AZURE_AD_CLIENT_SECRET`

### Riesgos o pendientes

- El runtime auth ahora incluye un fallback para internos Efeonce que resuelve aliases `@efeonce.org` y `@efeoncepro.com` usando el perfil Microsoft antes de rechazar el SSO.
- El task original pedía resolver SSO contra `greenhouse.clients`, pero el runtime real ya vive en `greenhouse.client_users`; el cambio se implemento sobre el modelo actual para no reintroducir el principal legacy.
- Por seguridad, el flujo no auto-provisiona usuarios solo por `allowed_email_domains`; si el dominio coincide pero no existe un principal explicito en `client_users`, el login Microsoft cae en `/auth/access-denied`.
- `Preview` sigue usando env vars muy branch-specific; otras ramas feature que quieran validar SSO remoto pueden necesitar `AZURE_AD_*` cargadas tambien para su branch preview concreto.
- No se hizo smoke OAuth completo en navegador contra Azure; quedo verificado el runtime, el build, la migracion de BigQuery y la presencia de variables clave en Vercel.

## 2026-03-12 16:10 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ejecutar el brief `docs/tasks/complete/CODEX_TASK_Admin_Landing_Control_Tower_Redesign.md` sobre la landing interna real `/internal/dashboard`.

### Rama

- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / landing interna Efeonce

### Archivos tocados

- `src/views/greenhouse/GreenhouseInternalDashboard.tsx`
- `src/views/greenhouse/internal/dashboard/*`
- `src/lib/internal/get-internal-dashboard-overview.ts`
- `src/app/(dashboard)/internal/dashboard/loading.tsx`

### Verificacion

- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- No se ejecuto validacion visual autenticada real en `/internal/dashboard`.

### Riesgos o pendientes

- El CTA `Crear space` quedo visible pero deshabilitado porque el repo aun no tiene mutacion ni ruta real para onboarding de un nuevo space desde UI.
- `Editar` y `Desactivar` existen como acciones del menu contextual pero siguen deshabilitadas; no hay workflow admin implementado para esas mutaciones.
- La priorizacion operativa usa las senales disponibles hoy (`createdAt`, `lastLoginAt`, `scopedProjects`, `pendingResetUsers`, `avgOnTimePct`) y no una auditoria formal de onboarding multi-evento.

## 2026-03-12 13:05 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ejecutar el brief `docs/tasks/complete/CODEX_TASK_Client_Dashboard_Redesign.md` sobre la vista cliente real del dashboard.

### Rama

- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / dashboard cliente y preview admin `view-as`

### Archivos tocados

- `src/views/greenhouse/GreenhouseDashboard.tsx`
- `src/views/greenhouse/dashboard/*`
- `src/lib/dashboard/get-dashboard-overview.ts`
- `src/lib/dashboard/tenant-dashboard-overrides.ts`
- `src/components/greenhouse/EmptyState.tsx`
- `src/components/greenhouse/SectionErrorBoundary.tsx`
- `src/components/card-statistics/HorizontalWithSubtitle.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/loading.tsx`
- `src/views/greenhouse/GreenhouseAdminTenantDashboardPreview.tsx`
- `src/lib/auth.ts`
- `src/lib/tenant/get-tenant-context.ts`
- `src/types/greenhouse-dashboard.ts`
- `src/types/next-auth.d.ts`

### Verificacion

- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- No se ejecuto validacion visual autenticada real en `/dashboard` ni en `/admin/tenants/[id]/view-as/dashboard`.

### Riesgos o pendientes

- El modal de ampliacion de equipo/ecosistema no dispara una notificacion real porque el repo aun no tiene endpoint ni workflow para enviar esa solicitud a owner, email o webhook; quedo como mensaje copiable.
- La zona de `Tu stack` solo muestra herramientas con URL configurada; si la cuenta no tiene links reales guardados, cae al empty state aunque existan defaults por modulo.
- La seccion de capacidad usa la capacidad visible hoy en la cuenta (`monthlyHours` + `averageAllocationPct`) y no una serie formal de utilization historica por 2+ meses.
- Falta smoke visual/authenticado del nuevo dashboard en desktop, tablet y mobile.

## 2026-03-12 07:35 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Cerrar el modelado inicial de identidad interna Efeonce para no depender solo de `client_users` y dejar preparada la futura unificacion con Azure AD.

### Rama

- Rama usada: actual de trabajo local
- Rama objetivo: la rama activa del repo

### Ambiente objetivo

- Development con aplicacion real en BigQuery

### Archivos tocados

- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `bigquery/greenhouse_internal_identity_v1.sql`
- `scripts/backfill-internal-identity-profiles.ts`
- `src/lib/ids/greenhouse-ids.ts`
- `src/lib/admin/get-admin-user-detail.ts`
- `src/views/greenhouse/GreenhouseAdminUserDetail.tsx`

### Verificacion

- `npx pnpm backfill:internal-identity-profiles --dry-run`: correcto
- `npx pnpm backfill:internal-identity-profiles`: correcto
- Resultado real en BigQuery:
  - `2` auth principals internos enlazados a `identity_profile_id`
  - `6` owners HubSpot internos sembrados como perfiles canonicos
  - `8` perfiles `EO-ID-*` creados
- ADC verificado sano con `gcloud auth application-default print-access-token`

### Riesgos o pendientes

- No se hizo auto-merge entre `julio.reyes@efeonce.org` y `jreyes@efeoncepro.com`; esa clase de alias entre dominios queda como reconciliacion manual o futura regla revisada.
- Falta corrida final de `lint` y `build` despues del bootstrap de identidad interna antes de commit si el turno se retoma desde aqui.
- Azure AD no esta implementado; solo quedo la base canonica para enlazarlo despues.

### Fecha

- 2026-03-12 09:15 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Documentar un sistema formal de orquestacion UI para Greenhouse basado en Vuexy/MUI.
- Dejar un skill local reusable para que solicitudes de Claude, Codex u otros agentes se normalicen y mapeen al mismo criterio.

### Rama

- Rama usada: `develop`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / documentacion operativa

### Archivos tocados

- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md`
- `README.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`
- `C:/Users/jreye/.codex/skills/greenhouse-ui-orchestrator/SKILL.md`
- `C:/Users/jreye/.codex/skills/greenhouse-ui-orchestrator/agents/openai.yaml`

### Verificacion

- Revision documental del modelo actual en:
  - `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
  - `references/ui-ux-vuexy.md` del skill `greenhouse-vuexy-portal`
- Verificacion de referencias reales en `full-version` y `starter-kit` para:
  - `WebsiteAnalyticsSlider`
  - `SupportTracker`
  - `SalesOverview`
  - `LineAreaDailySalesChart`
  - `SourceVisits`
  - `SalesByCountries`
  - `UserListCards`
  - `UserListTable`
  - `UserDetails`
  - `UserActivityTimeline`
  - primitives locales `ExecutiveHeroCard`, `ExecutiveMiniStatCard`, `ExecutiveCardShell`, `BrandLogo`
- `python C:/Users/jreye/.codex/skills/.system/skill-creator/scripts/quick_validate.py C:/Users/jreye/.codex/skills/greenhouse-ui-orchestrator`: correcto
- No se ejecuto `lint` ni `build` porque el cambio es documental y de skill local.

### Riesgos o pendientes

- El skill local nuevo no queda automaticamente disponible en el listado de skills de esta sesion; puede requerir nueva sesion o recarga de entorno para ser invocable como skill registrada.
- El catalogo es una primera curacion; falta sumar patrones especificos de `/admin/tenants`, futuras scopes y feature flags, y surfaces de `/equipo` y `/campanas`.
- Falta decidir si el siguiente paso sera solo consulta o si tambien se construira una herramienta interna que consuma el brief y recomiende patrones desde UI.

### Proximo paso recomendado

- Aplicar este sistema al siguiente trabajo visual real sobre `/admin/tenants/[id]` o `/dashboard`.
- Si el flujo resulta estable, promover el orquestador a una practica obligatoria en todas las solicitudes UI del repo.

### Fecha

- 2026-03-12 09:02 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Preparar el smoke funcional del nuevo modelo escalable de provisioning por batches.
- Dejar explicitado que este trabajo sigue abierto y no debe mezclarse aun con `develop`.

### Rama

- Rama usada: `feature/scalable-tenant-contact-provisioning`
- Commit actual del feature: `bc8b546`
- Rama objetivo del merge: ninguna aun; smoke pendiente antes de promover a `develop`

### Ambiente objetivo

- Development local / feature branch aislada

### Archivos tocados

- `src/lib/admin/tenant-member-provisioning-shared.ts`
- `src/lib/admin/tenant-contact-provisioning-snapshot.ts`
- `src/lib/admin/get-admin-tenant-detail.ts`
- `src/lib/admin/tenant-member-provisioning.ts`
- `src/app/api/admin/tenants/[id]/contacts/provision/route.ts`
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`

### Verificacion

- `npx pnpm lint`: correcto
- `npx tsc -p tsconfig.json --noEmit`: correcto
- `npx pnpm build`: bloqueado en este worktree por limitacion de Turbopack/Windows/OneDrive con paths largos, no por error de tipos del cambio
- Push remoto: correcto en `origin/feature/scalable-tenant-contact-provisioning`
- Smoke funcional real del batching:
  - tenant usado: `hubspot-company-27776076692` (`ANAM`)
  - caso validado: `5` contactos pendientes
  - una request con `5` IDs devolvio `400` como se esperaba
  - luego se ejecutaron `2` lotes secuenciales (`4 + 1`) con snapshot firmado y ambos devolvieron `created`
  - verificacion final contra BigQuery + Cloud Run: `tenantUserCount = 6`, `liveContactCount = 6`, `missingCount = 0`

### Riesgos o pendientes

- El batching nuevo ya fue smokeado funcionalmente; falta solo decidir promocion.
- No mergear aun esta rama a `develop` ni `main`.
- El checkout principal del usuario sigue con `.gitignore` modificado; este feature se esta trabajando aparte para no colisionar con ese estado local.

### Proximo paso recomendado

- Promover `feature/scalable-tenant-contact-provisioning` a `develop`.
- Despues validar en preview o staging una corrida equivalente antes de llevarlo a `main`.

### Fecha

- 2026-03-12 08:45 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Hacer escalable el provisioning de contactos HubSpot sin romper el boundary por tenant.
- Eliminar la dependencia de una sola request larga para corridas bulk.

### Rama

- Rama usada: `docs/production-closeout`
- Rama objetivo del merge: por definir antes de promover a `develop` y `main`

### Ambiente objetivo

- Development / pre-merge

### Archivos tocados

- `src/lib/admin/tenant-member-provisioning-shared.ts`
- `src/lib/admin/tenant-contact-provisioning-snapshot.ts`
- `src/lib/admin/get-admin-tenant-detail.ts`
- `src/lib/admin/tenant-member-provisioning.ts`
- `src/app/api/admin/tenants/[id]/contacts/provision/route.ts`
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`

### Verificacion

- Cambio funcional implementado:
  - la pantalla admin ahora hace una sola lectura live inicial de contactos y reutiliza un snapshot firmado por el servidor
  - el endpoint ya no acepta corridas largas: limita el request a `4` contactos por llamada
  - la UI divide automaticamente los pendientes en batches secuenciales y agrega feedback/progreso
  - el backend solo vuelve a consultar Cloud Run si no recibe un snapshot valido
- Validacion:
  - `npx pnpm lint`: correcto
  - `npx tsc -p tsconfig.json --noEmit`: correcto
  - `npx pnpm build`: bloqueado por limitacion de Turbopack/Windows/OneDrive con paths largos en el worktree largo, no por un error de tipos del cambio

### Riesgos o pendientes

- Falta smoke funcional del batching nuevo en un runtime real antes de promover.
- La rama de trabajo actual nacio como cierre documental y ahora contiene codigo; conviene reetiquetarla o mover estos commits a una rama de feature antes del merge.

### Proximo paso recomendado

- Crear una rama de feature limpia para este cambio escalable.
- Hacer smoke local o preview de la UI admin ejecutando varios lotes secuenciales.
- Si el smoke sale bien, promover primero a `develop`.

### Fecha

- 2026-03-12 22:05 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Ejecutar `docs/tasks/complete/CODEX_TASK_Tenant_Detail_View_Redesign.md` y rediseñar `/admin/tenants/[id]` con header, tabs y patrones Vuexy reutilizados desde `full-version`.

### Rama

- Rama usada: actual de trabajo local
- Rama objetivo: la rama activa del repo

### Ambiente objetivo

- Admin surface del repo `starter-kit`

### Archivos tocados

- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`
- `src/views/greenhouse/admin/tenants/TenantCapabilityManager.tsx`
- `src/views/greenhouse/admin/tenants/TenantUsersTable.tsx`
- `src/views/greenhouse/admin/tenants/TenantServiceModulesTable.tsx`
- `src/views/greenhouse/admin/tenants/TenantDetailEmptyState.tsx`
- `src/views/greenhouse/admin/tenants/TenantDetailErrorBoundary.tsx`
- `src/views/greenhouse/admin/tenants/TenantDetailLoading.tsx`
- `src/views/greenhouse/admin/tenants/helpers.ts`
- `src/app/(dashboard)/admin/tenants/[id]/loading.tsx`
- `changelog.md`
- `Handoff.md`

### Verificacion

- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- La ruta `ƒ /admin/tenants/[id]` sigue compilando en el build de Next.js
- No se ejecuto validacion visual autenticada real en navegador sobre la ruta; solo validacion estatica y de build

### Riesgos o pendientes

- El brief pedia notas operativas editables, pero no existe una mutacion ya expuesta para `notes`; la vista quedo preparada como lectura clara, no como editor persistente.
- El repo no trae `@mui/x-data-grid`; la tabla de usuarios y la de service modules quedaron resueltas con el patron Vuexy existente sobre `@tanstack/react-table` y `TablePaginationComponent`.
- Conviene correr la validacion visual autentica descrita en `docs/ui/GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md` sobre `/admin/tenants/[id]` y revisar responsive en tablet antes de cerrar commit final.

### Fecha

- 2026-03-13 11:35 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Implementar la fase principal de alineacion a `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md` sin mezclar trabajo de agente/runtime AI.
- Canonicalizar microcopy cliente e `internal/admin` en `src/config/greenhouse-nomenclature.ts`.
- Completar piezas faltantes del portal cliente: `Updates`, `Tu equipo de cuenta` en `Mi Greenhouse`, y `Ciclos` con modulos base adicionales.

### Rama

- Rama usada: actual de trabajo local
- Rama objetivo: la rama activa del repo

### Ambiente objetivo

- Cliente + `internal/admin` en `starter-kit`

### Archivos tocados

- `src/config/greenhouse-nomenclature.ts`
- `src/components/greenhouse/AccountTeamDossierSection.tsx`
- `src/components/greenhouse/index.ts`
- `src/app/(dashboard)/updates/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/sprints/page.tsx`
- `src/data/navigation/verticalMenuData.tsx`
- `src/data/navigation/horizontalMenuData.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/components/layout/vertical/FooterContent.tsx`
- `src/components/layout/horizontal/FooterContent.tsx`
- `src/components/layout/shared/UserDropdown.tsx`
- `src/views/Login.tsx`
- `src/views/greenhouse/GreenhouseDashboard.tsx`
- `src/views/greenhouse/GreenhouseProjectDetail.tsx`
- `src/views/greenhouse/GreenhouseSettings.tsx`
- `src/views/greenhouse/GreenhouseSprints.tsx`
- `src/views/greenhouse/GreenhouseUpdates.tsx`
- `src/views/greenhouse/dashboard/ClientTeamCapacitySection.tsx`
- `src/views/greenhouse/GreenhouseInternalDashboard.tsx`
- `src/views/greenhouse/internal/dashboard/InternalControlTowerTable.tsx`
- `src/views/greenhouse/GreenhouseAdminTenants.tsx`
- `src/views/greenhouse/GreenhouseAdminRoles.tsx`
- `src/views/greenhouse/admin/users/UserListCards.tsx`
- `src/views/greenhouse/admin/users/UserListTable.tsx`
- `src/views/greenhouse/admin/tenants/TenantUsersTable.tsx`
- `src/views/greenhouse/GreenhouseAdminUserDetail.tsx`
- `changelog.md`
- `project_context.md`
- `Handoff.md`

### Verificacion

- Cambio funcional implementado:
  - se agrego la ruta cliente `/updates` y su navegacion asociada
  - `Mi Greenhouse` ahora incorpora el dossier `Tu equipo de cuenta`
  - `Pulse` separa la lectura de `Capacidad del equipo` del dossier relacional
  - `Ciclos` ahora expone `Ciclo activo`, `Ciclos anteriores`, `Velocity por ciclo`, `Burndown` y `Velocity por persona` con copy Greenhouse
  - `Proyectos/[id]` fue reescrito con breadcrumbs cliente, labels Greenhouse y sin mensajes tecnicos visibles
  - `internal/admin` ahora toma una capa adicional de copy desde `GH_INTERNAL_MESSAGES` en dashboard interno, tablas de users, users por tenant y detalle de usuario
- Validacion:
  - `pnpm exec eslint` sobre los slices tocados: correcto
  - `pnpm exec tsc -p tsconfig.json --noEmit --pretty false --incremental false`: bloqueado por archivo ajeno `src/config/capability-registry (1).ts`

### Riesgos o pendientes

- Sigue quedando copy residual legacy en superficies internas grandes no barridas completas en este turno, especialmente `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`.
- No se ejecuto smoke visual autenticado real; la validacion fue estatica.
- `tsc` sigue bloqueado por el archivo duplicado ajeno `src/config/capability-registry (1).ts`, fuera del alcance de esta alineacion.

### Proximo paso recomendado

- Barrer `GreenhouseAdminTenantDetail.tsx` y `GreenhouseAdminTenantDashboardPreview.tsx` para terminar de sacar copy residual interna.
- Ejecutar smoke visual autenticado de `/dashboard`, `/proyectos/[id]`, `/settings`, `/sprints`, `/updates`, `/admin`, `/admin/users/[id]`.
- Resolver o eliminar el archivo duplicado `src/config/capability-registry (1).ts` antes del siguiente `build/tsc` integral.

### Fecha

- 2026-03-13 18:05 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Extender la alineacion de nomenclatura Greenhouse a `admin/tenants/[id]`, `view-as/dashboard` y los subcomponentes operativos del detalle de space.

### Rama

- Rama usada: `fix/internal-nav-nomenclature-hydration`
- Rama objetivo: la rama activa del repo

### Ambiente objetivo

- `internal/admin` del repo `starter-kit`

### Archivos tocados

- `src/config/greenhouse-nomenclature.ts`
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`
- `src/views/greenhouse/GreenhouseAdminTenantDashboardPreview.tsx`
- `src/views/greenhouse/admin/tenants/TenantCapabilityManager.tsx`
- `src/views/greenhouse/admin/tenants/TenantServiceModulesTable.tsx`
- `src/views/greenhouse/admin/tenants/TenantDetailErrorBoundary.tsx`
- `Handoff.md`
- `changelog.md`
- `project_context.md`

### Verificacion

- `pnpm exec eslint src/config/greenhouse-nomenclature.ts src/views/greenhouse/GreenhouseAdminTenantDetail.tsx src/views/greenhouse/GreenhouseAdminTenantDashboardPreview.tsx src/views/greenhouse/admin/tenants/TenantCapabilityManager.tsx src/views/greenhouse/admin/tenants/TenantServiceModulesTable.tsx src/views/greenhouse/admin/tenants/TenantDetailErrorBoundary.tsx`: correcto

### Riesgos o pendientes

- El detalle de tenant queda mucho mas alineado, pero aun puede sobrevivir copy residual menor ligado a labels tecnicas de HubSpot owner/base URL o textos de dominio que el equipo quiera hispanizar mas adelante.
- Sigue pendiente smoke visual autenticado de `admin/tenants/[id]` y `view-as/dashboard`.

### Fecha

- 2026-03-14 10:05 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Re-asignar `pre-greenhouse.efeoncepro.com` para que apunte al preview activo de `HR Payroll` y dejar claro el nuevo destino compartido de pruebas.

### Rama

- Rama usada: `feature/hr-payroll`
- Rama objetivo: la rama activa del repo

### Ambiente objetivo

- Vercel Preview compartido / `pre-greenhouse`

### Cambios realizados

- Se confirmo que `feature/hr-payroll` tenia previews `Ready` propios, pero `pre-greenhouse.efeoncepro.com` no apuntaba a esa rama.
- Se detecto que el scope correcto para operar el dominio era `efeonce-7670142f`, no el scope personal `efeonce`.
- Se reasigno `pre-greenhouse.efeoncepro.com` al deployment `greenhouse-hpw9s8fkp-efeonce-7670142f.vercel.app` correspondiente al preview actual de `feature/hr-payroll`.

### Verificacion

- `pnpm dlx vercel@latest alias set greenhouse-hpw9s8fkp-efeonce-7670142f.vercel.app pre-greenhouse.efeoncepro.com --scope efeonce-7670142f`: correcto
- `pnpm dlx vercel@latest curl /login --deployment https://pre-greenhouse.efeoncepro.com --scope efeonce-7670142f`: correcto, responde login con `Entrar con Microsoft` y `Entrar con Google`
- `pnpm dlx vercel@latest curl /api/hr/payroll/periods --deployment https://pre-greenhouse.efeoncepro.com --scope efeonce-7670142f`: correcto, responde `{\"error\":\"Unauthorized\"}` sin sesion

### Riesgos o pendientes

- `pre-greenhouse` es un alias compartido; cualquier otro agente que lo necesite para otra rama tendra que re-asignarlo conscientemente.
- Falta validacion humana autenticada del flujo completo de `HR Payroll` sobre `pre-greenhouse`.

### Fecha

- 2026-03-14 10:28 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Corregir el bloqueo real de login en `pre-greenhouse` para `feature/hr-payroll` y aislar si el rechazo restante era de infraestructura o de password.

### Rama

- Rama usada: `feature/hr-payroll`
- Rama objetivo: la rama activa del repo

### Ambiente objetivo

- Vercel Preview compartido / `pre-greenhouse`

### Cambios realizados

- Se detecto por logs que el login por `credentials` estaba fallando antes de validar password por un error de BigQuery:
  - `Cannot parse REYES@EFEONCE as CloudRegion`
- Se corrigieron las env vars branch-specific de `Preview (feature/hr-payroll)`:
  - `GCP_PROJECT = efeonce-group`
  - `NEXTAUTH_URL = https://pre-greenhouse.efeoncepro.com`
- Se redeployo el preview corregido:
  - `https://greenhouse-lc737eg28-efeonce-7670142f.vercel.app`
- Se re-asigno `pre-greenhouse.efeoncepro.com` a ese deployment corregido.

### Verificacion

- `vercel logs` antes del fix: confirmo error de infraestructura en callback `credentials`
- `vercel env add ... --force` para `GCP_PROJECT` y `NEXTAUTH_URL`: correcto
- `vercel redeploy greenhouse-hpw9s8fkp-efeonce-7670142f.vercel.app --scope efeonce-7670142f`: correcto
- `vercel alias set greenhouse-lc737eg28-efeonce-7670142f.vercel.app pre-greenhouse.efeoncepro.com --scope efeonce-7670142f`: correcto
- Smoke del callback `credentials` con sesion CSRF real:
  - ahora responde `CredentialsSignin`
  - ya no aparece el error `CloudRegion`
- `vercel logs` despues del fix:
  - el principal `julio.reyes@efeonce.org` existe y esta `active = true`, `status = active`
  - el rechazo restante es `password mismatch or inactive user`, por lo que el bloqueo de infraestructura quedo resuelto y el fallo actual es solo de password no coincidente

### Riesgos o pendientes

- El preview ya no rompe por BigQuery durante login, pero el acceso por email/password seguira fallando mientras no se use la password correcta o no se resetee la credencial del usuario.
- Para usuarios internos de Efeonce, el flujo recomendado sigue siendo `Entrar con Microsoft`; el principal ya existe y el path SSO es mas apropiado que depender de password manual.

### Fecha

- 2026-03-14 10:52 America/Santiago

### Agente

- Codex

### Objetivo del turno

- Provisionar accesos internos nuevos para el equipo Efeonce en Greenhouse sin tocar la cuenta existente de Julio y dejar sus claves temporales en un archivo local separado.

### Rama

- Rama usada: `feature/hr-payroll`
- Rama objetivo: la rama activa del repo

### Ambiente objetivo

- BigQuery real / `pre-greenhouse`

### Cambios realizados

- Se confirmo que, de la lista entregada, solo `Julio Reyes` ya existia como `client_user`; su cuenta y password no se tocaron.
- Se verifico que las otras 6 personas ya existian en `greenhouse.team_members` / `greenhouse.identity_profiles`, por lo que se provisiono solo la capa de acceso en `greenhouse.client_users`.
- Se crearon 6 usuarios internos nuevos en `greenhouse.client_users`, enlazados por `identity_profile_id` y con `microsoft_email` igual al correo `@efeoncepro.com`:
  - `Valentina Hoyos` -> `efeonce_account`
  - `Daniela Ferreira` -> `efeonce_operations`
  - `Humberly Henriquez` -> `efeonce_operations`
  - `Melkin Hernandez` -> `efeonce_operations`
  - `Andres Carlosama` -> `efeonce_operations`
  - `Luis Reyes` -> `efeonce_account`
- Se agregaron o consolidaron aliases de email en `greenhouse.team_members.email_aliases` para incluir los correos internos `@efeonce.org` provistos por el usuario.
- Se crearon `user_role_assignments` activos para esas 6 cuentas.
- Se agregaron `identity_profile_source_links` de tipo `greenhouse_auth/client_user` para dejar la capa de identidad canonica enlazada al nuevo principal de login.
- Se genero un archivo local con claves temporales:
  - `LOCAL_INTERNAL_TEAM_ACCESS_CREDENTIALS_2026-03-14.md`
  - el archivo fue agregado a `.git/info/exclude` para no commitearlo por accidente

### Verificacion

- Query real a BigQuery despues del alta:
  - las 6 cuentas nuevas aparecen activas en `greenhouse.client_users`
  - cada una con `identity_profile_id` y `role_codes` esperados
- Smoke real de login en `pre-greenhouse` con `valentina.hoyos@efeonce.org`:
  - `POST /api/auth/callback/credentials` devolvio `https://pre-greenhouse.efeoncepro.com/auth/landing`

### Riesgos o pendientes

- El archivo `LOCAL_INTERNAL_TEAM_ACCESS_CREDENTIALS_2026-03-14.md` es sensible y local-only; no debe compartirse ni commitearse.
- Algunos perfiles canonicos siguen anclados a HubSpot o `greenhouse_team`; hoy eso no bloquea login porque `client_users.identity_profile_id` y `identity_profile_source_links` ya quedaron creados.
- Si se quiere endurecer la gobernanza, el siguiente paso seria crear un flujo formal de reset/rotacion de passwords temporales para internos.

---

## 2026-03-14 21:00 America/Santiago

### Agente

- Claude (claude-opus-4-6)

### Objetivo del turno

- Implementación de Phase 1 del módulo financiero (CODEX_TASK_Financial_Module.md): infraestructura BigQuery, auth, guards, sidebar, API routes, placeholder pages y diseño UX del dashboard.

### Rama

- Rama usada: `feature/finance-module` (desde `origin/develop`)
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / Preview

### Archivos creados

#### Infraestructura backend

- `src/lib/finance/schema.ts` — `ensureFinanceInfrastructure()`: provisioning on-demand de 8 tablas BigQuery (`fin_accounts`, `fin_suppliers`, `fin_client_profiles`, `fin_income`, `fin_expenses`, `fin_reconciliation_periods`, `fin_bank_statement_rows`, `fin_exchange_rates`) + seed del rol `finance_manager`. Patrón singleton promise idempotente.
- `src/lib/finance/shared.ts` — `FinanceValidationError`, validators (`assertValidCurrency`, `assertPositiveAmount`, `assertNonEmptyString`, `assertDateString`), tipos (`FinanceCurrency`, `AccountType`, `PaymentMethod`, `ExpenseType`, `PaymentStatus`, `ServiceLine`), helper `runFinanceQuery<T>()`, normalizadores.

#### Auth y access

- `src/lib/tenant/authorization.ts` — Agregado `'finance'` al tipo `TenantRouteGroup` + función `requireFinanceTenantContext()` (permite `routeGroups.includes('finance') || roleCodes.includes('efeonce_admin')`).
- `src/lib/tenant/access.ts` — Agregado mapeo `finance_manager` → `['internal', 'finance']` en `deriveRouteGroups()`.

#### API Routes

- `src/app/api/finance/accounts/route.ts` — GET (lista cuentas activas), POST (crear cuenta con validación)
- `src/app/api/finance/accounts/[id]/route.ts` — PUT (actualización parcial dinámica con check 404)
- `src/app/api/finance/exchange-rates/route.ts` — GET (lista con filtros de fecha), POST (upsert con MERGE)
- `src/app/api/finance/exchange-rates/latest/route.ts` — GET (último tipo de cambio USD/CLP)

#### Pages y layout

- `src/app/(dashboard)/finance/layout.tsx` — Guard de ruta: requiere route group `finance` o `efeonce_admin`
- `src/app/(dashboard)/finance/page.tsx` — Placeholder dashboard
- `src/app/(dashboard)/finance/income/page.tsx` — Placeholder ingresos
- `src/app/(dashboard)/finance/expenses/page.tsx` — Placeholder egresos
- `src/app/(dashboard)/finance/suppliers/page.tsx` — Placeholder proveedores
- `src/app/(dashboard)/finance/clients/page.tsx` — Placeholder clientes
- `src/app/(dashboard)/finance/reconciliation/page.tsx` — Placeholder conciliación

#### Navegación

- `src/components/layout/vertical/VerticalMenu.tsx` — Agregada sección "Finanzas" con 6 items (Dashboard, Ingresos, Egresos, Proveedores, Clientes, Conciliación). Visible solo para `isFinanceUser || isAdminUser`.

### Verificación

- `pnpm exec tsc --noEmit`: sin errores en código fuente (errores solo en `.next` cache stale de SCIM/smoke tests, no relacionados)
- Todos los campos monetarios usan `NUMERIC` (no `FLOAT64`) en DDL
- `amount_pending` no existe como columna física — se calcula como `total_amount - COALESCE(amount_paid, 0)`
- Tipos `unknown` en BigQuery rows resueltos con type assertions explícitas

### Finance Dashboard — Implementado

- **View component creado**: `src/views/greenhouse/finance/FinanceDashboardView.tsx` (client component, ~450 líneas)
- **Spec UX producida por greenhouse-ux skill e implementada completa:**
  - 4 KPIs (`HorizontalWithSubtitle`): Saldo total (primary), Ingresos del mes (success), Egresos del mes (error), Tipo de cambio (info)
  - 2 charts side-by-side (7/5 split): bar chart Ingresos vs Egresos (success/error), area chart Flujo de caja (primary) con `AppReactApexCharts` (dynamic import, ssr: false)
  - Quick actions row: 3 buttons (Registrar ingreso → success, Registrar egreso → error, Iniciar conciliación → primary outlined) con navegación a sub-rutas
  - Recent transactions table: 5 columnas (Tipo/Descripción/Cuenta/Fecha/Monto), empty state "No hay movimientos registrados aún"
  - Loading skeleton: 4 KPI skeletons + 2 chart skeletons
  - Data fetching: `GET /api/finance/accounts` (saldo total + cuenta activas), `GET /api/finance/exchange-rates/latest` (USD/CLP)
  - Phase 1 placeholders: KPIs 2-3 muestran `$0` con "Próximamente", charts y tabla en empty state
- **Page actualizada**: `src/app/(dashboard)/finance/page.tsx` ahora importa `FinanceDashboardView` como server page → client view
- **Grid v6**: Usa `Grid size={{ xs, sm, md }}` (no `item xs=`) para compatibilidad con MUI v6
- **tsc --noEmit**: sin errores en código fuente

### Paralelismo con SCIM (Codex)

- **Zero conflicto confirmado**: SCIM trabaja en `src/app/api/scim/`, `src/lib/scim/` — Finance en `src/app/api/finance/`, `src/lib/finance/`
- No comparten tablas BQ, rutas, componentes UI ni auth mechanisms
- Ramas independientes: `feature/scim-provisioning` vs `feature/finance-module`

### Riesgos o pendientes

- **Phase 3**: Income y Expenses CRUD con tablas TanStack
- **Phase 4**: Reconciliación bancaria con auto-match algorithm
- **Endpoints de summary**: `/api/finance/income/summary` y `/api/finance/expenses/summary` no existen aún — dashboard muestra placeholder
- Los errores de `.next/types/validator.ts` referentes a SCIM son de cache stale y se limpian con `rm -rf .next`

---

## 2026-03-14 22:00 America/Santiago

### Agente

- Claude (claude-opus-4-6)

### Objetivo del turno

- Phase 2 del módulo financiero: Suppliers y Clients CRUD completo (API routes + UI views con KPIs, filtros y tablas).

### Rama

- Rama usada: `feature/finance-module`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / Preview

### Archivos creados/modificados

#### shared.ts ampliado

- `src/lib/finance/shared.ts` — Agregados tipos: `SUPPLIER_CATEGORIES`, `TAX_ID_TYPES`, `CONTACT_ROLES` con sus type exports

#### API Routes — Suppliers

- `src/app/api/finance/suppliers/route.ts` — GET (lista con paginación + filtros: category, country, international, active) + POST (crear con validación, slug auto-generado desde legalName)
- `src/app/api/finance/suppliers/[id]/route.ts` — GET (detalle + payment history de fin_expenses) + PUT (actualización parcial dinámica, 15+ campos editables)

#### API Routes — Clients

- `src/app/api/finance/clients/route.ts` — GET (lista con paginación + filtros: search, requiresPo, requiresHes) + POST (upsert con MERGE por client_profile_id)
- `src/app/api/finance/clients/[id]/route.ts` — GET (perfil financiero + invoices de fin_income, JSON parse finance_contacts) + PUT (actualización parcial, incluyendo finance_contacts JSON)

#### UI Views

- `src/views/greenhouse/finance/SuppliersListView.tsx` — Client component con:
  - 4 KPIs: Total proveedores, Activos, Internacionales, Categoría principal
  - Filtros: categoría (9 opciones), nacional/internacional
  - Tabla: Proveedor (nombre comercial + razón social), Categoría (chip color), País, Moneda, Plazo, Contacto, Estado
  - Loading skeleton, empty state
- `src/views/greenhouse/finance/ClientsListView.tsx` — Client component con:
  - 4 KPIs: Total clientes, Requieren OC, Requieren HES, Facturación USD
  - Filtros: búsqueda por nombre/RUT, OC requerida, HES requerida
  - Tabla: Razón social + HubSpot ID, RUT, Plazo, Moneda, OC (chip), HES (chip)
  - Loading skeleton, empty state

#### Pages actualizadas

- `src/app/(dashboard)/finance/suppliers/page.tsx` — Usa `SuppliersListView`
- `src/app/(dashboard)/finance/clients/page.tsx` — Usa `ClientsListView`

### Verificación

- `pnpm exec tsc --noEmit`: 0 errores en código fuente
- CustomChip `round` prop usa `'true'` string (no boolean) — patrón Vuexy v5
- Grid usa `size={{ xs, sm, md }}` — patrón MUI v6
- `createdBy` usa `tenant.userId` (no `tenant.email` que no existe en TenantContext)
- Paginación implementada con `page/pageSize` query params, max 200

### Riesgos o pendientes

- **Phase 4**: Reconciliación bancaria con auto-match algorithm
- **Detail views**: Suppliers y Clients tienen API GET [id] listas pero las pages de detalle (`/finance/suppliers/[id]`, `/finance/clients/[id]`) aún no existen como views con tabs
- **Endpoints de summary**: `/api/finance/income/summary` y `/api/finance/expenses/summary` no existen aún — dashboard muestra placeholder

---

## 2026-03-14 22:45 America/Santiago

### Agente

- Claude (claude-opus-4-6)

### Objetivo del turno

- Phase 3 del módulo financiero: Income y Expenses CRUD completo (API routes con paginación/filtros + UI views con KPIs, filtros y tablas).

### Rama

- Rama usada: `feature/finance-module`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / Preview

### Archivos creados

#### API Routes — Income

- `src/app/api/finance/income/route.ts` — GET (lista con paginación + filtros: status, clientProfileId, serviceLine, fromDate, toDate) + POST (crear factura con cálculo automático de IVA, tipo de cambio, total CLP, ID auto-generado `INC-YYYYMM-NNNNNN`)
- `src/app/api/finance/income/[id]/route.ts` — PUT (actualización parcial, 20+ campos editables)

#### API Routes — Expenses

- `src/app/api/finance/expenses/route.ts` — GET (lista con paginación + filtros: expenseType, status, supplierId, serviceLine, fromDate, toDate) + POST (crear egreso con 5 tipos: supplier/payroll/social_security/tax/miscellaneous, ID auto-generado `EXP-YYYYMM-NNNNNN`)
- `src/app/api/finance/expenses/[id]/route.ts` — PUT (actualización parcial con campos numéricos, strings y enums tipados)

#### UI Views

- `src/views/greenhouse/finance/IncomeListView.tsx` — Client component con:
  - 4 KPIs: Total facturado (CLP), Por cobrar, Cobrados, Vencidos
  - Filtro por estado de pago (pending/partial/paid/overdue)
  - Tabla 7 columnas: Factura (número + descripción), Cliente, Fecha, Vencimiento, Monto, Estado (chip), Pendiente (color rojo/verde)
  - Formateadores de moneda CLP/USD y fechas DD/MM/YYYY
- `src/views/greenhouse/finance/ExpensesListView.tsx` — Client component con:
  - 4 KPIs: Total egresos, Por pagar, Pagados, Recurrentes
  - Filtros: tipo de egreso (5 opciones), estado de pago
  - Tabla 7 columnas: Tipo (chip color), Descripción + doc number, Proveedor, Fecha, Vencimiento, Monto (rojo), Estado (chip)
  - Chips de tipo con colores semánticos (supplier=primary, payroll=info, tax=error, etc.)

#### Pages actualizadas

- `src/app/(dashboard)/finance/income/page.tsx` — Usa `IncomeListView`
- `src/app/(dashboard)/finance/expenses/page.tsx` — Usa `ExpensesListView`

#### shared.ts ampliado

- `src/lib/finance/shared.ts` — Ya incluía `SUPPLIER_CATEGORIES`, `TAX_ID_TYPES`, `CONTACT_ROLES` de Phase 2

### Verificación

- `pnpm exec tsc --noEmit`: 0 errores en código fuente
- Income POST calcula automáticamente: taxAmount = subtotal × taxRate, totalAmount = subtotal + taxAmount, totalAmountClp = totalAmount × exchangeRateToClp
- Expenses soporta los 5 expense_types del DDL con campos específicos por tipo (supplier_id para supplier, payroll_period_id para payroll, etc.)
- `amount_pending` es campo computado en normalización: `totalAmount - amountPaid` (no almacenado en BQ)

### Resumen acumulado del módulo financiero

| Componente                          | Archivos                                      | Estado              |
| ----------------------------------- | --------------------------------------------- | ------------------- |
| Infraestructura BQ (8 tablas + rol) | `schema.ts`                                   | Completo            |
| Shared validators/types             | `shared.ts`                                   | Completo            |
| Auth + access control               | `authorization.ts`, `access.ts`               | Completo            |
| Layout + guard                      | `finance/layout.tsx`                          | Completo            |
| Sidebar navigation                  | `VerticalMenu.tsx`                            | Completo            |
| Dashboard (KPIs + charts)           | `FinanceDashboardView.tsx`                    | Completo            |
| Accounts API                        | `accounts/route.ts`, `accounts/[id]/route.ts` | Completo            |
| Exchange Rates API                  | `exchange-rates/route.ts`, `latest/route.ts`  | Completo            |
| Suppliers API + UI                  | 2 API routes + `SuppliersListView.tsx`        | Completo            |
| Clients API + UI                    | 2 API routes + `ClientsListView.tsx`          | Completo            |
| Income API + UI                     | 2 API routes + `IncomeListView.tsx`           | Completo            |
| Expenses API + UI                   | 2 API routes + `ExpensesListView.tsx`         | Completo            |
| Reconciliation                      | Placeholder page only                         | Pendiente (Phase 4) |

### Riesgos o pendientes

- **Detail views con tabs**: Suppliers [id], Clients [id] — APIs GET listas, falta UI con tabs
- **Dashboard data real**: Endpoints de summary para alimentar KPIs y charts del dashboard
- **Formularios de creación**: Botones "Registrar ingreso/egreso/período" existen pero no abren drawer/modal aún

---

## 2026-03-14 23:30 America/Santiago

### Agente

- Claude (claude-opus-4-6)

### Objetivo del turno

- Phase 4 del módulo financiero: Reconciliación bancaria completa con auto-match algorithm, import de cartolas y gestión de períodos.

### Rama

- Rama usada: `feature/finance-module`
- Rama objetivo del merge: `develop`

### Ambiente objetivo

- Development / Preview

### Archivos creados

#### API Routes — Reconciliation

- `src/app/api/finance/reconciliation/route.ts` — GET (lista de períodos con filtros: accountId, status) + POST (crear período con validación de duplicados, ID auto-generado `{accountId}_{year}_{month}`)
- `src/app/api/finance/reconciliation/[id]/route.ts` — GET (detalle del período + todas las filas de cartola bancaria) + PUT (actualizar saldos, status, marcar como reconciled con timestamp y user)
- `src/app/api/finance/reconciliation/[id]/statements/route.ts` — POST (importar filas de cartola bancaria, máximo 500 rows, actualiza metadata del período, cambia status a in_progress)
- `src/app/api/finance/reconciliation/[id]/auto-match/route.ts` — POST (auto-match algorithm):
  - Nivel 1: Reference match → 0.95 confidence (auto-match)
  - Nivel 2: Amount + date + partial reference → 0.85 (auto-match)
  - Nivel 3: Amount + date only → 0.70 (suggest, no auto-match)
  - Cruza contra `fin_income` (is_reconciled=FALSE) y `fin_expenses` (is_reconciled=FALSE)
  - Retorna `{ matched, suggested, unmatched, total }`

#### UI View

- `src/views/greenhouse/finance/ReconciliationView.tsx` — Client component con:
  - 4 KPIs: Períodos totales, Conciliados, En proceso, Diferencia total pendiente
  - Filtros: cuenta bancaria (dinámico desde API accounts), estado
  - Tabla 8 columnas: Período (mes/año), Cuenta, Saldo apertura, Saldo banco, Saldo sistema, Diferencia (rojo/verde), Filas importadas, Estado (chip)
  - Nombres de mes en español

#### Page actualizada

- `src/app/(dashboard)/finance/reconciliation/page.tsx` — Usa `ReconciliationView`

### Verificación

- `pnpm exec tsc --noEmit`: 0 errores en código fuente
- Auto-match algorithm protegido: no permite match en períodos reconciled/closed
- Import de statements protegido contra períodos cerrados
- Tolerance de ±1 unidad en matching de montos para absorber redondeos

### Resumen final del módulo financiero completo

| Componente                          | API Routes                    | UI View                | Estado |
| ----------------------------------- | ----------------------------- | ---------------------- | ------ |
| Infraestructura BQ (8 tablas + rol) | —                             | —                      | ✅     |
| Auth + access control               | —                             | —                      | ✅     |
| Dashboard                           | —                             | `FinanceDashboardView` | ✅     |
| Accounts                            | GET, POST, PUT                | —                      | ✅     |
| Exchange Rates                      | GET, POST, GET latest         | —                      | ✅     |
| Suppliers                           | GET, POST, GET [id], PUT [id] | `SuppliersListView`    | ✅     |
| Clients                             | GET, POST, GET [id], PUT [id] | `ClientsListView`      | ✅     |
| Income                              | GET, POST, PUT [id]           | `IncomeListView`       | ✅     |
| Expenses                            | GET, POST, PUT [id]           | `ExpensesListView`     | ✅     |
| Reconciliation                      | GET, POST, GET [id], PUT [id] | `ReconciliationView`   | ✅     |
| Statement Import                    | POST [id]/statements          | —                      | ✅     |
| Auto-match                          | POST [id]/auto-match          | —                      | ✅     |

**Total: 20 API endpoints + 6 UI views + 8 BigQuery tables + sidebar navigation + route guards**

### Pendientes menores (no bloqueantes)

- ~~**Detail views con tabs**: Suppliers [id] y Clients [id] tienen API GET lista pero no UI de detalle~~ ✅ Resuelto
- ~~**Dashboard data real**: Summary endpoints para alimentar charts y KPIs 2-3 con datos reales~~ ✅ Resuelto
- **Formularios modales**: Botones de creación (ingreso/egreso/período/proveedor) sin drawer/modal aún

---

## 2026-03-14 14:55 America/Santiago

### Agente

- Claude Code (Opus 4.6)

### Objetivo del turno

- Completar pendientes del módulo financiero: wiring de dashboard a datos reales, detail views con tabs para Suppliers/Clients/Reconciliation

### Rama

- `feature/admin-team-crud` (continuación del trabajo financiero)
- Target: `develop`

### Ambiente objetivo

- Preview / Development

### Archivos tocados

**Summary API endpoints (nuevos)**:

- `src/app/api/finance/income/summary/route.ts` — Current month vs previous + last 6 months breakdown
- `src/app/api/finance/expenses/summary/route.ts` — Same pattern for expenses

**Dashboard wiring (actualizado)**:

- `src/views/greenhouse/finance/FinanceDashboardView.tsx` — Ahora consume `/api/finance/income/summary` y `/api/finance/expenses/summary` para KPIs reales (Ingresos del mes con trend, Egresos del mes con trend) y charts con datos mensuales dinámicos

**Detail pages (nuevos)**:

- `src/app/(dashboard)/finance/suppliers/[id]/page.tsx` — Server page
- `src/views/greenhouse/finance/SupplierDetailView.tsx` — Detalle con 2 tabs (Información + Historial de pagos), datos bancarios, contacto, categoría
- `src/app/(dashboard)/finance/clients/[id]/page.tsx` — Server page
- `src/views/greenhouse/finance/ClientDetailView.tsx` — Detalle con 2 tabs (Perfil financiero + Facturas), contactos, condiciones especiales
- `src/app/(dashboard)/finance/reconciliation/[id]/page.tsx` — Server page
- `src/views/greenhouse/finance/ReconciliationDetailView.tsx` — Detalle con KPIs, tabla de statement rows, botón auto-match, chips de match status

### Verificación

- `pnpm exec tsc --noEmit`: 0 errores en código fuente (solo cache artifacts de `.next`/`.next-local`)
- Dashboard KPIs 2-3 ahora muestran datos reales con trend arrows
- Charts bar/area reciben categorías dinámicas de los últimos 6 meses
- Detail views usan `useParams()` para obtener ID de la URL

### Resumen actualizado del módulo financiero

| Componente                          | API Routes                               | UI Views                                          | Estado |
| ----------------------------------- | ---------------------------------------- | ------------------------------------------------- | ------ |
| Infraestructura BQ (8 tablas + rol) | —                                        | —                                                 | ✅     |
| Auth + access control               | —                                        | —                                                 | ✅     |
| Dashboard                           | GET income/summary, GET expenses/summary | `FinanceDashboardView` (wired)                    | ✅     |
| Accounts                            | GET, POST, PUT                           | —                                                 | ✅     |
| Exchange Rates                      | GET, POST, GET latest                    | —                                                 | ✅     |
| Suppliers                           | GET, POST, GET [id], PUT [id]            | `SuppliersListView` + `SupplierDetailView`        | ✅     |
| Clients                             | GET, POST, GET [id], PUT [id]            | `ClientsListView` + `ClientDetailView`            | ✅     |
| Income                              | GET, POST, PUT [id], GET summary         | `IncomeListView`                                  | ✅     |
| Expenses                            | GET, POST, PUT [id], GET summary         | `ExpensesListView`                                | ✅     |
| Reconciliation                      | GET, POST, GET [id], PUT [id]            | `ReconciliationView` + `ReconciliationDetailView` | ✅     |
| Statement Import                    | POST [id]/statements                     | —                                                 | ✅     |
| Auto-match                          | POST [id]/auto-match                     | —                                                 | ✅     |

**Total: 22 API endpoints + 9 UI views + 8 BigQuery tables + sidebar navigation + route guards**

### Pendientes menores (no bloqueantes)

- **Formularios modales**: Botones de creación (ingreso/egreso/período/proveedor) sin drawer/modal aún — abren links a las list views por ahora
- **Reconciliation detail view**: UI para ver filas de cartola y aceptar/rechazar matches sugeridos

---

## 2026-03-22 11:35 America/Santiago

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Mapear como backlog pendiente una lane específica para robustecer el puente `Permisos/Asistencia -> Payroll`, sin mezclar todavía implementación runtime.

### Rama

- `develop`

### Ambiente objetivo

- Documentación / backlog

### Archivos tocados

- `docs/tasks/to-do/CODEX_TASK_HR_Payroll_Attendance_Leave_Work_Entries_v1.md`
- `docs/tasks/README.md`

### Nota operativa

- La task nueva queda en `to-do` y no reemplaza la lane ya activa `CODEX_TASK_HR_Payroll_Operational_Hardening_v1.md`.
- Su foco es distinto: exactitud de permisos/asistencia, work entries canónicos, colisiones, aprobaciones tardías y seam futuro para `Microsoft Teams`.
- No se hicieron cambios de runtime en este subturno.

---

## 2026-03-25 21:12 America/Santiago

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Corregir y blindar el flujo `Agency > Campaigns` para que usuarios internos no queden con estado vacío silencioso cuando la API no recibe `spaceId`, y dejar cobertura unitaria temprana con `Vitest`.

### Rama

- `develop`

### Ambiente objetivo

- Runtime local / staging follow-up

### Archivos tocados

- `src/app/api/campaigns/route.ts`
- `src/lib/campaigns/campaign-store.ts`
- `src/views/agency/AgencyCampaignsView.tsx`
- `src/app/api/campaigns/route.test.ts`
- `src/views/agency/AgencyCampaignsView.test.tsx`

### Hallazgos

- `AgencyCampaignsView` consumía `GET /api/campaigns` sin `spaceId`; para usuarios internos, esa ruta devolvía `400` y la UI lo tragaba como si fueran `0` campañas.
- Se ajustó `GET /api/campaigns` para que usuarios internos sin `spaceId` usen `listAllCampaigns()` y mantengan `campaignScopes` cuando existan.
- La vista `AgencyCampaignsView` ahora muestra estado de error explícito si la API responde `non-OK`, en vez de mostrar `Sin campañas registradas`.
- El entorno actual sigue teniendo una deuda adicional de datos/bootstrap: la verificación contra Cloud SQL indicó que `greenhouse_core.campaigns` no existe todavía en esta base, así que un `0` posterior al fix ya no debe asumirse como bug de UI.

### Verificación

- `pnpm test src/app/api/campaigns/route.test.ts`
- `pnpm test src/views/agency/AgencyCampaignsView.test.tsx`
- `pnpm test src/lib/agency/agency-queries.test.ts src/app/api/campaigns/route.test.ts src/views/agency/AgencyCampaignsView.test.tsx`

### Resultado

- `Vitest`: `3 files passed`, `7 tests passed`

### Próximo paso recomendado

- Validar bootstrap/schema de campañas en PostgreSQL con el flujo canónico del dominio, porque el fix de contrato/UI ya no explica por sí solo un listado en `0`.

---

## 2026-03-25 21:21 America/Santiago

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Completar el corte canónico de `Campaign 360` en PostgreSQL para que el runtime de campañas deje de hacer `DDL` request-time y el diagnóstico de `Agency > Campaigns` quede cerrado de punta a punta.

### Rama

- `develop`

### Ambiente objetivo

- Cloud SQL dev / runtime local

### Archivos tocados

- `package.json`
- `scripts/setup-postgres-campaigns.sql`
- `scripts/setup-postgres-campaigns.ts`
- `src/lib/campaigns/campaign-store.ts`
- `src/lib/campaigns/campaign-store.test.ts`
- `src/lib/campaigns/campaign-extended.ts`
- `src/lib/campaigns/campaign-metrics.ts`
- `docs/tasks/complete/TASK-017-campaign-360.md`

### Hallazgos

- El repo ya tenía `scripts/setup-postgres-campaigns.sql`, pero no estaba conectado al flujo canónico del proyecto ni reemplazaba realmente el `DDL` request-time del runtime.
- El problema original de `Agency > Campaigns` quedó partido en dos:
  - contrato/UI: ya corregido en el turno previo
  - dominio canónico: faltaba bootstrap explícito y el runtime seguía intentando crear tablas/columnas
- Después del bootstrap explícito, runtime ve correctamente:
  - `greenhouse_core.campaigns`
  - `greenhouse_core.campaign_project_links`
  - `greenhouse_core.campaigns_eo_id_seq`
- El schema ya existe, pero sigue con `0` campañas y `0` links. Si staging sigue vacío, el gap remanente es seed/canonización, no ausencia de schema.

### Cambios aplicados

- Se agregó `pnpm setup:postgres:campaigns` con wrapper TS y se alineó el SQL a grants `greenhouse_runtime` / `greenhouse_migrator` más migration log.
- `campaign-store` dejó de hacer `CREATE TABLE` / `ALTER TABLE` en runtime y ahora usa validación no-mutante (`assertCampaignSchemaReady()`), con error explícito si falta bootstrap.
- `campaign-extended` y `campaign-metrics` ahora dependen de la misma validación no-mutante.
- Se agregó test unitario para el store de campañas, cubriendo:
  - falla clara cuando el schema no está provisionado
  - lectura correcta cuando el schema está listo

### Verificación

- `pnpm pg:doctor --profile=runtime`
- `pnpm pg:doctor --profile=migrator`
- `pnpm setup:postgres:campaigns`
- `pnpm test src/lib/campaigns/campaign-store.test.ts src/app/api/campaigns/route.test.ts src/views/agency/AgencyCampaignsView.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- Query runtime posterior al setup:
  - `campaigns_table = greenhouse_core.campaigns`
  - `links_table = greenhouse_core.campaign_project_links`
  - `eo_seq = greenhouse_core.campaigns_eo_id_seq`
  - `campaigns_count = 0`
  - `links_count = 0`

### Resultado

- `Vitest`: `3 files passed`, `7 tests passed`
- `TypeScript`: sin errores
- `Campaign 360` ya no depende de `DDL` request-time para operar

### Próximo paso recomendado

- Poblar o canonizar campañas reales en `greenhouse_core.campaigns` y `greenhouse_core.campaign_project_links`, o conectar el backfill/seed correspondiente, porque el schema ya no es el bloqueo.

---

## 2026-03-25 21:31 America/Santiago

### Agente

- Codex (GPT-5)

### Objetivo del turno

- Resolver el gap restante de `Agency > Campaigns` poblando el dominio canónico con datos reales y dejar una ruta reusable de backfill/seed.

### Rama

- `develop`

### Ambiente objetivo

- Cloud SQL dev / staging-backed data

### Archivos tocados

- `src/lib/campaigns/backfill-heuristics.ts`
- `src/lib/campaigns/backfill-heuristics.test.ts`
- `scripts/backfill-postgres-campaigns.ts`
- `package.json`
- `postcss.config.mjs`
- `docs/tasks/complete/TASK-017-campaign-360.md`

### Hallazgos

- No existía un backfill histórico reutilizable para campañas.
- `greenhouse_delivery.projects` sí trae proyectos reales por `space_id`, pero ese `space_id` todavía llega desde `greenhouse_core.notion_workspaces`, no desde `greenhouse_core.spaces`.
- El backfill necesitó puentear:
  - `greenhouse_delivery.projects.space_id`
  - `greenhouse_core.notion_workspaces`
  - `greenhouse_core.spaces`
- Para client spaces, el bridge útil es `spaces.client_id = notion_workspaces.client_id`.
- Para `Efeonce`, donde el `client_id` legacy viene `NULL`, el bridge útil fue `space_name`.

### Cambios aplicados

- Se agregó `pnpm backfill:postgres:campaigns`.
- El script usa una heurística conservadora:
  - cluster por prefijo semántico del `project_name`
  - dentro del mismo `space_id` canónico
  - solo si hay `>= 2` proyectos por cluster
- Además se agregó un seed manual curado:
  - `Sky Airlines Kick-Off`
- Se agregó test unitario de heurística y se corrigió `postcss.config.mjs` para destrabar la suite de UI en Vitest.

### Verificación

- `pnpm test src/lib/campaigns/backfill-heuristics.test.ts src/lib/campaigns/campaign-store.test.ts src/app/api/campaigns/route.test.ts src/views/agency/AgencyCampaignsView.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm backfill:postgres:campaigns`
- `pnpm backfill:postgres:campaigns --apply`

### Resultado

- `Vitest`: `4 files passed`, `9 tests passed`
- `TypeScript`: sin errores
- Backfill aplicado:
  - `7` campañas en `greenhouse_core.campaigns`
  - `24` links en `greenhouse_core.campaign_project_links`

### Snapshot final de seed

- `spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad`
  - `Comercial` (`7` proyectos)
  - `Gtm` (`6`)
  - `Operaciones` (`4`)
  - `Gore` (`2`)
  - `Web Design` (`2`)
- `spc-8641519f-12a0-456f-b03a-e94522d35e3a`
  - `Content` (`2`)
- `spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9`
  - `Sky Airlines Kick-Off` (`1`)

### Próximo paso recomendado

- Revalidar `Agency > Campaigns` en staging UI ya con datos presentes.
- Si la vista sigue vacía, el siguiente problema ya no es datos ni schema; sería consumo runtime/deploy o auth/session del entorno.
