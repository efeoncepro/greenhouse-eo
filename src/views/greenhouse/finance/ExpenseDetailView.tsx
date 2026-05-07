'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import { toast } from 'sonner'

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
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import PaymentRegistrationCard from '@views/greenhouse/finance/components/PaymentRegistrationCard'
import PaymentHistoryTable from '@views/greenhouse/finance/components/PaymentHistoryTable'
import SettlementOrchestrationDrawer from '@views/greenhouse/finance/drawers/SettlementOrchestrationDrawer'
import { formatCurrency as formatGreenhouseCurrency } from '@/lib/format'

const GREENHOUSE_COPY = getMicrocopy()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExpenseDetail {
  expenseId: string
  expenseType: string
  description: string
  currency: string
  subtotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  exchangeRateToClp: number
  totalAmountClp: number
  paymentDate: string | null
  paymentStatus: string
  paymentMethod: string | null
  paymentReference: string | null
  documentNumber: string | null
  documentDate: string | null
  dueDate: string | null
  supplierId: string | null
  supplierName: string | null
  serviceLine: string | null
  isRecurring: boolean
  isReconciled: boolean
  notes: string | null
  createdAt: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatAmount = (amount: number, currency: string) =>
  formatGreenhouseCurrency(amount, currency, {
  maximumFractionDigits: currency === 'CLP' ? 0 : 2
}, 'es-CL')

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—'

  const [y, m, d] = dateStr.split('-')

  return `${d}/${m}/${y}`
}

const typeLabel = (type: string) => {
  switch (type) {
    case 'supplier': return 'Proveedor'
    case 'payroll': return 'Nómina'
    case 'social_security': return 'Previsión'
    case 'tax': return 'Impuesto'
    case 'bank_fee': return 'Fee bancario'
    case 'gateway_fee': return 'Fee gateway'
    case 'financial_cost': return 'Costo financiero'
    case 'miscellaneous': return 'Varios'
    default: return type
  }
}

const typeColor = (type: string) => {
  switch (type) {
    case 'supplier': return 'primary'
    case 'payroll': return 'info'
    case 'social_security': return 'warning'
    case 'tax': return 'error'
    case 'bank_fee': return 'secondary'
    case 'gateway_fee': return 'secondary'
    case 'financial_cost': return 'secondary'
    case 'miscellaneous': return 'secondary'
    default: return 'primary'
  }
}

const statusColor = (status: string) => {
  switch (status) {
    case 'paid': return 'success'
    case 'scheduled': return 'info'
    case 'overdue': return 'error'
    case 'cancelled': return 'secondary'
    default: return 'warning'
  }
}

const statusLabel = (status: string) => {
  switch (status) {
    case 'paid': return 'Pagado'
    case 'pending': return 'Pendiente'
    case 'scheduled': return 'Programado'
    case 'overdue': return 'Vencido'
    case 'cancelled': return 'Cancelado'
    default: return status
  }
}

const methodLabel = (method: string | null) => {
  if (!method) return '—'

  const map: Record<string, string> = {
    transfer: 'Transferencia',
    credit_card: 'Tarjeta de crédito',
    paypal: 'PayPal',
    wise: 'Wise',
    check: 'Cheque',
    cash: 'Efectivo',
    other: 'Otro'
  }

  return map[method] || method
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ExpenseDetailView = () => {
  const params = useParams()
  const expenseId = params.id as string

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ExpenseDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [payments, setPayments] = useState<Array<{ paymentId: string; paymentDate: string | null; amount: number; currency?: string; reference: string | null; paymentMethod: string | null; notes: string | null }>>([])
  const [settlementPaymentId, setSettlementPaymentId] = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch(`/api/finance/expenses/${expenseId}`)

      if (!res.ok) {
        setError('No se pudo cargar el egreso')

        return
      }

      setData(await res.json())

      const paymentsRes = await fetch(`/api/finance/expenses/${expenseId}/payments`)

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json()

        setPayments(paymentsData.payments || [])
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [expenseId])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton variant='rounded' height={80} />
        <Grid container spacing={6}>
          {[0, 1, 2, 3].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}><Skeleton variant='rounded' height={120} /></Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={300} />
      </Box>
    )
  }

  if (error || !data) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity='error'>{error || 'Egreso no encontrado'}</Alert>
        <Button component={Link} href='/finance/expenses' sx={{ mt: 2 }}>Volver a egresos</Button>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h4' sx={{ fontWeight: 600, mb: 0.5 }}>
            {data.expenseId}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {data.description}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <CustomChip round='true' size='small' color={typeColor(data.expenseType)} label={typeLabel(data.expenseType)} />
          <CustomChip round='true' size='small' color={statusColor(data.paymentStatus)} label={statusLabel(data.paymentStatus)} />
          <Button
            variant='tonal'
            color='secondary'
            size='small'
            component={Link}
            href={`/finance/shareholder-account?sourceType=expense&sourceId=${encodeURIComponent(expenseId)}`}
            startIcon={<i className='tabler-arrow-forward-up' />}
          >
            Registrar en CCA
          </Button>
          <Button variant='outlined' component={Link} href='/finance/expenses' startIcon={<i className='tabler-arrow-left' />}>{GREENHOUSE_COPY.actions.back}</Button>
        </Box>
      </Box>

      {/* KPIs */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Monto total'
            stats={formatAmount(data.totalAmount, data.currency)}
            subtitle={data.currency !== 'CLP' ? `${formatAmount(data.totalAmountClp, 'CLP')} CLP` : 'Moneda local'}
            avatarIcon='tabler-cash'
            avatarColor='error'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Subtotal'
            stats={formatAmount(data.subtotal, data.currency)}
            subtitle={`IVA: ${formatAmount(data.taxAmount, data.currency)}`}
            avatarIcon='tabler-receipt'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Método'
            stats={methodLabel(data.paymentMethod)}
            subtitle={data.paymentReference || 'Sin referencia'}
            avatarIcon='tabler-credit-card'
            avatarColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Conciliado'
            stats={data.isReconciled ? 'Sí' : 'No'}
            subtitle={data.isRecurring ? 'Recurrente' : 'Puntual'}
            avatarIcon='tabler-arrows-exchange'
            avatarColor={data.isReconciled ? 'success' : 'secondary'}
          />
        </Grid>
      </Grid>

      {/* Details card */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Detalle del egreso'
          avatar={<Avatar variant='rounded' sx={{ bgcolor: 'error.lightOpacity' }}><i className='tabler-file-minus' style={{ fontSize: 22, color: 'var(--mui-palette-error-main)' }} /></Avatar>}
        />
        <Divider />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant='caption' color='text.secondary'>Fecha de pago</Typography>
              <Typography variant='body2'>{formatDate(data.paymentDate)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant='caption' color='text.secondary'>Fecha documento</Typography>
              <Typography variant='body2'>{formatDate(data.documentDate)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant='caption' color='text.secondary'>Vencimiento</Typography>
              <Typography variant='body2'>{formatDate(data.dueDate)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant='caption' color='text.secondary'>N° Documento</Typography>
              <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>
                {data.documentNumber || '—'}
              </Typography>
            </Grid>

            {data.supplierName && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>Proveedor</Typography>
                <Typography variant='body2'>
                  {data.supplierId ? (
                    <Link href={`/finance/suppliers/${data.supplierId}`} style={{ color: 'inherit', textDecoration: 'underline' }}>
                      {data.supplierName}
                    </Link>
                  ) : data.supplierName}
                </Typography>
              </Grid>
            )}

            {data.serviceLine && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>Línea de servicio</Typography>
                <Typography variant='body2'>{data.serviceLine}</Typography>
              </Grid>
            )}

            {data.currency === 'USD' && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>Tipo de cambio</Typography>
                <Typography variant='body2'>{data.exchangeRateToClp}</Typography>
              </Grid>
            )}

            {data.notes && (
              <Grid size={{ xs: 12 }}>
                <Typography variant='caption' color='text.secondary'>Notas</Typography>
                <Typography variant='body2'>{data.notes}</Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Register payment form (if not fully paid) */}
      {data.paymentStatus !== 'paid' && data.paymentStatus !== 'written_off' && (
        <PaymentRegistrationCard
          onSubmit={async (amount, date, reference) => {
            const res = await fetch(`/api/finance/expenses/${expenseId}/payments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount, paymentDate: date, ...(reference.trim() && { reference: reference.trim() }) })
            })

            if (!res.ok) {
              const d = await res.json().catch(() => ({}))

              throw new Error(d.error || 'Error al registrar pago')
            }

            toast.success('Pago registrado')
            fetchDetail()
          }}
          pendingBalance={data.totalAmount - payments.reduce((sum, p) => sum + p.amount, 0)}
          currency={data.currency}
        />
      )}

      {/* Payments timeline */}
      <PaymentHistoryTable
        payments={payments}
        currency={data.currency}
        onManageSettlement={paymentId => setSettlementPaymentId(paymentId)}
      />

      <SettlementOrchestrationDrawer
        open={Boolean(settlementPaymentId)}
        paymentType='expense'
        paymentId={settlementPaymentId}
        onClose={() => setSettlementPaymentId(null)}
        onSuccess={fetchDetail}
      />
    </Box>
  )
}

export default ExpenseDetailView
