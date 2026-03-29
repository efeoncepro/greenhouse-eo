'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import SectionErrorBoundary from '@components/greenhouse/SectionErrorBoundary'

import { ExecutiveCardShell, ExecutiveMiniStatCard } from '@/components/greenhouse'
import { GH_INTERNAL_MESSAGES, GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'
import type { AdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import type { AdminTenantsOverview } from '@/lib/admin/get-admin-tenants-overview'
import type { InternalDashboardOverview } from '@/lib/internal/get-internal-dashboard-overview'

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
}

type DomainCard = {
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

const buildDomainCards = ({ access, tenants }: Pick<Props, 'access' | 'tenants'>): DomainCard[] => [
  {
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
    title: 'Cloud & Integrations',
    subtitle: GH_INTERNAL_NAV.adminCloudIntegrations.subtitle,
    icon: 'tabler-plug-connected',
    avatarColor: 'primary',
    status: { label: 'Activo', color: 'success' },
    href: '/admin/cloud-integrations',
    primaryAction: 'Abrir cloud & integrations',
    routes: ['/admin/cloud-integrations'],
    points: [
      'Health, stale data, retries y auth por referencia',
      'Syncs y webhooks con entrypoint propio',
      'Deep-link a operaciones cuando hace falta mas contexto'
    ]
  },
  {
    title: 'Ops Health',
    subtitle: GH_INTERNAL_NAV.adminOpsHealth.subtitle,
    icon: 'tabler-activity-heartbeat',
    avatarColor: 'error',
    status: { label: 'Runtime', color: 'info' },
    href: '/admin/ops-health',
    primaryAction: 'Abrir ops health',
    routes: ['/admin/ops-health'],
    points: [
      'Outbox, queue y handlers reactivos',
      'Semantica ok, warning, failed y stale',
      'Replay y retry sobre helpers canonicos'
    ]
  },
  {
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

const AdminCenterView = ({ access, tenants, controlTower }: Props) => {
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

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

  const cards = buildDomainCards({ access, tenants })

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
            onSearchChange={setSearchValue}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onExport={() => exportToCsv(filteredTenants)}
            attentionCount={summary.attentionCount}
          />
        </ExecutiveCardShell>
      </SectionErrorBoundary>

      {/* ── Mapa de dominios ── */}
      <ExecutiveCardShell
        title='Mapa de dominios'
        subtitle='Cada dominio indexa una family operacional distinta. Las rutas especialistas siguen vivas.'
      >
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' }
          }}
        >
          {cards.map(card => (
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
          ))}
        </Box>
      </ExecutiveCardShell>
    </Stack>
  )
}

export default AdminCenterView
