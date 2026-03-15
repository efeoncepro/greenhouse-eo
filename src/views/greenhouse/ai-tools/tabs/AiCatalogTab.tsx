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
import Typography from '@mui/material/Typography'

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

  const openCreate = () => {
    setEditTool(null)
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

  const providerOptions = [...(meta?.providers ?? []), ...providers].reduce<ProviderRecord[]>((accumulator, provider) => {
    if (!provider.providerId || accumulator.some(item => item.providerId === provider.providerId)) {
      return accumulator
    }

    accumulator.push(provider)

    return accumulator
  }, [])

  const filtered = tools.filter(t => {
    if (filterCategory && t.toolCategory !== filterCategory) return false
    if (filterProvider && t.providerId !== filterProvider) return false
    if (search && !t.toolName.toLowerCase().includes(search.toLowerCase())) return false

    return true
  })

  return (
    <>
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Catálogo de herramientas AI'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-wand' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            </Avatar>
          }
          action={
            <Button variant='contained' size='small' startIcon={<i className='tabler-plus' />} onClick={openCreate}>
              Nueva herramienta
            </Button>
          }
        />
        <Divider />
        <CardContent>
          <Stack direction='row' spacing={2} sx={{ mb: 3 }} flexWrap='wrap'>
            <CustomTextField
              size='small'
              placeholder='Buscar herramienta...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ width: 220 }}
              InputProps={{
                startAdornment: <i className='tabler-search' style={{ marginRight: 8, color: 'var(--mui-palette-text-disabled)' }} />
              }}
            />
            <CustomTextField
              select
              size='small'
              label='Categoría'
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value=''>Todas</MenuItem>
              {(meta?.toolCategories ?? []).map(cat => (
                <MenuItem key={cat} value={cat}>{toolCategoryConfig[cat]?.label ?? cat}</MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              select
              size='small'
              label='Proveedor'
              value={filterProvider}
              onChange={e => setFilterProvider(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value=''>Todos</MenuItem>
              {providerOptions.map(p => (
                <MenuItem key={p.providerId} value={p.providerId}>{p.providerName}</MenuItem>
              ))}
            </CustomTextField>
          </Stack>

          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Herramienta</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Modelo de costo</TableCell>
                  <TableCell align='right'>Costo unitario</TableCell>
                  <TableCell align='center'>Estado</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(tool => {
                  const catConf = toolCategoryConfig[tool.toolCategory]
                  const costConf = costModelConfig[tool.costModel]

                  return (
                    <TableRow key={tool.toolId} hover>
                      <TableCell>
                        <Box>
                          <Typography variant='body2' fontWeight={500}>{tool.toolName}</Typography>
                          {tool.toolSubcategory && (
                            <Typography variant='caption' color='text.disabled'>{tool.toolSubcategory}</Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <CustomChip round='true' size='small' label={tool.providerName ?? tool.vendor ?? '—'} color='info' />
                      </TableCell>
                      <TableCell>
                        <CustomChip
                          round='true'
                          size='small'
                          icon={<i className={catConf?.icon ?? 'tabler-puzzle'} />}
                          label={catConf?.label ?? tool.toolCategory}
                          color={catConf?.color === 'default' ? 'secondary' : catConf?.color ?? 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        <CustomChip
                          round='true'
                          size='small'
                          icon={<i className={costConf?.icon ?? 'tabler-coin'} />}
                          label={costConf?.label ?? tool.costModel}
                          color={costConf?.color === 'default' ? 'secondary' : costConf?.color ?? 'secondary'}
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
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
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <Button variant='tonal' size='small' color='secondary' onClick={() => openEdit(tool)}>
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align='center' sx={{ py: 6 }}>
                      <Stack alignItems='center' spacing={1}>
                        <i className='tabler-wand' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
                        <Typography color='text.secondary'>No hay herramientas configuradas.</Typography>
                        <Typography variant='caption' color='text.disabled'>
                          El catálogo se llenará al registrar herramientas AI del ecosistema.
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
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
        <DialogTitle>{editTool ? 'Editar herramienta' : 'Nueva herramienta'}</DialogTitle>
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
            <CustomTextField
              select fullWidth size='small' label='Proveedor'
              value={formProvider} onChange={e => setFormProvider(e.target.value)}
              helperText={providerOptions.length === 0 ? 'No hay providers canónicos disponibles todavía.' : undefined}
              required
            >
              {providerOptions.length === 0 ? (
                <MenuItem disabled value=''>
                  No hay providers disponibles
                </MenuItem>
              ) : (
                providerOptions.map(p => (
                  <MenuItem key={p.providerId} value={p.providerId}>{p.providerName}</MenuItem>
                ))
              )}
            </CustomTextField>
            <CustomTextField
              select fullWidth size='small' label='Categoría'
              value={formCategory} onChange={e => setFormCategory(e.target.value)}
              required
            >
              {(meta?.toolCategories ?? []).map(cat => (
                <MenuItem key={cat} value={cat}>{toolCategoryConfig[cat]?.label ?? cat}</MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              select fullWidth size='small' label='Modelo de costo'
              value={formCostModel} onChange={e => setFormCostModel(e.target.value)}
              required
            >
              {(meta?.costModels ?? []).map(cm => (
                <MenuItem key={cm} value={cm}>{costModelConfig[cm]?.label ?? cm}</MenuItem>
              ))}
            </CustomTextField>

            {showSubFields && (
              <>
                <Divider><Typography variant='caption' color='text.secondary'>Suscripción</Typography></Divider>
                <Stack direction='row' spacing={2}>
                  <CustomTextField
                    size='small' label='Monto' type='number'
                    value={formSubAmount} onChange={e => setFormSubAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    sx={{ flex: 1 }}
                  />
                  <CustomTextField
                    select size='small' label='Moneda'
                    value={formSubCurrency} onChange={e => setFormSubCurrency(e.target.value)}
                    sx={{ width: 100 }}
                  >
                    <MenuItem value='USD'>USD</MenuItem>
                    <MenuItem value='CLP'>CLP</MenuItem>
                  </CustomTextField>
                </Stack>
                <Stack direction='row' spacing={2}>
                  <CustomTextField
                    select size='small' label='Ciclo'
                    value={formSubCycle} onChange={e => setFormSubCycle(e.target.value)}
                    sx={{ flex: 1 }}
                  >
                    <MenuItem value='monthly'>Mensual</MenuItem>
                    <MenuItem value='annual'>Anual</MenuItem>
                  </CustomTextField>
                  <CustomTextField
                    size='small' label='Seats' type='number'
                    value={formSubSeats} onChange={e => setFormSubSeats(e.target.value === '' ? '' : Number(e.target.value))}
                    sx={{ width: 100 }}
                  />
                </Stack>
              </>
            )}

            {showCreditFields && (
              <>
                <Divider><Typography variant='caption' color='text.secondary'>Créditos</Typography></Divider>
                <Stack direction='row' spacing={2}>
                  <CustomTextField
                    size='small' label='Unidad de crédito'
                    value={formCreditUnit} onChange={e => setFormCreditUnit(e.target.value)}
                    sx={{ flex: 1 }} helperText='Ej: token, render, generation'
                  />
                  <CustomTextField
                    size='small' label='Incluidos/mes' type='number'
                    value={formCreditsIncluded} onChange={e => setFormCreditsIncluded(e.target.value === '' ? '' : Number(e.target.value))}
                    sx={{ width: 130 }}
                  />
                </Stack>
                <Stack direction='row' spacing={2}>
                  <CustomTextField
                    size='small' label='Costo unitario' type='number'
                    value={formCreditCost} onChange={e => setFormCreditCost(e.target.value === '' ? '' : Number(e.target.value))}
                    sx={{ flex: 1 }}
                  />
                  <CustomTextField
                    select size='small' label='Moneda'
                    value={formCreditCurrency} onChange={e => setFormCreditCurrency(e.target.value)}
                    sx={{ width: 100 }}
                  >
                    <MenuItem value='USD'>USD</MenuItem>
                    <MenuItem value='CLP'>CLP</MenuItem>
                  </CustomTextField>
                </Stack>
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
            />
            <FormControlLabel
              control={<Switch checked={formActive} onChange={(_, v) => setFormActive(v)} />}
              label='Activa'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant='contained' onClick={handleSave} disabled={saving || !formName || !formProvider || !formCategory || !formCostModel}>
            {saving ? 'Guardando...' : editTool ? 'Guardar cambios' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default AiCatalogTab
