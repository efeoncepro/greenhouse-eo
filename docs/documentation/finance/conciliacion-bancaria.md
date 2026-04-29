# Conciliación bancaria

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.5
> **Creado:** 2026-04-27 por Claude Opus 4.7 + Julio Reyes
> **Ultima actualizacion:** 2026-04-29 por Codex (TASK-728 Finance Movement Feed Decision Polish)
> **Documentacion tecnica:** [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md), [Finance Movement Feed](finance-movement-feed.md), [TASK-702](../../tasks/in-progress/TASK-702-bank-reconciliation-canonical-anchors-rematerialize.md), [TASK-715](../../tasks/complete/TASK-715-reconciliation-test-period-archive-ux.md), [TASK-720](../../tasks/complete/TASK-720-instrument-category-kpi-rules.md), [TASK-721](../../tasks/complete/TASK-721-finance-evidence-canonical-uploader.md), [TASK-722](../../tasks/complete/TASK-722-bank-reconciliation-synergy-workbench.md), [TASK-723](../../tasks/complete/TASK-723-ai-assisted-reconciliation-intelligence.md), [TASK-726](../../tasks/complete/TASK-726-finance-movement-feed-foundation.md), [TASK-728](../../tasks/complete/TASK-728-finance-movement-feed-decision-polish.md)

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

## Cómo se muestran los movimientos pendientes

En `/finance/reconciliation`, la sección **Movimientos de caja por conciliar** usa un feed financiero operativo. Cada movimiento se muestra como una unidad legible con:

- tipo visual de movimiento (ingreso, egreso o proveedor cuando exista identidad confiable);
- descripción completa con wrapping seguro;
- estado explícito, por ejemplo `Pendiente`;
- instrumento o contraparte cuando venga del dato fuente;
- monto alineado para lectura rápida;
- trazabilidad expandible con ID origen y metadata.

Este feed es **solo visual/read-only**. No calcula saldos, no aplica matches, no modifica `account_balances`, no crea payments y no rematerializa balances. Si en una pantalla se muestra saldo posterior (`runningBalance`), ese saldo debe venir de un read model o snapshot del dominio financiero; el componente nunca lo deriva inline.

Para listas grandes, la primitive soporta virtualización encapsulada con `@tanstack/react-virtual`. La vista no debe importar el virtualizer directamente: solo pasa items al componente compartido.

Contrato reutilizable: [Finance Movement Feed](finance-movement-feed.md) define la API publica del componente, reglas de catalogos visuales, guardrails read-only y checklist para usarlo en otros modulos financieros sin duplicar patrones.

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
5. **Nunca tratar una sugerencia asistida como conciliación aplicada.** TASK-723 solo propone candidatos auditables; el match real sigue requiriendo confirmación humana en el dialog de conciliación.

## Sugerencias asistidas (TASK-723)

El detalle de un período puede mostrar **Sugerencias asistidas** para filas sin resolver. Greenhouse combina reglas determinísticas con un modelo AI protegido por sanitización, hashes de auditoría y kill switch (`FINANCE_RECONCILIATION_AI_ENABLED`).

Estas sugerencias no cambian saldos, no cierran períodos y no crean movimientos. Sirven para abrir el dialog de match con un candidato preseleccionado, revisar la evidencia y confirmar manualmente si corresponde. Si una sugerencia apunta a un target legacy payment-only, la UI lo marca como revisión sensible y reduce la confianza.

Cada sugerencia queda registrada con `space_id`, `period_id`, `account_id`, versión de prompt/modelo, factores de evidencia, estado de revisión y simulación del impacto esperado. La simulación es informativa; el saldo oficial solo cambia por los comandos canónicos de conciliación y la materialización contable existente.

## Cómo agregar un nuevo tipo de movimiento bancario

Si aparece un patrón nuevo (ej. crédito factoring de un proveedor distinto, retención por SII no-mensual, fee de un fintech nuevo):

1. Identificar a qué objeto canónico se ancla. Si no existe, crear la tabla anchor primero (ej. `tax_filings` para retenciones complejas).
2. Agregar una factory en `anchored-payments.ts` que enforce el anchor + idempotencia + outbox event correcto.
3. Agregar el patrón al clasificador en `preflight-bank-row.ts`.
4. Documentar el caso especial aquí.

> Detalle técnico: `src/lib/finance/payment-instruments/anchored-payments.ts` tiene 12 factories canónicas. Para extender, copiar el patrón existente.

## Sinergia Banco ↔ Conciliación (2026-04-29)

Tres mejoras estructurales que convierten Banco y Conciliación en un solo flujo operativo:

### 1. Saldo CLP del módulo Banco ahora dice la verdad (TASK-720)

**Antes**: el KPI "Saldo CLP" en `/finance/bank` sumaba todas las cuentas en pesos sin distinguir si eran cash real o deuda. Una tarjeta de crédito con $1.1M de deuda aparecía como si fuera $1.1M de cash. Lo mismo para la cuenta corriente del accionista.

**Ahora**: el sistema sabe qué tipo de cuenta es cada una y cómo contribuye a cada KPI. El "Saldo CLP" muestra solo cash disponible (banco + fintech + plataforma de pagos). La deuda aparece en su propio card "Crédito utilizado". Las cuentas internas (CCA, wallets) aparecen en su propio card "Cuentas internas". Ningún número miente sobre lo que es.

> Detalle técnico: `aggregateBankKpis` en `src/lib/finance/instrument-kpi-rules.ts` consume la tabla declarativa `instrument_category_kpi_rules`. Cada categoría (`bank_account`, `fintech`, `credit_card`, `shareholder_account`, etc.) declara qué KPIs alimenta y con qué signo.

### 2. La cartola sube a un storage real (TASK-721)

**Antes**: el drawer "Declarar conciliación" pedía la evidencia (cartola/screenshot) como un texto libre. El operador podía escribir `data/bank/foo.pdf` y nadie verificaba que el archivo existiera. Auditoría futura no podía reproducir.

**Ahora**: el drawer tiene un uploader de archivos real. El operador arrastra el PDF/screenshot, se sube al bucket privado de Greenhouse con dedup por hash (mismo PDF re-subido = no se duplica), queda enlazado al snapshot atómicamente. La cartola es accesible por URL firmada para todo el equipo, no solo para quien la subió.

Acepta PDF, JPG, PNG, WEBP. Máximo 10MB. La evidencia queda como assets canónicos en `greenhouse_core.assets` con audit trail completo.

> Detalle técnico: contexto `finance_reconciliation_evidence_draft` y `finance_reconciliation_evidence` en el sistema canónico de assets. Reusa toda la infraestructura existente (HR leave, purchase orders, certifications). Detector ledger-health flag rows con evidencia rota.

### 3. Bridge Banco ↔ Conciliación: un solo flujo end-to-end (TASK-722)

**Antes**: declarabas un snapshot en Banco con su evidencia, pero después tenías que ir a Conciliación, recordarte qué cuenta era, recordarte qué mes, crear el período manualmente, recapturar todo. El snapshot vivía aislado en Banco; el período vivía aislado en Conciliación. Si querías importar la cartola del banco, eso era un tercer paso desconectado.

**Ahora**: el flujo es continuo.

#### Camino 1 — desde Banco al workbench

1. En `/finance/bank`, el operador ve cada cuenta con su drift (banco vs Greenhouse).
2. Click "Declarar conciliación" → drawer con uploader real (TASK-721).
3. Snapshot queda registrado, evidencia adjunta atómicamente.
4. En la fila de la cuenta aparece el chip "Por conciliar $X" si hay drift.
5. Click "Abrir workbench" → navega directo al período de Conciliación. Si el período no existe, se crea desde el snapshot sin recapturar saldo.

#### Camino 2 — desde Conciliación

1. En `/finance/reconciliation`, si hay snapshots declarados sin período abierto, aparece un card amarillo accionable:
   ```
   🟠 Snapshots bancarios sin período abierto
       Santander (CLP) — Drift abierto $77,892 — Con evidencia
       [Abrir workbench →]
   ```
2. Click "Abrir workbench" → crea el período desde el snapshot, navega al workbench.

#### En el workbench (`/finance/reconciliation/[periodId]`)

Hay un panel nuevo arriba: **"Estado bancario"**.

| Saldo banco (snapshot) | Saldo Greenhouse | Drift |
|---|---|---|
| $4,172,563 | $4,172,563 | $0 |

Si hay evidencia adjunta, aparece el botón "Ver cartola" que descarga el PDF firmado.

Si el drift es distinto de cero, se ve la explicación que el operador escribió.

#### En la tabla de filas del extracto

Cada fila ahora distingue claramente cómo está matcheada:
- **Canónico** (verde, ícono link): match vinculado al settlement_leg del ledger contable. Es el formato canónico actual.
- **Legacy** (naranja, ícono pause): match solo por payment_id, sin settlement_leg. Pendiente upgrade al canal canónico.

Esto permite al operador y al auditor saber qué matches están "completos" y cuáles necesitan revisión.

#### Cuándo "Marcar conciliado" está bloqueado

El botón muestra una explicación clara cuando no se puede marcar el período como conciliado:

> Bloqueado: falta importar el extracto bancario · 2 filas pendientes de match · la diferencia es $1,500, debe ser $0

Antes el botón solo aparecía deshabilitado sin explicación.

### Permisos por acción

Hay 5 niveles de permiso en Conciliación, con reglas claras:

| Acción | Quién puede |
|---|---|
| Ver el listado y los detalles | Cualquier persona con acceso al módulo Finance |
| Match/unmatch/exclude/auto-match | Operadores Finance + admins |
| Importar extractos | Operadores Finance + admins |
| Declarar snapshots / crear períodos | Operadores Finance + admins |
| **Cerrar período (acción terminal)** | **Solo finance_admin / efeonce_admin** |

Cerrar un período es una acción terminal — escala a admin. El resto del flujo operativo lo puede ejecutar el equipo Finance.

### Garantías estructurales

- **Sin duplicados**: la base de datos impide a nivel de constraint dos períodos con misma cuenta + año + mes.
- **Atomic**: si falla un paso del proceso "crear período desde snapshot", todo se reverte.
- **Audit completo**: cada acción genera evento de outbox, y cada cartola tiene hash + timestamp + uploader.
- **Race-safe**: si dos operadores hacen click "Abrir workbench" sobre el mismo snapshot al mismo tiempo, el sistema lo detecta — uno gana, el otro recibe "ya está abierto".
- **Idempotente**: re-llamar "Abrir workbench" sobre un snapshot ya linkeado no crea nada nuevo, solo navega.

> Detalle técnico: helper `getReconciliationFullContext` en `src/lib/finance/reconciliation/full-context.ts`. State machine `nextAction` (declare_snapshot → create_period → import_statement → resolve_matches → mark_reconciled → close_period → closed → archived). Helper atomic `createOrLinkPeriodFromSnapshot` en `src/lib/finance/reconciliation/period-from-snapshot.ts`. UNIQUE constraint en `(account_id, year, month)` aplicada en migración TASK-722.
