/**
 * Shared React Table utilities: fuzzy filter, type augmentation, and column filter component.
 *
 * Usage:
 *   import { fuzzyFilter } from '@components/tableUtils'
 *
 *   const table = useReactTable({
 *     filterFns: { fuzzy: fuzzyFilter },
 *     globalFilterFn: fuzzyFilter,
 *     ...
 *   })
 */

// Third-party Imports
import { rankItem } from '@tanstack/match-sorter-utils'
import type { FilterFn } from '@tanstack/react-table'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

// ---- Type augmentation for TanStack Table ----
declare module '@tanstack/table-core' {
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
