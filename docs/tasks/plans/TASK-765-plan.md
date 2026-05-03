# Plan — TASK-765 Payment Order ↔ Bank Settlement Resilience

> **Type:** implementation · **Priority:** P0 · **Effort:** Alto · **Mode:** standard · **Checkpoint:** human (P0 + Alto requiere aprobación humana antes de ejecutar)

## Discovery summary

Cadena `payment_order.paid → bank impact` está parcialmente in-tx hoy: `markPaymentOrderPaid` ya acepta `client?: PoolClient` y publica outbox dentro de la misma tx via `publishOutboxEvent(event, client)`. Lo que NO es atómico hoy es el chain hasta `expense_payment + settlement_leg + account_balances`: viven detrás del outbox + projection asíncrono. La task convierte este path en transaccional.

**Hallazgos vs spec original:**

- **El INSERT primario de `expenses` (`createFinanceExpenseInPostgres`, postgres-store-slice2.ts:2155-2199) es 74↔74 balanceado.** El error PG `INSERT has more target columns than expressions` que dejó dead-letter para 2026-04 puede ser stale (commit posterior ya corrigió) o de otro pathway (`apply-payroll-reliquidation-delta`, `materialize-payments-from-period`, `factoring`, `anchored-payments`, `sync-nubox-to-postgres`). **Slice 2 reproduce primero, después aplica parity test universal**.
- **No existe `transitions.ts`** — validación de estado vive inline en cada mutador. Lo creamos como helper centralizado.
- **`recordExpensePayment` no acepta `client?` directamente.** Slice 5 extiende firma con `client?: PoolClient` opcional (cuando se pasa, no abre tx propia; misma técnica que `ensureSettlementForExpensePayment`).
- **`can()` confirmado** en `src/lib/entitlements/runtime.ts:665`, signature `can(tenant, capability, action, scope) → boolean`. Patrón ya usado en `resend-payslips/route.ts:36-41`.

**Dependencias confirmadas satisfechas:**

- TASK-748 ✅ (payment obligations) · TASK-750 ✅ (payment orders foundation) · TASK-751 ✅ (payroll settlement V1) · TASK-708 ✅ (settlement legs canonical) · TASK-703 ✅ (OTB + cascade-supersede) · TASK-742 ✅ (resilience pattern reference)
- 93 columnas en `expenses`, CHECK `expense_payments_account_required_after_cutover` vigente, sign convention liability TASK-703 estable.

## Access model

Esta task NO toca routeGroups, views, ni startup policy. Solo agrega 2 capabilities nuevas al motor de entitlements:

- `routeGroups`: sin cambio (`finance` y `admin` ya existen).
- `views` / `authorizedViews`: sin cambio.
- `entitlements` / capabilities: **2 nuevas granulares** — `finance.payroll.rematerialize` (action `update`, scope `tenant`) y `finance.payment_orders.recover` (action `update`, scope `tenant`). Decisión: principio de least-privilege, audit fino. Reservadas para FINANCE_ADMIN + EFEONCE_ADMIN.
- `startup policy`: sin cambio.

**Decisión de diseño:** los 2 endpoints admin nuevos usan el patrón canónico `requireAdminTenantContext()` + `can(tenant, capability, 'update', 'tenant')`. Si `can()` retorna false → 403.

## Skills

- **Slice 1, 2, 3, 4, 5, 6:** `greenhouse-backend` (migrations, API routes, helpers, schemas).
- **Slice 1 (UI gate):** `greenhouse-dev` + `greenhouse-ux` + `greenhouse-ux-writing` (form validation + error message es-CL).
- **Slice 7:** `greenhouse-backend` (queries reliability) + `greenhouse-dev` + `greenhouse-ux` + `greenhouse-ux-writing` (banner UI + copy de severity messages).
- **Slice 8:** `greenhouse-backend` (recovery endpoint, exec).
- **Documentación final:** sin skill especializada — actualización directa de `CLAUDE.md`, `Handoff.md`, `changelog.md`, `docs/architecture/*`.

## Subagent strategy

**`fork` — 3 subagentes coordinados** + algunos slices ejecutados secuencialmente por el agente principal cuando hay dependencia causal.

### Slices secuenciales (agente principal)

1. **Slice 0 (preparación):** ya completada — branch creada, task movida a in-progress, README/Handoff sincronizados, plan committed.
2. **Slice 1 (Hard-gate `source_account_id`):** **secuencial** — bloquea slices 5 y 8. Touches migration, transitions.ts, mark-paid.ts, errors.ts, UI form. Files owned se solapan parcialmente con otros slices, mejor ejecutar en serie.
3. **Slice 2 (Parity test + reproducción del error):** **secuencial post-Slice 1** — primero reproducimos en dev (rerun materializer 2026-04 contra DB local con proxy levantado o staging), luego construimos el test universal. Si reproducción confirma que el error es stale, slice 8 puede ser más simple.
4. **Slice 6 (state machine hardening):** **secuencial post-Slice 1** — depende del audit log que también creamos aquí. Toca migrations + helper `recordPaymentOrderStateTransition`.
5. **Slice 5 (atomicidad `mark-paid-atomic`):** **secuencial post-Slices 1, 6** — necesita el helper de transitions, el audit log helper, la firma `recordExpensePayment(client?)` lista.
6. **Slice 8 (recovery del incidente):** **secuencial al final** — necesita Slices 1, 2, 3, 4, 5, 6 todos verdes.

### Slices paralelizables (subagentes fork)

Después de Slice 1 + Slice 2 (que producen el helper de transitions y el parity test), los siguientes 3 son **independientes** y pueden ir en paralelo en subagentes:

- **Subagent A — Slice 3 (Endpoint admin rematerialize)**
  - Files owned: `src/app/api/admin/finance/payroll-expense-rematerialize/route.ts`, `src/app/api/admin/finance/payroll-expense-rematerialize/route.test.ts`, agregado en `src/config/entitlements-catalog.ts` (capability `finance.payroll.rematerialize`), agregado en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (`finance.payroll_expenses.rematerialized`).
  - Skill: `greenhouse-backend`.
  - Dependencies: ninguna interna (Slice 2 solo verifica; el endpoint usa `materializePayrollExpensesForExportedPeriod` ya existente).
  - Acceptance criteria: endpoint gated, idempotent, dryRun supported, outbox emitted, test verde.

- **Subagent B — Slice 4 (Resolver loud)**
  - Files owned: `src/lib/finance/payment-orders/record-payment-from-order.ts`, `src/lib/finance/payment-orders/errors.ts` (extender), `src/lib/finance/payment-orders/record-payment-from-order.test.ts`, `src/lib/sync/projections/record-expense-payment-from-order.ts`, `src/lib/sync/projections/finance-expense-reactive-intake.ts` (wrap captureWithDomain), agregado en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (`finance.payment_order.settlement_blocked`).
  - Skill: `greenhouse-backend`.
  - Dependencies: slice 3 ya creó el outbox event catalog entry para `settlement_blocked` (compartido); leer y extender. NO escribir esos paths simultáneamente — el catalog tiene un solo bloque por dominio.
  - Acceptance criteria: skip silencioso eliminado, throw tipado emitido, outbox `settlement_blocked` publicado, refresh_queue → `failed` en lugar de `completed`, captureWithDomain wired, tests cubren cada error path.

- **Subagent C — Slice 7 (Reliability signals + UI banner)**
  - Files owned: `src/lib/reliability/queries/payment-orders-paid-without-expense-payment.ts`, `src/lib/reliability/queries/payment-orders-dead-letter.ts`, `src/lib/reliability/queries/payroll-expense-materialization-lag.ts`, agregado en `src/lib/reliability/registry.ts`, `src/lib/reliability/queries/payment-orders.test.ts`, `src/views/greenhouse/finance/payment-orders/OrderDetailDrawer.tsx` (banner agregado).
  - Skill: `greenhouse-backend` + `greenhouse-dev` + `greenhouse-ux` + `greenhouse-ux-writing`.
  - Dependencies: slice 4 ya creó el outbox event `settlement_blocked`. El banner lee últimos events de ese tipo. **El subagente C lee el evento que produce slice 4** — NO escriben los mismos archivos pero hay dependencia de contrato. Ejecutar después de slice 4.
  - Acceptance criteria: 3 signals registrados, queries SQL con steady state 0, banner muestra alert + CTA, tests cubren los 3 readers.

**Regla de no-colisión confirmada:** los archivos owned de A, B, C son disjuntos excepto por `GREENHOUSE_EVENT_CATALOG_V1.md` (compartido entre A y B). El agente principal consolida ese archivo después de fork.

### Agente principal después del fork

Consolida outputs de A, B, C → corre `pnpm lint` + `pnpm tsc --noEmit` + `pnpm test` sobre el resultado combinado → ejecuta slice 5 (atomic) + slice 8 (recovery).

## Execution order

**Total: 8 slices + verification + closing.**

```
[0] Preparación + plan          ← AGENTE PRINCIPAL — completed
       │
       ▼
[1] Hard-gate source_account_id ← AGENTE PRINCIPAL — secuencial
       │
       ▼
[2] Parity test + reproducir    ← AGENTE PRINCIPAL — secuencial
    error materializador
       │
       ├──→ [6] State machine hardening
       │       (audit log + triggers)  ← AGENTE PRINCIPAL — secuencial
       │           │
       │           ▼
       │      [5] mark-paid-atomic     ← AGENTE PRINCIPAL — secuencial
       │
       └──→ FORK: paralelo
              ├── Subagent A: [3] Endpoint admin rematerialize
              ├── Subagent B: [4] Resolver loud
              └── ... (B antes de C en serie por contrato)
                   └── Subagent C: [7] Reliability signals + UI banner
       │
       ▼
[5] AGENTE PRINCIPAL espera fork + consolida + ejecuta atomic
       │
       ▼
[8] Recovery del incidente actual ← AGENTE PRINCIPAL — manual + verificable
       │
       ▼
[VERIFY] build + lint + tsc + test + pg:doctor
       │
       ▼
[CLOSE] move to complete + README + Handoff + changelog + CLAUDE.md + cross-task impact check
```

## Files to create

### Migrations (4)

- `migrations/<ts>_task-765-payment-orders-source-account-required.sql`
- `migrations/<ts>_task-765-payment-order-state-transitions-audit.sql`
- `migrations/<ts>_task-765-payment-order-state-transition-triggers.sql`

### Backend / lib

- `src/lib/finance/payment-orders/transitions.ts` (NEW — helper centralizado)
- `src/lib/finance/payment-orders/errors.ts` (NEW — tipos de error estables)
- `src/lib/finance/payment-orders/mark-paid-atomic.ts` (NEW — orquestación in-tx)
- `src/lib/finance/payment-orders/recordPaymentOrderStateTransition.ts` (NEW — audit log writer)
- `src/lib/finance/expense-insert-column-parity.ts` (NEW — parity test helper)
- `src/lib/reliability/queries/payment-orders-paid-without-expense-payment.ts` (NEW)
- `src/lib/reliability/queries/payment-orders-dead-letter.ts` (NEW)
- `src/lib/reliability/queries/payroll-expense-materialization-lag.ts` (NEW)

### API routes

- `src/app/api/admin/finance/payroll-expense-rematerialize/route.ts` (NEW)
- `src/app/api/admin/finance/payment-orders/[orderId]/recover/route.ts` (NEW)

### Tests

- `src/lib/finance/payment-orders/mark-paid-atomic.test.ts` (NEW)
- `src/lib/finance/payment-orders/transitions.test.ts` (NEW)
- `src/lib/finance/payment-orders/errors.test.ts` (NEW — error code stability)
- `src/lib/finance/expense-insert-column-parity.test.ts` (NEW — universal a 6 INSERTs)
- `src/lib/reliability/queries/payment-orders.test.ts` (NEW)
- `src/app/api/admin/finance/payroll-expense-rematerialize/route.test.ts` (NEW)
- `src/app/api/admin/finance/payment-orders/[orderId]/recover/route.test.ts` (NEW)

## Files to modify

- `src/lib/finance/payment-orders/mark-paid.ts` — delegar a `mark-paid-atomic.ts`; preservar firma pública pero rutea al path atómico.
- `src/lib/finance/payment-orders/record-payment-from-order.ts` — refactor: skip silencioso → throw tipado + outbox `settlement_blocked` + `captureWithDomain`.
- `src/lib/sync/projections/record-expense-payment-from-order.ts` — error_class propagado (cuando `recordPaymentForOrder` throw, projection retorna error → reactive worker lo rutea a dead-letter).
- `src/lib/sync/projections/finance-expense-reactive-intake.ts` — wrap `captureWithDomain(err, 'finance', { source: 'payroll_expense_materialization' })` antes de re-throw.
- `src/lib/finance/expense-payment-ledger.ts` — `recordExpensePayment` extiende firma con `client?: PoolClient` (compatibilidad backwards: sin client → comportamiento actual).
- `src/lib/finance/postgres-store-slice2.ts:2155-2199` — auditar/reparar drift si el slice 2 detecta la real cause (tentativamente la INSERT está OK; reproduce primero).
- `src/lib/finance/payroll-expense-reactive.ts` — sin cambios funcionales; usable directo desde endpoint admin.
- `src/lib/reliability/registry.ts` — agregar entry `finance.payment_orders` o extender `Finance Data Quality` con 3 signals nuevos.
- `src/lib/reliability/signals.ts` — wire de los 3 nuevos signal builders.
- `src/config/entitlements-catalog.ts` — agregar 2 capabilities (`finance.payroll.rematerialize`, `finance.payment_orders.recover`).
- `src/views/greenhouse/finance/payment-orders/CreateOrderDialog.tsx` — agregar campo `sourceAccountId` (Select) con validación required al transicionar a `pending_approval` o más allá.
- `src/views/greenhouse/finance/payment-orders/OrderDetailDrawer.tsx` — banner rojo si hay event `settlement_blocked` reciente + CTA "Recuperar".

### Docs

- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — agregar 3 events nuevos con shape v1 versionado.
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — sección "Payment Order Bank Settlement (atomic contract)".
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — entry para `finance.payment_orders` module + 3 signals.
- `CLAUDE.md` — sección "Finance — Payment order ↔ bank settlement invariants (TASK-765)" con reglas duras.
- `Handoff.md` — registro al cerrar.
- `changelog.md` — entry visible.

## Files to delete

- Ninguno. La refactorización es aditiva. El proyector reactivo se preserva como safety net.

## Risk flags

- **Producción tiene 2 órdenes zombie.** Slice 8 toca producción. Hago dry-run primero, después aplica con explicit confirmation del usuario antes de UPDATE.
- **`mark-paid-atomic.ts` cambia el contrato downstream.** El proyector reactivo sigue corriendo después del path atómico (idempotencia preservada por unique index), pero hay que verificar que NO emite `settlement_blocked` falso cuando la línea ya fue pagada por el path atómico. Test específico cubre este escenario.
- **`expense-insert-column-parity` test podría fallar build inmediatamente** si descubre drift en alguno de los 6 INSERTs. Plan de contingencia: si la primera ejecución encuentra un drift real, fix dirigido en mismo slice; si encuentra un falso positivo (e.g. trigger de auto_partition que agrega columnas internas), ajusta el test para excluir.
- **Triggers PG anti-zombie pueden romper migraciones legacy o seeds de testing.** Backfill defensivo del audit log antes del trigger CREATE; trigger usa BEFORE INSERT/UPDATE para que las migraciones legacy no fallen retroactivamente sobre datos viejos válidos.
- **TASK-756 (auto-generación de payment_orders) está P1 en backlog.** Si TASK-756 emerge antes de TASK-765 cierre, las 2 son compatibles: TASK-756 invoca `markPaymentOrderPaidAtomic` cuando aprueba batch, no requiere refactor.
- **TASK-759 (payslip delivery on payment paid)** consume el outbox event `finance.payment_order.paid` que sigue emitiéndose por el path atómico — cero cambio de contrato downstream.

## Open questions (resueltas pre-plan)

- **Cuenta origen para recovery:** ✅ Santander CLP (confirmado por usuario).
- **Path atómico vs proyector:** ✅ Atómico canónico, proyector safety net read-only.
- **Capabilities:** ✅ 2 nuevas granulares (`finance.payroll.rematerialize`, `finance.payment_orders.recover`).
- **Audit log linkea event_id?** ✅ NO. Trazabilidad por `(order_id, occurred_at)` y `metadata_json` con `outboxEventIds[]` opcional. FK al outbox sería caro (tabla outbox eventualmente se puede archivar por TTL).

## STOP checkpoint

Esta task es **P0 + Effort Alto** — protocolo TASK-765 exige aprobación humana antes de Execution.

Espero confirmación antes de:
1. Iniciar Slice 1 (migration + UI gate).
2. Ejecutar `pnpm migrate:up` (aplica migraciones a la DB de dev).
3. Tocar paths de producción en Slice 8.

Si el usuario aprueba, procedo end-to-end y reporto al final de cada slice. Si hay observaciones, actualizo este plan con `## Delta YYYY-MM-DD`.
