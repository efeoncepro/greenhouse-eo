'use client'

import { useRef, useState, useTransition } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import Typography from '@mui/material/Typography'

import Button from '@mui/material/Button'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import OptionMenu from '@core/components/option-menu'

import { IdentityImageUploader } from '@/components/greenhouse'
import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import type { AdminTenantDetail } from '@/lib/admin/get-admin-tenant-detail'
import type { TenantCapabilityRecord } from '@/lib/admin/tenant-capability-types'
import { getInitials } from '@/utils/getInitials'
import type { TenantCapabilityManagerHandle } from '@views/greenhouse/admin/tenants/TenantCapabilityManager'
import TenantCapabilitiesPanel from '@views/greenhouse/admin/tenants/TenantCapabilitiesPanel'
import TenantCrmPanel from '@views/greenhouse/admin/tenants/TenantCrmPanel'
import TenantDetailErrorBoundary from '@views/greenhouse/admin/tenants/TenantDetailErrorBoundary'
import TenantProjectsPanel from '@views/greenhouse/admin/tenants/TenantProjectsPanel'
import TenantSettingsPanel from '@views/greenhouse/admin/tenants/TenantSettingsPanel'
import TenantUsersTable from '@views/greenhouse/admin/tenants/TenantUsersTable'
import { formatRelativeDate, tenantStatusTone, toTitleCase } from '@views/greenhouse/admin/tenants/helpers'

type Props = {
  data: AdminTenantDetail
}

const GreenhouseAdminTenantDetail = ({ data }: Props) => {
  const router = useRouter()
  const capabilityManagerRef = useRef<TenantCapabilityManagerHandle>(null)
  const [activeTab, setActiveTab] = useState('capabilities')
  const [capabilities, setCapabilities] = useState<TenantCapabilityRecord[]>(data.capabilities)
  const [isRefreshingHubSpot, startHubSpotRefresh] = useTransition()
  const [isSavingCapabilities, startCapabilitySave] = useTransition()

  const businessLines = capabilities.filter(item => item.moduleKind === 'business_line' && item.selected)
  const serviceModules = capabilities.filter(item => item.moduleKind === 'service_module' && item.selected)

  const handleHubSpotRefresh = () => {
    startHubSpotRefresh(() => {
      router.refresh()
    })
  }

  const handleCapabilitySave = () => {
    startCapabilitySave(() => {
      capabilityManagerRef.current?.submitManualSelection()
    })
  }

  // ─── KPIs (no fake trends) ─────────────────────────────────────────────────

  const usersKpis = [
    {
      title: GH_INTERNAL_MESSAGES.admin_tenant_detail_kpi_users,
      stats: `${data.activeUsers} / ${data.users.length}`,
      subtitle: GH_INTERNAL_MESSAGES.admin_tenant_detail_kpi_users_subtitle(data.invitedUsers),
      avatarIcon: 'tabler-users',
      avatarColor: 'info' as const,
      statusLabel: data.invitedUsers > 0 ? `${data.invitedUsers} pendientes` : undefined,
      statusColor: data.invitedUsers > 0 ? ('warning' as const) : undefined
    },
    {
      title: GH_INTERNAL_MESSAGES.admin_tenant_detail_kpi_business_lines,
      stats: String(businessLines.length),
      subtitle: GH_INTERNAL_MESSAGES.admin_tenant_detail_kpi_business_lines_subtitle,
      avatarIcon: 'tabler-building',
      avatarColor: 'primary' as const
    },
    {
      title: GH_INTERNAL_MESSAGES.admin_tenant_detail_kpi_projects,
      stats: String(data.scopedProjects),
      subtitle: GH_INTERNAL_MESSAGES.admin_tenant_detail_kpi_projects_subtitle(data.notionProjectCount),
      avatarIcon: 'tabler-folders',
      avatarColor: 'success' as const
    },
    {
      title: GH_INTERNAL_MESSAGES.admin_tenant_detail_kpi_modules,
      stats: String(serviceModules.length),
      subtitle: GH_INTERNAL_MESSAGES.admin_tenant_detail_kpi_modules_subtitle,
      avatarIcon: 'tabler-puzzle',
      avatarColor: 'warning' as const
    }
  ]

  // ─── Header ─────────────────────────────────────────────────────────────────

  const headerSection = (
    <Grid size={{ xs: 12 }}>
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Grid container spacing={5} alignItems='flex-start'>
            {/* Identity */}
            <Grid size={{ xs: 12, lg: 5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <IdentityImageUploader
                  alt={data.clientName}
                  currentImageSrc={data.logoUrl ? `/api/media/tenants/${data.clientId}/logo` : undefined}
                  fallback={getInitials(data.clientName)}
                  uploadUrl={`/api/admin/tenants/${data.clientId}/logo`}
                  helperText={GH_INTERNAL_MESSAGES.admin_tenant_detail_logo_helper}
                  successText={GH_INTERNAL_MESSAGES.admin_media_upload_success}
                  errorText={GH_INTERNAL_MESSAGES.admin_media_upload_error}
                  invalidTypeText={GH_INTERNAL_MESSAGES.admin_media_upload_invalid_type}
                  invalidSizeText={GH_INTERNAL_MESSAGES.admin_media_upload_invalid_size}
                  idleCta={GH_INTERNAL_MESSAGES.admin_media_upload_cta}
                  replaceCta={GH_INTERNAL_MESSAGES.admin_media_upload_replace}
                  uploadingCta={GH_INTERNAL_MESSAGES.admin_media_upload_progress}
                  size={88}
                  variant='rounded'
                  color={tenantStatusTone(data.status, data.active)}
                />
                <Stack spacing={1.5} sx={{ flexGrow: 1 }}>
                  <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap'>
                    <Typography variant='h4' sx={{ fontWeight: 700 }}>{data.clientName}</Typography>
                    <CustomChip
                      round='true'
                      size='small'
                      color={tenantStatusTone(data.status, data.active)}
                      variant='tonal'
                      label={toTitleCase(data.active ? data.status : 'inactive')}
                    />
                  </Stack>
                  <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 400, lineHeight: 1.6 }}>
                    {GH_INTERNAL_MESSAGES.admin_tenant_detail_header_summary}
                  </Typography>
                  <Stack direction='row' spacing={2} flexWrap='wrap' sx={{ mt: 0.5 }}>
                    <Typography variant='caption' color='text.disabled' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <i className='tabler-id text-xs' /> {data.publicId}
                    </Typography>
                    {data.hubspotCompanyId ? (
                      <Typography variant='caption' color='text.disabled' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <i className='tabler-brand-hubspot text-xs' /> {data.hubspotCompanyId}
                      </Typography>
                    ) : null}
                    {data.timezone ? (
                      <Typography variant='caption' color='text.disabled' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <i className='tabler-clock text-xs' /> {data.timezone}
                      </Typography>
                    ) : null}
                    <Typography variant='caption' color='text.disabled' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <i className='tabler-refresh text-xs' /> HubSpot {formatRelativeDate(data.liveHubspot.fetchedAt)}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Grid>

            {/* KPIs */}
            <Grid size={{ xs: 12, lg: 5 }}>
              <Grid container spacing={3}>
                {usersKpis.map(kpi => (
                  <Grid key={kpi.title} size={{ xs: 6 }}>
                    <HorizontalWithSubtitle
                      title={kpi.title}
                      stats={kpi.stats}
                      avatarIcon={kpi.avatarIcon}
                      avatarColor={kpi.avatarColor}
                      subtitle={kpi.subtitle}
                      {...(kpi.statusLabel ? { statusLabel: kpi.statusLabel, statusColor: kpi.statusColor } : {})}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Actions */}
            <Grid size={{ xs: 12, lg: 2 }}>
              <Stack spacing={1.5} alignItems={{ xs: 'flex-start', lg: 'flex-end' }}>
                <Button
                  component={Link}
                  href={`/admin/tenants/${data.clientId}/view-as/dashboard`}
                  variant='contained'
                  fullWidth
                  sx={{ maxWidth: 200 }}
                >
                  {GH_INTERNAL_MESSAGES.admin_tenant_detail_view_as_client}
                </Button>
                <Button
                  variant='tonal'
                  color='warning'
                  fullWidth
                  sx={{ maxWidth: 200 }}
                  onClick={handleCapabilitySave}
                  disabled={isSavingCapabilities}
                  startIcon={isSavingCapabilities ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}
                >
                  {GH_INTERNAL_MESSAGES.admin_tenant_detail_save_manual}
                </Button>
                <OptionMenu
                  iconButtonProps={{ size: 'medium' }}
                  options={[
                    {
                      text: GH_INTERNAL_MESSAGES.admin_tenant_detail_refresh_hubspot,
                      icon: <i className='tabler-refresh text-base' />,
                      menuItemProps: {
                        className: 'flex items-center gap-2 text-textSecondary',
                        onClick: handleHubSpotRefresh
                      }
                    },
                    {
                      text: GH_INTERNAL_MESSAGES.admin_tenant_detail_open_preview,
                      icon: <i className='tabler-external-link text-base' />,
                      href: `/admin/tenants/${data.clientId}/view-as/dashboard`,
                      menuItemProps: { className: 'flex items-center gap-2 text-textSecondary' }
                    },
                    {
                      text: GH_INTERNAL_MESSAGES.admin_tenant_detail_deactivate_space,
                      icon: <i className='tabler-user-off text-base' />,
                      menuItemProps: { className: 'flex items-center gap-2 text-textSecondary', disabled: true }
                    }
                  ]}
                />
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  )

  // ─── Root ─────────────────────────────────────────────────────────────────────

  return (
    <Grid container spacing={6}>
      {headerSection}

      <Grid size={{ xs: 12 }}>
        <TabContext value={activeTab}>
          <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
              <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
                <CardContent sx={{ py: 0, '&:last-child': { pb: 0 } }}>
                  <CustomTabList onChange={(_, value) => setActiveTab(value)} variant='scrollable' pill='true'>
                    <Tab icon={<i className='tabler-puzzle' />} value='capabilities' label={GH_INTERNAL_MESSAGES.admin_tenant_tabs_capabilities} iconPosition='start' />
                    <Tab icon={<i className='tabler-users' />} value='usuarios' label={GH_INTERNAL_MESSAGES.admin_tenant_tabs_users} iconPosition='start' />
                    <Tab icon={<i className='tabler-building' />} value='crm' label={GH_INTERNAL_MESSAGES.admin_tenant_tabs_crm} iconPosition='start' />
                    <Tab icon={<i className='tabler-folder' />} value='proyectos' label={GH_INTERNAL_MESSAGES.admin_tenant_tabs_projects} iconPosition='start' />
                    <Tab icon={<i className='tabler-settings' />} value='configuracion' label={GH_INTERNAL_MESSAGES.admin_tenant_tabs_settings} iconPosition='start' />
                  </CustomTabList>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TenantDetailErrorBoundary onRetry={() => router.refresh()}>
                <TabPanel value={activeTab} className='p-0'>
                  {activeTab === 'capabilities' ? (
                    <TenantCapabilitiesPanel
                      data={data}
                      capabilities={capabilities}
                      onCapabilitiesChange={setCapabilities}
                      capabilityManagerRef={capabilityManagerRef}
                    />
                  ) : null}
                  {activeTab === 'usuarios' ? (
                    <TenantUsersTable users={data.users} />
                  ) : null}
                  {activeTab === 'crm' ? (
                    <TenantCrmPanel
                      data={data}
                      capabilities={capabilities}
                      isRefreshingHubSpot={isRefreshingHubSpot}
                      onRefreshHubSpot={handleHubSpotRefresh}
                    />
                  ) : null}
                  {activeTab === 'proyectos' ? (
                    <TenantProjectsPanel projects={data.projects} />
                  ) : null}
                  {activeTab === 'configuracion' ? (
                    <TenantSettingsPanel data={data} />
                  ) : null}
                </TabPanel>
              </TenantDetailErrorBoundary>
            </Grid>
          </Grid>
        </TabContext>
      </Grid>
    </Grid>
  )
}

export default GreenhouseAdminTenantDetail
