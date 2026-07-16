'use client'

// TASK-1422 — Drawer propose→confirm de la redacción asistida del aviso público (TASK-1385).
// Cliente delgado del contrato gobernado: el propose crea una PROPUESTA en el ledger y el único
// write al opening es el confirm humano (capability hiring.opening.write). Espeja el patrón visual
// del drawer "Nueva demanda" (ghHiring*) y el lenguaje IA de 1363 (Alert tabler-sparkles).
// Contratos de diseño: docs/ui/wireframes/TASK-1422-vacancy-ai-draft-drawer.md + flow + motion.

import { useCallback, useEffect, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { GreenhouseButton, GreenhouseChip } from '@/components/greenhouse/primitives'
import type { HiringDeskCopy } from '@/lib/copy'
import type { HiringOpening, TalentDemand } from '@/types/hiring'
import type { AssessmentTemplate } from '@/types/hiring-assessment'

import { HiringClientError, hiringRequest } from './hiring-client'

export interface VacancyAiPendingProposal {
  proposalId: string
  model: string
  proposed: Record<string, unknown>
}

/** Props server-resueltas de la superficie (page → view). Solo booleans + data serializable. */
export interface VacancyAiSurfaceProps {
  enabled: boolean
  canPropose: boolean
  canConfirm: boolean
  pendingByOpening: Record<string, VacancyAiPendingProposal>
}

interface DraftForm {
  publicTitle: string
  publicSummary: string
  publicDescription: string
  publicRequirements: string
  publicNiceToHave: string
  publicArea: string
  publicSeniority: string
  publicSkillTags: string[]
  publicProcessNotes: string
}

const emptyForm: DraftForm = {
  publicTitle: '',
  publicSummary: '',
  publicDescription: '',
  publicRequirements: '',
  publicNiceToHave: '',
  publicArea: '',
  publicSeniority: '',
  publicSkillTags: [],
  publicProcessNotes: '',
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '')

const strArr = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

const formFromProposal = (proposed: Record<string, unknown>): DraftForm => ({
  publicTitle: str(proposed.publicTitle),
  publicSummary: str(proposed.publicSummary),
  publicDescription: str(proposed.publicDescription),
  publicRequirements: str(proposed.publicRequirements),
  publicNiceToHave: str(proposed.publicNiceToHave),
  publicArea: str(proposed.publicArea),
  publicSeniority: str(proposed.publicSeniority),
  publicSkillTags: strArr(proposed.publicSkillTags),
  publicProcessNotes: str(proposed.publicProcessNotes),
})

type DrawerStep = 'generate' | 'proposing' | 'review'

interface VacancyAiDraftDrawerProps {
  open: boolean
  opening: HiringOpening
  demand: TalentDemand | null
  copy: HiringDeskCopy
  canConfirm: boolean
  pendingProposal: VacancyAiPendingProposal | null
  onClose: () => void
  onApplied: (opening: HiringOpening) => void
  onDiscarded: () => void
  onPendingChange: (openingId: string, pending: VacancyAiPendingProposal | null) => void
}

const VacancyAiDraftDrawer = ({
  open,
  opening,
  demand,
  copy,
  canConfirm,
  pendingProposal,
  onClose,
  onApplied,
  onDiscarded,
  onPendingChange,
}: VacancyAiDraftDrawerProps) => {
  const vacancyCopy = copy.publication.vacancyAi

  const [step, setStep] = useState<DrawerStep>('generate')
  const [proposal, setProposal] = useState<VacancyAiPendingProposal | null>(null)
  const [form, setForm] = useState<DraftForm>(emptyForm)
  const [skillsInput, setSkillsInput] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [templates, setTemplates] = useState<AssessmentTemplate[] | null>(null)
  const [degraded, setDegraded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requiredError, setRequiredError] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)

  // El opening activo del request en vuelo: si el usuario "sigue en segundo plano" y cambia de
  // vacante, la respuesta tardía solo actualiza el ledger de SU opening, nunca el form visible.
  const inFlightOpeningId = useRef<string | null>(null)

  const busy = confirming || rejecting

  const hydrateFromProposal = useCallback((pending: VacancyAiPendingProposal) => {
    setProposal(pending)
    setForm(formFromProposal(pending.proposed))
    setSkillsInput('')
    setStep('review')
    setDegraded(false)
    setError(null)
    setRequiredError(false)
  }, [])

  // Al abrir (o cambiar de vacante con el drawer abierto): retomar el pendiente o partir en generate.
  useEffect(() => {
    if (!open) return

    if (pendingProposal) {
      hydrateFromProposal(pendingProposal)
    } else if (inFlightOpeningId.current !== opening.openingId) {
      setStep('generate')
      setProposal(null)
      setForm(emptyForm)
      setTemplateId('')
      setDegraded(false)
      setError(null)
      setRequiredError(false)
    }
  }, [open, opening.openingId, pendingProposal, hydrateFromProposal])

  // Template picker lazy: una sola carga por sesión del drawer.
  useEffect(() => {
    if (!open || step !== 'generate' || templates !== null) return

    let cancelled = false

    hiringRequest<{ items: AssessmentTemplate[] }>('/api/hiring/assessments/templates')
      .then((payload) => { if (!cancelled) setTemplates(payload.items ?? []) })
      .catch(() => { if (!cancelled) setTemplates([]) })

    return () => { cancelled = true }
  }, [open, step, templates])

  const updateForm = <K extends keyof DraftForm>(field: K, value: DraftForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }))

    if (requiredError) setRequiredError(false)
  }

  const commitSkillsInput = () => {
    const tokens = skillsInput.split(',').map((token) => token.trim()).filter(Boolean)

    if (tokens.length === 0) return

    updateForm('publicSkillTags', [...new Set([...form.publicSkillTags, ...tokens])])
    setSkillsInput('')
  }

  const generate = async () => {
    setStep('proposing')
    setDegraded(false)
    setError(null)
    inFlightOpeningId.current = opening.openingId

    const requestedOpeningId = opening.openingId

    try {
      const result = await hiringRequest<{
        proposal: { proposalId: string; model: string; proposed: Record<string, unknown> } | null
        status: string
        model: string
      }>(`/api/hiring/openings/${requestedOpeningId}/ai/propose-public-copy`, {
        method: 'POST',
        body: JSON.stringify(templateId ? { templateId } : {}),
      })

      inFlightOpeningId.current = null

      if (result.status === 'ok' && result.proposal) {
        const pending: VacancyAiPendingProposal = {
          proposalId: result.proposal.proposalId,
          model: result.proposal.model,
          proposed: result.proposal.proposed,
        }

        onPendingChange(requestedOpeningId, pending)

        if (requestedOpeningId === opening.openingId) hydrateFromProposal(pending)
      } else if (requestedOpeningId === opening.openingId) {
        setDegraded(true)
        setStep('generate')
      }
    } catch (requestError) {
      inFlightOpeningId.current = null

      if (requestedOpeningId === opening.openingId) {
        setError(requestError instanceof HiringClientError ? requestError.message : vacancyCopy.degraded)
        setStep('generate')
      }
    }
  }

  const apply = async () => {
    if (!proposal) return

    if (!form.publicTitle.trim() || !form.publicSummary.trim() || !form.publicDescription.trim()) {
      setRequiredError(true)

      return
    }

    setConfirming(true)
    setError(null)

    try {
      await hiringRequest(`/api/hiring/assessments/ai/proposals/${proposal.proposalId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          decision: 'confirm',
          publicCopyOverride: {
            publicTitle: form.publicTitle.trim(),
            publicSummary: form.publicSummary.trim(),
            publicDescription: form.publicDescription.trim(),
            publicRequirements: form.publicRequirements.trim() || undefined,
            publicNiceToHave: form.publicNiceToHave.trim() || undefined,
            publicArea: form.publicArea.trim() || undefined,
            publicSeniority: form.publicSeniority.trim() || undefined,
            publicSkillTags: form.publicSkillTags.length > 0 ? form.publicSkillTags : undefined,
            publicProcessNotes: form.publicProcessNotes.trim() || undefined,
          },
        }),
      })

      const refreshed = await hiringRequest<{ opening: HiringOpening } | HiringOpening>(
        `/api/hiring/openings/${opening.openingId}`,
      )

      onPendingChange(opening.openingId, null)
      onApplied('opening' in refreshed ? refreshed.opening : refreshed)
      setProposal(null)
      setForm(emptyForm)
      setStep('generate')
    } catch (requestError) {
      setError(requestError instanceof HiringClientError ? requestError.message : vacancyCopy.degraded)
    } finally {
      setConfirming(false)
    }
  }

  const discard = async () => {
    if (!proposal) return

    setRejecting(true)
    setError(null)

    try {
      await hiringRequest(`/api/hiring/assessments/ai/proposals/${proposal.proposalId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'reject' }),
      })

      onPendingChange(opening.openingId, null)
      setDiscardOpen(false)
      onDiscarded()
      setProposal(null)
      setForm(emptyForm)
      setStep('generate')
    } catch (requestError) {
      setDiscardOpen(false)
      setError(requestError instanceof HiringClientError ? requestError.message : vacancyCopy.degraded)
    } finally {
      setRejecting(false)
    }
  }

  const requestClose = () => {
    if (busy) return

    onClose()
  }

  const fieldRows: Array<{ field: keyof DraftForm; label: string; rows?: number; required?: boolean }> = [
    { field: 'publicTitle', label: vacancyCopy.fieldTitle, required: true },
    { field: 'publicSummary', label: vacancyCopy.fieldSummary, rows: 3, required: true },
    { field: 'publicDescription', label: vacancyCopy.fieldDescription, rows: 8, required: true },
    { field: 'publicRequirements', label: vacancyCopy.fieldRequirements, rows: 5 },
    { field: 'publicNiceToHave', label: vacancyCopy.fieldNiceToHave, rows: 3 },
  ]

  return (
    <>
      <Drawer
        anchor='right'
        open={open}
        onClose={requestClose}
        slotProps={{ backdrop: { sx: { animation: 'ghHiringFade 160ms cubic-bezier(.2,0,0,1)' } } }}
        PaperProps={{
          'data-capture': 'hiring-vacancy-ai-drawer',
          'aria-labelledby': 'vacancy-ai-drawer-title',
          sx: (theme) => ({
            inlineSize: 'min(520px, 100vw)',
            maxInlineSize: '100%',
            boxShadow: theme.shadows[16],
            animation: 'ghHiringDrawer 280ms cubic-bezier(.2,0,0,1)',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }),
        }}
      >
        <Stack sx={{ minBlockSize: '100%' }}>
          <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={3} sx={{ px: 6, py: 4.5 }}>
            <Box>
              <Stack direction='row' alignItems='center' spacing={2}>
                <i aria-hidden='true' className='tabler-sparkles text-primary' style={{ fontSize: 20 }} />
                <Typography id='vacancy-ai-drawer-title' variant='h4'>{vacancyCopy.drawerTitle}</Typography>
              </Stack>
              <Typography color='text.secondary' sx={{ mt: 0.5 }}>{vacancyCopy.drawerSubtitle}</Typography>
            </Box>
            <IconButton aria-label={copy.common.close} onClick={requestClose} disabled={busy}>
              <i aria-hidden='true' className='tabler-x' />
            </IconButton>
          </Stack>
          <Divider />

          <Stack
            component='section'
            role='region'
            aria-label={vacancyCopy.drawerTitle}
            tabIndex={0}
            spacing={4.5}
            sx={{ flex: 1, px: 6, py: 4.5, overflowY: 'auto' }}
          >
            {error ? <Alert severity='error' role='alert'>{error}</Alert> : null}
            {degraded ? (
              <Alert
                severity='warning'
                role='alert'
                action={<Button color='inherit' size='small' onClick={() => void generate()}>{vacancyCopy.retry}</Button>}
              >
                {vacancyCopy.degraded}
              </Alert>
            ) : null}

            {step === 'generate' ? (
              <Stack spacing={4} sx={{ animation: 'ghHiringUp 260ms cubic-bezier(.2,0,0,1)', '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}>
                <Box
                  sx={(theme) => ({
                    p: 4,
                    borderRadius: `${theme.shape.customBorderRadius.md}px`,
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.action.hover,
                  })}
                >
                  <Typography variant='overline' color='text.secondary' sx={{ letterSpacing: '0.08em' }}>
                    {vacancyCopy.contextTitle}
                  </Typography>
                  <Typography variant='h6' sx={{ mt: 1 }}>{opening.internalTitle}</Typography>
                  <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap sx={{ mt: 2.5 }}>
                    {[
                      opening.publicSeniority ?? opening.seniority,
                      opening.publicWorkMode,
                      opening.publicHiringRegion,
                      demand?.language ?? null,
                      demand?.timezone ?? null,
                    ]
                      .filter((value): value is string => Boolean(value))
                      .map((value) => (
                        <GreenhouseChip key={value} size='small' kind='status' variant='outlined' tone='default' label={value} />
                      ))}
                    {(demand?.requestedSkills ?? []).map((skill) => (
                      <GreenhouseChip key={skill} size='small' kind='status' variant='label' tone='primary' label={skill} />
                    ))}
                  </Stack>
                  <Stack direction='row' alignItems='center' spacing={1.5} sx={{ mt: 3, color: 'text.secondary' }}>
                    <i aria-hidden='true' className='tabler-lock' style={{ fontSize: 15 }} />
                    <Typography variant='caption' color='text.secondary'>{vacancyCopy.contextExcluded}</Typography>
                  </Stack>
                </Box>

                <FormControl fullWidth>
                  <InputLabel id='vacancy-ai-template-label'>{vacancyCopy.templateLabel}</InputLabel>
                  <Select
                    labelId='vacancy-ai-template-label'
                    label={vacancyCopy.templateLabel}
                    value={templateId}
                    displayEmpty={false}
                    onChange={(event) => setTemplateId(event.target.value)}
                    disabled={templates === null}
                  >
                    <MenuItem value=''>{vacancyCopy.templatePlaceholder}</MenuItem>
                    {(templates ?? []).map((template) => (
                      <MenuItem key={template.templateId} value={template.templateId}>{template.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant='caption' color='text.secondary' sx={{ mt: -2.5 }}>{vacancyCopy.templateHint}</Typography>

                <Stack direction='row' justifyContent='flex-end'>
                  <GreenhouseButton
                    kind='primaryAction'
                    leadingIconClassName='tabler-sparkles'
                    onClick={() => void generate()}
                  >
                    {vacancyCopy.generate}
                  </GreenhouseButton>
                </Stack>
              </Stack>
            ) : null}

            {step === 'proposing' ? (
              <Stack spacing={4} role='status' aria-live='polite' sx={{ animation: 'ghHiringUp 260ms cubic-bezier(.2,0,0,1)', '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}>
                <LinearProgress aria-hidden='true' />
                <Typography color='text.secondary'>{vacancyCopy.proposing}</Typography>
                <Stack spacing={2.5} aria-hidden='true'>
                  <Skeleton variant='rounded' height={44} />
                  <Skeleton variant='rounded' height={84} />
                  <Skeleton variant='rounded' height={168} />
                  <Skeleton variant='rounded' height={120} />
                </Stack>
                <Box>
                  <Button variant='text' onClick={onClose}>{vacancyCopy.background}</Button>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
                    {vacancyCopy.backgroundHint}
                  </Typography>
                </Box>
              </Stack>
            ) : null}

            {step === 'review' && proposal ? (
              <Stack spacing={4} sx={{ animation: 'ghHiringUp 320ms cubic-bezier(.2,0,0,1)', '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}>
                <Alert severity='info' icon={<i aria-hidden='true' className='tabler-sparkles' />} role='status'>
                  <AlertTitle sx={{ fontWeight: 700 }}>
                    {vacancyCopy.reviewBanner.replace('{model}', proposal.model)}
                  </AlertTitle>
                  {str(proposal.proposed.note) || null}
                </Alert>

                {fieldRows.map(({ field, label, rows, required }) => (
                  <TextField
                    key={field}
                    fullWidth
                    required={required}
                    multiline={Boolean(rows)}
                    minRows={rows}
                    label={label}
                    value={form[field]}
                    error={requiredError && required && !String(form[field]).trim()}
                    onChange={(event) => updateForm(field, event.target.value as DraftForm[typeof field])}
                    disabled={busy}
                  />
                ))}

                <Stack direction='row' spacing={3.5} sx={{ '& > *': { flex: 1 } }}>
                  <TextField label={vacancyCopy.fieldArea} value={form.publicArea} onChange={(event) => updateForm('publicArea', event.target.value)} disabled={busy} />
                  <TextField label={vacancyCopy.fieldSeniority} value={form.publicSeniority} onChange={(event) => updateForm('publicSeniority', event.target.value)} disabled={busy} />
                </Stack>

                <Box>
                  {form.publicSkillTags.length > 0 ? (
                    <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap sx={{ mb: 1.5 }}>
                      {form.publicSkillTags.map((skill) => (
                        <GreenhouseChip
                          key={skill}
                          size='small'
                          kind='input'
                          tone='primary'
                          variant='label'
                          label={skill}
                          closable
                          closeLabel={`${copy.common.close} ${skill}`}
                          onDelete={() => updateForm('publicSkillTags', form.publicSkillTags.filter((item) => item !== skill))}
                        />
                      ))}
                    </Stack>
                  ) : null}
                  <TextField
                    fullWidth
                    label={vacancyCopy.fieldSkillTags}
                    value={skillsInput}
                    onChange={(event) => setSkillsInput(event.target.value)}
                    onBlur={commitSkillsInput}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        commitSkillsInput()
                      }
                    }}
                    disabled={busy}
                  />
                </Box>

                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label={vacancyCopy.fieldProcessNotes}
                  value={form.publicProcessNotes}
                  onChange={(event) => updateForm('publicProcessNotes', event.target.value)}
                  disabled={busy}
                />

                {requiredError ? (
                  <Alert severity='error' role='alert'>{vacancyCopy.requiredHint}</Alert>
                ) : null}

                <Typography variant='caption' color='text.secondary'>
                  <i aria-hidden='true' className='tabler-scale' style={{ fontSize: 14, marginInlineEnd: 6, verticalAlign: 'text-bottom' }} />
                  {vacancyCopy.biasReminder}
                </Typography>
              </Stack>
            ) : null}
          </Stack>

          {step === 'review' && proposal ? (
            <>
              <Divider />
              <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={3} sx={{ px: 6, py: 4 }}>
                <Button
                  variant='outlined'
                  color='inherit'
                  onClick={() => setDiscardOpen(true)}
                  disabled={busy}
                  startIcon={rejecting ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : <i aria-hidden='true' className='tabler-trash' />}
                >
                  {vacancyCopy.discard}
                </Button>
                <span title={!canConfirm ? vacancyCopy.applyDisabledTooltip : undefined}>
                  <GreenhouseButton
                    kind='primaryAction'
                    disabled={busy || !canConfirm}
                    leadingIcon={confirming ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined}
                    leadingIconClassName={confirming ? undefined : 'tabler-check'}
                    onClick={() => void apply()}
                  >
                    {vacancyCopy.apply}
                  </GreenhouseButton>
                </span>
              </Stack>
            </>
          ) : null}
        </Stack>
      </Drawer>

      <Dialog
        open={discardOpen}
        onClose={() => !rejecting && setDiscardOpen(false)}
        fullWidth
        maxWidth='sm'
        slotProps={{ backdrop: { sx: { animation: 'ghHiringFade 160ms cubic-bezier(.2,0,0,1)' } } }}
        PaperProps={{
          sx: (theme) => ({
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            animation: 'ghHiringPop 240ms cubic-bezier(.2,0,0,1)',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }),
        }}
      >
        <DialogTitle>{vacancyCopy.discardTitle}</DialogTitle>
        <DialogContent><Typography color='text.primary'>{vacancyCopy.discardBody}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardOpen(false)} disabled={rejecting} sx={{ color: 'text.primary' }}>{copy.common.cancel}</Button>
          <GreenhouseButton
            tone='error'
            disabled={rejecting}
            leadingIcon={rejecting ? <CircularProgress size={16} color='inherit' aria-label={copy.common.loading} /> : undefined}
            onClick={() => void discard()}
          >
            {vacancyCopy.discard}
          </GreenhouseButton>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default VacancyAiDraftDrawer
