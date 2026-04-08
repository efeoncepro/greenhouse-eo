# TASK-282 — Finance Payment Instrument Reconciliation & Settlement Orchestration

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Complete`
- Rank: `53`
- Domain: `finance`
- Blocked by: `None`
- Branch: `task/TASK-282-finance-payment-instrument-reconciliation-settlement-orchestration`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Elevar `Finance > Conciliación` desde un módulo de matching bancario por documento a una capacidad enterprise de conciliación `ledger-first`, instrument-aware y preparada para settlement multi-leg. La task debe integrar nativamente `Cobros`, `Pagos`, `payment instruments`, outbox/reactive projections y casos reales como `Santander -> Global66 -> proveedor/colaborador`, sin volver a mezclar documento, caja y conciliación.

## Why This Task Exists

Hoy Greenhouse ya tiene avances importantes pero el contrato sigue incompleto:

- `Cobros` y `Pagos` ya leen los ledgers canónicos `income_payments` y `expense_payments`
- `TASK-281` ya evoluciona `accounts` a un registro de `payment instruments` con tracking FX y soporte de providers como `Global66`
- `Conciliación` todavía conserva semántica híbrida:
  - mezcla candidatos document-level y payment-level
  - en egresos sigue conciliando `expenses` en vez de `expense_payments`
  - la UI de pending movements sigue mirando documentos y no ledger real
  - el match manual no baja correctamente al `matchedPaymentId` en todos los casos
- el flujo reactivo hoy escucha `finance.income_payment.recorded` y `finance.expense_payment.recorded`, pero no existe aún un contrato equivalente para `reconciled`, `unreconciled` y `period closed`

Además, el caso operativo internacional ya está explicitado por negocio:

- pago directo desde `Santander` vía `Swift`
- pago indirecto vía `Santander -> Global66 -> proveedor/colaborador`
- mismo patrón aplicable a proveedores, colaboradores y otras contrapartes

Eso exige un modelo de conciliación que entienda:

- obligación (`receivable` / `payable`)
- pago (`incoming` / `outgoing`)
- instrumento (`bank account`, `fintech`, `wallet`, `payment platform`)
- legs de liquidación (`internal transfer`, `funding`, `fx conversion`, `payout`, `fee`)

Sin esta task, Greenhouse seguirá teniendo una conciliación operativa útil pero insuficiente para tesorería enterprise, pagos internacionales, trazabilidad real de caja y consumers reactivos que dependan del estado de conciliación.

## Goal

- Convertir conciliación en un módulo `ledger-first` alineado con `income_payments` y `expense_payments`
- Integrar `payment instruments` como ancla canónica de períodos, matching y reporting
- Introducir el modelo de settlement orchestration necesario para transfers internos, FX, payouts y fees
- Publicar eventos outbox canónicos de conciliación para finanzas, costos, observabilidad y projections downstream
- Alinear UX, APIs y readers para que `Cobros`, `Pagos` y `Conciliación` hablen exactamente el mismo contrato

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

Reglas obligatorias:

- `income_payments` y `expense_payments` siguen siendo la fuente de verdad del cash ledger; conciliación no puede crear un source of truth paralelo
- `payment instruments` de `TASK-281` son el foundation canónico del modelo; no crear taxonomía paralela de cuentas/rails
- la unidad de matching debe converger a `payment-level` y luego a `settlement-leg-level`, no quedarse en `document-level`
- una transferencia interna entre instrumentos no cierra una obligación; solo el `payout` o leg de liquidación hacia la contraparte puede cerrarla
- toda mutación de conciliación que cambie estado operativo relevante debe quedar preparada para publicar outbox dentro de transacción
- no romper la semántica visible ya estabilizada:
  - `pagado/cobrado` != `conciliado`
  - `documento` != `caja`

## Normative Docs

- `docs/tasks/to-do/TASK-179-finance-reconciliation-cutover-hardening.md`
- `docs/tasks/in-progress/TASK-224-finance-document-vs-cash-semantic-contract.md`
- `docs/tasks/complete/TASK-280-finance-cash-modules-ingresos-egresos.md`
- `docs/tasks/complete/TASK-281-payment-instruments-registry-fx-tracking.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `TASK-179` — el residual `Postgres-only` del cutover debe absorberse dentro del Slice 1 de esta task
- `TASK-280` — foundation ya implementada: `Cobros` y `Pagos` sobre `income_payments` y `expense_payments`
- `TASK-281` — foundation ya implementada: payment instruments registry + FX tracking + providers como `Global66`
- `greenhouse_finance.reconciliation_periods`
- `greenhouse_finance.bank_statement_rows`
- `greenhouse_finance.income_payments`
- `greenhouse_finance.expense_payments`
- `src/lib/finance/postgres-reconciliation.ts`
- `src/lib/finance/payment-ledger.ts`
- `src/lib/finance/expense-payment-ledger.ts`
- `src/config/payment-instruments.ts`
- `src/lib/sync/event-catalog.ts`

### Blocks / Impacts

- `Finance > Conciliación`
- `Finance > Cobros`
- `Finance > Pagos`
- `Finance > Posición de caja`
- `client_economics`, `operational_pl` y otros consumers que dependan de caja conciliada
- data quality y remediación histórica del dominio Finance
- futuras tasks de treasury, FX management o automation con providers

### Files owned

- `docs/tasks/in-progress/TASK-282-finance-payment-instrument-reconciliation-settlement-orchestration.md`
- `src/lib/finance/postgres-reconciliation.ts`
- `src/app/api/finance/reconciliation/route.ts`
- `src/app/api/finance/reconciliation/[id]/route.ts`
- `src/app/api/finance/reconciliation/[id]/match/route.ts`
- `src/app/api/finance/reconciliation/[id]/unmatch/route.ts`
- `src/app/api/finance/reconciliation/[id]/auto-match/route.ts`
- `src/app/api/finance/reconciliation/[id]/statements/route.ts`
- `src/app/api/finance/reconciliation/[id]/candidates/route.ts`
- `src/views/greenhouse/finance/ReconciliationView.tsx`
- `src/views/greenhouse/finance/ReconciliationDetailView.tsx`
- `src/views/greenhouse/finance/dialogs/ReconciliationMatchDialog.tsx`
- `src/app/api/finance/cash-in/route.ts`
- `src/app/api/finance/cash-out/route.ts`
- `src/lib/finance/payment-ledger.ts`
- `src/lib/finance/expense-payment-ledger.ts`
- `src/config/payment-instruments.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/sync/projections/operational-pl.ts`
- `migrations/`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`

## Current Repo State

### Already exists

- `Cobros` ya lee `greenhouse_finance.income_payments` vía `src/app/api/finance/cash-in/route.ts`
- `Pagos` ya lee `greenhouse_finance.expense_payments` vía `src/app/api/finance/cash-out/route.ts`
- el contrato de write path canónico de caja ya existe en:
  - `src/lib/finance/payment-ledger.ts`
  - `src/lib/finance/expense-payment-ledger.ts`
- `TASK-281` ya agrega `payment_account_id`, `exchange_rate_at_payment`, `amount_clp`, `fx_gain_loss_clp` y catálogo de providers en `src/config/payment-instruments.ts`
- `Global66` ya existe como provider en `src/config/payment-instruments.ts`
- `Conciliación` ya tiene routes y store Postgres-first:
  - `src/app/api/finance/reconciliation/`
  - `src/lib/finance/postgres-reconciliation.ts`
- ingresos ya tienen carril parcial `payment-level` en reconciliación mediante `matched_payment_id`
- el motor reactivo ya consume `finance.income_payment.recorded` y `finance.expense_payment.recorded` para `client_economics`, `commercial_cost_attribution`, `operational_pl` y `period_closure_status`
- `TASK-280` y `TASK-281` ya están cerradas en el backlog operativo y sirven como foundation de esta lane

### Gap

- egresos siguen conciliando a nivel `expenses`, no `expense_payments`
- la UI de conciliación arma pendientes desde `/api/finance/income` y `/api/finance/expenses`, no desde cash ledgers
- el match manual no envía `matchedPaymentId` correctamente en todos los flows
- el módulo sigue conservando fallback BigQuery en las routes de conciliación y no está realmente en `Postgres-only`
- no existe concepto explícito de `settlement leg`, `settlement group`, `internal transfer`, `funding`, `payout` o `fee leg`
- el período de conciliación sigue anclado a `account_id`, no a una lectura más rica de instrumento/rail/settlement
- importación de cartolas/reportes no es idempotente
- no hay eventos canónicos para `reconciled`, `unreconciled` o `reconciliation_period.closed`
- no existe una integración formal entre conciliación y los casos multi-leg de tesorería internacional (`Santander -> Global66 -> proveedor/colaborador`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Ledger-First Reconciliation Core

- absorber el residual de `TASK-179` y dejar `Finance > Conciliación` en `Postgres-only`
- mover la reconciliación operativa a `income_payments` y `expense_payments` como unidad canónica de caja
- corregir el carril de egresos para que candidatos, match y unmatch operen a nivel `expense_payment`
- cerrar el contrato manual payment-level (`matchedPaymentId`) en UI + API + store
- eliminar cualquier reader visible de conciliación que siga derivando “pendientes” desde documentos cuando exista ledger real

### Slice 2 — Instrument-Aware Periods & Statement Import Hardening

- alinear `reconciliation_periods` con el contrato de `payment instruments` proveniente de `TASK-281`
- definir qué metadata mínima del instrumento debe vivir o resolverse en el período y en las filas importadas
- volver idempotente la importación de extractos/reportes para evitar duplicados por reimport o retry
- endurecer reglas de período para distinguir `open`, `in_progress`, `reconciled`, `closed` sin ambigüedad de estados

### Slice 3 — Settlement Orchestration Model

- introducir el modelo operativo para `settlement groups` y `settlement legs`
- soportar explícitamente estos tipos de movimiento:
  - `internal_transfer`
  - `funding`
  - `fx_conversion`
  - `payout`
  - `fee`
- formalizar la regla de que `funding` o transferencia interna no liquida la obligación; el leg que liquida es el `payout` al beneficiario
- dejar trazabilidad para banco directo, wallet/fintech y flujos mixtos como `Santander -> Global66 -> proveedor/colaborador`

### Slice 4 — Cobros, Pagos & Reconciliation UX Integration

- hacer que `Conciliación`, `Cobros` y `Pagos` lean el mismo contrato semántico y los mismos estados
- exponer visualmente:
  - estado del pago/cobro
  - estado de conciliación
  - instrumento
  - rail
  - referencia externa
- alinear filtros, drilldowns y acciones manuales para que el operador no cambie de lenguaje entre módulos

### Slice 5 — Reactive Events & Downstream Consumers

- agregar eventos outbox canónicos para conciliación y cierre de período
- definir qué projections y consumers downstream deben escuchar:
  - `operational_pl`
  - `client_economics`
  - cash position
  - data quality / remediation
  - observabilidad operativa
- asegurar que los cambios de conciliación materialmente relevantes queden encapsulados en transacciones con publicación de outbox coherente

### Slice 6 — Historical Drift, Backfill & Guardrails

- definir estrategia de remediación para documentos/pagos ya registrados pero mal conciliados o no conciliables bajo el contrato viejo
- agregar guardrails de data quality para detectar:
  - payment rows sin reconciliación consistente
  - mismatches entre documento, payment y statement rows
  - imports duplicados
- dejar ready una ruta de rollout por fases sin romper el runtime actual

## Out of Scope

- integración directa por API con bancos o con `Global66`
- treasury forecasting avanzado o cash pooling
- OMS completa de tesorería multi-entidad
- pricing, optimización o ruteo automático entre rails
- automatización full-auto de matching sin revisión humana en todos los casos

## Detailed Spec

### Principios de diseño

- `sales invoice` = `receivable obligation`
- `purchase/vendor bill` = `payable obligation`
- `income_payment` = cash event `incoming`
- `expense_payment` = cash event `outgoing`
- `settlement leg` = unidad conciliable real contra instrumento o provider statement

### Casos operativos que esta task debe cubrir

1. cobro directo en banco
2. pago directo desde banco a proveedor
3. pago internacional `Swift` directo
4. pago internacional indirecto:
   - `Santander -> Global66`
   - `Global66 -> proveedor/colaborador`
5. múltiples pagos parciales sobre una misma obligación
6. fees y FX separados del principal

### Contrato conceptual mínimo

- `payment_id`
- `settlement_leg_id`
- `settlement_group_id`
- `payment_account_id` / `instrument_id`
- `movement_type`
- `rail`
- `provider_reference`
- `provider_status`
- `amount`
- `currency`
- `amount_clp`
- `exchange_rate_at_payment`
- `fee_amount`
- `is_reconciled`
- `reconciliation_row_id`

### Eventos esperados

- `finance.income_payment.reconciled`
- `finance.income_payment.unreconciled`
- `finance.expense_payment.reconciled`
- `finance.expense_payment.unreconciled`
- `finance.payment_leg.recorded`
- `finance.payment_leg.reconciled`
- `finance.payment_leg.unreconciled`
- `finance.internal_transfer.recorded`
- `finance.fx_conversion.recorded`
- `finance.reconciliation_period.reconciled`
- `finance.reconciliation_period.closed`

### Orden recomendado de implementación

1. cerrar `TASK-179` Postgres-only
2. alinear reconciliation core a ledgers
3. endurecer imports/periods
4. introducir settlement model
5. cablear outbox + consumers
6. remediar histórico y cerrar rollout

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `Conciliación` deja de depender de `income` / `expenses` como unidad canónica cuando existe `income_payments` / `expense_payments`
- [ ] egresos pueden conciliarse a nivel `expense_payment`, incluyendo pagos parciales y múltiples pagos
- [ ] el flujo manual envía y consume `matchedPaymentId` de forma consistente
- [ ] el módulo soporta explícitamente instrumentos y settlement semantics para `bank direct`, `internal transfer`, `funding`, `payout`, `fee` y `fx conversion`
- [ ] reimportar el mismo statement/report no duplica filas ni corrompe el período
- [ ] existen eventos outbox canónicos para `reconciled`, `unreconciled` y cierre de período
- [ ] `Cobros`, `Pagos` y `Conciliación` muestran estados compatibles y coherentes entre sí
- [ ] el caso `Santander -> Global66 -> proveedor/colaborador` puede modelarse y conciliarse sin cerrar la obligación en el leg equivocado

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual o preview de:
  - registro de cobro y conciliación contra statement
  - registro de pago y conciliación contra statement
  - unmatch / rematch sin drift
  - caso multi-leg con transferencia interna + payout

## Closing Protocol

- [ ] dejar actualizado `docs/documentation/finance/modulos-caja-cobros-pagos.md` con la semántica final de `estado`, `conciliación`, `instrumento` y `settlement`
- [ ] documentar explícitamente los eventos outbox nuevos y sus consumers relevantes en `project_context.md` y `Handoff.md`
- [ ] registrar cualquier cambio de rollout/backfill o limitación operativa residual antes de mover la task a `complete`

## Follow-ups

- posibles tareas derivadas de integración directa con providers (`Global66`, bancos, rails locales)
- treasury analytics / FX exposure management
- automation y scoring avanzado de auto-match sobre settlement legs

## Open Questions

- si `settlement legs` nacen en esta task con tabla propia o como extensión transitoria del payment ledger hasta un follow-on de treasury
- si el primer release enterprise soporta conciliación por instrumento no bancario solo vía import manual de reportes o también vía conectores
