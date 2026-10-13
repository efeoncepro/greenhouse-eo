'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'
import { getMicrocopy } from '@/lib/copy'
import { GH_CONTRACTOR_COMPENSATION as CC } from '@/lib/copy/contractor-compensation'
import { GH_CONTRACTOR_SUBMISSIONS as CS } from '@/lib/copy/contractor-submissions'
import { assertContractorServicePeriod } from '@/lib/contractor-engagements/work-submissions/service-period'
import { formatCurrency, type CurrencyCode } from '@/lib/format'
import type { ContractorSelfServiceScenario } from '@/lib/contractor-engagements/projection-types'

const GREENHOUSE_COPY = getMicrocopy()

type SubmissionType = 'deliverable' | 'milestone' | 'timesheet'

interface ContractorSubmissionComposerProps {
  open: boolean
  scenario: ContractorSelfServiceScenario
  onClose: () => void
  onSubmitted: () => void
}

const resolveDefaultType = (paymentModel: string): SubmissionType =>
  paymentModel.toLowerCase().includes('milestone') ? 'milestone' : 'deliverable'

const ContractorSubmissionComposer = ({ open, scenario, onClose, onSubmitted }: ContractorSubmissionComposerProps) => {
  const [submissionType, setSubmissionType] = useState<SubmissionType>(
    ['hourly', 'daily'].includes(scenario.agreedRate.rateType) ? 'timesheet' : resolveDefaultType(scenario.paymentModel)
  )

  const [servicePeriodStart, setServicePeriodStart] = useState('')
  const [servicePeriodEnd, setServicePeriodEnd] = useState('')
  const currency = scenario.agreedRate.currency
  const [attemptKey, setAttemptKey] = useState(() => crypto.randomUUID())
  const [draftId, setDraftId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState('')
  const [invoiceAsset, setInvoiceAsset] = useState<UploadedFileValue | null>(null)
  const [evidenceAsset, setEvidenceAsset] = useState<UploadedFileValue | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requiresInvoice = scenario.requiresInvoice ?? scenario.supportItems.some(item => item.kind === 'invoice')
  const needsEvidence = scenario.requiresWorkApproval ?? true

  // The amount is DERIVED from the agreed rate (set by HR). The contractor declares
  // the work (period / quantity for timesheet) — never the amount (TASK-968 SoD).
  const agreedAmount = scenario.agreedRate.rateAmount
  const hasRate = agreedAmount !== null && Number.isFinite(agreedAmount) && agreedAmount > 0
  const parsedQuantity = Number(quantity.trim().replace(',', '.'))

  const derivedGross =
    agreedAmount === null
      ? null
      : submissionType === 'timesheet'
        ? Number.isFinite(parsedQuantity) && parsedQuantity > 0
          ? Math.round(parsedQuantity * agreedAmount * 100) / 100
          : null
        : agreedAmount

  const money = (n: number) => formatCurrency(n, currency as CurrencyCode, { currencySymbolSpacing: ' ' }, 'es-CL')

  const handleSave = async (submit: boolean) => {
    setIsSaving(true)
    setError(null)

    try {
      if (!servicePeriodStart) throw new Error(CS.startRequired)

      assertContractorServicePeriod(servicePeriodStart, servicePeriodEnd || null)

      const response = await fetch('/api/my/contractor/work-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: attemptKey,
          contractorWorkSubmissionId: draftId,
          invoiceAssetId: invoiceAsset?.assetId ?? null,
          evidenceAssetId: evidenceAsset?.assetId ?? null,
          submissionType,
          servicePeriodStart,
          servicePeriodEnd: servicePeriodEnd || null,
          quantity:
            submissionType === 'timesheet' && Number.isFinite(parsedQuantity) && parsedQuantity > 0
              ? parsedQuantity
              : undefined,
          submit
        })
      })

      const payload = (await response.json().catch(() => null)) as {
        submission?: { contractorWorkSubmissionId?: string }
        error?: string
      } | null

      if (!response.ok || !payload?.submission) {
        throw new Error(payload?.error || CS.saveFailed)
      }

      setDraftId(payload.submission.contractorWorkSubmissionId ?? null)

      if (submit) {
        setServicePeriodStart('')
        setServicePeriodEnd('')
        setQuantity('')
        setInvoiceAsset(null)
        setEvidenceAsset(null)
        setDraftId(null)
        setAttemptKey(crypto.randomUUID())
      }

      onSubmitted()
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : CS.saveFailed)
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
        'aria-label': CS.prepareTitle,
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

          <Alert
            sx={{ '& .MuiAlert-message': { color: 'text.primary' } }}
            severity='info'
            icon={<i className='tabler-info-circle' />}
          >
            Enviar a revisión no ejecuta el pago. Primero se valida la evidencia; luego se prepara el pago.
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
          aria-label={CS.workRegion}
          tabIndex={0}
          sx={{
            p: 6,
            flex: 1,
            overflowY: 'auto',
            '& input:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 }
          }}
        >
          <Stack spacing={2}>
            <Typography variant='subtitle1' color='text.primary'>
              Datos del trabajo
            </Typography>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  select
                  fullWidth
                  label='Tipo de envío'
                  value={submissionType}
                  onChange={event => setSubmissionType(event.target.value as SubmissionType)}
                  disabled={Boolean(draftId)}
                >
                  {['hourly', 'daily'].includes(scenario.agreedRate.rateType) ? (
                    <MenuItem value='timesheet'>
                      {scenario.agreedRate.rateType === 'daily' ? CS.daysWorked : CS.hoursWorked}
                    </MenuItem>
                  ) : (
                    [
                      <MenuItem key='deliverable' value='deliverable'>
                        Entregable
                      </MenuItem>,
                      <MenuItem key='milestone' value='milestone'>
                        Hito
                      </MenuItem>
                    ]
                  )}
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  type='date'
                  required
                  label={CS.periodStart}
                  value={servicePeriodStart}
                  onChange={event => setServicePeriodStart(event.target.value)}
                  helperText={CS.periodHelp}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  type='date'
                  label={CS.periodEnd}
                  value={servicePeriodEnd}
                  onChange={event => setServicePeriodEnd(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: servicePeriodStart || undefined } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField fullWidth label='Moneda' value={currency} slotProps={{ input: { readOnly: true } }} />
              </Grid>
              {submissionType === 'timesheet' ? (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    fullWidth
                    label='Cantidad'
                    value={quantity}
                    onChange={event => setQuantity(event.target.value)}
                    placeholder='ej. 40'
                    helperText='Horas o días trabajados.'
                    slotProps={{ input: { inputMode: 'decimal' } }}
                  />
                </Grid>
              ) : null}
            </Grid>

            {/* Derived amount — read-only. The contractor never types the amount (SoD). */}
            {hasRate ? (
              <Box
                sx={theme => ({
                  p: 4,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  bgcolor: alpha(theme.palette.info.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`
                })}
              >
                <Stack direction='row' spacing={2} alignItems='center'>
                  <i className='tabler-lock' style={{ fontSize: 20 }} aria-hidden />
                  <Box>
                    <Typography variant='caption' color='text.secondary'>
                      {CC.contractor.derivedTitle}
                    </Typography>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}
                    >
                      {derivedGross !== null ? money(derivedGross) : 'Indica la cantidad'}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {CC.contractor.derivedNote}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            ) : (
              <Alert
                sx={{ '& .MuiAlert-message': { color: 'text.primary' } }}
                severity='warning'
                icon={<i className='tabler-alert-circle' />}
              >
                {CC.contractor.missingDescription}
              </Alert>
            )}
          </Stack>

          <Divider />

          <Stack spacing={3}>
            <Stack direction='row' justifyContent='space-between' spacing={2} alignItems='center'>
              <Typography variant='subtitle1' color='text.primary'>
                Soporte requerido
              </Typography>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                <CustomChip
                  round='true'
                  size='small'
                  variant='tonal'
                  sx={{ color: 'text.primary' }}
                  color={requiresInvoice && !invoiceAsset ? 'warning' : 'success'}
                  label={requiresInvoice ? (invoiceAsset ? CS.invoiceSelected : CS.invoicePending) : CS.invoiceOptional}
                />
                <CustomChip
                  round='true'
                  size='small'
                  variant='tonal'
                  sx={{ color: 'text.primary' }}
                  color={needsEvidence && !evidenceAsset ? 'warning' : 'success'}
                  label={
                    needsEvidence
                      ? evidenceAsset
                        ? 'Evidencia seleccionada'
                        : 'Evidencia pendiente'
                      : CS.evidenceOptional
                  }
                />
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
              metadataLabel={`${scenario.engagementPublicId} invoice`}
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
              metadataLabel={`${scenario.engagementPublicId} evidence`}
            />
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <Typography variant='subtitle1' color='text.primary'>
              Resumen antes de enviar
            </Typography>
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
              <SummaryRow
                label={CS.periodSummary}
                value={[servicePeriodStart, servicePeriodEnd].filter(Boolean).join(' – ') || '—'}
              />
              <SummaryRow label='Monto del período' value={derivedGross !== null ? money(derivedGross) : '—'} />
              <SummaryRow label='Estado siguiente' value='Revisión operacional' />
            </Stack>
          </Stack>
        </Stack>

        <Divider />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='flex-end' sx={{ p: 6 }}>
          <Button variant='tonal' color='secondary' disabled={isSaving || !hasRate} onClick={() => handleSave(false)}>
            Guardar borrador
          </Button>
          <Button
            variant='contained'
            disabled={isSaving || !hasRate}
            startIcon={isSaving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-send' />}
            onClick={() => handleSave(true)}
          >
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

export default ContractorSubmissionComposer
