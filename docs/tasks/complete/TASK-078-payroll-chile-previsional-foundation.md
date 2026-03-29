# Delta 2026-03-28
- El código de Payroll Chile ya referencia `gratificacion_legal_mode`, `colacion_amount`, `movilizacion_amount`, `afp_cotizacion_rate` y `afp_comision_rate`.
- El vacío de `Payroll Proyectada` en `dev-greenhouse` no era solo un tema de schema: el route principal estaba protegido con `requireAdminTenantContext`, mientras el resto del módulo Payroll opera con `requireHrTenantContext`.
- La causa operativa quedó doblemente alineada: la BD sí tiene compensaciones activas para marzo 2026, pero además el core de Payroll no debe depender de `greenhouse_payroll.payroll_receipts` para leer la proyección. La readiness de schema ahora se separa entre core payroll y receipts payroll.

# TASK-078 - Payroll Chile: Previsional Foundation & Forward Cutover

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P0` |
| Impact | `Muy alto` |
| Effort | `Alto` |
| Status real | `Cerrada` |
| Rank | 1 de 4 (cadena histórica; cerrada) |
| Domain | HR Payroll |

## Summary

Construir la base previsional canónica de Payroll Chile para dejar de depender de inputs manuales en AFP, IMM, cesantía, topes y tabla tributaria. Esta task sincroniza los indicadores previsionales mensuales, canoniza los helpers previsionales y corta el motor forward a datos synced, para que la nómina legal posterior pueda calcularse sobre una base confiable.

## Why This Task Exists

Hoy Greenhouse sigue pidiendo parte del contexto previsional a mano:

- `afpRate` se ingresa o persiste como parte de la compensación
- `unemploymentRate` sigue derivándose localmente
- IMM no existe como indicador canónico
- el motor forward de Chile depende de combinaciones híbridas de inputs persistidos + defaults

Eso obliga a RRHH a consultar Previred y a mantener conocimiento regulatorio fuera del sistema. La base previsional debe vivir en el runtime, versionada por período y accesible para el motor forward, projected payroll y los módulos downstream.

## Goal

- Sincronizar indicadores previsionales mensuales desde una fuente canónica externa o equivalente.
- Persistir tasas, topes e indicadores del período en tablas dedicadas.
- Exponer helpers previsionales reutilizables por nómina oficial, proyectada y costos.
- Cortar el motor forward de Chile para que use la base synced y no defaults manuales.

## Execution Order

Esta task es la **primera** de una cadena operativa de 4:

```text
TASK-078 (esta) -> TASK-076 -> TASK-077
                  -> TASK-079
```

Razón:
- `TASK-076` necesita IMM, tasas AFP, cesantía, SIS y tabla tributaria canónica para paridad legal.
- `TASK-077` necesita los campos legales completos que produce `TASK-076`.
- `TASK-079` necesita esta base previsional para resolver líquidos deseados y construir el reverse engine con inputs reales.

## Architecture Alignment

- Fuente canónica: `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- Motor de cálculo actual: `src/lib/payroll/calculate-chile-deductions.ts`
- Impuesto actual: `src/lib/payroll/compute-chile-tax.ts`
- Indicadores económicos existentes: `src/lib/finance/economic-indicators.ts`
- Proyecciones consumidoras: `src/lib/payroll/project-payroll.ts`, `src/lib/sync/projections/projected-payroll.ts`

Reglas obligatorias:

- no duplicar fuentes de verdad previsional
- no introducir tablas hardcodeadas paralelas si ya existe una tabla canónica para el mismo concepto
- el forward engine debe seguir siendo el motor base para official y projected payroll
- cualquier cambio de tasa o tope debe quedar versionado por período

## Dependencies & Impact

### Depends on

- `TASK-058` Economic Indicators Runtime Layer para UF/UTM e histórico económico
- contrato vigente de `calculatePayroll()` y `buildPayrollEntry()`
- runtime PostgreSQL de payroll

### Impacts to

- `TASK-076` Payroll Chile: paridad con liquidación legal
- `TASK-077` Payroll receipt generation & delivery
- `TASK-079` Payroll Chile reverse calculation engine
- `member_capacity_economics`
- `person_intelligence`
- `client_economics`
- `projected_payroll`

### Files owned

- `src/lib/payroll/chile-previsional-helpers.ts` (nuevo)
- `src/lib/payroll/previred-sync.ts` (nuevo)
- `src/lib/payroll/calculate-chile-deductions.ts`
- `src/lib/payroll/compute-chile-tax.ts`
- `src/lib/payroll/schema.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/sync/projections/projected-payroll.ts`
- `src/lib/sync/projections/member-capacity-economics.ts`
- `src/app/api/cron/sync-previred/route.ts` (nuevo)
- `scripts/setup-postgres-payroll.sql`
- `scripts/migrations/add-previred-tables.sql`
- `docs/tasks/to-do/TASK-076-payroll-chile-liquidacion-parity.md`
- `docs/tasks/in-progress/TASK-077-payroll-receipt-generation-delivery.md`

## Current Repo State

### Ya existe

- `calculate-chile-deductions.ts` calcula bruto, imponible, AFP, salud, cesantía y neto.
- `compute-chile-tax.ts` ya lee una tabla persistida de impuesto.
- `UF` y `UTM` ya existen como indicadores económicos canónicos.
- `CompensationDrawer` y el store de compensación todavía exponen AFP/tasa AFP/cesantía de forma manual.

### Gap actual

- no existe un indicador canónico para `IMM`
- ya no existe un sync manual para AFP/topes/SIS: quedó materializado desde la API pública de Gael Cloud
- el forward engine sigue dependiendo de defaults o inputs manuales solo cuando no hay snapshot synced para el período
- `member_capacity_economics` no refleja todavía el costo empleador real de Chile

## Scope

### Slice 1 - Sync previsional mensual

- obtener indicadores previsionales mensuales desde fuente canónica externa o equivalente
- persistir `IMM`, topes imponibles, cesantía, SIS y tasas AFP por período
- emitir evento outbox de sync exitoso

### Slice 2 - Helpers previsionales canónicos

- `getImmForPeriod(year, month)`
- `getAfpRateForCode(afpCode, year, month)`
- `getSisRate(year, month)`
- `getTopeAfpForPeriod(year, month)`
- `getTopeCesantiaForPeriod(year, month)`
- `computeTaxFromBrackets(taxableBase, brackets)`

### Slice 3 - Forward cutover

- `calculate-chile-deductions.ts` deja de depender de valores manuales cuando existe fuente synced
- `compute-chile-tax.ts` usa la tabla canónica del período
- `project-payroll.ts` reutiliza los mismos helpers

### Slice 4 - Wiring reactivo

- `projected_payroll` refresca cuando cambian indicadores previsionales del período
- `member_capacity_economics` absorbe los costos empleador necesarios para loaded cost real

## Out of Scope

- reverse payroll / líquido deseado
- liquidación legal completa en UI
- PDF de recibos
- multi-RUT / multi-company payroll

## Acceptance Criteria

- [x] `IMM` existe como indicador canónico por período
- [x] tasas AFP, topes y cesantía se resuelven por período desde fuente synced
- [x] `calculate-chile-deductions.ts` deja de depender de defaults manuales para el contexto previsional que ya exista
- [x] `project-payroll.ts` usa el mismo contexto previsional que official payroll
- [x] `member_capacity_economics` puede recibir costos empleador reales de Chile
- [x] tests cubren sync y lectura de helpers previsionales

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test src/lib/payroll`
- `pnpm exec eslint src/lib/payroll/chile-previsional-helpers.ts src/lib/payroll/previred-sync.ts src/lib/payroll/calculate-chile-deductions.ts src/lib/payroll/compute-chile-tax.ts`
- validación manual de un período Chile real con indicadores synced

## Delta 2026-03-27

- Esta task fue re-scoped desde una lane más grande que mezclaba foundation previsional con reverse payroll.
- El reverse engine pasó a [`TASK-079`](TASK-079-payroll-chile-reverse-calculation-engine.md).
- La intención quedó más limpia:
  - `TASK-078` = foundation previsional + forward cutover
  - `TASK-076` = paridad legal/liquidación
  - `TASK-077` = recibos
  - `TASK-079` = reverse payroll / líquido deseado
- Se materializó el slice de foundation previsional en runtime:
  - helper canónico `src/lib/payroll/chile-previsional-helpers.ts`
  - tablas `greenhouse_payroll.chile_previred_indicators` y `greenhouse_payroll.chile_afp_rates`
  - migración `scripts/migrations/add-chile-previsional-foundation.sql` ejecutada con éxito
  - `calculate-chile-deductions.ts`, `calculate-payroll.ts`, `project-payroll.ts` y `recalculate-entry.ts` consumen la base previsional por período con helpers async
- El sync externo mensual y el cron asociado quedaron implementados en la primera versión de esta lane; la deuda restante es endurecer el esquema y seguir el cutover del forward engine en tareas posteriores.
- Las tablas quedaron accesibles para `greenhouse_runtime` y ya fueron backfilleadas con los períodos históricos disponibles desde Gael.

## Delta 2026-03-27 - Gael sync completed

- La fuente canónica explícita quedó alineada con la API pública de Gael Cloud:
  - `GET /general/public/previred/{periodo}` para indicadores previsionales mensuales
  - `GET /general/public/impunico/{periodo}` para tabla de impuesto único
- Se implementó el sync mensual canónico en `src/lib/payroll/previred-sync.ts`, con cron `src/app/api/cron/sync-previred/route.ts` y backfill `scripts/backfill-chile-previsional.ts`.
- El parser de `ImpUnico` quedó corregido para convertir los tramos de CLP a UTM usando la UTM del mismo período, evitando overflow en `greenhouse_payroll.chile_tax_brackets`.
- El backfill histórico `2026-01 -> 2026-03` quedó ejecutado y validado con resultados:
  - `chile_previred_indicators`: `3` filas
  - `chile_afp_rates`: `21` filas
  - `chile_tax_brackets`: `32` filas
- `calculate-chile-deductions.ts`, `calculate-payroll.ts`, `project-payroll.ts` y `recalculate-entry.ts` continúan consumiendo la base previsional canónica por período.

## Delta 2026-03-28 - Task closed

- La base previsional canónica y el forward cutover quedaron completamente implementados y verificados en runtime.
- `TASK-078` se formaliza como `complete`; el siguiente foco operativo de la cadena de Payroll Chile queda en `TASK-077`.
- No quedan gaps abiertos conocidos para esta lane en el repo actual.
