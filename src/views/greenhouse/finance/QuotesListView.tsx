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
