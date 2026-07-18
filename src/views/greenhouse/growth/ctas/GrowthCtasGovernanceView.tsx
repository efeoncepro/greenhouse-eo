'use client'

/**
 * TASK-1430 — Cockpit operator de CTAs (`/growth/ctas`): inventario master +
 * detalle contextual + autoría gobernada + kill switches + resultados, sobre
 * los readers/commands canónicos (Full API Parity — esta vista es un consumer
 * más del primitive `growth.cta`; cero regla de negocio local).
 *
 * Evolución de la vista TASK-1340. Autoridad visual: proyecto Claude Design
 * "Cockpit de CTAs" (instrucción del operador 2026-07-18) con tokens del theme.
 * Wireframe: docs/ui/wireframes/TASK-1430-growth-cta-authoring-reporting-cockpit.md
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog'
import EmptyState from '@/components/greenhouse/EmptyState'
import { CompositionShell, GreenhouseBreadcrumbs, GreenhouseChip } from '@/components/greenhouse/primitives'
import { GH_GROWTH_CTA_OPERATOR } from '@/lib/copy/growth'
import { throwIfNotOk } from '@/lib/api/parse-error-response'
import type { CtaSummaryVm, CtaSurfaceVm } from '@/lib/growth/ctas/readers'

import CtaAuthoringDrawer from './cockpit/CtaAuthoringDrawer'
import CtaDetailPanel, { type LifecycleRequest } from './cockpit/CtaDetailPanel'
import CtaInventoryPanel, { type CtaInventoryFilters } from './cockpit/CtaInventoryPanel'
import {
  draftFromVersion,
  newAuthoringDraft,
  type CtaAuthoringDraft,
  type CtaCockpitCapabilities,
  type CtaDetailClient,
  type CtaKillSwitchAuditClient,
  type CtaKillSwitchStateClient,
} from './cockpit/cta-cockpit-meta'

const O = GH_GROWTH_CTA_OPERATOR
const C = O.cockpit

interface Props {
  ctas: CtaSummaryVm[]
  surfaces: CtaSurfaceVm[]
  engineEnabled: boolean
  suppressionEnforced: boolean
  killState: CtaKillSwitchStateClient
  killAudit: CtaKillSwitchAuditClient[]
  capabilities: CtaCockpitCapabilities
  loadError?: boolean
}

interface PendingLifecycle extends LifecycleRequest {
  ctaId: string
  title: string
  body: string
  confirmLabel: string
  confirmColor: 'primary' | 'error' | 'warning' | 'success'
  needsConfirm: boolean
}

interface PendingKill {
  scope: 'global' | 'surface'
  surfaceId: string | null
  action: 'engage' | 'release'
}

const LIFECYCLE_CONFIRM: Record<
  LifecycleRequest['action'],
  { title: string; body: string; confirmLabel: string; confirmColor: PendingLifecycle['confirmColor']; needsConfirm: boolean }
> = {
  submit_review: { title: '', body: '', confirmLabel: O.actions.submitReview, confirmColor: 'primary', needsConfirm: false },
  publish: {
    title: O.actions.confirmPublishTitle,
    body: O.actions.confirmPublishBody,
    confirmLabel: O.actions.publish,
    confirmColor: 'primary',
    needsConfirm: true,
  },
  pause: {
    title: O.actions.confirmPauseTitle,
    body: O.actions.confirmPauseBody,
    confirmLabel: O.actions.pause,
    confirmColor: 'warning',
    needsConfirm: true,
  },
  resume: {
    title: C.lifecycle.resumeConfirmTitle,
    body: C.lifecycle.resumeConfirmBody,
    confirmLabel: O.actions.resume,
    confirmColor: 'primary',
    needsConfirm: true,
  },
  deprecate: {
    title: C.lifecycle.deprecateConfirmTitle,
    body: C.lifecycle.deprecateConfirmBody,
    confirmLabel: C.lifecycle.deprecate,
    confirmColor: 'error',
    needsConfirm: true,
  },
  archive: {
    title: C.lifecycle.archiveConfirmTitle,
    body: C.lifecycle.archiveConfirmBody,
    confirmLabel: C.lifecycle.archive,
    confirmColor: 'error',
    needsConfirm: true,
  },
}

const GrowthCtasGovernanceView = ({
  ctas,
  surfaces,
  engineEnabled,
  suppressionEnforced,
  killState,
  killAudit,
  capabilities,
  loadError,
}: Props) => {
  const router = useRouter()

  const [filters, setFilters] = useState<CtaInventoryFilters>({ query: '', status: 'all', placement: 'all' })
  const [selectedId, setSelectedId] = useState<string | null>(ctas[0]?.ctaId ?? null)
  const [detail, setDetail] = useState<CtaDetailClient | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(false)

  const [authoring, setAuthoring] = useState<{ open: boolean; existingSlug: string | null; draft: CtaAuthoringDraft }>({
    open: false,
    existingSlug: null,
    draft: newAuthoringDraft(),
  })

  const [pendingLifecycle, setPendingLifecycle] = useState<PendingLifecycle | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingKill, setPendingKill] = useState<PendingKill | null>(null)
  const [killReason, setKillReason] = useState('')
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null)

  const selected = useMemo(() => ctas.find(cta => cta.ctaId === selectedId) ?? null, [ctas, selectedId])

  // La selección sigue al inventario cuando el server refresca (mutación → router.refresh()).
  useEffect(() => {
    if (selectedId && !ctas.some(cta => cta.ctaId === selectedId)) setSelectedId(ctas[0]?.ctaId ?? null)
    if (!selectedId && ctas.length > 0) setSelectedId(ctas[0].ctaId)
  }, [ctas, selectedId])

  const fetchDetail = useCallback(async (ctaId: string) => {
    setDetailLoading(true)
    setDetailError(false)

    try {
      const response = await fetch(`/api/admin/growth/ctas/${ctaId}`)

      await throwIfNotOk(response, C.detail.loadError)
      setDetail((await response.json()) as CtaDetailClient)
    } catch {
      setDetail(null)
      setDetailError(true)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId) void fetchDetail(selectedId)
    else setDetail(null)
  }, [selectedId, fetchDetail])

  const refreshAll = useCallback(() => {
    router.refresh()

    if (selectedId) void fetchDetail(selectedId)
  }, [router, selectedId, fetchDetail])

  // ── Lifecycle (server-confirmed; jamás verdad optimista) ──
  const runLifecycle = async (request: PendingLifecycle) => {
    setBusyAction(`${request.ctaId}:${request.action}`)

    try {
      const response = await fetch(`/api/admin/growth/ctas/${request.ctaId}/lifecycle`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: request.action, ctaVersionId: request.ctaVersionId }),
      })

      await throwIfNotOk(response, O.actions.errorGeneric)
      setSnack({ message: O.actions.success[request.action] ?? O.actions.success.publish, severity: 'success' })
      refreshAll()
    } catch (error) {
      setSnack({
        message: error instanceof Error && error.message ? error.message : O.actions.errorGeneric,
        severity: 'error',
      })
    } finally {
      setBusyAction(null)
      setPendingLifecycle(null)
      setConfirmOpen(false)
    }
  }

  const requestLifecycle = (request: LifecycleRequest) => {
    if (!selected) return

    const config = LIFECYCLE_CONFIRM[request.action]

    const pending: PendingLifecycle = {
      ...request,
      ctaId: selected.ctaId,
      title: config.title.replace('{name}', request.ctaName),
      body: config.body,
      confirmLabel: config.confirmLabel,
      confirmColor: config.confirmColor,
      needsConfirm: config.needsConfirm,
    }

    if (pending.needsConfirm) {
      setPendingLifecycle(pending)
      setConfirmOpen(true)
    } else {
      void runLifecycle(pending)
    }
  }

  // ── Kill switch gobernado (reason obligatorio; auditado) ──
  const runKill = async () => {
    if (!pendingKill || killReason.trim().length < 5) return

    setBusyAction('kill-switch')

    try {
      const response = await fetch('/api/admin/growth/ctas/kill-switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: pendingKill.scope,
          surfaceId: pendingKill.surfaceId ?? undefined,
          action: pendingKill.action,
          reason: killReason.trim(),
        }),
      })

      await throwIfNotOk(response, O.actions.errorGeneric)
      setSnack({
        message: pendingKill.action === 'engage' ? C.toasts.killEngaged : C.toasts.killReleased,
        severity: 'success',
      })
      refreshAll()
    } catch (error) {
      setSnack({
        message: error instanceof Error && error.message ? error.message : O.actions.errorGeneric,
        severity: 'error',
      })
    } finally {
      setBusyAction(null)
      setPendingKill(null)
      setKillReason('')
    }
  }

  const openCreate = () => setAuthoring({ open: true, existingSlug: null, draft: newAuthoringDraft() })

  const openEdit = () => {
    if (!detail || detail.versions.length === 0) return

    const latest = detail.versions[0]

    const suppression =
      latest.suppressionPolicy && typeof latest.suppressionPolicy === 'object'
        ? (latest.suppressionPolicy as Record<string, unknown>)
        : null

    setAuthoring({
      open: true,
      existingSlug: detail.summary.slug,
      draft: draftFromVersion(detail.summary, latest, suppression),
    })
  }

  // ── Resumen de estados del header ──
  const statusSummary = useMemo(() => {
    const counts = { published: 0, review: 0, draft: 0, paused: 0 }

    ctas.forEach(cta => {
      const status = cta.latestVersionStatus ?? 'draft'

      if (status in counts) counts[status as keyof typeof counts] += 1
    })

    return [
      { key: 'published', count: counts.published, label: C.summary.published, tone: 'success' as const },
      { key: 'review', count: counts.review, label: C.summary.review, tone: 'info' as const },
      { key: 'draft', count: counts.draft, label: C.summary.draft, tone: 'default' as const },
      { key: 'paused', count: counts.paused, label: C.summary.paused, tone: 'warning' as const },
    ]
  }, [ctas])

  const killScopeLabel = pendingKill?.scope === 'global' ? C.kill.scopeGlobal : C.kill.scopeSurface

  const lead = (
    <Stack spacing={2.5} sx={{ pb: 4 }}>
      <GreenhouseBreadcrumbs
        kind='pageHierarchy'
        dataCapture='cta-cockpit-breadcrumbs'
        items={[
          { label: C.breadcrumbs.growth, iconClassName: 'tabler-growth' },
          { label: C.breadcrumbs.ctas, iconClassName: 'tabler-hand-click' },
        ]}
      />
      <Stack direction='row' alignItems='flex-start' justifyContent='space-between' gap={4} flexWrap='wrap'>
        <Stack spacing={2} sx={{ minWidth: 0, flex: '1 1 480px' }}>
          <Typography variant='h4'>{O.title}</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 640 }}>
            {C.subtitle}
          </Typography>
          <Stack direction='row' alignItems='center' gap={2} flexWrap='wrap' sx={{ pt: 1 }}>
            {statusSummary.map(item => (
              <GreenhouseChip
                key={item.key}
                kind='metric'
                size='small'
                variant='label'
                tone={item.tone}
                label={`${item.count} ${item.label}`}
              />
            ))}
            <Tooltip title={engineEnabled ? '' : O.engineFlag.offHint}>
              <span>
                <GreenhouseChip
                  kind='status'
                  size='small'
                  variant='label'
                  tone={engineEnabled ? 'success' : 'warning'}
                  iconClassName={engineEnabled ? 'tabler-bolt' : 'tabler-bolt-off'}
                  label={engineEnabled ? O.engineFlag.on : O.engineFlag.off}
                />
              </span>
            </Tooltip>
          </Stack>
        </Stack>
        <Stack direction='row' alignItems='center' gap={2.5} flexWrap='wrap' sx={{ pt: 1 }}>
          <Button
            variant='outlined'
            color='inherit'
            startIcon={<i className='tabler-refresh' style={{ fontSize: 16 }} />}
            onClick={() => {
              refreshAll()
              setSnack({ message: C.toasts.refreshed, severity: 'success' })
            }}
            sx={{ color: 'text.secondary', borderColor: 'divider' }}
          >
            {C.refresh}
          </Button>
          <Tooltip title={capabilities.canAuthor ? '' : C.denied.readOnlyHint}>
            <span>
              <Button
                variant='contained'
                startIcon={<i className='tabler-plus' style={{ fontSize: 16 }} />}
                onClick={openCreate}
                disabled={!capabilities.canAuthor}
                aria-label={C.createAria}
                data-capture='cta-cockpit-create'
              >
                {C.create}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
      {loadError ? <Alert severity='error'>{O.actions.errorGeneric}</Alert> : null}
    </Stack>
  )

  const isEmptyInventory = !loadError && ctas.length === 0

  const primary = isEmptyInventory ? (
    <Stack
      spacing={4}
      alignItems='center'
      sx={{
        p: 12,
        textAlign: 'center',
        bgcolor: 'background.paper',
        borderRadius: theme => `${theme.shape.customBorderRadius.xl}px`,
        boxShadow: theme => theme.greenhouseElevation.raised.boxShadow,
      }}
      data-capture='cta-inventory'
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: theme => `${theme.shape.customBorderRadius.xl}px`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'primary.dark',
          bgcolor: theme => alpha(theme.palette.primary.main, 0.12),
        }}
      >
        <i className='tabler-hand-click' style={{ fontSize: 22 }} aria-hidden />
      </Box>
      <Stack spacing={1.5}>
        <Typography variant='h6'>{C.empty.title}</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 380, lineHeight: 1.55 }}>
          {C.empty.body}
        </Typography>
      </Stack>
      <Button
        variant='contained'
        startIcon={<i className='tabler-plus' style={{ fontSize: 16 }} />}
        onClick={openCreate}
        disabled={!capabilities.canAuthor}
      >
        {C.empty.cta}
      </Button>
    </Stack>
  ) : (
    <CtaInventoryPanel
      ctas={ctas}
      surfaces={surfaces}
      selectedId={selectedId}
      onSelect={setSelectedId}
      filters={filters}
      onFiltersChange={setFilters}
      loading={false}
      loadError={Boolean(loadError)}
      onRetry={refreshAll}
    />
  )

  const aside = isEmptyInventory ? (
    <Box sx={{ p: 8, bgcolor: 'background.paper', borderRadius: theme => `${theme.shape.customBorderRadius.xl}px`, boxShadow: theme => theme.greenhouseElevation.raised.boxShadow }}>
      <EmptyState icon='tabler-layout-sidebar-right-expand' title={C.empty.asideTitle} description={C.empty.asideBody} />
    </Box>
  ) : selectedId ? (
    <CtaDetailPanel
      detail={detail}
      loading={detailLoading}
      loadError={detailError}
      onRetry={() => selectedId && void fetchDetail(selectedId)}
      surfaces={surfaces}
      killState={killState}
      capabilities={capabilities}
      engineEnabled={engineEnabled}
      suppressionEnforced={suppressionEnforced}
      busyAction={busyAction}
      latestKillAudit={killAudit[0] ?? null}
      onEdit={openEdit}
      onLifecycle={requestLifecycle}
      onKillToggle={(scope, surfaceId, action) => {
        setPendingKill({ scope, surfaceId, action })
        setKillReason('')
      }}
    />
  ) : (
    <Box sx={{ p: 8, bgcolor: 'background.paper', borderRadius: theme => `${theme.shape.customBorderRadius.xl}px`, boxShadow: theme => theme.greenhouseElevation.raised.boxShadow }}>
      <EmptyState icon='tabler-click' title={C.noSelection.title} description={C.noSelection.body} />
    </Box>
  )

  return (
    <Box data-capture='cta-cockpit-shell'>
      {/* Lead/header: `split` no monta región lead — vive encima del shell (mismo patrón GrowthFormsAdminCockpit). */}
      {lead}
      <CompositionShell
        composition='split'
        fluidity='rich'
        instanceId='growth-cta-cockpit'
        asideLabel={C.detail.regionAria}
        telemetrySource='task-1430-growth-cta-cockpit'
        splitTemplateColumns={{ xs: '1fr', md: 'minmax(0, 0.95fr) minmax(0, 1.2fr)' }}
        regions={{ primary, aside }}
      />

      {/* Autoría gobernada */}
      <CtaAuthoringDrawer
        open={authoring.open}
        existingSlug={authoring.existingSlug}
        initialDraft={authoring.draft}
        onClose={() => setAuthoring(current => ({ ...current, open: false }))}
        onSubmitted={message => {
          setAuthoring(current => ({ ...current, open: false }))
          setSnack({ message, severity: 'success' })
          refreshAll()
        }}
      />

      {/* Confirmación de lifecycle (server-confirmed) */}
      <ConfirmDialog
        open={confirmOpen && pendingLifecycle !== null}
        setOpen={setConfirmOpen}
        title={pendingLifecycle?.title ?? ''}
        description={pendingLifecycle?.body}
        confirmLabel={pendingLifecycle?.confirmLabel}
        cancelLabel={O.actions.cancel}
        confirmColor={pendingLifecycle?.confirmColor ?? 'primary'}
        loading={busyAction !== null}
        onConfirm={() => (pendingLifecycle ? runLifecycle(pendingLifecycle) : undefined)}
      />

      {/* Confirmación de kill switch con motivo obligatorio (auditado) */}
      <Dialog open={pendingKill !== null} onClose={() => (busyAction ? null : setPendingKill(null))} maxWidth='xs' fullWidth>
        <DialogTitle>
          {(pendingKill?.action === 'engage' ? C.kill.engageConfirmTitle : C.kill.releaseConfirmTitle).replace('{scope}', killScopeLabel)}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={4} sx={{ pt: 1 }}>
            <DialogContentText>
              {pendingKill?.action === 'engage' ? C.kill.engageConfirmBody : C.kill.releaseConfirmBody}
            </DialogContentText>
            <CustomTextField
              autoFocus
              fullWidth
              label={C.kill.reasonLabel}
              placeholder={C.kill.reasonPlaceholder}
              helperText={C.kill.reasonHelper}
              value={killReason}
              onChange={event => setKillReason(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={() => setPendingKill(null)} disabled={busyAction !== null}>
            {O.actions.cancel}
          </Button>
          <Button
            variant='contained'
            color={pendingKill?.action === 'engage' ? 'error' : 'success'}
            disabled={busyAction !== null || killReason.trim().length < 5}
            onClick={() => void runKill()}
            data-capture='cta-kill-confirm'
          >
            {pendingKill?.action === 'engage' ? C.kill.engage : C.kill.release}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack !== null}
        autoHideDuration={snack?.severity === 'success' ? 4000 : null}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snack?.severity ?? 'success'} onClose={() => setSnack(null)}>
          {snack?.message}
        </Alert>
      </Snackbar>

    </Box>
  )
}

export default GrowthCtasGovernanceView
