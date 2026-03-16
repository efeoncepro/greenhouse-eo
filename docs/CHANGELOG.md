# Changelog — Financial Intelligence Layer

Registro de cambios implementados como parte del CODEX_TASK_Financial_Intelligence_Layer.

---

## Phase 5 — Visualización de tendencias, Person 360 Finance Tab, CSV export, fix P&L (2026-03-16)

### Nuevas funcionalidades

- **Trend chart en Inteligencia Financiera** — gráfico de área (ApexCharts) que muestra evolución de margen bruto y neto promedio ponderado por revenue de los últimos 6 meses. Se renderiza solo cuando hay >= 2 períodos con datos. Fetch automático tras cargar snapshots.
- **CSV export funcional** — el botón "Exportar CSV" en la tabla de economía por Space ahora genera y descarga un archivo `economia_spaces_{Mes}_{Año}.csv` con todas las columnas visibles.
- **PersonFinanceTab** — nuevo tab "Finanzas" en Person 360 que muestra:
  - 4 KPIs: Spaces asignados, costo laboral total, nóminas procesadas, gastos asociados
  - Tabla de distribución de costo laboral por Space con barra de dedicación (LinearProgress)
  - Historial de nómina reciente (últimos 6 períodos)
  - Lazy-load desde `/api/people/{memberId}/finance`

### Fixes

- **P&L: costos laborales no fluían al Estado de Resultados** — el endpoint `/api/finance/dashboard/pnl` consultaba payroll por separado pero nunca lo sumaba a `directLabor` ni a los márgenes. Ahora calcula `unlinkedPayrollCost = payrollGross - linkedPayrollExpenses` y lo agrega a `directLabor` y `totalExpenses`, evitando doble conteo con expenses ya vinculados via `payroll_entry_id`.
- **Performance P&L** — las 4 queries del endpoint (income, expenses, payroll, linked payroll) ahora corren en paralelo con `Promise.all`.

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/views/greenhouse/finance/ClientEconomicsView.tsx` | +trend chart, +CSV export handler, +trend state/fetch |
| `src/app/api/finance/dashboard/pnl/route.ts` | Fix: payroll → directLabor integration, parallel queries |
| `src/views/greenhouse/people/helpers.ts` | +finance tab en TAB_CONFIG |
| `src/views/greenhouse/people/PersonTabs.tsx` | +import y TabPanel para PersonFinanceTab |

### Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `src/views/greenhouse/people/tabs/PersonFinanceTab.tsx` | Tab de finanzas en Person 360 |

---

## Phase 4 — FTE allocation engine + trend API + person cost attribution (2026-03-15)

- Vista SQL `greenhouse_serving.client_labor_cost_allocation` (FTE-weighted payroll distribution)
- `computeClientLaborCosts(year, month)` en `src/lib/finance/payroll-cost-allocation.ts`
- Endpoint `GET /api/finance/intelligence/client-economics/trend`
- `listClientEconomicsTrend()` en postgres-store-intelligence
- Person 360: `costAttribution` query + tipo extendido en `PersonFinanceOverview`
- Client economics compute endpoint enriquecido con FTE, revenue/FTE, cost/FTE

## Phase 3 — Client economics view + nav + enriched service lines (2026-03-15)

- `ClientEconomicsView.tsx` — KPIs, bar chart, donut chart, tabla sortable
- Página `/finance/intelligence` + nav integration
- Endpoint by-service-line enriquecido con labor costs desde payroll

## Phase 2 — P&L, allocations, client economics CRUD (2026-03-15)

- `postgres-store-intelligence.ts` — CRUD para cost_allocations y client_economics
- Endpoints GET/POST `/api/finance/intelligence/client-economics`

## Phase 1 — Cost classification + client economics schema (2026-03-15)

- DDL: ALTER income/expenses + CREATE cost_allocations/client_economics
- Tipos: CostCategory, AllocationMethod, CostAllocation, ClientEconomicsSnapshot
- Mappers extendidos en postgres-store-slice2
- Backfill script para cost_category
