'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import PaymentInstrumentChip from '@/components/greenhouse/PaymentInstrumentChip'
import {
  DEFAULT_FOR_OPTIONS,
  INSTRUMENT_CATEGORY_COLORS,
  INSTRUMENT_CATEGORY_ICONS,
  PROVIDER_CATALOG,
  getProvider,
  type InstrumentCategory
} from '@/config/payment-instruments'
import { getCategoryProviderRule, hasFixedProvider } from '@/lib/finance/payment-instruments/category-rules'
import { GH_COLORS } from '@/config/greenhouse-nomenclature'

import {
  adaptPaymentInstrumentDetail,
  maskSensitiveValue,
  type AuditTone,
  type CheckStatus,
  type PaymentInstrumentAdminDetail,
  type ReadinessStatus,
  type SectionHealth
} from './paymentInstrumentAdminAdapters'

const TASK407_ARIA_CARGANDO_WORKSPACE_DEL_INSTRUMENTO_DE_PAGO = "Cargando workspace del instrumento de pago"
const TASK407_ARIA_ACTUALIZANDO_DETALLE_DEL_INSTRUMENTO = "Actualizando detalle del instrumento"
const TASK407_ARIA_SECCIONES_DEL_WORKSPACE_DE_INSTRUMENTO_DE_PAGO = "Secciones del workspace de instrumento de pago"


const GREENHOUSE_COPY = getMicrocopy()

type Props = {
  accountId: string
}

type ActiveTab = 'configuration' | 'activity' | 'reconciliation' | 'audit'
type RevealField = 'accountNumberFull' | 'providerIdentifier'
type SavingSection = 'account' | 'routing' | null

type ResponsibleCandidate = {
  userId: string
  label: string
  email: string | null
  avatarUrl: string | null
  operationalRoleLabel: string | null
  roleCodes: string[]
  isCurrentUser: boolean
  isFinanceRole: boolean
}

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeZone: 'America/Santiago'
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Santiago'
})

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Sin fecha'

  try {
    return dateFormatter.format(new Date(value))
  } catch {
    return 'Fecha no valida'
  }
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return 'Sin registro'

  try {
    return dateTimeFormatter.format(new Date(value))
  } catch {
    return 'Fecha no valida'
  }
}

const formatCurrency = (amount: number | null | undefined, currency: string) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2
  }).format(Number(amount ?? 0))

const readinessCopy: Record<ReadinessStatus, { label: string; color: 'success' | 'warning' | 'error' | 'secondary'; helper: string }> = {
  ready: {
    label: 'Listo para operar',
    color: 'success',
    helper: 'El instrumento tiene los datos minimos para flujos financieros.'
  },
  needs_configuration: {
    label: 'Requiere configuracion',
    color: 'warning',
    helper: 'Completa proveedor, identificadores o ruteo antes de usarlo como default.'
  },
  at_risk: {
    label: 'Riesgo operativo',
    color: 'error',
    helper: 'Hay dependencias que pueden afectar pagos, cobros o conciliacion.'
  },
  inactive: {
    label: GREENHOUSE_COPY.states.inactive,
    color: 'secondary',
    helper: 'No deberia usarse en nuevos flujos hasta reactivarlo.'
  }
}

const checkCopy: Record<CheckStatus, { icon: string; color: 'success' | 'warning' | 'error' }> = {
  pass: { icon: 'tabler-circle-check', color: 'success' },
  warning: { icon: 'tabler-alert-triangle', color: 'warning' },
  fail: { icon: 'tabler-circle-x', color: 'error' }
}

const sectionCopy: Record<SectionHealth, { label: string; color: 'success' | 'warning' | 'error' }> = {
  ok: { label: GREENHOUSE_COPY.states.available, color: 'success' },
  partial: { label: GREENHOUSE_COPY.states.partial, color: 'warning' },
  error: { label: 'Con error', color: 'error' }
}

const auditColor: Record<AuditTone, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  secondary: 'secondary'
}

const roleLabel = (roleCode: string) => {
  switch (roleCode) {
    case 'efeonce_admin':
      return 'Superadmin'
    case 'finance_admin':
      return 'Finanzas admin'
    case 'finance_analyst':
      return 'Finanzas'
    default:
      return roleCode
  }
}

const DetailField = ({ label, value, helper }: { label: string; value: string | number | null | undefined; helper?: string }) => (
  <Stack spacing={0.5}>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='body2' sx={{ overflowWrap: 'anywhere', fontWeight: 500 }}>
      {value === null || value === undefined || value === '' ? 'Sin dato' : value}
    </Typography>
    {helper ? (
      <Typography variant='caption' color='text.secondary'>
        {helper}
      </Typography>
    ) : null}
  </Stack>
)

const MetricTile = ({ label, value, helper, tone = 'info' }: { label: string; value: string | number; helper: string; tone?: 'info' | 'warning' | 'success' | 'error' }) => (
  <Box
    sx={{
      p: 3,
      border: theme => `1px solid ${theme.palette.divider}`,
      borderRadius: 1,
      bgcolor:
        tone === 'warning'
          ? GH_COLORS.semaphore.yellow.bg
          : tone === 'success'
            ? GH_COLORS.semaphore.green.bg
            : tone === 'error'
              ? GH_COLORS.semaphore.red.bg
              : 'background.paper'
    }}
  >
    <Typography variant='h5' sx={{ fontWeight: 700, color: tone === 'info' ? 'text.primary' : `${tone}.main` }}>
      {value}
    </Typography>
    <Typography variant='body2' sx={{ fontWeight: 600 }}>
      {label}
    </Typography>
    <Typography variant='caption' color='text.secondary'>
      {helper}
    </Typography>
  </Box>
)

const EmptyPanel = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
  <Box sx={{ border: theme => `1px dashed ${theme.palette.divider}`, borderRadius: 1, p: 6, textAlign: 'center' }} role='status'>
    <i className={icon} style={{ fontSize: 34, color: GH_COLORS.brand.coreBlue }} />
    <Typography variant='h6' sx={{ mt: 2 }}>
      {title}
    </Typography>
    <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 560, mx: 'auto' }}>
      {description}
    </Typography>
  </Box>
)

const PaymentInstrumentDetailView = ({ accountId }: Props) => {
  const [detail, setDetail] = useState<PaymentInstrumentAdminDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('configuration')
  const [savingSection, setSavingSection] = useState<SavingSection>(null)
  const [sectionSuccess, setSectionSuccess] = useState<string | null>(null)
  const [confirmSection, setConfirmSection] = useState<SavingSection>(null)
  const [revealField, setRevealField] = useState<RevealField | null>(null)
  const [revealReason, setRevealReason] = useState('')
  const [revealing, setRevealing] = useState(false)
  const [revealed, setRevealed] = useState<Partial<Record<RevealField, { value: string; expiresAt: string }>>>({})
  const [responsibleOptions, setResponsibleOptions] = useState<ResponsibleCandidate[]>([])
  const [responsiblesLoading, setResponsiblesLoading] = useState(false)
  const [responsiblesError, setResponsiblesError] = useState<string | null>(null)

  const [configForm, setConfigForm] = useState({
    accountName: '',
    providerSlug: '',
    providerIdentifierMasked: '',
    accountNumberMasked: '',
    notes: '',
    displayOrder: '0'
  })

  const [routingForm, setRoutingForm] = useState({
    responsibleUserId: '',
    defaultFor: [] as string[]
  })

  const loadResponsibles = useCallback(async () => {
    setResponsiblesLoading(true)
    setResponsiblesError(null)

    try {
      const response = await fetch('/api/admin/payment-instruments/responsibles', {
        cache: 'no-store'
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))

        throw new Error(body.error ?? `No pudimos cargar responsables (HTTP ${response.status}).`)
      }

      const payload = (await response.json()) as { items?: ResponsibleCandidate[] }

      setResponsibleOptions(Array.isArray(payload.items) ? payload.items : [])
    } catch (loadError) {
      setResponsiblesError(loadError instanceof Error ? loadError.message : 'No pudimos cargar responsables financieros.')
    } finally {
      setResponsiblesLoading(false)
    }
  }, [])

  const loadDetail = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true)
      else setLoading(true)
      setError(null)
      setNotFound(false)

      try {
        const response = await fetch(`/api/admin/payment-instruments/${encodeURIComponent(accountId)}`, {
          cache: 'no-store'
        })

        if (response.status === 404) {
          setDetail(null)
          setNotFound(true)

          return
        }

        if (!response.ok) {
          const body = await response.json().catch(() => ({}))

          setError(body.error ?? `No pudimos cargar el instrumento (HTTP ${response.status}).`)

          return
        }

        const adapted = adaptPaymentInstrumentDetail(await response.json())

        // If the category has a fixed provider (e.g. shareholder_account → 'greenhouse')
        // pre-fill the form with the default so the user sees the right value
        // even on legacy rows where the FK has not been backfilled yet.
        const ruleForCategory = getCategoryProviderRule(adapted.account.instrumentCategory)

        const initialProviderSlug =
          adapted.account.providerSlug
          ?? ruleForCategory?.defaultProviderSlug
          ?? ''

        setDetail(adapted)
        setConfigForm({
          accountName: adapted.account.accountName,
          providerSlug: initialProviderSlug,
          providerIdentifierMasked: adapted.account.providerIdentifierMasked ?? '',
          accountNumberMasked: adapted.account.accountNumberMasked ?? '',
          notes: adapted.account.notes ?? '',
          displayOrder: String(adapted.account.displayOrder)
        })
        setRoutingForm({
          responsibleUserId: adapted.account.responsibleUserId ?? '',
          defaultFor: adapted.account.defaultFor
        })
      } catch {
        setError('No pudimos conectar con el servidor. Reintenta o vuelve a la lista de instrumentos.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [accountId]
  )

  useEffect(() => {
    void loadDetail()
    void loadResponsibles()
  }, [loadDetail, loadResponsibles])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now()

      setRevealed(current =>
        Object.fromEntries(Object.entries(current).filter(([, state]) => state && new Date(state.expiresAt).getTime() > now))
      )
    }, 1000)

    return () => window.clearInterval(interval)
  }, [])

  const account = detail?.account
  const readiness = detail ? readinessCopy[detail.readiness.status] : readinessCopy.needs_configuration
  const impact = detail?.impact
  const impactedRecords = (impact?.incomePaymentsCount ?? 0) + (impact?.expensePaymentsCount ?? 0) + (impact?.settlementLegsCount ?? 0)
  const metadataEntries = useMemo(() => Object.entries(account?.metadataJsonSafe ?? {}).slice(0, 10), [account?.metadataJsonSafe])
  const hasPartialSections = detail ? Object.values(detail.sections).some(value => value !== 'ok') : false
  const selectedResponsible = responsibleOptions.find(option => option.userId === routingForm.responsibleUserId) ?? null
  const selectedResponsibleIsKnown = responsibleOptions.some(option => option.userId === routingForm.responsibleUserId)

  const responsibleHelperText = responsiblesLoading
    ? 'Cargando responsables financieros...'
    : responsiblesError
      ? 'No pudimos cargar el selector. Se conserva el responsable actual hasta reintentar.'
      : 'Solo usuarios internos activos con rol financiero operativo o Superadmin pueden quedar asignados.'

  const saveSection = async (section: SavingSection) => {
    if (!section || !detail) return

    if (detail.impact.highImpactMutationRequired && !confirmSection) {
      setConfirmSection(section)

      return
    }

    setSavingSection(section)
    setSectionSuccess(null)

    const body =
      section === 'account'
        ? {
            accountName: configForm.accountName.trim(),
            providerSlug: configForm.providerSlug || null,
            notes: configForm.notes.trim() || null,
            displayOrder: Number(configForm.displayOrder || 0),
            reason: 'Actualizacion de configuracion desde workspace admin',
            confirmHighImpact: Boolean(confirmSection)
          }
        : {
            responsibleUserId: routingForm.responsibleUserId.trim() || null,
            defaultFor: routingForm.defaultFor,
            reason: 'Actualizacion de ruteo desde workspace admin',
            confirmHighImpact: Boolean(confirmSection)
          }

    try {
      const response = await fetch(`/api/admin/payment-instruments/${encodeURIComponent(accountId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))

        throw new Error(payload.error ?? `No pudimos guardar la seccion (HTTP ${response.status}).`)
      }

      toast.success(section === 'account' ? 'Configuracion guardada.' : 'Ruteo guardado.')
      setSectionSuccess(section === 'account' ? 'Configuracion actualizada. Revisa readiness antes de usar como default.' : 'Ruteo actualizado.')
      setConfirmSection(null)
      await loadDetail('refresh')
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'No pudimos guardar los cambios.')
    } finally {
      setSavingSection(null)
    }
  }

  const revealSensitive = async () => {
    if (!revealField || revealReason.trim().length < 12) return

    setRevealing(true)

    try {
      const response = await fetch(`/api/admin/payment-instruments/${encodeURIComponent(accountId)}/reveal-sensitive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: revealField, reason: revealReason.trim() })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))

        throw new Error(payload.error ?? 'El reveal sensible aun no esta disponible para este usuario o ambiente.')
      }

      const payload = (await response.json()) as { value?: string; expiresAt?: string }

      setRevealed(current => ({
        ...current,
        [revealField]: {
          value: payload.value ?? '',
          expiresAt: payload.expiresAt ?? new Date(Date.now() + 5 * 60 * 1000).toISOString()
        }
      }))
      toast.success('Valor revelado temporalmente. No se guarda en el estado permanente.')
      setRevealField(null)
      setRevealReason('')
    } catch (revealError) {
      toast.error(revealError instanceof Error ? revealError.message : 'No pudimos revelar el valor sensible.')
    } finally {
      setRevealing(false)
    }
  }

  if (loading) {
    return (
      <Grid container spacing={5} role='status' aria-live='polite' aria-label={TASK407_ARIA_CARGANDO_WORKSPACE_DEL_INSTRUMENTO_DE_PAGO}>
        <Grid size={{ xs: 12 }}>
          <Stack spacing={1}>
            <Skeleton variant='text' width={280} height={28} />
            <Skeleton variant='rounded' width='100%' height={118} />
          </Stack>
        </Grid>
        {[0, 1, 2].map(item => (
          <Grid key={item} size={{ xs: 12, md: 4 }}>
            <Skeleton variant='rounded' height={132} />
          </Grid>
        ))}
        <Grid size={{ xs: 12 }}>
          <Skeleton variant='rounded' height={460} />
        </Grid>
      </Grid>
    )
  }

  if (notFound || error || !detail || !account) {
    return (
      <Stack spacing={4}>
        <Breadcrumbs>
          <Typography component={Link} href='/admin' color='inherit'>
            Admin Center
          </Typography>
          <Typography component={Link} href='/admin/payment-instruments' color='inherit'>
            Instrumentos de pago
          </Typography>
          <Typography color='text.primary'>{accountId}</Typography>
        </Breadcrumbs>
        <Alert
          severity={notFound ? 'warning' : 'error'}
          action={
            notFound ? (
              <Button component={Link} href='/admin/payment-instruments' color='inherit' size='small'>
                Volver a la lista
              </Button>
            ) : (
              <Button color='inherit' size='small' onClick={() => void loadDetail()}>
                Reintentar carga
              </Button>
            )
          }
        >
          {notFound
            ? `No encontramos un instrumento de pago con el identificador ${accountId}.`
            : error ?? 'No pudimos cargar el workspace del instrumento.'}
        </Alert>
      </Stack>
    )
  }

  return (
    <Grid container spacing={5}>
      <Grid size={{ xs: 12 }}>
        <Breadcrumbs>
          <Typography component={Link} href='/admin' color='inherit'>
            Admin Center
          </Typography>
          <Typography component={Link} href='/admin/payment-instruments' color='inherit'>
            Instrumentos de pago
          </Typography>
          <Typography color='text.primary'>{account.accountName}</Typography>
        </Breadcrumbs>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          {refreshing ? <LinearProgress aria-label={TASK407_ARIA_ACTUALIZANDO_DETALLE_DEL_INSTRUMENTO} /> : null}
          <CardContent>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={5} justifyContent='space-between'>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <CustomAvatar skin='light' color={INSTRUMENT_CATEGORY_COLORS[account.instrumentCategory] ?? 'primary'} size={64} variant='rounded'>
                  <i className={INSTRUMENT_CATEGORY_ICONS[account.instrumentCategory] ?? 'tabler-credit-card'} style={{ fontSize: 32 }} />
                </CustomAvatar>
                <Stack spacing={1.5}>
                  <PaymentInstrumentChip
                    providerSlug={account.providerSlug}
                    instrumentName={account.accountName}
                    instrumentCategory={account.instrumentCategory}
                    size='md'
                  />
                  <Stack direction='row' spacing={1.5} useFlexGap flexWrap='wrap'>
                    <CustomChip round='true' size='small' variant='tonal' color={readiness.color} label={readiness.label} />
                    <CustomChip round='true' size='small' variant='tonal' color={account.isActive ? 'success' : 'secondary'} label={account.isActive ? 'Activo' : 'Inactivo'} />
                    <CustomChip round='true' size='small' variant='tonal' color='info' label={`${account.currency} · ${account.country}`} />
                    {hasPartialSections ? (
                      <CustomChip round='true' size='small' variant='tonal' color='warning' label='Contrato parcial' />
                    ) : null}
                  </Stack>
                  <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 760 }}>
                    {readiness.helper}
                  </Typography>
                </Stack>
              </Stack>

              <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
                <Button variant='tonal' color='secondary' onClick={() => void loadDetail('refresh')} startIcon={<i className='tabler-refresh' />}>
                  Actualizar
                </Button>
                <Button component={Link} href='/admin/payment-instruments' variant='outlined' color='secondary' startIcon={<i className='tabler-arrow-left' />}>{GREENHOUSE_COPY.actions.back}</Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <MetricTile label='Impacto operativo' value={impactedRecords} helper='Cobros, pagos y tramos ligados a este instrumento.' tone={detail.impact.highImpactMutationRequired ? 'warning' : 'info'} />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <MetricTile label='Periodos cerrados' value={detail.impact.closedPeriodsCount} helper='Cambios sensibles pueden requerir control adicional.' tone={detail.impact.closedPeriodsCount > 0 ? 'warning' : 'success'} />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <MetricTile label='Ultimo movimiento' value={formatDate(detail.impact.latestMovementAt ?? detail.impact.latestBalanceDate)} helper='Dato provisto por treasury/ICO cuando el contrato lo incluye.' tone={detail.sections.impact === 'ok' ? 'info' : 'warning'} />
      </Grid>

      {sectionSuccess ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='success' onClose={() => setSectionSuccess(null)}>
            {sectionSuccess}
          </Alert>
        </Grid>
      ) : null}

      {hasPartialSections ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='warning'>
            La vista esta usando datos parciales para algunas secciones. Las acciones principales se mantienen disponibles, pero las metricas de impacto dependen del contrato backend seguro de TASK-697.
          </Alert>
        </Grid>
      ) : null}

      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <Box sx={{ borderBottom: theme => `1px solid ${theme.palette.divider}`, px: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(_, value: ActiveTab) => setActiveTab(value)}
              variant='scrollable'
              allowScrollButtonsMobile
              aria-label={TASK407_ARIA_SECCIONES_DEL_WORKSPACE_DE_INSTRUMENTO_DE_PAGO}
            >
              <Tab value='configuration' label='Configuracion' icon={<i className='tabler-adjustments' />} iconPosition='start' />
              <Tab value='activity' label='Actividad' icon={<i className='tabler-activity' />} iconPosition='start' />
              <Tab value='reconciliation' label='Conciliacion' icon={<i className='tabler-scale' />} iconPosition='start' />
              <Tab value='audit' label='Auditoria' icon={<i className='tabler-history' />} iconPosition='start' />
            </Tabs>
          </Box>

          {activeTab === 'configuration' ? (
            <CardContent>
              <Grid container spacing={5}>
                <Grid size={{ xs: 12, lg: 7 }}>
                  <Stack spacing={4}>
                    <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={3}>
                      <Box>
                        <Typography variant='h6'>Datos del instrumento</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          Guarda solo los campos de identidad operativa. Los valores sensibles completos requieren reveal con razon.
                        </Typography>
                      </Box>
                      <CustomChip round='true' size='small' variant='tonal' color={sectionCopy[detail.sections.account].color} label={sectionCopy[detail.sections.account].label} />
                    </Stack>

                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <CustomTextField
                          fullWidth
                          label='Nombre visible'
                          value={configForm.accountName}
                          onChange={event => setConfigForm(current => ({ ...current, accountName: event.target.value }))}
                          helperText='Usa un nombre reconocible para Banco, Tesoreria y Conciliacion.'
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        {(() => {
                          const rule = getCategoryProviderRule(account.instrumentCategory as InstrumentCategory)
                          const fixedProvider = hasFixedProvider(rule)

                          if (rule && !rule.requiresProvider) {
                            return (
                              <DetailField
                                label='Proveedor'
                                value='No aplica'
                                helper='Esta categoria opera sin proveedor externo.'
                              />
                            )
                          }

                          const allowedTypes = rule?.providerTypesAllowed ?? null

                          const providerOptions = Object.entries(PROVIDER_CATALOG)
                            .filter(([slug, def]) => {
                              // Limit to providers that match the rule's allowed types
                              // OR (legacy) match the same instrument category as fallback.
                              if (allowedTypes && allowedTypes.length > 0) {
                                // PROVIDER_CATALOG entries don't carry provider_type yet, but their
                                // `category` aligns by convention. Filter by category match instead
                                // when allowedTypes is the legacy 'bank'/'card_network'/etc.
                                const slugMatchesCategory = def.category === account.instrumentCategory
                                const isPlatformProvider = slug === 'greenhouse'

                                return slugMatchesCategory || (allowedTypes.includes('platform_operator') && isPlatformProvider)
                              }

                              return def.category === account.instrumentCategory
                            })

                          const label = rule?.providerLabel ?? 'Proveedor'

                          const helper = fixedProvider
                            ? 'La plataforma opera este instrumento — proveedor pre-asignado.'
                            : `Selecciona el ${label.toLowerCase()} desde el catalogo Greenhouse.`

                          return (
                            <CustomTextField
                              select
                              fullWidth
                              label={label}
                              value={configForm.providerSlug}
                              onChange={event => setConfigForm(current => ({ ...current, providerSlug: event.target.value }))}
                              helperText={helper}
                              disabled={fixedProvider}
                              SelectProps={{
                                renderValue: value => {
                                  const slugValue = String(value || '')
                                  const definition = getProvider(slugValue)

                                  if (!definition) return slugValue || 'Sin proveedor'

                                  return definition.name
                                }
                              }}
                            >
                              {!fixedProvider && (
                                <MenuItem value=''>
                                  <em>Sin proveedor</em>
                                </MenuItem>
                              )}
                              {providerOptions.map(([slug, def]) => (
                                <MenuItem key={slug} value={slug}>
                                  <Stack direction='row' spacing={1.5} alignItems='center'>
                                    {def.compactLogo || def.logo ? (
                                      <Box
                                        component='img'
                                        src={def.compactLogo || def.logo || ''}
                                        alt={def.name}
                                        sx={{ width: 20, height: 20, objectFit: 'contain' }}
                                      />
                                    ) : null}
                                    <Typography variant='body2'>{def.name}</Typography>
                                  </Stack>
                                </MenuItem>
                              ))}
                            </CustomTextField>
                          )
                        })()}
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <DetailField label='Cuenta enmascarada' value={configForm.accountNumberMasked || account.accountNumberMasked} helper='Reveal temporal disponible solo con razon.' />
                        <Button size='small' variant='text' sx={{ mt: 1 }} startIcon={<i className='tabler-eye' />} onClick={() => setRevealField('accountNumberFull')}>
                          Revelar cuenta
                        </Button>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <DetailField label='Identificador proveedor' value={configForm.providerIdentifierMasked || account.providerIdentifierMasked} helper='No se guarda completo en cliente.' />
                        <Button size='small' variant='text' sx={{ mt: 1 }} startIcon={<i className='tabler-eye' />} onClick={() => setRevealField('providerIdentifier')}>
                          Revelar identificador
                        </Button>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <CustomTextField
                          fullWidth
                          type='number'
                          label='Orden de despliegue'
                          value={configForm.displayOrder}
                          onChange={event => setConfigForm(current => ({ ...current, displayOrder: event.target.value }))}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <DetailField label='Saldo apertura' value={formatCurrency(account.openingBalance, account.currency)} helper={formatDate(account.openingBalanceDate)} />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <CustomTextField
                          fullWidth
                          multiline
                          minRows={3}
                          label='Notas administrativas'
                          value={configForm.notes}
                          onChange={event => setConfigForm(current => ({ ...current, notes: event.target.value }))}
                          helperText='Evita pegar datos sensibles completos. Usa este campo para contexto operativo.'
                        />
                      </Grid>
                    </Grid>

                    <Stack direction='row' spacing={2} justifyContent='flex-end'>
                      <Button
                        variant='contained'
                        onClick={() => void saveSection('account')}
                        disabled={savingSection !== null || !configForm.accountName.trim()}
                        startIcon={savingSection === 'account' ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}
                      >
                        Guardar configuracion
                      </Button>
                    </Stack>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, lg: 5 }}>
                  <Stack spacing={4}>
                    {(() => {
                      const rule = getCategoryProviderRule(account.instrumentCategory as InstrumentCategory)

                      if (!rule?.requiresCounterparty) return null

                      const meta = (account.metadataJsonSafe ?? {}) as Record<string, unknown>

                      const counterpartyId =
                        (typeof meta.shareholderProfileId === 'string' && meta.shareholderProfileId)
                        || (typeof meta.shareholder_profile_id === 'string' && meta.shareholder_profile_id)
                        || (typeof meta.counterpartyProfileId === 'string' && meta.counterpartyProfileId)
                        || (typeof meta.counterparty_profile_id === 'string' && meta.counterparty_profile_id)
                        || ''

                      const counterpartyName =
                        (typeof meta.shareholderName === 'string' && meta.shareholderName)
                        || (typeof meta.shareholder_name === 'string' && meta.shareholder_name)
                        || ''

                      return (
                        <Card variant='outlined' sx={{ borderRadius: 2 }}>
                          <CardContent>
                            <Stack spacing={2}>
                              <Box>
                                <Typography variant='subtitle2' color='text.secondary'>
                                  {rule.counterpartyLabel}
                                </Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  Persona vinculada al saldo de este instrumento.
                                </Typography>
                              </Box>
                              {counterpartyId ? (
                                <Stack direction='row' spacing={2} alignItems='center'>
                                  <CustomAvatar size={42} variant='rounded' color='primary'>
                                    <i className='tabler-user' />
                                  </CustomAvatar>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography variant='body2' fontWeight={600} noWrap>
                                      {counterpartyName || 'Persona'}
                                    </Typography>
                                    <Typography variant='caption' color='text.secondary' sx={{ wordBreak: 'break-all' }}>
                                      profile_id: {counterpartyId}
                                    </Typography>
                                  </Box>
                                </Stack>
                              ) : (
                                <Alert severity='warning' variant='outlined'>
                                  Sin {rule.counterpartyLabel?.toLowerCase()} asignado. Asigna uno antes de operar saldos.
                                </Alert>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      )
                    })()}

                    <Box>
                      <Typography variant='h6'>Ruteo y readiness</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Define donde aparece por defecto y revisa si falta informacion antes de usarlo en flujos criticos.
                      </Typography>
                    </Box>

                    <CustomTextField
                      select
                      fullWidth
                      label='Responsable'
                      value={routingForm.responsibleUserId}
                      onChange={event => setRoutingForm(current => ({ ...current, responsibleUserId: event.target.value }))}
                      helperText={responsibleHelperText}
                      disabled={responsiblesLoading && responsibleOptions.length === 0}
                      SelectProps={{
                        renderValue: value => {
                          const selectedValue = String(value || '')

                          if (!selectedValue) return 'Sin responsable'

                          return selectedResponsible
                            ? selectedResponsible.isCurrentUser
                              ? `${selectedResponsible.label} (yo)`
                              : selectedResponsible.label
                            : selectedValue
                        }
                      }}
                    >
                      <MenuItem value=''>
                        <Stack direction='row' spacing={2} alignItems='center'>
                          <CustomAvatar skin='light' color='secondary' size={28} variant='rounded'>
                            <i className='tabler-user-off' />
                          </CustomAvatar>
                          <Box>
                            <Typography variant='body2'>Sin responsable</Typography>
                            <Typography variant='caption' color='text.secondary'>
                              Mantener pendiente de asignacion
                            </Typography>
                          </Box>
                        </Stack>
                      </MenuItem>
                      {routingForm.responsibleUserId && !selectedResponsibleIsKnown ? (
                        <MenuItem value={routingForm.responsibleUserId}>
                          <Stack direction='row' spacing={2} alignItems='center'>
                            <CustomAvatar skin='light' color='warning' size={28} variant='rounded'>
                              <i className='tabler-alert-triangle' />
                            </CustomAvatar>
                            <Box>
                              <Typography variant='body2'>Responsable actual</Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {routingForm.responsibleUserId}
                              </Typography>
                            </Box>
                          </Stack>
                        </MenuItem>
                      ) : null}
                      {responsibleOptions.map(option => (
                        <MenuItem key={option.userId} value={option.userId}>
                          <Stack direction='row' spacing={2} alignItems='center' sx={{ minWidth: 0 }}>
                            <CustomAvatar src={option.avatarUrl ?? undefined} skin='light' color={option.isCurrentUser ? 'primary' : 'info'} size={28} variant='rounded'>
                              {option.label.slice(0, 2).toUpperCase()}
                            </CustomAvatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Stack direction='row' spacing={1} alignItems='center' useFlexGap flexWrap='wrap'>
                                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                                  {option.isCurrentUser ? `${option.label} (yo)` : option.label}
                                </Typography>
                                {option.roleCodes.slice(0, 2).map(roleCode => (
                                  <CustomChip key={roleCode} round='true' size='small' variant='tonal' color='info' label={roleLabel(roleCode)} />
                                ))}
                                {!option.roleCodes.some(roleCode => ['efeonce_admin', 'finance_admin', 'finance_analyst'].includes(roleCode)) && option.operationalRoleLabel ? (
                                  <CustomChip round='true' size='small' variant='tonal' color='info' label={option.operationalRoleLabel} />
                                ) : null}
                              </Stack>
                              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', overflowWrap: 'anywhere' }}>
                                {option.email ?? option.userId}
                              </Typography>
                            </Box>
                          </Stack>
                        </MenuItem>
                      ))}
                    </CustomTextField>
                    {responsiblesError ? (
                      <Button size='small' variant='text' onClick={() => void loadResponsibles()} startIcon={<i className='tabler-refresh' />}>
                        Reintentar responsables
                      </Button>
                    ) : null}
                    <CustomTextField
                      select
                      fullWidth
                      SelectProps={{ multiple: true }}
                      label='Default para'
                      value={routingForm.defaultFor}
                      onChange={event => {
                        const value = event.target.value

                        setRoutingForm(current => ({ ...current, defaultFor: Array.isArray(value) ? value : String(value).split(',') }))
                      }}
                      helperText='Afecta nuevos flujos de cobro, pago o remuneraciones.'
                    >
                      {DEFAULT_FOR_OPTIONS.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </CustomTextField>

                    <Stack spacing={2}>
                      {detail.readiness.checks.map(check => {
                        const tone = checkCopy[check.status]

                        return (
                          <Stack key={check.key} direction='row' spacing={2} alignItems='center'>
                            <CustomAvatar skin='light' color={tone.color} size={34} variant='rounded'>
                              <i className={tone.icon} />
                            </CustomAvatar>
                            <Typography variant='body2'>{check.label}</Typography>
                          </Stack>
                        )
                      })}
                    </Stack>

                    <Stack direction='row' spacing={2} justifyContent='flex-end'>
                      <Button
                        variant='contained'
                        onClick={() => void saveSection('routing')}
                        disabled={savingSection !== null}
                        startIcon={savingSection === 'routing' ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-route' />}
                      >
                        Guardar ruteo
                      </Button>
                    </Stack>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Grid container spacing={4}>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <DetailField label='ID canonico' value={account.accountId} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <DetailField label='Tipo contable' value={account.accountType} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <DetailField label='Tarjeta' value={account.cardLastFour ? `•••• ${account.cardLastFour}` : maskSensitiveValue(account.cardNetwork)} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <DetailField label='Limite credito' value={account.creditLimit ? formatCurrency(account.creditLimit, account.currency) : null} />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          ) : null}

          {activeTab === 'activity' ? (
            <CardContent>
              {detail.treasury?.recentMovements.length ? (
                <Stack spacing={3}>
                  <Stack direction='row' justifyContent='space-between' alignItems='center'>
                    <Box>
                      <Typography variant='h6'>Actividad treasury reciente</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Movimientos entregados por el contrato treasury. No se recalculan metricas en la UI.
                      </Typography>
                    </Box>
                    <CustomChip round='true' size='small' variant='tonal' color={sectionCopy[detail.sections.treasury].color} label={sectionCopy[detail.sections.treasury].label} />
                  </Stack>
                  {detail.treasury.recentMovements.slice(0, 8).map((movement, index) => (
                    <Box key={movement.movementId ?? index} sx={{ p: 3, border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between'>
                        <Box>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {movement.description ?? movement.counterpartyName ?? 'Movimiento sin descripcion'}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {formatDateTime(movement.occurredAt ?? movement.postedAt)} · {movement.source ?? 'treasury'}
                          </Typography>
                        </Box>
                        <Typography variant='body2' sx={{ fontWeight: 700 }}>
                          {formatCurrency(movement.amount ?? movement.amountClp, account.currency)}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <EmptyPanel
                  icon='tabler-activity'
                  title='Sin actividad treasury disponible'
                  description='El backend aun no entrego movimientos para este instrumento. Cuando el contrato treasury este conectado, esta seccion mostrara movimientos recientes y saldo vigente.'
                />
              )}
            </CardContent>
          ) : null}

          {activeTab === 'reconciliation' ? (
            <CardContent>
              <Stack spacing={4}>
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <Box>
                    <Typography variant='h6'>Impacto de conciliacion</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Usa estos conteos para decidir si un cambio requiere control adicional antes de guardar.
                    </Typography>
                  </Box>
                  <CustomChip round='true' size='small' variant='tonal' color={sectionCopy[detail.sections.impact].color} label={sectionCopy[detail.sections.impact].label} />
                </Stack>
                <Grid container spacing={4}>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <MetricTile label='Cobros' value={detail.impact.incomePaymentsCount} helper='Registros cash-in asociados.' />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <MetricTile label='Pagos' value={detail.impact.expensePaymentsCount} helper='Registros cash-out asociados.' />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <MetricTile label='Tramos' value={detail.impact.settlementLegsCount} helper='Liquidaciones y transferencias.' />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <MetricTile label='Cerrados' value={detail.impact.closedPeriodsCount} helper='Periodos con posible lock.' tone={detail.impact.closedPeriodsCount ? 'warning' : 'success'} />
                  </Grid>
                </Grid>
                {detail.impact.highImpactMutationRequired ? (
                  <Alert severity='warning'>
                    Este instrumento tiene impacto alto. Las mutaciones deben guardar razon, actor y auditoria antes de ejecutarse.
                  </Alert>
                ) : (
                  <Alert severity='success'>No hay señales de impacto alto en el contrato actual.</Alert>
                )}
              </Stack>
            </CardContent>
          ) : null}

          {activeTab === 'audit' ? (
            <CardContent>
              <Stack spacing={4}>
                <Stack direction='row' justifyContent='space-between' alignItems='center'>
                  <Box>
                    <Typography variant='h6'>Auditoria administrativa</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Cambios y reveals sensibles deben aparecer aqui sin almacenar valores completos.
                    </Typography>
                  </Box>
                  <CustomChip round='true' size='small' variant='tonal' color={sectionCopy[detail.sections.audit].color} label={sectionCopy[detail.sections.audit].label} />
                </Stack>
                {detail.audit.length ? (
                  <Stack spacing={3}>
                    {detail.audit.map(entry => (
                      <Stack key={entry.auditId} direction='row' spacing={3} alignItems='flex-start'>
                        <CustomAvatar skin='light' color={auditColor[entry.tone] ?? 'info'} size={36} variant='rounded'>
                          <i className='tabler-history' />
                        </CustomAvatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {entry.summary}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {formatDateTime(entry.createdAt)} · {entry.actorName ?? entry.actorEmail ?? 'Actor no disponible'}
                          </Typography>
                          {entry.reason ? (
                            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                              Razon: {entry.reason}
                            </Typography>
                          ) : null}
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <EmptyPanel
                    icon='tabler-history'
                    title='Sin eventos de auditoria aun'
                    description='Cuando backend registre cambios, reveals o desactivaciones, esta linea de tiempo mostrara actor, razon y fecha sin exponer valores sensibles.'
                  />
                )}
                {metadataEntries.length ? (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant='subtitle2' sx={{ mb: 2 }}>
                        Metadata segura
                      </Typography>
                      <Grid container spacing={3}>
                        {metadataEntries.map(([key, value]) => (
                          <Grid key={key} size={{ xs: 12, md: 4 }}>
                            <DetailField label={key} value={String(value)} />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </>
                ) : null}
              </Stack>
            </CardContent>
          ) : null}
        </Card>
      </Grid>

      <Dialog open={Boolean(confirmSection)} onClose={() => setConfirmSection(null)} maxWidth='sm' fullWidth>
        <DialogTitle>Confirmar cambio con impacto</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <Alert severity='warning'>
              Este instrumento esta asociado a {impactedRecords} registros y {detail.impact.closedPeriodsCount} periodos cerrados. Guarda solo si el cambio ya fue revisado operacionalmente.
            </Alert>
            <Typography variant='body2' color='text.secondary'>
              La accion intentara usar el contrato seguro de backend. Si el contrato aun no esta disponible, veras un error sin perder los cambios del formulario.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={() => setConfirmSection(null)}>
            Revisar antes
          </Button>
          <Button variant='contained' onClick={() => void saveSection(confirmSection)} startIcon={<i className='tabler-shield-check' />}>
            Guardar con impacto
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(revealField)} onClose={() => setRevealField(null)} maxWidth='sm' fullWidth>
        <DialogTitle>Revelar valor sensible</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Alert severity='warning'>
              El valor completo se muestra temporalmente y debe quedar auditado con razon. No lo pegues en notas ni canales no autorizados.
            </Alert>
            <CustomTextField
              fullWidth
              multiline
              minRows={3}
              label='Razon del reveal'
              value={revealReason}
              onChange={event => setRevealReason(event.target.value)}
              helperText='Minimo 12 caracteres. Ejemplo: confirmar numero para conciliacion bancaria.'
              error={Boolean(revealReason) && revealReason.trim().length < 12}
            />
            {revealField && revealed[revealField] ? (
              <Alert severity='success' role='status'>
                Valor revelado hasta {formatDateTime(revealed[revealField]?.expiresAt)}: {revealed[revealField]?.value}
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={() => setRevealField(null)}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button
            variant='contained'
            disabled={revealing || revealReason.trim().length < 12}
            onClick={() => void revealSensitive()}
            startIcon={revealing ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-eye-check' />}
          >
            Revelar temporalmente
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default PaymentInstrumentDetailView
