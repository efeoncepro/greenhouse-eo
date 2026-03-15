'use client'

import { useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import type { AiTool, ProviderRecord, AiToolingAdminMetadata } from '@/types/ai-tools'
import { toolCategoryConfig, costModelConfig, formatCost } from '../helpers'

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
  const [search, setSearch] = useState('')

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

  const providerOptions = [...(meta?.providers ?? []), ...providers].reduce<ProviderRecord[]>((acc, p) => {
    if (!p.providerId || acc.some(item => item.providerId === p.providerId)) return acc
    acc.push(p)
    return acc
  }, [])

  const filtered = tools.filter(t => {
    if (filterCategory && t.toolCategory !== filterCategory) return false
    if (filterProvider && t.providerId !== filterProvider) return false
    if (search && !t.toolName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const hasFilters = Boolean(filterCategory || filterProvider || search)

  return (
    <>
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Catálogo de herramientas AI'
          subheader={tools.length > 0 ? `${tools.length} herramientas registradas` : undefined}
          avatar={
            <CustomAvatar variant='rounded' skin='light' color='primary' size={40}>
              <i className='tabler-wand' style={{ fontSize: 22 }} />
            </CustomAvatar>
          }
          action={
            <Button variant='contained' size='small' startIcon={<i className='tabler-plus' />} onClick={openCreate}>
              Nueva herramienta
            </Button>
          }
        />
        <Divider />
        <CardContent>
          {/* Filters */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomTextField
                fullWidth
                size='small'
                placeholder='Buscar herramienta...'
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: 'var(--mui-palette-text-disabled)' }} />
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <CustomTextField
                select fullWidth size='small' label='Categoría'
                value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              >
                <MenuItem value=''>Todas las categorías</MenuItem>
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
            <Grid size={{ xs: 12, sm: 3 }}>
              <CustomTextField
                select fullWidth size='small' label='Proveedor'
                value={filterProvider} onChange={e => setFilterProvider(e.target.value)}
              >
                <MenuItem value=''>Todos los proveedores</MenuItem>
                {providerOptions.map(p => (
                  <MenuItem key={p.providerId} value={p.providerId}>{p.providerName}</MenuItem>
                ))}
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              {hasFilters && (
                <Button
                  variant='tonal'
                  color='secondary'
                  size='small'
                  fullWidth
                  onClick={() => { setSearch(''); setFilterCategory(''); setFilterProvider('') }}
                  startIcon={<i className='tabler-filter-off' />}
                  sx={{ height: 40 }}
                >
                  Limpiar
                </Button>
              )}
            </Grid>
          </Grid>

          {/* Table */}
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                    Herramienta
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                    Proveedor
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                    Categoría
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                    Modelo de costo
                  </TableCell>
                  <TableCell align='right' sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                    Costo unitario
                  </TableCell>
                  <TableCell align='center' sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                    Estado
                  </TableCell>
                  <TableCell sx={{ width: 48 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(tool => {
                  const catConf = toolCategoryConfig[tool.toolCategory]
                  const costConf = costModelConfig[tool.costModel]

                  return (
                    <TableRow key={tool.toolId} hover sx={{ cursor: 'pointer' }} onClick={() => openEdit(tool)}>
                      <TableCell>
                        <Stack direction='row' spacing={2} alignItems='center'>
                          <CustomAvatar variant='rounded' skin='light' color={catConf?.color === 'default' ? 'secondary' : catConf?.color ?? 'primary'} size={34}>
                            <i className={catConf?.icon ?? 'tabler-puzzle'} style={{ fontSize: 18 }} />
                          </CustomAvatar>
                          <Box>
                            <Typography variant='body2' fontWeight={600}>{tool.toolName}</Typography>
                            {tool.description && (
                              <Typography variant='caption' color='text.disabled' sx={{ display: 'block', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {tool.description}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>{tool.providerName ?? tool.vendor ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <CustomChip
                          round='true'
                          size='small'
                          label={catConf?.label ?? tool.toolCategory}
                          color={catConf?.color === 'default' ? 'secondary' : catConf?.color ?? 'secondary'}
                          variant='tonal'
                        />
                      </TableCell>
                      <TableCell>
                        <CustomChip
                          round='true'
                          size='small'
                          icon={<i className={costConf?.icon ?? 'tabler-coin'} />}
                          label={costConf?.label ?? tool.costModel}
                          color={costConf?.color === 'default' ? 'secondary' : costConf?.color ?? 'secondary'}
                          variant='tonal'
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {tool.costModel === 'per_credit' || tool.costModel === 'hybrid'
                            ? `${formatCost(tool.creditUnitCost, tool.creditUnitCurrency)} / ${tool.creditUnitName ?? 'unit'}`
                            : tool.costModel === 'subscription'
                              ? `${formatCost(tool.subscriptionAmount, tool.subscriptionCurrency)} / ${tool.subscriptionBillingCycle ?? 'mes'}`
                              : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <CustomChip
                          round='true'
                          size='small'
                          icon={<i className={tool.isActive ? 'tabler-check' : 'tabler-x'} />}
                          label={tool.isActive ? 'Activa' : 'Inactiva'}
                          color={tool.isActive ? 'success' : 'secondary'}
                          variant='tonal'
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <Tooltip title='Editar'>
                          <IconButton size='small' color='secondary' onClick={e => { e.stopPropagation(); openEdit(tool) }}>
                            <i className='tabler-pencil' style={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 8, border: 0 }}>
                      <Stack alignItems='center' spacing={2}>
                        <CustomAvatar variant='rounded' skin='light' color='primary' size={56}>
                          <i className='tabler-wand' style={{ fontSize: 28 }} />
                        </CustomAvatar>
                        {hasFilters ? (
                          <>
                            <Typography variant='h6' color='text.secondary'>Sin resultados</Typography>
                            <Typography variant='body2' color='text.disabled'>
                              No hay herramientas que coincidan con los filtros aplicados.
                            </Typography>
                            <Button
                              variant='tonal'
                              size='small'
                              onClick={() => { setSearch(''); setFilterCategory(''); setFilterProvider('') }}
                              startIcon={<i className='tabler-filter-off' />}
                            >
                              Limpiar filtros
                            </Button>
                          </>
                        ) : (
                          <>
                            <Typography variant='h6' color='text.secondary'>Aún no tienes herramientas</Typography>
                            <Typography variant='body2' color='text.disabled' sx={{ maxWidth: 360, textAlign: 'center' }}>
                              Registra las herramientas AI del ecosistema para gestionar licencias y asignar créditos.
                            </Typography>
                            <Button variant='contained' size='small' startIcon={<i className='tabler-plus' />} onClick={openCreate}>
                              Registrar primera herramienta
                            </Button>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {filtered.length > 0 && (
            <Typography variant='caption' color='text.disabled' sx={{ mt: 2, display: 'block' }}>
              Mostrando {filtered.length} de {tools.length} herramientas
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        maxWidth='sm'
        fullWidth
        closeAfterTransition={false}
      >
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
