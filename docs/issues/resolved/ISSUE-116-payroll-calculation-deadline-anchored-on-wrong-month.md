# ISSUE-116 — El deadline de cálculo de nómina se anclaba al último día hábil del mes del período, no al close-window del mes siguiente

## Ambiente

staging + production (lógica de dominio; detectado en runtime del portal, período `2026-06`)

## Detectado

2026-07-06 — reportado por el operador al ver el período de junio marcado como "Fuera de plazo operativo" cuando, según la política de Efeonce, todavía está en plazo (se paga dentro de los primeros 5 días hábiles posteriores al cierre de mes). Surge inmediatamente después de desbloquear el cálculo (TASK-1347 / ISSUE-115).

## Síntoma

El banner de Nómina mensual mostraba: `Deadline de cálculo: 2026-06-30 · Estado operativo: Fuera de plazo operativo; cálculo manual permitido`. Hoy es 2026-07-06 (4.º día hábil de julio) — dentro de la ventana de pago de Efeonce —, pero el período aparecía como vencido.

## Causa raíz

`resolvePayrollCalculationDeadline` ([src/lib/payroll/calculation-deadline.ts](../../../src/lib/payroll/calculation-deadline.ts)) computaba el deadline como `getLastBusinessDayOfMonth(period.year, period.month)` — el **último día hábil del mes del período** (2026-06-30 para junio). Pero la política operativa de Efeonce es pagar dentro de los **primeros N días hábiles posteriores al cierre de mes** (`closeWindowBusinessDays`, default 5). El deadline correcto del período de junio es el **5.º día hábil de julio** (2026-07-07), no el último día hábil de junio.

El concepto ya existía en el calendario operativo (`DEFAULT_OPERATIONAL_CLOSE_WINDOW_BUSINESS_DAYS = 5`, `getOperationalPayrollMonth` — que confirma que el 2026-07-06 el mes operativo de nómina es junio), pero el deadline resolver no lo usaba: anclaba en el mes equivocado.

## Impacto

- **Cosmético/operativo, no bloqueante**: el cálculo siempre estuvo permitido (`blocksCalculation: false`); el problema era la etiqueta engañosa "Fuera de plazo operativo" cuando el período está en plazo, más `state='overdue_allowed'` incorrecto y `calculatedOnTime` mal evaluado (una nómina calculada en los primeros días hábiles del mes siguiente se marcaba como "fuera de fecha").
- **Sistémico**: afectaba a TODOS los períodos de nómina, no solo junio 2026 — cada período aparecía vencido desde el 1.º del mes siguiente.

## Solución

Fix robusto en el primitive del calendario + el deadline resolver:

1. **Primitiva canónica** `getNthBusinessDayOfMonth(year, month, n, options)` en `src/lib/calendar/operational-calendar.ts` (reusa `isBusinessCalendarDate`; clamp al último día hábil si `n` excede; skip de fines de semana + feriados Nager/overrides). Reusable por cualquier derivación "primeros N días hábiles del mes".
2. **`resolvePayrollCalculationDeadline`** ahora computa el deadline como el `closeWindowBusinessDays`-ésimo día hábil del **mes siguiente** al período (con rollover de año en diciembre), leyendo `closeWindowBusinessDays` del contexto operativo (single source of truth, escalable/configurable).
3. **Rename semántico** de los campos del deadline: `lastBusinessDay → deadlineDate`, `isLastBusinessDay → isDeadlineDay` (el nombre viejo era engañoso tras el cambio de significado). Propagado a `PayrollCalculationReadiness.deadline` (`src/types/payroll.ts`), `payroll-readiness.ts`, `current-payroll-period.ts` (VM) y `PayrollPeriodTab.tsx`.

No hay migración, backfill ni flag — es un cambio de lógica code-only.

## Verificación

- `getPayrollPeriodReadiness('2026-06')` contra PG/calendario real ⇒ `deadline = { deadlineDate: '2026-07-07', isOverdue: false, state: 'pending', blocksCalculation: false }`. El banner deja de decir "Fuera de plazo".
- Tests: `calculation-deadline.test.ts` reescrito (nuevas semánticas + regresión ISSUE-116: período junio en 2026-07-06 = `pending`, no overdue), `operational-calendar.test.ts` (helper nuevo: weekday, feriado, clamp), `payroll-readiness.test.ts` + `current-payroll-period.test.ts` + `PayrollPeriodTab.test.tsx` actualizados. 596 tests payroll+calendar+offboarding verdes; `pnpm typecheck` 0.

## Estado

resolved

## Relacionado

- ISSUE-115 / TASK-1347 — el desbloqueo previo que dejó ver este segundo problema.
- `src/lib/calendar/operational-calendar.ts` (`getNthBusinessDayOfMonth`, `getOperationalPayrollMonth`, `DEFAULT_OPERATIONAL_CLOSE_WINDOW_BUSINESS_DAYS`).
- Follow-up posible: revisar si `auto-calculate-payroll` (que dispara en `isLastBusinessDayOfMonth`) debe alinearse a la ventana de close (no tocado aquí — automatización, scope aparte).
