'use client'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import { OperationalPanel } from '@/components/greenhouse/primitives'

import type { ContractorScenario } from './types'

const resolveProfileTone = (label: string) => {
  const normalized = label.toLowerCase()

  if (normalized.includes('pendiente') || normalized.includes('revisión')) return 'warning'
  if (normalized.includes('rechazada') || normalized.includes('bloqueada')) return 'error'

  return 'success'
}

const PaymentProfileHandoffMockup = ({ scenario }: { scenario: ContractorScenario }) => {
  const tone = resolveProfileTone(scenario.paymentProfileLabel)
  const owner = tone === 'warning' ? 'Finance' : 'Contractor'

  return (
    <OperationalPanel
      title='Mi cuenta de pago'
      subheader={scenario.paymentProfileDetail}
      icon='tabler-credit-card'
      iconColor={tone}
      action={
        <Button variant='tonal' size='small' startIcon={<i className='tabler-external-link' />}>
          Abrir
        </Button>
      }
    >
      <Stack spacing={3}>
        <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
          <CustomChip round='true' size='small' variant='tonal' color={tone} label={scenario.paymentProfileLabel} />
          <CustomChip round='true' size='small' variant='tonal' color='secondary' label={`Owner: ${owner}`} />
        </Stack>

        <Typography variant='body2' color='text.secondary'>
          Este panel solo entrega el estado y el handoff. El alta, cambio y aprobación de cuentas vive en el flujo
          canónico de Mi cuenta de pago.
        </Typography>

        {tone === 'warning' ? (
          <Alert severity='warning' icon={<i className='tabler-clock' />}>
            El envío puede avanzar a revisión operacional, pero el payable quedará bloqueado hasta que exista cuenta
            aprobada o waiver gobernado.
          </Alert>
        ) : null}
      </Stack>
    </OperationalPanel>
  )
}

export default PaymentProfileHandoffMockup
