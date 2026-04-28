# Runbook — Shareholder Reimbursable Expense (TASK-714c)

> **Tipo de documento:** Runbook operativo
> **Version:** 1.0
> **Creado:** 2026-04-28 por Claude Opus 4.7
> **Spec related:** [`TASK-714c`](../../tasks/to-do/TASK-714c-shareholder-reimbursable-expense-canonical-runtime.md)

## Cuándo invocar este runbook

Cuando un accionista paga una factura/recibo de un proveedor desde su tarjeta personal o cuenta personal, y la empresa le reembolsa el monto vía transferencia bancaria. Casos canónicos: HubSpot trimestral, Deel mensual a contractors, suscripciones SaaS individuales.

**NO invocar cuando**:

- La empresa pagó directamente con la tarjeta corporativa.
- El gasto NO está vinculado a un proveedor externo (e.g. compensación accionista, dividendos).
- Falta evidencia documental (recibo / factura).

## Pre-flight

- [ ] Tener el recibo / factura del proveedor (PDF, monto, moneda, fecha de pago real).
- [ ] Saber el último dígito de la tarjeta personal usada (para audit).
- [ ] Conocer la fecha en que la empresa transfirió el reembolso al accionista (cartola Santander).
- [ ] Cloud SQL Proxy en `127.0.0.1:15432`.
- [ ] Cuenta CCA del accionista existe (`accounts.instrument_category='shareholder_account'`).
- [ ] El monto reembolsado en CLP coincide con la transferencia bancaria al RUT del accionista.

## Modos del script

### Modo A — `--link-existing-expense`

El expense ya existe en la BD (típicamente sync de Nubox importó la factura electrónica chilena). Solo crea el `expense_payment` cargado al CCA.

```bash
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/finance/record-shareholder-reimbursable-expense.ts \
  --link-existing-expense EXP-NB-22793816 \
  --shareholder-account sha-cca-julio-reyes-clp \
  --reimbursement-date 2025-09-XX \
  --reference "transferencia-santander-XXXXX" \
  --apply
```

### Modo B — `--create-new-expense` (por defecto si no usas `--link-existing-expense`)

El expense NO existe (recibo USD del proveedor extranjero, no entró por Nubox). Crea expense + expense_payment atómicamente.

```bash
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/finance/record-shareholder-reimbursable-expense.ts \
  --supplier-id sup-XXXXXXXX \
  --document-number 46679051 \
  --document-date 2026-04-25 \
  --currency USD \
  --amount-original 1215.00 \
  --amount-clp-paid 1106321 \
  --card-last-four 1879 \
  --shareholder-account sha-cca-julio-reyes-clp \
  --reimbursement-date 2026-04-27 \
  --description "HubSpot — Marketing Hub Starter + Sales Hub Pro + Service Hub Pro + Data Hub Starter (período 28/02/2026 - 28/05/2026)" \
  --period-year 2026 --period-month 4 \
  --recurrence quarterly \
  --apply
```

## Reglas duras

1. **NUNCA** mover el cash al CCA. El cash siempre vive en la cuenta bancaria real (Santander CLP). El CCA refleja la deuda bilateral entre empresa y accionista.
2. **NUNCA** crear un `internal_transfer` sintético desde Santander hacia el CCA. La transferencia bancaria real ya existe en `bank_statement_rows` (cuando la cartola está importada) y emerge automáticamente como settlement_leg.
3. **NUNCA** manipular `account_balances` por UPDATE manual. Después del INSERT de expense + expense_payment, re-correr `rematerializeAccountBalancesFromDate` (el script lo hace automáticamente).
4. **`expense_type='supplier'`** — NO `tool` ni `direct_member`. Tools SaaS pagados al proveedor van como supplier (siguiendo precedente).
5. **`cost_category='operational'`, `direct_overhead_scope='shared'`** para tools usadas por toda la empresa. Si es atribuible a un cliente específico, ajustar `allocated_client_id` (no implementado en V1).
6. El monto del `expense_payment` SIEMPRE en CLP (la moneda del CCA). El expense puede estar en USD/EUR/etc. (moneda del recibo); el `exchange_rate_to_clp` refleja el rate efectivo de la tarjeta del accionista (incluye spread).

## Convención de identidad

- `expense_id`: `EXP-SHA-<document_number>` (e.g. `EXP-SHA-46679051`).
- `payment_id`: `exp-pay-sha-<document_number>-<8 hex>` (auto-generado).
- `description`: incluye proveedor + período de servicio + nota de tarjeta personal + reembolso vía CCA.
- `notes`: TASK-714c + monto USD/CLP + rate efectivo + cuenta CCA + fecha reembolso.

## Verificación post-apply

El script imprime los últimos 5 días del CCA. Verifica:

- El día del `--reimbursement-date` muestra `period_outflows = X` (aporte del accionista) AND `period_inflows = X` (reembolso vía Santander). Si no aparece el inflow, la transferencia Santander → CCA aún no se materializó como settlement_leg — revisar reconciliación bancaria.
- El `closing_balance` después del reembolso refleja exactamente la deuda real pendiente con el accionista.

## Casos pendientes (a 2026-04-28)

| Expense | Monto | Estado | Acción requerida |
|---|---|---|---|
| `EXP-SHA-46679051` | $1,215 USD ($1,106,321 CLP) | ✅ Aplicado 2026-04-28 | — |
| `EXP-NB-22793816` | $1,175,488 CLP (factura HubSpot agosto 2025) | ⏳ Pendiente confirmación fecha de reembolso real | El operador debe confirmar la fecha exacta de la transferencia Santander → Julio que reembolsa este expense. Búsqueda automática no encontró match (puede ser pre-OTB y absorbido en opening, o monto distinto por consolidación con otros pagos). |

## Anti-patterns

- **NO** crear el reembolso como `internal_transfer` adicional si la cartola ya tiene el movimiento. Eso doblaría el cash.
- **NO** cambiar `expense.payment_status` manualmente. El trigger `fn_sync_expense_amount_paid` lo deriva del `SUM(expense_payments.amount)`.
- **NO** usar este runbook para gastos que la empresa pagó directamente. Solo aplica al patrón "accionista financia con tarjeta personal y la empresa reembolsa".
- **NO** crear el `expense_payment` con `payment_account_id=Santander`. Eso registra el cash en la cuenta operativa, no la deuda con el accionista.

## Cuándo migrar a una factory canónica

Trigger para promover este runbook a factory canónica (TASK-714c implementación):

- 3+ aplicaciones del runbook en un trimestre.
- O 1 caso ambiguo (e.g. monto reembolsado ≠ monto pagado, partial reimbursement).
- O necesidad de UI dedicada (sección "Adelantos pendientes" en el drawer del CCA).

Hasta entonces, el script + este runbook cubren el caso end-to-end.
