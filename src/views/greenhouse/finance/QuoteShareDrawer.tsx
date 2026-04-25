'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'

import CustomChip from '@core/components/mui/Chip'

interface ShareLinkSummary {
  shortCode: string
  shortUrl: string
  createdAt: string
  createdBy: string | null
  expiresAt: string | null
  lastAccessedAt: string | null
  accessCount: number
}

interface Props {
  open: boolean
  onClose: () => void
  quoteId: string
  quotationNumber: string
}

const formatRelative = (iso: string | null): string => {
  if (!iso) return '—'

  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)

  if (minutes < 1) return 'hace segundos'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)

  if (days < 30) return `hace ${days} d`
  const months = Math.floor(days / 30)

  return `hace ${months} mes${months > 1 ? 'es' : ''}`
}

const formatDate = (iso: string | null): string => {
  if (!iso) return '—'

  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * TASK-631 Fase 2 — Drawer that surfaces the public share link to the
 * sales rep. Lets them generate (or reuse) a short link, copy it,
 * see analytics (views + last open), and revoke it.
 */
export const QuoteShareDrawer = ({ open, onClose, quoteId, quotationNumber }: Props) => {
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [revokingCode, setRevokingCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [links, setLinks] = useState<ShareLinkSummary[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [emailModeFor, setEmailModeFor] = useState<string | null>(null)
  const [emailRecipient, setEmailRecipient] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSentFor, setEmailSentFor] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/finance/quotes/${quoteId}/share`, { cache: 'no-store' })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { links: ShareLinkSummary[] }

      setLinks(data.links)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar los share links')
    } finally {
      setLoading(false)
    }
  }, [quoteId])

  useEffect(() => {
    if (open) {
      void refresh()
    }
  }, [open, refresh])

  const createLink = async () => {
    setCreating(true)
    setError(null)

    try {
      const res = await fetch(`/api/finance/quotes/${quoteId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reuseIfActive: true })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))

        throw new Error(body.error || `HTTP ${res.status}`)
      }

      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos crear el link')
    } finally {
      setCreating(false)
    }
  }

  const revoke = async (shortCode: string) => {
    if (!window.confirm('¿Seguro que quieres revocar este link? El cliente verá "Documento inválido" si lo abre.')) {
      return
    }

    setRevokingCode(shortCode)
    setError(null)

    try {
      const res = await fetch(`/api/finance/quotes/${quoteId}/share/${shortCode}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'revoked_by_sales_rep' })
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos revocar el link')
    } finally {
      setRevokingCode(null)
    }
  }

  const sendEmail = async (shortCode: string) => {
    if (!emailRecipient.includes('@')) {
      setError('Email del destinatario requerido')
      
return
    }

    setSendingEmail(true)
    setError(null)

    try {
      const res = await fetch(`/api/finance/quotes/${quoteId}/share/${shortCode}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: emailRecipient.trim(),
          customMessage: emailMessage.trim() || undefined
        })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))

        throw new Error(body.error || `HTTP ${res.status}`)
      }

      setEmailSentFor(shortCode)
      setEmailModeFor(null)
      setEmailRecipient('')
      setEmailMessage('')
      setTimeout(() => setEmailSentFor(null), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar el email')
    } finally {
      setSendingEmail(false)
    }
  }

  const copy = async (url: string, code: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      // Fallback: prompt user to copy manually
      window.prompt('Copia el link:', url)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant='h6' sx={{ fontWeight: 600 }}>
              Compartir cotización
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {quotationNumber}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size='small' aria-label='Cerrar'>
            <i className='tabler-x' />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : links.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
              No hay link compartible activo para esta cotización.
            </Typography>
            <Button
              variant='contained'
              onClick={createLink}
              disabled={creating}
              startIcon={creating ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-link' />}
            >
              {creating ? 'Generando...' : 'Generar link compartible'}
            </Button>
          </Box>
        ) : (
          <Stack spacing={2}>
            {links.map(link => (
              <Box
                key={link.shortCode}
                sx={{
                  border: theme => `1px solid ${theme.palette.divider}`,
                  borderRadius: 1.5,
                  p: 2.5
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Box
                    component='code'
                    sx={{
                      flex: 1,
                      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                      fontSize: 13,
                      color: 'primary.main',
                      bgcolor: 'background.default',
                      p: 1,
                      borderRadius: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {link.shortUrl}
                  </Box>
                  <Tooltip title={copiedCode === link.shortCode ? '¡Copiado!' : 'Copiar link'}>
                    <IconButton onClick={() => copy(link.shortUrl, link.shortCode)} size='small' color='primary'>
                      <i className={copiedCode === link.shortCode ? 'tabler-check' : 'tabler-copy'} />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Stack direction='row' spacing={2} sx={{ mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Aperturas
                    </Typography>
                    <Typography variant='h6' sx={{ fontWeight: 600 }}>
                      {link.accessCount}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Última apertura
                    </Typography>
                    <Typography variant='body2' sx={{ fontWeight: 500 }}>
                      {formatRelative(link.lastAccessedAt)}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Vence
                    </Typography>
                    <Typography variant='body2' sx={{ fontWeight: 500 }}>
                      {formatDate(link.expiresAt)}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction='row' spacing={1}>
                  <Button
                    variant={emailModeFor === link.shortCode ? 'contained' : 'outlined'}
                    color='primary'
                    size='small'
                    startIcon={<i className='tabler-mail' />}
                    onClick={() => {
                      setEmailModeFor(emailModeFor === link.shortCode ? null : link.shortCode)
                      setError(null)
                    }}
                  >
                    {emailModeFor === link.shortCode ? 'Cancelar' : 'Enviar por email'}
                  </Button>
                  <Button
                    variant='outlined'
                    color='error'
                    size='small'
                    onClick={() => revoke(link.shortCode)}
                    disabled={revokingCode === link.shortCode}
                    startIcon={revokingCode === link.shortCode ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-ban' />}
                  >
                    {revokingCode === link.shortCode ? 'Revocando...' : 'Revocar'}
                  </Button>
                </Stack>

                {emailModeFor === link.shortCode ? (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Stack spacing={1.5}>
                      <TextField
                        label='Email del destinatario'
                        type='email'
                        size='small'
                        fullWidth
                        required
                        value={emailRecipient}
                        onChange={e => setEmailRecipient(e.target.value)}
                        placeholder='cliente@empresa.com'
                        disabled={sendingEmail}
                      />
                      <TextField
                        label='Mensaje adicional (opcional)'
                        size='small'
                        fullWidth
                        multiline
                        rows={3}
                        value={emailMessage}
                        onChange={e => setEmailMessage(e.target.value)}
                        placeholder='Hola María, te dejo la propuesta para que la revisemos en la próxima reunión...'
                        disabled={sendingEmail}
                      />
                      <Button
                        variant='contained'
                        size='small'
                        onClick={() => sendEmail(link.shortCode)}
                        disabled={sendingEmail || !emailRecipient.includes('@')}
                        startIcon={sendingEmail ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-send' />}
                      >
                        {sendingEmail ? 'Enviando...' : 'Enviar email'}
                      </Button>
                    </Stack>
                  </Box>
                ) : null}

                {emailSentFor === link.shortCode ? (
                  <Alert severity='success' sx={{ mt: 2 }}>
                    Email enviado correctamente al cliente.
                  </Alert>
                ) : null}

                <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                  <CustomChip round='true' size='small' variant='tonal' color='info' label={`Creado ${formatRelative(link.createdAt)}`} />
                </Box>
              </Box>
            ))}

            <Box sx={{ textAlign: 'center', pt: 1 }}>
              <Button
                variant='outlined'
                size='small'
                onClick={createLink}
                disabled={creating}
                startIcon={creating ? <CircularProgress size={14} /> : <i className='tabler-plus' />}
              >
                {creating ? 'Generando...' : 'Generar otro link'}
              </Button>
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  )
}
