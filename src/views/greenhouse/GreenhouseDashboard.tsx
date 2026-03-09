import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

const kpis = [
  { label: 'Average RpA', value: '1.7', detail: 'Healthy review rhythm', tone: 'success' as const },
  { label: 'Active tasks', value: '28', detail: '6 blocked, 22 moving', tone: 'warning' as const },
  { label: 'Completed this sprint', value: '14', detail: '74% of committed scope', tone: 'info' as const },
  { label: 'Open client comments', value: '9', detail: '3 require same-day action', tone: 'error' as const }
]

const statusRows = [
  { label: 'In production', value: 11, color: 'success.main' },
  { label: 'In review', value: 7, color: 'warning.main' },
  { label: 'Client changes', value: 6, color: 'error.main' },
  { label: 'Queued next', value: 4, color: 'info.main' }
]

const projects = [
  { name: 'Q2 Launch System', client: 'ACME Motion', rpa: '1.4', progress: 82 },
  { name: 'Content Engine Sprint', client: 'Orbit Foods', rpa: '1.9', progress: 64 },
  { name: 'Campaign Recovery', client: 'North Peak', rpa: '2.6', progress: 43 }
]

const GreenhouseDashboard = () => {
  return (
    <Stack spacing={6}>
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 4, md: 6 },
            background:
              'linear-gradient(135deg, rgba(34,197,94,0.16) 0%, rgba(16,185,129,0.12) 35%, rgba(15,23,42,0) 100%)'
          }}
        >
          <Stack spacing={2}>
            <Chip label='Greenhouse overview' color='success' variant='outlined' sx={{ width: 'fit-content' }} />
            <Typography variant='h3'>Client visibility that shows where delivery is smooth and where it is not.</Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 780 }}>
              This first shell turns the starter kit into a client operations portal: sprint health, review pressure,
              delivery movement, and project-level accountability in one place.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent>
              <Stack spacing={2}>
                <Chip label={kpi.label} color={kpi.tone} variant='outlined' sx={{ width: 'fit-content' }} />
                <Typography variant='h3'>{kpi.value}</Typography>
                <Typography color='text.secondary'>{kpi.detail}</Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.3fr 1fr' } }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='h5'>Portfolio activity</Typography>
              <Typography color='text.secondary'>
                Current workload distribution across delivery states. This is the fastest way to show tension before a
                client asks where things stand.
              </Typography>
              <Stack spacing={2.5}>
                {statusRows.map(row => (
                  <Box key={row.label}>
                    <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                      <Typography>{row.label}</Typography>
                      <Typography color='text.secondary'>{row.value} tasks</Typography>
                    </Stack>
                    <LinearProgress
                      variant='determinate'
                      value={Math.min(row.value * 8, 100)}
                      sx={{
                        height: 10,
                        borderRadius: 999,
                        '& .MuiLinearProgress-bar': { backgroundColor: row.color }
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='h5'>Sprint signal</Typography>
              <Typography color='text.secondary'>
                Current sprint velocity is stable, but review pressure is rising in two accounts.
              </Typography>
              <Box sx={{ p: 3, borderRadius: 3, bgcolor: 'action.hover' }}>
                <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                  <Typography variant='body2'>Sprint completion</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    74%
                  </Typography>
                </Stack>
                <LinearProgress variant='determinate' value={74} sx={{ height: 12, borderRadius: 999 }} />
              </Box>
              <Divider />
              <Stack spacing={1.5}>
                <Typography variant='body2' color='text.secondary'>
                  Immediate attention
                </Typography>
                <Typography>North Peak has the highest comment backlog and the weakest RpA trend this week.</Typography>
                <Typography color='text.secondary'>
                  Next action: surface late-review tasks and unresolved comments in project detail.
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant='h5'>Projects under watch</Typography>
            <Box sx={{ display: 'grid', gap: 2 }}>
              {projects.map(project => (
                <Box
                  key={project.name}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: theme => `1px solid ${theme.palette.divider}`,
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr auto' },
                    alignItems: 'center'
                  }}
                >
                  <Box>
                    <Typography variant='h6'>{project.name}</Typography>
                    <Typography color='text.secondary'>{project.client}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Average RpA
                    </Typography>
                    <Typography variant='h6'>{project.rpa}</Typography>
                  </Box>
                  <Box sx={{ minWidth: { xs: '100%', md: 180 } }}>
                    <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                      <Typography variant='body2'>Execution</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {project.progress}%
                      </Typography>
                    </Stack>
                    <LinearProgress variant='determinate' value={project.progress} sx={{ height: 10, borderRadius: 999 }} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default GreenhouseDashboard
