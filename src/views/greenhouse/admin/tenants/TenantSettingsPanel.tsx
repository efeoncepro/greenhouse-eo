'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'

import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import type { AdminTenantDetail } from '@/lib/admin/get-admin-tenant-detail'
import { formatDateTime, getDisplayNote } from '@views/greenhouse/admin/tenants/helpers'

type Props = {
  data: AdminTenantDetail
}

const TenantSettingsPanel = ({ data }: Props) => {
  const liveMode = data.liveHubspot.contract?.realtime.mode || 'polling_or_on_demand'
  const liveIsRealtime = data.liveHubspot.contract?.realtime.supported === true
  const displayNote = getDisplayNote(data.notes, data.hubspotCompanyId)

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
                [GH_INTERNAL_MESSAGES.admin_tenant_settings_label_timezone, data.timezone || '--']
              ].map(([label, value]) => (
                <Box key={label}>
                  <Typography variant='caption' color='text.disabled' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    {label}
                  </Typography>
                  <Typography color='text.primary' sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.8rem' }}>{value}</Typography>
                </Box>
              ))}
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
