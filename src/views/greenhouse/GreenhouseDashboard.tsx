'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { ChipGroup, MetricList, MetricStatCard, SectionHeading } from '@/components/greenhouse'
import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'
import AccountTeamSection from '@views/greenhouse/dashboard/AccountTeamSection'
import AttentionProjectCard from '@views/greenhouse/dashboard/AttentionProjectCard'
import {
  createEffortMixOptions,
  createOnTimeOptions,
  createStatusMixOptions,
  createThroughputOptions
} from '@views/greenhouse/dashboard/chart-options'
import DeliverySignalsSection from '@views/greenhouse/dashboard/DeliverySignalsSection'
import QualitySignalsSection from '@views/greenhouse/dashboard/QualitySignalsSection'
import ToolingSection from '@views/greenhouse/dashboard/ToolingSection'
import {
  buildModuleBadges,
  buildModuleFocusCards,
  buildThemeCopy,
  formatDelta,
  formatSyncedAt,
  hasAccountTeam,
  hasMonthlyDeliverySignals,
  hasQualitySignals,
  hasTooling,
  resolveDashboardTheme
} from '@views/greenhouse/dashboard/config'

type GreenhouseDashboardProps = {
  data: GreenhouseDashboardData
}

const GreenhouseDashboard = ({ data }: GreenhouseDashboardProps) => {
  const theme = useTheme()
  const dashboardTheme = resolveDashboardTheme(data)
  const themeCopy = buildThemeCopy(dashboardTheme)
  const moduleBadges = buildModuleBadges(data)
  const moduleFocusCards = buildModuleFocusCards(data, dashboardTheme)
  const syncedAtLabel = formatSyncedAt(data.scope.lastSyncedAt)
  const riskProjects = data.projects.slice(0, 5)

  const throughputOptions = createThroughputOptions(theme, data)
  const statusMixOptions = createStatusMixOptions(theme, data)
  const effortMixOptions = createEffortMixOptions(data)
  const onTimeOptions = createOnTimeOptions(theme)

  const throughputSeries = [
    {
      name: 'Creadas',
      data: data.charts.throughput.map(item => item.created)
    },
    {
      name: 'Entregadas',
      data: data.charts.throughput.map(item => item.completed)
    }
  ]

  const statusMixSeries = [{ data: data.charts.statusMix.map(item => item.value) }]
  const effortMixSeries = data.charts.effortMix.map(item => item.value)

  const latestMonthlyDelivery = data.charts.monthlyDelivery[data.charts.monthlyDelivery.length - 1] || null
  const totalDeliverablesVisible = data.charts.monthlyDelivery.reduce((sum, item) => sum + item.totalDeliverables, 0)

  const totalDeliverablesWithoutAdjustments = data.charts.monthlyDelivery.reduce(
    (sum, item) => sum + item.withoutClientAdjustments,
    0
  )

  const noAdjustmentRate =
    totalDeliverablesVisible > 0 ? Math.round((totalDeliverablesWithoutAdjustments / totalDeliverablesVisible) * 100) : 0

  const relationshipValue =
    data.relationship.startedAt !== null ? `${data.relationship.months}m ${data.relationship.days}d` : 'Sin dato'

  const relationshipStartedAtLabel = data.relationship.startedAt
    ? new Date(`${data.relationship.startedAt}T00:00:00.000Z`).toLocaleDateString('es-CL')
    : 'Pendiente de historico'

  return (
    <Stack spacing={6}>
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 4, md: 6 },
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.18)} 0%, ${alpha(
              theme.palette.success.main,
              0.12
            )} 38%, ${alpha(theme.palette.background.paper, 0)} 100%)`
          }}
        >
          <Stack spacing={2.5}>
            <Chip label={themeCopy.heroLabel} color='primary' variant='outlined' sx={{ width: 'fit-content' }} />
            <Typography variant='h3'>{themeCopy.heroTitle}</Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 860 }}>
              {themeCopy.heroDescription} Alcance visible: {data.scope.projectCount} proyectos. Ultima sincronizacion:{' '}
              {syncedAtLabel}.
            </Typography>
            <Stack direction='row' flexWrap='wrap' gap={1.5}>
              <Chip color='success' variant='tonal' label={`${data.summary.completedLast30Days} entregadas en 30 dias`} />
              <Chip color='warning' variant='tonal' label={`${data.summary.reviewPressureTasks} con friccion de revision`} />
              <Chip color='error' variant='tonal' label={`${data.summary.projectsAtRisk} proyectos bajo observacion`} />
            </Stack>
            <ChipGroup items={moduleBadges} emptyLabel='Portfolio general' />
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            md: moduleFocusCards.length > 1 ? `repeat(${Math.min(moduleFocusCards.length, 3)}, minmax(0, 1fr))` : '1fr'
          }
        }}
      >
        {moduleFocusCards.map(card => (
          <MetricStatCard
            key={card.key}
            chipLabel={card.eyebrow}
            chipTone={card.tone}
            title={card.title}
            value={card.value}
            detail={card.detail}
          />
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        {data.kpis.map(kpi => (
          <MetricStatCard
            key={kpi.label}
            chipLabel={kpi.label}
            chipTone={kpi.tone}
            value={kpi.value}
            detail={kpi.detail}
          />
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }
        }}
      >
        <MetricStatCard
          chipLabel='Relacion activa'
          chipTone='info'
          title='Tiempo compartido'
          value={relationshipValue}
          detail={
            data.relationship.startedAt
              ? `${data.relationship.label} Inicio visible: ${relationshipStartedAtLabel}.`
              : 'Aun no hay una primera actividad visible para calcular tenure.'
          }
        />
        <MetricStatCard
          chipLabel='On-time mensual'
          chipTone={
            latestMonthlyDelivery?.onTimePct === null
              ? 'info'
              : (latestMonthlyDelivery?.onTimePct ?? 0) >= 75
                ? 'success'
                : 'warning'
          }
          title='Ultimo mes con actividad'
          value={latestMonthlyDelivery?.onTimePct !== null ? `${latestMonthlyDelivery?.onTimePct}%` : 'Sin dato'}
          detail={
            latestMonthlyDelivery
              ? `Base mensual agrupada por fecha de creacion en ${latestMonthlyDelivery.label}.`
              : 'Todavia no hay meses con entregables visibles en el alcance actual.'
          }
        />
        <MetricStatCard
          chipLabel='Sin ajustes cliente'
          chipTone={
            totalDeliverablesVisible === 0 ? 'info' : noAdjustmentRate >= 75 ? 'success' : noAdjustmentRate >= 50 ? 'warning' : 'error'
          }
          title='Primera pasada visible'
          value={`${noAdjustmentRate}%`}
          detail={`${totalDeliverablesWithoutAdjustments} de ${totalDeliverablesVisible} entregables visibles no registran ajustes cliente.`}
        />
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.6fr 1fr' } }}>
        <Card>
          <CardContent sx={{ height: '100%' }}>
            <Stack spacing={3} sx={{ height: '100%' }}>
              <SectionHeading title={themeCopy.throughputTitle} description={themeCopy.throughputDescription} />
              <AppReactApexCharts type='bar' height={330} width='100%' series={throughputSeries} options={throughputOptions} />
              <Stack direction='row' flexWrap='wrap' gap={2}>
                <Chip
                  variant='tonal'
                  color={data.summary.netFlowLast30Days >= 0 ? 'success' : 'warning'}
                  label={`Flujo neto 30 dias: ${formatDelta(data.summary.netFlowLast30Days)}`}
                />
                <Chip variant='tonal' color='info' label={`${data.summary.completionRate}% del backlog ya esta completado`} />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ height: '100%' }}>
            <Stack spacing={3} sx={{ height: '100%' }}>
              <SectionHeading
                title='Salud del portfolio'
                description='El porcentaje on-time disponible hoy es la mejor senal ejecutiva real para cartera y predictibilidad.'
              />
              <AppReactApexCharts
                type='radialBar'
                height={280}
                width='100%'
                series={[data.summary.avgOnTimePct]}
                options={onTimeOptions}
              />
              <MetricList
                items={[
                  {
                    label: 'Proyectos saludables',
                    value: String(data.summary.healthyProjects),
                    detail: 'Portafolio con 75% o mas de cumplimiento on-time'
                  },
                  {
                    label: 'Proyectos bajo observacion',
                    value: String(data.summary.projectsAtRisk),
                    detail: 'Cumplimiento menor a 60% o sin dato confiable'
                  },
                  {
                    label: 'Comentarios abiertos',
                    value: String(data.summary.openFrameComments),
                    detail: 'Carga actual de feedback sin resolver en el alcance visible'
                  }
                ]}
              />
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {hasMonthlyDeliverySignals(data) ? <DeliverySignalsSection data={data} /> : null}

      {hasQualitySignals(data) ? <QualitySignalsSection data={data} /> : null}

      {hasAccountTeam(data) ? <AccountTeamSection data={data} /> : null}

      {hasTooling(data) ? <ToolingSection data={data} /> : null}

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.2fr 1fr' } }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <SectionHeading title={themeCopy.statusMixTitle} description={themeCopy.statusMixDescription} />
              <AppReactApexCharts
                type='bar'
                height={320}
                width='100%'
                series={statusMixSeries}
                options={statusMixOptions}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ height: '100%' }}>
            <Stack spacing={3} sx={{ height: '100%' }}>
              <SectionHeading title={themeCopy.effortMixTitle} description={themeCopy.effortMixDescription} />
              <AppReactApexCharts
                type='donut'
                height={320}
                width='100%'
                series={effortMixSeries}
                options={effortMixOptions}
              />
              <MetricList
                items={[
                  {
                    label: 'Trabajo activo',
                    value: String(data.summary.activeWorkItems),
                    detail: 'Incluye ejecucion, revision, cambios y tareas bloqueadas'
                  },
                  {
                    label: 'Trabajo en cola',
                    value: String(data.summary.queuedWorkItems),
                    detail: 'Demanda lista para entrar a la operacion'
                  }
                ]}
              />
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <SectionHeading title={themeCopy.projectsTitle} description={themeCopy.projectsDescription} />
            <Stack spacing={2}>
              {riskProjects.map(project => (
                <AttentionProjectCard key={project.id} project={project} />
              ))}
              {riskProjects.length === 0 ? (
                <Box sx={{ p: 4, borderRadius: 3, border: `1px dashed ${theme.palette.divider}` }}>
                  <Typography>No hay proyectos con datos suficientes para este tenant todavia.</Typography>
                </Box>
              ) : null}
            </Stack>
            <Divider />
            <Typography color='text.secondary'>
              Nota: los tiempos de ejecucion, revision y cambios existen en Notion, pero hoy no vienen en formato numerico
              confiable. Esta Fase 2 prioriza velocidad, salud on-time, friccion y mezcla de demanda.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default GreenhouseDashboard
