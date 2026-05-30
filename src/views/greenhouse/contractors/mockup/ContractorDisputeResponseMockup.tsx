'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'
import { getMicrocopy } from '@/lib/copy'

import type { ContractorScenario } from './types'

const GREENHOUSE_COPY = getMicrocopy()

interface ContractorDisputeResponseMockupProps {
  open: boolean
  scenario: ContractorScenario
  onClose: () => void
}

const ContractorDisputeResponseMockup = ({
  open,
  scenario,
  onClose
}: ContractorDisputeResponseMockupProps) => {
  const [correctedEvidence, setCorrectedEvidence] = useState<UploadedFileValue | null>(null)
  const dispute = scenario.blockers.find(blocker => blocker.responsable === 'Contractor') ?? scenario.blockers[0]
  const observedEvidence = scenario.supportItems.find(item => item.tone === 'error' || item.status === 'Observada')

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 540, lg: 620 }
        }
      }}
    >
      <Stack spacing={0} sx={{ minHeight: '100%' }} data-capture='contractor-dispute-response'>
        <Stack spacing={2.5} sx={{ p: 6 }}>
          <Stack direction='row' justifyContent='space-between' spacing={3} alignItems='flex-start'>
            <Box>
              <Typography variant='h5'>Responder observación</Typography>
              <Typography variant='body2' color='text.secondary'>
                Aclara lo solicitado y adjunta evidencia corregida para reabrir la revisión.
              </Typography>
            </Box>
            <Button variant='text' color='secondary' onClick={onClose} startIcon={<i className='tabler-x' />}>
              {GREENHOUSE_COPY.actions.close}
            </Button>
          </Stack>

          <Alert severity='warning' icon={<i className='tabler-alert-triangle' />}>
            Mientras la observación esté abierta, el payable no pasa a Finance.
          </Alert>
        </Stack>

        <Divider />

        <Stack spacing={5} sx={{ p: 6, flex: 1, overflowY: 'auto' }}>
          <Stack
            spacing={3}
            sx={theme => ({
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              p: 4
            })}
          >
            <Stack direction='row' spacing={2} justifyContent='space-between' alignItems='flex-start'>
              <Box>
                <Typography variant='subtitle1'>{dispute?.title ?? 'Observación abierta'}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {dispute?.detail ?? 'El revisor solicitó información adicional antes de aprobar el envío.'}
                </Typography>
              </Box>
              <CustomChip round='true' size='small' variant='tonal' color='error' label='Bloquea pago' />
            </Stack>

            <Divider />

            <Stack direction='row' spacing={3} justifyContent='space-between' alignItems='center'>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                  Evidencia observada
                </Typography>
                <Typography variant='caption' color='text.secondary' noWrap>
                  {observedEvidence?.filename ?? 'Archivo observado por el revisor'}
                </Typography>
              </Box>
              <CustomChip round='true' size='small' variant='tonal' color='error' label={observedEvidence?.status ?? 'Observada'} />
            </Stack>
          </Stack>

          <CustomTextField
            fullWidth
            multiline
            minRows={4}
            label='Respuesta al revisor'
            defaultValue='Adjunto evidencia corregida. El entregable corresponde al periodo 04 may - 31 may 2026.'
          />

          <GreenhouseFileUploader
            contextType='contractor_work_evidence_draft'
            value={correctedEvidence}
            onChange={setCorrectedEvidence}
            title='Evidencia corregida'
            helperText='Adjunta el archivo que responde directamente a la observación.'
            emptyTitle='Adjunta evidencia corregida'
            emptyDescription='El revisor verá esta evidencia junto con tu respuesta.'
            browseCta='Seleccionar evidencia'
            ownerMemberId='member-valentina'
            metadataLabel={`${scenario.engagementPublicId} dispute response`}
          />

          <Alert severity='info' icon={<i className='tabler-info-circle' />}>
            La respuesta vuelve a dejar el caso en revisión operacional. No crea una obligación Finance todavía.
          </Alert>
        </Stack>

        <Divider />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='flex-end' sx={{ p: 6 }}>
          <Button variant='tonal' color='secondary' onClick={onClose}>
            Guardar respuesta
          </Button>
          <Button variant='contained' startIcon={<i className='tabler-message-reply' />}>
            Responder observación
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  )
}

export default ContractorDisputeResponseMockup
