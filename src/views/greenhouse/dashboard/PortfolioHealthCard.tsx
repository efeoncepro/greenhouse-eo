'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ApexOptions } from 'apexcharts'

import CustomAvatar from '@core/components/mui/Avatar'
import { ExecutiveCardShell } from '@/components/greenhouse'
import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'

type PortfolioHealthCardProps = {
  data: GreenhouseDashboardData
  options: ApexOptions
}

const supportItems = (data: GreenhouseDashboardData) => [
  {
    key: 'healthy',
    title: 'Proyectos saludables',
    subtitle: String(data.summary.healthyProjects),
    color: 'success' as const,
    icon: 'tabler-shield-check'
  },
  {
    key: 'risk',
    title: 'Bajo observacion',
    subtitle: String(data.summary.projectsAtRisk),
    color: 'warning' as const,
    icon: 'tabler-alert-triangle'
  },
  {
    key: 'comments',
    title: 'Comentarios abiertos',
    subtitle: String(data.summary.openFrameComments),
    color: 'info' as const,
    icon: 'tabler-message-circle'
  }
]

const PortfolioHealthCard = ({ data, options }: PortfolioHealthCardProps) => {
  const hasWeakHealthSignal = data.summary.completedLast30Days === 0 && data.summary.avgOnTimePct === 0

  return (
    <ExecutiveCardShell
      title='Salud del portfolio'
      subtitle='Lectura ejecutiva de cumplimiento, riesgo y friccion visible sobre la cartera actual.'
    >
      <Box
        sx={{
          display: 'grid',
          gap: 4,
          gridTemplateColumns: { xs: '1fr', lg: hasWeakHealthSignal ? '1fr' : '220px minmax(0, 1fr)' },
          alignItems: 'center'
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant='h2'>{data.summary.avgOnTimePct}%</Typography>
            <Typography variant='body2' color='text.secondary'>
              on-time promedio defendible hoy para el portfolio visible.
            </Typography>
          </Box>
          <Stack spacing={2.5}>
            {supportItems(data).map(item => (
              <Stack key={item.key} direction='row' spacing={2} alignItems='center'>
                <CustomAvatar skin='light' color={item.color} variant='rounded' size={34}>
                  <i className={item.icon} />
                </CustomAvatar>
                <Box>
                  <Typography className='font-medium' color='text.primary'>
                    {item.title}
                  </Typography>
                  <Typography variant='body2'>{item.subtitle}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Stack>
        {hasWeakHealthSignal ? (
          <Box sx={{ p: 3, borderRadius: 3, bgcolor: 'action.hover' }}>
            <Typography variant='body2' color='text.secondary'>
              Todavia no hay suficiente trazabilidad para que un radial grande aporte lectura. La tarjeta queda en modo
              compacto hasta que la cartera tenga mas historia operativa visible.
            </Typography>
          </Box>
        ) : (
          <AppReactApexCharts type='radialBar' height={280} width='100%' series={[data.summary.avgOnTimePct]} options={options} />
        )}
      </Box>
    </ExecutiveCardShell>
  )
}

export default PortfolioHealthCard
