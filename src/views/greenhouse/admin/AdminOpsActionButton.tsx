'use client'

import { useState, useTransition } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

type Props = {
  endpoint: string
  label: string
  helper: string
}

const toMessage = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return 'Operación ejecutada.'

  const entries = Object.entries(payload as Record<string, unknown>)

  if (entries.length === 0) return 'Operación ejecutada.'

  return entries
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    .join(' · ')
}

const AdminOpsActionButton = ({ endpoint, label, helper }: Props) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const handleClick = () => {
    setFeedback(null)

    startTransition(async () => {
      try {
        const response = await fetch(endpoint, { method: 'POST' })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          setFeedback({
            tone: 'error',
            message: typeof payload?.error === 'string' ? payload.error : 'No pudimos ejecutar la operación.'
          })

          return
        }

        setFeedback({
          tone: 'success',
          message: toMessage(payload)
        })

        router.refresh()
      } catch {
        setFeedback({
          tone: 'error',
          message: 'Error de red al ejecutar la operación.'
        })
      }
    })
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <Button variant='contained' onClick={handleClick} disabled={isPending}>
          {isPending ? 'Ejecutando...' : label}
        </Button>
        <Typography variant='body2' color='text.secondary'>
          {helper}
        </Typography>
      </Stack>
      {feedback ? <Alert severity={feedback.tone}>{feedback.message}</Alert> : null}
    </Stack>
  )
}

export default AdminOpsActionButton
