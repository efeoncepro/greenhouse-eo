'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
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
import type { ColumnDef, RowSelectionState, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'
import OptionMenu from '@core/components/option-menu'

import TablePaginationComponent from '@components/TablePaginationComponent'

import type { AdminAccessOverview, AdminUserRow } from '@/lib/admin/get-admin-access-overview'
import { resolveAvatarPath } from '@/lib/people/resolve-avatar-path'
import { getInitials } from '@/utils/getInitials'
import { GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'

import tableStyles from '@core/styles/table.module.css'

import { formatDateTime, roleColorFor, roleIconFor, statusTone, tenantTone, toTitleCase } from './helpers'

const columnHelper = createColumnHelper<AdminUserRow>()

const exportToCsv = (rows: AdminUserRow[]) => {
  const headers = ['Nombre', 'Email', 'Cliente', 'Space', 'Estado', 'Acceso', 'Roles', 'Grupos de ruta', 'Home', 'Ultimo login']

  const lines = rows.map(row =>
    [
      row.fullName,
      row.email,
      row.clientName,
      row.tenantType,
      row.status,
      row.authMode,
      row.roleCodes.join('|'),
      row.routeGroups.join('|'),
      row.portalHomePath,
      row.lastLoginAt || ''
    ]
      .map(value => `"${String(value).replace(/"/g, '""')}"`)
      .join(',')
  )

  const csvContent = [headers.join(','), ...lines].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'greenhouse-admin-users.csv'
  link.click()
  URL.revokeObjectURL(url)
}

const UserListTable = ({ data }: { data: AdminAccessOverview }) => {
  const [roleFilter, setRoleFilter] = useState('all')
  const [tenantFilter, setTenantFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchValue, setSearchValue] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'fullName', desc: false }])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const roleOptions = useMemo(
    () => Array.from(new Set(data.users.flatMap(user => user.roleCodes))).sort((left, right) => left.localeCompare(right)),
    [data.users]
  )

  const filteredUsers = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return data.users.filter(user => {
      const matchesRole = roleFilter === 'all' || user.roleCodes.includes(roleFilter)
      const matchesTenant = tenantFilter === 'all' || user.tenantType === tenantFilter
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter

      const matchesSearch =
        query.length === 0 ||
        [user.fullName, user.email, user.clientName, user.roleCodes.join(' '), user.routeGroups.join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(query)

      return matchesRole && matchesTenant && matchesStatus && matchesSearch
    })
  }, [data.users, roleFilter, searchValue, statusFilter, tenantFilter])

  const columns = useMemo<ColumnDef<AdminUserRow, any>[]>(
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
          <Checkbox checked={row.getIsSelected()} indeterminate={row.getIsSomeSelected()} onChange={row.getToggleSelectedHandler()} />
        ),
        enableSorting: false
      },
      columnHelper.accessor('fullName', {
        header: 'Usuario',
        cell: ({ row }) => {
          const avatarSrc = resolveAvatarPath({ name: row.original.fullName, email: row.original.email })

          return (
            <div className='flex items-center gap-4'>
              <CustomAvatar src={avatarSrc || undefined} size={38} skin={avatarSrc ? undefined : 'light'} color={tenantTone(row.original.tenantType)}>
                {!avatarSrc ? getInitials(row.original.fullName) : null}
              </CustomAvatar>
              <div className='flex flex-col'>
                <Typography component={Link} href={`/admin/users/${row.original.userId}`} color='text.primary' className='font-medium'>
                  {row.original.fullName}
                </Typography>
                <Typography variant='body2'>{row.original.email}</Typography>
              </div>
            </div>
          )
        }
      }),
      columnHelper.display({
        id: 'role',
        header: 'Rol',
        cell: ({ row }) => {
          const primaryRole = row.original.roleCodes[0]

          if (!primaryRole) {
            return <Typography color='text.secondary'>Sin rol</Typography>
          }

          return (
            <div className='flex flex-col gap-1'>
              <div className='flex items-center gap-2'>
                <i className={roleIconFor(primaryRole)} style={{ color: `var(--mui-palette-${roleColorFor(primaryRole)}-main)` }} />
                <Typography color='text.primary'>{toTitleCase(primaryRole)}</Typography>
              </div>
              <Typography variant='body2'>
                {row.original.roleCodes.length > 1 ? `+${row.original.roleCodes.length - 1} roles extra` : 'Rol primario'}
              </Typography>
            </div>
          )
        }
      }),
      columnHelper.accessor('clientName', {
        header: 'Space',
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <Typography color='text.primary'>{row.original.clientName}</Typography>
            <Chip size='small' variant='tonal' color={tenantTone(row.original.tenantType)} label={toTitleCase(row.original.tenantType)} sx={{ width: 'fit-content' }} />
          </div>
        )
      }),
      columnHelper.display({
        id: 'access',
        header: 'Acceso',
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-2 flex-wrap'>
              <Chip size='small' variant='tonal' color={statusTone(row.original.status)} label={toTitleCase(row.original.status)} />
              <Chip size='small' variant='outlined' label={toTitleCase(row.original.authMode)} />
            </div>
            <Typography variant='body2'>{`${row.original.projectScopeCount} proyectos · ${row.original.routeGroups.length} route groups`}</Typography>
          </div>
        )
      }),
      columnHelper.accessor('portalHomePath', {
        header: 'Home',
        cell: ({ row }) => <Typography color='text.primary'>{row.original.portalHomePath || '--'}</Typography>
      }),
      columnHelper.accessor('lastLoginAt', {
        header: 'Ultimo login',
        cell: ({ row }) => <Typography>{formatDateTime(row.original.lastLoginAt)}</Typography>
      }),
      columnHelper.display({
        id: 'action',
        header: 'Acciones',
        enableSorting: false,
        cell: ({ row }) => (
          <div className='flex items-center gap-1'>
            <Button component={Link} href={`/admin/users/${row.original.userId}`} variant='text' size='small' startIcon={<i className='tabler-eye' />}>
              Ver
            </Button>
            <OptionMenu
              iconButtonProps={{ size: 'medium' }}
              iconClassName='text-textSecondary'
              options={[
                {
                  text: 'Abrir detalle',
                  icon: <i className='tabler-user-circle text-base' />,
                  href: `/admin/users/${row.original.userId}`,
                  menuItemProps: { className: 'flex items-center gap-2 text-textSecondary' }
                },
                {
                  text: 'Ir a roles',
                  icon: <i className='tabler-shield-lock text-base' />,
                  href: '/admin/roles',
                  menuItemProps: { className: 'flex items-center gap-2 text-textSecondary' }
                }
              ]}
            />
          </div>
        )
      })
    ],
    []
  )

  const table = useReactTable({
    data: filteredUsers,
    columns,
    state: {
      sorting,
      rowSelection
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
      <CardHeader
        title={GH_INTERNAL_NAV.adminUsers.label}
        subheader='Patron Vuexy User Management reinterpretado sobre client_users, roles y scopes reales de Greenhouse.'
      />
      <div className='p-6 border-bs'>
        <Typography variant='h6' className='mbe-4'>
          Filtros
        </Typography>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <CustomTextField select fullWidth value={roleFilter} onChange={event => setRoleFilter(event.target.value)} label='Filtrar rol'>
            <MenuItem value='all'>Todos los roles</MenuItem>
            {roleOptions.map(roleCode => (
              <MenuItem key={roleCode} value={roleCode}>
                {toTitleCase(roleCode)}
              </MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField select fullWidth value={tenantFilter} onChange={event => setTenantFilter(event.target.value)} label='Filtrar tenant'>
            <MenuItem value='all'>Todos los tenants</MenuItem>
            <MenuItem value='client'>Cliente</MenuItem>
            <MenuItem value='efeonce_internal'>Efeonce interno</MenuItem>
          </CustomTextField>
          <CustomTextField select fullWidth value={statusFilter} onChange={event => setStatusFilter(event.target.value)} label='Filtrar status'>
            <MenuItem value='all'>Todos los status</MenuItem>
            {Array.from(new Set(data.users.map(user => user.status))).map(status => (
              <MenuItem key={status} value={status}>
                {toTitleCase(status)}
              </MenuItem>
            ))}
          </CustomTextField>
        </div>
      </div>
      <div className='flex justify-between flex-col items-start md:flex-row md:items-center p-6 border-bs gap-4'>
        <CustomTextField
          select
          value={table.getState().pagination.pageSize}
          onChange={event => table.setPageSize(Number(event.target.value))}
          className='max-sm:is-full sm:is-[88px]'
        >
          <MenuItem value='10'>10</MenuItem>
          <MenuItem value='25'>25</MenuItem>
          <MenuItem value='50'>50</MenuItem>
        </CustomTextField>
        <div className='flex flex-col sm:flex-row max-sm:is-full items-start sm:items-center gap-4'>
          <CustomTextField
            value={searchValue}
            onChange={event => {
              setSearchValue(event.target.value)
              table.setPageIndex(0)
            }}
            placeholder='Buscar usuario'
            className='max-sm:is-full'
          />
          <Button color='secondary' variant='tonal' startIcon={<i className='tabler-upload' />} onClick={() => exportToCsv(filteredUsers)} className='max-sm:is-full'>
            Exportar
          </Button>
          <Button component={Link} href='/admin/roles' variant='contained' startIcon={<i className='tabler-shield-lock' />} className='max-sm:is-full'>
            Roles y permisos
          </Button>
        </div>
      </div>
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
          {table.getRowModel().rows.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                  Sin datos disponibles
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
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
    </Card>
  )
}

export default UserListTable
