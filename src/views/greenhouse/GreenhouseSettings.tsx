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

import { TeamDossierSection } from '@/components/greenhouse'
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
  credentials: GH_MESSAGES.settings_provider_credentials,
  microsoft_sso: GH_MESSAGES.settings_provider_microsoft,
  google_sso: GH_MESSAGES.settings_provider_google
}

const GreenhouseSettings = ({
  hasMicrosoftAuth,
  hasGoogleAuth
}: {
  hasMicrosoftAuth: boolean
  hasGoogleAuth: boolean
}) => {
  const { data: session } = useSession()

  const activeProvider = session?.user?.provider || 'credentials'
  const microsoftEmail = session?.user?.microsoftEmail
  const googleEmail = session?.user?.googleEmail
  const isMicrosoftLinked = Boolean(microsoftEmail)
  const isGoogleLinked = Boolean(googleEmail)
  const hasLinkedIdentity = isMicrosoftLinked || isGoogleLinked

  const linkedAccounts = [
    {
      key: 'microsoft',
      iconClassName: 'tabler-brand-windows',
      email: microsoftEmail,
      linked: isMicrosoftLinked,
      available: hasMicrosoftAuth,
      emptyLabel: GH_MESSAGES.settings_microsoft_unlinked,
      linkLabel: GH_MESSAGES.settings_link_microsoft,
      unavailableLabel: GH_MESSAGES.settings_microsoft_unavailable,
      onLink: () => signIn('azure-ad', { callbackUrl: '/settings' })
    },
    {
      key: 'google',
      iconClassName: 'tabler-brand-google-filled',
      email: googleEmail,
      linked: isGoogleLinked,
      available: hasGoogleAuth,
      emptyLabel: GH_MESSAGES.settings_google_unlinked,
      linkLabel: GH_MESSAGES.settings_link_google,
      unavailableLabel: GH_MESSAGES.settings_google_unavailable,
      onLink: () => signIn('google', { callbackUrl: '/settings' })
    }
  ] as const

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
                label={hasLinkedIdentity ? GH_MESSAGES.settings_account_linked : GH_MESSAGES.settings_account_unlinked}
                color={hasLinkedIdentity ? 'success' : 'warning'}
                variant='outlined'
                sx={{ width: 'fit-content' }}
              />
              <Typography variant='h5'>{GH_MESSAGES.settings_identity_title}</Typography>
              <Typography color='text.secondary'>{GH_MESSAGES.settings_identity_subtitle}</Typography>

              <Box sx={{ p: 3, borderRadius: 3, bgcolor: 'action.hover' }}>
                <Stack spacing={3}>
                  {linkedAccounts.map(account => (
                    <Stack key={account.key} spacing={1.5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <i className={`${account.iconClassName} text-[24px]`} />
                        <Typography className='font-medium'>{account.email || account.emptyLabel}</Typography>
                        {account.linked ? (
                          <Chip size='small' color='success' label={GH_MESSAGES.settings_verified} />
                        ) : null}
                      </Box>
                      {!account.linked && account.available ? (
                        <Button
                          variant='contained'
                          startIcon={<i className={account.iconClassName} />}
                          onClick={account.onLink}
                          sx={{
                            alignSelf: 'flex-start',
                            bgcolor: account.key === 'microsoft' ? 'info.main' : 'primary.main',
                            '&:hover': {
                              bgcolor: account.key === 'microsoft' ? 'info.dark' : 'primary.dark'
                            }
                          }}
                        >
                          {account.linkLabel}
                        </Button>
                      ) : null}
                      {!account.available ? (
                        <Typography variant='body2' color='text.secondary'>
                          {account.unavailableLabel}
                        </Typography>
                      ) : null}
                    </Stack>
                  ))}
                  <Typography variant='body2' color='text.secondary'>
                    {GH_MESSAGES.settings_access_method_label}: {providerLabelMap[activeProvider] || activeProvider}
                  </Typography>
                </Stack>
              </Box>
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

      <TeamDossierSection />
    </Stack>
  )
}

export default GreenhouseSettings
