'use client'

import { useCallback, useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import QuoteCreateDrawer from './workspace/QuoteCreateDrawer'

// ── Types ──

interface Quote {
  quoteId: string
  clientName: string | null
  quoteNumber: string | null
  quoteDate: string | null
  dueDate: string | null
  totalAmount: number
  totalAmountClp: number
  currency: string
  status: string
  convertedToIncomeId: string | null
  source: string
  hubspotQuoteId: string | null
  isFromNubox: boolean
  currentVersion: number | null
  effectiveMarginPct: number | null
  marginFloorPct: number | null
  targetMarginPct: number | null
}

interface LineItemInput {
  name: string
  quantity: number
  unitPrice: number
  description: string
  productId: string | null
}

interface ProductOption {
  productId: string
  name: string
  sku: string | null
  unitPrice: number | null
}

// ── Status config ──

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'info' | 'error' | 'primary' | 'secondary' | 'warning' }> = {
  draft: { label: 'Borrador', color: 'secondary' },
  pending_approval: { label: 'En aprobación', color: 'warning' },
  sent: { label: 'Enviada', color: 'info' },
  approved: { label: 'Aprobada', color: 'success' },
  accepted: { label: 'Aceptada', color: 'success' },
  rejected: { label: 'Rechazada', color: 'error' },
  expired: { label: 'Vencida', color: 'secondary' },
  converted: { label: 'Facturada', color: 'primary' }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'draft', label: 'Borradores' },
  { value: 'pending_approval', label: 'En aprobación' },
  { value: 'sent', label: 'Enviadas' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'expired', label: 'Vencidas' },
  { value: 'converted', label: 'Facturadas' }
]

const SOURCE_OPTIONS = [
  { value: '', label: 'Todas las fuentes' },
  { value: 'nubox', label: 'Nubox' },
  { value: 'hubspot', label: 'HubSpot' },
  { value: 'manual', label: 'Manual' }
]

const SOURCE_CHIP_CONFIG: Record<string, { label: string; color: 'info' | 'warning' | 'secondary' }> = {
  nubox: { label: 'Nubox', color: 'info' },
  hubspot: { label: 'HubSpot', color: 'warning' },
  manual: { label: 'Manual', color: 'secondary' }
}

// ── Helpers ──

const formatCLP = (amount: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const formatDate = (date: string | null) => {
  if (!date) return '—'

  const [y, m, d] = date.split('-')

  return `${d}/${m}/${y}`
}

const emptyLineItem = (): LineItemInput => ({ name: '', quantity: 1, unitPrice: 0, description: '', productId: null })

// ── Create Quote Drawer ──

const CreateQuoteDrawer = ({
  open,
  onClose,
  onCreated
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState('')
  const [title, setTitle] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [publishImmediately, setPublishImmediately] = useState(false)
  const [lineItems, setLineItems] = useState<LineItemInput[]>([emptyLineItem()])
  const [products, setProducts] = useState<ProductOption[]>([])

  // Fetch product catalog for picker
  useEffect(() => {
    if (!open) return

    fetch('/api/finance/products?active=true')
      .then(r => r.ok ? r.json() : { items: [] })
      .then(data => {
        setProducts((data.items ?? []).map((p: { productId: string; name: string; sku: string | null; unitPrice: number | null }) => ({
          productId: p.productId,
          name: p.name,
          sku: p.sku,
          unitPrice: p.unitPrice
        })))
      })
      .catch(() => setProducts([]))
  }, [open])

  const resetForm = () => {
    setOrganizationId('')
    setTitle('')
    setExpirationDate('')
    setPublishImmediately(false)
    setLineItems([emptyLineItem()])
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const updateLineItem = (index: number, field: keyof LineItemInput, value: string | number | null) => {
    setLineItems(prev => prev.map((li, i) => (i === index ? { ...li, [field]: value } : li)))
  }

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.productId === productId)

    if (product) {
      setLineItems(prev => prev.map((li, i) =>
        i === index
          ? { ...li, name: product.name, unitPrice: product.unitPrice ?? li.unitPrice, productId: product.productId }
          : li
      ))
    }
  }

  const addLineItem = () => setLineItems(prev => [...prev, emptyLineItem()])

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return

    setLineItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setError(null)

    if (!organizationId.trim()) {
      setError('Ingresa el ID de la organizacion')

      return
    }

    if (!title.trim()) {
      setError('Ingresa un titulo para la cotizacion')

      return
    }

    if (!expirationDate || !/^\d{4}-\d{2}-\d{2}$/.test(expirationDate)) {
      setError('Ingresa una fecha de vencimiento valida (AAAA-MM-DD)')

      return
    }

    const validItems = lineItems.filter(li => li.name.trim())

    if (validItems.length === 0) {
      setError('Agrega al menos un item')

      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/finance/quotes/hubspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organizationId.trim(),
          title: title.trim(),
          expirationDate,
          publishImmediately,
          lineItems: validItems.map(li => ({
            name: li.name.trim(),
            quantity: Number(li.quantity) || 1,
            unitPrice: Number(li.unitPrice) || 0,
            description: li.description.trim() || undefined
          }))
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'No se pudo crear la cotizacion')

        return
      }

      handleClose()
      onCreated()
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const totalAmount = lineItems.reduce((sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0), 0)

  return (
    <Drawer anchor='right' open={open} onClose={handleClose} sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 480 } } }}>
      <Box sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
          <Typography variant='h6'>Nueva cotizacion HubSpot</Typography>
          <IconButton onClick={handleClose} aria-label='Cerrar'>
            <i className='tabler-x' />
          </IconButton>
        </Box>

        <Stack spacing={3}>
          <CustomTextField
            fullWidth
            size='small'
            label='ID de organizacion'
            value={organizationId}
            onChange={e => setOrganizationId(e.target.value)}
            placeholder='ej. ORG-0001'
          />
          <CustomTextField
            fullWidth
            size='small'
            label='Titulo'
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder='ej. Propuesta servicios Q2 2026'
          />
          <CustomTextField
            fullWidth
            size='small'
            label='Fecha de vencimiento'
            type='date'
            value={expirationDate}
            onChange={e => setExpirationDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant='subtitle2'>Items</Typography>
              <Button size='small' startIcon={<i className='tabler-plus' />} onClick={addLineItem}>
                Agregar item
              </Button>
            </Box>

            <Stack spacing={2}>
              {lineItems.map((li, i) => (
                <Card key={i} variant='outlined' sx={{ p: 2 }}>
                  <Stack spacing={1.5}>
                    {products.length > 0 && (
                      <CustomTextField
                        select
                        fullWidth
                        size='small'
                        label='Producto del catalogo'
                        value={li.productId || ''}
                        onChange={e => {
                          if (e.target.value) selectProduct(i, e.target.value)
                          else updateLineItem(i, 'productId', null)
                        }}
                      >
                        <MenuItem value=''>Item personalizado</MenuItem>
                        {products.map(p => (
                          <MenuItem key={p.productId} value={p.productId}>
                            {p.name}{p.sku ? ` (${p.sku})` : ''}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Nombre'
                        value={li.name}
                        onChange={e => updateLineItem(i, 'name', e.target.value)}
                      />
                      {lineItems.length > 1 && (
                        <IconButton size='small' onClick={() => removeLineItem(i)} sx={{ mt: 2.5 }} aria-label='Eliminar item'>
                          <i className='tabler-trash' style={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <CustomTextField
                        size='small'
                        label='Cantidad'
                        type='number'
                        value={li.quantity}
                        onChange={e => updateLineItem(i, 'quantity', Number(e.target.value))}
                        sx={{ width: 100 }}
                      />
                      <CustomTextField
                        size='small'
                        label='Precio unitario'
                        type='number'
                        value={li.unitPrice}
                        onChange={e => updateLineItem(i, 'unitPrice', Number(e.target.value))}
                        sx={{ flex: 1 }}
                      />
                    </Box>
                  </Stack>
                </Card>
              ))}
            </Stack>

            {totalAmount > 0 && (
              <Typography variant='body2' sx={{ mt: 1, textAlign: 'right', fontFamily: 'monospace' }}>
                Total estimado: {formatCLP(totalAmount)}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <input
              type='checkbox'
              id='publishImmediately'
              checked={publishImmediately}
              onChange={e => setPublishImmediately(e.target.checked)}
            />
            <label htmlFor='publishImmediately'>
              <Typography variant='body2'>Publicar inmediatamente (sin aprobacion)</Typography>
            </label>
          </Box>

          {error && (
            <Typography variant='body2' color='error' role='alert'>
              {error}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant='tonal' color='secondary' onClick={handleClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant='contained' onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Creando...' : 'Crear cotizacion'}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Drawer>
  )
}

// ── Component ──

interface TemplateOption {
  templateId: string
  templateName: string
  templateCode: string
  pricingModel: 'staff_aug' | 'retainer' | 'project'
  businessLineCode: string | null
  usageCount: number
  defaults: {
    currency: string
    billingFrequency: string
    paymentTermsDays: number
    contractDurationMonths: number | null
  }
}

interface OrganizationOption {
  organizationId: string
  organizationName: string
}

const marginChipColor = (effective: number | null, floor: number | null, target: number | null):
  'success' | 'warning' | 'error' | 'secondary' => {
  if (effective === null) return 'secondary'
  if (floor !== null && effective < floor) return 'error'
  if (target !== null && effective < target) return 'warning'

  return 'success'
}

const QuotesListView = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Quote[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [hubspotDrawerOpen, setHubspotDrawerOpen] = useState(false)
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchQuotes = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      if (statusFilter) params.set('status', statusFilter)
      if (sourceFilter) params.set('source', sourceFilter)

      const res = await fetch(`/api/finance/quotes?${params.toString()}`)

      if (res.ok) {
        const data = await res.json()

        setItems(data.items ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter, sourceFilter])

  useEffect(() => {
    fetchQuotes()
  }, [fetchQuotes])

  const openCreateDrawer = useCallback(async () => {
    setCreateError(null)

    try {
      const [tplRes, orgRes] = await Promise.all([
        fetch('/api/finance/quotation-governance/templates'),
        fetch('/api/organizations?active=true&limit=200').catch(() => null)
      ])

      if (tplRes.ok) {
        const data = await tplRes.json()

        setTemplates(
          (data.items ?? []).map((t: Record<string, unknown>) => ({
            templateId: String(t.templateId),
            templateName: String(t.templateName),
            templateCode: String(t.templateCode),
            pricingModel: (t.pricingModel as 'staff_aug' | 'retainer' | 'project') ?? 'project',
            businessLineCode: t.businessLineCode ? String(t.businessLineCode) : null,
            usageCount: Number(t.usageCount ?? 0),
            defaults: {
              currency: String(t.defaultCurrency ?? 'CLP'),
              billingFrequency: String(t.defaultBillingFrequency ?? 'monthly'),
              paymentTermsDays: Number(t.defaultPaymentTermsDays ?? 30),
              contractDurationMonths:
                t.defaultContractDurationMonths !== null && t.defaultContractDurationMonths !== undefined
                  ? Number(t.defaultContractDurationMonths)
                  : null
            }
          }))
        )
      }

      if (orgRes && orgRes.ok) {
        const data = await orgRes.json()

        setOrganizations(
          (data.items ?? []).map((o: Record<string, unknown>) => ({
            organizationId: String(o.organizationId ?? o.organization_id),
            organizationName: String(o.organizationName ?? o.organization_name ?? o.name ?? 'Sin nombre')
          }))
        )
      }
    } catch {
      // Silent fallback — drawer still opens with empty org/template lists
    }

    setCreateDrawerOpen(true)
  }, [])

  const handleCreateQuote = useCallback(
    async (payload: Parameters<React.ComponentProps<typeof QuoteCreateDrawer>['onSubmit']>[0]) => {
      setCreating(true)
      setCreateError(null)

      try {
        const res = await fetch('/api/finance/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: payload.templateId,
            organizationId: payload.organizationId,
            description: payload.description,
            pricingModel: payload.pricingModel,
            currency: payload.currency,
            billingFrequency: payload.billingFrequency,
            contractDurationMonths: payload.contractDurationMonths,
            validUntil: payload.validUntil,
            lineItems: payload.lineItems.map(li => ({
              label: li.label,
              lineType: 'deliverable' as const,
              unit: li.unit,
              quantity: li.quantity,
              unitPrice: li.unitPrice
            }))
          })
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))

          setCreateError(body.error || 'No pudimos crear la cotización.')

          return
        }

        const created = await res.json()

        setCreateDrawerOpen(false)
        await fetchQuotes()

        if (created.quotationId) {
          router.push(`/finance/quotes/${created.quotationId}`)
        }
      } catch {
        setCreateError('Error de conexión. Intenta de nuevo.')
      } finally {
        setCreating(false)
      }
    },
    [fetchQuotes, router]
  )

  if (loading) {
    return (
      <Stack spacing={4}>
        <Skeleton variant='rounded' height={56} />
        <Skeleton variant='rounded' height={400} />
      </Stack>
    )
  }

  return (
    <Stack spacing={4}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 500 }}>Cotizaciones</Typography>
          <Typography variant='body2' color='text.secondary'>
            Cotizaciones sincronizadas desde Nubox y HubSpot
          </Typography>
        </Box>
        <Stack direction='row' spacing={1}>
          <Button
            variant='outlined'
            startIcon={<i className='tabler-brand-hubspot' />}
            onClick={() => setHubspotDrawerOpen(true)}
          >
            HubSpot
          </Button>
          <Button
            variant='contained'
            startIcon={<i className='tabler-plus' />}
            onClick={openCreateDrawer}
          >
            Nueva cotización
          </Button>
        </Stack>
      </Box>

      <Card variant='outlined'>
        <CardHeader
          title='Registro de cotizaciones'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
              <i className='tabler-file-description' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
            </Avatar>
          }
          action={
            <CustomChip round='true' size='small' variant='tonal' color='secondary' label={`${items.length} cotizaciones`} />
          }
        />
        <Divider />
        <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <CustomTextField
            select
            size='small'
            label='Estado'
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            {STATUS_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            select
            size='small'
            label='Fuente'
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            {SOURCE_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </CustomTextField>
        </CardContent>
        <Divider />

        {items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }} role='status'>
            <Typography variant='h6' sx={{ mb: 1 }}>Sin cotizaciones</Typography>
            <Typography variant='body2' color='text.secondary'>
              Las cotizaciones aparecen aqui cuando se sincronizan desde Nubox o HubSpot.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>N°</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Vencimiento</TableCell>
                  <TableCell align='right'>Monto</TableCell>
                  <TableCell>Versión</TableCell>
                  <TableCell>Margen</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Fuente</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map(q => {
                  const statusConf = STATUS_CONFIG[q.status] ?? STATUS_CONFIG.draft
                  const sourceConf = SOURCE_CHIP_CONFIG[q.source] ?? SOURCE_CHIP_CONFIG.manual
                  const marginColor = marginChipColor(q.effectiveMarginPct, q.marginFloorPct, q.targetMarginPct)

                  return (
                    <TableRow key={q.quoteId} hover sx={{ cursor: 'pointer' }} onClick={() => router.push(`/finance/quotes/${q.quoteId}`)}>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {q.quoteNumber ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{q.clientName ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>{formatDate(q.quoteDate)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>{formatDate(q.dueDate)}</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatCLP(q.totalAmountClp)}</Typography>
                      </TableCell>
                      <TableCell>
                        {q.currentVersion && q.currentVersion > 1 ? (
                          <CustomChip round='true' size='small' variant='outlined' color='secondary' label={`v${q.currentVersion}`} />
                        ) : (
                          <Typography variant='caption' color='text.secondary'>v1</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {q.effectiveMarginPct !== null ? (
                          <CustomChip round='true' size='small' variant='tonal' color={marginColor} label={`${q.effectiveMarginPct.toFixed(1)}%`} />
                        ) : (
                          <Typography variant='caption' color='text.secondary'>—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <CustomChip round='true' size='small' variant='tonal' color={statusConf.color} label={statusConf.label} />
                      </TableCell>
                      <TableCell>
                        <CustomChip round='true' size='small' variant='tonal' color={sourceConf.color} label={sourceConf.label} sx={{ height: 20, fontSize: '0.65rem' }} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      <CreateQuoteDrawer
        open={hubspotDrawerOpen}
        onClose={() => setHubspotDrawerOpen(false)}
        onCreated={fetchQuotes}
      />

      <QuoteCreateDrawer
        open={createDrawerOpen}
        submitting={creating}
        error={createError}
        templates={templates}
        organizations={organizations}
        onClose={() => setCreateDrawerOpen(false)}
        onSubmit={handleCreateQuote}
      />
    </Stack>
  )
}

export default QuotesListView
