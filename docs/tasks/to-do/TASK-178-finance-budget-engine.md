# TASK-178 — Finance Budget Engine: Budget vs. Actual & Variance Analysis

## Delta 2026-04-28 — Subordinada al programa Member Loaded Cost Model

Esta task se solapa parcialmente con TASK-395 (planning engine). Ambas implementan **budget overlay sobre el modelo dimensional Member-Loaded** (`docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`). El budget engine produce `member_loaded_cost_per_period_budget` y `client_full_cost_per_period_budget` con la misma cardinalidad/shape que los facts actual. Variance se computa como diff entre snapshots actual y budget. Coordinación TASK-178 ↔ TASK-395 pendiente: probable consolidación.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P2` |
| Impact | `Alto` |
| Effort | `Alto` |
| Status real | `Diseno` |
| Domain | Cost Intelligence / Finance |
| Sequence | Despues de TASK-176 (provisiones) y TASK-177 (BU P&L) — necesita costo real completo |

## Summary

El modulo de Cost Intelligence tiene P&L real (operational_pl_snapshots) pero no tiene presupuesto. Sin budget, no hay variance analysis, no hay forecast accuracy, y las decisiones de pricing se toman sin benchmark. Esta task introduce el engine de presupuesto: tabla canonica, CRUD API, calculo de varianza contra actual, y visualizacion en el dashboard de Finance Intelligence.

## Why This Task Exists

### Management accounting sin budget = incompleto

```
Modelo enterprise de management accounting:

  Budget (Plan)     ─┐
                     ├── Variance Analysis → decisiones informadas
  Actual (Real)    ──┘

Hoy Greenhouse tiene:
  ✓ Actual — operational_pl_snapshots (revenue, costs, margin por scope)
  ✗ Budget — no existe
  ✗ Variance — no existe
  ✗ Forecast — no existe
```

### Preguntas que no se pueden responder hoy

- "Estamos gastando mas o menos de lo presupuestado en labor para Globe?"
- "El revenue de marzo fue mejor o peor que lo planificado?"
- "Cual es la varianza acumulada YTD por linea de negocio?"
- "A este ritmo, vamos a cerrar el ano dentro del presupuesto?"

## Dependencies & Impact

- **Depende de:**
  - `greenhouse_serving.operational_pl_snapshots` — fuente de datos actual
  - TASK-176 (provisiones) — para que el actual sea preciso antes de comparar
  - TASK-177 (BU P&L) — para budget por business unit
  - Schema `greenhouse_cost_intelligence`
- **Impacta a:**
  - Finance Intelligence dashboard — agrega columna Budget y Variance
  - Agency economics — puede mostrar budget vs actual por space
  - Cost Intelligence period closure — budget adherence como metrica
  - Nexa — puede responder "Estamos dentro del presupuesto?"
- **Archivos owned:**
  - `src/lib/cost-intelligence/budget-engine.ts` (nuevo)
  - `src/lib/cost-intelligence/__tests__/budget-engine.test.ts` (nuevo)
  - `src/app/api/finance/intelligence/budget/route.ts` (nuevo)
  - `scripts/setup-postgres-cost-intelligence.sql` (agregar tablas)

## Scope

### Slice 1 — Schema y modelo de datos (~2h)

1. **Tabla** `greenhouse_cost_intelligence.budgets`:
   ```sql
   CREATE TABLE IF NOT EXISTS greenhouse_cost_intelligence.budgets (
     budget_id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
     scope_type         TEXT NOT NULL,  -- 'organization' | 'business_unit' | 'client'
     scope_id           TEXT NOT NULL,
     period_year        INT NOT NULL,
     period_month       INT NOT NULL,
     
     -- Budget line items (misma estructura que operational_pl_snapshots)
     revenue_clp        NUMERIC NOT NULL DEFAULT 0,
     labor_cost_clp     NUMERIC NOT NULL DEFAULT 0,
     direct_expense_clp NUMERIC NOT NULL DEFAULT 0,
     overhead_clp       NUMERIC NOT NULL DEFAULT 0,
     total_cost_clp     NUMERIC NOT NULL DEFAULT 0,
     gross_margin_clp   NUMERIC NOT NULL DEFAULT 0,
     headcount_fte      NUMERIC(6,2) NOT NULL DEFAULT 0,
     
     -- Metadata
     budget_version     INT NOT NULL DEFAULT 1,
     status             TEXT NOT NULL DEFAULT 'draft',  -- draft | approved | locked
     notes              TEXT,
     created_by         TEXT,
     approved_by        TEXT,
     approved_at        TIMESTAMPTZ,
     created_at         TIMESTAMPTZ DEFAULT NOW(),
     updated_at         TIMESTAMPTZ DEFAULT NOW(),
     
     UNIQUE (scope_type, scope_id, period_year, period_month, budget_version)
   );
   ```

2. **Version model:** Multiples versiones por periodo. Solo 1 puede estar `approved`. `locked` = no editable (post-cierre).

### Slice 2 — CRUD API (~3h)

1. **Endpoints:**
   ```
   GET    /api/finance/intelligence/budget?scope=organization&year=2026&month=3
   POST   /api/finance/intelligence/budget
   PUT    /api/finance/intelligence/budget/[id]
   POST   /api/finance/intelligence/budget/[id]/approve
   POST   /api/finance/intelligence/budget/[id]/lock
   ```

2. **Bulk creation:** `POST /api/finance/intelligence/budget/bulk`
   - Para crear presupuesto anual: 12 meses de un scope en un request
   - Input: `{ scopeType, scopeId, year, monthlyBudgets: [...] }`

3. **Template from actual:** `POST /api/finance/intelligence/budget/from-actual`
   - Copia el actual de un periodo previo como base del budget
   - Input: `{ sourceYear, sourceMonth, targetYear, adjustmentPercent }`
   - Ejemplo: "Tomar el actual de Q4 2025, ajustar +10% para Q1 2026"

### Slice 3 — Variance engine (~4h)

1. **Crear** `src/lib/cost-intelligence/budget-engine.ts`:

   ```typescript
   export interface BudgetVariance {
     scopeType: string
     scopeId: string
     scopeName: string
     period: { year: number; month: number }
     
     // Per line item
     revenue: { budget: number; actual: number; variance: number; variancePct: number }
     laborCost: { budget: number; actual: number; variance: number; variancePct: number }
     directExpense: { budget: number; actual: number; variance: number; variancePct: number }
     overhead: { budget: number; actual: number; variance: number; variancePct: number }
     totalCost: { budget: number; actual: number; variance: number; variancePct: number }
     grossMargin: { budget: number; actual: number; variance: number; variancePct: number }
     
     // Flags
     overBudget: boolean        // totalCost.actual > totalCost.budget
     underRevenue: boolean      // revenue.actual < revenue.budget
     favorableVariance: boolean // grossMargin.actual > grossMargin.budget
   }

   export async function computeBudgetVariance(
     scopeType: string,
     scopeId: string,
     year: number,
     month: number
   ): Promise<BudgetVariance | null>
   ```

2. **YTD variance:** `computeBudgetVarianceYTD(scopeType, scopeId, year)` — acumula enero a mes actual

3. **Forecast completion:** `forecastYearEnd(scopeType, scopeId, year)`:
   - Proyeccion simple: (actual_ytd / meses_transcurridos) * 12
   - Compara con budget anual total
   - Retorna: `{ projectedRevenue, projectedCost, projectedMargin, onTrack: boolean }`

### Slice 4 — Visualizacion (~3h)

1. **Finance Intelligence view:**
   - Agregar columnas Budget y Variance al lado de cada metrica actual
   - Color coding: verde (favorable), rojo (desfavorable), gris (sin budget)
   - Variance % con indicador de direccion

2. **Dashboard summary widget:**
   ```
   ┌─────────────────────────────────┐
   │ Budget vs Actual — Marzo 2026   │
   │                                 │
   │ Revenue:  $120M / $100M  ▲ +20% │
   │ Costs:    $85M / $80M   ▲ +6%  │
   │ Margin:   $35M / $20M   ▲ +75% │
   │                                 │
   │ Status: On Track ✓              │
   └─────────────────────────────────┘
   ```

3. **Period closure integration:** Agregar `budget_adherence_pct` como metrica informativa (no como gate de cierre).

## Acceptance Criteria

- [ ] Tabla `budgets` creada con schema versionado
- [ ] CRUD API funcional (crear, editar, aprobar, bloquear budget)
- [ ] Bulk creation para presupuesto anual (12 meses)
- [ ] Template from actual con adjustment %
- [ ] `computeBudgetVariance()` calcula varianza por line item
- [ ] `computeBudgetVarianceYTD()` acumula varianza year-to-date
- [ ] `forecastYearEnd()` proyecta cierre de ano
- [ ] Finance Intelligence view muestra Budget y Variance
- [ ] Color coding correcto (favorable=verde, desfavorable=rojo)
- [ ] Tests unitarios para variance engine (min 6 tests)
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Decision: Granularidad de budget

Budget se define a nivel:
- **Organization** (obligatorio para empresa)
- **Business Unit** (recomendado para P&L por BU)
- **Client** (opcional, para clientes grandes)

NO a nivel `space` ni `member` — demasiada granularidad para un primer budget engine.

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/cost-intelligence/budget-engine.ts` | **Nuevo** — variance computation |
| `src/lib/cost-intelligence/__tests__/budget-engine.test.ts` | **Nuevo** — tests |
| `src/app/api/finance/intelligence/budget/route.ts` | **Nuevo** — CRUD API |
| `src/app/api/finance/intelligence/budget/[id]/route.ts` | **Nuevo** — detail/update |
| `src/app/api/finance/intelligence/budget/bulk/route.ts` | **Nuevo** — annual bulk |
| `src/app/api/finance/intelligence/budget/from-actual/route.ts` | **Nuevo** — template |
| `scripts/setup-postgres-cost-intelligence.sql` | Agregar tabla budgets |
| `src/views/greenhouse/finance/intelligence/FinanceIntelligenceView.tsx` | Budget columns |
