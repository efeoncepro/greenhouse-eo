'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { toast } from 'react-toastify'

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

import CreateOverheadDrawer from './drawers/CreateOverheadDrawer'
import EditOverheadDrawer from './drawers/EditOverheadDrawer'

// ── Types ──────────────────────────────────────────────────────────────

interface OverheadItem {
  addonId: string
  addonSku: string
  category: string
  addonName: string
  addonType: string
  unit: string | null
  costInternalUsd: number
  marginPct: number | null
  finalPriceUsd: number | null
  finalPricePct: number | null
  pctMin: number | null
  pctMax: number | null
  applicableTo: string[]
  description: string | null
  visibleToClient: boolean
  active: boolean
  effectiveFrom: string
  createdAt: string
}

interface ListResponse {
  items: OverheadItem[]
}

const ADDON_TYPE_LABELS: Record<string, string> = {
  overhead_fixed: 'Overhead fijo',
  fee_percentage: 'Fee %',
  fee_fixed: 'Fee fijo',
  resource_month: 'Recurso/mes',
  adjustment_pct: 'Ajuste %'
}

const ADDON_TYPE_COLORS: Record<string, 'primary' | 'info' | 'success' | 'warning' | 'error' | 'secondary'> = {
  overhead_fixed: 'warning',
  fee_percentage: 'info',
  fee_fixed: 'info',
  resource_month: 'primary',
  adjustment_pct: 'secondary'
}

const formatValue = (item: OverheadItem): string => {
  if (item.addonType === 'fee_percentage' || item.addonType === 'adjustment_pct') {
    if (item.finalPricePct != null) return `${item.finalPricePct}%`
    if (item.pctMin != null && item.pctMax != null) return `${item.pctMin}%–${item.pctMax}%`

    return '—'
  }

  if (item.finalPriceUsd != null) {
    return `USD ${new Intl.NumberFormat('es-CL').format(item.finalPriceUsd)}`
  }

  if (item.costInternalUsd > 0) {
    return `USD ${new Intl.NumberFormat('es-CL').format(item.costInternalUsd)} (costo)`
  }

  return '—'
}

// ── Columns ────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<OverheadItem>()

const buildColumns = (
  onToggleActive: (overhead: OverheadItem, next: boolean) => void,
  togglingId: string | null,
  onEdit: (overhead: OverheadItem) => void

// eslint-disable-next-line @typescript-eslint/no-explicit-any
): ColumnDef<OverheadItem, any>[] => [
  columnHelper.accessor('addonSku', {
    header: 'SKU',
    cell: ({ getValue }) => (
      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
        {getValue() || '—'}
      </Typography>
    )
  }),
  columnHelper.accessor('addonName', {
    header: 'Nombre',
    cell: ({ row }) => (
      <Box>
        <Typography variant='body2' sx={{ fontWeight: 500 }}>
          {row.original.addonName}
        </Typography>
        {row.original.description ? (
          <Typography variant='caption' color='text.secondary'>
            {row.original.description}
          </Typography>
        ) : null}
      </Box>
    )
  }),
  columnHelper.accessor('category', {
    header: 'Categoría',
    cell: ({ getValue }) => (
      <CustomChip round='true' size='small' variant='tonal' color='secondary' label={getValue() as string} />
    )
  }),
  columnHelper.accessor('addonType', {
    header: 'Tipo',
    cell: ({ getValue }) => {
      const value = getValue() as string

      return (
        <CustomChip
          round='true'
          size='small'
          variant='tonal'
          color={ADDON_TYPE_COLORS[value] ?? 'secondary'}
          label={ADDON_TYPE_LABELS[value] ?? value}
        />
      )
    }
  }),
  columnHelper.display({
    id: 'value',
    header: 'Valor',
    cell: ({ row }) => (
      <Typography variant='body2' sx={{ fontWeight: 500 }}>
        {formatValue(row.original)}
      </Typography>
    )
  }),
  columnHelper.accessor('visibleToClient', {
    header: 'Visible al cliente',
    cell: ({ getValue }) =>
      getValue() ? (
        <i className='tabler-eye' style={{ color: 'var(--mui-palette-success-main)' }} />
      ) : (
        <i className='tabler-eye-off' style={{ color: 'var(--mui-palette-text-disabled)' }} />
      ),
    meta: { align: 'center' }
  }),
  columnHelper.accessor('active', {
    header: 'Estado',
    cell: ({ row }) => {
      const overhead = row.original
      const isToggling = togglingId === overhead.addonId

      return (
        <Stack direction='row' spacing={1} alignItems='center' onClick={e => e.stopPropagation()}>
          <Switch
            checked={overhead.active}
            onChange={(_, checked) => onToggleActive(overhead, checked)}
            size='small'
            disabled={isToggling}
            inputProps={{
              'aria-label': `${overhead.active ? 'Desactivar' : 'Reactivar'} ${overhead.addonName}`
            }}
          />
          <CustomChip
            round='true'
            size='small'
            variant='tonal'
            color={overhead.active ? 'success' : 'secondary'}
            label={overhead.active ? 'Activo' : 'Inactivo'}
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
        <Tooltip title='Editar overhead'>
          <IconButton
            size='small'
            onClick={() => onEdit(row.original)}
            aria-label={`Editar ${row.original.addonName}`}
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

const OverheadAddonsListView = () => {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'addonName', desc: false }])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [editingOverheadId, setEditingOverheadId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400)

    return () => clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/admin/pricing-catalog/overheads')

      if (res.ok) {
        setData(await res.json())
        setError(null)
      } else {
        setError(`No pudimos cargar overheads y fees (HTTP ${res.status}).`)
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
    async (overhead: OverheadItem, next: boolean) => {
      setTogglingId(overhead.addonId)

      try {
        let res: Response

        if (next) {
          res = await fetch(`/api/admin/pricing-catalog/overheads/${overhead.addonId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: true })
          })
        } else {
          res = await fetch(`/api/admin/pricing-catalog/overheads/${overhead.addonId}`, {
            method: 'DELETE'
          })
        }

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))

          toast.error(payload.error || 'No pudimos actualizar el estado del overhead.')

          return
        }

        toast.success(
          next ? `${overhead.addonName} reactivado` : `${overhead.addonName} desactivado — no aparecerá en nuevas cotizaciones`
        )
        await loadData()
      } catch {
        toast.error('No se pudo conectar al servidor.')
      } finally {
        setTogglingId(null)
      }
    },
    [loadData]
  )

  const categoryOptions = useMemo(() => {
    if (!data?.items) return []
    const set = new Set(data.items.map(i => i.category).filter(Boolean))

    return Array.from(set).sort()
  }, [data])

  const filteredItems = useMemo(() => {
    if (!data?.items) return []

    return data.items.filter(item => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
      if (typeFilter !== 'all' && item.addonType !== typeFilter) return false
      if (statusFilter === 'active' && !item.active) return false
      if (statusFilter === 'inactive' && item.active) return false

      if (searchDebounced) {
        const q = searchDebounced.toLowerCase()

        const matches =
          item.addonName.toLowerCase().includes(q) ||
          item.addonSku.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)

        if (!matches) return false
      }

      return true
    })
  }, [data, searchDebounced, categoryFilter, typeFilter, statusFilter])

  const handleEdit = useCallback((overhead: OverheadItem) => {
    setEditingOverheadId(overhead.addonId)
    setEditDrawerOpen(true)
  }, [])

  const columns = useMemo(
    () => buildColumns(handleToggleActive, togglingId, handleEdit),
    [handleToggleActive, togglingId, handleEdit]
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

  const totalActive = useMemo(() => data?.items.filter(i => i.active).length ?? 0, [data])
  const totalInactive = useMemo(() => data?.items.filter(i => !i.active).length ?? 0, [data])

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 1 }}>
          <Tooltip title='Volver al catálogo'>
            <IconButton component='a' href='/admin/pricing-catalog' size='small' aria-label='Volver al catálogo'>
              <i className='tabler-arrow-left' />
            </IconButton>
          </Tooltip>
          <Typography variant='h4' sx={{ fontWeight: 600 }}>
            Overheads y fees
          </Typography>
        </Stack>
        <Typography variant='body2' color='text.secondary'>
          Cargos adicionales, fondos y fees que se agregan a cotizaciones como porcentaje o monto fijo.
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
            title='Overheads registrados'
            subheader={
              data
                ? `${filteredItems.length} de ${data.items.length} · ${totalActive} activos · ${totalInactive} inactivos`
                : undefined
            }
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                <i className='tabler-receipt' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
              </Avatar>
            }
            action={
              <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
                <CustomTextField
                  placeholder='Buscar nombre o SKU...'
                  size='small'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  sx={{ minWidth: 200 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <i className='tabler-search' style={{ fontSize: 18, marginRight: 8, opacity: 0.5 }} />
                      )
                    }
                  }}
                />
                <CustomTextField
                  select
                  size='small'
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  sx={{ minWidth: 140 }}
                  aria-label='Filtrar por categoría'
                >
                  <MenuItem value='all'>Todas las categorías</MenuItem>
                  {categoryOptions.map(c => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </CustomTextField>
                <CustomTextField
                  select
                  size='small'
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  sx={{ minWidth: 140 }}
                  aria-label='Filtrar por tipo'
                >
                  <MenuItem value='all'>Todos los tipos</MenuItem>
                  {Object.entries(ADDON_TYPE_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
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
                  <MenuItem value='active'>Activos</MenuItem>
                  <MenuItem value='inactive'>Inactivos</MenuItem>
                  <MenuItem value='all'>Todos</MenuItem>
                </CustomTextField>
                <Button
                  variant='contained'
                  size='small'
                  startIcon={<i className='tabler-plus' />}
                  onClick={() => setDrawerOpen(true)}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Nuevo overhead
                </Button>
              </Stack>
            }
          />
          <Divider />

          {loading && !data ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : !data || filteredItems.length === 0 ? (
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 6 }} role='status'>
                <Typography variant='h6' sx={{ mb: 1 }}>
                  {searchDebounced || categoryFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'active'
                    ? 'Sin resultados'
                    : 'Aún no has creado tu primer overhead'}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                  {searchDebounced || categoryFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'active'
                    ? 'Ajusta los filtros o usa otras palabras para buscar.'
                    : 'Los overheads y fees se agregan a cotizaciones como porcentajes o montos fijos sobre el costo base.'}
                </Typography>
                {!searchDebounced &&
                  categoryFilter === 'all' &&
                  typeFilter === 'all' &&
                  statusFilter === 'active' && (
                    <Button
                      variant='contained'
                      startIcon={<i className='tabler-plus' />}
                      onClick={() => setDrawerOpen(true)}
                    >
                      Crear primer overhead
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
                          className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })}
                          style={{
                            textAlign:
                              (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center'
                                ? 'center'
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
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          style={{
                            textAlign:
                              (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center'
                                ? 'center'
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

      <CreateOverheadDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => void loadData()}
      />

      <EditOverheadDrawer
        open={editDrawerOpen}
        overheadId={editingOverheadId}
        onClose={() => {
          setEditDrawerOpen(false)
          setEditingOverheadId(null)
        }}
        onSuccess={() => void loadData()}
      />
    </Grid>
  )
}

export default OverheadAddonsListView
