'use client'

import { useMemo } from 'react'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
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

import { BusinessLineBadge, BrandWordmark } from '@/components/greenhouse'
import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import type { AdminTenantDetail } from '@/lib/admin/get-admin-tenant-detail'
import type { TenantCapabilityRecord } from '@/lib/admin/tenant-capability-types'
import TenantCapabilityManager, {
  type TenantCapabilityManagerHandle
} from '@views/greenhouse/admin/tenants/TenantCapabilityManager'
import TenantServiceModulesTable from '@views/greenhouse/admin/tenants/TenantServiceModulesTable'
import {
  flagTone,
  getCapabilityPalette,
  getCapabilitySourceLabel,
  getCapabilitySourceTone
} from '@views/greenhouse/admin/tenants/helpers'

type Props = {
  data: AdminTenantDetail
  capabilities: TenantCapabilityRecord[]
  onCapabilitiesChange: (caps: TenantCapabilityRecord[]) => void
  capabilityManagerRef: React.RefObject<TenantCapabilityManagerHandle | null>
}

const TenantCapabilitiesPanel = ({ data, capabilities, onCapabilitiesChange, capabilityManagerRef }: Props) => {
  const businessLineCards = useMemo(
    () =>
      capabilities
        .filter(item => item.moduleKind === 'business_line')
        .map(capability => ({
          capability,
          palette: getCapabilityPalette(capability)
        })),
    [capabilities]
  )

  return (
    <Grid container spacing={6}>
      {/* Business Lines */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardHeader
            avatar={
              <CustomAvatar variant='rounded' color='primary' skin='filled' size={36}>
                <i className='tabler-building text-lg' />
              </CustomAvatar>
            }
            title={GH_INTERNAL_MESSAGES.admin_tenant_capabilities_business_lines_title}
            subheader={GH_INTERNAL_MESSAGES.admin_tenant_capabilities_business_lines_subtitle}
            titleTypographyProps={{ variant: 'h5' }}
            subheaderTypographyProps={{ variant: 'body2' }}
          />
          <Divider />
          <CardContent>
            <Grid container spacing={3}>
              {businessLineCards.map(({ capability, palette }) => (
                <Grid key={capability.moduleCode} size={{ xs: 12, md: 6, xl: 3 }}>
                  <Box
                    sx={{
                      p: 3,
                      height: '100%',
                      borderRadius: 3,
                      borderLeft: `4px solid ${palette.accent}`,
                      border: theme => `1px solid ${theme.palette.divider}`,
                      borderLeftColor: palette.accent,
                      bgcolor: 'background.paper',
                      transition: 'box-shadow 0.2s',
                      '&:hover': { boxShadow: 2 }
                    }}
                  >
                    <Stack spacing={2.5}>
                      <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
                        <Stack spacing={0.5}>
                          <Box sx={{ minHeight: 26, display: 'flex', alignItems: 'center' }}>
                            <BrandWordmark brand={capability.moduleLabel} height={20} maxWidth={110} />
                          </Box>
                          <Typography variant='caption' color='text.disabled'>
                            {capability.publicModuleId}
                          </Typography>
                        </Stack>
                        <BusinessLineBadge brand={palette.label} height={15} />
                      </Stack>
                      <Stack direction='row' gap={1} flexWrap='wrap'>
                        <CustomChip
                          round='true'
                          size='small'
                          color={capability.selected ? 'success' : 'secondary'}
                          variant='tonal'
                          label={
                            capability.selected
                              ? GH_INTERNAL_MESSAGES.admin_tenant_capability_state_active
                              : GH_INTERNAL_MESSAGES.admin_tenant_capability_state_available
                          }
                        />
                        <CustomChip
                          round='true'
                          size='small'
                          variant='tonal'
                          color={getCapabilitySourceTone(capability)}
                          label={getCapabilitySourceLabel(capability)}
                        />
                      </Stack>
                      <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.6 }}>
                        {capability.description || GH_INTERNAL_MESSAGES.admin_tenant_capability_description_empty}
                      </Typography>
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Service Modules + Feature Flags + Registry */}
      <Grid size={{ xs: 12, xl: 8 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}`, height: '100%' }}>
          <CardHeader
            avatar={
              <CustomAvatar variant='rounded' color='success' skin='filled' size={36}>
                <i className='tabler-puzzle text-lg' />
              </CustomAvatar>
            }
            title={GH_INTERNAL_MESSAGES.admin_tenant_capabilities_service_modules_title}
            subheader={GH_INTERNAL_MESSAGES.admin_tenant_capabilities_service_modules_subtitle}
            titleTypographyProps={{ variant: 'h5' }}
            subheaderTypographyProps={{ variant: 'body2' }}
          />
          <Divider />
          <TenantServiceModulesTable capabilities={capabilities} />
        </Card>
      </Grid>

      <Grid size={{ xs: 12, xl: 4 }}>
        <Stack spacing={4} sx={{ height: '100%' }}>
          {/* Feature Flags */}
          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}`, flexGrow: 1 }}>
            <CardHeader
              avatar={
                <CustomAvatar variant='rounded' color='warning' skin='filled' size={36}>
                  <i className='tabler-flag text-lg' />
                </CustomAvatar>
              }
              title={GH_INTERNAL_MESSAGES.admin_tenant_capabilities_feature_flags_title}
              titleTypographyProps={{ variant: 'h6' }}
            />
            <Divider />
            <CardContent>
              {data.featureFlags.length === 0 ? (
                <Typography variant='body2' color='text.secondary'>
                  {GH_INTERNAL_MESSAGES.admin_tenant_capabilities_feature_flags_empty}
                </Typography>
              ) : (
                <Stack direction='row' gap={1} flexWrap='wrap'>
                  {data.featureFlags.map(flag => (
                    <CustomChip
                      key={flag.featureCode}
                      round='true'
                      size='small'
                      color={flagTone(flag.status)}
                      variant='tonal'
                      label={flag.featureCode}
                    />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* Company Record */}
          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
            <CardHeader
              avatar={
                <CustomAvatar variant='rounded' color='info' skin='filled' size={36}>
                  <i className='tabler-brand-hubspot text-lg' />
                </CustomAvatar>
              }
              title={GH_INTERNAL_MESSAGES.admin_tenant_capabilities_company_record}
              titleTypographyProps={{ variant: 'h6' }}
            />
            <Divider />
            <CardContent>
              <Typography variant='body2' color={data.hubspotCompanyId ? 'text.primary' : 'text.secondary'}>
                {data.hubspotCompanyId ? `EO-${data.hubspotCompanyId}` : GH_INTERNAL_MESSAGES.admin_tenant_capabilities_company_record_empty}
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      {/* Governance Manager */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <Accordion disableGutters elevation={0} defaultExpanded sx={{ '&:before': { display: 'none' } }}>
            <AccordionSummary
              expandIcon={<i className='tabler-chevron-down' />}
              sx={{ px: 4, py: 2 }}
            >
              <Stack direction='row' spacing={2} alignItems='center'>
                <CustomAvatar variant='rounded' color='secondary' skin='filled' size={36}>
                  <i className='tabler-adjustments text-lg' />
                </CustomAvatar>
                <Box>
                  <Typography variant='h6'>{GH_INTERNAL_MESSAGES.admin_tenant_capabilities_edit_title}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {GH_INTERNAL_MESSAGES.admin_tenant_capabilities_edit_subtitle}
                  </Typography>
                </Box>
              </Stack>
            </AccordionSummary>
            <Divider />
            <AccordionDetails sx={{ p: 4 }}>
              <TenantCapabilityManager
                ref={capabilityManagerRef}
                clientId={data.clientId}
                hubspotCompanyId={data.hubspotCompanyId}
                initialCapabilities={data.capabilities}
                onCapabilitiesChange={onCapabilitiesChange}
              />
            </AccordionDetails>
          </Accordion>
        </Card>
      </Grid>
    </Grid>
  )
}

export default TenantCapabilitiesPanel
