# TASK-062 - Payroll Recurring Fixed Bonus Support

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Completa`
- Rank: `2`
- Domain: `hr`
- GitHub Project: `Greenhouse Delivery`

## Summary

Extender `Payroll` para soportar un bono fijo recurrente canónico dentro de la compensación versionada, de modo que el cálculo mensual no dependa de `bonusOtherAmount` manual cuando existe una remuneración fija adicional al salario base y a conectividad.

## Why This Task Exists

La auditoría de go-live de `Payroll` confirmó que hoy el cálculo sí considera `baseSalary`, `remoteAllowance` y bonos variables, pero no modela todavía un bono fijo recurrente genérico adicional.

Eso deja un gap operativo para nóminas reales donde un colaborador recibe un componente fijo mensual extra que debe entrar automáticamente al cálculo y quedar auditado en la snapshot.

## Goal

- Agregar un bono fijo recurrente al modelo de compensación versionada
- Incluirlo en el cálculo, snapshot, exports y superficies operativas de `Payroll`
- Mantener el cambio pequeño, reversible y compatible con el go-live inmediato

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:

- `Payroll` sigue siendo `Postgres-first`
- el bono fijo recurrente vive en `compensation_versions` y se congela en `payroll_entries`
- no se introduce todavía una subtabla de múltiples bonos fijos si el objetivo inmediato se cubre con una extensión mínima del contrato actual

## Dependencies & Impact

### Depends on

- `docs/tasks/in-progress/TASK-061-payroll-go-live-readiness-audit.md`
- `src/lib/payroll/*`
- `src/views/greenhouse/payroll/*`

### Impacts to

- `HR > Payroll > Compensaciones`
- cálculo mensual de nómina
- exports `CSV`, `PDF`, `Excel`
- historial y recibos por colaborador

### Files owned

- `src/types/payroll.ts`
- `src/lib/payroll/*`
- `src/views/greenhouse/payroll/*`
- `scripts/setup-postgres-payroll.sql`
- `src/lib/payroll/schema.ts`

## Current Repo State

### Ya existe

- salario base
- bono conectividad (`remoteAllowance`)
- bonos variables `OTD` y `RpA`
- bono adicional manual por entry (`bonusOtherAmount`)

### Gap actual

- no existe un bono fijo recurrente genérico adicional en `compensation_versions`
- ese concepto no entra automáticamente al cálculo mensual

## Scope

### Slice 1 - Modelo y persistencia

- agregar `fixedBonusAmount` y `fixedBonusLabel` al contrato de compensación
- snapshotear esos campos en `payroll_entries`

### Slice 2 - Cálculo y exports

- incluir el bono fijo recurrente en `grossTotal` y `netTotal`
- reflejarlo en exports y recibos

### Slice 3 - UI y tests

- permitir editarlo desde `CompensationDrawer`
- mostrarlo en tablas de compensación e historial relevante
- agregar tests unitarios/regresión

## Out of Scope

- subtabla de múltiples bonos fijos por colaborador
- motor de conceptos de haberes arbitrarios

## Acceptance Criteria

- [x] `CompensationVersion` soporta un bono fijo recurrente con monto y label opcional
- [x] `Payroll` lo incorpora automáticamente al cálculo mensual
- [x] la snapshot de `payroll_entry` preserva ese bono fijo
- [x] exports y superficies principales lo muestran de forma consistente
- [x] tests cubren el nuevo componente del cálculo

## Findings 2026-03-27

- El módulo ya tenía dos conceptos recurrentes implícitos (`baseSalary`, `remoteAllowance`), pero no un tercer haber fijo genérico canónico.
- Operativamente eso obligaba a usar `bonusOtherAmount` manual por entry para algo que en realidad pertenece a la compensación versionada.
- Si el haber fijo no vive en `compensation_versions`, se pierde trazabilidad histórica y además no puede prorratearse de forma consistente por inasistencia/licencia no remunerada.
- El punto más riesgoso no era solo el cálculo bruto, sino la coherencia entre snapshot, exports, explainability y recibos.

## Solution Applied 2026-03-27

- Se extendió el contrato de compensación con `fixedBonusLabel` y `fixedBonusAmount`.
- El bono fijo se snapshotea en `payroll_entries`, incluyendo `adjustedFixedBonusAmount` cuando aplica prorrateo por asistencia.
- El cálculo mensual lo trata como haber recurrente imponible:
  - entra al `grossTotal`
  - entra al imponible Chile
  - participa del `netTotalCalculated`
- Las superficies operativas quedaron alineadas:
  - `CompensationDrawer`
  - tabla de compensaciones
  - tabla de entries de nómina
  - explain dialog
  - receipt card/PDF
  - exports `CSV` y `Excel`
  - historial por colaborador

## Data / Runtime Notes

- PostgreSQL:
  - `greenhouse_payroll.compensation_versions` agrega `fixed_bonus_label`, `fixed_bonus_amount`
  - `greenhouse_payroll.payroll_entries` agrega `fixed_bonus_label`, `fixed_bonus_amount`, `adjusted_fixed_bonus_amount`
- BigQuery compatibility:
  - se alineó `schema.ts`
  - se actualizó el path `persist-entry` y `get-payroll-entries`
- Se agregó migration aditiva:
  - `scripts/migrations/add-payroll-fixed-bonus-columns.sql`

## Verification

- `pnpm exec eslint src/lib/payroll src/views/greenhouse/payroll src/types/payroll.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test src/lib/payroll src/views/greenhouse/payroll`

## Verification Notes 2026-03-27

- `pnpm test src/lib/payroll src/views/greenhouse/payroll` -> `16/16` files, `80/80` tests passing
- `pnpm test src/lib/payroll/calculate-chile-deductions.test.ts src/lib/payroll/export-payroll.test.ts src/lib/payroll/payroll-entry-explain.test.ts src/views/greenhouse/payroll/CompensationDrawer.test.tsx src/views/greenhouse/payroll/PayrollEntryExplainDialog.test.tsx src/views/greenhouse/payroll/helpers.test.ts` -> `6/6` files, `11/11` tests passing
- `pnpm exec eslint ...` sobre los archivos tocados -> pasando
- `git diff --check` -> limpio
- `pnpm exec tsc --noEmit --pretty false` quedó bloqueado por errores JSX preexistentes/fuera de esta lane en `src/views/agency/AgencyTeamView.tsx`
