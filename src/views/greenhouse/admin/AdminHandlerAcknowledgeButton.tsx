'use client'

import { useState, useTransition } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

type Props = {
  handler: string
}

/**
 * Acknowledge button for an unhealthy reactive handler.
 *
 * Behaviour: prompts the operator for a resolution note, then POSTs to the
 * handler-health admin endpoint. The endpoint marks active dead-letters as
 * acknowledged (audit row stays for forensics) and transitions the handler
 * back to healthy. Dashboard refreshes to reflect the new state.
 *
 * The note is required: ack without explanation is the same as hiding the
 * problem, which the contract explicitly rejects. The note shows up in the
 * audit log (`outbox_reactive_log.resolution_note`).
 */
const AdminHandlerAcknowledgeButton = ({ handler }: Props) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [resolutionNote, setResolutionNote] = useState('')
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const submit = () => {
    if (!resolutionNote.trim()) {
      setFeedback({ tone: 'error', message: 'Resolution note required to acknowledge.' })
      return
    }

    setFeedback(null)

    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/ops/reactive/handler-health', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handler, resolutionNote: resolutionNote.trim(), transitionToHealthy: true })
        })

        const payload = (await response.json().catch(() => ({}))) as {
          acknowledgedRows?: number
          newState?: string
          error?: string
        }

        if (!response.ok) {
          setFeedback({
            tone: 'error',
            message: typeof payload.error === 'string' ? payload.error : 'No pudimos acknowledgear el handler.'
          })

          return
        }

        setFeedback({
          tone: 'success',
          message: `Acked ${payload.acknowledgedRows ?? 0} dead-letters · estado: ${payload.newState ?? 'healthy'}`
        })

        setResolutionNote('')
        setOpen(false)
        router.refresh()
      } catch {
        setFeedback({ tone: 'error', message: 'Network error acknowledging handler.' })
      }
    })
  }

  return (
    <Stack spacing={1.25}>
      <Button size='small' variant='outlined' color='warning' onClick={() => setOpen(true)} disabled={isPending}>
        Acknowledge
      </Button>
      {feedback ? <Alert severity={feedback.tone}>{feedback.message}</Alert> : null}

      <Dialog open={open} onClose={() => !isPending && setOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Acknowledge handler</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <DialogContentText>
              Marca los dead-letters activos de <strong>{handler}</strong> como resueltos. El audit trail se preserva.
              Confirma que la causa raíz fue investigada y arreglada antes de continuar.
            </DialogContentText>
            <TextField
              label='Resolution note'
              required
              fullWidth
              multiline
              minRows={2}
              value={resolutionNote}
              onChange={e => setResolutionNote(e.target.value)}
              placeholder='Ej: bug fix vat-ledger commit a35ca510 ya deployado; los errores anteriores son stale.'
            />
            <Typography variant='caption' color='text.secondary'>
              La nota queda en `outbox_reactive_log.resolution_note` y aparece en el audit trail.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant='contained' color='warning' onClick={submit} disabled={isPending}>
            {isPending ? 'Acknowledging...' : 'Acknowledge'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default AdminHandlerAcknowledgeButton
