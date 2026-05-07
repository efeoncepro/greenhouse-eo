'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

import { signIn, useSession } from 'next-auth/react'

import { TeamDossierSection } from '@/components/greenhouse'
import { GH_CLIENT_NAV } from '@/config/greenhouse-nomenclature'
import { GH_MESSAGES } from '@/lib/copy/client-portal'

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

type LocaleCode = 'es-CL' | 'en-US'

type LocalePreferencePayload = {
  preference: {
    preferredLocale: LocaleCode | null
    tenantDefaultLocale: LocaleCode | null
    legacyLocale: LocaleCode | null
    effectiveLocale: LocaleCode
  }
  options: {
    locale: LocaleCode
    label: string
    nativeLabel: string
  }[]
}

const GreenhouseSettings = ({
  hasMicrosoftAuth,
  hasGoogleAuth
}: {
  hasMicrosoftAuth: boolean
  hasGoogleAuth: boolean
}) => {
  const { data: session } = useSession()
  const [localePayload, setLocalePayload] = useState<LocalePreferencePayload | null>(null)
  const [localeStatus, setLocaleStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('loading')

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
      logoSrc: '/images/integrations/microsoft.svg',
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
      logoSrc: '/images/greenhouse/SVG/google-icon.svg',
      email: googleEmail,
      linked: isGoogleLinked,
      available: hasGoogleAuth,
      emptyLabel: GH_MESSAGES.settings_google_unlinked,
      linkLabel: GH_MESSAGES.settings_link_google,
      unavailableLabel: GH_MESSAGES.settings_google_unavailable,
      onLink: () => signIn('google', { callbackUrl: '/settings' })
    }
  ] as const

  useEffect(() => {
    let active = true

    const loadLocale = async () => {
      setLocaleStatus('loading')

      try {
        const response = await fetch('/api/me/locale', { cache: 'no-store' })

        if (!response.ok) throw new Error('locale_load_failed')

        const payload = (await response.json()) as LocalePreferencePayload

        if (active) {
          setLocalePayload(payload)
          setLocaleStatus('idle')
        }
      } catch {
        if (active) setLocaleStatus('error')
      }
    }

    void loadLocale()

    return () => {
      active = false
    }
  }, [])

  const saveLocale = async (locale: LocaleCode) => {
    setLocaleStatus('saving')

    try {
      const response = await fetch('/api/me/locale', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale })
      })

      if (!response.ok) throw new Error('locale_save_failed')

      const payload = (await response.json()) as LocalePreferencePayload

      setLocalePayload(payload)
      setLocaleStatus('saved')
    } catch {
      setLocaleStatus('error')
    }
  }

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
                        <Box component='img' src={account.logoSrc} alt={account.key} sx={{ width: 24, height: 24, objectFit: 'contain' }} />
                        <Typography className='font-medium'>{account.email || account.emptyLabel}</Typography>
                        {account.linked ? (
                          <Chip size='small' color='success' label={GH_MESSAGES.settings_verified} />
                        ) : null}
                      </Box>
                      {!account.linked && account.available ? (
                        <Button
                          variant='contained'
                          startIcon={<Box component='img' src={account.logoSrc} alt={account.key} sx={{ width: 18, height: 18, objectFit: 'contain' }} />}
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
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: theme => `1px solid ${theme.palette.divider}`,
                  display: 'grid',
                  gap: 2
                }}
              >
                <Box>
                  <Typography className='font-medium'>{GH_MESSAGES.settings_locale_title}</Typography>
                  <Typography color='text.secondary'>{GH_MESSAGES.settings_locale_description}</Typography>
                </Box>
                <FormControl size='small' fullWidth disabled={localeStatus === 'loading' || localeStatus === 'saving'}>
                  <InputLabel id='greenhouse-locale-label'>{GH_MESSAGES.settings_locale_label}</InputLabel>
                  <Select
                    labelId='greenhouse-locale-label'
                    label={GH_MESSAGES.settings_locale_label}
                    value={localePayload?.preference.preferredLocale ?? localePayload?.preference.effectiveLocale ?? ''}
                    onChange={event => void saveLocale(event.target.value as LocaleCode)}
                  >
                    {(localePayload?.options ?? []).map(option => (
                      <MenuItem key={option.locale} value={option.locale}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {localeStatus === 'loading' || localeStatus === 'saving' ? (
                  <Stack direction='row' spacing={1.5} alignItems='center'>
                    <CircularProgress size={16} />
                    <Typography variant='body2' color='text.secondary'>
                      {localeStatus === 'loading' ? GH_MESSAGES.settings_locale_loading : GH_MESSAGES.settings_locale_saving}
                    </Typography>
                  </Stack>
                ) : null}
                {localeStatus === 'saved' ? <Alert severity='success'>{GH_MESSAGES.settings_locale_saved}</Alert> : null}
                {localeStatus === 'error' ? <Alert severity='error'>{GH_MESSAGES.settings_locale_error}</Alert> : null}
              </Box>
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
