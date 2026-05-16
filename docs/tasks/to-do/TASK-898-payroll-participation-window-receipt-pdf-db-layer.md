# TASK-898 — Payroll Participation Window Receipt PDF DB Layer (TASK-893 V1.2)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio` (bug LATENTE — no se manifiesta hasta que emerja un CL dependent mid-month real)
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-payroll-participation-window-v1.x`
- Status real: `Diseno canonizado por arch-architect 2026-05-16`
- Rank: `TBD`
- Domain: `payroll|hr`
- Blocked by: `TASK-893 V1.1a SHIPPED + V1.1 follow-up SHIPPED`
- Branch: `develop`
- Legacy ID: `TASK-893 V1.2`

## Summary

`payroll_entries.working_days_in_period` (DB persistido por `buildPayrollEntry` runtime) tiene la misma ambigüedad que TASK-893 V1.1 acaba de cubrir en la projection: refleja "días del PERÍODO" pero no la ventana de participation del miembro cuando aplica. Para un futuro CL dependent (`indefinido`/`plazo_fijo` + `pay_regime='chile'` + `payroll_via='internal'`) entrando mid-month, el recibo PDF generado por `generate-payroll-pdf.tsx` mostraría "21 días hábiles, Asistencia completa" cuando trabajó parcial. Esto es bug class latente — TASK-893 V1.1a fixed projection display + V1.1 added projection participation window fields, pero el path runtime DB receipt sigue expuesto.

V1.2 cierra el gap: migration `payroll_entries.participation_working_days/start_date/end_date` NULLABLE + wire `buildPayrollEntry` para populate cuando `compensation` viene de `prorateCompensationForParticipationWindow` + receipt-presenter conditional row para CL dependent.

## Why This Task Exists

**Bug class latente identificado por arch-architect verdict 2026-05-16** post TASK-893 V1.1 SHIPPED:

- TASK-758 receipt-presenter omite attendance rows para honorarios + international (línea 554-555). Felipe Zurita (honorarios) NO afectado.
- **PERO** un futuro CL dependent mid-month entra al path `chile_dependent` (línea 555 evaluates true) → `buildAttendanceRows` lee `entry.workingDaysInPeriod` directamente.
- `workingDaysInPeriod` se materializa con valor del período completo (21) — el mismo gap que V1.1 cerró en projection.

**Caso real esperado**: futuro hire dependent CL mid-month (e.g. `indefinido` con `effective_from=2026-06-15` para un período de junio 2026). Su recibo PDF mostraría:

| Concepto | Monto |
| --- | --- |
| Período | Junio 2026 |
| Días hábiles del período | 22 ← **engañoso**, trabajó 12 |
| Asistencia | Completa ← **engañoso**, no estaba contratado pre-15/06 |

**Spec canonical post V1.1 SHIPPED**: receipt-presenter debe distinguir AMBOS contextos (calendar período + ventana participation) cuando emerja un CL dependent mid-month.

## Goal

- Migration que agrega 3 columns NULLABLE a `greenhouse_payroll.payroll_entries`:
  - `participation_working_days INTEGER NULL`
  - `participation_start_date DATE NULL`
  - `participation_end_date DATE NULL`
- Wire `buildPayrollEntry` (`src/lib/payroll/build-payroll-entry.ts`) para populate los 3 campos cuando `compensation` viene del helper `prorateCompensationForParticipationWindow` (detectable via `participation` arg opcional).
- Extender el INSERT/UPDATE en `pgUpsertPayrollEntry` (`postgres-store.ts`) para persistir los nuevos campos.
- Receipt presenter (`src/lib/payroll/receipt-presenter.ts:550-571`) conditional para CL dependent:
  - Cuando `participation_working_days != null`: mostrar "12 / 22 días hábiles del período · Ingreso 15/06" + "Sin ausencias en ventana de participación" si `days_absent === 0`.
  - Cuando `participation_working_days === null`: mantener semántica legacy "22 / 22 días, Asistencia completa".
- Wire en period report PDF + Excel export (TASK-782) — V1.3 follow-up.
- Reliability signal candidato: `payroll.participation_window.attendance_render_drift` que detecta entries con `prorationFactor < 1` Y `participation_working_days IS NULL` (data quality drift entre projection y official) — V1.2 SHIPPED.

## Dependencies & Impact

- **Depende de**: TASK-893 V1.1a SHIPPED + V1.1 follow-up SHIPPED (este release).
- **Impacta a**:
  - `src/lib/payroll/build-payroll-entry.ts` — agrega 3 outputs opcionales.
  - `src/lib/payroll/postgres-store.ts` (`pgUpsertPayrollEntry`) — INSERT/UPDATE extendido.
  - `src/lib/payroll/receipt-presenter.ts` (línea 550-571) — conditional render dependent CL.
  - `src/lib/payroll/generate-payroll-pdf.tsx` — bump `RECEIPT_TEMPLATE_VERSION` (auto-regen).
  - `src/lib/payroll/calculate-payroll.ts` — pasa `participation` al `buildPayrollEntry`.

## Detailed Spec

### Migration canonical

```sql
-- Up Migration
ALTER TABLE greenhouse_payroll.payroll_entries
  ADD COLUMN IF NOT EXISTS participation_working_days INTEGER NULL,
  ADD COLUMN IF NOT EXISTS participation_start_date DATE NULL,
  ADD COLUMN IF NOT EXISTS participation_end_date DATE NULL;

COMMENT ON COLUMN greenhouse_payroll.payroll_entries.participation_working_days IS
  'TASK-898 V1.2 — días hábiles efectivos del miembro en su ventana de participation. NULL cuando full-period.';

-- Anti pre-up-marker check
DO $$
DECLARE expected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO expected_count
  FROM information_schema.columns
  WHERE table_schema='greenhouse_payroll' AND table_name='payroll_entries'
    AND column_name IN ('participation_working_days','participation_start_date','participation_end_date');
  IF expected_count <> 3 THEN
    RAISE EXCEPTION 'TASK-898 anti pre-up-marker: expected 3 participation_* columns';
  END IF;
END $$;
```

### buildPayrollEntry signature

```ts
// src/lib/payroll/build-payroll-entry.ts
export const buildPayrollEntry = async ({
  ...existingArgs,
  participation?: PayrollParticipationWindow | null  // NEW
}) => {
  // ... existing
  return {
    ...entry,
    workingDaysInPeriod,
    daysPresent,
    // NEW V1.2 fields
    participationWorkingDays: participation && participation.prorationFactor < 1
      ? countWeekdays(participation.eligibleFrom!, participation.eligibleTo!)
      : null,
    participationStartDate: participation && participation.prorationFactor < 1
      ? participation.eligibleFrom
      : null,
    participationEndDate: participation && participation.prorationFactor < 1
      ? participation.eligibleTo
      : null
  }
}
```

### Receipt presenter render condicional

```tsx
// src/lib/payroll/receipt-presenter.ts:550-571 (refactor)
if (regime !== 'chile_dependent' || entry.workingDaysInPeriod == null) return []

const hasParticipationWindow = entry.participationWorkingDays != null

const attendanceRows: ReceiptRow[] = []

if (hasParticipationWindow) {
  attendanceRows.push(
    { label: 'Días efectivos', amount: String(entry.participationWorkingDays) },
    { label: 'Días hábiles del período', amount: String(entry.workingDaysInPeriod) },
    { label: 'Ingreso', amount: formatDate(entry.participationStartDate!) }
  )
} else {
  attendanceRows.push(
    { label: 'Días hábiles del período', amount: String(entry.workingDaysInPeriod) }
  )
}
// ... existing daysPresent / daysAbsent rows con label condicional similar
```

### Reliability signal V1.2

```ts
// src/lib/reliability/queries/payroll-participation-window-attendance-render-drift.ts
// Detecta entries con prorationFactor < 1 AND participation_working_days IS NULL
// (debería ser 0 post-V1.2 deployment + re-cómputo de entries existentes).
```

## Verification

- Migration up + down idempotent.
- buildPayrollEntry test cubre: participation null (legacy), participation factor<1 (populate), participation factor=1 (null).
- Receipt presenter test cubre: CL dependent full-period (legacy display), CL dependent mid-month (window display), honorarios (skipped, no change).
- Backfill manual: re-compute existentes que tengan `prorationFactor < 1` (TASK-893 V1 activado a producción 2026-05-16 — Felipe Zurita primer caso real). Idempotente.
- Signal `attendance_render_drift` count=0 sustained ≥30d post deploy.

## Slicing recomendado

- **S0**: ADR + migration `payroll_entries` add 3 NULLABLE cols + anti-pre-up-marker check.
- **S1**: `buildPayrollEntry` extend signature + 3 tests pure.
- **S2**: `pgUpsertPayrollEntry` INSERT/UPDATE extended + tests integration.
- **S3**: Receipt presenter conditional + 3 tests + bump `RECEIPT_TEMPLATE_VERSION` para auto-regen.
- **S4**: Reliability signal `attendance_render_drift` + reader + builder + wiring.
- **S5**: Backfill script idempotente para entries existentes con `prorationFactor < 1`.
- **S6**: Docs canonical (CLAUDE.md hard rule + doc funcional finiquito/receipts si aplica).

## Hard rules (canonizar al cerrar)

- **NUNCA** mostrar attendance para un dependent CL mid-month sin AMBOS contexts (período + ventana). Single-number render es engañoso operativamente.
- **NUNCA** computar `participation_working_days` inline en consumers — usar el helper canonical de `buildPayrollEntry`.
- **NUNCA** mutar entries existentes directamente vía SQL. Backfill pasa por re-cómputo idempotente con audit trail.
- Lint rule candidata `greenhouse/no-attendance-without-participation-context` para code review.

## Open questions

- ¿Receipt PDF para `prorate_until_end` (Maria-like exit mid-month) cómo se renderiza? Probable: "X días efectivos · Y hábiles del período · Salida DD/MM". V1.2 cubre — el resolver TASK-893 ya distingue policies, presenter map.
- ¿Backfill cuando flag flipped mid-period? Probable signal lo cubrirá.

## Referencias

- TASK-893 V1.1a + V1.1 follow-up: `docs/tasks/complete/TASK-895-leave-accrual-participation-aware.md` (parent)
- arch-architect verdict 2026-05-16 (sesión TASK-893 release post-Sentry)
- `src/lib/payroll/receipt-presenter.ts:550-571` — code path con bug latente
- `src/views/greenhouse/payroll/ProjectedPayrollView.tsx:AttendanceRing` — pattern UI canonical V1.1
