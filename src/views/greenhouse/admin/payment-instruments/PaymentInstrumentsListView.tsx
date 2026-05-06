'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import { getMicrocopy } from '@/lib/copy'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import tableStyles from '@core/styles/table.module.css'

import PaymentInstrumentChip from '@/components/greenhouse/PaymentInstrumentChip'
import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import {
  INSTRUMENT_CATEGORY_COLORS,
  INSTRUMENT_CATEGORY_LABELS,
  type InstrumentCategory
} from '@/config/payment-instruments'

import CreatePaymentInstrumentDrawer from './CreatePaymentInstrumentDrawer'
import {
  adaptPaymentInstrumentList,
  normalizeDefaultFor,
  type PaymentInstrumentListItem,
  type PaymentInstrumentListResponse,
  type ReadinessStatus
} from './paymentInstrumentAdminAdapters'

const TASK407_ARIA_ACTUALIZANDO_INSTRUMENTOS_DE_PAGO = "Actualizando instrumentos de pago"
const TASK407_ARIA_BUSCAR_INSTRUMENTOS_DE_PAGO = "Buscar instrumentos de pago"
const TASK407_ARIA_CARGANDO_TABLA_DE_INSTRUMENTOS = "Cargando tabla de instrumentos"


const GREENHOUSE_COPY = getMicrocopy()
const columnHelper = createColumnHelper<PaymentInstrumentListItem>()

const readinessTone: Record<ReadinessStatus, { label: string; color: 'success' | 'warning' | 'error' | 'secondary'; icon: string }> = {
  ready: { label: 'Listo', color: 'success', icon: 'tabler-circle-check' },
  needs_configuration: { label: 'Configurar', color: 'warning', icon: 'tabler-alert-triangle' },
  at_risk: { label: 'En riesgo', color: 'error', icon: 'tabler-circle-x' },
  inactive: { label: GREENHOUSE_COPY.states.inactive, color: 'secondary', icon: 'tabler-player-pause' }
}

const EmptyState = ({ search, onCreate }: { search: string; onCreate: () => void }) => (
  <CardContent>
    <Box sx={{ border: theme => `1px dashed ${theme.palette.divider}`, borderRadius: 1, py: 8, px: 4, textAlign: 'center' }} role='status'>
      <i className='tabler-credit-card-off' style={{ fontSize: 38, color: GH_COLORS.brand.coreBlue }} />
      <Typography variant='h6' sx={{ mt: 2 }}>
        {search ? 'No encontramos instrumentos con ese filtro' : 'Aun no hay instrumentos registrados'}
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 560, mx: 'auto', mb: 4 }}>
        {search
          ? 'Prueba con proveedor, moneda, categoria o nombre visible. La busqueda no usa datos sensibles completos.'
          : 'Registra cuentas bancarias, tarjetas o plataformas para habilitar ruteo de cobros, pagos y conciliacion.'}
      </Typography>
      {!search ? (
        <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={onCreate}>
          Agregar instrumento
        </Button>
      ) : null}
    </Box>
  </CardContent>
)

const SummaryTile = ({
  icon,
  label,
  value,
  helper,
  color = 'primary'
}: {
  icon: string
  label: string
  value: number | string
  helper: string
  color?: 'primary' | 'info' | 'success' | 'warning' | 'error'
}) => (
  <Box sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 3, height: '100%' }}>
    <Stack direction='row' spacing={2.5} alignItems='center'>
      <CustomAvatar skin='light' color={color} size={42} variant='rounded'>
        <i className={icon} />
      </CustomAvatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant='h5' sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
        <Typography variant='body2' sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant='caption' color='text.secondary'>
          {helper}
        </Typography>
      </Box>
    </Stack>
  </Box>
)

const PaymentInstrumentsListView = () => {
  const router = useRouter()
  const [data, setData] = useState<PaymentInstrumentListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'instrumentName', desc: false }])
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchDebounced(search), 300)

    return () => window.clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch('/api/admin/payment-instruments', { cache: 'no-store' })

      if (!res.ok) {
        setError(`No pudimos cargar instrumentos de pago (HTTP ${res.status}).`)

        return
      }

      setData(adaptPaymentInstrumentList(await res.json()))
      setError(null)
    } catch {
      setError('No pudimos conectar con el servidor. Revisa la conexion o reintenta.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredItems = useMemo(() => {
    const items = data?.items ?? []
    const query = searchDebounced.trim().toLowerCase()

    if (!query) return items

    return items.filter(
      item =>
        item.instrumentName.toLowerCase().includes(query) ||
        (item.providerName ?? '').toLowerCase().includes(query) ||
        (INSTRUMENT_CATEGORY_LABELS[item.instrumentCategory] ?? '').toLowerCase().includes(query) ||
        item.currency.toLowerCase().includes(query) ||
        item.defaultFor.some(value => normalizeDefaultFor(value).toLowerCase().includes(query))
    )
  }, [data?.items, searchDebounced])

  const columns = useMemo<ColumnDef<PaymentInstrumentListItem, any>[]>(
    () => [
      columnHelper.accessor('instrumentName', {
        header: 'Instrumento',
        cell: ({ row }) => (
          <Stack spacing={0.5}>
            <PaymentInstrumentChip
              providerSlug={row.original.providerSlug}
              instrumentName={row.original.instrumentName}
              instrumentCategory={row.original.instrumentCategory}
              size='md'
            />
            <Typography variant='caption' color='text.secondary'>
              {row.original.maskedIdentifier ?? 'Sin identificador visible'}
            </Typography>
          </Stack>
        )
      }),
      columnHelper.accessor('instrumentCategory', {
        header: 'Categoria',
        cell: ({ getValue }) => {
          const category = getValue() as InstrumentCategory

          return (
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={INSTRUMENT_CATEGORY_COLORS[category] ?? 'secondary'}
              label={INSTRUMENT_CATEGORY_LABELS[category] ?? category}
            />
          )
        }
      }),
      columnHelper.accessor('providerName', {
        header: 'Proveedor',
        cell: ({ getValue }) => (
          <Typography variant='body2' color='text.secondary'>
            {getValue() ?? 'No configurado'}
          </Typography>
        )
      }),
      columnHelper.accessor('currency', {
        header: 'Moneda',
        cell: ({ getValue }) => (
          <Typography variant='body2' sx={{ fontWeight: 700 }}>
            {getValue()}
          </Typography>
        ),
        meta: { align: 'center' }
      }),
      columnHelper.accessor('readinessStatus', {
        header: 'Readiness',
        cell: ({ getValue }) => {
          const tone = readinessTone[getValue() as ReadinessStatus]

          return (
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={tone.color}
              label={tone.label}
              icon={<i className={tone.icon} />}
            />
          )
        }
      }),
      columnHelper.accessor('defaultFor', {
        header: 'Ruteo',
        cell: ({ getValue }) => {
          const values = getValue() as string[]

          return (
            <Typography variant='body2' color='text.secondary'>
              {values.length ? values.map(normalizeDefaultFor).join(', ') : 'Sin default'}
            </Typography>
          )
        }
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Accion',
        cell: ({ row }) => (
          <Tooltip title={`Administrar ${row.original.instrumentName}`}>
            <IconButton
              size='small'
              aria-label={`Administrar ${row.original.instrumentName}`}
              onClick={event => {
                event.stopPropagation()
                router.push(`/admin/payment-instruments/${row.original.accountId}`)
              }}
            >
              <i className='tabler-arrow-right' />
            </IconButton>
          </Tooltip>
        ),
        meta: { align: 'right' }
      })
    ],
    [router]
  )

  const table = useReactTable({
    data: filteredItems,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  })

  const totalInstruments = data?.items.length ?? 0
  const activeCount = data?.items.filter(item => item.active).length ?? 0
  const needsConfiguration = data?.items.filter(item => item.readinessStatus !== 'ready').length ?? 0
  const bankAccounts = data?.items.filter(item => item.instrumentCategory === 'bank_account').length ?? 0
  const highImpact = data?.items.filter(item => item.impactScore > 0).length ?? 0

  return (
    <Grid container spacing={5}>
      <Grid size={{ xs: 12 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent='space-between' alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Box>
            <Typography variant='h4' sx={{ fontWeight: 700 }}>
              Instrumentos de pago
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Administra cuentas, tarjetas y plataformas usadas por Banco, Cobros, Pagos y Conciliacion.
            </Typography>
          </Box>
          <Stack direction='row' spacing={2} useFlexGap flexWrap='wrap'>
            <Button variant='tonal' color='secondary' onClick={() => void loadData('refresh')} startIcon={<i className='tabler-refresh' />}>
              Actualizar
            </Button>
            <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setDrawerOpen(true)}>
              Agregar instrumento
            </Button>
          </Stack>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            {loading && !data ? <Skeleton variant='rounded' height={104} /> : <SummaryTile icon='tabler-credit-card' label='Total' value={totalInstruments} helper={`${activeCount} activos`} />}
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            {loading && !data ? <Skeleton variant='rounded' height={104} /> : <SummaryTile icon='tabler-building-bank' label='Cuentas bancarias' value={bankAccounts} helper='Base treasury' color='info' />}
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            {loading && !data ? <Skeleton variant='rounded' height={104} /> : <SummaryTile icon='tabler-alert-triangle' label='Por configurar' value={needsConfiguration} helper='Readiness incompleto' color={needsConfiguration ? 'warning' : 'success'} />}
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            {loading && !data ? <Skeleton variant='rounded' height={104} /> : <SummaryTile icon='tabler-scale' label='Con impacto' value={highImpact} helper='Segun contrato backend' color={highImpact ? 'warning' : 'success'} />}
          </Grid>
        </Grid>
      </Grid>

      {error ? (
        <Grid size={{ xs: 12 }}>
          <Alert
            severity='error'
            action={
              <Button color='inherit' size='small' onClick={() => void loadData('refresh')}>
                Reintentar
              </Button>
            }
          >
            {error}
          </Alert>
        </Grid>
      ) : null}

      {data?.partial ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='warning'>
            La lista esta recibiendo un contrato parcial. La vista mantiene busqueda y navegacion, pero readiness e impacto pueden completarse cuando backend entregue TASK-697.
          </Alert>
        </Grid>
      ) : null}

      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          {refreshing ? <LinearProgress aria-label={TASK407_ARIA_ACTUALIZANDO_INSTRUMENTOS_DE_PAGO} /> : null}
          <CardHeader
            title='Registro operativo'
            subheader={data ? `${filteredItems.length} de ${data.total} instrumentos visibles` : 'Cargando instrumentos'}
            action={
              <CustomTextField
                placeholder='Buscar por nombre, proveedor, moneda o ruteo'
                size='small'
                value={search}
                onChange={event => setSearch(event.target.value)}
                sx={{ minWidth: { xs: 220, sm: 360 } }}
                aria-label={TASK407_ARIA_BUSCAR_INSTRUMENTOS_DE_PAGO}
                slotProps={{
                  input: {
                    startAdornment: <i className='tabler-search' style={{ fontSize: 18, marginRight: 8, opacity: 0.6 }} />
                  }
                }}
              />
            }
          />
          <Divider />

          {loading && !data ? (
            <CardContent>
              <Stack spacing={2} role='status' aria-label={TASK407_ARIA_CARGANDO_TABLA_DE_INSTRUMENTOS}>
                {[0, 1, 2, 3, 4].map(item => (
                  <Skeleton key={item} variant='rounded' height={58} />
                ))}
              </Stack>
            </CardContent>
          ) : !filteredItems.length ? (
            <EmptyState search={searchDebounced} onCreate={() => setDrawerOpen(true)} />
          ) : (
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => {
                        const align = ((header.column.columnDef.meta as { align?: CSSProperties['textAlign'] } | undefined)?.align ?? 'left') as CSSProperties['textAlign']

                        return (
                          <th
                            key={header.id}
                            onClick={header.column.getToggleSortingHandler()}
                            className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })}
                            aria-sort={
                              header.column.getIsSorted() === 'asc'
                                ? 'ascending'
                                : header.column.getIsSorted() === 'desc'
                                  ? 'descending'
                                  : 'none'
                            }
                            style={{ textAlign: align }}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                          </th>
                        )
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map(row => (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/admin/payment-instruments/${row.original.accountId}`)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') router.push(`/admin/payment-instruments/${row.original.accountId}`)
                      }}
                      tabIndex={0}
                      role='link'
                      aria-label={`Administrar ${row.original.instrumentName}`}
                      style={{ cursor: 'pointer' }}
                      className='hover:bg-actionHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary'
                    >
                      {row.getVisibleCells().map(cell => {
                        const align = ((cell.column.columnDef.meta as { align?: CSSProperties['textAlign'] } | undefined)?.align ?? 'left') as CSSProperties['textAlign']

                        return (
                          <td key={cell.id} style={{ textAlign: align }}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Grid>

      <CreatePaymentInstrumentDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSuccess={() => void loadData('refresh')} />
    </Grid>
  )
}

export default PaymentInstrumentsListView
