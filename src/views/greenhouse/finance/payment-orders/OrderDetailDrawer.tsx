'use client'

import { useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'

import { DataTableShell } from '@/components/greenhouse/data-table'
import { getMicrocopy } from '@/lib/copy'
import type {
  PaymentOrderBlockedReason,
  PaymentOrderState,
  PaymentOrderWithLines
} from '@/types/payment-orders'

// TASK-765 Slice 1: estados pre-paid donde el operator todavia puede asignar
// la cuenta origen. Refleja PATCHABLE_STATES del API route.
const SOURCE_ACCOUNT_PATCHABLE_STATES: ReadonlySet<PaymentOrderState> = new Set([
  'draft',
  'pending_approval',
  'approved',
  'scheduled',
  'submitted'
])

// TASK-765 Slice 7: copy del banner settlement_blocked. Cada `reason` viene
// del payload del outbox event `finance.payment_order.settlement_blocked`
// (slice 4). Validado con greenhouse-ux-writing — tono es-CL tuteo, [What]
// + [How to fix] cuando la accion del operador puede ayudar.
const BLOCKED_REASON_BODY: Record<PaymentOrderBlockedReason, string> = {
  expense_unresolved:
    'No se encontró el expense de payroll para este período/miembro. Verifica que la nómina del período esté exportada y materializada.',
  account_missing: 'Falta el instrumento financiero de salida.',
  cutover_violation: 'Falla de constraint financiero — contacta al admin.',
  materializer_dead_letter:
    'Materializador de payroll en dead-letter para este período.',
  out_of_scope_v1: 'Tipo de obligación aún no soportado por el path automático.'
}

const formatBlockedAt = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('es-CL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

const resolveBlockedBody = (reason: string, detail: string) => {
  if (reason in BLOCKED_REASON_BODY) {
    return BLOCKED_REASON_BODY[reason as PaymentOrderBlockedReason]
  }

  return detail ? `Settlement bloqueado: ${detail}` : 'Settlement bloqueado.'
}

interface BankAccountOption {
  accountId: string
  accountName: string
  bankName: string
  currency: string
  isActive: boolean
  instrumentCategory?: string | null
  providerSlug?: string | null
}

interface OrderDetailDrawerProps {
  order: PaymentOrderWithLines | null
  loading: boolean
  onClose: () => void
  onActionComplete: () => Promise<void>
}

const stateLabels: Record<PaymentOrderState, string> = {
  draft: 'Borrador',
  pending_approval: 'Pendiente aprobacion',
  approved: 'Aprobada',
  scheduled: 'Programada',
  submitted: 'Enviada',
  paid: 'Pagada',
  settled: 'Conciliada',
  closed: 'Cerrada',
  failed: 'Fallida',
  cancelled: 'Cancelada'
}

const stateColors: Record<PaymentOrderState, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  draft: 'default',
  pending_approval: 'warning',
  approved: 'info',
  scheduled: 'info',
  submitted: 'primary',
  paid: 'success',
  settled: 'success',
  closed: 'secondary',
  failed: 'error',
  cancelled: 'error'
}

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0
  }).format(amount)

const formatDate = (d: string | null) => {
  if (!d) return '—'

  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

const isDeelRail = (order: PaymentOrderWithLines | null) =>
  order?.processorSlug === 'deel' || order?.paymentMethod === 'deel'

const canUseAsSourceInstrument = (account: BankAccountOption, order: PaymentOrderWithLines | null) => {
  if (!account.isActive) return false
  if (account.instrumentCategory === 'payroll_processor') return false
  if (isDeelRail(order) && account.providerSlug === 'deel') return false

  return !order || account.currency === order.currency || account.instrumentCategory === 'credit_card' || account.providerSlug === 'global66'
}

const OrderDetailDrawer = ({ order, loading, onClose, onActionComplete }: OrderDetailDrawerProps) => {
  const microcopy = getMicrocopy()
  const [actionInFlight, setActionInFlight] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [accounts, setAccounts] = useState<BankAccountOption[]>([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState('')

  // TASK-765 Slice 1: reglas de gating para hard-gate UX.
  // - canAssignSourceAccount: estado mutable y operator puede usar el picker.
  // - sourceAccountMissingForFlow: estado pre-paid sin cuenta -> banner warning.
  // - markPaidBlockedReason: tooltip cuando "Marcar pagada" esta disabled.
  const canAssignSourceAccount = useMemo(() => {
    if (!order) return false

    return SOURCE_ACCOUNT_PATCHABLE_STATES.has(order.state)
  }, [order])

  const sourceAccountMissingForFlow = useMemo(() => {
    if (!order) return false

    return canAssignSourceAccount && !order.sourceAccountId
  }, [order, canAssignSourceAccount])

  const markPaidBlockedReason = useMemo(() => {
    if (!order) return null

    if (order.state === 'submitted' && !order.sourceAccountId) {
      return 'Asigna primero el instrumento financiero de salida para poder marcar la orden como pagada.'
    }

    return null
  }, [order])

  // Fetch accounts solo cuando se abre el picker — evita carga innecesaria.
  useEffect(() => {
    if (!pickerOpen) return
    let cancelled = false

    setAccountsLoading(true)
    fetch('/api/finance/accounts?isActive=true')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const items: BankAccountOption[] = Array.isArray(data?.items) ? data.items : []

        // Filtrar por elegibilidad operacional; la API vuelve a validar.
        const filtered = items.filter(
          a => canUseAsSourceInstrument(a, order)
        )

        setAccounts(filtered)

        // Pre-seleccionar la cuenta actual si existe.
        if (order?.sourceAccountId) {
          setSelectedAccountId(order.sourceAccountId)
        } else if (filtered.length === 1) {
          setSelectedAccountId(filtered[0].accountId)
        } else {
          setSelectedAccountId('')
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('No fue posible cargar las cuentas. Intenta de nuevo.')
      })
      .finally(() => {
        if (!cancelled) setAccountsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [pickerOpen, order])

  // TASK-765 Slice 7: derivado de banner settlement_blocked. La orden tiene
  // banner cuando hay events recientes (last 7 days, last 5 published por
  // slice 4). El CTA "Recuperar orden" se habilita cuando state='paid' (el
  // único estado donde el endpoint slice 8 puede operar — la presencia del
  // banner implica que el ledger downstream está incompleto).
  const recentBlockedEvents = order?.recentBlockedEvents ?? []
  const hasBlockedBanner = recentBlockedEvents.length > 0
  const latestBlockedEvent = hasBlockedBanner ? recentBlockedEvents[0] : null

  const recoveryEnabled = order?.state === 'paid'

  const sourceAccountInfo = useMemo(() => {
    if (!order?.sourceAccountId) return null

    const match = accounts.find(a => a.accountId === order.sourceAccountId)

    if (match) return `${match.accountName} · ${match.bankName} (${match.currency})`

    return order.sourceAccountId
  }, [order, accounts])

  const handleAssignSourceAccount = async () => {
    if (!order || !selectedAccountId) return
    setActionInFlight(true)

    try {
      const r = await fetch(`/api/admin/finance/payment-orders/${order.orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceAccountId: selectedAccountId })
      })

      const json = await r.json()

      if (!r.ok) {
        toast.error(json.error ?? 'No fue posible asignar el instrumento de salida. Intenta de nuevo.')

        return
      }

      toast.success('Instrumento de salida actualizado.')
      setPickerOpen(false)
      await onActionComplete()
    } catch (e) {
      console.error(e)
      toast.error('No fue posible asignar el instrumento de salida. Intenta de nuevo.')
    } finally {
      setActionInFlight(false)
    }
  }

  // TASK-765 Slice 7: handler del CTA "Recuperar orden". Llama al endpoint
  // de recovery (slice 8). Si el endpoint aún no está deployado (404) o falla
  // (5xx), surfacea un toast claro para que el operador escale.
  const handleRecover = async () => {
    if (!order) return

    if (!order.sourceAccountId) {
      toast.error('Asigna primero el instrumento financiero de salida para recuperar la orden.')

      return
    }

    setActionInFlight(true)

    try {
      const r = await fetch(`/api/admin/finance/payment-orders/${order.orderId}/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceAccountId: order.sourceAccountId })
      })

      if (r.status === 404) {
        toast.error('Endpoint de recuperación no disponible aún. Contacta al admin.')

        return
      }

      const json = await r.json().catch(() => ({}))

      if (!r.ok) {
        toast.error(json.error ?? 'No fue posible recuperar la orden.')

        return
      }

      toast.success('Orden recuperada. Verifica el banco.')
      await onActionComplete()
    } catch (e) {
      console.error(e)
      toast.error('Error de red al recuperar la orden.')
    } finally {
      setActionInFlight(false)
    }
  }

  const callAction = async (path: string, body?: Record<string, unknown>) => {
    if (!order) return
    setActionInFlight(true)

    try {
      const r = await fetch(`/api/admin/finance/payment-orders/${order.orderId}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      })

      const json = await r.json()

      if (!r.ok) {
        toast.error(json.error ?? 'Accion fallida')

        return
      }

      toast.success('Accion ejecutada')
      await onActionComplete()
    } catch (e) {
      console.error(e)
      toast.error('Error de red')
    } finally {
      setActionInFlight(false)
    }
  }

  const handleApprove = () => callAction('approve')

  const handleSubmit = () => {
    const ref = window.prompt('Numero de referencia externa (opcional)')

    return callAction('submit', ref ? { externalReference: ref } : {})
  }

  const handleMarkPaid = () => callAction('mark-paid')

  const handleCancel = () => {
    const reason = window.prompt('Motivo de cancelacion (3+ caracteres)')

    if (!reason || reason.trim().length < 3) {
      toast.error('Cancelacion abortada: motivo requerido')

      return
    }

    return callAction('cancel', { reason })
  }

  const handleSchedule = () => {
    const date = window.prompt('Fecha programada (YYYY-MM-DD)')

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast.error('Fecha invalida')

      return
    }

    return callAction('schedule', { scheduledFor: date })
  }

  const isOpen = order !== null
  const ready = order && (order as PaymentOrderWithLines).lines !== undefined

  return (
    <Drawer
      anchor='right'
      open={isOpen}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 560 } } }}
    >
      <Box sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant='h6'>Detalle de orden</Typography>
        <IconButton onClick={onClose} aria-label={microcopy.aria.closeDrawer}>
          <i className='tabler-x' />
        </IconButton>
      </Box>
      <Divider />

      {loading || !order || !ready ? (
        <Box sx={{ p: 4 }}>
          <LinearProgress />
        </Box>
      ) : (
        <Stack spacing={4} sx={{ p: 4 }}>
          <Stack spacing={1}>
            <Typography variant='caption' color='text.secondary'>
              {order.orderId}
            </Typography>
            <Typography variant='h6'>{order.title}</Typography>
            <Stack direction='row' spacing={1} flexWrap='wrap'>
              <Chip size='small' variant='tonal' color={stateColors[order.state]} label={stateLabels[order.state]} />
              <Chip size='small' variant='outlined' label={`Batch ${order.batchKind}`} />
              {order.requireApproval ? (
                <Chip size='small' variant='outlined' label='Maker-checker activo' />
              ) : null}
            </Stack>
            {order.description ? (
              <Typography variant='body2' color='text.secondary'>
                {order.description}
              </Typography>
            ) : null}
          </Stack>

          <Stack
            direction='row'
            divider={<Divider orientation='vertical' flexItem />}
            spacing={3}
            sx={{ flexWrap: 'wrap' }}
          >
            <Stack spacing={0.25}>
              <Typography variant='caption' color='text.secondary'>
                Total
              </Typography>
              <Typography variant='subtitle1' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatAmount(order.totalAmount, order.currency)}
              </Typography>
            </Stack>
            <Stack spacing={0.25}>
              <Typography variant='caption' color='text.secondary'>
                Programada
              </Typography>
              <Typography variant='body2'>{formatDate(order.scheduledFor)}</Typography>
            </Stack>
            <Stack spacing={0.25}>
              <Typography variant='caption' color='text.secondary'>
                Vence
              </Typography>
              <Typography variant='body2'>{formatDate(order.dueDate)}</Typography>
            </Stack>
            <Stack spacing={0.25}>
              <Typography variant='caption' color='text.secondary'>
                Maker
              </Typography>
              <Typography variant='body2'>{order.createdBy.slice(0, 16)}…</Typography>
            </Stack>
            <Stack spacing={0.25}>
              <Typography variant='caption' color='text.secondary'>
                Checker
              </Typography>
              <Typography variant='body2'>{order.approvedBy ? `${order.approvedBy.slice(0, 16)}…` : '—'}</Typography>
            </Stack>
          </Stack>

          {order.cancelledReason ? (
            <Alert severity='error' icon={<i className='tabler-circle-x' />}>
              <Typography variant='subtitle2' gutterBottom>
                Cancelada por {order.cancelledBy ?? '—'}
              </Typography>
              <Typography variant='body2'>{order.cancelledReason}</Typography>
            </Alert>
          ) : null}

          {/* TASK-751 — payroll origin link when order was generated from a payroll period. */}
          {order.periodId ? (
            <Stack spacing={1.5}>
              <Typography variant='subtitle2'>Origen Payroll</Typography>
              <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
                <Chip
                  size='small'
                  variant='outlined'
                  icon={<i className='tabler-receipt-2' aria-hidden='true' />}
                  label={`Periodo: ${order.periodId}`}
                />
                <Button
                  component={Link}
                  href={`/hr/payroll?periodId=${encodeURIComponent(order.periodId)}`}
                  size='small'
                  variant='outlined'
                  startIcon={<i className='tabler-external-link' aria-hidden='true' />}
                >
                  Ver en Payroll
                </Button>
              </Stack>
            </Stack>
          ) : null}

          {/* Lines */}
          <Stack spacing={2}>
            <Typography variant='subtitle2'>Lineas ({order.lines.length})</Typography>
            <DataTableShell
              identifier='order-detail-lines'
              ariaLabel={`Lineas de la orden ${order.title}`}
              density='compact'
            >
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Beneficiario</TableCell>
                    <TableCell>Concepto</TableCell>
                    <TableCell align='right'>Monto</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.lines.map(line => (
                    <TableRow key={line.lineId}>
                      <TableCell>
                        <Typography variant='body2'>{line.beneficiaryName ?? line.beneficiaryId}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary'>
                          {line.obligationKind}
                        </Typography>
                      </TableCell>
                      <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatAmount(line.amount, line.currency)}
                        {line.isPartial ? (
                          <Chip size='small' variant='outlined' label='parcial' sx={{ ml: 1 }} />
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Chip size='small' variant='outlined' label={line.state} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableShell>
          </Stack>

          {/* TASK-765 Slice 7: banner settlement_blocked. Renderiza cuando
              hay events recientes (last 7 days) en outbox para esta orden.
              CTA "Recuperar orden" llama al endpoint slice 8. */}
          {hasBlockedBanner && latestBlockedEvent ? (
            <Alert
              severity='error'
              icon={<i className='tabler-alert-octagon' aria-hidden='true' />}
              action={
                recoveryEnabled ? (
                  <Button
                    size='small'
                    color='inherit'
                    variant='outlined'
                    onClick={handleRecover}
                    disabled={actionInFlight}
                  >
                    Recuperar orden
                  </Button>
                ) : undefined
              }
            >
              <AlertTitle>Settlement bloqueado</AlertTitle>
              <Typography variant='body2' sx={{ mb: 1 }}>
                {resolveBlockedBody(latestBlockedEvent.reason, latestBlockedEvent.detail)}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Detectado el {formatBlockedAt(latestBlockedEvent.blockedAt)}
                {recentBlockedEvents.length > 1
                  ? ` · ${recentBlockedEvents.length} eventos en los últimos 7 días`
                  : null}
              </Typography>
            </Alert>
          ) : null}

          {/* TASK-799: Instrumento de salida — hard-gate visible.
              Banner warning cuando falta + picker para asignarla. */}
          <Stack spacing={2}>
            <Typography variant='subtitle2'>Instrumento de salida</Typography>
            <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
              {order.sourceAccountId ? (
                <Chip
                  size='small'
                  variant='tonal'
                  color='success'
                  icon={<i className='tabler-building-bank' aria-hidden='true' />}
                  label={sourceAccountInfo ?? order.sourceAccountId}
                />
              ) : (
                <Chip
                  size='small'
                  variant='tonal'
                  color='warning'
                  icon={<i className='tabler-alert-triangle' aria-hidden='true' />}
                  label='Sin asignar'
                />
              )}
              {canAssignSourceAccount ? (
                <Button
                  size='small'
                  variant='outlined'
                  startIcon={<i className='tabler-edit' aria-hidden='true' />}
                  onClick={() => setPickerOpen(true)}
                  disabled={actionInFlight}
                >
                  {order.sourceAccountId ? 'Cambiar instrumento' : 'Asignar instrumento'}
                </Button>
              ) : null}
            </Stack>
            {sourceAccountMissingForFlow ? (
              <Alert severity='warning' icon={<i className='tabler-alert-triangle' aria-hidden='true' />}>
                <AlertTitle>Falta el instrumento de salida</AlertTitle>
                <Typography variant='body2'>
                  Esta orden no puede marcarse como pagada hasta que asignes qué cuenta, fintech o tarjeta
                  financia el pago. El processor puede ser distinto del instrumento que se rebaja.
                </Typography>
              </Alert>
            ) : null}
          </Stack>

          {/* Actions */}
          <Stack spacing={2}>
            <Typography variant='subtitle2'>Acciones</Typography>
            <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
              {order.state === 'pending_approval' ? (
                <Button variant='contained' onClick={handleApprove} disabled={actionInFlight}>
                  Aprobar
                </Button>
              ) : null}
              {(order.state === 'approved' || order.state === 'scheduled') ? (
                <Button variant='outlined' onClick={handleSchedule} disabled={actionInFlight}>
                  {order.state === 'scheduled' ? 'Re-programar' : 'Programar'}
                </Button>
              ) : null}
              {(order.state === 'approved' || order.state === 'scheduled') ? (
                <Button variant='contained' color='primary' onClick={handleSubmit} disabled={actionInFlight}>
                  Marcar enviada
                </Button>
              ) : null}
              {order.state === 'submitted' ? (
                <Tooltip title={markPaidBlockedReason ?? ''} disableHoverListener={!markPaidBlockedReason}>
                  <span>
                    <Button
                      variant='contained'
                      color='success'
                      onClick={handleMarkPaid}
                      disabled={actionInFlight || Boolean(markPaidBlockedReason)}
                    >
                      Marcar pagada
                    </Button>
                  </span>
                </Tooltip>
              ) : null}
              {['draft', 'pending_approval', 'approved', 'scheduled'].includes(order.state) ? (
                <Button variant='outlined' color='error' onClick={handleCancel} disabled={actionInFlight}>
                  Cancelar
                </Button>
              ) : null}
            </Stack>
          </Stack>

          {/* Audit timeline */}
          <Stack spacing={1.5}>
            <Typography variant='subtitle2'>Historia</Typography>
            <Stack spacing={1.5} sx={{ pl: 0.5 }}>
              <TimelineEntry icon='tabler-clipboard-plus' label='Creada' detail={`${order.createdBy.slice(0, 16)}…`} timestamp={order.createdAt} />
              {order.approvedAt ? (
                <TimelineEntry icon='tabler-check' label='Aprobada' detail={`${order.approvedBy?.slice(0, 16)}…`} timestamp={order.approvedAt} />
              ) : null}
              {order.submittedAt ? (
                <TimelineEntry icon='tabler-send' label='Enviada' detail={order.externalReference ?? '—'} timestamp={order.submittedAt} />
              ) : null}
              {order.paidAt ? (
                <TimelineEntry icon='tabler-circle-check' label='Pagada' detail={order.externalReference ?? '—'} timestamp={order.paidAt} />
              ) : null}
              {order.cancelledAt ? (
                <TimelineEntry icon='tabler-circle-x' label='Cancelada' detail={order.cancelledReason ?? '—'} timestamp={order.cancelledAt} />
              ) : null}
            </Stack>
          </Stack>
        </Stack>
      )}

      {/* TASK-799: picker dialog para asignar instrumento de salida */}
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Asignar instrumento de salida</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Typography variant='body2' color='text.secondary'>
              Selecciona el instrumento financiero que se rebaja o contrae deuda. Deel y otros processors
              no aparecen como origen cuando solo operan como rail.
            </Typography>
            <CustomTextField
              select
              label='Instrumento'
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              fullWidth
              disabled={accountsLoading}
              helperText={
                accountsLoading
                  ? 'Cargando instrumentos...'
                  : accounts.length === 0
                    ? `No hay instrumentos activos compatibles con ${order?.currency ?? 'la moneda solicitada'}.`
                    : null
              }
              SelectProps={{ displayEmpty: true }}
            >
              <MenuItem value='' disabled>
                Selecciona un instrumento
              </MenuItem>
              {accounts.map(account => (
                <MenuItem key={account.accountId} value={account.accountId}>
                  {account.accountName} · {account.bankName} ({account.currency})
                </MenuItem>
              ))}
            </CustomTextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPickerOpen(false)} disabled={actionInFlight}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            onClick={handleAssignSourceAccount}
            disabled={actionInFlight || !selectedAccountId || accountsLoading}
          >
            {actionInFlight ? 'Asignando…' : 'Asignar cuenta'}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  )
}

const TimelineEntry = ({ icon, label, detail, timestamp }: { icon: string; label: string; detail: string; timestamp: string }) => (
  <Stack direction='row' spacing={2} alignItems='flex-start'>
    <Box
      sx={theme => ({
        width: 32,
        height: 32,
        borderRadius: '50%',
        backgroundColor: theme.palette.action.hover,
        color: 'text.secondary',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      })}
    >
      <i className={icon} style={{ fontSize: 16 }} />
    </Box>
    <Stack spacing={0.25}>
      <Typography variant='body2' fontWeight={500}>
        {label}
      </Typography>
      <Typography variant='caption' color='text.secondary'>
        {detail}
      </Typography>
      <Typography variant='caption' color='text.secondary'>
        {new Date(timestamp).toLocaleString('es-CL')}
      </Typography>
    </Stack>
  </Stack>
)

export default OrderDetailDrawer
