'use client'

import { useState } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import Typography from '@mui/material/Typography'

import CustomTabList from '@core/components/mui/TabList'

import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import type { AdminUserDetail } from '@/lib/admin/get-admin-user-detail'

import UserActivityTimeline from './admin/users/UserActivityTimeline'
import UserDetailHeader from './admin/users/UserDetailHeader'
import UserProjectListTable from './admin/users/UserProjectListTable'
import UserRoleManager from './admin/users/UserRoleManager'
import { formatDateTime, roleColorFor, roleIconFor, statusTone, toTitleCase } from './admin/users/helpers'

type Props = {
  data: AdminUserDetail
}

// ── AboutOverview pattern: icon + label + value ──

const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <div className='flex items-center gap-2'>
    <i className={icon} aria-hidden='true' />
    <div className='flex items-center flex-wrap gap-2'>
      <Typography className='font-medium'>{label}</Typography>
      <Typography>{value}</Typography>
    </div>
  </div>
)

// ── Tab: Perfil ──

const TabProfile = ({ data }: Props) => {
  return (
    <Grid container spacing={6}>
      {/* Card 1: Sobre el usuario (AboutOverview pattern) */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='flex flex-col gap-6'>
            <div className='flex flex-col gap-4'>
              <Typography className='uppercase' variant='body2' color='text.disabled'>
                {GH_INTERNAL_MESSAGES.admin_user_detail_section_personal}
              </Typography>
              <InfoRow icon='tabler-user' label={GH_INTERNAL_MESSAGES.admin_user_detail_label_name} value={data.fullName} />
              <InfoRow icon='tabler-mail' label={GH_INTERNAL_MESSAGES.admin_user_detail_label_email} value={data.email} />
              <InfoRow
                icon='tabler-briefcase'
                label={GH_INTERNAL_MESSAGES.admin_user_detail_label_job_title}
                value={data.jobTitle || GH_INTERNAL_MESSAGES.admin_user_detail_no_job_title}
              />
              <InfoRow icon='tabler-at' label={GH_INTERNAL_MESSAGES.admin_user_detail_label_username} value={data.email.split('@')[0]} />
              <InfoRow
                icon='tabler-circle-check'
                label={GH_INTERNAL_MESSAGES.admin_user_detail_label_status}
                value={toTitleCase(data.status)}
              />
            </div>
            <div className='flex flex-col gap-4'>
              <Typography className='uppercase' variant='body2' color='text.disabled'>
                {GH_INTERNAL_MESSAGES.admin_user_detail_section_contact}
              </Typography>
              <InfoRow
                icon='tabler-clock'
                label={GH_INTERNAL_MESSAGES.admin_user_detail_label_timezone}
                value={data.timezone || GH_INTERNAL_MESSAGES.admin_user_detail_no_timezone}
              />
              <InfoRow
                icon='tabler-language'
                label={GH_INTERNAL_MESSAGES.admin_user_detail_label_locale}
                value={data.locale || GH_INTERNAL_MESSAGES.admin_user_detail_no_locale}
              />
            </div>
            <div className='flex flex-col gap-4'>
              <Typography className='uppercase' variant='body2' color='text.disabled'>
                {GH_INTERNAL_MESSAGES.admin_user_detail_section_identifiers}
              </Typography>
              {data.eoId && (
                <InfoRow icon='tabler-fingerprint' label='EO-ID:' value={data.eoId} />
              )}
              <InfoRow icon='tabler-id' label={GH_INTERNAL_MESSAGES.admin_user_detail_label_public_id} value={data.publicUserId} />
            </div>
            {data.eoId && data.linkedMemberId && (
              <Button
                component={Link}
                href={`/people/${data.eoId}`}
                variant='tonal'
                size='small'
                startIcon={<i className='tabler-user' />}
              >
                {GH_INTERNAL_MESSAGES.admin_user_detail_link_people}
              </Button>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Card 2 + 3: Proyectos y Actividad */}
      <Grid size={{ xs: 12, xl: 7 }}>
        <UserProjectListTable data={data} />
      </Grid>
      <Grid size={{ xs: 12, xl: 5 }}>
        <UserActivityTimeline data={data} />
      </Grid>

      {/* Card 4: Campanas */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title={GH_INTERNAL_MESSAGES.admin_user_detail_campaign_context_title} />
          <CardContent>
            <Typography color='text.secondary' className='mbe-4'>
              {GH_INTERNAL_MESSAGES.admin_user_detail_campaign_context_description(data.campaignScopes.length)}
            </Typography>
            <Stack direction='row' gap={1} flexWrap='wrap'>
              {data.campaignScopes.map(scope => (
                <Chip
                  key={scope.campaignId}
                  size='small'
                  variant='outlined'
                  color={statusTone(scope.accessLevel)}
                  label={`${scope.campaignId} · ${toTitleCase(scope.accessLevel)}`}
                />
              ))}
              {data.campaignScopes.length === 0 && (
                <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_user_detail_no_campaign_scopes}</Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

// ── Tab: Seguridad ──

const TabSecurity = ({ data }: Props) => (
  <Grid container spacing={6}>
    {/* Card 1: Perfil de autenticacion */}
    <Grid size={{ xs: 12, md: 6 }}>
      <Card>
        <CardHeader
          title={GH_INTERNAL_MESSAGES.admin_user_detail_auth_title}
          subheader={GH_INTERNAL_MESSAGES.admin_user_detail_auth_description}
        />
        <CardContent className='flex flex-col gap-4'>
          <InfoRow
            icon='tabler-shield-lock'
            label={GH_INTERNAL_MESSAGES.admin_user_detail_label_auth_mode}
            value={toTitleCase(data.authMode)}
          />
          <InfoRow
            icon='tabler-key'
            label={GH_INTERNAL_MESSAGES.admin_user_detail_label_password_algorithm}
            value={data.passwordAlgorithm || GH_INTERNAL_MESSAGES.admin_user_detail_no_password_algorithm}
          />
          <InfoRow
            icon='tabler-login'
            label={GH_INTERNAL_MESSAGES.admin_user_detail_label_last_login}
            value={data.lastLoginAt ? formatDateTime(data.lastLoginAt) : GH_INTERNAL_MESSAGES.admin_user_detail_never_logged_in}
          />
          <InfoRow
            icon='tabler-mail-forward'
            label={GH_INTERNAL_MESSAGES.admin_user_detail_label_invited_at}
            value={data.invitedAt ? formatDateTime(data.invitedAt) : GH_INTERNAL_MESSAGES.admin_user_detail_not_invited}
          />
        </CardContent>
      </Card>
    </Grid>

    {/* Card 2: Roles y permisos (read-only overview) */}
    <Grid size={{ xs: 12, md: 6 }}>
      <Card>
        <CardHeader
          title={GH_INTERNAL_MESSAGES.admin_user_detail_roles_overview_title}
          subheader={GH_INTERNAL_MESSAGES.admin_user_detail_roles_overview_description}
        />
        <CardContent className='flex flex-col gap-4'>
          <Box>
            <Stack direction='row' gap={1} flexWrap='wrap'>
              {data.roleCodes.map(roleCode => (
                <Chip
                  key={roleCode}
                  size='small'
                  variant='tonal'
                  color={roleColorFor(roleCode)}
                  icon={<i className={roleIconFor(roleCode)} aria-hidden='true' />}
                  label={toTitleCase(roleCode)}
                />
              ))}
              {data.roleCodes.length === 0 && (
                <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_user_detail_no_roles}</Typography>
              )}
            </Stack>
          </Box>
          <Divider />
          <Box>
            <Typography variant='body2' color='text.secondary' className='mbe-2'>
              {GH_INTERNAL_MESSAGES.admin_user_detail_route_groups}
            </Typography>
            <Stack direction='row' gap={1} flexWrap='wrap'>
              {data.routeGroups.map(routeGroup => (
                <Chip key={routeGroup} size='small' variant='outlined' label={toTitleCase(routeGroup)} />
              ))}
              {data.routeGroups.length === 0 && (
                <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_user_detail_no_route_groups}</Typography>
              )}
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Grid>

    {/* Card 3: Auditoria */}
    <Grid size={{ xs: 12 }}>
      <Card>
        <CardHeader
          title={GH_INTERNAL_MESSAGES.admin_user_detail_audit_title}
          subheader={GH_INTERNAL_MESSAGES.admin_user_detail_audit_description}
        />
        <CardContent>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <InfoRow
                icon='tabler-calendar-plus'
                label={GH_INTERNAL_MESSAGES.admin_user_detail_label_created}
                value={formatDateTime(data.createdAt)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <InfoRow
                icon='tabler-calendar-check'
                label={GH_INTERNAL_MESSAGES.admin_user_detail_label_updated}
                value={formatDateTime(data.updatedAt)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
)

// ── Tab: Organizacion ──

const TabOrganization = ({ data }: Props) => {
  return (
    <Grid container spacing={6}>
      {/* Card 1: Relacion con el tenant (AccountDetails Grid 6/6 pattern) */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title={GH_INTERNAL_MESSAGES.admin_user_detail_tenant_title}
            subheader={GH_INTERNAL_MESSAGES.admin_user_detail_tenant_description}
          />
          <CardContent>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow icon='tabler-building' label={GH_INTERNAL_MESSAGES.admin_user_detail_label_client} value={data.client.clientName} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow
                  icon='tabler-mail'
                  label={GH_INTERNAL_MESSAGES.admin_user_detail_label_contact}
                  value={data.client.primaryContactEmail || GH_INTERNAL_MESSAGES.admin_user_detail_no_contact}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow
                  icon='tabler-brand-hubspot'
                  label={GH_INTERNAL_MESSAGES.admin_user_detail_label_hubspot}
                  value={data.client.hubspotCompanyId || GH_INTERNAL_MESSAGES.admin_user_detail_no_hubspot}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow
                  icon='tabler-hash'
                  label={GH_INTERNAL_MESSAGES.admin_user_detail_label_space_id}
                  value={data.client.publicId || data.client.clientId}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow icon='tabler-key' label={GH_INTERNAL_MESSAGES.admin_user_detail_label_internal_key} value={data.client.clientId} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow
                  icon='tabler-category'
                  label={GH_INTERNAL_MESSAGES.admin_user_detail_label_tenant_type}
                  value={toTitleCase(data.tenantType)}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Card 2: Funcionalidades activas */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card className='h-full'>
          <CardHeader
            title={GH_INTERNAL_MESSAGES.admin_user_detail_features_title}
            subheader={GH_INTERNAL_MESSAGES.admin_user_detail_features_description}
          />
          <CardContent className='flex flex-col gap-4'>
            <Box>
              <Typography variant='body2' color='text.secondary' className='mbe-2'>
                {GH_INTERNAL_MESSAGES.admin_user_detail_feature_flags}
              </Typography>
              <Stack direction='row' gap={1} flexWrap='wrap'>
                {data.client.featureFlags.map(flag => (
                  <Chip key={flag} size='small' variant='tonal' color='info' label={toTitleCase(flag)} />
                ))}
                {data.client.featureFlags.length === 0 && (
                  <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_user_detail_no_feature_flags}</Typography>
                )}
              </Stack>
            </Box>
            <Divider />
            <InfoRow icon='tabler-home' label={GH_INTERNAL_MESSAGES.admin_user_detail_label_home} value={data.defaultPortalHomePath || '--'} />
          </CardContent>
        </Card>
      </Grid>

      {/* Card 3: Preparacion comercial */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card className='h-full'>
          <CardHeader
            title={GH_INTERNAL_MESSAGES.admin_user_detail_commercial_title}
            subheader={GH_INTERNAL_MESSAGES.admin_user_detail_commercial_description}
          />
          <CardContent className='flex flex-col gap-4'>
            <Chip
              size='small'
              variant='tonal'
              color='primary'
              label={GH_INTERNAL_MESSAGES.admin_user_detail_commercial_chip}
              sx={{ width: 'fit-content' }}
            />
            <Typography variant='h4' color='primary.main'>
              {data.client.hubspotCompanyId
                ? GH_INTERNAL_MESSAGES.admin_user_detail_commercial_ready
                : GH_INTERNAL_MESSAGES.admin_user_detail_commercial_pending}
            </Typography>
            <Box>
              <Stack direction='row' justifyContent='space-between' alignItems='center' className='mbe-1'>
                <Typography color='text.primary'>{GH_INTERNAL_MESSAGES.admin_user_detail_commercial_readiness}</Typography>
                <Typography color='text.secondary'>
                  {GH_INTERNAL_MESSAGES.admin_user_detail_commercial_readiness_value(!!data.client.primaryContactEmail)}
                </Typography>
              </Stack>
              <LinearProgress
                variant='determinate'
                value={data.client.primaryContactEmail ? 65 : 35}
                color='primary'
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

// ── Main Component ──

const GreenhouseAdminUserDetail = ({ data }: Props) => {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <Grid container spacing={6}>
      {/* Header: User Profile pattern with banner + avatar + metadata */}
      <Grid size={{ xs: 12 }}>
        <UserDetailHeader data={data} />
      </Grid>

      {/* Tabs: Account Settings pattern — full width */}
      <Grid size={{ xs: 12 }}>
        <TabContext value={activeTab}>
          <CustomTabList onChange={(_, value: string) => setActiveTab(value)} variant='scrollable' pill='true'>
            <Tab
              icon={<i className='tabler-user-check' />}
              value='profile'
              label={GH_INTERNAL_MESSAGES.admin_user_detail_tab_profile}
              iconPosition='start'
            />
            <Tab
              icon={<i className='tabler-lock' />}
              value='security'
              label={GH_INTERNAL_MESSAGES.admin_user_detail_tab_security}
              iconPosition='start'
            />
            <Tab
              icon={<i className='tabler-building' />}
              value='organization'
              label={GH_INTERNAL_MESSAGES.admin_user_detail_tab_organization}
              iconPosition='start'
            />
            <Tab
              icon={<i className='tabler-shield-check' />}
              value='roles'
              label={GH_INTERNAL_MESSAGES.admin_user_detail_tab_roles}
              iconPosition='start'
            />
          </CustomTabList>

          <TabPanel value='profile' className='p-0 pbs-6'>
            <TabProfile data={data} />
          </TabPanel>
          <TabPanel value='security' className='p-0 pbs-6'>
            <TabSecurity data={data} />
          </TabPanel>
          <TabPanel value='organization' className='p-0 pbs-6'>
            <TabOrganization data={data} />
          </TabPanel>
          <TabPanel value='roles' className='p-0 pbs-6'>
            <UserRoleManager
              userId={data.userId}
              tenantType={data.tenantType}
              initialRoleCodes={data.roleCodes}
            />
          </TabPanel>
        </TabContext>
      </Grid>
    </Grid>
  )
}

export default GreenhouseAdminUserDetail
