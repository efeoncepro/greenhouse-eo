# Saldos de cuenta y consistencia FX (CLP equivalente)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-03 por Claude (TASK-774 close-out)
> **Ultima actualizacion:** 2026-05-09
> **Documentacion tecnica:**
> - Spec arquitectonica: [GREENHOUSE_FINANCE_ARCHITECTURE_V1 — Delta TASK-774](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md#delta-2026-05-03--task-774-account-balances-fx-consistency-extiende-task-766)
> - Tasks: [TASK-774 — Account Balance CLP-Native Reader Contract](../../tasks/complete/TASK-774-account-balance-clp-native-reader-contract.md) · [TASK-842 — Finance FX Drift Auto-Remediation Control Plane](../../tasks/complete/TASK-842-finance-fx-drift-auto-remediation-control-plane.md) · [TASK-766 — Finance CLP Currency Reader](../../tasks/complete/TASK-766-finance-clp-currency-reader-contract.md)
> - Documentacion relacionada: [Monedas y Tipos de Cambio](monedas-y-tipos-de-cambio.md) · [Conciliacion bancaria](conciliacion-bancaria.md)

## Para que sirve

Cuando una cuenta CLP (por ejemplo TC Santander Corp) recibe un pago en moneda extranjera (USD, EUR), el saldo de la cuenta debe rebajarse por el **equivalente en pesos chilenos al momento del pago**, no por el monto USD original. Este contrato canonico garantiza que `/finance/bank` y todos los reportes de tesoreria muestren saldos en CLP correctos sin importar el mix de monedas en los movimientos.

## El problema que resuelve

**Caso real Figma EXP-202604-008 (2026-05-03)**: el equipo pago una factura de Figma por USD $92,90 desde la TC Santander Corp (cuenta CLP). El saldo de la TC se rebajo por $92,90 (USD nativo) en lugar de $83.773,5 (CLP equivalente). Diferencia: $83.680 — un error de 88x.

Por que ocurrio: el motor que materializa los saldos diarios sumaba `payment.amount` directo sin distinguir si ese amount venia en USD o CLP. Para cuentas CLP que reciben pagos USD, eso significa restar centavos USD de un saldo CLP.

Mismo anti-patron sistemico que TASK-766 cerro para los KPIs del dashboard `/finance/cash-out` en mayo 2026 (cuando un payment de HubSpot CCA inflaba KPIs en mil millones), pero quedo vivo en el path de saldos de cuenta hasta TASK-774.

## Como funciona ahora

### El contrato canonico

Los saldos de cuenta se computan a partir de **3 fuentes** de movimientos:

1. **Settlement legs** (`greenhouse_finance.settlement_legs`) — el canal canonico que registra cada pierna de un settlement multi-cuenta.
2. **Income payments** (`greenhouse_finance.income_payments`) — pagos recibidos de clientes que aun no estan vinculados a un settlement leg.
3. **Expense payments** (`greenhouse_finance.expense_payments`) — pagos hechos a proveedores/empleados que aun no estan vinculados a un settlement leg.

Para las 3 fuentes, el motor lee el **equivalente CLP** del movimiento, no el monto en moneda original:

- Para `income_payments` y `expense_payments`: lee desde las VIEWs canonicas `*_normalized` (TASK-766) que ya exponen `payment_amount_clp` con un fallback inteligente:
  - Si la fila tiene `amount_clp` persistido (resuelto al momento del pago), usa ese valor.
  - Si no lo tiene pero la moneda del pago es CLP, usa el `amount` directo.
  - Si no tiene `amount_clp` y la moneda no es CLP, marca la fila como `has_clp_drift = TRUE` (un signal lo detecta).
- Para `settlement_legs`: aplica el mismo fallback inline (`COALESCE(sl.amount_clp, CASE WHEN currency='CLP' THEN amount END)`). Settlement_legs ya tiene la columna `amount_clp` opcional desde abril 2026.

### Que pasa si algo sale mal

Hay un detector automatico en `/admin/operations` llamado `finance.account_balances.fx_drift`:

- **En verde (steady state = 0)**: todos los saldos persistidos coinciden con el recompute esperado desde las VIEWs canonicas. Tolerancia $1 CLP (anti-noise de redondeo de punto flotante).
- **En rojo (count > 0)**: alguno de los saldos materializados de los ultimos 90 dias diverge mas de $1 CLP del recompute. Eso indica que el materializer corrio antes del fix TASK-774 o emergio un nuevo callsite que reintroduce el anti-patron.

Cuando el detector se prende:

1. `ops-finance-rematerialize-balances` recompone la ventana rolling diaria con el seed correcto.
2. `ops-finance-fx-drift-remediate` corre después y consume el detector detallado. Si el drift es elegible, rematerializa con `rematerializeAccountBalanceRange`, revalida el detector y deja auditoría en `source_sync_runs`.
3. Si el drift toca un periodo cerrado, snapshot aceptado/reconciliado o excede límites, el control plane **no lo oculta**: lo deja bloqueado/accionable para revisión financiera.
4. Para diagnóstico manual:
   ```bash
   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
     scripts/finance/diagnose-fx-drift.ts
   ```
5. Para recovery manual controlado, usar el wrapper canónico. Por defecto es dry-run; live requiere `--apply`:
   ```bash
   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
     scripts/finance/backfill-account-balances-fx-fix.ts \
     --account-id=<id-de-la-cuenta> \
     --from-date=2026-04-01 \
     [--to-date=2026-05-03] \
     [--dry-run | --apply]
   ```
   Idempotente y auditado — re-correrlo no duplica efectos.

### Defensas contra futuros bugs similares

Esta capa esta protegida por **3 defensas en profundidad**:

1. **Lint rule mecanica** (`greenhouse/no-untokenized-fx-math` modo error desde commit-1): cualquier nuevo SQL que escriba `SUM(ep.amount)`, `SUM(ip.amount)` o `SUM(sl.amount)` sin pasar por la VIEW canonica o COALESCE con `amount_clp` rompe el build.
2. **Reliability signal automatico**: `finance.account_balances.fx_drift` detecta divergencias en runtime antes de que un humano las reporte como bug.
3. **Control plane autocorrectivo**: `ops-finance-fx-drift-remediate` repara drift elegible antes de que Playwright lo encuentre, y bloquea lo que requiere revisión.
4. **Override block explicito** en `eslint.config.mjs`: solo los readers canonicos (`expense-payments-reader.ts`, `income-payments-reader.ts`) tienen permiso de bypass para los patrones, y solo porque definen la VIEW misma.

## Que NO hacer

- **NUNCA** agregues un nuevo materializer (treasury_position, cashflow_summary, account_balances_monthly_v2, etc.) que sume `payment.amount` directo. Usar siempre las VIEWs canonicas TASK-766.
- **NUNCA** sumes `settlement_legs.amount` sin envolverlo en el COALESCE con `amount_clp`. Settlement_legs hereda monedas mixtas.
- **NUNCA** "limpies" filas con drift haciendo DELETE manual del registro `account_balances` afectado. Usar el control plane o el wrapper de backfill (idempotente, audit trail completo).
- **NUNCA** relajes `evidenceGuard` a `off` para saldos bancarios; el wrapper TASK-842 lo rechaza. Para bug class conocido usar policy explícita y auditoría.
- **NUNCA** asumas que el `payment.currency` es igual al `account.currency`. Las cuentas CLP reciben pagos USD frecuentemente (caso CCA TASK-714c, payments Deel/Adobe/Figma USD pagados desde TC CLP).

## Quien puede operar esto

| Capacidad | Quienes |
|---|---|
| Ver saldos en `/finance/bank` | Cualquier rol con acceso al modulo Finance |
| Ver el reliability signal `account_balances.fx_drift` en `/admin/operations` | Roles con `efeonce_admin` o `finance_admin` |
| Ejecutar el control plane manual o wrapper de backfill | Solo developers/operators con acceso a Cloud Run/Cloud SQL y criterio financiero |
| Modificar el materializer (`account-balances.ts`) | Solo desarrolladores backend siguiendo el patron canonico (PR review obligatorio) |

## Problemas comunes

- **"El saldo de mi cuenta no cuadra con el extracto del banco"** — primero revisa si hay drift activo en `/admin/operations` -> Finance Data Quality. Si esta en verde, el problema NO es FX (probablemente es una conciliacion pendiente o un payment sin settlement leg). Si esta en rojo, revisa el ultimo run `finance/account_balances_fx_drift_remediation` en `source_sync_runs`.
- **"Acabo de pagar algo en USD desde una cuenta CLP y el saldo bajo el monto USD, no el CLP"** — eso ES exactamente el bug que TASK-774 cerro. Si lo ves en post-deploy, es un bug nuevo (regresion). Reporta inmediatamente.
- **"El cron rematerializa los ultimos 7 dias y deja stale los anteriores"** — TASK-842 cubre drift residual dentro de 90 dias con remediation bounded. Si queda bloqueado, requiere revisión financiera o wrapper manual con policy explícita.

## Referencias tecnicas

- Helper interno: `getDailyMovementSummary` en `src/lib/finance/account-balances.ts:609`
- Funcion publica: `materializeAccountBalance` en `src/lib/finance/account-balances.ts:862`
- Rematerializer: `rematerializeAccountBalanceRange` en `src/lib/finance/account-balances-rematerialize.ts:186`
- VIEWs canonicas: `greenhouse_finance.expense_payments_normalized` + `income_payments_normalized` (migration `20260503014708344` + `20260503110610829`)
- Reader del signal: `src/lib/reliability/queries/account-balances-fx-drift.ts`
- Command de remediation: `src/lib/finance/account-balances-fx-drift-remediation.ts`
- Endpoint ops-worker: `POST /finance/account-balances/fx-drift/remediate`
- Script de backfill: `scripts/finance/backfill-account-balances-fx-fix.ts`
- Lint rule: `eslint-plugins/greenhouse/rules/no-untokenized-fx-math.mjs`
- E2E smoke test: `tests/e2e/smoke/finance-account-balances-fx-drift.spec.ts`
