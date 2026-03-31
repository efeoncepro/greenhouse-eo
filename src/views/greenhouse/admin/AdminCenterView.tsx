'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { usePathname, useRouter as useNavRouter, useSearchParams } from 'next/navigation'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import SectionErrorBoundary from '@components/greenhouse/SectionErrorBoundary'

import { ExecutiveCardShell, ExecutiveMiniStatCard, GreenhouseDragList } from '@/components/greenhouse'
import { GH_INTERNAL_MESSAGES, GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'
import type { AdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import type { AdminTenantsOverview } from '@/lib/admin/get-admin-tenants-overview'
import type { InternalDashboardOverview } from '@/lib/internal/get-internal-dashboard-overview'
import type { OperationsOverview } from '@/lib/operations/get-operations-overview'

import {
  buildControlTowerSummary,
  compareControlTowerTenants,
  finalizeControlTowerTenant,
  formatPercent
} from '../internal/dashboard/helpers'
import type { DerivedControlTowerTenant } from '../internal/dashboard/helpers'

import AdminCenterSpacesTable from './AdminCenterSpacesTable'

type StatusFilter = 'all' | 'active' | 'onboarding' | 'attention' | 'inactive'

type Props = {
  access: AdminAccessOverview
  tenants: AdminTenantsOverview
  controlTower: InternalDashboardOverview
  operations: OperationsOverview
}

type DomainCard = {
  id: string
  title: string
  subtitle: string
  icon: string
  avatarColor: 'info' | 'success' | 'warning' | 'primary' | 'error' | 'secondary'
  status: { label: string; color: 'success' | 'warning' | 'info' | 'secondary' }
  href: string
  primaryAction: string
  routes: string[]
  points: string[]
}

const cloudStatusLabel = (operations: OperationsOverview) => {
  if (operations.cloud.posture.overallStatus === 'failed') {
    return 'Posture crítica'
  }

  if (operations.cloud.posture.overallStatus === 'warning') {
    return 'Posture parcial'
  }

  return 'Posture ok'
}

const cloudStatusColor = (operations: OperationsOverview): 'success' | 'warning' | 'info' | 'secondary' => {
  if (operations.cloud.posture.overallStatus === 'failed') {
    return 'warning'
  }

  if (operations.cloud.posture.overallStatus === 'warning') {
    return 'info'
  }

  return 'success'
}

const exportToCsv = (rows: DerivedControlTowerTenant[]) => {
  const headers = ['Cliente', 'Estado', 'Contacto', 'Usuarios activos', 'Usuarios totales', 'Proyectos', 'OTD', 'Ultima actividad']

  const lines = rows.map(row =>
    [
      row.clientName,
      row.statusLabel,
      row.primaryContactEmail || '',
      row.activeUsers,
      row.totalUsers,
      row.scopedProjects,
      row.avgOnTimePct === null ? '' : Math.round(row.avgOnTimePct),
      row.lastActivityLabel
    ]
      .map(value => `"${String(value).replace(/"/g, '""')}"`)
      .join(',')
  )

  const csvContent = [headers.join(','), ...lines].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'greenhouse-control-tower.csv'
  link.click()
  URL.revokeObjectURL(url)
}

const buildDomainCards = ({ access, tenants, operations }: Pick<Props, 'access' | 'tenants' | 'operations'>): DomainCard[] => [
  {
    id: 'identity-access',
    title: 'Identity & Access',
    subtitle: 'Usuarios, roles, equipo interno y scopes visibles del portal.',
    icon: 'tabler-shield-lock',
    avatarColor: 'info',
    status: { label: access.totals.activeUsers > 0 ? 'Operativo' : 'Pendiente', color: access.totals.activeUsers > 0 ? 'success' : 'warning' },
    href: '/admin/users',
    primaryAction: 'Abrir usuarios',
    routes: ['/admin/users', '/admin/roles', '/admin/team'],
    points: [
      `${access.totals.totalUsers} usuarios y ${access.roles.length} roles registrados`,
      `${access.totals.invitedUsers} invitaciones pendientes`,
      'Gobierno de acceso separado de las vistas operativas del producto'
    ]
  },
  {
    id: 'view-access',
    title: 'Vistas y acceso',
    subtitle: 'Lectura efectiva del portal por rol y preparación para overrides por usuario.',
    icon: 'tabler-layout-grid',
    avatarColor: 'primary',
    status: { label: 'Baseline actual', color: 'info' },
    href: '/admin/views',
    primaryAction: 'Abrir vistas y acceso',
    routes: ['/admin/views'],
    points: [
      `${access.roles.length} roles visibles en la matrix actual`,
      'Preview de navegación por usuario sobre el baseline vigente',
      'Slice preparado para asignación configurable y auditoría'
    ]
  },
  {
    id: 'delivery',
    title: 'Delivery',
    subtitle: 'Historial de envios, suscripciones y trazabilidad de delivery operacional.',
    icon: 'tabler-mail-bolt',
    avatarColor: 'success',
    status: { label: 'Listo', color: 'success' },
    href: '/admin/email-delivery',
    primaryAction: 'Abrir correos',
    routes: ['/admin/email-delivery'],
    points: [
      'Capa centralizada de email con surface administrativa',
      'Delivery, retries y destinatarios por tipo',
      'Governance para notificaciones transaccionales'
    ]
  },
  {
    id: 'notifications',
    title: 'Notificaciones',
    subtitle: 'Gobierno del sistema de notificaciones in-app y email.',
    icon: 'tabler-bell',
    avatarColor: 'primary',
    status: { label: 'Activo', color: 'success' },
    href: '/admin/notifications',
    primaryAction: 'Abrir notificaciones',
    routes: ['/admin/notifications'],
    points: [
      '10 categorías configuradas con audiencia y prioridad',
      'Canales in-app (campanita) y email (Resend)',
      'Dispatch log y preferencias por usuario'
    ]
  },
  {
    id: 'ai-governance',
    title: 'AI Governance',
    subtitle: 'Catalogo, licencias, wallets y control administrativo de AI Tools.',
    icon: 'tabler-robot',
    avatarColor: 'warning',
    status: { label: 'Dual', color: 'info' },
    href: '/admin/ai-tools',
    primaryAction: 'Abrir AI governance',
    routes: ['/admin/ai-tools'],
    points: [
      'Domain surface para usuarios de AI Tooling',
      'Capa de gobernanza y control de creditos o licencias',
      'Separacion entre uso diario y administracion'
    ]
  },
  {
    id: 'cloud-integrations',
    title: 'Cloud & Integrations',
    subtitle: GH_INTERNAL_NAV.adminCloudIntegrations.subtitle,
    icon: 'tabler-plug-connected',
    avatarColor: 'primary',
    status: {
      label: cloudStatusLabel(operations),
      color: cloudStatusColor(operations)
    },
    href: '/admin/cloud-integrations',
    primaryAction: 'Abrir cloud & integrations',
    routes: ['/admin/cloud-integrations'],
    points: [
      `${operations.kpis.activeSyncs} fuentes activas de sincronizacion`,
      operations.cloud.cron.secretConfigured ? 'Cron control plane autenticado' : 'CRON_SECRET pendiente',
      `BigQuery guard: ${operations.cloud.bigquery.maximumBytesBilled.toLocaleString('en-US')} bytes`
    ]
  },
  {
    id: 'ops-health',
    title: 'Ops Health',
    subtitle: GH_INTERNAL_NAV.adminOpsHealth.subtitle,
    icon: 'tabler-activity-heartbeat',
    avatarColor: 'error',
    status: {
      label: operations.kpis.failedHandlers > 0 ? `${operations.kpis.failedHandlers} degradados` : 'Ok',
      color: operations.kpis.failedHandlers > 0 ? 'warning' : 'success'
    },
    href: '/admin/ops-health',
    primaryAction: 'Abrir ops health',
    routes: ['/admin/ops-health'],
    points: [
      `${operations.kpis.outboxEvents24h} eventos en 24h`,
      operations.kpis.pendingProjections > 0
        ? `${operations.kpis.pendingProjections} proyecciones pendientes`
        : 'Sin proyecciones en cola',
      `${operations.cloud.health.checks.filter(check => !check.ok).length} checks cloud con atención`
    ]
  },
  {
    id: 'spaces',
    title: 'Spaces',
    subtitle: 'Provisioning context, enablement y postura de acceso por tenant.',
    icon: 'tabler-grid-4x4',
    avatarColor: 'primary',
    status: { label: tenants.totals.activeTenants > 0 ? 'Activo' : 'Sin spaces', color: tenants.totals.activeTenants > 0 ? 'success' : 'warning' },
    href: '/admin/tenants',
    primaryAction: 'Abrir spaces',
    routes: ['/admin/tenants'],
    points: [
      `${tenants.totals.totalTenants} spaces visibles en governance`,
      `${tenants.totals.tenantsWithScopedProjects} con proyectos scoped`,
      'Contexto de capabilities y acceso por empresa'
    ]
  }
]

const validFilters: StatusFilter[] = ['all', 'active', 'onboarding', 'attention', 'inactive']
const ADMIN_CENTER_CARD_ORDER_KEY = 'greenhouse:admin-center:domain-card-order'

const AdminCenterView = ({ access, tenants, controlTower, operations }: Props) => {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const navRouter = useNavRouter()

  const initialFilter = searchParams.get('filter') as StatusFilter | null
  const initialQuery = searchParams.get('q') ?? ''

  const [searchValue, setSearchValue] = useState(initialQuery)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    initialFilter && validFilters.includes(initialFilter) ? initialFilter : 'all'
  )

  const syncParams = useCallback(
    (filter: StatusFilter, query: string) => {
      const params = new URLSearchParams()

      if (filter !== 'all') params.set('filter', filter)
      if (query.trim()) params.set('q', query.trim())

      const qs = params.toString()

      navRouter.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [pathname, navRouter]
  )

  const handleFilterChange = useCallback(
    (value: StatusFilter) => {
      setStatusFilter(value)
      syncParams(value, searchValue)
    },
    [searchValue, syncParams]
  )

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value)
      syncParams(statusFilter, value)
    },
    [statusFilter, syncParams]
  )

  const ctTenants = useMemo(
    () => controlTower.clients.map(finalizeControlTowerTenant).sort(compareControlTowerTenants),
    [controlTower.clients]
  )

  const filteredTenants = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return ctTenants.filter(tenant => {
      const matchesStatus = statusFilter === 'all' || tenant.statusKey === statusFilter

      const matchesSearch =
        query.length === 0 ||
        [tenant.clientName, tenant.primaryContactEmail || '']
          .join(' ')
          .toLowerCase()
          .includes(query)

      return matchesStatus && matchesSearch
    })
  }, [searchValue, statusFilter, ctTenants])

  const summary = useMemo(
    () => buildControlTowerSummary(ctTenants, controlTower.totals.internalAdmins),
    [controlTower.totals.internalAdmins, ctTenants]
  )

  const otdKpiTone: 'success' | 'warning' | 'error' | 'info' =
    summary.avgOnTimePct === null ? 'info'
      : summary.avgOnTimePct >= 90 ? 'success'
        : summary.avgOnTimePct >= 70 ? 'warning'
          : 'error'

  const cards = useMemo(
    () => buildDomainCards({ access, tenants, operations }),
    [access, tenants, operations]
  )

  const [domainCardOrder, setDomainCardOrder] = useState<string[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const rawValue = window.localStorage.getItem(ADMIN_CENTER_CARD_ORDER_KEY)

    if (!rawValue) {
      setDomainCardOrder(cards.map(card => card.id))

      return
    }

    try {
      const parsed = JSON.parse(rawValue)

      if (!Array.isArray(parsed)) {
        setDomainCardOrder(cards.map(card => card.id))

        return
      }

      setDomainCardOrder(parsed.filter((value): value is string => typeof value === 'string'))
    } catch {
      setDomainCardOrder(cards.map(card => card.id))
    }
  }, [cards])

  const orderedCards = useMemo(() => {
    const positionMap = new Map(domainCardOrder.map((id, index) => [id, index]))

    return [...cards].sort((left, right) => {
      const leftPosition = positionMap.get(left.id) ?? Number.MAX_SAFE_INTEGER
      const rightPosition = positionMap.get(right.id) ?? Number.MAX_SAFE_INTEGER

      if (leftPosition === rightPosition) {
        return left.title.localeCompare(right.title)
      }

      return leftPosition - rightPosition
    })
  }, [cards, domainCardOrder])

  const handleDomainCardsChange = useCallback((nextCards: DomainCard[]) => {
    const nextOrder = nextCards.map(card => card.id)

    setDomainCardOrder(nextOrder)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ADMIN_CENTER_CARD_ORDER_KEY, JSON.stringify(nextOrder))
    }
  }, [])

  return (
    <Stack spacing={6}>
      {/* ── Hero ── */}
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 4, md: 6 },
            background:
              'linear-gradient(135deg, rgba(115,103,240,0.14) 0%, rgba(14,165,233,0.12) 36%, rgba(15,23,42,0) 100%)'
          }}
        >
          <Stack spacing={2.5}>
            <Chip label={GH_INTERNAL_NAV.adminCenter.label} color='primary' variant='outlined' sx={{ width: 'fit-content' }} />
            <Typography variant='h3'>{GH_INTERNAL_NAV.adminCenter.subtitle}</Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 980 }}>
              Plano de gobierno que unifica health de spaces, identity, delivery, integraciones y observabilidad operativa.
              Cada dominio indexa una family funcional sin reemplazar las surfaces especialistas.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button component={Link} href='/admin/tenants' variant='contained'>Abrir Spaces</Button>
              <Button component={Link} href='/admin/cloud-integrations' variant='outlined'>Ver Cloud & Integrations</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* ── 4 KPIs ── */}
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        <ExecutiveMiniStatCard
          eyebrow='Governance'
          tone='info'
          title='Spaces activos'
          value={String(tenants.totals.activeTenants)}
          detail='Tenants con postura operativa vigente.'
          icon='tabler-grid-4x4'
        />
        <ExecutiveMiniStatCard
          eyebrow='Identity'
          tone='success'
          title='Usuarios activos'
          value={String(access.totals.activeUsers)}
          detail='Base con acceso habilitado dentro del portal.'
          icon='tabler-users'
        />
        <ExecutiveMiniStatCard
          eyebrow='Access'
          tone='warning'
          title='Pendientes activacion'
          value={String(access.totals.invitedUsers)}
          detail='Invitaciones o onboarding sin cerrar.'
          icon='tabler-mail-exclamation'
        />
        <ExecutiveMiniStatCard
          eyebrow='Delivery'
          tone={otdKpiTone}
          title='OTD global'
          value={formatPercent(summary.avgOnTimePct)}
          detail='Promedio ponderado de entrega.'
          icon='tabler-target-arrow'
        />
      </Box>

      {/* ── Alertas consolidadas (solo si hay señales) ── */}
      {(() => {
        const alerts: Array<{ icon: string; tone: 'error' | 'warning'; label: string; detail: string }> = []

        if (summary.attentionCount > 0) {
          alerts.push({
            icon: 'tabler-alert-triangle',
            tone: 'error',
            label: `${summary.attentionCount} spaces requieren atencion`,
            detail: 'Sin proyectos scoped, sin activacion o sin actividad reciente.'
          })
        }

        if (operations.kpis.failedHandlers > 0) {
          alerts.push({
            icon: 'tabler-bug',
            tone: 'error',
            label: `${operations.kpis.failedHandlers} handlers degradados`,
            detail: 'Retries o dead-letters visibles en el runtime reactivo.'
          })
        }

        if (operations.webhooks.deliveriesDeadLetter > 0) {
          alerts.push({
            icon: 'tabler-mail-x',
            tone: 'warning',
            label: `${operations.webhooks.deliveriesDeadLetter} deliveries en dead-letter`,
            detail: 'Webhooks que agotaron reintentos y requieren intervencion.'
          })
        }

        if (operations.kpis.pendingProjections > 3) {
          alerts.push({
            icon: 'tabler-refresh-alert',
            tone: 'warning',
            label: `${operations.kpis.pendingProjections} proyecciones pendientes`,
            detail: 'Cola de refreshes reactivos acumulada.'
          })
        }

        if (access.totals.invitedUsers > 10) {
          alerts.push({
            icon: 'tabler-user-exclamation',
            tone: 'warning',
            label: `${access.totals.invitedUsers} usuarios sin activar`,
            detail: 'Invitaciones pendientes con posible friccion de onboarding.'
          })
        }

        if (alerts.length === 0) return null

        return (
          <ExecutiveCardShell
            title='Requiere atencion'
            subtitle='Senales activas de governance que necesitan revision.'
          >
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }
              }}
            >
              {alerts.map(alert => (
                <Card
                  key={alert.label}
                  variant='outlined'
                  sx={{
                    borderLeft: '4px solid',
                    borderLeftColor: `${alert.tone}.main`
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction='row' spacing={2} alignItems='flex-start'>
                      <Avatar
                        variant='rounded'
                        sx={{
                          bgcolor: `${alert.tone}.lightOpacity`,
                          color: `${alert.tone}.main`,
                          width: 36,
                          height: 36
                        }}
                      >
                        <i className={alert.icon} />
                      </Avatar>
                      <Stack spacing={0.5}>
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                          {alert.label}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {alert.detail}
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </ExecutiveCardShell>
        )
      })()}

      {/* ── Torre de control (Spaces health table) ── */}
      <SectionErrorBoundary
        sectionName='admin-center-control-tower'
        title={GH_INTERNAL_MESSAGES.internal_dashboard_table_error_title}
        description={GH_INTERNAL_MESSAGES.internal_dashboard_table_error_description}
      >
        <ExecutiveCardShell
          title='Torre de control'
          subtitle='Control operativo de spaces con prioridad para onboarding, activacion y delivery.'
        >
          <AdminCenterSpacesTable
            rows={filteredTenants}
            totalRows={ctTenants.length}
            searchValue={searchValue}
            onSearchChange={handleSearchChange}
            statusFilter={statusFilter}
            onStatusFilterChange={handleFilterChange}
            onExport={() => exportToCsv(filteredTenants)}
            attentionCount={summary.attentionCount}
          />
        </ExecutiveCardShell>
      </SectionErrorBoundary>

      {/* ── Mapa de dominios ── */}
      <ExecutiveCardShell
        title='Mapa de dominios'
        subtitle='Cada dominio indexa una family operacional distinta. Puedes reordenar las cards para priorizar tu lectura local.'
      >
        <GreenhouseDragList
          items={orderedCards}
          onChange={handleDomainCardsChange}
          renderItem={card => (
            <Card key={card.title} variant='outlined' sx={{ height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Stack spacing={3} sx={{ height: '100%' }}>
                  <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
                    <Stack spacing={1}>
                      <Stack direction='row' spacing={1.5} alignItems='center'>
                        <Avatar variant='rounded' sx={{ bgcolor: `${card.avatarColor}.lightOpacity`, color: `${card.avatarColor}.main` }}>
                          <i className={card.icon} />
                        </Avatar>
                        <Typography variant='h5'>{card.title}</Typography>
                        <Chip
                          size='small'
                          variant='outlined'
                          label='Reordenar'
                          icon={<i className='tabler-grip-vertical' />}
                        />
                      </Stack>
                      <Typography color='text.secondary'>{card.subtitle}</Typography>
                    </Stack>
                    <Chip size='small' color={card.status.color} variant='tonal' label={card.status.label} />
                  </Stack>

                  <Stack spacing={1.25}>
                    {card.points.map(point => (
                      <Typography key={point} variant='body2' color='text.secondary'>
                        - {point}
                      </Typography>
                    ))}
                  </Stack>

                  <Box sx={{ mt: 'auto' }}>
                    <Typography variant='overline' color='text.secondary'>Rutas indexadas</Typography>
                    <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1.25, mb: 2.5 }}>
                      {card.routes.map(route => (
                        <Chip key={route} size='small' label={route} variant='outlined' sx={{ fontFamily: 'monospace' }} />
                      ))}
                    </Stack>
                    <Button component={Link} href={card.href} variant='outlined'>
                      {card.primaryAction}
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}
        />
      </ExecutiveCardShell>
    </Stack>
  )
}

export default AdminCenterView
