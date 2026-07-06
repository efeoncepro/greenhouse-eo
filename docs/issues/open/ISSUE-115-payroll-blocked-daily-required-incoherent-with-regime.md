# ISSUE-115 — Nómina bloqueada permanentemente por `daily_required` incoherente con el régimen de contrato

## Ambiente

staging / production (lógica de dominio; detectado en runtime del portal, período `2026-06`)

## Detectado

2026-07-06 — reportado por el operador al no poder presionar **Calcular** en Nómina mensual. Diagnóstico verificado corriendo el reader real `getPayrollPeriodReadiness('2026-06')` contra PostgreSQL + BigQuery.

## Síntoma

El botón **Calcular** de Nómina mensual queda deshabilitado. El banner de readiness muestra `1 requieren asistencia/licencias` y `calculation.ready = false`. El colaborador bloqueante es **Maria Fernanda Gonzalez** (`member_id 7da60123-3e54-4db9-9dd0-1962f69073a2`), de régimen `international_internal`.

## Causa raíz

Cadena de tres fallas de lógica; la data incoherente es solo la última capa:

1. **Regla de asistencia definida por denylist frágil.** `requiresPayrollAttendanceSignal` ([src/lib/payroll/compensation-requirements.ts:14](../../../src/lib/payroll/compensation-requirements.ts#L14)) exige señal de asistencia para "todo lo que no sea `honorarios` ni `payrollVia=deel`". `international_internal` (payrollVia `internal`, contractType ≠ honorarios) se cuela por el hueco. La asistencia diaria solo afecta el pago en régimen **dependiente Chile** (`indefinido`/`plazo_fijo`); la regla debería ser un allowlist positivo, no una denylist.

2. **El flag por-member sobreescribe la verdad del régimen.** [src/lib/payroll/postgres-store.ts:488](../../../src/lib/payroll/postgres-store.ts#L488): `scheduleRequired: row.daily_required ?? resolveScheduleRequired({ contractType })`. El `??` deja que `greenhouse_core.members.daily_required` **le gane** a la derivación por tipo de contrato. Un flag crudo puede *habilitar* asistencia en un régimen que categóricamente no la tiene. Precedencia invertida: el régimen debe ser autoritativo.

3. **Data incoherente persistida.** Maria Fernanda (`international_internal`, alta 2026-06-15) tiene `daily_required = true`; su par exacto del mismo régimen, Maggie Borralles (`0e6a896e-…`), tiene `daily_required = false`. El write-path aceptó la combinación incoherente sin validar contra el tipo de contrato.

Como consecuencia, el reader exige `hasAttendanceSignal` desde BigQuery `greenhouse.attendance_daily`, que **está vacía (0 filas en todo el proyecto)** — la integración de asistencia (Teams) no la puebla. La señal nunca aparece → blocker permanente.

**Riesgo latente relacionado:** con `attendance_daily` vacía, cualquier trabajador dependiente Chile con `daily_required=true` bloqueará la nómina apenas entre a un período. Hoy no explota solo porque el roster no tiene dependientes Chile con jornada. Amerita verificación aparte (integración Teams → `attendance_daily` o path de captura manual).

## Impacto

- **Bloqueante operativo:** la nómina del período `2026-06` no se puede calcular hasta resolver el blocker.
- **Clase de bug sistémica:** afecta a cualquier colaborador `international_internal` (o régimen internacional futuro) con `daily_required=true`, no solo a Maria Fernanda.
- **Silencioso:** el operador no tiene forma de entender por qué el botón está deshabilitado (el banner dice "asistencia/licencias" pero no nombra al colaborador ni la causa).

## Solución

Formalizada como **TASK-1347** (`backend-data`, `reader`). El diseño se **recalibró en Discovery** (2026-07-06): existe la política canónica `SCHEDULE_DEFAULTS` (`src/types/hr-contracts.ts:57`) donde `daily_required` es `overridable: true` para régimenes internacionales → ese flag es data **válida**, no incoherente. Por eso el fix robusto se reduce a corregir el **primitive** (no mutar data válida ni detectarla):

1. **Predicado régimen-scoped (core + unblock):** reescribir `requiresPayrollAttendanceSignal` como allowlist positivo anclado al régimen dependiente Chile (`isChileDependentContract` = `indefinido`/`plazo_fijo`). La asistencia diaria solo aplica en régimen Chile; ningún `daily_required`/`scheduleRequired` la habilita fuera de Chile. Régimenes internacionales nuevos default a "no requiere" (fail-safe, escalable).
2. **Read mapper coherente (no parche):** corregir `postgres-store.ts:488` para rutear por `resolveScheduleRequired({ contractType, scheduleRequired: row.daily_required })` (como ya hacen el write path y el BQ mapper), honrando `SCHEDULE_DEFAULTS.overridable` — cierra el smell de precedencia invertida.

Descartados en Discovery (habrían operado sobre data válida): write-path guard que rechaza `daily_required=true` en régimen internacional, migration/backfill de normalización, y reliability signal de drift. **Maria Fernanda (`7da60123`) NO necesita data-fix** — tras la Capa 1 su flag es payroll-irrelevante. Los tests unitarios exhaustivos reemplazan al detector como guardrail de regresión.

## Verificación

- Nuevo caso en `src/lib/payroll/payroll-readiness.test.ts`: `international_internal` + `daily_required=true` + `attendance_daily` vacía ⇒ `calculation.ready = true`.
- `getPayrollPeriodReadiness('2026-06')` contra PG post-fix ⇒ `blockingIssues = []`, botón **Calcular** habilitado.
- `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde (no regresión en payroll/finiquito).
- Reliability signal `payroll.contract.schedule_regime_mismatch` en `0` post-backfill.

## Estado

open

## Relacionado

- TASK-1347 — fix robusto en 4 capas (owner de la solución).
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md` (§`International Internal contract type`).
- Riesgo latente: `greenhouse.attendance_daily` vacía (integración Teams no poblando) — candidato a issue de verificación propio.
