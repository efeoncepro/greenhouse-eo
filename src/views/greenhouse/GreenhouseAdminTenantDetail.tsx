'use client'

import { useRef, useState, useTransition } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'

import { IdentityImageUploader } from '@/components/greenhouse'
import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import type { AdminTenantDetail } from '@/lib/admin/get-admin-tenant-detail'
import type { TenantCapabilityRecord } from '@/lib/admin/tenant-capability-types'
import { getInitials } from '@/utils/getInitials'
import type { TenantCapabilityManagerHandle } from '@views/greenhouse/admin/tenants/TenantCapabilityManager'
import TenantCapabilitiesPanel from '@views/greenhouse/admin/tenants/TenantCapabilitiesPanel'
import TenantCrmPanel from '@views/greenhouse/admin/tenants/TenantCrmPanel'
import TenantDetailErrorBoundary from '@views/greenhouse/admin/tenants/TenantDetailErrorBoundary'
import TenantNotionPanel from '@views/greenhouse/admin/tenants/TenantNotionPanel'
import TenantProjectsPanel from '@views/greenhouse/admin/tenants/TenantProjectsPanel'
import TenantSettingsPanel from '@views/greenhouse/admin/tenants/TenantSettingsPanel'
import TenantUsersTable from '@views/greenhouse/admin/tenants/TenantUsersTable'
import { tenantStatusTone, toTitleCase } from '@views/greenhouse/admin/tenants/helpers'

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

  // ─── Left Sidebar ──────────────────────────────────────────────────────────

  const sidebar = (
    <Card>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, pt: 6 }}>
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
          size={64}
          variant='rounded'
          color={tenantStatusTone(data.status, data.active)}
        />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant='h5'>{data.clientName}</Typography>
        </Box>
        <CustomChip
          round='true'
          size='small'
          color={tenantStatusTone(data.status, data.active)}
          variant='tonal'
          label={toTitleCase(data.active ? data.status : 'inactive')}
        />

        {/* Mini-stats */}
        <Box sx={{ display: 'flex', gap: 6, width: '100%', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant='h6'>{data.activeUsers} / {data.users.length}</Typography>
            <Typography variant='caption' color='text.secondary'>Usuarios</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant='h6'>{businessLines.length}</Typography>
            <Typography variant='caption' color='text.secondary'>Líneas</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant='h6'>{data.scopedProjects}</Typography>
            <Typography variant='caption' color='text.secondary'>Proyectos</Typography>
          </Box>
        </Box>
      </CardContent>

      <Divider />

      {/* Identifiers */}
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant='overline' color='text.secondary'>Identificadores</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <i className='tabler-fingerprint' style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
          <Typography variant='body2' sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{data.publicId}</Typography>
        </Box>
        {data.hubspotCompanyId && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box component='img' src='/images/integrations/hubspot.svg' alt='HubSpot' sx={{ width: 16, height: 16, objectFit: 'contain' }} />
            <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
              HubSpot: {data.hubspotCompanyId}
            </Typography>
          </Box>
        )}
        {data.timezone && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <i className='tabler-clock' style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
            <Typography variant='body2'>{data.timezone}</Typography>
          </Box>
        )}
      </CardContent>

      <Divider />

      {/* Actions */}
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant='overline' color='text.secondary'>Acciones</Typography>
        <Button
          component={Link}
          href={`/admin/tenants/${data.clientId}/view-as/dashboard`}
          variant='tonal'
          fullWidth
          startIcon={<i className='tabler-eye' />}
        >
          {GH_INTERNAL_MESSAGES.admin_tenant_detail_view_as_client}
        </Button>
        <Button
          variant='tonal'
          color='warning'
          fullWidth
          startIcon={isRefreshingHubSpot ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-refresh' />}
          disabled={isRefreshingHubSpot}
          onClick={handleHubSpotRefresh}
        >
          {GH_INTERNAL_MESSAGES.admin_tenant_detail_refresh_hubspot}
        </Button>
      </CardContent>
    </Card>
  )

  // ─── Right Content (Tabs) ──────────────────────────────────────────────────

  const content = (
    <TabContext value={activeTab}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <CustomTabList onChange={(_, value: string) => setActiveTab(value)} variant='scrollable' pill='true'>
            <Tab icon={<i className='tabler-puzzle' />} value='capabilities' label={GH_INTERNAL_MESSAGES.admin_tenant_tabs_capabilities} iconPosition='start' />
            <Tab icon={<i className='tabler-users' />} value='usuarios' label={GH_INTERNAL_MESSAGES.admin_tenant_tabs_users} iconPosition='start' />
            <Tab icon={<i className='tabler-building' />} value='crm' label={GH_INTERNAL_MESSAGES.admin_tenant_tabs_crm} iconPosition='start' />
            <Tab icon={<i className='tabler-folder' />} value='proyectos' label={GH_INTERNAL_MESSAGES.admin_tenant_tabs_projects} iconPosition='start' />
            <Tab icon={<i className='tabler-brand-notion' />} value='notion' label={GH_INTERNAL_MESSAGES.admin_tenant_tabs_notion} iconPosition='start' />
            <Tab icon={<i className='tabler-settings' />} value='configuracion' label={GH_INTERNAL_MESSAGES.admin_tenant_tabs_settings} iconPosition='start' />
          </CustomTabList>
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
                  onSave={handleCapabilitySave}
                  isSaving={isSavingCapabilities}
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
              {activeTab === 'notion' ? (
                <TenantNotionPanel clientId={data.clientId} clientName={data.clientName} />
              ) : null}
              {activeTab === 'configuracion' ? (
                <TenantSettingsPanel data={data} />
              ) : null}
            </TabPanel>
          </TenantDetailErrorBoundary>
        </Grid>
      </Grid>
    </TabContext>
  )

  // ─── Root: Sidebar + Content ───────────────────────────────────────────────

  return (
    <>
      <Alert
        severity='info'
        variant='outlined'
        sx={{ mb: 4 }}
        action={
          <Button component={Link} href='/admin/accounts' color='info' size='small'>
            Ir a Cuentas
          </Button>
        }
      >
        Esta vista esta en transicion. La gestion de cuentas y spaces se consolida en Cuentas.
      </Alert>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 5, lg: 4 }}>
          {sidebar}
        </Grid>
        <Grid size={{ xs: 12, md: 7, lg: 8 }}>
          {content}
        </Grid>
      </Grid>
    </>
  )
}

export default GreenhouseAdminTenantDetail
