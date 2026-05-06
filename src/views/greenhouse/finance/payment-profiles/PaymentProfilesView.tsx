'use client'

// TASK-749 — Surface ops cross-entity para Perfiles de Pago.
// NO duplica el CRUD del Panel reutilizable. Tres jobs:
//   1. Cola de aprobacion (pending_approval) con bulk approve.
//   2. Drift card: beneficiarios con obligaciones vivas sin perfil activo.
//   3. Tabla universal read-only — click en fila → deep link al 360.

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { toast } from 'sonner'

import CustomTextField from '@core/components/mui/TextField'
import EmptyState from '@/components/greenhouse/EmptyState'
import { DataTableShell } from '@/components/greenhouse/data-table'
import type {
  BeneficiaryPaymentProfileBeneficiaryType,
  BeneficiaryPaymentProfileCurrency,
  BeneficiaryPaymentProfileSafe,
  BeneficiaryPaymentProfileStatus
} from '@/types/payment-profiles'

import type { PaymentProfileQueueSummary } from '@/lib/finance/beneficiary-payment-profiles/queue-summary'

import ProfileDetailDrawer from './ProfileDetailDrawer'

const TASK407_ARIA_CARGANDO_UNIVERSO_DE_PERFILES = "Cargando universo de perfiles"
const TASK407_ARIA_ABRIR_EN_360 = "Abrir en 360"


type StatusFilter = BeneficiaryPaymentProfileStatus | 'all'
type CurrencyFilter = BeneficiaryPaymentProfileCurrency | 'all'
type BeneficiaryTypeFilter = BeneficiaryPaymentProfileBeneficiaryType | 'all'

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'pending_approval', label: 'Pendiente aprobacion' },
  { value: 'active', label: 'Activo' },
  { value: 'superseded', label: 'Reemplazado' },
  { value: 'cancelled', label: 'Cancelado' }
]

const CURRENCY_OPTIONS: Array<{ value: CurrencyFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'CLP', label: 'CLP' },
  { value: 'USD', label: 'USD' }
]

const BENEFICIARY_TYPE_OPTIONS: Array<{ value: BeneficiaryTypeFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'member', label: 'Colaborador' },
  { value: 'shareholder', label: 'Accionista' }
]

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

const BENEFICIARY_TYPE_LABEL: Record<BeneficiaryPaymentProfileBeneficiaryType, string> = {
  member: 'Colaborador',
  shareholder: 'Accionista',
  supplier: 'Proveedor',
  tax_authority: 'Autoridad tributaria',
  processor: 'Procesador',
  other: 'Otro'
}

const formatAmount = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0
  }).format(amount)

const buildDeepLink = (profile: BeneficiaryPaymentProfileSafe): string => {
  if (profile.beneficiaryType === 'member') {
    return `/people/${profile.beneficiaryId}?tab=payment`
  }

  if (profile.beneficiaryType === 'shareholder') {
    return `/finance/shareholder-account?profileId=${profile.profileId}`
  }

  return `/finance/payment-profiles?profileId=${profile.profileId}`
}

const PaymentProfilesView = () => {
  const router = useRouter()

  const [queue, setQueue] = useState<PaymentProfileQueueSummary | null>(null)
  const [queueLoading, setQueueLoading] = useState(true)

  const [profiles, setProfiles] = useState<BeneficiaryPaymentProfileSafe[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('all')
  const [beneficiaryTypeFilter, setBeneficiaryTypeFilter] = useState<BeneficiaryTypeFilter>('all')
  const [search, setSearch] = useState('')
  const [drawerProfileId, setDrawerProfileId] = useState<string | null>(null)

  const loadQueue = useCallback(async () => {
    setQueueLoading(true)

    try {
      const r = await fetch('/api/admin/finance/payment-profiles/queue')

      if (!r.ok) {
        const json = await r.json().catch(() => ({}))

        toast.error(json.error ?? 'No fue posible cargar la cola de aprobacion')

        return
      }

      const json = await r.json()

      setQueue(json as PaymentProfileQueueSummary)
    } catch (e) {
      console.error(e)
      toast.error('Error de red al cargar la cola')
    } finally {
      setQueueLoading(false)
    }
  }, [])

  const loadProfiles = useCallback(async () => {
    setProfilesLoading(true)

    try {
      const params = new URLSearchParams()

      params.set('limit', '200')
      params.set('status', statusFilter)
      if (currencyFilter !== 'all') params.set('currency', currencyFilter)
      if (beneficiaryTypeFilter !== 'all') params.set('beneficiaryType', beneficiaryTypeFilter)
      if (search.trim()) params.set('search', search.trim())

      const r = await fetch(`/api/admin/finance/payment-profiles?${params.toString()}`)

      if (!r.ok) {
        const json = await r.json().catch(() => ({}))

        toast.error(json.error ?? 'No fue posible cargar los perfiles')

        return
      }

      const json = await r.json()

      setProfiles(json.items ?? [])
    } catch (e) {
      console.error(e)
      toast.error('Error de red al cargar los perfiles')
    } finally {
      setProfilesLoading(false)
    }
  }, [statusFilter, currencyFilter, beneficiaryTypeFilter, search])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  useEffect(() => {
    void loadProfiles()
  }, [loadProfiles])

  const handleApproveNext = useCallback(async () => {
    if (!queue || queue.pendingApprovalProfiles.length === 0) return

    const next = queue.pendingApprovalProfiles[0]

    setDrawerProfileId(next.profileId)
  }, [queue])

  const handleDrawerComplete = useCallback(async () => {
    await Promise.all([loadQueue(), loadProfiles()])
  }, [loadQueue, loadProfiles])

  const driftRows = queue?.driftRows ?? []
  const pendingProfiles = queue?.pendingApprovalProfiles ?? []

  const tableEmpty = useMemo(() => profiles.length === 0, [profiles])

  return (
    <Stack spacing={6}>
      {/* Header */}
      <Card elevation={0} sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}>
        <CardContent>
          <Stack spacing={1}>
            <Typography variant='overline' color='text.secondary' letterSpacing='0.06em'>
              Finanzas · Tesoreria · Vista ops
            </Typography>
            <Typography variant='h4'>Perfiles de pago</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 820 }}>
              Esta vista es <strong>read-only</strong> y solo cubre operaciones cross-entity: aprobar
              pendientes en cola, detectar drift cuando faltan perfiles para obligaciones vivas, y auditar
              el universo. Para crear o editar un perfil, abri la persona o el accionista correspondiente.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Queue + Drift */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={theme => ({
              border: `1px solid ${theme.palette.warning.main}`,
              backgroundColor: `${theme.palette.warning.main}11`,
              height: '100%'
            })}
          >
            <CardContent>
              <Stack
                direction='row'
                justifyContent='space-between'
                alignItems='flex-start'
                spacing={2}
                flexWrap='wrap'
              >
                <Stack spacing={0.5}>
                  <Typography variant='overline' color='warning.main' letterSpacing='0.06em'>
                    Cola de aprobacion
                  </Typography>
                  <Typography variant='h5'>
                    {queueLoading ? '—' : `${pendingProfiles.length} perfiles esperando checker`}
                  </Typography>
                  <Typography variant='caption' color='text.secondary' sx={{ maxWidth: 480 }}>
                    El creador no puede aprobar su propio perfil (maker-checker). Acceder al detalle
                    desde la cola te lleva al drawer con la accion Aprobar.
                  </Typography>
                </Stack>
                {pendingProfiles.length > 0 ? (
                  <Button variant='contained' color='warning' onClick={handleApproveNext}>
                    Revisar siguiente
                  </Button>
                ) : null}
              </Stack>

              {queueLoading ? (
                <Box sx={{ pt: 3 }}>
                  <LinearProgress />
                </Box>
              ) : pendingProfiles.length === 0 ? (
                <Typography variant='body2' color='text.secondary' sx={{ pt: 3 }}>
                  No hay perfiles esperando aprobacion. Buen trabajo.
                </Typography>
              ) : (
                <Stack spacing={1.5} sx={{ pt: 3 }}>
                  {pendingProfiles.slice(0, 5).map(p => (
                    <Stack
                      key={p.profileId}
                      direction='row'
                      spacing={2}
                      alignItems='center'
                      sx={{
                        cursor: 'pointer',
                        py: 1,
                        borderRadius: 1,
                        '&:hover': { backgroundColor: 'action.hover' }
                      }}
                      onClick={() => setDrawerProfileId(p.profileId)}
                    >
                      <Chip size='small' variant='outlined' label={p.currency} />
                      <Stack spacing={0} sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant='body2' fontWeight={500} noWrap>
                          {p.beneficiaryName ?? p.beneficiaryId}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          via {p.providerSlug ?? 'sin provider'} · maker {p.createdBy.slice(0, 18)}…
                        </Typography>
                      </Stack>
                      <Typography variant='caption' color='text.secondary'>
                        {new Date(p.createdAt).toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: 'short'
                        })}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={theme => ({
              border: `1px solid ${theme.palette.error.main}`,
              backgroundColor: `${theme.palette.error.main}0F`,
              height: '100%'
            })}
          >
            <CardContent>
              <Stack spacing={0.5}>
                <Typography variant='overline' color='error.main' letterSpacing='0.06em'>
                  Drift detectado
                </Typography>
                <Typography variant='h5'>
                  {queueLoading ? '—' : `${driftRows.length} beneficiarios con obligaciones bloqueadas`}
                </Typography>
                <Typography variant='caption' color='text.secondary' sx={{ maxWidth: 480 }}>
                  Tienen obligaciones de pago vivas pero <strong>ningun perfil activo</strong>. Las ordenes de
                  pago no se pueden generar hasta crear el perfil.
                </Typography>
              </Stack>

              {queueLoading ? (
                <Box sx={{ pt: 3 }}>
                  <LinearProgress />
                </Box>
              ) : driftRows.length === 0 ? (
                <Typography variant='body2' color='text.secondary' sx={{ pt: 3 }}>
                  Sin drift. Todas las obligaciones tienen su perfil activo.
                </Typography>
              ) : (
                <Stack spacing={1.5} sx={{ pt: 3 }}>
                  {driftRows.slice(0, 5).map(d => (
                    <Stack
                      key={`${d.beneficiaryType}-${d.beneficiaryId}-${d.currency}`}
                      direction='row'
                      spacing={2}
                      alignItems='center'
                      sx={{
                        cursor: 'pointer',
                        py: 1,
                        borderRadius: 1,
                        '&:hover': { backgroundColor: 'action.hover' }
                      }}
                      onClick={() => {
                        if (d.beneficiaryType === 'member') {
                          router.push(`/people/${d.beneficiaryId}?tab=payment`)
                        }
                      }}
                    >
                      <Chip size='small' variant='outlined' label={d.currency} />
                      <Stack spacing={0} sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant='body2' fontWeight={500} noWrap>
                          {d.beneficiaryName ?? d.beneficiaryId}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {d.obligationCount} obligacion{d.obligationCount === 1 ? '' : 'es'} ·{' '}
                          {formatAmount(d.totalAmount, d.currency)}
                        </Typography>
                      </Stack>
                      <Button size='small' variant='outlined'>
                        Crear perfil
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Universe table */}
      <Card elevation={0} sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}>
        <CardContent>
          <Stack spacing={3}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ md: 'flex-end' }}
              flexWrap='wrap'
              useFlexGap
            >
              <Typography variant='h6' sx={{ flex: 1, minWidth: 200 }}>
                Universo de perfiles
              </Typography>
              <CustomTextField
                select
                label='Estado'
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                sx={{ minWidth: 180 }}
              >
                {STATUS_OPTIONS.map(o => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                label='Moneda'
                value={currencyFilter}
                onChange={e => setCurrencyFilter(e.target.value as CurrencyFilter)}
                sx={{ minWidth: 140 }}
              >
                {CURRENCY_OPTIONS.map(o => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                label='Tipo'
                value={beneficiaryTypeFilter}
                onChange={e => setBeneficiaryTypeFilter(e.target.value as BeneficiaryTypeFilter)}
                sx={{ minWidth: 180 }}
              >
                {BENEFICIARY_TYPE_OPTIONS.map(o => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                label='Buscar'
                placeholder='Nombre o ID'
                value={search}
                onChange={e => setSearch(e.target.value)}
                sx={{ minWidth: 200, flex: 1 }}
              />
            </Stack>

            <Alert severity='info' icon={<i className='tabler-info-circle' />}>
              Esta tabla es read-only. Click en una fila te lleva al lugar correcto para editarlo (Person 360 o Shareholder 360).
            </Alert>

            {profilesLoading ? (
              <Box sx={{ py: 2 }}>
                <LinearProgress aria-label={TASK407_ARIA_CARGANDO_UNIVERSO_DE_PERFILES} />
              </Box>
            ) : tableEmpty ? (
              <EmptyState
                icon='tabler-id-badge'
                title='Sin resultados'
                description='Ajusta los filtros para ver mas perfiles.'
              />
            ) : (
              <DataTableShell
                identifier='payment-profiles-universe'
                ariaLabel='Universo de perfiles de pago'
                stickyFirstColumn
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Beneficiario</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Moneda</TableCell>
                      <TableCell>Provider</TableCell>
                      <TableCell>Cuenta</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Maker</TableCell>
                      <TableCell>Checker</TableCell>
                      <TableCell aria-label={TASK407_ARIA_ABRIR_EN_360} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {profiles.map(profile => (
                      <TableRow
                        key={profile.profileId}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => router.push(buildDeepLink(profile))}
                      >
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography variant='body2' fontWeight={500}>
                              {profile.beneficiaryName ?? profile.beneficiaryId}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ fontSize: '0.7rem' }}
                            >
                              {profile.beneficiaryId}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            variant='outlined'
                            label={
                              BENEFICIARY_TYPE_LABEL[profile.beneficiaryType] ?? profile.beneficiaryType
                            }
                          />
                        </TableCell>
                        <TableCell>{profile.currency}</TableCell>
                        <TableCell>
                          {profile.providerSlug ? (
                            <Chip
                              size='small'
                              variant='tonal'
                              color='info'
                              label={profile.providerSlug}
                            />
                          ) : (
                            <Typography variant='caption' color='text.secondary'>
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {profile.accountNumberMasked ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            variant='tonal'
                            color={STATUS_COLOR[profile.status]}
                            label={STATUS_LABEL[profile.status]}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant='caption' color='text.secondary'>
                            {profile.createdBy.slice(0, 12)}…
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='caption' color='text.secondary'>
                            {profile.approvedBy ? `${profile.approvedBy.slice(0, 12)}…` : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <i
                            className='tabler-arrow-up-right'
                            style={{ fontSize: 16, color: 'currentColor' }}
                            aria-hidden='true'
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTableShell>
            )}
          </Stack>
        </CardContent>
      </Card>

      <ProfileDetailDrawer
        profileId={drawerProfileId}
        onClose={() => setDrawerProfileId(null)}
        onActionComplete={handleDrawerComplete}
      />
    </Stack>
  )
}

export default PaymentProfilesView
