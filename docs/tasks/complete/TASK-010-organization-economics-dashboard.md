## Delta 2026-03-26
- `organization-economics.ts` y `organization-store.ts` quedaron corregidos por trabajo en `TASK-055`: Organization ya no pondera márgenes incompletos como `0` y dejó de doble-contar costo laboral encima de `client_economics.direct_costs_clp`.

## Delta 2026-03-24
- DTE coverage metrics per organization now available via `getDteCoverage()` / `getDteCoverageSummary()` in `src/lib/finance/dte-coverage.ts` and API `GET /api/organizations/[id]/dte-coverage` — closed by TASK-013. Can be integrated as a "tax health" card in the economics dashboard.

# CODEX_TASK_Organization_Economics_Dashboard_v1

## Summary

Crear un dashboard ejecutivo unificado por organización que cierre el loop entre revenue (Finance), costo laboral (Payroll vía FTE allocation), y eficiencia operativa (ICO Engine). Hoy estos datos viven en tabs separados sin correlación; esta task los fusiona en una vista única de rentabilidad operativa real.

Esta es la sinergia de mayor impacto del proyecto: transforma datos que ya existen en silos en inteligencia accionable.

## Why This Task Exists

Greenhouse ya tiene todas las piezas:
- `getOrganizationFinanceSummary()` retorna revenue, costos directos/indirectos, margen y FTE por cliente
- `client_labor_cost_allocation` distribuye costos de nómina a clientes por FTE proporcional
- ICO Engine materializa RPA, OTD, FTR, cycle time por proyecto y miembro en BigQuery
- La UI de organización ya tiene tabs de Finance e ICO pero son independientes

Lo que falta es la correlación: "esta organización genera X de revenue, nos cuesta Y en labor real, y entrega con eficiencia Z". Sin esto, decisiones de pricing, staffing y priorización operativa se toman a ciegas.

## Goal

Entregar una vista serving + API + UI que correlacione:
1. **Revenue por organización** (desde `client_economics`)
2. **Costo laboral real** (desde `client_labor_cost_allocation`, ponderado por FTE)
3. **Health operativo** (desde ICO Engine: RPA promedio, OTD%, assets stuck)
4. **Margen operativo ajustado** = revenue - costo laboral real - overhead
5. **Trend mensual** de los 4 ejes (sparkline 6 meses)

## Dependencies & Impact

### Depends on
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — modelo Organization → Space → Membership
- `docs/architecture/GREENHOUSE_ICO_ENGINE_V1.md` — métricas ICO materializadas
- `scripts/setup-postgres-finance-intelligence-p2.sql` — vista `client_labor_cost_allocation`
- `src/lib/account-360/organization-store.ts` — `getOrganizationFinanceSummary()`
- `src/app/api/organizations/[id]/ico/route.ts` — datos ICO por org
- Task completada: `CODEX_TASK_Financial_Intelligence_Layer.md` — client_economics + trends

### Impacts to
- `CODEX_TASK_Financial_Intelligence_Layer_v2.md` — esta task materializa uno de los deliverables clave de FI: vista de rentabilidad consolidada
- `CODEX_TASK_Business_Units_Canonical_v2.md` — economics por org habilita analytics por BU una vez que BU exista
- `CODEX_TASK_Campaign_360_v2.md` — Campaign necesitará economics roll-up; este task establece el patrón
- `CODEX_TASK_Greenhouse_Home_Nexa_v2.md` — Home puede consumir top-level org economics como KPI card

### Files owned
- `scripts/setup-postgres-organization-economics.sql`
- `src/lib/account-360/organization-economics.ts`
- `src/app/api/organizations/[id]/economics/route.ts`
- `src/views/greenhouse/organizations/tabs/OrganizationEconomicsTab.tsx`
- `src/views/greenhouse/organizations/components/EconomicsOverviewCard.tsx`
- `src/views/greenhouse/organizations/components/EconomicsTrendChart.tsx`
- `src/views/greenhouse/organizations/components/ProfitabilityMatrix.tsx`

## Current Repo State

### Ya existe
- **Finance por org:** `getOrganizationFinanceSummary()` en `src/lib/account-360/organization-store.ts` (líneas 474-541). Retorna `totalRevenueClp, totalDirectCostsClp, totalIndirectCostsClp, avgGrossMarginPercent, totalFte` con breakdown por cliente.
- **Cost allocation:** Vista `greenhouse_serving.client_labor_cost_allocation` (en `scripts/setup-postgres-finance-intelligence-p2.sql`). JOIN payroll_entries × payroll_periods × members × client_team_assignments. Distribuye `gross_total` proporcional por FTE.
- **ICO por org:** Ruta `/api/organizations/[id]/ico` que carga métricas ICO por space activo.
- **UI tabs separados:** `OrganizationFinanceTab.tsx` y `OrganizationIcoTab.tsx` en `src/views/greenhouse/organizations/tabs/`.
- **Serving view:** `greenhouse_serving.organization_360` con spaces JSON y people JSON pero sin datos financieros ni ICO.

### No existe aún
- Vista serving que correlacione finance + labor cost + ICO por organización
- API endpoint que retorne economics unificado (revenue + costo real + health + margen ajustado)
- UI tab/card que muestre rentabilidad operativa real
- Trend mensual cross-domain (finance × ICO)
- Profitability matrix (revenue vs efficiency scatter por cliente/space)

## Implementation Plan

### Slice 1 — Serving View + Store (Backend)

1. **Crear vista `greenhouse_serving.organization_economics`:**
   ```sql
   -- Correlaciona client_economics + client_labor_cost_allocation + ICO snapshots
   -- Columns: organization_id, period_year, period_month,
   --   total_revenue, total_labor_cost, total_overhead, adjusted_margin,
   --   avg_rpa, avg_otd_pct, stuck_asset_count, active_fte,
   --   revenue_per_fte, cost_per_fte, margin_per_fte
   ```

2. **Crear `src/lib/account-360/organization-economics.ts`:**
   - `getOrganizationEconomics(orgId, year, month)` — lee vista serving
   - `getOrganizationEconomicsTrend(orgId, months)` — retorna array de 6-12 períodos
   - `getOrganizationProfitabilityBreakdown(orgId, year, month)` — breakdown por space/client

3. **Crear ruta API:** `GET /api/organizations/[id]/economics?year=&month=&trend=6`

### Slice 2 — ICO Bridge (BigQuery → Postgres)

1. **Materializar ICO snapshots relevantes a Postgres:**
   - Crear tabla `greenhouse_serving.organization_ico_summary` con métricas agregadas por org y período
   - Poblar desde BigQuery `ico_engine.metric_snapshots_monthly` agrupado por space → org
   - Cron o backfill script para mantener actualizado

2. **Alternativa sin materialización:** Compute on-read desde BigQuery con cache en API (menos ideal pero más rápido de implementar).

### Slice 3 — UI (Frontend)

1. **Nuevo tab o reemplazo del Finance tab** con vista unificada:
   - **KPI row:** Revenue, Labor Cost, Adjusted Margin, Avg RPA, OTD% (5 cards)
   - **Trend chart:** Line chart con 2 ejes (revenue/cost en eje Y1, RPA/OTD en Y2) × 6 meses
   - **Profitability matrix:** Scatter plot de clients (X=revenue, Y=margin%, color=ICO health)
   - **Client breakdown table:** Tabla con todas las columnas correlacionadas

2. **Registrar tab en `OrganizationTabs.tsx`**

## Acceptance Criteria

- [ ] Vista serving `organization_economics` creada con datos de finance + payroll + ICO
- [ ] API endpoint `/api/organizations/[id]/economics` retorna datos correlacionados
- [ ] Trend de 6 meses disponible con un solo request
- [ ] UI muestra KPIs unificados + trend + breakdown
- [ ] `pnpm lint` pasa sin nuevos errores
- [ ] Al menos 3 tests unitarios para el store
