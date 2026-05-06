'use client'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'
import CustomChip from '@core/components/mui/Chip'

const TASK407_ARIA_CONVERTIR_COTIZACION_A_FACTURA_DIRECTA = "Convertir cotización a factura directa"


const GREENHOUSE_COPY = getMicrocopy()

interface DocumentChainPurchaseOrder {
  poId: string
  poNumber: string
  status: 'active' | 'consumed' | 'expired' | 'cancelled'
  authorizedAmountClp: number | null
  invoicedAmountClp: number | null
  remainingAmountClp: number | null
  issueDate: string | null
  expiryDate: string | null
  description: string | null
}

interface DocumentChainServiceEntry {
  hesId: string
  hesNumber: string
  purchaseOrderId: string | null
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled'
  servicePeriodStart: string | null
  servicePeriodEnd: string | null
  amountClp: number | null
  amountAuthorizedClp: number | null
  incomeId: string | null
  invoiced: boolean
  submittedAt: string | null
  approvedAt: string | null
}

interface DocumentChainIncome {
  incomeId: string
  invoiceNumber: string | null
  invoiceDate: string | null
  totalAmount: number
  totalAmountClp: number
  currency: string
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue' | 'written_off'
  sourceHesId: string | null
  nuboxDocumentId: string | null
  dteFolio: string | null
}

interface DocumentChainTotals {
  quoted: number | null
  authorized: number | null
  invoiced: number | null
  authorizedVsQuotedDelta: number | null
  invoicedVsQuotedDelta: number | null
}

export interface QuoteDocumentChainProps {
  loading: boolean
  error: string | null
  quotationStatus: string
  purchaseOrders: DocumentChainPurchaseOrder[]
  serviceEntries: DocumentChainServiceEntry[]
  incomes: DocumentChainIncome[]
  totals: DocumentChainTotals
  currency: string
  canConvertSimple: boolean
  canLinkExisting: boolean
  converting: boolean
  onConvertSimple: () => void
  onGoToPurchaseOrder?: (poId: string) => void
  onGoToHes?: (hesId: string) => void
  onGoToIncome?: (incomeId: string) => void
}

type SemanticColor = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary' | 'default'

const formatCLP = (amount: number | null): string => {
  if (amount === null) return '—'

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount)
}

const formatAmount = (amount: number, currency: string): string => {
  try {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amount)
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString('es-CL')}`
  }
}

const formatDate = (iso: string | null): string => {
  if (!iso) return '—'

  const d = new Date(iso)

  if (Number.isNaN(d.getTime())) return '—'

  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

const QUOTATION_STATUS_META: Record<string, { label: string; color: SemanticColor }> = {
  draft: { label: GREENHOUSE_COPY.states.draft, color: 'secondary' },
  in_review: { label: GREENHOUSE_COPY.states.inReview, color: 'info' },
  pending_approval: { label: 'En aprobación', color: 'warning' },
  approval_rejected: { label: 'Revisión requerida', color: 'error' },
  issued: { label: 'Emitida', color: 'info' },
  sent: { label: 'Emitida', color: 'info' },
  approved: { label: 'Emitida', color: 'info' },
  rejected: { label: 'Revisión requerida', color: 'error' },
  expired: { label: 'Expirada', color: 'warning' },
  cancelled: { label: 'Cancelada', color: 'secondary' },
  converted: { label: 'Convertida', color: 'success' }
}

const PO_STATUS_META: Record<DocumentChainPurchaseOrder['status'], { label: string; color: SemanticColor }> = {
  active: { label: 'Activa', color: 'info' },
  consumed: { label: 'Consumida', color: 'success' },
  expired: { label: 'Expirada', color: 'warning' },
  cancelled: { label: 'Cancelada', color: 'secondary' }
}

const HES_STATUS_META: Record<DocumentChainServiceEntry['status'], { label: string; color: SemanticColor }> = {
  draft: { label: GREENHOUSE_COPY.states.draft, color: 'info' },
  submitted: { label: 'Enviada', color: 'warning' },
  approved: { label: 'Aprobada', color: 'success' },
  rejected: { label: 'Rechazada', color: 'error' },
  cancelled: { label: 'Cancelada', color: 'secondary' }
}

const INCOME_STATUS_META: Record<DocumentChainIncome['paymentStatus'], { label: string; color: SemanticColor }> = {
  pending: { label: GREENHOUSE_COPY.states.pending, color: 'warning' },
  partial: { label: 'Pago parcial', color: 'info' },
  paid: { label: 'Pagada', color: 'success' },
  overdue: { label: 'Vencida', color: 'error' },
  written_off: { label: 'Castigada', color: 'secondary' }
}

const resolveQuotationChip = (status: string): { label: string; color: SemanticColor } => {
  return QUOTATION_STATUS_META[status] ?? { label: status, color: 'secondary' }
}

const formatPeriod = (start: string | null, end: string | null): string => {
  if (!start && !end) return '—'
  if (start && end) return `${formatDate(start)} — ${formatDate(end)}`

  return formatDate(start ?? end)
}

interface DeltaChipProps {
  deltaPct: number | null
  size?: 'small' | 'medium'
}

const DeltaChip = ({ deltaPct, size = 'small' }: DeltaChipProps) => {
  if (deltaPct === null || Number.isNaN(deltaPct)) {
    return (
      <CustomChip
        round='true'
        size={size}
        variant='tonal'
        color='secondary'
        label='Sin comparación'
      />
    )
  }

  const rounded = Math.round(deltaPct * 10) / 10
  const abs = Math.abs(rounded)

  if (rounded === 0) {
    return (
      <CustomChip
        round='true'
        size={size}
        variant='tonal'
        color='success'
        label='Alineado con cotizado'
      />
    )
  }

  if (rounded > 0) {
    const color: SemanticColor = rounded > 10 ? 'warning' : 'info'

    return (
      <CustomChip
        round='true'
        size={size}
        variant='tonal'
        color={color}
        label={`+${abs.toFixed(1)}% sobre cotizado`}
      />
    )
  }

  return (
    <CustomChip
      round='true'
      size={size}
      variant='tonal'
      color='info'
      label={`-${abs.toFixed(1)}% bajo cotizado`}
    />
  )
}

interface KpiTileProps {
  label: string
  value: number | null
  icon: string
  color: SemanticColor
  deltaPct?: number | null
  showDelta?: boolean
}

const KpiTile = ({ label, value, icon, color, deltaPct, showDelta }: KpiTileProps) => (
  <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}`, height: '100%' }}>
    <CardContent>
      <Stack spacing={2}>
        <Stack direction='row' spacing={2} alignItems='center'>
          <Avatar
            variant='rounded'
            sx={{ bgcolor: `${color}.lightOpacity`, width: 40, height: 40 }}
          >
            <i className={icon} style={{ fontSize: 20, color: `var(--mui-palette-${color}-main)` }} aria-hidden='true' />
          </Avatar>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              {label}
            </Typography>
            <Typography variant='h5' sx={{ fontWeight: 500, lineHeight: 1.2 }}>
              {formatCLP(value)}
            </Typography>
          </Box>
        </Stack>
        {showDelta && (
          <Box>
            <DeltaChip deltaPct={deltaPct ?? null} />
          </Box>
        )}
      </Stack>
    </CardContent>
  </Card>
)

interface SectionHeaderProps {
  icon: string
  title: string
  count: number
  color: SemanticColor
}

const SectionHeader = ({ icon, title, count, color }: SectionHeaderProps) => (
  <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 1.5 }}>
    <Avatar variant='rounded' sx={{ bgcolor: `${color}.lightOpacity`, width: 32, height: 32 }}>
      <i className={icon} style={{ fontSize: 16, color: `var(--mui-palette-${color}-main)` }} aria-hidden='true' />
    </Avatar>
    <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
      {title}
    </Typography>
    <CustomChip round='true' size='small' variant='tonal' color={color} label={String(count)} />
  </Stack>
)

const QuoteDocumentChain = ({
  loading,
  error,
  quotationStatus,
  purchaseOrders,
  serviceEntries,
  incomes,
  totals,
  currency,
  canConvertSimple,
  canLinkExisting,
  converting,
  onConvertSimple,
  onGoToPurchaseOrder,
  onGoToHes,
  onGoToIncome
}: QuoteDocumentChainProps) => {
  const hasEnterpriseDocs = purchaseOrders.length > 0 || serviceEntries.length > 0
  const hasIncomes = incomes.length > 0

  const subheader = hasEnterpriseDocs
    ? 'Rama enterprise (OC → HES → Factura)'
    : hasIncomes
      ? 'Rama simple (Cotización → Factura)'
      : 'Sin documentos aún'

  const quotationChip = resolveQuotationChip(quotationStatus)
  const hesByPoId = new Map<string, DocumentChainServiceEntry[]>()

  for (const entry of serviceEntries) {
    const key = entry.purchaseOrderId ?? 'unlinked'
    const existing = hesByPoId.get(key) ?? []

    existing.push(entry)
    hesByPoId.set(key, existing)
  }

  const convertTooltip = canConvertSimple
    ? 'Crea una factura directa sin orden de compra ni HES. Úsalo solo en ventas sin ciclo enterprise.'
    : 'Disponible cuando la cotización está aprobada y aún no tiene OC, HES ni factura asociada.'

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardHeader
        title='Cadena documental'
        subheader={subheader}
        avatar={
          <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
            <i
              className='tabler-link'
              style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }}
              aria-hidden='true'
            />
          </Avatar>
        }
        action={
          canConvertSimple ? (
            <Tooltip title={convertTooltip} arrow>
              <span>
                <Button
                  variant='contained'
                  color='primary'
                  disabled={converting}
                  startIcon={<i className='tabler-receipt' aria-hidden='true' />}
                  onClick={onConvertSimple}
                  aria-label={TASK407_ARIA_CONVERTIR_COTIZACION_A_FACTURA_DIRECTA}
                >
                  {converting ? 'Convirtiendo…' : 'Convertir a factura'}
                </Button>
              </span>
            </Tooltip>
          ) : null
        }
      />
      <Divider />
      <CardContent>
        {loading ? (
          <Stack spacing={3}>
            <Grid container spacing={3}>
              {[0, 1, 2].map(i => (
                <Grid key={i} size={{ xs: 12, md: 4 }}>
                  <Skeleton variant='rounded' height={120} />
                </Grid>
              ))}
            </Grid>
            <Skeleton variant='rounded' height={160} />
            <Skeleton variant='rounded' height={160} />
          </Stack>
        ) : error ? (
          <Alert severity='error' role='alert'>
            {error}
          </Alert>
        ) : (
          <Stack spacing={4}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <KpiTile
                  label='Cotizado'
                  value={totals.quoted}
                  icon='tabler-file-description'
                  color='primary'
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <KpiTile
                  label='Autorizado'
                  value={totals.authorized}
                  icon='tabler-clipboard-check'
                  color='info'
                  deltaPct={totals.authorizedVsQuotedDelta}
                  showDelta={totals.authorized !== null}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <KpiTile
                  label='Facturado'
                  value={totals.invoiced}
                  icon='tabler-receipt'
                  color='success'
                  deltaPct={totals.invoicedVsQuotedDelta}
                  showDelta={totals.invoiced !== null}
                />
              </Grid>
            </Grid>

            <Box>
              <SectionHeader
                icon='tabler-file-description'
                title='Cotización'
                count={1}
                color='primary'
              />
              <Card
                elevation={0}
                sx={{
                  borderLeft: '4px solid',
                  borderLeftColor: 'primary.main',
                  border: theme => `1px solid ${theme.palette.divider}`
                }}
              >
                <CardContent>
                  <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
                    <Box>
                      <Typography variant='body2' color='text.secondary'>
                        Estado actual
                      </Typography>
                      <Typography variant='body1' sx={{ fontWeight: 500 }}>
                        {formatCLP(totals.quoted)}
                      </Typography>
                    </Box>
                    <CustomChip
                      round='true'
                      size='small'
                      variant='tonal'
                      color={quotationChip.color}
                      label={quotationChip.label}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            <Box>
              <SectionHeader
                icon='tabler-clipboard-list'
                title='Órdenes de compra'
                count={purchaseOrders.length}
                color='info'
              />
              {purchaseOrders.length === 0 ? (
                <Alert severity='info' icon={<i className='tabler-info-circle' aria-hidden='true' />}>
                  Sin órdenes de compra vinculadas — rama simple activa.
                </Alert>
              ) : (
                <Stack spacing={2}>
                  {purchaseOrders.map(po => {
                    const meta = PO_STATUS_META[po.status]

                    return (
                      <Card
                        key={po.poId}
                        elevation={0}
                        sx={{
                          borderLeft: '4px solid',
                          borderLeftColor: `${meta.color}.main`,
                          border: theme => `1px solid ${theme.palette.divider}`
                        }}
                      >
                        <CardContent>
                          <Grid container spacing={2} alignItems='center'>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                                sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
                              >
                                Orden de compra
                              </Typography>
                              <Stack direction='row' spacing={1} alignItems='center' sx={{ mt: 0.5 }}>
                                <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                                  {po.poNumber}
                                </Typography>
                                <CustomChip
                                  round='true'
                                  size='small'
                                  variant='tonal'
                                  color={meta.color}
                                  label={meta.label}
                                />
                              </Stack>
                              {po.description && (
                                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
                                  {po.description}
                                </Typography>
                              )}
                            </Grid>
                            <Grid size={{ xs: 6, md: 2 }}>
                              <Typography variant='caption' color='text.secondary'>
                                Autorizado
                              </Typography>
                              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                                {formatCLP(po.authorizedAmountClp)}
                              </Typography>
                            </Grid>
                            <Grid size={{ xs: 6, md: 2 }}>
                              <Typography variant='caption' color='text.secondary'>
                                Disponible
                              </Typography>
                              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                                {formatCLP(po.remainingAmountClp)}
                              </Typography>
                            </Grid>
                            <Grid size={{ xs: 6, md: 2 }}>
                              <Typography variant='caption' color='text.secondary'>
                                Emisión
                              </Typography>
                              <Typography variant='body2'>{formatDate(po.issueDate)}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6, md: 2 }}>
                              {onGoToPurchaseOrder && (
                                <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                                  <Link
                                    component='button'
                                    type='button'
                                    variant='body2'
                                    onClick={() => onGoToPurchaseOrder(po.poId)}
                                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                                    aria-label={`Ver orden de compra ${po.poNumber}`}
                                  >
                                    <i className='tabler-external-link' style={{ fontSize: 14 }} aria-hidden='true' />
                                    Ver OC
                                  </Link>
                                </Box>
                              )}
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    )
                  })}
                </Stack>
              )}
            </Box>

            <Box>
              <SectionHeader
                icon='tabler-file-check'
                title='Hojas de entrada (HES)'
                count={serviceEntries.length}
                color='warning'
              />
              {serviceEntries.length === 0 ? (
                <Alert severity='info' icon={<i className='tabler-info-circle' aria-hidden='true' />}>
                  Sin hojas de entrada de servicio.
                </Alert>
              ) : (
                <Stack spacing={2}>
                  {serviceEntries.map(hes => {
                    const meta = HES_STATUS_META[hes.status]

                    return (
                      <Card
                        key={hes.hesId}
                        elevation={0}
                        sx={{
                          borderLeft: '4px solid',
                          borderLeftColor: `${meta.color}.main`,
                          border: theme => `1px solid ${theme.palette.divider}`
                        }}
                      >
                        <CardContent>
                          <Grid container spacing={2} alignItems='center'>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                                sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
                              >
                                Hoja de entrada
                              </Typography>
                              <Stack direction='row' spacing={1} alignItems='center' sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                                <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                                  {hes.hesNumber}
                                </Typography>
                                <CustomChip
                                  round='true'
                                  size='small'
                                  variant='tonal'
                                  color={meta.color}
                                  label={meta.label}
                                />
                                {hes.invoiced && (
                                  <CustomChip
                                    round='true'
                                    size='small'
                                    variant='tonal'
                                    color='success'
                                    label='Facturada'
                                  />
                                )}
                              </Stack>
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                              <Typography variant='caption' color='text.secondary'>
                                Periodo de servicio
                              </Typography>
                              <Typography variant='body2'>
                                {formatPeriod(hes.servicePeriodStart, hes.servicePeriodEnd)}
                              </Typography>
                            </Grid>
                            <Grid size={{ xs: 6, md: 3 }}>
                              <Typography variant='caption' color='text.secondary'>
                                Monto autorizado
                              </Typography>
                              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                                {formatCLP(hes.amountAuthorizedClp ?? hes.amountClp)}
                              </Typography>
                            </Grid>
                            <Grid size={{ xs: 6, md: 2 }}>
                              {onGoToHes && (
                                <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                                  <Link
                                    component='button'
                                    type='button'
                                    variant='body2'
                                    onClick={() => onGoToHes(hes.hesId)}
                                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                                    aria-label={`Ver hoja de entrada ${hes.hesNumber}`}
                                  >
                                    <i className='tabler-external-link' style={{ fontSize: 14 }} aria-hidden='true' />
                                    Ver HES
                                  </Link>
                                </Box>
                              )}
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    )
                  })}
                </Stack>
              )}
            </Box>

            <Box>
              <SectionHeader
                icon='tabler-receipt'
                title='Facturas'
                count={incomes.length}
                color='success'
              />
              {incomes.length === 0 ? (
                <Alert severity='info' icon={<i className='tabler-info-circle' aria-hidden='true' />}>
                  Aún no se ha emitido factura.
                </Alert>
              ) : (
                <Stack spacing={2}>
                  {incomes.map(income => {
                    const meta = INCOME_STATUS_META[income.paymentStatus]
                    const displayCurrency = income.currency || currency

                    return (
                      <Card
                        key={income.incomeId}
                        elevation={0}
                        sx={{
                          borderLeft: '4px solid',
                          borderLeftColor: `${meta.color}.main`,
                          border: theme => `1px solid ${theme.palette.divider}`
                        }}
                      >
                        <CardContent>
                          <Grid container spacing={2} alignItems='center'>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                                sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
                              >
                                Factura
                              </Typography>
                              <Stack direction='row' spacing={1} alignItems='center' sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                                <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                                  {income.invoiceNumber ?? 'Sin número'}
                                </Typography>
                                <CustomChip
                                  round='true'
                                  size='small'
                                  variant='tonal'
                                  color={meta.color}
                                  label={meta.label}
                                />
                              </Stack>
                              {income.dteFolio && (
                                <Typography
                                  variant='caption'
                                  color='text.secondary'
                                  sx={{ display: 'block', mt: 0.5, fontVariantNumeric: 'tabular-nums' }}
                                >
                                  DTE folio: {income.dteFolio}
                                </Typography>
                              )}
                            </Grid>
                            <Grid size={{ xs: 6, md: 3 }}>
                              <Typography variant='caption' color='text.secondary'>
                                Fecha emisión
                              </Typography>
                              <Typography variant='body2'>{formatDate(income.invoiceDate)}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6, md: 3 }}>
                              <Typography variant='caption' color='text.secondary'>
                                Total
                              </Typography>
                              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                                {formatAmount(income.totalAmount, displayCurrency)}
                              </Typography>
                              {displayCurrency !== 'CLP' && (
                                <Typography variant='caption' color='text.secondary'>
                                  {formatCLP(income.totalAmountClp)} CLP
                                </Typography>
                              )}
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                              {onGoToIncome && (
                                <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                                  <Link
                                    component='button'
                                    type='button'
                                    variant='body2'
                                    onClick={() => onGoToIncome(income.incomeId)}
                                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                                    aria-label={`Ver factura ${income.invoiceNumber ?? income.incomeId}`}
                                  >
                                    <i className='tabler-external-link' style={{ fontSize: 14 }} aria-hidden='true' />
                                    Ver factura
                                  </Link>
                                </Box>
                              )}
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    )
                  })}
                </Stack>
              )}
            </Box>

            {!canConvertSimple && !hasEnterpriseDocs && !hasIncomes && (
              <Alert severity='info' icon={<i className='tabler-info-circle' aria-hidden='true' />}>
                {canLinkExisting
                  ? 'Aprueba la cotización para habilitar la conversión a factura o vincular una orden de compra existente.'
                  : 'Aprueba la cotización para habilitar la conversión a factura.'}
              </Alert>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

export default QuoteDocumentChain
