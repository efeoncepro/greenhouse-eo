import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

const projects = [
  {
    name: 'Q2 Launch System',
    client: 'ACME Motion',
    status: 'On track',
    statusColor: 'success' as const,
    owner: 'Creative ops pod',
    tasks: 12,
    progress: 82,
    reviewLoad: 'Low'
  },
  {
    name: 'Content Engine Sprint',
    client: 'Orbit Foods',
    status: 'At risk',
    statusColor: 'warning' as const,
    owner: 'Campaign squad',
    tasks: 9,
    progress: 64,
    reviewLoad: 'Medium'
  },
  {
    name: 'Campaign Recovery',
    client: 'North Peak',
    status: 'Needs attention',
    statusColor: 'error' as const,
    owner: 'Retention team',
    tasks: 7,
    progress: 43,
    reviewLoad: 'High'
  }
]

const GreenhouseProjects = () => {
  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant='h4'>Projects</Typography>
        <Typography color='text.secondary'>
          Active client workspaces with delivery progress, review pressure, and ownership clarity.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', xl: 'repeat(3, minmax(0, 1fr))' }
        }}
      >
        {projects.map(project => (
          <Card key={project.name}>
            <CardContent>
              <Stack spacing={3}>
                <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
                  <Box>
                    <Typography variant='h5'>{project.name}</Typography>
                    <Typography color='text.secondary'>{project.client}</Typography>
                  </Box>
                  <Chip label={project.status} color={project.statusColor} variant='outlined' />
                </Stack>

                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Team owner
                    </Typography>
                    <Typography>{project.owner}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Open tasks
                    </Typography>
                    <Typography>{project.tasks}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Review load
                    </Typography>
                    <Typography>{project.reviewLoad}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Delivery completion
                    </Typography>
                    <Typography>{project.progress}%</Typography>
                  </Box>
                </Box>

                <Box>
                  <Stack direction='row' justifyContent='space-between' sx={{ mb: 1 }}>
                    <Typography variant='body2'>Scope progress</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {project.progress}%
                    </Typography>
                  </Stack>
                  <LinearProgress variant='determinate' value={project.progress} sx={{ height: 10, borderRadius: 999 }} />
                </Box>

                <Button variant='outlined' href='/dashboard'>
                  Open project detail next
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Stack>
  )
}

export default GreenhouseProjects
