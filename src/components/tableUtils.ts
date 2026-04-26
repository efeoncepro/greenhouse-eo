/**
 * Shared React Table utilities: fuzzy filter, type augmentation, row selection,
 * column visibility, and column filter helpers.
 *
 * Usage:
 *   import { fuzzyFilter, buildSelectionColumn } from '@components/tableUtils'
 *
 *   const table = useReactTable({
 *     filterFns: { fuzzy: fuzzyFilter },
 *     globalFilterFn: fuzzyFilter,
 *     enableRowSelection: true,
 *     ...
 *   })
 */

// Third-party Imports
import { rankItem } from '@tanstack/match-sorter-utils'
import type { ColumnDef, FilterFn, RowData, Table, Column } from '@tanstack/react-table'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

// ---- Type augmentation for TanStack Table ----
declare module '@tanstack/table-core' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    updateData?: (rowIndex: number, columnId: string, value: unknown) => void
  }

  interface FilterMeta {
    itemRank: RankingInfo
  }
}

// ---- Fuzzy filter ----
 
export const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)

  addMeta({ itemRank })

  return itemRank.passed
}

// ---- Row Selection Column ----

/**
 * Builds a checkbox selection column definition for TanStack React Table.
 *
 * Usage:
 *   const columns = [buildSelectionColumn<MyRow>(), ...otherColumns]
 *   const table = useReactTable({ enableRowSelection: true, ... })
 */
 
export const buildSelectionColumn = <T,>(): ColumnDef<T, any> => ({
  id: 'select',
  header: ({ table }: { table: Table<T> }) => {
    const checked = table.getIsAllRowsSelected()
    const indeterminate = table.getIsSomeRowsSelected()

    return `<input type="checkbox" ${checked ? 'checked' : ''} ${indeterminate ? 'data-indeterminate="true"' : ''} />`
  },
  cell: ({ row }) => {
    const checked = row.getIsSelected()
    const canSelect = row.getCanSelect()

    return `<input type="checkbox" ${checked ? 'checked' : ''} ${!canSelect ? 'disabled' : ''} />`
  },
  enableSorting: false,
  enableHiding: false,
  meta: { align: 'center' }
})

// ---- Column Visibility helpers ----

/**
 * Get toggleable columns (excludes 'select' and any non-hideable columns).
 */
 
export const getToggleableColumns = <T,>(table: Table<T>): Column<T, any>[] =>
  table.getAllLeafColumns().filter(col => col.getCanHide())

// ---- Column Filter helper ----

/**
 * Compute min/max for a numeric column using faceted values.
 * Returns [min, max] or [undefined, undefined] if no faceted data.
 */
 
export const getColumnFacetedRange = <T,>(column: Column<T, any>): [number | undefined, number | undefined] => {
  const minMax = column.getFacetedMinMaxValues()

  return [minMax?.[0] as number | undefined, minMax?.[1] as number | undefined]
}
