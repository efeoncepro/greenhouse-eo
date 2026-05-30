'use client'

import { useMemo, useState } from 'react'

import { useSearchParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'
import {
  MetricSummaryCard,
  OperationalPanel,
  OperationalSignalList
} from '@/components/greenhouse/primitives'
import { formatCurrency } from '@/lib/format'

import ContractorTimeline from './ContractorTimeline'
import ContractorClosureSidecarMockup from './ContractorClosureSidecarMockup'
import ContractorDisputeResponseMockup from './ContractorDisputeResponseMockup'
import ContractorSubmissionComposerMockup from './ContractorSubmissionComposerMockup'
import { contractorScenarios } from './data'
import PaymentProfileHandoffMockup from './PaymentProfileHandoffMockup'
import type { ContractorScenario, ContractorScenarioId, ContractorTone } from './types'

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

const formatSubmissionAmount = (amount: number, currency: ContractorScenario['currency']) =>
  formatCurrency(amount, currency, { currencySymbolSpacing: ' ' }, 'es-CL')

const ScenarioSelector = ({
  value,
  onChange
}: {
  value: ContractorScenarioId
  onChange: (value: ContractorScenarioId) => void
}) => (
  <CustomTextField
    select
    size='small'
    label='Escenario'
    value={value}
    onChange={event => onChange(event.target.value as ContractorScenarioId)}
    sx={{ minWidth: { xs: '100%', sm: 240 } }}
  >
    {contractorScenarios.map(scenario => (
      <MenuItem key={scenario.id} value={scenario.id}>
        {scenario.label}
      </MenuItem>
    ))}
  </CustomTextField>
)

const HeroPanel = ({
  scenario,
  onPrimaryAction
}: {
  scenario: ContractorScenario
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
              <Button variant='tonal' color='secondary' startIcon={<i className='tabler-credit-card' />}>
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
        </Stack>
      </CardContent>
    </Card>
  )
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

const SupportUploaderPanel = ({ scenario }: { scenario: ContractorScenario }) => {
  const [invoiceAsset, setInvoiceAsset] = useState<UploadedFileValue | null>(null)
  const [evidenceAsset, setEvidenceAsset] = useState<UploadedFileValue | null>(null)
  const hasPendienteSupport = scenario.supportItems.some(item => item.status === 'Pendiente' || item.status === 'Observada')

  return (
    <OperationalPanel
      title='Enviar soporte'
      subheader='Boleta, invoice y evidencia via assets privados Greenhouse.'
      icon='tabler-upload'
      iconColor='primary'
      action={<CustomChip round='true' size='small' variant='tonal' color={hasPendienteSupport ? 'warning' : 'success'} label={hasPendienteSupport ? 'Pendiente' : 'Completo'} />}
    >
      <Stack spacing={4}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
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
              metadataLabel={`${scenario.engagementPublicId} invoice`}
              disabled={!hasPendienteSupport}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <GreenhouseFileUploader
              contextType='contractor_work_evidence_draft'
              value={evidenceAsset}
              onChange={setEvidenceAsset}
              title='Evidencia del servicio'
              helperText='Entregables, aprobaciónes o respaldo del periodo de servicio.'
              emptyTitle='Adjunta evidencia'
              emptyDescription='Debe corresponder al periodo declarado.'
              browseCta='Seleccionar evidencia'
              ownerMemberId='member-valentina'
              metadataLabel={`${scenario.engagementPublicId} evidence`}
              disabled={!hasPendienteSupport}
            />
          </Grid>
        </Grid>

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
                  <i className={item.kind === 'invoice' ? 'tabler-file-invoice' : 'tabler-file-description'} />
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

const SubmissionDraftPanel = ({ scenario }: { scenario: ContractorScenario }) => (
  <OperationalPanel
    title='Datos del envío'
    subheader='El envío describe el periodo y el monto que pasara a revisión operacional.'
    icon='tabler-clipboard-text'
    iconColor='info'
  >
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, md: 6 }}>
        <CustomTextField fullWidth label='Tipo' value={scenario.paymentModel === 'Milestone' ? 'Milestone' : 'Deliverable'} disabled />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <CustomTextField fullWidth label='Periodo de servicio' value={scenario.servicePeriod} disabled />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <CustomTextField fullWidth label='Moneda contractual' value={scenario.currency} disabled />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <CustomTextField fullWidth label='Monto bruto' value={scenario.kpis[0]?.value ?? 'Por definir'} disabled />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Alert severity='info' icon={<i className='tabler-info-circle' />}>
          La aprobación del envío no ejecuta el pago. Finance crea y paga la obligación después de la preparación.
        </Alert>
      </Grid>
    </Grid>
  </OperationalPanel>
)

const ContractorSelfServiceMockupView = () => {
  const searchParams = useSearchParams()
  const requestedScenario = searchParams.get('scenario') as ContractorScenarioId | null

  const initialScenario = contractorScenarios.some(item => item.id === requestedScenario)
    ? requestedScenario ?? 'honorarios_ready'
    : 'honorarios_ready'

  const [scenarioId, setScenarioId] = useState<ContractorScenarioId>(initialScenario)
  const [composerOpen, setComposerOpen] = useState(searchParams.get('drawer') === 'composer')
  const [disputeOpen, setDisputeOpen] = useState(searchParams.get('drawer') === 'dispute')

  const scenario = useMemo(
    () => contractorScenarios.find(item => item.id === scenarioId) ?? contractorScenarios[0],
    [scenarioId]
  )

  const blockerSignals = scenario.blockers.map(blocker => ({
    id: blocker.id,
    title: blocker.title,
    description: blocker.detail,
    statusLabel: blocker.responsable,
    statusTone: blocker.tone,
    statusIcon: toneToStatusIcon[blocker.tone]
  }))

  const handlePrimaryAction = () => {
    if (scenario.id === 'disputed') {
      setDisputeOpen(true)

      return
    }

    setComposerOpen(true)
  }

  return (
    <Stack spacing={6}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent='space-between' alignItems={{ xs: 'stretch', md: 'center' }}>
        <Box>
          <Typography variant='h4'>Mis servicios contractor</Typography>
          <Typography variant='body2' color='text.secondary'>
            Seguimiento de soporte, revisión y pago de tus servicios.
          </Typography>
        </Box>
        <ScenarioSelector value={scenarioId} onChange={setScenarioId} />
      </Stack>

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
            {scenario.id === 'closure_pending' ? <ContractorClosureSidecarMockup scenario={scenario} /> : null}
            <SupportUploaderPanel scenario={scenario} />
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
                <DetailRow label='Modelo' value={scenario.paymentModel} />
                <DetailRow label='Cadencia' value={scenario.paymentCadence} />
                <DetailRow label='Compliance' value={scenario.taxResponsable} />
              </Stack>
            </OperationalPanel>
            <PaymentProfileHandoffMockup scenario={scenario} />
            <OperationalPanel title='Timeline' icon='tabler-timeline' iconColor='info'>
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
                sx={theme => ({ border: `1px solid ${theme.palette.divider}`, borderRadius: `${theme.shape.customBorderRadius.lg}px`, p: 4 })}
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
                <CustomChip round='true' size='small' variant='tonal' color={toneToColor[submission.tone]} label={submission.status} />
                <Typography variant='body2' color='text.secondary'>
                  {submission.nextAction}
                </Typography>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Alert severity='info' icon={<i className='tabler-file-plus' />}>
            Aun no hay envíos para este periodo.
          </Alert>
        )}
      </OperationalPanel>

      <ContractorSubmissionComposerMockup
        open={composerOpen}
        scenario={scenario}
        onClose={() => setComposerOpen(false)}
      />
      <ContractorDisputeResponseMockup
        open={disputeOpen}
        scenario={scenario}
        onClose={() => setDisputeOpen(false)}
      />
    </Stack>
  )
}

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

export default ContractorSelfServiceMockupView
