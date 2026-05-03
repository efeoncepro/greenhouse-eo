# TASK-774 — Account Balance CLP-Native Reader Contract (TASK-766 pattern aplicado a materializeAccountBalance)

## Delta 2026-05-03 — 6 slices entregados

- **Slice 1 (Audit)**: discovery completo via 2 subagentes Explore en paralelo. Bug confirmado en `getDailyMovementSummary` (helper interno de `materializeAccountBalance`) lineas 609-700: sumaba directo `ip.amount`, `ep.amount`, `sl.amount` sin distinguir currency vs `amount_clp`. 3 fuentes afectadas (no 2 como spec original asumia — settlement_legs tambien tiene `amount_clp` opcional).
- **Slice 2 (Refactor canonico)**: `getDailyMovementSummary` reemplazado para consumir VIEWs canonicas TASK-766 (`expense_payments_normalized`, `income_payments_normalized`) y COALESCE inline para settlement_legs. Sin schema change. Backwards compat total. Verificacion: tsc clean, 831/831 finance+reliability tests passing.
- **Slice 3 (Lint rule extendida)**: `no-untokenized-fx-math` + 3 patrones nuevos (`SUM(ep.amount)`, `SUM(ip.amount)`, `SUM(sl.amount)`) modo `error` desde commit-1. RuleTester tests cubren 3 valid + 3 invalid casos.
- **Slice 4 (Reliability signal)**: `finance.account_balances.fx_drift` (kind=drift, steady=0, ventana 90 dias, tolerancia $1 CLP). Reader compara `closing_balance` persistido vs recompute desde VIEWs + COALESCE settlement_legs. 5 tests passing. Wire-up al composer get-reliability-overview.
- **Slice 5 (Backfill script)**: `scripts/finance/backfill-account-balances-fx-fix.ts` (CLI args, dry-run, idempotente via `rematerializeAccountBalanceRange` con seedMode='active_otb'). Cron diario `ops-finance-rematerialize-balances` cubre auto los ultimos 7 dias.
- **Slice 6 (Docs + verificación E2E)**: CLAUDE.md sección extendida "Finance — Account balances FX consistency (TASK-774, extiende TASK-766)" con 4 reglas duras nuevas + Delta en arch doc `GREENHOUSE_FINANCE_ARCHITECTURE_V1` + doc funcional `docs/documentation/finance/account-balances-fx-consistency.md` + E2E smoke spec.

**Decisiones arquitectónicas resueltas pre-execution (Open Questions)**:

- **Q1 (¿hay otros account_balances afectados?)** → Resolución: signal dinámico `finance.account_balances.fx_drift` con ventana 90 dias. Steady=0 post-backfill.
- **Q2 (outbox event `account_balance.refixed`?)** → Resolución: NO crear. Reactive consumer ya escucha `account_balance.materialized` (genérico).
- **Q3 emergente (settlement_legs VIEW vs COALESCE inline?)** → Resolución: COALESCE inline. 1 callsite, YAGNI.

## Status

- Lifecycle: `complete` (deployed 2026-05-03)
- Lifecycle (legacy): `in-progress`
- Priority: `P0`
- Impact: `Crítico` (KPIs banco/treasury inflados/deflados por mix moneda)
- Effort: `Medio (4-6h)`
- Type: `data-integrity`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop` (instrucción explícita)

## Summary

Aplicar el patrón canónico TASK-766 (`expense_payments_normalized` VIEW + helper canónico `payment_amount_clp` con COALESCE chain) al path **`materializeAccountBalance`** que computa `account_balances` a partir de `expense_payments`/`income_payments`. Bug detectado 2026-05-03 post-TASK-773: el balance de Santander Corp creció solo +$92.9 (USD nativo) en lugar de +$83.773.5 (equivalente CLP) tras el pago de Figma — el materializer está sumando `payment.amount` sin distinguir currency vs `amount_clp`.

## Why This Task Exists

**Incidente runtime detectado 2026-05-03 (TASK-773 followup)**: tras drenar el outbox via Cloud Scheduler nuevo, `account_balances` para `santander-corp-clp` (cuenta CLP) rematerializó el cargo del payment Figma con valor $92.9 en lugar de $83.773.5. La diferencia es exactamente el `payment_amount_native` (USD) vs el `payment_amount_clp` (FX-resolved). 

```text
Pre-payment closingBalance:  1,141,273
Post-payment closingBalance: 1,141,365.9   ← +$92.9 (WRONG, USD nativo)
Expected:                    1,225,046.5   ← +$83,773.5 (CLP equivalente)
```

Causa: `materializeAccountBalance` (`src/lib/finance/account-balances.ts:862`) lee `expense_payments.amount` directo sin pasar por la VIEW canónica TASK-766 `expense_payments_normalized` que ya resuelve correctamente `payment_amount_clp = COALESCE(amount_clp, CASE WHEN currency='CLP' THEN amount END)`. Es **el mismo anti-patrón que TASK-766 ya cerró** para `cash-out` KPIs — pero quedó vivo en el path account_balances.

Costo de no resolverlo:
- Treasury balances en banco/TC con valores incorrectos cuando hay payments USD pagados desde cuentas CLP (caso CCA TASK-714c, payments Deel internacionales, Figma/Adobe SaaS).
- Reconciliación banco-vs-statement falla silenciosamente.
- Decisiones de tesorería (cuándo pagar, cuándo factorar) basadas en datos incorrectos.

## Goal

- `materializeAccountBalance` consume **exclusivamente** la VIEW canónica `expense_payments_normalized` (idem para income).
- Mismo `payment_amount_clp` se usa en todos los consumers (cash-out, cash-in, account_balances, FX P&L).
- Lint rule `greenhouse/no-untokenized-fx-math` extendida para detectar el patrón roto en este path (si emerge cualquier callsite `expense_payments.amount * X` en archivos account-balances).
- Reliability signal `finance.account_balances.fx_drift` que detecta divergencias entre `account_balances.closing_balance_clp` y la suma agregada esperada desde la VIEW canónica.
- Backfill defensivo del histórico afectado (rematerialización account_balances afectados desde la fecha del primer payment USD-en-CLP-account).

## Architecture Alignment

- `docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md` — patrón canónico
- `docs/tasks/complete/TASK-699-fx-pnl-canonical.md` — VIEW pattern
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — finance dual-store

Reglas obligatorias:
- NUNCA leer `expense_payments.amount * exchange_rate_to_clp` en account_balances. Usar `payment_amount_clp` desde la VIEW.
- VIEW canónica `expense_payments_normalized` es la única fuente para CLP-equivalent de un payment.
- Mantener backwards-compat con consumers existentes (drift detection signal, no breaking change).

## Scope

### Slice 1 — Audit + diagnóstico exacto

- `src/lib/finance/account-balances.ts:materializeAccountBalance` — leer SQL inline + identificar cada `expense_payments.amount` o `income_payments.amount` que se multiplica/suma sin pasar por `payment_amount_clp`.
- Mapear todos los callsites afectados.
- Tests anti-regresión que reproduzcan el bug Figma exacto (input: payment USD $92.9 en cuenta CLP, expected closing balance: +$83.773.5, actual current: +$92.9).

### Slice 2 — Refactor materializer al contract canónico

- Reemplazar JOIN directo a `expense_payments` por `expense_payments_normalized`.
- Usar `payment_amount_clp` (no `amount`) en SUM(...) para `period_outflows`/`period_inflows`.
- Mantener acceso a `payment_amount_native` cuando se necesite distinguir currency original (FX P&L breakdown).
- Mismo refactor en path income_payments si tiene patrón análogo.

### Slice 3 — Lint rule extendida

- Extender `eslint-plugins/greenhouse/rules/no-untokenized-fx-math.mjs` con patrones nuevos:
  - `expense_payments.amount` en archivos NO-canonical-readers
  - `SUM(ep.amount)` en account-balances*, fx-pnl*, etc.
- Override block para callsites legítimos (la VIEW interna).
- Mode `error` desde commit-1 (cero tolerancia).

### Slice 4 — Reliability signal `finance.account_balances.fx_drift`

- Reader `src/lib/reliability/queries/account-balances-fx-drift.ts`:
  - Compara para cada (account_id, balance_date) el `closing_balance_clp` persistido vs el SUM esperado desde `expense_payments_normalized`.
  - Steady=0.
  - Severity `error` si delta > $1 CLP (tolerancia FP minima).
- Wire-up en composer.

### Slice 5 — Backfill rematerialización

- Script `scripts/finance/backfill-account-balances-fx-fix.ts`:
  - Identifica account_balances afectados (al menos santander-corp-clp).
  - Llama a `rematerializeAccountBalancesFromDate` post-fix.
  - Idempotente, dry-run mode.
- Verificación end-to-end E2E con Playwright + Chromium contra staging:
  - `/finance/bank` muestra TC Santander Corp con balance correcto.
  - Periodo abril `closingBalance` = $1.225.046.5 esperado.

### Slice 6 — Docs + cierre

- CLAUDE.md sección extendida "Finance — CLP currency reader contract (TASK-766+774)".
- Arch docs Delta.
- Closing protocol completo + Playwright verification en vivo.

## Out of Scope

- NO refactorizar el path income_payments si NO está afectado (verificar primero).
- NO cambiar el schema de `account_balances` ni `expense_payments`.
- NO migrar el VIEW canónica a un materialized view (out of scope; futuro followup).

## Acceptance Criteria

- [ ] `materializeAccountBalance` consume `expense_payments_normalized` para CLP-equivalents
- [ ] Bug Figma resuelto: balance Santander Corp post-fix muestra $1.225.046.5 (no $1.141.365.9)
- [ ] Lint rule extendida con override block y mode `error`
- [ ] Reliability signal `finance.account_balances.fx_drift` en steady=0 post-backfill
- [ ] Backfill ejecutado en staging + producción
- [ ] E2E Playwright verifica `/finance/bank` con valores correctos
- [ ] CLAUDE.md actualizado con regla canónica
- [ ] Patrón replicable a futuros readers FX-sensitive

## Verification

- `pnpm test` full suite verde
- `pnpm lint` 0 errors
- `pnpm tsc --noEmit` clean
- `pnpm staging:request '/api/finance/bank/santander-corp-clp' --pretty` muestra `closingBalance: 1225046.5` (period abril)
- `pnpm playwright test tests/e2e/smoke/finance-bank-fx-correctness.spec.ts` (nuevo) verde
- Reliability `/admin/operations` muestra `finance.account_balances.fx_drift = 0`

## Follow-ups

- TASK derivada: si emerge mismo patrón en otros materializers (FX P&L, intelligence summaries), aplicar mismo fix.
- Considerar promover lint rule a CI step bloqueante para ALL files FX-sensitive después de 1 sprint adopción.

## Open Questions

- (Q1) ¿Hay otros account_balances ya afectados en producción? Verificar con SQL ad-hoc + reliability signal post-deploy.
- (Q2) ¿Se debe dispatch un evento `account_balance.refixed` al outbox tras backfill para downstream consumers (snapshots, reconciliation)? Decisión pre-execution.
