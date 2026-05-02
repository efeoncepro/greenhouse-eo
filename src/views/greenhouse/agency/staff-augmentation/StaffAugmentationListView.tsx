'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import TablePagination from '@mui/material/TablePagination'
import Typography from '@mui/material/Typography'

import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import EmptyState from '@/components/greenhouse/EmptyState'

import tableStyles from '@core/styles/table.module.css'

import CreatePlacementDialog from './CreatePlacementDialog'

type PlacementListItem = {
  placementId: string
  publicId: string | null
  clientName: string | null
  memberName: string | null
  providerName: string | null
  businessUnit: string
  status: string
  lifecycleStage: string
  billingRateAmount: number | null
  billingRateCurrency: string | null
  latestSnapshotId: string | null
}

type PlacementListResponse = {
  items: PlacementListItem[]
  total: number
  summary?: {
    activeCount: number
    onboardingCount: number
    noSnapshotCount: number
  }
  page: number
  pageSize: number
}

type Props = {
  initialCreateOpen?: boolean
  initialAssignmentId?: string | null
}

const STATUS_COLOR: Record<string, 'secondary' | 'info' | 'success' | 'warning' | 'primary' | 'error'> = {
  pipeline: 'secondary',
  onboarding: 'info',
  active: 'success',
  renewal_pending: 'warning',
  renewed: 'primary',
  ended: 'error'
}

const STATUS_LABEL: Record<string, string> = {
  pipeline: 'Pipeline',
  onboarding: 'Onboarding',
  active: 'Activo',
  renewal_pending: 'Renovación',
  renewed: 'Renovado',
  ended: 'Cerrado'
}

const BU_LABEL: Record<string, string> = {
  globe: 'Globe',
  efeonce_digital: 'Efeonce Digital',
  reach: 'Reach',
  wave: 'Wave',
  crm_solutions: 'CRM Solutions'
}

const formatMoney = (amount: number | null, currency: string | null) => {
  if (amount == null) return '—'

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0
  }).format(amount)
}

const columnHelper = createColumnHelper<PlacementListItem>()

 
const columns: ColumnDef<PlacementListItem, any>[] = [
  columnHelper.accessor('publicId', {
    header: 'Placement',
    cell: ({ row }) => (
      <Box>
        <Typography
          component={Link}
          href={`/agency/staff-augmentation/${row.original.placementId}`}
          variant='body2'
          fontWeight={600}
          color='text.primary'
          sx={{ textDecoration: 'none' }}
        >
          {row.original.memberName || 'Sin miembro'}
        </Typography>
        <Typography variant='caption' color='text.secondary'>
          {row.original.publicId || row.original.placementId}
        </Typography>
      </Box>
    )
  }),
  columnHelper.accessor('clientName', {
    header: 'Cliente',
    cell: ({ getValue }) => <Typography variant='body2'>{getValue() || '—'}</Typography>
  }),
  columnHelper.accessor('businessUnit', {
    header: 'BU',
    cell: ({ getValue }) => <Typography variant='body2'>{BU_LABEL[getValue()] || getValue()}</Typography>
  }),
  columnHelper.accessor('status', {
    header: 'Estado',
    cell: ({ getValue }) => (
      <CustomChip
        size='small'
        round='true'
        variant='tonal'
        color={STATUS_COLOR[getValue()] || 'secondary'}
        label={STATUS_LABEL[getValue()] || getValue()}
      />
    )
  }),
  columnHelper.accessor('providerName', {
    header: 'Provider',
    cell: ({ getValue }) => <Typography variant='body2'>{getValue() || 'Directo'}</Typography>
  }),
  columnHelper.accessor('billingRateAmount', {
    header: 'Billing',
    cell: ({ row }) => <Typography variant='body2'>{formatMoney(row.original.billingRateAmount, row.original.billingRateCurrency)}</Typography>
  }),
  columnHelper.accessor('latestSnapshotId', {
    header: 'Snapshot',
    cell: ({ getValue }) => <Typography variant='body2'>{getValue() ? 'Snapshot activo' : 'Sin snapshot'}</Typography>
  })
]

const StaffAugmentationListView = ({ initialCreateOpen = false, initialAssignmentId = null }: Props) => {
  const router = useRouter()
  const [data, setData] = useState<PlacementListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [status, setStatus] = useState('')
  const [businessUnit, setBusinessUnit] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'publicId', desc: false }])

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 350)

    return () => clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(page + 1),
        pageSize: String(pageSize)
      })

      if (searchDebounced) params.set('search', searchDebounced)
      if (status) params.set('status', status)
      if (businessUnit) params.set('businessUnit', businessUnit)

      const res = await fetch(`/api/agency/staff-augmentation/placements?${params}`, { cache: 'no-store' })
      const json = (await res.json()) as PlacementListResponse

      setData(json)
    } catch {
      setError('No pudimos cargar los placements. Verifica tu conexión e intenta de nuevo.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [businessUnit, page, pageSize, searchDebounced, status])

  useEffect(() => {
    loadData()
  }, [loadData])

  const items = data?.items || []
  const total = data?.total || 0
  const activeCount = data?.summary?.activeCount ?? 0
  const onboardingCount = data?.summary?.onboardingCount ?? 0
  const noSnapshotCount = data?.summary?.noSnapshotCount ?? 0

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Placements' stats={String(total)} subtitle='Pipeline total' avatarIcon='tabler-briefcase-2' avatarColor='primary' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Activos' stats={String(activeCount)} subtitle='En servicio' avatarIcon='tabler-circle-check' avatarColor='success' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Onboarding' stats={String(onboardingCount)} subtitle='Setup con cliente' avatarIcon='tabler-rocket' avatarColor='info' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Sin snapshot' stats={String(noSnapshotCount)} subtitle='Pendientes de 360' avatarIcon='tabler-chart-donut-3' avatarColor='warning' />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardHeader
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}><i className='tabler-users-plus' /></Avatar>}
            title='Staff Augmentation'
            subheader='Placements comerciales sobre assignments canónicos, con lectura Finance, Payroll y tooling.'
            action={<Button component={Link} href='/agency/staff-augmentation/create' variant='contained'>Crear placement</Button>}
          />
          <Divider />
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <CustomTextField
                placeholder='Buscar por miembro, cliente o ID…'
                value={search}
                onChange={event => { setSearch(event.target.value); setPage(0) }}
                sx={{ minWidth: 260 }}
              />
              <CustomTextField select label='Estado' value={status} onChange={event => { setStatus(event.target.value); setPage(0) }} sx={{ minWidth: 180 }}>
                <MenuItem value=''>Todos</MenuItem>
                <MenuItem value='pipeline'>Pipeline</MenuItem>
                <MenuItem value='onboarding'>Onboarding</MenuItem>
                <MenuItem value='active'>Activo</MenuItem>
                <MenuItem value='renewal_pending'>Renovación</MenuItem>
                <MenuItem value='ended'>Cerrado</MenuItem>
              </CustomTextField>
              <CustomTextField select label='Business Unit' value={businessUnit} onChange={event => { setBusinessUnit(event.target.value); setPage(0) }} sx={{ minWidth: 220 }}>
                <MenuItem value=''>Todas</MenuItem>
                <MenuItem value='globe'>Globe</MenuItem>
                <MenuItem value='efeonce_digital'>Efeonce Digital</MenuItem>
                <MenuItem value='reach'>Reach</MenuItem>
                <MenuItem value='wave'>Wave</MenuItem>
                <MenuItem value='crm_solutions'>CRM Solutions</MenuItem>
              </CustomTextField>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 12 }}>
                <CircularProgress />
                <Typography variant='body2' color='text.secondary'>Cargando placements...</Typography>
              </Box>
            ) : error ? (
              <EmptyState
                icon='tabler-cloud-off'
                title='No pudimos cargar los placements'
                description={error}
                action={<Button variant='outlined' onClick={() => loadData()}>Reintentar</Button>}
              />
            ) : items.length === 0 ? (
              <EmptyState
                icon='tabler-briefcase-off'
                animatedIcon='/animations/empty-inbox.json'
                title='Sin placements'
                description='No se encontraron placements con los filtros seleccionados.'
              />
            ) : (
              <>
                <Box sx={{ overflowX: 'auto' }}>
                  <table className={tableStyles.table}>
                    <thead>
                      {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map(header => (
                            <th key={header.id}>
                              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map(row => (
                        <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
                <TablePagination
                  component='div'
                  rowsPerPageOptions={[10, 25, 50]}
                  count={total}
                  rowsPerPage={pageSize}
                  page={page}
                  onPageChange={(_event, nextPage) => setPage(nextPage)}
                  onRowsPerPageChange={event => {
                    setPageSize(Number(event.target.value))
                    setPage(0)
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
      {initialCreateOpen ? (
        <CreatePlacementDialog
          open
          initialAssignmentId={initialAssignmentId}
          onClose={() => router.push('/agency/staff-augmentation')}
          onCreated={placementId => router.push(`/agency/staff-augmentation/${placementId}`)}
        />
      ) : null}
    </Grid>
  )
}

export default StaffAugmentationListView
