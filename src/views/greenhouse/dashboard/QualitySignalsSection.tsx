'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { ExecutiveCardShell, MetricList } from '@/components/greenhouse'
import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'
import { createQualitySignalsOptions } from '@views/greenhouse/dashboard/chart-options'

const TASK407_COPY_RPA_ULTIMO_MES = "RpA ultimo mes"
const TASK407_COPY_FIRST_TIME_RIGHT = "First-Time Right"
const TASK407_COPY_MESES_VISIBLES = "Meses visibles"


type QualitySignalsSectionProps = {
  data: GreenhouseDashboardData
}

const QualitySignalsSection = ({ data }: QualitySignalsSectionProps) => {
  const theme = useTheme()
  const qualityOptions = createQualitySignalsOptions(theme, data)
  const latestQualitySignal = data.qualitySignals[data.qualitySignals.length - 1] || null
  const seededMonths = data.qualitySignals.filter(item => item.rpaSource === 'seeded').length
  const isSparseWindow = data.qualitySignals.length < 2

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

  if (isSparseWindow) {
    return (
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: 'repeat(auto-fit, minmax(360px, 1fr))' } }}>
        <ExecutiveCardShell
          title='Calidad mensual'
          subtitle='Con una sola observacion visible, la calidad se resume como snapshot con procedencia explicita.'
        >
          <Stack spacing={3}>
            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`
              }}
            >
              <Typography variant='caption' color='text.secondary'>
                {latestQualitySignal?.label || 'Ultimo mes visible'}
              </Typography>
              <Typography variant='h3'>
                {latestQualitySignal?.avgRpa != null ? latestQualitySignal.avgRpa.toFixed(1) : 'Sin dato'}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                RpA promedio visible del ultimo mes con trazabilidad disponible.
              </Typography>
            </Box>

            <Box>
              <Stack direction='row' justifyContent='space-between' alignItems='center' className='mbe-1'>
                <Typography variant='body2' color='text.secondary'>
                  First-Time Right
                </Typography>
                <Typography variant='body2' color='text.primary'>
                  {latestQualitySignal?.firstTimeRightPct != null ? `${latestQualitySignal.firstTimeRightPct}%` : 'Sin dato'}
                </Typography>
              </Stack>
              <LinearProgress
                variant='determinate'
                color='success'
                value={latestQualitySignal?.firstTimeRightPct ?? 0}
                sx={{ height: 8, borderRadius: 999 }}
              />
            </Box>

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
                label: TASK407_COPY_RPA_ULTIMO_MES,
                value: latestQualitySignal?.avgRpa != null ? latestQualitySignal.avgRpa.toFixed(1) : 'Sin dato',
                detail:
                  latestQualitySignal?.rpaSource === 'seeded'
                    ? 'Valor seedado para visibilidad inicial mientras madura la fuente medida.'
                    : 'Valor medido desde el dato disponible en tareas.'
              },
              {
                label: TASK407_COPY_FIRST_TIME_RIGHT,
                value: latestQualitySignal?.firstTimeRightPct != null ? `${latestQualitySignal.firstTimeRightPct}%` : 'Sin dato',
                detail: 'Calculado como entregables sin ajustes cliente sobre entregables visibles del mes.'
              },
              {
                label: TASK407_COPY_MESES_VISIBLES,
                value: String(data.qualitySignals.length),
                detail: 'Ventana mensual visible para calidad en el dashboard.'
              }
            ]}
          />
        </ExecutiveCardShell>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: 'repeat(auto-fit, minmax(360px, 1fr))' } }}>
      <ExecutiveCardShell
        title='Calidad mensual'
        subtitle='RpA y First-Time Right con origen explicito mientras madura la calidad de la fuente medida.'
      >
        <Stack spacing={3} sx={{ height: '100%' }}>
          <AppReactApexCharts type='line' height={280} width='100%' series={qualitySeries} options={qualityOptions} />
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
              label: TASK407_COPY_RPA_ULTIMO_MES,
              value: latestQualitySignal?.avgRpa != null ? latestQualitySignal.avgRpa.toFixed(1) : 'Sin dato',
              detail:
                latestQualitySignal?.rpaSource === 'seeded'
                  ? 'Valor seedado para visibilidad inicial mientras madura la fuente medida.'
                  : 'Valor medido desde el dato disponible en tareas.'
            },
            {
              label: TASK407_COPY_FIRST_TIME_RIGHT,
              value: latestQualitySignal?.firstTimeRightPct != null ? `${latestQualitySignal.firstTimeRightPct}%` : 'Sin dato',
              detail: 'Calculado como entregables sin ajustes cliente sobre entregables visibles del mes.'
            },
            {
              label: TASK407_COPY_MESES_VISIBLES,
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
