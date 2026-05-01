# Greenhouse Payment Orders Architecture V1

## Delta 2026-05-01 — TASK-748: Payment Obligations Foundation

Se introduce la primera capa canonica del programa Payment Orders: la tabla
`greenhouse_finance.payment_obligations` que componentiza obligaciones financieras
generadas por sources upstream (payroll, supplier_invoice, tax_obligation, manual,
reliquidation_delta) sin reemplazar el ledger `expenses`.

Schema canonico (migration `20260501140545647_task-748-payment-obligations.sql`):

- PK `obligation_id` TEXT.
- `source_kind` ∈ payroll | supplier_invoice | tax_obligation | manual | reliquidation_delta.
- `obligation_kind` ∈ employee_net_pay | employer_social_security | employee_withheld_component | provider_payroll | processor_fee | fx_component | manual.
- `beneficiary_type` ∈ member | supplier | tax_authority | processor | other.
- `status` ∈ generated | scheduled | partially_paid | paid | reconciled | closed | cancelled | superseded.
- `currency` ∈ CLP | USD; `amount` NUMERIC(14,2) >= 0.
- `space_id` NULLABLE en V1 hasta que emerja resolver canonico member→space.

Idempotency partial unique: `(source_kind, source_ref, obligation_kind, beneficiary_id, COALESCE(period_id,'__no_period__')) WHERE status NOT IN ('superseded','cancelled')`. Re-export del mismo periodo no duplica obligations.

Inmutabilidad: rows con `paid|partially_paid|reconciled|closed` no pueden ser supersedidas; el caller emite un nuevo row tipo `reliquidation_delta` independiente.

### Materializer Payroll (`materializePayrollObligationsForExportedPeriod`)

Corre como projection consumer de `payroll_period.exported`. Por cada `payroll_entry` activo:

| Caso | obligation_kind | amount | beneficiary | currency |
|---|---|---|---|---|
| Chile dependiente / international internal | `employee_net_pay` | `net_total` | member | entry.currency |
| Honorarios + sii_retention > 0 | `employee_withheld_component` | `sii_retention_amount` | tax_authority `cl_sii` | CLP |
| `payroll_via='deel'` | `provider_payroll` | 0 placeholder + metadata.referenceNet | member | entry.currency |

Y al final del periodo:

| Caso | obligation_kind | amount | beneficiary |
|---|---|---|---|
| Σ chile_employer_total_cost > 0 | `employer_social_security` | total CLP | supplier Previred si existe, sino `cl_previred` |

### Coexistencia con expenses (NO reemplazo)

`finance_expense_reactive_intake` (TASK-411) sigue corriendo. Ambas projections consumen `payroll_period.exported`:

- `expenses` mantiene devengo P&L + su state machine `payment_status` (legacy).
- `payment_obligations` introduce la capa explicita "que se debe pagar" con state machine de pago propia.
- `getPaymentObligationsDrift(periodId)` compara conteos para detectar gaps de cobertura.

### Outbox events emitidos

- `finance.payment_obligation.generated` (aggregate_type=`payment_obligation`) — consumers futuros: TASK-750 payment_orders, TASK-751 reconciliation, reliability AI Observer.
- `finance.payment_obligation.superseded` — audit chain + delta reporting.

Cada evento se publica DENTRO de la misma transaccion del INSERT/UPDATE via `publishOutboxEvent(client)`.

### Reglas duras

- **NUNCA** modificar `calculate-payroll.ts` ni `payroll_entries.net_total` desde el modulo de obligations.
- **NUNCA** supersedir una obligation con status `paid|partially_paid|reconciled|closed`. Emitir nueva con `source_kind='reliquidation_delta'`.
- **NUNCA** emitir `payment_obligation.generated` fuera de transaction; el outbox event acompaña al INSERT en la misma tx.
- **NUNCA** crear obligations sin idempotency key canonica.
- **NUNCA** materializar obligations Chile-dependientes para `payroll_via='deel'` (TASK-744 boundary). Placeholder es `provider_payroll` con amount=0.
- Cuando emerja resolver de `member.space_id`, popular obligations via UPDATE batch — campo NULLABLE para permitirlo.

Files owned: `src/lib/finance/payment-obligations/`, `src/lib/sync/projections/payment-obligations-from-payroll.ts`, `src/types/payment-obligations.ts`.
Endpoints: `GET /api/admin/finance/payment-obligations`, `GET /api/admin/finance/payment-obligations/drift?periodId=YYYY-MM`.
Tests: 5/5 row-mapper passing. Materializer + projection covered por smoke con re-export real.

Spec consumer: TASK-750 (payment_orders) lee de aqui.

## Objetivo

Definir el contrato canónico para **Órdenes de Pago** en Greenhouse: una capa de Tesorería dentro de Finance que convierte obligaciones financieras en pagos ejecutables, auditables y conciliables, sin mover la responsabilidad de cálculo hacia Payroll ni hacia otros módulos originadores.

Regla madre:

```text
Payroll calcula y exporta obligaciones.
Finance/Tesorería planifica, aprueba, paga, liquida y concilia.
```

El módulo nace por una brecha real: una nómina exportada no significa que esté pagada, y una nómina puede requerir múltiples salidas de caja por distintos instrumentos, plataformas y processors.

## Placement

`Payment Orders` pertenece a `greenhouse_finance`, específicamente al subdominio operativo de **Tesorería / Cash Operations**.

No pertenece a `greenhouse_payroll` porque:

- Payroll debe seguir siendo owner del cálculo, snapshots, recibos y lifecycle `draft -> calculated -> approved -> exported`.
- La selección de cuenta pagadora, plataforma, batch, evidencia bancaria, settlement y conciliación son responsabilidades de Finance/Tesorería.
- El mismo patrón debe servir también para proveedores, impuestos, anticipos, préstamos, reembolsos y cuenta corriente accionista.

## Problema Actual

Hoy `payroll_period.exported` dispara `finance_expense_reactive_intake` y materializa:

- un `expense_type='payroll'` por colaborador usando `payroll_entries.net_total`;
- un `expense_type='social_security'` consolidado para Previred usando `chile_employer_total_cost`.

Esos expenses quedan `payment_status='pending'`, lo cual es correcto como obligación, pero el sistema no modela explícitamente:

- qué componente de la nómina se debe pagar;
- qué beneficiario real recibirá el dinero;
- qué instrumento o plataforma paga;
- si el pago fue aprobado, programado, enviado, liquidado o conciliado;
- si el pago requiere funding, FX, payout, fee o processor;
- si un colaborador internacional se paga por Deel, Global66, Wise, banco local u otro rail.

## Modelo Canónico

El modelo separa cuatro capas:

```text
Source Domain
  -> Payment Obligation
  -> Payment Order / Payment Batch
  -> Expense Payment + Settlement Legs
  -> Bank / Processor Reconciliation
```

### 1. Source Domain

El módulo originador calcula o registra una obligación económica.

Ejemplos:

- `Payroll`: neto de colaborador, cargas sociales, honorarios, Deel/provider.
- `Finance Expenses`: proveedor, impuesto, servicio, reembolso.
- `HR`: anticipo o préstamo aprobado.
- `Shareholder Current Account`: retiro, devolución o gasto reembolsable.

### 2. Payment Obligation

Representa **qué se debe pagar y por qué**.

Ejemplos de obligaciones Payroll:

- `employee_net_pay`: neto a pagar al colaborador.
- `employer_social_security`: obligaciones empleador vía Previred.
- `employee_withheld_component`: montos retenidos al colaborador y pagaderos a terceros cuando el modelo lo abra.
- `provider_payroll`: obligación hacia Deel/EOR/payroll provider.
- `processor_fee`: comisión de plataforma o banco.
- `fx_component`: diferencia o costo cambiario derivado.

La obligación no significa pago. Puede estar pendiente, programada, parcial, pagada, reconciliada o cerrada.

### 3. Payment Order / Payment Batch

Representa **cómo se va a pagar** una o más obligaciones.

Una orden puede ser:

- individual: un colaborador, un proveedor, un impuesto;
- agrupada: batch de nómina CLP local;
- por processor: Previred, Deel, Global66;
- multi-leg: funding + FX + payout + fee.

Una orden puede contener múltiples líneas (`payment_order_lines`) y cada línea referencia una obligación.

### 4. Expense Payment + Settlement Legs

Representa **qué salida de caja ocurrió**.

`expense_payments` sigue siendo el ledger canónico de pagos de gastos. `settlement_groups` y `settlement_legs` modelan la ejecución operativa real:

- `funding`: banco -> plataforma;
- `fx_conversion`: cambio de moneda;
- `payout`: plataforma -> beneficiario;
- `fee`: comisión;
- `internal_transfer`: cuenta propia -> cuenta propia.

La conciliación bancaria o de processor ocurre contra payments/legs, no contra Payroll directamente.

## Estados

### Payment Obligation

```text
generated -> scheduled -> partially_paid -> paid -> reconciled -> closed
                         \-> cancelled
                         \-> superseded
```

Semántica:

- `generated`: obligación creada desde un source.
- `scheduled`: asignada a una orden de pago.
- `partially_paid`: pagos reales no cubren el total.
- `paid`: pagos reales cubren el total.
- `reconciled`: los pagos/legs están conciliados contra banco o processor.
- `closed`: Finance cerró el caso operativo.
- `cancelled`: obligación anulada antes de pago real.
- `superseded`: reemplazada por delta/reliquidación.

### Payment Order

```text
draft -> pending_approval -> approved -> scheduled -> submitted -> settled -> closed
                              \-> failed
                              \-> cancelled
```

Semántica:

- `draft`: orden generada o editada.
- `pending_approval`: espera maker-checker.
- `approved`: lista para programar/enviar.
- `scheduled`: tiene fecha e instrumento confirmado.
- `submitted`: instrucción enviada a banco/proveedor.
- `settled`: proveedor/banco confirma ejecución.
- `closed`: todos los payments/legs están reconciliados o aceptados.
- `failed`: banco/proveedor rechazó o no pudo ejecutar.
- `cancelled`: anulada antes de ejecución.

## Beneficiary Payment Profiles

El beneficiario de un pago no debe inferirse solo desde `member_id`.

`beneficiary_payment_profiles` debe ser una entidad versionada y auditable que resuelva:

- beneficiario: `member`, `supplier`, `tax_authority`, `processor`, `shareholder`, `manual`;
- moneda esperada;
- país/jurisdicción;
- proveedor/rail preferido (`santander`, `global66`, `deel`, `wise`, `previred`, etc.);
- instrumento pagador recomendado;
- datos de payout enmascarados o referenciados a vault;
- vigencia (`active_from`, `active_to`);
- estado de aprobación;
- snapshot usado por cada orden.

Casos Payroll:

- Chile dependiente CLP: transferencia bancaria local al colaborador + Previred separado.
- Honorarios CLP: pago neto al prestador, retenciones modeladas como obligación separada cuando corresponda.
- Internacional/Deel: obligación hacia Deel/provider o payout internacional según `payroll_via`.
- Internacional directo: rail definido por perfil (Global66, Wise, banco, etc.) con FX y fee explícitos.

## Routing Policy

El sistema no debe hardcodear reglas como "internacional = Global66".

Debe existir un resolver policy-driven:

```text
source_kind
+ beneficiary_type
+ pay_regime
+ payroll_via
+ currency
+ country
+ active beneficiary profile
+ amount/risk policy
= recommended payment route
```

La policy puede retornar:

- pago directo desde banco;
- processor operacional;
- provider payroll;
- settlement multi-leg;
- bloqueo por perfil faltante;
- requerimiento de aprobación adicional.

## Seguridad

Reglas obligatorias:

- No guardar cuentas bancarias completas en texto plano si puede evitarse.
- Mostrar identificadores enmascarados por defecto.
- Revelar datos sensibles solo con permiso, motivo y expiración.
- Cambios de beneficiary profile requieren maker-checker.
- Órdenes sobre umbral de monto requieren doble aprobación.
- Cada descarga de archivo de pago queda auditada.
- Cada envío/reintento a banco/proveedor usa idempotency key.

## Idempotencia

Dedupe keys recomendadas:

- Payment obligation: `(source_kind, source_ref, obligation_kind, beneficiary_id, period_id)`.
- Payment order line: `(order_id, obligation_id)`.
- Payment submission: `(order_id, submission_attempt)`.
- Provider response: `(provider_slug, provider_reference)`.
- Bank statement row: fingerprint existente del reconciliation runtime.

Nunca se debe duplicar una obligación o pago por retry de outbox, cron, webhook o exportación.

## Reliquidación y Restatements

Reglas:

- Si una obligación aún no está pagada, puede ser superseded por la nueva obligación calculada.
- Si ya está pagada, una reliquidación crea obligación delta compensatoria.
- Si ya está reconciliada/cerrada, nunca se reescribe historia: se crea ajuste en el período actual o delta formal.
- `Payroll` no muta payments ni settlement legs; emite el delta y Finance decide la operación compensatoria.

## Relación Con Finance Actual

`greenhouse_finance.expenses` sigue representando devengo/gasto operativo.

`expense_payments` sigue representando pagos reales.

`payment_orders` introduce la capa faltante entre ambos:

```text
expense/payment_obligation pendiente
  -> payment_order aprobada
  -> expense_payment registrado
  -> settlement_legs conciliados
```

## Payment Calendar

Debe existir un **Calendario de Pagos** como vista operativa de Tesorería.

No reemplaza el calendario operativo de Payroll ni el calendario de cierre financiero. Es una agenda de ejecución de caja:

```text
payment_obligations.due_date
  -> payment_orders.scheduled_date
  -> payment_submissions.submitted_at
  -> expense_payments.payment_date
  -> settlement_legs.settled_at / reconciled_at
```

Debe permitir responder:

- qué obligaciones vencen esta semana;
- qué órdenes están aprobadas pero no enviadas;
- qué pagos fueron enviados pero no liquidados;
- qué pagos están pagados pero no conciliados;
- qué processors tienen actividad pendiente (Previred, Deel, Global66, etc.);
- qué pagos son críticos por payroll, impuesto, proveedor o vencimiento legal.

Estados calendarizables:

- `due`: obligación con vencimiento próximo.
- `ready_to_schedule`: obligación sin orden.
- `scheduled`: orden aprobada con fecha.
- `submission_due`: orden debe enviarse hoy o antes de una hora límite.
- `awaiting_confirmation`: orden enviada sin confirmación de banco/proveedor.
- `awaiting_reconciliation`: pago registrado sin conciliación.
- `overdue`: obligación u orden fuera de SLA.
- `closed`: pago conciliado/cerrado.

Reglas:

- El calendario muestra obligaciones y órdenes, no recalcula montos.
- Cada item conserva source link: Payroll period/entry, expense, tax, loan, supplier, processor.
- Cambiar una fecha de pago en el calendario debe pasar por la misma autorización de la orden.
- Calendario debe soportar cortes por `space_id`, moneda, cuenta/instrumento, processor, beneficiary y source domain.
- En Payroll, el calendario solo se ve como estado downstream; Payroll no agenda pagos directamente.

## Relación Con Processors

Previred, Deel, Global66, Wise u otros processors no son necesariamente cuentas bancarias con saldo propio.

Reglas:

- El cash vive en la cuenta pagadora real o en el ledger de plataforma si el producto lo modela explícitamente.
- Un processor puede tener vista operativa de actividad sin inflar saldo.
- El processor no debe recibir `payment_account_id` si no es cuenta pagadora real.
- Funding, payout, FX y fee deben modelarse como settlement legs separados cuando aplique.

## Superficies

Módulo visible recomendado:

- Finance > Pagos / Órdenes de Pago.
- Finance > Calendario de Pagos.
- Finance > Banco muestra settlement legs y conciliación.
- Payroll muestra estado downstream resumido: obligaciones generadas, órdenes pendientes, pagado/reconciliado.
- Person 360 muestra payout profile, préstamos/anticipos y pagos relacionados según permisos.

## Eventos

Eventos nuevos esperados:

- `finance.payment_obligation.generated`
- `finance.payment_obligation.superseded`
- `finance.payment_order.created`
- `finance.payment_order.approved`
- `finance.payment_order.submitted`
- `finance.payment_order.failed`
- `finance.payment_order.settled`
- `finance.payment_order.cancelled`
- `finance.payment_order.closed`
- `finance.beneficiary_payment_profile.created`
- `finance.beneficiary_payment_profile.approved`
- `finance.beneficiary_payment_profile.superseded`

## Implementación Recomendada

No implementar como una sola task gigante.

Programa recomendado:

- `TASK-747`: umbrella Payment Orders Program.
- `TASK-748`: Payment Obligations Foundation.
- `TASK-749`: Beneficiary Payment Profiles + Routing Policies.
- `TASK-750`: Payment Orders, Batches, Payment Calendar + Maker-Checker Runtime.
- `TASK-751`: Payroll Settlement Orchestration + Reconciliation Integration.

Esta separación permite entregar valor incremental sin romper Payroll:

1. Primero se materializan obligaciones read-only y se comparan contra expenses actuales.
2. Luego se resuelve cómo pagar por beneficiario.
3. Después se generan órdenes y batches aprobables.
4. Finalmente Payroll usa el flow completo para pagos reales, settlement y conciliación.
