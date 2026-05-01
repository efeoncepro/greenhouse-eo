'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import { downloadPayrollReceiptPdf } from '@/lib/payroll/download-payroll-receipt'

interface PayslipDeliveryEvent {
  deliveryKind: string
  status: string
  sentAt: string | null
  failedAt: string | null
  errorMessage: string | null
  emailProviderId: string | null
  superseded: boolean
  createdAt: string
}

interface PaymentOrderInfo {
  orderId: string
  title: string | null
  state: string | null
  processorSlug: string | null
  scheduledFor: string | null
  paidAt: string | null
  externalReference: string | null
}

interface PayrollEntry {
  entryId: string
  periodId: string
  year: number
  month: number
  currency: string
  grossTotal: number
  netTotal: number
  status: string
  // TASK-759e — payment lifecycle metadata (optional, may be undefined for legacy entries)
  paymentStatus?: string
  paymentOrder?: PaymentOrderInfo | null
  payslipDelivery?: {
    deliveryKind: string
    status: string
    sentAt: string | null
    emailProviderId: string | null
    emailRecipient: string | null
  } | null
  payslipDeliveryTimeline?: PayslipDeliveryEvent[]
}

interface PayrollData {
  memberId: string
  payrollHistory: PayrollEntry[]
  compensation: {
    activeAssignmentsCount: number
    payrollEntriesCount: number
  } | null
}

const MONTHS = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const fmt = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: currency === 'USD' ? 'USD' : 'CLP', maximumFractionDigits: 0 }).format(amount)

const PROCESSOR_LABELS: Record<string, string> = {
  deel: 'Deel',
  bank_internal: 'Banco',
  global66: 'Global66',
  wise: 'Wise',
  paypal: 'PayPal',
  manual_cash: 'Manual',
  sii_pec: 'SII PEC'
}

const PAYMENT_STATUS_META: Record<string, { label: string; color: 'primary' | 'info' | 'warning' | 'success' | 'error' | 'secondary' }> = {
  awaiting_order: { label: 'Por programar', color: 'warning' },
  order_pending: { label: 'En aprobación', color: 'warning' },
  order_approved: { label: 'Programado', color: 'info' },
  order_paid: { label: 'Pagado', color: 'success' },
  cancelled: { label: 'Cancelado', color: 'error' }
}

const formatPaymentDate = (iso: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)

  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

const MyPayrollView = () => {
  const [data, setData] = useState<PayrollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/my/payroll')

      if (!res.ok) {
        const payload = await res.json().catch(() => null)

        throw new Error(payload?.error || 'No fue posible cargar tu nómina.')
      }

      setData(await res.json())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar tu nómina.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleDownloadReceipt = async (entry: PayrollEntry) => {
    try {
      await downloadPayrollReceiptPdf({
        route: `/api/my/payroll/entries/${entry.entryId}/receipt`,
        entryId: entry.entryId,
        periodId: entry.periodId,
        memberId: data?.memberId ?? null,
        currency: entry.currency === 'USD' ? 'USD' : 'CLP'
      })
    } catch (error) {
      console.error('Unable to download my payroll receipt.', error)
    }
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  if (error) {
    return (
      <Alert
        severity='error'
        action={(
          <Button color='inherit' size='small' onClick={() => void load()}>
            Reintentar
          </Button>
        )}
      >
        {error}
      </Alert>
    )
  }

  const entries = [...(data?.payrollHistory ?? [])].sort((a, b) => b.periodId.localeCompare(a.periodId))
  const latest = entries[0]

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Mi Nómina'
            subheader='Liquidaciones y compensación'
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}><i className='tabler-receipt' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} /></Avatar>}
          />
        </Card>
      </Grid>

      {/* Latest payslip summary */}
      {latest && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader title='Último período' subheader={`${MONTHS[latest.month]} ${latest.year}`} />
            <Divider />
            <CardContent sx={{ display: 'flex', gap: 6 }}>
              <Box>
                <Typography variant='caption' color='text.secondary'>Bruto</Typography>
                <Typography variant='h5'>{fmt(latest.grossTotal, latest.currency)}</Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>Neto</Typography>
                <Typography variant='h5' color='success.main'>{fmt(latest.netTotal, latest.currency)}</Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>Moneda</Typography>
                <Typography variant='h5'>{latest.currency}</Typography>
              </Box>
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                <Button
                  variant='tonal'
                  startIcon={<i className='tabler-file-download' />}
                  onClick={() => { void handleDownloadReceipt(latest) }}
                  aria-label={`Descargar recibo PDF de ${MONTHS[latest.month]} ${latest.year}`}
                >
                  Descargar PDF
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* History */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader title='Historial de liquidaciones' />
          <Divider />
          {entries.length === 0 ? (
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant='h6'>Sin liquidaciones registradas</Typography>
              <Typography variant='body2' color='text.secondary'>Las liquidaciones aparecerán aquí cuando estén disponibles.</Typography>
            </CardContent>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Período</TableCell>
                    <TableCell align='right'>Bruto</TableCell>
                    <TableCell align='right'>Neto</TableCell>
                    <TableCell align='center'>Estado pago</TableCell>
                    <TableCell align='center'>Procesador</TableCell>
                    <TableCell align='center'>Fecha pago</TableCell>
                    <TableCell align='center'>Recibo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map(e => {
                    const paymentStatusKey = e.paymentStatus ?? 'awaiting_order'
                    const statusMeta = PAYMENT_STATUS_META[paymentStatusKey] ?? { label: 'Por programar', color: 'warning' as const }

                    const processorLabel = e.paymentOrder?.processorSlug
                      ? (PROCESSOR_LABELS[e.paymentOrder.processorSlug] ?? e.paymentOrder.processorSlug)
                      : null

                    const dateLabel = e.paymentOrder?.paidAt
                      ? `Pagado ${formatPaymentDate(e.paymentOrder.paidAt)}`
                      : e.paymentOrder?.scheduledFor
                        ? `Programado ${formatPaymentDate(e.paymentOrder.scheduledFor)}`
                        : '—'

                    return (
                      <TableRow key={e.entryId} hover>
                        <TableCell><Typography variant='body2' fontWeight={600}>{MONTHS[e.month]} {e.year}</Typography></TableCell>
                        <TableCell align='right'>{fmt(e.grossTotal, e.currency)}</TableCell>
                        <TableCell align='right'><Typography fontWeight={600}>{fmt(e.netTotal, e.currency)}</Typography></TableCell>
                        <TableCell align='center'>
                          <CustomChip round='true' size='small' variant='tonal' color={statusMeta.color} label={statusMeta.label} />
                        </TableCell>
                        <TableCell align='center'>
                          {processorLabel ? (
                            <CustomChip round='true' size='small' variant='outlined' label={processorLabel} />
                          ) : (
                            <Typography variant='caption' color='text.disabled'>—</Typography>
                          )}
                        </TableCell>
                        <TableCell align='center'>
                          <Typography variant='caption' color='text.secondary'>{dateLabel}</Typography>
                        </TableCell>
                        <TableCell align='center'>
                          <Button
                            size='small'
                            variant='tonal'
                            startIcon={<i className='tabler-file-download' />}
                            onClick={() => { void handleDownloadReceipt(e) }}
                            aria-label={`Descargar recibo PDF de ${MONTHS[e.month]} ${e.year}`}
                          >
                            PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Grid>
    </Grid>
  )
}

export default MyPayrollView
