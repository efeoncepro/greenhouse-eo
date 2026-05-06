import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { EmptyState } from '@/components/greenhouse'
import { GH_CLIENT_NAV } from '@/config/greenhouse-nomenclature'
import { GH_LABELS, GH_MESSAGES, GH_TEAM } from '@/lib/copy/client-portal'
import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'

const GreenhouseSprints = ({ data }: { data: GreenhouseDashboardData }) => {
  const activeCycleProgress = Math.max(0, Math.min(100, Math.round(data.summary.completionRate)))
  const cycleHistory = data.charts.monthlyDelivery.slice(-3).reverse()

  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant='h4'>{GH_CLIENT_NAV.sprints.label}</Typography>
        <Typography color='text.secondary'>{GH_MESSAGES.subtitle_sprints}</Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.15fr 1fr' } }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Chip label={GH_LABELS.sprint_active} color='success' variant='outlined' sx={{ width: 'fit-content' }} />
              <Typography variant='h5'>{GH_MESSAGES.sprints_cycle_active_title}</Typography>
              <Typography color='text.secondary'>{GH_MESSAGES.sprints_cycle_active_description}</Typography>

              <Box>
                <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                  <Typography variant='body2'>{GH_MESSAGES.sprints_progress_label}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {activeCycleProgress}%
                  </Typography>
                </Stack>
                <LinearProgress variant='determinate' value={activeCycleProgress} sx={{ height: 12, borderRadius: 999 }} />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }
                }}
              >
                <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                  <Typography variant='body2' color='text.secondary'>
                    {GH_MESSAGES.sprints_deliveries_metric}
                  </Typography>
                  <Typography variant='h4'>{data.summary.completedLast30Days}</Typography>
                </Box>
                <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                  <Typography variant='body2' color='text.secondary'>
                    {GH_LABELS.kpi_feedback}
                  </Typography>
                  <Typography variant='h4'>{data.summary.reviewPressureTasks}</Typography>
                </Box>
                <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                  <Typography variant='body2' color='text.secondary'>
                    {GH_MESSAGES.sprints_blocked_metric}
                  </Typography>
                  <Typography variant='h4'>{data.summary.blockedTasks}</Typography>
                </Box>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='h5'>{GH_MESSAGES.sprints_history_title}</Typography>
              {cycleHistory.length > 0 ? (
                cycleHistory.map(item => (
                  <Box key={item.month} sx={{ p: 2.5, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
                    <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                      <Typography className='font-medium'>{item.label}</Typography>
                      <Typography color='text.secondary'>{item.onTimePct === null ? 'Sin OTD' : `OTD ${Math.round(item.onTimePct)}%`}</Typography>
                    </Stack>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
                      {GH_MESSAGES.sprints_completion_format(item.totalDeliverables, item.totalDeliverables + item.totalClientAdjustmentRounds)}
                    </Typography>
                    <LinearProgress
                      variant='determinate'
                      value={Math.max(0, Math.min(100, item.onTimePct ?? 0))}
                      sx={{ height: 10, borderRadius: 999 }}
                    />
                  </Box>
                ))
              ) : (
                <EmptyState icon='tabler-history' title={GH_MESSAGES.sprints_history_title} description={GH_MESSAGES.empty_sprints} minHeight={220} />
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            xl: 'repeat(3, minmax(0, 1fr))'
          }
        }}
      >
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant='h5'>{GH_MESSAGES.sprints_velocity_title}</Typography>
                <Typography color='text.secondary'>{GH_MESSAGES.sprints_velocity_subtitle}</Typography>
              </Box>

              {cycleHistory.length > 0 ? (
                <Stack spacing={2}>
                  {cycleHistory.map(item => (
                    <Box key={`${item.month}-velocity`}>
                      <Stack direction='row' justifyContent='space-between' alignItems='center' className='mbe-1'>
                        <Typography variant='body2' color='text.secondary'>
                          {item.label}
                        </Typography>
                        <Typography variant='body2' color='text.primary'>
                          {GH_MESSAGES.chart_tooltip_assets(item.totalDeliverables)}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant='determinate'
                        value={Math.max(0, Math.min(100, item.onTimePct ?? 0))}
                        sx={{ height: 8, borderRadius: 999 }}
                      />
                    </Box>
                  ))}
                </Stack>
              ) : (
                <EmptyState icon='tabler-activity' title={GH_MESSAGES.sprints_velocity_title} description={GH_MESSAGES.empty_sprint_velocity} minHeight={220} />
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant='h5'>{GH_LABELS.sprint_burndown}</Typography>
                <Typography color='text.secondary'>{GH_MESSAGES.sprints_burndown_subtitle}</Typography>
              </Box>
              <EmptyState icon='tabler-chart-line' title={GH_LABELS.sprint_burndown} description={GH_MESSAGES.empty_sprint_burndown} minHeight={220} />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant='h5'>{GH_TEAM.sprint_vel_title}</Typography>
                <Typography color='text.secondary'>{GH_TEAM.sprint_vel_subtitle}</Typography>
              </Box>
              <EmptyState icon='tabler-users-group' title={GH_TEAM.sprint_vel_title} description={GH_MESSAGES.empty_sprint_team} minHeight={220} />
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  )
}

export default GreenhouseSprints
