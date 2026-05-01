# TASK-748 — Payment Obligations Foundation

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `V1 entregado 2026-05-01 — schema payment_obligations + materializer payroll + projection consumer + drift detector + UI admin`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-748-payment-obligations-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea la foundation `payment_obligations` en Finance para representar obligaciones componentizadas antes del pago real. Payroll exportado comienza generando obligaciones `generated`, no pagos ni estados `paid`.

## Why This Task Exists

El bridge actual `payroll_period.exported -> expenses` crea obligaciones pendientes, pero no conserva suficiente semántica para saber qué componente se debe pagar, a quién, con qué moneda, por qué source y si luego fue programado, pagado o conciliado.

## Goal

- Crear modelo canónico de obligación financiera.
- Materializar obligaciones Payroll desde `payroll_period.exported` en modo idempotente.
- Comparar obligaciones contra expenses actuales sin cambiar cálculo Payroll.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- Obligación no es pago.
- Cada query tenant/space-aware debe preservar `space_id`.
- Idempotencia por `(source_kind, source_ref, obligation_kind, beneficiary_id, period_id)`.
- No modificar `calculate-payroll.ts` ni `payroll_entries.net_total`.

## Dependencies & Impact

### Depends on

- `greenhouse_finance.expenses`
- `greenhouse_payroll.payroll_periods`
- `greenhouse_payroll.payroll_entries`
- `src/lib/finance/payroll-expense-reactive.ts`

### Blocks / Impacts

- Bloquea `TASK-750`.
- Alimenta `TASK-751`.
- Debe convivir con `TASK-745` y `TASK-746`.

### Files owned

- `migrations/<timestamp>_task-748-payment-obligations.sql`
- `src/lib/finance/payment-obligations/`
- `src/lib/sync/projections/payment-obligations.ts`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

## Current Repo State

### Already exists

- `src/lib/finance/payroll-expense-reactive.ts` crea expenses `payroll` y `social_security`.
- `src/lib/sync/projections/finance-expense-reactive-intake.ts` escucha `payroll_period.exported`.

### Gap

- No existe `payment_obligations`.
- No hay estados de obligación separados de `expenses.payment_status`.
- No hay componentización durable por obligación.

## Scope

### Slice 1 — Schema

- Crear `greenhouse_finance.payment_obligations`.
- Campos mínimos: `obligation_id`, `space_id`, `source_kind`, `source_ref`, `period_id`, `beneficiary_type`, `beneficiary_id`, `obligation_kind`, `amount`, `currency`, `status`, `due_date`, `metadata_json`, `created_at`, `updated_at`.
- CHECK de status y kind.
- Unique idempotente por source/component.

### Slice 2 — Payroll materializer

- Materializar obligations desde `payroll_period.exported`:
  - `employee_net_pay` por `payroll_entry`;
  - `employer_social_security` consolidado Previred cuando exista costo empleador;
  - placeholders seguros para `provider_payroll` cuando `payroll_via='deel'`.
- No reemplazar todavía el expense bridge existente.

### Slice 3 — Readers + health

- Reader `listPaymentObligations`.
- Health check: obligations vs expenses actuales para detectar drift.
- Outbox events `finance.payment_obligation.generated` y `finance.payment_obligation.superseded`.

## Out of Scope

- Crear órdenes de pago.
- Resolver instrumentos por beneficiario.
- Registrar pagos reales.
- UI completa.

## Detailed Spec

Status inicial:

```text
generated | scheduled | partially_paid | paid | reconciled | closed | cancelled | superseded
```

Kinds iniciales:

```text
employee_net_pay
employer_social_security
employee_withheld_component
provider_payroll
processor_fee
fx_component
manual
```

## Acceptance Criteria

- [ ] `payment_obligations` existe con constraints e índices.
- [ ] `payroll_period.exported` materializa obligations idempotentes.
- [ ] Re-export/retry no duplica obligations.
- [ ] Existing expense bridge sigue funcionando sin cambios de comportamiento.
- [ ] Tests cubren dedupe, Payroll Chile, honorarios e internacionales/Deel.

## Verification

- `pnpm vitest run src/lib/finance/payment-obligations src/lib/sync/projections`
- `pnpm exec eslint src/lib/finance/payment-obligations src/lib/sync/projections`
- `pnpm build`
- `pnpm pg:connect:migrate`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real.
- [ ] el archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre.
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible.
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas.
