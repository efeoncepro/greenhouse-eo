'use client'

import { useCallback, useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import { toast } from 'react-toastify'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

import {
  createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel,
  getPaginationRowModel, getSortedRowModel, useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import TablePaginationComponent from '@components/TablePaginationComponent'
import { fuzzyFilter } from '@/components/tableUtils'

import tableStyles from '@core/styles/table.module.css'

// ── Client columns ──

const cliColumnHelper = createColumnHelper<ClientProfile>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cliColumns: ColumnDef<ClientProfile, any>[] = [
  cliColumnHelper.accessor('legalName', {
    header: 'Razón social',
    cell: ({ row }) => (
      <Box>
        <Typography variant='body2' fontWeight={600}>{row.original.legalName || row.original.clientProfileId}</Typography>
        <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{row.original.hubspotCompanyId}</Typography>
      </Box>
    )
  }),
  cliColumnHelper.accessor('taxId', {
    header: 'RUT',
    cell: ({ getValue }) => <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{getValue() || '—'}</Typography>
  }),
  cliColumnHelper.accessor('paymentTermsDays', {
    header: 'Plazo',
    cell: ({ getValue }) => `${getValue()} días`
  }),
  cliColumnHelper.accessor('paymentCurrency', {
    header: 'Moneda',
    cell: ({ getValue }) => <Typography variant='body2' fontWeight={500}>{getValue()}</Typography>
  }),
  cliColumnHelper.accessor('requiresPo', {
    header: 'OC',
    cell: ({ getValue }) => getValue() ? <CustomChip round='true' size='small' color='warning' label='Sí' /> : <Typography variant='caption' color='text.secondary'>No</Typography>,
    meta: { align: 'center' }
  }),
  cliColumnHelper.accessor('requiresHes', {
    header: 'HES',
    cell: ({ getValue }) => getValue() ? <CustomChip round='true' size='small' color='info' label='Sí' /> : <Typography variant='caption' color='text.secondary'>No</Typography>,
    meta: { align: 'center' }
  })
]
import CreateClientDrawer from '@views/greenhouse/finance/drawers/CreateClientDrawer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientProfile {
  clientProfileId: string
  hubspotCompanyId: string | null
  legalName: string | null
  taxId: string | null
  paymentTermsDays: number
  paymentCurrency: string
  requiresPo: boolean
  requiresHes: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ClientsListView = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<ClientProfile[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [poFilter, setPoFilter] = useState('')
  const [hesFilter, setHesFilter] = useState('')
  const [error, setError] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'legalName', desc: false }])
  const [globalFilter, setGlobalFilter] = useState('')

  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()

      if (search) params.set('search', search)
      if (poFilter === 'true') params.set('requiresPo', 'true')
      if (hesFilter === 'true') params.set('requiresHes', 'true')

      const res = await fetch(`/api/finance/clients?${params.toString()}`, { cache: 'no-store' })

      if (res.ok) {
        const data = await res.json()

        setClients(data.items ?? [])
        setTotal(data.total ?? 0)

        return
      }

      const data = await res.json().catch(() => ({}))

      setClients([])
      setTotal(0)
      setError(data.error || `No pudimos cargar los clientes (${res.status}).`)
    } catch {
      setClients([])
      setTotal(0)
      setError('No pudimos cargar los clientes. Revisa la conexión o intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }, [search, poFilter, hesFilter])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const cliTable = useReactTable({
    data: clients,
    columns: cliColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  // Derived KPIs
  const poCount = clients.filter(c => c.requiresPo).length
  const hesCount = clients.filter(c => c.requiresHes).length
  const usdCount = clients.filter(c => c.paymentCurrency === 'USD').length

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading && clients.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box>
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>
            Clientes
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Perfil financiero de clientes
          </Typography>
        </Box>
        <Grid container spacing={6}>
          {[0, 1, 2, 3].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant='rounded' height={120} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={400} />
      </Box>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 1 }}>
            Clientes
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Perfil financiero de clientes
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant='outlined'
            color='info'
            startIcon={<i className={syncing ? 'tabler-loader-2' : 'tabler-refresh'} />}
            disabled={syncing}
            onClick={async () => {
              setSyncing(true)

              try {
                const res = await fetch('/api/finance/clients/sync', { method: 'POST' })

                if (res.ok) {
                  const data = await res.json()

                  toast.success(data.message || 'Clientes sincronizados')
                  fetchClients()
                } else {
                  const data = await res.json().catch(() => ({}))

                  toast.error(data.error || `Error al sincronizar (${res.status})`)
                }
              } catch {
                toast.error('Error de conexion al sincronizar')
              } finally {
                setSyncing(false)
              }
            }}
          >
            {syncing ? 'Sincronizando...' : 'Sincronizar clientes'}
          </Button>
          <Button
            variant='contained'
            color='primary'
            startIcon={<i className='tabler-plus' />}
            onClick={() => setDrawerOpen(true)}
          >
            Nuevo perfil
          </Button>
        </Box>
      </Box>

      {/* KPIs */}
      {error ? <Alert severity='error'>{error}</Alert> : null}

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Total clientes'
            stats={String(total)}
            subtitle='Perfiles financieros'
            avatarIcon='tabler-users-group'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Requieren OC'
            stats={String(poCount)}
            subtitle='Orden de compra obligatoria'
            avatarIcon='tabler-file-check'
            avatarColor='warning'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Requieren HES'
            stats={String(hesCount)}
            subtitle='Hoja de entrada de servicio'
            avatarIcon='tabler-file-description'
            avatarColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Facturación USD'
            stats={String(usdCount)}
            subtitle='Clientes en dólares'
            avatarIcon='tabler-currency-dollar'
            avatarColor='success'
          />
        </Grid>
      </Grid>

      {/* Filters + Table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Directorio de clientes'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
              <i className='tabler-users-group' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <CustomTextField
            size='small'
            placeholder='Buscar por nombre o RUT...'
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ minWidth: 240 }}
            InputProps={{
              startAdornment: <i className='tabler-search' style={{ fontSize: 18, marginRight: 8, color: 'var(--mui-palette-text-secondary)' }} />
            }}
          />
          <CustomTextField
            select
            size='small'
            value={poFilter}
            onChange={e => setPoFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value=''>OC: Todos</MenuItem>
            <MenuItem value='true'>Requiere OC</MenuItem>
          </CustomTextField>
          <CustomTextField
            select
            size='small'
            value={hesFilter}
            onChange={e => setHesFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value=''>HES: Todos</MenuItem>
            <MenuItem value='true'>Requiere HES</MenuItem>
          </CustomTextField>
        </CardContent>
        <Divider />
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              {cliTable.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => (
                    <th key={header.id} onClick={header.column.getToggleSortingHandler()} className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })} style={{ textAlign: (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {cliTable.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={cliColumns.length} style={{ textAlign: 'center', padding: '3rem' }}><Typography variant='body2' color='text.secondary'>No hay perfiles de clientes registrados aún</Typography></td></tr>
              ) : cliTable.getRowModel().rows.map(row => (
                <tr key={row.id} className='cursor-pointer' onClick={() => router.push(`/finance/clients/${row.original.clientProfileId}`)}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePaginationComponent table={cliTable as ReturnType<typeof useReactTable>} />
      </Card>

      <CreateClientDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSuccess={() => { setDrawerOpen(false); fetchClients() }} />
    </Box>
  )
}

export default ClientsListView
