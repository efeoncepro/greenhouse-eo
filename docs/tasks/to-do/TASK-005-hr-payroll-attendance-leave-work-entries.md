# CODEX TASK — HR Payroll Attendance/Leave Work Entries Hardening (v1)

## Delta 2026-03-28 — Auditoría de implementación

### Estado real: la capa canónica `work_entries` NO existe

Se auditó el código contra los 7 criterios de aceptación. El resultado es que la task sigue en `to-do` correctamente — la pieza central (capa canónica de work entries) no se ha construido.

### Lo que ya existe

| Pieza | Archivo | Estado |
|-------|---------|--------|
| Fetch de attendance por período | `src/lib/payroll/fetch-attendance-for-period.ts` | Funcional — query a `attendance_daily` (BQ) + `leave_requests` (PG) |
| Range overlap check | mismo archivo, líneas 199-200 | `start_date <= periodEnd AND end_date >= periodStart` |
| Leave type `is_paid` | `greenhouse_hr.leave_types` | Payroll distingue paid vs unpaid correctamente |
| Teams webhook | `src/app/api/hr/core/attendance/webhook/teams/route.ts` | Recibe attendance records, escribe a `attendance_records` |
| Attendance snapshot reference | `src/lib/payroll/attendance-snapshot.ts` | Código que referencia `attendance_monthly_snapshot` — **tabla nunca creada** |
| Tests unitarios | `fetch-attendance-for-period.test.ts` | 10 tests: `countWeekdays` (9) + `buildMemberLeaveSummary` (1) |
| Diagnostic label | `fetch-attendance-for-period.ts` línea 45 | Retorna `source: 'legacy_attendance_daily_plus_hr_leave'` — reconoce que es legacy |

### Lo que NO existe

| Criterio | Gap |
|----------|-----|
| **Capa canónica `work_entries`** | No existe tabla, no existe DDL, no existe store. `attendance_monthly_snapshot` está en código pero la tabla nunca se creó en ningún setup script. |
| **Prorrateo de permisos cross-período** | Solo hay overlap check simple. Un permiso de 5 días que cruza dos meses no prorratea — imputa `requested_days` completo al período que intersecta. |
| **Collision contract** | No existe regla de precedencia cuando holiday + leave + absence confluyen el mismo día. Sin detección de doble descuento. |
| **Late approval policy** | No existe tratamiento para permisos aprobados después de que la nómina se calculó/aprobó/exportó. `canRecalculatePayrollPeriod('approved')` permite recálculo pero sin enforcement de política. |
| **Teams → work_entries** | Webhook escribe a `attendance_records` (HR Core), no a una capa consumible por Payroll. El diagnostic dice `integrationTarget: 'microsoft_teams'` pero el dato no fluye al cálculo. |
| **Tests de integración** | No hay tests de: cross-period leave, collisions, late approval, Teams data flow. |

### Blocker principal

La tabla `work_entries` / `attendance_monthly_snapshot` es la pieza central. Sin ella:
- Payroll sigue recombinando `attendance_daily + leave_requests` en cada cálculo
- No hay snapshot congelable ni auditable
- Teams no tiene dónde aterrizar datos normalizados
- El prorrateo fino no tiene dónde persistir

### Recomendación de ejecución (actualizada)

Mismo orden propuesto en la task (Slice 1→3→2→6→4→5) pero con prerequisito nuevo:
- **TASK-078** (Previsional Foundation) debe completarse primero porque cambia el forward engine que consume attendance
- **TASK-076** (Liquidación Parity) agrega campos de asistencia al PDF de liquidación que dependen de esta capa

## Resumen

Endurecer la integración entre `Permisos`, `Asistencia` y `Payroll` para que la nómina no dependa de agregados ad-hoc por request y quede preparada para una futura integración con `Microsoft Teams`.

Hoy `Payroll` ya descuenta correctamente ausencias y permisos no pagados aprobados, pero todavía lo hace reconstruyendo un resumen mensual en tiempo real desde:
- `attendance_daily` en BigQuery
- `leave_requests` y `leave_types` en PostgreSQL

Eso funciona para el alcance actual, pero no es todavía el modelo más robusto ni más escalable.

La meta de esta task es introducir una capa canónica de `work entries`/`attendance segments` para nómina, manteniendo:
- `HR Core` como owner de permisos/licencias
- `Teams` como fuente futura de asistencia/timecards
- `Payroll` como consumidor de una proyección mensual estable y auditable

---

## Por qué esta lane existe ahora

El runtime actual tiene fortalezas, pero también riesgos claros:

1. El resumen de permisos por período no prorratea el traslape real por día
- hoy un permiso que cruza dos períodos puede impactar más de un mes con `requested_days` completo

2. Asistencia y permisos llegan por caminos distintos
- `attendance_daily`
- `leave_requests`
- no existe una reconciliación canónica por día o fracción de día antes de calcular nómina

3. El modelo actual es demasiado agregado
- sirve para días completos
- no escala bien a:
  - permisos por horas
  - medias jornadas
  - reconciliación con `Teams timeCards`
  - explicabilidad fina de descuentos

4. No existe política explícita de aprobaciones tardías
- si un permiso se aprueba después del cálculo o después de cerrar la nómina, no hay una semántica canónica de:
  - reabrir
  - diferir al siguiente período
  - o registrar ajuste retroactivo

5. La integración futura con `Microsoft Teams` necesita una costura mejor
- `Teams` expone `timeOffRequests`, `timeOffReasons` y `timeCards`
- `Payroll` no debería leer esas APIs directo para calcular
- debería consumir una proyección interna normalizada y congelable

---

## Benchmark y referencias externas

Esta lane se inspira en patrones que aparecen repetidamente en plataformas HR/Payroll maduras:

### Microsoft Teams / Graph
- separación entre:
  - `timeOffRequests`
  - `timeOffReasons`
  - `timeCards`
- confirmación y trazabilidad del registro de tiempo
- distinción clara entre request, reason y entry operativa

### Odoo
- `Time Off` no cae directo a cálculo salarial
- se transforma en `Work Entries`
- el tipo de ausencia se mapea a `Work Entry Type`
- payroll consume esos work entries, no el request crudo

### Oracle HCM
- Absence Management transfiere ausencia a payroll con reglas específicas de rate y tratamiento
- hay mejoras explícitas de performance en el puente Absence -> Payroll
- payroll no depende de recomputar cada ausencia cruda sin una capa de integración

### Personio
- el HRIS actúa como source of truth de ausencia
- expone eventos de ausencia/asistencia para consumidores
- payroll export consume ausencia aprobada de forma estructurada

Conclusión arquitectónica:
- el patrón robusto no es “request de permiso + query de asistencia + cálculo directo”
- el patrón robusto es:
  - sistema owner del request
  - capa canónica de work entries/attendance segments
  - payroll como consumidor estable

---

## Estado real de partida

### Ya existe

- `greenhouse_hr.leave_types`
- `greenhouse_hr.leave_requests`
- `greenhouse_serving.member_leave_360`
- `attendance_daily` en BigQuery
- cálculo de nómina que usa:
  - `daysAbsent`
  - `daysOnLeave`
  - `daysOnUnpaidLeave`
- distinción `is_paid` en tipos de permiso
- `Payroll Readiness` y `Detalle de cálculo` como foundation de hardening

### Gap operativo actual

1. No existe una entidad canónica de `work entry`
- `Payroll` calcula desde agregados mensuales armados on-the-fly

2. No existe reconciliación diaria entre:
- presencia/ausencia
- holiday
- permiso pagado
- permiso no pagado
- media jornada o request parcial

3. No existe congelación explícita del source attendance/leave usado
- el snapshot final guarda números agregados
- no guarda todavía la trazabilidad de segmentos diarios de origen

4. No existe política de `late approval`
- especialmente relevante cuando un permiso aprobado llega después de `approved` o `exported`

5. No existe adapter contract formal para `Microsoft Teams`
- ya sabemos que el target futuro de asistencia es Teams
- pero falta un seam canónico en runtime

---

## Alineación obligatoria con arquitectura

Revisar y respetar:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`

Reglas obligatorias:
- `HR Core` sigue siendo owner de permisos/licencias
- `Payroll` no debe convertirse en owner del request de permiso
- `Teams` debe entrar como source adapter, no como lógica embebida en el calculator
- la proyección canónica de work entries debe vivir en PostgreSQL
- `BigQuery` puede seguir siendo input o staging, no el write path mutante del dominio

---

## Objetivo de esta task

Cerrar la siguiente capa de robustez para el puente `Permisos/Asistencia -> Payroll`:
- exactitud por día y por período imputable
- reconciliación consistente entre ausencia y permiso
- modelo extensible a fracciones de día y a `Teams`
- tratamiento explícito de aprobaciones tardías
- trazabilidad útil para soporte y auditoría

---

## Scope

### Slice 1 — Normalización diaria y prorrateo correcto

Corregir la semántica actual para que permisos que cruzan períodos no se imputen dos veces ni completos cuando solo traslapan parcialmente.

Objetivos:
- calcular días/horas realmente imputables al período
- prorratear requests que cruzan límites de mes
- dejar reglas explícitas para:
  - día completo
  - media jornada
  - horas

Entregables sugeridos:
- helper de segmentación diaria por permiso
- tests unitarios de traslape entre meses
- `requested_days` deja de ser el único input para payroll

### Slice 2 — Capa canónica `payroll_work_entries`

Introducir una proyección mensual/diaria consumible por Payroll.

Opciones válidas:
- `greenhouse_payroll.work_entries`
- o `greenhouse_serving.member_work_entries_360`

Debe modelar al menos:
- `member_id`
- `entry_date`
- `entry_type`
- `source_system`
- `source_record_id`
- `duration_unit` (`day`, `half_day`, `hours`)
- `duration_value`
- `is_paid`
- `payroll_treatment`

Tipos esperados:
- `worked`
- `holiday`
- `absence`
- `paid_leave`
- `unpaid_leave`
- `partial_paid_leave`
- `partial_unpaid_leave`

Regla:
- `Payroll` debe leer de esta capa y no recombinar manualmente asistencia + permisos cada vez

### Slice 3 — Política de reconciliación y colisiones

Definir resolución canónica cuando confluyen múltiples señales el mismo día.

Ejemplos:
- `attendance_daily = absent` pero existe `leave_request approved`
- `holiday` y `paid_leave` el mismo día
- `timeCard` trabajado + media jornada de permiso

La task debe dejar una precedencia explícita y testeada.

Ejemplo de orden sugerido:
1. `holiday`
2. `approved leave`
3. `confirmed worked time`
4. `absence`

El resultado no debe permitir doble descuento ni doble crédito.

### Slice 4 — Aprobaciones tardías y ajustes

Modelar qué pasa si un permiso se aprueba tarde.

Objetivo:
- no mutar silenciosamente una nómina ya cerrada

Debe cubrir al menos:
- período `draft/calculated`
- período `approved`
- período `exported`

Resultados válidos:
- recalcular si el período sigue abierto
- revertir a `calculated` si estaba `approved`
- generar `deferred adjustment` para el siguiente período si estaba `exported`

### Slice 5 — Adapter contract para Microsoft Teams

Preparar el seam para la integración futura.

Debe definir:
- mapping `teams_user_id -> member_id`
- ingestión de:
  - `timeOffReasons`
  - `timeOffRequests`
  - `timeCards`
- contrato de sync incremental
- estrategia de idempotencia por `source_record_id`

Importante:
- esta slice no obliga a construir toda la integración Teams ahora
- sí obliga a dejar el contrato y el placement correctos para que entre sin romper Payroll

### Slice 6 — Readiness y explainability extendidos

Extender el hardening actual de Payroll para que también explique:
- cuántos permisos aprobados impactan el período
- cuántos son pagados vs no pagados
- qué members tienen colisiones asistencia/permiso
- si el cálculo usó legacy attendance o work entries canónicos
- si hubo ajustes diferidos por aprobaciones tardías

---

## No scope

- rediseñar toda la UI de `Permisos`
- construir un sistema completo de `time tracking` global
- replicar todo Microsoft Shifts dentro de Greenhouse
- convertir `Payroll` en owner de aprobaciones de permisos
- rehacer la integración `ICO`
- cambiar la lógica de bonos KPI

---

## Criterios de aceptación

La task se considera cerrada cuando:

1. `Payroll` deja de depender del agregado ad-hoc actual para permisos y asistencia
2. los permisos que cruzan períodos se imputan correctamente al mes correspondiente
3. existe un contract claro de colisión entre permiso, ausencia, holiday y trabajo confirmado
4. existe una política explícita de `late approval`
5. el seam para `Microsoft Teams` queda modelado y compatible con `member_id`
6. readiness y explainability exponen estas nuevas señales
7. hay tests unitarios de:
   - traslape entre períodos
   - paid vs unpaid leave
   - colisiones asistencia/permiso
   - late approval/deferred adjustment

---

## Riesgos y decisiones pendientes

### Riesgos
- si se implementa solo con más condiciones sobre el fetch actual, se endurece la deuda en vez de resolverla
- si `Teams` entra directo al calculator, el dominio queda acoplado a APIs externas
- si no se define la precedencia de colisiones, habrá descuentos inconsistentes

### Decisiones pendientes
- si la capa canónica vivirá como tabla mutante o serving projection materializada
- si `late approval` para períodos `exported` se resuelve vía:
  - ajuste en período siguiente
  - o `retro payroll adjustment` explícito
- granularidad mínima inicial:
  - `día`
  - o `hora`

Recomendación:
- iniciar con granularidad `día + media jornada`
- dejar `hora` preparada en el contrato pero no bloquear el primer rollout por eso

---

## Dependencies & Impact

- **Depende de:**
  - `docs/tasks/in-progress/CODEX_TASK_HR_Payroll_Operational_Hardening_v1.md`
  - `docs/tasks/complete/CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1.md`
  - `docs/tasks/complete/CODEX_TASK_HR_Core_Module_v2.md`
  - `greenhouse_hr.leave_types`
  - `greenhouse_hr.leave_requests`
  - `greenhouse_core.members.teams_user_id`

- **Impacta a:**
  - `CODEX_TASK_HR_Payroll_Operational_Hardening_v1.md`
  - `CODEX_TASK_HRIS_Contract_Type_Consolidation.md`
  - futuras lanes de `Microsoft Teams` attendance/schedule sync
  - reporting de gasto de personal y auditoría payroll

- **Archivos owned:**
  - `src/lib/payroll/fetch-attendance-for-period.ts`
  - `src/lib/payroll/calculate-payroll.ts`
  - `src/lib/payroll/payroll-readiness.ts`
  - `src/lib/payroll/payroll-entry-explain.ts`
  - `src/app/api/hr/payroll/periods/[periodId]/readiness/route.ts`
  - `src/app/api/hr/payroll/entries/[entryId]/explain/route.ts`
  - `src/lib/hr-core/**` para integración de permisos
  - `scripts/setup-postgres-hr-leave.sql`
  - futuros scripts/proyecciones `work_entries`

---

## Recomendación de ejecución

Orden sugerido:

1. Slice 1 — prorrateo y exactitud por período
2. Slice 3 — colisiones y precedencia
3. Slice 2 — capa canónica `work_entries`
4. Slice 6 — readiness/explainability extendidos
5. Slice 4 — late approval
6. Slice 5 — adapter contract Teams

Razón:
- primero cerrar exactitud
- luego cerrar modelo canónico
- después enchufar fuentes futuras sin romper el cálculo
