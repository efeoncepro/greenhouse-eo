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
import { createQualitySignalsOptions } from '@views/greenhouse/dashboard/chart-options'

type QualitySignalsSectionProps = {
  data: GreenhouseDashboardData
}

const QualitySignalsSection = ({ data }: QualitySignalsSectionProps) => {
  const theme = useTheme()
  const qualityOptions = createQualitySignalsOptions(theme, data)
  const latestQualitySignal = data.qualitySignals[data.qualitySignals.length - 1] || null
  const seededMonths = data.qualitySignals.filter(item => item.rpaSource === 'seeded').length

  const qualitySeries = [
    {
      name: 'RpA promedio',
      type: 'line',
      data: data.qualitySignals.map(item => item.avgRpa)
    },
    {
      name: 'First-Time Right',
      type: 'line',
      data: data.qualitySignals.map(item => item.firstTimeRightPct)
    }
  ]

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.25fr 1fr' } }}>
      <Card>
        <CardContent sx={{ height: '100%' }}>
          <Stack spacing={3} sx={{ height: '100%' }}>
            <SectionHeading
              title='Calidad mensual'
              description='Combina RpA mensual y First-Time Right con fallback seedado mientras madura la calidad del dato real.'
            />
            <AppReactApexCharts type='line' height={320} width='100%' series={qualitySeries} options={qualityOptions} />
            <Stack direction='row' flexWrap='wrap' gap={2}>
              <Chip variant='tonal' color='info' label='FTR = entregables sin ajustes / entregables visibles' />
              {seededMonths > 0 ? <Chip variant='tonal' color='warning' label={`${seededMonths} meses con RpA seedado`} /> : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ height: '100%' }}>
          <Stack spacing={3} sx={{ height: '100%' }}>
            <SectionHeading
              title='Lectura de calidad'
              description='El KPI ya es reusable; lo que seguira evolucionando es el origen del RpA para pasar de seeded a measured.'
            />
            <MetricList
              items={[
                {
                  label: 'RpA ultimo mes',
                  value: latestQualitySignal?.avgRpa !== null ? latestQualitySignal?.avgRpa.toFixed(1) : 'Sin dato',
                  detail:
                    latestQualitySignal?.rpaSource === 'seeded'
                      ? 'Valor seedado para visibilidad inicial mientras madura la fuente medida.'
                      : 'Valor medido desde el dato disponible en tareas.'
                },
                {
                  label: 'First-Time Right',
                  value:
                    latestQualitySignal?.firstTimeRightPct !== null
                      ? `${latestQualitySignal?.firstTimeRightPct}%`
                      : 'Sin dato',
                  detail: 'Calculado como entregables sin ajustes cliente sobre entregables visibles del mes.'
                },
                {
                  label: 'Meses visibles',
                  value: String(data.qualitySignals.length),
                  detail: 'Ventana mensual visible para calidad en el dashboard.'
                }
              ]}
            />
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default QualitySignalsSection
