# TASK-717 — Reclasificación payroll declarativa via intents table

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none` (los intents materializan el input humano)
- Branch: `task/TASK-717-payroll-reclassification-intents`
- Origin: derivada de TASK-714d Slice 3

## Summary

Convertir el bloqueo "input humano" de la reclasificación payroll Global66 (Daniela / Andrés / David) en un sistema declarativo: tabla `expense_reclassification_intents` + script ejecutor idempotente. El operador inserta filas en un PR; el script aplica de forma atómica con cascade-supersede + recompute reactivo. Reusable para cualquier reclasificación supplier→payroll futura.

## Why This Task Exists

TASK-714d Slice 3 quedó deferida porque 8 expense_payments con `payment_account_id='global66-clp'` están como `expense_type='supplier'` cuando 4 son payroll a colaboradores externos (Daniela, Andrés, David) y 4 son fees Global66 FX. La decisión de reclasificación necesitaba decisiones humanas inline (member_id, atribución cliente, payroll period link). Eso no escala — la próxima vez que aparezca un supplier→payroll mal etiquetado, vuelve a bloquear runtime.

Solución: mover el input humano a fila revisable en PR, y el ejecutor a script idempotente con verificación pre/post-flight.

## Goal

- Tabla `greenhouse_finance.expense_reclassification_intents` audit-preserved
- Migration seed que provisiona miembros foreign-payroll faltantes (Daniela / Andrés / David) en `team_members` con `is_internal=false`
- Script `scripts/finance/apply-expense-reclassification-intents.ts` con dry-run + apply, transacción atómica, idempotente
- Detector ledger-health `task717.unappliedReclassificationIntents` (steady state = 0)
- Outbox event `finance.expense_payment.reclassified` que dispara recompute de `commercial_cost_attribution`, `client_economics`, `client_labor_cost_allocation_consolidated`
- 8 intents seed-cargadas en migration para los pagos Global66 (4 payroll + 4 fees re-confirmados como `bank_fee`)

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- CLAUDE.md sección "Finance — Labor allocation consolidada (TASK-709)"

Reglas obligatorias:

- Cero DELETE en `expense_payments`. Cascade-supersede via `superseded_by_payment_id`.
- Closing balance Global66 NO debe cambiar (reclasificación es interna a categoría, no afecta cash).
- Pre/post-flight verification de closing + drift `labor_allocation_saturation_drift` = 0.
- Helper canónico `createPayrollExpensePayment` (verificar existencia, sino crear) — no INSERT directo.
- Idempotencia: rerunear el script no debe duplicar registros. Stamp `applied_at`.

## Dependencies & Impact

### Depends on

- TASK-709 (labor allocation consolidada) — el recompute reactivo debe respetar la VIEW consolidada
- TASK-708 (commercial cost attribution v2) — recompute target
- `team_members` schema (FK target)
- `payroll_periods` schema (FK target opcional)
- `clients` schema (FK target opcional)

### Blocks / Impacts

- TASK-714d cierre umbrella (Slice 3 dependency)
- Cualquier task futura de reclasificación supplier→payroll/payroll→supplier

### Files owned

- `migrations/YYYYMMDDHHMMSS_task-717-expense-reclassification-intents.sql`
- `migrations/YYYYMMDDHHMMSS_task-717-foreign-payroll-members-seed.sql`
- `migrations/YYYYMMDDHHMMSS_task-717-global66-reclassification-intents-seed.sql`
- `scripts/finance/apply-expense-reclassification-intents.ts`
- `src/lib/finance/reclassification/` (helper layer si emerge)
- `src/lib/finance/__tests__/expense-reclassification.test.ts`
- `src/lib/finance/ledger-health.ts` (nuevo detector)

## Current Repo State

### Already exists

- 8 expense_payments Global66 con `expense_type='supplier'` (4 mal etiquetados, 4 OK)
- Helper `createInternalTransferSettlement` (TASK-714d Slice 1)
- Detector `task714d.internalTransferGroupsWithMissingPair` patrón a replicar
- Script `backfill-internal-transfer-pairs.ts` patrón pre/post-flight a replicar

### Gap

- No existe tabla `expense_reclassification_intents`
- No existe `createPayrollExpensePayment` factory (verificar — puede vivir como `createPayrollAnchoredPayment` o similar)
- No existen Daniela / Andrés / David en `team_members`
- No existe outbox event type `finance.expense_payment.reclassified`

## Scope

### Slice 1 — Schema + helper

- Migration: tabla `expense_reclassification_intents` con FK a `expense_payments`, `team_members`, `clients`, `payroll_periods`
- Migration seed: foreign-payroll members (Daniela ES, Andrés CO, David CO) con `is_internal=false`, `currency_paid_in` correcto
- Verificar/crear `createPayrollExpensePayment` factory en `anchored-payments.ts`
- Outbox event type `finance.expense_payment.reclassified` registrado en catalog
- Tests: schema integrity + factory smoke

### Slice 2 — Ejecutor + verificación

- Script `apply-expense-reclassification-intents.ts` con dry-run + apply
- Pre-flight: snapshot closing balance Global66 + Santander
- Apply: transacción atómica supersede legacy + insert canónico + emit outbox
- Post-flight: closing unchanged, drift = 0, `applied_at` stamped
- Detector ledger-health `task717.unappliedReclassificationIntents`
- Tests: 4-5 tests cubriendo dry-run, apply, idempotencia, drift detection

### Slice 3 — Seed Global66

- Migration seed con 8 intents (las 4 payroll + las 4 bank_fee re-confirmadas — la columna `target_expense_type='supplier'` puede usarse para "no-op confirmation" o filtrarlas del scope)
- Decidir en spec: ¿solo seed-ear las 4 payroll, o también las 4 fees como audit trail explícito?
- Apply en producción
- Verificación: detector → 0, drift → 0, closing Global66 → $8,562 unchanged

## Out of Scope

- Reclasificaciones bidireccionales payroll↔supplier inversas (este script solo va en una dirección por intent)
- UI admin para crear intents desde portal — version 1 es PR-driven
- Integración con HubSpot reimbursable expense (TASK-714c)
- Backfill de TC (TASK-718)

## Detailed Spec

### Tabla schema

```sql
CREATE TABLE greenhouse_finance.expense_reclassification_intents (
  intent_id TEXT PRIMARY KEY,
  source_expense_payment_id TEXT NOT NULL,
  target_expense_type TEXT NOT NULL CHECK (target_expense_type IN (
    'supplier', 'payroll', 'social_security', 'tax', 'bank_fee', 'miscellaneous'
  )),
  target_member_id TEXT REFERENCES greenhouse.team_members(member_id),
  target_cost_category TEXT,
  target_allocated_client_id TEXT REFERENCES greenhouse.clients(client_id),
  target_payroll_period_id TEXT REFERENCES greenhouse_payroll.payroll_periods(period_id),
  target_supplier_id TEXT REFERENCES greenhouse_finance.suppliers(supplier_id),
  rationale TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  applied_by TEXT,
  applied_new_expense_payment_id TEXT,
  superseded_at TIMESTAMPTZ,
  superseded_reason TEXT,
  CONSTRAINT applied_consistency CHECK (
    (applied_at IS NULL AND applied_by IS NULL AND applied_new_expense_payment_id IS NULL)
    OR (applied_at IS NOT NULL AND applied_by IS NOT NULL AND applied_new_expense_payment_id IS NOT NULL)
  )
);

CREATE INDEX ON greenhouse_finance.expense_reclassification_intents (source_expense_payment_id);
CREATE INDEX ON greenhouse_finance.expense_reclassification_intents (applied_at) WHERE applied_at IS NULL;
```

### Seed intents Global66 (referencia)

| source_reference | target_expense_type | target_member_id | rationale |
|---|---|---|---|
| g66-20260404-daniela-1090731 | payroll | member-daniela-ferreira-es | Pago payroll Daniela Ferreira (ES) |
| g66-20260404-andres-688058 | payroll | member-andres-co | Pago payroll Andrés (CO) |
| g66-20260311-david-632040 | payroll | member-david-carlosama-co | Pago payroll David Carlosama (CO) |
| g66-20260306-daniela-1034522 | payroll | member-daniela-ferreira-es | Pago payroll Daniela Ferreira (ES) |

## Acceptance Criteria

- [ ] Tabla `expense_reclassification_intents` creada con FKs y CHECK constraint
- [ ] 3 miembros foreign-payroll provisionados en `team_members`
- [ ] Factory `createPayrollExpensePayment` existe y emite `expense_payment` canónico
- [ ] Script `apply-expense-reclassification-intents.ts` con dry-run + apply funcional
- [ ] Detector `task717.unappliedReclassificationIntents` en ledger-health
- [ ] 4 intents Global66 seed-cargadas y aplicadas en producción
- [ ] Closing Global66 28/04 = $8,562 SIN cambios post-apply
- [ ] Drift `labor_allocation_saturation_drift` = 0 post-apply
- [ ] Recompute `commercial_cost_attribution` + `client_economics` triggered por outbox
- [ ] Tests pass (8+ tests)

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/finance/__tests__/expense-reclassification.test.ts`
- `pnpm test src/lib/finance/__tests__/ledger-health-task717.test.ts`
- Pre-apply: capturar closing Global66 + drift report
- Apply en staging primero, verificar
- Apply en producción, verificar closing unchanged + drift = 0

## Closing Protocol

- [ ] `Lifecycle` sincronizado con estado real
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambia comportamiento
- [ ] Chequeo de impacto cruzado: TASK-714d Slice 3 marcar como cerrado
- [ ] Detector live `task717.unappliedReclassificationIntents = 0` confirmado en producción

## Follow-ups

- UI admin para crear intents desde portal (vNext)
- Extender intents pattern a otros mecanismos de reclasificación (income, payment_account_id changes)

## Open Questions

- ¿Las 3 personas (Daniela / Andrés / David) están actualmente asignadas a un cliente específico via `client_team_assignments`? Si no, `target_cost_category` debería ser `unallocated` o `direct_member` con `target_allocated_client_id=null`.
- ¿Existe `payroll_periods` para febrero/marzo 2026 que estos pagos deberían anclar, o son one-off?
