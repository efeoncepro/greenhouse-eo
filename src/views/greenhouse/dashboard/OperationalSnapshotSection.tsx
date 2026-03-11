'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'
import { ExecutiveCardShell } from '@/components/greenhouse'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'
import { effortColorMap, statusColorMap } from '@views/greenhouse/dashboard/config'

type OperationalSnapshotSectionProps = {
  data: GreenhouseDashboardData
  throughputTitle: string
  throughputDescription: string
  healthTitle: string
  healthDescription: string
}

const buildWorkloadItems = (data: GreenhouseDashboardData) => [
  {
    key: 'created',
    label: 'Creadas 30d',
    value: String(data.summary.createdLast30Days),
    progress: Math.min(100, Math.max(data.summary.createdLast30Days, 4) * 10),
    color: 'primary' as const,
    icon: 'tabler-trending-up'
  },
  {
    key: 'completed',
    label: 'Entregadas 30d',
    value: String(data.summary.completedLast30Days),
    progress: Math.min(100, Math.max(data.summary.completedLast30Days, 4) * 12),
    color: 'success' as const,
    icon: 'tabler-checks'
  },
  {
    key: 'queue',
    label: 'Trabajo en cola',
    value: String(data.summary.queuedWorkItems),
    progress: Math.min(100, Math.max(data.summary.queuedWorkItems, 2) * 14),
    color: 'warning' as const,
    icon: 'tabler-stack-push'
  },
  {
    key: 'review',
    label: 'Revision abierta',
    value: String(data.summary.reviewPressureTasks),
    progress: Math.min(100, Math.max(data.summary.reviewPressureTasks, 1) * 16),
    color: 'info' as const,
    icon: 'tabler-message-circle'
  }
]

const OperationalSnapshotSection = ({
  data,
  throughputTitle,
  throughputDescription,
  healthTitle,
  healthDescription
}: OperationalSnapshotSectionProps) => {
  const theme = useTheme()
  const dominantStatus = [...data.charts.statusMix].sort((a, b) => b.value - a.value).slice(0, 3)
  const effortMix = [...data.charts.effortMix].sort((a, b) => b.value - a.value)

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.2fr 1fr' } }}>
      <ExecutiveCardShell
        title={throughputTitle}
        subtitle={`${throughputDescription} Modo snapshot activado mientras el historico mensual sigue corto.`}
      >
        <Stack spacing={3.5}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }
            }}
          >
            {[
              {
                label: 'Completion rate',
                value: `${data.summary.completionRate}%`,
                detail: 'Trabajo cerrado sobre tareas visibles.'
              },
              {
                label: 'Flujo neto 30d',
                value: `${data.summary.netFlowLast30Days > 0 ? '+' : ''}${data.summary.netFlowLast30Days}`,
                detail: 'Diferencia entre creadas y entregadas.'
              },
              {
                label: 'Proyectos en riesgo',
                value: String(data.summary.projectsAtRisk),
                detail: 'Frentes bajo observacion hoy.'
              }
            ].map(item => (
              <Box
                key={item.label}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`
                }}
              >
                <Typography variant='caption' color='text.secondary'>
                  {item.label}
                </Typography>
                <Typography variant='h4'>{item.value}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {item.detail}
                </Typography>
              </Box>
            ))}
          </Box>

          <Stack spacing={2.5}>
            {buildWorkloadItems(data).map(item => (
              <Box key={item.key}>
                <Stack direction='row' spacing={1.5} alignItems='center' className='mbe-1'>
                  <CustomAvatar skin='light' color={item.color} size={32} variant='rounded'>
                    <i className={item.icon} />
                  </CustomAvatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction='row' justifyContent='space-between' gap={2}>
                      <Typography variant='body2' color='text.secondary'>
                        {item.label}
                      </Typography>
                      <Typography variant='body2'>{item.value}</Typography>
                    </Stack>
                  </Box>
                </Stack>
                <LinearProgress value={item.progress} variant='determinate' color={item.color} sx={{ height: 8, borderRadius: 999 }} />
              </Box>
            ))}
          </Stack>
        </Stack>
      </ExecutiveCardShell>

      <ExecutiveCardShell title={healthTitle} subtitle={healthDescription}>
        <Stack spacing={3}>
          <Box
            sx={{
              p: 3,
              borderRadius: 3,
              backgroundColor: alpha(theme.palette.success.main, 0.05),
              border: `1px solid ${alpha(theme.palette.success.main, 0.12)}`
            }}
          >
            <Stack direction='row' justifyContent='space-between' gap={2} alignItems='flex-start'>
              <Box>
                <Typography variant='caption' color='text.secondary'>
                  On-time portfolio
                </Typography>
                <Typography variant='h3'>{data.summary.avgOnTimePct}%</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {data.summary.healthyProjects} proyectos saludables dentro del alcance visible.
                </Typography>
              </Box>
              <Chip size='small' variant='tonal' color={data.summary.projectsAtRisk > 0 ? 'warning' : 'success'} label={`${data.summary.projectsAtRisk} en riesgo`} />
            </Stack>
          </Box>

          <Box>
            <Typography variant='overline' color='text.secondary'>
              Mix operativo dominante
            </Typography>
            <Stack spacing={2} sx={{ mt: 1.5 }}>
              {dominantStatus.map(item => {
                const ratio = data.summary.totalTasks > 0 ? (item.value / data.summary.totalTasks) * 100 : 0

                return (
                  <Box key={item.key}>
                    <Stack direction='row' justifyContent='space-between' gap={2} className='mbe-1'>
                      <Typography variant='body2'>{item.label}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {item.value}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      value={ratio}
                      variant='determinate'
                      sx={{
                        height: 8,
                        borderRadius: 999,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: statusColorMap[item.key] || theme.palette.primary.main
                        }
                      }}
                    />
                  </Box>
                )
              })}
            </Stack>
          </Box>

          <Box>
            <Typography variant='overline' color='text.secondary'>
              Carga por esfuerzo
            </Typography>
            <Stack direction='row' flexWrap='wrap' gap={1.5} sx={{ mt: 1.5 }}>
              {effortMix.map(item => (
                <Chip
                  key={item.key}
                  variant='tonal'
                  label={`${item.label}: ${item.value}`}
                  sx={{
                    backgroundColor: alpha(effortColorMap[item.key] || theme.palette.info.main, 0.12),
                    color: effortColorMap[item.key] || theme.palette.info.main
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </ExecutiveCardShell>
    </Box>
  )
}

export default OperationalSnapshotSection
