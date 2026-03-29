# TASK-089 - Payroll UX Semantics and Feedback Hardening

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Complete`
- Rank: `5`
- Domain: `ui`
- GitHub Project: `Greenhouse Delivery`

## Summary

Endurecer la UX del módulo Payroll para que la separación entre período actual, historial, proyección, descargas y errores sea explícita, consistente y accesible.

La task agrupa los gaps de feedback, copy, affordance y jerarquía detectados en HR, My Payroll y People.

## Why This Task Exists

La auditoría mostró que hoy la interfaz funciona, pero mezcla estados semánticamente distintos y oculta fallos operativos detrás de vacíos genéricos.

Además, la descarga de documentos y la interacción por filas/iconos todavía dependen demasiado de affordances implícitas, lo que complica el uso en teclado, móvil y soporte.

## Goal

- Separar visualmente período abierto, histórico seleccionado y proyección.
- Hacer visibles los estados de error, retry y carga en todas las superficies Payroll.
- Unificar copy y affordances de descarga, detalle y navegación.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`

Reglas obligatorias:

- la UI debe reflejar la semántica canónica del lifecycle, no inventar una propia
- los estados vacíos no deben esconder errores de red o backend
- las acciones críticas deben tener feedback visible y accesibilidad explícita

## Dependencies & Impact

### Depends on

- `TASK-086` - selector de período actual y descarga de recibos ya están estabilizados
- `TASK-087` - la UX de aprobación y edición debe reflejar la semántica de negocio
- `TASK-088` - proyectado y receipts delivery dependen de la semántica reactiva

### Impacts to

- `/hr/payroll`
- `/hr/payroll/projected`
- `/my/payroll`
- `/people/[memberId]?tab=payroll`

### Files owned

- `src/views/greenhouse/payroll/PayrollDashboard.tsx`
- `src/views/greenhouse/payroll/PayrollHistoryTab.tsx`
- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx`
- `src/views/greenhouse/payroll/PayrollEntryTable.tsx`
- `src/views/greenhouse/payroll/PayrollReceiptDialog.tsx`
- `src/views/greenhouse/payroll/PayrollReceiptCard.tsx`
- `src/views/greenhouse/payroll/ProjectedPayrollView.tsx`
- `src/views/greenhouse/payroll/PayrollPersonnelExpenseTab.tsx`
- `src/views/greenhouse/my/MyPayrollView.tsx`
- `src/views/greenhouse/people/tabs/PersonPayrollTab.tsx`
- tests de las vistas anteriores

## Current Repo State

### Ya existe

- vistas oficiales de Payroll, Mi Nómina, Personas y Nómina Proyectada
- descarga de recibos PDF con helper dedicado
- empty state operativo para período abierto
- tablas y drawers funcionales

### Coverage resuelta

- `Período actual` ahora se mantiene separado del historial seleccionado
- los fallos de carga muestran error visible con retry en las vistas críticas
- descarga/exportación expone feedback visible y labels accesibles consistentes
- los icon buttons y row clicks críticos tienen affordance explícita
- `Mi Nómina` y `People > Nómina` ya no dependen de un orden implícito del API para definir el último período

## Scope

### Slice 1 - Semantic separation

- separar período abierto, histórico y proyectado con jerarquía visual clara
- evitar que un click en historial cambie el modelo mental del período actual

### Slice 2 - Feedback and states

- mostrar errores, retry y estados vacíos de forma inequívoca
- dar feedback visible a descargas y exportes
- evitar que `console.error` sea la única señal de fallo

### Slice 3 - Affordance and accessibility

- unificar copy de botones y labels de descarga
- agregar `aria-label` o equivalentes a icon buttons críticos
- hacer explícitas las interacciones de filas que abren detalle

## Out of Scope

- rediseño visual completo del portal
- cambios en el motor de cálculo
- cambios estructurales de backend sin impacto de UX

## Acceptance Criteria

- [x] El dashboard no muestra un período histórico como si fuera el actual.
- [x] Las vistas críticas muestran error y retry cuando falla la carga.
- [x] Los CTAs de descarga usan copy consistente y feedback visible.
- [x] Las interacciones por teclado y lector de pantalla quedan razonablemente cubiertas.

## Verification

- `pnpm exec vitest run src/views/greenhouse/payroll/PayrollPeriodTab.test.tsx`
- `pnpm exec eslint src/views/greenhouse/payroll/PayrollDashboard.tsx src/views/greenhouse/payroll/PayrollPeriodTab.tsx src/views/greenhouse/payroll/PayrollEntryTable.tsx src/views/greenhouse/payroll/PayrollHistoryTab.tsx src/views/greenhouse/payroll/PayrollPersonnelExpenseTab.tsx src/views/greenhouse/payroll/PayrollReceiptDialog.tsx src/views/greenhouse/payroll/ProjectedPayrollView.tsx src/views/greenhouse/my/MyPayrollView.tsx src/views/greenhouse/people/tabs/PersonPayrollTab.tsx src/views/greenhouse/payroll/PayrollPeriodTab.test.tsx`
- `pnpm build`
- validación manual recomendada en HR, Mi Nómina y People
