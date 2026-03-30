# TASK-068 — Period Closure Status Projection

## Delta 2026-03-30 — Auditoría Finance + dependencias clarificadas

- **Bloqueada por TASK-067** (schema + domain + events).
- Puede ejecutarse **en paralelo con TASK-069** (ambas dependen solo de 067).
- TASK-070 (UI) necesita ESTA task + TASK-069 completadas antes de empezar.
- El concepto de "período cerrado" no existe en el codebase actual — esta task lo introduce.
- `greenhouse_payroll.payroll_periods` tiene `status` (draft → calculated → approved → exported) que esta task consume para readiness check.
- `greenhouse_finance.income`, `expenses`, `exchange_rates` ya existen — esta task los consulta para readiness.
- TASK-138 Slice 1 (finance notifications) depende de los eventos `accounting.period_closed/reopened` que esta task emite.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Muy alto` |
| Effort | `Medio` |
| Status real | `Diseño` |
| Rank | — |
| Domain | Cost Intelligence |

## Summary

Implementar la projection `period_closure_status` que auto-detecta readiness de cierre por período, materializa el estado en `greenhouse_serving.period_closure_status` y `greenhouse_cost_intelligence.period_closures`, y expone APIs para cierre manual y reapertura.

## Why This Task Exists

Hoy no existe una ceremonia unificada de cierre de período. Payroll tiene su propio lifecycle (`draft → calculated → approved → exported`), Finance tiene reconciliación, pero nadie responde "¿Marzo está cerrado?" de forma consolidada. Esto genera incertidumbre en los snapshots financieros y márgenes reportados.

## Goal

Que el portal pueda responder en tiempo real: "¿Qué tan listo está este mes para cerrarse?" y permitir cierre/reapertura controlada con audit trail.

## Architecture Alignment

- Fuente canónica: `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md` § 6.1, § 10
- Patrón: reactive projection sobre outbox (igual que las 11 existentes)
- Playbook: `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

## Dependencies & Impact

- **Depende de:**
  - TASK-067 (schema + domain + event catalog) — **blocker**
  - `greenhouse_payroll.payroll_periods` (status del período)
  - `greenhouse_finance.income` (existencia de ingresos)
  - `greenhouse_finance.expenses` (existencia de gastos)
  - `greenhouse_finance.exchange_rates` (FX del período)
- **Impacta a:**
  - TASK-069 (operational P&L) — consume `period_closed` flag
  - TASK-070 (Finance UI) — muestra semáforos de readiness
  - TASK-071 (consumers) — Home/Nexa lee status
  - `client_economics` projection existente — puede usar closure awareness
- **Archivos owned:**
  - `src/lib/sync/projections/period-closure-status.ts`
  - `src/lib/cost-intelligence/check-period-readiness.ts`
  - `src/lib/cost-intelligence/close-period.ts`
  - `src/app/api/cost-intelligence/periods/route.ts`
  - `src/app/api/cost-intelligence/periods/[year]/[month]/route.ts`
  - `src/app/api/cost-intelligence/periods/[year]/[month]/close/route.ts`
  - `src/app/api/cost-intelligence/periods/[year]/[month]/reopen/route.ts`

## Current Repo State

- 11 projections existentes con patrón probado
- `payroll_periods.status` ya tiene `draft`, `calculated`, `approved`, `exported`
- `greenhouse_finance.income` y `expenses` tienen `created_at` con fecha
- `greenhouse_finance.exchange_rates` tiene `rate_date`
- No existe concepto de "período cerrado" unificado

## Scope

### Slice 1 — Readiness checker
1. `src/lib/cost-intelligence/check-period-readiness.ts`:
   - Leer `period_closure_config` (default o override del período)
   - Chequear payroll: `SELECT status FROM greenhouse_payroll.payroll_periods WHERE year = $1 AND month = $2`
   - Chequear income: `SELECT COUNT(*) FROM greenhouse_finance.income WHERE ...período...`
   - Chequear expenses: `SELECT COUNT(*) FROM greenhouse_finance.expenses WHERE ...período...`
   - Chequear FX: `SELECT COUNT(*) FROM greenhouse_finance.exchange_rates WHERE rate_date BETWEEN ... AND ...`
   - Retornar `{ payrollStatus, incomeStatus, expenseStatus, fxStatus, readinessPct, isReady }`

### Slice 2 — Projection
1. `src/lib/sync/projections/period-closure-status.ts`:
   - Domain: `cost_intelligence`
   - Triggers: ~10 eventos (payroll period changes, finance income/expense/fx)
   - Entity scope: `finance_period`
   - Refresh: llama `checkPeriodReadiness()`, upserta en `period_closures` y `period_closure_status`
   - Si status cambia a `ready` y antes no lo era: log operativo
2. Registrar en `src/lib/sync/projections/index.ts`

### Slice 3 — Close/reopen mutations
1. `src/lib/cost-intelligence/close-period.ts`:
   - Valida readiness = 100%
   - Actualiza `period_closures.closure_status = 'closed'`
   - Emite `accounting.period_closed` via outbox
2. `src/lib/cost-intelligence/reopen-period.ts`:
   - Solo `efeonce_admin`
   - Requiere `reason`
   - Incrementa `snapshot_revision`
   - Emite `accounting.period_reopened`

### Slice 4 — APIs
1. `GET /api/cost-intelligence/periods` — lista meses con closure status
2. `GET /api/cost-intelligence/periods/[year]/[month]` — detalle de readiness
3. `POST .../close` — cierre manual
4. `POST .../reopen` — reapertura

### Slice 5 — Tests
1. Unit tests para `checkPeriodReadiness()` con escenarios:
   - Todo verde → ready
   - Payroll no exported → not ready
   - Sin income → not ready (o ready si flag "sin ingresos")
   - FX missing → not ready
2. Unit tests para `closePeriod()` y `reopenPeriod()`

## Out of Scope

- UI (TASK-069)
- P&L computation (TASK-068)
- Bank reconciliation como condición (fase 3)

## Acceptance Criteria

- [ ] Projection `period_closure_status` registrada y ejecuta en `/api/cron/outbox-react-cost-intelligence`
- [ ] `checkPeriodReadiness()` retorna status correcto para períodos con y sin payroll exported
- [ ] `POST .../close` congela período y emite `accounting.period_closed`
- [ ] `POST .../reopen` solo funciona con `efeonce_admin`, requiere reason, incrementa revision
- [ ] `GET /api/cost-intelligence/periods` retorna lista de meses con status
- [ ] Tests unitarios cubren: all-green, payroll-missing, income-missing, fx-missing, close, reopen
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Verification

- `pnpm test src/lib/cost-intelligence/`
- `pnpm build`
- `pnpm lint`
- Smoke local: crear período payroll → verificar que projection materializa status
