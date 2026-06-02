'use client'

// TASK-975 — Contractor Engagement Detail Drawer (runtime).
// Promoted from the APPROVED mockup (mockup/ContractorEngagementDetailMockupView →
// DetailDrawer). JSX / tokens / sections preserved. Differences vs mock:
//   · data is fetched from the real engagement (GET /api/hr/contractors/[id]),
//     not a mock builder — loading / error / ready states.
//   · "Editar términos" + "Revisar clasificación" call up through props so the
//     workbench owns the terms drawer + classification dialog.

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import { getMicrocopy } from '@/lib/copy'
import { GH_CONTRACTOR_COMPENSATION as C } from '@/lib/copy/contractor-compensation'
import { formatDate } from '@/lib/format'
import { throwIfNotOk } from '@/lib/api/parse-error-response'
import useReducedMotion from '@/hooks/useReducedMotion'
import { ENGAGEMENT_TRANSITIONS } from '@/lib/contractor-engagements'
import type { ContractorEngagement } from '@/lib/contractor-engagements/types'
import {
  CLASSIFICATION_FACTOR_KEYS,
  bonusPolicyLabel,
  cadenceLabel,
  classificationAlertSeverity,
  classificationFactorMeta,
  classificationStatusIcon,
  classificationStatusLabel,
  engagementStatusLabel,
  engagementStatusTone,
  paymentModelLabel,
  rateTypeLabel,
  relationshipSubtypeLabel,
  taxOwnerLabel
} from '@/lib/contractor-engagements/engagement-display'

const aria = getMicrocopy('es-CL').aria

interface Props {
  engagementId: string | null
  open: boolean
  onClose: () => void
  onEditTerms: (engagement: ContractorEngagement) => void
  onReviewClassification: (engagement: ContractorEngagement) => void
  canReviewClassification: boolean
}

// --- DetailRow primitive (label / value pair) --------------------------------

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Stack direction='row' justifyContent='space-between' alignItems='baseline' spacing={3} sx={{ py: 1.5 }}>
    <Typography variant='body2' sx={{ color: 'text.secondary', flexShrink: 0 }}>
      {label}
    </Typography>
    <Box sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Typography variant='body2' sx={{ fontWeight: 500 }}>
          {value}
        </Typography>
      ) : (
        value
      )}
    </Box>
  </Stack>
)

const SectionLabel = ({ text }: { text: string }) => (
  <Typography
    variant='caption'
    sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', mb: 1 }}
  >
    {text}
  </Typography>
)

// --- Classification factors read-only list -----------------------------------

const FactorList = ({ engagement }: { engagement: ContractorEngagement }) => {
  const theme = useTheme()
  const factors = engagement.classificationRiskFactors

  return (
    <Stack spacing={1.5}>
      {CLASSIFICATION_FACTOR_KEYS.map(key => {
        const present = Boolean(factors[key])
        const meta = classificationFactorMeta(key)

        return (
          <Stack key={key} direction='row' spacing={2} alignItems='flex-start'>
            <i
              className={present ? 'tabler-alert-triangle' : 'tabler-circle-check'}
              style={{ fontSize: 18, marginTop: 2, color: present ? theme.palette.error.main : theme.palette.success.main, flexShrink: 0 }}
              aria-hidden
            />
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                {meta.label}
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                {present ? C.classification.factorPresent : C.classification.factorAbsent} · {meta.description}
              </Typography>
            </Box>
          </Stack>
        )
      })}
    </Stack>
  )
}

// --- Lifecycle state-machine representation -----------------------------------

const StateMachineView = ({ engagement }: { engagement: ContractorEngagement }) => {
  const next = ENGAGEMENT_TRANSITIONS[engagement.status]

  return (
    <Stack spacing={3}>
      <Box>
        <SectionLabel text={C.lifecycle.stateLabel} />
        <CustomChip
          round='true'
          size='small'
          variant='tonal'
          color={engagementStatusTone(engagement.status)}
          label={engagementStatusLabel(engagement.status)}
          icon={<i className='tabler-point-filled' />}
        />
      </Box>
      <Box>
        <SectionLabel text={C.detail.nextTransitionsLabel} />
        {next.length === 0 ? (
          <Typography variant='caption' sx={{ color: 'text.disabled' }}>
            {C.detail.noNextTransitions}
          </Typography>
        ) : (
          <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap>
            {next.map(to => (
              <CustomChip
                key={to}
                round='true'
                size='small'
                variant='outlined'
                color={engagementStatusTone(to)}
                label={engagementStatusLabel(to)}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  )
}

// --- Detail body (ready state) -----------------------------------------------

const DetailBody = ({
  engagement,
  prefersReduced
}: {
  engagement: ContractorEngagement
  prefersReduced: boolean
}) => {
  const e = engagement

  return (
    <Stack spacing={6}>
      {/* Económicos */}
      <Box>
        <SectionLabel text={C.detail.sectionEconomics} />
        <DetailRow label={C.detail.paymentModelField} value={paymentModelLabel(e.paymentModel)} />
        <DetailRow label={C.detail.rateTypeField} value={rateTypeLabel(e.rateType)} />
        <DetailRow
          label={C.detail.rateAmountField}
          value={
            e.rateAmount === null ? (
              <Typography variant='body2' sx={{ color: 'text.disabled' }}>
                {C.detail.notSet}
              </Typography>
            ) : (
              <Typography variant='body2' component='span' sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                <AnimatedCounter value={e.rateAmount} format='currency' currency={e.currency} duration={prefersReduced ? 0 : 0.5} />
              </Typography>
            )
          }
        />
        <DetailRow label={C.detail.cadenceField} value={cadenceLabel(e.paymentCadence)} />
        <DetailRow label={C.detail.currencyField} value={e.currency} />
        <DetailRow label={C.detail.paymentCurrencyField} value={e.paymentCurrency ?? C.detail.notSet} />
        <DetailRow label={C.detail.bonusPolicyField} value={bonusPolicyLabel(e.bonusPolicy)} />
      </Box>

      <Divider />

      {/* Tributario */}
      <Box>
        <SectionLabel text={C.detail.sectionTax} />
        <DetailRow label={C.detail.taxOwnerField} value={taxOwnerLabel(e.taxComplianceOwner)} />
        <DetailRow
          label={C.detail.withholdingRateField}
          value={e.taxWithholdingRateSnapshot === null ? C.detail.notSet : `${e.taxWithholdingRateSnapshot.toFixed(2)} %`}
        />
        <DetailRow label={C.detail.requiresInvoiceField} value={e.requiresInvoice ? C.detail.yes : C.detail.no} />
        <DetailRow label={C.detail.requiresWorkApprovalField} value={e.requiresWorkApproval ? C.detail.yes : C.detail.no} />
      </Box>

      <Divider />

      {/* Proveedor */}
      <Box>
        <SectionLabel text={C.detail.sectionProvider} />
        <DetailRow label={C.detail.providerContractField} value={e.providerContractId ?? C.detail.notSet} />
        <DetailRow label={C.detail.providerWorkerField} value={e.providerWorkerId ?? C.detail.notSet} />
        <DetailRow label={C.detail.fxPolicyField} value={e.fxPolicyCode ?? C.detail.notSet} />
      </Box>

      <Divider />

      {/* Fechas */}
      <Box>
        <SectionLabel text={C.detail.sectionDates} />
        <DetailRow label={C.detail.startDateField} value={formatDate(e.startDate, { dateStyle: 'medium' }, 'es-CL')} />
        <DetailRow
          label={C.detail.endDateField}
          value={e.endDate ? formatDate(e.endDate, { dateStyle: 'medium' }, 'es-CL') : C.detail.notSet}
        />
      </Box>

      <Divider />

      {/* Ciclo de vida — state machine */}
      <Box>
        <SectionLabel text={C.detail.stateMachineLabel} />
        <StateMachineView engagement={e} />
      </Box>

      <Divider />

      {/* Clasificación — read-only */}
      <Box>
        <SectionLabel text={C.detail.sectionClassification} />
        <Stack spacing={3}>
          <Alert
            severity={classificationAlertSeverity(e.classificationRiskStatus)}
            icon={<i className={classificationStatusIcon(e.classificationRiskStatus)} />}
          >
            {classificationStatusLabel(e.classificationRiskStatus)}
          </Alert>
          <FactorList engagement={e} />
        </Stack>
      </Box>
    </Stack>
  )
}

// --- Drawer shell ------------------------------------------------------------

const ContractorEngagementDetailDrawer = ({
  engagementId,
  open,
  onClose,
  onEditTerms,
  onReviewClassification,
  canReviewClassification
}: Props) => {
  const prefersReduced = useReducedMotion()

  const [engagement, setEngagement] = useState<ContractorEngagement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !engagementId) return

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/hr/contractors/${engagementId}`, { cache: 'no-store' })

        await throwIfNotOk(response, C.detail.loadError)

        const payload = (await response.json()) as { engagement: ContractorEngagement }

        if (!cancelled) {
          setEngagement(payload.engagement)
          setLoading(false)
        }
      } catch (loadError) {
        if (!cancelled) {
          setEngagement(null)
          setError(loadError instanceof Error ? loadError.message : C.detail.loadError)
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [open, engagementId])

  // Reset on close to avoid flashing stale data when reopening another row.
  useEffect(() => {
    if (open) return

    setEngagement(null)
    setError(null)
    setLoading(false)
  }, [open])

  const retry = () => {
    // Toggling state forces the load effect to re-run via a fresh fetch.
    setError(null)
    setEngagement(null)

    if (engagementId) {
      setLoading(true)
      fetch(`/api/hr/contractors/${engagementId}`, { cache: 'no-store' })
        .then(async response => {
          await throwIfNotOk(response, C.detail.loadError)

          const payload = (await response.json()) as { engagement: ContractorEngagement }

          setEngagement(payload.engagement)
          setLoading(false)
        })
        .catch(retryError => {
          setError(retryError instanceof Error ? retryError.message : C.detail.loadError)
          setLoading(false)
        })
    }
  }

  return (
    <Drawer anchor='right' open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100vw', sm: 640 } } } }}>
      <Box role='dialog' aria-labelledby='detail-drawer-title' sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: { xs: 5, sm: 6 }, pb: 4 }}>
          <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={3}>
            <Stack spacing={1}>
              <Typography id='detail-drawer-title' variant='h5' sx={{ fontWeight: 700 }}>
                {C.detail.drawerTitle}
              </Typography>
              {engagement ? (
                <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
                  <CustomChip round='true' size='small' variant='tonal' color='secondary' label={engagement.publicId} />
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {relationshipSubtypeLabel(engagement.relationshipSubtype)}
                  </Typography>
                </Stack>
              ) : null}
            </Stack>
            <Stack direction='row' spacing={1} alignItems='center'>
              {engagement ? (
                <Button
                  size='small'
                  variant='tonal'
                  startIcon={<i className='tabler-edit' />}
                  onClick={() => onEditTerms(engagement)}
                >
                  {C.detail.editTermsCta}
                </Button>
              ) : null}
              <IconButton onClick={onClose} aria-label={aria.closeDrawer}>
                <i className='tabler-x' />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ p: { xs: 5, sm: 6 }, flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <Stack alignItems='center' justifyContent='center' spacing={3} sx={{ py: 12 }} role='status'>
              <CircularProgress />
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                {C.detail.loading}
              </Typography>
            </Stack>
          ) : error ? (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <Alert severity='error' icon={<i className='tabler-alert-triangle' />} role='alert'>
                {error}
              </Alert>
              <Button variant='tonal' color='secondary' startIcon={<i className='tabler-refresh' />} onClick={retry} sx={{ alignSelf: 'flex-start' }}>
                {C.detail.retryCta}
              </Button>
            </Stack>
          ) : engagement ? (
            <DetailBody engagement={engagement} prefersReduced={prefersReduced} />
          ) : null}
        </Box>

        <Divider />

        <Box sx={{ p: { xs: 5, sm: 6 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
          {engagement ? (
            <CustomChip round='true' size='small' variant='tonal' color='secondary' label={taxOwnerLabel(engagement.taxComplianceOwner)} />
          ) : (
            <Box />
          )}
          <Stack direction='row' spacing={2} alignItems='center'>
            {engagement && canReviewClassification ? (
              <Button
                variant='tonal'
                color='secondary'
                startIcon={<i className='tabler-gavel' />}
                onClick={() => onReviewClassification(engagement)}
              >
                {C.classification.reviewCta}
              </Button>
            ) : null}
            <Button variant='tonal' color='secondary' onClick={onClose}>
              {C.lifecycle.confirmCancel}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  )
}

export default ContractorEngagementDetailDrawer
