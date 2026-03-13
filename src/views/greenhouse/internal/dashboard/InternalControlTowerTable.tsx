'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, RowSelectionState, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'
import OptionMenu from '@core/components/option-menu'

import TablePaginationComponent from '@components/TablePaginationComponent'

import EmptyState from '@components/greenhouse/EmptyState'

import { getInitials } from '@/utils/getInitials'

import tableStyles from '@core/styles/table.module.css'

import type { DerivedControlTowerTenant } from './helpers'
import { formatInteger, formatPercent, getCapabilityLabel, getCapabilityTone, getOtdTone } from './helpers'

type StatusFilter = 'all' | 'active' | 'onboarding' | 'attention' | 'inactive'

type Props = {
  rows: DerivedControlTowerTenant[]
  totalRows: number
  searchValue: string
  onSearchChange: (value: string) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (value: StatusFilter) => void
}

const columnHelper = createColumnHelper<DerivedControlTowerTenant>()

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'attention', label: 'Requiere atencion' },
  { value: 'inactive', label: 'Inactivos' }
]

const InternalControlTowerTable = ({
  rows,
  totalRows,
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange
}: Props) => {
  const router = useRouter()
  const theme = useTheme()

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'statusPriority', desc: false },
    { id: 'lastActivityTimestamp', desc: true }
  ])

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const countsByFilter = useMemo(
    () => ({
      all: totalRows,
      active: rows.filter(row => row.statusKey === 'active').length,
      onboarding: rows.filter(row => row.statusKey === 'onboarding').length,
      attention: rows.filter(row => row.statusKey === 'attention').length,
      inactive: rows.filter(row => row.statusKey === 'inactive').length
    }),
    [rows, totalRows]
  )

  const columns = useMemo<ColumnDef<DerivedControlTowerTenant, any>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            indeterminate={row.getIsSomeSelected()}
            onClick={event => event.stopPropagation()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        enableSorting: false
      },
      columnHelper.accessor('statusPriority', {
        header: () => null,
        enableHiding: true,
        cell: () => null
      }),
      columnHelper.accessor('lastActivityTimestamp', {
        header: () => null,
        enableHiding: true,
        cell: () => null
      }),
      columnHelper.accessor('clientName', {
        header: 'Cliente',
        cell: ({ row }) => {
          const avatarColor = row.original.needsAttention
            ? 'error'
            : row.original.statusTone === 'default'
              ? 'secondary'
              : row.original.statusTone

          return (
            <div className='flex items-center gap-4'>
              <CustomAvatar skin='light' color={avatarColor} size={38}>
                {getInitials(row.original.clientName)}
              </CustomAvatar>
              <div className='flex flex-col gap-1'>
                <Typography component={Link} href={`/admin/tenants/${row.original.clientId}`} color='text.primary' className='font-medium'>
                  {row.original.clientName}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {row.original.primaryContactEmail || 'Sin contacto principal'}
                </Typography>
                {row.original.primaryAlerts.length > 0 ? (
                  <Typography variant='caption' color='error.main'>
                    {row.original.primaryAlerts[0]}
                  </Typography>
                ) : null}
              </div>
            </div>
          )
        }
      }),
      columnHelper.display({
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-2 flex-wrap'>
              <Chip size='small' variant='tonal' color={row.original.statusTone === 'default' ? undefined : row.original.statusTone} label={row.original.statusLabel} />
              {row.original.avgOnTimePct !== null ? (
                <Chip
                  size='small'
                  variant='outlined'
                  color={getOtdTone(row.original.avgOnTimePct) === 'default' ? undefined : getOtdTone(row.original.avgOnTimePct)}
                  label={`OTD ${formatPercent(row.original.avgOnTimePct)}`}
                />
              ) : null}
            </div>
            <Typography variant='body2' color='text.secondary'>
              {row.original.statusDescription}
            </Typography>
          </div>
        )
      }),
      columnHelper.display({
        id: 'users',
        header: 'Usuarios',
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <Typography color={row.original.activeUsers === 0 ? 'error.main' : 'text.primary'}>
              {formatInteger(row.original.activeUsers)} activos / {formatInteger(row.original.totalUsers)} total
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {formatInteger(row.original.invitedUsers)} pendientes de activacion
            </Typography>
          </div>
        )
      }),
      columnHelper.accessor('scopedProjects', {
        header: 'Proyectos',
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            {row.original.scopedProjects === 0 ? <i className='tabler-alert-triangle text-[18px]' style={{ color: theme.palette.error.main }} /> : null}
            <div className='flex flex-col gap-1'>
              <Typography color={row.original.scopedProjects === 0 ? 'error.main' : 'text.primary'}>
                {formatInteger(row.original.scopedProjects)}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {formatInteger(row.original.notionProjectCount)} base
              </Typography>
            </div>
          </div>
        )
      }),
      columnHelper.display({
        id: 'capabilities',
        header: 'Capabilities',
        enableSorting: false,
        cell: ({ row }) => {
          const visibleCapabilities = row.original.capabilityCodes.slice(0, 3)
          const remaining = row.original.capabilityCodes.length - visibleCapabilities.length

          if (visibleCapabilities.length === 0) {
            return <Typography variant='body2' color='text.secondary'>Sin capabilities activas</Typography>
          }

          return (
            <div className='flex items-center gap-1 flex-wrap'>
              {visibleCapabilities.map(capability => (
                <Chip
                  key={capability}
                  size='small'
                  variant='tonal'
                  color={getCapabilityTone(capability) === 'default' ? undefined : getCapabilityTone(capability)}
                  label={getCapabilityLabel(capability)}
                />
              ))}
              {remaining > 0 ? <Chip size='small' variant='outlined' label={`+${remaining}`} /> : null}
            </div>
          )
        }
      }),
      columnHelper.display({
        id: 'lastActivity',
        header: 'Ultima actividad',
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <Typography color={(row.original.lastActivityDays ?? 0) > 30 ? 'error.main' : 'text.primary'}>
              {row.original.lastActivityLabel}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {row.original.lastLoginAt ? 'Ultimo login registrado' : 'Sin login visible'}
            </Typography>
          </div>
        )
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Acciones',
        enableSorting: false,
        cell: ({ row }) => (
          <div className='flex items-center gap-1' onClick={event => event.stopPropagation()}>
            <Button component={Link} href={`/admin/tenants/${row.original.clientId}`} variant='text' size='small' startIcon={<i className='tabler-eye' />}>
              Ver
            </Button>
            <OptionMenu
              iconButtonProps={{ size: 'medium' }}
              iconClassName='text-textSecondary'
              options={[
                {
                  text: 'Ver detalle',
                  icon: <i className='tabler-building-store text-base' />,
                  href: `/admin/tenants/${row.original.clientId}`,
                  menuItemProps: { className: 'flex items-center gap-2 text-textSecondary' }
                },
                {
                  text: 'Ver como cliente',
                  icon: <i className='tabler-layout-dashboard text-base' />,
                  href: `/admin/tenants/${row.original.clientId}/view-as/dashboard`,
                  menuItemProps: { className: 'flex items-center gap-2 text-textSecondary' }
                },
                {
                  text: 'Editar',
                  icon: <i className='tabler-edit text-base' />,
                  menuItemProps: { className: 'flex items-center gap-2 text-textSecondary', disabled: true }
                },
                {
                  text: 'Desactivar',
                  icon: <i className='tabler-lock text-base' />,
                  menuItemProps: { className: 'flex items-center gap-2 text-textSecondary', disabled: true }
                }
              ]}
            />
          </div>
        )
      })
    ],
    [theme.palette.error.main]
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility: {
        statusPriority: false,
        lastActivityTimestamp: false
      }
    },
    initialState: {
      pagination: {
        pageSize: 10
      }
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  return (
    <Card>
      <CardContent className='flex flex-col gap-4'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
          <div>
            <Typography variant='h4'>Clientes</Typography>
            <Typography color='text.secondary'>
              Control operativo de spaces con prioridad visual para onboarding trabado, baja activacion y falta de scope.
            </Typography>
          </div>
          <div className='flex flex-col gap-3 md:flex-row md:items-center'>
            <CustomTextField
              value={searchValue}
              onChange={event => onSearchChange(event.target.value)}
              placeholder='Buscar por cliente o email'
              className='min-w-[260px]'
            />
            <CustomTextField select value={statusFilter} onChange={event => onStatusFilterChange(event.target.value as StatusFilter)} className='min-w-[180px]'>
              {statusFilterOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </div>
        </div>

        <div className='flex flex-wrap gap-2'>
          {statusFilterOptions.map(option => {
            const chip = (
              <Chip
                clickable
                color={statusFilter === option.value ? 'primary' : 'default'}
                variant={statusFilter === option.value ? 'filled' : 'outlined'}
                label={option.label}
                onClick={() => onStatusFilterChange(option.value)}
              />
            )

            if (option.value !== 'attention' || countsByFilter.attention === 0) {
              return <Box key={option.value}>{chip}</Box>
            }

            return (
              <Badge key={option.value} badgeContent={countsByFilter.attention} color='error'>
                {chip}
              </Badge>
            )
          })}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={totalRows === 0 ? 'tabler-building-community' : 'tabler-search-off'}
            title={totalRows === 0 ? 'Sin clientes configurados.' : 'Sin resultados para este filtro.'}
            description={
              totalRows === 0
                ? 'Crea tu primer space para comenzar.'
                : 'Prueba con otro filtro o busca por nombre.'
            }
            action={
              totalRows === 0 ? (
                <Button variant='contained' disabled>
                  Crear space
                </Button>
              ) : undefined
            }
            minHeight={260}
          />
        ) : (
          <>
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id}>
                          {header.isPlaceholder ? null : (
                            <div
                              className={classnames({
                                'flex items-center gap-2': header.column.getIsSorted(),
                                'cursor-pointer select-none': header.column.getCanSort()
                              })}
                              onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {{
                                asc: <i className='tabler-chevron-up text-xl' />,
                                desc: <i className='tabler-chevron-down text-xl' />
                              }[header.column.getIsSorted() as 'asc' | 'desc'] ?? null}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map(row => (
                    <tr
                      key={row.id}
                      className={classnames({ selected: row.getIsSelected() })}
                      onClick={() => router.push(`/admin/tenants/${row.original.clientId}`)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: row.original.needsAttention ? alpha(theme.palette.error.main, 0.05) : undefined
                      }}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
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
        )}
      </CardContent>
    </Card>
  )
}

export default InternalControlTowerTable
