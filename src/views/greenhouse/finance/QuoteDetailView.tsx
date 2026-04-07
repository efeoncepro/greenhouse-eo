'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

// ── Types ──

interface QuoteDetail {
  quoteId: string
  clientId: string | null
  clientName: string | null
  quoteNumber: string | null
  quoteDate: string | null
  dueDate: string | null
  expiryDate: string | null
  description: string | null
  currency: string
  subtotal: number | null
  taxRate: number | null
  taxAmount: number | null
  totalAmount: number
  totalAmountClp: number
  status: string
  convertedToIncomeId: string | null
  nuboxDocumentId: string | null
  dteTypeCode: string | null
  dteFolio: string | null
  source: string
  hubspotQuoteId: string | null
  hubspotDealId: string | null
  notes: string | null
}

interface LineItem {
  lineItemId: string
  lineNumber: number | null
  name: string
  description: string | null
  quantity: number
  unitPrice: number
  discountPercent: number | null
  discountAmount: number | null
  taxAmount: number | null
  totalAmount: number | null
  source: string
  product: { name: string; sku: string | null } | null
}

// ── Config ──

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'info' | 'error' | 'primary' | 'secondary' }> = {
  draft: { label: 'Borrador', color: 'secondary' },
  sent: { label: 'Enviada', color: 'info' },
  accepted: { label: 'Aceptada', color: 'success' },
  rejected: { label: 'Rechazada', color: 'error' },
  expired: { label: 'Vencida', color: 'secondary' },
  converted: { label: 'Facturada', color: 'primary' }
}

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

const daysUntil = (date: string | null): number | null => {
  if (!date) return null

  const target = new Date(date)
  const now = new Date()

  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// ── Component ──

const QuoteDetailView = () => {
  const params = useParams()
  const quoteId = params.id as string

  const [loading, setLoading] = useState(true)
  const [quote, setQuote] = useState<QuoteDetail | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [quoteRes, linesRes] = await Promise.all([
        fetch(`/api/finance/quotes/${quoteId}`),
        fetch(`/api/finance/quotes/${quoteId}/lines`)
      ])

      if (!quoteRes.ok) {
        setError('No pudimos cargar esta cotizacion. Verifica que existe o intenta de nuevo.')

        return
      }

      const quoteData = await quoteRes.json()

      setQuote(quoteData)

      if (linesRes.ok) {
        const linesData = await linesRes.json()

        setLineItems(linesData.items ?? [])
      }
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [quoteId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Loading ──

  if (loading) {
    return (
      <Stack spacing={4}>
        <Skeleton variant='rounded' height={40} width={200} />
        <Skeleton variant='rounded' height={80} />
        <Skeleton variant='rounded' height={120} />
        <Skeleton variant='rounded' height={300} />
      </Stack>
    )
  }

  // ── Error ──

  if (error || !quote) {
    return (
      <Stack spacing={4}>
        <Button component={Link} href='/finance/quotes' variant='text' startIcon={<i className='tabler-arrow-left' />}>
          Cotizaciones
        </Button>
        <Alert severity='error'>{error || 'Cotizacion no encontrada'}</Alert>
      </Stack>
    )
  }

  // ── Data ──

  const statusConf = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.draft
  const sourceConf = SOURCE_CHIP_CONFIG[quote.source] ?? SOURCE_CHIP_CONFIG.manual
  const expiryDays = daysUntil(quote.dueDate || quote.expiryDate)

  const expiryColor = (() => {
    if (quote.status === 'expired' || (expiryDays !== null && expiryDays < 0)) return 'error' as const
    if (expiryDays !== null && expiryDays <= 7) return 'warning' as const

    return 'success' as const
  })()

  const expiryLabel = (() => {
    if (expiryDays === null) return 'Sin fecha'
    if (expiryDays < 0) return `Vencida hace ${Math.abs(expiryDays)} dias`

    return `Vence en ${expiryDays} dias`
  })()

  const totalDiscount = lineItems.reduce((sum, li) => sum + (li.discountAmount ?? 0), 0)

  return (
    <Stack spacing={4}>
      {/* ── Back + Header ── */}
      <Box>
        <Button component={Link} href='/finance/quotes' variant='text' startIcon={<i className='tabler-arrow-left' />} sx={{ mb: 1 }}>
          Cotizaciones
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity', width: 48, height: 48 }}>
              <i className='tabler-file-description' style={{ fontSize: 26, color: 'var(--mui-palette-info-main)' }} />
            </Avatar>
            <Box>
              <Typography variant='h5' sx={{ fontWeight: 500 }}>
                {quote.description || quote.quoteNumber || quote.quoteId}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {quote.clientName}{quote.quoteNumber ? ` · ${quote.quoteNumber}` : ''}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <CustomChip round='true' size='small' variant='tonal' color={statusConf.color} label={statusConf.label} />
            <CustomChip round='true' size='small' variant='tonal' color={sourceConf.color} label={sourceConf.label} />
            {quote.hubspotQuoteId && (
              <Button
                variant='outlined'
                size='small'
                startIcon={<i className='tabler-external-link' />}
                href={`https://app.hubspot.com/contacts/48713323/record/0-14/${quote.hubspotQuoteId}`}
                target='_blank'
                rel='noopener noreferrer'
                aria-label={`Abrir cotizacion ${quote.quoteNumber || quote.quoteId} en HubSpot`}
              >
                Ver en HubSpot
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── KPIs ── */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Monto total'
            stats={formatCLP(quote.totalAmountClp)}
            subtitle={quote.currency !== 'CLP' ? `${quote.currency} → CLP` : 'CLP'}
            avatarIcon='tabler-currency-dollar'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Items'
            stats={String(lineItems.length)}
            subtitle={lineItems.length === 1 ? '1 item en esta cotizacion' : `${lineItems.length} items en esta cotizacion`}
            avatarIcon='tabler-list-details'
            avatarColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Descuento'
            stats={totalDiscount > 0 ? formatCLP(totalDiscount) : '$0'}
            subtitle={totalDiscount > 0 ? 'Descuento aplicado' : 'Sin descuento'}
            avatarIcon='tabler-discount-2'
            avatarColor={totalDiscount > 0 ? 'warning' : 'secondary'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Vencimiento'
            stats={formatDate(quote.dueDate || quote.expiryDate)}
            subtitle={expiryLabel}
            avatarIcon='tabler-calendar-due'
            avatarColor={expiryColor}
          />
        </Grid>
      </Grid>

      {/* ── Detalle ── */}
      <Card variant='outlined'>
        <CardHeader
          title='Detalle de la cotizacion'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'secondary.lightOpacity' }}>
              <i className='tabler-info-circle' style={{ fontSize: 22, color: 'var(--mui-palette-secondary-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <CardContent>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant='caption' color='text.secondary'>Cliente</Typography>
              <Typography variant='body2'>{quote.clientName ?? '—'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant='caption' color='text.secondary'>Fecha de emision</Typography>
              <Typography variant='body2'>{formatDate(quote.quoteDate)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant='caption' color='text.secondary'>Vencimiento</Typography>
              <Typography variant='body2'>{formatDate(quote.dueDate || quote.expiryDate)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant='caption' color='text.secondary'>Moneda</Typography>
              <Typography variant='body2'>{quote.currency}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant='caption' color='text.secondary'>Fuente</Typography>
              <Typography variant='body2'>{sourceConf.label}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant='caption' color='text.secondary'>Estado</Typography>
              <Typography variant='body2'>{statusConf.label}</Typography>
            </Grid>
            {quote.dteFolio && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant='caption' color='text.secondary'>Folio DTE</Typography>
                <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{quote.dteFolio}</Typography>
              </Grid>
            )}
            {quote.hubspotDealId && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Typography variant='caption' color='text.secondary'>Deal HubSpot</Typography>
                <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{quote.hubspotDealId}</Typography>
              </Grid>
            )}
            {quote.notes && (
              <Grid size={{ xs: 12 }}>
                <Typography variant='caption' color='text.secondary'>Notas</Typography>
                <Typography variant='body2'>{quote.notes}</Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* ── Line Items ── */}
      <Card variant='outlined'>
        <CardHeader
          title={`Items de la cotizacion (${lineItems.length})`}
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-list-details' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            </Avatar>
          }
        />
        <Divider />

        {lineItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }} role='status'>
            <Typography variant='body2' color='text.secondary'>
              Esta cotizacion no tiene items detallados
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 40 }}>#</TableCell>
                    <TableCell>Producto</TableCell>
                    <TableCell>Descripcion</TableCell>
                    <TableCell align='right'>Cantidad</TableCell>
                    <TableCell align='right'>Precio unitario</TableCell>
                    <TableCell align='right'>Descuento</TableCell>
                    <TableCell align='right'>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineItems.map((li, idx) => (
                    <TableRow key={li.lineItemId} hover>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>{li.lineNumber ?? idx + 1}</Typography>
                      </TableCell>
                      <TableCell>
                        {li.product ? (
                          <Box>
                            <Typography variant='body2' sx={{ fontWeight: 500 }}>{li.product.name}</Typography>
                            {li.product.sku && (
                              <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                                {li.product.sku}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant='body2' color='text.secondary'>—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{li.name}</Typography>
                        {li.description && (
                          <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                            {li.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>{li.quantity}</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatCLP(li.unitPrice)}</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        {(li.discountPercent && li.discountPercent > 0) ? (
                          <Typography variant='body2' color='warning.main'>{li.discountPercent}%</Typography>
                        ) : (
                          <Typography variant='body2' color='text.secondary'>—</Typography>
                        )}
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                          {li.totalAmount !== null ? formatCLP(li.totalAmount) : formatCLP(li.quantity * li.unitPrice)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            {/* ── Totales ── */}
            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 3 }}>
              <Box sx={{ minWidth: 220 }}>
                {quote.subtotal !== null && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant='body2' color='text.secondary'>Subtotal</Typography>
                    <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatCLP(quote.subtotal)}</Typography>
                  </Box>
                )}
                {quote.taxAmount !== null && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant='body2' color='text.secondary'>
                      IVA{quote.taxRate ? ` (${Math.round(quote.taxRate * 100)}%)` : ''}
                    </Typography>
                    <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{formatCLP(quote.taxAmount)}</Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='subtitle2'>Total</Typography>
                  <Typography variant='subtitle2' sx={{ fontFamily: 'monospace' }}>{formatCLP(quote.totalAmountClp)}</Typography>
                </Box>
              </Box>
            </Box>
          </>
        )}
      </Card>
    </Stack>
  )
}

export default QuoteDetailView
