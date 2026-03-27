# TASK-074 - Projected Payroll to Official Promotion Flow

## Summary

Conectar `Projected Payroll` con `Payroll official` mediante un flujo explícito de promoción controlada, de forma que una proyección confiable pueda usarse como base para el borrador oficial sin mezclar simulación con snapshot transaccional final.

## Why This Task Exists

Hoy `Projected Payroll` y `Payroll official` son conceptualmente cercanos, pero están desacoplados operativamente.

Eso genera una fricción real:

- RRHH puede validar montos en la proyección hoy o a fin de mes
- pero luego debe recalcular la nómina oficial sin una conexión explícita con esa proyección
- no queda clara la trazabilidad entre “lo que vi proyectado” y “lo que terminé aprobando/exportando”

La necesidad no es fusionarlos, sino conectarlos correctamente.

## Goal

Permitir que una proyección:

- use el mismo motor canónico de cálculo que la nómina oficial
- pueda promoverse explícitamente a borrador oficial o recalcular el período oficial con esos insumos
- deje audit trail y comparación de variaciones entre projected vs final

## Core Principle

`Projected Payroll` y `Payroll official` deben compartir:

- motor de cálculo
- semántica de inputs
- forma de explicar breakdowns

Pero **no** deben compartir directamente:

- lifecycle transaccional
- tabla mutante final
- estados `draft/calculated/approved/exported`

Regla:

- misma lógica
- distinto contrato operativo

## Architecture Alignment

Referencias:

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-063-payroll-projected-payroll-runtime.md`
- `docs/tasks/in-progress/TASK-061-payroll-go-live-readiness-audit.md`

## Desired Product Behavior

### Caso 1 — RRHH revisa proyección hoy

- abre `Projected Payroll`
- valida montos por persona
- si está conforme, el sistema permite:
  - `Usar esta proyección para crear borrador oficial`
  - o `Recalcular período oficial con este corte`

### Caso 2 — RRHH revisa fin de mes

- usa `Projected Payroll` como simulador de cierre
- compara luego contra el cálculo oficial final
- puede ver:
  - diferencias por persona
  - diferencias por KPI/asistencia/UF/UTM/FX

## Scope

### In Scope

- definir contrato explícito de promoción desde projected a official
- capturar provenance de la proyección (`as_of_date`, inputs, fuentes)
- permitir promoción a `draft`/recalculo oficial con acción explícita
- exponer diff projected vs official
- documentar eventos reactivos y serving needed

### Out of Scope

- fusionar las tablas de projected y official
- permitir que la proyección escriba `payroll_entries` finales automáticamente sin confirmación
- eliminar el lifecycle actual de `payroll_periods`

## Proposed Model

### Projected snapshot

Debe congelar, al menos lógicamente:

- `member_id`
- `period_year`
- `period_month`
- `projection_mode` (`actual_to_date` | `projected_month_end`)
- `as_of_date`
- compensación usada
- asistencia usada
- KPI usados
- UF / UTM / FX usados
- gross/net/breakdown resultante

### Promotion action

Nueva operación explícita:

- `promoteProjectedPayrollToOfficialDraft(periodId, projectionId | projectionContext)`

Comportamiento:

- valida que el período oficial siga en estado compatible (`draft` o recalculable)
- recalcula `payroll_entries` oficiales usando el mismo motor y el mismo corte/inputs seleccionados
- registra audit trail del origen de promoción

### Variance view

Se debe poder comparar:

- projected actual-to-date
- projected month-end
- official calculated
- official approved/exported

## Dependencies & Impact

### Depende de

- `TASK-063` Projected Payroll Runtime
- `TASK-061` Payroll Go-Live Readiness Audit
- `TASK-058` Economic Indicators Runtime Layer
- serving confiable de KPI/attendance/compensation

### Impacta a

- `/hr/payroll/projected`
- `/hr/payroll`
- `payroll_periods`
- `payroll_entries`
- trazabilidad para Finance y Person Intelligence

### Archivos owned

- futuros endpoints de `projected payroll`
- `src/lib/payroll/project-payroll.ts`
- `src/lib/payroll/calculate-payroll.ts`
- mutaciones de `payroll_periods`
- docs de arquitectura payroll/projections si cambia el contrato

## Reactive Events

### Entrantes

- `compensation_version.created`
- `compensation_version.updated`
- `payroll_period.updated`
- `finance.economic_indicator.upserted`
- eventos de attendance / leave cuando afecten projected payroll
- `ico.materialization.completed`

### Salientes

- `projected_payroll.snapshot_materialized`
- `projected_payroll.promoted_to_official_draft`
- `payroll_period.recalculated_from_projection`

## Key Risks

- contaminar la semántica oficial con una proyección parcial
- permitir promoción sin provenance suficiente
- usar “lo que se ve en pantalla” como verdad sin garantizar reproducibilidad

## Recommended Guardrails

- la promoción debe ser una acción explícita y auditada
- el sistema debe mostrar el corte exacto usado
- si entre la proyección y la promoción cambian inputs clave, debe advertirse
- la oficial siempre debe seguir siendo recalculable desde inputs formales, no desde la UI renderizada

## Acceptance Criteria

- existe un contrato claro de promoción projected -> official draft
- projected y official usan el mismo motor canónico
- queda trazabilidad de origen de promoción
- se puede comparar projected vs official con diff entendible
- no se rompe el lifecycle actual de `Payroll official`

## Validation

- revisar diseño del flow con un período real
- simular una promoción desde `Projected Payroll`
- verificar que la oficial generada sea reproducible y auditada
- confirmar que un cambio posterior de inputs no reescriba silenciosamente la oficial

## Status

- `in-progress`

## Delta 2026-03-27

- Hallazgo de implementación:
  - `Projected Payroll` ya tiene projection reactiva y tabla serving `greenhouse_serving.projected_payroll_snapshots`; no conviene inventar otro snapshot store.
  - El endpoint actual `/api/hr/payroll/projected` recalcula en vivo y compara contra `greenhouse_hr.*`, lo que quedó desalineado con el runtime oficial `greenhouse_payroll.*`.
- Enfoque aplicado:
  - usar el snapshot/projection existente como base reproducible de promoción
  - introducir un registro auditable de promociones `projected -> official`
  - reutilizar el cálculo oficial sobre un contexto explícito de promoción, sin escribir entries finales desde la UI renderizada

## Delta 2026-03-27 18:10 -03

- Implementación aplicada:
  - nuevo servicio `promoteProjectedPayrollToOfficialDraft(...)` en `src/lib/payroll/promote-projected-payroll.ts`
  - nuevo store auditable `greenhouse_payroll.projected_payroll_promotions` en `src/lib/payroll/projected-payroll-promotion-store.ts`
  - nueva ruta `POST /api/hr/payroll/projected/promote`
  - `calculatePayroll(...)` ya acepta `projectionContext` para recalcular oficial con el mismo corte temporal (`mode`, `asOfDate`, `promotionId`)
  - `/api/hr/payroll/projected` ya compara contra `greenhouse_payroll.*` y expone `latestPromotion`
  - `ProjectedPayrollView` ya puede promover/recalcular oficial desde la UI
- Guardrail adicional:
  - al recalcular un período oficial ahora se eliminan `payroll_entries` stale cuyo `member_id` ya no pertenece al universo vigente del cálculo; se evita que la nómina oficial quede como acumulado accidental de recalculaciones previas.
- Migraciones/documentación:
  - nueva migration `scripts/migrations/add-projected-payroll-promotions.sql`
  - `scripts/setup-postgres-payroll.sql` actualizado para bootstrap del audit trail
- Validación:
  - `pnpm test src/lib/payroll/project-payroll.test.ts src/lib/payroll/promote-projected-payroll.test.ts`
  - `pnpm exec eslint ...` sobre los archivos tocados
  - `pnpm exec tsc --noEmit --pretty false`
