# TASK-799 — Payment Order Processor Source + Settlement Policy

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Completada 2026-05-05`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop`
- GitHub Issue: `optional`

## Summary

Endurece Payment Orders para separar processor/rail (`deel`, `global66`) del instrumento financiero real que se rebaja (`source_account_id`). Reutiliza `settlement-orchestration` existente y evita que Deel aparezca o se use como cuenta/caja cuando opera solo como processor.

## Why This Task Exists

El flujo real no es "pagar desde Deel": Greenhouse puede pagar Deel con la TC Santander Corp y luego Deel paga al contractor. En cambio, Global66 sí puede operar como cuenta/saldo propio. El runtime actual mezcla estos conceptos porque:

- `/finance/payment-orders` fuerza `payment_method='bank_transfer'` y salta el resolver de perfiles.
- El selector de source account muestra cuentas activas por moneda sin validar semántica de processor/caja.
- DB tiene `deel-clp` activo como `payment_platform`, lo que puede contaminar cash si se usa como source.
- `markPaymentOrderPaidAtomic` registra `expense_payment` sin resolver policy de processor/source/settlement.

## Goal

- Separar de forma ejecutable `processor_slug`/`payment_method` de `source_account_id`.
- Bloquear Deel como source instrument cuando no mantiene caja propia para la orden.
- Permitir Global66 como source instrument cuando exista como fintech/cuenta activa.
- Reutilizar `recordExpensePayment(... settlementConfig)` y `settlement-orchestration` en vez de crear paths paralelos.
- Dejar UI/API con copy y validaciones alineadas a Tesorería.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/documentation/finance/ordenes-de-pago.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/documentation/finance/conciliacion-bancaria.md`

Reglas obligatorias:

- `source_account_id` apunta a instrumento financiero real que se rebaja o contrae deuda.
- `processor_slug` identifica rail/procesador operativo.
- Processors no deben inflar cash si no mantienen saldo propio.
- Payment Orders pertenece a Finance/Tesorería; Payroll solo genera obligations.
- No crear columnas nuevas si `metadata_json` + `settlement-orchestration` cubren el snapshot V1.

## Normative Docs

- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `DESIGN.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-748` Payment Obligations Foundation.
- `TASK-749` Beneficiary Payment Profiles + Routing Resolver.
- `TASK-750` Payment Orders runtime.
- `TASK-751` Payroll Settlement Orchestration.
- `TASK-765` Atomic mark-paid hard-gate.
- `greenhouse_finance.accounts`
- `greenhouse_finance.payment_orders`
- `greenhouse_finance.expense_payments`
- `greenhouse_finance.settlement_groups`
- `greenhouse_finance.settlement_legs`

### Blocks / Impacts

- `TASK-793` Contractor Payables to Finance Payment Obligations Bridge.
- `TASK-795` International Contractor + Provider Boundary + FX Policy.
- `TASK-757` Payment Processor Execution Sync + Global66 Webhook Adapter.
- `/finance/payment-orders`
- Payroll downstream payment status.

### Files owned

- `src/lib/finance/payment-orders/create-from-obligations.ts`
- `src/lib/finance/payment-orders/mark-paid-atomic.ts`
- `src/lib/finance/payment-orders/mark-paid.ts`
- `src/app/api/admin/finance/payment-orders/[orderId]/route.ts`
- `src/views/greenhouse/finance/payment-orders/CreateOrderDialog.tsx`
- `src/views/greenhouse/finance/payment-orders/OrderDetailDrawer.tsx`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/documentation/finance/ordenes-de-pago.md`

## Current Repo State

### Already exists

- `payment_orders.processor_slug`, `payment_method`, `source_account_id`, `metadata_json`.
- `settlement-orchestration.ts` with `settlementConfig.fundingInstrumentId`, `feeAmount`, `feeCurrency`.
- `recordExpensePayment` already accepts `settlementConfig`.
- `resolvePaymentRoute` returns provider/payment method/profile snapshot.
- DB has active `global66-clp`, `santander-corp-clp`, `santander-clp`, `santander-usd-usd`, and active but semantically risky `deel-clp`.

### Gap

- No canonical helper validates whether an account can be the payment order source for a processor.
- Create dialog sends `bank_transfer` by default and bypasses resolver.
- PATCH only validates account existence, not active/currency/processor compatibility.
- Mark-paid does not pass processor-aware settlement policy to `recordExpensePayment`.
- UI copy says "cuenta bancaria origen", hiding credit card/fintech/processor distinction.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

## Discovery Summary

Runtime y DB verificados el 2026-05-05:

- `deel-clp` existe activo como `payment_platform`, `provider_slug='deel'`, `default_for={payroll}`.
- `global66-clp` existe activo como `fintech`, `provider_slug='global66'`.
- Las orders USD de abril quedaron canceladas con `processor_slug=NULL`, `payment_method='bank_transfer'`, `source_account_id=NULL`.
- Obligations de Andrés/Daniela traen metadata `payrollVia='deel'`, pero sus payment profiles draft dicen `global66`; el resolver solo debe usar profiles activos.
- Primitive a reutilizar: `settlement-orchestration`; no crear ledger paralelo.

## Access model

- `routeGroups`: sin cambios, Finance existente.
- `views` / `authorizedViews`: sin nueva view; `/finance/payment-orders` existente.
- `entitlements`: sin nuevas capabilities en V1.
- `startup policy`: sin cambios.
- Decisión de diseño: hardening vive en helpers/API/UI existentes, no en una nueva surface.

## Skills

- `greenhouse-task-planner`: creación de task.
- `greenhouse-payroll-auditor`: frontera payroll via Deel/contractor.
- `greenhouse-finance-accounting-operator`: caja/processor/settlement.

## Subagent strategy

`sequential`. Los cambios comparten archivos de create/patch/mark-paid/UI y no conviene dividir ownership.

## Execution order

1. Crear helper canónico de source/processor policy.
2. Wirear `createPaymentOrderFromObligations` para resolver processor/payment method/source sin saltarse el resolver.
3. Wirear PATCH y mark-paid atomic con validación/policy.
4. Ajustar UI copy y selector.
5. Tests focalizados + docs.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Treasury source policy helper

- Crear helper server-side para validar `source_account_id` contra processor/payment method.
- Bloquear `provider_slug='deel'` como source instrument para orders Deel.
- Permitir `global66` como fintech source cuando existe activo.
- Derivar default source para Deel (`santander-corp-clp`) y Global66 (`global66-*` preferente).

### Slice 2 — Create / Patch / Mark-paid runtime

- Create order deja de forzar `bank_transfer` cuando el caller elige automático.
- Create order guarda snapshot de routing/treasury policy en `metadata_json`.
- PATCH valida active + compatibility.
- Mark-paid pasa `settlementConfig` cuando policy lo requiere.

### Slice 3 — Payment Orders UI

- Renombrar dialog a "Asignar instrumento de salida".
- Excluir instruments no elegibles para source.
- Mostrar método automático en creación y agregar Global66 al selector.
- Copy clara: processor ≠ cuenta.

### Slice 4 — Docs + tests

- Tests unitarios para policy helper y mark-paid/create behavior.
- Docs de arquitectura/funcional con la decisión Deel vs Global66.

## Out of Scope

- Integración API real Deel/Global66.
- Webhooks Global66.
- Tabla admin configurable de treasury-routing policies.
- Aprobación automática de payment profiles draft.
- Reconciliación bancaria de movimientos históricos ya cancelados.

## Detailed Spec

V1 usa helper code-versioned porque el contrato ya existe en runtime y el riesgo inmediato es corregir source/processor. Si surgen más processors o reglas por tenant, promover a tabla `greenhouse_finance.payment_processor_source_policy`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Deel no aparece ni se acepta como source instrument para una order Deel.
- [x] Global66 aparece/puede usarse como source instrument cuando la cuenta fintech activa existe.
- [x] Crear order puede dejar que el resolver decida processor/payment method.
- [x] PATCH rechaza cuentas inexistentes, inactivas o incompatibles.
- [x] Mark-paid preserva atomicidad y pasa settlement policy cuando aplique.
- [x] UI deja de llamar "cuenta bancaria" a instrumentos no bancarios.

## Verification

- `pnpm exec vitest run src/lib/finance/payment-orders/source-instrument-policy.test.ts src/lib/finance/payment-orders/mark-paid-atomic.test.ts src/lib/finance/payment-routing/resolve-route.test.ts --reporter=dot` — 22/22 pass.
- `pnpm exec eslint src/lib/finance/payment-orders/source-instrument-policy.ts src/lib/finance/payment-orders/source-instrument-policy.test.ts src/lib/finance/payment-orders/mark-paid-atomic.test.ts src/lib/finance/payment-orders/create-from-obligations.ts src/lib/finance/payment-orders/mark-paid-atomic.ts src/lib/finance/payment-orders/mark-paid.ts 'src/app/api/admin/finance/payment-orders/[orderId]/route.ts' src/views/greenhouse/finance/payment-orders/CreateOrderDialog.tsx src/views/greenhouse/finance/payment-orders/OrderDetailDrawer.tsx` — 0 errors, 0 warnings.
- `pnpm exec tsc --noEmit --pretty false` — clean.
- `pnpm design:lint` — 0 errors, 0 warnings.
- `pnpm pg:doctor` — runtime profile healthy.

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real.
- [x] el archivo vive en la carpeta correcta.
- [x] `docs/tasks/README.md` quedo sincronizado.
- [x] `Handoff.md` quedo actualizado.
- [x] `changelog.md` quedo actualizado si cambió comportamiento visible.
- [x] docs de arquitectura/funcionales quedaron actualizadas.

## Follow-ups

- Promover policy a tabla administrable si se agregan más rails o excepciones por tenant.
- TASK-757 debe consumir esta policy para processor execution sync.
- Revisar si `deel-clp` debe reclasificarse/inactivarse con migración de datos separada.
