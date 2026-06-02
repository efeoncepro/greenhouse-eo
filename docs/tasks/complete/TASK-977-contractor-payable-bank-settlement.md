# TASK-977 — Contractor Payable Bank Settlement (provider_payroll → banco)

## Delta 2026-05-31 — SHIPPED (4 slices, flag OFF)

Implementado en `develop` (no branch). El contractor payable **se puede liquidar al banco** por el motor canónico, detrás de flag (default OFF → parity nómina bit-for-bit). Open Questions resueltas pre-ejecución (ver abajo).

- **Slice 1** (`ba1ff9c2`) — Migración `20260531184945430`: columna FK-anchor `expenses.contractor_payable_id` (+ index) — mirror de `payroll_entry_id`. El beneficiary puede ser member o identity_profile → el payable id es el ancla, no member_id.
- **Slice 2** (`26d7575e`) — Materializador reactivo `materializeContractorPayableExpense` + proyección `contractor_payable_expense_materialize` (sibling del bridge, mismo evento `ready_for_finance`). Expense = bruto, `economic_category='labor_cost_external'` (resolver Rule 0 source-driven, first-match — crítico para member-contractor), `expense_type='contractor'`, `source_type='contractor_payable'`, anclado. Idempotente.
- **Slice 3** (`22b8fa28`) — Flag `CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED` (default OFF) + rama aditiva en `record-payment-from-order.ts` + `mark-paid-atomic.ts`: resuelve el expense por `contractor_payable_id` → `recordExpensePayment(net, paymentSource='contractor_system')` → settlement_leg → bank. Migración `20260531185842386` (payment_source CHECK widened). Path nómina 100% intacto.
- **Slice 4** (`135bd6a9`) — Signal `finance.contractor_payable.expense_unmaterialized` (data_quality, warning>0, steady=0; smoke live ok) + test del materializador.

**Open Questions resueltas:** (Q1) el expense lo crea la **proyección reactiva al ready_for_finance** (espejo de nómina al exported), NO el settlement — simetría + idempotencia + el expense existe antes del pago. (Q2) **NO supplier** (el contractor es persona; supplier_id nulo como nómina); ancla = columna nueva `contractor_payable_id`.

**Accounting:** gasto=bruto, pago=neto, retención SII=pasivo a remesar **separado (F29, out of scope)** → honorarios queda `partial` hasta esa remesa. Aprobado por el operador en el STOP checkpoint.

Gates: `pnpm test` full 5687/0 · `pnpm vitest run src/lib/payroll src/lib/finance/payment-orders` 585 (no-regresión) · tsc/eslint 0. **Pendiente para pagar end-to-end:** flip del flag (post staging + finance sign-off) + UI Finanzas (TASK-974). Invariantes: `CLAUDE.md` → "Contractor Payable Bank Settlement invariants (TASK-977)". Arch Delta + doc funcional `hr/contratistas-flujo-de-pago-completo.md`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-977-contractor-payable-bank-settlement`
- Legacy ID: `none`

## Summary

Extiende el motor canónico de liquidación de payment orders para que un **contractor payable** (`source_kind='contractor_payable'`, `obligation_kind='provider_payroll'`) pueda marcarse pagado y **rebajar el banco**, registrando el egreso como `economic_category='labor_cost_external'` (NUNCA nómina). Hoy ambos paths de settlement (`mark-paid-atomic.ts` y el safety-net `record-payment-from-order.ts`) lanzan `out_of_scope_v1` para cualquier línea que no sea `payroll`/`employee_net_pay`, por lo que **el contratista no se puede pagar al banco por el camino canónico**. Este es el gap de backend que bloquea el ciclo de pago contractor end-to-end.

## Why This Task Exists

Revisión exhaustiva del backend 2026-05-31 (sin inferencias): la cadena de pago contractor está completa hasta la orden de pago, pero el último paso (settle → banco) está **explícitamente fuera de scope V1**. Verificado:

- `src/lib/finance/payment-orders/mark-paid-atomic.ts:348` → `if (line.source_kind !== 'payroll' || line.obligation_kind !== 'employee_net_pay') throw PaymentOrderSettlementBlockedError('out_of_scope_v1')`.
- `src/lib/finance/payment-orders/record-payment-from-order.ts:218` → idéntico filtro (safety-net).
- Un contractor payable tiene `source_kind='contractor_payable'` + `obligation_kind='provider_payroll'` → bloqueado en ambos.

Consecuencia: aunque se construya la pantalla de Finanzas (TASK-974), el dinero del contratista **no sale del banco** hasta cerrar este gap. Ninguna de las tasks de UI (TASK-974/975/976) lo cubre — es backend puro sobre un motor compartido con nómina.

**Hallazgo adicional verificado**: el contractor payable lleva la columna `economic_category` pero **NO crea una fila en `greenhouse_finance.expenses`** (el store del payable + el bridge no insertan expense). El settlement de nómina resuelve el `expense_id` vía `expenses WHERE payroll_period_id=...`, que no aplica a contractors. Por lo tanto, la pieza central de esta task es: **¿de dónde sale el `expense` del contractor al momento de liquidar?** (ver Open Questions).

## Goal

- Un contractor payable en una payment order puede transicionar a `paid` y rebajar la cuenta bancaria origen, atómicamente.
- El egreso queda registrado como `expense_payment` + `settlement_leg` con `economic_category='labor_cost_external'`, leyendo gross/withholding/net **verbatim** del payable (TASK-793/794).
- **Cero regresión de nómina**: el path de `payroll`/`employee_net_pay` se comporta bit-for-bit igual.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Mandatory Skills (OBLIGATORIO — no negociable)

Toca el motor de liquidación financiera compartido con nómina + clasificación contable. Antes de implementar:

1. **`greenhouse-finance-accounting-operator`** — settlement, expense_payment/settlement_leg, economic_category, reconciliación, FX. Validar contratos canónicos (TASK-722/765/766/768/774) y el tratamiento contable del egreso contractor (`labor_cost_external`, la retención SII como pasivo a remesar, no resta de costo).
2. **`greenhouse-payroll-auditor`** — garantizar que extender el resolver NO altera el cálculo ni la liquidación de nómina (boundary EPIC-013/TASK-957).
3. **`arch-architect`** (4-pillar) — diseñar la extensión del resolver con defense-in-depth (flag, idempotencia, atomicidad, signal), reversibilidad y blast radius sobre el motor compartido.
4. **`greenhouse-postgres`** — si emergen migraciones (expense del contractor, índices).

Si emerge cualquier superficie visible, invocar las **skills de product design** (no debería: esta task es backend puro; la UI vive en TASK-974).

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (Delta 2026-05-31 "End-to-end settlement gap")
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md` (TASK-748/750/765)
- `docs/architecture/GREENHOUSE_FINANCE_ECONOMIC_CATEGORY_DIMENSION_V1.md` (TASK-768, `labor_cost_external`)
- `CLAUDE.md` → "Payment order ↔ bank settlement invariants (TASK-765)" + "Finance — Economic Category Dimension (TASK-768)" + "Contractor Payables → Finance bridge invariants (TASK-793)"

Reglas obligatorias:

- **NUNCA** romper el path `payroll`/`employee_net_pay`. La extensión es aditiva: una nueva rama para `contractor_payable`/`provider_payroll`, no un cambio al branch existente. El test de paridad column-parity (TASK-765) + `pnpm vitest run src/lib/payroll` deben quedar verdes.
- **NUNCA** clasificar el egreso del contractor como nómina. `economic_category='labor_cost_external'` (TASK-768). La retención SII es pasivo a remesar (F29), no resta de costo (el gasto = bruto).
- **NUNCA** marcar `paid` sin `source_account_id` (hard-gate TASK-765 ya existente; aplica igual al contractor).
- **NUNCA** ejecutar settlement no atómico: expense_payment + settlement_leg + UPDATE order/obligation en una sola tx; rollback completo ante cualquier fallo.
- **NUNCA** invocar `Sentry.captureException` directo; usar `captureWithDomain(err, 'finance', ...)`.
- Gross/withholding/net se leen verbatim del payable; NUNCA recalcular en el settlement.

## Dependencies & Impact

### Depends on

- Motor de settlement: `src/lib/finance/payment-orders/{mark-paid-atomic,record-payment-from-order}.ts` + `expense-payment-ledger.ts` + settlement orchestration.
- Bridge payable→obligación: `src/lib/sync/projections/contractor-payable-finance-obligation.ts` (TASK-793).
- `economic_category` del payable (ya poblado `labor_cost_external`).
- Categoría económica canónica (TASK-768).

### Blocks / Impacts

- **Desbloquea** el ciclo de pago contractor end-to-end (sin esto, TASK-974 entrega UI que igual no paga al banco).
- Toca un motor **compartido con nómina** → blast radius alto; requiere defense-in-depth.

### Files owned

- `src/lib/finance/payment-orders/record-payment-from-order.ts` (extender el resolver)
- `src/lib/finance/payment-orders/mark-paid-atomic.ts` (extender la rama de scope)
- `src/lib/finance/contractor-settlement/*` (helper canónico nuevo de resolución del expense contractor, si se decide)
- Posible migración: expense del contractor (si el settlement crea el expense) o linkage payable→expense
- `src/lib/reliability/queries/contractor-payable-settlement-*.ts` (signal nuevo si aplica)

## Current Repo State

### Already exists

- Cadena completa hasta payment order (payable → obligación → orden → approve → submit).
- Motor de settlement atómico para nómina (`mark-paid-atomic` + safety-net) con expense_payment + settlement_leg + bank debit + reconciliation.
- `economic_category='labor_cost_external'` en el payable.

### Gap

- El settlement filtra a `payroll`/`employee_net_pay` → contractor bloqueado (`out_of_scope_v1`) en ambos paths.
- El contractor payable no tiene `expense` asociado → el resolver del expense_id no aplica.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Resolución del expense del contractor (decisión + helper)

- Resolver la Open Question central: el settlement del contractor crea/resuelve su `expense` (`economic_category='labor_cost_external'`, supplier/beneficiary = el contractor, monto = neto, snapshot del payable). Decidir en Plan Mode con finance skill: ¿el bridge crea el expense junto a la obligación, o el settlement lo crea al pagar? (preferible: el camino que preserve idempotencia + reconciliación TASK-722).
- Helper canónico de resolución/creación del expense contractor (mirror del lookup de nómina pero por `contractor_payable_id`).

### Slice 2 — Extender el resolver de settlement (aditivo, detrás de flag)

- Rama nueva en `record-payment-from-order.ts` + `mark-paid-atomic.ts` para `source_kind='contractor_payable'`/`obligation_kind='provider_payroll'`: resuelve el expense (Slice 1) → `recordExpensePayment` (economic_category labor_cost_external) → settlement_leg outgoing → bank debit. Atómico.
- Flag `CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED` (default OFF). OFF = comportamiento actual (sigue lanzando `out_of_scope_v1`, parity bit-for-bit).

### Slice 3 — Reliability + cierre

- Signal `finance.contractor_payable.settlement_blocked` o equivalente (payables en orden de pago que no pudieron liquidar). Steady=0.
- Tests anti-regresión nómina + tests del path contractor. Docs (arch Delta + funcional update). Gate `pnpm vitest run src/lib/payroll` verde.

## Out of Scope

- Pantalla de Finanzas → TASK-974.
- Regla de `due_date` cierre+5d + SLA → TASK-978.
- Corrida mensual / batch → TASK-979.
- Provider settlement split / EOR (multi-leg al proveedor) → TASK-795 Fase B / TASK-955.

## Detailed Spec

**El núcleo es el expense.** El settlement de nómina hace: `payment_order_line` → resolver `expense_id` (vía payroll_period + beneficiary) → `recordExpensePayment(expenseId, ...)` → expense_payment + settlement_leg + bank. Para el contractor falta el `expense`. Dos caminos a evaluar (Plan Mode, finance skill):

- **A) El bridge crea el expense** junto a la obligación (TASK-793 extendido): cuando el payable queda `ready_for_finance`, además de la obligación se materializa un `expense` (`economic_category='labor_cost_external'`, supplier=contractor, amount=net, snapshot). El settlement luego resuelve `expense_id` por `contractor_payable_id`. Ventaja: el expense existe antes del pago (consistente con cómo nómina materializa el expense antes).
- **B) El settlement crea el expense** al pagar (lazy). Ventaja: menos estado intermedio. Riesgo: el settlement se vuelve write-heavy + idempotencia más delicada.

Sea cual sea, el egreso es `labor_cost_external`, la retención SII NO resta del gasto (gasto = bruto; retención = pasivo a remesar al SII).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (expense) → Slice 2 (resolver, flag OFF) → Slice 3 (signal + cierre). El flag NO se flipea a ON hasta staging shadow + finance sign-off.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Regresión del settlement de nómina | payroll/finance | **high** (motor compartido) | Rama aditiva detrás de flag; parity tests + `pnpm vitest run src/lib/payroll`; column-parity TASK-765 | `paid_orders_without_expense_payment` |
| Doble expense / doble pago del contractor | finance | medium | Idempotencia: partial unique por `contractor_payable_id`; lock; el payable solo se consume una vez | nuevo signal settlement |
| Egreso mal clasificado (como nómina) | finance | medium | `economic_category='labor_cost_external'` hardcoded en la rama contractor; finance skill review; lint TASK-768 | `finance.expenses.economic_category_unresolved` |
| Retención SII tratada como resta de costo | finance | medium | finance skill review del tratamiento contable; gasto=bruto, retención=pasivo | n/a |

### Feature flags / cutover

`CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED` (default OFF). OFF = parity bit-for-bit (sigue `out_of_scope_v1`). Flip a ON post staging shadow + finance sign-off. Revert: flag a OFF + redeploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert PR (expense materializer additive); si crea expenses, supersede (no DELETE) | <15 min | sí |
| 2 | flag OFF | <5 min | sí |
| 3 | revert signal | <10 min | sí |

### Production verification sequence

1. `pnpm migrate:up` staging (si hay migración del expense) + verify.
2. Deploy staging flag OFF + verify nómina settlement intacto + contractor sigue `out_of_scope_v1`.
3. Flip flag ON staging + crear payable contractor de prueba → orden → submit → mark paid → **verify**: expense_payment creado (`labor_cost_external`), settlement_leg outgoing, banco rebajado, comprobante (TASK-960) disponible.
4. Verify `pnpm vitest run src/lib/payroll` + reconciliación.
5. Repetir en prod con cooldown + monitor signals 7d.

### Out-of-band coordination required

Finance sign-off del tratamiento contable (expense `labor_cost_external` + retención como pasivo) antes de flip ON.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un contractor payable en una payment order se marca `paid`, rebaja el banco, y crea expense_payment + settlement_leg con `economic_category='labor_cost_external'`.
- [ ] Cero regresión de nómina (`pnpm vitest run src/lib/payroll` verde; column-parity verde).
- [ ] Idempotente (no doble expense / doble pago).
- [ ] Flag default OFF; ON solo post staging shadow + finance sign-off.
- [ ] Signal de settlement bloqueado/fallido; steady=0.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm vitest run src/lib/payroll` (no-regresión)
- `pnpm vitest run src/lib/finance`
- Staging end-to-end de un contractor payable hasta banco.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-974 UI, TASK-978, TASK-979, TASK-960 comprobante)
- [ ] CLAUDE.md invariants + arch Delta + doc funcional update

## Follow-ups

- Provider settlement split / EOR multi-leg (TASK-795 Fase B / TASK-955).

## Open Questions

- **¿El expense del contractor lo crea el bridge (al quedar ready) o el settlement (al pagar)?** Decisión central de la task (Slice 1, Plan Mode + finance skill).
- ¿El supplier/beneficiary del expense es el contractor (persona) o requiere un supplier registrado? (resolver con finance skill, respetando TASK-772 supplier hydration).
