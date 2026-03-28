# TASK-079 - Payroll Chile: Reverse Calculation Engine

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P0` |
| Impact | `Muy alto` |
| Effort | `Alto` |
| Status real | `Diseño` |
| Rank | 4 de 4 (después de TASK-078, TASK-076 y TASK-077) |
| Domain | HR Payroll |

## Summary

Implementar el motor de cálculo inverso de nómina chilena para que, dado un líquido deseado, el sistema resuelva la renta bruta, gratificación legal, base imponible, AFP, salud, cesantía, impuesto y costo empleador. Esta task usa la base previsional que deja lista `TASK-078` y el modelo legal que completa `TASK-076`.

## Why This Task Exists

El flujo operativo real de RRHH es:

1. “Esta persona debe recibir `$595,656` líquidos al mes”
2. El sistema calcula todo lo demás

Hoy Greenhouse todavía está centrado en el ingreso de renta bruta y parámetros previsionales manuales. El reverse engine elimina ese trabajo externo y convierte la alta/edición de compensación en una experiencia mucho más natural para Chile.

## Goal

- Permitir que RRHH ingrese un líquido deseado como punto de partida.
- Resolver automáticamente la renta bruta y el resto de componentes de cálculo.
- Mostrar un preview reproducible del cálculo inverso con tolerancia de `±$1 CLP`.
- Reusar el motor forward real para validar la solución encontrada.

## Architecture Alignment

- Fuente canónica: `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- Base previsional: `TASK-078`
- Modelo legal chileno: `TASK-076`
- Motor forward actual: `src/lib/payroll/calculate-chile-deductions.ts`
- Impuesto actual: `src/lib/payroll/compute-chile-tax.ts`

Reglas obligatorias:

- el reverse debe ser un wrapper por encima del forward engine, no una lógica paralela
- no duplicar tasas ni tablas tributarias
- el resultado debe poder reproducirse con los mismos insumos forward
- el preview de compensación debe conservar trazabilidad de inputs y outputs

## Dependencies & Impact

### Depends on

- `TASK-078` Payroll Chile: Previsional Foundation & Forward Cutover
- `TASK-076` Payroll Chile: Paridad con Liquidación Legal
- modelo de compensación vigente
- helpers previsionales canónicos

### Impacts to

- `src/views/greenhouse/payroll/CompensationDrawer.tsx`
- `src/lib/payroll/reverse-payroll.ts` (nuevo)
- `src/lib/payroll/get-compensation.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/project-payroll.ts` si se decide mostrar preview de reverse en projected payroll
- flujo de alta/edición de compensación Chile

### Files owned

- `src/lib/payroll/reverse-payroll.ts` (nuevo)
- `src/lib/payroll/reverse-payroll.test.ts` (nuevo)
- `src/views/greenhouse/payroll/CompensationDrawer.tsx`
- `src/app/api/hr/payroll/compensation/route.ts`
- `src/app/api/hr/payroll/compensation/[versionId]/route.ts`
- `src/types/payroll.ts` si hace falta un payload de preview
- `docs/tasks/to-do/TASK-076-payroll-chile-liquidacion-parity.md`
- `docs/tasks/to-do/TASK-077-payroll-receipt-generation-delivery.md`

## Current Repo State

### Ya existe

- el motor forward Chile calcula bruto, imponible, descuentos y neto
- la UI de compensación ya captura régimen, AFP, salud, contrato y APV
- `projected payroll` ya permite preview por período, pero no reverse quote por líquido deseado

### Gap actual

- no hay función canónica `gross from net`
- no existe preview de nómina basado en líquido deseado
- el usuario sigue pensando primero en bruto, no en líquido contractual
- no hay feedback de convergencia ni de sensibilidad por tramo

## Scope

### Slice 1 - Motor reverse puro

- `computeGrossFromNet(...)`
- iteración por convergencia o resolución directa según el caso
- soporte para:
  - Fonasa
  - Isapre
  - indefinido / plazo fijo
  - gratificación legal
  - colación / movilización
  - APV

### Slice 2 - Preview en compensación

- permitir que la UI de compensación reciba un líquido objetivo
- mostrar preview de:
  - renta bruta
  - gratificación
  - descuentos
  - costo empleador
  - líquido calculado

### Slice 3 - Paridad y validación

- golden tests con casos reales de Chile
- tolerancia de `±$1 CLP`
- cobertura para:
  - Fonasa
  - Isapre
  - tramo tributario bajo y alto
  - con/sin gratificación
  - con APV

## Out of Scope

- sync previsional mensual
- tabla tributaria canónica
- cambios estructurales de indicadores
- liquidación legal completa en PDF

## Acceptance Criteria

- [ ] `computeGrossFromNet()` converge para casos base en menos de 50 iteraciones
- [ ] el resultado del reverse reproduce el líquido deseado con tolerancia de `±$1 CLP`
- [ ] la UI de compensación puede mostrar un preview por líquido deseado
- [ ] tests cubren Fonasa, Isapre, APV, gratificación y tramos tributarios

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test src/lib/payroll/reverse-payroll.test.ts`
- `pnpm exec eslint src/lib/payroll/reverse-payroll.ts src/lib/payroll/reverse-payroll.test.ts src/views/greenhouse/payroll/CompensationDrawer.tsx`
- validación manual con un caso real de liquidación

## Delta 2026-03-27

- Esta task fue separada desde `TASK-078` para evitar mezclar foundation previsional con reverse calculation.
- El reverse engine ahora queda explícitamente como el cuarto bloque conceptual de la lane de Payroll Chile, con dependencias claras sobre `TASK-078`, `TASK-076` y `TASK-077`.
