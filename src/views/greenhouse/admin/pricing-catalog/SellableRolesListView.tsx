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

import Checkbox from '@mui/material/Checkbox'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import tableStyles from '@core/styles/table.module.css'

import { PRICING_TIER_LABELS, type PricingTierCode } from '@/lib/commercial/pricing-governance-types'

import CreateSellableRoleDrawer from './drawers/CreateSellableRoleDrawer'
import EditSellableRoleDrawer from './drawers/EditSellableRoleDrawer'
import BulkEditDrawer from './drawers/BulkEditDrawer'
import { GH_PRICING_GOVERNANCE } from '@/config/greenhouse-nomenclature'

// ── Types ──────────────────────────────────────────────────────────────

interface SellableRoleItem {
  roleId: string
  roleSku: string
  roleCode: string
  roleLabelEs: string
  roleLabelEn: string | null
  category: string
  tier: string
  tierLabel: string
  canSellAsStaff: boolean
  canSellAsServiceComponent: boolean
  active: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface ListResponse {
  items: SellableRoleItem[]
}

const CATEGORY_LABELS: Record<string, string> = {
  creativo: 'Creativo',
  pr: 'PR',
  performance: 'Performance',
  consultoria: 'Consultoría',
  tech: 'Tech'
}

const CATEGORY_COLORS: Record<string, 'primary' | 'info' | 'success' | 'warning' | 'error' | 'secondary'> = {
  creativo: 'error',
  pr: 'warning',
  performance: 'info',
  consultoria: 'primary',
  tech: 'success'
}

// ── Columns ────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<SellableRoleItem>()

const buildColumns = (
  onToggleActive: (role: SellableRoleItem, next: boolean) => void,
  togglingId: string | null,
  onEdit: (role: SellableRoleItem) => void,
  selectedIds: Set<string>,
  onToggleSelect: (roleId: string, checked: boolean) => void,
  onToggleSelectAll: (checked: boolean) => void,
  allSelectedIds: string[]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
): ColumnDef<SellableRoleItem, any>[] => [
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
        checked={selectedIds.has(row.original.roleId)}
        onChange={(_, checked) => onToggleSelect(row.original.roleId, checked)}
        aria-label={`Seleccionar ${row.original.roleSku}`}
      />
    )
  }),
  columnHelper.accessor('roleSku', {
    header: 'SKU',
    cell: ({ getValue }) => (
      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
        {getValue() || '—'}
      </Typography>
    )
  }),
  columnHelper.accessor('roleLabelEs', {
    header: 'Rol',
    cell: ({ row }) => (
      <Box>
        <Typography variant='body2' sx={{ fontWeight: 500 }}>
          {row.original.roleLabelEs}
        </Typography>
        {row.original.roleLabelEn ? (
          <Typography variant='caption' color='text.secondary'>
            {row.original.roleLabelEn}
          </Typography>
        ) : null}
      </Box>
    )
  }),
  columnHelper.accessor('category', {
    header: 'Categoría',
    cell: ({ getValue }) => {
      const value = getValue() as string

      return (
        <CustomChip
          round='true'
          size='small'
          variant='tonal'
          color={CATEGORY_COLORS[value] ?? 'secondary'}
          label={CATEGORY_LABELS[value] ?? value}
        />
      )
    }
  }),
  columnHelper.accessor('tier', {
    header: 'Tier',
    cell: ({ row }) => {
      const tier = row.original.tier as PricingTierCode

      return (
        <Stack direction='row' spacing={1} alignItems='center'>
          <CustomChip round='true' size='small' variant='tonal' color='primary' label={`T${tier}`} />
          <Typography variant='caption' color='text.secondary'>
            {PRICING_TIER_LABELS[tier] ?? row.original.tierLabel}
          </Typography>
        </Stack>
      )
    }
  }),
  columnHelper.accessor('canSellAsStaff', {
    header: 'Staff',
    cell: ({ getValue }) => (getValue() ? <i className='tabler-check' style={{ color: 'var(--mui-palette-success-main)' }} /> : <Typography variant='body2' color='text.secondary'>—</Typography>),
    meta: { align: 'center' }
  }),
  columnHelper.accessor('canSellAsServiceComponent', {
    header: 'Servicio',
    cell: ({ getValue }) => (getValue() ? <i className='tabler-check' style={{ color: 'var(--mui-palette-success-main)' }} /> : <Typography variant='body2' color='text.secondary'>—</Typography>),
    meta: { align: 'center' }
  }),
  columnHelper.accessor('active', {
    header: 'Estado',
    cell: ({ row }) => {
      const role = row.original
      const isToggling = togglingId === role.roleId

      return (
        <Stack direction='row' spacing={1} alignItems='center' onClick={e => e.stopPropagation()}>
          <Switch
            checked={role.active}
            onChange={(_, checked) => onToggleActive(role, checked)}
            size='small'
            disabled={isToggling}
            inputProps={{ 'aria-label': `${role.active ? 'Desactivar' : 'Reactivar'} ${role.roleLabelEs}` }}
          />
          <CustomChip
            round='true'
            size='small'
            variant='tonal'
            color={role.active ? 'success' : 'secondary'}
            label={role.active ? 'Activo' : 'Inactivo'}
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
      <Stack direction='row' spacing={0} alignItems='center' onClick={e => e.stopPropagation()}>
        <Tooltip title='Editar rol'>
          <IconButton
            size='small'
            onClick={() => onEdit(row.original)}
            aria-label={`Editar ${row.original.roleLabelEs}`}
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

const SellableRolesListView = () => {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'roleLabelEs', desc: false }])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400)

    return () => clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/admin/pricing-catalog/roles')

      if (res.ok) {
        setData(await res.json())
        setError(null)
      } else {
        setError(`No pudimos cargar los roles vendibles (HTTP ${res.status}).`)
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
    async (role: SellableRoleItem, next: boolean) => {
      setTogglingId(role.roleId)

      try {
        let res: Response

        if (next) {
          res = await fetch(`/api/admin/pricing-catalog/roles/${role.roleId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: true })
          })
        } else {
          res = await fetch(`/api/admin/pricing-catalog/roles/${role.roleId}`, {
            method: 'DELETE'
          })
        }

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))

          toast.error(payload.error || 'No pudimos actualizar el estado del rol.')

          return
        }

        toast.success(
          next
            ? `Rol ${role.roleSku} reactivado`
            : `Rol ${role.roleSku} desactivado — no aparecerá en nuevas cotizaciones`
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

  const filteredItems = useMemo(() => {
    if (!data?.items) return []

    return data.items.filter(item => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
      if (statusFilter === 'active' && !item.active) return false
      if (statusFilter === 'inactive' && item.active) return false

      if (searchDebounced) {
        const q = searchDebounced.toLowerCase()

        const matches =
          item.roleSku.toLowerCase().includes(q) ||
          item.roleLabelEs.toLowerCase().includes(q) ||
          (item.roleLabelEn && item.roleLabelEn.toLowerCase().includes(q)) ||
          item.roleCode.toLowerCase().includes(q)

        if (!matches) return false
      }

      return true
    })
  }, [data, searchDebounced, categoryFilter, statusFilter])

  const handleEdit = useCallback((role: SellableRoleItem) => {
    setEditingRoleId(role.roleId)
  }, [])

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDrawerOpen, setBulkDrawerOpen] = useState(false)

  const handleToggleSelect = useCallback((roleId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)

      if (checked) next.add(roleId)
      else next.delete(roleId)

      return next
    })
  }, [])

  const handleToggleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredItems.map(i => i.roleId)))
    } else {
      setSelectedIds(new Set())
    }
  }, [filteredItems])

  const allFilteredIds = useMemo(() => filteredItems.map(i => i.roleId), [filteredItems])

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

  const totalActive = useMemo(() => data?.items.filter(i => i.active).length ?? 0, [data])
  const totalInactive = useMemo(() => data?.items.filter(i => !i.active).length ?? 0, [data])

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 1 }}>
          <Tooltip title='Volver al catálogo'>
            <IconButton component='a' href='/admin/pricing-catalog' size='small' aria-label='Volver al catálogo'>
              <i className='tabler-arrow-left' />
            </IconButton>
          </Tooltip>
          <Typography variant='h4' sx={{ fontWeight: 600 }}>
            Roles vendibles
          </Typography>
        </Stack>
        <Typography variant='body2' color='text.secondary'>
          Roles comerciales con SKU, categoría y tier que se usan como componentes en cotizaciones.
        </Typography>
      </Grid>

      {/* Error banner */}
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

      {/* Table card */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Roles en catálogo'
            subheader={
              data
                ? `${filteredItems.length} de ${data.items.length} · ${totalActive} activos · ${totalInactive} inactivos`
                : undefined
            }
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-briefcase' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
            action={
              <Stack direction='row' spacing={2} alignItems='center'>
                <CustomTextField
                  placeholder='Buscar rol o SKU...'
                  size='small'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  sx={{ minWidth: 220 }}
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
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
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
                  Nuevo rol
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
                    : 'Aún no has creado tu primer rol'}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                  {searchDebounced || categoryFilter !== 'all' || statusFilter !== 'active'
                    ? 'Ajusta los filtros o usa otras palabras para buscar.'
                    : 'Los roles vendibles son la unidad base para construir cotizaciones. Usa Nuevo rol para comenzar.'}
                </Typography>
                {!searchDebounced && categoryFilter === 'all' && statusFilter === 'active' && (
                  <Button
                    variant='contained'
                    startIcon={<i className='tabler-plus' />}
                    onClick={() => setDrawerOpen(true)}
                  >
                    Crear primer rol
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

      <CreateSellableRoleDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => void loadData()}
      />

      <EditSellableRoleDrawer
        open={editingRoleId !== null}
        roleId={editingRoleId}
        onClose={() => setEditingRoleId(null)}
        onSuccess={() => void loadData()}
      />

      <BulkEditDrawer
        open={bulkDrawerOpen}
        roleIds={Array.from(selectedIds)}
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

export default SellableRolesListView
