'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import MuiLink from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import { GH_CLIENT_NAV, GH_LABELS, GH_MESSAGES } from '@/config/greenhouse-nomenclature'
import { EmptyState, ExecutiveCardShell, SectionErrorBoundary, TeamCapacitySection } from '@/components/greenhouse'
import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'
import type { TeamMembersPayload } from '@/types/team'
import ClientAttentionProjectsAccordion from '@views/greenhouse/dashboard/ClientAttentionProjectsAccordion'
import ClientDashboardHero from '@views/greenhouse/dashboard/ClientDashboardHero'
import ClientAiCreditsSection from '@views/greenhouse/dashboard/ClientAiCreditsSection'
import ClientEcosystemSection from '@views/greenhouse/dashboard/ClientEcosystemSection'
import ClientPortfolioHealthAccordion from '@views/greenhouse/dashboard/ClientPortfolioHealthAccordion'
import DashboardKpiCard from '@views/greenhouse/dashboard/DashboardKpiCard'
import DashboardRequestDialog from '@views/greenhouse/dashboard/DashboardRequestDialog'
import {
  createClientOtdTrendOptions,
  createClientStatusDonutOptions,
  createProjectRpaOptions,
  createWeeklyCadenceOptions
} from '@views/greenhouse/dashboard/chart-options'
import { buildModuleBadges } from '@views/greenhouse/dashboard/config'
import {
  formatDecimal,
  formatInteger,
  formatPercent,
  formatRelativeDate,
  formatTrendValue,
  formatUpdatedAt,
  getOtdStatus,
  getRelationshipSummary,
  getReviewStatus,
  getRpaStatus,
  getTrend
} from '@views/greenhouse/dashboard/helpers'

type GreenhouseDashboardProps = {
  clientName: string
  data: GreenhouseDashboardData
  teamMembersData?: TeamMembersPayload | null
}

const GreenhouseDashboard = ({ clientName, data, teamMembersData = null }: GreenhouseDashboardProps) => {
  const theme = useTheme()
  const [requestIntent, setRequestIntent] = useState<string | null>(null)

  const latestQualitySignal = data.qualitySignals[data.qualitySignals.length - 1] || null
  const previousQualitySignal = data.qualitySignals[data.qualitySignals.length - 2] || null
  const latestMonthlyDelivery = data.charts.monthlyDelivery[data.charts.monthlyDelivery.length - 1] || null
  const previousMonthlyDelivery = data.charts.monthlyDelivery[data.charts.monthlyDelivery.length - 2] || null
  const latestWeeklyCadenceCount = data.charts.deliveryCadenceWeekly.filter(item => item.completed > 0).length

  const statusMix = useMemo(
    () => data.charts.statusMix.filter(item => ['active', 'review', 'changes', 'completed'].includes(item.key)),
    [data.charts.statusMix]
  )

  const statusMixOptions = createClientStatusDonutOptions(theme, {
    ...data,
    charts: {
      ...data.charts,
      statusMix
    }
  })

  const weeklyCadenceOptions = createWeeklyCadenceOptions(theme, data)
  const projectRpaOptions = createProjectRpaOptions(theme)
  const otdTrendOptions = createClientOtdTrendOptions(theme, data)

  const heroSubtitle = `${GH_MESSAGES.hero_activity_prefix}: ${formatRelativeDate(data.scope.lastActivityAt)}. ${GH_MESSAGES.hero_active_projects(
    data.scope.projectCount
  )} ${getRelationshipSummary(data.relationship.months)}`

  const rpaStatus = getRpaStatus(latestQualitySignal?.avgRpa ?? null)
  const otdStatus = getOtdStatus(data.summary.avgOnTimePct)
  const reviewStatus = getReviewStatus(data.summary.reviewPressureTasks, data.summary.openFrameComments)
  const moduleBadges = buildModuleBadges(data)

  const donutSeries = statusMix.map(item => item.value)
  const cadenceSeries = [{ name: GH_LABELS.kpi_completed, data: data.charts.deliveryCadenceWeekly.map(item => item.completed) }]

  const projectRpaSeries = [
    {
      name: 'RpA',
      data: data.charts.projectRpa.map(item => ({
        x: item.projectName,
        y: item.avgRpa ?? 0
      }))
    }
  ]

  const otdTrendSeries = [{ name: 'OTD%', data: data.charts.monthlyDelivery.map(item => item.onTimePct ?? 0) }]

  return (
    <>
      <Stack spacing={6}>
        <SectionErrorBoundary sectionName='dashboard-hero' description='Intenta de nuevo en unos segundos.'>
          <ClientDashboardHero
            clientName={clientName}
            subtitle={heroSubtitle}
            badges={moduleBadges}
            updatedAtLabel={formatUpdatedAt(data.scope.lastSyncedAt)}
          />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName='dashboard-kpis' description='No pudimos cargar los KPI del dashboard.'>
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, minmax(0, 1fr))',
                xl: 'repeat(4, minmax(0, 1fr))'
              }
            }}
          >
            <DashboardKpiCard
              title={GH_LABELS.kpi_rpa}
              stats={latestQualitySignal?.avgRpa != null ? formatDecimal(latestQualitySignal.avgRpa) : '0'}
              avatarIcon='tabler-git-pull-request'
              avatarColor='primary'
              trend={getTrend(latestQualitySignal?.avgRpa ?? null, previousQualitySignal?.avgRpa ?? null)}
              trendNumber={formatTrendValue(latestQualitySignal?.avgRpa ?? null, previousQualitySignal?.avgRpa ?? null)}
              subtitle={GH_MESSAGES.dashboard_kpi_rpa_subtitle}
              titleTooltip={GH_MESSAGES.tooltip_rpa}
              footer={latestQualitySignal?.avgRpa != null ? `${latestQualitySignal.label}.` : GH_MESSAGES.dashboard_kpi_monthly_empty}
              statusLabel={rpaStatus.label}
              statusColor={rpaStatus.tone}
              statusIcon={rpaStatus.icon}
            />

            <DashboardKpiCard
              title={GH_LABELS.kpi_completed}
              stats={formatInteger(data.summary.completedLast30Days)}
              avatarIcon='tabler-checkup-list'
              avatarColor='success'
              trend={getTrend(latestMonthlyDelivery?.totalDeliverables ?? null, previousMonthlyDelivery?.totalDeliverables ?? null)}
              trendNumber={formatTrendValue(latestMonthlyDelivery?.totalDeliverables ?? null, previousMonthlyDelivery?.totalDeliverables ?? null)}
              subtitle={GH_MESSAGES.dashboard_kpi_completed_subtitle}
              titleTooltip={GH_MESSAGES.dashboard_kpi_completed_tooltip}
              footer={
                data.summary.completedLast30Days > 0
                  ? GH_MESSAGES.dashboard_kpi_completed_footer_active
                  : GH_MESSAGES.dashboard_kpi_monthly_empty
              }
              statusLabel={
                data.summary.completedLast30Days > 0
                  ? GH_MESSAGES.dashboard_kpi_completed_status_active
                  : GH_MESSAGES.dashboard_kpi_completed_status_empty
              }
              statusColor={data.summary.completedLast30Days > 0 ? 'info' : 'default'}
              statusIcon={data.summary.completedLast30Days > 0 ? 'tabler-activity' : 'tabler-circle-dashed'}
            />

            <DashboardKpiCard
              title={GH_LABELS.kpi_otd}
              stats={formatPercent(data.summary.avgOnTimePct)}
              avatarIcon='tabler-clock-check'
              avatarColor='warning'
              trend={getTrend(latestMonthlyDelivery?.onTimePct ?? null, previousMonthlyDelivery?.onTimePct ?? null)}
              trendNumber={formatTrendValue(latestMonthlyDelivery?.onTimePct ?? null, previousMonthlyDelivery?.onTimePct ?? null, '%')}
              subtitle={GH_MESSAGES.dashboard_kpi_otd_subtitle}
              titleTooltip={GH_MESSAGES.tooltip_otd}
              footer={data.summary.avgOnTimePct > 0 ? GH_MESSAGES.dashboard_kpi_otd_footer : GH_MESSAGES.dashboard_kpi_monthly_empty}
              statusLabel={otdStatus.label}
              statusColor={otdStatus.tone}
              statusIcon={otdStatus.icon}
            />

            <DashboardKpiCard
              title={GH_LABELS.kpi_feedback}
              stats={formatInteger(data.summary.reviewPressureTasks)}
              avatarIcon='tabler-message-circle'
              avatarColor='info'
              trend='neutral'
              trendNumber='0'
              subtitle={GH_MESSAGES.dashboard_kpi_feedback_subtitle}
              titleTooltip={GH_MESSAGES.dashboard_kpi_feedback_tooltip}
              footer={GH_MESSAGES.dashboard_kpi_feedback_footer(data.summary.openFrameComments)}
              statusLabel={reviewStatus.label}
              statusColor={reviewStatus.tone}
              statusIcon={reviewStatus.icon}
            />
          </Box>
        </SectionErrorBoundary>

        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              xl: 'repeat(2, minmax(0, 1fr))'
            }
          }}
        >
          <SectionErrorBoundary sectionName='chart-status' description='No pudimos cargar la distribucion por estado.'>
            <ExecutiveCardShell title={GH_LABELS.chart_status} subtitle={GH_MESSAGES.chart_status_subtitle}>
              {donutSeries.reduce((sum, value) => sum + value, 0) === 0 ? (
                <EmptyState
                  icon='tabler-chart-donut-3'
                  title={GH_MESSAGES.chart_empty_title}
                  description={GH_MESSAGES.chart_empty_description}
                />
              ) : (
                <Box aria-label='Grafico de distribucion de assets por estado'>
                  <AppReactApexCharts type='donut' height={320} width='100%' series={donutSeries} options={statusMixOptions} />
                </Box>
              )}
            </ExecutiveCardShell>
          </SectionErrorBoundary>

          <SectionErrorBoundary sectionName='chart-cadence' description='No pudimos cargar la cadencia de deliveries.'>
            <ExecutiveCardShell title={GH_MESSAGES.chart_cadence_title} subtitle={GH_MESSAGES.chart_cadence_subtitle}>
              {latestWeeklyCadenceCount < 2 ? (
                <EmptyState
                  icon='tabler-chart-histogram'
                  title={GH_MESSAGES.chart_empty_title}
                  description={GH_MESSAGES.chart_empty_description}
                />
              ) : (
                <Box aria-label='Grafico de assets completados por semana en los ultimos 3 meses'>
                  <AppReactApexCharts type='bar' height={320} width='100%' series={cadenceSeries} options={weeklyCadenceOptions} />
                </Box>
              )}
            </ExecutiveCardShell>
          </SectionErrorBoundary>

          <SectionErrorBoundary sectionName='chart-rpa-project' description='No pudimos cargar el RpA por proyecto.'>
            <ExecutiveCardShell title={GH_LABELS.chart_rpa} subtitle={GH_MESSAGES.chart_rpa_subtitle}>
              {data.charts.projectRpa.length === 0 ? (
                <EmptyState
                  icon='tabler-chart-bar'
                  title={GH_MESSAGES.chart_empty_title}
                  description={GH_MESSAGES.chart_empty_description}
                />
              ) : (
                <Box aria-label='Grafico de RpA promedio por proyecto'>
                  <AppReactApexCharts type='bar' height={320} width='100%' series={projectRpaSeries} options={projectRpaOptions} />
                </Box>
              )}
            </ExecutiveCardShell>
          </SectionErrorBoundary>

          <SectionErrorBoundary sectionName='chart-otd-trend' description='No pudimos cargar la tendencia mensual de OTD%.'>
            <ExecutiveCardShell title={GH_MESSAGES.chart_otd_title} subtitle={GH_MESSAGES.chart_otd_subtitle}>
              {data.charts.monthlyDelivery.filter(item => item.onTimePct !== null).length < 2 ? (
                <EmptyState
                  icon='tabler-chart-line'
                  title={GH_MESSAGES.chart_empty_title}
                  description={GH_MESSAGES.chart_empty_description}
                />
              ) : (
                <Box aria-label='Grafico de tendencia mensual de OTD%'>
                  <AppReactApexCharts type='line' height={320} width='100%' series={otdTrendSeries} options={otdTrendOptions} />
                </Box>
              )}
            </ExecutiveCardShell>
          </SectionErrorBoundary>
        </Box>

        <SectionErrorBoundary sectionName='team-capacity' description='No pudimos cargar la seccion de equipo.'>
          <TeamCapacitySection initialData={teamMembersData} dashboardData={data} />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName='ecosystem' description='No pudimos cargar la seccion de ecosistema.'>
          <ClientEcosystemSection tooling={data.tooling} onRequest={setRequestIntent} />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName='ai-credits' description='No pudimos cargar los créditos AI.'>
          <ClientAiCreditsSection />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName='portfolio-health' description='No pudimos cargar la salud del portafolio.'>
          <ClientPortfolioHealthAccordion data={data} />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName='attention-projects' description='No pudimos cargar los proyectos bajo atencion.'>
          <ClientAttentionProjectsAccordion projects={data.projects} />
        </SectionErrorBoundary>

        <Box
          component='footer'
          sx={{
            pt: 2,
            pb: 4,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          <Typography variant='body2' color='text.disabled'>
            {GH_MESSAGES.footer}
          </Typography>
          <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
            <MuiLink component={Link} href='/home' color='text.secondary' underline='hover'>
              {GH_CLIENT_NAV.dashboard.label}
            </MuiLink>
            <MuiLink component={Link} href='/proyectos' color='text.secondary' underline='hover'>
              {GH_CLIENT_NAV.projects.label}
            </MuiLink>
            <MuiLink component={Link} href='/sprints' color='text.secondary' underline='hover'>
              {GH_CLIENT_NAV.sprints.label}
            </MuiLink>
            <MuiLink component={Link} href='/settings' color='text.secondary' underline='hover'>
              {GH_CLIENT_NAV.settings.label}
            </MuiLink>
            <MuiLink component={Link} href='/updates' color='text.secondary' underline='hover'>
              {GH_CLIENT_NAV.updates.label}
            </MuiLink>
          </Stack>
        </Box>
      </Stack>

      <DashboardRequestDialog open={requestIntent !== null} intent={requestIntent} onClose={() => setRequestIntent(null)} />
    </>
  )
}

export default GreenhouseDashboard
