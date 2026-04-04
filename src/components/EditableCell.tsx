'use client'

import { useEffect, useState } from 'react'

import type { CellContext, RowData } from '@tanstack/react-table'

import CustomTextField from '@core/components/mui/TextField'

/**
 * Editable cell component for TanStack React Table.
 *
 * Renders a text input that updates the table data via `table.options.meta.updateData`.
 * Uses the TableMeta augmentation from `@components/tableUtils`.
 *
 * Usage:
 *   1. Augment TableMeta (already done in tableUtils.ts)
 *   2. Pass `meta: { updateData }` to useReactTable options
 *   3. Use EditableCell as the cell renderer:
 *
 *   ```
 *   columnHelper.accessor('name', {
 *     header: 'Nombre',
 *     cell: EditableCell
 *   })
 *   ```
 *
 *   Or use `defaultColumn` to make ALL cells editable:
 *   ```
 *   const table = useReactTable({
 *     defaultColumn: { cell: EditableCell },
 *     meta: {
 *       updateData: (rowIndex, columnId, value) => {
 *         setData(old => old.map((row, i) => i === rowIndex ? { ...row, [columnId]: value } : row))
 *       }
 *     }
 *   })
 *   ```
 */
const EditableCell = <TData extends RowData>({
  getValue,
  row,
  column,
  table
}: CellContext<TData, unknown>) => {
  const initialValue = getValue()
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const onBlur = () => {
    table.options.meta?.updateData?.(row.index, column.id, value)
  }

  return (
    <CustomTextField
      size='small'
      value={value as string}
      onChange={e => setValue(e.target.value)}
      onBlur={onBlur}
      variant='standard'
      slotProps={{ input: { disableUnderline: true, sx: { fontSize: '0.875rem' } } }}
      fullWidth
    />
  )
}

export default EditableCell
