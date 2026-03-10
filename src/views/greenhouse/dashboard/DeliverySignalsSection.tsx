'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import { useTheme } from '@mui/material/styles'

import { MetricList, SectionHeading } from '@/components/greenhouse'
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
      <Card>
        <CardContent sx={{ height: '100%' }}>
          <Stack spacing={3} sx={{ height: '100%' }}>
            <SectionHeading
              title='Entrega mensual visible'
              description='Agrupa la senal mensual por fecha de creacion para leer ritmo, cumplimiento y estabilidad del alcance visible.'
            />
            <AppReactApexCharts
              type='line'
              height={320}
              width='100%'
              series={monthlyOnTimeSeries}
              options={monthlyOnTimeOptions}
            />
            <Stack direction='row' flexWrap='wrap' gap={2}>
              <Chip variant='tonal' color='info' label='Grano mensual: fecha de creacion' />
              <Chip
                variant='tonal'
                color={(latestMonthlyDelivery?.onTimePct ?? 0) >= 75 ? 'success' : 'warning'}
                label={
                  latestMonthlyDelivery ? `Ultimo mes activo: ${latestMonthlyDelivery.label}` : 'Sin meses con actividad visible'
                }
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ height: '100%' }}>
          <Stack spacing={3} sx={{ height: '100%' }}>
            <SectionHeading
              title='Entregables y ajustes'
              description='Sirve para medir salida visible, estabilidad de primera pasada y friccion registrada en revisiones cliente.'
            />
            <AppReactApexCharts
              type='bar'
              height={320}
              width='100%'
              series={monthlyAdjustmentSeries}
              options={monthlyAdjustmentOptions}
            />
            <MetricList
              items={[
                {
                  label: 'Entregables visibles',
                  value: String(totalDeliverablesVisible),
                  detail: 'Total visible en el alcance actual del tenant para la serie mensual.'
                },
                {
                  label: 'Sin ajustes cliente',
                  value: String(totalDeliverablesWithoutAdjustments),
                  detail: 'Lectura base para First-Time Right mientras el modelo formal de calidad madura.'
                },
                {
                  label: 'Rondas de ajuste cliente',
                  value: String(totalClientAdjustmentRounds),
                  detail: 'Suma de Client Change Round Final en los entregables visibles.'
                }
              ]}
            />
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default DeliverySignalsSection
