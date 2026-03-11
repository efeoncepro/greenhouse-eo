'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

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
  const latestMonthlyDelivery = data.charts.monthlyDelivery[data.charts.monthlyDelivery.length - 1] || null
  const isSparseWindow = data.charts.monthlyDelivery.length < 2

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

  const totalDeliverablesVisible = data.charts.monthlyDelivery.reduce((sum, item) => sum + item.totalDeliverables, 0)

  const totalDeliverablesWithoutAdjustments = data.charts.monthlyDelivery.reduce(
    (sum, item) => sum + item.withoutClientAdjustments,
    0
  )

  const totalClientAdjustmentRounds = data.charts.monthlyDelivery.reduce(
    (sum, item) => sum + item.totalClientAdjustmentRounds,
    0
  )

  if (isSparseWindow) {
    return (
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: 'repeat(auto-fit, minmax(360px, 1fr))' } }}>
        <ExecutiveCardShell
          title='Entrega mensual visible'
          subtitle='Con una sola observacion mensual visible, el dashboard cambia a una lectura snapshot en vez de insistir en una serie larga.'
        >
          <Stack spacing={3}>
            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                backgroundColor: alpha(theme.palette.success.main, 0.06),
                border: `1px solid ${alpha(theme.palette.success.main, 0.12)}`
              }}
            >
              <Typography variant='caption' color='text.secondary'>
                {latestMonthlyDelivery?.label || 'Ultimo mes activo'}
              </Typography>
              <Typography variant='h2'>{latestMonthlyDelivery?.onTimePct !== null ? `${latestMonthlyDelivery?.onTimePct}%` : 'Sin dato'}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {latestMonthlyDelivery
                  ? `Snapshot mensual sobre ${latestMonthlyDelivery.totalDeliverables} entregables visibles.`
                  : 'Todavia no hay observaciones mensuales visibles.'}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }
              }}
            >
              {[
                ['Entregables', String(totalDeliverablesVisible)],
                ['Sin ajustes', String(totalDeliverablesWithoutAdjustments)],
                ['Rondas', String(totalClientAdjustmentRounds)]
              ].map(([label, value]) => (
                <Box
                  key={label}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: `1px solid ${theme.palette.divider}`
                  }}
                >
                  <Typography variant='caption' color='text.secondary'>
                    {label}
                  </Typography>
                  <Typography variant='h4'>{value}</Typography>
                </Box>
              ))}
            </Box>
          </Stack>
        </ExecutiveCardShell>

        <ExecutiveCardShell
          title='Entregables y ajustes'
          subtitle='La visual cambia a breakdown compacto porque la ventana todavia no justifica un chart grande.'
        >
          <Stack spacing={3}>
            <AppReactApexCharts type='bar' height={180} width='100%' series={monthlyAdjustmentSeries} options={monthlyAdjustmentOptions} />
            <MetricList
              items={[
                {
                  label: 'Entregables visibles',
                  value: String(totalDeliverablesVisible),
                  detail: 'Total visible en la ventana mensual actual.'
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

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: 'repeat(auto-fit, minmax(360px, 1fr))' } }}>
      <ExecutiveCardShell
        title='Entrega mensual visible'
        subtitle='Serie mensual de ritmo y cumplimiento sobre el alcance visible del space.'
      >
        <Stack spacing={3} sx={{ height: '100%' }}>
          <AppReactApexCharts type='line' height={280} width='100%' series={monthlyOnTimeSeries} options={monthlyOnTimeOptions} />
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
          <AppReactApexCharts type='bar' height={280} width='100%' series={monthlyAdjustmentSeries} options={monthlyAdjustmentOptions} />
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
