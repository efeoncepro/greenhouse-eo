'use client'

import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import { DataTableShell } from '@/components/greenhouse/data-table'
import type { PaymentOrder, PaymentOrderState } from '@/types/payment-orders'

interface OrdersTabProps {
  orders: PaymentOrder[]
  loading: boolean
  onOpenOrder: (orderId: string) => void
}

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0
  }).format(amount)

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

const formatDate = (d: string | null) => {
  if (!d) return '—'

  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

const OrdersTab = ({ orders, loading, onOpenOrder }: OrdersTabProps) => {
  return (
    <Stack spacing={4}>
      {loading ? <LinearProgress /> : null}

      <DataTableShell identifier='payment-orders-table' ariaLabel='Tabla de ordenes de pago' stickyFirstColumn>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Titulo</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align='right'>Total</TableCell>
              <TableCell>Programada</TableCell>
              <TableCell>Vence</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Maker</TableCell>
              <TableCell>Checker</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map(o => (
              <TableRow
                key={o.orderId}
                hover
                onClick={() => onOpenOrder(o.orderId)}
                sx={{ cursor: 'pointer' }}
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOpenOrder(o.orderId)
                  }
                }}
              >
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography variant='body2' fontWeight={500}>
                      {o.title}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {o.orderId}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip size='small' variant='outlined' label={o.batchKind} />
                </TableCell>
                <TableCell align='right'>
                  <Typography variant='body2' fontWeight={500} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatAmount(o.totalAmount, o.currency)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant='body2'>{formatDate(o.scheduledFor)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant='body2'>{formatDate(o.dueDate)}</Typography>
                </TableCell>
                <TableCell>
                  <Chip size='small' variant='tonal' color={stateColors[o.state]} label={stateLabels[o.state]} />
                </TableCell>
                <TableCell>
                  <Typography variant='caption' color='text.secondary'>
                    {o.createdBy.slice(0, 12)}…
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant='caption' color='text.secondary'>
                    {o.approvedBy ? `${o.approvedBy.slice(0, 12)}…` : '—'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>
    </Stack>
  )
}

export default OrdersTab
