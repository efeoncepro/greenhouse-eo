'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { CanonicalApiError, throwIfNotOk } from '@/lib/api/parse-error-response'
import { GH_GROWTH_AI_VISIBILITY_CLIENT_TIERING } from '@/lib/copy/growth'

/**
 * TASK-1278 — Run self-serve AEO (isla cliente del nodo S6, EPIC-020).
 *
 * Única superficie interactiva del tiering: POST al ÚNICO command gobernado de portal
 * (`/api/client-portal/growth/ai-visibility/run` → `requestGraderRunForOrganization`, TASK-1277).
 * NO dispara el motor directo ni conoce allowance/costo — el chokepoint server-side decide. La UI sólo
 * refleja estados honestos: idle → submitting → preparing (la página se re-resuelve sola hasta que el
 * informe llega) | error es-CL (sin exponer costo/engine). Si el run self-serve no está habilitado en el
 * ambiente (`runAvailable=false`), degrada a un CTA deshabilitado "Disponible próximamente" en vez de un
 * botón que siempre falla.
 */

const C = GH_GROWTH_AI_VISIBILITY_CLIENT_TIERING

const RUN_ENDPOINT = '/api/client-portal/growth/ai-visibility/run'

// Polling acotado: tras encolar, la página se re-resuelve cada ~8s hasta que el server renderiza el
// workbench (el informe llegó) o se agotan los intentos. Evita polling infinito si el run se atasca.
const POLL_INTERVAL_MS = 8_000
const MAX_POLL_ATTEMPTS = 22

// Código canónico del endpoint → copy tiering tuteo. Fallback al mensaje canónico es-CL del server.
const codeToMessage: Record<string, string> = {
  aeo_quota_exhausted: C.run.errorQuota,
  aeo_profile_required: C.run.errorProfile,
  aeo_cost_blocked: C.run.errorBusy,
  aeo_run_disabled: C.run.unavailable
}

type Phase = 'idle' | 'submitting' | 'preparing' | 'error'

export interface AeoRunCtaProps {
  /** El run self-serve está habilitado en este ambiente (flags portal/trial ON). */
  runAvailable: boolean
}

const AeoRunCta = ({ runAvailable }: AeoRunCtaProps) => {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const attemptsRef = useRef(0)

  // Polling del estado preparing: re-resuelve el server component hasta que el informe aparezca.
  useEffect(() => {
    if (phase !== 'preparing') return

    const id = setInterval(() => {
      attemptsRef.current += 1

      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
        clearInterval(id)

        return
      }

      router.refresh()
    }, POLL_INTERVAL_MS)

    return () => clearInterval(id)
  }, [phase, router])

  const handleRun = useCallback(async () => {
    setPhase('submitting')
    setErrorMessage(null)

    try {
      const res = await fetch(RUN_ENDPOINT, { method: 'POST' })

      await throwIfNotOk(res, C.run.errorGeneric)

      // Aceptado (202): el run quedó encolado. Re-resolvemos el server para reflejar el cupo decrementado
      // y, cuando el motor termine, el workbench. Entramos en preparing (polling acotado).
      attemptsRef.current = 0
      setPhase('preparing')
      router.refresh()
    } catch (error) {
      const message =
        error instanceof CanonicalApiError
          ? (error.code && codeToMessage[error.code]) || error.message || C.run.errorGeneric
          : C.run.errorGeneric

      setErrorMessage(message)
      setPhase('error')
    }
  }, [router])

  if (!runAvailable) {
    return (
      <Stack spacing={1} data-capture='aeo-run-cta'>
        <Button variant='contained' disabled aria-label={C.run.ctaAria}>
          {C.run.unavailable}
        </Button>
        <Typography variant='caption' color='text.secondary'>
          {C.run.unavailableHelp}
        </Typography>
      </Stack>
    )
  }

  if (phase === 'preparing') {
    return (
      <Stack spacing={2} data-capture='aeo-run-cta' aria-live='polite'>
        <Stack direction='row' spacing={2} alignItems='center'>
          <CircularProgress size={18} />
          <Typography variant='body2' sx={{ fontWeight: 600 }}>
            {C.run.preparingTitle}
          </Typography>
        </Stack>
        <Typography variant='caption' color='text.secondary'>
          {C.run.preparingBody}
        </Typography>
        <Box>
          <Button variant='tonal' size='small' onClick={() => router.refresh()}>
            {C.run.refresh}
          </Button>
        </Box>
      </Stack>
    )
  }

  return (
    <Stack spacing={2} data-capture='aeo-run-cta'>
      <Box>
        <Button
          variant='contained'
          onClick={handleRun}
          disabled={phase === 'submitting'}
          startIcon={
            phase === 'submitting' ? (
              <CircularProgress size={16} color='inherit' />
            ) : (
              <i className='tabler-sparkles' aria-hidden='true' />
            )
          }
          aria-label={C.run.ctaAria}
        >
          {C.run.cta}
        </Button>
      </Box>
      {phase === 'error' && errorMessage ? (
        <Alert severity='warning' variant='outlined' sx={{ borderRadius: theme => `${theme.shape.customBorderRadius.sm}px` }}>
          {errorMessage}
        </Alert>
      ) : null}
    </Stack>
  )
}

export default AeoRunCta
