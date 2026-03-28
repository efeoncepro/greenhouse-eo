# TASK-091 - Greenhouse Operational Calendar Utility

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Status real: `Diseño`
- Rank: `6`
- Domain: `platform`
- GitHub Project: `Greenhouse Delivery`

## Summary

Extraer una utilidad canónica de calendario operativo para Greenhouse que permita calcular ventanas de cierre, mes operativo vigente y días hábiles de forma reutilizable entre Payroll y futuros dominios de cierre mensual.

## Why This Task Exists

Payroll necesita distinguir entre calendario civil y ciclo operativo real. Hoy esa lógica está embebida en helpers locales y/o vistas, lo que dificulta reutilizarla y hace más probable que aparezcan reglas divergentes entre módulos.

## Goal

- Definir una utilidad única para mes operativo y ventana de cierre.
- Hacer reusable el cálculo de días hábiles sin repetirlo en Payroll.
- Dejar la regla testeada y documentada como contrato de negocio.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

- la utilidad debe ser pura y testeable
- no debe depender de React ni de la UI
- no debe introducir feriados ni calendarios regionales si no están explicitados en el contrato
- si más adelante se incorporan feriados, deben entrar como extensión de esta misma utilidad, no como helper paralelo

## Dependencies & Impact

### Depends on

- ninguna task previa obligatoria
- puede nacer como utilidad base aislada

### Impacts to

- `TASK-092` - selector de período actual y cierre operativo de Payroll
- cualquier otro dominio que necesite decidir “mes operativo vigente” por ventana de cierre

### Files owned

- `src/lib/calendar/operational-calendar.ts`
- `src/lib/calendar/operational-calendar.test.ts`
- documentación canónica asociada si se decide formalizarla

## Current Repo State

### Ya existe

- `Payroll` ya tiene lógica temporal parcial para selección de período actual
- hay helpers de días hábiles en `fetch-attendance-for-period.ts`
- la arquitectura de Payroll ya declara ventana operativa de cierre

### Gap actual

- la lógica de ventana de cierre vive dispersa
- no existe una utilidad canónica compartida para calendario operativo
- Payroll no debería seguir creciendo con reglas temporales locales duplicadas

## Scope

### Slice 1 - Core utility

- `countBusinessDays(startDate, endDate)`
- `isWithinPayrollCloseWindow(referenceDate, closeWindowBusinessDays = 5)`
- `getOperationalPayrollMonth(referenceDate)`

### Slice 2 - Tests

- primeros 5 días hábiles del mes
- fin de semana
- cruce de mes
- enero hacia diciembre anterior
- caso fuera de ventana de cierre

### Slice 3 - Documentation

- documentar el contrato canónico en arquitectura si se aprueba como utilidad compartida

## Out of Scope

- feriados chilenos
- lógica de UI
- reglas específicas de selección de período en Payroll
- cambios de lifecycle de nómina

## Acceptance Criteria

- [ ] La utilidad expone funciones puras y reutilizables para ventana de cierre y mes operativo.
- [ ] La lógica queda testeada con casos de borde relevantes.
- [ ] Payroll puede consumir esta utilidad sin introducir reglas temporales duplicadas.
- [ ] La implementación no introduce dependencias de UI o frameworks.

## Verification

- `pnpm exec vitest run src/lib/calendar/operational-calendar.test.ts`
- `pnpm exec eslint src/lib/calendar/operational-calendar.ts src/lib/calendar/operational-calendar.test.ts`
- `pnpm build`
