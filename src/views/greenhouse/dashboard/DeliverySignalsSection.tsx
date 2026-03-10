'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import { useTheme } from '@mui/material/styles'

import { ExecutiveCardShell, MetricList } from '@/components/greenhouse'
import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'
import { createMonthlyAdjustmentOptions, createMonthlyOnTimeOptions } from '@views/greenhouse/dashboard/chart-options'

type DeliverySignalsSectionProps = {
  data: GreenhouseDashboardData
}

const DeliverySignalsSection = ({ data }: DeliverySignalsSectionProps) => {
  const theme = useTheme()
  const monthlyOnTimeOptions = createMonthlyOnTimeOptions(theme, data)
  const monthlyAdjustmentOptions = createMonthlyAdjustmentOptions(theme, data)

  const monthlyOnTimeSeries = [
    {
      name: 'On-time',
      data: data.charts.monthlyDelivery.map(item => item.onTimePct)
    }
  ]

  const monthlyAdjustmentSeries = [
    {
      name: 'Sin ajustes cliente',
      data: data.charts.monthlyDelivery.map(item => item.withoutClientAdjustments)
    },
    {
      name: 'Con ajustes cliente',
      data: data.charts.monthlyDelivery.map(item => item.withClientAdjustments)
    }
  ]

  const latestMonthlyDelivery = data.charts.monthlyDelivery[data.charts.monthlyDelivery.length - 1] || null
  const totalDeliverablesVisible = data.charts.monthlyDelivery.reduce((sum, item) => sum + item.totalDeliverables, 0)

  const totalDeliverablesWithoutAdjustments = data.charts.monthlyDelivery.reduce(
    (sum, item) => sum + item.withoutClientAdjustments,
    0
  )

  const totalClientAdjustmentRounds = data.charts.monthlyDelivery.reduce(
    (sum, item) => sum + item.totalClientAdjustmentRounds,
    0
  )

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.25fr 1fr' } }}>
      <ExecutiveCardShell
        title='Entrega mensual visible'
        subtitle='Serie mensual de ritmo y cumplimiento sobre el alcance visible del tenant.'
      >
        <Stack spacing={3} sx={{ height: '100%' }}>
          <AppReactApexCharts type='line' height={320} width='100%' series={monthlyOnTimeSeries} options={monthlyOnTimeOptions} />
          <Stack direction='row' flexWrap='wrap' gap={2}>
            <Chip variant='tonal' color='info' label='Grano mensual: fecha de creacion' />
            <Chip
              variant='tonal'
              color={(latestMonthlyDelivery?.onTimePct ?? 0) >= 75 ? 'success' : 'warning'}
              label={latestMonthlyDelivery ? `Ultimo mes activo: ${latestMonthlyDelivery.label}` : 'Sin meses con actividad visible'}
            />
          </Stack>
        </Stack>
      </ExecutiveCardShell>

      <ExecutiveCardShell
        title='Entregables y ajustes'
        subtitle='Lectura compacta de salida visible, estabilidad de primera pasada y friccion cliente.'
      >
        <Stack spacing={3} sx={{ height: '100%' }}>
          <AppReactApexCharts type='bar' height={320} width='100%' series={monthlyAdjustmentSeries} options={monthlyAdjustmentOptions} />
          <MetricList
            items={[
              {
                label: 'Entregables visibles',
                value: String(totalDeliverablesVisible),
                detail: 'Total visible en la serie mensual actual.'
              },
              {
                label: 'Sin ajustes cliente',
                value: String(totalDeliverablesWithoutAdjustments),
                detail: 'Base inicial de First-Time Right mientras madura el modelo formal.'
              },
              {
                label: 'Rondas de ajuste',
                value: String(totalClientAdjustmentRounds),
                detail: 'Suma de Client Change Round Final en el alcance visible.'
              }
            ]}
          />
        </Stack>
      </ExecutiveCardShell>
    </Box>
  )
}

export default DeliverySignalsSection
