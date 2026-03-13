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

import { GH_CLIENT_NAV, GH_MESSAGES } from '@/config/greenhouse-nomenclature'

const settingsRows = [
  {
    title: GH_MESSAGES.settings_digest_title,
    description: GH_MESSAGES.settings_digest_description
  },
  {
    title: GH_MESSAGES.settings_alerts_title,
    description: GH_MESSAGES.settings_alerts_description
  },
  {
    title: GH_MESSAGES.settings_risk_title,
    description: GH_MESSAGES.settings_risk_description
  }
]

const providerLabelMap: Record<string, string> = {
  credentials: 'Email y contrasena',
  microsoft_sso: 'Microsoft SSO'
}

const GreenhouseSettings = ({ hasMicrosoftAuth }: { hasMicrosoftAuth: boolean }) => {
  const { data: session } = useSession()

  const activeProvider = session?.user?.provider || 'credentials'
  const microsoftEmail = session?.user?.microsoftEmail
  const isMicrosoftLinked = Boolean(microsoftEmail)

  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant='h4'>{GH_CLIENT_NAV.settings.label}</Typography>
        <Typography color='text.secondary'>{GH_MESSAGES.subtitle_settings}</Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1fr 1.1fr' } }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Chip
                label={isMicrosoftLinked ? GH_MESSAGES.settings_account_linked : GH_MESSAGES.settings_account_unlinked}
                color={isMicrosoftLinked ? 'success' : 'warning'}
                variant='outlined'
                sx={{ width: 'fit-content' }}
              />
              <Typography variant='h5'>{GH_MESSAGES.settings_identity_title}</Typography>
              <Typography color='text.secondary'>{GH_MESSAGES.settings_identity_subtitle}</Typography>

              <Box sx={{ p: 3, borderRadius: 3, bgcolor: 'action.hover' }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <i className='tabler-brand-windows text-[24px]' />
                    <Typography className='font-medium'>{microsoftEmail || GH_MESSAGES.settings_account_unlinked}</Typography>
                    {isMicrosoftLinked ? <Chip size='small' color='success' label={GH_MESSAGES.settings_verified} /> : null}
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
                    bgcolor: 'info.main',
                    '&:hover': {
                      bgcolor: 'info.dark'
                    }
                  }}
                >
                  {GH_MESSAGES.settings_link_microsoft}
                </Button>
              ) : null}

              {!hasMicrosoftAuth ? (
                <Typography variant='body2' color='text.secondary'>
                  {GH_MESSAGES.settings_microsoft_unavailable}
                </Typography>
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='h5'>{GH_MESSAGES.settings_preferences_title}</Typography>
              <Typography color='text.secondary'>{GH_MESSAGES.settings_preferences_subtitle}</Typography>
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
