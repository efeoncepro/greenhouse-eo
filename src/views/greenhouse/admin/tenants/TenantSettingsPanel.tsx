'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'

import { GH_INTERNAL_MESSAGES } from '@/lib/copy/admin'
import type { AdminTenantDetail } from '@/lib/admin/get-admin-tenant-detail'
import { formatDateTime, getDisplayNote } from '@views/greenhouse/admin/tenants/helpers'

type Props = {
  data: AdminTenantDetail
}

type LocaleCode = 'es-CL' | 'en-US'

type TenantLocalePayload = {
  tenantLocale: {
    clientId: string
    organizationId: string | null
    organizationDefaultLocale: LocaleCode | null
    clientDefaultLocale: LocaleCode | null
    effectiveLocale: LocaleCode
  }
  options: {
    locale: LocaleCode
    label: string
    nativeLabel: string
  }[]
}

const TenantSettingsPanel = ({ data }: Props) => {
  const liveMode = data.liveHubspot.contract?.realtime.mode || 'polling_or_on_demand'
  const liveIsRealtime = data.liveHubspot.contract?.realtime.supported === true
  const displayNote = getDisplayNote(data.notes, data.hubspotCompanyId)
  const [localePayload, setLocalePayload] = useState<TenantLocalePayload | null>(null)
  const [localeStatus, setLocaleStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('loading')

  useEffect(() => {
    let active = true

    const loadLocale = async () => {
      setLocaleStatus('loading')

      try {
        const response = await fetch(`/api/admin/tenants/${data.clientId}/locale`, { cache: 'no-store' })

        if (!response.ok) throw new Error('tenant_locale_load_failed')

        const payload = (await response.json()) as TenantLocalePayload

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
  }, [data.clientId])

  const saveLocale = async (locale: LocaleCode) => {
    setLocaleStatus('saving')

    try {
      const response = await fetch(`/api/admin/tenants/${data.clientId}/locale`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale })
      })

      if (!response.ok) throw new Error('tenant_locale_save_failed')

      const payload = (await response.json()) as TenantLocalePayload

      setLocalePayload(payload)
      setLocaleStatus('saved')
    } catch {
      setLocaleStatus('error')
    }
  }

  return (
    <Grid container spacing={6}>
      {/* Identity */}
      <Grid size={{ xs: 12, xl: 4 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}`, height: '100%' }}>
          <CardHeader
            avatar={
              <CustomAvatar variant='rounded' color='primary' skin='filled' size={36}>
                <i className='tabler-id text-lg' />
              </CustomAvatar>
            }
            title={GH_INTERNAL_MESSAGES.admin_tenant_settings_identity_title}
            titleTypographyProps={{ variant: 'h6' }}
          />
          <Divider />
          <CardContent>
            <Stack spacing={3}>
              {[
                [GH_INTERNAL_MESSAGES.admin_tenant_settings_label_space_id, data.publicId],
                [GH_INTERNAL_MESSAGES.admin_tenant_settings_label_internal_key, data.clientId],
                [GH_INTERNAL_MESSAGES.admin_tenant_settings_label_hubspot, data.hubspotCompanyId || GH_INTERNAL_MESSAGES.admin_tenant_capabilities_company_record_empty],
                [GH_INTERNAL_MESSAGES.admin_tenant_settings_label_home, data.portalHomePath || '--'],
                [GH_INTERNAL_MESSAGES.admin_tenant_settings_label_timezone, data.timezone || '--'],
                [GH_INTERNAL_MESSAGES.admin_tenant_settings_locale_label, localePayload?.tenantLocale.effectiveLocale || '--']
              ].map(([label, value]) => (
                <Box key={label}>
                  <Typography variant='caption' color='text.disabled' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    {label}
                  </Typography>
                  <Typography color='text.primary' sx={{ mt: 0.5, fontSize: '0.8rem' }}>{value}</Typography>
                </Box>
              ))}
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box>
                  <Typography className='font-medium'>{GH_INTERNAL_MESSAGES.admin_tenant_settings_locale_title}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {GH_INTERNAL_MESSAGES.admin_tenant_settings_locale_description}
                  </Typography>
                </Box>
                <FormControl size='small' fullWidth disabled={localeStatus === 'loading' || localeStatus === 'saving'}>
                  <InputLabel id='admin-tenant-locale-label'>
                    {GH_INTERNAL_MESSAGES.admin_tenant_settings_locale_label}
                  </InputLabel>
                  <Select
                    labelId='admin-tenant-locale-label'
                    label={GH_INTERNAL_MESSAGES.admin_tenant_settings_locale_label}
                    value={localePayload?.tenantLocale.effectiveLocale ?? ''}
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
                      {localeStatus === 'loading'
                        ? GH_INTERNAL_MESSAGES.admin_tenant_settings_locale_loading
                        : GH_INTERNAL_MESSAGES.admin_tenant_settings_locale_saving}
                    </Typography>
                  </Stack>
                ) : null}
                {localeStatus === 'saved' ? (
                  <Alert severity='success'>{GH_INTERNAL_MESSAGES.admin_tenant_settings_locale_saved}</Alert>
                ) : null}
                {localeStatus === 'error' ? (
                  <Alert severity='error'>{GH_INTERNAL_MESSAGES.admin_tenant_settings_locale_error}</Alert>
                ) : null}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Company Record */}
      <Grid size={{ xs: 12, xl: 4 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}`, height: '100%' }}>
          <CardHeader
            avatar={
              <CustomAvatar variant='rounded' color='info' skin='filled' size={36}>
                <i className='tabler-brand-hubspot text-lg' />
              </CustomAvatar>
            }
            title={GH_INTERNAL_MESSAGES.admin_tenant_settings_company_record_title}
            titleTypographyProps={{ variant: 'h6' }}
          />
          <Divider />
          <CardContent>
            <Stack spacing={3}>
              <Stack direction='row' gap={1} flexWrap='wrap'>
                <CustomChip
                  round='true'
                  size='small'
                  color={data.liveHubspot.serviceConfigured ? 'success' : 'secondary'}
                  variant='tonal'
                  label={
                    data.liveHubspot.serviceConfigured
                      ? GH_INTERNAL_MESSAGES.admin_tenant_settings_company_connected
                      : GH_INTERNAL_MESSAGES.admin_tenant_settings_company_disconnected
                  }
                />
                <CustomChip round='true' size='small' color={liveIsRealtime ? 'success' : 'warning'} variant='tonal' label={liveIsRealtime ? 'Realtime' : liveMode} />
              </Stack>
              {[
                [GH_INTERNAL_MESSAGES.admin_tenant_settings_live_sync, formatDateTime(data.liveHubspot.fetchedAt)],
                [GH_INTERNAL_MESSAGES.admin_tenant_settings_tenant_updated, formatDateTime(data.updatedAt)],
                [GH_INTERNAL_MESSAGES.admin_tenant_settings_created, formatDateTime(data.createdAt)]
              ].map(([label, value]) => (
                <Box key={label}>
                  <Typography variant='caption' color='text.disabled' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    {label}
                  </Typography>
                  <Typography color='text.primary' sx={{ mt: 0.5 }}>{value}</Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Notes */}
      <Grid size={{ xs: 12, xl: 4 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}`, height: '100%' }}>
          <CardHeader
            avatar={
              <CustomAvatar variant='rounded' color='secondary' skin='filled' size={36}>
                <i className='tabler-notes text-lg' />
              </CustomAvatar>
            }
            title={GH_INTERNAL_MESSAGES.admin_tenant_settings_notes_title}
            titleTypographyProps={{ variant: 'h6' }}
          />
          <Divider />
          <CardContent>
            <Typography variant='body2' color={displayNote ? 'text.primary' : 'text.secondary'} sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {displayNote || GH_INTERNAL_MESSAGES.admin_tenant_settings_notes_empty}
            </Typography>
            <Typography variant='caption' color='text.disabled' sx={{ mt: 2, display: 'block' }}>
              {GH_INTERNAL_MESSAGES.admin_tenant_settings_notes_helper}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default TenantSettingsPanel
