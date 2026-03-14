'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import { toast } from 'react-toastify'

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
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentRecord {
  paymentId: string
  paymentDate: string
  amount: number
  currency: string
  reference: string | null
  paymentMethod: string | null
  notes: string | null
  recordedAt: string
}

interface IncomeDetail {
  incomeId: string
  clientName: string
  invoiceNumber: string | null
  invoiceDate: string | null
  dueDate: string | null
  currency: string
  subtotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  exchangeRateToClp: number
  totalAmountClp: number
  paymentStatus: string
  amountPaid: number
  amountPending: number
  paymentsReceived: PaymentRecord[]
  poNumber: string | null
  hesNumber: string | null
  serviceLine: string | null
  incomeType: string | null
  description: string | null
  isReconciled: boolean
  notes: string | null
  createdAt: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: currency === 'CLP' ? 0 : 2 }).format(amount)

const statusColor = (status: string) => {
  switch (status) {
    case 'paid': return 'success'
    case 'partial': return 'warning'
    case 'overdue': return 'error'
    case 'written_off': return 'secondary'
    default: return 'info'
  }
}

const statusLabel = (status: string) => {
  switch (status) {
    case 'paid': return 'Pagado'
    case 'partial': return 'Parcial'
    case 'pending': return 'Pendiente'
    case 'overdue': return 'Vencido'
    case 'written_off': return 'Castigado'
    default: return status
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const IncomeDetailView = () => {
  const params = useParams()
  const incomeId = params.id as string

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<IncomeDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Payment form
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState('')
  const [payReference, setPayReference] = useState('')
  const [paying, setPaying] = useState(false)

  const fetchDetail = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch(`/api/finance/income/${incomeId}`)

      if (!res.ok) {
        setError('No se pudo cargar el ingreso')

        return
      }

      setData(await res.json())
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [incomeId])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  const handlePayment = async () => {
    const amount = Number(payAmount)

    if (!amount || amount <= 0 || !payDate) {
      toast.error('Ingresa monto y fecha de pago')

      return
    }

    setPaying(true)

    try {
      const res = await fetch(`/api/finance/income/${incomeId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          paymentDate: payDate,
          ...(payReference.trim() && { reference: payReference.trim() })
        })
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))

        toast.error(d.error || 'Error al registrar pago')

        return
      }

      toast.success('Pago registrado')
      setPayAmount('')
      setPayDate('')
      setPayReference('')
      fetchDetail()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setPaying(false)
    }
  }

  // Loading
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
        <Alert severity='error'>{error || 'Ingreso no encontrado'}</Alert>
        <Button component={Link} href='/finance/income' sx={{ mt: 2 }}>Volver a ingresos</Button>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, mb: 0.5 }}>
            {data.invoiceNumber || data.incomeId}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {data.clientName} · {data.description || 'Sin descripción'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <CustomChip round='true' size='small' color={statusColor(data.paymentStatus)} label={statusLabel(data.paymentStatus)} />
          <Button variant='outlined' component={Link} href='/finance/income' startIcon={<i className='tabler-arrow-left' />}>
            Volver
          </Button>
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
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Cobrado'
            stats={formatAmount(data.amountPaid, data.currency)}
            subtitle={`${data.paymentsReceived.length} pago${data.paymentsReceived.length !== 1 ? 's' : ''}`}
            avatarIcon='tabler-check'
            avatarColor='success'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Pendiente'
            stats={formatAmount(data.amountPending, data.currency)}
            subtitle={data.dueDate ? `Vence ${data.dueDate}` : 'Sin vencimiento'}
            avatarIcon='tabler-clock'
            avatarColor={data.paymentStatus === 'overdue' ? 'error' : 'warning'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='IVA'
            stats={`${Math.round(data.taxRate * 100)}%`}
            subtitle={formatAmount(data.taxAmount, data.currency)}
            avatarIcon='tabler-receipt-tax'
            avatarColor='info'
          />
        </Grid>
      </Grid>

      {/* Details card */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Detalle del ingreso'
          avatar={<Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}><i className='tabler-file-invoice' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} /></Avatar>}
        />
        <Divider />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant='caption' color='text.secondary'>Fecha emisión</Typography>
              <Typography variant='body2'>{data.invoiceDate || '—'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant='caption' color='text.secondary'>Fecha vencimiento</Typography>
              <Typography variant='body2'>{data.dueDate || '—'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant='caption' color='text.secondary'>Línea de servicio</Typography>
              <Typography variant='body2'>{data.serviceLine || '—'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant='caption' color='text.secondary'>Tipo</Typography>
              <Typography variant='body2'>{data.incomeType || '—'}</Typography>
            </Grid>
            {data.poNumber && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>OC</Typography>
                <Typography variant='body2'>{data.poNumber}</Typography>
              </Grid>
            )}
            {data.hesNumber && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant='caption' color='text.secondary'>HES</Typography>
                <Typography variant='body2'>{data.hesNumber}</Typography>
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
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Registrar pago'
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}><i className='tabler-coin' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} /></Avatar>}
          />
          <Divider />
          <CardContent>
            <Stack direction='row' spacing={2} sx={{ flexWrap: 'wrap' }}>
              <CustomTextField
                size='small'
                label='Monto'
                type='number'
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                sx={{ width: 160 }}
              />
              <CustomTextField
                size='small'
                label='Fecha'
                type='date'
                value={payDate}
                onChange={e => setPayDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 160 }}
              />
              <CustomTextField
                size='small'
                label='Referencia'
                value={payReference}
                onChange={e => setPayReference(e.target.value)}
                sx={{ width: 200 }}
              />
              <Button variant='contained' color='success' onClick={handlePayment} disabled={paying}>
                {paying ? 'Registrando...' : 'Registrar pago'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Payments timeline */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Historial de pagos'
          avatar={<Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}><i className='tabler-history' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} /></Avatar>}
        />
        <Divider />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell align='right'>Monto</TableCell>
                <TableCell>Referencia</TableCell>
                <TableCell>Método</TableCell>
                <TableCell>Notas</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.paymentsReceived.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align='center' sx={{ py: 6 }}>
                    <Typography variant='body2' color='text.secondary'>Sin pagos registrados</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.paymentsReceived.map((p, i) => (
                  <TableRow key={p.paymentId || i}>
                    <TableCell>{p.paymentDate}</TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' fontWeight={600} color='success.main'>
                        {formatAmount(p.amount, p.currency || data.currency)}
                      </Typography>
                    </TableCell>
                    <TableCell>{p.reference || '—'}</TableCell>
                    <TableCell>{p.paymentMethod || '—'}</TableCell>
                    <TableCell>{p.notes || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  )
}

export default IncomeDetailView
