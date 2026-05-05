'use client'

import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'

import { HR_LEGAL_COPY } from './copy'

interface HrRevealDialogProps {
  open: boolean
  collaboratorName: string
  kind: 'document' | 'address'
  submitting: boolean
  /** Valor revelado (presentado en mono). Null = aun no revelado */
  revealedValue: string | null
  onSubmitReveal: (reason: string) => Promise<void>
  onClose: () => void
}

const COUNTDOWN_SECONDS = 30

const HrRevealDialog = ({
  open,
  collaboratorName,
  kind,
  submitting,
  revealedValue,
  onSubmitReveal,
  onClose
}: HrRevealDialogProps) => {
  const theme = useTheme()
  const [reason, setReason] = useState('')
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [copied, setCopied] = useState(false)

  // Countdown auto-close after reveal
  useEffect(() => {
    if (!revealedValue || !open) return

    setCountdown(COUNTDOWN_SECONDS)

    const interval = setInterval(() => {
      setCountdown(s => {
        if (s <= 1) {
          clearInterval(interval)
          onClose()

          return 0
        }

        return s - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [revealedValue, open, onClose])

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setReason('')
      setCopied(false)
    }
  }, [open])

  const canSubmit = reason.trim().length >= 5

  const handleSubmit = async () => {
    if (!canSubmit) return
    await onSubmitReveal(reason.trim())
  }

  const handleCopy = async () => {
    if (!revealedValue) return

    try {
      await navigator.clipboard.writeText(revealedValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const title =
    kind === 'document'
      ? HR_LEGAL_COPY.reveal.dialogTitleDoc(collaboratorName)
      : HR_LEGAL_COPY.reveal.dialogTitleAddr(collaboratorName)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          {HR_LEGAL_COPY.reveal.dialogLead}
        </Typography>

        {revealedValue ? (
          <>
            <Box
              sx={{
                p: 3,
                background: theme.palette.background.default,
                borderRadius: theme.shape.customBorderRadius.md,
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 3
              }}
            >
              <Typography
                variant='body1'
                sx={{
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.04em',
                  fontWeight: 500
                }}
              >
                {revealedValue}
              </Typography>
              <IconButton
                aria-label={HR_LEGAL_COPY.reveal.copyAria}
                onClick={handleCopy}
                size='small'
              >
                <i
                  className={copied ? 'tabler-check' : 'tabler-copy'}
                  style={{
                    fontSize: 18,
                    color: copied ? theme.palette.success.main : theme.palette.text.secondary
                  }}
                  aria-hidden='true'
                />
              </IconButton>
            </Box>
            <Stack direction='row' alignItems='center' spacing={1} sx={{ mt: 2, color: 'warning.main' }}>
              <i className='tabler-clock' style={{ fontSize: 14 }} aria-hidden='true' />
              <Typography variant='caption' color='warning.main'>
                Se ocultara en {countdown}s
              </Typography>
            </Stack>
          </>
        ) : (
          <CustomTextField
            fullWidth
            multiline
            minRows={3}
            label={HR_LEGAL_COPY.reveal.reasonLabel}
            placeholder={HR_LEGAL_COPY.reveal.reasonPlaceholder}
            value={reason}
            onChange={e => setReason(e.target.value)}
            helperText={HR_LEGAL_COPY.reveal.reasonHint}
            disabled={submitting}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{HR_LEGAL_COPY.reveal.closeNow}</Button>
        {!revealedValue ? (
          <Button
            variant='contained'
            color='warning'
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            startIcon={submitting ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : null}
          >
            {HR_LEGAL_COPY.reveal.revealCta}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  )
}

export default HrRevealDialog
