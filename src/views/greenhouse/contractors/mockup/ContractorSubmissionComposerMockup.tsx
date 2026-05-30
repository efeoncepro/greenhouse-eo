'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'
import { getMicrocopy } from '@/lib/copy'

import type { ContractorScenario } from './types'

const GREENHOUSE_COPY = getMicrocopy()

interface ContractorSubmissionComposerMockupProps {
  open: boolean
  scenario: ContractorScenario
  onClose: () => void
}

const ContractorSubmissionComposerMockup = ({
  open,
  scenario,
  onClose
}: ContractorSubmissionComposerMockupProps) => {
  const [invoiceAsset, setInvoiceAsset] = useState<UploadedFileValue | null>(null)
  const [evidenceAsset, setEvidenceAsset] = useState<UploadedFileValue | null>(null)

  const requiresInvoice = scenario.supportItems.some(item => item.kind === 'invoice' && item.tone !== 'success')
  const needsEvidence = scenario.supportItems.some(item => item.kind === 'evidence' && item.tone !== 'success')

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 560, lg: 640 }
        }
      }}
    >
      <Stack spacing={0} sx={{ minHeight: '100%' }} data-capture='contractor-submission-composer'>
        <Stack spacing={2.5} sx={{ p: 6 }}>
          <Stack direction='row' justifyContent='space-between' spacing={3} alignItems='flex-start'>
            <Box>
              <Typography variant='h5'>Preparar envío</Typography>
              <Typography variant='body2' color='text.secondary'>
                Declara el periodo, adjunta soporte y envía a revisión operacional.
              </Typography>
            </Box>
            <Button variant='text' color='secondary' onClick={onClose} startIcon={<i className='tabler-x' />}>
              {GREENHOUSE_COPY.actions.close}
            </Button>
          </Stack>

          <Alert severity='info' icon={<i className='tabler-info-circle' />}>
            Enviar a revisión no ejecuta el pago. Primero se valida la evidencia; luego se prepara el payable.
          </Alert>
        </Stack>

        <Divider />

        <Stack spacing={5} sx={{ p: 6, flex: 1, overflowY: 'auto' }}>
          <Stack spacing={2}>
            <Typography variant='subtitle1'>Datos del trabajo</Typography>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField select fullWidth label='Tipo de envío' defaultValue={scenario.paymentModel === 'Milestone' ? 'milestone' : 'deliverable'}>
                  <MenuItem value='deliverable'>Deliverable</MenuItem>
                  <MenuItem value='milestone'>Milestone</MenuItem>
                  <MenuItem value='timesheet'>Timesheet</MenuItem>
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField fullWidth label='Periodo de servicio' defaultValue={scenario.servicePeriod} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField fullWidth label='Moneda' defaultValue={scenario.currency} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField fullWidth label='Monto bruto' defaultValue={scenario.kpis[0]?.value ?? ''} />
              </Grid>
            </Grid>
          </Stack>

          <Divider />

          <Stack spacing={3}>
            <Stack direction='row' justifyContent='space-between' spacing={2} alignItems='center'>
              <Typography variant='subtitle1'>Soporte requerido</Typography>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                <CustomChip round='true' size='small' variant='tonal' color={requiresInvoice ? 'warning' : 'success'} label={requiresInvoice ? 'Boleta pendiente' : 'Boleta lista'} />
                <CustomChip round='true' size='small' variant='tonal' color={needsEvidence ? 'warning' : 'success'} label={needsEvidence ? 'Evidencia pendiente' : 'Evidencia lista'} />
              </Stack>
            </Stack>

            <GreenhouseFileUploader
              contextType='contractor_invoice_draft'
              value={invoiceAsset}
              onChange={setInvoiceAsset}
              title='Boleta o invoice'
              helperText='PDF, imagen o archivo tributario permitido por la policy del contexto.'
              emptyTitle='Adjunta el documento principal'
              emptyDescription='El archivo queda en el registro privado de assets.'
              browseCta='Seleccionar documento'
              ownerMemberId='member-valentina'
              metadataLabel={`${scenario.engagementPublicId} composer invoice`}
            />

            <GreenhouseFileUploader
              contextType='contractor_work_evidence_draft'
              value={evidenceAsset}
              onChange={setEvidenceAsset}
              title='Evidencia del servicio'
              helperText='Entregables, aprobaciones o respaldo del periodo de servicio.'
              emptyTitle='Adjunta evidencia'
              emptyDescription='Debe corresponder al periodo declarado.'
              browseCta='Seleccionar evidencia'
              ownerMemberId='member-valentina'
              metadataLabel={`${scenario.engagementPublicId} composer evidence`}
            />
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <Typography variant='subtitle1'>Resumen antes de enviar</Typography>
            <Stack
              spacing={2}
              sx={theme => ({
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                p: 4
              })}
            >
              <SummaryRow label='Engagement' value={scenario.engagementPublicId} />
              <SummaryRow label='Relación' value={scenario.relationshipSubtype} />
              <SummaryRow label='Monto' value={scenario.kpis[0]?.value ?? 'Por definir'} />
              <SummaryRow label='Estado siguiente' value='Revisión operacional' />
            </Stack>
          </Stack>
        </Stack>

        <Divider />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='flex-end' sx={{ p: 6 }}>
          <Button variant='tonal' color='secondary' onClick={onClose}>
            Guardar borrador
          </Button>
          <Button variant='contained' startIcon={<i className='tabler-send' />}>
            Enviar a revisión
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

export default ContractorSubmissionComposerMockup
