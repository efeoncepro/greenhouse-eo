'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

import { signIn, useSession } from 'next-auth/react'

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

const providerLabelMap: Record<string, string> = {
  credentials: 'Email y contrasena',
  'microsoft_sso': 'Microsoft SSO'
}

const GreenhouseSettings = ({ hasMicrosoftAuth }: { hasMicrosoftAuth: boolean }) => {
  const { data: session } = useSession()

  const activeProvider = session?.user?.provider || 'credentials'
  const microsoftEmail = session?.user?.microsoftEmail
  const isMicrosoftLinked = Boolean(microsoftEmail)

  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant='h4'>Portal settings</Typography>
        <Typography color='text.secondary'>
          Ajusta tus preferencias de visibilidad y revisa como esta vinculada tu identidad de acceso en Greenhouse.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1fr 1.1fr' } }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Chip
                label={isMicrosoftLinked ? 'Cuenta vinculada' : 'Sin vinculo Microsoft'}
                color={isMicrosoftLinked ? 'success' : 'warning'}
                variant='outlined'
                sx={{ width: 'fit-content' }}
              />
              <Typography variant='h5'>Cuenta vinculada</Typography>
              <Typography color='text.secondary'>
                Greenhouse ya soporta credenciales y Microsoft SSO sobre el mismo principal de acceso.
              </Typography>

              <Box sx={{ p: 3, borderRadius: 3, bgcolor: 'action.hover' }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <i className='tabler-brand-windows text-[24px]' />
                    <Typography className='font-medium'>
                      {microsoftEmail || 'Todavia no hay una cuenta Microsoft vinculada'}
                    </Typography>
                    {isMicrosoftLinked ? <Chip size='small' color='success' label='Verificado' /> : null}
                  </Box>
                  <Typography variant='body2' color='text.secondary'>
                    Metodo de acceso activo: {providerLabelMap[activeProvider] || activeProvider}
                  </Typography>
                </Stack>
              </Box>

              {!isMicrosoftLinked && activeProvider === 'credentials' && hasMicrosoftAuth ? (
                <Button
                  variant='contained'
                  startIcon={<i className='tabler-brand-windows' />}
                  onClick={() => signIn('azure-ad', { callbackUrl: '/settings' })}
                  sx={{
                    alignSelf: 'flex-start',
                    bgcolor: '#0078D4',
                    '&:hover': {
                      bgcolor: '#106EBE'
                    }
                  }}
                >
                  Vincular cuenta Microsoft
                </Button>
              ) : null}

              {!hasMicrosoftAuth ? (
                <Typography variant='body2' color='text.secondary'>
                  El provider Microsoft no esta configurado en este ambiente, por lo que el vinculo SSO no se puede
                  iniciar desde aqui todavia.
                </Typography>
              ) : null}
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
