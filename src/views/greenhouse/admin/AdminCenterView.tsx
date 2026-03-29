'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import HorizontalWithBorder from '@components/card-statistics/HorizontalWithBorder'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import SectionErrorBoundary from '@components/greenhouse/SectionErrorBoundary'

import { ExecutiveCardShell } from '@/components/greenhouse'
import { GH_INTERNAL_MESSAGES, GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'
import type { AdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import type { AdminTenantsOverview } from '@/lib/admin/get-admin-tenants-overview'
import type { InternalDashboardOverview } from '@/lib/internal/get-internal-dashboard-overview'

import InternalControlTowerTable from '../internal/dashboard/InternalControlTowerTable'
import {
  buildControlTowerSummary,
  compareControlTowerTenants,
  finalizeControlTowerTenant,
  formatInteger,
  formatPercent,
  formatRelativeDate,
  getOtdTone
} from '../internal/dashboard/helpers'

type StatusFilter = 'all' | 'active' | 'onboarding' | 'attention' | 'inactive'

type Props = {
  access: AdminAccessOverview
  tenants: AdminTenantsOverview
  controlTower: InternalDashboardOverview
}

const exportToCsv = (rows: ReturnType<typeof finalizeControlTowerTenant>[]) => {
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

type DomainCardData = {
  title: string
  stats: string
  avatarIcon: string
  color: 'primary' | 'info' | 'success' | 'warning' | 'error' | 'secondary'
  trendNumber: number
  trendLabel: string
  href: string
}

const AdminCenterView = ({ access, tenants, controlTower }: Props) => {
  const router = useRouter()
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
        [tenant.clientName, tenant.primaryContactEmail || '', tenant.capabilityCodes.join(' ')]
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

  const activeUsersRate = summary.totalUsers > 0 ? (summary.activeUsers / summary.totalUsers) * 100 : 0
  const pendingUsersRate = summary.totalUsers > 0 ? (summary.invitedUsers / summary.totalUsers) * 100 : 0
  const globalOtdTone = getOtdTone(summary.avgOnTimePct)

  /* ── KPI cards (HorizontalWithSubtitle) ── */
  const kpiCards = [
    {
      title: GH_INTERNAL_MESSAGES.internal_dashboard_clients,
      stats: formatInteger(controlTower.totals.totalClients),
      avatarIcon: 'tabler-building-community',
      avatarColor: 'primary' as const,
      trend: summary.newClientsThisMonth > 0 ? ('positive' as const) : ('neutral' as const),
      trendNumber: formatInteger(summary.newClientsThisMonth),
      subtitle: `${formatInteger(summary.activeClients)} activos hoy`,
      footer:
        summary.newClientsThisMonth > 0
          ? `${formatInteger(summary.newClientsThisMonth)} nuevos este mes.`
          : GH_INTERNAL_MESSAGES.internal_dashboard_no_new_clients
    },
    {
      title: GH_INTERNAL_MESSAGES.internal_dashboard_active_users,
      stats: formatInteger(summary.activeUsers),
      avatarIcon: 'tabler-user-check',
      avatarColor: 'success' as const,
      trend: activeUsersRate < 20 ? ('negative' as const) : ('positive' as const),
      trendNumber: `${Math.round(activeUsersRate)}%`,
      subtitle: GH_INTERNAL_MESSAGES.internal_dashboard_active_subtitle(summary.activeUsers, summary.totalUsers),
      statusLabel:
        activeUsersRate < 20
          ? GH_INTERNAL_MESSAGES.internal_dashboard_active_status_low
          : GH_INTERNAL_MESSAGES.internal_dashboard_active_status_healthy,
      statusColor: activeUsersRate < 20 ? ('warning' as const) : ('success' as const),
      footer: GH_INTERNAL_MESSAGES.internal_dashboard_active_footer
    },
    {
      title: GH_INTERNAL_MESSAGES.internal_dashboard_pending_users,
      stats: formatInteger(summary.invitedUsers),
      avatarIcon: 'tabler-user-search',
      avatarColor: 'warning' as const,
      trend: pendingUsersRate > 80 ? ('negative' as const) : ('neutral' as const),
      trendNumber: `${Math.round(pendingUsersRate)}%`,
      subtitle: GH_INTERNAL_MESSAGES.internal_dashboard_pending_subtitle,
      statusLabel:
        pendingUsersRate > 80
          ? GH_INTERNAL_MESSAGES.internal_dashboard_pending_status_risk
          : GH_INTERNAL_MESSAGES.internal_dashboard_pending_status_ok,
      statusColor: pendingUsersRate > 80 ? ('error' as const) : ('warning' as const),
      footer: GH_INTERNAL_MESSAGES.internal_dashboard_pending_footer
    },
    {
      title: GH_INTERNAL_MESSAGES.internal_dashboard_internal_admins,
      stats: formatInteger(summary.internalAdmins),
      avatarIcon: 'tabler-shield-lock',
      avatarColor: 'info' as const,
      trend: 'neutral' as const,
      trendNumber: formatInteger(summary.internalAdmins),
      subtitle: GH_INTERNAL_MESSAGES.internal_dashboard_admins_subtitle,
      footer: GH_INTERNAL_MESSAGES.internal_dashboard_admins_footer
    },
    {
      title: GH_INTERNAL_MESSAGES.internal_dashboard_spaces_without_activity,
      stats: formatInteger(summary.spacesWithoutActivity),
      avatarIcon: 'tabler-alert-triangle',
      avatarColor: 'error' as const,
      trend: summary.spacesWithoutActivity > 0 ? ('negative' as const) : ('positive' as const),
      trendNumber: formatInteger(summary.attentionCount),
      subtitle: GH_INTERNAL_MESSAGES.internal_dashboard_spaces_without_activity_subtitle,
      statusLabel:
        summary.spacesWithoutActivity > 0
          ? GH_INTERNAL_MESSAGES.internal_dashboard_spaces_without_activity_status_alert
          : GH_INTERNAL_MESSAGES.internal_dashboard_spaces_without_activity_status_clear,
      statusColor: summary.spacesWithoutActivity > 0 ? ('error' as const) : ('success' as const),
      footer: GH_INTERNAL_MESSAGES.internal_dashboard_spaces_without_activity_footer
    },
    {
      title: GH_INTERNAL_MESSAGES.internal_dashboard_global_otd,
      stats: formatPercent(summary.avgOnTimePct),
      avatarIcon: 'tabler-target-arrow',
      avatarColor: globalOtdTone === 'default' ? ('secondary' as const) : globalOtdTone,
      trend:
        summary.avgOnTimePct === null ? ('neutral' as const) : summary.avgOnTimePct >= 90 ? ('positive' as const) : summary.avgOnTimePct >= 70 ? ('neutral' as const) : ('negative' as const),
      trendNumber: formatInteger(summary.trackedOtdProjects),
      subtitle: GH_INTERNAL_MESSAGES.internal_dashboard_global_subtitle,
      statusLabel:
        summary.avgOnTimePct === null
          ? GH_INTERNAL_MESSAGES.internal_dashboard_otd_status_empty
          : summary.avgOnTimePct >= 90
            ? GH_INTERNAL_MESSAGES.internal_dashboard_otd_status_healthy
            : summary.avgOnTimePct >= 70
              ? GH_INTERNAL_MESSAGES.internal_dashboard_otd_status_watch
              : GH_INTERNAL_MESSAGES.internal_dashboard_otd_status_alert,
      statusColor: globalOtdTone,
      footer: GH_INTERNAL_MESSAGES.internal_dashboard_otd_footer(summary.trackedOtdProjects)
    }
  ]

  /* ── Domain navigation cards (HorizontalWithBorder) ── */
  const domainCards: DomainCardData[] = [
    {
      title: 'Spaces',
      stats: String(tenants.totals.activeTenants),
      avatarIcon: 'tabler-grid-4x4',
      color: 'primary',
      trendNumber: tenants.totals.tenantsWithScopedProjects,
      trendLabel: 'con proyectos en scope',
      href: '/admin/tenants'
    },
    {
      title: 'Identity & Access',
      stats: String(access.totals.activeUsers),
      avatarIcon: 'tabler-shield-lock',
      color: 'info',
      trendNumber: access.totals.invitedUsers,
      trendLabel: 'pendientes de activacion',
      href: '/admin/users'
    },
    {
      title: 'Delivery',
      stats: 'Activo',
      avatarIcon: 'tabler-mail-bolt',
      color: 'success',
      trendNumber: 0,
      trendLabel: 'alertas en delivery',
      href: '/admin/email-delivery'
    },
    {
      title: 'AI Governance',
      stats: 'Dual',
      avatarIcon: 'tabler-robot',
      color: 'warning',
      trendNumber: 0,
      trendLabel: 'wallets activas',
      href: '/admin/ai-tools'
    },
    {
      title: 'Cloud & Integrations',
      stats: 'Syncs',
      avatarIcon: 'tabler-plug-connected',
      color: 'error',
      trendNumber: 0,
      trendLabel: 'alertas de integracion',
      href: '/admin/cloud-integrations'
    },
    {
      title: 'Ops Health',
      stats: 'Runtime',
      avatarIcon: 'tabler-activity-heartbeat',
      color: 'secondary',
      trendNumber: 0,
      trendLabel: 'handlers degradados',
      href: '/admin/ops-health'
    }
  ]

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
            <Typography variant='body2' color='text.secondary'>
              {GH_INTERNAL_MESSAGES.internal_dashboard_summary(
                summary.activeClients,
                summary.invitedUsers,
                formatRelativeDate(summary.lastActivityAt)
              )}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button component={Link} href='/admin/tenants' variant='contained'>
                Abrir Spaces
              </Button>
              <Button component={Link} href='/admin/cloud-integrations' variant='outlined'>
                Ver Cloud & Integrations
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* ── KPIs ── */}
      <SectionErrorBoundary
        sectionName='admin-center-kpis'
        title={GH_INTERNAL_MESSAGES.internal_dashboard_kpis_error_title}
        description={GH_INTERNAL_MESSAGES.internal_dashboard_kpis_error_description}
      >
        <Grid container spacing={6}>
          {kpiCards.map(card => (
            <Grid key={card.title} size={{ xs: 12, sm: 6, xl: 4 }}>
              <HorizontalWithSubtitle {...card} />
            </Grid>
          ))}
        </Grid>
      </SectionErrorBoundary>

      {/* ── Torre de control (Spaces health table) ── */}
      <SectionErrorBoundary
        sectionName='admin-center-control-tower'
        title={GH_INTERNAL_MESSAGES.internal_dashboard_table_error_title}
        description={GH_INTERNAL_MESSAGES.internal_dashboard_table_error_description}
      >
        <ExecutiveCardShell
          title='Torre de control'
          subtitle={GH_INTERNAL_MESSAGES.internal_dashboard_table_subtitle}
          action={
            <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap'>
              {summary.attentionCount > 0 ? (
                <Button
                  variant='tonal'
                  color='error'
                  size='small'
                  startIcon={<i className='tabler-alert-triangle' />}
                  onClick={() => setStatusFilter('attention')}
                >
                  {GH_INTERNAL_MESSAGES.internal_dashboard_requires_attention(summary.attentionCount)}
                </Button>
              ) : null}
              {summary.onboardingCount > 0 ? (
                <Button
                  variant='tonal'
                  color='warning'
                  size='small'
                  startIcon={<i className='tabler-rocket' />}
                  onClick={() => setStatusFilter('onboarding')}
                >
                  {GH_INTERNAL_MESSAGES.internal_dashboard_onboarding(summary.onboardingCount)}
                </Button>
              ) : null}
              {summary.inactiveCount > 0 ? (
                <Button
                  variant='tonal'
                  color='secondary'
                  size='small'
                  startIcon={<i className='tabler-moon-stars' />}
                  onClick={() => setStatusFilter('inactive')}
                >
                  {GH_INTERNAL_MESSAGES.internal_dashboard_inactive(summary.inactiveCount)}
                </Button>
              ) : null}
              <Button
                variant='tonal'
                color='secondary'
                size='small'
                startIcon={<i className='tabler-upload' />}
                onClick={() => exportToCsv(filteredTenants)}
              >
                {GH_INTERNAL_MESSAGES.internal_dashboard_export}
              </Button>
            </Stack>
          }
        >
          <InternalControlTowerTable
            rows={filteredTenants}
            totalRows={ctTenants.length}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
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
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }
          }}
        >
          {domainCards.map(card => (
            <HorizontalWithBorder
              key={card.title}
              title={card.title}
              stats={card.stats}
              avatarIcon={card.avatarIcon}
              color={card.color}
              trendNumber={card.trendNumber}
              trendLabel={card.trendLabel}
              onClick={() => router.push(card.href)}
            />
          ))}
        </Box>
      </ExecutiveCardShell>
    </Stack>
  )
}

export default AdminCenterView
