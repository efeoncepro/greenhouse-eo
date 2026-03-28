# TASK-092 - Payroll Operational Current Period Semantics

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Implementado` |
| Rank | `7` |
| Domain | `ui` |
| GitHub Project | `Greenhouse Delivery` |

## Result

- El período actual se resuelve por mes operativo vigente usando la utility compartida de calendario operativo.
- `Historial` ya no cuenta `approved` como si fuera cierre final y ahora distingue `aprobado en cierre` de `cerrado/exportado`.
- Las cards KPI siguen leyendo del período activo, no del histórico seleccionado.
- El empty state mantiene la guía operativa cuando no hay período abierto vigente.

## Summary

Corregir la semántica de “Período actual” en Payroll para que dependa del ciclo operativo vigente y no de un criterio simple de “último no exportado”. Separar claramente el período activo del historial y alinear las cards superiores con el contexto correcto.

## Why This Task Exists

Hoy la vista de Payroll mezcla señales:
- `Historial` muestra períodos `approved` y `exported` juntos
- las cards superiores usan el contexto activo aunque el usuario esté navegando histórico
- el empty state sugiere un siguiente período aunque el período anterior aún esté en un estado intermedio

Eso genera una lectura ambigua del ciclo mensual, especialmente cuando existe un período aprobado que todavía no debería considerarse cerrado.

## Goal

- Definir “Período actual” como el ciclo operativo vigente dentro de la ventana de cierre.
- Hacer que `Historial` distinga entre `approved` pendiente de cierre y `exported` cerrado.
- Mantener las cards superiores siempre atadas al período activo, no al histórico seleccionado.
- Evitar que febrero aparezca como actual solo porque marzo ya está exportado o viceversa.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`

Reglas obligatorias:

- `approved` no debe contaminar el concepto de “cerrado”
- `exported` sigue siendo el cierre final canónico
- el período activo debe venir del ciclo operativo vigente, no de un simple “último no exportado”
- el historial no debe cambiar el modelo mental del período actual
- las cards KPI deben leer del período activo solamente

## Dependencies & Impact

### Depends on

- `TASK-091` - utilidad de calendario operativo para mes vigente y ventana de cierre

### Impacts to

- `/hr/payroll`
- `PayrollDashboard`
- `PayrollHistoryTab`
- `PayrollPeriodTab`
- `MyPayrollView`
- `People > Nómina`

### Files owned

- `src/views/greenhouse/payroll/PayrollDashboard.tsx`
- `src/views/greenhouse/payroll/PayrollHistoryTab.tsx`
- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx`
- `src/views/greenhouse/my/MyPayrollView.tsx`
- `src/views/greenhouse/people/tabs/PersonPayrollTab.tsx`
- tests de las vistas anteriores

## Current Repo State

### Ya existe

- selector helper de período actual
- separación parcial entre período actual e histórico en UI
- empty state operativo para cuando no hay período abierto
- cards KPI y tabs funcionales
- utilidad canónica de calendario operativo ya implementada y disponible para resolver el mes operativo vigente

### Gap actual

- la selección de período actual todavía depende de una semántica incompleta en el helper y debe leer la ventana operativa vigente
- `Historial` trata `approved` como si ya fuera cierre y además no lo distingue lo suficiente como estado en cierre
- las cards superiores pueden quedar inconsistentes con el contexto mostrado
- el empty state puede sugerir un período nuevo sin dejar claro si el período anterior realmente quedó cerrado

## Scope

### Slice 1 - Current period semantics

- usar el mes operativo vigente para determinar el período actual
- no retroceder a un período aprobado antiguo fuera de ventana de cierre
- no tomar “último no exportado” como regla única

### Slice 2 - History semantics

- distinguir visualmente `approved` pendiente de `exported`
- mantener el historial como navegación, no como contexto activo
- mostrar claramente qué está cerrado y qué solo está aprobado

### Slice 3 - KPI cards and empty states

- cards de arriba siempre desde el período activo
- empty state consistente cuando no hay período abierto vigente
- CTA de nuevo período alineado con la regla operativa

## Out of Scope

- cambios al motor de cálculo
- cambios de backend de exportación
- cambios en el lifecycle oficial de nómina
- rediseño visual completo del módulo

## Acceptance Criteria

- [ ] `Período actual` se determina por ciclo operativo vigente, no por “último no exportado”.
- [ ] `Historial` no presenta `approved` como si fuera cierre final.
- [ ] Las cards KPI de arriba reflejan solo el período activo.
- [ ] El empty state de Payroll deja de mezclar rezago histórico con período vigente.
- [ ] La navegación histórica no altera el contexto del período actual.

## Verification

- `pnpm exec vitest run src/views/greenhouse/payroll/current-payroll-period.test.ts src/views/greenhouse/payroll/PayrollPeriodTab.test.tsx`
- `pnpm exec eslint src/views/greenhouse/payroll/PayrollDashboard.tsx src/views/greenhouse/payroll/PayrollHistoryTab.tsx src/views/greenhouse/payroll/PayrollPeriodTab.tsx src/views/greenhouse/my/MyPayrollView.tsx src/views/greenhouse/people/tabs/PersonPayrollTab.tsx`
- `pnpm build`
- smoke manual en `/hr/payroll` con un caso donde exista un período `approved` y otro `exported`
