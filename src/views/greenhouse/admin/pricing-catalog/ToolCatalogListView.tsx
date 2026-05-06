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

import Checkbox from '@mui/material/Checkbox'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import tableStyles from '@core/styles/table.module.css'

import CreateToolDrawer from './drawers/CreateToolDrawer'
import EditToolDrawer from './drawers/EditToolDrawer'
import BulkEditDrawer from './drawers/BulkEditDrawer'
import { GH_PRICING_GOVERNANCE } from '@/config/greenhouse-nomenclature'
import { formatNumber } from '@/lib/format'

// ── Types ──────────────────────────────────────────────────────────────

interface ToolItem {
  toolId: string
  toolSku: string | null
  toolName: string
  providerId: string
  vendor: string | null
  toolCategory: string
  toolSubcategory: string | null
  costModel: string
  subscriptionAmount: number | null
  subscriptionCurrency: string | null
  subscriptionBillingCycle: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ListResponse {
  items: ToolItem[]
}

const formatAmount = (amount: number | null, currency: string | null): string => {
  if (amount == null) return '—'

  const value = formatNumber(amount, { maximumFractionDigits: 2 })

  return currency ? `${currency} ${value}` : value
}

// ── Columns ────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<ToolItem>()

const buildColumns = (
  onToggleActive: (tool: ToolItem, next: boolean) => void,
  togglingId: string | null,
  onEdit: (tool: ToolItem) => void,
  selectedIds: Set<string>,
  onToggleSelect: (toolId: string, checked: boolean) => void,
  onToggleSelectAll: (checked: boolean) => void,
  allSelectedIds: string[]

 
): ColumnDef<ToolItem, any>[] => [
  columnHelper.display({
    id: 'select',
    size: 40,
    header: () => {
      const allSelected = allSelectedIds.length > 0 && allSelectedIds.every(id => selectedIds.has(id))
      const someSelected = allSelectedIds.some(id => selectedIds.has(id))

      return (
        <Checkbox
          size='small'
          checked={allSelected}
          indeterminate={!allSelected && someSelected}
          onChange={(_, checked) => onToggleSelectAll(checked)}
          aria-label={GH_PRICING_GOVERNANCE.bulkEdit.selectAllLabel}
        />
      )
    },
    cell: ({ row }) => (
      <Checkbox
        size='small'
        checked={selectedIds.has(row.original.toolId)}
        onChange={(_, checked) => onToggleSelect(row.original.toolId, checked)}
        aria-label={`Seleccionar ${row.original.toolSku}`}
      />
    )
  }),
  columnHelper.accessor('toolSku', {
    header: 'SKU',
    cell: ({ getValue }) => (
      <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>
        {getValue() || '—'}
      </Typography>
    )
  }),
  columnHelper.accessor('toolName', {
    header: 'Herramienta',
    cell: ({ row }) => (
      <Box>
        <Typography variant='body2' sx={{ fontWeight: 500 }}>
          {row.original.toolName}
        </Typography>
        {row.original.vendor ? (
          <Typography variant='caption' color='text.secondary'>
            {row.original.vendor}
          </Typography>
        ) : null}
      </Box>
    )
  }),
  columnHelper.accessor('toolCategory', {
    header: 'Categoría',
    cell: ({ row }) => (
      <Box>
        <CustomChip round='true' size='small' variant='tonal' color='info' label={row.original.toolCategory} />
        {row.original.toolSubcategory ? (
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
            {row.original.toolSubcategory}
          </Typography>
        ) : null}
      </Box>
    )
  }),
  columnHelper.accessor('costModel', {
    header: 'Modelo de costo',
    cell: ({ getValue }) => (
      <Typography variant='body2' color='text.secondary'>
        {getValue() || '—'}
      </Typography>
    )
  }),
  columnHelper.accessor('subscriptionAmount', {
    header: 'Suscripción',
    cell: ({ row }) => (
      <Box>
        <Typography variant='body2' sx={{ fontWeight: 500 }}>
          {formatAmount(row.original.subscriptionAmount, row.original.subscriptionCurrency)}
        </Typography>
        {row.original.subscriptionBillingCycle ? (
          <Typography variant='caption' color='text.secondary'>
            {row.original.subscriptionBillingCycle}
          </Typography>
        ) : null}
      </Box>
    )
  }),
  columnHelper.accessor('isActive', {
    header: 'Estado',
    cell: ({ row }) => {
      const tool = row.original
      const isToggling = togglingId === tool.toolId

      return (
        <Stack direction='row' spacing={1} alignItems='center' onClick={e => e.stopPropagation()}>
          <Switch
            checked={tool.isActive}
            onChange={(_, checked) => onToggleActive(tool, checked)}
            size='small'
            disabled={isToggling}
            inputProps={{ 'aria-label': `${tool.isActive ? 'Desactivar' : 'Reactivar'} ${tool.toolName}` }}
          />
          <CustomChip
            round='true'
            size='small'
            variant='tonal'
            color={tool.isActive ? 'success' : 'secondary'}
            label={tool.isActive ? 'Activa' : 'Inactiva'}
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
        <Tooltip title='Editar herramienta'>
          <IconButton
            size='small'
            onClick={() => onEdit(row.original)}
            aria-label={`Editar ${row.original.toolName}`}
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

const ToolCatalogListView = () => {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'toolName', desc: false }])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [editingToolId, setEditingToolId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400)

    return () => clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/admin/pricing-catalog/tools')

      if (res.ok) {
        setData(await res.json())
        setError(null)
      } else {
        setError(`No pudimos cargar el catálogo de herramientas (HTTP ${res.status}).`)
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
    async (tool: ToolItem, next: boolean) => {
      setTogglingId(tool.toolId)

      try {
        let res: Response

        if (next) {
          res = await fetch(`/api/admin/pricing-catalog/tools/${tool.toolId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: true })
          })
        } else {
          res = await fetch(`/api/admin/pricing-catalog/tools/${tool.toolId}`, {
            method: 'DELETE'
          })
        }

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))

          toast.error(payload.error || 'No pudimos actualizar el estado de la herramienta.')

          return
        }

        toast.success(
          next ? `${tool.toolName} reactivada` : `${tool.toolName} desactivada — no aparecerá en nuevas cotizaciones`
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
    const set = new Set(data.items.map(i => i.toolCategory).filter(Boolean))

    return Array.from(set).sort()
  }, [data])

  const filteredItems = useMemo(() => {
    if (!data?.items) return []

    return data.items.filter(item => {
      if (categoryFilter !== 'all' && item.toolCategory !== categoryFilter) return false
      if (statusFilter === 'active' && !item.isActive) return false
      if (statusFilter === 'inactive' && item.isActive) return false

      if (searchDebounced) {
        const q = searchDebounced.toLowerCase()

        const matches =
          item.toolName.toLowerCase().includes(q) ||
          (item.vendor && item.vendor.toLowerCase().includes(q)) ||
          (item.toolSku && item.toolSku.toLowerCase().includes(q)) ||
          item.toolCategory.toLowerCase().includes(q)

        if (!matches) return false
      }

      return true
    })
  }, [data, searchDebounced, categoryFilter, statusFilter])

  const handleEdit = useCallback((tool: ToolItem) => {
    setEditingToolId(tool.toolId)
    setEditDrawerOpen(true)
  }, [])

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDrawerOpen, setBulkDrawerOpen] = useState(false)

  const handleToggleSelect = useCallback((toolId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)

      if (checked) next.add(toolId)
      else next.delete(toolId)

      return next
    })
  }, [])

  const handleToggleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? new Set(data?.items.map(i => i.toolId) ?? []) : new Set())
    },
    [data]
  )

  const allFilteredIds = useMemo(() => data?.items.map(i => i.toolId) ?? [], [data])

  const columns = useMemo(
    () => buildColumns(
      handleToggleActive,
      togglingId,
      handleEdit,
      selectedIds,
      handleToggleSelect,
      handleToggleSelectAll,
      allFilteredIds
    ),
    [handleToggleActive, togglingId, handleEdit, selectedIds, handleToggleSelect, handleToggleSelectAll, allFilteredIds]
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

  const totalActive = useMemo(() => data?.items.filter(i => i.isActive).length ?? 0, [data])
  const totalInactive = useMemo(() => data?.items.filter(i => !i.isActive).length ?? 0, [data])

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
            Herramientas
          </Typography>
        </Stack>
        <Typography variant='body2' color='text.secondary'>
          Licencias, suscripciones y tooling disponible para componer cotizaciones.
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
            title='Herramientas en catálogo'
            subheader={
              data
                ? `${filteredItems.length} de ${data.items.length} · ${totalActive} activas · ${totalInactive} inactivas`
                : undefined
            }
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                <i className='tabler-tools' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
              </Avatar>
            }
            action={
              <Stack direction='row' spacing={2} alignItems='center'>
                <CustomTextField
                  placeholder='Buscar herramienta, SKU o vendor...'
                  size='small'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  sx={{ minWidth: 240 }}
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
                  sx={{ minWidth: 160 }}
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
                  onClick={() => setDrawerOpen(true)}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Nueva herramienta
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
                  {searchDebounced || categoryFilter !== 'all' || statusFilter !== 'active'
                    ? 'Sin resultados'
                    : 'Aún no has creado tu primera herramienta'}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                  {searchDebounced || categoryFilter !== 'all' || statusFilter !== 'active'
                    ? 'Ajusta los filtros o usa otras palabras para buscar.'
                    : 'Las herramientas representan licencias y suscripciones que se agregan a cotizaciones.'}
                </Typography>
                {!searchDebounced && categoryFilter === 'all' && statusFilter === 'active' && (
                  <Button
                    variant='contained'
                    startIcon={<i className='tabler-plus' />}
                    onClick={() => setDrawerOpen(true)}
                  >
                    Crear primera herramienta
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

      <CreateToolDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => void loadData()}
      />

      <EditToolDrawer
        open={editDrawerOpen}
        toolId={editingToolId}
        onClose={() => {
          setEditDrawerOpen(false)
          setEditingToolId(null)
        }}
        onSuccess={() => void loadData()}
      />

      <BulkEditDrawer
        open={bulkDrawerOpen}
        entityType='tool_catalog'
        entityIds={Array.from(selectedIds)}
        onClose={() => setBulkDrawerOpen(false)}
        onSuccess={result => {
          toast.success(GH_PRICING_GOVERNANCE.bulkEdit.successToast(result.applied))
          setSelectedIds(new Set())
          void loadData()
        }}
      />

      {selectedIds.size > 0 ? (
        <Box
          sx={theme => ({
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: theme.zIndex.snackbar,
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            boxShadow: theme.shadows[6]
          })}
        >
          <Typography variant='caption' sx={{ fontWeight: 600 }}>
            {GH_PRICING_GOVERNANCE.bulkEdit.selectedCountLabel(selectedIds.size)}
          </Typography>
          <Button size='small' variant='text' onClick={() => setSelectedIds(new Set())}>
            {GH_PRICING_GOVERNANCE.bulkEdit.clearSelectionLabel}
          </Button>
          <Button
            size='small'
            variant='contained'
            startIcon={<i className='tabler-edit' />}
            onClick={() => setBulkDrawerOpen(true)}
          >
            {GH_PRICING_GOVERNANCE.bulkEdit.bulkEditCta}
          </Button>
        </Box>
      ) : null}
    </Grid>
  )
}

export default ToolCatalogListView
