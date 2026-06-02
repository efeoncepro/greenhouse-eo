'use client'

// TASK-975 mockup — Contractor Engagement Detail + Lifecycle + Classification
// Review. The design is already decided: detail + lifecycle + classification live
// as a Drawer + Dialogs INSIDE the HR workbench (/hr/contractors), NOT a dedicated
// page. This view demonstrates those surfaces with typed mock data across 4
// scenarios. Style mirrors the APPROVED ContractorEngagementCompensationDrawer /
// ContractorCompensationMockupView (right-anchored drawers, saveState machine,
// CustomTextField, inline Alert, AnimatedCounter, prefers-reduced-motion aware).

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import { OperationalPanel } from '@/components/greenhouse/primitives'
import { getMicrocopy } from '@/lib/copy'
import { GH_CONTRACTOR_COMPENSATION as C } from '@/lib/copy/contractor-compensation'
import { formatDate } from '@/lib/format'
import { AnimatePresence, motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

import {
  CLASSIFICATION_FACTOR_KEYS,
  ENGAGEMENT_TRANSITIONS,
  MOCK_ENGAGEMENTS,
  SCENARIO_LABEL,
  SCENARIO_ORDER,
  bonusPolicyLabel,
  cadenceLabel,
  classificationIcon,
  classificationTone,
  computeClassificationRiskPreview,
  countryLabel,
  isRiskBlocking,
  isTerminalStatus,
  isTransitionToActive,
  paymentModelLabel,
  payrollViaLabel,
  rateTypeLabel,
  relationshipSubtypeLabel,
  statusTone,
  taxOwnerLabel,
  transitionCopyKey,
  transitionIcon,
  transitionRequiresReason,
  type ClassificationRiskFactors,
  type ClassificationRiskStatus,
  type EngagementStatus,
  type MockEngagement,
  type ScenarioKey,
  type TransitionCopyKey
} from './contractor-engagement-detail-data'

const aria = getMicrocopy('es-CL').aria

const PAYMENT_MODEL_OPTIONS = ['fixed_recurring', 'weekly_timesheet', 'milestone', 'project_fee', 'payg_invoice', 'off_cycle'] as const
const BONUS_POLICY_OPTIONS = ['none', 'fixed', 'ico_backed'] as const

type SaveState = 'idle' | 'saving' | 'saved'

const transitionLabel = (key: TransitionCopyKey): string => C.lifecycle[key]

const statusLabel = (s: EngagementStatus): string => C.lifecycle.state[s]

const riskStatusLabel = (s: ClassificationRiskStatus): string => C.classification.status[s]

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

const SectionHeading = ({ overline, title }: { overline: string; title: string }) => (
  <Stack spacing={0.5} sx={{ mb: 4 }}>
    <Typography variant='caption' sx={{ color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
      {overline}
    </Typography>
    <Typography variant='h6' sx={{ fontWeight: 600 }}>
      {title}
    </Typography>
  </Stack>
)

// =============================================================================
// Classification factors read-only list (used in the detail drawer)
// =============================================================================

const FactorList = ({ factors }: { factors: ClassificationRiskFactors }) => {
  const theme = useTheme()

  return (
    <Stack spacing={1.5}>
      {CLASSIFICATION_FACTOR_KEYS.map(key => {
        const present = Boolean(factors[key])
        const f = C.classification.factors[key]

        return (
          <Stack key={key} direction='row' spacing={2} alignItems='flex-start'>
            <i
              className={present ? 'tabler-alert-triangle' : 'tabler-circle-check'}
              style={{ fontSize: 18, marginTop: 2, color: present ? theme.palette.error.main : theme.palette.success.main, flexShrink: 0 }}
              aria-hidden
            />
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                {f.label}
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                {present ? C.classification.factorPresent : C.classification.factorAbsent} · {f.description}
              </Typography>
            </Box>
          </Stack>
        )
      })}
    </Stack>
  )
}

// =============================================================================
// Lifecycle state-machine representation (current highlighted + next chips)
// =============================================================================

const StateMachineView = ({ status }: { status: EngagementStatus }) => {
  const next = ENGAGEMENT_TRANSITIONS[status]

  return (
    <Stack spacing={3}>
      <Box>
        <SectionLabel text={C.lifecycle.stateLabel} />
        <CustomChip
          round='true'
          size='small'
          variant='tonal'
          color={statusTone(status)}
          label={statusLabel(status)}
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
              <CustomChip key={to} round='true' size='small' variant='outlined' color={statusTone(to)} label={statusLabel(to)} />
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  )
}

// =============================================================================
// Detail Drawer (right-anchored, ~640px)
// =============================================================================

interface DetailDrawerProps {
  open: boolean
  engagement: MockEngagement
  onClose: () => void
  onEditTerms: () => void
}

const DetailDrawer = ({ open, engagement, onClose, onEditTerms }: DetailDrawerProps) => {
  const prefersReducedDetail = useReducedMotion()
  const e = engagement

  const complianceChip = (
    <CustomChip round='true' size='small' variant='tonal' color='secondary' label={taxOwnerLabel(e.taxComplianceOwner)} />
  )

  return (
    <Drawer anchor='right' open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100vw', sm: 640 } } } }}>
      <Box role='dialog' aria-labelledby='detail-drawer-title' sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: { xs: 5, sm: 6 }, pb: 4 }}>
          <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={3}>
            <Stack spacing={1}>
              <Typography id='detail-drawer-title' variant='h5' sx={{ fontWeight: 700 }}>
                {C.detail.drawerTitle}
              </Typography>
              <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
                <CustomChip round='true' size='small' variant='tonal' color='secondary' label={e.publicId} />
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {e.contractorName} · {relationshipSubtypeLabel(e.relationshipSubtype)}
                </Typography>
              </Stack>
            </Stack>
            <Stack direction='row' spacing={1} alignItems='center'>
              <Button size='small' variant='tonal' startIcon={<i className='tabler-edit' />} onClick={onEditTerms}>
                {C.detail.editTermsCta}
              </Button>
              <IconButton onClick={onClose} aria-label={aria.closeDrawer}>
                <i className='tabler-x' />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ p: { xs: 5, sm: 6 }, flex: 1, overflowY: 'auto' }}>
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
                      <AnimatedCounter value={e.rateAmount} format='currency' currency={e.currency} duration={prefersReducedDetail ? 0 : 0.5} />
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
              <StateMachineView status={e.status} />
            </Box>

            <Divider />

            {/* Clasificación — read-only */}
            <Box>
              <SectionLabel text={C.detail.sectionClassification} />
              <Stack spacing={3}>
                <Alert
                  severity={classificationTone(e.classificationRiskStatus) === 'success' ? 'success' : classificationTone(e.classificationRiskStatus) === 'warning' ? 'warning' : 'error'}
                  icon={<i className={classificationIcon(e.classificationRiskStatus)} />}
                >
                  {riskStatusLabel(e.classificationRiskStatus)}
                </Alert>
                <FactorList factors={e.classificationRiskFactors} />
              </Stack>
            </Box>
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ p: { xs: 5, sm: 6 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
          {complianceChip}
          <Button variant='tonal' color='secondary' onClick={onClose}>
            {C.lifecycle.confirmCancel}
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}

// =============================================================================
// Classification Review Dialog
// =============================================================================

interface ReviewDialogProps {
  open: boolean
  engagement: MockEngagement
  onClose: () => void
}

const ReviewDialog = ({ open, engagement, onClose }: ReviewDialogProps) => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()

  const [factors, setFactors] = useState<ClassificationRiskFactors>({})
  const [reviewed, setReviewed] = useState(false)
  const [block, setBlock] = useState(false)
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setFactors({ ...engagement.classificationRiskFactors })
    setReviewed(engagement.classificationReviewed)
    setBlock(false)
    setReason('')
    setTouched(false)
  }, [open, engagement])

  const result = computeClassificationRiskPreview(factors, reviewed, block)
  const reasonError = touched && reason.trim().length < 10

  const toggleFactor = (key: keyof ClassificationRiskFactors) =>
    setFactors(prev => ({ ...prev, [key]: !prev[key] }))

  const handleSave = () => {
    setTouched(true)
    if (reason.trim().length < 10) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>{C.classification.dialogTitle}</DialogTitle>
      <DialogContent>
        <Stack spacing={4} sx={{ pt: 1 }}>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {C.classification.dialogIntro}
          </Typography>

          {/* SoD note */}
          <Stack
            direction='row'
            spacing={2}
            alignItems='flex-start'
            sx={{
              p: 3,
              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
              bgcolor: alpha(theme.palette.info.main, 0.06),
              border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`
            }}
          >
            <i className='tabler-users-group' style={{ fontSize: 18, color: theme.palette.info.main, marginTop: 2 }} aria-hidden />
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {C.classification.sodNote}
            </Typography>
          </Stack>

          {/* Factors */}
          <Box component='fieldset' sx={{ border: 'none', p: 0, m: 0 }}>
            <Typography component='legend' variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, mb: 1 }}>
              {C.classification.factorsLegend}
            </Typography>
            <Stack>
              {CLASSIFICATION_FACTOR_KEYS.map(key => {
                const f = C.classification.factors[key]

                return (
                  <FormControlLabel
                    key={key}
                    control={<Checkbox checked={Boolean(factors[key])} onChange={() => toggleFactor(key)} />}
                    sx={{ alignItems: 'flex-start', mr: 0, py: 0.5, '& .MuiFormControlLabel-label': { mt: 0.75 } }}
                    label={
                      <Box>
                        <Typography variant='body2' sx={{ fontWeight: 500 }}>
                          {f.label}
                        </Typography>
                        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                          {f.description}
                        </Typography>
                      </Box>
                    }
                  />
                )
              })}
            </Stack>
          </Box>

          <Divider />

          {/* Review + block switches */}
          <Stack spacing={2}>
            <FormControlLabel
              control={<Switch checked={reviewed} onChange={() => setReviewed(v => !v)} />}
              label={
                <Box>
                  <Typography variant='body2' sx={{ fontWeight: 500 }}>
                    {C.classification.reviewedSwitch}
                  </Typography>
                  <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                    {C.classification.reviewedHelper}
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', mr: 0, '& .MuiFormControlLabel-label': { mt: 0.5 } }}
            />
            <FormControlLabel
              control={<Switch color='error' checked={block} onChange={() => setBlock(v => !v)} />}
              label={
                <Box>
                  <Typography variant='body2' sx={{ fontWeight: 500 }}>
                    {C.classification.blockSwitch}
                  </Typography>
                  <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                    {C.classification.blockHelper}
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', mr: 0, '& .MuiFormControlLabel-label': { mt: 0.5 } }}
            />
          </Stack>

          {/* Reason */}
          <CustomTextField
            label={C.classification.reasonLabel}
            value={reason}
            onChange={e => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            error={reasonError}
            helperText={reasonError ? C.classification.reasonError : C.classification.reasonHelper}
            multiline
            minRows={3}
            fullWidth
            slotProps={{ input: { 'aria-invalid': reasonError } }}
          />

          {/* Live result preview */}
          <Box
            sx={{
              p: 4,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              bgcolor: alpha(theme.palette[classificationTone(result)].main, 0.06),
              border: `1px solid ${alpha(theme.palette[classificationTone(result)].main, 0.24)}`
            }}
          >
            <Stack direction='row' spacing={2} alignItems='center'>
              <motion.span
                key={result}
                style={{ display: 'inline-flex', flexShrink: 0 }}
                initial={prefersReduced ? false : { scale: 0.8, opacity: 0 }}
                animate={prefersReduced ? { opacity: 1 } : { scale: [0.8, 1.1, 1], opacity: 1 }}
                transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
              >
                <i className={classificationIcon(result)} style={{ fontSize: 22, color: theme.palette[classificationTone(result)].main }} aria-hidden />
              </motion.span>
              <Box>
                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                  {C.classification.resultLabel}
                </Typography>
                <Typography variant='subtitle1' sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {riskStatusLabel(result)}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 5 }}>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          {C.classification.cancelCta}
        </Button>
        <Button variant='contained' onClick={handleSave} startIcon={<i className='tabler-device-floppy' />}>
          {C.classification.saveCta}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// =============================================================================
// Lifecycle Confirm Dialog
// =============================================================================

interface LifecycleDialogProps {
  open: boolean
  from: EngagementStatus
  to: EngagementStatus | null
  onClose: () => void
}

const LifecycleDialog = ({ open, from, to, onClose }: LifecycleDialogProps) => {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setReason('')
    setTouched(false)
  }, [open, to])

  if (!to) return null

  const needsReason = transitionRequiresReason(to)
  const reasonError = needsReason && touched && reason.trim().length < 10
  const ctaKey = transitionCopyKey(from, to)

  const intro = C.lifecycle.confirmIntro.replace('{from}', statusLabel(from)).replace('{to}', statusLabel(to))

  const handleConfirm = () => {
    setTouched(true)
    if (needsReason && reason.trim().length < 10) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>{C.lifecycle.confirmTitle}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {intro}
          </Typography>
          {needsReason ? (
            <CustomTextField
              label={C.lifecycle.confirmReasonLabel}
              value={reason}
              onChange={e => setReason(e.target.value)}
              onBlur={() => setTouched(true)}
              error={reasonError}
              helperText={reasonError ? C.lifecycle.confirmReasonError : C.lifecycle.confirmReasonHelper}
              multiline
              minRows={3}
              fullWidth
              slotProps={{ input: { 'aria-invalid': reasonError } }}
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 5 }}>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          {C.lifecycle.confirmCancel}
        </Button>
        <Button
          variant='contained'
          color={to === 'cancelled' ? 'error' : 'primary'}
          onClick={handleConfirm}
          startIcon={<i className={transitionIcon(ctaKey)} />}
        >
          {C.lifecycle.confirmCta}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// =============================================================================
// Terms Edit Drawer (right-anchored, mirror compensation drawer)
// =============================================================================

interface TermsDrawerProps {
  open: boolean
  engagement: MockEngagement
  onClose: () => void
}

const TermsDrawer = ({ open, engagement, onClose }: TermsDrawerProps) => {
  const prefersReduced = useReducedMotion()

  const [paymentModel, setPaymentModel] = useState(engagement.paymentModel)
  const [fxPolicyCode, setFxPolicyCode] = useState(engagement.fxPolicyCode ?? '')
  const [providerContractId, setProviderContractId] = useState(engagement.providerContractId ?? '')
  const [providerWorkerId, setProviderWorkerId] = useState(engagement.providerWorkerId ?? '')
  const [requiresInvoice, setRequiresInvoice] = useState(engagement.requiresInvoice)
  const [requiresWorkApproval, setRequiresWorkApproval] = useState(engagement.requiresWorkApproval)
  const [bonusPolicy, setBonusPolicy] = useState(engagement.bonusPolicy)
  const [endDate, setEndDate] = useState(engagement.endDate ?? '')
  const [saveState, setSaveState] = useState<SaveState>('idle')

  useEffect(() => {
    if (!open) return
    setPaymentModel(engagement.paymentModel)
    setFxPolicyCode(engagement.fxPolicyCode ?? '')
    setProviderContractId(engagement.providerContractId ?? '')
    setProviderWorkerId(engagement.providerWorkerId ?? '')
    setRequiresInvoice(engagement.requiresInvoice)
    setRequiresWorkApproval(engagement.requiresWorkApproval)
    setBonusPolicy(engagement.bonusPolicy)
    setEndDate(engagement.endDate ?? '')
    setSaveState('idle')
  }, [open, engagement])

  const handleSave = () => {
    setSaveState('saving')
    window.setTimeout(() => {
      setSaveState('saved')
      window.setTimeout(() => {
        setSaveState('idle')
        onClose()
      }, 700)
    }, 600)
  }

  return (
    <Drawer anchor='right' open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100vw', sm: 520 } } } }}>
      <Box role='dialog' aria-labelledby='terms-drawer-title' sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: { xs: 5, sm: 6 }, pb: 4 }}>
          <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
            <Stack spacing={1}>
              <Typography id='terms-drawer-title' variant='h5' sx={{ fontWeight: 700 }}>
                {C.terms.drawerTitle}
              </Typography>
              <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
                <CustomChip round='true' size='small' variant='tonal' color='secondary' label={engagement.publicId} />
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {engagement.contractorName}
                </Typography>
              </Stack>
            </Stack>
            <IconButton onClick={onClose} aria-label={aria.closeDrawer}>
              <i className='tabler-x' />
            </IconButton>
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ p: { xs: 5, sm: 6 }, flex: 1, overflowY: 'auto' }}>
          <Stack spacing={5}>
            <CustomTextField
              select
              fullWidth
              label={C.terms.paymentModelLabel}
              value={paymentModel}
              onChange={e => setPaymentModel(e.target.value as MockEngagement['paymentModel'])}
            >
              {PAYMENT_MODEL_OPTIONS.map(o => (
                <MenuItem key={o} value={o}>
                  {paymentModelLabel(o)}
                </MenuItem>
              ))}
            </CustomTextField>

            <CustomTextField
              select
              fullWidth
              label={C.terms.bonusPolicyLabel}
              value={bonusPolicy}
              onChange={e => setBonusPolicy(e.target.value as MockEngagement['bonusPolicy'])}
            >
              {BONUS_POLICY_OPTIONS.map(o => (
                <MenuItem key={o} value={o}>
                  {bonusPolicyLabel(o)}
                </MenuItem>
              ))}
            </CustomTextField>

            <CustomTextField
              fullWidth
              label={C.terms.fxPolicyLabel}
              placeholder={C.terms.fxPolicyPlaceholder}
              value={fxPolicyCode}
              onChange={e => setFxPolicyCode(e.target.value)}
            />

            <CustomTextField
              fullWidth
              label={C.terms.providerContractLabel}
              placeholder={C.terms.providerContractPlaceholder}
              value={providerContractId}
              onChange={e => setProviderContractId(e.target.value)}
            />

            <CustomTextField
              fullWidth
              label={C.terms.providerWorkerLabel}
              placeholder={C.terms.providerWorkerPlaceholder}
              value={providerWorkerId}
              onChange={e => setProviderWorkerId(e.target.value)}
            />

            <CustomTextField
              fullWidth
              type='date'
              label={C.terms.endDateLabel}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <Stack spacing={1}>
              <FormControlLabel
                control={<Switch checked={requiresInvoice} onChange={() => setRequiresInvoice(v => !v)} />}
                label={C.terms.requiresInvoiceLabel}
              />
              <FormControlLabel
                control={<Switch checked={requiresWorkApproval} onChange={() => setRequiresWorkApproval(v => !v)} />}
                label={C.terms.requiresWorkApprovalLabel}
              />
            </Stack>
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ p: { xs: 5, sm: 6 }, display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={saveState !== 'idle'}>
            {C.terms.cancel}
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
            disabled={saveState !== 'idle'}
            startIcon={
              <AnimatePresence mode='wait' initial={false}>
                {saveState === 'saving' ? (
                  <motion.span
                    key='spin'
                    style={{ display: 'inline-flex' }}
                    initial={prefersReduced ? false : { opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={prefersReduced ? undefined : { opacity: 0, scale: 0.6 }}
                  >
                    <CircularProgress size={16} color='inherit' />
                  </motion.span>
                ) : saveState === 'saved' ? (
                  <motion.span key='check' style={{ display: 'inline-flex' }} initial={prefersReduced ? false : { opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}>
                    <i className='tabler-check' />
                  </motion.span>
                ) : (
                  <motion.span key='idle' style={{ display: 'inline-flex' }}>
                    <i className='tabler-device-floppy' />
                  </motion.span>
                )}
              </AnimatePresence>
            }
          >
            {saveState === 'saving' ? C.terms.saving : saveState === 'saved' ? C.terms.saved : C.terms.save}
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}

// =============================================================================
// Inspector panel (the entry point inside the workbench)
// =============================================================================

interface InspectorProps {
  engagement: MockEngagement
  onOpenDetail: () => void
  onOpenReview: () => void
  onTransition: (to: EngagementStatus) => void
}

const InspectorPanel = ({ engagement, onOpenDetail, onOpenReview, onTransition }: InspectorProps) => {
  const e = engagement
  const blocking = isRiskBlocking(e.classificationRiskStatus)
  const terminal = isTerminalStatus(e.status)

  // Offer only valid next states; hide any transition to `active` when risk blocks.
  const transitions = ENGAGEMENT_TRANSITIONS[e.status].filter(to => !(isTransitionToActive(to) && blocking))

  return (
    <OperationalPanel
      title={C.lifecycle.panelLabel}
      subheader={C.detail.summaryLabel}
      icon='tabler-route'
      iconColor={statusTone(e.status)}
      action={
        <CustomChip
          round='true'
          size='small'
          variant='tonal'
          color={statusTone(e.status)}
          label={statusLabel(e.status)}
          icon={<i className='tabler-point-filled' />}
        />
      }
    >
      <Stack spacing={5}>
        {/* Read-only summary */}
        <Box>
          <DetailRow label={C.detail.contractorField} value={e.contractorName} />
          <DetailRow label={C.detail.engagementIdField} value={e.publicId} />
          <DetailRow label={C.detail.relationField} value={relationshipSubtypeLabel(e.relationshipSubtype)} />
          <DetailRow label={C.detail.countryField} value={`${countryLabel(e.countryCode)} · ${payrollViaLabel(e.payrollVia)}`} />
          <DetailRow label={C.detail.entityField} value={e.legalEntityLabel} />
          <DetailRow
            label={C.detail.complianceField}
            value={<CustomChip round='true' size='small' variant='tonal' color='secondary' label={taxOwnerLabel(e.taxComplianceOwner)} />}
          />
        </Box>

        {/* Classification banner */}
        <Alert
          severity={classificationTone(e.classificationRiskStatus) === 'success' ? 'success' : classificationTone(e.classificationRiskStatus) === 'warning' ? 'warning' : 'error'}
          icon={<i className={classificationIcon(e.classificationRiskStatus)} />}
          action={
            <Button size='small' color='inherit' onClick={onOpenReview}>
              {C.classification.reviewCta}
            </Button>
          }
        >
          {riskStatusLabel(e.classificationRiskStatus)}
        </Alert>

        {blocking ? (
          <Stack direction='row' spacing={2} alignItems='center' sx={{ color: 'text.secondary' }}>
            <i className='tabler-shield-lock' style={{ fontSize: 18 }} aria-hidden />
            <Typography variant='caption'>{C.lifecycle.activateBlockedNote}</Typography>
          </Stack>
        ) : null}

        <Divider />

        {/* Lifecycle controls — only valid transitions */}
        <Box>
          <SectionLabel text={C.lifecycle.panelLabel} />
          {terminal ? (
            <Typography variant='caption' sx={{ color: 'text.disabled' }}>
              {C.lifecycle.terminalNote}
            </Typography>
          ) : (
            <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
              {transitions.map(to => {
                const key = transitionCopyKey(e.status, to)

                return (
                  <Button
                    key={to}
                    size='small'
                    variant={to === 'active' ? 'contained' : 'tonal'}
                    color={to === 'cancelled' ? 'error' : 'secondary'}
                    startIcon={<i className={transitionIcon(key)} />}
                    onClick={() => onTransition(to)}
                  >
                    {transitionLabel(key)}
                  </Button>
                )
              })}
            </Stack>
          )}
        </Box>

        <Divider />

        {/* CTAs */}
        <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
          <Button variant='contained' startIcon={<i className='tabler-file-text' />} onClick={onOpenDetail}>
            {C.detail.openCta}
          </Button>
          <Button variant='tonal' color='secondary' startIcon={<i className='tabler-gavel' />} onClick={onOpenReview}>
            {C.classification.reviewCta}
          </Button>
        </Stack>
      </Stack>
    </OperationalPanel>
  )
}

// =============================================================================
// Root view
// =============================================================================

const ContractorEngagementDetailMockupView = () => {
  const prefersReduced = useReducedMotion()

  const [scenario, setScenario] = useState<ScenarioKey>('needs_review')
  const engagement = useMemo<MockEngagement>(() => MOCK_ENGAGEMENTS[scenario], [scenario])

  const [detailOpen, setDetailOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [lifecycleTo, setLifecycleTo] = useState<EngagementStatus | null>(null)

  const entrance = (i: number) =>
    prefersReduced
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay: 0.07 * i, ease: [0.2, 0, 0, 1] as const }
        }

  return (
    <Box sx={{ p: { xs: 4, md: 6 }, maxWidth: 1120, mx: 'auto' }}>
      <Stack spacing={1} sx={{ mb: 5 }}>
        <Typography variant='h4' sx={{ fontWeight: 700 }}>
          Detalle del engagement de contractor
        </Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          TASK-975 — el detalle, el ciclo de vida y la revisión de clasificación viven como Drawer + Diálogos dentro del workbench
          de HR (<strong>/hr/contractors</strong>). No es una página aparte. Activar queda oculto cuando el riesgo bloquea.
        </Typography>
      </Stack>

      {/* Scenario toggle */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, mb: 6 }}>
        <CardContent>
          <Stack spacing={1}>
            <Typography id='scenario-label' variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Escenario
            </Typography>
            <ToggleButtonGroup
              exclusive
              size='small'
              value={scenario}
              aria-labelledby='scenario-label'
              onChange={(_, v) => {
                if (!v) return
                setScenario(v as ScenarioKey)
              }}
              sx={{ flexWrap: 'wrap' }}
            >
              {SCENARIO_ORDER.map(key => (
                <ToggleButton key={key} value={key}>
                  {SCENARIO_LABEL[key]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 7 }}>
          <motion.div {...entrance(0)}>
            <SectionHeading overline='HR · workbench' title='Inspector del engagement' />
            <InspectorPanel
              engagement={engagement}
              onOpenDetail={() => setDetailOpen(true)}
              onOpenReview={() => setReviewOpen(true)}
              onTransition={to => setLifecycleTo(to)}
            />
          </motion.div>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <motion.div {...entrance(1)}>
            <SectionHeading overline='Cómo leer esto' title='Reglas de la superficie' />
            <OperationalPanel title={C.detail.stateMachineLabel} icon='tabler-info-circle' iconColor='info'>
              <Stack spacing={3}>
                <StateMachineView status={engagement.status} />
                <Divider />
                <Stack spacing={2}>
                  <Stack direction='row' spacing={2} alignItems='flex-start'>
                    <i className='tabler-eye' style={{ fontSize: 18, marginTop: 2 }} aria-hidden />
                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                      El detalle completo y la edición de términos abren un drawer a la derecha.
                    </Typography>
                  </Stack>
                  <Stack direction='row' spacing={2} alignItems='flex-start'>
                    <i className='tabler-shield-lock' style={{ fontSize: 18, marginTop: 2 }} aria-hidden />
                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                      {C.lifecycle.activateBlockedNote}
                    </Typography>
                  </Stack>
                  <Stack direction='row' spacing={2} alignItems='flex-start'>
                    <i className='tabler-users-group' style={{ fontSize: 18, marginTop: 2 }} aria-hidden />
                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                      {C.classification.sodNote}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </OperationalPanel>
          </motion.div>
        </Grid>
      </Grid>

      {/* Surfaces */}
      <DetailDrawer
        open={detailOpen}
        engagement={engagement}
        onClose={() => setDetailOpen(false)}
        onEditTerms={() => {
          setDetailOpen(false)
          setTermsOpen(true)
        }}
      />

      <ReviewDialog open={reviewOpen} engagement={engagement} onClose={() => setReviewOpen(false)} />

      <LifecycleDialog open={lifecycleTo !== null} from={engagement.status} to={lifecycleTo} onClose={() => setLifecycleTo(null)} />

      <TermsDrawer open={termsOpen} engagement={engagement} onClose={() => setTermsOpen(false)} />
    </Box>
  )
}

export default ContractorEngagementDetailMockupView
