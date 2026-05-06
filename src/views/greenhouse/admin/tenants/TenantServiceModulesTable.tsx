'use client'

import { useMemo, useState } from 'react'

import MenuItem from '@mui/material/MenuItem'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import TablePaginationComponent from '@components/TablePaginationComponent'

import { BusinessLineBadge } from '@/components/greenhouse'
import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import type { TenantCapabilityRecord } from '@/lib/admin/tenant-capability-types'

import tableStyles from '@core/styles/table.module.css'

import {
  getCapabilityPalette,
  getCapabilitySourceLabel,
  getCapabilitySourceTone,
  toTitleCase
} from './helpers'
import { formatDate as formatGreenhouseDate } from '@/lib/format'

type TenantServiceModulesTableProps = {
  capabilities: TenantCapabilityRecord[]
}

type ServiceModuleRow = TenantCapabilityRecord & {
  familyLabel: string
}

const columnHelper = createColumnHelper<ServiceModuleRow>()

const TenantServiceModulesTable = ({ capabilities }: TenantServiceModulesTableProps) => {
  const [searchValue, setSearchValue] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'moduleLabel', desc: false }])

  const data = useMemo(
    () =>
      capabilities
        .filter(item => item.moduleKind === 'service_module')
        .map(item => ({
          ...item,
          familyLabel: getCapabilityPalette(item).label
        })),
    [capabilities]
  )

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    if (!query) return data

    return data.filter(row =>
      [row.moduleLabel, row.moduleCode, row.publicModuleId, row.familyLabel, row.assignmentSourceSystem || '']
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [data, searchValue])

  const columns = useMemo<ColumnDef<ServiceModuleRow, any>[]>(
    () => [
      columnHelper.accessor('moduleLabel', {
        header: GH_INTERNAL_MESSAGES.admin_tenant_service_modules_header_module,
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <Typography color='text.primary'>{row.original.moduleLabel}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {row.original.description || GH_INTERNAL_MESSAGES.admin_tenant_capability_description_empty}
            </Typography>
          </div>
        )
      }),
      columnHelper.accessor('publicModuleId', {
        header: GH_INTERNAL_MESSAGES.admin_tenant_service_modules_header_code,
        cell: ({ row }) => (
          <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>{row.original.publicModuleId}</Typography>
        )
      }),
      columnHelper.accessor('familyLabel', {
        header: GH_INTERNAL_MESSAGES.admin_tenant_service_modules_header_family,
        cell: ({ row }) => {
          const palette = getCapabilityPalette(row.original)

          return <BusinessLineBadge brand={palette.label} height={16} />
        }
      }),
      columnHelper.display({
        id: 'state',
        header: GH_INTERNAL_MESSAGES.admin_tenant_service_modules_header_state,
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={getCapabilitySourceTone(row.original)}
              label={
                row.original.selected
                  ? GH_INTERNAL_MESSAGES.admin_tenant_capability_state_active
                  : GH_INTERNAL_MESSAGES.admin_tenant_capability_state_available
              }
              sx={{ width: 'fit-content' }}
            />
            <Typography variant='body2' color='text.secondary'>
              {getCapabilitySourceLabel(row.original)}
            </Typography>
          </div>
        )
      }),
      columnHelper.accessor('updatedAt', {
        header: GH_INTERNAL_MESSAGES.admin_tenant_service_modules_header_updated,
        cell: ({ row }) => (
          <Typography variant='body2' color='text.secondary'>
            {row.original.updatedAt
              ? formatGreenhouseDate(new Date(row.original.updatedAt), 'es-CL')
              : GH_INTERNAL_MESSAGES.admin_tenant_service_modules_no_date}
          </Typography>
        )
      })
    ],
    []
  )

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: {
      sorting
    },
    initialState: {
      pagination: {
        pageSize: 8
      }
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  return (
    <>
      <div className='flex justify-between flex-col items-start md:flex-row md:items-center p-6 border-bs gap-4'>
        <CustomTextField
          value={searchValue}
          onChange={event => {
            setSearchValue(event.target.value)
            table.setPageIndex(0)
          }}
          placeholder={GH_INTERNAL_MESSAGES.admin_tenant_service_modules_search}
          className='max-sm:is-full'
        />
        <div className='flex items-center gap-4 max-sm:is-full'>
          <CustomTextField
            select
            value={table.getState().pagination.pageSize}
            onChange={event => table.setPageSize(Number(event.target.value))}
            className='max-sm:is-full sm:is-[88px]'
          >
            <MenuItem value='8'>8</MenuItem>
            <MenuItem value='12'>12</MenuItem>
            <MenuItem value='24'>24</MenuItem>
          </CustomTextField>
          <Typography color='text.secondary'>
            {GH_INTERNAL_MESSAGES.admin_tenant_service_modules_active_count(filteredRows.filter(row => row.selected).length)}
          </Typography>
        </div>
      </div>
      <div className='overflow-x-auto'>
        <table className={tableStyles.table}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const sorted = header.column.getIsSorted()

                  return (
                    <th
                      key={header.id}
                      scope='col'
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : header.column.getCanSort() ? 'none' : undefined}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={classnames({
                            'flex items-center gap-2': sorted,
                            'cursor-pointer select-none': header.column.getCanSort()
                          })}
                          onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <i className='tabler-chevron-up text-xl' aria-hidden='true' />,
                            desc: <i className='tabler-chevron-down text-xl' aria-hidden='true' />
                          }[sorted as 'asc' | 'desc'] ?? null}
                        </div>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          {table.getRowModel().rows.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                  {toTitleCase(GH_INTERNAL_MESSAGES.admin_tenant_service_modules_empty)}
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
      <TablePagination
        component={() => <TablePaginationComponent table={table} />}
        count={table.getFilteredRowModel().rows.length}
        rowsPerPage={table.getState().pagination.pageSize}
        page={table.getState().pagination.pageIndex}
        onPageChange={(_, page) => {
          table.setPageIndex(page)
        }}
      />
    </>
  )
}

export default TenantServiceModulesTable
