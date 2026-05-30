'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import { OperationalPanel } from '@/components/greenhouse/primitives'
import type { ContractorSelfServiceScenario, ContractorTone } from '@/lib/contractor-engagements/projection-types'

const toneToColor: Record<ContractorTone, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  secondary: 'secondary'
}

const checklist = [
  {
    id: 'open-submission',
    title: 'Envíos abiertos',
    detail: 'Revisa borradores o envíos pendientes antes de cerrar.',
    status: 'Por revisar',
    tone: 'warning' as const
  },
  {
    id: 'post-close',
    title: 'Invoice posterior al cierre',
    detail: 'Permitido solo si el periodo de servicio queda explícito y con evidencia.',
    status: 'Auditado',
    tone: 'info' as const
  },
  {
    id: 'access',
    title: 'Acceso y traspaso',
    detail: 'El retiro de accesos vive en offboarding/identidad, separado del cierre contractual.',
    status: 'Separado',
    tone: 'secondary' as const
  }
]

const ContractorClosureSidecar = ({ scenario }: { scenario: ContractorSelfServiceScenario }) => (
  <OperationalPanel
    title='Cierre contractor'
    subheader='Lista de verificación para cerrar el engagement sin usar finiquito laboral.'
    icon='tabler-door-exit'
    iconColor='warning'
    action={
      <CustomChip
        round='true'
        size='small'
        variant='tonal'
        color={toneToColor[scenario.readinessTone]}
        label={scenario.readinessLabel}
      />
    }
  >
    <Stack spacing={3}>
      <Alert severity='info' icon={<i className='tabler-info-circle' />}>
        Este cierre no dispara cálculo de finiquito, causales DT ni documentos laborales dependientes.
      </Alert>

      {checklist.map(item => (
        <Box
          key={item.id}
          sx={theme => ({
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            p: 4
          })}
        >
          <Stack direction='row' spacing={3} justifyContent='space-between' alignItems='flex-start'>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant='subtitle2'>{item.title}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {item.detail}
              </Typography>
            </Box>
            <CustomChip round='true' size='small' variant='tonal' color={item.tone} label={item.status} />
          </Stack>
        </Box>
      ))}
    </Stack>
  </OperationalPanel>
)

export default ContractorClosureSidecar
