'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

const EventsTab = () => {
  return (
    <Stack spacing={3}>
      <Alert severity='info' icon={<i className='tabler-list-details' />}>
        Cada accion (crear orden, aprobar, programar, enviar, marcar pagada, cancelar) publica un evento
        en <code>greenhouse_sync.outbox_events</code> con <code>aggregate_type=payment_order</code>. La
        vista detallada del log con filtros y replay queda en TASK-751 (reconciliation runtime).
      </Alert>
      <Box
        sx={theme => ({
          p: 4,
          borderRadius: 2,
          border: `1px dashed ${theme.palette.divider}`,
          backgroundColor: theme.palette.action.hover,
          opacity: 0.8
        })}
      >
        <Typography variant='subtitle2' gutterBottom>
          Eventos emitidos por este modulo
        </Typography>
        <Stack component='ul' spacing={0.5} sx={{ pl: 3, m: 0 }}>
          {[
            'finance.payment_obligation.generated',
            'finance.payment_obligation.superseded',
            'finance.payment_order.created',
            'finance.payment_order.approved',
            'finance.payment_order.scheduled',
            'finance.payment_order.submitted',
            'finance.payment_order.paid',
            'finance.payment_order.cancelled',
            'finance.payment_order_artifact.generated',
            'finance.payment_order_artifact.downloaded'
          ].map(name => (
            <li key={name}>
              <Typography variant='body2' component='code' sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                {name}
              </Typography>
            </li>
          ))}
        </Stack>
      </Box>
    </Stack>
  )
}

export default EventsTab
