'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import TablePagination from '@mui/material/TablePagination'
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

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import tableStyles from '@core/styles/table.module.css'
import { getInitials } from '@/utils/getInitials'

// ── Types ──────────────────────────────────────────────────────────────

interface OrganizationListItem {
  organizationId: string
  publicId: string
  organizationName: string
  legalName: string | null
  country: string | null
  industry: string | null
  hubspotCompanyId: string | null
  status: string
  active: boolean
  spaceCount: number
  membershipCount: number
  uniquePersonCount: number
  createdAt: string
  updatedAt: string
}

interface ListResponse {
  items: OrganizationListItem[]
  total: number
  page: number
  pageSize: number
}

// ── Helpers ────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'secondary'> = {
  active: 'success',
  inactive: 'secondary',
  prospect: 'warning',
  churned: 'error'
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  prospect: 'Prospecto',
  churned: 'Churned'
}

const COUNTRY_FLAGS: Record<string, string> = {
  CL: '\u{1F1E8}\u{1F1F1}',
  CO: '\u{1F1E8}\u{1F1F4}',
  VE: '\u{1F1FB}\u{1F1EA}',
  MX: '\u{1F1F2}\u{1F1FD}',
  PE: '\u{1F1F5}\u{1F1EA}',
  US: '\u{1F1FA}\u{1F1F8}',
  AR: '\u{1F1E6}\u{1F1F7}',
  BR: '\u{1F1E7}\u{1F1F7}',
  EC: '\u{1F1EA}\u{1F1E8}'
}

const countryFlag = (code: string | null) => (code ? COUNTRY_FLAGS[code.toUpperCase()] ?? '\u{1F310}' : '')

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeZone: 'America/Santiago'
})

const formatDate = (iso: string) => {
  try {
    return dateFormatter.format(new Date(iso))
  } catch {
    return '\u2014'
  }
}

// ── Columns ────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<OrganizationListItem>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const columns: ColumnDef<OrganizationListItem, any>[] = [
  columnHelper.accessor('organizationName', {
    header: 'Cuenta',
    cell: ({ row }) => {
      const org = row.original
      const flag = countryFlag(org.country)

      return (
        <Stack direction='row' spacing={2} alignItems='center'>
          <CustomAvatar skin='light' color='primary' size={38}>
            {getInitials(org.organizationName)}
          </CustomAvatar>
          <Stack spacing={0.25}>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {org.organizationName}
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {org.publicId}
              {flag ? ` ${flag}` : ''}
            </Typography>
          </Stack>
        </Stack>
      )
    }
  }),
  columnHelper.accessor('status', {
    header: 'Estado',
    cell: ({ getValue }) => (
      <CustomChip
        round='true'
        size='small'
        variant='tonal'
        color={STATUS_COLOR[getValue()] ?? 'secondary'}
        label={STATUS_LABEL[getValue()] ?? getValue()}
      />
    ),
    meta: { align: 'center' }
  }),
  columnHelper.accessor('spaceCount', {
    header: 'Spaces',
    cell: ({ getValue }) => <Chip size='small' label={getValue()} variant='outlined' />,
    meta: { align: 'center' }
  }),
  columnHelper.accessor('uniquePersonCount', {
    header: 'Personas',
    cell: ({ getValue }) => (
      <Typography variant='body2'>{getValue()}</Typography>
    ),
    meta: { align: 'center' }
  }),
  columnHelper.accessor('industry', {
    header: 'Industria',
    cell: ({ getValue }) => (
      <Typography variant='body2' color='text.secondary'>
        {getValue() ?? '\u2014'}
      </Typography>
    )
  }),
  columnHelper.accessor('updatedAt', {
    header: 'Actividad',
    cell: ({ getValue }) => (
      <Typography variant='body2' color='text.secondary'>
        {formatDate(getValue())}
      </Typography>
    ),
    meta: { align: 'right' }
  })
]

// ── Component ──────────────────────────────────────────────────────────

const PAGE_SIZE = 25

const AdminAccountsView = () => {
  const router = useRouter()
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'organizationName', desc: false }])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400)

    return () => clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    setLoading(true)

    const params = new URLSearchParams({
      page: String(page + 1),
      pageSize: String(pageSize)
    })

    if (searchDebounced) params.set('search', searchDebounced)

    try {
      const res = await fetch(`/api/organizations?${params}`)

      if (res.ok) setData(await res.json())
    } catch {
      // Non-blocking — keep previous data visible
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchDebounced])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  // Aggregated KPIs
  const totalOrgs = data?.total ?? 0
  const activeOrgs = useMemo(() => data?.items.filter(o => o.status === 'active').length ?? 0, [data])
  const totalSpaces = useMemo(() => data?.items.reduce((s, o) => s + o.spaceCount, 0) ?? 0, [data])
  const totalPeople = useMemo(() => data?.items.reduce((s, o) => s + o.uniquePersonCount, 0) ?? 0, [data])

  return (
    <Grid container spacing={6}>
      {/* Page header */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4' sx={{ fontWeight: 600 }}>
          Cuentas
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Gestiona organizaciones, sus spaces y configuracion operativa.
        </Typography>
      </Grid>

      {/* KPI row */}
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3, '&:last-child': { pb: 3 } }}>
                <CustomAvatar skin='light' color='primary' size={42} variant='rounded'>
                  <i className='tabler-building-community' />
                </CustomAvatar>
                <Box>
                  <Typography variant='h5' sx={{ fontWeight: 600 }}>{totalOrgs}</Typography>
                  <Typography variant='caption' color='text.secondary'>Organizaciones</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3, '&:last-child': { pb: 3 } }}>
                <CustomAvatar skin='light' color='success' size={42} variant='rounded'>
                  <i className='tabler-circle-check' />
                </CustomAvatar>
                <Box>
                  <Typography variant='h5' sx={{ fontWeight: 600 }}>{activeOrgs}</Typography>
                  <Typography variant='caption' color='text.secondary'>Activas</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3, '&:last-child': { pb: 3 } }}>
                <CustomAvatar skin='light' color='info' size={42} variant='rounded'>
                  <i className='tabler-layout-grid' />
                </CustomAvatar>
                <Box>
                  <Typography variant='h5' sx={{ fontWeight: 600 }}>{totalSpaces}</Typography>
                  <Typography variant='caption' color='text.secondary'>Spaces</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3, '&:last-child': { pb: 3 } }}>
                <CustomAvatar skin='light' color='warning' size={42} variant='rounded'>
                  <i className='tabler-users' />
                </CustomAvatar>
                <Box>
                  <Typography variant='h5' sx={{ fontWeight: 600 }}>{totalPeople}</Typography>
                  <Typography variant='caption' color='text.secondary'>Personas</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* Table card */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Organizaciones'
            subheader={data ? `${data.total} registradas` : undefined}
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-building-community' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
            action={
              <CustomTextField
                placeholder='Buscar cuenta...'
                size='small'
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setPage(0)
                }}
                sx={{ minWidth: 220 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <i className='tabler-search' style={{ fontSize: 18, marginRight: 8, opacity: 0.5 }} />
                    )
                  }
                }}
              />
            }
          />
          <Divider />

          {loading && !data ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : !data || data.items.length === 0 ? (
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 6 }} role='status'>
                <Typography variant='h6' sx={{ mb: 1 }}>
                  Sin organizaciones registradas
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {searchDebounced
                    ? `No hay resultados para \u201C${searchDebounced}\u201D. Revisa la ortografia o intenta con otras palabras.`
                    : 'Aun no hay organizaciones registradas en el sistema.'}
                </Typography>
              </Box>
            </CardContent>
          ) : (
            <>
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
                            style={{
                              textAlign:
                                (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center'
                                  ? 'center'
                                  : (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right'
                                    ? 'right'
                                    : 'left'
                            }}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{ asc: ' \u2191', desc: ' \u2193' }[header.column.getIsSorted() as string] ?? null}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map(row => (
                      <tr
                        key={row.id}
                        onClick={() => router.push(`/admin/accounts/${row.original.organizationId}`)}
                        style={{ cursor: 'pointer' }}
                        className='hover:bg-actionHover'
                      >
                        {row.getVisibleCells().map(cell => (
                          <td
                            key={cell.id}
                            style={{
                              textAlign:
                                (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center'
                                  ? 'center'
                                  : (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right'
                                    ? 'right'
                                    : 'left'
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Divider />
              <TablePagination
                component='div'
                count={data.total}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={pageSize}
                onRowsPerPageChange={e => {
                  setPageSize(Number(e.target.value))
                  setPage(0)
                }}
                rowsPerPageOptions={[10, 25, 50]}
                labelRowsPerPage='Filas por pagina'
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
              />
            </>
          )}
        </Card>
      </Grid>
    </Grid>
  )
}

export default AdminAccountsView
