# TASK-746 — Adjustment Schedules + Finance Ledger Integration

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-745`
- Branch: `task/TASK-746-adjustment-schedules-finance`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye encima de la foundation de TASK-745 el modelo canonico para **ajustes recurrentes con cronograma** (préstamos en cuotas, anticipos a recuperar, descuentos pactados a N períodos) y la **integracion canonica con Finance** como entidades formales (`employee_advance`, `employee_loan`). Cada cierre de período el motor crea automáticamente los `payroll_adjustments` que correspondan, decrementa saldos, marca completion y emite outbox events bidireccionales con Finance. Resuelve los casos donde el operador hoy depende de "recordar manualmente" cada mes aplicar el descuento.

## Why This Task Exists

TASK-745 entrega ajustes per-período manuales. Eso cubre el 80% de casos pero deja deuda real cuando emerge un préstamo o anticipo a recuperar en N meses:

- "Préstamo $600K a Luis en 6 cuotas de $100K mensual" — sin schedule alguien tiene que recordar cada mes; bug humano garantizado.
- "Anticipo $200K en abril, descontar en mayo" — sin source-of-truth Finance no sabe si la cuenta-por-cobrar se cerró.
- "Descuento pactado por error operativo $50K en próximos 3 meses" — sin schedule no hay trazabilidad del compromiso.

Sin esta task, el operador termina:
1. Llevando una hoja de cálculo paralela.
2. Aplicando manual cada mes vía TASK-745.
3. Olvidándose en el mes 4 o 5 y pagando completo.

Modelar `adjustment_schedules` como entidades de primera clase + integrar con Finance (cuenta por cobrar / liability) cierra el loop end-to-end:

- Schedule activo → motor cron mensual al cierre de período crea adjustment automático con `source_ref=schedule_id`.
- Cada aplicación decrementa `installments_remaining`.
- Al llegar a 0 → schedule `status='completed'`.
- Finance reconcilia: el ledger de empleados tiene saldo real en tiempo real.

## Goal

- Tabla `payroll_adjustment_schedules` con cronograma declarativo (total, cuota, frecuencia, períodos).
- Tabla `employee_advances` y `employee_loans` en Finance schema con FK a member + outbox bidireccional.
- Motor automático que al cierre de cada período crea `payroll_adjustments` derivados de schedules activos (`source_kind='recurring_schedule'`).
- UI: Drawer "Préstamos y anticipos del colaborador" en Person 360 + Admin Team con CRUD de schedules.
- Integracion Finance: cuando se crea schedule de tipo `loan_repayment`, se crea `employee_loan` row en Finance con saldo inicial; cada repayment decrementa el saldo.
- Outbox bidireccional: `payroll.adjustment_schedule.{created,activated,completed,cancelled}` y `finance.employee_loan.{created,repaid,closed}`.
- Reportes: dashboard "Préstamos y anticipos vivos" en Finance + en Admin HR.
- Cancelación / reestructuración: schedule cancelable; saldo restante se contabiliza en Finance como write-off o renegotiation.

## Why TASK-745 First

Esta task asume:
- Tabla `payroll_adjustments` con `source_kind` y `source_ref`.
- API + UI de adjustments funcional.
- Outbox events `payroll.adjustment.*` ya emitiéndose.

Sin TASK-745, esta task tendría que recrear toda esa foundation. Por eso `Blocked by: TASK-745`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (modulo Finance + outbox)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` (Person 360 surface)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` (motor cron mensual)

Reglas obligatorias:

- Schedule entity es **inmutable estructuralmente** (total, cuota, frecuencia). Cambios = cancelar + crear nuevo schedule.
- Finance ledger source-of-truth: el saldo real de un préstamo vive en `employee_loans.outstanding_balance_clp`, sincronizado via outbox con cada `payroll_adjustment` aplicado.
- Reliquidación: si se reabre un período con adjustment de schedule aplicado, la reapertura puede generar delta que **revierte** la cuota → schedule decrementa de vuelta.
- Compliance Chile: schedules de tipo `loan_repayment` no pueden dejar al colaborador con neto negativo (CHECK en compute time).

## Normative Docs

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-745-payroll-adjustments-foundation.md` (foundation)

## Dependencies & Impact

### Depends on

- **TASK-745 completa** (tabla `payroll_adjustments` + computación + outbox events)
- `greenhouse_finance.expenses` (extender para reflejar cuotas de loan como expense entry)
- Cron infrastructure (`ops-worker` Cloud Run)
- Person 360 surface

### Blocks / Impacts

- Finance tendrá nuevas entidades (`employee_advances`, `employee_loans`) → impacta dashboards de Finance + Bank reconciliation.
- Person 360 surface gana nueva sección "Préstamos y anticipos".
- Outbox catalog crece con 6+ events nuevos.

### Files owned

- `migrations/<ts>_task-746-adjustment-schedules.sql`
- `migrations/<ts>_task-746-employee-advances-loans.sql`
- `src/lib/payroll/schedules/` (`create-schedule.ts`, `materialize-period-installments.ts`, `cancel-schedule.ts`)
- `src/lib/finance/employee-credit/` (`create-advance.ts`, `create-loan.ts`, `apply-repayment.ts`, `reconcile-balance.ts`)
- `src/app/api/hr/payroll/adjustment-schedules/...` (CRUD endpoints)
- `src/app/api/finance/employee-credit/...` (consultas + creación)
- `src/views/greenhouse/people/tabs/PersonAdvancesLoansTab.tsx`
- `src/components/greenhouse/finance/EmployeeCreditDashboard.tsx`
- `services/ops-worker/handlers/materialize-payroll-schedules.ts` (cron handler)
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (extender)
- `docs/documentation/hr/prestamos-y-anticipos-a-colaboradores.md`
- `docs/manual-de-uso/hr/crear-prestamo-o-anticipo.md`

## Current Repo State

### Already exists (post TASK-745)

- `payroll_adjustments` con `source_kind` + `source_ref`
- API + UI de adjustments per-período
- Outbox `payroll.adjustment.*`

### Gap

- No hay entidad de schedule.
- No hay entidad Finance para anticipos / préstamos como first-class.
- No hay motor automático de materialización mensual.
- Person 360 no muestra obligaciones del colaborador.

## Scope

### Slice 1 — Schema schedules

- Migración `payroll_adjustment_schedules` (member, kind, total, installment, frequency, start/end period, status, source_finance_ref).
- Indices + CHECK constraints (installments coherente con total).
- Vista `vw_active_schedules_due_in_period` para el cron.

### Slice 2 — Finance entities

- Migración `greenhouse_finance.employee_advances` (anticipo único).
- Migración `greenhouse_finance.employee_loans` (préstamo con saldo).
- FK a `team_members`. Outbox events propios.

### Slice 3 — Materialization engine

- `materialize-period-installments.ts` corre al cierre de período (post-calculate, pre-approve): por cada schedule activo con cuota due, crea `payroll_adjustment` `source_kind='recurring_schedule'` `source_ref=schedule_id`.
- Decrementa `installments_remaining`. Al llegar a 0 → schedule `completed`.
- Cron handler en ops-worker (mensual el día N del calendario operativo) o invocado en flow `calculate-payroll`.

### Slice 4 — UI

- `PersonAdvancesLoansTab` en Person 360: lista schedules activos + histórico, CTA "Crear préstamo / anticipo".
- Dialog creación schedule: monto, cuotas, fecha inicio, motivo. Validación neto positivo proyectado.
- `EmployeeCreditDashboard` en Admin Finance: tabla todos los empleados con saldo, drill por colaborador.
- Banner en PayrollPeriodTab: "X cuotas de préstamos / anticipos a aplicar este período".

### Slice 5 — Cancel + write-off + reliquidación

- API cancelar schedule: marca `cancelled`, emite event, en Finance se evalúa write-off vs renegotiation.
- Reliquidación: si reopen revierte un adjustment-from-schedule, schedule incrementa `installments_remaining` y emite event compensatorio.
- Tests de invariantes: `outstanding_balance = total - sum(applied_repayments)` siempre.

### Slice 6 — Doc + smoke

- Doc funcional + manual de uso.
- Tests de motor de materialización (10+ casos).
- Smoke Playwright end-to-end: crear préstamo $600K en 6 cuotas → cerrar 6 períodos consecutivos → verificar schedule completed + saldo Finance = 0 + 6 adjustments creados con source_ref correcto.

## Out of Scope

- Pagos de préstamo en otra moneda (USD).
- Refinanciamiento / cambio de cuotas mid-loan.
- Notificaciones automatizadas al colaborador (post V1).
- Dashboard ejecutivo de credit risk.
- Integración con sistema bancario para originación.

## Detailed Spec

### Schedules schema

```sql
CREATE TABLE greenhouse_payroll.payroll_adjustment_schedules (
  schedule_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id                uuid NOT NULL,
  kind                     text NOT NULL CHECK (kind IN ('loan_repayment','advance_repayment','recurring_deduction')),
  total_amount_clp         integer NOT NULL CHECK (total_amount_clp > 0),
  installment_amount_clp   integer NOT NULL CHECK (installment_amount_clp > 0),
  installments_total       integer NOT NULL CHECK (installments_total > 0),
  installments_remaining   integer NOT NULL,
  start_period_id          uuid NOT NULL,
  end_period_id            uuid,
  status                   text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  source_finance_ref       text,  -- e.g. employee_loan_id
  reason_code              text NOT NULL,
  reason_note              text NOT NULL,
  created_by               text NOT NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  cancelled_at             timestamptz,
  cancelled_by             text,
  cancel_reason            text,
  CHECK (installment_amount_clp * installments_total = total_amount_clp OR kind = 'recurring_deduction')
);
```

### Finance entities

```sql
CREATE TABLE greenhouse_finance.employee_loans (
  loan_id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id                uuid NOT NULL,
  principal_clp            integer NOT NULL,
  outstanding_balance_clp  integer NOT NULL,
  interest_rate_pct        numeric(5,2) NOT NULL DEFAULT 0,
  schedule_id              uuid REFERENCES greenhouse_payroll.payroll_adjustment_schedules(schedule_id),
  status                   text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','written_off')),
  origination_date         date NOT NULL,
  closed_at                timestamptz,
  ...
);
```

### Materialization (cron)

```ts
// services/ops-worker/handlers/materialize-payroll-schedules.ts
export async function materializeForPeriod(periodId: string) {
  const schedules = await getActiveSchedulesDueIn(periodId)
  for (const s of schedules) {
    await createPayrollAdjustment({
      payrollEntryId: await resolveEntryFor(s.memberId, periodId),
      kind: 'fixed_deduction',
      payload: { amount: s.installmentAmountClp },
      sourceKind: 'recurring_schedule',
      sourceRef: s.scheduleId,
      reasonCode: s.kind === 'loan_repayment' ? 'loan_payback' : 'advance_payback',
      reasonNote: `Cuota ${s.installmentsTotal - s.installmentsRemaining + 1}/${s.installmentsTotal} de ${s.kind}`,
      requestedBy: 'system:materialize-schedules'
    })
    await decrementSchedule(s.scheduleId)
  }
}
```

### Person 360 UI

Tab "Préstamos y anticipos" muestra:
- Saldo total vivo (sum de outstanding_balance de active loans).
- Historial de schedules.
- Cuotas próximas en los siguientes N períodos.
- CTA crear nuevo (gated por capability `hr.employee_credit.create`).

## Acceptance Criteria

- [ ] Schemas + Finance entities aplicados.
- [ ] Motor materialización corre y crea adjustments con source_ref correcto.
- [ ] CHECK invariante `outstanding_balance = principal - sum(applied)` en tests.
- [ ] UI Person 360 + Admin dashboard Finance.
- [ ] Cron handler ops-worker corriendo y schedulado.
- [ ] Cancel + write-off flow funcional.
- [ ] Reliquidación que revierte cuota incrementa schedule.remaining correctamente.
- [ ] Doc + manual + tests + smoke Playwright.

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test src/lib/payroll/schedules src/lib/finance/employee-credit`
- `pnpm build`
- Smoke: 6-period loan cycle end-to-end.

## Closing Protocol

- [ ] `Lifecycle` → `complete`
- [ ] Move file + sync README + REGISTRY
- [ ] `Handoff.md`, `changelog.md`
- [ ] Cross-impact: TASK-745 update doc para mencionar que schedules ahora populan source_kind='recurring_schedule'
- [ ] Doc funcional Finance + HR

## Follow-ups

- Refinanciamiento mid-loan.
- Préstamos en monedas no-CLP (USD para internacionales).
- Notificaciones automatizadas.
- Credit risk dashboard ejecutivo.

## Open Questions

- ¿Préstamos generan interés? V1: 0%. Configurable en V2 si emerge.
- ¿Quién aprueba creación de préstamos? V1: capability gated, sin maker-checker. V2 podría requerir Finance approval.
