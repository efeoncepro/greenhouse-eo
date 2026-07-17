'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { CanonicalApiError, throwIfNotOk } from '@/lib/api/parse-error-response'
import { GH_GROWTH_AEO_OPERATOR } from '@/lib/copy/growth'

/**
 * TASK-1276 Slice 5 — "Correr AEO" del detalle operador (re-run sobre la org actual).
 *
 * Espejo operador del patrón AeoRunCta (TASK-1278): POST a la puerta gobernada
 * `/api/admin/growth/ai-visibility/operator-run` y polling acotado vía `router.refresh()` hasta que
 * el server re-renderice con el informe nuevo. Estados honestos; errores canónicos → es-CL.
 */

const R = GH_GROWTH_AEO_OPERATOR.run

const POLL_INTERVAL_MS = 8_000
const MAX_POLL_ATTEMPTS = 22

const codeToMessage: Record<string, string> = {
  aeo_profile_required: R.errorProfile,
  aeo_category_unresolved: R.errorCategory,
  aeo_business_model_unconfirmed: R.errorBusinessModel,
  aeo_run_disabled: R.errorDisabled,
  aeo_cost_blocked: R.errorBusy
}

type Phase = 'idle' | 'submitting' | 'preparing' | 'error'

const AeoOperatorRunButton = ({ organizationId }: { organizationId: string }) => {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const attemptsRef = useRef(0)

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
      const res = await fetch('/api/admin/growth/ai-visibility/operator-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectOrganizationId: organizationId })
      })

      await throwIfNotOk(res, R.errorGeneric)

      attemptsRef.current = 0
      setPhase('preparing')
      router.refresh()
    } catch (error) {
      const message =
        error instanceof CanonicalApiError
          ? (error.code && codeToMessage[error.code]) || error.message || R.errorGeneric
          : R.errorGeneric

      setErrorMessage(message)
      setPhase('error')
    }
  }, [organizationId, router])

  if (phase === 'preparing') {
    return (
      <Stack direction='row' spacing={2} alignItems='center' aria-live='polite'>
        <CircularProgress size={16} />
        <Typography variant='caption' color='text.secondary'>
          {R.preparingTitle}
        </Typography>
      </Stack>
    )
  }

  return (
    <Stack spacing={1} alignItems='flex-end'>
      <Button
        variant='outlined'
        color='inherit'
        sx={{ color: 'text.secondary', borderColor: 'divider' }}
        onClick={handleRun}
        disabled={phase === 'submitting'}
        startIcon={
          phase === 'submitting' ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-refresh' />
        }
        aria-label={R.detailCtaAria}
      >
        {R.detailCta}
      </Button>
      {phase === 'error' && errorMessage ? (
        <Typography variant='caption' color='error.main' role='alert'>
          {errorMessage}
        </Typography>
      ) : null}
    </Stack>
  )
}

export default AeoOperatorRunButton
