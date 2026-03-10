'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import {
  ExecutiveCardShell,
  ExecutiveHeroCard,
  ExecutiveMiniStatCard,
  MetricList
} from '@/components/greenhouse'
import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'
import AccountTeamSection from '@views/greenhouse/dashboard/AccountTeamSection'
import AttentionProjectsTable from '@views/greenhouse/dashboard/AttentionProjectsTable'
import {
  createEffortMixOptions,
  createOnTimeOptions,
  createStatusMixOptions,
  createThroughputOptions
} from '@views/greenhouse/dashboard/chart-options'
import DeliverySignalsSection from '@views/greenhouse/dashboard/DeliverySignalsSection'
import PortfolioHealthCard from '@views/greenhouse/dashboard/PortfolioHealthCard'
import QualitySignalsSection from '@views/greenhouse/dashboard/QualitySignalsSection'
import ThroughputOverviewCard from '@views/greenhouse/dashboard/ThroughputOverviewCard'
import ToolingSection from '@views/greenhouse/dashboard/ToolingSection'
import { formatDelta } from '@views/greenhouse/dashboard/config'
import { buildExecutiveDashboardLayout } from '@views/greenhouse/dashboard/orchestrator'

type GreenhouseDashboardProps = {
  data: GreenhouseDashboardData
}

const GreenhouseDashboard = ({ data }: GreenhouseDashboardProps) => {
  const theme = useTheme()
  const layout = buildExecutiveDashboardLayout(data)

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
  const riskProjects = data.projects.slice(0, 5)

  const hasBlock = (key: (typeof layout.blocks)[number]) => layout.blocks.includes(key)

  return (
    <Stack spacing={6}>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.75fr) minmax(320px, 1fr)' },
          alignItems: 'stretch'
        }}
      >
        <ExecutiveHeroCard {...layout.hero} />

        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: '1fr' } }}>
          {layout.topStats.map(card => (
            <ExecutiveMiniStatCard
              key={card.key}
              eyebrow={card.eyebrow}
              tone={card.tone}
              title={card.title}
              value={card.value}
              detail={card.detail}
              supportItems={card.supportItems}
            />
          ))}
        </Box>
      </Box>

      {layout.focusCards.length > 0 ? (
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', md: `repeat(${Math.min(layout.focusCards.length, 3)}, minmax(0, 1fr))` }
          }}
        >
          {layout.focusCards.map(card => (
            <ExecutiveMiniStatCard
              key={card.key}
              eyebrow={card.eyebrow}
              tone={card.tone}
              title={card.title}
              value={card.value}
              detail={card.detail}
            />
          ))}
        </Box>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        {layout.kpiCards.map(card => (
          <ExecutiveMiniStatCard
            key={card.key}
            eyebrow={card.eyebrow}
            tone={card.tone}
            title={card.title}
            value={card.value}
            detail={card.detail}
          />
        ))}
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.25fr 1fr' } }}>
        <ThroughputOverviewCard
          data={data}
          title={layout.themeCopy.throughputTitle}
          subtitle={layout.themeCopy.throughputDescription}
          series={throughputSeries}
          options={throughputOptions}
          netFlowLabel={`Flujo neto 30d: ${formatDelta(data.summary.netFlowLast30Days)}`}
        />
        <PortfolioHealthCard data={data} options={onTimeOptions} />
      </Box>

      {hasBlock('delivery') ? <DeliverySignalsSection data={data} /> : null}

      {hasBlock('quality') ? <QualitySignalsSection data={data} /> : null}

      {hasBlock('accountTeam') ? <AccountTeamSection data={data} /> : null}

      {hasBlock('tooling') ? <ToolingSection data={data} /> : null}

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.1fr 0.9fr' } }}>
        <ExecutiveCardShell title={layout.themeCopy.statusMixTitle} subtitle={layout.themeCopy.statusMixDescription}>
          <AppReactApexCharts type='bar' height={320} width='100%' series={statusMixSeries} options={statusMixOptions} />
        </ExecutiveCardShell>

        <ExecutiveCardShell title={layout.themeCopy.effortMixTitle} subtitle={layout.themeCopy.effortMixDescription}>
          <Stack spacing={3}>
            <AppReactApexCharts type='donut' height={300} width='100%' series={effortMixSeries} options={effortMixOptions} />
            <MetricList
              items={[
                {
                  label: 'Trabajo activo',
                  value: String(data.summary.activeWorkItems),
                  detail: 'Incluye ejecucion, revision, cambios y tareas bloqueadas.'
                },
                {
                  label: 'Trabajo en cola',
                  value: String(data.summary.queuedWorkItems),
                  detail: 'Demanda lista para entrar a la operacion.'
                }
              ]}
            />
          </Stack>
        </ExecutiveCardShell>
      </Box>

      <AttentionProjectsTable
        projects={riskProjects}
        title={layout.themeCopy.projectsTitle}
        subtitle={layout.themeCopy.projectsDescription}
      />

      <Typography variant='body2' color='text.secondary'>
        Nota operativa: los tiempos de ejecucion, revision y cambios existen en Notion, pero hoy no vienen en formato
        numerico confiable. Esta iteracion prioriza jerarquia ejecutiva reusable sobre throughput, salud on-time, friccion
        y mezcla de demanda.
      </Typography>
    </Stack>
  )
}

export default GreenhouseDashboard
