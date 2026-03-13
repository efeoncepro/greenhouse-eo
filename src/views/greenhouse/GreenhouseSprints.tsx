import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_CLIENT_NAV, GH_LABELS, GH_MESSAGES } from '@/config/greenhouse-nomenclature'

const sprintHistory = [
  { label: 'Ciclo 18', velocity: 84, completion: '14/16 assets', status: GH_LABELS.semaphore_green },
  { label: 'Ciclo 17', velocity: 71, completion: '12/17 assets', status: GH_LABELS.semaphore_yellow },
  { label: 'Ciclo 16', velocity: 63, completion: '10/16 assets', status: 'Feedback pesado' }
]

const GreenhouseSprints = () => {
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
                    74%
                  </Typography>
                </Stack>
                <LinearProgress variant='determinate' value={74} sx={{ height: 12, borderRadius: 999 }} />
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
                  <Typography variant='h4'>14</Typography>
                </Box>
                <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                  <Typography variant='body2' color='text.secondary'>
                    {GH_LABELS.kpi_feedback}
                  </Typography>
                  <Typography variant='h4'>5</Typography>
                </Box>
                <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                  <Typography variant='body2' color='text.secondary'>
                    {GH_MESSAGES.sprints_blocked_metric}
                  </Typography>
                  <Typography variant='h4'>2</Typography>
                </Box>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='h5'>{GH_MESSAGES.sprints_history_title}</Typography>
              {sprintHistory.map(item => (
                <Box key={item.label} sx={{ p: 2.5, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
                  <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                    <Typography className='font-medium'>{item.label}</Typography>
                    <Typography color='text.secondary'>{item.status}</Typography>
                  </Stack>
                  <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
                    {item.completion}
                  </Typography>
                  <LinearProgress variant='determinate' value={item.velocity} sx={{ height: 10, borderRadius: 999 }} />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  )
}

export default GreenhouseSprints
