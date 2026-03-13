'use client'

import { useMemo, useState } from 'react'

import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import SectionErrorBoundary from '@components/greenhouse/SectionErrorBoundary'

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
      title: 'Clientes',
      stats: formatInteger(data.totals.totalClients),
      avatarIcon: 'tabler-building-community',
      avatarColor: 'primary' as const,
      trend: summary.newClientsThisMonth > 0 ? ('positive' as const) : ('neutral' as const),
      trendNumber: formatInteger(summary.newClientsThisMonth),
      subtitle: `${formatInteger(summary.activeClients)} activos hoy`,
      footer: summary.newClientsThisMonth > 0 ? `${formatInteger(summary.newClientsThisMonth)} nuevos este mes.` : 'Sin altas nuevas este mes.'
    },
    {
      title: 'Usuarios activos',
      stats: formatInteger(summary.activeUsers),
      avatarIcon: 'tabler-user-check',
      avatarColor: 'success' as const,
      trend: activeUsersRate < 20 ? ('negative' as const) : ('positive' as const),
      trendNumber: `${Math.round(activeUsersRate)}%`,
      subtitle: `${formatInteger(summary.activeUsers)} de ${formatInteger(summary.totalUsers)} con al menos 1 login`,
      statusLabel: activeUsersRate < 20 ? 'Activacion baja' : 'Base activa',
      statusColor: activeUsersRate < 20 ? ('warning' as const) : ('success' as const),
      footer: 'Semaforo de activacion efectiva del portal.'
    },
    {
      title: 'Pendientes de activacion',
      stats: formatInteger(summary.invitedUsers),
      avatarIcon: 'tabler-user-search',
      avatarColor: 'warning' as const,
      trend: pendingUsersRate > 80 ? ('negative' as const) : ('neutral' as const),
      trendNumber: `${Math.round(pendingUsersRate)}%`,
      subtitle: 'Usuarios invitados sin login visible',
      statusLabel: pendingUsersRate > 80 ? 'Onboarding en riesgo' : 'Bajo control',
      statusColor: pendingUsersRate > 80 ? ('error' as const) : ('warning' as const),
      footer: 'Si supera 80% hay friccion de activacion.'
    },
    {
      title: 'Admins internos',
      stats: formatInteger(summary.internalAdmins),
      avatarIcon: 'tabler-shield-lock',
      avatarColor: 'info' as const,
      trend: 'neutral' as const,
      trendNumber: formatInteger(summary.internalAdmins),
      subtitle: 'Equipo Efeonce con acceso visible',
      footer: 'Sin semaforo: sirve como control de cobertura interna.'
    },
    {
      title: 'Spaces sin actividad',
      stats: formatInteger(summary.spacesWithoutActivity),
      avatarIcon: 'tabler-alert-triangle',
      avatarColor: 'error' as const,
      trend: summary.spacesWithoutActivity > 0 ? ('negative' as const) : ('positive' as const),
      trendNumber: formatInteger(summary.attentionCount),
      subtitle: '0 scopes o sin actividad en los ultimos 30 dias',
      statusLabel: summary.spacesWithoutActivity > 0 ? 'Revisar hoy' : 'Sin alertas',
      statusColor: summary.spacesWithoutActivity > 0 ? ('error' as const) : ('success' as const),
      footer: 'Indicador directo de clientes que necesitan intervencion.'
    },
    {
      title: 'OTD global',
      stats: formatPercent(summary.avgOnTimePct),
      avatarIcon: 'tabler-target-arrow',
      avatarColor: globalOtdTone === 'default' ? ('secondary' as const) : globalOtdTone,
      trend:
        summary.avgOnTimePct === null ? ('neutral' as const) : summary.avgOnTimePct >= 90 ? ('positive' as const) : summary.avgOnTimePct >= 70 ? ('neutral' as const) : ('negative' as const),
      trendNumber: formatInteger(summary.trackedOtdProjects),
      subtitle: 'Promedio ponderado de OTD visible',
      statusLabel:
        summary.avgOnTimePct === null ? 'Sin data' : summary.avgOnTimePct >= 90 ? 'Saludable' : summary.avgOnTimePct >= 70 ? 'Bajo observacion' : 'Requiere atencion',
      statusColor: globalOtdTone,
      footer:
        summary.trackedOtdProjects > 0
          ? `${formatInteger(summary.trackedOtdProjects)} proyectos con OTD visible.`
          : 'Sin proyectos con OTD visible todavia.'
    }
  ]

  return (
    <Stack spacing={6}>
      <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
        <div className='flex flex-col gap-2'>
          <Typography variant='h3'>Control Tower</Typography>
          <Typography color='text.secondary'>
            {formatInteger(summary.activeClients)} clientes activos. {formatInteger(summary.invitedUsers)} usuarios pendientes de activacion. Ultima actividad:{' '}
            {formatRelativeDate(summary.lastActivityAt)}.
          </Typography>
          <div className='flex flex-wrap gap-2'>
            {summary.attentionCount > 0 ? (
              <Button variant='tonal' color='error' startIcon={<i className='tabler-alert-triangle' />} onClick={() => setStatusFilter('attention')}>
                {formatInteger(summary.attentionCount)} requieren atencion
              </Button>
            ) : null}
            {summary.onboardingCount > 0 ? (
              <Button variant='tonal' color='warning' startIcon={<i className='tabler-rocket' />} onClick={() => setStatusFilter('onboarding')}>
                {formatInteger(summary.onboardingCount)} en onboarding
              </Button>
            ) : null}
            {summary.inactiveCount > 0 ? (
              <Button variant='tonal' color='secondary' startIcon={<i className='tabler-moon-stars' />} onClick={() => setStatusFilter('inactive')}>
                {formatInteger(summary.inactiveCount)} inactivos
              </Button>
            ) : null}
          </div>
        </div>

        <div className='flex flex-col gap-3 sm:flex-row'>
          <Tooltip title='El flujo de creacion de spaces aun no existe como mutacion dedicada en el repo.'>
            <span>
              <Button variant='contained' startIcon={<i className='tabler-plus' />} disabled>
                Crear space
              </Button>
            </span>
          </Tooltip>
          <Button variant='tonal' color='secondary' startIcon={<i className='tabler-upload' />} onClick={() => exportToCsv(filteredTenants)}>
            Exportar
          </Button>
        </div>
      </div>

      <SectionErrorBoundary
        sectionName='control-tower-kpis'
        title='No pudimos cargar los indicadores del control tower'
        description='Reintenta la lectura de la capa ejecutiva en unos segundos.'
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
        title='No pudimos cargar la lista de clientes'
        description='Intenta de nuevo. Si persiste, revisa la consulta interna del control tower.'
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
