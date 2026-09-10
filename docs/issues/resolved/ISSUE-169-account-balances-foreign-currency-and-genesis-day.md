# ISSUE-169 — account_balances: cuentas en moneda extranjera sumaban CLP y el día genesis de la OTB no contaba movimientos

## Ambiente

production (Cloud SQL `greenhouse-pg-dev`, instancia única dev/staging/prod). Afecta `santander-usd-usd`,
`global-66-mxn-mxn` y cualquier instrumento no-CLP, y a toda cuenta con OTB cuyo día genesis tenga movimientos.

## Detectado

2026-09-10, al re-anclar los saldos para la recuperación de conciliación agosto–septiembre. No lo reportó un
usuario: emergió al comparar el closing materializado con el saldo final de las cartolas.

## Síntoma

| Cuenta | Materializado | Banco | Causa |
|---|---|---|---|
| `santander-usd-usd` 2026-09-04 | USD −738.623,46 (−684 M CLP) | USD 336,44 | pago de USD 788,86 (`EXP-202608-004`) sumado como 738.625 (su `payment_amount_clp`) |
| `santander-corp-clp` 2026-09-07 | 1.426.049 | 1.481.293 | el cargo APOLLO.IO del 06/08 (día genesis) no se materializó |

## Causa raíz

1. `getDailyMovementSummary` (TASK-774) resolvía todo movimiento a CLP (`payment_amount_clp`) también en cuentas
   cuya OTB y saldo viven en su moneda nativa. El detector `finance.account_balances.fx_drift` ya excluía
   explícitamente las cuentas no-CLP, así que el error era invisible.
2. `rematerializeAccountBalanceRange` sembraba el día genesis como fila estática (`insertSeedRow`, sin
   movimientos) y materializaba desde genesis+1, contradiciendo la convención TASK-703 (`genesis_date` = saldo al
   **inicio** del día).

## Impacto

Saldos de tesorería en USD/MXN inutilizables; cargos del día de cierre de ciclo TC omitidos. Sin impacto en
documentos ni en pagos (sólo en la proyección `account_balances`).

## Solución

- `toAccountUnits` en `src/lib/finance/account-balances.ts`: cuentas CLP conservan la regla TASK-774; cuentas
  no-CLP suman en su moneda (nativo si coincide; `amount_clp / rate(cuenta→CLP)` del día si no). La tasa se
  resuelve antes del resumen.
- `rematerializeAccountBalanceRange`: si el seed es el genesis de la OTB activa, materializa ese día con
  `force` (opening = OTB + movimientos del día).
- Commit `2dad8aba5` + follow-up en el mismo día. Detalle en
  `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` → «Delta 2026-09-10».

## Verificación

Rematerialización de las 9 cuentas desde genesis y comparación contra `meta.closingBalance` de cada cartola:
Global66 CLP 31/08 = 16.468 exacto; Santander USD = 1,29 + 335,15 (fila pendiente de clasificar); TC 07/09 =
1.481.293 tras el ancla 06/08. Tests focales `src/lib/finance/__tests__/account-balance-evidence-guard.test.ts`
y `bank-statements/__tests__/adapters.test.ts` en verde.

## Estado

resolved (2026-09-10). Pendiente de follow-up: extender `finance.account_balances.fx_drift` a cuentas no-CLP
(hoy `a.currency = 'CLP'`), para que el detector cubra el caso que dejó pasar.

## Relacionado

TASK-703 (OTB), TASK-774 (CLP-equivalent), TASK-938 (genesis floor), delta 2026-09-10 en
`GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`.
