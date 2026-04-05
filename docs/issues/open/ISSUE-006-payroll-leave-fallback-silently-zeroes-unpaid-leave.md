# ISSUE-006 — Payroll leave fallback silently zeroes unpaid leave

## Ambiente

preview + production

## Detectado

2026-04-05, auditoría de código del módulo Payroll

## Síntoma

Si el fetch de permisos aprobados falla o PostgreSQL no está disponible, Payroll sigue calculando como si ningún colaborador tuviera permisos no remunerados. La nómina, la proyección y la readiness quedan con `daysOnUnpaidLeave = 0` sin una señal blocking explícita.

## Causa raíz

`fetchApprovedLeaveForPeriod()` degrada silenciosamente a `[]` tanto cuando PostgreSQL no está configurado como cuando la query falla.

**Implementación** — `src/lib/payroll/fetch-attendance-for-period.ts`:

```ts
if (!isGreenhousePostgresConfigured()) {
  return []
}

try {
  return await runGreenhousePostgresQuery(...)
} catch (error) {
  console.warn('[payroll] Failed to fetch leave data from Postgres:', ...)
  return []
}
```

Luego `fetchAttendanceForAllMembers()` transforma ese vacío en ceros:

```ts
const daysOnLeave = leave?.totalDays ?? 0
const daysOnUnpaidLeave = leave?.unpaidDays ?? 0
```

Y `calculatePayroll()` usa esos valores para descuentos de asistencia:

```ts
const deductibleDays = skipsAttendanceAdjustments
  ? 0
  : attendance
    ? attendance.daysAbsent + attendance.daysOnUnpaidLeave
    : 0
```

El resultado es que una falla del reader de permisos se convierte en una nómina aparentemente válida pero potencialmente subdescontada.

## Impacto

- Riesgo de calcular mal ausencias no remuneradas y prorrateos asociados.
- `Payroll Readiness` puede mostrar warning genérico de señal de asistencia ausente, pero no bloquea un cálculo oficialmente incorrecto.
- `Projected Payroll` también hereda la degradación a cero y puede mostrar un devengado optimista sin permisos descontados.
- El error es silencioso: no falla la operación ni obliga al operador a corregir la data antes de exportar.

## Solución

- No convertir falla del fetch de permisos a cero silencioso para el carril oficial de cálculo.
- Propagar un estado explícito de degradación o error desde attendance/leave hacia readiness y cálculo.
- Definir política: si `leave_requests` no puede leerse, el cálculo oficial debe bloquear o marcarse como incompleto de forma visible.
- Mantener projected payroll separado si se decide tolerancia distinta, pero con señal explícita en UI/API.

## Verificación

1. Simular fallo de PostgreSQL o error en la query de `greenhouse_hr.leave_requests`.
2. Ejecutar readiness y cálculo sobre un período con colaboradores que sí tienen permisos aprobados.
3. Confirmar que el sistema no devuelve silenciosamente `daysOnUnpaidLeave = 0` como si fuera dato válido.
4. Confirmar que el operador recibe una señal blocking o degradada explícita antes de aprobar/exportar.

## Estado

open

## Relacionado

- `src/lib/payroll/fetch-attendance-for-period.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/payroll-readiness.ts`
- `src/lib/payroll/project-payroll.ts`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/TASK-005-hr-payroll-attendance-leave-work-entries.md`
