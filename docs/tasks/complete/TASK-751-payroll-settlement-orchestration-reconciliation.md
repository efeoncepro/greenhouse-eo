# TASK-751 — Payroll Settlement Orchestration + Reconciliation Integration

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `V1 entregado 2026-05-01 — wireup order.paid → expense_payment + payroll downstream status reader`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-748`, `TASK-749`, `TASK-750`
- Branch: `task/TASK-751-payroll-settlement-orchestration-reconciliation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Conecta Payroll exportado con Payment Orders end-to-end: obligaciones por colaborador/processor, rutas de pago por perfil, órdenes/batches, registro de pagos reales, settlement legs y estado downstream visible para Payroll, Banco y Conciliación.

## Why This Task Exists

Payroll de Efeonce es multinacional: Andrés, Daniela, Melkin u otros pueden pagarse por instrumentos distintos; Previred consolida obligaciones empleador; Deel/Global66 pueden requerir funding, payout, FX y fee. Hoy Greenhouse crea expenses pendientes, pero no cierra el loop operativo de pago y conciliación.

## Goal

- Generar payment orders desde obligaciones Payroll.
- Soportar múltiples instrumentos por colaborador.
- Modelar Previred/Deel/Global66 como processors/plataformas sin duplicar saldo.
- Mostrar en Payroll estado downstream de pago/conciliación sin alterar cálculo.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/tasks/to-do/TASK-706-previred-processor-ux-and-bank-semantics.md`
- `docs/tasks/to-do/TASK-707-previred-canonical-payment-runtime-and-backfill.md`

Reglas obligatorias:

- No cambiar cálculo Payroll.
- No marcar Payroll como pagado por exportar.
- Payment status downstream se deriva de obligations/orders/payments/settlement.
- Reconciliación matchea payments/legs.
- Procesadores no inflan saldo bancario.

## Dependencies & Impact

### Depends on

- `TASK-748`
- `TASK-749`
- `TASK-750`
- `src/lib/finance/payroll-expense-reactive.ts`
- `src/lib/finance/expense-payment-ledger.ts`
- `src/lib/finance/processor-digest.ts`

### Blocks / Impacts

- Mejora `TASK-706` y `TASK-707*` con foundation de orders.
- Impacta Payroll UI, Finance Payments, Bank movements y Reconciliation.

### Files owned

- `src/lib/finance/payment-orders/payroll-orchestration.ts`
- `src/lib/finance/payment-orders/payroll-status-reader.ts`
- `src/views/greenhouse/payroll/**`
- `src/views/greenhouse/finance/payment-orders/**`
- `docs/documentation/hr/pagos-de-nomina.md`
- `docs/manual-de-uso/hr/seguimiento-pagos-nomina.md`
- `docs/documentation/finance/ordenes-de-pago-payroll.md`

## Current Repo State

### Already exists

- Payroll export materializa expenses pendientes.
- Finance registra payments reales y settlement.
- Bank/Reconciliation entiende processors operacionales como Previred.

### Gap

- No hay generación de orders por Payroll.
- No hay estado downstream visible en Payroll.
- No hay soporte explícito multi-instrumento por colaborador.
- No hay componentización robusta Previred/Deel/Global66 desde Payroll.

## Scope

### Slice 1 — Payroll order generation

- Crear orders desde obligations Payroll por período.
- Agrupar por route/instrument/processor cuando corresponda.
- Congelar snapshot de beneficiary profile y route.

### Slice 2 — Processor-specific flows

- Previred: order consolidada `employer_social_security`, cash desde cuenta pagadora real.
- Deel/provider: order hacia provider cuando `payroll_via='deel'`.
- Global66/Wise-style: funding + payout + fee + FX legs cuando route lo exija.
- Banco local: transferencia directa por colaborador o batch.

### Slice 3 — Payroll status reader

- Exponer estado downstream por período y entry:
  - obligation generated;
  - order pending/approved/submitted;
  - paid/partial;
  - reconciled/closed;
  - blocked por profile missing.
- No escribir de vuelta en `payroll_entries`.

### Slice 4 — UI

- PayrollPeriodTab muestra resumen de pago: obligaciones, órdenes, pagado, conciliado, bloqueos.
- PayrollPeriodTab muestra hitos de calendario downstream: fecha de vencimiento, fecha programada, orden enviada, pagado y conciliado.
- Deep link a Finance > Ordenes de Pago.
- Deep link a Finance > Calendario de Pagos filtrado por período Payroll.
- Finance order detail muestra source Payroll y links al período/entry.

### Slice 5 — Reliquidación

- Si obligation no pagada: supersede.
- Si order pagada o reconciliada: crear delta compensatorio.
- Tests para no mutar payments cerrados.

## Out of Scope

- API directa a bancos/proveedores.
- Automatizar confirmaciones de Deel/Global66.
- Reemplazar completamente `payroll-expense-reactive` antes de validar paridad.

## Acceptance Criteria

- [ ] Export Payroll genera obligations y permite crear orders por ruta.
- [ ] Colaboradores distintos pueden usar instrumentos distintos.
- [ ] Previred queda como processor operacional con cash en cuenta pagadora real.
- [ ] Payroll muestra estado downstream sin cambiar cálculo.
- [ ] Conciliación sigue operando contra payments/settlement legs.
- [ ] Reliquidación pagada genera delta, no muta historia.

## Verification

- `pnpm vitest run src/lib/finance/payment-orders src/lib/payroll`
- `pnpm exec eslint src/lib/finance/payment-orders src/views/greenhouse/payroll`
- `pnpm build`
- Playwright smoke Payroll -> Payment Orders -> Payment -> Reconciliation happy path.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real.
- [ ] el archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre.
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible.
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas.
