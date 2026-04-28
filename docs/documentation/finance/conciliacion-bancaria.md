# Conciliación bancaria

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-04-27 por Claude Opus 4.7 + Julio Reyes
> **Ultima actualizacion:** 2026-04-28 por Claude Opus 4.7 (TASK-715 archive-as-test UX)
> **Documentacion tecnica:** [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md), [TASK-702](../../tasks/in-progress/TASK-702-bank-reconciliation-canonical-anchors-rematerialize.md), [TASK-715](../../tasks/complete/TASK-715-reconciliation-test-period-archive-ux.md)

## Qué es

La conciliación bancaria es el proceso por el cual cada movimiento que aparece en una cartola bancaria queda enlazado a un objeto canónico de Greenhouse (factura cobrada, gasto pagado, traspaso interno, retención de impuesto, fee bancaria, cuota de crédito, nómina pagada). Cuando todo movimiento del banco está enlazado, los saldos que muestra Greenhouse cuadran exactamente con los saldos del banco real.

> Detalle técnico: el motor de saldos diarios vive en `src/lib/finance/account-balances.ts` (`materializeAccountBalance`). El re-materializador idempotente está en `src/lib/finance/account-balances-rematerialize.ts`.

## Por qué importa

Sin conciliación, los saldos en Greenhouse pueden desviarse del banco real por dos razones:

1. **Cobros que entraron al banco pero no quedaron registrados como cobro** (ej. el factoring de un cliente, una venta de divisas, un excedente que devuelve un factoring provider).
2. **Pagos que salieron del banco pero no quedaron registrados como gasto** (ej. impuestos al SII, cuotas de crédito, transferencias a colaboradores, cargos automáticos a la tarjeta de crédito).

Cuando el saldo del sistema no cuadra con el banco, todos los reportes downstream (P&L, runway, cost attribution por cliente, dashboard de finanzas) están desviados.

## Cómo funciona — los 4 estados de cada movimiento bancario

Cada fila de la cartola del banco cae en una de 4 categorías:

| Estado | Significado | Acción |
|---|---|---|
| **A — Ya correcto** | Existe un payment en Greenhouse con monto, cuenta y fecha que coinciden, anclado a un objeto canónico | Solo emparejar (matchear bank_statement_row con el payment existente) |
| **B — Phantom + canónico co-existen** | El bank row tiene 2+ payments en sistema: uno phantom generado por Nubox sin payment_account_id, otro canónico (factoring, manual, etc.) | Preservar el canónico, marcar el phantom como `superseded_by_payment_id` (no se elimina, queda audit) |
| **C — Falta** | Bank row no tiene contraparte en Greenhouse | Crear el payment con su anchor canónico (ver factories abajo) |
| **D — Sobra** | Greenhouse tiene un payment que NO está en banco | No tocar la fila bancaria. Investigar si fue payment a otra cuenta o test |

> Detalle técnico: la matriz de clasificación se ejecuta en `scripts/finance/conciliate-march-april-2026.ts` para el período de marzo+abril 2026. El árbol de decisión está en el helper `preflight-bank-row.ts` (futuro: integración a la UI `/finance/reconciliation`).

## Cómo se ancla cada movimiento

Cada `expense_payment` (o `income_payment`) debe tener un anchor canónico. **Nunca se crea un payment huérfano** porque eso rompe los cálculos de cost attribution per cliente, las nóminas, las herramientas, los créditos.

Los anchors disponibles son:

| Anchor (columna en `expenses`) | Apunta a | Cuándo se usa |
|---|---|---|
| `payroll_entry_id` | `greenhouse_payroll.payroll_entries(entry_id)` | Pagos de nómina (sueldo, bonos, finiquito) por colaborador y período |
| `payroll_period_id` | `greenhouse_payroll.payroll_periods(period_id)` | Componentes Previred (AFP, salud, mutual) agregados por período |
| `tool_catalog_id` | `greenhouse_ai.tool_catalog(tool_id)` | Cargos a tooling: Vercel, Adobe, Notion, Claude.ai, etc. |
| `loan_account_id` | `greenhouse_finance.loan_accounts(loan_id)` | Cuotas mensuales de créditos |
| `supplier_id` | `greenhouse_core.suppliers(supplier_id)` | Pagos a proveedores recurrentes (Beeconta, Flick) |
| `tax_type` + `tax_period` | (sin tabla canónica todavía) | Impuestos al SII (F29, F22, IVA, PPM) |
| `linked_income_id` | `greenhouse_finance.income(income_id)` | Notas de crédito, refunds, factoring proceeds |

> Detalle técnico: las FK constraints están definidas en la migración `20260427194307630_task-702-finance-canonical-anchors-and-supersede.sql`. Los helpers TS para crear payments anchored viven en `src/lib/finance/payment-instruments/anchored-payments.ts`.

## Settlement groups — cuando un movimiento bancario tiene varios legs

Algunos movimientos bancarios son parte de una operación más compleja con múltiples legs. Para esos casos se usa `settlement_groups` con `settlement_legs`:

| Tipo de operación | Modo | Legs |
|---|---|---|
| **Traspaso interno** (Santander CLP → TC, Santander CLP → Global66) | `internal_transfer` | leg outgoing en source + leg incoming en destination |
| **Conversión FX** (Santander USD → Santander CLP) | `fx_conversion` | leg outgoing USD + leg incoming CLP + tipo de cambio |
| **Pago internacional vía Global66** (CLP → Global66 → IBAN España/Colombia) | `mixed` | leg internal_transfer CLP → Global66 + leg payout en moneda destino + leg gateway_fee (FX cost) + expense kind=payroll anclado a `payroll_entry_id` |
| **Pago Previred multi-componente** ($276k = AFP Valentina + AFP Humberly + salud Daniela + ...) | `mixed` | 1 leg outgoing CLP → Previred + N legs incoming a Previred wallet + N expense_payments individuales anclados a `payroll_entry_id` y `social_security_type` |

> Detalle técnico: la tabla `settlement_groups` y `settlement_legs` viven en migración `20260408103211338_finance-reconciliation-ledger-orchestration.sql`. Las factories TS están en `anchored-payments.ts` (`createInternalTransferSettlement`, `createFxConversionSettlement`, `createPreviredSettlement`, `createInternationalPayrollSettlement`).

## Phantoms — qué son y cómo se manejan

Un **phantom** es un payment generado por el sync de Nubox que no tiene `payment_account_id`. Eso ocurre porque Nubox sabe que la factura fue pagada pero no sabe a qué cuenta del banco entró el dinero. Cuando un phantom co-existe con un payment canónico (registrado manualmente o por la operación de factoring), tenemos doble contabilización.

Solución canónica: marcar el phantom con `superseded_by_payment_id` apuntando al canónico, sin eliminarlo. El trigger `fn_sync_expense_amount_paid` y la función `fn_recompute_income_amount_paid` excluyen automáticamente del SUM las filas con esta columna no-null. La fila phantom queda preservada para audit.

> Detalle técnico: `supersedeIncomePhantom()` y `supersedeExpensePhantom()` en `src/lib/finance/payment-instruments/supersede.ts`. Migración que agregó las columnas: `20260427194307630`.

## Casos especiales que vimos en el período marzo-abril 2026

### Factoring X Capital (Xepelin)

X Capital paga el `advance_amount` (monto neto después de fee) directo a Santander CLP. La fee queda registrada como costo financiero en `factoring_operations.fee_amount` (descompuesta en `interest_amount + advisory_fee_amount`). El income payment es de tipo `factoring_proceeds`.

Cuadre canónico (ver `income_settlement_reconciliation`): `amount_paid = SUM(income_payments cash) + SUM(factoring_operations.fee_amount WHERE status='active') + withholding_amount`.

### Factoring CHITA SpA

Patrón distinto a X Capital: CHITA paga al cliente final (ej. Gobierno Regional GORE) y nos transfiere el neto inicialmente. Después CHITA cobra al cliente final y, si el fee real fue menor al proyectado, devuelve el excedente. Ese excedente se modela como un `income_payment` adicional con `payment_source='factoring_proceeds'` sobre el mismo income GORE.

> Pendiente: extensión canónica de `factoring_operations.excedente_refund_amount` + actualización de la VIEW `income_settlement_reconciliation` (TASK-702 follow-up).

### Pago internacional vía Global66

Cuando le pagamos nómina a un colaborador en España o Colombia, el flujo es:

```
Santander CLP → (transferencia interna) → Global66 CLP → (FX) → IBAN/cuenta destino
```

3+ legs en un mismo `settlement_group`:
1. Outgoing CLP del Santander
2. Incoming CLP en Global66 (es la misma transferencia, lado opuesto)
3. Outgoing en moneda local (EUR/COP) hacia el beneficiario
4. Outgoing en CLP por la fee FX que cobra Global66

El `expense_payment` anclado al `payroll_entry_id` registra el costo CLP de la nómina. La fee FX queda como `expense kind=gateway_fee`.

### Reverso de un envío Global66

Cuando un envío internacional falla en la plataforma del proveedor (ej. el banco destino rechaza el IBAN), Global66 retorna el monto a la wallet. Ese movimiento se modela como un leg adicional al settlement_group original con `provider_status='cancelled'`. La conciliación posterior usa el monto neto (lo que efectivamente le llegó al colaborador).

### Tarjeta de crédito Santander Corp

Cada compra a tooling (Vercel, Adobe, Notion, etc.) se modela como `expense kind=miscellaneous` con `tool_catalog_id` apuntando al subscription canónico. Los pagos a la TC desde Santander CLP son `internal_transfer` (no expense_payments — son cancelación de deuda interna).

Notas de crédito (refunds): se modelan como expense_payment con monto **negativo** apuntando al mismo `tool_catalog_id`. NO se crea income — los refunds reducen costo, no aumentan revenue.

## Cómo correr la conciliación

### Re-materialización de saldos diarios

Idempotente. Reseta los snapshots stale y los recompone desde el ledger canónico:

```bash
pnpm finance:rematerialize-balances --all --as-of 2026-04-27
```

O por cuenta individual:

```bash
pnpm finance:rematerialize-balances --account santander-clp --opening 5703909 --seed-date 2026-02-28 --as-of 2026-04-27
```

### Conciliación de un período (ejemplo marzo+abril 2026)

```bash
# Dry-run: clasifica cada fila bancaria sin escribir
pnpm finance:conciliate-mar-apr --dry-run

# Real: ejecuta la clasificación + crea anchors + supersede phantoms + re-materializa
pnpm finance:conciliate-mar-apr
```

### Health check del ledger

```bash
curl https://greenhouse.efeoncepro.com/api/admin/finance/ledger-health
```

Returns 200 si healthy, 503 si hay drift. El dashboard de Reliability Control Plane consume este endpoint vía `incidentDomainTag='finance'`.

> Detalle técnico: endpoint en `src/app/api/admin/finance/ledger-health/route.ts`, lib en `src/lib/finance/ledger-health.ts`. Cron diario que dispara alerts si hay drift queda como follow-up de TASK-702.

## Archivar un período de prueba (TASK-715)

Cuando creas un período de conciliación experimental (ej. para validar un flujo E2E o probar imports de cartola) y no quieres que aparezca en la cola operativa, **no lo concilies**. Conciliar significa que el banco cuadró con el sistema; no es lo correcto para un período que nunca fue evidencia bancaria real.

En su lugar, en `/finance/reconciliation` haz click en el menú de tres puntos a la derecha del período → **"Archivar como prueba"**. Aparecerá un diálogo pidiendo:

- Un motivo (mínimo 8 caracteres). Ej: "Periodo E2E manual match validation rerun".
- Confirmación.

Tras archivar:

- El período desaparece de la cola por defecto (ya no aparece en KPIs ni en saldo apertura).
- Queda registrado con `archive_kind='test_period'`, `archived_by_user_id`, `archive_reason` y `archived_at`. No se borra ningún `bank_statement_row` ni `payment` asociado.
- Para verlo de nuevo, activa el toggle **"Mostrar archivados"** sobre la tabla.
- Para reactivarlo (porque era real después de todo), abre el menú del período archivado → **"Reactivar período"**.

> Cuándo NO archivar: cuando el período sí representa cash real pero todavía está en proceso de matching. Para esos casos, completa la conciliación normal o déjalo abierto.
>
> Bloqueo: no se puede archivar un período en `status='closed'` (cierre contable formal). Reabre el período primero si fue cerrado por error.
>
> Detalle técnico: store `archiveReconciliationPeriodAsTestInPostgres` y `unarchiveReconciliationPeriodInPostgres` en `src/lib/finance/postgres-reconciliation.ts`. Endpoint `POST /api/finance/reconciliation/[id]/archive` (archivar) y `DELETE` (reactivar). Outbox events `finance.reconciliation_period.archived_as_test` y `finance.reconciliation_period.unarchived`.

## Reglas duras — qué NO hacer

1. **Nunca crear un `expense_payment` o `income_payment` sin anchor** cuando exista un objeto canónico al que debería referirse. Las factories anchored validan el anchor antes del INSERT.
2. **Nunca eliminar un phantom Nubox por DELETE manual.** Usar `supersedeIncomePhantom()` o `supersedeExpensePhantom()` con audit reason mínimo de 8 caracteres.
3. **Nunca tocar `account_balances` por UPDATE manual.** Re-correr `pnpm finance:rematerialize-balances` que es idempotente.
4. **Nunca duplicar un settlement_group.** Las factories usan IDs deterministas para que re-runs no creen duplicados.

## Cómo agregar un nuevo tipo de movimiento bancario

Si aparece un patrón nuevo (ej. crédito factoring de un proveedor distinto, retención por SII no-mensual, fee de un fintech nuevo):

1. Identificar a qué objeto canónico se ancla. Si no existe, crear la tabla anchor primero (ej. `tax_filings` para retenciones complejas).
2. Agregar una factory en `anchored-payments.ts` que enforce el anchor + idempotencia + outbox event correcto.
3. Agregar el patrón al clasificador en `preflight-bank-row.ts`.
4. Documentar el caso especial aquí.

> Detalle técnico: `src/lib/finance/payment-instruments/anchored-payments.ts` tiene 12 factories canónicas. Para extender, copiar el patrón existente.
