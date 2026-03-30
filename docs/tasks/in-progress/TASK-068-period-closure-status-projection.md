# TASK-068 — Period Closure Status Projection

## Delta 2026-03-30 — Smoke reactivo end-to-end validado

- Ya existe un smoke script reusable para el domain:
  - `pnpm smoke:cost-intelligence:period-closure`
  - archivo: `scripts/smoke-cost-intelligence-period-closure.ts`
- El smoke:
  - inyecta un evento sintético en `greenhouse_sync.outbox_events`
  - lo publica de forma aislada para no arrastrar backlog ajeno
  - procesa solo el domain `cost_intelligence`
  - verifica serving materializado en `greenhouse_serving.period_closure_status`
  - verifica ledger reactivo en `greenhouse_sync.outbox_reactive_log`
- Evidencia real obtenida:
  - `periodId=2026-03`
  - `eventsProcessed=1`
  - `eventsFailed=0`
  - `projectionsTriggered=1`
  - action: `materialized period_closure_status for 2026-03 (ready, 100%) via finance.expense.updated`
- Con este smoke, el remanente real del task deja de ser “falta probar el circuito reactivo” y pasa a ser solo hardening semántico opcional:
  - enriquecer estados `partial` para income/expenses si Finance expone señales más finas de completitud

## Delta 2026-03-30 — Period closure alineado al calendario operativo

- `checkPeriodReadiness()` ya no asume solo mes calendario crudo.
- El checker ahora resuelve el período contra el calendario operativo compartido de Greenhouse:
  - timezone canónica `America/Santiago`
  - jurisdicción `CL`
  - `closeWindowBusinessDays` desde `src/lib/calendar/operational-calendar.ts`
  - feriados vía `Nager.Date` con fallback fail-soft a la configuración base
- El payload de readiness ahora expone `operationalCalendar` con:
  - `currentOperationalMonthKey`
  - `inCurrentCloseWindow`
  - `lastBusinessDayOfTargetMonth`
- `listRecentClosurePeriods()` ahora garantiza incluir el mes operativo actual aunque todavía no existan señales de payroll/finance materializadas para ese período.
- Validación adicional ejecutada:
  - `pnpm exec vitest run src/lib/cost-intelligence/check-period-readiness.test.ts src/lib/sync/projections/period-closure-status.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

## Delta 2026-03-30 — Slice operativo inicial implementado

- Ya quedó implementado el primer slice real de `TASK-068`:
  - helper canónico `src/lib/cost-intelligence/check-period-readiness.ts`
  - mutation helpers `src/lib/cost-intelligence/close-period.ts` y `src/lib/cost-intelligence/reopen-period.ts`
  - projection reactiva `src/lib/sync/projections/period-closure-status.ts`
  - APIs:
    - `GET /api/cost-intelligence/periods`
    - `GET /api/cost-intelligence/periods/[year]/[month]`
    - `POST /api/cost-intelligence/periods/[year]/[month]/close`
    - `POST /api/cost-intelligence/periods/[year]/[month]/reopen`
- Semántica adoptada y ya amarrada al carril Finance canónico:
  - income por `invoice_date`
  - expenses por `COALESCE(document_date, payment_date)`
  - FX por `rate_date`
  - payroll readiness por `greenhouse_payroll.payroll_periods.status`
- La materialización preserva estados manuales `closed` / `reopened` y proyecta el serving `greenhouse_serving.period_closure_status`.
- Cobertura nueva:
  - `src/lib/cost-intelligence/check-period-readiness.test.ts`
  - `src/lib/sync/projections/period-closure-status.test.ts`
- Validación ejecutada:
  - `pnpm exec vitest run src/lib/cost-intelligence/check-period-readiness.test.ts src/lib/sync/projections/period-closure-status.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`
- Remanente real del task:
  - decidir si `income_status` / `expense_status` requieren un estado `partial` más rico cuando se conecten señales adicionales de Finance

## Delta 2026-03-30 — TASK-067 cerrada + continuidad canónica

- `TASK-067` ya quedó cerrada:
  - schema `greenhouse_cost_intelligence`
  - serving tables base
  - domain `cost_intelligence`
  - eventos `accounting.*`
  - cron route dedicada con smoke `200`
- Esta task ya no está bloqueada por foundation técnica.
- Regla de continuidad:
  - además de `GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`, esta task debe respetar `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - el readiness y la ceremonia de cierre deben conversar con el lifecycle financiero/payroll canónico, no inventar estados paralelos

## Delta 2026-03-30 — Auditoría Finance + dependencias clarificadas

- **TASK-067 ya cerrada** (schema + domain + events disponibles).
- Puede ejecutarse **en paralelo con TASK-069** (ambas dependen solo de 067).
- TASK-070 (UI) necesita ESTA task + TASK-069 completadas antes de empezar.
- El concepto de "período cerrado" no existe en el codebase actual — esta task lo introduce.
- `greenhouse_payroll.payroll_periods` tiene `status` (draft → calculated → approved → exported) que esta task consume para readiness check.
- `greenhouse_finance.income`, `expenses`, `exchange_rates` ya existen — esta task los consulta para readiness.
- TASK-138 Slice 1 (finance notifications) depende de los eventos `accounting.period_closed/reopened` que esta task emite.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `in-progress` |
| Priority | `P1` |
| Impact | `Muy alto` |
| Effort | `Medio` |
| Status real | `Implementación` |
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
  - TASK-067 (schema + domain + event catalog) — **cerrada**
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
