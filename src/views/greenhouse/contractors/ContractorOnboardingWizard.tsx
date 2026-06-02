'use client'

// TASK-976 — Contractor Onboarding wizard (runtime). Promotes the APPROVED
// ContractorOnboardingMockupView to runtime: same Stepper + declarative A/B
// branching + per-step validation + back-preserves-state + copy. The mockup-only
// preview/scenario bar is gone; the wizard is wired to the existing commands:
//   · Path B "Desde una salida laboral" → POST /api/hr/contractors/transition-from-offboarding
//   · Path A "Contractor nuevo"          → POST /api/hr/contractors
// Path A resolve via GET /api/hr/contractors/onboarding/resolve.
// forms-ux Lane C: progress indicator + step title/subtitle + back preserves
// data + per-step validation + single column + inline Alert (no toast).
// Boundary (EPIC-013/TASK-956/957): only POSTs to the 2 existing endpoints;
// the commands are read-only/append-only over member/finiquito/payroll.

import { useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import EmptyState from '@/components/greenhouse/EmptyState'
import { OperationalPanel } from '@/components/greenhouse/primitives'
import useReducedMotion from '@/hooks/useReducedMotion'
import { throwIfNotOk } from '@/lib/api/parse-error-response'
import { getMicrocopy } from '@/lib/copy'
import { GH_CONTRACTOR_COMPENSATION as C } from '@/lib/copy/contractor-compensation'
import {
  BONUS_POLICY_OPTIONS,
  CONTRACTOR_SUBTYPE_OPTIONS,
  PAYMENT_CADENCE_OPTIONS,
  PAYMENT_MODEL_OPTIONS,
  PAYROLL_VIA_OPTIONS,
  RATE_TYPE_OPTIONS,
  RELATIONSHIP_SUBTYPE_OPTIONS,
  TAX_OWNER_OPTIONS,
  bonusPolicyLabel,
  cadenceLabel,
  contractorSubtypeLabel,
  payrollViaLabel,
  paymentModelLabel,
  rateTypeLabel,
  relationshipSubtypeLabel,
  taxOwnerLabel,
  type BonusPolicy,
  type ContractorSubtype,
  type PayrollVia,
  type PaymentCadence,
  type PaymentModel,
  type RateType,
  type RelationshipSubtype,
  type TaxComplianceOwner
} from '@/lib/contractor-engagements/onboarding-wizard-options'
import type {
  ExecutedOffboardingItem,
  OnboardingResolveResult,
  OperatingEntitySummary,
  PersonSearchItem
} from '@/lib/contractor-engagements/onboarding-wizard-types'
import { formatCurrency, formatDate } from '@/lib/format'
import { AnimatePresence, motion } from '@/libs/FramerMotion'

const O = C.onboarding
const aria = getMicrocopy('es-CL').aria

// =============================================================================
// Props + form state
// =============================================================================

interface Props {
  initialExecutedCases: ExecutedOffboardingItem[]
  operatingEntity: OperatingEntitySummary | null
  canCreate: boolean
  canManage: boolean
}

type WizardPath = 'from_offboarding' | 'new_contractor'

// Tax owner is optional → '' sentinel for "not set".
type TaxComplianceOwnerValue = '' | TaxComplianceOwner

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

const personLabel = (p: { fullName: string | null; canonicalEmail: string | null }): string =>
  p.fullName?.trim() || p.canonicalEmail?.trim() || '—'

// Path A resolve branch (mirror the mockup's PersonOutcome).
type ResolveBranch =
  | { kind: 'has_contractor_relationship'; relationshipId: string; legalEntityOrganizationId: string; legalEntityLabel: string }
  | { kind: 'has_executed_offboarding'; offboardingCaseId: string; publicId: string }
  | { kind: 'no_relationship' }

const deriveResolveBranch = (
  result: OnboardingResolveResult,
  operatingEntity: OperatingEntitySummary | null
): ResolveBranch => {
  if (result.contractorRelationship) {
    return {
      kind: 'has_contractor_relationship',
      relationshipId: result.contractorRelationship.relationshipId,
      legalEntityOrganizationId: result.contractorRelationship.legalEntityOrganizationId,
      legalEntityLabel: result.contractorRelationship.legalEntityName ?? operatingEntity?.legalName ?? '—'
    }
  }

  if (result.executedOffboarding) {
    return {
      kind: 'has_executed_offboarding',
      offboardingCaseId: result.executedOffboarding.offboardingCaseId,
      publicId: result.executedOffboarding.publicId
    }
  }

  return { kind: 'no_relationship' }
}

// Submit outcome (real server response status).
type PathBStatus = 'transitioned' | 'engagement_created_on_existing_relationship' | 'already_complete'

interface SubmitOutcome {
  path: WizardPath
  status: PathBStatus | 'created'
  engagementPublicId: string | null
  /** TASK-985 — lifecycle real del engagement resultante (active = quedó activo). */
  engagementStatus: string | null
  subjectName: string
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

const ContractorOnboardingWizard = ({ initialExecutedCases, operatingEntity, canCreate, canManage }: Props) => {
  const prefersReduced = useReducedMotion()
  const router = useRouter()

  // --- Path + step state -----------------------------------------------------
  const [path, setPath] = useState<WizardPath | null>(null)
  const [activeStep, setActiveStep] = useState(0)

  // --- Path B: offboarding pick ----------------------------------------------
  const [selectedOffboardingId, setSelectedOffboardingId] = useState<string | null>(null)

  const selectedOffboarding = useMemo<ExecutedOffboardingItem | null>(
    () => initialExecutedCases.find(o => o.offboardingCaseId === selectedOffboardingId) ?? null,
    [initialExecutedCases, selectedOffboardingId]
  )

  // --- Path A: person search (debounced) + resolve ---------------------------
  const [personQuery, setPersonQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PersonSearchItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<PersonSearchItem | null>(null)

  const [resolveLoading, setResolveLoading] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [resolveBranch, setResolveBranch] = useState<ResolveBranch | null>(null)

  // --- Terms form (preserved across back/forward) ----------------------------
  const [terms, setTerms] = useState<TermsFormState>(INITIAL_TERMS)

  const updateTerms = <K extends keyof TermsFormState>(key: K, value: TermsFormState[K]) =>
    setTerms(prev => ({ ...prev, [key]: value }))

  // --- Validation touch flag -------------------------------------------------
  const [termsTouched, setTermsTouched] = useState(false)

  // --- Submission state ('idle' | 'submitting' | 'done') ---------------------
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null)

  // --- Debounced person search -----------------------------------------------
  useEffect(() => {
    if (path !== 'new_contractor') return

    const q = personQuery.trim()

    if (q.length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      setSearchError(null)

      return
    }

    let cancelled = false

    setSearchLoading(true)
    setSearchError(null)

    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/organizations/people-search?q=${encodeURIComponent(q)}`)

        await throwIfNotOk(res, O.searchError)
        const payload = (await res.json()) as { items?: PersonSearchItem[] }

        if (!cancelled) setSearchResults(Array.isArray(payload.items) ? payload.items : [])
      } catch (err) {
        if (!cancelled) {
          setSearchResults([])
          setSearchError(err instanceof Error ? err.message : O.searchError)
        }
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [personQuery, path])

  // --- Resolve a selected person ---------------------------------------------
  const resolvePerson = async (person: PersonSearchItem) => {
    setSelectedPerson(person)
    setResolveBranch(null)
    setResolveError(null)
    setResolveLoading(true)

    try {
      const res = await fetch(`/api/hr/contractors/onboarding/resolve?profileId=${encodeURIComponent(person.profileId)}`)

      await throwIfNotOk(res, O.resolveError)
      const payload = (await res.json()) as OnboardingResolveResult

      setResolveBranch(deriveResolveBranch(payload, operatingEntity))
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : O.resolveError)
    } finally {
      setResolveLoading(false)
    }
  }

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
    Boolean(selectedOffboarding?.lastWorkingDay) &&
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
      if (activeStep === 1) return resolveBranch?.kind === 'has_contractor_relationship'
      if (activeStep === 2) return Boolean(terms.startDate)
    }

    return true
  }, [
    activeStep,
    path,
    selectedOffboardingId,
    resolveBranch,
    terms.effectiveFrom,
    terms.startDate,
    effectiveFromInvalid,
    reasonInvalid
  ])

  const isLastStep = activeStep === stepLabels.length - 1

  // Submit is permission-gated per path.
  const submitAllowed = path === 'from_offboarding' ? canManage : canCreate

  const handleNext = () => {
    setTermsTouched(true)
    if (!canAdvance) return
    setActiveStep(s => s + 1)
  }

  const handleBack = () => {
    setSubmitError(null)
    setActiveStep(s => Math.max(0, s - 1))
  }

  const handleSelectPath = (next: WizardPath) => {
    setPath(next)
    setActiveStep(0)
    setSubmitError(null)
  }

  // Derive Path A → Path B with the offboarding case preselected.
  const handleDeriveToPathB = (offboardingCaseId: string) => {
    setSelectedOffboardingId(offboardingCaseId)
    setPath('from_offboarding')
    setActiveStep(1)
    setSubmitError(null)
  }

  // --- Submit ----------------------------------------------------------------
  const handleSubmit = async () => {
    if (!path || !submitAllowed || submitState === 'submitting') return

    setSubmitState('submitting')
    setSubmitError(null)

    try {
      if (path === 'from_offboarding') {
        if (!selectedOffboarding) throw new Error(O.submitError)

        const res = await fetch('/api/hr/contractors/transition-from-offboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offboardingCaseId: selectedOffboarding.offboardingCaseId,
            contractorEffectiveFrom: terms.effectiveFrom,
            reason: terms.reason.trim(),
            contractorSubtype: terms.contractorSubtype,
            engagement: {
              payrollVia: terms.payrollVia,
              paymentModel: terms.paymentModel,
              rateType: terms.rateType,
              paymentCadence: terms.paymentCadence,
              rateAmount: rateAmount ?? undefined,
              currency: terms.currency,
              requiresInvoice: terms.requiresInvoice,
              requiresWorkApproval: terms.requiresWorkApproval,
              taxComplianceOwner: terms.taxComplianceOwner || undefined
            }
          })
        })

        await throwIfNotOk(res, O.submitError)

        const payload = (await res.json()) as {
          status?: PathBStatus
          engagement?: { publicId?: string | null; status?: string | null } | null
        }

        setOutcome({
          path: 'from_offboarding',
          status: payload.status ?? 'transitioned',
          engagementPublicId: payload.engagement?.publicId ?? null,
          engagementStatus: payload.engagement?.status ?? null,
          subjectName: selectedOffboarding.personName
        })
      } else {
        // Path A — requires a resolved contractor relationship.
        if (resolveBranch?.kind !== 'has_contractor_relationship' || !selectedPerson) {
          throw new Error(O.submitError)
        }

        const relationshipSubtype = terms.relationshipSubtype

        const res = await fetch('/api/hr/contractors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileId: selectedPerson.profileId,
            personLegalEntityRelationshipId: resolveBranch.relationshipId,
            legalEntityOrganizationId: resolveBranch.legalEntityOrganizationId,
            countryCode: 'CL',
            relationshipSubtype,
            payrollVia: terms.payrollVia,
            currency: terms.currency,
            paymentModel: terms.paymentModel,
            rateType: terms.rateType,
            paymentCadence: terms.paymentCadence,
            startDate: terms.startDate,
            rateAmount: rateAmount ?? undefined,
            requiresInvoice: terms.requiresInvoice,
            requiresWorkApproval: terms.requiresWorkApproval,
            taxComplianceOwner: terms.taxComplianceOwner || undefined,
            bonusPolicy: terms.bonusPolicy
          })
        })

        await throwIfNotOk(res, O.submitError)

        const payload = (await res.json()) as {
          engagement?: { publicId?: string | null; status?: string | null } | null
        }

        setOutcome({
          path: 'new_contractor',
          status: 'created',
          engagementPublicId: payload.engagement?.publicId ?? null,
          engagementStatus: payload.engagement?.status ?? null,
          subjectName: personLabel(selectedPerson)
        })
      }

      setSubmitState('done')
    } catch (err) {
      setSubmitState('idle')
      setSubmitError(err instanceof Error ? err.message : O.submitError)
    }
  }

  const resetWizard = () => {
    setPath(null)
    setActiveStep(0)
    setSelectedOffboardingId(null)
    setPersonQuery('')
    setSearchResults([])
    setSearchError(null)
    setSelectedPerson(null)
    setResolveBranch(null)
    setResolveError(null)
    setTerms(INITIAL_TERMS)
    setTermsTouched(false)
    setSubmitState('idle')
    setSubmitError(null)
    setOutcome(null)
  }

  // Reset terms-touched when leaving the terms step.
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
    if (submitState === 'done' && outcome) {
      return <OutcomePanel outcome={outcome} />
    }

    if (activeStep === 0) {
      return <TypeStep path={path} onSelect={handleSelectPath} />
    }

    if (path === 'from_offboarding') {
      if (activeStep === 1) {
        return (
          <OffboardingStep
            cases={initialExecutedCases}
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
            personName={null}
            operatingEntity={operatingEntity}
            effectiveFromInvalid={effectiveFromInvalid}
            reasonInvalid={reasonInvalid}
          />
        )
      }

      return (
        <ConfirmStep
          path={path}
          offboarding={selectedOffboarding}
          personName={null}
          operatingEntity={operatingEntity}
          terms={terms}
          rateAmount={rateAmount}
        />
      )
    }

    if (path === 'new_contractor') {
      if (activeStep === 1) {
        return (
          <PersonStep
            query={personQuery}
            setQuery={setPersonQuery}
            results={searchResults}
            searchLoading={searchLoading}
            searchError={searchError}
            selectedId={selectedPerson?.profileId ?? null}
            onSelect={resolvePerson}
            resolveLoading={resolveLoading}
            resolveError={resolveError}
            branch={resolveBranch}
            onDeriveToB={handleDeriveToPathB}
            showError={termsTouched && resolveBranch?.kind !== 'has_contractor_relationship'}
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
            personName={selectedPerson ? personLabel(selectedPerson) : null}
            operatingEntity={operatingEntity}
            effectiveFromInvalid={false}
            reasonInvalid={false}
          />
        )
      }

      return (
        <ConfirmStep
          path={path}
          offboarding={null}
          personName={selectedPerson ? personLabel(selectedPerson) : null}
          operatingEntity={operatingEntity}
          terms={terms}
          rateAmount={rateAmount}
        />
      )
    }

    return null
  }

  const submitting = submitState === 'submitting'

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
                <motion.div {...stepFade(`${path}-${activeStep}-${submitState}`)}>{renderStepBody()}</motion.div>
              </AnimatePresence>

              {/* Submit error (inline Alert, no toast) */}
              {submitError ? (
                <Alert severity='error' role='alert' sx={{ mt: 5 }} icon={<i className='tabler-alert-circle' />}>
                  {submitError}
                </Alert>
              ) : null}

              {/* Permission note when submit is blocked at the last step */}
              {isLastStep && submitState !== 'done' && !submitAllowed ? (
                <Alert severity='warning' sx={{ mt: 5 }} icon={<i className='tabler-lock' />}>
                  {path === 'from_offboarding' ? O.noManagePermissionNote : O.noCreatePermissionNote}
                </Alert>
              ) : null}

              {/* Footer nav */}
              <Divider sx={{ my: 6 }} />
              <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2} justifyContent='space-between'>
                {submitState === 'done' ? (
                  <Button
                    variant='tonal'
                    color='secondary'
                    startIcon={<i className='tabler-rotate' />}
                    onClick={resetWizard}
                  >
                    {O.onboardAnotherCta}
                  </Button>
                ) : (
                  <Button
                    variant='tonal'
                    color='secondary'
                    startIcon={<i className='tabler-arrow-left' />}
                    onClick={handleBack}
                    disabled={activeStep === 0 || submitting}
                    aria-label={aria.navigateBack}
                  >
                    {O.backCta}
                  </Button>
                )}

                {submitState === 'done' ? (
                  <Button
                    variant='contained'
                    endIcon={<i className='tabler-arrow-right' />}
                    onClick={() => router.push('/hr/contractors')}
                  >
                    {O.workbenchCta}
                  </Button>
                ) : isLastStep ? (
                  <Button
                    variant='contained'
                    startIcon={
                      submitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-user-plus' />
                    }
                    onClick={handleSubmit}
                    disabled={submitting || !submitAllowed}
                  >
                    {submitting ? O.creatingCta : O.createCta}
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
  path: WizardPath | null
  onSelect: (p: WizardPath) => void
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
  cases,
  selectedId,
  onSelect,
  showError
}: {
  cases: ExecutedOffboardingItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  showError: boolean
}) => {
  const theme = useTheme()

  if (cases.length === 0) {
    return (
      <Box>
        <StepHeading title={O.pickOffboardingTitle} subtitle={O.pickOffboardingSubtitle} />
        <EmptyState
          icon='tabler-door-off'
          title={O.offboardingEmptyTitle}
          description={O.offboardingEmptyDescription}
          minHeight={220}
        />
      </Box>
    )
  }

  return (
    <Box>
      <StepHeading title={O.pickOffboardingTitle} subtitle={O.pickOffboardingSubtitle} />
      <Stack spacing={3}>
        {cases.map(o => {
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
                      {O.offboardingLastDay}:{' '}
                      {o.lastWorkingDay ? formatDate(o.lastWorkingDay, { dateStyle: 'medium' }, 'es-CL') : '—'}
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
  searchLoading,
  searchError,
  selectedId,
  onSelect,
  resolveLoading,
  resolveError,
  branch,
  onDeriveToB,
  showError
}: {
  query: string
  setQuery: (v: string) => void
  results: PersonSearchItem[]
  searchLoading: boolean
  searchError: string | null
  selectedId: string | null
  onSelect: (p: PersonSearchItem) => void
  resolveLoading: boolean
  resolveError: string | null
  branch: ResolveBranch | null
  onDeriveToB: (offboardingCaseId: string) => void
  showError: boolean
}) => {
  const theme = useTheme()
  const trimmed = query.trim()

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
            ),
            endAdornment: searchLoading ? (
              <InputAdornment position='end'>
                <CircularProgress size={16} color='inherit' />
              </InputAdornment>
            ) : null
          }
        }}
      />

      <Stack spacing={2} sx={{ mt: 4 }}>
        {trimmed.length > 0 && trimmed.length < 2 ? (
          <Typography variant='body2' sx={{ color: 'text.secondary', py: 3 }}>
            {O.searchMinCharsHint}
          </Typography>
        ) : searchError ? (
          <Typography role='alert' variant='body2' sx={{ color: 'error.main', py: 3 }}>
            {searchError}
          </Typography>
        ) : !searchLoading && trimmed.length >= 2 && results.length === 0 ? (
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
                onClick={() => onSelect(p)}
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
                      {p.fullName?.trim() || personLabel(p)}
                    </Typography>
                    {p.canonicalEmail ? (
                      <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                        {p.canonicalEmail}
                      </Typography>
                    ) : null}
                  </Box>
                </Stack>
              </Box>
            )
          })
        )}
      </Stack>

      {/* Resolve outcome */}
      {resolveLoading ? (
        <Stack direction='row' spacing={2} alignItems='center' sx={{ mt: 5, color: 'text.secondary' }}>
          <CircularProgress size={18} color='inherit' />
          <Typography variant='body2'>{O.personResolving}</Typography>
        </Stack>
      ) : resolveError ? (
        <Alert severity='error' role='alert' sx={{ mt: 5 }} icon={<i className='tabler-alert-circle' />}>
          {resolveError}
        </Alert>
      ) : branch ? (
        <Box sx={{ mt: 5 }}>
          {branch.kind === 'has_contractor_relationship' ? (
            <Alert severity='success' icon={<i className='tabler-circle-check' />}>
              <AlertTitle sx={{ fontWeight: 600 }}>{O.resolveOkTitle}</AlertTitle>
              {O.resolveOkDescription}
              <Box sx={{ mt: 1.5 }}>
                <SummaryRow label={O.resolveRelationLabel} value={branch.legalEntityLabel} />
              </Box>
            </Alert>
          ) : branch.kind === 'has_executed_offboarding' ? (
            <Alert
              severity='info'
              icon={<i className='tabler-arrows-exchange' />}
              action={
                <Button size='small' color='inherit' onClick={() => onDeriveToB(branch.offboardingCaseId)}>
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

      {showError && !branch && !resolveLoading ? (
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
  personName,
  operatingEntity,
  effectiveFromInvalid,
  reasonInvalid
}: {
  path: WizardPath
  terms: TermsFormState
  updateTerms: <K extends keyof TermsFormState>(key: K, value: TermsFormState[K]) => void
  rateAmount: number | null
  touched: boolean
  offboarding: ExecutedOffboardingItem | null
  personName: string | null
  operatingEntity: OperatingEntitySummary | null
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
        <SummaryRow label={O.resolvedPersonLabel} value={isB ? offboarding?.personName ?? '—' : personName ?? '—'} />
        <SummaryRow label={O.operatingEntityLabel} value={operatingEntity?.legalName ?? '—'} />
        {isB ? (
          <SummaryRow
            label={O.offboardingLastDay}
            value={
              offboarding?.lastWorkingDay
                ? formatDate(offboarding.lastWorkingDay, { dateStyle: 'medium' }, 'es-CL')
                : '—'
            }
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
                    offboarding?.lastWorkingDay
                      ? formatDate(offboarding.lastWorkingDay, { dateStyle: 'medium' }, 'es-CL')
                      : '—'
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

        {/* bonusPolicy is only sent on Path A (createContractorEngagement); the
            transition command does not accept it. Hide on Path B. */}
        {!isB ? (
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
        ) : null}

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
// Step 4 — confirmation
// =============================================================================

const ConfirmStep = ({
  path,
  offboarding,
  personName,
  operatingEntity,
  terms,
  rateAmount
}: {
  path: WizardPath
  offboarding: ExecutedOffboardingItem | null
  personName: string | null
  operatingEntity: OperatingEntitySummary | null
  terms: TermsFormState
  rateAmount: number | null
}) => {
  const isB = path === 'from_offboarding'

  return (
    <Box>
      <StepHeading title={isB ? O.confirmTitleB : O.confirmTitleA} subtitle={isB ? O.confirmSubtitleB : O.confirmSubtitleA} />

      {/* Summary */}
      <Box sx={{ mb: 5 }}>
        <SummaryRow label={O.resolvedPersonLabel} value={isB ? offboarding?.personName ?? '—' : personName ?? '—'} />
        <SummaryRow label={O.operatingEntityLabel} value={operatingEntity?.legalName ?? '—'} />
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
      <Stack spacing={2}>
        <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
          {O.confirmWillHappen}
        </Typography>
        {(isB
          ? [O.confirmStepCloseEmployee, O.confirmStepOpenContractor, O.confirmStepCreateEngagement, O.confirmStepDraftReview]
          : [O.confirmStepCreateEngagementA, O.confirmStepDraftReview]
        ).map(line => (
          <Stack key={line} direction='row' spacing={2} alignItems='flex-start'>
            <i
              className='tabler-circle-check'
              style={{ fontSize: 18, marginTop: 2, color: 'var(--mui-palette-success-main)' }}
              aria-hidden
            />
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {line}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}

// =============================================================================
// Outcome panel (success state after submit)
// =============================================================================

const OutcomePanel = ({ outcome }: { outcome: SubmitOutcome }) => {
  const prefersReduced = useReducedMotion()
  const isB = outcome.path === 'from_offboarding'
  // TASK-985 — el engagement se auto-activa si la clasificación no es bloqueante.
  const activated = outcome.engagementStatus === 'active'

  const { severity, icon, title, description } = isB
    ? {
        severity: outcome.status === 'already_complete' ? ('info' as const) : ('success' as const),
        icon:
          outcome.status === 'transitioned'
            ? 'tabler-user-check'
            : outcome.status === 'engagement_created_on_existing_relationship'
              ? 'tabler-link'
              : 'tabler-check',
        title:
          outcome.status === 'transitioned'
            ? O.outcomeTransitionedTitle
            : outcome.status === 'engagement_created_on_existing_relationship'
              ? O.outcomeEngagementTitle
              : O.outcomeAlreadyTitle,
        description:
          outcome.status === 'transitioned'
            ? O.outcomeTransitionedDescription
            : outcome.status === 'engagement_created_on_existing_relationship'
              ? O.outcomeEngagementDescription
              : O.outcomeAlreadyDescription
      }
    : {
        severity: 'success' as const,
        icon: 'tabler-user-check',
        title: O.outcomeCreatedTitle,
        description: O.outcomeCreatedDescription
      }

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
          {outcome.subjectName ? <SummaryRow label={O.resolvedPersonLabel} value={outcome.subjectName} /> : null}
          {outcome.engagementPublicId ? (
            <SummaryRow
              label={O.outcomeEngagementId}
              value={
                <CustomChip round='true' size='small' variant='tonal' color='primary' label={outcome.engagementPublicId} />
              }
            />
          ) : null}
        </Box>

        {outcome.engagementPublicId ? (
          <Stack
            direction='row'
            spacing={2}
            alignItems='flex-start'
            sx={{ color: activated ? 'success.main' : 'text.secondary' }}
          >
            <i
              className={activated ? 'tabler-circle-check' : 'tabler-info-circle'}
              style={{ fontSize: 18, marginTop: 2 }}
              aria-hidden
            />
            <Typography variant='caption'>{activated ? O.outcomeActiveNote : O.outcomeRetainedNote}</Typography>
          </Stack>
        ) : null}
      </Stack>
    </motion.div>
  )
}

// =============================================================================
// Sidebar guidance
// =============================================================================

const GuidancePanel = ({ path }: { path: WizardPath | null }) => (
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
          {O.confirmStepDraftReview}
        </Typography>
      </Stack>
    </Stack>
  </OperationalPanel>
)

export default ContractorOnboardingWizard
