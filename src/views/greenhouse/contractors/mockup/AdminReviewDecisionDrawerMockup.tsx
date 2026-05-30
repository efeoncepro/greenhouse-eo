'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { getMicrocopy } from '@/lib/copy'

import type { ContractorScenario, ContractorTone } from './types'

type ReviewDecision = 'approve' | 'dispute' | 'reject'

const GREENHOUSE_COPY = getMicrocopy()

interface AdminReviewDecisionDrawerMockupProps {
  open: boolean
  scenario: ContractorScenario
  initialDecision: ReviewDecision
  onClose: () => void
}

const toneToColor: Record<ContractorTone, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  secondary: 'secondary'
}

const decisionCopy: Record<ReviewDecision, { title: string; cta: string; tone: 'success' | 'warning' | 'error' }> = {
  approve: {
    title: 'Aprobar envío',
    cta: 'Aprobar envío',
    tone: 'success'
  },
  dispute: {
    title: 'Disputar envío',
    cta: 'Enviar observación',
    tone: 'warning'
  },
  reject: {
    title: 'Rechazar envío',
    cta: 'Rechazar envío',
    tone: 'error'
  }
}

const AdminReviewDecisionDrawerMockup = ({
  open,
  scenario,
  initialDecision,
  onClose
}: AdminReviewDecisionDrawerMockupProps) => {
  const [decision, setDecision] = useState<ReviewDecision>(initialDecision)
  const copy = decisionCopy[decision]
  const requiresReason = decision !== 'approve'
  const supportReady = scenario.supportItems.every(item => item.tone === 'success')

  useEffect(() => {
    if (open) setDecision(initialDecision)
  }, [initialDecision, open])

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 600, lg: 680 }
        }
      }}
    >
      <Stack spacing={0} sx={{ minHeight: '100%' }} data-capture='admin-review-decision-drawer'>
        <Stack spacing={2.5} sx={{ p: 6 }}>
          <Stack direction='row' justifyContent='space-between' spacing={3} alignItems='flex-start'>
            <Box>
              <Typography variant='h5'>{copy.title}</Typography>
              <Typography variant='body2' color='text.secondary'>
                Decide sobre la evidencia operacional. Esta acción no ejecuta el pago.
              </Typography>
            </Box>
            <Button variant='text' color='secondary' onClick={onClose} startIcon={<i className='tabler-x' />}>
              {GREENHOUSE_COPY.actions.close}
            </Button>
          </Stack>

          <Alert severity='info' icon={<i className='tabler-building-bank' />}>
            Aprobar habilita la preparación del contractor payable. Finance crea la obligation después del readiness.
          </Alert>
        </Stack>

        <Divider />

        <Stack spacing={5} sx={{ p: 6, flex: 1, overflowY: 'auto' }}>
          <Stack
            spacing={2}
            sx={theme => ({
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              p: 4
            })}
          >
            <SummaryRow label='Contractor' value={scenario.contractorName} />
            <SummaryRow label='Engagement' value={scenario.engagementPublicId} />
            <SummaryRow label='Periodo' value={scenario.servicePeriod} />
            <SummaryRow label='Monto' value={scenario.kpis[0]?.value ?? 'Sin monto'} />
          </Stack>

          <Stack spacing={2}>
            <Typography variant='subtitle1'>Decisión</Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              color='primary'
              value={decision}
              onChange={(_, value: ReviewDecision | null) => {
                if (value) setDecision(value)
              }}
            >
              <ToggleButton value='approve'>Aprobar</ToggleButton>
              <ToggleButton value='dispute'>Disputar</ToggleButton>
              <ToggleButton value='reject'>Rechazar</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Stack spacing={2}>
            <Typography variant='subtitle1'>Checklist de evidencia</Typography>
            {scenario.supportItems.map(item => (
              <Stack
                key={item.id}
                direction='row'
                spacing={3}
                justifyContent='space-between'
                alignItems='center'
                sx={theme => ({
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                  p: 4
                })}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>
                    {item.label}
                  </Typography>
                  <Typography variant='caption' color='text.secondary' noWrap>
                    {item.filename ?? 'Pendiente de adjuntar'}
                  </Typography>
                </Box>
                <CustomChip round='true' size='small' variant='tonal' color={toneToColor[item.tone]} label={item.status} />
              </Stack>
            ))}
          </Stack>

          <Stack spacing={2}>
            <Typography variant='subtitle1'>Readiness operacional</Typography>
            <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color={supportReady ? 'success' : 'warning'}
                label={supportReady ? 'Soporte completo' : 'Soporte pendiente'}
              />
              <CustomChip round='true' size='small' variant='tonal' color={toneToColor[scenario.readinessTone]} label={scenario.readinessLabel} />
              <CustomChip round='true' size='small' variant='tonal' color='secondary' label='Pago no ejecutado' />
            </Stack>
          </Stack>

          {requiresReason ? (
            <CustomTextField
              fullWidth
              multiline
              minRows={4}
              label='Motivo visible para el contractor'
              defaultValue={decision === 'dispute' ? 'La evidencia debe indicar explícitamente el periodo de servicio.' : 'El envío no cumple la evidencia mínima para este periodo.'}
            />
          ) : (
            <Alert severity='success' icon={<i className='tabler-check' />}>
              El envío queda aprobado operacionalmente. El payable todavía debe pasar los gates de tax, FX y cuenta de pago.
            </Alert>
          )}
        </Stack>

        <Divider />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='flex-end' sx={{ p: 6 }}>
          <Button variant='tonal' color='secondary' onClick={onClose}>
            {GREENHOUSE_COPY.actions.cancel}
          </Button>
          <Button variant='contained' color={copy.tone} startIcon={<i className={decision === 'approve' ? 'tabler-check' : decision === 'dispute' ? 'tabler-message-report' : 'tabler-x'} />}>
            {copy.cta}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  )
}

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <Stack direction='row' justifyContent='space-between' spacing={3}>
    <Typography variant='body2' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='body2' sx={{ fontWeight: 600, textAlign: 'right' }}>
      {value}
    </Typography>
  </Stack>
)

export default AdminReviewDecisionDrawerMockup
