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
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { GreenhouseButton, GreenhouseChip } from '@/components/greenhouse/primitives'
import type { HiringDeskCopy } from '@/lib/copy'
import type { HiringDeskSnapshot, HiringOpening } from '@/types/hiring'

import HiringDeskFrame from './HiringDeskFrame'
import { hiringRequest } from './hiring-client'

type PublicationAction = 'publish' | 'pause' | 'resume' | 'close' | 'reopen'

interface PublicationDeskViewProps {
  copy: HiringDeskCopy
  initialSnapshot: HiringDeskSnapshot
}

const PublicationDeskView = ({ copy, initialSnapshot }: PublicationDeskViewProps) => {
  const [openings, setOpenings] = useState(initialSnapshot.openings)
  const [openingId, setOpeningId] = useState(initialSnapshot.openings[0]?.opening.openingId ?? '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<HiringOpening>>({})
  const [saving, setSaving] = useState(false)
  const [confirmAction, setConfirmAction] = useState<PublicationAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const selected = useMemo(() => openings.find((item) => item.opening.openingId === openingId) ?? null, [openingId, openings])
  const opening = selected?.opening ?? null

  const beginEdit = () => {
    if (!opening) return

    setDraft({
      publicTitle: opening.publicTitle ?? opening.internalTitle,
      publicSummary: opening.publicSummary ?? '',
      publicDescription: opening.publicDescription ?? '',
      publicRequirements: opening.publicRequirements ?? '',
      publicNiceToHave: opening.publicNiceToHave ?? '',
      publicArea: opening.publicArea ?? '',
      publicSeniority: opening.publicSeniority ?? opening.seniority ?? '',
      publicLocationMode: opening.publicLocationMode ?? '',
      publicSkillTags: opening.publicSkillTags,
    })
    setEditing(true)
  }

  const replaceOpening = (updated: HiringOpening) => {
    setOpenings((current) => current.map((item) => item.opening.openingId === updated.openingId ? { ...item, opening: updated } : item))
  }

  const savePublicContent = async () => {
    if (!opening) return

    setSaving(true)
    setError(null)

    try {
      const updated = await hiringRequest<HiringOpening>(`/api/hiring/openings/${opening.openingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          publicTitle: draft.publicTitle,
          publicSummary: draft.publicSummary,
          publicDescription: draft.publicDescription,
          publicRequirements: draft.publicRequirements,
          publicNiceToHave: draft.publicNiceToHave,
          publicArea: draft.publicArea,
          publicSeniority: draft.publicSeniority,
          publicLocationMode: draft.publicLocationMode,
          publicSkillTags: typeof draft.publicSkillTags === 'string'
            ? String(draft.publicSkillTags).split(',').map((item) => item.trim()).filter(Boolean)
            : draft.publicSkillTags,
        }),
      })

      replaceOpening(updated)
      setEditing(false)
      setToast('Contenido público guardado.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el contenido público.')
    } finally {
      setSaving(false)
    }
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

  const publicFields = opening ? [
    ['Título', opening.publicTitle],
    ['Resumen', opening.publicSummary],
    ['Área', opening.publicArea],
    ['Seniority', opening.publicSeniority],
    ['Modalidad', opening.publicWorkMode ?? opening.publicLocationMode],
    ['Skills', opening.publicSkillTags.join(', ')],
    ['Descripción', opening.publicDescription],
    ['Requisitos', opening.publicRequirements],
    ['Deseables', opening.publicNiceToHave],
  ] : []

  const internalFields = opening ? [
    ['Título interno', opening.internalTitle],
    ['Budget band', opening.budgetBand],
    ['Rate band', opening.rateBand],
    ['Notas de riesgo', opening.riskNotes],
    ['Notas internas', opening.internalNotes],
    ['Owner ID', opening.ownerUserId],
  ] : []

  const content = (
    <Stack spacing={4} sx={{ minWidth: 0 }}>
      <Box><Typography variant='h4'>{copy.publication.title}</Typography><Typography color='text.secondary' sx={{ mt: 1 }}>{copy.publication.subtitle}</Typography></Box>
      {error ? <Alert severity='error'>{error}</Alert> : null}
      <Paper variant='outlined' sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <FormControl fullWidth>
          <InputLabel id='publication-opening-label'>{copy.pipeline.openingLabel}</InputLabel>
          <Select labelId='publication-opening-label' label={copy.pipeline.openingLabel} value={openingId} onChange={(event) => { setOpeningId(event.target.value); setEditing(false) }}>
            {openings.map(({ opening: item }) => <MenuItem key={item.openingId} value={item.openingId}>{item.internalTitle} · {item.publicationStatus}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      {!selected || !opening ? <Alert severity='info'>{copy.publication.noOpening}</Alert> : (
        <Grid data-capture='hiring-publication-diff' container spacing={3} sx={{ '& > *': { minWidth: 0 } }}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Paper variant='outlined' sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 3, minBlockSize: '100%' }}>
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2}>
                  <Stack direction='row' alignItems='center' spacing={1.5}><Box sx={{ display: 'grid', placeItems: 'center', inlineSize: 40, blockSize: 40, borderRadius: 2, color: 'success.main', backgroundColor: 'success.lightOpacity' }}><i className='tabler-world' /></Box><Box><Typography variant='h5'>{copy.publication.publicPreview}</Typography><Typography variant='caption' color='text.secondary'>{opening.publicId}</Typography></Box></Stack>
                  <Stack direction='row' spacing={1} alignItems='center'><GreenhouseChip kind='status' variant='label' tone={opening.publicationStatus === 'published' ? 'success' : opening.publicationStatus === 'paused' ? 'warning' : 'default'} label={opening.publicationStatus} />{!editing ? <Button size='small' onClick={beginEdit} startIcon={<i className='tabler-edit' />}>{copy.publication.edit}</Button> : null}</Stack>
                </Stack>
                <Divider />

                {editing ? (
                  <Stack spacing={2.5}>
                    <TextField required label='Título público' value={draft.publicTitle ?? ''} onChange={(event) => setDraft((current) => ({ ...current, publicTitle: event.target.value }))} />
                    <TextField multiline minRows={2} label='Resumen público' value={draft.publicSummary ?? ''} onChange={(event) => setDraft((current) => ({ ...current, publicSummary: event.target.value }))} />
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label='Área' value={draft.publicArea ?? ''} onChange={(event) => setDraft((current) => ({ ...current, publicArea: event.target.value }))} /></Grid>
                      <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label='Seniority' value={draft.publicSeniority ?? ''} onChange={(event) => setDraft((current) => ({ ...current, publicSeniority: event.target.value }))} /></Grid>
                    </Grid>
                    <TextField label='Skills' value={Array.isArray(draft.publicSkillTags) ? draft.publicSkillTags.join(', ') : draft.publicSkillTags ?? ''} onChange={(event) => setDraft((current) => ({ ...current, publicSkillTags: event.target.value as never }))} />
                    <TextField multiline minRows={4} label='Descripción' value={draft.publicDescription ?? ''} onChange={(event) => setDraft((current) => ({ ...current, publicDescription: event.target.value }))} />
                    <TextField multiline minRows={3} label='Requisitos' value={draft.publicRequirements ?? ''} onChange={(event) => setDraft((current) => ({ ...current, publicRequirements: event.target.value }))} />
                    <TextField multiline minRows={3} label='Deseables' value={draft.publicNiceToHave ?? ''} onChange={(event) => setDraft((current) => ({ ...current, publicNiceToHave: event.target.value }))} />
                    <Stack direction='row' justifyContent='flex-end' spacing={1}><Button onClick={() => setEditing(false)} disabled={saving} sx={{ color: 'text.primary' }}>{copy.common.cancel}</Button><GreenhouseButton kind='primaryAction' onClick={() => void savePublicContent()} disabled={saving} leadingIcon={saving ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined} sx={(theme) => ({ color: theme.palette.common.white, backgroundColor: theme.axis.ramp.primary[700], '&:hover': { backgroundColor: theme.axis.ramp.primary[800] } })}>{copy.common.save}</GreenhouseButton></Stack>
                  </Stack>
                ) : (
                  <Stack spacing={2.5}>
                    <Box sx={(theme) => ({ p: 3, borderRadius: 3, background: `linear-gradient(145deg, ${theme.palette.primary.lightOpacity}, ${theme.palette.background.paper})` })}>
                      <Typography variant='h4'>{opening.publicTitle ?? opening.internalTitle}</Typography>
                      <Typography color='text.secondary' sx={{ mt: 1 }}>{opening.publicSummary ?? 'Sin resumen público.'}</Typography>
                      <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap sx={{ mt: 2 }}>{opening.publicArea ? <GreenhouseChip kind='attribute' label={opening.publicArea} /> : null}{opening.publicSeniority ? <GreenhouseChip kind='attribute' label={opening.publicSeniority} /> : null}{opening.publicWorkMode ? <GreenhouseChip kind='attribute' label={opening.publicWorkMode} /> : null}</Stack>
                    </Box>
                    <List disablePadding>{publicFields.map(([label, value]) => <ListItem key={label} disableGutters divider><ListItemIcon sx={{ minWidth: 36 }}><i className={value ? 'tabler-check text-success' : 'tabler-minus text-disabled'} /></ListItemIcon><ListItemText primary={label} secondary={value || 'No informado'} /></ListItem>)}</List>
                  </Stack>
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Stack spacing={3}>
              <Paper variant='outlined' sx={{ p: 3, borderRadius: 3 }}>
                <Stack spacing={2}><Stack direction='row' alignItems='center' spacing={1.5}><Box sx={{ color: 'warning.main' }}><i className='tabler-lock' /></Box><Box><Typography variant='h6'>{copy.publication.internalOnly}</Typography><Typography variant='caption' color='text.secondary'>Excluido por allowlist</Typography></Box></Stack><Divider /><List disablePadding>{internalFields.map(([label, value]) => <ListItem key={label} disableGutters><ListItemIcon sx={{ minWidth: 36 }}><i className='tabler-eye-off' /></ListItemIcon><ListItemText primary={label} secondary={value || 'Sin dato'} /></ListItem>)}</List></Stack>
              </Paper>
              <Alert severity='success' icon={<i className='tabler-shield-check' />}><Typography fontWeight={700}>{copy.publication.allowlist}</Typography><Typography variant='body2'>Solo la columna izquierda alimenta Careers. La información interna no sale de este workspace.</Typography></Alert>
              <Paper variant='outlined' sx={{ p: 3, borderRadius: 3 }}>
                <Stack spacing={2}>
                  {opening.publicationStatus === 'draft' || opening.publicationStatus === 'ready_for_review' ? <GreenhouseButton kind='primaryAction' leadingIconClassName='tabler-world-upload' onClick={() => setConfirmAction('publish')} disabled={!opening.publicTitle} sx={(theme) => ({ color: theme.palette.common.white, backgroundColor: theme.axis.ramp.primary[700], '&:hover': { backgroundColor: theme.axis.ramp.primary[800] } })}>{copy.publication.publish}</GreenhouseButton> : null}
                  {opening.publicationStatus === 'published' ? <GreenhouseButton kind='secondaryAction' leadingIconClassName='tabler-player-pause' onClick={() => setConfirmAction('pause')} sx={{ color: 'text.primary' }}>{copy.publication.pause}</GreenhouseButton> : null}
                  {opening.publicationStatus === 'paused' ? <GreenhouseButton kind='primaryAction' leadingIconClassName='tabler-player-play' onClick={() => setConfirmAction('resume')} sx={(theme) => ({ color: theme.palette.common.white, backgroundColor: theme.axis.ramp.primary[700], '&:hover': { backgroundColor: theme.axis.ramp.primary[800] } })}>{copy.publication.resume}</GreenhouseButton> : null}
                  {opening.publicationStatus === 'closed' ? <GreenhouseButton kind='primaryAction' leadingIconClassName='tabler-reload' onClick={() => setConfirmAction('reopen')} sx={(theme) => ({ color: theme.palette.common.white, backgroundColor: theme.axis.ramp.primary[700], '&:hover': { backgroundColor: theme.axis.ramp.primary[800] } })}>{copy.publication.reopen}</GreenhouseButton> : null}
                  {opening.publicationStatus !== 'closed' ? <GreenhouseButton variant='outlined' tone='error' leadingIconClassName='tabler-circle-x' onClick={() => setConfirmAction('close')}>{copy.publication.close}</GreenhouseButton> : null}
                </Stack>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      )}
    </Stack>
  )

  return (
    <>
      <HiringDeskFrame surface='publication' copy={copy} primary={content} />
      <Dialog open={Boolean(confirmAction)} onClose={() => !saving && setConfirmAction(null)} fullWidth maxWidth='sm' PaperProps={{ 'data-capture': 'hiring-publication-confirm-dialog' }}><DialogTitle>{confirmation?.title}</DialogTitle><DialogContent><Typography color='text.primary'>{confirmation?.body}</Typography></DialogContent><DialogActions><Button onClick={() => setConfirmAction(null)} disabled={saving} sx={{ color: 'text.primary' }}>{copy.common.cancel}</Button><GreenhouseButton tone={confirmation?.tone} disabled={saving} onClick={() => void runPublicationAction()} leadingIcon={saving ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined} sx={{ color: 'text.primary' }}>{copy.common.confirm}</GreenhouseButton></DialogActions></Dialog>
      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </>
  )
}

export default PublicationDeskView
