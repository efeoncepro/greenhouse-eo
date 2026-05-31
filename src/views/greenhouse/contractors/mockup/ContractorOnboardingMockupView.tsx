'use client'

// TASK-976 mockup — Contractor Onboarding wizard (employee→contractor + new
// contractor). MUI Stepper, declarative A/B branching, per-step validation,
// back preserves form state. Mockup-only: local state, no fetch/API/auth.
// Style mirrors the APPROVED ContractorEngagementDetailMockupView (right tone,
// CustomTextField, inline Alert, framer-motion fade, prefers-reduced-motion).
// forms-ux Lane C governs: progress indicator + step title/subtitle + back
// preserves data + per-step validation + single column.

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import EmptyState from '@/components/greenhouse/EmptyState'
import { OperationalPanel } from '@/components/greenhouse/primitives'
import useReducedMotion from '@/hooks/useReducedMotion'
import { getMicrocopy } from '@/lib/copy'
import { GH_CONTRACTOR_COMPENSATION as C } from '@/lib/copy/contractor-compensation'
import { formatCurrency, formatDate } from '@/lib/format'
import { AnimatePresence, motion } from '@/libs/FramerMotion'

import {
  BONUS_POLICY_OPTIONS,
  CONTRACTOR_SUBTYPE_OPTIONS,
  MOCK_EXECUTED_OFFBOARDINGS,
  MOCK_OPERATING_ENTITY,
  MOCK_PEOPLE,
  PATH_B_OUTCOME_ORDER,
  PAYMENT_CADENCE_OPTIONS,
  PAYMENT_MODEL_OPTIONS,
  PAYROLL_VIA_OPTIONS,
  RATE_TYPE_OPTIONS,
  RELATIONSHIP_SUBTYPE_OPTIONS,
  TAX_OWNER_OPTIONS,
  bonusPolicyLabel,
  cadenceLabel,
  contractorSubtypeLabel,
  paymentModelLabel,
  payrollViaLabel,
  rateTypeLabel,
  relationshipSubtypeLabel,
  resolvePersonOutcome,
  taxOwnerLabel,
  type BonusPolicy,
  type ContractorSubtype,
  type MockExecutedOffboarding,
  type MockPerson,
  type PathBOutcome,
  type PaymentCadence,
  type PaymentModel,
  type PayrollVia,
  type PersonOutcome,
  type RateType,
  type RelationshipSubtype
} from './contractor-onboarding-data'

const O = C.onboarding
const aria = getMicrocopy('es-CL').aria

// --- Shared form state -------------------------------------------------------

interface TermsFormState {
  // Path B only
  contractorSubtype: ContractorSubtype
  effectiveFrom: string
  // Path A only
  relationshipSubtype: RelationshipSubtype
  startDate: string
  // Shared economics
  payrollVia: PayrollVia
  paymentModel: PaymentModel
  rateType: RateType
  paymentCadence: PaymentCadence
  rateAmountText: string
  currency: string
  requiresInvoice: boolean
  requiresWorkApproval: boolean
  taxComplianceOwner: TaxComplianceOwnerValue
  bonusPolicy: BonusPolicy
  // Path B reason (transition)
  reason: string
}

// Tax owner is optional → '' sentinel for "not set".
type TaxComplianceOwnerValue = '' | (typeof TAX_OWNER_OPTIONS)[number]

const INITIAL_TERMS: TermsFormState = {
  contractorSubtype: 'contractor',
  effectiveFrom: '',
  relationshipSubtype: 'freelance',
  startDate: '',
  payrollVia: 'internal',
  paymentModel: 'fixed_recurring',
  rateType: 'fixed',
  paymentCadence: 'monthly',
  rateAmountText: '',
  currency: 'CLP',
  requiresInvoice: true,
  requiresWorkApproval: true,
  taxComplianceOwner: '',
  bonusPolicy: 'none',
  reason: ''
}

const parseAmount = (raw: string): number | null => {
  const digits = raw.replace(/[^\d]/g, '')

  return digits ? Number(digits) : null
}

// =============================================================================
// Small presentational helpers
// =============================================================================

const StepHeading = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <Stack spacing={1} sx={{ mb: 5 }}>
    <Typography variant='h5' sx={{ fontWeight: 600 }}>
      {title}
    </Typography>
    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
      {subtitle}
    </Typography>
  </Stack>
)

const SummaryRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Stack direction='row' justifyContent='space-between' alignItems='baseline' spacing={3} sx={{ py: 1.25 }}>
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

// Selectable path card (Step 1).
const PathCard = ({
  selected,
  icon,
  title,
  subtitle,
  detail,
  onSelect
}: {
  selected: boolean
  icon: string
  title: string
  subtitle: string
  detail: string
  onSelect: () => void
}) => {
  const theme = useTheme()

  return (
    <Box
      component='button'
      type='button'
      onClick={onSelect}
      aria-pressed={selected}
      sx={{
        width: '100%',
        height: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        p: 5,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
        bgcolor: selected ? alpha(theme.palette.primary.main, 0.06) : 'background.paper',
        transition: 'border-color 150ms cubic-bezier(0.2, 0, 0, 1), background-color 150ms cubic-bezier(0.2, 0, 0, 1)',
        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
        '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
      }}
    >
      <Stack spacing={2}>
        <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.primary.main, selected ? 0.16 : 0.08),
              color: 'primary.main'
            }}
          >
            <i className={icon} style={{ fontSize: 22 }} aria-hidden />
          </Box>
          <i
            className={selected ? 'tabler-circle-check-filled' : 'tabler-circle'}
            style={{ fontSize: 22, color: selected ? theme.palette.primary.main : theme.palette.text.disabled }}
            aria-hidden
          />
        </Stack>
        <Box>
          <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
            {subtitle}
          </Typography>
        </Box>
        <Typography variant='caption' sx={{ color: 'text.disabled' }}>
          {detail}
        </Typography>
      </Stack>
    </Box>
  )
}

// =============================================================================
// Root view
// =============================================================================

const ContractorOnboardingMockupView = () => {
  const prefersReduced = useReducedMotion()

  // --- Path + step state -----------------------------------------------------
  const [path, setPath] = useState<'from_offboarding' | 'new_contractor' | null>(null)
  const [activeStep, setActiveStep] = useState(0)

  // --- Path B: offboarding pick ----------------------------------------------
  const [selectedOffboardingId, setSelectedOffboardingId] = useState<string | null>(null)

  const selectedOffboarding = useMemo<MockExecutedOffboarding | null>(
    () => MOCK_EXECUTED_OFFBOARDINGS.find(o => o.offboardingCaseId === selectedOffboardingId) ?? null,
    [selectedOffboardingId]
  )

  // --- Path A: person pick + resolve -----------------------------------------
  const [personQuery, setPersonQuery] = useState('')
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)

  const selectedPerson = useMemo<MockPerson | null>(
    () => MOCK_PEOPLE.find(p => p.profileId === selectedPersonId) ?? null,
    [selectedPersonId]
  )

  const personOutcome = useMemo<PersonOutcome | null>(
    () => (selectedPersonId ? resolvePersonOutcome(selectedPersonId) : null),
    [selectedPersonId]
  )

  const personResults = useMemo(() => {
    const q = personQuery.trim().toLowerCase()

    if (!q) return MOCK_PEOPLE

    return MOCK_PEOPLE.filter(p => p.fullName.toLowerCase().includes(q) || p.canonicalEmail.toLowerCase().includes(q))
  }, [personQuery])

  // --- Terms form (preserved across back/forward) ----------------------------
  const [terms, setTerms] = useState<TermsFormState>(INITIAL_TERMS)

  const updateTerms = <K extends keyof TermsFormState>(key: K, value: TermsFormState[K]) =>
    setTerms(prev => ({ ...prev, [key]: value }))

  // --- Validation touch flags ------------------------------------------------
  const [termsTouched, setTermsTouched] = useState(false)

  // --- Path B outcome preview (mockup-only selector) -------------------------
  const [previewOutcome, setPreviewOutcome] = useState<PathBOutcome>('transitioned')

  // --- Submission state (mockup) ---------------------------------------------
  const [submitted, setSubmitted] = useState(false)

  // --- Steps array (declarative branching) -----------------------------------
  const stepLabels = useMemo(() => {
    if (path === 'from_offboarding') {
      return [O.stepOnboardingType, O.stepPickOffboarding, O.stepTerms, O.stepConfirm]
    }

    if (path === 'new_contractor') {
      return [O.stepOnboardingType, O.stepPickPerson, O.stepTerms, O.stepConfirm]
    }

    return [O.stepOnboardingType, O.stepTerms, O.stepConfirm]
  }, [path])

  const rateAmount = parseAmount(terms.rateAmountText)

  // --- effective_from must be after lastWorkingDay (Path B) ------------------
  const effectiveFromInvalid =
    path === 'from_offboarding' &&
    Boolean(selectedOffboarding) &&
    Boolean(terms.effectiveFrom) &&
    terms.effectiveFrom <= (selectedOffboarding?.lastWorkingDay ?? '')

  const reasonInvalid = path === 'from_offboarding' && terms.reason.trim().length < 10

  // --- Per-step validation gate ----------------------------------------------
  const canAdvance = useMemo(() => {
    if (activeStep === 0) return path !== null

    if (path === 'from_offboarding') {
      if (activeStep === 1) return Boolean(selectedOffboardingId)

      if (activeStep === 2) {
        return Boolean(terms.effectiveFrom) && !effectiveFromInvalid && !reasonInvalid
      }
    }

    if (path === 'new_contractor') {
      if (activeStep === 1) return personOutcome?.kind === 'has_contractor_relationship'
      if (activeStep === 2) return Boolean(terms.startDate)
    }

    return true
  }, [
    activeStep,
    path,
    selectedOffboardingId,
    personOutcome,
    terms.effectiveFrom,
    terms.startDate,
    effectiveFromInvalid,
    reasonInvalid
  ])

  const isLastStep = activeStep === stepLabels.length - 1

  const handleNext = () => {
    setTermsTouched(true)
    if (!canAdvance) return
    setActiveStep(s => s + 1)
  }

  const handleBack = () => {
    setSubmitted(false)
    setActiveStep(s => Math.max(0, s - 1))
  }

  const handleSelectPath = (next: 'from_offboarding' | 'new_contractor') => {
    setPath(next)
    setActiveStep(0)
    setSubmitted(false)
  }

  // Derive Path A → Path B with the offboarding case preselected.
  const handleDeriveToPathB = (offboardingCaseId: string) => {
    setSelectedOffboardingId(offboardingCaseId)
    setPath('from_offboarding')
    setActiveStep(1)
    setSubmitted(false)
  }

  const handleSubmit = () => setSubmitted(true)

  const resetWizard = () => {
    setPath(null)
    setActiveStep(0)
    setSelectedOffboardingId(null)
    setPersonQuery('')
    setSelectedPersonId(null)
    setTerms(INITIAL_TERMS)
    setTermsTouched(false)
    setSubmitted(false)
  }

  // Reset terms-touched when entering the terms step fresh.
  useEffect(() => {
    if ((path === 'from_offboarding' || path === 'new_contractor') && activeStep === 2) return
    setTermsTouched(false)
  }, [activeStep, path])

  const stepFade = (key: string | number) =>
    prefersReduced
      ? {}
      : {
          key,
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -8 },
          transition: { duration: 0.25, ease: [0.2, 0, 0, 1] as const }
        }

  // --- Render the active step body -------------------------------------------
  const renderStepBody = () => {
    // Step 0 — onboarding type
    if (activeStep === 0) {
      return <TypeStep path={path} onSelect={handleSelectPath} />
    }

    // Path B steps
    if (path === 'from_offboarding') {
      if (activeStep === 1) {
        return (
          <OffboardingStep
            selectedId={selectedOffboardingId}
            onSelect={setSelectedOffboardingId}
            showError={termsTouched && !selectedOffboardingId}
          />
        )
      }

      if (activeStep === 2) {
        return (
          <TermsStep
            path={path}
            terms={terms}
            updateTerms={updateTerms}
            rateAmount={rateAmount}
            touched={termsTouched}
            offboarding={selectedOffboarding}
            person={null}
            effectiveFromInvalid={effectiveFromInvalid}
            reasonInvalid={reasonInvalid}
          />
        )
      }

      // activeStep === 3 — confirm
      return (
        <ConfirmStep
          path={path}
          submitted={submitted}
          previewOutcome={previewOutcome}
          setPreviewOutcome={setPreviewOutcome}
          offboarding={selectedOffboarding}
          person={null}
          terms={terms}
          rateAmount={rateAmount}
        />
      )
    }

    // Path A steps
    if (path === 'new_contractor') {
      if (activeStep === 1) {
        return (
          <PersonStep
            query={personQuery}
            setQuery={setPersonQuery}
            results={personResults}
            selectedId={selectedPersonId}
            onSelect={setSelectedPersonId}
            outcome={personOutcome}
            onDeriveToB={handleDeriveToPathB}
            showError={termsTouched && personOutcome?.kind !== 'has_contractor_relationship'}
          />
        )
      }

      if (activeStep === 2) {
        return (
          <TermsStep
            path={path}
            terms={terms}
            updateTerms={updateTerms}
            rateAmount={rateAmount}
            touched={termsTouched}
            offboarding={null}
            person={selectedPerson}
            effectiveFromInvalid={false}
            reasonInvalid={false}
          />
        )
      }

      // activeStep === 3 — confirm
      return (
        <ConfirmStep
          path={path}
          submitted={submitted}
          previewOutcome={previewOutcome}
          setPreviewOutcome={setPreviewOutcome}
          offboarding={null}
          person={selectedPerson}
          terms={terms}
          rateAmount={rateAmount}
        />
      )
    }

    return null
  }

  return (
    <Box sx={{ p: { xs: 4, md: 6 }, maxWidth: 1120, mx: 'auto' }}>
      {/* Header */}
      <Stack spacing={1} sx={{ mb: 5 }}>
        <Typography variant='h4' sx={{ fontWeight: 700 }}>
          {O.pageTitle}
        </Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          {O.pageSubtitle}
        </Typography>
      </Stack>

      {/* Preview / scenario control bar (mockup-only) */}
      <PreviewBar
        path={path}
        previewOutcome={previewOutcome}
        onPath={handleSelectPath}
        onPreviewOutcome={setPreviewOutcome}
      />

      {/* Stepper */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, mb: 6 }}>
        <CardContent sx={{ py: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel aria-label={O.stepperAria}>
            {stepLabels.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Body + sidebar */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent sx={{ p: { xs: 5, md: 6 } }}>
              <AnimatePresence mode='wait' initial={false}>
                <motion.div {...stepFade(`${path}-${activeStep}-${submitted}`)}>{renderStepBody()}</motion.div>
              </AnimatePresence>

              {/* Footer nav */}
              <Divider sx={{ my: 6 }} />
              <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2} justifyContent='space-between'>
                <Button
                  variant='tonal'
                  color='secondary'
                  startIcon={<i className='tabler-arrow-left' />}
                  onClick={handleBack}
                  disabled={activeStep === 0}
                  aria-label={aria.navigateBack}
                >
                  {O.backCta}
                </Button>

                {submitted ? (
                  <Button variant='contained' startIcon={<i className='tabler-rotate' />} onClick={resetWizard}>
                    {O.pageTitle}
                  </Button>
                ) : isLastStep ? (
                  <Button
                    variant='contained'
                    startIcon={<i className='tabler-user-plus' />}
                    onClick={handleSubmit}
                  >
                    {O.createCta}
                  </Button>
                ) : (
                  <Button
                    variant='contained'
                    endIcon={<i className='tabler-arrow-right' />}
                    onClick={handleNext}
                    aria-label={aria.navigateForward}
                  >
                    {O.nextCta}
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar guidance */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <GuidancePanel path={path} />
        </Grid>
      </Grid>
    </Box>
  )
}

// =============================================================================
// Step 0 — onboarding type
// =============================================================================

const TypeStep = ({
  path,
  onSelect
}: {
  path: 'from_offboarding' | 'new_contractor' | null
  onSelect: (p: 'from_offboarding' | 'new_contractor') => void
}) => (
  <Box>
    <StepHeading title={O.typeStepTitle} subtitle={O.typeStepSubtitle} />
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <PathCard
          selected={path === 'from_offboarding'}
          icon='tabler-door-exit'
          title={O.pathBCardTitle}
          subtitle={O.pathBCardSubtitle}
          detail={O.pathBCardDetail}
          onSelect={() => onSelect('from_offboarding')}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <PathCard
          selected={path === 'new_contractor'}
          icon='tabler-user-plus'
          title={O.pathACardTitle}
          subtitle={O.pathACardSubtitle}
          detail={O.pathACardDetail}
          onSelect={() => onSelect('new_contractor')}
        />
      </Grid>
    </Grid>
  </Box>
)

// =============================================================================
// Step B2 — pick executed offboarding
// =============================================================================

const OffboardingStep = ({
  selectedId,
  onSelect,
  showError
}: {
  selectedId: string | null
  onSelect: (id: string) => void
  showError: boolean
}) => {
  const theme = useTheme()

  if (MOCK_EXECUTED_OFFBOARDINGS.length === 0) {
    return (
      <Box>
        <StepHeading title={O.pickOffboardingTitle} subtitle={O.pickOffboardingSubtitle} />
        <EmptyState icon='tabler-door-off' title={O.offboardingEmptyTitle} description={O.offboardingEmptyDescription} minHeight={220} />
      </Box>
    )
  }

  return (
    <Box>
      <StepHeading title={O.pickOffboardingTitle} subtitle={O.pickOffboardingSubtitle} />
      <Stack spacing={3}>
        {MOCK_EXECUTED_OFFBOARDINGS.map(o => {
          const selected = selectedId === o.offboardingCaseId

          return (
            <Box
              key={o.offboardingCaseId}
              component='button'
              type='button'
              onClick={() => onSelect(o.offboardingCaseId)}
              aria-pressed={selected}
              sx={{
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                p: 4,
                borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
                bgcolor: selected ? alpha(theme.palette.primary.main, 0.06) : 'background.paper',
                transition: 'border-color 150ms cubic-bezier(0.2, 0, 0, 1), background-color 150ms cubic-bezier(0.2, 0, 0, 1)',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
              }}
            >
              <Stack direction='row' spacing={3} alignItems='center'>
                <i
                  className={selected ? 'tabler-circle-check-filled' : 'tabler-circle'}
                  style={{ fontSize: 22, color: selected ? theme.palette.primary.main : theme.palette.text.disabled, flexShrink: 0 }}
                  aria-hidden
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
                    <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                      {o.personName}
                    </Typography>
                    <CustomChip round='true' size='small' variant='tonal' color='secondary' label={o.publicId} />
                  </Stack>
                  <Stack direction='row' spacing={4} sx={{ mt: 1 }} flexWrap='wrap' useFlexGap>
                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                      {O.offboardingLastDay}: {formatDate(o.lastWorkingDay, { dateStyle: 'medium' }, 'es-CL')}
                    </Typography>
                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                      {O.offboardingSeparation}: {o.separationType}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Box>
          )
        })}
      </Stack>
      {showError ? (
        <Typography role='alert' variant='caption' sx={{ color: 'error.main', display: 'block', mt: 3 }}>
          {O.pickOffboardingError}
        </Typography>
      ) : null}
    </Box>
  )
}

// =============================================================================
// Step A2 — pick person + resolve outcome
// =============================================================================

const PersonStep = ({
  query,
  setQuery,
  results,
  selectedId,
  onSelect,
  outcome,
  onDeriveToB,
  showError
}: {
  query: string
  setQuery: (v: string) => void
  results: MockPerson[]
  selectedId: string | null
  onSelect: (id: string) => void
  outcome: PersonOutcome | null
  onDeriveToB: (offboardingCaseId: string) => void
  showError: boolean
}) => {
  const theme = useTheme()

  return (
    <Box>
      <StepHeading title={O.pickPersonTitle} subtitle={O.pickPersonSubtitle} />

      <CustomTextField
        fullWidth
        label={O.personSearchLabel}
        placeholder={O.personSearchPlaceholder}
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoComplete='off'
        slotProps={{
          input: {
            'aria-label': aria.searchInput,
            startAdornment: (
              <InputAdornment position='start'>
                <i className='tabler-search' style={{ fontSize: 18 }} aria-hidden />
              </InputAdornment>
            )
          }
        }}
      />

      <Stack spacing={2} sx={{ mt: 4 }}>
        {results.length === 0 ? (
          <Typography variant='body2' sx={{ color: 'text.secondary', py: 3 }}>
            {O.personSearchEmpty}
          </Typography>
        ) : (
          results.map(p => {
            const selected = selectedId === p.profileId

            return (
              <Box
                key={p.profileId}
                component='button'
                type='button'
                onClick={() => onSelect(p.profileId)}
                aria-pressed={selected}
                sx={{
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  p: 3,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
                  bgcolor: selected ? alpha(theme.palette.primary.main, 0.06) : 'background.paper',
                  transition: 'border-color 150ms cubic-bezier(0.2, 0, 0, 1)',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
                }}
              >
                <Stack direction='row' spacing={3} alignItems='center'>
                  <i
                    className={selected ? 'tabler-circle-check-filled' : 'tabler-circle'}
                    style={{ fontSize: 20, color: selected ? theme.palette.primary.main : theme.palette.text.disabled, flexShrink: 0 }}
                    aria-hidden
                  />
                  <Box>
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {p.fullName}
                    </Typography>
                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                      {p.canonicalEmail}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            )
          })
        )}
      </Stack>

      {/* Resolve outcome */}
      {outcome ? (
        <Box sx={{ mt: 5 }}>
          {outcome.kind === 'has_contractor_relationship' ? (
            <Alert severity='success' icon={<i className='tabler-circle-check' />}>
              <AlertTitle sx={{ fontWeight: 600 }}>{O.resolveOkTitle}</AlertTitle>
              {O.resolveOkDescription}
              <Box sx={{ mt: 1.5 }}>
                <SummaryRow label={O.resolveRelationLabel} value={outcome.relationship.legalEntityLabel} />
              </Box>
            </Alert>
          ) : outcome.kind === 'has_executed_offboarding' ? (
            <Alert
              severity='info'
              icon={<i className='tabler-arrows-exchange' />}
              action={
                <Button size='small' color='inherit' onClick={() => onDeriveToB(outcome.offboardingCaseId)}>
                  {O.deriveToBCta}
                </Button>
              }
            >
              <AlertTitle sx={{ fontWeight: 600 }}>{O.deriveToBTitle}</AlertTitle>
              {O.deriveToBDescription}
            </Alert>
          ) : (
            <Alert severity='warning' icon={<i className='tabler-user-question' />}>
              <AlertTitle sx={{ fontWeight: 600 }}>{O.noRelationTitle}</AlertTitle>
              {O.noRelationDescription}
              <Typography variant='caption' sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                {O.noRelationHint}
              </Typography>
            </Alert>
          )}
        </Box>
      ) : null}

      {showError && outcome === null ? (
        <Typography role='alert' variant='caption' sx={{ color: 'error.main', display: 'block', mt: 3 }}>
          {O.pickPersonError}
        </Typography>
      ) : null}
    </Box>
  )
}

// =============================================================================
// Step 3 — engagement terms
// =============================================================================

const TermsStep = ({
  path,
  terms,
  updateTerms,
  rateAmount,
  touched,
  offboarding,
  person,
  effectiveFromInvalid,
  reasonInvalid
}: {
  path: 'from_offboarding' | 'new_contractor'
  terms: TermsFormState
  updateTerms: <K extends keyof TermsFormState>(key: K, value: TermsFormState[K]) => void
  rateAmount: number | null
  touched: boolean
  offboarding: MockExecutedOffboarding | null
  person: MockPerson | null
  effectiveFromInvalid: boolean
  reasonInvalid: boolean
}) => {
  const theme = useTheme()
  const isB = path === 'from_offboarding'

  const effectiveFromError = touched && (terms.effectiveFrom === '' || effectiveFromInvalid)
  const startDateError = touched && !isB && terms.startDate === ''
  const reasonError = touched && reasonInvalid

  return (
    <Box>
      <StepHeading title={O.termsTitle} subtitle={isB ? O.termsSubtitleB : O.termsSubtitleA} />

      {/* Resolved context (read-only) */}
      <Box
        sx={{
          p: 4,
          mb: 5,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          bgcolor: alpha(theme.palette.secondary.main, 0.04),
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <SummaryRow
          label={O.resolvedPersonLabel}
          value={isB ? offboarding?.personName ?? '—' : person?.fullName ?? '—'}
        />
        <SummaryRow label={O.operatingEntityLabel} value={MOCK_OPERATING_ENTITY.legalName} />
        {isB ? (
          <SummaryRow
            label={O.offboardingLastDay}
            value={offboarding ? formatDate(offboarding.lastWorkingDay, { dateStyle: 'medium' }, 'es-CL') : '—'}
          />
        ) : null}
      </Box>

      <Stack spacing={5}>
        {/* Subtype */}
        {isB ? (
          <CustomTextField
            select
            fullWidth
            label={O.contractorSubtypeLabel}
            helperText={O.contractorSubtypeHelper}
            value={terms.contractorSubtype}
            onChange={e => updateTerms('contractorSubtype', e.target.value as ContractorSubtype)}
          >
            {CONTRACTOR_SUBTYPE_OPTIONS.map(o => (
              <MenuItem key={o} value={o}>
                {contractorSubtypeLabel(o)}
              </MenuItem>
            ))}
          </CustomTextField>
        ) : (
          <CustomTextField
            select
            fullWidth
            label={O.relationshipSubtypeLabel}
            value={terms.relationshipSubtype}
            onChange={e => updateTerms('relationshipSubtype', e.target.value as RelationshipSubtype)}
          >
            {RELATIONSHIP_SUBTYPE_OPTIONS.map(o => (
              <MenuItem key={o} value={o}>
                {relationshipSubtypeLabel(o)}
              </MenuItem>
            ))}
          </CustomTextField>
        )}

        {/* Effective from (B) / start date (A) */}
        {isB ? (
          <CustomTextField
            fullWidth
            type='date'
            label={O.effectiveFromLabel}
            value={terms.effectiveFrom}
            onChange={e => updateTerms('effectiveFrom', e.target.value)}
            error={effectiveFromError}
            helperText={
              effectiveFromError
                ? O.effectiveFromError.replace(
                    '{lastDay}',
                    offboarding ? formatDate(offboarding.lastWorkingDay, { dateStyle: 'medium' }, 'es-CL') : '—'
                  )
                : O.effectiveFromHelper
            }
            slotProps={{ inputLabel: { shrink: true }, input: { 'aria-invalid': effectiveFromError } }}
          />
        ) : (
          <CustomTextField
            fullWidth
            type='date'
            label={O.startDateLabel}
            value={terms.startDate}
            onChange={e => updateTerms('startDate', e.target.value)}
            error={startDateError}
            helperText={startDateError ? O.startDateError : O.startDateHelper}
            slotProps={{ inputLabel: { shrink: true }, input: { 'aria-invalid': startDateError } }}
          />
        )}

        {/* Economics */}
        <CustomTextField
          select
          fullWidth
          label={O.payrollViaLabel}
          value={terms.payrollVia}
          onChange={e => updateTerms('payrollVia', e.target.value as PayrollVia)}
        >
          {PAYROLL_VIA_OPTIONS.map(o => (
            <MenuItem key={o} value={o}>
              {payrollViaLabel(o)}
            </MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          select
          fullWidth
          label={O.paymentModelLabel}
          value={terms.paymentModel}
          onChange={e => updateTerms('paymentModel', e.target.value as PaymentModel)}
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
          label={O.rateTypeLabel}
          value={terms.rateType}
          onChange={e => updateTerms('rateType', e.target.value as RateType)}
        >
          {RATE_TYPE_OPTIONS.map(o => (
            <MenuItem key={o} value={o}>
              {rateTypeLabel(o)}
            </MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          select
          fullWidth
          label={O.cadenceLabel}
          value={terms.paymentCadence}
          onChange={e => updateTerms('paymentCadence', e.target.value as PaymentCadence)}
        >
          {PAYMENT_CADENCE_OPTIONS.map(o => (
            <MenuItem key={o} value={o}>
              {cadenceLabel(o)}
            </MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          fullWidth
          label={O.rateAmountLabel}
          helperText={O.rateAmountHelper}
          value={terms.rateAmountText}
          onChange={e => updateTerms('rateAmountText', e.target.value)}
          inputMode='numeric'
          slotProps={{
            input: {
              startAdornment: <InputAdornment position='start'>{terms.currency}</InputAdornment>,
              endAdornment:
                rateAmount !== null ? (
                  <InputAdornment position='end'>
                    <Typography variant='caption' sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(rateAmount, terms.currency, { maximumFractionDigits: 0 }, 'es-CL')}
                    </Typography>
                  </InputAdornment>
                ) : null
            }
          }}
        />

        <CustomTextField
          select
          fullWidth
          label={O.currencyLabel}
          value={terms.currency}
          onChange={e => updateTerms('currency', e.target.value)}
        >
          {['CLP', 'USD'].map(o => (
            <MenuItem key={o} value={o}>
              {o}
            </MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          select
          fullWidth
          label={O.taxOwnerLabel}
          helperText={O.taxOwnerHelper}
          value={terms.taxComplianceOwner}
          onChange={e => updateTerms('taxComplianceOwner', e.target.value as TermsFormState['taxComplianceOwner'])}
        >
          <MenuItem value=''>{C.detail.notSet}</MenuItem>
          {TAX_OWNER_OPTIONS.map(o => (
            <MenuItem key={o} value={o}>
              {taxOwnerLabel(o)}
            </MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          select
          fullWidth
          label={O.bonusPolicyLabel}
          value={terms.bonusPolicy}
          onChange={e => updateTerms('bonusPolicy', e.target.value as BonusPolicy)}
        >
          {BONUS_POLICY_OPTIONS.map(o => (
            <MenuItem key={o} value={o}>
              {bonusPolicyLabel(o)}
            </MenuItem>
          ))}
        </CustomTextField>

        <Stack spacing={1}>
          <FormControlLabel
            control={
              <Switch checked={terms.requiresInvoice} onChange={() => updateTerms('requiresInvoice', !terms.requiresInvoice)} />
            }
            label={O.requiresInvoiceLabel}
          />
          <FormControlLabel
            control={
              <Switch
                checked={terms.requiresWorkApproval}
                onChange={() => updateTerms('requiresWorkApproval', !terms.requiresWorkApproval)}
              />
            }
            label={O.requiresWorkApprovalLabel}
          />
        </Stack>

        {/* Reason (Path B transition) */}
        {isB ? (
          <CustomTextField
            fullWidth
            multiline
            minRows={3}
            label={O.reasonLabel}
            value={terms.reason}
            onChange={e => updateTerms('reason', e.target.value)}
            error={reasonError}
            helperText={reasonError ? O.reasonError : O.reasonHelper}
            slotProps={{ input: { 'aria-invalid': reasonError } }}
          />
        ) : null}

        {/* Boundary note (Path B) */}
        {isB ? (
          <Alert severity='info' icon={<i className='tabler-shield-half' />}>
            {O.boundaryNote}
          </Alert>
        ) : null}
      </Stack>
    </Box>
  )
}

// =============================================================================
// Step 4 — confirmation + outcomes
// =============================================================================

const ConfirmStep = ({
  path,
  submitted,
  previewOutcome,
  setPreviewOutcome,
  offboarding,
  person,
  terms,
  rateAmount
}: {
  path: 'from_offboarding' | 'new_contractor'
  submitted: boolean
  previewOutcome: PathBOutcome
  setPreviewOutcome: (o: PathBOutcome) => void
  offboarding: MockExecutedOffboarding | null
  person: MockPerson | null
  terms: TermsFormState
  rateAmount: number | null
}) => {
  const isB = path === 'from_offboarding'

  if (submitted) {
    return (
      <OutcomePanel
        path={path}
        previewOutcome={previewOutcome}
        offboarding={offboarding}
        person={person}
      />
    )
  }

  return (
    <Box>
      <StepHeading
        title={isB ? O.confirmTitleB : O.confirmTitleA}
        subtitle={isB ? O.confirmSubtitleB : O.confirmSubtitleA}
      />

      {/* Summary */}
      <Box sx={{ mb: 5 }}>
        <SummaryRow label={O.resolvedPersonLabel} value={isB ? offboarding?.personName ?? '—' : person?.fullName ?? '—'} />
        <SummaryRow label={O.operatingEntityLabel} value={MOCK_OPERATING_ENTITY.legalName} />
        {isB ? (
          <SummaryRow label={O.contractorSubtypeLabel} value={contractorSubtypeLabel(terms.contractorSubtype)} />
        ) : (
          <SummaryRow label={O.relationshipSubtypeLabel} value={relationshipSubtypeLabel(terms.relationshipSubtype)} />
        )}
        <SummaryRow
          label={isB ? O.effectiveFromLabel : O.startDateLabel}
          value={
            isB
              ? terms.effectiveFrom
                ? formatDate(terms.effectiveFrom, { dateStyle: 'medium' }, 'es-CL')
                : '—'
              : terms.startDate
                ? formatDate(terms.startDate, { dateStyle: 'medium' }, 'es-CL')
                : '—'
          }
        />
        <SummaryRow label={O.rateTypeLabel} value={rateTypeLabel(terms.rateType)} />
        <SummaryRow label={O.cadenceLabel} value={cadenceLabel(terms.paymentCadence)} />
        <SummaryRow
          label={O.rateAmountLabel}
          value={
            rateAmount === null
              ? C.detail.notSet
              : formatCurrency(rateAmount, terms.currency, { maximumFractionDigits: 0 }, 'es-CL')
          }
        />
      </Box>

      <Divider sx={{ mb: 5 }} />

      {/* What will happen */}
      <Stack spacing={2} sx={{ mb: 5 }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
          {O.confirmWillHappen}
        </Typography>
        {(isB
          ? [O.confirmStepCloseEmployee, O.confirmStepOpenContractor, O.confirmStepCreateEngagement, O.confirmStepDraftReview]
          : [O.confirmStepCreateEngagementA, O.confirmStepDraftReview]
        ).map(line => (
          <Stack key={line} direction='row' spacing={2} alignItems='flex-start'>
            <i className='tabler-circle-check' style={{ fontSize: 18, marginTop: 2, color: 'var(--mui-palette-success-main)' }} aria-hidden />
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {line}
            </Typography>
          </Stack>
        ))}
      </Stack>

      {/* Path B outcome preview selector (mockup-only) */}
      {isB ? (
        <Box>
          <Typography variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 2 }}>
            {O.previewOutcomeLabel}
          </Typography>
          <ToggleButtonGroup
            exclusive
            size='small'
            value={previewOutcome}
            onChange={(_, v) => v && setPreviewOutcome(v as PathBOutcome)}
            sx={{ flexWrap: 'wrap' }}
          >
            {PATH_B_OUTCOME_ORDER.map(o => (
              <ToggleButton key={o} value={o}>
                {o === 'transitioned' ? O.outcomeTransitioned : o === 'already_complete' ? O.outcomeAlreadyComplete : O.outcomeEngagementOnExisting}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      ) : null}
    </Box>
  )
}

// =============================================================================
// Outcome panel (success state after submit)
// =============================================================================

const OUTCOME_ENGAGEMENT_ID: Record<PathBOutcome, string | null> = {
  transitioned: 'EO-CENG-0042',
  engagement_created_on_existing_relationship: 'EO-CENG-0043',
  already_complete: null
}

const OutcomePanel = ({
  path,
  previewOutcome,
  offboarding,
  person
}: {
  path: 'from_offboarding' | 'new_contractor'
  previewOutcome: PathBOutcome
  offboarding: MockExecutedOffboarding | null
  person: MockPerson | null
}) => {
  const prefersReduced = useReducedMotion()
  const isB = path === 'from_offboarding'

  const { severity, icon, title, description, engagementId } = isB
    ? {
        severity:
          previewOutcome === 'already_complete' ? ('info' as const) : ('success' as const),
        icon:
          previewOutcome === 'transitioned'
            ? 'tabler-user-check'
            : previewOutcome === 'engagement_created_on_existing_relationship'
              ? 'tabler-link'
              : 'tabler-check',
        title:
          previewOutcome === 'transitioned'
            ? O.outcomeTransitionedTitle
            : previewOutcome === 'engagement_created_on_existing_relationship'
              ? O.outcomeEngagementTitle
              : O.outcomeAlreadyTitle,
        description:
          previewOutcome === 'transitioned'
            ? O.outcomeTransitionedDescription
            : previewOutcome === 'engagement_created_on_existing_relationship'
              ? O.outcomeEngagementDescription
              : O.outcomeAlreadyDescription,
        engagementId: OUTCOME_ENGAGEMENT_ID[previewOutcome]
      }
    : {
        severity: 'success' as const,
        icon: 'tabler-user-check',
        title: O.outcomeCreatedTitle,
        description: O.outcomeCreatedDescription,
        engagementId: 'EO-CENG-0044'
      }

  const subjectName = isB ? offboarding?.personName : person?.fullName

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
    >
      <Stack spacing={4}>
        <Alert severity={severity} icon={<i className={icon} />}>
          <AlertTitle sx={{ fontWeight: 600 }}>{title}</AlertTitle>
          {description}
        </Alert>

        <Box>
          {subjectName ? <SummaryRow label={O.resolvedPersonLabel} value={subjectName} /> : null}
          {engagementId ? (
            <SummaryRow
              label={O.outcomeEngagementId}
              value={<CustomChip round='true' size='small' variant='tonal' color='primary' label={engagementId} />}
            />
          ) : null}
        </Box>

        {engagementId ? (
          <Stack direction='row' spacing={2} alignItems='flex-start' sx={{ color: 'text.secondary' }}>
            <i className='tabler-info-circle' style={{ fontSize: 18, marginTop: 2 }} aria-hidden />
            <Typography variant='caption'>{O.outcomeDraftNote}</Typography>
          </Stack>
        ) : null}
      </Stack>
    </motion.div>
  )
}

// =============================================================================
// Sidebar guidance
// =============================================================================

const GuidancePanel = ({ path }: { path: 'from_offboarding' | 'new_contractor' | null }) => (
  <OperationalPanel title='Cómo leer esto' subheader={O.pageTitle} icon='tabler-info-circle' iconColor='info'>
    <Stack spacing={3}>
      <Stack direction='row' spacing={2} alignItems='flex-start'>
        <i className='tabler-git-branch' style={{ fontSize: 18, marginTop: 2 }} aria-hidden />
        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
          {O.typeStepSubtitle}
        </Typography>
      </Stack>
      {path === 'from_offboarding' ? (
        <Stack direction='row' spacing={2} alignItems='flex-start'>
          <i className='tabler-shield-half' style={{ fontSize: 18, marginTop: 2 }} aria-hidden />
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {O.boundaryNote}
          </Typography>
        </Stack>
      ) : path === 'new_contractor' ? (
        <Stack direction='row' spacing={2} alignItems='flex-start'>
          <i className='tabler-user-question' style={{ fontSize: 18, marginTop: 2 }} aria-hidden />
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {O.noRelationHint}
          </Typography>
        </Stack>
      ) : null}
      <Divider />
      <Stack direction='row' spacing={2} alignItems='flex-start'>
        <i className='tabler-file-pencil' style={{ fontSize: 18, marginTop: 2 }} aria-hidden />
        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
          {O.outcomeDraftNote}
        </Typography>
      </Stack>
    </Stack>
  </OperationalPanel>
)

// =============================================================================
// Preview / scenario control bar (mockup-only)
// =============================================================================

const PreviewBar = ({
  path,
  previewOutcome,
  onPath,
  onPreviewOutcome
}: {
  path: 'from_offboarding' | 'new_contractor' | null
  previewOutcome: PathBOutcome
  onPath: (p: 'from_offboarding' | 'new_contractor') => void
  onPreviewOutcome: (o: PathBOutcome) => void
}) => (
  <Card
    elevation={0}
    sx={{ border: t => `1px dashed ${alpha(t.palette.secondary.main, 0.4)}`, mb: 6, bgcolor: t => alpha(t.palette.secondary.main, 0.02) }}
  >
    <CardContent sx={{ py: 3 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={3}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent='space-between'
        aria-label={O.previewBarAria}
      >
        <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
          <CustomChip round='true' size='small' variant='tonal' color='secondary' icon={<i className='tabler-eye' />} label={O.previewLegend} />
          <ToggleButtonGroup
            exclusive
            size='small'
            value={path}
            onChange={(_, v) => v && onPath(v as 'from_offboarding' | 'new_contractor')}
          >
            <ToggleButton value='from_offboarding'>{O.previewPathB}</ToggleButton>
            <ToggleButton value='new_contractor'>{O.previewPathA}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Stack direction='row' spacing={2} alignItems='center'>
          <Typography variant='caption' sx={{ color: 'text.disabled' }}>
            {O.previewOutcomeLabel}
          </Typography>
          <ToggleButtonGroup
            exclusive
            size='small'
            value={previewOutcome}
            onChange={(_, v) => v && onPreviewOutcome(v as PathBOutcome)}
          >
            <ToggleButton value='transitioned' aria-label={O.outcomeTransitioned}>
              <i className='tabler-user-check' style={{ fontSize: 16 }} />
            </ToggleButton>
            <ToggleButton value='engagement_created_on_existing_relationship' aria-label={O.outcomeEngagementOnExisting}>
              <i className='tabler-link' style={{ fontSize: 16 }} />
            </ToggleButton>
            <ToggleButton value='already_complete' aria-label={O.outcomeAlreadyComplete}>
              <i className='tabler-check' style={{ fontSize: 16 }} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

export default ContractorOnboardingMockupView
