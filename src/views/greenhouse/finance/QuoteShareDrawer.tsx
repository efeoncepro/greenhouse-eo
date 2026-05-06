'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'

import CustomChip from '@core/components/mui/Chip'
import { getMicrocopy } from '@/lib/copy'

const GREENHOUSE_COPY = getMicrocopy()


interface ShareLinkSummary {
  shortCode: string
  shortUrl: string
  createdAt: string
  createdBy: string | null
  expiresAt: string | null
  lastAccessedAt: string | null
  accessCount: number
}

interface OrgContact {
  contactId: string
  email: string
  name: string | null
  role: string | null
  isPrimary: boolean
}

interface PdfSizeInfo {
  sizeBytes: number | null
  isEstimate: boolean
  estimatedRangeBytes?: { min: number; max: number }
}

interface Props {
  open: boolean
  onClose: () => void
  quoteId: string
  quotationNumber: string
}

type SendState = 'idle' | 'generating-pdf' | 'sending' | 'success' | 'error'

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

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * TASK-631 Fase 4 — Drawer with contact picker + PDF toggle + multi-fase loading.
 */
export const QuoteShareDrawer = ({ open, onClose, quoteId, quotationNumber }: Props) => {
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [revokingCode, setRevokingCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [links, setLinks] = useState<ShareLinkSummary[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Email send state
  const [emailModeFor, setEmailModeFor] = useState<string | null>(null)

  const [contactsState, setContactsState] = useState<{
    organizationName: string | null
    contacts: OrgContact[]
  } | null>(null)

  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set())
  const [adHocEmail, setAdHocEmail] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [includePdf, setIncludePdf] = useState(true)
  const [pdfSize, setPdfSize] = useState<PdfSizeInfo | null>(null)
  const [sendState, setSendState] = useState<SendState>('idle')
  const [emailSentSummary, setEmailSentSummary] = useState<string | null>(null)

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

  const loadContactsAndPdfSize = useCallback(
    async (shortCode: string) => {
      try {
        const [contactsRes, sizeRes] = await Promise.all([
          fetch(`/api/finance/quotes/${quoteId}/share/contacts`, { cache: 'no-store' }),
          fetch(`/api/finance/quotes/${quoteId}/share/${shortCode}/pdf-size`, { cache: 'no-store' })
        ])

        if (contactsRes.ok) {
          const data = (await contactsRes.json()) as {
            organization: { name: string } | null
            contacts: OrgContact[]
          }

          setContactsState({
            organizationName: data.organization?.name ?? null,
            contacts: data.contacts
          })

          // Default-select the primary contact
          const primary = data.contacts.find(c => c.isPrimary)

          if (primary) setSelectedContactIds(new Set([primary.contactId]))
        }

        if (sizeRes.ok) {
          setPdfSize(await sizeRes.json())
        }
      } catch (err) {
        console.warn('Failed to load contacts/pdf-size', err)
      }
    },
    [quoteId]
  )

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

        throw new Error(body.error?.message || body.error || `HTTP ${res.status}`)
      }

      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos crear el link')
    } finally {
      setCreating(false)
    }
  }

  const revoke = async (shortCode: string) => {
    if (
      !window.confirm(
        '¿Seguro que quieres revocar este link? El cliente verá "Documento inválido" si lo abre.'
      )
    ) {
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
    if (selectedContactIds.size === 0 && !adHocEmail.trim()) {
      setError('Selecciona al menos un contacto o agrega un email externo')
      
return
    }

    if (selectedContactIds.size === 0 && adHocEmail.trim()) {
      setError(
        'Para enviar a un email externo, debes incluir también al menos un contacto de la organización.'
      )
      
return
    }

    setSendState(includePdf ? 'generating-pdf' : 'sending')
    setError(null)

    // After 250ms, transition the loading text from 'generating-pdf' to 'sending'
    // (PDF generation is server-side; we approximate the visual feedback)
    let transitionTimer: ReturnType<typeof setTimeout> | null = null

    if (includePdf) {
      transitionTimer = setTimeout(() => {
        setSendState(prev => (prev === 'generating-pdf' ? 'sending' : prev))
      }, 250)
    }

    try {
      const recipients = Array.from(selectedContactIds).map(contactId => ({ contactId }))

      const adHocRecipients =
        adHocEmail.trim() && adHocEmail.includes('@')
          ? [{ email: adHocEmail.trim() }]
          : []

      const res = await fetch(`/api/finance/quotes/${quoteId}/share/${shortCode}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify({
          recipients,
          adHocRecipients,
          customMessage: customMessage.trim() || undefined,
          includePdf
        })
      })

      if (transitionTimer) clearTimeout(transitionTimer)

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))

        throw new Error(body.error?.message || body.error || `HTTP ${res.status}`)
      }

      const result = (await res.json()) as {
        sent: number
        pdfStatus: string
      }

      setSendState('success')

      const pdfNote =
        result.pdfStatus === 'failed_graceful'
          ? ' (sin PDF — error al generar)'
          : result.pdfStatus.startsWith('attached')
            ? ' + PDF'
            : ''

      setEmailSentSummary(`Email enviado a ${result.sent} ${result.sent === 1 ? 'destinatario' : 'destinatarios'}${pdfNote}`)

      // Reset form after 4s and refresh links
      setTimeout(() => {
        setSendState('idle')
        setEmailSentSummary(null)
        setEmailModeFor(null)
        setSelectedContactIds(new Set())
        setAdHocEmail('')
        setCustomMessage('')
        void refresh()
      }, 4000)
    } catch (err) {
      if (transitionTimer) clearTimeout(transitionTimer)
      setSendState('error')
      setError(err instanceof Error ? err.message : 'No pudimos enviar el email')
    }
  }

  const copy = async (url: string, code: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      window.prompt('Copia el link:', url)
    }
  }

  const openEmailMode = (shortCode: string) => {
    setEmailModeFor(shortCode)
    setError(null)
    setEmailSentSummary(null)
    setSendState('idle')
    void loadContactsAndPdfSize(shortCode)
  }

  const closeEmailMode = () => {
    setEmailModeFor(null)
    setSelectedContactIds(new Set())
    setAdHocEmail('')
    setCustomMessage('')
    setError(null)
  }

  const buttonText = useMemo(() => {
    switch (sendState) {
      case 'generating-pdf':
        return 'Generando PDF...'
      case 'sending':
        return 'Enviando email...'
      case 'success':
        return '✓ Enviado'
      case 'error':
        return 'Reintentar'

      default: {
        const count = selectedContactIds.size + (adHocEmail.includes('@') ? 1 : 0)

        return count > 0
          ? `Enviar a ${count} ${count === 1 ? 'destinatario' : 'destinatarios'}`
          : 'Enviar email'
      }
    }
  }, [sendState, selectedContactIds.size, adHocEmail])

  const pdfSizeLabel = useMemo(() => {
    if (!pdfSize) return '~80–150 KB'
    if (pdfSize.sizeBytes !== null) return formatBytes(pdfSize.sizeBytes)

    const range = pdfSize.estimatedRangeBytes

    return range ? `~${formatBytes(range.min)}–${formatBytes(range.max)}` : '~80–150 KB'
  }, [pdfSize])

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
          <IconButton onClick={onClose} size='small' aria-label={GREENHOUSE_COPY.actions.close}>
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

        {emailSentSummary ? (
          <Alert severity='success' sx={{ mb: 2 }}>
            {emailSentSummary}
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
              startIcon={
                creating ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-link' />
              }
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
                    <IconButton
                      onClick={() => copy(link.shortUrl, link.shortCode)}
                      size='small'
                      color='primary'
                    >
                      <i className={copiedCode === link.shortCode ? 'tabler-check' : 'tabler-copy'} />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Stack direction='row' spacing={2} sx={{ mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}
                    >
                      Aperturas
                    </Typography>
                    <Typography variant='h6' sx={{ fontWeight: 600 }}>
                      {link.accessCount}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}
                    >
                      Última apertura
                    </Typography>
                    <Typography variant='body2' sx={{ fontWeight: 500 }}>
                      {formatRelative(link.lastAccessedAt)}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}
                    >
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
                    onClick={() =>
                      emailModeFor === link.shortCode ? closeEmailMode() : openEmailMode(link.shortCode)
                    }
                  >
                    {emailModeFor === link.shortCode ? 'Cancelar' : 'Enviar por email'}
                  </Button>
                  <Button
                    variant='outlined'
                    color='error'
                    size='small'
                    onClick={() => revoke(link.shortCode)}
                    disabled={revokingCode === link.shortCode}
                    startIcon={
                      revokingCode === link.shortCode ? (
                        <CircularProgress size={14} color='inherit' />
                      ) : (
                        <i className='tabler-ban' />
                      )
                    }
                  >
                    {revokingCode === link.shortCode ? 'Revocando...' : 'Revocar'}
                  </Button>
                </Stack>

                {emailModeFor === link.shortCode ? (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}
                        >
                          Para
                          {contactsState?.organizationName ? ` (contactos de ${contactsState.organizationName})` : null}
                        </Typography>

                        {!contactsState ? (
                          <CircularProgress size={16} sx={{ mt: 1 }} />
                        ) : contactsState.contacts.length === 0 ? (
                          <Alert severity='info' sx={{ mt: 1 }}>
                            No hay contactos registrados para esta organización. Agrega un email externo
                            abajo.
                          </Alert>
                        ) : (
                          <Stack sx={{ mt: 1, maxHeight: 200, overflowY: 'auto' }}>
                            {contactsState.contacts.map(contact => (
                              <FormControlLabel
                                key={contact.contactId}
                                control={
                                  <Checkbox
                                    size='small'
                                    checked={selectedContactIds.has(contact.contactId)}
                                    onChange={e => {
                                      const next = new Set(selectedContactIds)

                                      if (e.target.checked) next.add(contact.contactId)
                                      else next.delete(contact.contactId)
                                      setSelectedContactIds(next)
                                    }}
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography variant='body2' sx={{ fontWeight: 500 }}>
                                      {contact.name || contact.email}
                                      {contact.isPrimary ? (
                                        <Chip
                                          label='primary'
                                          size='small'
                                          sx={{ ml: 1, height: 18, fontSize: 10 }}
                                          color='primary'
                                        />
                                      ) : null}
                                    </Typography>
                                    <Typography variant='caption' color='text.secondary'>
                                      {contact.email}
                                      {contact.role ? ` · ${contact.role}` : ''}
                                    </Typography>
                                  </Box>
                                }
                              />
                            ))}
                          </Stack>
                        )}
                      </Box>

                      <TextField
                        label='+ Agregar email externo (no en CRM)'
                        type='email'
                        size='small'
                        fullWidth
                        value={adHocEmail}
                        onChange={e => setAdHocEmail(e.target.value)}
                        placeholder='consultor@externo.com'
                        disabled={sendState === 'generating-pdf' || sendState === 'sending'}
                        helperText='Requiere al menos 1 contacto de la organización seleccionado arriba'
                      />

                      <TextField
                        label='Mensaje adicional (opcional)'
                        size='small'
                        fullWidth
                        multiline
                        rows={3}
                        value={customMessage}
                        onChange={e => setCustomMessage(e.target.value)}
                        placeholder='Hola María, te dejo la propuesta para que la revisemos...'
                        disabled={sendState === 'generating-pdf' || sendState === 'sending'}
                      />

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={includePdf}
                              onChange={e => setIncludePdf(e.target.checked)}
                              disabled={sendState === 'generating-pdf' || sendState === 'sending'}
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant='body2'>
                                Incluir PDF como adjunto
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {pdfSizeLabel}
                              </Typography>
                            </Box>
                          }
                        />
                        <Tooltip title='El PDF se genera en nuestros servidores (~200ms primera vez, luego cached) y se adjunta al email. Sin él, solo se envía el link.'>
                          <IconButton size='small' disableFocusRipple>
                            <i className='tabler-info-circle' style={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      <Button
                        variant='contained'
                        size='medium'
                        onClick={() => sendEmail(link.shortCode)}
                        disabled={sendState === 'generating-pdf' || sendState === 'sending'}
                        startIcon={
                          sendState === 'generating-pdf' || sendState === 'sending' ? (
                            <CircularProgress size={14} color='inherit' />
                          ) : (
                            <i className='tabler-send' />
                          )
                        }
                        aria-live='polite'
                      >
                        {buttonText}
                      </Button>
                    </Stack>
                  </Box>
                ) : null}

                <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                  <CustomChip
                    round='true'
                    size='small'
                    variant='tonal'
                    color='info'
                    label={`Creado ${formatRelative(link.createdAt)}`}
                  />
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
