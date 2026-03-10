import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

const settingsRows = [
  {
    title: 'Weekly client digest',
    description: 'Send a concise Friday summary of sprint status, review pressure, and unresolved comments.'
  },
  {
    title: 'Comment escalation alerts',
    description: 'Highlight when unresolved feedback crosses the threshold agreed for the account.'
  },
  {
    title: 'Delivery health score',
    description: 'Expose an executive-friendly score that blends throughput, review rounds, and overdue work.'
  }
]

const GreenhouseSettings = () => {
  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant='h4'>Portal settings</Typography>
        <Typography color='text.secondary'>
          Settings will later connect to client profile, notification routing, and visibility preferences.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1fr 1.1fr' } }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Chip label='Account shell' color='info' variant='outlined' sx={{ width: 'fit-content' }} />
              <Typography variant='h5'>Client workspace profile</Typography>
              <Typography color='text.secondary'>
                This area is reserved for client identity, contact preferences, project access, and internal account
                mapping.
              </Typography>
              <Box sx={{ p: 3, borderRadius: 3, bgcolor: 'action.hover' }}>
                <Typography variant='body2' color='text.secondary'>
                  Planned fields
                </Typography>
                <Typography sx={{ mt: 1 }}>
                  client_id, client_name, email, company mapping, project scope, and notification defaults.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='h5'>Delivery visibility preferences</Typography>
              {settingsRows.map(row => (
                <Box
                  key={row.title}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: theme => `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 2
                  }}
                >
                  <Box>
                    <Typography className='font-medium'>{row.title}</Typography>
                    <Typography color='text.secondary'>{row.description}</Typography>
                  </Box>
                  <Switch defaultChecked />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  )
}

export default GreenhouseSettings
