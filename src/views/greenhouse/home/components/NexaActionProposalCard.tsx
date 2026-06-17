'use client'

import { memo, useId, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { NexaActionPreviewMetric, NexaActionProposal } from '@/lib/nexa/actions/types'

// TASK-1137 — La tarjeta de confirmación de una acción gobernada, renderizada en el chat (el render
// del tool `propose_action`). El LLM NO ejecuta: aquí el HUMANO confirma → POST al endpoint
// determinístico (idempotency foundation). Estados honestos (state-design): el usuario siempre sabe
// qué va a pasar antes de confirmar, y qué pasó después. One-off del chat: vive junto al consumer,
// tokenizado (border/radius/colores del theme), no en el registry de primitives.

type ConfirmState =
  | { kind: 'idle' }
  | { kind: 'executing' }
  | { kind: 'executed'; summary: string; metrics: NexaActionPreviewMetric[]; replayed: boolean }
  | { kind: 'failed'; message: string; retryable: boolean }
  | { kind: 'conflict'; message: string }
  | { kind: 'cancelled' }

const sensitivityChip = (
  sensitivity: NexaActionProposal['sensitivity']
): { label: string; color: 'warning' | 'error' } | null => {
  if (sensitivity === 'medium') return { label: 'Sensibilidad media', color: 'warning' }
  if (sensitivity === 'high') return { label: 'Sensibilidad alta', color: 'error' }

  return null
}

const NexaActionProposalCardBase = ({ proposal }: { proposal: NexaActionProposal }) => {
  const [state, setState] = useState<ConfirmState>({ kind: 'idle' })
  const titleId = useId()

  const expired = new Date(proposal.expiresAt).getTime() < Date.now()
  const sensitivity = sensitivityChip(proposal.sensitivity)

  const confirm = async () => {
    setState({ kind: 'executing' })

    try {
      const response = await fetch(proposal.execution.confirmEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ idempotencyKey: proposal.execution.idempotencyKey })
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        setState({
          kind: 'executed',
          summary: typeof data.summary === 'string' ? data.summary : 'Acción completada.',
          metrics: Array.isArray(data.metrics) ? data.metrics : [],
          replayed: data.replayed === true
        })

        return
      }

      if (data.code === 'nexa_action_conflict') {
        setState({
          kind: 'conflict',
          message: typeof data.error === 'string' ? data.error : 'Esta acción ya se está procesando o cambió.'
        })

        return
      }

      setState({
        kind: 'failed',
        message: typeof data.error === 'string' ? data.error : 'No pude completar la acción.',
        // El contrato canónico marca `actionable` cuando reintentar puede resolver.
        retryable: data.actionable !== false
      })
    } catch {
      setState({ kind: 'failed', message: 'No pude conectar para ejecutar la acción. Inténtalo de nuevo.', retryable: true })
    }
  }

  return (
    <Box
      component='section'
      aria-labelledby={titleId}
      data-capture='nexa-action-proposal'
      sx={theme => ({
        mt: 1.25,
        border: 1,
        borderColor: 'divider',
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        bgcolor: 'action.hover',
        px: 2,
        py: 1.5
      })}
    >
      <Stack direction='row' spacing={1} alignItems='center' useFlexGap flexWrap='wrap' sx={{ mb: 1 }}>
        <Chip size='small' color='primary' variant='filled' icon={<i className='tabler-wand' aria-hidden />} label='Acción propuesta' />
        {sensitivity ? <Chip size='small' color={sensitivity.color} variant='tonal' label={sensitivity.label} /> : null}
      </Stack>

      <Typography id={titleId} variant='subtitle1' sx={{ fontWeight: 600, color: 'text.primary' }}>
        {proposal.confirmation.title}
      </Typography>

      <Typography variant='body2' sx={{ color: 'text.primary', mt: 0.5 }}>
        {proposal.preview.summary}
      </Typography>

      {proposal.preview.metrics.length > 0 ? (
        <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap' sx={{ mt: 1 }}>
          {proposal.preview.metrics.map(metric => (
            <Chip key={metric.label} size='small' variant='outlined' label={`${metric.label}: ${metric.value}`} />
          ))}
        </Stack>
      ) : null}

      {state.kind === 'executed' ? (
        <Alert
          severity='success'
          role='status'
          icon={<i className='tabler-circle-check' aria-hidden />}
          sx={{ mt: 1.5 }}
        >
          {state.summary}
          {state.replayed ? ' (ya estaba aplicada)' : ''}
        </Alert>
      ) : state.kind === 'conflict' ? (
        <Alert severity='warning' role='status' sx={{ mt: 1.5 }}>
          {state.message}
        </Alert>
      ) : state.kind === 'cancelled' ? (
        <Alert severity='info' role='status' icon={<i className='tabler-x' aria-hidden />} sx={{ mt: 1.5 }}>
          Acción cancelada. No se hizo ningún cambio.
        </Alert>
      ) : (
        <>
          <Divider sx={{ my: 1.5 }} />

          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1.5 }}>
            {expired
              ? 'Esta propuesta expiró. Pídele a Nexa que la proponga de nuevo.'
              : proposal.confirmation.body}
          </Typography>

          {state.kind === 'failed' ? (
            <Alert severity='error' role='alert' sx={{ mb: 1.5 }}>
              {state.message}
            </Alert>
          ) : null}

          <Stack direction='row' spacing={1} justifyContent='flex-end'>
            <Button
              size='small'
              variant='text'
              color='secondary'
              disabled={state.kind === 'executing'}
              onClick={() => setState({ kind: 'cancelled' })}
            >
              {proposal.confirmation.cancelLabel}
            </Button>
            <Button
              size='small'
              variant='contained'
              color='primary'
              disabled={expired || state.kind === 'executing' || (state.kind === 'failed' && !state.retryable)}
              onClick={confirm}
              startIcon={
                state.kind === 'executing' ? (
                  <CircularProgress size={14} color='inherit' aria-hidden />
                ) : (
                  <i className='tabler-check' aria-hidden />
                )
              }
            >
              {state.kind === 'executing'
                ? 'Ejecutando…'
                : state.kind === 'failed'
                  ? 'Reintentar'
                  : proposal.confirmation.confirmLabel}
            </Button>
          </Stack>
        </>
      )}
    </Box>
  )
}

NexaActionProposalCardBase.displayName = 'NexaActionProposalCard'

export const NexaActionProposalCard = memo(NexaActionProposalCardBase)
