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

type DashboardRequestDialogProps = {
  open: boolean
  intent: string | null
  onClose: () => void
}

const DashboardRequestDialog = ({ open, intent, onClose }: DashboardRequestDialogProps) => {
  const [value, setValue] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      setCopied(false)
      setValue('')

      return
    }

    setValue(intent ? `Necesito apoyo en: ${intent}.` : '')
  }, [intent, open])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value || 'Necesito apoyo con mi operación en Greenhouse.')
    setCopied(true)
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>¿Qué necesitas?</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            Describe el perfil, la capacidad o la herramienta que buscas. Podrás copiar este mensaje y compartirlo con tu account manager.
          </Typography>
          <TextField
            multiline
            minRows={5}
            fullWidth
            placeholder='Describe el perfil o la capacidad que buscas. Tu account manager te contactará.'
            value={value}
            onChange={event => setValue(event.target.value)}
          />
          {copied ? (
            <Typography variant='body2' color='success.main'>
              Solicitud lista para compartir con tu account manager.
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant='text'>
          Cerrar
        </Button>
        <Button onClick={handleCopy} variant='contained'>
          Copiar solicitud
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DashboardRequestDialog
