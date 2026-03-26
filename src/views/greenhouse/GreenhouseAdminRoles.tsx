'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import type { AdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import { GH_INTERNAL_MESSAGES, GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'

import tableStyles from '@core/styles/table.module.css'

type RoleRow = AdminAccessOverview['roles'][number]

type Props = {
  data: AdminAccessOverview
}

// ── Columns ──

const columnHelper = createColumnHelper<RoleRow>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const columns: ColumnDef<RoleRow, any>[] = [
  columnHelper.accessor('roleName', {
    header: GH_INTERNAL_MESSAGES.admin_roles_role_header,
    cell: ({ row }) => (
      <Stack spacing={0.5}>
        <Typography color='text.primary' className='font-medium'>{row.original.roleName}</Typography>
        <Typography variant='body2' color='text.secondary'>{row.original.roleCode}</Typography>
      </Stack>
    )
  }),
  columnHelper.accessor('tenantType', {
    header: GH_INTERNAL_MESSAGES.admin_roles_tenant_type_header,
    cell: ({ getValue }) => getValue()
  }),
  columnHelper.accessor('routeGroups', {
    header: GH_INTERNAL_MESSAGES.admin_roles_route_groups_header,
    cell: ({ getValue }) => (
      <Stack direction='row' gap={1} flexWrap='wrap'>
        {(getValue() as string[]).map(rg => <Chip key={rg} size='small' label={rg} variant='outlined' />)}
      </Stack>
    ),
    enableSorting: false
  }),
  columnHelper.accessor('assignedUsers', {
    header: GH_INTERNAL_MESSAGES.admin_roles_users_header,
    meta: { align: 'right' }
  }),
  columnHelper.accessor('assignedClients', {
    header: GH_INTERNAL_MESSAGES.admin_roles_spaces_header,
    meta: { align: 'right' }
  })
]

// ── Component ──

const GreenhouseAdminRoles = ({ data }: Props) => {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data: data.roles,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant='h4' sx={{ mb: 1 }}>
          {GH_INTERNAL_NAV.adminRoles.label}
        </Typography>
        <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_roles_subtitle}</Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }
        }}
      >
        {data.roles.map(role => (
          <Card key={role.roleCode}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
                  <Box>
                    <Typography variant='h6'>{role.roleName}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {role.roleCode}
                    </Typography>
                  </Box>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={role.tenantType === 'efeonce_internal' ? 'info' : 'success'}
                    label={role.tenantType}
                  />
                </Stack>
                <Typography variant='body2' color='text.secondary'>
                  {GH_INTERNAL_MESSAGES.admin_roles_assigned_summary(role.assignedUsers, role.assignedClients)}
                </Typography>
                <Stack direction='row' gap={1} flexWrap='wrap'>
                  {role.routeGroups.map(routeGroup => (
                    <Chip key={routeGroup} size='small' label={routeGroup} variant='outlined' />
                  ))}
                  {role.isAdmin ? <Chip size='small' color='error' variant='tonal' label='admin' /> : null}
                  {role.isInternal ? <Chip size='small' color='info' variant='tonal' label='internal' /> : null}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant='h5'>{GH_INTERNAL_MESSAGES.admin_roles_matrix_title}</Typography>
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                      {hg.headers.map(header => (
                        <th
                          key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })}
                          style={{ textAlign: (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : 'left' }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : 'left' }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default GreenhouseAdminRoles
