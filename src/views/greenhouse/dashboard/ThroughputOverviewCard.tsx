'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ApexOptions } from 'apexcharts'

import CustomAvatar from '@core/components/mui/Avatar'
import { ExecutiveCardShell } from '@/components/greenhouse'
import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'

type ThroughputOverviewCardProps = {
  data: GreenhouseDashboardData
  title: string
  subtitle: string
  series: { name: string; data: number[] }[]
  options: ApexOptions
  netFlowLabel: string
}

const throughputBreakdown = (data: GreenhouseDashboardData) => [
  {
    key: 'created',
    label: 'Creadas',
    value: String(data.summary.createdLast30Days),
    progress: Math.min(100, Math.max(data.summary.createdLast30Days, 8) * 4),
    color: 'primary' as const,
    icon: 'tabler-trending-up'
  },
  {
    key: 'completion',
    label: 'Completion rate',
    value: `${data.summary.completionRate}%`,
    progress: data.summary.completionRate,
    color: 'success' as const,
    icon: 'tabler-checks'
  },
  {
    key: 'queue',
    label: 'En cola',
    value: String(data.summary.queuedWorkItems),
    progress: Math.min(100, Math.max(data.summary.queuedWorkItems, 4) * 7),
    color: 'warning' as const,
    icon: 'tabler-stack-push'
  }
]

const ThroughputOverviewCard = ({ data, title, subtitle, series, options, netFlowLabel }: ThroughputOverviewCardProps) => {
  return (
    <ExecutiveCardShell title={title} subtitle={subtitle}>
      <Box sx={{ display: 'grid', gap: 4, gridTemplateColumns: { xs: '1fr', lg: '220px minmax(0, 1fr)' }, alignItems: 'center' }}>
        <Stack spacing={3}>
          <Stack spacing={1.5}>
            <Stack direction='row' alignItems='center' gap={1.5} flexWrap='wrap'>
              <Typography variant='h2'>{data.summary.completedLast30Days}</Typography>
              <Chip
                size='small'
                variant='tonal'
                color={data.summary.netFlowLast30Days >= 0 ? 'success' : 'warning'}
                label={netFlowLabel}
              />
            </Stack>
            <Typography variant='body2' color='text.secondary'>
              Entregas cerradas en los ultimos 30 dias dentro del alcance visible del tenant.
            </Typography>
          </Stack>
          <Stack spacing={2}>
            {throughputBreakdown(data).map(item => (
              <Box key={item.key} sx={{ display: 'grid', gap: 1.5 }}>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <CustomAvatar skin='light' color={item.color} variant='rounded' size={34}>
                    <i className={item.icon} />
                  </CustomAvatar>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction='row' justifyContent='space-between' gap={2}>
                      <Typography variant='body2' color='text.secondary'>
                        {item.label}
                      </Typography>
                      <Typography variant='body2'>{item.value}</Typography>
                    </Stack>
                    <LinearProgress value={item.progress} variant='determinate' color={item.color} sx={{ mt: 1, height: 6 }} />
                  </Box>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Stack>
        <AppReactApexCharts type='bar' height={280} width='100%' series={series} options={options} />
      </Box>
    </ExecutiveCardShell>
  )
}

export default ThroughputOverviewCard
