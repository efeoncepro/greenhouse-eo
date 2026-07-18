'use client'

/**
 * TASK-1340 — Vista de gobernanza del motor de CTAs (`/growth/ctas`, menú Growth).
 * Wireframe: docs/ui/wireframes/TASK-1340-growth-ctas-governance.md.
 *
 * Consumer del primitive `growth.cta` (Full API Parity): lee los VMs que el page
 * server resolvió con los readers canónicos y ejecuta lifecycle vía la API admin
 * (que re-valida capability fina + flag). El preview monta el CORE del renderer
 * portable con fixtures deterministas (cero red) — mismo contrato que el público.
 */
import { useEffect, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Snackbar from '@mui/material/Snackbar'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_GROWTH_CTA_OPERATOR } from '@/lib/copy/growth'
import { throwIfNotOk } from '@/lib/api/parse-error-response'
import type { CtaSummaryVm, CtaSurfaceVm } from '@/lib/growth/ctas/readers'
import { CTA_FIXTURES } from '@/growth-cta-renderer/fixtures'

const O = GH_GROWTH_CTA_OPERATOR

type LifecycleAction = 'submit_review' | 'publish' | 'pause' | 'resume'

interface PendingAction {
  action: LifecycleAction
  ctaId: string
  ctaVersionId: string
  ctaName: string
}

const STATUS_CHIP_COLOR: Record<string, 'default' | 'info' | 'success' | 'warning' | 'secondary'> = {
  draft: 'default',
  review: 'info',
  published: 'success',
  paused: 'warning',
  deprecated: 'secondary',
  archived: 'secondary',
}

interface Props {
  ctas: CtaSummaryVm[]
  surfaces: CtaSurfaceVm[]
  engineEnabled: boolean
  loadError?: boolean
}

/** Monta el core del renderer (paridad real con el público) en un host `.ghc-scope`. */
const mountFixture = async (
  root: HTMLDivElement,
  fixture: keyof typeof CTA_FIXTURES,
): Promise<() => void> => {
  const [{ CtaRenderer }, { ensureStylesInjected }, { resolveCtaSystemCopy }] = await Promise.all([
    import('@/growth-cta-renderer/renderer'),
    import('@/growth-cta-renderer/styles'),
    import('@/growth-cta-renderer/copy'),
  ])

  ensureStylesInjected(document)

  const contract = CTA_FIXTURES[fixture].build()

  // classList.add (NUNCA className=): preserva las clases MUI del Box (sx maxWidth
  // de la matriz de density) — pisarlas dejaba todos los contenedores full-width.
  root.classList.add('ghc-scope')
  root.dataset.ghcVariant = contract.styleVariant ?? 'default'
  root.dataset.ghcPlacement = contract.placement
  root.style.containerType = 'inline-size'

  const renderer = new CtaRenderer({
    root,
    contract,
    copy: resolveCtaSystemCopy(),
    telemetry: { emit: () => undefined },
    onPrimary: async () => true,
    onIngest: () => undefined,
  })

  renderer.render()

  return () => renderer.destroy()
}

const CtaPreview = ({ fixture }: { fixture: keyof typeof CTA_FIXTURES }) => {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let disposed = false
    let cleanup: (() => void) | null = null

    void (async () => {
      if (!hostRef.current) return

      const dispose = await mountFixture(hostRef.current, fixture)

      if (disposed) dispose()
      else cleanup = dispose
    })()

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [fixture])

  return <Box ref={hostRef} data-capture='cta-preview' sx={{ maxWidth: 720 }} />
}

/**
 * TASK-1429 — matriz de density del slide-in: el MISMO fixture a 3 anchos de
 * contenedor (`full|condensed|peek` derivados por container query, nunca por
 * viewport del host) + demo VIVA del overlay real (SlideInController immediate:
 * Escape/dismiss/foco/motion reales; guard local de sesión incluido).
 */
const SLIDE_IN_DENSITY_WIDTHS: Array<{ key: string; width: number; labelKey: 'densityFull' | 'densityCondensed' | 'densityPeek' }> = [
  { key: 'full', width: 680, labelKey: 'densityFull' },
  { key: 'condensed', width: 480, labelKey: 'densityCondensed' },
  { key: 'peek', width: 350, labelKey: 'densityPeek' },
]

const SlideInDensityMatrix = ({ fixture }: { fixture: keyof typeof CTA_FIXTURES }) => {
  const hostsRef = useRef<Array<HTMLDivElement | null>>([])
  const [demoBusy, setDemoBusy] = useState(false)

  useEffect(() => {
    let disposed = false
    const cleanups: Array<() => void> = []

    void (async () => {
      for (const host of hostsRef.current) {
        if (!host || disposed) continue

        const dispose = await mountFixture(host, fixture)

        if (disposed) dispose()
        else cleanups.push(dispose)
      }
    })()

    return () => {
      disposed = true
      cleanups.forEach(dispose => dispose())
    }
  }, [fixture])

  const openLiveDemo = async () => {
    setDemoBusy(true)

    try {
      const [{ SlideInController }, { ensureStylesInjected }, { resolveCtaSystemCopy }] = await Promise.all([
        import('@/growth-cta-renderer/slide-in'),
        import('@/growth-cta-renderer/styles'),
        import('@/growth-cta-renderer/copy'),
      ])

      ensureStylesInjected(document)

      const controller = new SlideInController({
        doc: document,
        host: document.body,
        contract: { ...CTA_FIXTURES[fixture].build(), cta: { ...CTA_FIXTURES[fixture].build().cta, ctaId: `cdef-demo-${Date.now()}` } },
        copy: resolveCtaSystemCopy(),
        telemetry: { emit: () => undefined },
        onPrimary: async () => true,
        onIngest: () => undefined,
        triggerMode: 'immediate',
      })

      controller.arm()
    } finally {
      setDemoBusy(false)
    }
  }

  return (
    <Stack spacing={4}>
      {SLIDE_IN_DENSITY_WIDTHS.map((density, index) => (
        <Box key={density.key} data-capture={`cta-preview-density-${density.key}`}>
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
            {O.preview[density.labelKey]}
          </Typography>
          <Box
            ref={(node: HTMLDivElement | null) => {
              hostsRef.current[index] = node
            }}
            sx={{ maxWidth: density.width }}
          />
        </Box>
      ))}
      <Box>
        <Button
          variant='outlined'
          size='small'
          disabled={demoBusy}
          onClick={() => void openLiveDemo()}
          aria-label={O.preview.slideInDemoAria}
          data-capture='cta-slidein-demo-trigger'
        >
          {O.preview.slideInDemoCta}
        </Button>
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
          {O.preview.slideInDemoHint}
        </Typography>
      </Box>
    </Stack>
  )
}

const GrowthCtasGovernanceView = ({ ctas, surfaces, engineEnabled, loadError }: Props) => {
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [busy, setBusy] = useState(false)
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null)
  const [previewFixture, setPreviewFixture] = useState<keyof typeof CTA_FIXTURES>('default')

  const runAction = async (action: PendingAction) => {
    setBusy(true)

    try {
      const response = await fetch(`/api/admin/growth/ctas/${action.ctaId}/lifecycle`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: action.action, ctaVersionId: action.ctaVersionId }),
      })

      await throwIfNotOk(response, O.actions.errorGeneric)
      setSnack({ message: O.actions.success[action.action] ?? O.actions.success.publish, severity: 'success' })

      // refresco simple: el page server re-lee los readers canónicos.
      window.location.reload()
    } catch (error) {
      setSnack({
        message: error instanceof Error && error.message ? error.message : O.actions.errorGeneric,
        severity: 'error',
      })
    } finally {
      setBusy(false)
      setPending(null)
    }
  }

  const requestAction = (action: PendingAction) => {
    if (action.action === 'publish' || action.action === 'pause') {
      setPending(action)

      return
    }

    void runAction(action)
  }

  const actionButtons = (cta: CtaSummaryVm) => {
    const buttons: Array<{ label: string; aria: string; action: LifecycleAction; versionId: string }> = []

    if (cta.latestVersionStatus === 'draft' && cta.latestVersionId) {
      buttons.push({ label: O.actions.submitReview, aria: O.actions.submitReview, action: 'submit_review', versionId: cta.latestVersionId })
    }

    if (cta.latestVersionStatus === 'review' && cta.latestVersionId) {
      buttons.push({ label: O.actions.publish, aria: O.actions.publishAria, action: 'publish', versionId: cta.latestVersionId })
    }

    if (cta.publishedVersionId) {
      buttons.push({ label: O.actions.pause, aria: O.actions.pauseAria, action: 'pause', versionId: cta.publishedVersionId })
    }

    if (cta.latestVersionStatus === 'paused' && cta.latestVersionId) {
      buttons.push({ label: O.actions.resume, aria: O.actions.resumeAria, action: 'resume', versionId: cta.latestVersionId })
    }

    return buttons
  }

  return (
    <Box sx={{ display: 'grid', gap: 6 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3, justifyContent: 'space-between' }}>
        <Box>
          <Typography variant='h4'>{O.title}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {O.subtitle}
          </Typography>
        </Box>
        <Tooltip title={engineEnabled ? '' : O.engineFlag.offHint}>
          <Chip
            label={engineEnabled ? O.engineFlag.on : O.engineFlag.off}
            color={engineEnabled ? 'success' : 'warning'}
            variant='tonal'
          />
        </Tooltip>
      </Box>

      {loadError ? <Alert severity='error'>{O.actions.errorGeneric}</Alert> : null}

      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }} data-capture='cta-inventory'>
        <CardHeader title={O.inventory.title} />
        <Divider />
        <CardContent sx={{ p: 0 }}>
          {ctas.length === 0 ? (
            <Box sx={{ p: 6 }}>
              <EmptyState icon='tabler-hand-click' title={O.inventory.emptyTitle} description={O.inventory.emptyBody} />
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{O.inventory.columns.cta}</TableCell>
                    <TableCell>{O.inventory.columns.status}</TableCell>
                    <TableCell>{O.inventory.columns.campaign}</TableCell>
                    <TableCell align='right'>{O.inventory.columns.version}</TableCell>
                    <TableCell align='right'>{O.inventory.columns.actions}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ctas.map(cta => (
                    <TableRow key={cta.ctaId} hover>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                          {cta.name}
                        </Typography>
                        <Typography variant='monoId' color='text.secondary'>
                          {cta.slug}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={STATUS_CHIP_COLOR[cta.latestVersionStatus ?? 'draft'] ?? 'default'}
                          label={O.inventory.statusLabels[cta.latestVersionStatus ?? 'draft'] ?? cta.latestVersionStatus}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{cta.campaignSlug ?? '—'}</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>{cta.latestVersion ?? '—'}</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Box sx={{ display: 'inline-flex', gap: 2 }}>
                          {actionButtons(cta).map(button => (
                            <Tooltip key={button.action} title={engineEnabled ? '' : O.engineFlag.offHint}>
                              <span>
                                <Button
                                  size='small'
                                  variant='tonal'
                                  disabled={!engineEnabled || busy}
                                  aria-label={button.aria}
                                  onClick={() =>
                                    requestAction({
                                      action: button.action,
                                      ctaId: cta.ctaId,
                                      ctaVersionId: button.versionId,
                                      ctaName: cta.name,
                                    })
                                  }
                                >
                                  {button.label}
                                </Button>
                              </span>
                            </Tooltip>
                          ))}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }} data-capture='cta-surfaces'>
        <CardHeader title={O.surfaces.title} />
        <Divider />
        <CardContent sx={{ p: 0 }}>
          {surfaces.length === 0 ? (
            <Box sx={{ p: 6 }}>
              <EmptyState icon='tabler-world' title={O.surfaces.emptyTitle} description={O.surfaces.emptyBody} />
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{O.surfaces.columns.name}</TableCell>
                    <TableCell>{O.surfaces.columns.kind}</TableCell>
                    <TableCell>{O.surfaces.columns.origins}</TableCell>
                    <TableCell>{O.surfaces.columns.embedKey}</TableCell>
                    <TableCell>{O.surfaces.columns.status}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {surfaces.map(surface => (
                    <TableRow key={surface.surfaceId} hover>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                          {surface.surfaceName}
                        </Typography>
                        <Typography variant='monoId' color='text.secondary'>
                          {surface.surfaceId}
                        </Typography>
                      </TableCell>
                      <TableCell>{surface.surfaceKind}</TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ maxWidth: 280, overflowWrap: 'anywhere' }}>
                          {surface.originAllowlist.join(', ') || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='monoId'>
                          {surface.embedKeyId ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={surface.status === 'active' ? 'success' : 'warning'}
                          label={O.surfaces.statusLabels[surface.status] ?? surface.status}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }} data-capture='cta-preview-card'>
        <CardHeader title={O.preview.title} subheader={O.preview.body} />
        <Divider />
        <CardContent sx={{ display: 'grid', gap: 4 }}>
          <Box role='group' aria-label={O.preview.variantAria} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {(Object.keys(CTA_FIXTURES) as Array<keyof typeof CTA_FIXTURES>).map(key => (
              <Chip
                key={key}
                label={CTA_FIXTURES[key].label}
                onClick={() => setPreviewFixture(key)}
                color={previewFixture === key ? 'primary' : 'default'}
                variant={previewFixture === key ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
          {CTA_FIXTURES[previewFixture].build().placement === 'slide_in' ? (
            <SlideInDensityMatrix fixture={previewFixture} />
          ) : (
            <CtaPreview fixture={previewFixture} />
          )}
        </CardContent>
      </Card>

      <Dialog open={pending !== null} onClose={() => (busy ? null : setPending(null))}>
        <DialogTitle>
          {pending?.action === 'pause' ? O.actions.confirmPauseTitle : O.actions.confirmPublishTitle}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pending?.action === 'pause' ? O.actions.confirmPauseBody : O.actions.confirmPublishBody}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)} disabled={busy} autoFocus>
            {O.actions.cancel}
          </Button>
          <Button
            variant='contained'
            color={pending?.action === 'pause' ? 'warning' : 'primary'}
            disabled={busy}
            onClick={() => (pending ? void runAction(pending) : undefined)}
          >
            {pending?.action === 'pause' ? O.actions.pause : O.actions.publish}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack !== null}
        autoHideDuration={snack?.severity === 'success' ? 4000 : null}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack?.severity ?? 'success'} onClose={() => setSnack(null)}>
          {snack?.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default GrowthCtasGovernanceView
