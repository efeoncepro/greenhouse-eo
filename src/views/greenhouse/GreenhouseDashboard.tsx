'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import MuiLink from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import { EmptyState, ExecutiveCardShell, SectionErrorBoundary } from '@/components/greenhouse'
import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'
import ClientAttentionProjectsAccordion from '@views/greenhouse/dashboard/ClientAttentionProjectsAccordion'
import ClientDashboardHero from '@views/greenhouse/dashboard/ClientDashboardHero'
import ClientEcosystemSection from '@views/greenhouse/dashboard/ClientEcosystemSection'
import ClientPortfolioHealthAccordion from '@views/greenhouse/dashboard/ClientPortfolioHealthAccordion'
import ClientTeamCapacitySection from '@views/greenhouse/dashboard/ClientTeamCapacitySection'
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
  formatUpdatedAt,
  getOtdStatus,
  getRelationshipSummary,
  getReviewStatus,
  getRpaStatus,
  getTrend,
  formatTrendValue
} from '@views/greenhouse/dashboard/helpers'

type GreenhouseDashboardProps = {
  clientName: string
  data: GreenhouseDashboardData
}

const GreenhouseDashboard = ({ clientName, data }: GreenhouseDashboardProps) => {
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

  const heroSubtitle = `Última actividad: ${formatRelativeDate(data.scope.lastActivityAt)}. ${formatInteger(
    data.scope.projectCount
  )} ${data.scope.projectCount === 1 ? 'proyecto activo.' : 'proyectos activos.'} ${getRelationshipSummary(data.relationship.months)}`

  const rpaStatus = getRpaStatus(latestQualitySignal?.avgRpa ?? null)
  const otdStatus = getOtdStatus(data.summary.avgOnTimePct)
  const reviewStatus = getReviewStatus(data.summary.reviewPressureTasks, data.summary.openFrameComments)
  const badgeLabels = buildModuleBadges(data).map(item => item.label)

  const donutSeries = statusMix.map(item => item.value)
  const cadenceSeries = [{ name: 'Piezas entregadas', data: data.charts.deliveryCadenceWeekly.map(item => item.completed) }]

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
            badges={badgeLabels}
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
              title='RpA'
              stats={latestQualitySignal?.avgRpa !== null ? formatDecimal(latestQualitySignal.avgRpa) : '0'}
              avatarIcon='tabler-git-pull-request'
              avatarColor='primary'
              trend={getTrend(latestQualitySignal?.avgRpa ?? null, previousQualitySignal?.avgRpa ?? null)}
              trendNumber={formatTrendValue(latestQualitySignal?.avgRpa ?? null, previousQualitySignal?.avgRpa ?? null)}
              subtitle='Promedio de rondas de revisión por pieza'
              titleTooltip='Rounds per Asset: cuántas veces una pieza pasa por revisión antes de ser aprobada. Meta ICO: ≤2 rondas.'
              footer={
                latestQualitySignal?.avgRpa !== null
                  ? `${latestQualitySignal.label}.`
                  : 'Aún sin actividad este mes.'
              }
              statusLabel={rpaStatus.label}
              statusColor={rpaStatus.tone}
              statusIcon={rpaStatus.icon}
            />

            <DashboardKpiCard
              title='Piezas entregadas'
              stats={formatInteger(data.summary.completedLast30Days)}
              avatarIcon='tabler-checkup-list'
              avatarColor='success'
              trend={getTrend(latestMonthlyDelivery?.totalDeliverables ?? null, previousMonthlyDelivery?.totalDeliverables ?? null)}
              trendNumber={formatTrendValue(latestMonthlyDelivery?.totalDeliverables ?? null, previousMonthlyDelivery?.totalDeliverables ?? null)}
              subtitle='Últimos 30 días'
              titleTooltip='Total de piezas que pasaron a estado "Listo" en los últimos 30 días.'
              footer={data.summary.completedLast30Days > 0 ? 'Actividad reciente visible en la cuenta.' : 'Aún sin actividad este mes.'}
              statusLabel={data.summary.completedLast30Days > 0 ? 'Actividad mensual' : 'Sin actividad este mes'}
              statusColor={data.summary.completedLast30Days > 0 ? 'info' : 'default'}
              statusIcon={data.summary.completedLast30Days > 0 ? 'tabler-activity' : 'tabler-circle-dashed'}
            />

            <DashboardKpiCard
              title='OTD%'
              stats={formatPercent(data.summary.avgOnTimePct)}
              avatarIcon='tabler-clock-check'
              avatarColor='warning'
              trend={getTrend(latestMonthlyDelivery?.onTimePct ?? null, previousMonthlyDelivery?.onTimePct ?? null)}
              trendNumber={formatTrendValue(latestMonthlyDelivery?.onTimePct ?? null, previousMonthlyDelivery?.onTimePct ?? null, '%')}
              subtitle='Entregas dentro de plazo'
              titleTooltip='On-Time Delivery: porcentaje de piezas entregadas dentro del plazo definido en el brief. Meta: ≥90%.'
              footer={data.summary.avgOnTimePct > 0 ? 'Promedio del portafolio visible.' : 'Aún sin actividad este mes.'}
              statusLabel={otdStatus.label}
              statusColor={otdStatus.tone}
              statusIcon={otdStatus.icon}
            />

            <DashboardKpiCard
              title='En revisión'
              stats={formatInteger(data.summary.reviewPressureTasks)}
              avatarIcon='tabler-message-circle'
              avatarColor='info'
              trend='neutral'
              trendNumber='0'
              subtitle='Piezas esperando tu feedback'
              titleTooltip='Piezas en estado "Listo para revisión" o con comentarios abiertos en Frame.io.'
              footer={`${formatInteger(data.summary.openFrameComments)} comentarios abiertos.`}
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
          <SectionErrorBoundary sectionName='chart-status' description='No pudimos cargar la distribución por estado.'>
            <ExecutiveCardShell title='Distribución por estado' subtitle='Tareas activas de tu cuenta'>
              {donutSeries.reduce((sum, value) => sum + value, 0) === 0 ? (
                <EmptyState
                  icon='tabler-chart-donut-3'
                  title='Aún no hay suficiente actividad'
                  description='Este gráfico necesita al menos 2 semanas de datos para ser útil.'
                />
              ) : (
                <Box aria-label='Gráfico de distribución de tareas por estado'>
                  <AppReactApexCharts type='donut' height={320} width='100%' series={donutSeries} options={statusMixOptions} />
                </Box>
              )}
            </ExecutiveCardShell>
          </SectionErrorBoundary>

          <SectionErrorBoundary sectionName='chart-cadence' description='No pudimos cargar la cadencia de entregas.'>
            <ExecutiveCardShell title='Cadencia de entregas' subtitle='Piezas completadas por semana - últimos 3 meses'>
              {latestWeeklyCadenceCount < 2 ? (
                <EmptyState
                  icon='tabler-chart-histogram'
                  title='Aún no hay suficiente actividad'
                  description='Este gráfico necesita al menos 2 semanas de datos para ser útil.'
                />
              ) : (
                <Box aria-label='Gráfico de piezas completadas por semana en los últimos 3 meses'>
                  <AppReactApexCharts type='bar' height={320} width='100%' series={cadenceSeries} options={weeklyCadenceOptions} />
                </Box>
              )}
            </ExecutiveCardShell>
          </SectionErrorBoundary>

          <SectionErrorBoundary sectionName='chart-rpa-project' description='No pudimos cargar el RpA por proyecto.'>
            <ExecutiveCardShell title='RpA por proyecto' subtitle='Línea de referencia: 2,0 (máximo ICO)'>
              {data.charts.projectRpa.length === 0 ? (
                <EmptyState
                  icon='tabler-chart-bar'
                  title='Aún no hay suficiente actividad'
                  description='Este gráfico necesita al menos 2 semanas de datos para ser útil.'
                />
              ) : (
                <Box aria-label='Gráfico de RpA promedio por proyecto'>
                  <AppReactApexCharts type='bar' height={320} width='100%' series={projectRpaSeries} options={projectRpaOptions} />
                </Box>
              )}
            </ExecutiveCardShell>
          </SectionErrorBoundary>

          <SectionErrorBoundary sectionName='chart-otd-trend' description='No pudimos cargar la tendencia mensual de OTD%.'>
            <ExecutiveCardShell title='OTD% mensual' subtitle='Tendencia de los últimos 6 meses - meta: 90%'>
              {data.charts.monthlyDelivery.filter(item => item.onTimePct !== null).length < 2 ? (
                <EmptyState
                  icon='tabler-chart-line'
                  title='Aún no hay suficiente actividad'
                  description='Este gráfico necesita al menos 2 semanas de datos para ser útil.'
                />
              ) : (
                <Box aria-label='Gráfico de tendencia mensual de OTD%'>
                  <AppReactApexCharts type='line' height={320} width='100%' series={otdTrendSeries} options={otdTrendOptions} />
                </Box>
              )}
            </ExecutiveCardShell>
          </SectionErrorBoundary>
        </Box>

        <SectionErrorBoundary sectionName='team-capacity' description='No pudimos cargar la sección de equipo.'>
          <ClientTeamCapacitySection data={data} onRequest={setRequestIntent} />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName='ecosystem' description='No pudimos cargar la sección de ecosistema.'>
          <ClientEcosystemSection tooling={data.tooling} onRequest={setRequestIntent} />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName='portfolio-health' description='No pudimos cargar la salud del portafolio.'>
          <ClientPortfolioHealthAccordion data={data} />
        </SectionErrorBoundary>

        <SectionErrorBoundary sectionName='attention-projects' description='No pudimos cargar los proyectos bajo atención.'>
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
            © 2026 Efeonce Group. Greenhouse keeps project delivery visible, measurable, and accountable.
          </Typography>
          <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
            <MuiLink component={Link} href='/dashboard' color='text.secondary' underline='hover'>
              Dashboard
            </MuiLink>
            <MuiLink component={Link} href='/proyectos' color='text.secondary' underline='hover'>
              Proyectos
            </MuiLink>
            <MuiLink component={Link} href='/sprints' color='text.secondary' underline='hover'>
              Sprints
            </MuiLink>
            <MuiLink component={Link} href='/settings' color='text.secondary' underline='hover'>
              Settings
            </MuiLink>
          </Stack>
        </Box>
      </Stack>

      <DashboardRequestDialog open={requestIntent !== null} intent={requestIntent} onClose={() => setRequestIntent(null)} />
    </>
  )
}

export default GreenhouseDashboard
