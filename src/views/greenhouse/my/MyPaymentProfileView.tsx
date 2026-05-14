'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'

import { getMicrocopy } from '@/lib/copy'
import {
  CanonicalApiError,
  parseApiErrorPayload,
  throwIfNotOk
} from '@/lib/api/parse-error-response'

import CustomChip from '@core/components/mui/Chip'

import RequestChangeDialog from './payment-profile/RequestChangeDialog'
import { formatDate as formatGreenhouseDate } from '@/lib/format'

const GREENHOUSE_COPY = getMicrocopy()

interface PaymentProfileSafe {
  profileId: string
  beneficiaryType: string
  beneficiaryId: string
  beneficiaryName: string | null
  countryCode: string | null
  currency: string
  providerSlug: string | null
  paymentMethod: string | null
  accountHolderName: string | null
  accountNumberMasked: string | null
  bankName: string | null
  routingReference: string | null
  status: 'draft' | 'pending_approval' | 'active' | 'superseded' | 'cancelled'
  createdAt: string
  updatedAt: string | null
  approvedAt: string | null
  metadata?: Record<string, unknown> | null
  [key: string]: unknown
}

interface ApiResponse {
  memberId: string
  profiles: PaymentProfileSafe[]
}

const STATUS_META: Record<string, { label: string; color: 'primary' | 'info' | 'warning' | 'success' | 'error' | 'secondary' }> = {
  draft: { label: GREENHOUSE_COPY.states.draft, color: 'secondary' },
  pending_approval: { label: GREENHOUSE_COPY.states.inReview, color: 'warning' },
  active: { label: GREENHOUSE_COPY.states.active, color: 'success' },
  superseded: { label: 'Reemplazado', color: 'secondary' },
  cancelled: { label: GREENHOUSE_COPY.states.cancelled, color: 'error' }
}

const PROVIDER_LABELS: Record<string, string> = {
  bank_internal: 'Banco interno',
  bank_external: 'Banco externo',
  santander_chile: 'Santander Chile',
  bci: 'BCI',
  banco_estado: 'BancoEstado',
  banco_chile: 'Banco de Chile',
  scotiabank: 'Scotiabank',
  itau: 'Itaú',
  global66: 'Global66',
  wise: 'Wise',
  paypal: 'PayPal',
  deel: 'Deel',
  stripe: 'Stripe'
}

const formatDate = (iso: string | null): string => {
  if (!iso) return '—'

  try {
    return formatGreenhouseDate(new Date(iso), {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
}, 'es-CL')
  } catch {
    return iso
  }
}

const cardSx = { border: (t: Theme) => `1px solid ${t.palette.divider}` }

interface ViewError {
  message: string
  actionable: boolean
  code: string | null
}

const MyPaymentProfileView = () => {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ViewError | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [snack, setSnack] = useState<{ severity: 'success' | 'info' | 'warning' | 'error'; message: string } | null>(null)
  const [cancelInProgress, setCancelInProgress] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/my/payment-profile')

      await throwIfNotOk(res, 'No fue posible cargar tu cuenta de pago.')
      setData(await res.json())
    } catch (loadError) {
      if (loadError instanceof CanonicalApiError) {
        setError({
          message: loadError.message,
          actionable: loadError.actionable,
          code: loadError.code
        })
      } else {
        setError({
          message: loadError instanceof Error ? loadError.message : 'No fue posible cargar tu cuenta de pago.',
          actionable: true,
          code: null
        })
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleSubmitRequest = async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/my/payment-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    await throwIfNotOk(res, 'No pudimos registrar tu solicitud.')

    setSnack({
      severity: 'success',
      message: 'Solicitud enviada. Finance la revisará en las próximas horas.'
    })
    setDialogOpen(false)
    await load()
  }

  const handleCancelRequest = async (profileId: string) => {
    const reason = window.prompt(
      'Razón de la cancelación (mínimo 3 caracteres). Quedará en el audit log.',
      'Cambio sin efecto'
    )

    if (!reason || reason.trim().length < 3) {
      setSnack({ severity: 'info', message: 'Cancelación abortada.' })

      return
    }

    setCancelInProgress(profileId)

    try {
      const res = await fetch(`/api/my/payment-profile/${profileId}/cancel-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        const parsed = parseApiErrorPayload(payload, 'No pudimos cancelar tu solicitud.')

        setSnack({ severity: 'error', message: parsed.message })

        return
      }

      setSnack({ severity: 'success', message: 'Solicitud cancelada.' })
      await load()
    } catch {
      setSnack({ severity: 'error', message: 'No pudimos cancelar tu solicitud.' })
    } finally {
      setCancelInProgress(null)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert
        severity={error.actionable ? 'error' : 'warning'}
        action={
          error.actionable
            ? (
              <Button color='inherit' size='small' onClick={() => void load()}>
                Reintentar
              </Button>
            )
            : undefined
        }
      >
        {error.message}
      </Alert>
    )
  }

  const profiles = data?.profiles ?? []
  const active = profiles.find(p => p.status === 'active') ?? null
  const pending = profiles.find(p => p.status === 'pending_approval' || p.status === 'draft') ?? null

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={cardSx}>
          <CardHeader
            title='Mi cuenta de pago'
            subheader='La cuenta donde recibes tus pagos. Si quieres cambiarla, finance debe aprobar.'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-credit-card' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
            action={
              !pending ? (
                <Button
                  variant='tonal'
                  color='primary'
                  startIcon={<i className='tabler-edit' />}
                  onClick={() => setDialogOpen(true)}
                >
                  Solicitar cambio
                </Button>
              ) : null
            }
          />
        </Card>
      </Grid>

      {/* Active profile */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={cardSx}>
          <CardHeader
            title='Cuenta activa'
            subheader={active ? 'Esta cuenta está vigente.' : 'Aún no hay cuenta activa registrada.'}
          />
          <Divider />
          <CardContent>
            {active ? <ProfileSummary profile={active} /> : (
              <Stack spacing={1} alignItems='flex-start'>
                <Typography variant='body2' color='text.secondary'>
                  Finance no ha registrado tu cuenta todavía. Si necesitas declarar una, solicita el alta.
                </Typography>
                <Button
                  variant='tonal'
                  color='primary'
                  size='small'
                  startIcon={<i className='tabler-plus' />}
                  onClick={() => setDialogOpen(true)}
                >
                  Solicitar alta
                </Button>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Pending request */}
      {pending && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={cardSx}>
            <CardHeader
              title='Solicitud en revisión'
              subheader='Finance la aprobará en las próximas horas. Te avisaremos por email.'
              action={
                <Button
                  size='small'
                  variant='tonal'
                  color='error'
                  startIcon={<i className='tabler-x' />}
                  disabled={cancelInProgress === pending.profileId}
                  onClick={() => void handleCancelRequest(pending.profileId)}
                >
                  Cancelar solicitud
                </Button>
              }
            />
            <Divider />
            <CardContent>
              <ProfileSummary profile={pending} />
            </CardContent>
          </Card>
        </Grid>
      )}

      <RequestChangeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmitRequest}
      />

      <Snackbar
        open={snack !== null}
        autoHideDuration={5500}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack ? (
          <Alert severity={snack.severity} onClose={() => setSnack(null)}>
            {snack.message}
          </Alert>
        ) : (
          <span />
        )}
      </Snackbar>
    </Grid>
  )
}

const ProfileSummary = ({ profile }: { profile: PaymentProfileSafe }) => {
  const statusMeta = STATUS_META[profile.status] ?? { label: profile.status, color: 'secondary' as const }
  const providerLabel = profile.providerSlug ? (PROVIDER_LABELS[profile.providerSlug] ?? profile.providerSlug) : null

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant='h6'>{profile.accountHolderName ?? profile.beneficiaryName ?? 'Sin titular'}</Typography>
        <CustomChip round='true' size='small' variant='tonal' color={statusMeta.color} label={statusMeta.label} />
        {profile.metadata?.requested_by === 'member' && (
          <CustomChip round='true' size='small' variant='outlined' color='info' label='Solicitado por ti' />
        )}
      </Box>

      <Divider />

      <Stack spacing={1}>
        <DetailRow label='Proveedor' value={providerLabel ?? '—'} />
        <DetailRow label='Banco' value={profile.bankName ?? '—'} />
        <DetailRow label='Número de cuenta' value={profile.accountNumberMasked ?? '—'} mono />
        <DetailRow label='Moneda' value={profile.currency} />
        <DetailRow label='Método' value={profile.paymentMethod ?? '—'} />
        <DetailRow label='País' value={profile.countryCode ?? '—'} />
        {profile.routingReference && <DetailRow label='Referencia/SWIFT' value={profile.routingReference} mono />}
        <DetailRow label='Última actualización' value={formatDate(profile.updatedAt ?? profile.createdAt)} />
      </Stack>
    </Stack>
  )
}

const DetailRow = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
    <Typography variant='body2' color='text.secondary'>{label}</Typography>
    <Typography variant={mono ? 'monoId' : 'body2'} fontWeight={500} sx={{ textAlign: 'right' }}>
      {value}
    </Typography>
  </Box>
)

export default MyPaymentProfileView
