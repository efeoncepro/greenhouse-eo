'use client'

import { useState } from 'react'

import Link from 'next/link'

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
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'
import { BusinessLineBadge } from '@/components/greenhouse'
import TablePaginationComponent from '@components/TablePaginationComponent'
import { fuzzyFilter } from '@/components/tableUtils'
import { getInitials } from '@/utils/getInitials'
import type { AdminTenantsOverview } from '@/lib/admin/get-admin-tenants-overview'
import { GH_INTERNAL_MESSAGES, GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'

import tableStyles from '@core/styles/table.module.css'
import { getMicrocopy } from '@/lib/copy'
import { formatDateTime as formatGreenhouseDateTime } from '@/lib/format'

const GREENHOUSE_COPY = getMicrocopy()


type TenantRow = AdminTenantsOverview['tenants'][number]

type Props = {
  data: AdminTenantsOverview
}

const formatDateTime = (value: string | null) => {
  if (!value) return GH_INTERNAL_MESSAGES.admin_tenants_no_record

  return formatGreenhouseDateTime(value, 'es-CL')
}

const authModeTone = (authMode: string) => {
  if (authMode === 'credentials') return 'success'
  if (authMode === 'password_reset_pending') return 'warning'
  if (authMode === 'internal_preview') return 'info'

  return 'default'
}

// ── Columns ──

const columnHelper = createColumnHelper<TenantRow>()

 
const columns: ColumnDef<TenantRow, any>[] = [
  columnHelper.accessor('clientName', {
    header: 'Space',
    cell: ({ row }) => {
      const t = row.original

      return (
        <Stack direction='row' spacing={2} alignItems='center'>
          <CustomAvatar
            alt={t.clientName}
            src={t.logoUrl ? `/api/media/tenants/${t.clientId}/logo` : undefined}
            variant='rounded'
            size={42}
            skin={t.logoUrl ? undefined : 'light'}
            color='primary'
          >
            {!t.logoUrl ? getInitials(t.clientName) : null}
          </CustomAvatar>
          <Stack spacing={0.75}>
            <Typography component={Link} href={`/admin/tenants/${t.clientId}`} color='text.primary' className='font-medium'>
              {t.clientName}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {t.primaryContactEmail || GH_INTERNAL_MESSAGES.admin_tenants_no_contact}{' '}
              {t.hubspotCompanyId ? `· HubSpot ${t.hubspotCompanyId}` : ''}
            </Typography>
          </Stack>
        </Stack>
      )
    }
  }),
  columnHelper.accessor('status', {
    header: 'Acceso',
    cell: ({ row }) => {
      const t = row.original

      return (
        <Stack spacing={0.75}>
          <Stack direction='row' gap={1} flexWrap='wrap'>
            <Chip size='small' variant='tonal' color={t.active ? 'success' : 'default'} label={t.status} />
            <Chip size='small' variant='outlined' color={authModeTone(t.authMode)} label={t.authMode} />
          </Stack>
          <Typography variant='body2' color='text.secondary'>
            {GH_INTERNAL_MESSAGES.admin_tenants_home_label}: {t.portalHomePath || '--'}
          </Typography>
        </Stack>
      )
    }
  }),
  columnHelper.accessor('activeUsers', {
    header: 'Usuarios',
    cell: ({ row }) => (
      <Typography variant='body2'>{row.original.activeUsers} activos · {row.original.invitedUsers} invitados</Typography>
    ),
    meta: { align: 'right' }
  }),
  columnHelper.accessor('scopedProjects', {
    header: 'Scope',
    cell: ({ row }) => (
      <Typography variant='body2'>{row.original.scopedProjects} scoped · {row.original.notionProjectCount} base</Typography>
    ),
    meta: { align: 'right' }
  }),
  columnHelper.accessor('businessLines', {
    header: 'Modulos',
    cell: ({ row }) => {
      const t = row.original

      return (
        <Stack direction='row' gap={1} flexWrap='wrap'>
          {t.businessLines.map(m => <BusinessLineBadge key={m} brand={m} />)}
          {t.serviceModules.map(m => <Chip key={m} size='small' variant='outlined' label={m} />)}
          {t.businessLines.length === 0 && t.serviceModules.length === 0
            ? <Typography variant='body2' color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_tenants_no_modules}</Typography>
            : null}
        </Stack>
      )
    },
    enableSorting: false
  }),
  columnHelper.accessor('lastLoginAt', {
    header: 'Actividad',
    cell: ({ row }) => {
      const t = row.original

      return (
        <Stack spacing={0.75}>
          <Typography variant='body2'>{GH_INTERNAL_MESSAGES.admin_tenants_features_label}: {t.featureFlagCount}</Typography>
          <Typography variant='body2' color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_tenants_updated_label}: {formatDateTime(t.updatedAt)}</Typography>
          <Typography variant='body2' color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_tenants_last_login_label}: {formatDateTime(t.lastLoginAt)}</Typography>
        </Stack>
      )
    }
  })
]

// ── Component ──

const GreenhouseAdminTenants = ({ data }: Props) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'clientName', desc: false }])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data: data.tenants,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  return (
    <Stack spacing={6}>
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 4, md: 6 },
            background: 'linear-gradient(135deg, rgba(14,165,233,0.16) 0%, rgba(16,185,129,0.1) 34%, rgba(15,23,42,0) 100%)'
          }}
        >
          <Stack spacing={2}>
            <Chip label={GH_INTERNAL_MESSAGES.admin_tenants_chip} color='info' variant='outlined' sx={{ width: 'fit-content' }} />
            <Typography variant='h3'>{GH_INTERNAL_MESSAGES.admin_tenants_hero_title}</Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 920 }}>
              {GH_INTERNAL_MESSAGES.admin_tenants_hero_subtitle}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(5, minmax(0, 1fr))' }
        }}
      >
        {[
          [GH_INTERNAL_MESSAGES.admin_tenants_total_spaces, data.totals.totalTenants],
          [GH_INTERNAL_MESSAGES.admin_tenants_active_spaces, data.totals.activeTenants],
          [GH_INTERNAL_MESSAGES.admin_tenants_with_credentials, data.totals.tenantsWithCredentials],
          [GH_INTERNAL_MESSAGES.admin_tenants_pending_reset, data.totals.tenantsPendingReset],
          [GH_INTERNAL_MESSAGES.admin_tenants_with_projects, data.totals.tenantsWithScopedProjects]
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant='body2' color='text.secondary'>{label}</Typography>
                <Typography variant='h4'>{value}</Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant='h4'>{GH_INTERNAL_NAV.adminTenants.label}</Typography>
                <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_tenants_table_subtitle}</Typography>
              </Box>
              <CustomTextField value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} placeholder='Buscar Space…' sx={{ minWidth: 250 }} />
            </Box>

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
                  {table.getRowModel().rows.length === 0 ? (
                    <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}><Typography variant='body2' color='text.secondary'>{GREENHOUSE_COPY.empty.noResults}</Typography></td></tr>
                  ) : table.getRowModel().rows.map(row => (
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
            <TablePaginationComponent table={table as ReturnType<typeof useReactTable>} />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default GreenhouseAdminTenants
