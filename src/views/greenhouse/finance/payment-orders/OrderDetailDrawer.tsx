'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import { toast } from 'sonner'

import { DataTableShell } from '@/components/greenhouse/data-table'
import type { PaymentOrderState, PaymentOrderWithLines } from '@/types/payment-orders'

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

const OrderDetailDrawer = ({ order, loading, onClose, onActionComplete }: OrderDetailDrawerProps) => {
  const [actionInFlight, setActionInFlight] = useState(false)

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
        <IconButton onClick={onClose} aria-label='Cerrar drawer'>
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
                <Button variant='contained' color='success' onClick={handleMarkPaid} disabled={actionInFlight}>
                  Marcar pagada
                </Button>
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
