'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import classnames from 'classnames'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import tableStyles from '@core/styles/table.module.css'

import EmploymentTypeDrawer, {
  type EmploymentTypeFormValues
} from './drawers/EmploymentTypeDrawer'

// ── Types ──────────────────────────────────────────────────────────────

interface EmploymentTypeRow {
  employmentTypeCode: string
  labelEs: string
  labelEn: string | null
  paymentCurrency: string
  countryCode: string
  appliesPrevisional: boolean
  previsionalPctDefault: number | null
  feeMonthlyUsdDefault: number
  feePctDefault: number | null
  appliesBonuses: boolean
  sourceOfTruth: string
  effectiveFrom: string
  notes: string | null
  active: boolean
}

interface GovernanceResponse {
  employmentTypes: EmploymentTypeRow[]
}

const SOURCE_LABELS: Record<string, string> = {
  greenhouse_payroll_chile_rates: 'Greenhouse Payroll (Chile)',
  manual: 'Manual',
  deel: 'Deel',
  eor: 'EOR'
}

const formatSourceLabel = (source: string) => SOURCE_LABELS[source] ?? source

const formatPct = (value: number | null): string =>
  value === null || value === undefined ? '—' : `${value}%`

const formatCurrency = (value: number | null | undefined, currency = 'USD'): string => {
  if (value === null || value === undefined) return '—'

  return `${currency} ${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(value)}`
}

// ── Columns ────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<EmploymentTypeRow>()

const buildColumns = (
  onToggleActive: (row: EmploymentTypeRow, next: boolean) => void,
  togglingCode: string | null,
  onEdit: (row: EmploymentTypeRow) => void

 
): ColumnDef<EmploymentTypeRow, any>[] => [
  columnHelper.accessor('employmentTypeCode', {
    header: 'Código',
    cell: ({ getValue }) => (
      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
        {getValue()}
      </Typography>
    )
  }),
  columnHelper.accessor('labelEs', {
    header: 'Nombre',
    cell: ({ row }) => (
      <Box>
        <Typography variant='body2' sx={{ fontWeight: 500 }}>
          {row.original.labelEs}
        </Typography>
        {row.original.labelEn ? (
          <Typography variant='caption' color='text.secondary'>
            {row.original.labelEn}
          </Typography>
        ) : null}
      </Box>
    )
  }),
  columnHelper.accessor('paymentCurrency', {
    header: 'Moneda',
    cell: ({ getValue }) => (
      <CustomChip round='true' size='small' variant='tonal' color='info' label={getValue() as string} />
    )
  }),
  columnHelper.accessor('countryCode', {
    header: 'País',
    cell: ({ getValue }) => (
      <Typography variant='body2' sx={{ fontWeight: 500 }}>
        {getValue() || '—'}
      </Typography>
    )
  }),
  columnHelper.accessor('appliesPrevisional', {
    header: 'Previsional',
    cell: ({ getValue }) => {
      const applies = getValue() as boolean

      return (
        <CustomChip
          round='true'
          size='small'
          variant='tonal'
          color={applies ? 'success' : 'secondary'}
          label={applies ? 'Sí' : 'No'}
        />
      )
    },
    meta: { align: 'center' }
  }),
  columnHelper.accessor('previsionalPctDefault', {
    header: '% previsional',
    cell: ({ getValue }) => (
      <Typography variant='body2'>{formatPct(getValue() as number | null)}</Typography>
    ),
    meta: { align: 'right' }
  }),
  columnHelper.accessor('feeMonthlyUsdDefault', {
    header: 'Fee mensual',
    cell: ({ getValue }) => (
      <Typography variant='body2'>{formatCurrency(getValue() as number, 'USD')}</Typography>
    ),
    meta: { align: 'right' }
  }),
  columnHelper.accessor('sourceOfTruth', {
    header: 'Fuente',
    cell: ({ getValue }) => (
      <CustomChip
        round='true'
        size='small'
        variant='tonal'
        color='secondary'
        label={formatSourceLabel(getValue() as string)}
      />
    )
  }),
  columnHelper.accessor('active', {
    header: 'Estado',
    cell: ({ row }) => {
      const item = row.original
      const isToggling = togglingCode === item.employmentTypeCode

      return (
        <Stack direction='row' spacing={1} alignItems='center' onClick={e => e.stopPropagation()}>
          <Switch
            checked={item.active}
            onChange={(_, checked) => onToggleActive(item, checked)}
            size='small'
            disabled={isToggling}
            inputProps={{
              'aria-label': `${item.active ? 'Desactivar' : 'Reactivar'} ${item.labelEs}`
            }}
          />
          <CustomChip
            round='true'
            size='small'
            variant='tonal'
            color={item.active ? 'success' : 'secondary'}
            label={item.active ? 'Activa' : 'Inactiva'}
          />
        </Stack>
      )
    },
    meta: { align: 'center' }
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => (
      <Stack direction='row' spacing={1} alignItems='center' onClick={e => e.stopPropagation()}>
        <Tooltip title='Editar modalidad'>
          <IconButton
            size='small'
            onClick={() => onEdit(row.original)}
            aria-label={`Editar ${row.original.labelEs}`}
          >
            <i className='tabler-edit' style={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    ),
    meta: { align: 'center' }
  })
]

// ── Component ──────────────────────────────────────────────────────────

const EmploymentTypesListView = () => {
  const [items, setItems] = useState<EmploymentTypeRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [countryFilter, setCountryFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'labelEs', desc: false }])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<EmploymentTypeFormValues | null>(null)
  const [togglingCode, setTogglingCode] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400)

    return () => clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/admin/pricing-catalog/governance')

      if (res.ok) {
        const body = (await res.json()) as GovernanceResponse

        setItems(body.employmentTypes ?? [])
        setError(null)
      } else {
        setError(`No pudimos cargar las modalidades (HTTP ${res.status}).`)
      }
    } catch {
      setError('No se pudo conectar al servidor. Verifica tu conexión.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleToggleActive = useCallback(
    async (row: EmploymentTypeRow, next: boolean) => {
      setTogglingCode(row.employmentTypeCode)

      try {
        const res = await fetch('/api/admin/pricing-catalog/governance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'employment_type',
            payload: {
              employmentTypeCode: row.employmentTypeCode,
              labelEs: row.labelEs,
              labelEn: row.labelEn,
              paymentCurrency: row.paymentCurrency,
              countryCode: row.countryCode,
              appliesPrevisional: row.appliesPrevisional,
              previsionalPctDefault: row.previsionalPctDefault,
              feeMonthlyUsdDefault: row.feeMonthlyUsdDefault,
              feePctDefault: row.feePctDefault,
              appliesBonuses: row.appliesBonuses,
              sourceOfTruth: row.sourceOfTruth,
              notes: row.notes,
              active: next
            }
          })
        })

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))

          toast.error(payload.error || 'No pudimos actualizar el estado de la modalidad.')

          return
        }

        toast.success(
          next
            ? `${row.labelEs} reactivada`
            : `${row.labelEs} desactivada — no aparecerá en nuevas cotizaciones`
        )
        await loadData()
      } catch {
        toast.error('No se pudo conectar al servidor.')
      } finally {
        setTogglingCode(null)
      }
    },
    [loadData]
  )

  const countryOptions = useMemo(() => {
    if (!items) return []
    const set = new Set(items.map(i => i.countryCode).filter(Boolean))

    return Array.from(set).sort()
  }, [items])

  const sourceOptions = useMemo(() => {
    if (!items) return []
    const set = new Set(items.map(i => i.sourceOfTruth).filter(Boolean))

    return Array.from(set).sort()
  }, [items])

  const filteredItems = useMemo(() => {
    if (!items) return []

    return items.filter(item => {
      if (countryFilter !== 'all' && item.countryCode !== countryFilter) return false
      if (sourceFilter !== 'all' && item.sourceOfTruth !== sourceFilter) return false
      if (statusFilter === 'active' && !item.active) return false
      if (statusFilter === 'inactive' && item.active) return false

      if (searchDebounced) {
        const q = searchDebounced.toLowerCase()

        const matches =
          item.employmentTypeCode.toLowerCase().includes(q) ||
          item.labelEs.toLowerCase().includes(q) ||
          (item.labelEn?.toLowerCase().includes(q) ?? false)

        if (!matches) return false
      }

      return true
    })
  }, [items, searchDebounced, countryFilter, sourceFilter, statusFilter])

  const handleCreate = useCallback(() => {
    setEditing(null)
    setDrawerMode('create')
    setDrawerOpen(true)
  }, [])

  const handleEdit = useCallback((row: EmploymentTypeRow) => {
    setEditing({
      employmentTypeCode: row.employmentTypeCode,
      labelEs: row.labelEs,
      labelEn: row.labelEn,
      paymentCurrency: row.paymentCurrency,
      countryCode: row.countryCode,
      appliesPrevisional: row.appliesPrevisional,
      previsionalPctDefault: row.previsionalPctDefault,
      feeMonthlyUsdDefault: row.feeMonthlyUsdDefault,
      feePctDefault: row.feePctDefault,
      appliesBonuses: row.appliesBonuses,
      sourceOfTruth: row.sourceOfTruth,
      active: row.active,
      notes: row.notes
    })
    setDrawerMode('edit')
    setDrawerOpen(true)
  }, [])

  const columns = useMemo(
    () => buildColumns(handleToggleActive, togglingCode, handleEdit),
    [handleToggleActive, togglingCode, handleEdit]
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

  const totalActive = useMemo(() => items?.filter(i => i.active).length ?? 0, [items])
  const totalInactive = useMemo(() => items?.filter(i => !i.active).length ?? 0, [items])

  const hasFilters =
    Boolean(searchDebounced) ||
    countryFilter !== 'all' ||
    sourceFilter !== 'all' ||
    statusFilter !== 'active'

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 1 }}>
          <Tooltip title='Volver al catálogo'>
            <IconButton
              component='a'
              href='/admin/pricing-catalog'
              size='small'
              aria-label='Volver al catálogo'
            >
              <i className='tabler-arrow-left' />
            </IconButton>
          </Tooltip>
          <Typography variant='h4' sx={{ fontWeight: 600 }}>
            Modalidades de contrato
          </Typography>
        </Stack>
        <Typography variant='body2' color='text.secondary'>
          Cómo se contrata a las personas asignadas a cada rol vendible: moneda, cargas
          previsionales y fees.
        </Typography>
      </Grid>

      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert
            severity='error'
            action={
              <Button color='inherit' size='small' onClick={() => void loadData()}>
                Reintentar
              </Button>
            }
          >
            {error}
          </Alert>
        </Grid>
      )}

      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Modalidades registradas'
            subheader={
              items
                ? `${filteredItems.length} de ${items.length} · ${totalActive} activas · ${totalInactive} inactivas`
                : undefined
            }
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i
                  className='tabler-contract'
                  style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }}
                />
              </Avatar>
            }
            action={
              <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
                <CustomTextField
                  placeholder='Buscar código o nombre...'
                  size='small'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  sx={{ minWidth: 200 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <i
                          className='tabler-search'
                          style={{ fontSize: 18, marginRight: 8, opacity: 0.5 }}
                        />
                      )
                    }
                  }}
                />
                <CustomTextField
                  select
                  size='small'
                  value={countryFilter}
                  onChange={e => setCountryFilter(e.target.value)}
                  sx={{ minWidth: 130 }}
                  aria-label='Filtrar por país'
                >
                  <MenuItem value='all'>Todos los países</MenuItem>
                  {countryOptions.map(c => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </CustomTextField>
                <CustomTextField
                  select
                  size='small'
                  value={sourceFilter}
                  onChange={e => setSourceFilter(e.target.value)}
                  sx={{ minWidth: 180 }}
                  aria-label='Filtrar por fuente'
                >
                  <MenuItem value='all'>Todas las fuentes</MenuItem>
                  {sourceOptions.map(s => (
                    <MenuItem key={s} value={s}>
                      {formatSourceLabel(s)}
                    </MenuItem>
                  ))}
                </CustomTextField>
                <CustomTextField
                  select
                  size='small'
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
                  sx={{ minWidth: 120 }}
                  aria-label='Filtrar por estado'
                >
                  <MenuItem value='active'>Activas</MenuItem>
                  <MenuItem value='inactive'>Inactivas</MenuItem>
                  <MenuItem value='all'>Todas</MenuItem>
                </CustomTextField>
                <Button
                  variant='contained'
                  size='small'
                  startIcon={<i className='tabler-plus' />}
                  onClick={handleCreate}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Nueva modalidad
                </Button>
              </Stack>
            }
          />
          <Divider />

          {loading && !items ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : !items || filteredItems.length === 0 ? (
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 6 }} role='status'>
                <Typography variant='h6' sx={{ mb: 1 }}>
                  {hasFilters ? 'Sin resultados' : 'Aún no has creado modalidades de contrato'}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                  {hasFilters
                    ? 'Ajusta los filtros o usa otras palabras para buscar.'
                    : 'Las modalidades definen la moneda, cargas previsionales y fees asociados a cada forma de contratación.'}
                </Typography>
                {!hasFilters && (
                  <Button
                    variant='contained'
                    startIcon={<i className='tabler-plus' />}
                    onClick={handleCreate}
                  >
                    Crear primera modalidad
                  </Button>
                )}
              </Box>
            </CardContent>
          ) : (
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                      {hg.headers.map(header => (
                        <th
                          key={header.id}
                          onClick={header.column.getToggleSortingHandler()}
                          className={classnames({
                            'cursor-pointer select-none': header.column.getCanSort()
                          })}
                          style={{
                            textAlign:
                              (header.column.columnDef.meta as { align?: string } | undefined)
                                ?.align === 'center'
                                ? 'center'
                                : (header.column.columnDef.meta as { align?: string } | undefined)
                                      ?.align === 'right'
                                  ? 'right'
                                  : 'left'
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: ' \u2191', desc: ' \u2193' }[
                            header.column.getIsSorted() as string
                          ] ?? null}
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
                          style={{
                            textAlign:
                              (cell.column.columnDef.meta as { align?: string } | undefined)
                                ?.align === 'center'
                                ? 'center'
                                : (cell.column.columnDef.meta as { align?: string } | undefined)
                                      ?.align === 'right'
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
          )}
        </Card>
      </Grid>

      <EmploymentTypeDrawer
        open={drawerOpen}
        mode={drawerMode}
        initial={editing}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => void loadData()}
      />
    </Grid>
  )
}

export default EmploymentTypesListView
