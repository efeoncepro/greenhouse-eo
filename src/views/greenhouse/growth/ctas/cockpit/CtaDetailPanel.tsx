'use client'

/**
 * TASK-1430 — detalle del CTA seleccionado (aside del cockpit): header con ejes,
 * lifecycle bar, postura de kill switch (global/surface — el stop per-CTA es
 * `pause`), preview contextual con el renderer canónico, métricas de marketing
 * (server-resolved; la UI jamás deriva rates), superficies, supresión y
 * versiones. Autoridad visual: mock Claude Design con tokens del theme.
 */
import { useMemo } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'

import {
  ContextCommandBar,
  DetailHero,
  GreenhouseButton,
  GreenhouseChip,
  OperationalSection,
  PreviewStage,
} from '@/components/greenhouse/primitives'
import { GH_GROWTH_CTA_OPERATOR } from '@/lib/copy/growth'
import { formatDate, formatDateTime, formatNumber, formatPercent } from '@/lib/format'
import { surfaceAllowsCtaSlug } from '@/lib/growth/ctas/contracts'
import type { CtaSurfaceVm } from '@/lib/growth/ctas/readers'

import {
  ACTION_ICON,
  APPEARANCE_KINDS,
  buildPreviewContract,
  draftFromVersion,
  INTENT_ICON,
  PLACEMENT_ICON,
  resolveIntentKind,
  STATUS_TONE,
  type CtaActionKind,
  type CtaAppearanceKind,
  type CtaDetailClient,
  type CtaKillSwitchStateClient,
  type CtaCockpitCapabilities,
  type CtaMarketingMetricsClient,
  type CtaPlacement,
} from './cta-cockpit-meta'
import { DiagnosticChips, PreviewFrame } from './CtaPreviewHarness'

const O = GH_GROWTH_CTA_OPERATOR
const C = O.cockpit

export type LifecycleActionKind = 'submit_review' | 'publish' | 'pause' | 'resume' | 'deprecate' | 'archive'

export interface LifecycleRequest {
  action: LifecycleActionKind
  ctaVersionId: string
  ctaName: string
}

/** Radius canónico como CSS length (overlay modern-ui: jamás multiplicadores sx). */
const radius = (theme: Theme, key: 'sm' | 'md' | 'lg' | 'xl') => `${theme.shape.customBorderRadius[key]}px`

// ─── Métricas (formato canónico src/lib/format; rates ya vienen resueltos) ────

const formatCount = (value: number): string => formatNumber(value)

const formatRate = (value: number | null): string => (value === null ? '—' : formatPercent(value))

const MetricDelta = ({ delta, unit }: { delta: number | null; unit: 'pct' | 'pp' }) => {
  if (delta === null) {
    return (
      <Typography variant='caption' color='text.secondary'>
        {C.metrics.deltaNew}
      </Typography>
    )
  }

  const down = delta < 0
  const formatted = `${down ? '' : '+'}${formatNumber(delta, { maximumFractionDigits: 1 })}${unit === 'pct' ? ' %' : ' pp'}`

  return (
    <Typography
      variant='caption'
      sx={{
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        color: down ? 'error.main' : 'success.main',
      }}
    >
      <i className={down ? 'tabler-trending-down' : 'tabler-trending-up'} style={{ fontSize: 14 }} aria-hidden />
      {formatted} {C.metrics.deltaVsPrev}
    </Typography>
  )
}

const TrustTag = ({ trust }: { trust: 'browser' | 'server' }) => (
  <GreenhouseChip
    kind='attribute'
    size='small'
    variant='label'
    tone={trust === 'server' ? 'success' : 'info'}
    label={trust === 'server' ? C.metrics.trustServer : C.metrics.trustBrowser}
  />
)

const MetricCard = ({
  label,
  value,
  delta,
  deltaUnit,
  trust,
}: {
  label: string
  value: string
  delta: number | null
  deltaUnit: 'pct' | 'pp'
  trust: 'browser' | 'server'
}) => (
  <Stack
    spacing={2}
    sx={theme => ({
      p: 4,
      borderRadius: radius(theme, 'lg'),
      bgcolor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider'
    })}
  >
    <Typography variant='caption' sx={{ fontWeight: 600, color: 'text.secondary' }}>
      {label}
    </Typography>
    <Typography variant='kpiValue' component='p' sx={{ lineHeight: 1 }}>
      {value}
    </Typography>
    <Stack direction='row' alignItems='center' gap={2} flexWrap='wrap'>
      <MetricDelta delta={delta} unit={deltaUnit} />
      <TrustTag trust={trust} />
    </Stack>
  </Stack>
)

const MetricsSection = ({
  metrics,
  suppressionEnforced,
}: {
  metrics: CtaMarketingMetricsClient | null
  suppressionEnforced: boolean
}) => {
  if (!metrics) {
    return (
      <Alert severity='warning' icon={<i className='tabler-clock-exclamation' />} data-capture='cta-detail-metrics-partial'>
        <strong>{C.metrics.partialTitle}.</strong> {C.metrics.partialBody}
      </Alert>
    )
  }

  const undercounted = metrics.coverage === 'impressions_undercounted'
  const aligned = metrics.coverage === 'aligned_partial'

  return (
    <OperationalSection
      title={C.metrics.title}
      description={`${C.metrics.windowLabel} · ${metrics.lastEventAt ? `${C.metrics.updated} ${formatDateTime(metrics.lastEventAt)}` : C.metrics.neverMeasured}`}
      action={
        <GreenhouseChip
          kind='status'
          size='small'
          variant='label'
          tone={suppressionEnforced ? 'success' : 'info'}
          iconClassName='tabler-shield-check'
          label={suppressionEnforced ? C.metrics.enforcementOn : C.metrics.enforcementShadow}
        />
      }
      kind='evidence'
      dataCapture='cta-detail-metrics'
    >
      <Stack spacing={4}>
        {undercounted ? (
          <Alert severity='info' icon={<i className='tabler-info-circle' />}>
            {C.metrics.coverageUndercounted}
          </Alert>
        ) : aligned ? (
          <Alert severity='info' icon={<i className='tabler-info-circle' />}>
            {C.metrics.coverageAligned.replace('{date}', metrics.coverageSince ? formatDate(metrics.coverageSince) : '—')}
          </Alert>
        ) : null}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 3 }}>
          <MetricCard
            label={C.metrics.impressions}
            value={formatCount(metrics.impressions.current)}
            delta={metrics.impressions.deltaPct}
            deltaUnit='pct'
            trust='browser'
          />
          <MetricCard
            label={C.metrics.clicks}
            value={formatCount(metrics.clicks.current)}
            delta={metrics.clicks.deltaPct}
            deltaUnit='pct'
            trust='browser'
          />
          <MetricCard
            label={C.metrics.conversions}
            value={formatCount(metrics.conversions.current)}
            delta={metrics.conversions.deltaPct}
            deltaUnit='pct'
            trust='server'
          />
          {undercounted ? (
            <Stack
              spacing={1}
              sx={theme => ({ p: 4, borderRadius: radius(theme, 'lg'), border: `1px dashed ${theme.palette.divider}`, justifyContent: 'center' })}
            >
              <Typography variant='caption' sx={{ fontWeight: 600, color: 'text.secondary' }}>
                {C.metrics.ctr} · {C.metrics.conversionRate}
              </Typography>
              <Typography variant='kpiValue' component='p' color='text.secondary' sx={{ lineHeight: 1 }}>
                —
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {C.metrics.rateNoData}
              </Typography>
            </Stack>
          ) : (
            <MetricCard
              label={C.metrics.ctr}
              value={formatRate(metrics.ctr.current)}
              delta={metrics.ctr.deltaPp}
              deltaUnit='pp'
              trust='browser'
            />
          )}
          {!undercounted ? (
            <MetricCard
              label={C.metrics.conversionRate}
              value={formatRate(metrics.conversionRate.current)}
              delta={metrics.conversionRate.deltaPp}
              deltaUnit='pp'
              trust='server'
            />
          ) : null}
        </Box>
        <Typography variant='caption' color='text.secondary'>
          {C.metrics.conversionTruthHint}
        </Typography>
      </Stack>
    </OperationalSection>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export interface CtaDetailPanelProps {
  detail: CtaDetailClient | null
  loading: boolean
  loadError: boolean
  onRetry: () => void
  surfaces: CtaSurfaceVm[]
  killState: CtaKillSwitchStateClient
  capabilities: CtaCockpitCapabilities
  engineEnabled: boolean
  suppressionEnforced: boolean
  busyAction: string | null
  latestKillAudit: { scope: string; action: string; reason: string; actorRef: string | null; createdAt: string } | null
  onEdit: () => void
  onLifecycle: (request: LifecycleRequest) => void
  onKillToggle: (scope: 'global' | 'surface', surfaceId: string | null, action: 'engage' | 'release') => void
}

const CtaDetailPanel = ({
  detail,
  loading,
  loadError,
  onRetry,
  surfaces,
  killState,
  capabilities,
  engineEnabled,
  suppressionEnforced,
  busyAction,
  latestKillAudit,
  onEdit,
  onLifecycle,
  onKillToggle,
}: CtaDetailPanelProps) => {
  const latest = detail?.versions[0] ?? null

  const previewDraft = useMemo(() => {
    if (!detail || !latest) return null

    const suppression =
      latest.suppressionPolicy && typeof latest.suppressionPolicy === 'object'
        ? (latest.suppressionPolicy as Record<string, unknown>)
        : null

    return draftFromVersion(detail.summary, latest, suppression)
  }, [detail, latest])

  // Identidad estable: un contract nuevo por render remontaría el renderer en loop.
  const previewContract = useMemo(
    () => (previewDraft ? buildPreviewContract(previewDraft, 'nominal', true) : null),
    [previewDraft],
  )

  if (loading) {
    return (
      <Stack spacing={4} data-capture='cta-detail-loading'>
        <Skeleton variant='rounded' height={26} width='60%' />
        <Skeleton variant='rounded' height={16} width='40%' />
        <Skeleton variant='rounded' height={200} />
        <Skeleton variant='rounded' height={120} />
      </Stack>
    )
  }

  if (loadError) {
    return (
      <Stack
        spacing={3}
        alignItems='center'
        sx={{ p: 10, textAlign: 'center' }}
      >
        <Box
          sx={theme => ({
            width: 48,
            height: 48,
            borderRadius: radius(theme, 'lg'),
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'error.dark',
            bgcolor: alpha(theme.palette.error.main, 0.12),
          })}
        >
          <i className='tabler-cloud-off' style={{ fontSize: 22 }} aria-hidden />
        </Box>
        <Typography variant='subtitle2'>{C.detail.loadError}</Typography>
        <GreenhouseButton kind='secondaryAction' variant='outlined' size='small' leadingIconClassName='tabler-refresh' onClick={onRetry}>
          {C.detail.retry}
        </GreenhouseButton>
      </Stack>
    )
  }

  if (!detail || !latest || !previewDraft) return null

  const { summary } = detail
  const intent = resolveIntentKind(summary.purpose)
  const statusLabel = O.inventory.statusLabels[summary.latestVersionStatus ?? 'draft'] ?? summary.latestVersionStatus
  const boundSurfaces = surfaces.filter(surface => surfaceAllowsCtaSlug(surface.allowedCtaSlugs, summary.slug))
  const killedBySwitch = isKilledBySwitch(killState, boundSurfaces)

  const appearance = (APPEARANCE_KINDS as readonly string[]).includes(latest.styleVariant ?? '')
    ? ((latest.styleVariant ?? 'default') as CtaAppearanceKind)
    : 'default'

  const actionKind = previewDraft.actionKind as CtaActionKind
  const placement = previewDraft.placement as CtaPlacement

  const diagnostics = [
    { k: C.detail.diag.placement, v: C.author.placement.kinds[placement]?.label ?? placement },
    { k: C.detail.diag.appearance, v: C.author.appearance.kinds[appearance]?.label ?? appearance },
    { k: C.detail.diag.density, v: C.detail.diag.densityDerived },
    { k: C.detail.diag.action, v: C.author.action.kinds[actionKind]?.label ?? actionKind },
    { k: C.detail.diag.contract, v: `v${summary.latestVersion ?? 1}` },
  ]

  // Lifecycle disponible por estado + capability (el server re-valida siempre).
  const lifecycleActions: Array<{ key: LifecycleActionKind; label: string; icon: string; variant: 'contained' | 'outlined' | 'text'; versionId: string; allowed: boolean }> = []

  if (summary.latestVersionStatus === 'draft' && summary.latestVersionId) {
    lifecycleActions.push({ key: 'submit_review', label: O.actions.submitReview, icon: 'tabler-send', variant: 'contained', versionId: summary.latestVersionId, allowed: capabilities.canAuthor })
  }

  if (summary.latestVersionStatus === 'review' && summary.latestVersionId) {
    lifecycleActions.push({ key: 'publish', label: O.actions.publish, icon: 'tabler-rocket', variant: 'contained', versionId: summary.latestVersionId, allowed: capabilities.canPublish })
  }

  if (summary.publishedVersionId) {
    lifecycleActions.push({ key: 'pause', label: O.actions.pause, icon: 'tabler-player-pause', variant: 'outlined', versionId: summary.publishedVersionId, allowed: capabilities.canPause })
  }

  if (summary.latestVersionStatus === 'paused' && summary.latestVersionId) {
    lifecycleActions.push({ key: 'resume', label: O.actions.resume, icon: 'tabler-player-play', variant: 'contained', versionId: summary.latestVersionId, allowed: capabilities.canPause })
  }

  if ((summary.latestVersionStatus === 'published' || summary.latestVersionStatus === 'paused') && summary.latestVersionId) {
    lifecycleActions.push({ key: 'deprecate', label: C.lifecycle.deprecate, icon: 'tabler-archive', variant: 'text', versionId: summary.latestVersionId, allowed: capabilities.canPublish })
  }

  if (summary.latestVersionStatus === 'deprecated' && summary.latestVersionId) {
    lifecycleActions.push({ key: 'archive', label: C.lifecycle.archive, icon: 'tabler-archive-off', variant: 'text', versionId: summary.latestVersionId, allowed: capabilities.canPublish })
  }

  const primaryLifecycle = lifecycleActions.find(action => action.variant === 'contained') ?? null
  const secondaryLifecycle = lifecycleActions.filter(action => action !== primaryLifecycle)

  const lifecycleButton = (action: (typeof lifecycleActions)[number], primary = false) => (
    <GreenhouseButton
      key={action.key}
      kind={primary ? 'primaryAction' : 'secondaryAction'}
      variant={primary ? 'solid' : action.variant === 'outlined' ? 'outlined' : 'text'}
      tone={action.key === 'pause' ? 'warning' : action.key === 'deprecate' || action.key === 'archive' ? 'error' : 'primary'}
      size='small'
      leadingIconClassName={action.icon}
      disabled={!action.allowed || !engineEnabled || busyAction !== null}
      onClick={() => onLifecycle({ action: action.key, ctaVersionId: action.versionId, ctaName: summary.name })}
    >
      {busyAction === `${summary.ctaId}:${action.key}` ? C.lifecycle.busyGeneric : action.label}
    </GreenhouseButton>
  )

  const targeting = previewDraft.targeting
  const suppression = previewDraft.suppression

  return (
    <Stack spacing={4} data-capture='cta-detail'>
      {/* Header: DetailHero + ContextCommandBar (surface-system TASK-1453) */}
      <Stack spacing={0}>
        <DetailHero
          kind='entity'
          dataCapture='cta-detail-hero'
          title={summary.name}
          statusLabel={statusLabel ?? ''}
          statusTone={STATUS_TONE[summary.latestVersionStatus ?? 'draft'] ?? 'default'}
          description={
            <Typography variant='monoId' color='text.secondary' component='span'>
              {summary.slug} · v{summary.latestVersion ?? 1} {summary.campaignSlug ? `· ${summary.campaignSlug}` : ''}
            </Typography>
          }
          metadata={
            <Stack direction='row' gap={2} flexWrap='wrap'>
              {intent ? (
                <GreenhouseChip kind='attribute' size='small' variant='outlined' iconClassName={INTENT_ICON[intent]} label={C.author.intent.kinds[intent].label} />
              ) : null}
              <GreenhouseChip kind='attribute' size='small' variant='outlined' iconClassName={PLACEMENT_ICON[placement]} label={C.author.placement.kinds[placement]?.label ?? placement} />
              <GreenhouseChip kind='attribute' size='small' variant='outlined' iconClassName='tabler-palette' label={C.author.appearance.kinds[appearance]?.label ?? appearance} />
              <GreenhouseChip kind='attribute' size='small' variant='outlined' tone='primary' iconClassName={ACTION_ICON[actionKind]} label={C.author.action.kinds[actionKind]?.label ?? actionKind} />
            </Stack>
          }
        />
        <ContextCommandBar
          kind='workbench'
          ariaLabel={C.detail.lifecycleBarAria}
          dataCapture='cta-detail-lifecycle'
          primaryAction={
            primaryLifecycle ? (
              lifecycleButton(primaryLifecycle, true)
            ) : (
              <GreenhouseButton
                kind='primaryAction'
                size='small'
                leadingIconClassName='tabler-pencil'
                onClick={onEdit}
                disabled={!capabilities.canAuthor}
                aria-label={C.detail.editAria}
              >
                {C.detail.edit}
              </GreenhouseButton>
            )
          }
          secondaryActions={
            <>
              {primaryLifecycle ? (
                <GreenhouseButton
                  kind='secondaryAction'
                  variant='outlined'
                  tone='primary'
                  size='small'
                  leadingIconClassName='tabler-pencil'
                  onClick={onEdit}
                  disabled={!capabilities.canAuthor}
                  aria-label={C.detail.editAria}
                >
                  {C.detail.edit}
                </GreenhouseButton>
              ) : null}
              {secondaryLifecycle.map(action => lifecycleButton(action))}
            </>
          }
          status={
            <Typography variant='caption' color='text.secondary' sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              <i className='tabler-git-branch' style={{ fontSize: 14 }} aria-hidden />
              v{summary.latestVersion ?? 1} {C.detail.versionCurrent}
            </Typography>
          }
        />
      </Stack>

      {/* Kill switch posture */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        gap={3.5}
        sx={theme => ({
          p: { xs: 3.5, md: 4 },
          borderRadius: radius(theme, 'lg'),
          bgcolor: killedBySwitch ? alpha(theme.palette.error.main, 0.08) : 'transparent',
          border: '1px solid',
          borderColor: killedBySwitch ? alpha(theme.palette.error.main, 0.4) : 'divider'
        })}
        data-capture='cta-detail-kill'
      >
        <Box
          sx={theme => ({
            width: 40,
            height: 40,
            borderRadius: radius(theme, 'lg'),
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: killedBySwitch ? 'error.contrastText' : 'primary.main',
            bgcolor: killedBySwitch ? theme.palette.error.main : theme.palette.primary.lightOpacity,
          })}
        >
          <i className='tabler-power' style={{ fontSize: 20 }} aria-hidden />
        </Box>
        <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant='subtitle2' color='text.primary'>{C.kill.title}</Typography>
          <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.45 }}>
            {killState.globalKilled ? C.kill.globalOnDesc : C.kill.globalOffDesc}
          </Typography>
          {killedBySwitch ? (
            <Typography variant='caption' sx={{ color: 'error.main', fontWeight: 600 }}>
              {C.kill.affectsCta}
            </Typography>
          ) : null}
          {latestKillAudit ? (
            <Typography variant='caption' color='text.secondary' data-capture='cta-kill-audit'>
              {C.kill.auditTitle}: {latestKillAudit.actorRef ?? '—'}{' '}
              {latestKillAudit.action === 'engage' ? C.kill.auditEngaged : C.kill.auditReleased} ·{' '}
              «{latestKillAudit.reason}» · {formatDateTime(latestKillAudit.createdAt)}
            </Typography>
          ) : null}
        </Stack>
        <Button
          size='small'
          variant={killState.globalKilled ? 'contained' : 'outlined'}
          color={killState.globalKilled ? 'success' : 'error'}
          startIcon={<i className={killState.globalKilled ? 'tabler-player-play' : 'tabler-power'} style={{ fontSize: 16 }} />}
          disabled={!capabilities.canPause || busyAction !== null}
          onClick={() => onKillToggle('global', null, killState.globalKilled ? 'release' : 'engage')}
          data-capture='cta-detail-kill-toggle'
        >
          {killState.globalKilled ? C.kill.release : C.kill.engage}
        </Button>
      </Stack>

      {/* Preview: renderer canónico en vivo (PreviewStage) */}
      <PreviewStage
        variant='live'
        title={C.detail.previewTitle}
        description={C.detail.previewSubtitle}
        toolbar={
          <GreenhouseButton kind='secondaryAction' size='small' variant='outlined' tone='secondary' leadingIconClassName='tabler-arrows-maximize' onClick={onEdit} disabled={!capabilities.canAuthor}>
            {C.detail.openPreview}
          </GreenhouseButton>
        }
        dataCapture='cta-detail-preview'
      >
        <Stack spacing={3.5}>
          {previewContract ? <PreviewFrame contract={previewContract} host='think' scheme='light' heightPx={300} mini /> : null}
          <DiagnosticChips items={diagnostics} />
          <Typography variant='caption' color='text.secondary'>
            {C.detail.diagnosticsNote}
          </Typography>
        </Stack>
      </PreviewStage>

      {/* Métricas de marketing */}
      <MetricsSection metrics={detail.metrics} suppressionEnforced={suppressionEnforced} />

      {/* Superficies */}
      <OperationalSection title={C.surfaces.title} dataCapture='cta-surfaces'>
        <Stack divider={<Box sx={{ borderBottom: theme => `1px solid ${theme.palette.divider}` }} />}>
          {surfaces.map(surface => {
            const bound = surfaceAllowsCtaSlug(surface.allowedCtaSlugs, summary.slug)
            const killed = killState.killedSurfaceIds.includes(surface.surfaceId)

            return (
              <Stack key={surface.surfaceId} direction='row' alignItems='center' gap={3} flexWrap='wrap' sx={{ py: 2.75 }}>
                <Box
                  sx={theme => ({
                    width: 36,
                    height: 36,
                    borderRadius: radius(theme, 'md'),
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main',
                    bgcolor: 'primary.lightOpacity',
                  })}
                >
                  <i className={surface.surfaceKind === 'wordpress' ? 'tabler-brand-wordpress' : 'tabler-square-rounded'} style={{ fontSize: 18 }} aria-hidden />
                </Box>
                <Stack spacing={0} sx={{ flex: '1 1 220px', minWidth: 0 }}>
                  <Typography variant='subtitle2' color='text.primary' noWrap>
                    {surface.surfaceName}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {surface.surfaceKind} · {C.surfaces.channelLabel} {surface.rendererChannel}
                  </Typography>
                </Stack>
                {killed ? (
                  <GreenhouseChip kind='status' size='small' tone='error' iconClassName='tabler-power' label={C.surfaces.killed} />
                ) : bound ? (
                  <GreenhouseChip kind='status' size='small' tone='success' iconClassName='tabler-link' label={C.surfaces.bound} />
                ) : (
                  <GreenhouseChip kind='status' size='small' variant='outlined' iconClassName='tabler-unlink' label={C.surfaces.unbound} />
                )}
                {capabilities.canPause ? (
                  <Button
                    size='small'
                    color={killed ? 'success' : 'error'}
                    disabled={busyAction !== null}
                    onClick={() => onKillToggle('surface', surface.surfaceId, killed ? 'release' : 'engage')}
                  >
                    {killed ? C.kill.release : C.kill.engage}
                  </Button>
                ) : null}
              </Stack>
            )
          })}
        </Stack>
      </OperationalSection>

      {/* Supresión + versiones */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 4 }}>
        <OperationalSection title={C.targeting.title} dataCapture='cta-detail-suppression'>
          <Stack divider={<Box sx={{ borderBottom: theme => `1px solid ${theme.palette.divider}` }} />}>
            {[
              { icon: 'tabler-route', label: C.targeting.routes, value: targeting.routes },
              { icon: 'tabler-route-off', label: C.targeting.excludeRoutes, value: targeting.excludeRoutes || C.targeting.noExclusions },
              { icon: 'tabler-eye-off', label: C.targeting.cooldown, value: C.targeting.cooldownValue.replace('{days}', String(suppression.dismissCooldownDays)) },
              {
                icon: 'tabler-repeat',
                label: C.targeting.frequencyCap,
                value: C.targeting.frequencyCapValue
                  .replace('{max}', String(suppression.maxImpressionsPerWindow))
                  .replace('{hours}', String(suppression.windowHours)),
              },
              {
                icon: 'tabler-circle-check',
                label: C.targeting.afterConversion,
                value: suppression.suppressAfterConversion ? C.targeting.afterConversionOn : C.targeting.afterConversionOff,
              },
            ].map(row => (
              <Stack key={row.label} direction='row' spacing={2.5} sx={{ py: 2.5 }} alignItems='flex-start'>
                <i className={row.icon} style={{ fontSize: 16, marginTop: 2 }} aria-hidden />
                <Stack spacing={0}>
                  <Typography variant='caption' sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', color: 'text.secondary', fontWeight: 600 }}>
                    {row.label}
                  </Typography>
                  <Typography variant='body2'>{row.value}</Typography>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </OperationalSection>

        <OperationalSection title={C.versions.title} dataCapture='cta-detail-versions'>
          <Stack divider={<Box sx={{ borderBottom: theme => `1px solid ${theme.palette.divider}` }} />}>
            {detail.versions.map((version, index) => (
              <Stack key={version.ctaVersionId} direction='row' spacing={3} sx={{ py: 2.5 }} alignItems='flex-start'>
                <Box
                  sx={{
                    width: 9,
                    height: 9,
                    mt: 1.25,
                    borderRadius: '50%',
                    flexShrink: 0,
                    bgcolor: index === 0 ? 'primary.main' : 'divider',
                    boxShadow: theme => (index === 0 ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.16)}` : 'none'),
                  }}
                />
                <Stack spacing={0} sx={{ minWidth: 0 }}>
                  <Typography variant='subtitle2' color='text.primary'>
                    v{version.version} · {O.inventory.statusLabels[version.status] ?? version.status}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {index === 0 ? `${C.versions.current} · ` : ''}
                    {version.publishedAt
                      ? `${C.versions.publishedAt} ${formatDate(version.publishedAt)}`
                      : formatDate(version.createdAt)}
                  </Typography>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </OperationalSection>
      </Box>
    </Stack>
  )
}

const isKilledBySwitch = (killState: CtaKillSwitchStateClient, boundSurfaces: CtaSurfaceVm[]): boolean =>
  killState.globalKilled || boundSurfaces.some(surface => killState.killedSurfaceIds.includes(surface.surfaceId))

export default CtaDetailPanel
