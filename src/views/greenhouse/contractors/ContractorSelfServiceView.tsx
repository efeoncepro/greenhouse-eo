'use client'

import { useCallback, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'
import RemittanceAdviceSection from '@/components/greenhouse/contractors/RemittanceAdviceSection'
import { MetricSummaryCard, OperationalPanel, OperationalSignalList } from '@/components/greenhouse/primitives'
import { formatCurrency } from '@/lib/format'
import type { CurrencyCode } from '@/lib/format'
import type {
  ContractorScenarioBlocker,
  ContractorSelfServiceProjection,
  ContractorSelfServiceScenario,
  ContractorTone
} from '@/lib/contractor-engagements/projection-types'

import ContractorClosureSidecar from './ContractorClosureSidecar'
import ContractorDisputeResponse from './ContractorDisputeResponse'
import ContractorSubmissionComposer from './ContractorSubmissionComposer'
import ContractorTimeline from './ContractorTimeline'
import PaymentProfileHandoff from './PaymentProfileHandoff'

const toneToColor: Record<ContractorTone, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  secondary: 'secondary'
}

const toneToStatusIcon: Record<ContractorTone, string> = {
  success: 'tabler-circle-check',
  warning: 'tabler-alert-circle',
  error: 'tabler-alert-triangle',
  info: 'tabler-info-circle',
  secondary: 'tabler-circle'
}

const formatSubmissionAmount = (amount: number, currency: string) =>
  formatCurrency(amount, currency as CurrencyCode, { currencySymbolSpacing: ' ' }, 'es-CL')

interface ContractorSelfServiceViewProps {
  initialProjection: ContractorSelfServiceProjection
}

const SummaryFact = ({ label, value }: { label: string; value: string }) => (
  <Stack spacing={0.5}>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
      {value}
    </Typography>
  </Stack>
)

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <Stack direction='row' justifyContent='space-between' spacing={3}>
    <Typography variant='body2' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='body2' sx={{ fontWeight: 600, textAlign: 'right' }}>
      {value}
    </Typography>
  </Stack>
)

const HeroPanel = ({
  scenario,
  onPrimaryAction
}: {
  scenario: ContractorSelfServiceScenario
  onPrimaryAction: () => void
}) => {
  const theme = useTheme()

  return (
    <Card
      sx={{
        overflow: 'hidden',
        border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.18)}`
      }}
    >
      <CardContent>
        <Stack spacing={5}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={4}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent='space-between'
          >
            <Stack spacing={2} sx={{ maxWidth: 780 }}>
              <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
                <CustomChip
                  round='true'
                  size='small'
                  variant='tonal'
                  color={toneToColor[scenario.readinessTone]}
                  label={scenario.readinessLabel}
                />
                <Typography variant='overline' color='text.secondary'>
                  {scenario.eyebrow}
                </Typography>
              </Stack>
              <Box>
                <Typography variant='h3' sx={{ mb: 1 }}>
                  {scenario.title}
                </Typography>
                <Typography variant='body1' color='text.secondary'>
                  {scenario.summary}
                </Typography>
              </Box>
            </Stack>
            <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
              <Button
                variant='contained'
                startIcon={<i className={scenario.primaryActionIcon} />}
                disabled={scenario.primaryActionDisabled}
                onClick={onPrimaryAction}
                data-capture='contractor-primary-action'
              >
                {scenario.primaryAction}
              </Button>
              <Button
                component={Link}
                href={scenario.secondaryHref}
                variant='tonal'
                color='secondary'
                startIcon={<i className='tabler-credit-card' />}
              >
                {scenario.secondaryAction}
              </Button>
            </Stack>
          </Stack>

          {scenario.primaryActionDisabled && scenario.primaryActionReason ? (
            <Alert severity='warning' icon={<i className='tabler-lock' />}>
              {scenario.primaryActionReason}
            </Alert>
          ) : null}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
              gap: 3,
              p: 4,
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              bgcolor: alpha(theme.palette.primary.main, 0.06)
            }}
          >
            <SummaryFact label='Engagement' value={scenario.engagementPublicId} />
            <SummaryFact label='Relación' value={scenario.relationshipSubtype} />
            <SummaryFact label='Periodo' value={scenario.servicePeriod} />
            <SummaryFact label='Pago' value={`${scenario.currency} -> ${scenario.paymentCurrency}`} />
          </Box>

          <Stack direction='row' spacing={1.5} alignItems='center'>
            <i className='tabler-building' aria-hidden='true' />
            <Typography variant='body2' color='text.secondary'>
              Entidad contratante: <strong>{scenario.legalEntityLabel}</strong>
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

const SupportUploaderPanel = ({
  scenario,
  onAttached
}: {
  scenario: ContractorSelfServiceScenario
  onAttached: () => void
}) => {
  const [invoiceAsset, setInvoiceAsset] = useState<UploadedFileValue | null>(null)
  const [evidenceAsset, setEvidenceAsset] = useState<UploadedFileValue | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasPendienteSupport = scenario.supportItems.some(
    item => item.status === 'Pendiente' || item.status === 'Observada'
  )

  const attach = async (
    value: UploadedFileValue | null,
    assetRole: 'invoice_pdf' | 'work_evidence',
    reset: () => void
  ) => {
    if (!value?.assetId) return

    setError(null)

    try {
      const response = await fetch('/api/my/contractor/attach-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: value.assetId, assetRole })
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null

        throw new Error(payload?.error || 'No pudimos adjuntar el soporte. Intenta de nuevo.')
      }

      reset()
      onAttached()
    } catch (attachError) {
      setError(attachError instanceof Error ? attachError.message : 'No pudimos adjuntar el soporte. Intenta de nuevo.')
    }
  }

  return (
    <OperationalPanel
      title='Enviar soporte'
      subheader='Boleta, invoice y evidencia mediante el registro privado de Greenhouse.'
      icon='tabler-upload'
      iconColor='primary'
      action={
        <CustomChip
          round='true'
          size='small'
          variant='tonal'
          color={hasPendienteSupport ? 'warning' : 'success'}
          label={hasPendienteSupport ? 'Pendiente' : 'Completo'}
        />
      }
    >
      <Stack spacing={4}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <GreenhouseFileUploader
              contextType='contractor_invoice_draft'
              value={invoiceAsset}
              onChange={value => {
                setInvoiceAsset(value)
                void attach(value, 'invoice_pdf', () => setInvoiceAsset(null))
              }}
              title='Boleta o invoice'
              helperText='PDF, imagen o archivo tributario permitido por la policy del contexto.'
              emptyTitle='Adjunta el documento principal'
              emptyDescription='El archivo queda en el registro privado de assets.'
              browseCta='Seleccionar documento'
              metadataLabel={`${scenario.engagementPublicId} invoice`}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <GreenhouseFileUploader
              contextType='contractor_work_evidence_draft'
              value={evidenceAsset}
              onChange={value => {
                setEvidenceAsset(value)
                void attach(value, 'work_evidence', () => setEvidenceAsset(null))
              }}
              title='Evidencia del servicio'
              helperText='Entregables, aprobaciones o respaldo del periodo de servicio.'
              emptyTitle='Adjunta evidencia'
              emptyDescription='Debe corresponder al periodo declarado.'
              browseCta='Seleccionar evidencia'
              metadataLabel={`${scenario.engagementPublicId} evidence`}
            />
          </Grid>
        </Grid>

        {error ? (
          <Alert severity='error' icon={<i className='tabler-alert-triangle' />}>
            {error}
          </Alert>
        ) : null}

        <Divider />

        <Stack spacing={2}>
          {scenario.supportItems.map(item => (
            <Stack
              key={item.id}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent='space-between'
            >
              <Stack direction='row' spacing={2} alignItems='center'>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 1,
                    bgcolor: 'action.hover'
                  }}
                >
                  <i
                    className={item.kind === 'invoice' ? 'tabler-file-invoice' : 'tabler-file-description'}
                    aria-hidden='true'
                  />
                </Box>
                <Box>
                  <Typography variant='subtitle2'>{item.label}</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {item.filename ?? 'Sin archivo adjunto'}
                  </Typography>
                </Box>
              </Stack>
              <CustomChip round='true' size='small' variant='tonal' color={toneToColor[item.tone]} label={item.status} />
            </Stack>
          ))}
        </Stack>
      </Stack>
    </OperationalPanel>
  )
}

const SubmissionDraftPanel = ({ scenario }: { scenario: ContractorSelfServiceScenario }) => (
  <OperationalPanel
    title='Datos del envío'
    subheader='El envío describe el periodo y el monto que pasará a revisión operacional.'
    icon='tabler-clipboard-text'
    iconColor='info'
  >
    <Stack spacing={2}>
      <DetailRow label='Modelo' value={scenario.paymentModel} />
      <DetailRow label='Periodo de servicio' value={scenario.servicePeriod} />
      <DetailRow label='Moneda contractual' value={scenario.currency} />
      <DetailRow label='Monto referencia' value={scenario.kpis[0]?.value ?? 'Por definir'} />
    </Stack>
    <Box sx={{ mt: 4 }}>
      <Alert severity='info' icon={<i className='tabler-info-circle' />}>
        La aprobación del envío no ejecuta el pago. Finance crea y paga la obligación después de la preparación.
      </Alert>
    </Box>
  </OperationalPanel>
)

const blockerToSignal = (blocker: ContractorScenarioBlocker) => ({
  id: blocker.id,
  title: blocker.title,
  description: blocker.detail,
  statusLabel: blocker.responsable === 'Contractor' ? 'Tu acción' : 'Finance',
  statusTone: toneToColor[blocker.tone],
  statusIcon: toneToStatusIcon[blocker.tone]
})

const ContractorSelfServiceView = ({ initialProjection }: ContractorSelfServiceViewProps) => {
  const [projection, setProjection] = useState<ContractorSelfServiceProjection>(initialProjection)
  const [composerOpen, setComposerOpen] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)

  const refetch = useCallback(async () => {
    try {
      const response = await fetch('/api/my/contractor', { cache: 'no-store' })

      if (!response.ok) return

      const next = (await response.json().catch(() => null)) as ContractorSelfServiceProjection | null

      if (next) setProjection(next)
    } catch {
      // Refetch failures are non-blocking; the mutation already succeeded server-side.
    }
  }, [])

  const scenario = projection.scenario

  if (projection.state === 'no_engagement' || !scenario) {
    return (
      <Stack spacing={6}>
        <Box>
          <Typography variant='h4'>Mis servicios contractor</Typography>
          <Typography variant='body2' color='text.secondary'>
            Seguimiento de soporte, revisión y pago de tus servicios.
          </Typography>
        </Box>

        {projection.degraded.length > 0 ? (
          <Alert severity='warning' icon={<i className='tabler-alert-triangle' />}>
            {projection.degraded[0]?.message ?? 'No pudimos resolver tu información en este momento. Intenta de nuevo.'}
          </Alert>
        ) : null}

        <OperationalPanel
          title='Aún no tienes un engagement contractor activo'
          subheader='Cuando tengas un servicio activo verás aquí tus envíos, soporte y estado de pago.'
          icon='tabler-briefcase'
          iconColor='secondary'
        >
          <Alert severity='info' icon={<i className='tabler-info-circle' />} role='status'>
            Si crees que esto es un error, contacta a tu equipo de Operaciones para revisar tu contratación.
          </Alert>
        </OperationalPanel>
      </Stack>
    )
  }

  const blockerSignals = scenario.blockers.map(blockerToSignal)

  const handlePrimaryAction = () => {
    if (scenario.kind === 'disputed') {
      setDisputeOpen(true)

      return
    }

    setComposerOpen(true)
  }

  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant='h4'>Mis servicios contractor</Typography>
        <Typography variant='body2' color='text.secondary'>
          Seguimiento de soporte, revisión y pago de tus servicios.
        </Typography>
      </Box>

      {projection.degraded.length > 0 ? (
        <Alert severity='warning' icon={<i className='tabler-alert-triangle' />}>
          {projection.degraded[0]?.message ?? 'Algunos datos no se pudieron cargar. Intenta actualizar la página.'}
        </Alert>
      ) : null}

      <HeroPanel scenario={scenario} onPrimaryAction={handlePrimaryAction} />

      <Grid container spacing={6}>
        {scenario.kpis.map(kpi => (
          <Grid key={kpi.id} size={{ xs: 12, md: 4 }}>
            <MetricSummaryCard
              title={kpi.title}
              value={kpi.value}
              subtitle={kpi.subtitle}
              icon={kpi.icon}
              iconColor={toneToColor[kpi.tone]}
              statusLabel={scenario.readinessLabel}
              statusTone={scenario.readinessTone}
              statusIcon={toneToStatusIcon[scenario.readinessTone]}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={6} alignItems='stretch'>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={6}>
            {blockerSignals.length > 0 ? (
              <OperationalPanel title='Bloqueos visibles' icon='tabler-alert-circle' iconColor='warning'>
                <OperationalSignalList items={blockerSignals} columns={{ xs: 1, md: 2 }} />
              </OperationalPanel>
            ) : null}
            {scenario.closureVisible ? <ContractorClosureSidecar scenario={scenario} /> : null}
            <SupportUploaderPanel scenario={scenario} onAttached={refetch} />
            <SubmissionDraftPanel scenario={scenario} />
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={6}>
            <OperationalPanel
              title='Engagement activo'
              subheader={scenario.readinessDetail}
              icon='tabler-briefcase'
              iconColor={toneToColor[scenario.readinessTone]}
            >
              <Stack spacing={2}>
                <DetailRow label='Contractor' value={scenario.contractorName} />
                <DetailRow label='Tipo' value={scenario.relationshipSubtype} />
                <DetailRow label='País' value={scenario.country} />
                <DetailRow label='Entidad contratante' value={scenario.legalEntityLabel} />
                <DetailRow
                  label='Monto acordado'
                  value={
                    scenario.agreedRate.rateAmount !== null
                      ? formatCurrency(
                          scenario.agreedRate.rateAmount,
                          scenario.agreedRate.currency as CurrencyCode,
                          { currencySymbolSpacing: ' ' },
                          'es-CL'
                        )
                      : 'Por definir (HR)'
                  }
                />
                <DetailRow label='Modelo' value={scenario.paymentModel} />
                <DetailRow label='Cadencia' value={scenario.paymentCadence} />
                <DetailRow label='Responsable tributario' value={scenario.taxResponsable} />
              </Stack>
            </OperationalPanel>
            <PaymentProfileHandoff scenario={scenario} />
            <OperationalPanel title='Línea de tiempo' icon='tabler-timeline' iconColor='info'>
              <ContractorTimeline steps={scenario.timeline} />
            </OperationalPanel>
          </Stack>
        </Grid>
      </Grid>

      <OperationalPanel title='Historial de envíos' icon='tabler-history' iconColor='secondary'>
        {scenario.submissions.length > 0 ? (
          <Stack spacing={3}>
            {scenario.submissions.map(submission => (
              <Stack
                key={submission.id}
                direction={{ xs: 'column', md: 'row' }}
                spacing={3}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent='space-between'
                sx={theme => ({
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                  p: 4
                })}
              >
                <Box>
                  <Typography variant='subtitle1'>{submission.title}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {submission.id} · {submission.period}
                  </Typography>
                </Box>
                <Typography variant='subtitle1' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatSubmissionAmount(submission.amount, submission.currency)}
                </Typography>
                <CustomChip
                  round='true'
                  size='small'
                  variant='tonal'
                  color={toneToColor[submission.tone]}
                  label={submission.status}
                />
                <Typography variant='body2' color='text.secondary'>
                  {submission.nextAction}
                </Typography>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Alert severity='info' icon={<i className='tabler-file-plus' />} role='status'>
            Aún no hay envíos para este periodo.
          </Alert>
        )}
      </OperationalPanel>

      <RemittanceAdviceSection
        items={scenario.paidRemittances}
        audience='self'
        endpointBase='/api/my/contractor/remittance'
      />

      <ContractorSubmissionComposer
        open={composerOpen}
        scenario={scenario}
        onClose={() => setComposerOpen(false)}
        onSubmitted={refetch}
      />
      <ContractorDisputeResponse
        open={disputeOpen}
        scenario={scenario}
        onClose={() => setDisputeOpen(false)}
        onResponded={refetch}
      />
    </Stack>
  )
}

export default ContractorSelfServiceView
