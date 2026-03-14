'use client'

// React Imports
import type { ReactNode } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

type ConfirmDialogProps = {
  open: boolean
  setOpen: (open: boolean) => void
  title: string
  description?: string | ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: 'primary' | 'error' | 'warning' | 'success' | 'info' | 'secondary'
  onConfirm: () => void | Promise<void>
  loading?: boolean
}

const ConfirmDialog = ({
  open,
  setOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmColor = 'error',
  onConfirm,
  loading = false
}: ConfirmDialogProps) => {
  const handleConfirm = async () => {
    await onConfirm()
    setOpen(false)
  }

  return (
    <Dialog
      fullWidth
      maxWidth='xs'
      open={open}
      onClose={() => !loading && setOpen(false)}
      closeAfterTransition={false}
    >
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', pt: 8, pb: 3, px: 8 }}>
        <i className='tabler-alert-circle' style={{ fontSize: 88, marginBottom: 24, color: 'var(--mui-palette-warning-main)' }} />
        <Typography variant='h5' sx={{ mb: 1 }}>
          {title}
        </Typography>
        {description && (
          <Typography color='text.secondary'>
            {description}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 8, px: 8 }}>
        <Button
          variant='contained'
          color={confirmColor}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? 'Procesando...' : confirmLabel}
        </Button>
        <Button
          variant='tonal'
          color='secondary'
          onClick={() => setOpen(false)}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmDialog
