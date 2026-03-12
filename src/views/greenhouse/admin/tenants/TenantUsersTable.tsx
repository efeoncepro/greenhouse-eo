'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
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
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'
import OptionMenu from '@core/components/option-menu'
import TablePaginationComponent from '@components/TablePaginationComponent'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import type { AdminTenantUserRow } from '@/lib/admin/get-admin-tenant-detail'
import { getInitials } from '@/utils/getInitials'

import tableStyles from '@core/styles/table.module.css'

import { formatDateTime, toTitleCase, userStatusTone } from './helpers'

type TenantUsersTableProps = {
  users: AdminTenantUserRow[]
}

const columnHelper = createColumnHelper<AdminTenantUserRow>()

const TenantUsersTable = ({ users }: TenantUsersTableProps) => {
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'fullName', desc: false }])

  const filteredUsers = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return users.filter(user => {
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter

      const matchesSearch =
        query.length === 0 ||
        [user.fullName, user.email, user.roleCodes.join(' '), user.routeGroups.join(' '), user.publicUserId]
          .join(' ')
          .toLowerCase()
          .includes(query)

      return matchesStatus && matchesSearch
    })
  }, [searchValue, statusFilter, users])

  const statusOptions = useMemo(() => Array.from(new Set(users.map(user => user.status))).sort(), [users])

  const columns = useMemo<ColumnDef<AdminTenantUserRow, any>[]>(
    () => [
      columnHelper.accessor('fullName', {
        header: 'Usuario',
        cell: ({ row }) => (
          <div className='flex items-center gap-4'>
            <CustomAvatar skin='light' color={userStatusTone(row.original.status)} size={38}>
              {getInitials(row.original.fullName)}
            </CustomAvatar>
            <div className='flex flex-col'>
              <Typography component={Link} href={`/admin/users/${row.original.userId}`} color='text.primary' className='font-medium'>
                {row.original.fullName}
              </Typography>
              <Typography variant='body2'>{row.original.email}</Typography>
            </div>
          </div>
        )
      }),
      columnHelper.display({
        id: 'role',
        header: 'Rol',
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <Typography color='text.primary'>{row.original.roleCodes[0] ? toTitleCase(row.original.roleCodes[0]) : 'Sin rol'}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {row.original.roleCodes.length > 1 ? `+${row.original.roleCodes.length - 1} roles extra` : row.original.publicUserId}
            </Typography>
          </div>
        )
      }),
      columnHelper.display({
        id: 'access',
        header: 'Acceso',
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-2 flex-wrap'>
              <Chip size='small' variant='tonal' color={userStatusTone(row.original.status)} label={toTitleCase(row.original.status)} />
              <Chip size='small' variant='outlined' label={toTitleCase(row.original.authMode)} />
            </div>
            <Typography variant='body2' color='text.secondary'>
              {row.original.hubspotContactIds.length > 0 ? `HubSpot ${row.original.hubspotContactIds.join(', ')}` : 'Manual o interno'}
            </Typography>
          </div>
        )
      }),
      columnHelper.display({
        id: 'scopes',
        header: 'Scopes',
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <Typography color='text.primary'>{`${row.original.projectScopeCount} proyectos`}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {row.original.routeGroups.length > 0 ? row.original.routeGroups.join(', ') : 'Sin route groups'}
            </Typography>
          </div>
        )
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
                  text: 'Reenviar invitacion',
                  icon: <i className='tabler-mail-forward text-base' />,
                  menuItemProps: { className: 'flex items-center gap-2 text-textSecondary', disabled: true }
                },
                {
                  text: 'Cambiar rol',
                  icon: <i className='tabler-user-up text-base' />,
                  menuItemProps: { className: 'flex items-center gap-2 text-textSecondary', disabled: true }
                },
                {
                  text: 'Desactivar',
                  icon: <i className='tabler-user-x text-base' />,
                  menuItemProps: { className: 'flex items-center gap-2 text-textSecondary', disabled: true }
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
      sorting
    },
    initialState: {
      pagination: {
        pageSize: 10
      }
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  const activeCount = users.filter(user => user.status === 'active').length
  const invitedCount = users.filter(user => user.status === 'invited' || user.status === 'pending').length

  return (
    <>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <HorizontalWithSubtitle
          title='Activos'
          stats={String(activeCount)}
          avatarIcon='tabler-user-check'
          avatarColor='success'
          trend='neutral'
          trendNumber='0'
          subtitle='Con acceso operativo'
        />
        <HorizontalWithSubtitle
          title='Invitados'
          stats={String(invitedCount)}
          avatarIcon='tabler-mail-forward'
          avatarColor='warning'
          trend='neutral'
          trendNumber='0'
          subtitle='Pendientes de activacion'
        />
        <HorizontalWithSubtitle
          title='Total'
          stats={String(users.length)}
          avatarIcon='tabler-users'
          avatarColor='primary'
          trend='neutral'
          trendNumber='0'
          subtitle='Usuarios del space'
        />
      </div>

      <Card>
        <CardHeader title='Usuarios del space' subheader='Patron Vuexy User Management adaptado a client_users, roles y scopes reales del tenant.' />
        <div className='p-6 border-bs'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <CustomTextField
              value={searchValue}
              onChange={event => {
                setSearchValue(event.target.value)
                table.setPageIndex(0)
              }}
              placeholder='Buscar usuario'
            />
            <CustomTextField
              select
              fullWidth
              value={statusFilter}
              onChange={event => {
                setStatusFilter(event.target.value)
                table.setPageIndex(0)
              }}
              label='Estado'
            >
              <MenuItem value='all'>Todos</MenuItem>
              {statusOptions.map(status => (
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
            <Button variant='tonal' color='secondary' startIcon={<i className='tabler-user-plus' />} disabled className='max-sm:is-full'>
              Invitar usuario
            </Button>
            <Button variant='contained' color='warning' startIcon={<i className='tabler-mail-forward' />} disabled className='max-sm:is-full'>
              Reenviar pendientes
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
                    No hay usuarios para este filtro.
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
      </Card>
    </>
  )
}

export default TenantUsersTable
