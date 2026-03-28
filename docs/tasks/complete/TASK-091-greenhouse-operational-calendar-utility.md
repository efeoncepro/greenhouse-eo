# TASK-091 - Greenhouse Operational Calendar Utility

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Bajo` |
| Status real | `Implementado` |
| Rank | `6` |
| Domain | `platform` |
| GitHub Project | `Greenhouse Delivery` |

## Summary

Extraer una utilidad canónica de calendario operativo para Greenhouse que permita calcular ventanas de cierre, mes operativo vigente y días hábiles de forma reutilizable entre Payroll y futuros dominios de cierre mensual. La utilidad debe ser timezone-aware y admitir contexto por jurisdicción, porque la casa matriz opera en Santiago y el grupo puede tener colaboradores en distintos países.

## Result

- La utilidad quedó implementada en `src/lib/calendar/operational-calendar.ts`.
- La hidratación de feriados por país quedó implementada en `src/lib/calendar/nager-date-holidays.ts`.
- La solución es pura, timezone-aware y dependiente de policy explícita, no del timezone del servidor.
- La cobertura de tests valida business days, close window, rollover de mes, DST de Santiago y normalización de `Nager.Date`.

## Why This Task Exists

Payroll necesita distinguir entre calendario civil y ciclo operativo real. Hoy esa lógica está embebida en helpers locales y/o vistas, lo que dificulta reutilizarla y hace más probable que aparezcan reglas divergentes entre módulos.

## Goal

- Definir una utilidad única para mes operativo y ventana de cierre.
- Hacer reusable el cálculo de días hábiles sin repetirlo en Payroll.
- Dejar la regla testeada y documentada como contrato de negocio.
- Hacer explícito el contexto de `timezone`, `country/jurisdiction` y `holiday calendar`.
- Definir la fuente externa pública recomendada para feriados por país.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

- la utilidad debe ser pura y testeable
- no debe depender de React ni de la UI
- no debe depender del timezone del servidor
- no debe introducir feriados ni calendarios regionales implícitos: deben entrar por configuración explícita
- si más adelante se incorporan feriados, deben entrar como extensión de esta misma utilidad, no como helper paralelo
- la utilidad no publica outbox events ni mantiene projections propias; solo calcula reglas temporales de lectura
- la timezone canónica sigue resolviéndose con IANA; no se usa una API externa para el DST
- para feriados, la fuente pública recomendada es `Nager.Date` y cualquier override local debe persistirse en Greenhouse
- el endpoint de feriados recomendado es `GET https://date.nager.at/api/v3/PublicHolidays/{Year}/{CountryCode}`

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
- todavía no existe un contrato canónico de policy operativa persistida para timezone/jurisdicción/feriados

### Gap actual

- la lógica de ventana de cierre vive dispersa
- no existe una utilidad canónica compartida para calendario operativo
- Payroll no debería seguir creciendo con reglas temporales locales duplicadas
- el cierre mensual necesita distinguir entre fecha local de la casa matriz, país/jurisdicción y días hábiles efectivos
- la fuente de verdad de la policy no está documentada como contrato explícito
- no existe una decisión documentada sobre la fuente externa de feriados ni sobre cómo se sobreescriben excepciones corporativas

## Scope

### Slice 1 - Core utility

- `countBusinessDays(startDate, endDate, options)`
- `isWithinPayrollCloseWindow(referenceDate, closeWindowBusinessDays = 5, options)`
- `getOperationalPayrollMonth(referenceDate, options)`
- `resolveOperationalCalendarContext(tenant | payrollPolicy | fallback)`

### Slice 2 - Tests

- primeros 5 días hábiles del mes
- fin de semana
- cruce de mes
- enero hacia diciembre anterior
- caso fuera de ventana de cierre
- timezone con DST de Santiago
- jurisdicción con feriados explícitos
- país distinto al de residencia del colaborador no altera el ciclo si la nómina pertenece a otra jurisdicción

### Slice 3 - Documentation

- documentar el contrato canónico en arquitectura si se aprueba como utilidad compartida
- documentar la separación entre timezone operativo, jurisdicción y feriados
- documentar que la utilidad consume policy persistida y no expone API pública de cálculo
- documentar la decisión de usar IANA para timezone y `Nager.Date` para feriados

## Out of Scope

- lógica de UI
- reglas específicas de selección de período en Payroll
- cambios de lifecycle de nómina
- outbox events y projections
- motor de cálculo de nómina
- API pública de cálculo temporal

## Acceptance Criteria

- [ ] La utilidad expone funciones puras y reutilizables para ventana de cierre y mes operativo.
- [ ] La lógica queda testeada con casos de borde relevantes.
- [ ] Payroll puede consumir esta utilidad sin introducir reglas temporales duplicadas.
- [ ] La implementación no introduce dependencias de UI o frameworks.

## Verification

- `pnpm exec vitest run src/lib/calendar/operational-calendar.test.ts`
- `pnpm exec eslint src/lib/calendar/operational-calendar.ts src/lib/calendar/operational-calendar.test.ts`
- `pnpm build`
