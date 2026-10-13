'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'
import { getMicrocopy } from '@/lib/copy'
import { GH_CONTRACTOR_SUBMISSIONS as CS } from '@/lib/copy/contractor-submissions'
import type { ContractorSelfServiceScenario } from '@/lib/contractor-engagements/projection-types'

const GREENHOUSE_COPY = getMicrocopy()

interface ContractorDisputeResponseProps {
  open: boolean
  scenario: ContractorSelfServiceScenario
  onClose: () => void
  onResponded: () => void
}

const resolveSubmissionType = (paymentModel: string): 'milestone' | 'deliverable' =>
  paymentModel.toLowerCase().includes('milestone') ? 'milestone' : 'deliverable'

const ContractorDisputeResponse = ({ open, scenario, onClose, onResponded }: ContractorDisputeResponseProps) => {
  const [correctedEvidence, setCorrectedEvidence] = useState<UploadedFileValue | null>(null)
  const [responseNote, setResponseNote] = useState('')
  const [attemptKey, setAttemptKey] = useState(() => crypto.randomUUID())
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dispute = scenario.blockers.find(blocker => blocker.responsable === 'Contractor') ?? scenario.blockers[0]
  const observedEvidence = scenario.supportItems.find(item => item.tone === 'error' || item.status === 'Observada')

  const handleRespond = async () => {
    setIsSaving(true)
    setError(null)

    try {
      if (!scenario.supportSubmissionId) throw new Error(CS.prepareFirst)

      const response = await fetch('/api/my/contractor/work-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: attemptKey,
          contractorWorkSubmissionId: scenario.supportSubmissionId,
          evidenceAssetId: correctedEvidence?.assetId ?? null,
          title: responseNote.trim() || null,
          submissionType: resolveSubmissionType(scenario.paymentModel),
          submit: true
        })
      })

      const payload = (await response.json().catch(() => null)) as {
        submission?: { contractorWorkSubmissionId?: string }
        error?: string
      } | null

      if (!response.ok || !payload?.submission) {
        throw new Error(payload?.error || 'No pudimos enviar tu respuesta. Intenta de nuevo.')
      }

      setCorrectedEvidence(null)
      setResponseNote('')
      setAttemptKey(crypto.randomUUID())

      onResponded()
      onClose()
    } catch (respondError) {
      setError(
        respondError instanceof Error ? respondError.message : 'No pudimos enviar tu respuesta. Intenta de nuevo.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{
        'aria-label': CS.responseTitle,
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

          <Alert
            sx={{ '& .MuiAlert-message': { color: 'text.primary' } }}
            severity='warning'
            icon={<i className='tabler-alert-triangle' />}
          >
            Mientras la observación esté abierta, el pago no avanza.
          </Alert>

          {error ? (
            <Alert
              sx={{ '& .MuiAlert-message': { color: 'text.primary' } }}
              severity='error'
              icon={<i className='tabler-alert-triangle' />}
            >
              {error}
            </Alert>
          ) : null}
        </Stack>

        <Divider />

        <Stack
          spacing={5}
          role='region'
          aria-label={CS.responseRegion}
          tabIndex={0}
          sx={{
            p: 6,
            flex: 1,
            overflowY: 'auto',
            '& input:focus-visible, & textarea:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2
            }
          }}
        >
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
                <Typography variant='subtitle1' color='text.primary'>
                  {dispute?.title ?? 'Observación abierta'}
                </Typography>
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
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color='error'
                label={observedEvidence?.status ?? 'Observada'}
              />
            </Stack>
          </Stack>

          <CustomTextField
            fullWidth
            multiline
            minRows={4}
            label='Respuesta al revisor'
            placeholder='Describe qué corregiste y por qué la evidencia responde a la observación.'
            value={responseNote}
            onChange={event => setResponseNote(event.target.value)}
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
            metadataLabel={`${scenario.engagementPublicId} dispute response`}
          />

          <Alert
            sx={{ '& .MuiAlert-message': { color: 'text.primary' } }}
            severity='info'
            icon={<i className='tabler-info-circle' />}
          >
            La respuesta vuelve a dejar el caso en revisión operacional. No crea una obligación con Finance todavía.
          </Alert>
        </Stack>

        <Divider />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='flex-end' sx={{ p: 6 }}>
          <Button variant='tonal' color='secondary' disabled={isSaving} onClick={onClose}>
            {GREENHOUSE_COPY.actions.cancel}
          </Button>
          <Button
            variant='contained'
            disabled={isSaving}
            startIcon={
              isSaving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-message-reply' />
            }
            onClick={handleRespond}
          >
            Responder observación
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  )
}

export default ContractorDisputeResponse
