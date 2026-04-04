'use client'

import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import type { Column, RowData, Table } from '@tanstack/react-table'

import CustomTextField from '@core/components/mui/TextField'

/**
 * Per-column filter UI for TanStack React Table.
 *
 * Renders a search input for text columns or min/max range inputs for numeric columns.
 * Automatically detects column type from faceted values.
 *
 * Usage:
 *   Place inside the table header cell:
 *   ```
 *   <th>
 *     {flexRender(header.column.columnDef.header, header.getContext())}
 *     {header.column.getCanFilter() && <ColumnFilter column={header.column} table={table} />}
 *   </th>
 *   ```
 *
 * Requires: `getFilteredRowModel()`, `getFacetedRowModel()`,
 *           `getFacetedUniqueValues()`, `getFacetedMinMaxValues()`
 */
const ColumnFilter = <TData extends RowData>({
  column
}: {
  column: Column<TData, unknown>
  table?: Table<TData>
}) => {
  const firstValue = column.getFacetedUniqueValues()?.entries().next().value?.[0]
  const isNumeric = typeof firstValue === 'number'

  const columnFilterValue = column.getFilterValue()

  if (isNumeric) {
    const minMax = column.getFacetedMinMaxValues()
    const min = Number(minMax?.[0] ?? '')
    const max = Number(minMax?.[1] ?? '')

    return (
      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
        <NumberRangeInput
          value={(columnFilterValue as [number, number])?.[0] ?? ''}
          onChange={val => column.setFilterValue((old: [number, number]) => [val, old?.[1]])}
          placeholder={`Min${min ? ` (${min})` : ''}`}
        />
        <NumberRangeInput
          value={(columnFilterValue as [number, number])?.[1] ?? ''}
          onChange={val => column.setFilterValue((old: [number, number]) => [old?.[0], val])}
          placeholder={`Max${max ? ` (${max})` : ''}`}
        />
      </Box>
    )
  }

  return (
    <DebouncedFilterInput
      value={(columnFilterValue ?? '') as string}
      onChange={value => column.setFilterValue(value)}
      placeholder={`Buscar... (${column.getFacetedUniqueValues().size})`}
    />
  )
}

// ── Internal helpers ──

const NumberRangeInput = ({
  value,
  onChange,
  placeholder
}: {
  value: string | number
  onChange: (val: number | undefined) => void
  placeholder: string
}) => (
  <CustomTextField
    type='number'
    size='small'
    value={value}
    onChange={e => onChange(e.target.value ? Number(e.target.value) : undefined)}
    placeholder={placeholder}
    variant='standard'
    slotProps={{ input: { disableUnderline: true, sx: { fontSize: '0.75rem' } } }}
    sx={{ width: 60 }}
  />
)

const DebouncedFilterInput = ({
  value: initialValue,
  onChange,
  placeholder
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => onChange(value), 300)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <CustomTextField
      size='small'
      value={value}
      onChange={e => setValue(e.target.value)}
      placeholder={placeholder}
      variant='standard'
      slotProps={{ input: { disableUnderline: true, sx: { fontSize: '0.75rem' } } }}
      sx={{ mt: 0.5, width: '100%' }}
    />
  )
}

export default ColumnFilter
