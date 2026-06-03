'use client'

// TASK-992 Slice 2b — Client Onboarding wizard RUNTIME (single front door).
// Cabled 1:1 from the APPROVED mockup (ClientOnboardingMockupView) — same JSX,
// layout, rail, stepper, footer, dialogs, microcopy and microinteractions. Only
// the data sources + commit are real: pickers + duplicate gate search the
// canonical org backbone; the Confirmar step commits atomically through the
// wizard composer (provisionClientFromWizard) and navigates to the lifecycle.
// Two-pane layout: left rail (stepper + progress + autosave), right pane (active
// step), sticky footer. 6 steps: Origen → Identidad → Comercial → Finanzas →
// Espacio → Confirmar.

import { useEffect, useMemo, useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import { toast } from 'sonner'

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
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomAutocomplete from '@core/components/mui/Autocomplete'
import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { HUBSPOT_INDUSTRIES, coerceHubspotIndustryValue, hubspotIndustryOption } from '@/config/hubspot-industries'
import EmptyState from '@/components/greenhouse/EmptyState'
import { GreenhouseDatePicker } from '@/components/greenhouse'
import useReducedMotion from '@/hooks/useReducedMotion'
import { GH_CLIENT_ONBOARDING as T } from '@/lib/copy/client-onboarding'
import { formatDate } from '@/lib/format'
import { AnimatePresence, motion } from '@/libs/FramerMotion'

import {
  COUNTRY_OPTIONS,
  CURRENCY_OPTIONS,
  ENGAGEMENT_KIND_OPTIONS,
  SPACE_TYPE_OPTIONS,
  countryByCode,
  currencyForCountry,
  engagementKindLabel,
  isTaxIdValidForCountry,
  normalizeTaxId,
  spaceTypeLabel,
  taxIdLabelForCountry,
  type CountryCode,
  type EngagementKind,
  type OnboardingOrigin,
  type SpaceType
} from '@/lib/client-onboarding/form-helpers'

// Runtime picker/dialog shapes — same fields the approved mockup renders, fed from
// real Greenhouse org search (mapped) so the dialog JSX stays byte-identical.
interface HubspotCompany {
  hubspotCompanyId: string
  name: string
  domain: string
  country: CountryCode
  lifecycleStage: string
  taxId: string | null
  /** TASK-997 Slice 1 follow-up — industria persistida (prefill del combobox). */
  industry: string | null
  /** Greenhouse org id when this result is an existing org (drives existingOrganizationId). */
  organizationId?: string
}

interface NuboxSale {
  saleId: string
  legalName: string
  taxId: string
  country: CountryCode
  currency: string
  organizationId?: string
}

interface ExistingOrg {
  organizationId: string
  publicId: string
  organizationName: string
  taxId: string
  country: CountryCode
}

// Raw row shape returned by /api/admin/clients/lifecycle/org-search.
interface OrgSearchRow {
  organizationId: string
  publicId: string | null
  organizationName: string
  legalName: string | null
  taxId: string | null
  country: string | null
  hubspotCompanyId: string | null
  lifecycleStage: string | null
  industry: string | null
}

// Result of the atomic wizard composer commit.
interface ProvisionResult {
  organizationId: string
  clientId: string | null
  caseId: string
  status: 'draft' | 'in_progress'
  clientAlreadyExisted: boolean
}

const fetchOrgSearch = async (params: string): Promise<OrgSearchRow[]> => {
  const res = await fetch(`/api/admin/clients/lifecycle/org-search?${params}`)

  if (!res.ok) throw new Error('org_search_failed')

  const data = (await res.json()) as { results: OrgSearchRow[] }

  return data.results ?? []
}

const toHubspotCompany = (row: OrgSearchRow): HubspotCompany => ({
  hubspotCompanyId: row.hubspotCompanyId ?? row.organizationId,
  name: row.organizationName,
  domain: row.legalName ?? '',
  country: (row.country ?? '') as CountryCode,
  lifecycleStage: row.lifecycleStage ?? 'prospect',
  taxId: row.taxId,
  industry: row.industry,
  organizationId: row.organizationId
})

const toNuboxSale = (row: OrgSearchRow): NuboxSale => ({
  saleId: row.publicId ?? row.organizationId,
  legalName: row.legalName ?? row.organizationName,
  taxId: row.taxId ?? '',
  country: (row.country ?? '') as CountryCode,
  currency: currencyForCountry(row.country),
  organizationId: row.organizationId
})

const toExistingOrg = (row: OrgSearchRow): ExistingOrg => ({
  organizationId: row.organizationId,
  publicId: row.publicId ?? row.organizationId,
  organizationName: row.organizationName,
  taxId: row.taxId ?? '',
  country: (row.country ?? '') as CountryCode
})

const findExistingOrgByTaxId = async (taxId: string): Promise<ExistingOrg | null> => {
  const clean = normalizeTaxId(taxId)

  if (!clean) return null

  let rows: OrgSearchRow[]

  try {
    rows = await fetchOrgSearch(`taxId=${encodeURIComponent(clean)}`)
  } catch {
    return null
  }

  const match = rows.find(r => normalizeTaxId(r.taxId ?? '') === clean) ?? rows[0]

  return match ? toExistingOrg(match) : null
}

// =============================================================================
// Form state
// =============================================================================

interface CommercialPhase {
  id: string
  name: string
  start: string
  end: string
}

interface FinanceContact {
  id: string
  name: string
  email: string
  role: string
  // TASK-997 Slice 2 — provenance (External Reference). 'hubspot' ⇒ hubspotContactId
  // apunta a la persona real en crm.contacts; 'manual' ⇒ ingresado a mano.
  hubspotContactId: string | null
  source: 'hubspot' | 'manual'
}

interface FinanceContactSuggestion {
  hubspotContactId: string
  name: string
  email: string | null
  jobTitle: string | null
}

interface NotionAnchor {
  notionDatabaseId: string
  title: string
}

interface NotionTeamspaceSuggestion {
  notionDatabaseId: string
  title: string
  parentType: string
  url: string | null
}

interface WizardState {
  origin: OnboardingOrigin | null
  hubspotCompany: HubspotCompany | null
  nuboxSale: NuboxSale | null
  // Identidad
  legalName: string
  tradeName: string
  country: CountryCode | ''
  taxId: string
  legalAddress: string
  industry: string
  // Comercial
  engagementKind: EngagementKind
  startDate: Date | null
  endDate: Date | null
  owner: string
  phases: CommercialPhase[]
  // Finanzas
  currency: string
  paymentTermsDays: string
  requiresPo: boolean
  requiresHes: boolean
  poNumber: string
  hesNumber: string
  billingAddress: string
  billingCountry: CountryCode | ''
  contacts: FinanceContact[]
  specialConditions: string
  // Space
  spaceName: string
  spaceType: SpaceType
  numericCode: string
  provisionNotion: boolean
  provisionTeams: boolean
  // TASK-997 Slice 3 — teamspace de Notion anclado (External Reference). Bases
  // existentes (Tareas/Proyectos/Sprints) elegidas del buscador; vacío ⇒ crear nuevo.
  notionAnchors: NotionAnchor[]
  // Confirmar
  reviewConfirmed: boolean
  understandConfirmed: boolean
  // Provenance — field keys currently prefilled (cleared when the user edits them)
  prefilledFields: string[]
}

const INITIAL: WizardState = {
  origin: null,
  hubspotCompany: null,
  nuboxSale: null,
  legalName: '',
  tradeName: '',
  country: '',
  taxId: '',
  legalAddress: '',
  industry: '',
  engagementKind: 'regular',
  startDate: null,
  endDate: null,
  owner: 'Julio Reyes',
  phases: [],
  currency: '',
  paymentTermsDays: '30',
  requiresPo: false,
  requiresHes: false,
  poNumber: '',
  hesNumber: '',
  billingAddress: '',
  billingCountry: '',
  contacts: [],
  specialConditions: '',
  spaceName: '',
  spaceType: 'client',
  numericCode: '',
  provisionNotion: true,
  provisionTeams: true,
  notionAnchors: [],
  reviewConfirmed: false,
  understandConfirmed: false,
  prefilledFields: []
}

// Deterministic default engagement start (no Date.now → SSR-safe). Prefill seeds it
// so the picked-from-origin flow lands with a sensible start the operator can adjust.
const DEFAULT_ENGAGEMENT_START = new Date('2026-06-15T12:00:00')

// TASK-997 Slice 2 — iniciales para el avatar del contacto (máx 2).
const contactInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() ?? '')
    .join('') || '?'

const STEP_KEYS = ['origen', 'identidad', 'comercial', 'finanzas', 'space', 'confirmar'] as const

type StepKey = (typeof STEP_KEYS)[number]

const STEP_LABELS: Record<StepKey, string> = {
  origen: T.shell.stepOrigen,
  identidad: T.shell.stepIdentidad,
  comercial: T.shell.stepComercial,
  finanzas: T.shell.stepFinanzas,
  space: T.shell.stepSpace,
  confirmar: T.shell.stepConfirmar
}

const originLabel = (o: OnboardingOrigin | null): string => {
  if (o === 'hubspot_sync') return 'HubSpot'
  if (o === 'nubox') return 'Nubox'
  if (o === 'manual') return 'Manual'

  return '—'
}

// =============================================================================
// Small presentational helpers
// =============================================================================

const StepHeading = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <Stack spacing={1} sx={{ mb: 5 }}>
    <Typography variant='h5' component='h2' sx={{ fontWeight: 600 }}>
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

// Inline inference badge — "desde HubSpot" / "auto por país".
const InferenceChip = ({ label }: { label: string }) => (
  <CustomChip
    round='true'
    size='small'
    variant='tonal'
    color='info'
    icon={<i className='tabler-sparkles' style={{ fontSize: 13 }} />}
    label={label}
    sx={{ height: 20, '& .MuiChip-label': { px: 1.5, fontSize: '0.6875rem' } }}
  />
)

// =============================================================================
// Origin card (Step 1)
// =============================================================================

const OriginCard = ({
  selected,
  icon,
  title,
  subtitle,
  detail,
  onSelect,
  dataCapture
}: {
  selected: boolean
  icon: string
  title: string
  subtitle: string
  detail: string
  onSelect: () => void
  dataCapture?: string
}) => {
  const theme = useTheme()

  return (
    <Box
      component='button'
      type='button'
      onClick={onSelect}
      role='radio'
      aria-checked={selected}
      data-capture={dataCapture}
      sx={{
        width: '100%',
        height: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        p: 4,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
        bgcolor: selected ? alpha(theme.palette.primary.main, 0.06) : 'background.paper',
        transition: 'border-color 150ms cubic-bezier(0.2,0,0,1), background-color 150ms cubic-bezier(0.2,0,0,1), transform 150ms cubic-bezier(0.2,0,0,1)',
        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover', transform: 'translateY(-2px)' },
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
// Step 1 — Origen
// =============================================================================

const OrigenStep = ({
  state,
  onSelectOrigin,
  onOpenHubspot,
  onOpenNubox,
  showError
}: {
  state: WizardState
  onSelectOrigin: (o: OnboardingOrigin) => void
  onOpenHubspot: () => void
  onOpenNubox: () => void
  showError: boolean
}) => {
  const picked =
    state.origin === 'hubspot_sync'
      ? state.hubspotCompany?.name
      : state.origin === 'nubox'
        ? state.nuboxSale?.legalName
        : null

  return (
    <Box>
      <StepHeading title={T.origen.title} subtitle={T.origen.subtitle} />
      <Grid container spacing={4} role='radiogroup' aria-label={T.origen.title}>
        <Grid size={{ xs: 12, md: 4 }}>
          <OriginCard
            selected={state.origin === 'hubspot_sync'}
            icon='tabler-brand-hipchat'
            title={T.origen.hubspotCardTitle}
            subtitle={T.origen.hubspotCardSubtitle}
            detail={T.origen.hubspotCardDetail}
            onSelect={() => onSelectOrigin('hubspot_sync')}
            dataCapture='origin-hubspot'
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <OriginCard
            selected={state.origin === 'nubox'}
            icon='tabler-file-invoice'
            title={T.origen.nuboxCardTitle}
            subtitle={T.origen.nuboxCardSubtitle}
            detail={T.origen.nuboxCardDetail}
            onSelect={() => onSelectOrigin('nubox')}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <OriginCard
            selected={state.origin === 'manual'}
            icon='tabler-pencil'
            title={T.origen.manualCardTitle}
            subtitle={T.origen.manualCardSubtitle}
            detail={T.origen.manualCardDetail}
            onSelect={() => onSelectOrigin('manual')}
          />
        </Grid>
      </Grid>

      {/* Picker CTA for HubSpot / Nubox */}
      {state.origin === 'hubspot_sync' || state.origin === 'nubox' ? (
        <Box sx={{ mt: 4 }}>
          {picked ? (
            <Alert
              severity='success'
              icon={<i className='tabler-circle-check' />}
              action={
                <Button
                  size='small'
                  color='inherit'
                  onClick={state.origin === 'hubspot_sync' ? onOpenHubspot : onOpenNubox}
                >
                  {T.origen.changeSelectionCta}
                </Button>
              }
            >
              {T.origen.pickedPrefix}: <strong>{picked}</strong>
            </Alert>
          ) : (
            <Button
              variant='contained'
              color='primary'
              startIcon={<i className='tabler-search' />}
              onClick={state.origin === 'hubspot_sync' ? onOpenHubspot : onOpenNubox}
            >
              {state.origin === 'hubspot_sync' ? T.origen.pickHubspotCta : T.origen.pickNuboxCta}
            </Button>
          )}
        </Box>
      ) : null}

      {showError ? (
        <Typography role='alert' variant='caption' sx={{ color: 'error.main', display: 'block', mt: 3 }}>
          {state.origin === null ? T.origen.error : T.origen.pickRequired}
        </Typography>
      ) : null}
    </Box>
  )
}

// =============================================================================
// Step 2 — Identidad
// =============================================================================

const IdentidadStep = ({
  state,
  update,
  touched
}: {
  state: WizardState
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
  touched: boolean
}) => {
  const fromHubspot = state.origin === 'hubspot_sync' && Boolean(state.hubspotCompany)
  const fromNubox = state.origin === 'nubox' && Boolean(state.nuboxSale)
  const identitySource = fromHubspot ? T.identidad.inferredFromHubspot : fromNubox ? T.identidad.inferredFromNubox : null

  const taxValidity = isTaxIdValidForCountry(state.taxId, state.country || null)

  const legalNameError = touched && state.legalName.trim() === ''
  const countryError = touched && state.country === ''
  const taxIdMissing = touched && state.taxId.trim() === ''
  const taxIdFormatError = touched && state.taxId.trim() !== '' && taxValidity === false

  const taxLabel = taxIdLabelForCountry(state.country || null)

  return (
    <Box>
      <StepHeading title={T.identidad.title} subtitle={T.identidad.subtitle} />

      <Stack spacing={5}>
        <Box>
          <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 1 }}>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {T.identidad.legalNameLabel}
            </Typography>
            {state.prefilledFields.includes('legalName') && identitySource ? <InferenceChip label={identitySource} /> : null}
          </Stack>
          <CustomTextField
            fullWidth
            placeholder='Ej: Pinturas Berel SA de CV'
            value={state.legalName}
            onChange={e => update('legalName', e.target.value)}
            error={legalNameError}
            helperText={legalNameError ? T.identidad.legalNameError : T.identidad.legalNameHelper}
            autoComplete='off'
            slotProps={{ input: { 'aria-label': T.identidad.legalNameLabel, 'aria-invalid': legalNameError } }}
          />
        </Box>

        <CustomTextField
          fullWidth
          label={T.identidad.tradeNameLabel}
          placeholder='Ej: Grupo Berel'
          value={state.tradeName}
          onChange={e => update('tradeName', e.target.value)}
          helperText={T.identidad.tradeNameHelper}
          autoComplete='off'
        />

        <CustomTextField
          select
          fullWidth
          label={T.identidad.countryLabel}
          value={state.country}
          onChange={e => {
            const next = e.target.value as CountryCode

            update('country', next)
            // Auto-derive currency + billing country if not yet set by the user.
            if (!state.currency) update('currency', currencyForCountry(next))
            if (!state.billingCountry) update('billingCountry', next)
          }}
          error={countryError}
          helperText={countryError ? T.identidad.countryError : T.identidad.countryHelper}
          slotProps={{ select: { displayEmpty: true } }}
        >
          <MenuItem value='' disabled>
            —
          </MenuItem>
          {COUNTRY_OPTIONS.map(c => (
            <MenuItem key={c.code} value={c.code}>
              {c.flag}&nbsp;&nbsp;{c.label}
            </MenuItem>
          ))}
        </CustomTextField>

        <Box>
          <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 1 }}>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {taxLabel}
            </Typography>
            {state.prefilledFields.includes('taxId') && identitySource ? <InferenceChip label={identitySource} /> : null}
          </Stack>
          <CustomTextField
            fullWidth
            placeholder={countryByCode(state.country || null)?.taxIdHint ?? T.identidad.taxIdLabelGeneric}
            value={state.taxId}
            onChange={e => update('taxId', e.target.value)}
            error={taxIdMissing || taxIdFormatError}
            helperText={
              taxIdMissing
                ? T.identidad.taxIdErrorMissing
                : taxIdFormatError
                  ? T.identidad.taxIdErrorFormat
                    .replace('{taxIdLabel}', taxLabel)
                    .replace('{country}', countryByCode(state.country || null)?.label ?? '')
                  : T.identidad.taxIdHelper
            }
            autoComplete='off'
            slotProps={{
              input: {
                'aria-label': taxLabel,
                'aria-invalid': taxIdMissing || taxIdFormatError,
                endAdornment:
                  taxValidity === true ? (
                    <InputAdornment position='end'>
                      <Stack direction='row' spacing={0.5} alignItems='center' sx={{ color: 'success.main' }}>
                        <i className='tabler-circle-check-filled' style={{ fontSize: 16 }} aria-hidden />
                        <Typography variant='caption' sx={{ color: 'success.main' }}>
                          {T.identidad.taxIdValid}
                        </Typography>
                      </Stack>
                    </InputAdornment>
                  ) : null
              }
            }}
          />
        </Box>

        <CustomTextField
          fullWidth
          label={T.identidad.legalAddressLabel}
          value={state.legalAddress}
          onChange={e => update('legalAddress', e.target.value)}
          helperText={T.identidad.legalAddressHelper}
          autoComplete='off'
        />

        <CustomAutocomplete
          fullWidth
          autoHighlight
          options={HUBSPOT_INDUSTRIES}
          getOptionLabel={option => option.label}
          isOptionEqualToValue={(option, value) => option.value === value.value}
          value={hubspotIndustryOption(state.industry)}
          onChange={(_, option) => update('industry', option?.value ?? '')}
          renderInput={params => (
            <CustomTextField
              {...params}
              label={T.identidad.industryLabel}
              helperText={T.identidad.industryHelper}
              placeholder={T.identidad.industryPlaceholder}
            />
          )}
        />
      </Stack>
    </Box>
  )
}

// =============================================================================
// Step 3 — Comercial
// =============================================================================

const PHASE_PRESETS = ['Kickoff', 'Operación', 'Reporte', 'Decisión']

const ComercialStep = ({
  state,
  update,
  touched
}: {
  state: WizardState
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
  touched: boolean
}) => {
  const theme = useTheme()
  const [phaseDraft, setPhaseDraft] = useState<{ name: string; start: string; end: string }>({ name: '', start: '', end: '' })
  const [adding, setAdding] = useState(false)

  const startDateError = touched && state.startDate === null
  const endDateError = state.endDate !== null && state.startDate !== null && state.endDate < state.startDate

  const addPhase = () => {
    if (!phaseDraft.name.trim()) return
    update('phases', [
      ...state.phases,
      { id: `phase-${state.phases.length + 1}-${phaseDraft.name}`, name: phaseDraft.name.trim(), start: phaseDraft.start, end: phaseDraft.end }
    ])
    setPhaseDraft({ name: '', start: '', end: '' })
    setAdding(false)
  }

  const removePhase = (id: string) => update('phases', state.phases.filter(p => p.id !== id))

  return (
    <Box>
      <StepHeading title={T.comercial.title} subtitle={T.comercial.subtitle} />

      {/* Resolved context */}
      <Box
        sx={{
          p: 4,
          mb: 5,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          bgcolor: alpha(theme.palette.secondary.main, 0.04),
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <SummaryRow label={T.identidad.legalNameLabel} value={state.legalName || '—'} />
        <SummaryRow label={T.comercial.ownerLabel} value={state.owner} />
      </Box>

      <Stack spacing={5}>
        <CustomTextField
          select
          fullWidth
          label={T.comercial.engagementKindLabel}
          helperText={T.comercial.engagementKindHelper}
          value={state.engagementKind}
          onChange={e => update('engagementKind', e.target.value as EngagementKind)}
        >
          {ENGAGEMENT_KIND_OPTIONS.map(k => (
            <MenuItem key={k} value={k}>
              {engagementKindLabel(k)}
            </MenuItem>
          ))}
        </CustomTextField>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <GreenhouseDatePicker
              label={T.comercial.startDateLabel}
              value={state.startDate}
              onChange={d => update('startDate', d)}
              error={startDateError}
              helperText={startDateError ? T.comercial.startDateError : T.comercial.startDateHelper}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <GreenhouseDatePicker
              label={T.comercial.endDateLabel}
              value={state.endDate}
              onChange={d => update('endDate', d)}
              error={endDateError}
              helperText={endDateError ? T.comercial.endDateError : T.comercial.endDateHelper}
              minDate={state.startDate ?? undefined}
            />
          </Grid>
        </Grid>

        {/* Phases */}
        <Box>
          <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1 }}>
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {T.comercial.phasesTitle}
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                {T.comercial.phasesSubtitle}
              </Typography>
            </Box>
            {!adding ? (
              <Button size='small' variant='tonal' color='secondary' startIcon={<i className='tabler-plus' />} onClick={() => setAdding(true)}>
                {T.comercial.addPhaseCta}
              </Button>
            ) : null}
          </Stack>

          {state.phases.length === 0 && !adding ? (
            <Typography variant='caption' sx={{ color: 'text.disabled', display: 'block', mt: 2 }}>
              {T.comercial.phasesEmpty}
            </Typography>
          ) : null}

          <Stack spacing={2} sx={{ mt: 2 }}>
            {state.phases.map(p => (
              <Stack
                key={p.id}
                direction='row'
                spacing={2}
                alignItems='center'
                sx={{
                  p: 2.5,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: 'background.paper'
                }}
              >
                <i className='tabler-flag' style={{ fontSize: 18, color: theme.palette.text.secondary }} aria-hidden />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>
                    {p.name}
                  </Typography>
                  {p.start || p.end ? (
                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                      {p.start ? formatDate(p.start, { dateStyle: 'medium' }, 'es-CL') : '—'}
                      {' → '}
                      {p.end ? formatDate(p.end, { dateStyle: 'medium' }, 'es-CL') : '—'}
                    </Typography>
                  ) : null}
                </Box>
                <IconButton size='small' onClick={() => removePhase(p.id)} aria-label={T.comercial.removePhaseAria}>
                  <i className='tabler-x' style={{ fontSize: 16 }} />
                </IconButton>
              </Stack>
            ))}
          </Stack>

          {adding ? (
            <Box
              sx={{
                mt: 2,
                p: 3,
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                border: `1px dashed ${theme.palette.divider}`,
                bgcolor: alpha(theme.palette.secondary.main, 0.02)
              }}
            >
              <Stack spacing={3}>
                <CustomTextField
                  select
                  fullWidth
                  label={T.comercial.phaseNameLabel}
                  value={phaseDraft.name}
                  onChange={e => setPhaseDraft(d => ({ ...d, name: e.target.value }))}
                >
                  {PHASE_PRESETS.map(p => (
                    <MenuItem key={p} value={p}>
                      {p}
                    </MenuItem>
                  ))}
                </CustomTextField>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 6 }}>
                    <CustomTextField
                      fullWidth
                      type='date'
                      label={T.comercial.phaseStartLabel}
                      value={phaseDraft.start}
                      onChange={e => setPhaseDraft(d => ({ ...d, start: e.target.value }))}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <CustomTextField
                      fullWidth
                      type='date'
                      label={T.comercial.phaseEndLabel}
                      value={phaseDraft.end}
                      onChange={e => setPhaseDraft(d => ({ ...d, end: e.target.value }))}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                </Grid>
                <Stack direction='row' spacing={2} justifyContent='flex-end'>
                  <Button size='small' color='secondary' onClick={() => setAdding(false)}>
                    {T.comercial.phaseCancelCta}
                  </Button>
                  <Button size='small' variant='contained' onClick={addPhase} disabled={!phaseDraft.name.trim()}>
                    {T.comercial.phaseSaveCta}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          ) : null}
        </Box>
      </Stack>
    </Box>
  )
}

// =============================================================================
// Step 4 — Finanzas
// =============================================================================

const FinanzasStep = ({
  state,
  update,
  touched
}: {
  state: WizardState
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
  touched: boolean
}) => {
  const theme = useTheme()
  const [contactDraft, setContactDraft] = useState<{ name: string; email: string; role: string }>({ name: '', email: '', role: '' })
  const [adding, setAdding] = useState(false)

  // TASK-997 Slice 2 — sugeridos de finanzas desde HubSpot (crm.contacts). Estados
  // honestos (state-design): loading / ready / degraded. La empty se infiere de
  // ready + lista vacía. El fallback manual SIEMPRE funciona ante cualquier estado.
  const hubspotCompanyId = state.hubspotCompany?.hubspotCompanyId ?? null
  const [suggestions, setSuggestions] = useState<FinanceContactSuggestion[]>([])
  const [suggestState, setSuggestState] = useState<'idle' | 'loading' | 'ready' | 'degraded'>('idle')

  useEffect(() => {
    if (!hubspotCompanyId) {
      setSuggestState('idle')
      setSuggestions([])

      return
    }

    let cancelled = false

    setSuggestState('loading')
    fetch(`/api/admin/clients/lifecycle/finance-contacts?hubspotCompanyId=${encodeURIComponent(hubspotCompanyId)}`)
      .then(res => res.json() as Promise<{ items?: FinanceContactSuggestion[]; degraded?: boolean }>)
      .then(payload => {
        if (cancelled) return

        if (payload.degraded) {
          setSuggestState('degraded')
          setSuggestions([])

          return
        }

        setSuggestions(payload.items ?? [])
        setSuggestState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setSuggestState('degraded')
        setSuggestions([])
      })

    return () => {
      cancelled = true
    }
  }, [hubspotCompanyId])

  const currencyError = touched && state.currency === ''
  const isMx = state.country === 'MX'

  const addContact = () => {
    if (!contactDraft.name.trim() || !contactDraft.email.trim()) return
    update('contacts', [
      ...state.contacts,
      {
        id: `c-${state.contacts.length + 1}`,
        name: contactDraft.name.trim(),
        email: contactDraft.email.trim(),
        role: contactDraft.role.trim(),
        hubspotContactId: null,
        source: 'manual'
      }
    ])
    setContactDraft({ name: '', email: '', role: '' })
    setAdding(false)
  }

  const addSuggested = (s: FinanceContactSuggestion) => {
    if (state.contacts.some(c => c.hubspotContactId === s.hubspotContactId)) return
    update('contacts', [
      ...state.contacts,
      {
        id: `hs-${s.hubspotContactId}`,
        name: s.name,
        email: s.email ?? '',
        role: s.jobTitle ?? '',
        hubspotContactId: s.hubspotContactId,
        source: 'hubspot'
      }
    ])
  }

  const removeContact = (id: string) => update('contacts', state.contacts.filter(c => c.id !== id))

  return (
    <Box>
      <StepHeading title={T.finanzas.title} subtitle={T.finanzas.subtitle} />

      <Stack spacing={5}>
        <Box>
          <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 1 }}>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {T.finanzas.currencyLabel}
            </Typography>
            {state.prefilledFields.includes('currency') ? <InferenceChip label={T.identidad.inferredFromCountry} /> : null}
          </Stack>
          <CustomTextField
            select
            fullWidth
            value={state.currency}
            onChange={e => update('currency', e.target.value)}
            error={currencyError}
            helperText={currencyError ? T.finanzas.currencyError : isMx ? T.finanzas.currencyMxNote : T.finanzas.currencyHelper}
            slotProps={{ select: { displayEmpty: true } }}
          >
            <MenuItem value='' disabled>
              —
            </MenuItem>
            {CURRENCY_OPTIONS.map(c => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </CustomTextField>
        </Box>

        <CustomTextField
          fullWidth
          type='number'
          label={T.finanzas.paymentTermsLabel}
          value={state.paymentTermsDays}
          onChange={e => update('paymentTermsDays', e.target.value)}
          helperText={T.finanzas.paymentTermsHelper}
          slotProps={{ input: { endAdornment: <InputAdornment position='end'>días</InputAdornment> } }}
        />

        <Stack spacing={1}>
          <FormControlLabel
            control={<Switch checked={state.requiresPo} onChange={() => update('requiresPo', !state.requiresPo)} />}
            label={T.finanzas.requiresPoLabel}
          />
          {state.requiresPo ? (
            <CustomTextField
              fullWidth
              label={T.finanzas.poNumberLabel}
              value={state.poNumber}
              onChange={e => update('poNumber', e.target.value)}
              helperText={T.finanzas.poNumberHelper}
              sx={{ mt: 1 }}
            />
          ) : null}
          <FormControlLabel
            control={<Switch checked={state.requiresHes} onChange={() => update('requiresHes', !state.requiresHes)} />}
            label={T.finanzas.requiresHesLabel}
          />
          {state.requiresHes ? (
            <CustomTextField
              fullWidth
              label={T.finanzas.hesNumberLabel}
              value={state.hesNumber}
              onChange={e => update('hesNumber', e.target.value)}
              sx={{ mt: 1 }}
            />
          ) : null}
        </Stack>

        <CustomTextField
          fullWidth
          label={T.finanzas.billingAddressLabel}
          value={state.billingAddress}
          onChange={e => update('billingAddress', e.target.value)}
          helperText={T.finanzas.billingAddressHelper}
          autoComplete='off'
        />

        {/* Finance contacts */}
        <Box>
          <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1 }}>
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {T.finanzas.contactsTitle}
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                {T.finanzas.contactsSubtitle}
              </Typography>
            </Box>
            {!adding ? (
              <Button size='small' variant='tonal' color='secondary' startIcon={<i className='tabler-plus' />} onClick={() => setAdding(true)}>
                {T.finanzas.addContactCta}
              </Button>
            ) : null}
          </Stack>

          {/* Contactos confirmados (con provenance) */}
          <Stack spacing={2} sx={{ mt: 2 }}>
            {state.contacts.map(c => (
              <Stack
                key={c.id}
                direction='row'
                spacing={2}
                alignItems='center'
                sx={{
                  p: 2.5,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  border: `1px solid ${theme.palette.divider}`
                }}
              >
                <CustomAvatar skin='light' color={c.source === 'hubspot' ? 'primary' : 'secondary'} size={34} variant='rounded'>
                  <Typography variant='caption' sx={{ fontWeight: 600 }}>{contactInitials(c.name)}</Typography>
                </CustomAvatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {c.name}
                      {c.role ? <Typography component='span' variant='caption' sx={{ color: 'text.secondary', ml: 1 }}>· {c.role}</Typography> : null}
                    </Typography>
                    {c.source === 'hubspot' ? (
                      <CustomChip size='small' variant='tonal' color='primary' round='true' label={T.finanzas.contactFromHubspotChip} />
                    ) : null}
                  </Stack>
                  <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                    {c.email}
                  </Typography>
                </Box>
                <IconButton size='small' onClick={() => removeContact(c.id)} aria-label={T.finanzas.removeContactAria}>
                  <i className='tabler-x' style={{ fontSize: 16 }} />
                </IconButton>
              </Stack>
            ))}
          </Stack>

          {state.contacts.length === 0 && !adding && suggestions.length === 0 && suggestState !== 'loading' ? (
            <Typography variant='caption' sx={{ color: 'text.disabled', display: 'block', mt: 2 }}>
              {T.finanzas.contactsEmpty}
            </Typography>
          ) : null}

          {/* TASK-997 Slice 2 — sugeridos desde HubSpot (estados honestos, filas consistentes) */}
          {hubspotCompanyId ? (
            <Box sx={{ mt: 3 }}>
              {suggestState === 'loading' ? (
                <Stack direction='row' spacing={1.5} alignItems='center' sx={{ color: 'text.secondary' }}>
                  <CircularProgress size={16} />
                  <Typography variant='caption'>{T.finanzas.contactSuggestLoading}</Typography>
                </Stack>
              ) : suggestState === 'degraded' ? (
                <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                  {T.finanzas.contactSuggestDegraded}
                </Typography>
              ) : suggestState === 'ready' && suggestions.length === 0 ? (
                <Typography variant='caption' sx={{ color: 'text.disabled', display: 'block' }}>
                  {T.finanzas.contactSuggestEmpty}
                </Typography>
              ) : suggestState === 'ready' && suggestions.length > 0 ? (
                <Box>
                  <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                    {T.finanzas.contactSuggestTitle}
                  </Typography>
                  <Stack spacing={1.5}>
                    {suggestions.map(s => {
                      const added = state.contacts.some(c => c.hubspotContactId === s.hubspotContactId)

                      return (
                        <Stack
                          key={s.hubspotContactId}
                          direction='row'
                          spacing={2}
                          alignItems='center'
                          sx={{
                            p: 2,
                            borderRadius: `${theme.shape.customBorderRadius.md}px`,
                            border: `1px solid ${theme.palette.divider}`,
                            bgcolor: alpha(theme.palette.primary.main, 0.02)
                          }}
                        >
                          <CustomAvatar skin='light' color='primary' size={32} variant='rounded'>
                            <Typography variant='caption' sx={{ fontWeight: 600 }}>{contactInitials(s.name)}</Typography>
                          </CustomAvatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant='body2' sx={{ fontWeight: 600 }} noWrap>
                              {s.name}
                              {s.jobTitle ? <Typography component='span' variant='caption' sx={{ color: 'text.secondary', ml: 1 }}>· {s.jobTitle}</Typography> : null}
                            </Typography>
                            {s.email ? (
                              <Typography variant='caption' sx={{ color: 'text.secondary' }} noWrap>{s.email}</Typography>
                            ) : null}
                          </Box>
                          <Button
                            size='small'
                            variant={added ? 'tonal' : 'outlined'}
                            color={added ? 'success' : 'primary'}
                            disabled={added}
                            startIcon={<i className={added ? 'tabler-check' : 'tabler-plus'} style={{ fontSize: 14 }} />}
                            onClick={() => addSuggested(s)}
                          >
                            {added ? T.finanzas.contactAddedCta : T.finanzas.contactAddSuggestedCta}
                          </Button>
                        </Stack>
                      )
                    })}
                  </Stack>
                </Box>
              ) : null}
            </Box>
          ) : null}

          {adding ? (
            <Box
              sx={{
                mt: 2,
                p: 3,
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                border: `1px dashed ${theme.palette.divider}`,
                bgcolor: alpha(theme.palette.secondary.main, 0.02)
              }}
            >
              <Stack spacing={3}>
                <CustomTextField fullWidth label={T.finanzas.contactNameLabel} value={contactDraft.name} onChange={e => setContactDraft(d => ({ ...d, name: e.target.value }))} autoComplete='off' />
                <CustomTextField fullWidth type='email' label={T.finanzas.contactEmailLabel} value={contactDraft.email} onChange={e => setContactDraft(d => ({ ...d, email: e.target.value }))} autoComplete='off' />
                <CustomTextField fullWidth label={T.finanzas.contactRoleLabel} value={contactDraft.role} onChange={e => setContactDraft(d => ({ ...d, role: e.target.value }))} autoComplete='off' />
                <Stack direction='row' spacing={2} justifyContent='flex-end'>
                  <Button size='small' color='secondary' onClick={() => setAdding(false)}>
                    {T.finanzas.contactCancelCta}
                  </Button>
                  <Button size='small' variant='contained' onClick={addContact} disabled={!contactDraft.name.trim() || !contactDraft.email.trim()}>
                    {T.finanzas.contactSaveCta}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          ) : null}
        </Box>

        <CustomTextField
          fullWidth
          multiline
          minRows={2}
          label={T.finanzas.specialConditionsLabel}
          value={state.specialConditions}
          onChange={e => update('specialConditions', e.target.value)}
          helperText={T.finanzas.specialConditionsHelper}
        />
      </Stack>
    </Box>
  )
}

// =============================================================================
// Step 5 — Espacio
// =============================================================================

const SpaceStep = ({
  state,
  update,
  touched
}: {
  state: WizardState
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
  touched: boolean
}) => {
  const theme = useTheme()

  const spaceNameError = touched && state.spaceName.trim() === ''
  const numericCodeError = touched && !/^\d{2}$/.test(state.numericCode)

  // TASK-997 Slice 3 — buscador de teamspace Notion (External Reference). Debounced
  // async contra /v1/search; estados honestos (loading/ready/degraded). Anclar bases
  // existentes evita crear un teamspace duplicado.
  const [notionQuery, setNotionQuery] = useState('')
  const [notionResults, setNotionResults] = useState<NotionTeamspaceSuggestion[]>([])
  const [notionState, setNotionState] = useState<'idle' | 'loading' | 'ready' | 'degraded'>('idle')

  useEffect(() => {
    const q = notionQuery.trim()

    if (q.length < 2) {
      setNotionState('idle')
      setNotionResults([])

      return
    }

    let cancelled = false

    const handle = setTimeout(() => {
      setNotionState('loading')
      fetch(`/api/admin/clients/lifecycle/notion-teamspaces?q=${encodeURIComponent(q)}`)
        .then(res => res.json() as Promise<{ items?: NotionTeamspaceSuggestion[]; degraded?: boolean }>)
        .then(payload => {
          if (cancelled) return

          if (payload.degraded) {
            setNotionState('degraded')
            setNotionResults([])

            return
          }

          setNotionResults(payload.items ?? [])
          setNotionState('ready')
        })
        .catch(() => {
          if (cancelled) return
          setNotionState('degraded')
          setNotionResults([])
        })
    }, 280)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [notionQuery])

  const hasNotionAnchors = state.notionAnchors.length > 0

  return (
    <Box>
      <StepHeading title={T.space.title} subtitle={T.space.subtitle} />

      <Stack spacing={5}>
        <CustomTextField
          fullWidth
          label={T.space.spaceNameLabel}
          value={state.spaceName}
          onChange={e => update('spaceName', e.target.value)}
          error={spaceNameError}
          helperText={spaceNameError ? T.space.spaceNameError : T.space.spaceNameHelper}
          autoComplete='off'
          slotProps={{ input: { 'aria-invalid': spaceNameError } }}
        />

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              label={T.space.spaceTypeLabel}
              value={state.spaceType}
              onChange={e => update('spaceType', e.target.value as SpaceType)}
            >
              {SPACE_TYPE_OPTIONS.map(s => (
                <MenuItem key={s} value={s}>
                  {spaceTypeLabel(s)}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              label={T.space.numericCodeLabel}
              value={state.numericCode}
              onChange={e => update('numericCode', e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
              error={numericCodeError}
              helperText={numericCodeError ? T.space.numericCodeError : T.space.numericCodeHelper}
              inputMode='numeric'
              placeholder='07'
              slotProps={{ htmlInput: { 'data-capture': 'numeric-code' } }}
            />
          </Grid>
        </Grid>

        <Box
          sx={{
            p: 4,
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.secondary.main, 0.04)
          }}
        >
          <Typography variant='body2' sx={{ fontWeight: 600 }}>
            {T.space.provisionTitle}
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {T.space.provisionSubtitle}
          </Typography>

          {/* TASK-997 Slice 3 — anclar teamspace de Notion existente (External Reference) */}
          <Box sx={{ mt: 3 }}>
            <CustomAutocomplete
              multiple
              fullWidth
              options={notionResults}
              value={state.notionAnchors}
              filterOptions={x => x}
              loading={notionState === 'loading'}
              getOptionLabel={option => option.title}
              isOptionEqualToValue={(option, value) => option.notionDatabaseId === value.notionDatabaseId}
              onInputChange={(_, v) => setNotionQuery(v)}
              onChange={(_, value) =>
                update(
                  'notionAnchors',
                  value.map(v => ({ notionDatabaseId: v.notionDatabaseId, title: v.title }))
                )
              }
              noOptionsText={notionState === 'degraded' ? T.space.notionSearchDegraded : T.space.notionSearchEmpty}
              renderInput={params => (
                <CustomTextField
                  {...params}
                  label={T.space.notionSearchLabel}
                  placeholder={T.space.notionSearchPlaceholder}
                  helperText={notionState === 'degraded' ? T.space.notionSearchDegraded : T.space.notionSearchHelper}
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {notionState === 'loading' ? <CircularProgress size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      )
                    }
                  }}
                />
              )}
            />
          </Box>

          <Stack spacing={1} sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={state.provisionNotion && !hasNotionAnchors}
                  disabled={hasNotionAnchors}
                  onChange={() => update('provisionNotion', !state.provisionNotion)}
                />
              }
              label={hasNotionAnchors ? T.space.provisionNotionAnchoredLabel : T.space.provisionNotionLabel}
            />
            <FormControlLabel
              control={<Switch checked={state.provisionTeams} onChange={() => update('provisionTeams', !state.provisionTeams)} />}
              label={T.space.provisionTeamsLabel}
            />
          </Stack>
          <Stack direction='row' spacing={2} alignItems='flex-start' sx={{ mt: 2, color: 'text.secondary' }}>
            <i className='tabler-info-circle' style={{ fontSize: 16, marginTop: 2 }} aria-hidden />
            <Typography variant='caption'>{T.space.provisionNote}</Typography>
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}

// =============================================================================
// Step 6 — Confirmar
// =============================================================================

const ConfirmarStep = ({
  state,
  update,
  onEditStep
}: {
  state: WizardState
  update: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
  onEditStep: (index: number) => void
}) => {
  const theme = useTheme()
  const taxLabel = taxIdLabelForCountry(state.country || null)

  const Section = ({ title, stepIndex, children }: { title: string; stepIndex: number; children: React.ReactNode }) => (
    <Box
      sx={{
        p: 4,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.paper'
      }}
    >
      <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1 }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Button size='small' color='secondary' startIcon={<i className='tabler-pencil' style={{ fontSize: 14 }} />} onClick={() => onEditStep(stepIndex)} aria-label={`${T.confirmar.editStepAria} ${title}`}>
          {T.confirmar.editCta}
        </Button>
      </Stack>
      {children}
    </Box>
  )

  return (
    <Box>
      <StepHeading title={T.confirmar.title} subtitle={T.confirmar.subtitle} />

      <Stack spacing={3} sx={{ mb: 5 }}>
        <Section title={T.confirmar.sectionOrigen} stepIndex={0}>
          <SummaryRow label={T.shell.originChipPrefix} value={originLabel(state.origin)} />
        </Section>
        <Section title={T.confirmar.sectionIdentidad} stepIndex={1}>
          <SummaryRow label={T.identidad.legalNameLabel} value={state.legalName || T.confirmar.notSet} />
          <SummaryRow label={T.identidad.countryLabel} value={countryByCode(state.country || null)?.label ?? T.confirmar.notSet} />
          <SummaryRow label={taxLabel} value={state.taxId || T.confirmar.notSet} />
        </Section>
        <Section title={T.confirmar.sectionComercial} stepIndex={2}>
          <SummaryRow label={T.comercial.engagementKindLabel} value={engagementKindLabel(state.engagementKind)} />
          <SummaryRow label={T.comercial.startDateLabel} value={state.startDate ? formatDate(state.startDate, { dateStyle: 'medium' }, 'es-CL') : T.confirmar.notSet} />
          <SummaryRow label={T.comercial.phasesTitle} value={state.phases.length > 0 ? state.phases.map(p => p.name).join(' · ') : T.confirmar.notSet} />
        </Section>
        <Section title={T.confirmar.sectionFinanzas} stepIndex={3}>
          <SummaryRow label={T.finanzas.currencyLabel} value={state.currency || T.confirmar.notSet} />
          <SummaryRow label={T.finanzas.paymentTermsLabel} value={state.paymentTermsDays ? `${state.paymentTermsDays} días` : T.confirmar.notSet} />
        </Section>
        <Section title={T.confirmar.sectionSpace} stepIndex={4}>
          <SummaryRow label={T.space.spaceNameLabel} value={state.spaceName || T.confirmar.notSet} />
          <SummaryRow label={T.space.numericCodeLabel} value={state.numericCode || T.confirmar.notSet} />
        </Section>
      </Stack>

      {/* What will happen — tinted callout right before the consent checkboxes */}
      <Box
        sx={{
          mb: 5,
          p: 4,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          bgcolor: alpha(theme.palette.info.main, 0.06),
          border: `1px solid ${alpha(theme.palette.info.main, 0.24)}`
        }}
      >
        <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 2 }}>
          <i className='tabler-bolt' style={{ fontSize: 18, color: theme.palette.info.main }} aria-hidden />
          <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
            {T.confirmar.willHappenTitle}
          </Typography>
        </Stack>
        <Stack spacing={1.5}>
          {[T.confirmar.willHappenCreateOrg, T.confirmar.willHappenOpenCase, T.confirmar.willHappenProvision, T.confirmar.willHappenChecklist].map(line => (
            <Stack key={line} direction='row' spacing={2} alignItems='flex-start'>
              <i className='tabler-circle-check' style={{ fontSize: 18, marginTop: 2, color: 'var(--mui-palette-success-main)' }} aria-hidden />
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                {line}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* Confirmation checkboxes */}
      <Stack spacing={1}>
        <FormControlLabel
          control={<Checkbox checked={state.reviewConfirmed} onChange={() => update('reviewConfirmed', !state.reviewConfirmed)} inputProps={{ 'data-capture': 'confirm-review' } as React.InputHTMLAttributes<HTMLInputElement>} />}
          label={<Typography variant='body2'>{T.confirmar.confirmReviewLabel}</Typography>}
        />
        <FormControlLabel
          control={<Checkbox checked={state.understandConfirmed} onChange={() => update('understandConfirmed', !state.understandConfirmed)} inputProps={{ 'data-capture': 'confirm-understand' } as React.InputHTMLAttributes<HTMLInputElement>} />}
          label={<Typography variant='body2'>{T.confirmar.confirmUnderstandLabel}</Typography>}
        />
      </Stack>
    </Box>
  )
}

// =============================================================================
// Success screen (replaces the pane after submit)
// =============================================================================

const SuccessScreen = ({
  state,
  result,
  onReset,
  onGoToClient
}: {
  state: WizardState
  result: ProvisionResult | null
  onReset: () => void
  onGoToClient: () => void
}) => {
  const prefersReduced = useReducedMotion()
  const theme = useTheme()

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
    >
      <Stack spacing={4} alignItems='center' sx={{ textAlign: 'center', py: 4 }}>
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.success.main, 0.12),
            color: 'success.main'
          }}
        >
          <i className='tabler-circle-check-filled' style={{ fontSize: 40 }} aria-hidden />
        </Box>
        <Box>
          <Typography variant='h5' component='h2' sx={{ fontWeight: 600 }}>
            {T.success.title}
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary', mt: 1, maxWidth: 460 }}>
            {T.success.description}
          </Typography>
        </Box>

        <Box sx={{ width: '100%', maxWidth: 420 }}>
          <SummaryRow label={T.success.clientLabel} value={state.tradeName || state.legalName || '—'} />
          <SummaryRow
            label={T.success.caseLabel}
            value={<CustomChip round='true' size='small' variant='tonal' color='primary' label={result?.caseId ?? '—'} />}
          />
        </Box>
      </Stack>

      <Divider sx={{ my: 4 }} />

      <Box sx={{ maxWidth: 520, mx: 'auto' }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 2 }}>
          {T.success.nextChecklistTitle}
        </Typography>
        <Stack spacing={2}>
          {['Confirmar firma de contrato/MSA', 'Asignar equipo con FTE', 'Confirmar setup de facturación'].map(item => (
            <Stack key={item} direction='row' spacing={2} alignItems='center'>
              <i className='tabler-circle' style={{ fontSize: 18, color: theme.palette.text.disabled }} aria-hidden />
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                {item}
              </Typography>
            </Stack>
          ))}
        </Stack>
        <Stack direction='row' spacing={2} alignItems='flex-start' sx={{ mt: 3, color: 'text.secondary' }}>
          <i className='tabler-info-circle' style={{ fontSize: 16, marginTop: 2 }} aria-hidden />
          <Typography variant='caption'>{T.success.checklistNote}</Typography>
        </Stack>

        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2} sx={{ mt: 5 }} justifyContent='center'>
          <Button variant='tonal' color='secondary' startIcon={<i className='tabler-rotate' />} onClick={onReset}>
            {T.success.createAnotherCta}
          </Button>
          <Button variant='contained' endIcon={<i className='tabler-arrow-right' />} onClick={onGoToClient}>
            {T.success.goToClientCta}
          </Button>
        </Stack>
      </Box>
    </motion.div>
  )
}

// =============================================================================
// HubSpot picker dialog
// =============================================================================

const HubspotPickerDialog = ({
  open,
  onClose,
  onSelect
}: {
  open: boolean
  onClose: () => void
  onSelect: (company: HubspotCompany) => void
}) => {
  const theme = useTheme()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<HubspotCompany[]>([])

  // Real search over the canonical org backbone (debounced). Only the approved
  // results-list + empty-state are rendered; loading/degraded states are deferred
  // to a state-design + GVC round (TASK-992 Slice 2b follow-up).
  useEffect(() => {
    if (!open) return

    let cancelled = false

    const handle = setTimeout(() => {
      fetchOrgSearch(`q=${encodeURIComponent(query.trim())}`)
        .then(rows => {
          if (!cancelled) setResults(rows.map(toHubspotCompany))
        })
        .catch(() => {
          if (!cancelled) setResults([])
        })
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [open, query])

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm' aria-labelledby='hubspot-picker-title'>
      <DialogTitle id='hubspot-picker-title' sx={{ pb: 1 }}>
        <Typography variant='h6' sx={{ fontWeight: 600 }}>
          {T.hubspotPicker.title}
        </Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
          {T.hubspotPicker.subtitle}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <CustomTextField
          fullWidth
          autoFocus
          label={T.hubspotPicker.searchLabel}
          placeholder={T.hubspotPicker.searchPlaceholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete='off'
          sx={{ mb: 3 }}
          slotProps={{ input: { startAdornment: <InputAdornment position='start'><i className='tabler-search' style={{ fontSize: 18 }} aria-hidden /></InputAdornment> } }}
        />

        {results.length === 0 ? (
          <EmptyState
            icon='tabler-building-off'
            title={T.hubspotPicker.emptyTitle}
            description={T.hubspotPicker.empty}
            minHeight={160}
            action={
              query ? (
                <Button variant='tonal' color='secondary' size='small' startIcon={<i className='tabler-x' />} onClick={() => setQuery('')}>
                  {T.hubspotPicker.clearSearchCta}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Stack spacing={2}>
            <Typography variant='caption' role='status' sx={{ color: 'text.secondary' }}>
              {results.length} {T.hubspotPicker.resultsCountPrefix}
            </Typography>
            {results.map(c => (
              <Box
                key={c.hubspotCompanyId}
                component='button'
                type='button'
                onClick={() => onSelect(c)}
                data-capture={`hubspot-row-${c.hubspotCompanyId}`}
                sx={{
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  p: 3,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: 'background.paper',
                  transition: 'border-color 150ms cubic-bezier(0.2,0,0,1), background-color 150ms cubic-bezier(0.2,0,0,1)',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
                }}
              >
                <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {c.name}
                    </Typography>
                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                      {c.domain}
                    </Typography>
                  </Box>
                  <Stack direction='row' spacing={1.5} alignItems='center' sx={{ flexShrink: 0 }}>
                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                      {countryByCode(c.country)?.flag} {c.country}
                    </Typography>
                    <CustomChip round='true' size='small' variant='tonal' color={c.lifecycleStage === 'customer' ? 'success' : 'secondary'} label={c.lifecycleStage} />
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 4 }}>
        <Button color='secondary' onClick={onClose}>
          {T.hubspotPicker.cancelCta}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// =============================================================================
// Nubox picker dialog
// =============================================================================

const NuboxPickerDialog = ({
  open,
  onClose,
  onSelect
}: {
  open: boolean
  onClose: () => void
  onSelect: (sale: NuboxSale) => void
}) => {
  const theme = useTheme()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NuboxSale[]>([])

  // Real search over the canonical org backbone (debounced). Approved
  // results-list + empty-state only; loading/degraded deferred to a GVC round.
  useEffect(() => {
    if (!open) return

    let cancelled = false

    const handle = setTimeout(() => {
      fetchOrgSearch(`q=${encodeURIComponent(query.trim())}`)
        .then(rows => {
          if (!cancelled) setResults(rows.map(toNuboxSale))
        })
        .catch(() => {
          if (!cancelled) setResults([])
        })
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [open, query])

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm' aria-labelledby='nubox-picker-title'>
      <DialogTitle id='nubox-picker-title' sx={{ pb: 1 }}>
        <Typography variant='h6' sx={{ fontWeight: 600 }}>
          {T.nuboxPicker.title}
        </Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
          {T.nuboxPicker.subtitle}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <CustomTextField
          fullWidth
          autoFocus
          label={T.nuboxPicker.searchLabel}
          placeholder={T.nuboxPicker.searchPlaceholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete='off'
          sx={{ mb: 3 }}
          slotProps={{ input: { startAdornment: <InputAdornment position='start'><i className='tabler-search' style={{ fontSize: 18 }} aria-hidden /></InputAdornment> } }}
        />
        {results.length === 0 ? (
          <EmptyState
            icon='tabler-file-off'
            title={T.nuboxPicker.emptyTitle}
            description={T.nuboxPicker.empty}
            minHeight={160}
            action={
              query ? (
                <Button variant='tonal' color='secondary' size='small' startIcon={<i className='tabler-x' />} onClick={() => setQuery('')}>
                  {T.nuboxPicker.clearSearchCta}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Stack spacing={2}>
            <Typography variant='caption' role='status' sx={{ color: 'text.secondary' }}>
              {results.length} {T.nuboxPicker.resultsCountPrefix}
            </Typography>
            {results.map(s => (
              <Box
                key={s.saleId}
                component='button'
                type='button'
                onClick={() => onSelect(s)}
                sx={{
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  p: 3,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  border: `1px solid ${theme.palette.divider}`,
                  bgcolor: 'background.paper',
                  transition: 'border-color 150ms cubic-bezier(0.2,0,0,1)',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
                }}
              >
                <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {s.legalName}
                    </Typography>
                    <Typography variant='caption' sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                      {s.taxId}
                    </Typography>
                  </Box>
                  <CustomChip round='true' size='small' variant='tonal' color='secondary' label={s.currency} />
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 4 }}>
        <Button color='secondary' onClick={onClose}>
          {T.nuboxPicker.cancelCta}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// =============================================================================
// Existing-org duplicate dialog
// =============================================================================

const ExistingOrgDialog = ({
  org,
  onUseExisting,
  onCreateNew
}: {
  org: ExistingOrg | null
  onUseExisting: () => void
  onCreateNew: () => void
}) => (
  <Dialog open={Boolean(org)} onClose={onCreateNew} fullWidth maxWidth='xs' aria-labelledby='existing-org-title'>
    <DialogTitle id='existing-org-title'>
      <Stack direction='row' spacing={2} alignItems='center'>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: t => `${t.shape.customBorderRadius.md}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: t => alpha(t.palette.warning.main, 0.12),
            color: 'warning.main'
          }}
        >
          <i className='tabler-alert-triangle' style={{ fontSize: 20 }} aria-hidden />
        </Box>
        <Typography variant='h6' sx={{ fontWeight: 600 }}>
          {T.identidad.duplicateTitle}
        </Typography>
      </Stack>
    </DialogTitle>
    <DialogContent>
      <Typography variant='body2' sx={{ color: 'text.secondary' }}>
        {T.identidad.duplicateDescription.replace('{name}', org?.organizationName ?? '')}
      </Typography>
      {org ? (
        <Box sx={{ mt: 2 }}>
          <SummaryRow label='ID tributario' value={org.taxId} />
          <SummaryRow label='Public ID' value={<CustomChip round='true' size='small' variant='tonal' color='secondary' label={org.publicId} />} />
        </Box>
      ) : null}
    </DialogContent>
    <DialogActions sx={{ px: 6, pb: 4 }}>
      <Button color='secondary' onClick={onCreateNew} data-capture='dup-create-new'>
        {T.identidad.duplicateCreateNew}
      </Button>
      <Button variant='contained' onClick={onUseExisting} data-capture='dup-use-existing'>
        {T.identidad.duplicateUseExisting}
      </Button>
    </DialogActions>
  </Dialog>
)

// =============================================================================
// Exit dialog
// =============================================================================

const ExitDialog = ({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth='xs' aria-labelledby='exit-title'>
    <DialogTitle id='exit-title'>
      <Typography variant='h6' sx={{ fontWeight: 600 }}>
        {T.exit.title}
      </Typography>
    </DialogTitle>
    <DialogContent>
      <Typography variant='body2' sx={{ color: 'text.secondary' }}>
        {T.exit.description}
      </Typography>
    </DialogContent>
    <DialogActions sx={{ px: 6, pb: 4 }}>
      <Button color='secondary' onClick={onClose}>
        {T.exit.cancelCta}
      </Button>
      <Button variant='contained' onClick={onConfirm}>
        {T.exit.confirmCta}
      </Button>
    </DialogActions>
  </Dialog>
)

// =============================================================================
// Left rail — vertical stepper + progress + autosave
// =============================================================================

const RailStatusIcon = ({ status }: { status: 'done' | 'active' | 'pending' }) => {
  const theme = useTheme()

  if (status === 'done') {
    return <i className='tabler-circle-check-filled' style={{ fontSize: 22, color: theme.palette.primary.main }} aria-hidden />
  }

  if (status === 'active') {
    return (
      <Box
        sx={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: `2px solid ${theme.palette.primary.main}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        aria-hidden
      >
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
      </Box>
    )
  }

  return (
    <Box sx={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${theme.palette.divider}` }} aria-hidden />
  )
}

const Rail = ({
  activeStep,
  origin,
  progress,
  saving,
  hasEdited,
  summaries,
  onStepClick
}: {
  activeStep: number
  origin: OnboardingOrigin | null
  progress: number
  saving: boolean
  hasEdited: boolean
  summaries: Record<StepKey, string | null>
  onStepClick?: (index: number) => void
}) => {
  const theme = useTheme()

  return (
    <Box sx={{ position: { lg: 'sticky' }, top: { lg: 24 } }}>
      {/* Origin chip */}
      <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 4 }}>
        <Typography variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {T.shell.originChipPrefix}
        </Typography>
        <CustomChip round='true' size='small' variant='tonal' color={origin ? 'primary' : 'secondary'} label={originLabel(origin)} />
      </Stack>

      {/* Vertical stepper */}
      <Box component='nav' aria-label={T.shell.stepperAria}>
        <Stack spacing={0}>
          {STEP_KEYS.map((key, index) => {
            const status: 'done' | 'active' | 'pending' = index < activeStep ? 'done' : index === activeStep ? 'active' : 'pending'
            const clickable = Boolean(onStepClick) && index < activeStep
            const isLast = index === STEP_KEYS.length - 1

            return (
              <Box key={key} sx={{ position: 'relative' }}>
                {/* Connector line */}
                {!isLast ? (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 10,
                      top: 28,
                      bottom: -4,
                      width: 2,
                      bgcolor: index < activeStep ? 'primary.main' : 'divider',
                      transition: 'background-color 200ms cubic-bezier(0.2,0,0,1)'
                    }}
                    aria-hidden
                  />
                ) : null}
                <Box
                  component={clickable ? 'button' : 'div'}
                  type={clickable ? 'button' : undefined}
                  onClick={clickable ? () => onStepClick?.(index) : undefined}
                  aria-current={status === 'active' ? 'step' : undefined}
                  sx={{
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    bgcolor: 'transparent',
                    p: 0,
                    pb: isLast ? 0 : 4,
                    display: 'flex',
                    gap: 2.5,
                    alignItems: 'flex-start',
                    cursor: clickable ? 'pointer' : 'default',
                    '&:focus-visible': clickable ? { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2, borderRadius: `${theme.shape.customBorderRadius.sm}px` } : {}
                  }}
                >
                  <Box sx={{ flexShrink: 0, position: 'relative', zIndex: 1, bgcolor: 'background.paper' }}>
                    <RailStatusIcon status={status} />
                  </Box>
                  <Box sx={{ minWidth: 0, pt: 0.125 }}>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: status === 'active' ? 600 : 500, color: status === 'pending' ? 'text.secondary' : 'text.primary' }}
                    >
                      {STEP_LABELS[key]}
                    </Typography>
                    {summaries[key] && status === 'done' ? (
                      <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                        {summaries[key]}
                      </Typography>
                    ) : status === 'active' ? (
                      <Typography variant='caption' sx={{ color: 'primary.main', display: 'block', mt: 0.25 }}>
                        {T.shell.statusActive}
                      </Typography>
                    ) : null}
                  </Box>
                </Box>
              </Box>
            )
          })}
        </Stack>
      </Box>

      {/* Progress + autosave */}
      <Box sx={{ mt: 5, p: 3, borderRadius: `${theme.shape.customBorderRadius.md}px`, bgcolor: alpha(theme.palette.secondary.main, 0.04), border: `1px solid ${theme.palette.divider}` }}>
        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1.5 }}>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {T.shell.progressLabel}
          </Typography>
          <Typography variant='caption' sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(progress)}%
          </Typography>
        </Stack>
        <LinearProgress
          variant='determinate'
          value={progress}
          aria-valuetext={`${Math.round(progress)} por ciento`}
          sx={{ height: 6, borderRadius: `${theme.shape.customBorderRadius.sm}px` }}
        />
        <Stack direction='row' spacing={1} alignItems='center' sx={{ mt: 2, color: 'text.secondary' }} role='status' aria-live='polite'>
          {saving ? (
            <>
              <CircularProgress size={12} thickness={6} />
              <Typography variant='caption'>{T.shell.autosaveSaving}</Typography>
            </>
          ) : hasEdited ? (
            <>
              <i className='tabler-cloud-check' style={{ fontSize: 14 }} aria-hidden />
              <Typography variant='caption'>{T.shell.autosaveIdle}</Typography>
            </>
          ) : (
            <>
              <i className='tabler-pencil-minus' style={{ fontSize: 14 }} aria-hidden />
              <Typography variant='caption'>{T.shell.autosaveNoChanges}</Typography>
            </>
          )}
        </Stack>
      </Box>
    </Box>
  )
}

// =============================================================================
// Root view
// =============================================================================

const ClientOnboardingView = () => {
  const prefersReduced = useReducedMotion()
  const theme = useTheme()

  const router = useRouter()

  const [activeStep, setActiveStep] = useState(0)
  const [state, setState] = useState<WizardState>(INITIAL)
  const [touchedSteps, setTouchedSteps] = useState<Record<number, boolean>>({})
  const [submitted, setSubmitted] = useState(false)

  // Real commit state (composer POST).
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ProvisionResult | null>(null)

  // When the operator reuses an existing org (picker or duplicate dialog), the
  // composer updates it instead of creating a duplicate.
  const [existingOrganizationId, setExistingOrganizationId] = useState<string | null>(null)

  // Surfaces
  const [hubspotOpen, setHubspotOpen] = useState(false)
  const [nuboxOpen, setNuboxOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const [duplicateOrg, setDuplicateOrg] = useState<ExistingOrg | null>(null)
  const [duplicateDismissed, setDuplicateDismissed] = useState(false)

  // Autosave simulation
  const [saving, setSaving] = useState(false)
  const [hasEdited, setHasEdited] = useState(false)
  const savingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const paneRef = useRef<HTMLDivElement | null>(null)

  const update = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState(prev => ({
      ...prev,
      [key]: value,
      // Editing a field clears its "prefilled" provenance.
      prefilledFields: prev.prefilledFields.filter(f => f !== key)
    }))
    setHasEdited(true)
    setSaving(true)

    if (savingTimer.current) clearTimeout(savingTimer.current)
    savingTimer.current = setTimeout(() => setSaving(false), 700)
  }

  useEffect(() => () => {
    if (savingTimer.current) clearTimeout(savingTimer.current)
  }, [])

  // --- Per-step validation ---------------------------------------------------
  const stepValid = useMemo<Record<number, boolean>>(() => {
    const taxValid = isTaxIdValidForCountry(state.taxId, state.country || null) === true

    return {
      0:
        state.origin === 'manual' ||
        (state.origin === 'hubspot_sync' && Boolean(state.hubspotCompany)) ||
        (state.origin === 'nubox' && Boolean(state.nuboxSale)),
      1: state.legalName.trim() !== '' && state.country !== '' && state.taxId.trim() !== '' && taxValid,
      2: state.startDate !== null && (state.endDate === null || state.endDate >= state.startDate),
      3: state.currency !== '',
      4: state.spaceName.trim() !== '' && /^\d{2}$/.test(state.numericCode),
      5: state.reviewConfirmed && state.understandConfirmed
    }
  }, [state])

  // --- Progress (steps satisfied / total) ------------------------------------
  const progress = useMemo(() => {
    const satisfied = Object.values(stepValid).filter(Boolean).length

    return (satisfied / STEP_KEYS.length) * 100
  }, [stepValid])

  // --- Rail micro-summaries --------------------------------------------------
  const summaries = useMemo<Record<StepKey, string | null>>(() => {
    const taxValid = isTaxIdValidForCountry(state.taxId, state.country || null) === true
    const taxLabel = taxIdLabelForCountry(state.country || null)
    const provision = [state.provisionNotion ? 'Notion' : null, state.provisionTeams ? 'Teams' : null].filter(Boolean).join(' + ')

    return {
      origen: state.origin ? originLabel(state.origin) : null,
      // Derived facts the active pane doesn't already show, not echoes.
      identidad: taxValid ? `${taxLabel} válido · ${state.country}` : state.legalName ? state.legalName : null,
      comercial: state.startDate ? engagementKindLabel(state.engagementKind) : null,
      finanzas: state.currency ? `${state.currency} · Net-${state.paymentTermsDays || '—'}` : null,
      space: state.spaceName ? provision || `Código ${state.numericCode || '—'}` : null,
      confirmar: null
    }
  }, [state])

  const markTouched = (index: number) => setTouchedSteps(prev => ({ ...prev, [index]: true }))

  const goNext = async () => {
    markTouched(activeStep)

    if (!stepValid[activeStep]) {
      // Move focus to the first invalid field so the blocked-continue isn't silent.
      setTimeout(() => {
        paneRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      }, 0)

      return
    }

    // Identidad → duplicate-tax-id gate (real lookup over the canonical org backbone).
    if (activeStep === 1 && !duplicateDismissed && !existingOrganizationId) {
      const match = await findExistingOrgByTaxId(state.taxId)

      if (match) {
        setDuplicateOrg(match)

        return
      }
    }

    setActiveStep(s => Math.min(STEP_KEYS.length - 1, s + 1))
  }

  const goBack = () => setActiveStep(s => Math.max(0, s - 1))

  const goToStep = (index: number) => setActiveStep(index)

  const handleSelectOrigin = (o: OnboardingOrigin) => {
    update('origin', o)
    if (o === 'hubspot_sync') setHubspotOpen(true)
    if (o === 'nubox') setNuboxOpen(true)
  }

  const handleHubspotSelect = (company: HubspotCompany) => {
    setState(prev => ({
      ...prev,
      hubspotCompany: company,
      legalName: prev.legalName || company.name,
      tradeName: prev.tradeName || company.name,
      country: prev.country || company.country,
      taxId: prev.taxId || company.taxId || '',
      industry: prev.industry || coerceHubspotIndustryValue(company.industry) || '',
      currency: prev.currency || currencyForCountry(company.country),
      billingCountry: prev.billingCountry || company.country,
      spaceName: prev.spaceName || company.name,
      startDate: prev.startDate ?? DEFAULT_ENGAGEMENT_START,
      prefilledFields: ['legalName', 'tradeName', 'country', 'taxId', 'currency', ...(company.industry ? ['industry'] : [])]
    }))
    if (company.organizationId) setExistingOrganizationId(company.organizationId)
    setHubspotOpen(false)
  }

  const handleNuboxSelect = (sale: NuboxSale) => {
    setState(prev => ({
      ...prev,
      nuboxSale: sale,
      legalName: prev.legalName || sale.legalName,
      country: prev.country || sale.country,
      taxId: prev.taxId || sale.taxId,
      currency: prev.currency || sale.currency,
      billingCountry: prev.billingCountry || sale.country,
      spaceName: prev.spaceName || sale.legalName,
      startDate: prev.startDate ?? DEFAULT_ENGAGEMENT_START,
      prefilledFields: ['legalName', 'country', 'taxId', 'currency']
    }))
    if (sale.organizationId) setExistingOrganizationId(sale.organizationId)
    setNuboxOpen(false)
  }

  // Real atomic commit through the canonical wizard composer.
  const handleSubmit = async () => {
    markTouched(5)
    if (!stepValid[5] || submitting) return

    setSubmitting(true)

    const originForApi: 'manual' | 'hubspot_company' | 'nubox_sale' =
      state.origin === 'hubspot_sync' ? 'hubspot_company' : state.origin === 'nubox' ? 'nubox_sale' : 'manual'

    try {
      const res = await fetch('/api/admin/clients/lifecycle/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: originForApi,
          existingOrganizationId: existingOrganizationId ?? undefined,
          identity: {
            organizationName: state.tradeName.trim() || state.legalName.trim(),
            legalName: state.legalName.trim() || undefined,
            taxId: state.taxId.trim(),
            taxIdType: taxIdLabelForCountry(state.country || null),
            country: state.country || undefined,
            industry: state.industry || undefined,
            hubspotCompanyId: state.hubspotCompany?.hubspotCompanyId ?? undefined
          },
          finance: {
            paymentCurrency: state.currency || undefined,
            paymentTermsDays: state.paymentTermsDays ? Number(state.paymentTermsDays) : undefined
          },
          effectiveDate: state.startDate ? state.startDate.toISOString().slice(0, 10) : undefined,
          clientKind: state.engagementKind,
          contacts: state.contacts.map(c => ({
            name: c.name,
            email: c.email || null,
            role: c.role || null,
            hubspotContactId: c.hubspotContactId,
            source: c.source
          })),
          notionAnchors: state.notionAnchors
        })
      })

      const payload = (await res.json()) as ProvisionResult & { error?: string }

      if (!res.ok) {
        toast.error(payload.error ?? 'No se pudo crear el cliente. Reintenta.')

        return
      }

      setResult(payload)
      setSubmitted(true)
    } catch {
      toast.error('No se pudo conectar con el servidor. Reintenta.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetWizard = () => {
    setState(INITIAL)
    setActiveStep(0)
    setTouchedSteps({})
    setSubmitted(false)
    setDuplicateDismissed(false)
    setHasEdited(false)
    setResult(null)
    setExistingOrganizationId(null)
  }

  // NOTE: `key` is passed directly on the JSX element (NOT spread) — React 19
  // errors when `key` is spread via a props object.
  const stepFade = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.25, ease: [0.2, 0, 0, 1] as const }
      }

  const isLastStep = activeStep === STEP_KEYS.length - 1

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <OrigenStep
            state={state}
            onSelectOrigin={handleSelectOrigin}
            onOpenHubspot={() => setHubspotOpen(true)}
            onOpenNubox={() => setNuboxOpen(true)}
            showError={Boolean(touchedSteps[0]) && !stepValid[0]}
          />
        )
      case 1:
        return <IdentidadStep state={state} update={update} touched={Boolean(touchedSteps[1])} />
      case 2:
        return <ComercialStep state={state} update={update} touched={Boolean(touchedSteps[2])} />
      case 3:
        return <FinanzasStep state={state} update={update} touched={Boolean(touchedSteps[3])} />
      case 4:
        return <SpaceStep state={state} update={update} touched={Boolean(touchedSteps[4])} />
      case 5:
        return <ConfirmarStep state={state} update={update} onEditStep={goToStep} />
      default:
        return null
    }
  }

  return (
    <Box sx={{ p: { xs: 4, md: 6 }, maxWidth: 1240, mx: 'auto' }}>
      {/* Top bar */}
      <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 6 }}>
        <Box>
          <Typography variant='overline' sx={{ color: 'text.disabled', letterSpacing: '0.08em' }}>
            {T.shell.pageEyebrow}
          </Typography>
          <Typography variant='h4' component='h1' sx={{ fontWeight: 600 }}>
            {T.shell.pageTitle}
          </Typography>
        </Box>
        {!submitted ? (
          <Button variant='text' color='secondary' startIcon={<i className='tabler-device-floppy' />} onClick={() => setExitOpen(true)}>
            {T.shell.saveAndExit}
          </Button>
        ) : null}
      </Stack>

      <Grid container spacing={6}>
        {/* Left rail — kept on success (all steps done, 100%) so the spatial system persists */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Rail
            activeStep={submitted ? STEP_KEYS.length : activeStep}
            origin={state.origin}
            progress={submitted ? 100 : progress}
            saving={saving}
            hasEdited={hasEdited}
            summaries={summaries}
            onStepClick={submitted ? undefined : goToStep}
          />
        </Grid>

        {/* Right pane */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ border: `1px solid ${theme.palette.divider}` }}>
            <CardContent sx={{ p: { xs: 5, md: 6 } }}>
              <AnimatePresence mode='wait' initial={false}>
                <motion.div ref={paneRef} key={submitted ? 'success' : `step-${activeStep}`} {...stepFade}>
                  {submitted ? (
                    <SuccessScreen
                      state={state}
                      result={result}
                      onReset={resetWizard}
                      onGoToClient={() => result && router.push(`/agency/clients/${result.organizationId}/lifecycle`)}
                    />
                  ) : (
                    renderStep()
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Footer nav — sticky so the primary action stays reachable on long steps */}
              {!submitted ? (
                <Box
                  sx={{
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 2,
                    mx: { xs: -5, md: -6 },
                    mt: 6,
                    px: { xs: 5, md: 6 },
                    py: 3,
                    borderTop: t => `1px solid ${t.palette.divider}`,
                    bgcolor: 'background.paper'
                  }}
                >
                  <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2} justifyContent='space-between'>
                    <Button
                      variant='tonal'
                      color='secondary'
                      startIcon={<i className='tabler-arrow-left' />}
                      onClick={goBack}
                      disabled={activeStep === 0}
                    >
                      {T.shell.backCta}
                    </Button>

                    {isLastStep ? (
                      <Button variant='contained' startIcon={<i className='tabler-circle-plus' />} onClick={handleSubmit} disabled={submitting} data-capture='wizard-create'>
                        {T.shell.createCta}
                      </Button>
                    ) : (
                      <Button variant='contained' endIcon={<i className='tabler-arrow-right' />} onClick={goNext} data-capture='wizard-next'>
                        {T.shell.nextCta}
                      </Button>
                    )}
                  </Stack>
                </Box>
              ) : null}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Surfaces */}
      <HubspotPickerDialog open={hubspotOpen} onClose={() => setHubspotOpen(false)} onSelect={handleHubspotSelect} />
      <NuboxPickerDialog open={nuboxOpen} onClose={() => setNuboxOpen(false)} onSelect={handleNuboxSelect} />
      <ExistingOrgDialog
        org={duplicateOrg}
        onUseExisting={() => {
          // Reuse the existing org: the composer UPDATEs it instead of creating a duplicate.
          if (duplicateOrg) setExistingOrganizationId(duplicateOrg.organizationId)
          setDuplicateOrg(null)
          setDuplicateDismissed(true)
          setActiveStep(s => Math.min(STEP_KEYS.length - 1, s + 1))
        }}
        onCreateNew={() => {
          // Operator insists on a new org despite the tax-id match.
          setExistingOrganizationId(null)
          setDuplicateOrg(null)
          setDuplicateDismissed(true)
          setActiveStep(s => Math.min(STEP_KEYS.length - 1, s + 1))
        }}
      />
      <ExitDialog open={exitOpen} onClose={() => setExitOpen(false)} onConfirm={() => setExitOpen(false)} />
    </Box>
  )
}

export default ClientOnboardingView
