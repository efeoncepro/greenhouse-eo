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

import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import type { AdminTenantUserRow } from '@/lib/admin/get-admin-tenant-detail'
import { resolveAvatarPath } from '@/lib/people/resolve-avatar-path'
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
        header: GH_INTERNAL_MESSAGES.admin_tenant_users_user_header,
        cell: ({ row }) => {
          const avatarSrc = row.original.avatarUrl
            ? `/api/media/users/${row.original.userId}/avatar`
            : resolveAvatarPath({ name: row.original.fullName, email: row.original.email })

          return (
            <div className='flex items-center gap-4'>
              <CustomAvatar
                src={avatarSrc || undefined}
                skin={avatarSrc ? undefined : 'light'}
                color={userStatusTone(row.original.status)}
                size={38}
              >
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
        header: GH_INTERNAL_MESSAGES.admin_tenant_users_role_header,
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <Typography color='text.primary'>
              {row.original.roleCodes[0] ? toTitleCase(row.original.roleCodes[0]) : GH_INTERNAL_MESSAGES.admin_tenant_users_no_role}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {row.original.roleCodes.length > 1
                ? GH_INTERNAL_MESSAGES.admin_tenant_users_extra_roles(row.original.roleCodes.length - 1)
                : row.original.publicUserId}
            </Typography>
          </div>
        )
      }),
      columnHelper.display({
        id: 'access',
        header: GH_INTERNAL_MESSAGES.admin_tenant_users_access_header,
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-2 flex-wrap'>
              <Chip size='small' variant='tonal' color={userStatusTone(row.original.status)} label={toTitleCase(row.original.status)} />
              <Chip size='small' variant='outlined' label={toTitleCase(row.original.authMode)} />
            </div>
            <Typography variant='body2' color='text.secondary'>
              {row.original.hubspotContactIds.length > 0
                ? `HubSpot ${row.original.hubspotContactIds.join(', ')}`
                : GH_INTERNAL_MESSAGES.admin_tenant_users_manual_source}
            </Typography>
          </div>
        )
      }),
      columnHelper.display({
        id: 'scopes',
        header: GH_INTERNAL_MESSAGES.admin_tenant_users_scopes_header,
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <Typography color='text.primary'>{`${row.original.projectScopeCount} proyectos`}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {row.original.routeGroups.length > 0 ? row.original.routeGroups.join(', ') : GH_INTERNAL_MESSAGES.admin_tenant_users_no_route_groups}
            </Typography>
          </div>
        )
      }),
      columnHelper.accessor('lastLoginAt', {
        header: GH_INTERNAL_MESSAGES.admin_tenant_users_last_login_header,
        cell: ({ row }) => <Typography>{formatDateTime(row.original.lastLoginAt)}</Typography>
      }),
      columnHelper.display({
        id: 'action',
        header: GH_INTERNAL_MESSAGES.admin_tenant_users_actions_header,
        enableSorting: false,
        cell: ({ row }) => (
          <div className='flex items-center gap-1'>
            <Button component={Link} href={`/admin/users/${row.original.userId}`} variant='text' size='small' startIcon={<i className='tabler-eye' />}>
              {GH_INTERNAL_MESSAGES.admin_tenant_users_view}
            </Button>
            <OptionMenu
              iconButtonProps={{ size: 'medium' }}
              iconClassName='text-textSecondary'
              options={[
                {
                  text: GH_INTERNAL_MESSAGES.admin_tenant_users_resend_invite,
                  icon: <i className='tabler-mail-forward text-base' />,
                  menuItemProps: { className: 'flex items-center gap-2 text-textSecondary', disabled: true }
                },
                {
                  text: GH_INTERNAL_MESSAGES.admin_tenant_users_change_role,
                  icon: <i className='tabler-user-up text-base' />,
                  menuItemProps: { className: 'flex items-center gap-2 text-textSecondary', disabled: true }
                },
                {
                  text: GH_INTERNAL_MESSAGES.admin_tenant_users_deactivate,
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
          title={GH_INTERNAL_MESSAGES.admin_tenant_users_active}
          stats={String(activeCount)}
          avatarIcon='tabler-user-check'
          avatarColor='success'
          trend='neutral'
          trendNumber='0'
          subtitle={GH_INTERNAL_MESSAGES.admin_tenant_users_active_subtitle}
        />
        <HorizontalWithSubtitle
          title={GH_INTERNAL_MESSAGES.admin_tenant_users_invited}
          stats={String(invitedCount)}
          avatarIcon='tabler-mail-forward'
          avatarColor='warning'
          trend='neutral'
          trendNumber='0'
          subtitle={GH_INTERNAL_MESSAGES.admin_tenant_users_invited_subtitle}
        />
        <HorizontalWithSubtitle
          title={GH_INTERNAL_MESSAGES.admin_tenant_users_total}
          stats={String(users.length)}
          avatarIcon='tabler-users'
          avatarColor='primary'
          trend='neutral'
          trendNumber='0'
          subtitle={GH_INTERNAL_MESSAGES.admin_tenant_users_total_subtitle}
        />
      </div>

      <Card>
        <CardHeader title={GH_INTERNAL_MESSAGES.admin_tenant_users_title} subheader={GH_INTERNAL_MESSAGES.admin_tenant_users_subtitle} />
        <div className='p-6 border-bs'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <CustomTextField
              value={searchValue}
              onChange={event => {
                setSearchValue(event.target.value)
                table.setPageIndex(0)
              }}
              placeholder={GH_INTERNAL_MESSAGES.admin_tenant_users_search_placeholder}
            />
            <CustomTextField
              select
              fullWidth
              value={statusFilter}
              onChange={event => {
                setStatusFilter(event.target.value)
                table.setPageIndex(0)
              }}
              label={GH_INTERNAL_MESSAGES.admin_tenant_users_status_label}
            >
              <MenuItem value='all'>{GH_INTERNAL_MESSAGES.admin_tenant_users_status_all}</MenuItem>
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
              {GH_INTERNAL_MESSAGES.admin_tenant_users_invite}
            </Button>
            <Button variant='contained' color='warning' startIcon={<i className='tabler-mail-forward' />} disabled className='max-sm:is-full'>
              {GH_INTERNAL_MESSAGES.admin_tenant_users_resend}
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
                    {GH_INTERNAL_MESSAGES.admin_tenant_users_no_data}
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
