# CODEX TASK — Financial Intelligence Layer v2

## Delta 2026-03-24
- DTE reconciliation proposals and coverage metrics now available (TASK-013). `dte_reconciliation_proposals` table tracks matching confidence, discrepancies, and approval status — enriches financial analytics with DTE coverage data per organization.

## Delta 2026-03-21
- Finance Postgres Runtime Migration Slice 3 completo: `updateFinanceIncomeInPostgres`, `updateFinanceExpenseInPostgres`, y reconciliación runtime ahora operacionales en Postgres-first — cerrado por trabajo en `CODEX_TASK_Finance_Postgres_Runtime_Migration_v1`
- Prerequisito de runtime Postgres para trends, P&L summary y allocations UI ahora satisfecho

## Estado

Nuevo. Derivado del cierre de `CODEX_TASK_Financial_Intelligence_Layer.md` (v1), cuya foundation de datos, client economics y P&L parcial quedaron implementados.

Esta task cubre los **gaps pendientes** de la v1:
- Trends analytics (expenses, payroll, tools)
- Partnerships (endpoint + vista)
- Cost allocations UI
- LTV/CAC en client economics
- Alineación de naming de rutas

---

## Alineación obligatoria

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/FINANCE_DUAL_STORE_CUTOVER_V1.md`

Reglas heredadas de v1 (siguen vigentes):
- Runtime `Postgres-first` — no introducir writes en BigQuery
- IDs canónicos obligatorios: `client_id`, `member_id`, `provider_id`, `module_id`
- Montos y porcentajes en `numeric`, nunca `float`
- P&L ≠ cashflow — revenue se reconoce por facturación, no por cobro

---

## Realidad técnica del repo

### Ya existe (implementado en v1)

| Recurso | Ubicación |
|---------|-----------|
| Schema: partner columns en `income`, `cost_category` en `expenses` | `scripts/setup-postgres-finance-intelligence-p1.sql` |
| Schema: `cost_allocations`, `client_economics` tablas | Mismo DDL |
| Schema: `greenhouse_serving.client_labor_cost_allocation` view | `scripts/setup-postgres-finance-intelligence-p2.sql` |
| Backfill: `cost_category` classification | `scripts/backfill-cost-category.ts` |
| Store: CRUD allocations | `src/lib/finance/postgres-store-intelligence.ts` |
| Engine: `computeClientLaborCosts()` | `src/lib/finance/payroll-cost-allocation.ts` |
| Engine: `computeClientEconomicsSnapshots()` | Dentro de store intelligence |
| API: `GET/POST /api/finance/intelligence/client-economics` | Route existente |
| API: `GET /api/finance/intelligence/client-economics/trend` | Route existente |
| API: `GET/POST/DELETE /api/finance/intelligence/allocations` | Route existente |
| API: `GET /api/finance/dashboard/pnl` | P&L mensual con payroll integrado |
| API: `GET /api/finance/dashboard/by-service-line` | Margin por línea con labor costs |
| Vista: `ClientEconomicsView` en `/finance/intelligence` | Con KPIs, charts, trend, CSV export |
| Vista: `PersonFinanceTab` en ficha de persona | Cost attribution por Space |
| Vista: `FinanceDashboardView` con P&L card + Costo Personal | Dashboard principal |

### No existe (lo que este task crea)

| Gap | Impacto | Prioridad |
|-----|---------|-----------|
| Trends: `expenses`, `payroll`, `tools` endpoints | Sin visibilidad de evolución de gasto por categoría | P1 |
| P&L summary endpoint | Sin KPIs consolidados de resultados | P1 |
| Cost allocations UI | CRUD existe pero no hay página para gestionarlo | P1 |
| Partnerships endpoint + vista | Sin visibilidad de revenue por partnerships | P2 |
| LTV/CAC en client economics | Unit economics incompleto | P2 |
| Vista `/finance/analytics` con tabs | No existe la superficie de analytics consolidada | P1 |

---

## Plan de implementación

### Fase 1 — Trends y P&L summary (P1)

1. **`GET /api/finance/analytics/trends`** — endpoint unificado con `type` param
   - `type=expenses` → evolución mensual de gasto por `cost_category` (últimos 12 meses)
   - `type=payroll` → evolución de costo de nómina + headcount
   - `type=tools` → top providers de software/tools por monto
   - Query: desde `greenhouse_finance.expenses` agrupado por `period_month` + `cost_category`

2. **`GET /api/finance/analytics/pnl-summary`** — KPIs consolidados
   - Revenue total, costo total, margen bruto, margen operativo
   - Variación vs. mes anterior
   - Puede reusar la lógica de `/api/finance/dashboard/pnl` simplificada

### Fase 2 — Vista analytics consolidada (P1)

3. **Crear `/finance/analytics` page** con tabs:
   - `Resultados` — P&L mensual (redirige o embebe lógica existente del dashboard)
   - `Tendencias` — charts de trends (expenses, payroll, tools)
   - `Clientes` — redirige a `/finance/intelligence` o embebe ClientEconomicsView
   - `Capabilities` — margin by service line (redirige o embebe lógica existente)

4. **Agregar entry en sidebar** bajo Finance → "Inteligencia" o "Analytics"

### Fase 3 — Cost allocations UI (P1)

5. **Crear `/finance/cost-allocations` page**
   - Lista de allocations activas por período
   - Formulario para crear allocation: source (expense/member/provider) → target (client/module)
   - Validación: suma de allocations por source y mes ≤ 100%
   - Consume API existente en `/api/finance/intelligence/allocations`

### Fase 4 — Partnerships (P2)

6. **`GET /api/finance/analytics/partnerships`**
   - Revenue por partnership: agrupa `income` donde `partner_id IS NOT NULL`
   - Desglose por partner, programa, período
   - Net revenue after partner share

7. **Tab Partnerships** en vista analytics
   - KPIs: total partnership revenue, commission pagada, net revenue
   - Tabla: partners con revenue, share %, net

### Fase 5 — LTV/CAC (P2)

8. **Extender `computeClientEconomicsSnapshots()`**
   - Calcular `acquisition_cost_clp` desde expenses con `cost_category = 'client_acquisition'` + `allocated_client_id`
   - Calcular `ltv_to_cac_ratio = lifetime_margin_clp / acquisition_cost_clp`
   - Solo mostrar LTV/CAC cuando existe CAC confiable (> 0)

9. **Extender ClientEconomicsView**
   - Mostrar columnas LTV, CAC, LTV/CAC ratio en tabla
   - Indicador visual cuando CAC no disponible

---

## Decisión de naming de rutas

La v1 desvió el naming de la spec:
- Spec decía `/api/finance/analytics/*`
- Se implementó `/api/finance/intelligence/*` y `/api/finance/dashboard/*`

Para esta v2, **mantener la estructura existente** y agregar solo lo nuevo:
- Trends → `/api/finance/analytics/trends` (nuevo, alineado con spec)
- P&L summary → `/api/finance/analytics/pnl-summary` (nuevo)
- Partnerships → `/api/finance/analytics/partnerships` (nuevo)
- Lo que ya existe en `/intelligence` y `/dashboard` NO se mueve — se consume desde la vista analytics

---

## Criterios de aceptación

- [ ] Trends endpoint devuelve evolución de expenses, payroll y tools por período
- [ ] P&L summary endpoint devuelve KPIs consolidados con variación mensual
- [ ] `/finance/analytics` existe con tabs funcionales
- [ ] `/finance/cost-allocations` existe con CRUD visual funcional
- [ ] Partnerships endpoint devuelve revenue por partner cuando existen datos
- [ ] LTV/CAC se calcula y muestra en client economics cuando hay CAC disponible
- [ ] `npx tsc --noEmit` limpio
- [ ] Ninguna API nueva depende de raw source o BigQuery como write model

---

## Fuera de alcance

- No rehacer ClientEconomicsView ni FinanceDashboardView
- No migrar rutas existentes de `/intelligence` a `/analytics`
- No crear taxonomía nueva de service lines fuera del catálogo canónico
- No implementar cashflow analytics (ya cubierto por dashboard financiero)

---

## Dependencies & Impact

- **Depende de:**
  - `CODEX_TASK_Finance_Postgres_Runtime_Migration_v1` — Slice 2 (income, expenses) debe estar operativo en Postgres
  - Schema de intelligence v1 ya materializado (`cost_allocations`, `client_economics`, `client_labor_cost_allocation`)
  - `src/lib/finance/postgres-store-intelligence.ts` (ya implementado)
- **Impacta a:**
  - `CODEX_TASK_Business_Units_Canonical_v2` — trends por BU comercial consumen misma foundation
  - `CODEX_TASK_Campaign_360_v2` — financial attribution por campaña en fase posterior
- **Archivos owned:**
  - `src/app/api/finance/analytics/**` (endpoints nuevos)
  - `src/app/(dashboard)/finance/analytics/page.tsx` (vista nueva)
  - `src/app/(dashboard)/finance/cost-allocations/page.tsx` (vista nueva)
  - `src/lib/finance/postgres-store-intelligence.ts` (extensiones LTV/CAC)
