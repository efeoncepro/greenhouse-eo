# TASK-054 — TanStack Migration: 4 High-Impact Tables

## Estado

Pendiente. Derivada de la sesión Claude Opus 2026-03-26 que migró 22 de 48 tablas.

## Context

Quedan 4 tablas de alto impacto que no se alcanzaron a migrar por complejidad y tamaño. Son las más usadas del portal después de las ya migradas.

## Files to Migrate

### 1. `src/views/greenhouse/hr-core/HrDepartmentsView.tsx` (348 lines)
- **Tipo:** List view con search + sort
- **Complejidad:** Media — departamentos con member count, head person link
- **Patrón:** search + sort + pagination

### 2. `src/views/greenhouse/hr-core/HrLeaveView.tsx` (730 lines)
- **Tipo:** List view con search + sort + pagination
- **Complejidad:** Alta — status chips, date formatting, approve/reject actions, multiple filters
- **Patrón:** search + sort + pagination. Ser quirúrgico — solo reemplazar la tabla

### 3. `src/views/greenhouse/finance/ReconciliationDetailView.tsx` (483 lines)
- **Tipo:** Detail view con tabla de statement rows (50-500 filas)
- **Complejidad:** Alta — click-to-match, match status, amount color coding
- **Patrón:** sort + pagination. Puede tener múltiples tablas — solo migrar la principal

### 4. `src/views/greenhouse/payroll/PayrollEntryTable.tsx` (536 lines)
- **Tipo:** LA tabla más compleja del portal
- **Complejidad:** Muy alta — expandable rows con detail breakdowns, editable fields, receipt viewer dialog
- **Patrón:** sort + pagination. PRESERVAR toda la lógica de expand/collapse, inline editing, receipt dialog. Solo reemplazar el shell externo de la tabla con TanStack

## Migration Pattern

Referencia: `src/views/agency/AgencyTeamView.tsx`

1. Reemplazar imports MUI Table → TanStack + classnames + tableStyles
2. Definir columns con `createColumnHelper<RowType>()`, tipo `ColumnDef<T, any>[]`
3. Agregar `[sorting, setSorting] = useState<SortingState>([])`
4. Crear instancia `useReactTable({ data, columns, state, ...Models })`
5. Reemplazar `<TableContainer><Table>` → `<div className='overflow-x-auto'><table className={tableStyles.table}>`
6. Para list views: agregar `CustomTextField` búsqueda + `TablePaginationComponent`

## Acceptance Criteria

- [ ] 4 archivos migrados a TanStack
- [ ] `npx tsc --noEmit` limpio
- [ ] `pnpm build` limpio
- [ ] No business logic changed
- [ ] PayrollEntryTable: expand/collapse + editing + receipt viewer siguen funcionando

## Dependencies & Impact

- **Depende de:** Patrón establecido en sesión Claude Opus (AgencyTeamView.tsx)
- **Impacta a:** TASK-053 (las 25 restantes de bajo impacto)
- **Archivos owned:** Los 4 listados arriba
