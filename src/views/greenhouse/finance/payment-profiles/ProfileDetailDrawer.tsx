'use client'

// TASK-749 — Drawer de detalle de un perfil de pago.
// Acciones contextuales por status: aprobar, cancelar, revelar datos sensibles.
// El reveal queda en audit log y solo se muestra el numero completo durante 60s.

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { toast } from 'sonner'

import { getMicrocopy } from '@/lib/copy'

import type {
  BeneficiaryPaymentProfileAuditAction,
  BeneficiaryPaymentProfileAuditEntry,
  BeneficiaryPaymentProfileSafe,
  BeneficiaryPaymentProfileStatus
} from '@/types/payment-profiles'
import { formatDateTime as formatGreenhouseDateTime } from '@/lib/format'

const TASK407_ARIA_CERRAR_DRAWER = "Cerrar drawer"
const TASK407_ARIA_CARGANDO_PERFIL_DE_PAGO = "Cargando perfil de pago"


const GREENHOUSE_COPY = getMicrocopy()

interface ProfileDetailDrawerProps {
  profileId: string | null
  onClose: () => void
  onActionComplete: () => void | Promise<void>
}

const STATUS_LABEL: Record<BeneficiaryPaymentProfileStatus, string> = {
  draft: 'Borrador',
  pending_approval: 'Pendiente aprobacion',
  active: 'Activo',
  superseded: 'Superado',
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
  created: { icon: 'tabler-plus', label: 'Creado', color: 'primary' },
  updated: { icon: 'tabler-edit', label: 'Actualizado', color: 'info' },
  approved: { icon: 'tabler-check', label: GREENHOUSE_COPY.states.approved, color: 'success' },
  superseded: { icon: 'tabler-replace', label: 'Superado', color: 'default' },
  cancelled: { icon: 'tabler-circle-x', label: GREENHOUSE_COPY.states.cancelled, color: 'error' },
  revealed_sensitive: {
    icon: 'tabler-eye',
    label: 'Datos sensibles revelados',
    color: 'warning'
  }
}

const formatTimestamp = (iso: string) => formatGreenhouseDateTime(iso, 'es-CL')

const ProfileDetailDrawer = ({ profileId, onClose, onActionComplete }: ProfileDetailDrawerProps) => {
  const [profile, setProfile] = useState<BeneficiaryPaymentProfileSafe | null>(null)
  const [audit, setAudit] = useState<BeneficiaryPaymentProfileAuditEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [actionInFlight, setActionInFlight] = useState(false)

  // Datos sensibles revelados — visibles temporalmente con auto-hide a los 60s.
  const [revealedAccountNumber, setRevealedAccountNumber] = useState<string | null>(null)

  const isOpen = profileId !== null

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true)
    setRevealedAccountNumber(null)

    try {
      const [profileRes, auditRes] = await Promise.all([
        fetch(`/api/admin/finance/payment-profiles/${id}`),
        fetch(`/api/admin/finance/payment-profiles/${id}/audit?limit=20`)
      ])

      if (!profileRes.ok) {
        const json = await profileRes.json().catch(() => ({}))

        toast.error(json.error ?? 'No fue posible cargar el perfil')

        return
      }

      const profileJson = await profileRes.json()

      setProfile(profileJson.profile)

      if (auditRes.ok) {
        const auditJson = await auditRes.json()

        setAudit(auditJson.entries ?? [])
      } else {
        setAudit([])
      }
    } catch (e) {
      console.error(e)
      toast.error('Error de red al cargar el perfil')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (profileId) {
      void loadDetail(profileId)
    } else {
      setProfile(null)
      setAudit([])
      setRevealedAccountNumber(null)
    }
  }, [profileId, loadDetail])

  // Auto-hide del numero revelado a los 60s.
  useEffect(() => {
    if (!revealedAccountNumber) return

    const timer = window.setTimeout(() => {
      setRevealedAccountNumber(null)
    }, 60_000)

    return () => window.clearTimeout(timer)
  }, [revealedAccountNumber])

  const handleApprove = async () => {
    if (!profile) return
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
      await loadDetail(profile.profileId)
      await onActionComplete()
    } catch (e) {
      console.error(e)
      toast.error('Error de red al aprobar')
    } finally {
      setActionInFlight(false)
    }
  }

  const handleCancel = async () => {
    if (!profile) return

    const reason = window.prompt('Motivo de cancelacion (queda en audit log)')

    if (!reason || !reason.trim()) {
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
      await loadDetail(profile.profileId)
      await onActionComplete()
    } catch (e) {
      console.error(e)
      toast.error('Error de red al cancelar')
    } finally {
      setActionInFlight(false)
    }
  }

  const handleReveal = async () => {
    if (!profile) return

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

      // refresca audit timeline para reflejar la nueva entry
      const auditRes = await fetch(
        `/api/admin/finance/payment-profiles/${profile.profileId}/audit?limit=20`
      )

      if (auditRes.ok) {
        const auditJson = await auditRes.json()

        setAudit(auditJson.entries ?? [])
      }
    } catch (e) {
      console.error(e)
      toast.error('Error de red al revelar datos sensibles')
    } finally {
      setActionInFlight(false)
    }
  }

  const showApprove = Boolean(
    profile && (profile.status === 'pending_approval' || profile.status === 'draft')
  )

  const approvalActionLabel =
    profile?.status === 'draft' && !profile.requireApproval ? 'Activar perfil' : 'Aprobar perfil'

  const approvalHelp = !profile
    ? null
    : profile.status === 'draft'
      ? profile.requireApproval
        ? 'Este perfil esta en borrador y requiere maker-checker: debe aprobarlo un checker distinto al creador para quedar activo.'
        : 'Este perfil esta en borrador. Activalo para que pueda resolver pagos internos.'
      : profile.status === 'pending_approval'
        ? 'Este perfil espera aprobacion maker-checker. El creador no puede aprobar su propio perfil.'
        : null

  const showCancel =
    profile?.status === 'draft' ||
    profile?.status === 'pending_approval' ||
    profile?.status === 'active'

  return (
    <Drawer
      anchor='right'
      open={isOpen}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 560 } } }}
    >
      <Box
        sx={{
          p: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Stack spacing={0.25}>
          <Typography variant='h6'>Detalle de perfil</Typography>
          {profile ? (
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ fontSize: '0.7rem' }}
            >
              {profile.profileId}
            </Typography>
          ) : null}
        </Stack>
        <IconButton onClick={onClose} aria-label={TASK407_ARIA_CERRAR_DRAWER}>
          <i className='tabler-x' />
        </IconButton>
      </Box>
      <Divider />

      {loading || !profile ? (
        <Box sx={{ p: 4 }}>
          <LinearProgress aria-label={TASK407_ARIA_CARGANDO_PERFIL_DE_PAGO} />
        </Box>
      ) : (
        <Stack spacing={4} sx={{ p: 4 }}>
          {/* Identity */}
          <Stack spacing={1.5}>
            <Typography variant='subtitle2' color='text.secondary'>
              Beneficiario
            </Typography>
            <Typography variant='h6'>
              {profile.beneficiaryName ?? profile.beneficiaryId}
            </Typography>
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              <Chip
                size='small'
                variant='outlined'
                label={profile.beneficiaryType === 'member' ? 'Colaborador' : profile.beneficiaryType === 'shareholder' ? 'Accionista' : profile.beneficiaryType}
              />
              <Chip size='small' variant='outlined' label={profile.currency} />
              <Chip
                size='small'
                variant='tonal'
                color={STATUS_COLOR[profile.status]}
                label={STATUS_LABEL[profile.status]}
              />
              {profile.countryCode ? (
                <Chip size='small' variant='outlined' label={profile.countryCode} />
              ) : null}
              {profile.requireApproval ? (
                <Chip size='small' variant='outlined' label='Maker-checker activo' />
              ) : null}
            </Stack>
          </Stack>

          <Divider />

          {/* Routing data */}
          <Stack spacing={1.5}>
            <Typography variant='subtitle2' color='text.secondary'>
              Ruta de pago
            </Typography>
            <Stack
              direction='row'
              spacing={3}
              divider={<Divider orientation='vertical' flexItem />}
              sx={{ flexWrap: 'wrap' }}
              useFlexGap
            >
              <Stack spacing={0.25}>
                <Typography variant='caption' color='text.secondary'>
                  Provider
                </Typography>
                {profile.providerSlug ? (
                  <Chip
                    size='small'
                    variant='tonal'
                    color='info'
                    label={profile.providerSlug}
                    sx={{ alignSelf: 'flex-start' }}
                  />
                ) : (
                  <Typography variant='body2'>—</Typography>
                )}
              </Stack>
              <Stack spacing={0.25}>
                <Typography variant='caption' color='text.secondary'>
                  Metodo
                </Typography>
                <Typography variant='body2'>{profile.paymentMethod ?? '—'}</Typography>
              </Stack>
              {profile.paymentInstrumentId ? (
                <Stack spacing={0.25}>
                  <Typography variant='caption' color='text.secondary'>
                    Instrumento
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {profile.paymentInstrumentId.slice(0, 16)}…
                  </Typography>
                </Stack>
              ) : null}
            </Stack>
          </Stack>

          <Divider />

          {/* Account data */}
          <Stack spacing={1.5}>
            <Typography variant='subtitle2' color='text.secondary'>
              Cuenta destino
            </Typography>
            {profile.accountHolderName ? (
              <Stack spacing={0.25}>
                <Typography variant='caption' color='text.secondary'>
                  Titular
                </Typography>
                <Typography variant='body2'>{profile.accountHolderName}</Typography>
              </Stack>
            ) : null}
            {profile.bankName ? (
              <Stack spacing={0.25}>
                <Typography variant='caption' color='text.secondary'>
                  Banco
                </Typography>
                <Typography variant='body2'>{profile.bankName}</Typography>
              </Stack>
            ) : null}
            <Stack spacing={0.25}>
              <Typography variant='caption' color='text.secondary'>
                Numero de cuenta
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {revealedAccountNumber ?? profile.accountNumberMasked ?? '—'}
              </Typography>
            </Stack>
            {profile.routingReference ? (
              <Stack spacing={0.25}>
                <Typography variant='caption' color='text.secondary'>
                  Referencia de routing
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {profile.routingReference}
                </Typography>
              </Stack>
            ) : null}

            {profile.hasFullAccountNumber && !revealedAccountNumber ? (
              <Button
                variant='outlined'
                color='warning'
                size='small'
                startIcon={<i className='tabler-eye' />}
                onClick={handleReveal}
                disabled={actionInFlight}
                sx={{ alignSelf: 'flex-start' }}
              >
                Revelar numero completo
              </Button>
            ) : null}

            {revealedAccountNumber ? (
              <Box role='status' aria-live='polite'>
                <Alert severity='warning' icon={<i className='tabler-shield-lock' />}>
                  Datos sensibles revelados — quedan en audit log. Se ocultaran en 60 segundos.
                </Alert>
              </Box>
            ) : null}
          </Stack>

          {profile.cancelledReason ? (
            <Alert severity='error' icon={<i className='tabler-circle-x' />}>
              <Typography variant='subtitle2' gutterBottom>
                Cancelado por {profile.cancelledBy?.slice(0, 16) ?? '—'}…
              </Typography>
              <Typography variant='body2'>{profile.cancelledReason}</Typography>
            </Alert>
          ) : null}

          {profile.notes ? (
            <Stack spacing={0.5}>
              <Typography variant='caption' color='text.secondary'>
                Notas
              </Typography>
              <Typography variant='body2'>{profile.notes}</Typography>
            </Stack>
          ) : null}

          {approvalHelp ? (
            <Alert severity='warning' icon={<i className='tabler-shield-check' />}>
              {approvalHelp}
            </Alert>
          ) : null}

          {/* Lifecycle actions */}
          {(showApprove || showCancel) && (
            <>
              <Divider />
              <Stack spacing={2}>
                <Typography variant='subtitle2'>Acciones</Typography>
                <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
                  {showApprove ? (
                    <Button
                      variant='contained'
                      color='success'
                      startIcon={<i className='tabler-check' />}
                      onClick={handleApprove}
                      disabled={actionInFlight}
                    >
                      {approvalActionLabel}
                    </Button>
                  ) : null}
                  {showCancel ? (
                    <Button
                      variant='outlined'
                      color='error'
                      startIcon={<i className='tabler-circle-x' />}
                      onClick={handleCancel}
                      disabled={actionInFlight}
                    >{GREENHOUSE_COPY.actions.cancel}</Button>
                  ) : null}
                </Stack>
              </Stack>
            </>
          )}

          <Divider />

          {/* Audit timeline */}
          <Stack spacing={1.5} role='status' aria-live='polite'>
            <Typography variant='subtitle2'>Historial</Typography>
            {audit.length === 0 ? (
              <Typography variant='caption' color='text.secondary'>
                Sin eventos registrados aun.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {audit.map(entry => (
                  <AuditTimelineEntry key={entry.auditId} entry={entry} />
                ))}
              </Stack>
            )}
          </Stack>
        </Stack>
      )}
    </Drawer>
  )
}

const AuditTimelineEntry = ({ entry }: { entry: BeneficiaryPaymentProfileAuditEntry }) => {
  const meta = AUDIT_ACTION_META[entry.action] ?? {
    icon: 'tabler-circle',
    label: entry.action,
    color: 'default' as const
  }

  const isWarn = entry.action === 'revealed_sensitive'

  return (
    <Stack direction='row' spacing={2} alignItems='flex-start'>
      <Box
        sx={theme => ({
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: isWarn
            ? theme.palette.warning.lightOpacity ?? theme.palette.action.hover
            : theme.palette.action.hover,
          color: isWarn ? 'warning.main' : 'text.secondary',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        })}
      >
        <i className={meta.icon} style={{ fontSize: 16 }} />
      </Box>
      <Stack spacing={0.25} sx={{ flex: 1 }}>
        <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
          <Typography variant='body2' fontWeight={500}>
            {meta.label}
          </Typography>
          {isWarn ? (
            <Chip
              size='small'
              variant='tonal'
              color='warning'
              label='Sensible'
              sx={{ height: 18 }}
            />
          ) : null}
        </Stack>
        <Typography variant='caption' color='text.secondary'>
          {entry.actorEmail ?? `${entry.actorUserId.slice(0, 16)}…`} · {formatTimestamp(entry.createdAt)}
        </Typography>
        {entry.reason ? (
          <Typography variant='caption' color='text.secondary'>
            Motivo: {entry.reason}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  )
}

export default ProfileDetailDrawer
