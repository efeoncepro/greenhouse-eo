# TASK-065 - Payroll Variable Bonus Policy Recalibration

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Implementación`
- Rank: `1`
- Domain: `hr`
- GitHub Project: `TBD`
- GitHub Issue: `TBD`

## Summary

Recalibrar la política de pago de bonos variables de `Payroll` para flexibilizar el incentivo vigente de `OTD` y `RpA` sin cambiar todavía el indicador fuente principal ni introducir un segundo motor de cálculo paralelo.

La lane cubre diseño de nueva policy de prorrateo, versionado de thresholds por vigencia, validación operativa con ejemplos reales y preparación para convivir o converger después con la propuesta legacy de `FTR`.

## Delta 2026-03-27

- Se implementó el cutover runtime del payout variable sin cambiar el indicador fuente (`ICO` sigue entregando `OTD` y `RpA`).
- La policy nueva quedó materializada así:
  - `OTD < 70` → `0`
  - `70 <= OTD < 89` → prorrateo lineal
  - `OTD >= 89` → `100%`
  - `RpA <= 1.7` → `100%`
  - `1.7 < RpA <= 2.0` → banda suave `100% -> 80%`
  - `2.0 < RpA < 3.0` → banda descendente `80% -> 0%`
  - `RpA >= 3.0` → `0`
- Se amplió `payroll_bonus_config` para soportar versionado explícito de la banda `RpA`:
  - `rpa_full_payout_threshold`
  - `rpa_soft_band_end`
  - `rpa_soft_band_floor_factor`
- Compatibilidad contemplada:
  - `Payroll` official
  - `Projected payroll`
  - `recalculate-entry`
  - exports CSV/PDF/Excel
  - explainability y tablas UI que consumen `bonus*_amount`, `qualifies` y `bonus*_proration_factor`
- Se mantuvo compatibilidad hacia atrás para configs antiguas:
  - el runtime normaliza defaults si faltan columnas nuevas
  - BigQuery fallback agrega columnas faltantes y rellena defaults

## Why This Task Exists

La política actual de bonos variables en `Payroll` es funcional, pero castiga más de lo deseado:

- `OTD` paga 100% recién desde `94%`
- `RpA` usa un prorrateo inverso lineal hasta `3.0`, lo que reduce fuerte el bono incluso para rangos que negocio considera aceptables

La necesidad operativa actual es flexibilizar el pago para que el equipo pueda cobrar “un poco más” manteniendo lógica de desempeño defendible, especialmente en la nómina de cierre inmediato.

El cambio no es equivalente a la lane legacy de `FTR`:

- hoy el runtime real ya calcula y paga con `OTD + RpA`
- la necesidad inmediata es recalibrar esa policy
- la sustitución o convivencia con `FTR` es una discusión posterior de producto/incentivos

## Goal

- Definir una nueva política de payout para `OTD` y `RpA` que sea más generosa pero siga siendo explicable
- Versionar esa policy para que aplique por vigencia y no requiera hardcodes permanentes
- Dejar explícita la relación con `TASK-025` (`FTR`) para evitar implementar dos direcciones incompatibles en paralelo

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

Reglas obligatorias:

- `Payroll` sigue consumiendo KPI canónicos desde `ICO`; no debe redefinir `OTD`, `RpA` o `FTR` localmente
- la recalibración de payout debe vivir como policy de nómina, no como cambio de fórmula del indicador operativo
- no mezclar en esta lane un reemplazo total `RpA -> FTR` sin una decisión explícita de producto y migración compatible

## Dependencies & Impact

### Depends on

- `TASK-061` Payroll Go-Live Readiness Audit
- `TASK-064` ICO Assignee Attribution Remediation
- `greenhouse_payroll.payroll_bonus_config`
- `src/lib/payroll/bonus-proration.ts`
- `src/lib/payroll/calculate-payroll.ts`

### Impacts to

- `TASK-025` HR Payroll Module delta FTR
- `TASK-063` Payroll Projected Payroll Runtime
- `Payroll` official
- `Projected payroll`
- exports y recibos de nómina

### Files owned

- `src/lib/payroll/bonus-proration.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/recalculate-entry.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/views/greenhouse/payroll/**`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/TASK-025-hr-payroll-module-delta-ftr.md`

## Current Repo State

### Ya existe

- `OTD` se paga con prorrateo lineal entre `otdFloor` y `otdThreshold`
- `RpA` se paga con prorrateo inverso lineal hasta `rpaThreshold`
- thresholds globales versionables desde `payroll_bonus_config`
- `Payroll` oficial y proyectado ya consumen esos thresholds

### Gap actual

- la policy vigente no refleja la intención actual de negocio de flexibilizar payout
- no existe aún una banda de pago más amable para `RpA` entre `1.7` y `2.0`
- no está resuelta la convivencia conceptual entre recalibrar `RpA` y eventualmente migrar a `FTR`

## Scope

### Slice 1 - Policy Design

- definir policy nueva de `OTD`
  - `OTD < 70` → `0`
  - `70 <= OTD < 89` → prorrateo lineal
  - `OTD >= 89` → `100%`
- definir policy nueva de `RpA`
  - `RpA <= 1.7` → `100%`
  - `1.7 < RpA <= 2.0` → banda alta prorrateada
  - `2.0 < RpA < 3.0` → banda media prorrateada
  - `RpA >= 3.0` → `0`
- documentar ejemplos de payout por moneda y por monto de bono

### Slice 2 - Config Model

- decidir si la nueva policy cabe en `payroll_bonus_config` actual o si requiere ampliar schema
- evaluar campos adicionales, por ejemplo:
  - `rpa_full_payout_threshold`
  - `rpa_soft_band_end`
  - `rpa_soft_band_floor_factor`
  - `otd_full_payout_threshold`
- mantener versionado por `effective_from`

### Slice 3 - Runtime Cutover

- implementar nueva policy en el motor canónico de payout
- asegurar consistencia entre:
  - cálculo oficial
  - projected payroll
  - recálculo manual por entry
- agregar tests unitarios de bordes y ejemplos de negocio

### Slice 4 - FTR Relationship Decision

- contrastar formalmente esta lane con `TASK-025`
- decidir una de estas salidas:
  - `RpA` sigue vigente y `FTR` queda como follow-up opcional
  - `FTR` reemplaza a `RpA` en una futura lane y esta recalibración actúa como transición temporal
  - `FTR` entra como incentivo adicional, pero no en esta task

## Out of Scope

- cambiar la fórmula canónica de `OTD`, `RpA` o `FTR` dentro de `ICO`
- introducir `FTR` en runtime de nómina en esta misma lane
- rediseñar toda la UI de compensaciones o projected payroll más allá de lo necesario para explicar la nueva policy

## Relationship to TASK-025

`TASK-025` propone reemplazar completamente el bono `RpA` por `FTR`.

Relación con esta task:

- `TASK-065` no contradice la posibilidad futura de `FTR`, pero sí la posterga
- `TASK-065` resuelve una necesidad inmediata de payout usando el runtime real vigente (`OTD + RpA`)
- `TASK-025` pasa a leerse como una alternativa estratégica de producto, no como el siguiente paso automático de implementación

Interpretación recomendada:

- corto plazo: recalibrar `OTD + RpA`
- mediano plazo: decidir si `FTR` reemplaza, complementa o no entra a payroll

## Acceptance Criteria

- [x] existe una policy nueva documentada para `OTD` con full payout desde `89%`
- [x] existe una policy nueva documentada para `RpA` con banda explícita entre `1.7` y `2.0`
- [x] la task deja definido si la configuración actual soporta el cambio o si requiere ampliar `payroll_bonus_config`
- [x] queda documentada la relación y no-equivalencia con `TASK-025`
- [x] se listan ejemplos concretos de payout para al menos un bono en `USD` y uno en `CLP`

## Verification

- revisión documental de policy con negocio
- contraste contra ejemplos reales de nómina proyectada
- validación ejecutada:
  - `pnpm test src/lib/payroll/bonus-proration.test.ts src/lib/payroll/compensation-bonus-flow.test.ts src/lib/payroll/project-payroll.test.ts src/lib/payroll/export-payroll.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
- pendiente de cierre:
  - `pnpm exec eslint ...`
  - validación manual en `/hr/payroll` y `/hr/payroll/projected`

## Follow-ups

- actualizar `TASK-025` según la decisión final sobre `FTR`
- si se aprueba implementación, abrir slice runtime desde esta misma task o una task derivada de ejecución
