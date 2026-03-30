# TASK-069 — Operational P&L Projection

## Delta 2026-03-30 — Auditoría Finance + dependencias clarificadas

- **Bloqueada por TASK-067** (schema + domain + events).
- Puede ejecutarse **en paralelo con TASK-068** (ambas dependen solo de 067).
- TASK-070 (UI) y TASK-071 (cross-module) necesitan ESTA task completada.
- `computeClientEconomicsSnapshots()` ya existe en `postgres-store-intelligence.ts` — esta task la evoluciona a un P&L materializado con scopes (client → space → organization).
- `client_labor_cost_allocation` ya existe como serving view — esta task lo consume para labor costs.
- `member_capacity_economics` ya existe — esta task lo consume para overhead distribution.
- El P&L actual se computa on-demand; esta task lo materializa como projection reactiva.
- TASK-071 reemplazará el on-demand compute de `organization-economics.ts` con reads del P&L materializado.
- TASK-138 Slice 4 (Agency synergy) también depende del P&L materializado de esta task.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Muy alto` |
| Effort | `Alto` |
| Status real | `Diseño` |
| Rank | — |
| Domain | Cost Intelligence |

## Summary

Implementar la projection `operational_pl` que consolida revenue (Finance income), costo laboral (Payroll × FTE allocation), gastos directos (Finance expenses + cost allocations) y overhead en un P&L operativo por scope (client, space, organization) y período, con closure awareness y alertas de margen.

## Why This Task Exists

`client_economics` ya computa snapshots de economics por cliente, pero:
- No tiene closure awareness (no sabe si el período está cerrado)
- No agrega a nivel space ni organization
- No emite alertas de margen
- No produce un "financial statement" legible como P&L

Este task formaliza el P&L operativo como serving view materializada, consumible por Finance, Agency, Organization 360 y Home.

## Goal

Materializar `greenhouse_serving.operational_pl_snapshots` con P&L por scope/período, emitir `accounting.pl_snapshot.materialized` y `accounting.margin_alert.triggered` cuando corresponda.

## Architecture Alignment

- Fuente canónica: `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md` § 4.2, § 6.2
- Relación con `client_economics`: este projection es un **consumer enriquecido** de `client_economics`, no un reemplazo. Lee los snapshots existentes y los consolida/agrega.
- Si `client_economics` (TASK-055) completa su pipeline, `operational_pl` lo consume directamente. Si no, computa desde las mismas fuentes.

## Dependencies & Impact

- **Depende de:**
  - TASK-067 (schema + domain) — **blocker**
  - TASK-068 (period closure status) — para `period_closed` flag
  - `greenhouse_serving.client_economics_snapshots` o fuentes directas si no disponible
  - `greenhouse_payroll.payroll_entries` + `greenhouse_core.client_team_assignments`
  - `greenhouse_finance.income`, `greenhouse_finance.expenses`
  - `greenhouse_finance.exchange_rates`
  - `greenhouse_serving.member_capacity_economics` (overhead data)
- **Impacta a:**
  - TASK-070 (Finance UI) — muestra P&L inline
  - TASK-071 (consumers) — Agency, Org 360, Home leen P&L
  - `organization_executive` projection existente — puede consumir P&L materializado en vez de computar on-demand
  - `notification_dispatch` — recibe `margin_alert.triggered`
- **Archivos owned:**
  - `src/lib/sync/projections/operational-pl.ts`
  - `src/lib/cost-intelligence/compute-operational-pl.ts`
  - `src/lib/cost-intelligence/pl-types.ts`
  - `src/app/api/cost-intelligence/pl/route.ts`
  - `src/app/api/cost-intelligence/pl/[scopeType]/[scopeId]/route.ts`

## Current Repo State

- `client_economics` projection existe (TASK-055) con 20 trigger events
- `computeClientEconomicsSnapshots()` en `src/lib/finance/postgres-store-intelligence.ts`
- `client_labor_cost_allocation` serving view existe
- `member_capacity_economics` materializa overhead + loaded cost
- `organization-economics.ts` computa on-demand (no materializado)
- No existe P&L como serving view materializada

## Scope

### Slice 1 — P&L computation engine
1. `src/lib/cost-intelligence/compute-operational-pl.ts`:
   - Input: `(year, month, reason)`
   - Para cada client con actividad en el período:
     - Revenue: `SUM(income.amount_clp)` filtrado por período
     - Labor cost: leer `client_labor_cost_allocation` o computar desde payroll entries × FTE weight
     - Direct expenses: `SUM(expenses.amount_clp)` + cost allocations
     - Overhead: leer member_capacity_economics overhead pool, distribuir por FTE weight
   - Computar: `gross_margin = revenue - total_cost`, `margin_pct`
   - Agregar a nivel space: SUM clients del space
   - Agregar a nivel organization: SUM clients de la org
   - Retornar array de snapshots

2. `src/lib/cost-intelligence/pl-types.ts`:
   - `OperationalPlSnapshot` type
   - `PlComputationResult` type

### Slice 2 — Projection
1. `src/lib/sync/projections/operational-pl.ts`:
   - Domain: `cost_intelligence`
   - Triggers: ~16 eventos (income, expenses, payroll, assignments, overhead, period_closed)
   - Entity scope: `finance_period`
   - Refresh: llama `computeOperationalPl(year, month, reason)`
   - Upsert en `operational_pl_snapshots`
   - Si margin < threshold de `period_closure_config`: emite `accounting.margin_alert.triggered`
   - Emite `accounting.pl_snapshot.materialized`
2. Registrar en projection index

### Slice 3 — APIs
1. `GET /api/cost-intelligence/pl?year=2026&month=3&scopeType=client`
   - Filtros: `scopeType`, `scopeId`, `year`, `month`, `periodClosed`
   - Retorna array de snapshots con totals
2. `GET /api/cost-intelligence/pl/[scopeType]/[scopeId]`
   - Últimos N períodos para un scope específico (trend)
   - Retorna: `snapshots[]`, `trend { periods, avgMarginPct }`

### Slice 4 — Margin alert integration
1. Cuando `operational_pl` detecta margin < threshold:
   - Emite `accounting.margin_alert.triggered`
   - `notification_dispatch` projection ya lo puede consumir (agregar al trigger list)
   - Notifica a `finance_manager` y `efeonce_admin`

### Slice 5 — Tests
1. Unit tests para `computeOperationalPl()`:
   - Client con income + payroll → margin correcto
   - Client sin income → margin negativo
   - Multi-currency (USD payroll + CLP income) → FX conversion
   - Aggregation: client → space → organization
2. Unit tests para margin alert trigger

## Out of Scope

- UI (TASK-069)
- Budget vs actual (fase 3)
- Cost centers por department/BU (fase 3)
- Provisiones laborales (fase 3)

## Acceptance Criteria

- [ ] `computeOperationalPl()` retorna P&L correcto para clients con income y payroll
- [ ] Snapshots materializados en `operational_pl_snapshots` con `period_closed` flag
- [ ] Aggregation funciona: client → space → organization
- [ ] Multi-currency: payroll USD se convierte a CLP usando FX del período
- [ ] Margin alert se emite cuando margin < threshold
- [ ] `GET /api/cost-intelligence/pl` retorna snapshots filtrados
- [ ] `GET /api/cost-intelligence/pl/client/[id]` retorna trend
- [ ] Tests unitarios cubren: happy path, sin income, multi-currency, aggregation, alerts
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Verification

- `pnpm test src/lib/cost-intelligence/`
- `pnpm build`
- `pnpm lint`
- Smoke local: trigger events → verificar snapshot materializado con valores correctos
