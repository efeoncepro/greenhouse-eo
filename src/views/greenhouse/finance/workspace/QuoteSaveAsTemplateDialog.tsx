'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomTextField from '@core/components/mui/TextField'

const GREENHOUSE_COPY = getMicrocopy()

export interface QuoteSaveAsTemplatePayload {
  templateName: string
  templateCode: string
  description: string | null
}

export interface QuoteSaveAsTemplateDialogProps {
  open: boolean
  quotationNumber: string
  submitting: boolean
  error: string | null
  onClose: () => void
  onConfirm: (payload: QuoteSaveAsTemplatePayload) => Promise<void>
}

const TEMPLATE_CODE_PATTERN = /^[A-Z0-9-]+$/

const QuoteSaveAsTemplateDialog = ({
  open,
  quotationNumber,
  submitting,
  error,
  onClose,
  onConfirm
}: QuoteSaveAsTemplateDialogProps) => {
  const [templateName, setTemplateName] = useState('')
  const [templateCode, setTemplateCode] = useState('')
  const [description, setDescription] = useState('')
  const [confirmError, setConfirmError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setTemplateName('')
      setTemplateCode('')
      setDescription('')
      setConfirmError(null)
    }
  }, [open])

  const nameError = useMemo(() => {
    if (templateName.trim().length === 0) return null
    if (templateName.trim().length < 4) return 'Usa al menos 4 caracteres.'

    return null
  }, [templateName])

  const codeError = useMemo(() => {
    if (templateCode.length === 0) return null
    if (!TEMPLATE_CODE_PATTERN.test(templateCode)) return 'Solo mayúsculas, números y guiones.'

    return null
  }, [templateCode])

  const isValid =
    templateName.trim().length >= 4 && templateCode.length > 0 && TEMPLATE_CODE_PATTERN.test(templateCode)

  const handleCodeBlur = useCallback(() => {
    setTemplateCode(prev => prev.trim().toUpperCase())
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!isValid) return
    setConfirmError(null)

    try {
      await onConfirm({
        templateName: templateName.trim(),
        templateCode: templateCode.trim().toUpperCase(),
        description: description.trim() ? description.trim() : null
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el template.'

      setConfirmError(message)
    }
  }, [description, isValid, onConfirm, templateCode, templateName])

  const handleClose = useCallback(() => {
    if (submitting) return
    onClose()
  }, [onClose, submitting])

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth='sm'
      aria-labelledby='quote-save-template-dialog-title'
    >
      <DialogTitle id='quote-save-template-dialog-title'>Guardar como template</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            Este template estará disponible para crear cotizaciones futuras con la misma estructura de ítems, términos y
            condiciones. Partimos de la cotización {quotationNumber}.
          </Typography>

          <CustomTextField
            fullWidth
            size='small'
            label='Nombre del template'
            required
            value={templateName}
            onChange={event => setTemplateName(event.target.value)}
            error={nameError !== null}
            helperText={nameError ?? 'Usa un nombre reconocible para tu equipo.'}
            disabled={submitting}
            inputProps={{ 'aria-label': 'Nombre del template' }}
          />

          <CustomTextField
            fullWidth
            size='small'
            label='Código del template'
            required
            value={templateCode}
            onChange={event => setTemplateCode(event.target.value.toUpperCase())}
            onBlur={handleCodeBlur}
            error={codeError !== null}
            helperText={codeError ?? 'Mayúsculas, números y guiones. Ej: RETAINER-BRAND-01.'}
            disabled={submitting}
            inputProps={{ 'aria-label': 'Código del template', style: { textTransform: 'uppercase' } }}
          />

          <CustomTextField
            fullWidth
            size='small'
            label='Descripción (opcional)'
            value={description}
            onChange={event => setDescription(event.target.value)}
            multiline
            rows={3}
            helperText='Contexto breve: cuándo usarlo, qué incluye o qué diferencia tiene.'
            disabled={submitting}
            inputProps={{ 'aria-label': 'Descripción del template' }}
          />

          {(error || confirmError) && (
            <Alert severity='error' role='alert'>
              {confirmError ?? error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>{GREENHOUSE_COPY.actions.cancel}</Button>
        <Button
          variant='contained'
          startIcon={<i className='tabler-template' />}
          onClick={handleConfirm}
          disabled={submitting || !isValid}
        >
          {submitting ? 'Guardando…' : 'Guardar template'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default QuoteSaveAsTemplateDialog
