'use client'

// TASK-975 — Contractor Engagement Lifecycle Controls (runtime).
// Promoted from the APPROVED mockup (DetailMockupView → InspectorPanel lifecycle
// controls + LifecycleDialog). Differences vs mock:
//   · valid targets come from the canonical ENGAGEMENT_TRANSITIONS
//   · "activar" is HIDDEN when the classification risk blocks
//     (isClassificationRiskBlocking) — the server enforces regardless
//   · Confirm → PATCH /api/hr/contractors/[id] (action='transition') + onTransitioned

import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import { GH_CONTRACTOR_COMPENSATION as C } from '@/lib/copy/contractor-compensation'
import { throwIfNotOk } from '@/lib/api/parse-error-response'
import { AnimatePresence, motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'
import {
  ENGAGEMENT_TRANSITIONS,
  isClassificationRiskBlocking,
  isTerminalEngagementStatus
} from '@/lib/contractor-engagements'
import type {
  ContractorClassificationRiskStatus,
  ContractorEngagementStatus
} from '@/lib/contractor-engagements/types'
import {
  engagementStatusLabel,
  transitionCopyKey,
  transitionCtaLabel,
  transitionIcon,
  transitionRequiresReason
} from '@/lib/contractor-engagements/engagement-display'

type SaveState = 'idle' | 'saving' | 'saved'

interface Props {
  engagementId: string
  lifecycleStatus: ContractorEngagementStatus
  classificationRiskStatus: ContractorClassificationRiskStatus
  canManage: boolean
  onTransitioned: () => void
  // TASK-984 — el cierre (ending/ended) NO se ofrece como transición genérica;
  // se canaliza al drawer de cierre (mirror del funnel de API TASK-797).
  onRequestClosure: () => void
}

const SectionLabel = ({ text }: { text: string }) => (
  <Typography
    variant='caption'
    sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', mb: 1 }}
  >
    {text}
  </Typography>
)

// --- Confirm dialog ----------------------------------------------------------

interface ConfirmProps {
  engagementId: string
  from: ContractorEngagementStatus
  to: ContractorEngagementStatus | null
  onClose: () => void
  onConfirmed: () => void
}

const LifecycleConfirmDialog = ({ engagementId, from, to, onClose, onConfirmed }: ConfirmProps) => {
  const prefersReduced = useReducedMotion()

  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!to) return

    setReason('')
    setTouched(false)
    setSaveState('idle')
    setError(null)
  }, [to])

  if (!to) return null

  const needsReason = transitionRequiresReason(to)
  const reasonError = needsReason && touched && reason.trim().length < 10
  const ctaKey = transitionCopyKey(from, to)

  const intro = C.lifecycle.confirmIntro
    .replace('{from}', engagementStatusLabel(from))
    .replace('{to}', engagementStatusLabel(to))

  const handleConfirm = async () => {
    setTouched(true)

    if (needsReason && reason.trim().length < 10) return

    setSaveState('saving')
    setError(null)

    try {
      const response = await fetch(`/api/hr/contractors/${engagementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transition',
          targetStatus: to,
          ...(reason.trim() ? { reason: reason.trim() } : {})
        })
      })

      await throwIfNotOk(response, C.lifecycle.transitionError)

      setSaveState('saved')
      onConfirmed()
      window.setTimeout(() => {
        setSaveState('idle')
        onClose()
      }, 600)
    } catch (saveError) {
      setSaveState('idle')
      setError(saveError instanceof Error ? saveError.message : C.lifecycle.transitionError)
    }
  }

  return (
    <Dialog open={to !== null} onClose={saveState === 'idle' ? onClose : undefined} maxWidth='xs' fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>{C.lifecycle.confirmTitle}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {intro}
          </Typography>
          {needsReason ? (
            <CustomTextField
              label={C.lifecycle.confirmReasonLabel}
              value={reason}
              onChange={e => setReason(e.target.value)}
              onBlur={() => setTouched(true)}
              error={reasonError}
              helperText={reasonError ? C.lifecycle.confirmReasonError : C.lifecycle.confirmReasonHelper}
              multiline
              minRows={3}
              fullWidth
              slotProps={{ input: { 'aria-invalid': reasonError } }}
            />
          ) : null}
          {error ? (
            <Typography variant='caption' role='alert' sx={{ color: 'error.main', display: 'flex', gap: 1, alignItems: 'center' }}>
              <i className='tabler-alert-triangle' style={{ fontSize: 16 }} aria-hidden />
              {error}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 5 }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={saveState !== 'idle'}>
          {C.lifecycle.confirmCancel}
        </Button>
        <Button
          variant='contained'
          color={to === 'cancelled' ? 'error' : 'primary'}
          onClick={handleConfirm}
          disabled={saveState !== 'idle'}
          startIcon={
            <AnimatePresence mode='wait' initial={false}>
              {saveState === 'saving' ? (
                <motion.span
                  key='spin'
                  style={{ display: 'inline-flex' }}
                  initial={prefersReduced ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={prefersReduced ? undefined : { opacity: 0, scale: 0.6 }}
                >
                  <CircularProgress size={16} color='inherit' />
                </motion.span>
              ) : saveState === 'saved' ? (
                <motion.span key='check' style={{ display: 'inline-flex' }} initial={prefersReduced ? false : { opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}>
                  <i className='tabler-check' />
                </motion.span>
              ) : (
                <motion.span key='idle' style={{ display: 'inline-flex' }}>
                  <i className={transitionIcon(ctaKey)} />
                </motion.span>
              )}
            </AnimatePresence>
          }
        >
          {C.lifecycle.confirmCta}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// --- Controls ----------------------------------------------------------------

const ContractorLifecycleControls = ({
  engagementId,
  lifecycleStatus,
  classificationRiskStatus,
  canManage,
  onTransitioned,
  onRequestClosure
}: Props) => {
  const [target, setTarget] = useState<ContractorEngagementStatus | null>(null)

  const blocking = isClassificationRiskBlocking(classificationRiskStatus)
  const terminal = isTerminalEngagementStatus(lifecycleStatus)

  // Offer only valid next states; hide transition to `active` when risk blocks.
  // TASK-984: `ending`/`ended` se EXCLUYEN — el cierre se canaliza al drawer de
  // cierre (espejo del guard de API TASK-797 que rechaza esos targets en la
  // transición genérica). Aparece como CTA "Cerrar contractor".
  const transitions = ENGAGEMENT_TRANSITIONS[lifecycleStatus].filter(
    to => to !== 'ending' && to !== 'ended' && !(to === 'active' && blocking)
  )

  // El CTA de cierre aplica mientras el engagement esté vivo (no terminal).
  const canCloseFromHere =
    lifecycleStatus === 'active' || lifecycleStatus === 'paused' || lifecycleStatus === 'ending'

  return (
    <Box>
      <SectionLabel text={C.lifecycle.panelLabel} />

      {blocking && !terminal ? (
        <Stack direction='row' spacing={2} alignItems='center' sx={{ color: 'text.secondary', mb: 3 }}>
          <i className='tabler-shield-lock' style={{ fontSize: 18 }} aria-hidden />
          <Typography variant='caption'>{C.lifecycle.activateBlockedNote}</Typography>
        </Stack>
      ) : null}

      {terminal ? (
        <Typography variant='caption' sx={{ color: 'text.disabled' }}>
          {C.lifecycle.terminalNote}
        </Typography>
      ) : (
        <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
          {transitions.map(to => {
            const key = transitionCopyKey(lifecycleStatus, to)

            return (
              <Button
                key={to}
                size='small'
                variant={to === 'active' ? 'contained' : 'tonal'}
                color={to === 'cancelled' ? 'error' : 'secondary'}
                startIcon={<i className={transitionIcon(key)} />}
                disabled={!canManage}
                onClick={() => setTarget(to)}
              >
                {transitionCtaLabel(key)}
              </Button>
            )
          })}
          {canCloseFromHere ? (
            <Button
              size='small'
              variant='tonal'
              color='warning'
              startIcon={<i className='tabler-door-exit' />}
              disabled={!canManage}
              onClick={onRequestClosure}
            >
              {C.closure.openCta}
            </Button>
          ) : null}
        </Stack>
      )}

      <LifecycleConfirmDialog
        engagementId={engagementId}
        from={lifecycleStatus}
        to={target}
        onClose={() => setTarget(null)}
        onConfirmed={onTransitioned}
      />
    </Box>
  )
}

export default ContractorLifecycleControls
