'use client'

// TASK-749 — Card expandido individual para Person 360 / Shareholder 360.
// Renderiza un perfil con TODO el detalle visible (sin necesidad de drawer):
// header con chips de estado, body grid 2-col, sensitive box con reveal inline,
// audit timeline embebido y acciones contextuales por status.
//
// Spec: docs/mockups/payment-profiles-dual-mockup.html (Surface 1 / Surface 2).

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { toast } from 'sonner'

import type {
  BeneficiaryPaymentProfileAuditAction,
  BeneficiaryPaymentProfileAuditEntry,
  BeneficiaryPaymentProfileSafe,
  BeneficiaryPaymentProfileStatus
} from '@/types/payment-profiles'

const STATUS_LABEL: Record<BeneficiaryPaymentProfileStatus, string> = {
  draft: 'Borrador',
  pending_approval: 'Pendiente aprobacion',
  active: 'Activo',
  superseded: 'Reemplazado',
  cancelled: 'Cancelado'
}

const STATUS_COLOR: Record<
  BeneficiaryPaymentProfileStatus,
  'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
> = {
  draft: 'default',
  pending_approval: 'warning',
  active: 'success',
  superseded: 'secondary',
  cancelled: 'error'
}

const AUDIT_ACTION_META: Record<
  BeneficiaryPaymentProfileAuditAction,
  { icon: string; label: string; color: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' }
> = {
  created: { icon: 'tabler-plus', label: 'Perfil creado', color: 'primary' },
  updated: { icon: 'tabler-edit', label: 'Actualizado', color: 'info' },
  approved: { icon: 'tabler-check', label: 'Perfil aprobado', color: 'success' },
  superseded: { icon: 'tabler-replace', label: 'Reemplazado por nueva version', color: 'default' },
  cancelled: { icon: 'tabler-circle-x', label: 'Cancelado', color: 'error' },
  revealed_sensitive: {
    icon: 'tabler-eye',
    label: 'Datos sensibles revelados',
    color: 'warning'
  }
}

const formatTimestamp = (iso: string) => new Date(iso).toLocaleString('es-CL')

interface PaymentProfileCardProps {
  profile: BeneficiaryPaymentProfileSafe
  onActionComplete: () => void | Promise<void>
}

const PaymentProfileCard = ({ profile, onActionComplete }: PaymentProfileCardProps) => {
  const [audit, setAudit] = useState<BeneficiaryPaymentProfileAuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [actionInFlight, setActionInFlight] = useState(false)
  const [revealedAccountNumber, setRevealedAccountNumber] = useState<string | null>(null)

  const loadAudit = useCallback(async () => {
    setAuditLoading(true)

    try {
      const r = await fetch(`/api/admin/finance/payment-profiles/${profile.profileId}/audit?limit=20`)

      if (r.ok) {
        const json = await r.json()

        setAudit(json.entries ?? [])
      } else {
        setAudit([])
      }
    } catch (e) {
      console.error(e)
      setAudit([])
    } finally {
      setAuditLoading(false)
    }
  }, [profile.profileId])

  useEffect(() => {
    void loadAudit()
  }, [loadAudit])

  // Auto-hide del numero revelado a los 60s.
  useEffect(() => {
    if (!revealedAccountNumber) return

    const timer = window.setTimeout(() => setRevealedAccountNumber(null), 60_000)

    return () => window.clearTimeout(timer)
  }, [revealedAccountNumber])

  const handleApprove = async () => {
    setActionInFlight(true)

    try {
      const r = await fetch(`/api/admin/finance/payment-profiles/${profile.profileId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const json = await r.json().catch(() => ({}))

      if (!r.ok) {
        toast.error(json.error ?? 'No fue posible aprobar el perfil')

        return
      }

      toast.success('Perfil aprobado')
      await onActionComplete()
    } catch (e) {
      console.error(e)
      toast.error('Error de red al aprobar')
    } finally {
      setActionInFlight(false)
    }
  }

  const handleCancel = async () => {
    const reason = window.prompt('Motivo de cancelacion (queda en audit log, 3+ caracteres)')

    if (!reason || reason.trim().length < 3) {
      toast.error('Cancelacion abortada: motivo requerido')

      return
    }

    setActionInFlight(true)

    try {
      const r = await fetch(`/api/admin/finance/payment-profiles/${profile.profileId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() })
      })

      const json = await r.json().catch(() => ({}))

      if (!r.ok) {
        toast.error(json.error ?? 'No fue posible cancelar el perfil')

        return
      }

      toast.success('Perfil cancelado')
      await onActionComplete()
    } catch (e) {
      console.error(e)
      toast.error('Error de red al cancelar')
    } finally {
      setActionInFlight(false)
    }
  }

  const handleReveal = async () => {
    const reason = window.prompt('Motivo (5+ caracteres, queda en audit log)')

    if (!reason || reason.trim().length < 5) {
      toast.error('Revelacion abortada: el motivo debe tener al menos 5 caracteres')

      return
    }

    setActionInFlight(true)

    try {
      const r = await fetch(
        `/api/admin/finance/payment-profiles/${profile.profileId}/reveal-sensitive`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim() })
        }
      )

      const json = await r.json().catch(() => ({}))

      if (!r.ok) {
        toast.error(json.error ?? 'No fue posible revelar los datos sensibles')

        return
      }

      const fullNumber = json.profile?.accountNumberFull ?? null

      if (!fullNumber) {
        toast.info('Este perfil no tiene un numero de cuenta almacenado')
      } else {
        setRevealedAccountNumber(fullNumber)
        toast.success('Datos sensibles revelados — quedan en audit log')
      }

      await loadAudit()
    } catch (e) {
      console.error(e)
      toast.error('Error de red al revelar datos sensibles')
    } finally {
      setActionInFlight(false)
    }
  }

  const showApprove = profile.status === 'pending_approval'

  const showCancel =
    profile.status === 'draft' ||
    profile.status === 'pending_approval' ||
    profile.status === 'active'

  const formatActiveFrom = (date: string | null) => {
    if (!date) return '—'

    return new Date(date + 'T00:00:00').toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <Card elevation={0} sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}>
      <CardContent sx={{ p: 0 }}>
        {/* Header */}
        <Box
          sx={theme => ({
            px: 4,
            py: 3,
            backgroundColor: theme.palette.action.hover,
            borderBottom: `1px solid ${theme.palette.divider}`
          })}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            justifyContent='space-between'
            alignItems={{ md: 'center' }}
          >
            <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
              <Typography variant='subtitle2'>Perfil {profile.currency}</Typography>
              <Chip
                size='small'
                variant='tonal'
                color={STATUS_COLOR[profile.status]}
                label={STATUS_LABEL[profile.status]}
              />
              {profile.activeFrom ? (
                <Chip
                  size='small'
                  variant='outlined'
                  label={`Vigente desde ${formatActiveFrom(profile.activeFrom)}`}
                />
              ) : null}
            </Stack>
            <Typography
              variant='caption'
              sx={{
                fontFamily: 'ui-monospace, SF Mono, monospace',
                fontSize: '0.7rem',
                color: 'text.secondary'
              }}
            >
              {profile.profileId}
            </Typography>
          </Stack>
        </Box>

        {/* Body */}
        <Box sx={{ p: 4 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 3
            }}
          >
            <Stack spacing={0.25}>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.7rem' }}
              >
                Provider
              </Typography>
              {profile.providerSlug ? (
                <Box>
                  <Chip size='small' variant='tonal' color='info' label={profile.providerSlug} />
                </Box>
              ) : (
                <Typography variant='body2' color='text.secondary'>
                  —
                </Typography>
              )}
            </Stack>

            <Stack spacing={0.25}>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.7rem' }}
              >
                Metodo
              </Typography>
              <Typography variant='body2'>{profile.paymentMethod ?? '—'}</Typography>
            </Stack>

            <Stack spacing={0.25}>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.7rem' }}
              >
                Titular
              </Typography>
              <Typography variant='body2'>{profile.accountHolderName ?? '—'}</Typography>
            </Stack>

            <Stack spacing={0.25}>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.7rem' }}
              >
                Pais
              </Typography>
              <Typography variant='body2'>{profile.countryCode ?? '—'}</Typography>
            </Stack>

            <Stack spacing={0.25}>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.7rem' }}
              >
                Banco / plataforma
              </Typography>
              <Typography variant='body2'>{profile.bankName ?? '—'}</Typography>
            </Stack>

            <Stack spacing={0.25}>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.7rem' }}
              >
                Maker → Checker
              </Typography>
              <Typography variant='body2'>
                {profile.createdBy.slice(0, 16)}… → {profile.approvedBy ? `${profile.approvedBy.slice(0, 16)}…` : '—'}
              </Typography>
            </Stack>
          </Box>

          {/* Sensitive box */}
          <Box
            sx={theme => ({
              mt: 4,
              p: 3,
              borderRadius: 1,
              border: `1px solid ${theme.palette.warning.main}`,
              backgroundColor: `${theme.palette.warning.main}11`,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              alignItems: { sm: 'center' },
              justifyContent: 'space-between'
            })}
          >
            <Stack spacing={0.5}>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.7rem' }}
              >
                Cuenta destino
              </Typography>
              <Typography
                variant='subtitle2'
                sx={{
                  fontFamily: 'ui-monospace, SF Mono, monospace',
                  letterSpacing: '0.08em'
                }}
              >
                {revealedAccountNumber ?? profile.accountNumberMasked ?? '—'}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Reveal queda en audit log con motivo. Se oculta automaticamente en 60s.
              </Typography>
            </Stack>
            {profile.hasFullAccountNumber ? (
              <Button
                size='small'
                variant='outlined'
                color='warning'
                startIcon={<i className='tabler-eye' aria-hidden='true' />}
                onClick={handleReveal}
                disabled={actionInFlight}
              >
                {revealedAccountNumber ? 'Visible · ocultar pronto' : 'Revelar numero completo'}
              </Button>
            ) : null}
          </Box>

          {revealedAccountNumber ? (
            <Alert
              severity='warning'
              icon={<i className='tabler-alert-triangle' aria-hidden='true' />}
              sx={{ mt: 2 }}
              role='status'
              aria-live='polite'
            >
              Datos sensibles revelados. La accion quedo registrada en el audit log con tu user, IP y motivo. El numero completo se ocultara automaticamente en 60 segundos.
            </Alert>
          ) : null}

          {profile.cancelledReason ? (
            <Alert severity='error' icon={<i className='tabler-circle-x' aria-hidden='true' />} sx={{ mt: 2 }}>
              <Typography variant='subtitle2' gutterBottom>
                Cancelado por {profile.cancelledBy ?? '—'}
              </Typography>
              <Typography variant='body2'>{profile.cancelledReason}</Typography>
            </Alert>
          ) : null}
        </Box>

        {/* Actions */}
        {(showApprove || showCancel) && (
          <>
            <Divider />
            <Box
              sx={theme => ({
                px: 4,
                py: 2,
                backgroundColor: theme.palette.action.hover,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                alignItems: 'center',
                justifyContent: 'space-between'
              })}
            >
              <Typography variant='caption' color='text.secondary' sx={{ maxWidth: 480 }}>
                Cualquier cambio crea una nueva version y reemplaza esta automaticamente al aprobarse.
              </Typography>
              <Stack direction='row' spacing={1} flexWrap='wrap'>
                {showApprove ? (
                  <Button variant='contained' size='small' onClick={handleApprove} disabled={actionInFlight}>
                    Aprobar
                  </Button>
                ) : null}
                {showCancel ? (
                  <Button
                    variant='outlined'
                    size='small'
                    color='error'
                    onClick={handleCancel}
                    disabled={actionInFlight}
                  >
                    Cancelar perfil
                  </Button>
                ) : null}
              </Stack>
            </Box>
          </>
        )}

        {/* Audit timeline */}
        <Divider />
        <Box sx={{ p: 4 }}>
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontSize: '0.7rem',
              fontWeight: 600
            }}
          >
            Historial de auditoria · {profile.currency}
          </Typography>

          {auditLoading ? (
            <Box sx={{ pt: 2 }}>
              <LinearProgress aria-label='Cargando audit log' />
            </Box>
          ) : audit.length === 0 ? (
            <Typography variant='body2' color='text.secondary' sx={{ pt: 2 }}>
              Sin movimientos registrados todavia.
            </Typography>
          ) : (
            <Stack spacing={2} sx={{ pt: 2 }}>
              {audit.map(entry => {
                const meta = AUDIT_ACTION_META[entry.action]

                return (
                  <Stack key={entry.auditId} direction='row' spacing={2} alignItems='flex-start'>
                    <Box
                      sx={theme => {
                        const palette = theme.palette[meta.color === 'default' ? 'secondary' : meta.color]
                        const main = typeof palette === 'object' && 'main' in palette ? palette.main : theme.palette.secondary.main

                        return {
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: main,
                          backgroundColor: `${main}1F`
                        }
                      }}
                    >
                      <i className={meta.icon} aria-hidden='true' />
                    </Box>
                    <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant='body2' fontWeight={500}>
                        {meta.label}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {entry.actorEmail ?? entry.actorUserId} · {formatTimestamp(entry.createdAt)}
                        {entry.reason ? ` · "${entry.reason}"` : ''}
                      </Typography>
                    </Stack>
                  </Stack>
                )
              })}
            </Stack>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

export default PaymentProfileCard
