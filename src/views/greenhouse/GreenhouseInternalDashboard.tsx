'use client'

import { useMemo, useState } from 'react'

import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import SectionErrorBoundary from '@components/greenhouse/SectionErrorBoundary'

import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import type { InternalDashboardOverview } from '@/lib/internal/get-internal-dashboard-overview'

import InternalControlTowerTable from './internal/dashboard/InternalControlTowerTable'
import {
  buildControlTowerSummary,
  compareControlTowerTenants,
  finalizeControlTowerTenant,
  formatInteger,
  formatPercent,
  formatRelativeDate,
  getOtdTone
} from './internal/dashboard/helpers'

type StatusFilter = 'all' | 'active' | 'onboarding' | 'attention' | 'inactive'

type Props = {
  data: InternalDashboardOverview
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

const GreenhouseInternalDashboard = ({ data }: Props) => {
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const tenants = useMemo(
    () => data.clients.map(finalizeControlTowerTenant).sort(compareControlTowerTenants),
    [data.clients]
  )

  const filteredTenants = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return tenants.filter(tenant => {
      const matchesStatus = statusFilter === 'all' || tenant.statusKey === statusFilter

      const matchesSearch =
        query.length === 0 ||
        [tenant.clientName, tenant.primaryContactEmail || '', tenant.capabilityCodes.join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(query)

      return matchesStatus && matchesSearch
    })
  }, [searchValue, statusFilter, tenants])

  const summary = useMemo(
    () => buildControlTowerSummary(tenants, data.totals.internalAdmins),
    [data.totals.internalAdmins, tenants]
  )

  const activeUsersRate = summary.totalUsers > 0 ? (summary.activeUsers / summary.totalUsers) * 100 : 0
  const pendingUsersRate = summary.totalUsers > 0 ? (summary.invitedUsers / summary.totalUsers) * 100 : 0
  const globalOtdTone = getOtdTone(summary.avgOnTimePct)

  const cards = [
    {
      title: GH_INTERNAL_MESSAGES.internal_dashboard_clients,
      stats: formatInteger(data.totals.totalClients),
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

  return (
    <Stack spacing={6}>
      <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
        <div className='flex flex-col gap-2'>
          <Typography variant='h3'>{GH_INTERNAL_MESSAGES.internal_dashboard_title}</Typography>
          <Typography color='text.secondary'>
            {GH_INTERNAL_MESSAGES.internal_dashboard_summary(
              summary.activeClients,
              summary.invitedUsers,
              formatRelativeDate(summary.lastActivityAt)
            )}
          </Typography>
          <div className='flex flex-wrap gap-2'>
            {summary.attentionCount > 0 ? (
              <Button variant='tonal' color='error' startIcon={<i className='tabler-alert-triangle' />} onClick={() => setStatusFilter('attention')}>
                {GH_INTERNAL_MESSAGES.internal_dashboard_requires_attention(summary.attentionCount)}
              </Button>
            ) : null}
            {summary.onboardingCount > 0 ? (
              <Button variant='tonal' color='warning' startIcon={<i className='tabler-rocket' />} onClick={() => setStatusFilter('onboarding')}>
                {GH_INTERNAL_MESSAGES.internal_dashboard_onboarding(summary.onboardingCount)}
              </Button>
            ) : null}
            {summary.inactiveCount > 0 ? (
              <Button variant='tonal' color='secondary' startIcon={<i className='tabler-moon-stars' />} onClick={() => setStatusFilter('inactive')}>
                {GH_INTERNAL_MESSAGES.internal_dashboard_inactive(summary.inactiveCount)}
              </Button>
            ) : null}
          </div>
        </div>

        <div className='flex flex-col gap-3 sm:flex-row'>
          <Tooltip title={GH_INTERNAL_MESSAGES.internal_dashboard_create_space_tooltip}>
            <span>
              <Button variant='contained' startIcon={<i className='tabler-plus' />} disabled>
                {GH_INTERNAL_MESSAGES.internal_dashboard_create_space}
              </Button>
            </span>
          </Tooltip>
          <Button variant='tonal' color='secondary' startIcon={<i className='tabler-upload' />} onClick={() => exportToCsv(filteredTenants)}>
            {GH_INTERNAL_MESSAGES.internal_dashboard_export}
          </Button>
        </div>
      </div>

      <SectionErrorBoundary
        sectionName='control-tower-kpis'
        title={GH_INTERNAL_MESSAGES.internal_dashboard_kpis_error_title}
        description={GH_INTERNAL_MESSAGES.internal_dashboard_kpis_error_description}
      >
        <Grid container spacing={6}>
          {cards.map(card => (
            <Grid key={card.title} size={{ xs: 12, md: 6, xl: 4 }}>
              <HorizontalWithSubtitle {...card} />
            </Grid>
          ))}
        </Grid>
      </SectionErrorBoundary>

      <SectionErrorBoundary
        sectionName='control-tower-table'
        title={GH_INTERNAL_MESSAGES.internal_dashboard_table_error_title}
        description={GH_INTERNAL_MESSAGES.internal_dashboard_table_error_description}
      >
        <InternalControlTowerTable
          rows={filteredTenants}
          totalRows={tenants.length}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </SectionErrorBoundary>
    </Stack>
  )
}

export default GreenhouseInternalDashboard
