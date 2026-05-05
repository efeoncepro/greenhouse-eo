'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

interface DocumentDto {
  documentId: string
  documentType: string
  countryCode: string
  displayMask: string
  verificationStatus: 'pending_review' | 'verified' | 'rejected' | 'archived' | 'expired'
  source: string
  declaredAt: string
  rejectedReason: string | null
}

interface AddressDto {
  addressId: string
  addressType: 'legal' | 'residence' | 'mailing' | 'emergency'
  countryCode: string
  presentationMask: string
  city: string
  region: string | null
  verificationStatus: DocumentDto['verificationStatus']
  source: string
  declaredAt: string
  rejectedReason: string | null
}

interface ResponseDto {
  memberId: string
  profileId: string
  documents: DocumentDto[]
  addresses: AddressDto[]
  readiness: {
    finalSettlementChile: { ready: boolean; blockers: string[]; warnings: string[] }
    payrollChileDependent: { ready: boolean; blockers: string[]; warnings: string[] }
  }
  capabilities: {
    canVerify: boolean
    canHrUpdate: boolean
    canRevealSensitive: boolean
  }
}

interface PersonLegalProfileSectionProps {
  memberId: string
}

const STATUS_LABELS: Record<DocumentDto['verificationStatus'], string> = {
  pending_review: 'Pendiente',
  verified: 'Verificado',
  rejected: 'Rechazado',
  archived: 'Archivado',
  expired: 'Vencido'
}

const STATUS_COLORS: Record<DocumentDto['verificationStatus'], 'default' | 'success' | 'warning' | 'error'> = {
  pending_review: 'warning',
  verified: 'success',
  rejected: 'error',
  archived: 'default',
  expired: 'default'
}

const ADDRESS_LABELS: Record<AddressDto['addressType'], string> = {
  legal: 'Direccion legal',
  residence: 'Residencia',
  mailing: 'Correspondencia',
  emergency: 'Contacto de emergencia'
}

const formatDeclared = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

const cardBorderSx = {
  border: '1px solid',
  borderColor: 'divider'
}

const PersonLegalProfileSection = ({ memberId }: PersonLegalProfileSectionProps) => {
  const [data, setData] = useState<ResponseDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [rejectDialog, setRejectDialog] = useState<{
    kind: 'document' | 'address'
    targetId: string
  } | null>(null)

  const [rejectReason, setRejectReason] = useState('')

  const [revealDialog, setRevealDialog] = useState<{
    kind: 'document' | 'address'
    targetId: string
  } | null>(null)

  const [revealReason, setRevealReason] = useState('')
  const [revealValue, setRevealValue] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const r = await fetch(`/api/hr/people/${encodeURIComponent(memberId)}/legal-profile`, { cache: 'no-store' })

      if (!r.ok) {
        const body = await r.json().catch(() => ({}))

        throw new Error(body?.error ?? 'Error al cargar datos legales')
      }

      const json = (await r.json()) as ResponseDto

      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    load()
  }, [load])

  const handleVerifyDocument = async (documentId: string) => {
    setSubmitting(true)
    setError(null)

    try {
      const r = await fetch(
        `/api/hr/people/${encodeURIComponent(memberId)}/legal-profile/document/${encodeURIComponent(documentId)}/verify`,
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) }
      )

      if (!r.ok) {
        const body = await r.json().catch(() => ({}))

        throw new Error(body?.error ?? 'Error al verificar documento')
      }

      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerifyAddress = async (addressId: string) => {
    setSubmitting(true)
    setError(null)

    try {
      const r = await fetch(
        `/api/hr/people/${encodeURIComponent(memberId)}/legal-profile/address/${encodeURIComponent(addressId)}/verify`,
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) }
      )

      if (!r.ok) {
        const body = await r.json().catch(() => ({}))

        throw new Error(body?.error ?? 'Error al verificar direccion')
      }

      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRejectSubmit = async () => {
    if (!rejectDialog) return

    if (rejectReason.trim().length < 10) {
      setError('El motivo debe tener al menos 10 caracteres')

      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const path =
        rejectDialog.kind === 'document'
          ? `/api/hr/people/${encodeURIComponent(memberId)}/legal-profile/document/${encodeURIComponent(rejectDialog.targetId)}/reject`
          : `/api/hr/people/${encodeURIComponent(memberId)}/legal-profile/address/${encodeURIComponent(rejectDialog.targetId)}/reject`

      const r = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rejectedReason: rejectReason.trim() })
      })

      if (!r.ok) {
        const body = await r.json().catch(() => ({}))

        throw new Error(body?.error ?? 'Error al rechazar')
      }

      setRejectDialog(null)
      setRejectReason('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevealSubmit = async () => {
    if (!revealDialog) return

    if (revealReason.trim().length < 5) {
      setError('El motivo debe tener al menos 5 caracteres (auditado)')

      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const path =
        revealDialog.kind === 'document'
          ? `/api/hr/people/${encodeURIComponent(memberId)}/legal-profile/document/${encodeURIComponent(revealDialog.targetId)}/reveal`
          : `/api/hr/people/${encodeURIComponent(memberId)}/legal-profile/address/${encodeURIComponent(revealDialog.targetId)}/reveal`

      const r = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: revealReason.trim() })
      })

      if (!r.ok) {
        const body = await r.json().catch(() => ({}))

        throw new Error(body?.error ?? 'Error al revelar valor')
      }

      const result = await r.json()

      setRevealValue(
        revealDialog.kind === 'document'
          ? result?.document?.valueFull ?? null
          : result?.address?.presentationText ?? null
      )
      setRevealReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  const closeRevealDialog = () => {
    setRevealDialog(null)
    setRevealValue(null)
    setRevealReason('')
  }

  const blockerLabels = useMemo<Record<string, string>>(
    () => ({
      cl_rut_missing: 'Falta declarar RUT',
      cl_rut_pending_review: 'RUT pendiente de revision',
      cl_rut_rejected: 'RUT rechazado',
      cl_rut_archived_or_expired: 'RUT archivado o vencido',
      address_missing_legal: 'Falta direccion legal',
      address_missing_residence: 'Falta direccion de residencia',
      profile_missing: 'Profile no vinculado'
    }),
    []
  )

  if (loading) {
    return (
      <Card elevation={0} sx={cardBorderSx}>
        <CardHeader title='Identidad legal' subheader='Cargando…' />
        <CardContent>
          <Stack spacing={1.5}>
            <Skeleton variant='text' width='75%' />
            <Skeleton variant='text' width='60%' />
            <Skeleton variant='text' width='70%' />
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card elevation={0} sx={cardBorderSx}>
      <CardHeader
        title='Identidad legal'
        subheader='Documentos y direcciones (TASK-784) — masking por default; reveal con motivo + audit'
      />
      <Divider />
      <CardContent>
        {submitting ? <LinearProgress sx={{ mb: 3 }} /> : null}

        {error ? (
          <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        {data?.readiness?.finalSettlementChile?.blockers?.length ? (
          <Alert severity='warning' sx={{ mb: 3 }}>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              Bloqueadores para emitir finiquito Chile
            </Typography>
            <Box component='ul' sx={{ m: 0, pl: 3 }}>
              {data.readiness.finalSettlementChile.blockers.map(b => (
                <li key={b}>
                  <Typography variant='body2'>{blockerLabels[b] ?? b}</Typography>
                </li>
              ))}
            </Box>
          </Alert>
        ) : null}

        <Stack spacing={5}>
          <Box>
            <Typography variant='subtitle2' sx={{ mb: 2 }}>
              Documentos
            </Typography>
            {data?.documents?.length ? (
              <Stack spacing={2}>
                {data.documents.map(doc => (
                  <Box
                    key={doc.documentId}
                    sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                  >
                    <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={2}>
                      <Stack spacing={0.5}>
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                          {doc.documentType.replace(/_/g, ' ')} ({doc.countryCode})
                        </Typography>
                        <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {doc.displayMask}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {doc.source} · declarado {formatDeclared(doc.declaredAt)}
                        </Typography>
                        {doc.rejectedReason ? (
                          <Typography variant='caption' color='error'>
                            Motivo de rechazo: {doc.rejectedReason}
                          </Typography>
                        ) : null}
                      </Stack>
                      <Chip
                        size='small'
                        label={STATUS_LABELS[doc.verificationStatus]}
                        color={STATUS_COLORS[doc.verificationStatus]}
                        variant={doc.verificationStatus === 'verified' ? 'filled' : 'tonal'}
                      />
                    </Stack>

                    <Stack direction='row' spacing={1} sx={{ mt: 2 }}>
                      {doc.verificationStatus === 'pending_review' && data.capabilities.canVerify ? (
                        <Button
                          size='small'
                          variant='contained'
                          color='success'
                          disabled={submitting}
                          onClick={() => handleVerifyDocument(doc.documentId)}
                        >
                          Verificar
                        </Button>
                      ) : null}
                      {(doc.verificationStatus === 'pending_review' || doc.verificationStatus === 'verified') &&
                      data.capabilities.canVerify ? (
                        <Button
                          size='small'
                          variant='outlined'
                          color='error'
                          disabled={submitting}
                          onClick={() => setRejectDialog({ kind: 'document', targetId: doc.documentId })}
                        >
                          Rechazar
                        </Button>
                      ) : null}
                      {data.capabilities.canRevealSensitive && doc.verificationStatus !== 'archived' &&
                      doc.verificationStatus !== 'expired' ? (
                        <Button
                          size='small'
                          variant='outlined'
                          color='warning'
                          disabled={submitting}
                          onClick={() => setRevealDialog({ kind: 'document', targetId: doc.documentId })}
                        >
                          Ver completo
                        </Button>
                      ) : null}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant='body2' color='text.secondary'>
                Sin documentos registrados.
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography variant='subtitle2' sx={{ mb: 2 }}>
              Direcciones
            </Typography>
            {data?.addresses?.length ? (
              <Stack spacing={2}>
                {data.addresses.map(addr => (
                  <Box
                    key={addr.addressId}
                    sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                  >
                    <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={2}>
                      <Stack spacing={0.5}>
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                          {ADDRESS_LABELS[addr.addressType]}
                        </Typography>
                        <Typography variant='body2'>{addr.presentationMask}</Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {addr.source} · declarada {formatDeclared(addr.declaredAt)}
                        </Typography>
                        {addr.rejectedReason ? (
                          <Typography variant='caption' color='error'>
                            Motivo de rechazo: {addr.rejectedReason}
                          </Typography>
                        ) : null}
                      </Stack>
                      <Chip
                        size='small'
                        label={STATUS_LABELS[addr.verificationStatus]}
                        color={STATUS_COLORS[addr.verificationStatus]}
                        variant={addr.verificationStatus === 'verified' ? 'filled' : 'tonal'}
                      />
                    </Stack>

                    <Stack direction='row' spacing={1} sx={{ mt: 2 }}>
                      {addr.verificationStatus === 'pending_review' && data.capabilities.canVerify ? (
                        <Button
                          size='small'
                          variant='contained'
                          color='success'
                          disabled={submitting}
                          onClick={() => handleVerifyAddress(addr.addressId)}
                        >
                          Verificar
                        </Button>
                      ) : null}
                      {(addr.verificationStatus === 'pending_review' || addr.verificationStatus === 'verified') &&
                      data.capabilities.canVerify ? (
                        <Button
                          size='small'
                          variant='outlined'
                          color='error'
                          disabled={submitting}
                          onClick={() => setRejectDialog({ kind: 'address', targetId: addr.addressId })}
                        >
                          Rechazar
                        </Button>
                      ) : null}
                      {data.capabilities.canRevealSensitive ? (
                        <Button
                          size='small'
                          variant='outlined'
                          color='warning'
                          disabled={submitting}
                          onClick={() => setRevealDialog({ kind: 'address', targetId: addr.addressId })}
                        >
                          Ver completa
                        </Button>
                      ) : null}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant='body2' color='text.secondary'>
                Sin direcciones registradas.
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>

      <Dialog open={Boolean(rejectDialog)} onClose={() => setRejectDialog(null)} fullWidth maxWidth='sm'>
        <DialogTitle>Rechazar {rejectDialog?.kind === 'document' ? 'documento' : 'direccion'}</DialogTitle>
        <DialogContent>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
            El motivo se persiste en audit log y se notifica al colaborador. Minimo 10 caracteres.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label='Motivo del rechazo'
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(null)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            color='error'
            onClick={handleRejectSubmit}
            disabled={submitting || rejectReason.trim().length < 10}
          >
            Rechazar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(revealDialog)} onClose={closeRevealDialog} fullWidth maxWidth='sm'>
        <DialogTitle>Ver valor completo</DialogTitle>
        <DialogContent>
          {revealValue ? (
            <Stack spacing={2}>
              <Typography variant='body2' color='text.secondary'>
                Valor revelado. Esta accion quedo registrada en audit log con tu usuario, motivo y timestamp.
              </Typography>
              <Box
                sx={{
                  p: 3,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.04em'
                }}
              >
                <Typography variant='body1'>{revealValue}</Typography>
              </Box>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Typography variant='body2' color='text.secondary'>
                Solo se permite ver el valor completo con motivo registrado en audit log. Minimo 5
                caracteres.
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label='Motivo'
                value={revealReason}
                onChange={e => setRevealReason(e.target.value)}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRevealDialog}>Cerrar</Button>
          {!revealValue ? (
            <Button
              variant='contained'
              color='warning'
              onClick={handleRevealSubmit}
              disabled={submitting || revealReason.trim().length < 5}
            >
              Revelar
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </Card>
  )
}

export default PersonLegalProfileSection
