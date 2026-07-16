'use client'

import { useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Tooltip from '@mui/material/Tooltip'

import { GreenhouseButton, GreenhouseChip } from '@/components/greenhouse/primitives'
import type { HiringDeskCopy } from '@/lib/copy'
import type { HiringDeskSnapshot, HiringOpening } from '@/types/hiring'

import HiringDeskFrame from './HiringDeskFrame'
import VacancyAiDraftDrawer, { type VacancyAiPendingProposal, type VacancyAiSurfaceProps } from './VacancyAiDraftDrawer'
import { hiringRequest } from './hiring-client'

type PublicationAction = 'publish' | 'pause' | 'resume' | 'close' | 'reopen'
type PublicationUiAction = {
  action: PublicationAction
  label: string
  kind: 'primaryAction' | 'secondaryAction' | 'custom'
  icon: string
  tone?: 'error'
}

interface PublicationDeskViewProps {
  copy: HiringDeskCopy
  initialSnapshot: HiringDeskSnapshot
  /** TASK-1422 — affordances de la redacción asistida IA (resueltas server-side). */
  vacancyAi: VacancyAiSurfaceProps
}

const publicationTone = (status: HiringOpening['publicationStatus']) => {
  if (status === 'published') return 'success'
  if (status === 'paused') return 'warning'

  return 'default'
}

const PublicationDeskView = ({ copy, initialSnapshot, vacancyAi }: PublicationDeskViewProps) => {
  const [openings, setOpenings] = useState(initialSnapshot.openings)
  const [saving, setSaving] = useState(false)
  const [confirmAction, setConfirmAction] = useState<PublicationAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // TASK-1422 — selector de vacante (la vista mostraba solo openings[0]) + estado del borrador IA.
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(initialSnapshot.openings[0]?.opening.openingId ?? null)
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const [pendingByOpening, setPendingByOpening] = useState<Record<string, VacancyAiPendingProposal>>(vacancyAi.pendingByOpening)

  const selected = openings.find((item) => item.opening.openingId === selectedOpeningId) ?? openings[0] ?? null
  const opening = selected?.opening ?? null
  const pendingProposal = opening ? pendingByOpening[opening.openingId] ?? null : null

  const handlePendingChange = (openingId: string, pending: VacancyAiPendingProposal | null) => {
    setPendingByOpening((current) => {
      const next = { ...current }

      if (pending) next[openingId] = pending
      else delete next[openingId]

      return next
    })
  }

  const replaceOpening = (updated: HiringOpening) => {
    setOpenings((current) => current.map((item) => item.opening.openingId === updated.openingId ? { ...item, opening: updated } : item))
  }

  const runPublicationAction = async () => {
    if (!opening || !confirmAction) return

    setSaving(true)
    setError(null)

    try {
      const updated = await hiringRequest<HiringOpening | { opening: HiringOpening }>(
        `/api/hiring/openings/${opening.openingId}/publish${['pause', 'close'].includes(confirmAction) ? `?mode=${confirmAction === 'close' ? 'closed' : 'paused'}` : ''}`,
        { method: ['publish', 'resume', 'reopen'].includes(confirmAction) ? 'POST' : 'DELETE' },
      )

      const next = 'opening' in updated ? updated.opening : updated

      replaceOpening(next)
      setToast(copy.publication.updated)
      setConfirmAction(null)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'No se pudo actualizar la publicación.')
      setConfirmAction(null)
    } finally {
      setSaving(false)
    }
  }

  const confirmation = confirmAction ? {
    publish: { title: copy.publication.publishTitle, body: copy.publication.publishBody, tone: 'primary' as const },
    pause: { title: copy.publication.pauseTitle, body: copy.publication.pauseBody, tone: 'warning' as const },
    resume: { title: copy.publication.resume, body: copy.publication.resumeBody, tone: 'primary' as const },
    close: { title: copy.publication.closeTitle, body: copy.publication.closeBody, tone: 'error' as const },
    reopen: { title: copy.publication.reopen, body: copy.publication.reopenBody, tone: 'primary' as const },
  }[confirmAction] : null

  const publicFields = useMemo(() => opening ? [
    ['Título del cargo', opening.publicTitle ?? opening.internalTitle],
    ['Resumen', opening.publicSummary],
    ['Responsabilidades', opening.publicDescription],
    ['Requisitos', opening.publicRequirements],
    ['Ubicación', opening.publicHiringRegion ?? opening.publicLocationMode],
    ['Modalidad', opening.publicWorkMode ?? opening.publicLocationMode],
  ] : [], [opening])

  const clippedValueSx = {
    display: '-webkit-box',
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 1,
  } as const

  const internalFields = useMemo(() => opening ? [
    'Notas internas del hiring manager',
    'Presupuesto / banda salarial',
    'Nivel de riesgo del cargo',
    'Configuración del scorecard',
    'Umbral de aprobación',
  ].map((label) => {
    const values: Record<string, string | null | undefined> = {
      'Notas internas del hiring manager': opening.internalNotes,
      'Presupuesto / banda salarial': opening.budgetBand,
      'Nivel de riesgo del cargo': opening.riskNotes,
      'Configuración del scorecard': opening.publicRequirements ? 'Configurado' : null,
      'Umbral de aprobación': opening.rateBand,
    }

    return [label, values[label]]
  }) : [], [opening])

  const actions: PublicationUiAction[] = opening ? (() => {
    if (opening.publicationStatus === 'draft' || opening.publicationStatus === 'ready_for_review') {
      return [{ action: 'publish', label: copy.publication.publish, kind: 'primaryAction', icon: 'tabler-world-upload' }]
    }

    if (opening.publicationStatus === 'published') {
      return [
        { action: 'pause', label: copy.publication.pause, kind: 'secondaryAction', icon: 'tabler-player-pause' },
        { action: 'close', label: copy.publication.close, kind: 'custom', icon: 'tabler-lock', tone: 'error' },
      ]
    }

    if (opening.publicationStatus === 'paused') {
      return [
        { action: 'resume', label: copy.publication.resume, kind: 'primaryAction', icon: 'tabler-player-play' },
        { action: 'close', label: copy.publication.close, kind: 'custom', icon: 'tabler-lock', tone: 'error' },
      ]
    }

    return [{ action: 'reopen', label: copy.publication.reopen, kind: 'secondaryAction', icon: 'tabler-lock-open' }]
  })() : []

  const content = (
    <Stack spacing={4} sx={{ minWidth: 0, maxInlineSize: 1080, animation: 'ghHiringUp 320ms cubic-bezier(.2,0,0,1)' }}>
      {error ? <Alert severity='error'>{error}</Alert> : null}

      {!opening ? <Alert severity='info'>{copy.publication.noOpening}</Alert> : (
        <>
          <Paper
            variant='outlined'
            sx={(theme) => ({
              p: 4,
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.045)} 100%)`,
              boxShadow: `0 18px 48px ${alpha(theme.palette.common.black, 0.055)}`,
              animation: 'ghHiringUp 260ms cubic-bezier(.2,0,0,1)',
            })}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} spacing={3.5}>
              <Box sx={(theme) => ({ display: 'grid', placeItems: 'center', inlineSize: 44, blockSize: 44, borderRadius: `${theme.shape.customBorderRadius.md}px`, color: 'primary.dark', backgroundColor: 'primary.lightOpacity', boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.12)}`, flex: '0 0 auto' })}>
                <i aria-hidden='true' className='tabler-briefcase' style={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant='h6'>{opening.publicTitle ?? opening.internalTitle}</Typography>
                <Typography variant='caption' color='text.secondary'>{opening.publicId} · {opening.publicArea ?? 'Growth'} · {opening.publicHiringRegion ?? opening.publicLocationMode ?? 'Chile'}</Typography>
              </Box>
              {openings.length > 1 ? (
                <FormControl size='small' sx={{ minInlineSize: { xs: '100%', md: 240 } }}>
                  <InputLabel id='hiring-publication-opening-label'>{copy.publication.vacancyAi.openingSelector}</InputLabel>
                  <Select
                    labelId='hiring-publication-opening-label'
                    label={copy.publication.vacancyAi.openingSelector}
                    value={opening.openingId}
                    onChange={(event) => setSelectedOpeningId(event.target.value)}
                    data-capture='hiring-publication-opening-selector'
                  >
                    {openings.map((item) => (
                      <MenuItem key={item.opening.openingId} value={item.opening.openingId}>
                        {(item.opening.publicTitle ?? item.opening.internalTitle)} · {item.opening.publicId}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : null}
              <Box sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}>
                <GreenhouseChip kind='status' variant='label' tone={publicationTone(opening.publicationStatus)} iconClassName={opening.publicationStatus === 'published' ? 'tabler-world' : 'tabler-pencil'} label={opening.publicationStatus} />
              </Box>
              {opening.publicationStatus === 'published' ? <Button component='a' href={`/public/careers/${opening.publicId}`} target='_blank' rel='noreferrer' size='small' endIcon={<i className='tabler-external-link' />}>Ver en careers</Button> : null}
            </Stack>
          </Paper>

          <Alert severity='info' icon={<i className='tabler-shield-check' />}><Typography fontWeight={700}>{copy.publication.allowlist}</Typography><Typography variant='body2'>Esto es lo que verá el público. Lo interno nunca cruza al listado público.</Typography></Alert>

          <Grid data-capture='hiring-publication-diff' container spacing={4} sx={{ '& > *': { minWidth: 0 } }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                variant='outlined'
                sx={(theme) => ({
                  p: 4,
                  borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                  minBlockSize: '100%',
                  boxShadow: `0 16px 42px ${alpha(theme.palette.common.black, 0.05)}`,
                  animation: 'ghHiringUp 280ms cubic-bezier(.2,0,0,1)',
                })}
              >
                <Stack spacing={0}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
                    <Stack direction='row' alignItems='center' spacing={2} sx={{ flex: 1, minInlineSize: 0 }}>
                      <i aria-hidden='true' className='tabler-world-check text-success' style={{ fontSize: 18 }} />
                      <Typography variant='subtitle2' color='success.dark' fontWeight={750}>{copy.publication.publicPreview}</Typography>
                    </Stack>
                    {vacancyAi.canPropose || pendingProposal ? (
                      <Tooltip title={!vacancyAi.enabled && !pendingProposal ? copy.publication.vacancyAi.ctaDisabledTooltip : ''} disableHoverListener={vacancyAi.enabled || Boolean(pendingProposal)}>
                        <Box component='span' data-capture='hiring-vacancy-ai-cta' sx={{ display: 'flex', flex: '0 0 auto' }}>
                          <Button
                            size='small'
                            variant='outlined'
                            color='primary'
                            fullWidth
                            disabled={!vacancyAi.enabled && !pendingProposal}
                            startIcon={<i aria-hidden='true' className='tabler-sparkles' />}
                            onClick={() => setAiDrawerOpen(true)}
                            sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                          >
                            {pendingProposal ? copy.publication.vacancyAi.ctaPending : copy.publication.vacancyAi.cta}
                          </Button>
                        </Box>
                      </Tooltip>
                    ) : null}
                  </Stack>
                  {publicFields.map(([label, value]) => (
                    <Box key={label} sx={{ py: 1.35, borderBlockEnd: 1, borderColor: 'divider' }}>
                      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', lineHeight: 1.25 }}>{label}</Typography>
                      <Typography variant='body2' color='text.primary' sx={{ ...clippedValueSx, lineHeight: 1.45 }}>{value || 'No informado'}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                variant='outlined'
                sx={(theme) => ({
                  p: 4,
                  borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                  minBlockSize: '100%',
                  background: `linear-gradient(180deg, ${alpha(theme.palette.action.hover, 0.72)}, ${alpha(theme.palette.action.hover, 0.38)})`,
                  boxShadow: `0 16px 42px ${alpha(theme.palette.common.black, 0.045)}`,
                  animation: 'ghHiringUp 340ms cubic-bezier(.2,0,0,1)',
                })}
              >
                <Stack spacing={0}>
                  <Stack direction='row' alignItems='center' spacing={2} sx={{ mb: 2 }}><i aria-hidden='true' className='tabler-eye-off text-disabled' style={{ fontSize: 18 }} /><Typography variant='subtitle2' color='text.secondary' fontWeight={750}>{copy.publication.internalOnly}</Typography></Stack>
                  {internalFields.map(([label]) => (
                    <Stack key={label} direction='row' alignItems='center' spacing={2.25} sx={{ py: 3, borderBlockEnd: 1, borderColor: 'divider', color: 'text.disabled' }}>
                      <i aria-hidden='true' className='tabler-lock' />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography color='inherit' sx={clippedValueSx}>{label}</Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Stack direction='row' alignItems='center' spacing={2.5} sx={(theme) => ({ border: `1px dashed ${theme.palette.divider}`, borderRadius: `${theme.shape.customBorderRadius.md}px`, px: 3.5, py: 2.75, backgroundColor: alpha(theme.palette.background.paper, 0.52) })}>
            <i aria-hidden='true' className='tabler-link text-disabled' />
            <Typography variant='caption' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>{`careers.efeonce.com/${opening.publicId}`}</Typography>
          </Stack>

          <Stack direction='row' justifyContent='flex-end' spacing={2.5} flexWrap='wrap' useFlexGap>
            {actions.map((action) => (
              action.kind === 'secondaryAction' ? (
                <Button
                  key={action.action}
                  variant='outlined'
                  color='inherit'
                  startIcon={<i aria-hidden='true' className={action.icon} />}
                  onClick={() => setConfirmAction(action.action)}
                  sx={{ minInlineSize: 170, minBlockSize: 40, fontWeight: 700 }}
                >
                  {action.label}
                </Button>
              ) : (
                <GreenhouseButton
                  key={action.action}
                  kind={action.kind}
                  tone={action.tone}
                  leadingIconClassName={action.icon}
                  onClick={() => setConfirmAction(action.action)}
                  disabled={action.action === 'publish' && !opening.publicTitle}
                >
                  {action.label}
                </GreenhouseButton>
              )
            ))}
          </Stack>
        </>
      )}
    </Stack>
  )

  return (
    <>
      <HiringDeskFrame surface='publication' copy={copy} primary={content} />
      <Dialog
        open={Boolean(confirmAction)}
        onClose={() => !saving && setConfirmAction(null)}
        fullWidth
        maxWidth='sm'
        slotProps={{ backdrop: { sx: { animation: 'ghHiringFade 160ms cubic-bezier(.2,0,0,1)' } } }}
        PaperProps={{
          'data-capture': 'hiring-publication-confirm-dialog',
          sx: (theme) => ({
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            backgroundColor: 'background.paper',
            animation: 'ghHiringPop 240ms cubic-bezier(.2,0,0,1)',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }),
        }}
      >
        <DialogTitle>{confirmation?.title}</DialogTitle>
        <DialogContent><Typography color='text.primary'>{confirmation?.body}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAction(null)} disabled={saving} sx={{ color: 'text.primary' }}>{copy.common.cancel}</Button>
          <GreenhouseButton tone={confirmation?.tone} disabled={saving} onClick={() => void runPublicationAction()} leadingIcon={saving ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined}>{copy.common.confirm}</GreenhouseButton>
        </DialogActions>
      </Dialog>
      {opening ? (
        <VacancyAiDraftDrawer
          open={aiDrawerOpen}
          opening={opening}
          demand={selected?.demand ?? null}
          copy={copy}
          canConfirm={vacancyAi.canConfirm}
          pendingProposal={pendingProposal}
          onClose={() => setAiDrawerOpen(false)}
          onApplied={(updated) => {
            replaceOpening(updated)
            setToast(copy.publication.vacancyAi.applied)
            setAiDrawerOpen(false)
          }}
          onDiscarded={() => {
            setToast(copy.publication.vacancyAi.discarded)
            setAiDrawerOpen(false)
          }}
          onPendingChange={handlePendingChange}
        />
      ) : null}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ '& .MuiSnackbarContent-root': { animation: 'ghHiringToast 240ms cubic-bezier(.2,0,0,1)' } }}
      />
    </>
  )
}

export default PublicationDeskView
