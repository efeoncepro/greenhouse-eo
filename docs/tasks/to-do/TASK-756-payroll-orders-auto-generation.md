# TASK-756 — Auto-generación de Payment Orders desde Payroll exportado

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-748` ✅, `TASK-749` ✅, `TASK-750` ✅, `TASK-751` ✅
- Branch: `task/TASK-756-payroll-orders-auto-generation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cuando una nómina se cierra/exporta, hoy se materializan obligations
correctamente (TASK-748) pero las **payment orders** quedan pendientes de
crear manualmente desde `/finance/payment-orders`. Esta task agrega el
puente faltante: un projection consumer que escucha `payroll_period.exported`
y agrupa las obligations vivas del período en payment orders draft
preliminares, agrupadas por route resuelto + currency + processor, listas
para que el checker apruebe sin armarlas a mano.

## Why This Task Exists

V1 entregó las 4 piezas del programa Payment Orders pero el contrato
operativo del operator quedó incompleto: el usuario espera que cerrar
nómina dispare automáticamente la creación de orders, no solo de
obligations. Hoy:

- Cierro nómina → 8 obligations generadas ✓
- Quedan en estado `generated` esperando una order ❌
- Operator debe ir a `/finance/payment-orders`, seleccionar manualmente,
  click en "Crear orden", configurar provider/método aunque ya hay
  perfil activo del beneficiary

Eso es 4 pasos extras innecesarios cuando el resolver (TASK-749) ya sabe
exactamente qué provider/método usar para cada beneficiary. El sistema
debería hacerlo automático.

## Goal

- Cuando `payroll_period.exported` ocurre, agrupar obligations vivas del
  período por `(provider_slug, currency, payment_method)` resuelto via
  `resolvePaymentRoute()`
- Crear UNA payment order draft por grupo en estado `pending_approval`
  con `created_by='system:auto-generation'`
- Snapshot de routing en metadata + lines lockean obligations
- Drift: obligations sin perfil resuelto NO se incluyen en ningún grupo
  → quedan visibles en queue de drift de surface ops para que el operator
  cree el perfil y re-disparé

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-749-beneficiary-payment-profiles-routing.md`
- `docs/tasks/complete/TASK-750-payment-orders-batches-maker-checker.md`
- `docs/tasks/complete/TASK-751-payroll-settlement-orchestration-reconciliation.md`

Reglas obligatorias:

- **Maker-checker se preserva**: order generada por sistema usa
  `created_by='system:auto-generation'` que es DISTINTO a cualquier
  user real, por lo que cualquier human approver siempre cumple
  `approved_by != created_by` (defense in depth ya garantizada por trigger DB).
- **Idempotency**: re-export del mismo período NO duplica orders. Partial
  unique index sobre `(period_id, provider_slug, currency, batch_kind='payroll')
  WHERE state NOT IN cancelled/failed`.
- **Profile drift = order missing**: si una obligation no tiene perfil
  resuelto, NO se incluye en ninguna order. Queda como obligation
  `generated` huerfana visible en drift card. Cuando se cree el perfil,
  next refresh re-disparado por TASK-749b o manual genera la order
  faltante.
- **Mixed currencies**: V1 de TASK-750 prohibe orders multi-currency
  → este consumer crea N orders separadas (CLP, USD).
- **Grouping policy**: agrupar por `(provider_slug, currency, payment_method)`.
  Eso da una orden por rail, no una orden por miembro. Si 5 colaboradores
  cobran via Global66 USD → 1 orden de 5 lines. Si 3 cobran BCI CLP → otra
  orden de 3 lines.
- **Lock atomico**: la creación de cada order corre en una sola tx con
  `createPaymentOrderFromObligations` que ya garantiza el lock idempotente
  sobre lines.

## Dependencies & Impact

### Depends on

- `TASK-748` ✅ obligations
- `TASK-749` ✅ resolver
- `TASK-750` ✅ orders + maker-checker
- `TASK-751` ✅ wireup ledger

### Blocks / Impacts

- Cierra el contrato operativo end-to-end del operator: cerrar nómina =
  ver orders listas para aprobar.
- Reduce ~80% del trabajo manual del operator después del export.
- Habilita future scheduled ramp (cron diario que verifica periods sin
  orders generadas y reintenta).

### Files owned

- `src/lib/finance/payment-orders/auto-generate-from-period.ts`
- `src/lib/sync/projections/auto-generate-orders-from-payroll.ts`
- `src/app/api/admin/finance/payment-orders/auto-generate/route.ts` (manual trigger)
- `migrations/<timestamp>_task-756-orders-auto-generation-idempotency.sql`
  (partial unique index aditivo)
- `docs/documentation/finance/auto-generacion-ordenes-pago.md`
- `docs/manual-de-uso/finance/auto-generacion-ordenes-pago.md`

## Current Repo State

### Already exists

- `materializePayrollObligationsForExportedPeriod` materializa obligations.
- `resolvePaymentRoute` resuelve provider+método+instrumento por beneficiary.
- `createPaymentOrderFromObligations` crea order con idempotency lock.
- `paymentObligationsFromPayrollProjection` consumer reactive listener.

### Gap

- No hay consumer que tome las obligations recién materializadas y las
  agrupe en orders.
- No hay agrupador por route + currency.
- No hay manual re-trigger endpoint para casos de drift resuelto a posteriori.
- No hay idempotency garantizada a nivel period × provider × currency
  (TASK-750 garantiza por obligation_id pero no por grupo).

## Scope

### Slice 1 — Helper canónico

`autoGenerateOrdersFromPeriod({ periodId, year, month })`:

1. Lista obligations vivas del período con status='generated' y
   `source_kind='payroll'` (excluye Deel/provider_payroll con amount=0
   que no requieren orden — ese path es transparent pass-through).
2. Para cada obligation, llama `resolvePaymentRoute()`. Si outcome !=
   'resolved', skipea con reason `profile_missing|profile_pending_approval`.
3. Agrupa las obligations resueltas por
   `(provider_slug, currency, payment_method)`.
4. Para cada grupo, llama `createPaymentOrderFromObligations({...,
   createdBy: 'system:auto-generation', requireApproval: true })`.
5. Retorna `{ ordersCreated: [...], skippedObligations: [{obligationId, reason}] }`.

### Slice 2 — Projection consumer reactive

`autoGenerateOrdersFromPayrollProjection`:
- triggerEvents: `payroll_period.exported`
- maxRetries: 2
- llama el helper de slice 1
- corre DESPUÉS del consumer de obligations (orden de registración)

### Slice 3 — Idempotency partial unique index

Migración aditiva:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_auto_generated_uniq
  ON greenhouse_finance.payment_orders (
    period_id, processor_slug, currency, batch_kind
  )
  WHERE batch_kind = 'payroll'
    AND state NOT IN ('cancelled', 'failed')
    AND created_by = 'system:auto-generation';
```

Garantiza que re-export del mismo período NO duplica orders. Si se
quiere regenerar manualmente, primero cancelar la existente.

### Slice 4 — Manual trigger endpoint

`POST /api/admin/finance/payment-orders/auto-generate?periodId=X` para
re-disparar manualmente. Útil cuando:
- Un perfil que estaba missing se aprueba después
- El consumer falló y quedó en dead queue
- Operator necesita forzar re-generación

Capability: `finance.payment_profiles.create` (mismo gate que crear order).

### Slice 5 — UI signal

En PayrollPaymentStatusCard agregar estado `orders_auto_generated_pending_approval`
y mostrar count + CTA "Aprobar pendientes" → /finance/payment-orders.

## Out of Scope

- Auto-aprobación (siempre requiere maker-checker humano)
- Programación automática de fecha (V2)
- Splits multi-method (queda en TASK-755)
- Procesamiento de obligations fuera de payroll (supplier invoices, tax)

## Acceptance Criteria

- [ ] Cerrar nómina con N obligations resueltas → N orders draft pending_approval
- [ ] Mixed currencies → 1 orden por currency
- [ ] Mixed providers → 1 orden por provider
- [ ] Obligation sin perfil → no entra en ninguna orden, queda como drift
- [ ] Re-export mismo período no duplica orders (partial unique index)
- [ ] Manual trigger endpoint funciona post-deploy
- [ ] Tests cubren los 5 escenarios + idempotency

## Verification

- `pnpm vitest run src/lib/finance/payment-orders src/lib/sync/projections`
- `pnpm exec eslint src/lib/finance/payment-orders src/lib/sync/projections`
- `pnpm build`
- `pnpm pg:connect:migrate`
- Smoke staging: cerrar period 2026-05 con obligations resueltas → ver
  orders auto-creadas en `/finance/payment-orders` antes de 30s.

## Closing Protocol

- [ ] Lifecycle del markdown sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado: TASK-755 (splits) puede afectar el
  agrupador, TASK-752 (suppliers as beneficiary) extiende cobertura
