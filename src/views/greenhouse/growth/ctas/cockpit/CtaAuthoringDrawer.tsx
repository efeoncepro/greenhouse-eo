'use client'

/**
 * TASK-1430 — drawer de autoría gobernada (8 pasos, sin canvas libre).
 *
 * El operador compone por ejes: intención → placement → apariencia → contenido →
 * acción (metadata del registry TASK-1431) → segmentación/supresión → preview con
 * el renderer canónico → checklist de revisión. El submit llama al command
 * canónico vía la API admin (server-confirmed; acá no hay verdad optimista).
 * Autoridad visual: mock Claude Design "Cockpit de CTAs" con tokens del theme.
 */
import { useMemo, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog'
import { GH_GROWTH_CTA_OPERATOR } from '@/lib/copy/growth'

import {
  ACTION_ICON,
  APPEARANCE_ICON,
  APPEARANCE_KINDS,
  buildAuthorPayload,
  CTA_ACTION_KIND_METADATA,
  CTA_ACTION_KINDS,
  CTA_CONTENT_LIMITS,
  CTA_INTENT_KINDS,
  CTA_PLACEMENTS,
  INTENT_ICON,
  isInterruptivePlacement,
  PLACEMENT_ICON,
  type CtaAuthoringDraft,
} from './cta-cockpit-meta'
import { CtaPreviewHarness, DiagnosticChips } from './CtaPreviewHarness'
import { buildPreviewContract } from './cta-cockpit-meta'
import { PreviewFrame } from './CtaPreviewHarness'

const O = GH_GROWTH_CTA_OPERATOR
const A = O.cockpit.author

const STEP_KEYS = ['intent', 'placement', 'appearance', 'content', 'action', 'targeting', 'preview', 'review'] as const

type StepKey = (typeof STEP_KEYS)[number]

const STEP_ICON: Record<StepKey, string> = {
  intent: 'tabler-target-arrow',
  placement: 'tabler-layout-distribute-horizontal',
  appearance: 'tabler-palette',
  content: 'tabler-align-left',
  action: 'tabler-click',
  targeting: 'tabler-users-group',
  preview: 'tabler-eye-check',
  review: 'tabler-clipboard-check',
}

// ─── Review checks (anticipo UX; la verdad es server-side en submit/publish) ──

export interface ReviewCheck {
  key: string
  ok: boolean
  label: string
  detail: string
}

const PROMISE_RULES: Array<{ pattern: RegExp; expectedKinds: string[] }> = [
  { pattern: /agend|reuni[oó]n|demo|llamada/i, expectedKinds: ['book_meeting', 'open_meeting_scheduler'] },
  { pattern: /suscr[ií]b|reg[ií]str|formulario/i, expectedKinds: ['open_growth_form'] },
]

export const buildReviewChecks = (draft: CtaAuthoringDraft, previewDegraded: boolean): ReviewCheck[] => {
  const C = A.review.checks
  const metadata = CTA_ACTION_KIND_METADATA[draft.actionKind]
  const actionLabel = A.action.kinds[draft.actionKind]?.label ?? draft.actionKind

  const destinationOk = draft.actionDestination.trim().length > 0 &&
    (draft.actionKind !== 'open_meeting_scheduler' || draft.actionSecondaryDestination.trim().length > 0)

  const promiseRule = PROMISE_RULES.find(rule => rule.pattern.test(draft.content.ctaLabel))
  const copyMatchOk = !promiseRule || promiseRule.expectedKinds.includes(draft.actionKind)

  const interruptive = isInterruptivePlacement(draft.placement)

  const suppressionOk =
    draft.suppression.dismissCooldownDays >= 1 &&
    draft.suppression.maxImpressionsPerWindow >= 1 &&
    draft.suppression.windowHours >= 1

  const anatomyOk =
    draft.content.headline.trim().length > 0 &&
    draft.content.ctaLabel.trim().length > 0 &&
    draft.content.dismissLabel.trim().length > 0

  const assetOk = draft.intent !== 'lead_magnet' || !draft.hasAsset || draft.visualAssetRef.trim().length > 0

  const overLimits = (Object.keys(CTA_CONTENT_LIMITS) as Array<keyof typeof CTA_CONTENT_LIMITS>).filter(
    field => draft.content[field].length > CTA_CONTENT_LIMITS[field],
  )

  return [
    {
      key: 'action',
      ok: Boolean(metadata) && destinationOk,
      label: C.action.label,
      detail: metadata && destinationOk ? C.action.ok : C.action.fail,
    },
    {
      key: 'copyMatch',
      ok: copyMatchOk,
      label: C.copyMatch.label,
      detail: copyMatchOk ? C.copyMatch.ok : C.copyMatch.fail.replace('{action}', actionLabel),
    },
    {
      key: 'interruptive',
      ok: !interruptive || suppressionOk,
      label: C.interruptive.label,
      detail: interruptive ? (suppressionOk ? C.interruptive.ok : C.interruptive.fail) : C.interruptive.okNotNeeded,
    },
    {
      key: 'anatomy',
      ok: anatomyOk,
      label: C.anatomy.label,
      detail: anatomyOk ? C.anatomy.ok : C.anatomy.fail,
    },
    {
      key: 'asset',
      ok: assetOk,
      label: C.asset.label,
      detail: assetOk ? C.asset.ok : C.asset.fail,
    },
    {
      key: 'limits',
      ok: overLimits.length === 0,
      label: C.limits.label,
      detail: overLimits.length === 0 ? C.limits.ok : C.limits.fail.replace('{fields}', overLimits.join(', ')),
    },
    {
      key: 'parity',
      ok: !previewDegraded,
      label: C.parity.label,
      detail: previewDegraded ? C.parity.fail : C.parity.ok,
    },
  ]
}

// ─── Piezas visuales del drawer ───────────────────────────────────────────────

const StepHead = ({ title, subtitle, icon }: { title: string; subtitle: string; icon: string }) => (
  <Stack direction='row' spacing={3} alignItems='flex-start' sx={{ mb: 5 }}>
    <Box
      sx={theme => ({
        width: 40,
        height: 40,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'primary.dark',
        bgcolor: alpha(theme.palette.primary.main, 0.12),
      })}
    >
      <i className={icon} style={{ fontSize: 20 }} aria-hidden />
    </Box>
    <Stack spacing={0.5}>
      <Typography variant='h6' sx={{ lineHeight: 1.2 }}>
        {title}
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 560 }}>
        {subtitle}
      </Typography>
    </Stack>
  </Stack>
)

interface OptionCardProps {
  selected: boolean
  icon: string
  label: string
  desc: string
  badge?: string | null
  onClick: () => void
}

const OptionCard = ({ selected, icon, label, desc, badge, onClick }: OptionCardProps) => (
  <Box
    component='button'
    type='button'
    onClick={onClick}
    aria-pressed={selected}
    sx={theme => ({
      textAlign: 'left',
      cursor: 'pointer',
      borderRadius: `${theme.shape.customBorderRadius.xl}px`,
      p: 4,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      font: 'inherit',
      bgcolor: selected ? alpha(theme.palette.primary.main, 0.06) : theme.palette.background.paper,
      // Elevation SoT (TASK-1049): reposo plano/outlined; `raised` SOLO como lift de hover.
      border: selected ? `1.5px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
      boxShadow: theme.greenhouseElevation.none.boxShadow,
      transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow'], { duration: 150 }),
      '&:hover': { boxShadow: theme.greenhouseElevation.raised.boxShadow },
      '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
    })}
  >
    <Stack direction='row' alignItems='center' justifyContent='space-between'>
      <Box
        sx={theme => ({
          width: 36,
          height: 36,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: selected ? 'primary.contrastText' : 'text.secondary',
          bgcolor: selected ? theme.palette.primary.main : theme.palette.action.hover,
        })}
      >
        <i className={icon} style={{ fontSize: 18 }} aria-hidden />
      </Box>
      {badge ? (
        <Box
          component='span'
          sx={theme => ({
            px: 2,
            py: 0.5,
            borderRadius: `${theme.shape.customBorderRadius.sm}px`,
            typography: 'caption',
            fontWeight: 600,
            color: 'warning.dark',
            bgcolor: alpha(theme.palette.warning.main, 0.16),
          })}
        >
          {badge}
        </Box>
      ) : selected ? (
        <Box component='i' className='tabler-circle-check-filled' sx={{ fontSize: 20, color: 'primary.main' }} aria-hidden />
      ) : null}
    </Stack>
    <Typography variant='subtitle2' color='text.primary'>
      {label}
    </Typography>
    <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.45 }}>
      {desc}
    </Typography>
  </Box>
)

const OptionGrid = ({ children }: { children: React.ReactNode }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 3 }}>{children}</Box>
)

const InfoBanner = ({ icon, tone, children }: { icon: string; tone: 'info' | 'warning'; children: React.ReactNode }) => (
  <Stack
    direction='row'
    spacing={2.5}
    sx={theme => ({
      mt: 4,
      p: 4,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      alignItems: 'flex-start',
      bgcolor: alpha(theme.palette[tone].main, 0.12),
      border: `1px solid ${alpha(theme.palette[tone].main, 0.3)}`,
    })}
  >
    <i className={icon} style={{ fontSize: 18, marginTop: 2 }} aria-hidden />
    <Typography variant='body2' sx={{ lineHeight: 1.5 }}>
      {children}
    </Typography>
  </Stack>
)

const FieldRow = ({ children }: { children: React.ReactNode }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 4 }}>{children}</Box>
)

const counterHelper = (value: string, max: number, helper?: string): string =>
  helper ? `${helper} · ${value.length}/${max}` : `${value.length}/${max}`

// ─── Drawer ───────────────────────────────────────────────────────────────────

export interface CtaAuthoringDrawerProps {
  open: boolean
  /** null = crear; string = slug existente (editar = versión nueva). */
  existingSlug: string | null
  initialDraft: CtaAuthoringDraft
  onClose: () => void
  onSubmitted: (message: string) => void
}

const CtaAuthoringDrawer = ({ open, existingSlug, initialDraft, onClose, onSubmitted }: CtaAuthoringDrawerProps) => {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<CtaAuthoringDraft>(initialDraft)
  const [dirty, setDirty] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [previewDegraded, setPreviewDegraded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const initialisedFor = useRef<CtaAuthoringDraft | null>(null)

  // Re-inicializa el estado al abrir con otro draft (crear vs editar otro CTA).
  if (open && initialisedFor.current !== initialDraft) {
    initialisedFor.current = initialDraft
    setDraft(initialDraft)
    setStep(0)
    setDirty(false)
    setPreviewDegraded(false)
    setSubmitError(null)
  }

  const patch = (mutate: (next: CtaAuthoringDraft) => void) => {
    setDraft(current => {
      const next = structuredClone(current)

      mutate(next)

      return next
    })
    setDirty(true)
  }

  const checks = useMemo(() => buildReviewChecks(draft, previewDegraded), [draft, previewDegraded])
  const blockedCount = checks.filter(check => !check.ok).length
  const interruptive = isInterruptivePlacement(draft.placement)

  const canAdvance = (fromStep: number): boolean => {
    if (fromStep === 3) {
      return (
        draft.name.trim().length > 0 &&
        draft.content.headline.trim().length > 0 &&
        draft.content.ctaLabel.trim().length > 0
      )
    }

    if (fromStep === 4) return draft.actionDestination.trim().length > 0 &&
      (draft.actionKind !== 'open_meeting_scheduler' || draft.actionSecondaryDestination.trim().length > 0)

    if (fromStep === 5) {
      if (!interruptive) return true

      return (
        draft.suppression.dismissCooldownDays >= 1 &&
        draft.suppression.maxImpressionsPerWindow >= 1 &&
        draft.suppression.windowHours >= 1
      )
    }

    if (fromStep === 6) return !previewDegraded

    return true
  }

  const requestClose = () => {
    if (submitting) return

    if (dirty) setDiscardOpen(true)
    else onClose()
  }

  const submit = async () => {
    if (blockedCount > 0) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/admin/growth/ctas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildAuthorPayload(draft, existingSlug)),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; code?: string; extra?: { details?: string[] } }
          | null

        if (payload?.code === 'growth_cta_invalid_input' && payload.extra?.details?.length) {
          setSubmitError(O.cockpit.toasts.invalidInput.replace('{details}', payload.extra.details.join(', ')))
        } else {
          setSubmitError(payload?.error ?? O.actions.errorGeneric)
        }

        return
      }

      setDirty(false)
      onSubmitted(existingSlug ? O.cockpit.toasts.newVersion : O.cockpit.toasts.created)
    } catch {
      setSubmitError(O.actions.errorGeneric)
    } finally {
      setSubmitting(false)
    }
  }

  const diagnostics = [
    { k: O.cockpit.detail.diag.placement, v: A.placement.kinds[draft.placement]?.label ?? draft.placement },
    { k: O.cockpit.detail.diag.appearance, v: A.appearance.kinds[draft.appearance]?.label ?? draft.appearance },
    { k: O.cockpit.detail.diag.action, v: A.action.kinds[draft.actionKind]?.label ?? draft.actionKind },
    { k: O.cockpit.detail.diag.kind, v: A.intent.kinds[draft.intent]?.label ?? draft.intent },
  ]

  const draftSummary = [
    { label: A.steps.intent.label, value: A.intent.kinds[draft.intent]?.label ?? '—' },
    { label: A.steps.placement.label, value: A.placement.kinds[draft.placement]?.label ?? '—' },
    { label: A.steps.appearance.label, value: A.appearance.kinds[draft.appearance]?.label ?? '—' },
    { label: A.steps.action.label, value: A.action.kinds[draft.actionKind]?.label ?? '—' },
  ]

  const stepBody = () => {
    const key = STEP_KEYS[step]

    if (key === 'intent') {
      return (
        <>
          <StepHead title={A.intent.title} subtitle={A.intent.subtitle} icon={STEP_ICON.intent} />
          <OptionGrid>
            {CTA_INTENT_KINDS.map(kind => (
              <OptionCard
                key={kind}
                selected={draft.intent === kind}
                icon={INTENT_ICON[kind]}
                label={A.intent.kinds[kind].label}
                desc={A.intent.kinds[kind].desc}
                onClick={() => patch(next => (next.intent = kind))}
              />
            ))}
          </OptionGrid>
          <InfoBanner icon='tabler-checklist' tone='info'>
            <strong>{A.intent.evidenceLabel} </strong>
            {A.intent.kinds[draft.intent].evidence}
          </InfoBanner>
        </>
      )
    }

    if (key === 'placement') {
      return (
        <>
          <StepHead title={A.placement.title} subtitle={A.placement.subtitle} icon={STEP_ICON.placement} />
          <OptionGrid>
            {CTA_PLACEMENTS.map(placement => (
              <OptionCard
                key={placement}
                selected={draft.placement === placement}
                icon={PLACEMENT_ICON[placement]}
                label={A.placement.kinds[placement].label}
                desc={A.placement.kinds[placement].desc}
                badge={isInterruptivePlacement(placement) ? A.placement.interruptiveBadge : null}
                onClick={() => patch(next => (next.placement = placement))}
              />
            ))}
          </OptionGrid>
        </>
      )
    }

    if (key === 'appearance') {
      return (
        <>
          <StepHead title={A.appearance.title} subtitle={A.appearance.subtitle} icon={STEP_ICON.appearance} />
          <OptionGrid>
            {APPEARANCE_KINDS.map(appearance => (
              <OptionCard
                key={appearance}
                selected={draft.appearance === appearance}
                icon={APPEARANCE_ICON[appearance]}
                label={A.appearance.kinds[appearance].label}
                desc={A.appearance.kinds[appearance].desc}
                onClick={() => patch(next => (next.appearance = appearance))}
              />
            ))}
          </OptionGrid>
        </>
      )
    }

    if (key === 'content') {
      return (
        <>
          <StepHead title={A.content.title} subtitle={A.content.subtitle} icon={STEP_ICON.content} />
          <Stack spacing={4}>
            <CustomTextField
              fullWidth
              label={A.content.name}
              placeholder={A.content.namePlaceholder}
              helperText={A.content.nameHelper}
              value={draft.name}
              onChange={event => patch(next => (next.name = event.target.value))}
              required
            />
            <CustomTextField
              fullWidth
              label={A.content.eyebrow}
              placeholder={A.content.eyebrowPlaceholder}
              value={draft.content.eyebrow}
              helperText={counterHelper(draft.content.eyebrow, CTA_CONTENT_LIMITS.eyebrow)}
              slotProps={{ htmlInput: { maxLength: CTA_CONTENT_LIMITS.eyebrow } }}
              onChange={event => patch(next => (next.content.eyebrow = event.target.value))}
            />
            <CustomTextField
              fullWidth
              required
              label={A.content.headline}
              placeholder={A.content.headlinePlaceholder}
              value={draft.content.headline}
              helperText={counterHelper(draft.content.headline, CTA_CONTENT_LIMITS.headline, A.content.headlineHelper)}
              slotProps={{ htmlInput: { maxLength: CTA_CONTENT_LIMITS.headline } }}
              onChange={event => patch(next => (next.content.headline = event.target.value))}
            />
            <CustomTextField
              fullWidth
              multiline
              rows={3}
              label={A.content.body}
              placeholder={A.content.bodyPlaceholder}
              value={draft.content.body}
              helperText={counterHelper(draft.content.body, CTA_CONTENT_LIMITS.body)}
              slotProps={{ htmlInput: { maxLength: CTA_CONTENT_LIMITS.body } }}
              onChange={event => patch(next => (next.content.body = event.target.value))}
            />
            <FieldRow>
              <CustomTextField
                required
                label={A.content.ctaLabel}
                placeholder={A.content.ctaLabelPlaceholder}
                value={draft.content.ctaLabel}
                helperText={counterHelper(draft.content.ctaLabel, CTA_CONTENT_LIMITS.ctaLabel)}
                slotProps={{ htmlInput: { maxLength: CTA_CONTENT_LIMITS.ctaLabel } }}
                onChange={event => patch(next => (next.content.ctaLabel = event.target.value))}
              />
              <CustomTextField
                label={A.content.dismissLabel}
                placeholder={A.content.dismissLabelPlaceholder}
                value={draft.content.dismissLabel}
                helperText={counterHelper(draft.content.dismissLabel, CTA_CONTENT_LIMITS.dismissLabel)}
                slotProps={{ htmlInput: { maxLength: CTA_CONTENT_LIMITS.dismissLabel } }}
                onChange={event => patch(next => (next.content.dismissLabel = event.target.value))}
              />
            </FieldRow>
            <CustomTextField
              fullWidth
              label={A.content.footnote}
              placeholder={A.content.footnotePlaceholder}
              value={draft.content.footnote}
              helperText={counterHelper(draft.content.footnote, CTA_CONTENT_LIMITS.footnote)}
              slotProps={{ htmlInput: { maxLength: CTA_CONTENT_LIMITS.footnote } }}
              onChange={event => patch(next => (next.content.footnote = event.target.value))}
            />
            <Stack
              direction='row'
              alignItems='center'
              justifyContent='space-between'
              sx={theme => ({ p: 4, borderRadius: `${theme.shape.customBorderRadius.lg}px`, bgcolor: 'action.hover' })}
            >
              <Stack spacing={0.5}>
                <Typography variant='subtitle2'>{A.content.assetTitle}</Typography>
                <Typography variant='caption' color='text.secondary'>
                  {A.content.assetDesc}
                </Typography>
              </Stack>
              <Switch
                checked={draft.hasAsset}
                onChange={event => patch(next => (next.hasAsset = event.target.checked))}
                slotProps={{ input: { 'aria-label': A.content.assetTitle } }}
              />
            </Stack>
            {draft.hasAsset ? (
              <CustomTextField
                fullWidth
                label={A.content.assetRefLabel}
                placeholder={A.content.assetRefPlaceholder}
                value={draft.visualAssetRef}
                onChange={event => patch(next => (next.visualAssetRef = event.target.value))}
              />
            ) : null}
          </Stack>
        </>
      )
    }

    if (key === 'action') {
      const actionCopy = A.action.kinds[draft.actionKind]

      return (
        <>
          <StepHead title={A.action.title} subtitle={A.action.subtitle} icon={STEP_ICON.action} />
          <Stack spacing={4}>
            <Stack spacing={2}>
              <Typography variant='caption' sx={{ fontWeight: 600 }}>
                {A.action.kindLabel}
              </Typography>
              <OptionGrid>
                {CTA_ACTION_KINDS.map(kind => (
                  <OptionCard
                    key={kind}
                    selected={draft.actionKind === kind}
                    icon={ACTION_ICON[kind]}
                    label={A.action.kinds[kind]?.label ?? kind}
                    desc={A.action.kinds[kind]?.expectation ?? ''}
                    onClick={() =>
                      patch(next => {
                        next.actionKind = kind
                        next.actionDestination = ''
                        next.actionSecondaryDestination = ''
                      })
                    }
                  />
                ))}
              </OptionGrid>
            </Stack>
            <InfoBanner icon='tabler-route' tone='info'>
              <strong>{A.action.expectationLabel} </strong>
              {actionCopy?.expectation}
            </InfoBanner>
            <CustomTextField
              fullWidth
              required
              label={actionCopy?.field ?? 'Destino'}
              placeholder={actionCopy?.placeholder}
              helperText={A.action.fieldHelper}
              value={draft.actionDestination}
              onChange={event => patch(next => (next.actionDestination = event.target.value))}
            />
            {draft.actionKind === 'open_meeting_scheduler' ? (
              <CustomTextField
                fullWidth
                required
                label={actionCopy?.secondaryField ?? 'Scheduler key'}
                placeholder={actionCopy?.secondaryPlaceholder ?? 'ej. efeonce-discovery-30'}
                helperText={actionCopy?.secondaryHelper ?? A.action.fieldHelper}
                value={draft.actionSecondaryDestination}
                onChange={event => patch(next => (next.actionSecondaryDestination = event.target.value))}
              />
            ) : null}
            {draft.actionKind !== 'open_growth_form' && draft.actionKind !== 'open_meeting_scheduler' ? (
              <Stack
                direction='row'
                alignItems='center'
                justifyContent='space-between'
                sx={theme => ({ p: 4, borderRadius: `${theme.shape.customBorderRadius.lg}px`, bgcolor: 'action.hover' })}
              >
                <Stack spacing={0.5}>
                  <Typography variant='subtitle2'>{A.action.newContextLabel}</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {A.action.newContextHelper}
                  </Typography>
                </Stack>
                <Switch
                  checked={draft.actionNewContext}
                  onChange={event => patch(next => (next.actionNewContext = event.target.checked))}
                  slotProps={{ input: { 'aria-label': A.action.newContextLabel } }}
                />
              </Stack>
            ) : null}
          </Stack>
        </>
      )
    }

    if (key === 'targeting') {
      return (
        <>
          <StepHead title={A.targeting.title} subtitle={A.targeting.subtitle} icon={STEP_ICON.targeting} />
          <Stack spacing={4}>
            {interruptive ? (
              <Alert severity='warning' icon={<i className='tabler-alert-triangle' />}>
                {A.targeting.interruptiveWarning}
              </Alert>
            ) : null}
            <FieldRow>
              <CustomTextField
                label={A.targeting.routes}
                helperText={A.targeting.routesHelper}
                value={draft.targeting.routes}
                onChange={event => patch(next => (next.targeting.routes = event.target.value))}
              />
              <CustomTextField
                label={A.targeting.excludeRoutes}
                helperText={A.targeting.excludeRoutesHelper}
                value={draft.targeting.excludeRoutes}
                onChange={event => patch(next => (next.targeting.excludeRoutes = event.target.value))}
              />
            </FieldRow>
            <FieldRow>
              <CustomTextField
                type='number'
                label={A.targeting.cooldownDays}
                helperText={A.targeting.cooldownHelper}
                value={draft.suppression.dismissCooldownDays}
                slotProps={{ htmlInput: { min: 1, max: 365 } }}
                onChange={event =>
                  patch(next => (next.suppression.dismissCooldownDays = Math.max(0, Number(event.target.value))))
                }
              />
              <Box />
            </FieldRow>
            <FieldRow>
              <CustomTextField
                type='number'
                label={A.targeting.maxImpressions}
                value={draft.suppression.maxImpressionsPerWindow}
                slotProps={{ htmlInput: { min: 1, max: 50 } }}
                onChange={event =>
                  patch(next => (next.suppression.maxImpressionsPerWindow = Math.max(0, Number(event.target.value))))
                }
              />
              <CustomTextField
                type='number'
                label={A.targeting.windowHours}
                value={draft.suppression.windowHours}
                slotProps={{ htmlInput: { min: 1, max: 720 } }}
                onChange={event => patch(next => (next.suppression.windowHours = Math.max(0, Number(event.target.value))))}
              />
            </FieldRow>
            <Stack
              direction='row'
              alignItems='center'
              justifyContent='space-between'
              sx={theme => ({ p: 4, borderRadius: `${theme.shape.customBorderRadius.lg}px`, bgcolor: 'action.hover' })}
            >
              <Stack spacing={0.5}>
                <Typography variant='subtitle2'>{A.targeting.afterConversion}</Typography>
                <Typography variant='caption' color='text.secondary'>
                  {A.targeting.afterConversionDesc}
                </Typography>
              </Stack>
              <Switch
                checked={draft.suppression.suppressAfterConversion}
                onChange={event => patch(next => (next.suppression.suppressAfterConversion = event.target.checked))}
                slotProps={{ input: { 'aria-label': A.targeting.afterConversion } }}
              />
            </Stack>
          </Stack>
        </>
      )
    }

    if (key === 'preview') {
      return (
        <>
          <StepHead title={A.preview.title} subtitle={A.preview.subtitle} icon={STEP_ICON.preview} />
          <CtaPreviewHarness
            draft={draft}
            degraded={previewDegraded}
            onDegradedChange={setPreviewDegraded}
            diagnostics={diagnostics}
          />
        </>
      )
    }

    // review
    return (
      <>
        <StepHead title={A.review.title} subtitle={A.review.subtitle} icon={STEP_ICON.review} />
        <Stack
          direction='row'
          spacing={3}
          alignItems='center'
          sx={theme => ({
            p: 4,
            mb: 4,
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            bgcolor: blockedCount > 0 ? alpha(theme.palette.error.main, 0.1) : alpha(theme.palette.success.main, 0.1),
            border: `1px solid ${alpha(blockedCount > 0 ? theme.palette.error.main : theme.palette.success.main, 0.3)}`,
          })}
          data-capture='cta-author-review-summary'
        >
          <i
            className={blockedCount > 0 ? 'tabler-alert-octagon' : 'tabler-circle-check'}
            style={{ fontSize: 22 }}
            aria-hidden
          />
          <Stack spacing={0.5}>
            <Typography variant='subtitle2' color={blockedCount > 0 ? 'error.dark' : 'success.dark'}>
              {blockedCount > 0
                ? `${blockedCount} ${blockedCount === 1 ? A.review.blockedOne : A.review.blockedMany}`
                : A.review.readyTitle}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {blockedCount > 0 ? A.review.blockedBody : A.review.readyBody} {A.review.serverNote}
            </Typography>
          </Stack>
        </Stack>
        <Stack divider={<Box sx={{ borderBottom: theme => `1px solid ${theme.palette.divider}` }} />}>
          {checks.map(check => (
            <Stack key={check.key} direction='row' spacing={3} sx={{ py: 3 }} alignItems='flex-start'>
              <Box
                component='i'
                className={check.ok ? 'tabler-circle-check-filled' : 'tabler-alert-circle-filled'}
                sx={{ fontSize: 18, mt: 0.5, color: check.ok ? 'success.main' : 'error.main' }}
                aria-hidden
              />
              <Stack spacing={0.5}>
                <Typography variant='subtitle2' color={check.ok ? 'text.primary' : 'error.main'}>
                  {check.label}
                </Typography>
                <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.45 }}>
                  {check.detail}
                </Typography>
              </Stack>
            </Stack>
          ))}
        </Stack>
        {submitError ? (
          <Alert severity='error' sx={{ mt: 4 }}>
            {submitError}
          </Alert>
        ) : null}
      </>
    )
  }

  const isPreviewStep = STEP_KEYS[step] === 'preview'
  const isReviewStep = STEP_KEYS[step] === 'review'

  // Identidad estable del contract: uno nuevo por render remontaría el renderer en loop.
  const previewContract = useMemo(() => buildPreviewContract(draft, 'nominal', true), [draft])

  return (
    <>
      <Drawer
        anchor='right'
        open={open}
        onClose={requestClose}
        PaperProps={{
          sx: theme => ({
            width: 'min(1160px, 96vw)',
            bgcolor: theme.palette.background.default,
            '&& .MuiInputLabel-root.Mui-focused': { color: theme.palette.customColors.midnight },
          }),
          'aria-label': A.dialogAria,
        }}
        data-capture='cta-authoring-drawer'
      >
        {/* Header */}
        <Stack
          direction='row'
          alignItems='center'
          useFlexGap
          sx={{
            display: { xs: 'grid', sm: 'flex' },
            gridTemplateColumns: { xs: '36px minmax(0, 1fr) auto', sm: undefined },
            columnGap: { xs: 2, sm: 3 },
            rowGap: { xs: 1, sm: 0 },
            px: 5,
            py: 3,
            flexShrink: 0,
            bgcolor: 'background.paper',
            borderBottom: theme => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            sx={theme => ({
              width: 36,
              height: 36,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.dark',
              bgcolor: alpha(theme.palette.primary.main, 0.12),
            })}
          >
            <i className='tabler-wand' style={{ fontSize: 18 }} aria-hidden />
          </Box>
          <Stack spacing={0}>
            <Typography variant='subtitle1' color='text.primary' sx={{ fontWeight: 600 }}>
              {existingSlug ? A.titleEdit : A.titleNew}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {existingSlug ? A.subtitleEdit : A.subtitleNew}
            </Typography>
          </Stack>
          <Box sx={{ display: { xs: 'none', sm: 'block' }, flex: 1 }} />
          {dirty ? (
            <Box
              component='span'
              sx={theme => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                gridColumn: { xs: '2 / 3', sm: 'auto' },
                gridRow: { xs: 2, sm: 'auto' },
                justifySelf: 'start',
                whiteSpace: 'nowrap',
                px: 2,
                py: 1,
                borderRadius: '9999px',
                typography: 'caption',
                fontWeight: 600,
                color: 'text.primary',
                bgcolor: alpha(theme.palette.warning.main, 0.16),
              })}
              data-capture='cta-author-dirty-badge'
            >
              <i className='tabler-point-filled' style={{ fontSize: 14 }} aria-hidden />
              {A.dirtyBadge}
            </Box>
          ) : null}
          <Button
            variant='outlined'
            color='inherit'
            size='small'
            onClick={requestClose}
            aria-label={A.closeAria}
            sx={{
              gridColumn: { xs: 3, sm: 'auto' },
              gridRow: { xs: 1, sm: 'auto' },
              alignSelf: 'start',
              minWidth: 38,
              px: 2,
              color: 'text.secondary',
              borderColor: 'divider'
            }}
          >
            <i className='tabler-x' style={{ fontSize: 18 }} aria-hidden />
          </Button>
        </Stack>

        {/* Body: rail + content + preview contextual */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: isPreviewStep || isReviewStep ? '224px minmax(0, 1fr)' : '224px minmax(0, 1fr) 340px',
            },
            overflow: 'hidden',
          }}
        >
          {/* Step rail */}
          <Stack
            component='nav'
            aria-label={A.stepRailAria}
            sx={{
              display: { xs: 'none', md: 'flex' },
              borderRight: theme => `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper',
              p: 3.5,
              gap: 1,
              overflowY: 'auto',
            }}
          >
            {STEP_KEYS.map((stepKey, index) => {
              const active = index === step
              const done = index < step

              return (
                <Box
                  key={stepKey}
                  component='button'
                  type='button'
                  onClick={() => setStep(index)}
                  aria-current={active ? 'step' : undefined}
                  sx={theme => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    textAlign: 'left',
                    p: 2,
                    borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                    cursor: 'pointer',
                    font: 'inherit',
                    border: 'none',
                    bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    '&:hover': { bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : theme.palette.action.hover },
                    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                  })}
                >
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      typography: 'caption',
                      fontWeight: 700,
                      color: active || done ? 'primary.contrastText' : 'text.secondary',
                      bgcolor: active ? 'primary.main' : done ? 'success.main' : 'background.paper',
                      border: theme =>
                        `1.5px solid ${active ? theme.palette.primary.main : done ? theme.palette.success.main : theme.palette.divider}`,
                    }}
                  >
                    {done ? <i className='tabler-check' style={{ fontSize: 16 }} aria-hidden /> : index + 1}
                  </Box>
                  <Stack spacing={0} sx={{ minWidth: 0 }}>
                    <Typography variant='caption' sx={{ fontWeight: 600, color: active ? 'primary.dark' : 'text.primary' }}>
                      {A.steps[stepKey].label}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {A.steps[stepKey].hint}
                    </Typography>
                  </Stack>
                </Box>
              )
            })}
            <Stack sx={{ mt: 'auto', pt: 3.5, borderTop: theme => `1px solid ${theme.palette.divider}` }} spacing={1.5}>
              <Typography
                variant='caption'
                sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', fontWeight: 600 }}
              >
                {A.draftSummaryTitle}
              </Typography>
              {draftSummary.map(item => (
                <Stack key={item.label} direction='row' justifyContent='space-between' gap={2}>
                  <Typography variant='caption' color='text.secondary'>
                    {item.label}
                  </Typography>
                  <Typography variant='caption' sx={{ fontWeight: 600, maxWidth: 110 }} noWrap>
                    {item.value}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>

          {/* Step content */}
          <Box
            role='region'
            aria-label={A.steps[STEP_KEYS[step]].label}
            tabIndex={0}
            sx={{ minWidth: 0, overflowY: 'auto', overflowX: 'clip', p: { xs: 4, md: 6 } }}
            data-capture='cta-author-step-content'
          >
            {stepBody()}
          </Box>

          {/* Preview contextual (columna derecha; se oculta en preview/review) */}
          {!isPreviewStep && !isReviewStep ? (
            <Stack
              spacing={3}
              sx={{
                display: { xs: 'none', md: 'flex' },
                borderLeft: theme => `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper',
                p: 4,
                overflowY: 'auto',
              }}
              data-capture='cta-author-context-preview'
            >
              <Stack direction='row' alignItems='center' justifyContent='space-between'>
                <Typography variant='caption' sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  {O.cockpit.detail.previewTitle}
                </Typography>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <i className='tabler-eye' style={{ fontSize: 14 }} aria-hidden />
                  en vivo
                </Typography>
              </Stack>
              <PreviewFrame contract={previewContract} host='think' scheme='light' heightPx={300} mini />
              <DiagnosticChips items={diagnostics} />
            </Stack>
          ) : null}
        </Box>

        {/* Footer */}
        <Stack
          direction='row'
          alignItems='center'
          spacing={3}
          sx={{
            px: 5,
            py: 3,
            flexShrink: 0,
            bgcolor: 'background.paper',
            borderTop: theme => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Button color='inherit' onClick={requestClose} disabled={submitting} sx={{ color: 'text.secondary' }}>
            {A.cancel}
          </Button>
          <Box sx={{ flex: 1 }} />
          {step > 0 ? (
            <Button
              variant='outlined'
              color='inherit'
              startIcon={<i className='tabler-arrow-left' style={{ fontSize: 16 }} />}
              onClick={() => setStep(current => Math.max(0, current - 1))}
              disabled={submitting}
              sx={{ color: 'text.secondary', borderColor: 'divider' }}
            >
              {A.back}
            </Button>
          ) : null}
          {step < STEP_KEYS.length - 1 ? (
            <Button
              variant='contained'
              endIcon={<i className='tabler-arrow-right' style={{ fontSize: 16 }} />}
              onClick={() => canAdvance(step) && setStep(current => Math.min(STEP_KEYS.length - 1, current + 1))}
              disabled={!canAdvance(step)}
              data-capture='cta-author-next'
            >
              {step === 5 ? A.nextToPreview : step === 6 ? A.nextToReview : A.next}
            </Button>
          ) : (
            <Button
              variant='contained'
              color='primary'
              startIcon={<i className='tabler-send' style={{ fontSize: 16 }} />}
              onClick={() => void submit()}
              disabled={submitting || blockedCount > 0}
              data-capture='cta-author-submit'
            >
              {submitting ? A.submitting : existingSlug ? A.submitEdit : A.submitNew}
            </Button>
          )}
        </Stack>
      </Drawer>

      <ConfirmDialog
        open={discardOpen}
        setOpen={setDiscardOpen}
        title={A.discardTitle}
        description={A.discardBody}
        confirmLabel={A.discardConfirm}
        cancelLabel={A.discardCancel}
        confirmColor='error'
        onConfirm={() => {
          setDiscardOpen(false)
          setDirty(false)
          onClose()
        }}
      />
    </>
  )
}

export default CtaAuthoringDrawer
