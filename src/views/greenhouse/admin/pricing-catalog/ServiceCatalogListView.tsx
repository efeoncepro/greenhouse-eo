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

import { GH_PRICING } from '@/config/greenhouse-nomenclature'

import CreateServiceDrawer from './drawers/CreateServiceDrawer'
import EditServiceDrawer from './drawers/EditServiceDrawer'

// ── Types ──────────────────────────────────────────────────────────────

interface ServiceCatalogItem {
  moduleId: string
  moduleCode: string
  moduleName: string
  serviceSku: string
  serviceCategory: string | null
  displayName: string | null
  serviceUnit: 'project' | 'monthly'
  serviceType: string | null
  commercialModel: 'on_going' | 'on_demand' | 'hybrid' | 'license_consulting'
  tier: '1' | '2' | '3' | '4'
  defaultDurationMonths: number | null
  defaultDescription: string | null
  businessLineCode: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  roleRecipeCount: number
  toolRecipeCount: number
}

interface ListResponse {
  items: ServiceCatalogItem[]
  updatedAt: string | null
}

const COPY = GH_PRICING.adminServices

const TIER_COLORS: Record<string, 'primary' | 'info' | 'success' | 'warning' | 'error' | 'secondary'> = {
  '1': 'secondary',
  '2': 'info',
  '3': 'primary',
  '4': 'success'
}

const COMMERCIAL_MODEL_COLORS: Record<
  string,
  'primary' | 'info' | 'success' | 'warning' | 'error' | 'secondary'
> = {
  on_going: 'primary',
  on_demand: 'info',
  hybrid: 'warning',
  license_consulting: 'secondary'
}

// ── Columns ────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<ServiceCatalogItem>()

const buildColumns = (
  onToggleActive: (service: ServiceCatalogItem, next: boolean) => void,
  togglingId: string | null,
  onEdit: (service: ServiceCatalogItem) => void

 
): ColumnDef<ServiceCatalogItem, any>[] => [
  columnHelper.accessor('serviceSku', {
    header: COPY.columns.sku,
    cell: ({ getValue }) => (
      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
        {getValue() || '—'}
      </Typography>
    )
  }),
  columnHelper.accessor('moduleName', {
    header: COPY.columns.name,
    cell: ({ row }) => (
      <Box>
        <Typography variant='body2' sx={{ fontWeight: 500 }}>
          {row.original.moduleName}
        </Typography>
        {row.original.displayName && row.original.displayName !== row.original.moduleName ? (
          <Typography variant='caption' color='text.secondary'>
            {row.original.displayName}
          </Typography>
        ) : null}
      </Box>
    )
  }),
  columnHelper.accessor('serviceCategory', {
    header: COPY.columns.category,
    cell: ({ getValue }) => {
      const value = getValue() as string | null

      if (!value) return <Typography variant='body2' color='text.secondary'>—</Typography>

      return (
        <CustomChip round='true' size='small' variant='tonal' color='info' label={value} />
      )
    }
  }),
  columnHelper.accessor('tier', {
    header: COPY.columns.tier,
    cell: ({ getValue }) => {
      const tier = String(getValue())

      return (
        <CustomChip
          round='true'
          size='small'
          variant='tonal'
          color={TIER_COLORS[tier] ?? 'secondary'}
          label={`T${tier}`}
        />
      )
    },
    meta: { align: 'center' }
  }),
  columnHelper.accessor('commercialModel', {
    header: COPY.columns.commercialModel,
    cell: ({ getValue }) => {
      const value = getValue() as string

      return (
        <CustomChip
          round='true'
          size='small'
          variant='tonal'
          color={COMMERCIAL_MODEL_COLORS[value] ?? 'secondary'}
          label={COPY.commercialModels[value] ?? value}
        />
      )
    }
  }),
  columnHelper.accessor('serviceUnit', {
    header: COPY.columns.unit,
    cell: ({ getValue }) => {
      const value = getValue() as string

      return (
        <Typography variant='body2'>{COPY.serviceUnits[value] ?? value}</Typography>
      )
    }
  }),
  columnHelper.accessor('defaultDurationMonths', {
    header: COPY.columns.duration,
    cell: ({ getValue }) => {
      const months = getValue() as number | null

      if (months === null || months === undefined) {
        return <Typography variant='body2' color='text.secondary'>—</Typography>
      }

      return <Typography variant='body2'>{months} {months === 1 ? 'mes' : 'meses'}</Typography>
    },
    meta: { align: 'center' }
  }),
  columnHelper.accessor('businessLineCode', {
    header: COPY.columns.businessLine,
    cell: ({ getValue }) => {
      const value = getValue() as string | null

      if (!value) return <Typography variant='body2' color='text.secondary'>—</Typography>

      return (
        <Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
          {value}
        </Typography>
      )
    }
  }),
  columnHelper.accessor('roleRecipeCount', {
    header: COPY.columns.roleCount,
    cell: ({ getValue }) => (
      <Typography variant='body2' sx={{ fontWeight: 500 }}>
        {getValue() ?? 0}
      </Typography>
    ),
    meta: { align: 'center' }
  }),
  columnHelper.accessor('toolRecipeCount', {
    header: COPY.columns.toolCount,
    cell: ({ getValue }) => (
      <Typography variant='body2' sx={{ fontWeight: 500 }}>
        {getValue() ?? 0}
      </Typography>
    ),
    meta: { align: 'center' }
  }),
  columnHelper.accessor('active', {
    header: COPY.columns.active,
    cell: ({ row }) => {
      const service = row.original
      const isToggling = togglingId === service.moduleId

      return (
        <Stack direction='row' spacing={1} alignItems='center' onClick={e => e.stopPropagation()}>
          <Switch
            checked={service.active}
            onChange={(_, checked) => onToggleActive(service, checked)}
            size='small'
            disabled={isToggling}
            inputProps={{
              'aria-label': `${service.active ? COPY.deactivateCta : COPY.activateCta} ${service.moduleName}`
            }}
          />
          <CustomChip
            round='true'
            size='small'
            variant='tonal'
            color={service.active ? 'success' : 'secondary'}
            label={service.active ? 'Activo' : 'Inactivo'}
          />
        </Stack>
      )
    },
    meta: { align: 'center' }
  }),
  columnHelper.display({
    id: 'actions',
    header: COPY.columns.actions,
    cell: ({ row }) => (
      <Stack direction='row' spacing={0} alignItems='center' onClick={e => e.stopPropagation()}>
        <Tooltip title={COPY.editCta}>
          <IconButton
            size='small'
            onClick={() => onEdit(row.original)}
            aria-label={`${COPY.editCta} ${row.original.moduleName}`}
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

const ServiceCatalogListView = () => {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [businessLineFilter, setBusinessLineFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'serviceSku', desc: false }])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400)

    return () => clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/admin/pricing-catalog/services')

      if (res.ok) {
        setData(await res.json())
        setError(null)
      } else {
        setError(`${COPY.errorLoadList} (HTTP ${res.status}).`)
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
    async (service: ServiceCatalogItem, next: boolean) => {
      setTogglingId(service.moduleId)

      try {
        let res: Response
        const ifMatch = service.updatedAt ? `"${service.updatedAt}"` : ''

        if (next) {
          res = await fetch(`/api/admin/pricing-catalog/services/${service.moduleId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(ifMatch ? { 'If-Match': ifMatch } : {})
            },
            body: JSON.stringify({ active: true })
          })
        } else {
          res = await fetch(`/api/admin/pricing-catalog/services/${service.moduleId}`, {
            method: 'DELETE',
            headers: ifMatch ? { 'If-Match': ifMatch } : {}
          })
        }

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))

          if (res.status === 409) {
            toast.error(COPY.errorConflict)
          } else {
            toast.error(payload.error || COPY.errorSave)
          }

          return
        }

        toast.success(next ? COPY.toastReactivated(service.serviceSku) : COPY.toastDeactivated(service.serviceSku))
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
    if (!data?.items) return [] as string[]

    const set = new Set<string>()

    data.items.forEach(item => {
      if (item.serviceCategory) set.add(item.serviceCategory)
    })

    return Array.from(set).sort()
  }, [data])

  const businessLineOptions = useMemo(() => {
    if (!data?.items) return [] as string[]

    const set = new Set<string>()

    data.items.forEach(item => {
      if (item.businessLineCode) set.add(item.businessLineCode)
    })

    return Array.from(set).sort()
  }, [data])

  const filteredItems = useMemo(() => {
    if (!data?.items) return []

    return data.items.filter(item => {
      if (tierFilter !== 'all' && item.tier !== tierFilter) return false
      if (categoryFilter !== 'all' && item.serviceCategory !== categoryFilter) return false
      if (businessLineFilter !== 'all' && item.businessLineCode !== businessLineFilter) return false
      if (statusFilter === 'active' && !item.active) return false
      if (statusFilter === 'inactive' && item.active) return false

      if (searchDebounced) {
        const q = searchDebounced.toLowerCase()

        const matches =
          item.serviceSku.toLowerCase().includes(q) ||
          item.moduleName.toLowerCase().includes(q) ||
          item.moduleCode.toLowerCase().includes(q) ||
          (item.displayName && item.displayName.toLowerCase().includes(q)) ||
          (item.serviceCategory && item.serviceCategory.toLowerCase().includes(q))

        if (!matches) return false
      }

      return true
    })
  }, [data, searchDebounced, tierFilter, categoryFilter, businessLineFilter, statusFilter])

  const handleEdit = useCallback((service: ServiceCatalogItem) => {
    setEditingModuleId(service.moduleId)
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

  const hasActiveFilters =
    Boolean(searchDebounced) ||
    tierFilter !== 'all' ||
    categoryFilter !== 'all' ||
    businessLineFilter !== 'all' ||
    statusFilter !== 'active'

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 1 }}>
          <Tooltip title={COPY.backToCatalog}>
            <IconButton component='a' href='/admin/pricing-catalog' size='small' aria-label={COPY.backToCatalog}>
              <i className='tabler-arrow-left' />
            </IconButton>
          </Tooltip>
          <Typography variant='h4' sx={{ fontWeight: 600 }}>
            {COPY.title}
          </Typography>
        </Stack>
        <Typography variant='body2' color='text.secondary'>
          {COPY.subtitle}
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
            title={COPY.title}
            subheader={
              data
                ? `${filteredItems.length} de ${data.items.length} · ${totalActive} activos · ${totalInactive} inactivos`
                : undefined
            }
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
                <i className='tabler-package' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
              </Avatar>
            }
            action={
              <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
                <CustomTextField
                  placeholder={COPY.searchPlaceholder}
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
                  value={tierFilter}
                  onChange={e => setTierFilter(e.target.value)}
                  sx={{ minWidth: 120 }}
                  aria-label={COPY.filterTier}
                >
                  <MenuItem value='all'>{COPY.filterAllTiers}</MenuItem>
                  {(['1', '2', '3', '4'] as const).map(t => (
                    <MenuItem key={t} value={t}>
                      T{t}
                    </MenuItem>
                  ))}
                </CustomTextField>
                {categoryOptions.length > 0 && (
                  <CustomTextField
                    select
                    size='small'
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    sx={{ minWidth: 160 }}
                    aria-label={COPY.filterCategory}
                  >
                    <MenuItem value='all'>{COPY.filterAllCategories}</MenuItem>
                    {categoryOptions.map(cat => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
                {businessLineOptions.length > 0 && (
                  <CustomTextField
                    select
                    size='small'
                    value={businessLineFilter}
                    onChange={e => setBusinessLineFilter(e.target.value)}
                    sx={{ minWidth: 140 }}
                    aria-label={COPY.filterBusinessLine}
                  >
                    <MenuItem value='all'>{COPY.filterAllBusinessLines}</MenuItem>
                    {businessLineOptions.map(bl => (
                      <MenuItem key={bl} value={bl}>
                        {bl}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                )}
                <CustomTextField
                  select
                  size='small'
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
                  sx={{ minWidth: 120 }}
                  aria-label={COPY.filterStatus}
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
                  {COPY.createCta}
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
                  {hasActiveFilters ? COPY.emptyStateNoResultsTitle : COPY.emptyStateFirstTitle}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                  {hasActiveFilters
                    ? COPY.emptyStateNoResultsDescription
                    : COPY.emptyStateFirstDescription}
                </Typography>
                {!hasActiveFilters && (
                  <Button
                    variant='contained'
                    startIcon={<i className='tabler-plus' />}
                    onClick={() => setDrawerOpen(true)}
                  >
                    {COPY.createFirstCta}
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

      <CreateServiceDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => void loadData()}
      />

      <EditServiceDrawer
        open={editingModuleId !== null}
        moduleId={editingModuleId}
        onClose={() => setEditingModuleId(null)}
        onSuccess={() => void loadData()}
      />
    </Grid>
  )
}

export default ServiceCatalogListView
