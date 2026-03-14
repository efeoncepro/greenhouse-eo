'use client'

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { GH_MESSAGES } from '@/config/greenhouse-nomenclature'

type RequestDialogProps = {
  open: boolean
  intent: string | null
  onClose: () => void
}

const RequestDialog = ({ open, intent, onClose }: RequestDialogProps) => {
  const [value, setValue] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      setCopied(false)
      setValue('')

      return
    }

    setValue(intent ? GH_MESSAGES.request_dialog_prefill(intent) : '')
  }, [intent, open])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value || GH_MESSAGES.request_dialog_fallback)
    setCopied(true)
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>{GH_MESSAGES.request_dialog_title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            {GH_MESSAGES.request_dialog_description}
          </Typography>
          <TextField
            multiline
            minRows={5}
            fullWidth
            placeholder={GH_MESSAGES.request_dialog_placeholder}
            value={value}
            onChange={event => setValue(event.target.value)}
          />
          {copied ? (
            <Typography variant='body2' color='success.main'>
              {GH_MESSAGES.request_dialog_copied}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant='text'>
          {GH_MESSAGES.request_dialog_close}
        </Button>
        <Button onClick={handleCopy} variant='contained'>
          {GH_MESSAGES.request_dialog_copy}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RequestDialog
