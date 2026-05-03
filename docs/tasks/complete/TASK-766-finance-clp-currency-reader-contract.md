# TASK-766 — Finance CLP-Currency Reader Contract Resilience

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Cerrado 2026-05-03`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none` (foundations TASK-699, TASK-708, TASK-714c, TASK-721, TASK-765 ya cerradas)
- Branch: `task/TASK-766-finance-clp-currency-reader-contract`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Refactor arquitectónico del contrato de lectura de montos en CLP desde `expense_payments` y `income_payments`. Hoy múltiples queries SQL embebidos en API routes computan `SUM(ep.amount * COALESCE(e.exchange_rate_to_clp, 1))` — anti-patrón sistémico que infló el KPI "Total pagado" en `/finance/cash-out` en **88×** ($1.017.803.262 vs real $11.546.493) cuando un payment CLP tocó un expense USD (caso CCA TASK-714c). La fix puntual al endpoint NO cierra el problema arquitectónico: cualquier futuro KPI puede repetir el bug. Esta task introduce la VIEW canónica `expense_payments_normalized` + helper TS + reliability signal + lint rule + backfill, el mismo patrón TASK-571/699/721 ya usado para drift detection.

## Why This Task Exists

**Detección 2026-05-02 (post-merge TASK-765):**

Usuario reportó que `/finance/cash-out` mostraba números inflados:

| KPI | Mostrado | Real | Inflación |
|---|---:|---:|---:|
| Total pagado | $1,017,803,262 | $11,546,493 | **88×** |
| Proveedores | $1,011,578,010 | $5,321,241 | **190×** |
| Nómina | $1,432,644 | $1,432,644 | OK |
| Fiscal | $4,308,114 | $4,308,114 | OK |

**Causa raíz:** un solo `expense_payment` (HubSpot reembolso CCA, `payment_id=exp-pay-sha-46679051-7ba82530`):
- `expense.currency = 'USD'`, `expense.exchange_rate_to_clp = 910.55` (rate del documento original)
- `expense_payment.currency = 'CLP'`, `expense_payment.amount = 1,106,321 CLP`, `expense_payment.amount_clp = 1,106,321 CLP` (correcto, escrito por `recordExpensePayment` con FX resolution canónica)
- Query del API: `1,106,321 × 910.55 = $1,007,363,090` ❌ (multiplica CLP nativo por rate USD del documento original).

**El anti-patrón:** El SQL `SUM(ep.amount * COALESCE(e.exchange_rate_to_clp, 1))` asume que `ep.amount` está en la moneda del documento (`e.currency`). Eso es falso desde TASK-714c (CCA shareholder reimbursable): un expense USD puede tener payment CLP, un expense CLP puede tener payment USD (factoring multimoneda futuro), etc.

**Ya hay precedente arquitectónico:**

- CLAUDE.md regla dura TASK-571: `income_settlement_reconciliation` VIEW canónica para drift detection. "NUNCA computar drift como `amount_paid - SUM(income_payments)` solo".
- CLAUDE.md regla dura TASK-699: `fx_pnl_breakdown` VIEW + helper `getBankFxPnlBreakdown`. "NUNCA sumar FX P&L desde `income_payments`/`expense_payments` directo en un nuevo query. Toda lectura cruza la VIEW canónica o el helper."
- CLAUDE.md regla dura TASK-721: `<GreenhouseFileUploader>` canonical uploader. "NUNCA aceptar `source_evidence_ref` como text libre en flujos nuevos".

Esta task aplica el mismo patrón a "monto en CLP de un payment" — dimensión que hoy depende de math casero en cada consumer. Sin esta task, **cualquier futuro KPI/dashboard/P&L que sume payments CLP repetirá el bug**, porque no hay enforcement mecánico (lint rule), no hay alerta proactiva (reliability signal), y la VIEW canónica simplemente no existe.

## Goal

- **Single source of truth** para "monto CLP de un expense_payment / income_payment": VIEW `*_normalized` que prioriza `amount_clp` persistido > fallback CLP-trivial > NULL+drift_flag. Cero math casero.
- **Helper TS canónico** (`sumExpensePaymentsClpForPeriod`, `sumIncomePaymentsClpForPeriod`) que cualquier API route consume. Cero duplicación de lógica de SUM.
- **Backfill defensivo** de `amount_clp` para registros legacy + script admin de repair para non-CLP sin amount_clp.
- **CHECK constraint anti-regresión** (mismo pattern `expense_payments_account_required_after_cutover`): non-CLP payment SIN amount_clp es rechazado por DB post-cutover.
- **Reliability signal `expense_payments_clp_drift`** + `income_payments_clp_drift` con steady=0, integrados en subsystem `Finance Data Quality` y surface en `/admin/operations`.
- **Lint rule `greenhouse/no-untokenized-fx-math`** que detecta el anti-patrón en SQL embebido y rompe build en mode `error` desde el primer commit.
- **Migración del `cash-out/route.ts`** y todos los demás callsites del anti-patrón al helper canónico. Auditoría exhaustiva del portal.
- **Reglas duras documentadas** en CLAUDE.md + `GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` + `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — documento maestro
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` — matriz canónica de monedas, FX policy, currency registry. Esta task agrega el contrato canónico de "monto CLP de un payment".
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — Finance dual-store + canonical readers
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — `RELIABILITY_REGISTRY` extension pattern
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — node-pg-migrate, Kysely

Reglas obligatorias:

- **NUNCA** computar `monto_clp` de un payment con `ep.amount × *_rate` en SQL embebido nuevo. Usar siempre VIEW `expense_payments_normalized` o helper TS.
- **3-axis supersede preservado** en la VIEW: `superseded_at IS NULL AND superseded_by_otb_id IS NULL AND superseded_by_payment_id IS NULL`.
- **CHECK constraints aditivos** con `NOT VALID` + cutover_date pattern (mismo template que `expense_payments_account_required_after_cutover`).
- **Reliability signals** con `incidentDomainTag='finance'` y rollup al subsystem `Finance Data Quality` existente.
- **Lint rule** vive en `eslint-plugins/greenhouse/rules/` siguiendo el patrón de `no-untokenized-copy.mjs` (TASK-265).
- **Anti regresión TS↔SQL**: paridad entre helper TS y VIEW SQL pinned por test (mismo pattern TASK-700 Luhn parity, TASK-709 labor allocation parity).
- **Patrón canónico ya validado por:** TASK-571 (`income_settlement_reconciliation`), TASK-699 (`fx_pnl_breakdown`), TASK-721 (asset uploader). Esta task replica el patrón, no inventa uno nuevo.

## Normative Docs

- CLAUDE.md sección "Finance — reconciliación de income.amount_paid (factoring + withholdings)" — TASK-571 establece el patrón VIEW + helper
- CLAUDE.md sección "Finance — FX P&L canónico para tesorería (Banco 'Resultado cambiario')" — TASK-699 ya prohíbe SUM directo de `income_payments`/`expense_payments`
- CLAUDE.md sección "Finance — Evidence canonical uploader (TASK-721)" — pattern de helper canónico
- CLAUDE.md sección "Microcopy / UI copy — regla canónica (TASK-265)" — pattern de lint rule custom
- `docs/issues/resolved/ISSUE-063-payment-orders-paid-without-bank-impact.md` — incidente predecesor (otro caso del mismo patrón de skip silencioso/data drift)

## Dependencies & Impact

### Depends on

- `TASK-699` ✅ — FX P&L canonical pipeline (referencia de patrón VIEW + helper)
- `TASK-571` ✅ — `income_settlement_reconciliation` VIEW canónica (referencia de patrón)
- `TASK-708` ✅ — settlement legs canonical (`expense_payments.amount_clp` poblado por `recordExpensePayment`)
- `TASK-714c` ✅ — CCA shareholder reimbursable expense (caso disparador del bug)
- `TASK-721` ✅ — canonical helper pattern para asset uploader
- `TASK-765` ✅ — atomic mark-paid path. `recordExpensePayment` extendido con `client?` ya produce `amount_clp` correctamente para nuevos paths.
- `TASK-265` ✅ — lint rule pattern (`no-untokenized-copy.mjs` como template)
- Tabla `greenhouse_finance.expense_payments` con columna `amount_clp` (ya existente)
- Tabla `greenhouse_finance.income_payments` con columna `amount_clp` (ya existente [verificar])
- VIEW pattern existente: `greenhouse_finance.fx_pnl_breakdown`, `greenhouse_finance.income_settlement_reconciliation`
- Helper pattern existente: `src/lib/finance/fx-pnl.ts`, `src/lib/finance/income-settlement.ts`
- `src/lib/reliability/registry.ts` con subsystem `Finance Data Quality` ya extendido por TASK-765
- `eslint-plugins/greenhouse/rules/no-untokenized-copy.mjs` — template para nueva rule

### Blocks / Impacts

- **`/finance/cash-out`** — KPIs hoy inflados, fixeo definitivo via slice 3.
- **`/finance/intelligence`** [verificar] — probablemente consume mismo anti-patrón.
- **`/finance/dashboard`** [verificar] — probablemente consume mismo anti-patrón.
- **`/agency/economics`** y dashboards de agencia [verificar] — auditar en slice 4.
- **`/finance/reconciliation`** [verificar] — auditar.
- **`/finance/cash-position`** [verificar] — auditar.
- **TASK-770+ (futuras KPIs / dashboards / P&L)** — se beneficiarán del helper canónico sin re-introducir el bug.
- **TASK-178 (Finance Budget Engine)** — debería consumir el helper canónico para targets vs actuals en CLP.
- **TASK-707 / TASK-664 (Nubox + Previred sync)** — ambos paths escriben `expense_payments` con potencial currency mismatch; el CHECK constraint del slice 2 fuerza que esos paths populen `amount_clp` correctamente.
- **TASK-756 (auto-generación payment orders)** — no impacto directo, pero cualquier KPI futuro que muestre montos pagados consumirá el helper.
- **`expense_payments` schema** — agrega columna `requires_fx_repair BOOLEAN` (slice 2) + CHECK constraint nuevo. Ambos aditivos, sin breaking change.

### Files owned

**Migrations (creadas vía `pnpm migrate:create`):**

- `migrations/<ts>_task-766-expense-payments-normalized-view.sql`
- `migrations/<ts>_task-766-income-payments-normalized-view.sql`
- `migrations/<ts>_task-766-payments-clp-amount-required-after-cutover.sql`
- `migrations/<ts>_task-766-payments-clp-amount-backfill-and-repair-flag.sql`

**Backend / lib:**

- `src/lib/finance/expense-payments-reader.ts` (NEW) — `sumExpensePaymentsClpForPeriod`, `listExpensePaymentsNormalized`, `getExpensePaymentsClpDriftCount`
- `src/lib/finance/income-payments-reader.ts` (NEW) — `sumIncomePaymentsClpForPeriod`, `listIncomePaymentsNormalized`, `getIncomePaymentsClpDriftCount`
- `src/lib/finance/expense-payments-reader.test.ts` (NEW) — paridad TS↔SQL VIEW, drift detection, sum por filter
- `src/lib/finance/income-payments-reader.test.ts` (NEW)
- `src/lib/reliability/queries/expense-payments-clp-drift.ts` (NEW)
- `src/lib/reliability/queries/income-payments-clp-drift.ts` (NEW)
- `src/lib/reliability/registry.ts` — extender Finance Data Quality con 2 signals nuevos
- `src/lib/reliability/signals.ts` — wire de los nuevos signal builders
- `src/lib/finance/repair-payments-clp-amount.ts` (NEW) — repair script logic invocable desde admin endpoint y desde CLI

**API routes:**

- `src/app/api/finance/cash-out/route.ts` — refactor: 4 SUMs del summary delegan al helper canónico
- `src/app/api/admin/finance/payments-clp-repair/route.ts` (NEW) — endpoint admin para reparar registros con `requires_fx_repair=TRUE` (capability `finance.payments.repair_clp` nueva)
- `src/app/api/admin/finance/payments-clp-repair/route.test.ts` (NEW)

**Capabilities:**

- `src/config/entitlements-catalog.ts` — agregar capability `finance.payments.repair_clp` (action `update`, scope `tenant`)

**Lint rule:**

- `eslint-plugins/greenhouse/rules/no-untokenized-fx-math.mjs` (NEW)
- `eslint-plugins/greenhouse/rules/no-untokenized-fx-math.test.mjs` (NEW)
- `eslint-plugins/greenhouse/index.mjs` [verificar path exacto] — register rule
- `eslint.config.mjs` [verificar] — activar rule en mode `error`

**Tests de regresión:**

- `src/app/api/finance/cash-out/route.test.ts` (NEW o extender) — pin del KPI canónico para el caso del incidente (HubSpot CCA $1,106,321 CLP vs broken $1,007,363,090).

**Audit + migration de callsites (slice 4):**

- Grep exhaustivo del anti-patrón. Cada hit migrado al helper. Lista esperada (a confirmar en Discovery): `cash-out/route.ts`, posibles consumers en `src/app/api/finance/intelligence/`, `src/app/api/finance/dashboard/`, `src/app/api/finance/cash-position/`, `src/app/api/agency/economics/`, `src/app/api/finance/reconciliation/`.

**Docs:**

- `CLAUDE.md` — sección nueva "Finance — CLP currency reader invariants (TASK-766)"
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` — agregar contrato canónico
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — agregar pattern reference
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — agregar 2 signals nuevos al registro

## Current Repo State

### Already exists

- **`expense_payments.amount_clp`** poblado por `recordExpensePayment` (`src/lib/finance/expense-payment-ledger.ts`) con FX resolution canónica vía `resolveExchangeRateToClp` (TASK-699 pattern).
- **`income_payments.amount_clp`** [verificar] — confirmar nombre exacto de la columna; algunos paths podrían usar otro field name.
- **VIEW canónica pattern** ya usado: `greenhouse_finance.fx_pnl_breakdown` (TASK-699), `greenhouse_finance.income_settlement_reconciliation` (TASK-571).
- **Helper TS pattern** ya usado: `src/lib/finance/fx-pnl.ts`, `src/lib/finance/income-settlement.ts`.
- **Lint rule pattern** ya usado: `eslint-plugins/greenhouse/rules/no-untokenized-copy.mjs` (TASK-265).
- **Reliability subsystem `Finance Data Quality`** extendido por TASK-765 con 3 signals; receptivo a 2 más sin refactor.
- **CHECK constraint pattern** ya usado: `expense_payments_account_required_after_cutover` (TASK-708/728).
- **`captureWithDomain`** y `query` / `withTransaction` de `@/lib/db` — disponibles.
- **Migration tooling** `pnpm migrate:create` + auto-regen Kysely types.

### Gap

- **No hay VIEW `expense_payments_normalized`.** Cada consumer hace su math casero.
- **No hay helper TS canónico** para "sum payment CLP por período/filtros".
- **No hay reliability signal** que detecte payments con `currency != 'CLP' AND amount_clp IS NULL` — drift puede silencioso por meses.
- **No hay lint rule** que detecte SQL embebido con patrón `ep.amount * exchange_rate_to_clp`. Cualquier nuevo callsite reintroduce el bug sin que CI lo detecte.
- **No hay CHECK constraint** que prohíba `currency != 'CLP' AND amount_clp IS NULL` en `expense_payments` / `income_payments`. Schema permite el estado roto.
- **`/finance/cash-out` API** computa KPIs con el anti-patrón directamente (líneas 195-200 de `route.ts`).
- **No hay backfill** de `amount_clp` para `expense_payments` legacy donde `currency='CLP' AND amount_clp IS NULL` (caso seguro 1:1).
- **No hay endpoint admin** para reparar non-CLP payments sin `amount_clp` invocando `resolveExchangeRateToClp` con el `payment_date` histórico.
- **CLAUDE.md** no documenta la regla dura "NUNCA `SUM(ep.amount × rate)` en SQL nuevo" (TASK-699 lo hace para FX P&L pero no como contrato general de readers CLP).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — VIEW canónica + helpers TS + tests de paridad

- **Schema confirmado pre-execution (Q1 resuelta):** `income_payments` tiene `amount_clp` (numeric(14,2)), `exchange_rate_at_payment`, `fx_gain_loss_clp`, 3-axis supersede — schema idéntico a `expense_payments`. Cero migración estructural extra; las 2 VIEWS son el mismo template.
- Migration `task-766-expense-payments-normalized-view`:
  - `CREATE VIEW greenhouse_finance.expense_payments_normalized AS SELECT ep.payment_id, ep.expense_id, ep.payment_date, ep.amount AS payment_amount_native, ep.currency AS payment_currency, ep.payment_account_id, ep.is_reconciled, ep.payment_order_line_id, ep.created_at, ep.exchange_rate_at_payment, ep.fx_gain_loss_clp, COALESCE(ep.amount_clp, CASE WHEN ep.currency = 'CLP' THEN ep.amount ELSE NULL END) AS payment_amount_clp, (ep.currency != 'CLP' AND ep.amount_clp IS NULL) AS has_clp_drift FROM greenhouse_finance.expense_payments ep WHERE ep.superseded_by_payment_id IS NULL AND ep.superseded_by_otb_id IS NULL AND ep.superseded_at IS NULL;`
  - Comentario SQL `COMMENT ON VIEW ... IS 'TASK-766 canonical reader. NEVER compute payment CLP via ep.amount * exchange_rate_to_clp. amount_clp is the FX-resolved canonical value at payment date.'`
- Migration `task-766-income-payments-normalized-view` análoga (mismo template, columna `income_id` en lugar de `expense_id`).
- `src/lib/finance/expense-payments-reader.ts`:
  - `sumExpensePaymentsClpForPeriod({fromDate, toDate, expenseType?, supplierId?, isReconciled?})` → `{totalClp, totalPayments, supplierClp, payrollClp, fiscalClp, driftCount}`. Lee desde la VIEW + JOIN a `expenses`.
  - `listExpensePaymentsNormalized({...filters, page, pageSize})` → array de payments con `payment_amount_clp` canónico.
  - `getExpensePaymentsClpDriftCount({fromDate?, toDate?})` → count de filas con `has_clp_drift = TRUE`.
- `src/lib/finance/income-payments-reader.ts` análogo.
- Tests Vitest cubriendo:
  - Paridad SQL↔TS: helper retorna mismos números que SELECT directo a la VIEW.
  - Caso del incidente HubSpot CCA: payment $1,106,321 CLP cuyo expense es USD con rate 910.55 → helper devuelve 1,106,321 (no 1,007,363,090).
  - Drift detection: payment USD con `amount_clp IS NULL` → cuenta en `driftCount`, NO suma en `totalClp` (devuelve null payment_amount_clp).
  - 3-axis supersede: filas superseded NO aparecen en la VIEW.
  - Filtros: `expenseType='supplier'` filtra correcto.
- **Skill: `greenhouse-backend`.**

### Slice 2 — Backfill + CHECK constraint + reliability signals

- Migration `task-766-payments-clp-amount-backfill-and-repair-flag`:
  - `ALTER TABLE greenhouse_finance.expense_payments ADD COLUMN requires_fx_repair BOOLEAN NOT NULL DEFAULT FALSE`
  - `ALTER TABLE greenhouse_finance.income_payments ADD COLUMN requires_fx_repair BOOLEAN NOT NULL DEFAULT FALSE`
  - Backfill seguro 1:1: `UPDATE greenhouse_finance.expense_payments SET amount_clp = amount WHERE currency = 'CLP' AND amount_clp IS NULL;` (idempotente, único caso obvio).
  - Idem para `income_payments`.
  - Mark drift: `UPDATE greenhouse_finance.expense_payments SET requires_fx_repair = TRUE WHERE currency != 'CLP' AND amount_clp IS NULL;` (los payments USD/EUR/etc sin amount_clp poblado).
  - Idem para `income_payments`.
  - Index parcial: `CREATE INDEX expense_payments_requires_fx_repair_idx ON greenhouse_finance.expense_payments (requires_fx_repair, payment_date) WHERE requires_fx_repair = TRUE;`.
- Migration `task-766-payments-clp-amount-required-after-cutover` (Q2 resuelta):
  - Cutover_date canónica: `2026-05-03 00:00:00+00` (post-merge TASK-766, fixed).
  - `ALTER TABLE greenhouse_finance.expense_payments ADD CONSTRAINT expense_payments_clp_amount_required_after_cutover CHECK (currency = 'CLP' OR amount_clp IS NOT NULL OR superseded_by_payment_id IS NOT NULL OR superseded_by_otb_id IS NOT NULL OR created_at < '2026-05-03 00:00:00+00'::timestamp with time zone) NOT VALID;`
  - Idem para `income_payments`.
  - **`VALIDATE CONSTRAINT` ejecutado en la misma migration** SOLO si `requires_fx_repair` count == 0 post-backfill. Si > 0 (caso esperado: ningún registro non-CLP sin amount_clp en el dataset actual según el SQL del incidente), el `VALIDATE` se difiere a una migration final dentro del slice 5 (post-repair endpoint), donde el count está pinned a 0 con audit log. Atomic: la migration que cierra el constraint es la última operación del recovery.
- `src/lib/reliability/queries/expense-payments-clp-drift.ts`:
  ```sql
  SELECT COUNT(*)::int AS n
  FROM greenhouse_finance.expense_payments ep
  WHERE ep.currency != 'CLP'
    AND ep.amount_clp IS NULL
    AND ep.superseded_by_payment_id IS NULL
    AND ep.superseded_by_otb_id IS NULL
    AND ep.superseded_at IS NULL;
  ```
  Steady=0, kind=`drift`, severity=`critical`.
- `src/lib/reliability/queries/income-payments-clp-drift.ts` análogo.
- Wire en `RELIABILITY_REGISTRY` extendiendo Finance Data Quality.
- **Skill: `greenhouse-backend`.**

### Slice 3 — Lint rule + migración del cash-out + tests de regresión

- `eslint-plugins/greenhouse/rules/no-untokenized-fx-math.mjs`:
  - Detecta `TemplateLiteral`/`TaggedTemplateExpression` con string SQL conteniendo:
    - `ep.amount * COALESCE(e.exchange_rate_to_clp` (cualquier whitespace permitido)
    - `ep.amount * exchange_rate_to_clp`
    - `ip.amount * COALESCE(i.exchange_rate_to_clp` (income variant)
    - `ep.amount * exchange_rate_at_payment` cuando NO viene de la VIEW (la VIEW también lo expone, pero usa `ep.amount_clp`).
  - Excepciones explícitas: archivos en `src/lib/finance/expense-payments-reader.ts`, `income-payments-reader.ts`, las VIEWS migrations, `payment-orders/mark-paid-atomic.ts`, `expense-payment-ledger.ts` (estos populate amount_clp, no lo leen).
  - **Mode `error` desde el primer commit del slice 3 (Q4 resuelta)**: el patrón es contractualmente prohibido. Slice 3 entrega lint rule + migración del cash-out atómicamente — el commit que activa la rule es el mismo que migra el primer callsite. Slice 4 audita el resto del portal antes de mergear; si la rule rompe build en otros files, ESE es el output esperado (los lista exhaustivamente para migración en slice 4). Cero tolerancia a legacy en este patrón — distinto a TASK-265 (`no-untokenized-copy` en `warn`) porque allá había 318 warnings legacy aceptables; aquí cualquier hit es un risk de KPIs inflados en producción.
  - Mensaje del error: cita la regla dura + path al helper canónico + link a TASK-766.
- Test ESLint para la rule (`no-untokenized-fx-math.test.mjs`).
- Refactor `src/app/api/finance/cash-out/route.ts`:
  - Eliminar las 4 SUMs del summary que multiplican `ep.amount × *_rate`.
  - Delegar a `sumExpensePaymentsClpForPeriod` del helper.
  - Lista de payments también lee desde la VIEW (consistencia entre detail y summary).
- Test de regresión `src/app/api/finance/cash-out/route.test.ts`:
  - Mock fixture con el caso real del incidente: 1 payment HubSpot CCA $1,106,321 CLP cuyo expense es USD rate 910.55. Assert que `summary.totalPaidClp` es 1,106,321 (no 1,007,363,090) y `summary.supplierTotalClp` ídem.
  - Otros 2-3 escenarios: CLP→CLP trivial, USD→CLP normal, payment con `amount_clp` NULL flagged en drift count.
- **Skill: `greenhouse-backend`.**

### Slice 4 — Auditoría exhaustiva del portal + migración de callsites

- Grep + análisis estático del anti-patrón en TODO `src/app/api/`:
  - Patrón `ep.amount * exchange_rate_to_clp`
  - Patrón `ep.amount * COALESCE(.+exchange_rate.+)`
  - Patrón `payment_amount * .*rate.*` (SQL embebido)
  - Mismas variantes para `income_payments` (`ip.amount × ...`)
- Para cada hit:
  - Migrar al helper canónico (slice 1).
  - Si el endpoint computa más que solo CLP totals (e.g. period_outflows en `account_balances`), revisar si la VIEW canónica cubre el caso o si necesita extensión (proponer follow-up task).
- Casos esperados a auditar (lista no exhaustiva, confirmar en Discovery):
  - `src/app/api/finance/intelligence/**`
  - `src/app/api/finance/dashboard/**`
  - `src/app/api/finance/cash-position/**`
  - `src/app/api/finance/reconciliation/**`
  - `src/app/api/agency/economics/**`
  - `src/app/api/dashboard/**` (top-level)
  - `src/lib/finance/account-balances.ts` getDailyMovementSummary [verificar — probablemente ya canónico vía 3-axis supersede pero confirmar que usa amount_clp]
- Por cada migración de callsite: test de regresión + commit.
- **Skill: `greenhouse-backend`.**

### Slice 5 — Repair endpoint + admin script + capability + recovery del incidente

- `src/lib/finance/repair-payments-clp-amount.ts`:
  - `repairExpensePaymentsClpAmount({paymentIds?, batchSize?})` — itera filas con `requires_fx_repair=TRUE`, invoca `resolveExchangeRateToClp({currency, requestedRate: null, asOfDate: payment_date})` con date histórico, escribe `amount_clp` + `exchange_rate_at_payment` + flips `requires_fx_repair=FALSE`. Atomic per row, idempotente.
  - `repairIncomePaymentsClpAmount` análogo.
- `src/app/api/admin/finance/payments-clp-repair/route.ts` (Q3 + Q7 resueltas — Vercel route, capability nueva granular):
  - `POST /api/admin/finance/payments-clp-repair` (capability `finance.payments.repair_clp` nueva en entitlements-catalog, reservada FINANCE_ADMIN + EFEONCE_ADMIN; least-privilege canónico).
  - Body: `{ kind: 'expense' | 'income', paymentIds?: string[], dryRun?: boolean, batchSize?: number }`.
  - Devuelve audit del repair: count repaired, count skipped (con razón), errors.
  - Wrap con `captureWithDomain('finance', { tags: { source: 'payments_clp_repair' } })`.
  - Outbox event `finance.payments.clp_repaired` (v1, audit-only).
  - **Vive en Vercel route (NO ops-worker)**: `resolveExchangeRateToClp` ya tiene caching + fallback chain; cero infra nueva.
- Tests Vitest para el endpoint + el helper.
- **Documentación:**
  - CLAUDE.md sección "Finance — CLP currency reader invariants (TASK-766)" con diagram + reglas duras + helpers canónicos + link a la VIEW + lint rule + reliability signal.
  - `GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` — Delta 2026-05-02 con CLP reader contract.
  - `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — Delta 2026-05-02 referencing.
  - `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — agregar los 2 signals nuevos.
  - `GREENHOUSE_EVENT_CATALOG_V1.md` — agregar `finance.payments.clp_repaired` v1.
- **Skill: `greenhouse-backend`.**

## Out of Scope

- **Auditoría de callsites BigQuery.** Esta task cubre el portal Next.js (`src/`). Si dashboards BQ tienen el mismo patrón, queda como follow-up TASK-derivada.
- **Migración del modelo de FX rates a un currency registry global.** Eso es alcance de `GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` (TASK-484 FX provider adapter platform). Esta task asume que `resolveExchangeRateToClp` existe y funciona; solo lo invoca para el repair.
- **Refactor de `account-balances.ts`** si ya consume `expense_payments` correctamente vía 3-axis supersede + amount_clp. Solo migrar al helper si el callsite usa el anti-patrón.
- **UI de `/admin/operations`** — los signals nuevos surface automáticamente vía rollup existente; no se rediseña la página.
- **Backfill cross-DB BigQuery.** Esta task solo escribe Postgres.
- **Currency registry validation** (e.g. EUR, COP, MXN) — si aparecen non-CLP/USD en datos, el repair los maneja vía el resolver existente; no se agregan nuevas monedas al sistema en esta task.
- **Performance optimization** del summary query si emerge como blocker. Si el helper tarda >300ms para periods grandes, documentar en Follow-ups.

## Detailed Spec

### Shape canónico de la VIEW

```sql
CREATE VIEW greenhouse_finance.expense_payments_normalized AS
SELECT
  ep.payment_id,
  ep.expense_id,
  ep.payment_date,
  ep.amount                                AS payment_amount_native,
  ep.currency                              AS payment_currency,
  -- Canonical CLP value: prioriza amount_clp persistido (FX resolution
  -- canónica al momento del pago via TASK-699 pattern). NUNCA multiplica
  -- ep.amount × e.exchange_rate_to_clp (que es rate del documento, no
  -- del pago — caso confirmado en incidente 2026-05-02 con HubSpot CCA).
  COALESCE(
    ep.amount_clp,
    CASE WHEN ep.currency = 'CLP' THEN ep.amount ELSE NULL END
  )                                         AS payment_amount_clp,
  ep.exchange_rate_at_payment,
  ep.fx_gain_loss_clp,
  ep.payment_account_id,
  ep.payment_method,
  ep.payment_source,
  ep.is_reconciled,
  ep.payment_order_line_id,
  ep.reference,
  ep.created_at,
  -- Drift flag: non-CLP sin amount_clp persistido → reliability signal lo cuenta
  (ep.currency != 'CLP' AND ep.amount_clp IS NULL) AS has_clp_drift
FROM greenhouse_finance.expense_payments ep
WHERE ep.superseded_by_payment_id IS NULL
  AND ep.superseded_by_otb_id IS NULL
  AND ep.superseded_at IS NULL;

COMMENT ON VIEW greenhouse_finance.expense_payments_normalized IS
  'TASK-766 canonical reader. NEVER compute payment CLP via ep.amount * exchange_rate_to_clp. amount_clp is the FX-resolved canonical value at payment_date populated by recordExpensePayment (TASK-699 pattern).';
```

### Contract del helper TS

```ts
// src/lib/finance/expense-payments-reader.ts
import 'server-only'

export interface ExpensePaymentsClpSummaryFilter {
  fromDate: string
  toDate: string
  expenseType?: string
  supplierId?: string
  isReconciled?: boolean
}

export interface ExpensePaymentsClpSummary {
  totalClp: number
  totalPayments: number
  unreconciledCount: number
  supplierClp: number
  payrollClp: number
  fiscalClp: number
  driftCount: number  // payments con has_clp_drift=TRUE en el período
}

export const sumExpensePaymentsClpForPeriod = async (
  filter: ExpensePaymentsClpSummaryFilter
): Promise<ExpensePaymentsClpSummary>
```

### Contract de la lint rule

```js
// eslint-plugins/greenhouse/rules/no-untokenized-fx-math.mjs
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prohibe SQL embebido con math casero ep.amount × *_rate. Usar VIEW expense_payments_normalized o helper sumExpensePaymentsClpForPeriod (TASK-766)',
      url: 'docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md'
    }
  },
  create(context) {
    return {
      TemplateLiteral(node) {
        const sql = node.quasis.map(q => q.value.raw).join('')
        const patterns = [
          /\bep\.amount\s*\*\s*COALESCE\s*\(\s*[a-z_.]*exchange_rate_to_clp/i,
          /\bep\.amount\s*\*\s*exchange_rate_to_clp\b/i,
          /\bip\.amount\s*\*\s*COALESCE\s*\(\s*[a-z_.]*exchange_rate_to_clp/i,
          /\bip\.amount\s*\*\s*exchange_rate_to_clp\b/i
          // ... más patterns
        ]
        for (const pattern of patterns) {
          if (pattern.test(sql)) {
            context.report({
              node,
              message: 'SQL embebido multiplica ep.amount/ip.amount × *_rate (anti-patrón TASK-766). Usar VIEW expense_payments_normalized / income_payments_normalized o helper sumExpensePaymentsClpForPeriod / sumIncomePaymentsClpForPeriod.'
            })
            break
          }
        }
      }
    }
  }
}
```

### Recovery flow del incidente HubSpot CCA

Post slice 3 (cash-out migrado al helper):

1. UI `/finance/cash-out` se refresca → KPIs muestran totales correctos automáticamente (la VIEW devuelve `amount_clp` canónico para el payment HubSpot, que ya tiene `amount_clp = 1,106,321` poblado por `recordExpensePayment`).
2. Verificación manual:
   - Total pagado debe ser ≈ $11,546,493 (no $1,017,803,262).
   - Proveedores debe ser ≈ $5,321,241 (no $1,011,578,010).
   - Nómina y Fiscal sin cambio (siguen correctos).
3. SQL verification: `SELECT SUM(payment_amount_clp) FROM greenhouse_finance.expense_payments_normalized WHERE payment_date BETWEEN '2026-04-01' AND '2026-05-02';` debe dar el mismo número que el helper.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migration `task-766-expense-payments-normalized-view` aplicada; VIEW `greenhouse_finance.expense_payments_normalized` existe con columna `payment_amount_clp` canónica + flag `has_clp_drift`. Comentario SQL documenta la regla.
- [ ] Migration análoga para `income_payments_normalized` aplicada.
- [ ] Helper `sumExpensePaymentsClpForPeriod` retorna shape correcto + tests paridad SQL↔TS verdes (pinned con caso del incidente HubSpot CCA: $1,106,321 ≠ $1,007,363,090).
- [ ] Helper `sumIncomePaymentsClpForPeriod` análogo + tests verdes.
- [ ] Migration `task-766-payments-clp-amount-backfill-and-repair-flag` aplicada; `requires_fx_repair` columna existe en ambas tablas; backfill 1:1 ejecutado; índices parciales creados.
- [ ] CHECK constraint `expense_payments_clp_amount_required_after_cutover` agregado (NOT VALID + `created_at < cutover_date` clause). Idem para `income_payments`. `VALIDATE CONSTRAINT` ejecutado si drift count = 0; documentado si > 0.
- [ ] Reliability signals `expense_payments_clp_drift` + `income_payments_clp_drift` registrados en `RELIABILITY_REGISTRY`. Steady=0 verificado en producción post-deploy.
- [ ] Lint rule `greenhouse/no-untokenized-fx-math` activa en mode `error`. Tests de la rule verdes. Mensaje del error cita TASK-766 + helper canónico.
- [ ] `cash-out/route.ts` migrado al helper canónico. KPIs en UI dev/staging muestran números correctos (Total pagado ≈ $11,546,493, Proveedores ≈ $5,321,241).
- [ ] Test de regresión `cash-out/route.test.ts` pinea el caso del incidente HubSpot CCA + 2-3 escenarios adicionales (CLP→CLP, USD→CLP normal, drift NULL).
- [ ] Auditoría exhaustiva ejecutada sobre `src/app/api/`. **Cero callsites con el anti-patrón** (lint rule lo enforce; documentar count migrado).
- [ ] Endpoint admin `POST /api/admin/finance/payments-clp-repair` gated por capability `finance.payments.repair_clp`. dryRun + apply paths verdes en tests.
- [ ] Si hay payments con `requires_fx_repair=TRUE` en producción al deploy: ejecutar repair endpoint + verificar drift count = 0 post-repair.
- [ ] CLAUDE.md sección "Finance — CLP currency reader invariants (TASK-766)" agregada con diagram + reglas duras + helpers canónicos + link a la VIEW + lint rule + reliability signals.
- [ ] `GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md`, `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`, `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`, `GREENHOUSE_EVENT_CATALOG_V1.md` actualizados.
- [ ] `pnpm build` verde.
- [ ] `pnpm lint` con la rule nueva activa: 0 errors (post-migración de callsites).
- [ ] `pnpm tsc --noEmit`: 0 errors.
- [ ] `pnpm test` verde, incluidos los nuevos tests.
- [ ] `pnpm pg:doctor` sin warnings nuevos.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm build`
- `pnpm migrate:up` + `pnpm db:generate-types`
- `pnpm pg:doctor`
- Smoke en staging:
  - `/finance/cash-out` periodo 01/04/2026 - 02/05/2026 → KPIs ≈ Total $11.5M, Proveedores $5.3M, Nómina $1.4M, Fiscal $4.3M.
  - SQL `SELECT * FROM greenhouse_finance.expense_payments_normalized WHERE has_clp_drift = TRUE LIMIT 5` → 0 rows post-repair.
  - `/admin/operations` → 2 signals nuevos visibles, valor 0.
- Smoke del lint rule:
  - Crear PR de prueba con `SUM(ep.amount * COALESCE(e.exchange_rate_to_clp, 1))` en un archivo nuevo → CI bloquea con error claro.
  - Quitar el callsite, build pasa.

## Closing Protocol

- [x] `Lifecycle` del markdown sincronizado (`complete` al cerrar).
- [x] El archivo vive en la carpeta correcta (`complete/`).
- [x] `docs/tasks/README.md` sincronizado.
- [x] `Handoff.md` actualizado con resumen del cierre + diff de KPIs antes/después.
- [x] `changelog.md` con entry visible.
- [x] Chequeo de impacto cruzado: TASK-178 (Finance Budget Engine), TASK-756, TASK-664, TASK-707, TASK-484, TASK-072 — ninguna depende del anti-patrón `SUM(ep.amount × rate)`. La VIEW + helper canónicos son consumibles desde cualquier futura task de KPIs sin migración adicional.
- [x] `GREENHOUSE_EVENT_CATALOG_V1.md` con `finance.payments.clp_repaired` v1 (Delta 2026-05-03).
- [x] CLAUDE.md sección nueva "Finance — CLP currency reader invariants (TASK-766)" agregada.
- [x] ISSUE-064 creado en `docs/issues/resolved/` documentando el incidente del 2026-05-02 + resolución vía TASK-766.
- [ ] PR mergeada a `develop` (próximo paso).

## Follow-ups

- **TASK-derivada `Auditoría BigQuery` para mismo patrón** — dashboards y reports BQ probablemente comparten el anti-patrón. Slice separado por blast radius.
- **TASK-derivada Currency registry global** — extender el contrato a EUR, COP, MXN, BRL si el negocio requiere multi-tenancy multimoneda.
- **TASK-derivada Performance** — si el helper tarda > 300ms para periodos > 6 meses con muchos payments, considerar materialized view o pre-aggregated table per (period, expense_type).
- **TASK-derivada Income readers cross-domain** — `income_payments_normalized` puede ser consumido por `client_economics` (TASK-709), `revenue_dashboards`, `partner_pnl`. Auditar y migrar.
- **TASK-derivada Repair UI** — endpoint admin existe; si emerge volumen de drift recurrente, considerar UI dedicada en `/admin/finance/data-quality` para repair manual.

## Open Questions

**Resueltas pre-execution con la opción más robusta:**

- **Q1 — `income_payments.amount_clp`?** ✅ Confirmado vía SQL `\d greenhouse_finance.income_payments` — la columna existe (`numeric(14,2)`), junto con `exchange_rate_at_payment`, `fx_gain_loss_clp` y los 4 campos de 3-axis supersede. Schema idéntico a `expense_payments`. Cero migración estructural extra: las 2 VIEWS y los 2 helpers se construyen con el mismo template.

- **Q2 — Cutover_date del CHECK constraint?** ✅ `2026-05-03 00:00:00+00 America/Santiago` (post-merge TASK-766). Justificación: cualquier payment INSERTed pre-cutover queda fuera del enforcement (compatible con backfill defensivo del slice 2); cualquier INSERT post-cutover non-CLP sin `amount_clp` poblado falla a nivel DB. **`VALIDATE CONSTRAINT` se ejecuta DENTRO de la misma migration del slice 2 SOLO si `requires_fx_repair` count == 0 post-backfill** (caso esperado en producción según el escaneo del incidente). Si > 0, el `VALIDATE` se difiere a una migration posterior dentro del mismo slice (post-repair endpoint del slice 5), y la migration de validation queda pinned con el count real. Atomic: la migration que cierra el constraint es la última operación del recovery. Mismo patrón que `expense_payments_account_required_after_cutover` (TASK-708/728) usado en producción sin issues.

- **Q3 — Capability `finance.payments.repair_clp`?** ✅ Nueva granular. Reservada `FINANCE_ADMIN + EFEONCE_ADMIN`. Justificación: principio de least-privilege canónico del repo (TASK-742, TASK-765). El repair es operacionalmente análogo a `finance.payroll.rematerialize` pero opera sobre un universo distinto (FX rates históricos vs payroll expenses); compartir la capability acopla dimensiones ortogonales. La granularidad permite audit fino por `audit_events` y eventual delegación parcial (e.g. un futuro `finance.data_quality_specialist` rol con solo capabilities de repair, no de mark-paid).

- **Q4 — Lint rule mode `error` o `warn`?** ✅ **`error` desde el primer commit del slice 3.** Justificación: el patrón es contractualmente prohibido (no hay un caso legítimo donde `SUM(ep.amount × *_rate)` sea correcto post-VIEW); cualquier callsite legacy ES un bug latente equivalente al del incidente. Slice 3 entrega lint rule + migración del cash-out atómicamente — el commit que activa la rule es el mismo que migra el primer callsite. Slice 4 audita el resto del portal antes de mergear; si la rule rompe build en otros files, ese ES el output esperado (los lista exhaustivamente para migración en slice 4). Cero tolerancia a legacy en este patrón — distinto a TASK-265 (`no-untokenized-copy` en `warn`) porque allá había 318 warnings legacy aceptables; aquí cualquier hit es un risk de KPIs inflados en producción.

**Bonus — decisiones de arquitectura adicionales tomadas pre-execution:**

- **Q5 — Naming de la columna VIEW: `payment_amount_clp` vs `amount_clp`?** ✅ `payment_amount_clp` (full-qualified). Justificación: `amount_clp` raw colide con la columna persistida `expense_payments.amount_clp`; el prefix `payment_` deja explícito que es la versión post-COALESCE canónica de la VIEW (no la columna raw). Análogo: `payment_amount_native` para el original sin convertir, `payment_currency` para distinguir de `expense.currency`.

- **Q6 — VIEW filtra supersede o expone todas las filas?** ✅ Filtra supersede (excluye `superseded_by_payment_id IS NOT NULL OR superseded_by_otb_id IS NOT NULL OR superseded_at IS NOT NULL`). Justificación: ningún consumer canónico de KPIs CLP debería ver versiones superseded; mismo pattern que `fx_pnl_breakdown` (TASK-699) y `income_settlement_reconciliation` (TASK-571). Auditoría/diagnóstico de filas superseded usa la tabla raw, no la VIEW.

- **Q7 — Repair endpoint reusa secrets/Cloud Run o lo invoca via Vercel route?** ✅ Vercel route (`src/app/api/admin/finance/payments-clp-repair`). Justificación: el repair invoca `resolveExchangeRateToClp` que ya tiene caching + fallback chain; no hay razón para crossear a ops-worker (que sí necesitan crons reactivos). Cero infra nueva.

- **Q8 — ¿Backfill 1:1 (CLP→CLP) bloquea el deploy si el `UPDATE` masivo lockea la tabla?** ✅ Backfill batched + idempotente. La migration ejecuta el UPDATE en lotes via `WITH RECURSIVE` o `LIMIT/OFFSET`-style con commits intermedios (mismo pattern de TASK-708b backfill). Para producción, `expense_payments` tiene ~hundreds-to-thousands de rows CLP→CLP; el lock sería micro. Pero la práctica defensiva es batched, no row-table-lock.
