# TASK-765 — Payment Order ↔ Bank Settlement Resilience

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none` (foundations TASK-748, TASK-750, TASK-751, TASK-708, TASK-703 ya cerradas)
- Branch: `task/TASK-765-payment-order-bank-settlement-resilience`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Las `payment_orders` pueden quedar en `state='paid'` sin generar movimientos contables downstream — sin `expense_payment`, sin `settlement_leg`, sin afectar `account_balances` del banco. Hoy esto pasa silenciosamente: outbox publica, proyector skipea con `recorded=0 skipped=1`, refresh_queue marca `completed`. Operador ve "pagado" en UI, banco intacto, nadie alerta. Esta task convierte el path `payment_order.paid → bank impact` en un contrato resiliente, transaccional y observable end-to-end.

## Why This Task Exists

**Incidente origen 2026-05-01 (sin notificación, detectado por usuario):**

1. Período payroll 2026-04 exportado 17:32 UTC → outbox `payroll_period.exported`.
2. Proyección `finance_expense_reactive_intake` reaccionó 17:40 UTC → falló con `INSERT has more target columns than expressions` → dead-letter después de 1 retry. **0 filas en `expenses` para 2026-04.**
3. Operador creó 2 `payment_orders` (Luis Reyes $148,312.50 + Humberly Henriquez $254,250.00) sin `source_account_id`. UI permitió aprobar y marcar `paid`.
4. Outbox publicó `finance.payment_order.paid` → proyección `record_expense_payment_from_order` ejecutó 3 veces → cada una `result=coalesced:recorded=0 skipped=1`. **Skip silencioso porque resolver no encontró `expenses` para `(period=2026-04, member_id)`.**
5. Cero `expense_payments`, cero `settlement_legs`, cero impacto en `account_balances`.
6. El usuario detectó el problema porque el banco no rebajó saldo. No hubo alerta automática.

**Tres fallas estructurales en cadena:**

- **F1 (UI/DB):** Wizard permite `source_account_id=NULL` en aprobación; no hay CHECK al transicionar a `paid`. CHECK `expense_payments_account_required_after_cutover` (post 2026-04-28) habría rechazado el insert downstream igual.
- **F2 (materializer broken):** `createFinanceExpenseInPostgres` tiene drift de columnas vs `information_schema.columns` de `greenhouse_finance.expenses` (93 columns) → INSERT falla con error SQL no recuperable.
- **F3 (silent skip):** Resolver del proyector retorna `null` cuando no encuentra `expenses` y skipea sin error_class. No alerta, no dead-letter, no rollback de `state=paid`. La order queda zombie.

Sin esta task, cada vez que una de las 3 capas falle (drift de columnas, UI sin cuenta, lookup miss), el sistema vuelve a perder pagos sin avisar.

## Goal

- **Hard-gate `source_account_id`** en transición a `paid`: CHECK constraint nivel DB + guard nivel TS + UI required al aprobar. Cero órdenes nuevas pueden quedar `paid` sin cuenta.
- **Atomicidad transaccional** del path `state=paid ↔ expense_payment ↔ settlement_leg`: una sola tx, rollback completo si cualquier step falla, idempotencia preservada.
- **Resolver loud, no silencioso:** cuando precondición falle (e.g. `expenses` ausente), el proyector hace materialize-or-throw, no skip. Refresh_queue → `failed`, dead-letter, captureWithDomain, outbox event `finance.payment_order.settlement_blocked` con razón estructurada.
- **Test de paridad columna↔placeholder** que falla build si `createFinanceExpenseInPostgres` (y otros 3 INSERTs wide) desfasan vs `information_schema`.
- **Endpoint admin de rematerialización** idempotente para reparar períodos dead-letter sin requerir hand-coded SQL.
- **Reliability signals nuevos** en `RELIABILITY_REGISTRY` que rollean al subsystem `Finance Data Quality`: paid orders sin expense_payment, dead-letter del proyector, lag de materialización payroll.
- **State machine hardening:** triggers PG anti-zombie + audit log append-only `payment_order_state_transitions`.
- **Recovery del incidente actual:** las 2 órdenes Luis + Humberly quedan reflejadas en banco con `expense_payment` + `settlement_leg` + `account_balances` rematerializado, sin perder los datos ni romper idempotencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — documento maestro
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — Finance dual-store + outbox + allocations
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — contrato Payroll + materializador `payroll_period.exported → expenses`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md` — projection registry, refresh_queue, error_class, recovery patterns
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_ALERTING_V1.md` — dead-letter, captureWithDomain, alerting contract
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — `RELIABILITY_REGISTRY`, signals, severity rollup, AI Observer
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — outbox event types canónicos (registrar `finance.payment_order.settlement_blocked`)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — node-pg-migrate, Kysely, ownership model
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capabilities para endpoint admin de rematerialización

Reglas obligatorias:

- Toda lectura de outflows del banco pasa por la VIEW canónica / helpers de `account_balances` — nunca query inline.
- Toda mutación de `expense_payments` con `payment_account_id IS NULL` post-cutover (2026-04-28) está prohibida por CHECK existente. Esta task NO lo bypassa — al revés, lo enforce upstream.
- Tres-axis supersede (TASK-702/708b) preservado en cualquier query nuevo: `superseded_at IS NULL AND superseded_by_otb_id IS NULL AND superseded_by_payment_id IS NULL`.
- `captureWithDomain(err, 'finance', { tags: { source } })` en cualquier error de auth/projection — nunca `Sentry.captureException` directo (regla TASK-742).
- Sign convention TASK-703 para liability accounts preservada.
- Idempotencia bidireccional (`expense_payments.payment_order_line_id` partial unique index) preservada — los retries no duplican.
- Outbox events nuevos respetan el catálogo: schema versionado, payload con `eventVersion`, registrado en `GREENHOUSE_EVENT_CATALOG_V1.md`.
- Endpoint admin gated por capability `finance.payroll.rematerialize` (a definir) + `requireAdminTenantContext`.

## Normative Docs

- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md` — patrón canónico para projection failures + recovery
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md` — secret hygiene si se introduce nuevo secret (no se prevé)
- `CLAUDE.md` § "Auth resilience invariants (TASK-742)" — patrón de 7-layer resilience como referencia conceptual
- `CLAUDE.md` § "Finance — OTB cascade-supersede (TASK-703b)" — sign convention para liability
- `docs/tasks/complete/TASK-748-payment-obligations-foundation.md` — modelo de obligations
- `docs/tasks/complete/TASK-750-payment-orders-foundation.md` — modelo de orders + state machine
- `docs/tasks/complete/TASK-751-payroll-settlement-orchestration-reconciliation.md` — wiring V1 + V1 limitations

## Dependencies & Impact

### Depends on

- `TASK-748` (Payment Obligations) ✅
- `TASK-750` (Payment Orders foundation) ✅
- `TASK-751` (Payroll Settlement V1) ✅
- `TASK-708` (Settlement Legs canonical) ✅
- `TASK-703` / `TASK-703b` (OTB + cascade-supersede + liability sign convention) ✅
- `TASK-742` (Auth Resilience pattern) ✅ — referencia conceptual de 7-layer defense
- Tabla `greenhouse_finance.payment_orders` con columnas `state`, `source_account_id`, `paid_at`, `payment_method`
- Tabla `greenhouse_finance.payment_order_lines` con FK bidireccional a `expense_payments`
- Tabla `greenhouse_finance.expenses` (93 columns post-2026-04) — la INSERT en `src/lib/finance/postgres-store-slice2.ts:2155-2200` debe re-auditarse columna a columna
- Tabla `greenhouse_finance.expense_payments` con CHECK `expense_payments_account_required_after_cutover` (vigente 2026-04-28)
- Tabla `greenhouse_finance.settlement_legs` + helper `ensureSettlementForExpensePayment`
- Tabla `greenhouse_finance.account_balances` + helper `materializeAccountBalance`
- Tabla `greenhouse_sync.outbox_events` + `outbox_reactive_log` + `projection_refresh_queue`
- `src/lib/reliability/registry.ts` con módulo `finance.payment_orders` (a agregar)
- Skill `greenhouse-backend`, `greenhouse-dev`, `greenhouse-ux`, `greenhouse-ux-writing`

### Blocks / Impacts

- **TASK-756** (Auto-generación de payment orders desde payroll exportado) — esta task fixea el path downstream que TASK-756 va a invocar masivamente. Recomendable cerrar TASK-765 antes de soltar TASK-756 a producción.
- **TASK-759** (Payslip delivery on payment paid) — comparte trigger `finance.payment_order.paid`. La atomicidad transaccional NO debe romper el outbox publishing que TASK-759 consume — outbox sigue siendo el contrato de notificación, solo cambia QUE el path crítico bank-side ya no depende del outbox.
- **TASK-707** (Previred canonical payment runtime) — V2 de TASK-751 incluye `employer_social_security`, `processor_fee`, etc. Esta task deja el resolver preparado para esos kinds (con throw explícito en lugar de skip silencioso) pero no los wirea — eso queda para una task derivada.
- **TASK-708c** (promote `payment_account_id` to NOT NULL) — esta task valida que el CHECK existente sigue siendo respetado y se vuelve más fuerte (gate upstream). TASK-708c puede ahora promover a NOT NULL real sin riesgo de regresión.
- **TASK-664** (Nubox payment graph reconciliation) — comparte el chain `expense_payment ↔ settlement_leg ↔ account_balances`. Este task NO cambia el contrato downstream, solo el upstream → cero impacto bidireccional.
- **TASK-672** (Platform Health API) — los nuevos signals del slice 5 deben aparecer en `/api/admin/platform-health` automáticamente vía Reliability Control Plane composer.
- **TASK-722** (Bank ↔ Reconciliation synergy) — el bridge `getReconciliationFullContext` ya lee desde `account_balances`. Cero cambio al contrato; las cuentas que se rematerialicen via slice 7 fluirán al workbench sin code change.
- **`/finance/payment-orders` UI** — el wizard de creación necesita un paso explícito de selección de `source_account_id` antes de permitir aprobación.
- **`/finance/bank` UI** — los signals nuevos del slice 5 pueden surfacearse en el dashboard de cada cuenta para que el operador vea órdenes con problema.

### Files owned

**Migrations (creadas vía `pnpm migrate:create`):**

- `migrations/<ts>_task-765-payment-orders-source-account-required.sql`
- `migrations/<ts>_task-765-payment-order-state-transitions-audit.sql`
- `migrations/<ts>_task-765-payment-order-state-transition-triggers.sql`
- `migrations/<ts>_task-765-finance-expense-insert-canonical-helper.sql` (opcional, según slice 4 design)

**Backend / lib:**

- `src/lib/finance/payment-orders/transitions.ts` — extender con `assertSourceAccountForPaid()`
- `src/lib/finance/payment-orders/mark-paid.ts` — convertir a transacción atómica que llama al nuevo `markPaymentOrderPaidAtomic`
- `src/lib/finance/payment-orders/mark-paid-atomic.ts` — **NUEVO** — orquesta UPDATE + recordPaymentForOrder + ensureSettlementForExpensePayment + outbox dentro de una sola tx
- `src/lib/finance/payment-orders/record-payment-from-order.ts` — refactor: skip silencioso → materialize-or-throw + outbox `finance.payment_order.settlement_blocked`
- `src/lib/finance/payment-orders/errors.ts` — **NUEVO** — `PaymentOrderMissingSourceAccountError`, `PaymentOrderExpenseUnresolvedError`, `PaymentOrderSettlementBlockedError` (códigos estables para UI)
- `src/lib/finance/payroll-expense-reactive.ts` — leve refactor para reusar `materializePayrollExpensesForPeriod` invocable desde el resolver y desde el endpoint admin de rematerialización
- `src/lib/finance/postgres-store-slice2.ts:2150-2252` — **AUDITAR** + reparar drift de columnas si existe (slice 4 lo verifica)
- `src/lib/finance/expense-insert-column-parity.ts` — **NUEVO** — helper que consulta `information_schema.columns` y compara contra el INSERT statement
- `src/lib/sync/projections/record-expense-payment-from-order.ts` — propagar nuevo error_class sin swallow
- `src/lib/sync/projections/finance-expense-reactive-intake.ts` — agregar wrap `captureWithDomain(err, 'finance', { source: 'payroll_expense_materialization' })` antes de re-throw
- `src/lib/reliability/registry.ts` — agregar módulo `finance.payment_orders` con 3 signals
- `src/lib/reliability/queries/payment-orders-paid-without-expense-payment.ts` — **NUEVO**
- `src/lib/reliability/queries/payment-orders-dead-letter.ts` — **NUEVO**
- `src/lib/reliability/queries/payroll-expense-materialization-lag.ts` — **NUEVO**

**API routes:**

- `src/app/api/admin/finance/payroll-expense-rematerialize/route.ts` — **NUEVO** — `POST { periodId, year, month, dryRun? }`, gated `finance.payroll.rematerialize`
- `src/app/api/admin/finance/payment-orders/[orderId]/recover/route.ts` — **NUEVO** — `POST { sourceAccountId, paidAt? }` para reparar órdenes paid-zombie

**Tests:**

- `src/lib/finance/postgres-store-slice2.test.ts` — agregar `expense-insert-column-parity` test
- `src/lib/finance/payment-orders/mark-paid-atomic.test.ts` — **NUEVO** — atomicidad rollback bajo failure inyectada
- `src/lib/finance/payment-orders/record-payment-from-order.test.ts` — convertir `recorded=0 skipped=1` skip cases en throw paths
- `src/lib/reliability/queries/payment-orders.test.ts` — **NUEVO** — paridad de los 3 signals contra fixtures
- `src/app/api/admin/finance/payroll-expense-rematerialize/route.test.ts` — **NUEVO**

**UI:**

- `src/views/greenhouse/finance/payment-orders/PaymentOrderDetailDrawer.tsx` — banner rojo si order tiene event `finance.payment_order.settlement_blocked` reciente
- `src/views/greenhouse/finance/payment-orders/PaymentOrderApprovalForm.tsx` — `source_account_id` required validation antes de submit
- `src/views/greenhouse/finance/bank/BankAccountSettlementsHealth.tsx` — **NUEVO** opcional — mini panel con signals del slice 5 para el operador

**Docs:**

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — sección "Payment Order Bank Settlement" actualizada con el contrato atómico
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — registrar `finance.payment_order.settlement_blocked`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — agregar entry para el nuevo módulo
- `CLAUDE.md` — nueva sección "Finance — Payment order ↔ bank settlement invariants (TASK-765)" con reglas duras
- `Handoff.md` — registro del incidente y del cierre
- `changelog.md` — entry visible
- `docs/tasks/complete/TASK-765-payment-order-bank-settlement-resilience.md` — al cerrar

## Current Repo State

### Already exists

- **State machine `payment_orders.state`** con 10 estados válidos, CHECK constraint, trigger maker-checker (`migrations/<ts>_task-750-...`).
- **Outbox events `finance.payment_order.{created,submitted,paid,...}`** — emitidos por [`src/lib/finance/payment-orders/mark-paid.ts:61-69`](src/lib/finance/payment-orders/mark-paid.ts#L61-L69) — `status=published` confirmado en producción.
- **Proyección `record_expense_payment_from_order`** — registrada con `triggerEvents: ['finance.payment_order.paid']` y `maxRetries: 2` ([`src/lib/sync/projections/record-expense-payment-from-order.ts:20-44`](src/lib/sync/projections/record-expense-payment-from-order.ts#L20-L44)). Funcional pero skip silencioso.
- **`recordPaymentForOrder`** ([`src/lib/finance/payment-orders/record-payment-from-order.ts:101-203`](src/lib/finance/payment-orders/record-payment-from-order.ts#L101-L203)) — itera lines, resuelve expense via `(period_id, member_id, payroll_generated)`, llama `recordExpensePayment`. V1 solo cubre `employee_net_pay`.
- **`recordExpensePayment` + `ensureSettlementForExpensePayment`** — atomic per-payment, crea `expense_payment` + `settlement_legs` + outbox events. CHECK `expense_payments_account_required_after_cutover` vigente desde 2026-04-28 12:38 UTC.
- **`materializeAccountBalance` + `getDailyMovementSummary`** ([`src/lib/finance/account-balances.ts:609-700`](src/lib/finance/account-balances.ts#L609-L700)) — lee `settlement_legs` + `expense_payments` con tres-axis supersede para computar `period_outflows` + `closing_balance_clp`.
- **Materializador Payroll → Expenses** — `materializePayrollExpensesForExportedPeriod` ([`src/lib/finance/payroll-expense-reactive.ts:62-361`](src/lib/finance/payroll-expense-reactive.ts#L62)) + proyección `finance_expense_reactive_intake` ([`src/lib/sync/projections/finance-expense-reactive-intake.ts:19-54`](src/lib/sync/projections/finance-expense-reactive-intake.ts#L19-L54)) que reacciona a `payroll_period.exported`.
- **Reliability registry** ([`src/lib/reliability/registry.ts`](src/lib/reliability/registry.ts) [verificar path exacto]) con subsystem `Finance Data Quality` ya existente — extender, no crear nuevo.
- **`captureWithDomain`** ([`src/lib/observability/capture.ts`](src/lib/observability/capture.ts)) y patrón `domain='finance'` ya activos (TASK-742).
- **Webhook generic `processInboundWebhook`** + outbox publisher genérico — no se requieren cambios.
- **Skill `greenhouse-backend`, `greenhouse-dev`, `greenhouse-ux`, `greenhouse-ux-writing`** — disponibles.

### Gap

- **Sin CHECK constraint** que prohíba `state='paid'` con `source_account_id IS NULL`. La tabla acepta NULL en cualquier estado.
- **Sin guard nivel TS** en la transición a `paid`. La función `markPaymentOrderPaid` solo valida estado anterior, no completitud de campos críticos.
- **Sin atomicidad** entre `state=paid`, `expense_payment` y `settlement_leg` — viven en transacciones separadas conectadas por outbox. Si el reactor falla, la order queda zombie.
- **Skip silencioso** en `record-payment-from-order.ts:140-168`: cuando `expense_not_found` o `out_of_scope_v1`, retorna `skipped[]` sin error_class. La refresh_queue queda `completed`, no `failed`. Cero alerta.
- **Sin test de paridad** entre `INSERT INTO greenhouse_finance.expenses (...)` y `information_schema.columns`. Cualquier migración que agregue columna NOT NULL DEFAULT NULL puede romper el INSERT silenciosamente.
- **Sin endpoint admin** para rerun manual del materializador payroll cuando un período queda dead-letter. Hoy requiere SQL hand-coded o invocación directa de la función desde un script.
- **Sin signals reliability** específicos para el chain payment_order→bank. El subsystem `Finance Data Quality` cubre drift de ledger pero no detecta órdenes pagadas sin expense_payment.
- **Sin audit log estable** de transiciones de estado de `payment_orders`. El outbox tiene los eventos pero es read-once para reactor — no es la fuente de verdad histórica.
- **Sin trigger PG anti-zombie** que prohíba `state='paid' AND paid_at IS NULL` o `state='paid' AND source_account_id IS NULL`.
- **2 órdenes zombie en producción** que necesitan recovery sin perder los datos: `por-66563173-bdda-4591-b9ef-f798ecc98b95` (Luis Reyes) + `por-596043bd-1e80-4d9f-a932-515d44750b2e` (Humberly Henriquez). Período payroll 2026-04 con 0 filas en `expenses`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Hard-gate `source_account_id` (cierra F1)

- Migración `task-765-payment-orders-source-account-required`:
  - `ALTER TABLE greenhouse_finance.payment_orders ADD CONSTRAINT payment_orders_source_account_required_when_paid CHECK (state IN ('draft','pending_approval','approved','cancelled','failed') OR source_account_id IS NOT NULL) NOT VALID`
  - Backfill defensivo: identificar órdenes legacy con `state IN ('paid','settled','closed') AND source_account_id IS NULL`, reportar count, NO modificar (recovery vive en slice 7).
  - `ALTER TABLE ... VALIDATE CONSTRAINT` solo si backfill count = 0; si > 0, dejar `NOT VALID` con TODO documentado.
- `src/lib/finance/payment-orders/errors.ts` — definir error tipado `PaymentOrderMissingSourceAccountError` con `code='source_account_required'`, `httpStatus: 422`.
- `src/lib/finance/payment-orders/transitions.ts` — exportar `assertSourceAccountForPaid(order)` que throw el error tipado.
- `src/lib/finance/payment-orders/mark-paid.ts` — invocar `assertSourceAccountForPaid` antes de UPDATE.
- API route `POST /api/finance/payment-orders/[orderId]/mark-paid` — capturar error tipado, devolver 422 con código estable.
- UI `PaymentOrderApprovalForm.tsx` — campo `source_account_id` con validación required + helper text que explica por qué es obligatorio. Skill: `greenhouse-dev` + `greenhouse-ux` + `greenhouse-ux-writing`.

### Slice 2 — Test de paridad columna↔placeholder + fix INSERT broken (cierra F2)

- Auditar [`src/lib/finance/postgres-store-slice2.ts:2155-2200`](src/lib/finance/postgres-store-slice2.ts#L2155-L2200) contra `information_schema.columns` para `greenhouse_finance.expenses` (93 cols).
- Reproducir el error real: ejecutar el INSERT con un payload válido contra una DB local y capturar el mensaje exacto de PG. Identificar qué columna específica está desfasada.
- Fix dirigido: ajustar el INSERT statement (no rewrite full) para que columnas listadas == placeholders/literales, manteniendo la paridad con todas las 93 columnas activas (las que son nullable con default NULL pueden quedar fuera; las NOT NULL DEFAULT no-NULL también).
- `src/lib/finance/expense-insert-column-parity.ts` — helper que en runtime de tests:
  1. Lee column list de `information_schema.columns WHERE table_schema='greenhouse_finance' AND table_name='expenses'`.
  2. Construye un payload completo con valores tipados.
  3. Ejecuta el INSERT contra una DB de test efímera.
  4. Falla con mensaje claro si PG rechaza por column count mismatch.
- Aplicar el mismo helper a 3 INSERTs adicionales sospechosos:
  - `INSERT INTO greenhouse_finance.income`
  - `INSERT INTO greenhouse_finance.income_payments`
  - `INSERT INTO greenhouse_finance.expense_payments`
- Test agregado a `pnpm test`. Falla build si paridad rompe.
- Skill: `greenhouse-backend`.

### Slice 3 — Endpoint admin de rematerialización + outbox event nuevo

- `src/app/api/admin/finance/payroll-expense-rematerialize/route.ts`:
  - `POST { periodId: string, year: number, month: number, dryRun?: boolean }`
  - Gated por capability `finance.payroll.rematerialize` (FINANCE_ADMIN + EFEONCE_ADMIN) + `requireAdminTenantContext`.
  - Idempotente: el materializador ya skipea si row existe (`SELECT expense_id ... LIMIT 1`). Re-run no duplica.
  - `dryRun=true`: ejecuta el SELECT del materializador y reporta cuántos `expenses` faltarían crear, pero NO inserta.
  - Devuelve `{ payrollCreated, payrollSkipped, socialSecurityCreated, socialSecuritySkipped, errors[] }`.
  - Wrap con `captureWithDomain` y outbox event `finance.payroll_expenses.rematerialized` para audit.
- Catalogar el nuevo outbox event `finance.payment_order.settlement_blocked` (slice 4 lo emite) en `GREENHOUSE_EVENT_CATALOG_V1.md` con schema versionado:
  ```ts
  type FinancePaymentOrderSettlementBlocked = {
    eventVersion: 'v1'
    orderId: string
    reason: 'expense_unresolved' | 'account_missing' | 'cutover_violation' | 'materializer_dead_letter'
    detail: string
    blockedAt: ISODateString
  }
  ```
- Skill: `greenhouse-backend`.

### Slice 4 — Resolver loud + outbox `settlement_blocked` (cierra F3 parte 1)

- Refactor `record-payment-from-order.ts`:
  - Cuando `expense_not_found`: invocar `materializePayrollExpensesForExportedPeriod({ periodId, year, month })` sincrónicamente (idempotente). Re-lookup. Si sigue 0 → throw `PaymentOrderExpenseUnresolvedError`.
  - Cuando `out_of_scope_v1`: throw `PaymentOrderSettlementBlockedError` con `reason='out_of_scope_v1'` (NO skip). El error es recuperable (V2 wirea el resto), pero NO silencioso.
  - Cuando `recordExpensePayment` falla (e.g. CHECK constraint): re-throw con `PaymentOrderSettlementBlockedError` envuelto.
- Refactor proyección `record_expense_payment_from_order`:
  - `refresh` retorna `string` cuando éxito, throw cuando falla. El throw lo rutea el reactive worker a `failed` → `dead-letter` con error_class `application:settlement_blocked`.
  - Antes del throw, publicar outbox event `finance.payment_order.settlement_blocked` con razón estructurada. Cualquier consumer (UI, alertas, AI Observer) escucha este evento.
  - `captureWithDomain(err, 'finance', { tags: { source: 'payment_order_settlement', orderId } })`.
- Skill: `greenhouse-backend`.

### Slice 5 — Atomicidad transaccional `state=paid ↔ expense_payment ↔ settlement_leg` (cierra F3 parte 2)

- `src/lib/finance/payment-orders/mark-paid-atomic.ts` (NUEVO):
  - `markPaymentOrderPaidAtomic({ orderId, actorUserId, paidAt })` corre dentro de `withTransaction`:
    1. SELECT order FOR UPDATE — bloquea contra concurrent transitions.
    2. `assertSourceAccountForPaid(order)` — throw si NULL (slice 1 backstop).
    3. UPDATE `payment_orders SET state='paid', paid_at=$paidAt, updated_at=NOW() WHERE order_id=$1 AND state IN ('approved','submitted')`.
    4. INSERT `payment_order_state_transitions` row (slice 6).
    5. Para cada line: `recordExpensePayment` → automáticamente crea `expense_payment` + `settlement_legs` (idempotente por unique index).
    6. INSERT outbox `finance.payment_order.paid` + `finance.expense_payment.recorded` + (potencialmente) `finance.payment_order.settled` si todas las lines llegaron.
    7. COMMIT atómico.
  - Si cualquier step falla → ROLLBACK completo. La order vuelve al estado anterior. Caller recibe error tipado.
- `mark-paid.ts` actual delega a `mark-paid-atomic.ts`. La proyección `record_expense_payment_from_order` queda como **safety net** para órdenes en `paid` que NO pasaron por el path atómico (legacy + recovery del slice 7).
- Tests: rollback bajo failure inyectada en cada step (4 tests mínimo: fail at UPDATE, fail at recordExpensePayment, fail at outbox publish, fail at audit log insert).
- Skill: `greenhouse-backend`.

### Slice 6 — State machine hardening (audit log + triggers)

- Migración `task-765-payment-order-state-transitions-audit`:
  ```sql
  CREATE TABLE greenhouse_finance.payment_order_state_transitions (
    transition_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES greenhouse_finance.payment_orders(order_id) ON DELETE CASCADE,
    from_state TEXT NOT NULL,
    to_state TEXT NOT NULL,
    actor_user_id TEXT,
    reason TEXT,
    metadata_json JSONB NOT NULL DEFAULT '{}',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX payment_order_state_transitions_order_idx ON greenhouse_finance.payment_order_state_transitions (order_id, occurred_at);
  CREATE INDEX payment_order_state_transitions_to_state_idx ON greenhouse_finance.payment_order_state_transitions (to_state, occurred_at) WHERE to_state IN ('paid','settled','closed','cancelled','failed');
  ```
- Append-only: trigger PG que prohíbe UPDATE/DELETE en esta tabla (BEFORE UPDATE OR DELETE → RAISE EXCEPTION).
- Migración `task-765-payment-order-state-transition-triggers`:
  - Trigger PG `payment_orders_anti_zombie_trigger` BEFORE UPDATE OR INSERT que valida:
    - `state='paid'` → `paid_at IS NOT NULL` AND `source_account_id IS NOT NULL`.
    - Transiciones permitidas: `draft→pending_approval`, `pending_approval→approved|cancelled`, `approved→submitted|paid|cancelled`, `submitted→paid|failed|cancelled`, `paid→settled|cancelled`, `settled→closed`, `failed→cancelled|approved` (retry path).
    - Cualquier otra transición → RAISE EXCEPTION con mensaje claro.
- Backfill defensivo del audit log: para órdenes existentes en `paid|settled|closed`, insert una row sintética con `from_state='unknown_legacy'` y `metadata_json={ legacy: true }`.
- Helper `recordPaymentOrderStateTransition` invocado desde `mark-paid-atomic.ts` y de cualquier transition path futuro.
- Skill: `greenhouse-backend`.

### Slice 7 — Reliability signals + UI banner

- `src/lib/reliability/queries/payment-orders-paid-without-expense-payment.ts`:
  ```sql
  SELECT COUNT(*) AS n
  FROM greenhouse_finance.payment_orders po
  WHERE po.state = 'paid'
    AND po.paid_at < NOW() - INTERVAL '15 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM greenhouse_finance.payment_order_lines pol
       WHERE pol.order_id = po.order_id
         AND pol.expense_payment_id IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM greenhouse_sync.outbox_events oe
       WHERE oe.aggregate_id = po.order_id
         AND oe.event_type = 'finance.payment_order.settlement_blocked'
         AND oe.occurred_at > NOW() - INTERVAL '7 days'
    );
  ```
  Steady state = 0. El segundo NOT EXISTS evita doble-ruido cuando la order ya fue marcada como blocked y está esperando resolución manual.
- `src/lib/reliability/queries/payment-orders-dead-letter.ts`:
  ```sql
  SELECT COUNT(*) AS n
  FROM greenhouse_sync.outbox_reactive_log
  WHERE handler IN (
    'record_expense_payment_from_order:finance.payment_order.paid',
    'finance_expense_reactive_intake:payroll_period.exported'
  )
    AND result = 'dead-letter'
    AND acknowledged_at IS NULL
    AND recovered_at IS NULL;
  ```
- `src/lib/reliability/queries/payroll-expense-materialization-lag.ts`:
  ```sql
  SELECT COUNT(*) AS n
  FROM greenhouse_payroll.payroll_periods pp
  WHERE pp.status = 'exported'
    AND pp.exported_at < NOW() - INTERVAL '1 hour'
    AND NOT EXISTS (
      SELECT 1 FROM greenhouse_finance.expenses e
       WHERE e.payroll_period_id = pp.period_id
         AND e.expense_type = 'payroll'
         AND e.source_type = 'payroll_generated'
    );
  ```
- Registrar módulo en `RELIABILITY_REGISTRY`:
  ```ts
  {
    moduleId: 'finance.payment_orders',
    displayName: 'Payment Orders → Bank Settlement',
    subsystemId: 'finance_data_quality',
    incidentDomainTag: 'finance',
    expectedSignalKinds: ['drift', 'dead_letter', 'lag', 'incident'],
    signals: [
      { signalId: 'paid_orders_without_expense_payment', kind: 'drift', steadyState: 0, severity: 'critical' },
      { signalId: 'payment_orders_dead_letter', kind: 'dead_letter', steadyState: 0, severity: 'critical' },
      { signalId: 'payroll_expense_materialization_lag', kind: 'lag', steadyState: 0, severity: 'warning' }
    ]
  }
  ```
- UI banner en `PaymentOrderDetailDrawer.tsx`: si la order tiene un evento `finance.payment_order.settlement_blocked` reciente (últimas 7 días) sin resolver, mostrar Alert rojo con razón estructurada y CTA "Recuperar orden" → endpoint del slice 8.
- Skill: `greenhouse-backend` (queries) + `greenhouse-dev` + `greenhouse-ux` + `greenhouse-ux-writing` (UI banner).

### Slice 8 — Recovery del incidente actual + endpoint de recovery

- `src/app/api/admin/finance/payment-orders/[orderId]/recover/route.ts`:
  - `POST { sourceAccountId, paidAt? }` gated por capability `finance.payment_orders.recover` (FINANCE_ADMIN + EFEONCE_ADMIN).
  - Pre-condición: order debe estar en `state='paid'` AND no tener `expense_payment_id` en alguna line AND tener al menos un evento `finance.payment_order.settlement_blocked` reciente.
  - Pasos atómicos:
    1. Si `expenses` para `(period_id, member_id)` no existe → invoca `materializePayrollExpensesForExportedPeriod`.
    2. UPDATE `payment_orders SET source_account_id = $1, paid_at = COALESCE($2, paid_at)`.
    3. Insert audit log row con `reason='recovery_TASK-765'`.
    4. Re-publica outbox `finance.payment_order.paid` con `eventVersion: 'v1.replay'` para forzar al proyector a re-procesar.
    5. Espera al proyector (poll cada 5s, max 30s) y devuelve `{ recovered: boolean, expensePaymentIds: string[], settlementLegIds: string[] }`.
- Ejecución manual del recovery sobre las 2 órdenes de 2026-05-01:
  - `por-66563173-bdda-4591-b9ef-f798ecc98b95` (Luis Reyes — $148,312.50 CLP)
  - `por-596043bd-1e80-4d9f-a932-515d44750b2e` (Humberly Henriquez — $254,250.00 CLP)
  - `sourceAccountId` provisto por usuario (banco real desde donde se transfirió).
- Verificación post-recovery:
  - `expense_payments` count > 0 para ambos `payment_order_line_id`.
  - `settlement_legs` count > 0 para ambos.
  - `materializeAccountBalance({ accountId, year, month })` ejecutado para la cuenta origen → `closing_balance_clp` refleja los outflows.
  - `pnpm pg:doctor` sin warnings nuevos.
  - Los 3 signals del slice 7 → 0.
- Skill: `greenhouse-backend`.

## Out of Scope

- **Auto-resolución de `source_account_id`** desde el processor del beneficiary. Esta task exige que el operador lo seleccione explícitamente. La auto-sugerencia puede vivir en una task derivada que use `resolvePaymentRoute` (TASK-749).
- **V2 del proyector** que cubra `employer_social_security`, `processor_fee`, `fx_component`. Esta task deja el path preparado (throw explícito en lugar de skip silencioso) pero no wirea esos kinds — queda para TASK derivada.
- **Reconciliación automática contra extractos bancarios** — esa lane vive en TASK-722 (Bank ↔ Reconciliation synergy). Esta task solo asegura que el `expense_payment` + `settlement_leg` existen para que el reconciliation workbench los pueda emparejar.
- **Notificación Teams al operador** cuando un signal se enciende. La infraestructura existe (TASK-716 / Notification Hub) pero el wiring específico vive en una task derivada de notification policies.
- **Migración masiva de `payment_account_id` a NOT NULL** en `expense_payments` — eso vive en TASK-708c.
- **UI de "panel de payment orders zombie"** independiente. El banner en el detail drawer + los signals en Operations Overview son suficientes.
- **Auditoría histórica** de órdenes legacy (pre-2026-04-28) sin `source_account_id`. Solo se tratan las 2 del incidente actual.
- **Cambio del payment_order state machine** — los estados existentes se preservan; solo se hardean transiciones inválidas.
- **Performance optimization** de `materializeAccountBalance` para rerun masivo. Si emerge como blocker durante slice 8, se documenta en Follow-ups.

## Detailed Spec

### Modelo de error tipado (slice 1 + 4)

```ts
// src/lib/finance/payment-orders/errors.ts
export class PaymentOrderError extends Error {
  constructor(
    public readonly code: PaymentOrderErrorCode,
    public readonly orderId: string,
    public readonly detail: string,
    public readonly httpStatus: number = 422
  ) {
    super(`[${code}] order=${orderId}: ${detail}`)
  }
}

export type PaymentOrderErrorCode =
  | 'source_account_required'
  | 'expense_unresolved'
  | 'settlement_blocked'
  | 'invalid_state_transition'
  | 'cutover_violation'
  | 'materializer_dead_letter'

export class PaymentOrderMissingSourceAccountError extends PaymentOrderError { ... }
export class PaymentOrderExpenseUnresolvedError extends PaymentOrderError { ... }
export class PaymentOrderSettlementBlockedError extends PaymentOrderError { ... }
```

### Contrato del path atómico (slice 5)

```ts
export interface MarkPaymentOrderPaidAtomicInput {
  orderId: string
  actorUserId: string
  paidAt?: Date
  externalReference?: string
}

export interface MarkPaymentOrderPaidAtomicResult {
  orderId: string
  newState: 'paid'
  expensePaymentIds: string[]
  settlementLegIds: string[]
  outboxEventIds: string[]
  auditTransitionId: string
}

export async function markPaymentOrderPaidAtomic(
  input: MarkPaymentOrderPaidAtomicInput
): Promise<MarkPaymentOrderPaidAtomicResult>
```

Invariantes:
- Una sola tx vía `withTransaction`.
- SELECT FOR UPDATE en `payment_orders` para serialización.
- Validate `assertSourceAccountForPaid` antes del UPDATE.
- Si cualquier line falla `recordExpensePayment` → ROLLBACK completo.
- Outbox events publicados dentro de la misma tx (vía `publishFinanceOutboxEvent({ client })`).
- Idempotencia: re-llamar con misma `orderId` y `state='paid'` ya → no-op, devuelve resultados existentes.

### Esquema del outbox event nuevo (slice 3 + 4)

```ts
type FinancePaymentOrderSettlementBlockedV1 = {
  eventVersion: 'v1'
  orderId: string
  state: 'paid'
  reason:
    | 'expense_unresolved'      // resolver no encontró expenses
    | 'account_missing'          // source_account_id NULL
    | 'cutover_violation'        // CHECK constraint expense_payments
    | 'materializer_dead_letter' // upstream payroll materializer en dead-letter
    | 'out_of_scope_v1'          // V1 no cubre este obligation_kind
  detail: string                 // mensaje human-readable
  affectedLineIds: string[]
  retryableAfter?: ISODateString // sugiere cuándo re-disparar
  blockedAt: ISODateString
}
```

### Trigger anti-zombie (slice 6)

```sql
CREATE OR REPLACE FUNCTION greenhouse_finance.assert_payment_order_state_invariants()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.state = 'paid' THEN
    IF NEW.paid_at IS NULL THEN
      RAISE EXCEPTION 'payment_orders_paid_requires_paid_at: order=%', NEW.order_id;
    END IF;
    IF NEW.source_account_id IS NULL THEN
      RAISE EXCEPTION 'payment_orders_paid_requires_source_account_id: order=%', NEW.order_id;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.state IS DISTINCT FROM NEW.state THEN
    -- Validate transition matrix
    IF NOT (
      (OLD.state = 'draft' AND NEW.state IN ('pending_approval','cancelled')) OR
      (OLD.state = 'pending_approval' AND NEW.state IN ('approved','cancelled')) OR
      (OLD.state = 'approved' AND NEW.state IN ('submitted','paid','cancelled')) OR
      (OLD.state = 'submitted' AND NEW.state IN ('paid','failed','cancelled')) OR
      (OLD.state = 'paid' AND NEW.state IN ('settled','cancelled')) OR
      (OLD.state = 'settled' AND NEW.state IN ('closed')) OR
      (OLD.state = 'failed' AND NEW.state IN ('approved','cancelled'))
    ) THEN
      RAISE EXCEPTION 'payment_orders_invalid_state_transition: order=% from=% to=%',
        NEW.order_id, OLD.state, NEW.state;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_orders_anti_zombie_trigger
  BEFORE INSERT OR UPDATE ON greenhouse_finance.payment_orders
  FOR EACH ROW EXECUTE FUNCTION greenhouse_finance.assert_payment_order_state_invariants();
```

### Recovery flow del incidente (slice 8)

```
1. Operator identifica las 2 órdenes zombie en /finance/payment-orders (banner rojo del slice 7).
2. Operator decide cuenta origen real (Banco X de Efeonce).
3. Operator hace POST /api/admin/finance/payment-orders/<orderId>/recover { sourceAccountId, paidAt? }
4. Endpoint:
   a. Verifica precondiciones (paid + sin expense_payment + blocked event reciente).
   b. Materializa expenses para 2026-04 si faltan (Luis + Humberly).
   c. UPDATE source_account_id en payment_orders.
   d. Insert audit log row.
   e. Re-publica outbox finance.payment_order.paid (replay).
   f. Espera proyector y reporta resultado.
5. Operator verifica banco /finance/bank → cuenta refleja outflow $402,562.50 CLP.
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migración `task-765-payment-orders-source-account-required` aplicada; CHECK válido o documentado como NOT VALID con count de legacy gap.
- [ ] `mark-paid` rechaza con 422 cuando `source_account_id IS NULL` y emite código de error estable.
- [ ] UI `PaymentOrderApprovalForm.tsx` exige `source_account_id` antes de submit; mensaje en es-CL revisado por `greenhouse-ux-writing`.
- [ ] Test `expense-insert-column-parity` pasa para `expenses`, `income`, `income_payments`, `expense_payments`. Falla deliberada en CI si una columna se desfasa.
- [ ] `createFinanceExpenseInPostgres` corre sin error contra DB con esquema actual (93 cols `expenses`).
- [ ] Endpoint `/api/admin/finance/payroll-expense-rematerialize` gated por capability + reproduce funcionalidad idempotente; tests cubren `dryRun=true`, period faltante, period ya materializado.
- [ ] `record-payment-from-order.ts` ya NO devuelve `recorded=0 skipped=N`; en su lugar throws tipados con `error_class='application:settlement_blocked'`.
- [ ] Outbox event `finance.payment_order.settlement_blocked` publicado en cada throw con shape v1 versionado y registrado en `GREENHOUSE_EVENT_CATALOG_V1.md`.
- [ ] `markPaymentOrderPaidAtomic` (nuevo) corre dentro de `withTransaction`; tests cubren rollback bajo failure inyectada en cada step (4 escenarios mínimo).
- [ ] Tabla `payment_order_state_transitions` creada, append-only enforced por trigger, indexada por `(order_id, occurred_at)` y `(to_state, occurred_at)`.
- [ ] Trigger `payment_orders_anti_zombie_trigger` rechaza:
  - INSERT/UPDATE con `state='paid' AND paid_at IS NULL`
  - INSERT/UPDATE con `state='paid' AND source_account_id IS NULL`
  - Transiciones fuera del matrix permitido (e.g. `paid → submitted`, `cancelled → approved`)
- [ ] Tres signals nuevos registrados en `RELIABILITY_REGISTRY` y visibles en `/admin/operations`. Steady state = 0 en producción post-recovery.
- [ ] Banner en `PaymentOrderDetailDrawer.tsx` muestra alert rojo si hay `settlement_blocked` event reciente; CTA "Recuperar orden" funciona.
- [ ] Endpoint `/api/admin/finance/payment-orders/[orderId]/recover` gated por capability + verificable con dry-run + happy path.
- [ ] **Recovery del incidente:** las 2 órdenes (Luis + Humberly) tienen `expense_payment_id` y `settlement_leg_id` poblados, el banco de la cuenta origen refleja outflow combinado de $402,562.50 CLP en `account_balances`.
- [ ] `pnpm build` sin errores.
- [ ] `pnpm lint` sin errores (cero warnings nuevos sobre archivos owned).
- [ ] `pnpm tsc --noEmit` sin errores.
- [ ] `pnpm test` verde, incluidos los nuevos tests.
- [ ] `pnpm pg:doctor` no reporta warnings nuevos.
- [ ] CLAUDE.md sección "Finance — Payment order ↔ bank settlement invariants (TASK-765)" agregada con reglas duras.
- [ ] `GREENHOUSE_EVENT_CATALOG_V1.md`, `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`, `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` actualizados.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm build`
- `pnpm migrate:up` + `pnpm db:generate-types`
- `pnpm pg:doctor`
- Manual smoke en staging:
  - Crear payment order sin `source_account_id` → UI bloquea + API responde 422 con código estable.
  - Crear order válida → marcar paid → confirmar `expense_payment` + `settlement_leg` + outflow en `account_balances` en una sola observación.
  - Disparar materializer dead-letter (e.g. payload mal formado) → confirmar que outbox `settlement_blocked` se emite, refresh_queue → `failed`/`dead`, signal sube en `/admin/operations`.
  - Endpoint admin de rematerialización ejecuta dry-run + apply en período de test.
  - Endpoint de recovery sobre order zombie de prueba reconstruye downstream completo.
- Manual recovery en producción (slice 8):
  - Confirmar al usuario qué cuenta bancaria usar para Luis + Humberly.
  - POST recover → verificar respuesta + queries SQL post-flujo + dashboard `/finance/bank`.
- Validación cross-task:
  - TASK-756 (auto-generación) — confirmar que el path nuevo no rompe la creación batch.
  - TASK-759 (payslip delivery) — confirmar que el outbox event sigue llegando al proyector de payslips.
  - TASK-722 (Bank ↔ Reconciliation) — confirmar que `getReconciliationFullContext` sigue leyendo correcto post-recovery.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado (`in-progress` al tomar, `complete` al cerrar).
- [ ] El archivo vive en la carpeta correcta (`to-do/` → `in-progress/` → `complete/`).
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `Handoff.md` actualizado con resumen del cierre + recovery del incidente.
- [ ] `changelog.md` con entry visible.
- [ ] Chequeo de impacto cruzado: TASK-756, TASK-759, TASK-708c, TASK-722, TASK-664, TASK-672. Actualizar Delta de cada una si la solución cierra un gap.
- [ ] Spec canónica del módulo en `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` versionada.
- [ ] Outbox event nuevo registrado en `GREENHOUSE_EVENT_CATALOG_V1.md`.
- [ ] Reliability registry signal documentado en `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`.
- [ ] CLAUDE.md sección nueva "Finance — Payment order ↔ bank settlement invariants (TASK-765)" agregada.
- [ ] PR mergeada a `develop` y luego a `main` por staged rollout (el incidente está en producción — recovery tiene que llegar).
- [ ] Postmortem ligero del incidente origen (1-2 párrafos) en Handoff.md o issue separado, con timeline + root cause de las 3 fallas en cadena.

## Follow-ups

- **TASK-derivada V2** — wirear `employer_social_security`, `processor_fee`, `fx_component` en el resolver del proyector (depende de TASK-707 y TASK-714c).
- **TASK-derivada Auto-suggest source_account_id** — usar `resolvePaymentRoute` (TASK-749) para sugerir cuenta default por beneficiary type + currency en el wizard. No bloquea esta task pero mejora UX.
- **TASK-derivada Notification policy** — wiring del signal `paid_orders_without_expense_payment` a Notification Hub / Teams para que el operador reciba alerta en lugar de tener que entrar al dashboard.
- **TASK-derivada Performance** — si rerun masivo del materializador es lento en producción, optimizar `materializeAccountBalance` con index covering específico.
- **TASK-derivada Audit historical legacy** — revisar órdenes pre-2026-04-28 con `source_account_id IS NULL` en estados `paid|settled|closed` y decidir política (backfill manual vs aceptar como histórico).

## Open Questions

- ¿Cuál es la cuenta bancaria origen real desde donde Efeonce transfirió los pagos a Luis Reyes y Humberly Henriquez el 2026-05-01? Bloquea slice 8.
- ¿El path atómico nuevo (slice 5) reemplaza completamente al outbox-driven proyector, o el proyector queda como safety net? Decisión pendiente: el plan asume "safety net", pero podríamos eliminarlo si la atomicidad es 100% confiable.
- ¿La tabla `payment_order_state_transitions` debe incluir un `event_id` que la una al outbox, o son trazables por `order_id + occurred_at`? Decisión pendiente — defaultar a "trazables por order_id+ts" salvo que un consumer concreto necesite el FK.
- ¿La capability `finance.payroll.rematerialize` y `finance.payment_orders.recover` son nuevas en el motor TASK-403, o reutilizan `finance.admin`? Decisión pendiente — defaultar a granular nuevas para audit fino.
