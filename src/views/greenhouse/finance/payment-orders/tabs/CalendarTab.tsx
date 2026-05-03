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
import type {
  PaymentCalendarItem,
  PaymentCalendarItemState
} from '@/lib/finance/payment-calendar/list-calendar-items'

interface CalendarTabProps {
  items: PaymentCalendarItem[]
  loading: boolean
  onOpenOrder: (orderId: string) => void
}

const stateLabels: Record<PaymentCalendarItemState, string> = {
  ready_to_schedule: 'Por programar',
  scheduled: 'Programada',
  submission_due: 'Enviar hoy',
  awaiting_confirmation: 'Esperando banco',
  awaiting_reconciliation: 'Por conciliar',
  overdue: 'Vencida',
  closed: 'Cerrada',
  due: 'Vencimiento'
}

const stateColors: Record<PaymentCalendarItemState, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  ready_to_schedule: 'warning',
  scheduled: 'info',
  submission_due: 'warning',
  awaiting_confirmation: 'primary',
  awaiting_reconciliation: 'info',
  overdue: 'error',
  closed: 'secondary',
  due: 'warning'
}

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0
  }).format(amount)

const formatDate = (d: string | null) => {
  if (!d) return '—'

  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

const CalendarTab = ({ items, loading, onOpenOrder }: CalendarTabProps) => {
  return (
    <Stack spacing={4}>
      {loading ? <LinearProgress /> : null}

      <DataTableShell identifier='payment-calendar-table' ariaLabel='Calendario de pagos' stickyFirstColumn>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align='right'>Monto</TableCell>
              <TableCell>Programada</TableCell>
              <TableCell>Vence</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item => (
              <TableRow
                key={item.itemId}
                hover
                onClick={() => (item.itemKind === 'order' ? onOpenOrder(item.sourceId) : undefined)}
                sx={{ cursor: item.itemKind === 'order' ? 'pointer' : 'default' }}
              >
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography variant='body2' fontWeight={500}>
                      {item.title}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {item.sourceId}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    size='small'
                    variant='outlined'
                    label={item.itemKind === 'order' ? 'Orden' : 'Obligacion'}
                  />
                </TableCell>
                <TableCell align='right'>
                  <Typography variant='body2' fontWeight={500} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatAmount(item.amount, item.currency)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant='body2'>{formatDate(item.scheduledFor)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant='body2'>{formatDate(item.dueDate)}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={stateColors[item.calendarState]}
                    label={stateLabels[item.calendarState]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>
    </Stack>
  )
}

export default CalendarTab
