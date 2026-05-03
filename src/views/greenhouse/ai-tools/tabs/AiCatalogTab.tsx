'use client'

import { useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import type { TextFieldProps } from '@mui/material/TextField'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import OptionMenu from '@core/components/option-menu'
import TablePaginationComponent from '@components/TablePaginationComponent'

import type { AiTool, ProviderRecord, AiToolingAdminMetadata } from '@/types/ai-tools'
import { toolCategoryConfig, costModelConfig, formatCost } from '../helpers'

import tableStyles from '@core/styles/table.module.css'

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)

  addMeta({ itemRank })

  return itemRank.passed
}

const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & Omit<TextFieldProps, 'onChange'>) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => { setValue(initialValue) }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => { onChange(value) }, debounce)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <CustomTextField {...props} value={value} onChange={e => setValue(e.target.value)} />
}

const columnHelper = createColumnHelper<AiTool>()

type Props = {
  tools: AiTool[]
  providers: ProviderRecord[]
  meta: AiToolingAdminMetadata | null
  onRefresh: () => void
}

const AiCatalogTab = ({ tools, providers, meta, onRefresh }: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTool, setEditTool] = useState<AiTool | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterProvider, setFilterProvider] = useState('')
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})

  // Form state
  const [formToolId, setFormToolId] = useState('')
  const [formName, setFormName] = useState('')
  const [formProvider, setFormProvider] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formCostModel, setFormCostModel] = useState('')
  const [formSubAmount, setFormSubAmount] = useState<number | ''>('')
  const [formSubCurrency, setFormSubCurrency] = useState('USD')
  const [formSubCycle, setFormSubCycle] = useState('monthly')
  const [formSubSeats, setFormSubSeats] = useState<number | ''>('')
  const [formCreditUnit, setFormCreditUnit] = useState('')
  const [formCreditCost, setFormCreditCost] = useState<number | ''>('')
  const [formCreditCurrency, setFormCreditCurrency] = useState('USD')
  const [formCreditsIncluded, setFormCreditsIncluded] = useState<number | ''>('')
  const [formDesc, setFormDesc] = useState('')
  const [formIconUrl, setFormIconUrl] = useState('')
  const [formActive, setFormActive] = useState(true)

  const providerOptions = useMemo(() => {
    const all = [...(meta?.providers ?? []), ...providers]

    return all.reduce<ProviderRecord[]>((acc, p) => {
      if (!p.providerId || acc.some(item => item.providerId === p.providerId)) return acc
      acc.push(p)

      return acc
    }, [])
  }, [meta, providers])

  const categories = useMemo(
    () => meta?.toolCategories ?? (Object.keys(toolCategoryConfig) as Array<keyof typeof toolCategoryConfig>),
    [meta]
  )

  // Inline filtering (replaces AiCatalogFilters component)
  const filteredTools = useMemo(() => {
    return tools.filter(item => {
      if (filterCategory && item.toolCategory !== filterCategory) return false
      if (filterProvider && item.providerId !== filterProvider) return false

      return true
    })
  }, [tools, filterCategory, filterProvider])

  const resetForm = () => {
    setFormToolId('')
    setFormName('')
    setFormProvider('')
    setFormCategory('')
    setFormCostModel('')
    setFormSubAmount('')
    setFormSubCurrency('USD')
    setFormSubCycle('monthly')
    setFormSubSeats('')
    setFormCreditUnit('')
    setFormCreditCost('')
    setFormCreditCurrency('USD')
    setFormCreditsIncluded('')
    setFormDesc('')
    setFormIconUrl('')
    setFormActive(true)
  }

  const openCreate = () => {
    setEditTool(null)
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (tool: AiTool) => {
    setEditTool(tool)
    setFormToolId(tool.toolId)
    setFormName(tool.toolName)
    setFormProvider(tool.providerId)
    setFormCategory(tool.toolCategory)
    setFormCostModel(tool.costModel)
    setFormSubAmount(tool.subscriptionAmount ?? '')
    setFormSubCurrency(tool.subscriptionCurrency || 'USD')
    setFormSubCycle(tool.subscriptionBillingCycle || 'monthly')
    setFormSubSeats(tool.subscriptionSeats ?? '')
    setFormCreditUnit(tool.creditUnitName ?? '')
    setFormCreditCost(tool.creditUnitCost ?? '')
    setFormCreditCurrency(tool.creditUnitCurrency || 'USD')
    setFormCreditsIncluded(tool.creditsIncludedMonthly ?? '')
    setFormDesc(tool.description ?? '')
    setFormIconUrl(tool.iconUrl ?? '')
    setFormActive(tool.isActive)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const body: Record<string, unknown> = {
        toolName: formName,
        providerId: formProvider,
        toolCategory: formCategory,
        costModel: formCostModel,
        description: formDesc || null,
        iconUrl: formIconUrl || null,
        isActive: formActive
      }

      if (!editTool) body.toolId = formToolId

      if (formCostModel === 'subscription' || formCostModel === 'hybrid') {
        body.subscriptionAmount = formSubAmount === '' ? null : formSubAmount
        body.subscriptionCurrency = formSubCurrency
        body.subscriptionBillingCycle = formSubCycle
        body.subscriptionSeats = formSubSeats === '' ? null : formSubSeats
      }

      if (formCostModel === 'per_credit' || formCostModel === 'hybrid') {
        body.creditUnitName = formCreditUnit || null
        body.creditUnitCost = formCreditCost === '' ? null : formCreditCost
        body.creditUnitCurrency = formCreditCurrency
        body.creditsIncludedMonthly = formCreditsIncluded === '' ? null : formCreditsIncluded
      }

      const url = editTool ? `/api/admin/ai-tools/catalog/${editTool.toolId}` : '/api/admin/ai-tools/catalog'
      const method = editTool ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        setDialogOpen(false)
        onRefresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const showSubFields = formCostModel === 'subscription' || formCostModel === 'hybrid'
  const showCreditFields = formCostModel === 'per_credit' || formCostModel === 'hybrid'

  const columns = useMemo<ColumnDef<AiTool, any>[]>(
    () => [
      columnHelper.accessor('toolName', {
        header: 'Herramienta',
        cell: ({ row }) => {
          const catConf = toolCategoryConfig[row.original.toolCategory]

          return (
            <div className='flex items-center gap-3'>
              <CustomAvatar variant='rounded' skin='light' color={catConf?.color === 'default' ? 'secondary' : catConf?.color ?? 'primary'} size={34}>
                <i className={catConf?.icon ?? 'tabler-puzzle'} style={{ fontSize: 18 }} />
              </CustomAvatar>
              <div className='flex flex-col'>
                <Typography color='text.primary' className='font-medium'>
                  {row.original.toolName}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {row.original.providerName ?? row.original.vendor ?? '—'}
                </Typography>
              </div>
            </div>
          )
        }
      }),
      columnHelper.accessor('toolCategory', {
        header: 'Categoría',
        cell: ({ row }) => {
          const cat = row.original.toolCategory
          const conf = toolCategoryConfig[cat]

          return (
            <CustomChip
              round='true' size='small' variant='tonal'
              label={conf?.label ?? cat}
              color={conf?.color === 'default' ? 'secondary' : conf?.color ?? 'secondary'}
            />
          )
        }
      }),
      columnHelper.accessor('costModel', {
        header: 'Modelo',
        cell: ({ row }) => {
          const cm = row.original.costModel
          const conf = costModelConfig[cm]

          return (
            <CustomChip
              round='true' size='small' variant='tonal'
              icon={<i className={conf?.icon ?? 'tabler-coin'} />}
              label={conf?.label ?? cm}
              color={conf?.color === 'default' ? 'secondary' : conf?.color ?? 'secondary'}
            />
          )
        }
      }),
      columnHelper.display({
        id: 'unitCost',
        header: 'Costo',
        cell: ({ row }) => {
          const tool = row.original

          return (
            <Typography sx={{ fontSize: '0.8rem' }}>
              {tool.costModel === 'per_credit' || tool.costModel === 'hybrid'
                ? `${formatCost(tool.creditUnitCost, tool.creditUnitCurrency)} / ${tool.creditUnitName ?? 'unit'}`
                : tool.costModel === 'subscription'
                  ? `${formatCost(tool.subscriptionAmount, tool.subscriptionCurrency)} / ${tool.subscriptionBillingCycle ?? 'mes'}`
                  : '—'}
            </Typography>
          )
        }
      }),
      columnHelper.accessor('isActive', {
        header: 'Estado',
        cell: ({ getValue }) => (
          <CustomChip
            round='true' size='small' variant='tonal'
            label={getValue() ? 'Activa' : 'Inactiva'}
            color={getValue() ? 'success' : 'secondary'}
          />
        )
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className='flex items-center'>
            <OptionMenu
              iconButtonProps={{ size: 'medium' }}
              iconClassName='text-textSecondary'
              options={[
                {
                  text: 'Editar',
                  icon: 'tabler-pencil',
                  menuItemProps: {
                    className: 'flex items-center gap-2 text-textSecondary',
                    onClick: () => openEdit(row.original)
                  }
                },
                {
                  text: 'Duplicar',
                  icon: 'tabler-copy',
                  menuItemProps: { className: 'flex items-center gap-2 text-textSecondary' }
                }
              ]}
            />
          </div>
        ),
        enableSorting: false
      })
    ],
     
    []
  )

  const table = useReactTable({
    data: filteredTools,
    columns,
    filterFns: { fuzzy: fuzzyFilter },
    state: { rowSelection, globalFilter },
    globalFilterFn: fuzzyFilter,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  })

  return (
    <>
      <Card>
        {/* Toolbar: filters + search + action */}
        <div className='flex justify-between flex-col items-start md:flex-row md:items-center p-6 gap-4'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center gap-4'>
            <CustomTextField
              select size='small' label='Categoría'
              value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className='max-sm:is-full sm:is-[180px]'
            >
              <MenuItem value=''>Todas</MenuItem>
              {categories.map(cat => (
                <MenuItem key={cat} value={cat}>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <i className={toolCategoryConfig[cat as keyof typeof toolCategoryConfig]?.icon ?? 'tabler-puzzle'} style={{ fontSize: 16 }} />
                    <span>{toolCategoryConfig[cat as keyof typeof toolCategoryConfig]?.label ?? cat}</span>
                  </Stack>
                </MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              select size='small' label='Proveedor'
              value={filterProvider} onChange={e => setFilterProvider(e.target.value)}
              className='max-sm:is-full sm:is-[180px]'
            >
              <MenuItem value=''>Todos</MenuItem>
              {providerOptions.map(p => (
                <MenuItem key={p.providerId} value={p.providerId}>{p.providerName}</MenuItem>
              ))}
            </CustomTextField>
          </div>
          <div className='flex flex-col sm:flex-row max-sm:is-full items-start sm:items-center gap-4'>
            <DebouncedInput
              value={globalFilter ?? ''}
              onChange={value => setGlobalFilter(String(value))}
              placeholder='Buscar herramienta...'
              className='max-sm:is-full sm:is-[250px]'
              size='small'
            />
            <Button
              variant='contained'
              startIcon={<i className='tabler-plus' />}
              onClick={openCreate}
              className='max-sm:is-full'
            >
              Nueva herramienta
            </Button>
          </div>
        </div>
        <Divider />
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div
                          className={classnames({
                            'flex items-center': header.column.getIsSorted(),
                            'cursor-pointer select-none': header.column.getCanSort()
                          })}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <i className='tabler-chevron-up text-xl' />,
                            desc: <i className='tabler-chevron-down text-xl' />
                          }[header.column.getIsSorted() as 'asc' | 'desc'] ?? null}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            {table.getFilteredRowModel().rows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                    <Stack alignItems='center' spacing={2} sx={{ py: 8 }}>
                      <CustomAvatar variant='rounded' skin='light' color='warning' size={48}>
                        <i className='tabler-database-off' style={{ fontSize: 24 }} />
                      </CustomAvatar>
                      <Typography color='text.secondary'>No se encontraron herramientas</Typography>
                      {(filterCategory || filterProvider || globalFilter) && (
                        <Button
                          variant='tonal' size='small' color='secondary'
                          startIcon={<i className='tabler-filter-off' />}
                          onClick={() => { setFilterCategory(''); setFilterProvider(''); setGlobalFilter('') }}
                        >
                          Limpiar filtros
                        </Button>
                      )}
                    </Stack>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {table
                  .getRowModel()
                  .rows.slice(0, table.getState().pagination.pageSize)
                  .map(row => (
                    <tr key={row.id} className={classnames({ selected: row.getIsSelected() })}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            )}
          </table>
        </div>
        <TablePaginationComponent table={table} />
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth='sm' fullWidth closeAfterTransition={false}>
        <DialogTitle>
          <Stack direction='row' spacing={2} alignItems='center'>
            <CustomAvatar variant='rounded' skin='light' color='primary' size={36}>
              <i className={editTool ? 'tabler-pencil' : 'tabler-plus'} style={{ fontSize: 20 }} />
            </CustomAvatar>
            <Box>
              <Typography variant='h6'>{editTool ? 'Editar herramienta' : 'Nueva herramienta'}</Typography>
              <Typography variant='caption' color='text.secondary'>
                {editTool ? `Editando ${editTool.toolName}` : 'Registra una herramienta AI en el catálogo'}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {!editTool && (
              <CustomTextField
                fullWidth size='small' label='ID herramienta'
                value={formToolId} onChange={e => setFormToolId(e.target.value)}
                required helperText='Slug único: ej. claude-opus, kling-v2'
              />
            )}
            <CustomTextField
              fullWidth size='small' label='Nombre'
              value={formName} onChange={e => setFormName(e.target.value)}
              required
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  select fullWidth size='small' label='Proveedor'
                  value={formProvider} onChange={e => setFormProvider(e.target.value)}
                  helperText={providerOptions.length === 0 ? 'Los proveedores se sincronizan desde Finanzas.' : undefined}
                  required
                >
                  {providerOptions.length === 0 ? (
                    <MenuItem disabled value=''>Sin proveedores disponibles</MenuItem>
                  ) : (
                    providerOptions.map(p => (
                      <MenuItem key={p.providerId} value={p.providerId}>{p.providerName}</MenuItem>
                    ))
                  )}
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  select fullWidth size='small' label='Categoría'
                  value={formCategory} onChange={e => setFormCategory(e.target.value)}
                  required
                >
                  {(meta?.toolCategories ?? Object.keys(toolCategoryConfig)).map(cat => (
                    <MenuItem key={cat} value={cat}>
                      <Stack direction='row' spacing={1} alignItems='center'>
                        <i className={toolCategoryConfig[cat as keyof typeof toolCategoryConfig]?.icon ?? 'tabler-puzzle'} style={{ fontSize: 16 }} />
                        <span>{toolCategoryConfig[cat as keyof typeof toolCategoryConfig]?.label ?? cat}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
            </Grid>
            <CustomTextField
              select fullWidth size='small' label='Modelo de costo'
              value={formCostModel} onChange={e => setFormCostModel(e.target.value)}
              required
            >
              {(meta?.costModels ?? Object.keys(costModelConfig)).map(cm => (
                <MenuItem key={cm} value={cm}>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <i className={costModelConfig[cm as keyof typeof costModelConfig]?.icon ?? 'tabler-coin'} style={{ fontSize: 16 }} />
                    <span>{costModelConfig[cm as keyof typeof costModelConfig]?.label ?? cm}</span>
                  </Stack>
                </MenuItem>
              ))}
            </CustomTextField>

            {showSubFields && (
              <>
                <Divider><CustomChip round='true' size='small' label='Suscripción' color='primary' variant='tonal' /></Divider>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <CustomTextField
                      fullWidth size='small' label='Monto' type='number'
                      value={formSubAmount} onChange={e => setFormSubAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <CustomTextField select fullWidth size='small' label='Moneda' value={formSubCurrency} onChange={e => setFormSubCurrency(e.target.value)}>
                      <MenuItem value='USD'>USD</MenuItem>
                      <MenuItem value='CLP'>CLP</MenuItem>
                    </CustomTextField>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <CustomTextField select fullWidth size='small' label='Ciclo' value={formSubCycle} onChange={e => setFormSubCycle(e.target.value)}>
                      <MenuItem value='monthly'>Mensual</MenuItem>
                      <MenuItem value='annual'>Anual</MenuItem>
                    </CustomTextField>
                  </Grid>
                </Grid>
                <CustomTextField
                  fullWidth size='small' label='Seats incluidos' type='number'
                  value={formSubSeats} onChange={e => setFormSubSeats(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </>
            )}

            {showCreditFields && (
              <>
                <Divider><CustomChip round='true' size='small' label='Créditos' color='warning' variant='tonal' /></Divider>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <CustomTextField
                      fullWidth size='small' label='Unidad de crédito'
                      value={formCreditUnit} onChange={e => setFormCreditUnit(e.target.value)}
                      helperText='Ej: token, render, generation'
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <CustomTextField
                      fullWidth size='small' label='Incluidos/mes' type='number'
                      value={formCreditsIncluded} onChange={e => setFormCreditsIncluded(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <CustomTextField
                      fullWidth size='small' label='Costo unitario' type='number'
                      value={formCreditCost} onChange={e => setFormCreditCost(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <CustomTextField select fullWidth size='small' label='Moneda' value={formCreditCurrency} onChange={e => setFormCreditCurrency(e.target.value)}>
                      <MenuItem value='USD'>USD</MenuItem>
                      <MenuItem value='CLP'>CLP</MenuItem>
                    </CustomTextField>
                  </Grid>
                </Grid>
              </>
            )}

            <CustomTextField
              fullWidth size='small' label='Descripción'
              value={formDesc} onChange={e => setFormDesc(e.target.value)}
              multiline rows={2}
            />
            <CustomTextField
              fullWidth size='small' label='URL ícono'
              value={formIconUrl} onChange={e => setFormIconUrl(e.target.value)}
              helperText='URL de la imagen del ícono de la herramienta'
            />
            <FormControlLabel
              control={<Switch checked={formActive} onChange={(_, v) => setFormActive(v)} color='success' />}
              label={formActive ? 'Activa' : 'Inactiva'}
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 4, py: 2.5 }}>
          <Button variant='tonal' color='secondary' onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant='contained' onClick={handleSave} disabled={saving || !formName || !formProvider || !formCategory || !formCostModel}>
            {saving ? 'Guardando...' : editTool ? 'Guardar cambios' : 'Crear herramienta'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default AiCatalogTab
