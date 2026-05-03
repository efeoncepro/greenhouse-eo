# TASK-778 — Treasury-Grade Cash Position Contract

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto` (decisiones de tesorería basadas en KPIs incorrectos por construcción + ausencia de surfaces críticas treasury)
- Effort: `Alto (4-6 sprints, fragmentable en sub-tasks)`
- Type: `architecture` + `data-integrity` + `ux`
- Status real: `Diseño — auditoría finance-skill completada 2026-05-03`
- Domain: `finance / treasury`
- Blocked by: `TASK-779` (Treasury Hub Spec Canonization + Visual Regression Foundation — sin esto NO se puede validar paridad mockup-implementación)
- Branch: `develop` (instrucción explícita Greenhouse)
- Origen: auditoría `/finance/cash-position` 2026-05-03 vía skill `greenhouse-finance-accounting-operator` aplicando IAS 7, COSO, treasury best practices (Mercury / Brex / Stripe Treasury / Kyriba benchmarks)

## Summary

`/finance/cash-position` actualmente NO es una vista de cashflow per IAS 7 § 6 — es un **híbrido confuso** que mezcla working capital snapshot + historical aggregate sin distinción cash vs accrual basis, sin runway, sin forecast, sin aging, sin FX exposure, sin categorización Operating/Investing/Financing. El KPI primario "Posición neta = Caja disponible estimada" agrega assets + liabilities + cuentas en tránsito (CCA accionista, TC liability, procesadores Deel/Previred) en una sola "sopa" indefensible para decisión treasury.

Esta task introduce el **contract canónico de Cash Position treasury-grade**: KPIs primarios separados por naturaleza (cash on hand reconciliado vs working capital vs cupo crédito), runway prominente, 13-week rolling forecast con accuracy decay visual, AR aging buckets, AP scheduling timeline, FX exposure module, categorización IAS 7 del histórico, scenario planning toggles, y critical-week alerts automáticos.

## Why This Task Exists

### Bug class arquitectónica detectada

`/finance/cash-position` viola IAS 7 § 6 ("cash flows are inflows and outflows of cash and cash equivalents") y mezcla 3 conceptos distintos:

| KPI dashboard | Categoría real per IAS 7 | Problema |
|---|---|---|
| **Posición neta $50.975.704** "Caja disponible estimada" | Cash + AR + AP partial agregado | Mezcla assets + liabilities + accounts in transit |
| **Por cobrar $76.482.328** | AR balance (BS asset) | NO es cash inflow, son promesas |
| **Por pagar $25.506.624** | AP balance (BS liability) | NO es cash outflow, son compromisos |
| **Resultado cambiario $0** | FX P&L line | NO pertenece a cashflow statement |
| **Chart 12 meses** | Mix indeterminado cash vs accrual | Sin contract declarado, ilegible para CFO |

### Caso de impacto real

Si un operador toma decisión "tengo $50.975.704 disponible para pagar a proveedores" basado en este dashboard, podría aprobar pagos sin saber que esos $50M incluyen:

- CCA accionista (deuda inter-partes, NO cash líquido movible)
- Cupo TC Santander Corp (liability, NO asset)
- Cuenta Deel cash (en tránsito, no settled)

**Riesgo material**: insolvencia operativa por sobre-estimación de caja líquida real.

### Comparación con benchmarks profesionales

Mercury, Brex, Stripe Treasury, Kyriba, SAP Treasury — todos separan estrictamente:

1. **Cash on hand HOY** (reconciliado, timestamp explícito) como KPI primario único
2. **Runway** (cash / monthly burn) como segundo KPI
3. **13-week forecast** (Operating treasury standard, accuracy decay W1-W4 > 95%, W9-W13 60-75%)
4. **AR aging** + **AP scheduling** como secciones separadas
5. **FX exposure** module independiente
6. **Categorización Operating/Investing/Financing** del histórico

Greenhouse no tiene ninguno de estos.

### Costo de no resolverlo

- Decisiones treasury basadas en KPIs incorrectos por construcción.
- Imposible due diligence para capital raise / lender / M&A (cashflow no certifica IAS 7).
- Imposible detectar critical week (cash crunch) antes de que ocurra.
- DSO Chile típico 45-75d, Greenhouse podría tener DSO real ~380-450d (AR $76M / revenue ~$5-6M mes) y nadie lo está trackeando — señal de incobrables masivos no provisionados.

## Goal

Reemplazar `/finance/cash-position` actual por **Treasury Cash Position Hub** con 6 surfaces canónicos:

1. **Cash on Hand HOY** (reconciliado) — KPI primario único, freshness signal explícito.
2. **Runway** (months) + burn rate — segundo KPI, alert si < 6 meses.
3. **Working Capital snapshot** — AR + AP + inventory + provisions, con DSO/DPO/CCC.
4. **13-week rolling forecast** — surface independiente con commitments + projections.
5. **AR aging breakdown** — 5 buckets con drill-down a facturas.
6. **AP scheduling timeline** — calendar 7/30/90 días + payment_orders pendientes.
7. **FX exposure module** — net position por moneda + hedge ratio + recommendation.
8. **Cashflow histórico categorizado** (IAS 7 Operating / Investing / Financing) — chart 12 meses.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — finance dual-store
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` — FX policy
- `docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md` — VIEW canónica payments
- `docs/tasks/complete/TASK-774-account-balance-clp-native-reader-contract.md` — account_balances FX
- `docs/tasks/complete/TASK-776-account-detail-drawer-temporal-modes-contract.md` — temporal modes pattern (reusable)
- `docs/audits/finance/FINANCE_DOMAIN_AUDIT_2026-05-03.md` — auditoría dominio finance
- IAS 7 Statement of Cash Flows (frameworks externo)
- COSO Internal Control Framework (controles)

Reglas obligatorias:

- NUNCA agregar assets + liabilities + accounts in transit en un mismo KPI agregado.
- NUNCA mostrar "Posición neta" como sinónimo de "Caja disponible".
- NUNCA mezclar cash basis con accrual basis sin etiqueta explícita.
- NUNCA mostrar AR/AP agregado sin aging/scheduling drill-down.
- NUNCA presentar dashboard treasury sin runway + forecast.

## Scope

### Slice 1 — Categorización canónica de cuentas (data + reader)

- Migration: agregar `account_treasury_class` enum a `accounts`:
  - `liquid_cash` — cuenta corriente / ahorro / fintech accesibles
  - `restricted_cash` — garantías, depósitos, escrow
  - `credit_line` — líneas crédito disponibles
  - `bilateral_account` — CCA accionista, intercompany
  - `processor_in_transit` — Deel cash, Previred batch, payment platforms
  - `credit_card_liability` — TC corporate (deuda revolving)
- Helper canónico `getCashOnHand({ asOf })` — lee solo `liquid_cash` reconciliados.
- Helper `getTreasuryComposition()` — devuelve breakdown por class.

### Slice 2 — Helper canónico Cash + Runway

- `src/lib/finance/cash-position-canonical.ts`:
  - `getCashOnHandReconciled({ asOf })` → `{ totalClp, lastReconciledAt, accountsBreakdown[] }`
  - `getMonthlyBurnRate({ months: 3 })` → average opex monthly desde VIEW canónica
  - `getRunwayMonths({ asOf })` → `cash / burn`
  - `getCriticalWeekAlert({ horizonWeeks: 4 })` → null si OK, banner data si forecast < 0
- Tests unitarios con mock data + edge cases (no opex, opex negative, etc.)

### Slice 3 — 13-week rolling forecast engine

- Nueva ruta `/finance/cash-forecast` (separada de cash-position).
- Helper `buildThirteenWeekForecast({ asOf })`:
  - W1-W4: commitments (payment_orders submitted/approved + recurring AR scheduled)
  - W5-W8: commitments + projections (driver-based: avg cobros 90d × decay)
  - W9-W13: driver-based projections + estacionalidad
- Output: `{ weeks[13]: { weekStart, expectedInflows, expectedOutflows, netCashFlow, projectedCashEnd, accuracyTier } }`
- UI Vuexy: timeline horizontal con barras por semana + línea cumulative cash + accuracy decay shading.
- Refresh weekly job (Cloud Scheduler `ops-treasury-forecast-refresh`).

### Slice 4 — AR aging breakdown

- Helper `getAccountsReceivableAging({ asOf })`:
  - 5 buckets: current (0-30), 31-60, 61-90, 91-180, > 180
  - Por cliente + total
  - Provisión recomendada per bucket (0%, 0%, 25%, 50%, 100%)
- UI: tabla con drill-down a facturas + chip de "% del total" por bucket + warning si > 90d > 10% del total.

### Slice 5 — AP scheduling timeline

- Helper `getAccountsPayableSchedule({ horizon: '90 days' })`:
  - Compromisos próximos 7/30/60/90 días
  - payment_orders pendientes con state machine (draft / pending_approval / approved / submitted)
  - Vencidas (overdue) flag rojo
- UI: calendar view + tabla agrupada por week-bucket + total per period.

### Slice 6 — FX exposure module

- Helper `getFxExposureSummary()`:
  - Por moneda no-CLP: cash_balance, ar_balance, ap_balance, net_position_native, net_position_clp_equivalent
  - Recommendation: "natural hedge OK" / "consider forward" / "exposure significant" basado en threshold
- UI: tarjetas por moneda + recommendation banner + link a hedge tracker (futuro).

### Slice 7 — Categorización IAS 7 del cashflow histórico

- Helper `categorizeCashFlowsIAS7({ year, month })`:
  - Operating: cobros clientes − pagos proveedores − payroll − impuestos
  - Investing: compras activos fijos − ventas de activos
  - Financing: préstamos/aportes/retiros/dividendos
- Mapping rules per `economic_category` → IAS 7 category.
- UI: chart 12 meses con 3 stacked bars (Operating/Investing/Financing) + waterfall view opcional.

### Slice 8 — Working Capital metrics + DSO/DPO/CCC

- Helper `getWorkingCapitalMetrics({ asOf })`:
  - DSO = AR / (revenue 365d) × 365
  - DPO = AP / (cogs 365d) × 365
  - CCC = DSO − DPO (services, DIO=0)
  - Trend last 12 months
- UI: 3 KPI cards + trend sparkline + benchmark contextual ("DSO Chile agencias 45-75d, tu DSO X").

### Slice 9 — Refactor `/finance/cash-position` consume nuevos contracts

- Eliminar KPI "Posición neta = Caja disponible estimada".
- Reemplazar con 4 KPIs canónicos: Cash on Hand reconciliado / Runway / Working Capital / Cupo crédito disponible.
- Cuentas bancarias agrupadas por `account_treasury_class`.
- Chart 12 meses pasa a usar categorización IAS 7.
- Banner runway < 6 meses (warning) / < 3 meses (error).
- Banner critical week si forecast cae bajo $0 en próximas 4 semanas.

### Slice 10 — Stress test / scenario planning

- Toggles UI para escenarios:
  - "20% AR delay" → recalcula forecast con AR delayed 30d.
  - "Pierdo top cliente" → resta su MRR del forecast.
  - "USD ±10%" → recalcula FX exposure y CLP equivalent.
- Output: cash on hand projected end-of-13-weeks bajo cada escenario.

### Slice 11 — Reliability signals + lint rules

- Signal `finance.cash_position.kpi_drift`: detecta si KPI mostrado en UI difiere del helper canónico.
- Signal `finance.cash_position.unreconciled_accounts`: cuenta `liquid_cash` con drift > $1 vs banco real.
- Lint rule `greenhouse/no-untokenized-cash-aggregation`: bloquea SQL embebido que sume cuentas de classes distintas (e.g. `SUM(closing_balance) FROM accounts WHERE active`).

### Slice 12 — Docs canónicos + cierre

- CLAUDE.md sección "Finance — Treasury Cash Position Contract (TASK-778)".
- `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` Delta con tabla de surfaces canónicas + reglas duras.
- Doc funcional `docs/documentation/finance/posicion-de-caja-treasury.md` (lenguaje simple operadores).
- Manual de uso `docs/manual-de-uso/finance/leer-cash-position.md`.
- E2E smoke tests (3): cash-on-hand vs reconciled, runway calculation, forecast week 13 accuracy decay.

## Out of Scope

- NO migrar el módulo de Banco (`/finance/bank` — drawer ya tiene TASK-776 contract).
- NO refactor del módulo de Conciliación (`/finance/reconciliation`).
- NO implementar hedge accounting completo (requiere IFRS 9 designation + effectiveness testing — task derivada futura).
- NO implementar full IAS 7 statement (con notas y disclosures) — out of scope, esto es treasury operacional.
- NO crear módulo de Cash Pooling intercompany (futuro si Efeonce abre subsidiarias).

## Acceptance Criteria

- [ ] `account_treasury_class` enum + migration aplicada
- [ ] Helper `getCashOnHandReconciled` + tests verde
- [ ] Helper `buildThirteenWeekForecast` + tests verde
- [ ] Helper AR aging + AP scheduling + tests verde
- [ ] FX exposure module + tests verde
- [ ] IAS 7 categorización mapping + tests verde
- [ ] Working capital metrics (DSO/DPO/CCC) + tests verde
- [ ] `/finance/cash-position` refactorizada — KPI "Posición neta" eliminado
- [ ] Banner runway + critical week alerts funcionan
- [ ] Scenario planning toggles operativos
- [ ] Reliability signals nuevos en steady=0 post-deploy
- [ ] Lint rule `greenhouse/no-untokenized-cash-aggregation` mode error
- [ ] CLAUDE.md + arch doc + doc funcional + manual actualizados
- [ ] E2E smoke tests verde contra staging
- [ ] Verde global: tsc + lint + tests + build

## Verification

- `pnpm staging:request '/api/finance/cash-position'` retorna nuevo contract con 4 KPIs separados, runway, working capital metrics, IAS 7 categorización.
- `/finance/cash-forecast` muestra 13-week timeline con accuracy decay shading.
- Cash on Hand reconciled = `SUM(account_balances WHERE account.treasury_class='liquid_cash' AND last_reconciled_at > NOW() - 24h)`.
- Runway = Cash on Hand / Average monthly burn last 3 months.
- Banner aparece si runway < 6 meses o si critical week detectada en forecast.

## Open Questions (resolver pre-execution)

- (Q1) ¿Renombrar `/finance/cash-position` → `/finance/treasury` para reflejar el alcance ampliado, o mantener URL para no romper bookmarks? **Sugerencia**: mantener URL + redirect 301 desde `/finance/treasury` para SEO/UX.
- (Q2) ¿Critical week alert dispara notificación a TeamBot/email o solo banner UI? **Sugerencia**: banner + email a Finance Admin si severity=error.
- (Q3) ¿Scenario planning toggles guardan presets per usuario o son ephemeral session? **Sugerencia**: ephemeral primero; presets per-user en Slice 13 si emerge demanda.
- (Q4) ¿`account_treasury_class` admite override manual per cuenta o se infiere automáticamente desde `instrument_category`? **Sugerencia**: default automático desde `instrument_category` con override manual via admin endpoint para edge cases.
- (Q5) ¿13-week forecast admite ajuste manual semana-a-semana por treasurer (e.g. "esperamos cobro grande W4 que no está en sistema")? **Sugerencia**: NO en V1 — driver-based puro. V2 si emerge necesidad.

## Dependencies & Impact

### Depends on

- TASK-766 (VIEW canónica `expense_payments_normalized` + `income_payments_normalized`) — ✅ deployed
- TASK-768 (`economic_category` para mapping IAS 7) — ✅ deployed
- TASK-774 (`account_balances` FX correctness) — ✅ deployed
- TASK-776 (temporal modes contract reusable pattern) — ✅ deployed

### Impacta a

- `/finance/cash-position` (refactor mayor)
- `/admin/operations` (signals nuevos)
- Cron diario `ops-finance-rematerialize-balances` (sin cambio, signals leen lo mismo)
- Posible futuro `/finance/treasury` URL alias

### Files owned

- `src/lib/finance/cash-position-canonical.ts` (nuevo)
- `src/lib/finance/treasury-forecast.ts` (nuevo)
- `src/lib/finance/ar-aging.ts` (nuevo)
- `src/lib/finance/ap-schedule.ts` (nuevo)
- `src/lib/finance/fx-exposure-summary.ts` (nuevo)
- `src/lib/finance/working-capital-metrics.ts` (nuevo)
- `src/lib/finance/ias7-categorization.ts` (nuevo)
- `src/views/greenhouse/finance/CashPositionView.tsx` (refactor)
- `src/views/greenhouse/finance/CashForecastView.tsx` (nuevo)
- `src/app/api/finance/cash-position/route.ts` (extend)
- `src/app/api/finance/cash-forecast/route.ts` (nuevo)
- migration `add-account-treasury-class.sql`
- `eslint-plugins/greenhouse/rules/no-untokenized-cash-aggregation.mjs` (nuevo)

## Frameworks Cited

- **IAS 7** Statement of Cash Flows § 6, § 10, § 19, § 50
- **COSO** Internal Control — Integrated Framework (Risk Assessment + Monitoring components)
- **AICPA/CIMA** Global Management Accounting Principles (relevance + influence)
- **TRMA** (Treasury & Risk Management Association) 13-week forecast best practices
- **IFRS 9** Financial Instruments (FX exposure measurement)
- **IAS 21** Effects of Changes in Foreign Exchange Rates (translation methods)

## Closing Protocol

Estándar Greenhouse:

1. Lifecycle `complete` + mover a `complete/`
2. Sync `README.md` + `TASK_ID_REGISTRY.md`
3. `Handoff.md` con resumen + KPI diff
4. `changelog.md` entry visible
5. Arch doc Delta
6. CLAUDE.md sección nueva
7. Doc funcional + manual de uso
8. E2E verification staging real
9. Reliability signals steady=0 confirmado
10. PR (`gh pr create --base develop`) con summary completo
