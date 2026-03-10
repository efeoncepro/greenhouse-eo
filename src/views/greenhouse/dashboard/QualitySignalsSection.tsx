'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import { useTheme } from '@mui/material/styles'

import { ExecutiveCardShell, MetricList } from '@/components/greenhouse'
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
      <ExecutiveCardShell
        title='Calidad mensual'
        subtitle='RpA y First-Time Right con origen explicito mientras madura la calidad de la fuente medida.'
      >
        <Stack spacing={3} sx={{ height: '100%' }}>
          <AppReactApexCharts type='line' height={320} width='100%' series={qualitySeries} options={qualityOptions} />
          <Stack direction='row' flexWrap='wrap' gap={2}>
            <Chip variant='tonal' color='info' label='FTR = entregables sin ajustes / entregables visibles' />
            {seededMonths > 0 ? <Chip variant='tonal' color='warning' label={`${seededMonths} meses con RpA seedado`} /> : null}
          </Stack>
        </Stack>
      </ExecutiveCardShell>

      <ExecutiveCardShell
        title='Lectura de calidad'
        subtitle='La capa ya es reusable; lo que sigue cambiando es la calidad y trazabilidad del RpA.'
      >
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
              value: latestQualitySignal?.firstTimeRightPct !== null ? `${latestQualitySignal?.firstTimeRightPct}%` : 'Sin dato',
              detail: 'Calculado como entregables sin ajustes cliente sobre entregables visibles del mes.'
            },
            {
              label: 'Meses visibles',
              value: String(data.qualitySignals.length),
              detail: 'Ventana mensual visible para calidad en el dashboard.'
            }
          ]}
        />
      </ExecutiveCardShell>
    </Box>
  )
}

export default QualitySignalsSection
