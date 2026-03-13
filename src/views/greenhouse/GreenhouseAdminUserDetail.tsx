'use client'

import { useState } from 'react'

import Button from '@mui/material/Button'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTabList from '@core/components/mui/TabList'

import { IdentityImageUploader } from '@/components/greenhouse'
import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import type { AdminUserDetail } from '@/lib/admin/get-admin-user-detail'
import { resolveAvatarPath } from '@/lib/people/resolve-avatar-path'
import { getInitials } from '@/utils/getInitials'

import UserActivityTimeline from './admin/users/UserActivityTimeline'
import UserProjectListTable from './admin/users/UserProjectListTable'
import { formatDateTime, roleColorFor, roleIconFor, statusTone, tenantTone, toTitleCase } from './admin/users/helpers'

type Props = {
  data: AdminUserDetail
}

const GreenhouseAdminUserDetail = ({ data }: Props) => {
  const [activeTab, setActiveTab] = useState('overview')
  const avatarSrc = data.avatarUrl ? `/api/media/users/${data.userId}/avatar` : resolveAvatarPath({ name: data.fullName, email: data.email })
  const projectProgress = data.projectScopes.length === 0 ? 0 : Math.min(100, 28 + data.projectScopes.length * 18)
  const primaryRole = data.roleCodes[0]

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent className='flex flex-col pbs-12 gap-6'>
                <div className='flex flex-col gap-6'>
                  <div className='flex items-center justify-center flex-col gap-4'>
                    <div className='flex flex-col items-center gap-4'>
                      <IdentityImageUploader
                        alt={data.fullName}
                        currentImageSrc={avatarSrc || undefined}
                        fallback={getInitials(data.fullName)}
                        uploadUrl={`/api/admin/users/${data.userId}/avatar`}
                        helperText={GH_INTERNAL_MESSAGES.admin_user_detail_avatar_helper}
                        successText={GH_INTERNAL_MESSAGES.admin_media_upload_success}
                        errorText={GH_INTERNAL_MESSAGES.admin_media_upload_error}
                        invalidTypeText={GH_INTERNAL_MESSAGES.admin_media_upload_invalid_type}
                        invalidSizeText={GH_INTERNAL_MESSAGES.admin_media_upload_invalid_size}
                        idleCta={GH_INTERNAL_MESSAGES.admin_media_upload_cta}
                        replaceCta={GH_INTERNAL_MESSAGES.admin_media_upload_replace}
                        uploadingCta={GH_INTERNAL_MESSAGES.admin_media_upload_progress}
                        size={120}
                        variant='rounded'
                        color={tenantTone(data.tenantType)}
                      />
                      <Box textAlign='center'>
                        <Typography variant='h5'>{data.fullName}</Typography>
                        <Typography color='text.secondary'>{data.email}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {data.jobTitle || GH_INTERNAL_MESSAGES.admin_user_detail_job_title_empty}
                        </Typography>
                      </Box>
                    </div>
                    <div className='flex items-center gap-2 flex-wrap justify-center'>
                      <Chip size='small' variant='outlined' label={data.publicUserId} />
                      {data.identityPublicId ? <Chip size='small' variant='outlined' color='info' label={data.identityPublicId} /> : null}
                      <Chip size='small' variant='tonal' color={tenantTone(data.tenantType)} label={toTitleCase(data.tenantType)} />
                      <Chip size='small' variant='tonal' color={statusTone(data.status)} label={toTitleCase(data.status)} />
                      <Chip size='small' variant='outlined' label={toTitleCase(data.authMode)} />
                    </div>
                  </div>
                  <div className='flex items-center justify-around flex-wrap gap-4'>
                    <div className='flex items-center gap-4'>
                      <CustomAvatar variant='rounded' color='primary' skin='light'>
                        <i className='tabler-folders' />
                      </CustomAvatar>
                      <div>
                        <Typography variant='h5'>{data.projectScopes.length}</Typography>
                        <Typography>{GH_INTERNAL_MESSAGES.admin_user_detail_project_scope}</Typography>
                      </div>
                    </div>
                    <div className='flex items-center gap-4'>
                      <CustomAvatar variant='rounded' color='warning' skin='light'>
                        <i className='tabler-speakerphone' />
                      </CustomAvatar>
                      <div>
                        <Typography variant='h5'>{data.campaignScopes.length}</Typography>
                        <Typography>{GH_INTERNAL_MESSAGES.admin_user_detail_campaign_scope}</Typography>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent className='flex flex-col gap-6'>
                <div>
                  <Typography variant='h5'>{GH_INTERNAL_MESSAGES.admin_user_detail_details_title}</Typography>
                  <Divider className='mlb-4' />
                  <div className='flex flex-col gap-2'>
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        {GH_INTERNAL_MESSAGES.admin_user_detail_label_public_id}
                      </Typography>
                      <Typography>{data.publicUserId}</Typography>
                    </div>
                    {data.identityPublicId ? (
                      <div className='flex items-center flex-wrap gap-x-1.5'>
                        <Typography className='font-medium' color='text.primary'>
                          {GH_INTERNAL_MESSAGES.admin_user_detail_label_identity_id}
                        </Typography>
                        <Typography>{data.identityPublicId}</Typography>
                      </div>
                    ) : null}
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        {GH_INTERNAL_MESSAGES.admin_user_detail_label_username}
                      </Typography>
                      <Typography>{data.email.split('@')[0]}</Typography>
                    </div>
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        {GH_INTERNAL_MESSAGES.admin_user_detail_label_client}
                      </Typography>
                      <Typography>{data.client.clientName}</Typography>
                    </div>
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        {GH_INTERNAL_MESSAGES.admin_user_detail_label_home}
                      </Typography>
                      <Typography>{data.defaultPortalHomePath || '--'}</Typography>
                    </div>
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        {GH_INTERNAL_MESSAGES.admin_user_detail_label_status}
                      </Typography>
                      <Typography color='text.primary'>{toTitleCase(data.status)}</Typography>
                    </div>
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        {GH_INTERNAL_MESSAGES.admin_user_detail_label_role}
                      </Typography>
                      <Typography color='text.primary'>
                        {primaryRole ? toTitleCase(primaryRole) : GH_INTERNAL_MESSAGES.admin_user_detail_no_role}
                      </Typography>
                    </div>
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        {GH_INTERNAL_MESSAGES.admin_user_detail_label_timezone}
                      </Typography>
                      <Typography color='text.primary'>{data.timezone || GH_INTERNAL_MESSAGES.admin_user_detail_no_timezone}</Typography>
                    </div>
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        {GH_INTERNAL_MESSAGES.admin_user_detail_label_locale}
                      </Typography>
                      <Typography color='text.primary'>{data.locale || GH_INTERNAL_MESSAGES.admin_user_detail_no_locale}</Typography>
                    </div>
                    <div className='flex items-center flex-wrap gap-x-1.5'>
                      <Typography className='font-medium' color='text.primary'>
                        {GH_INTERNAL_MESSAGES.admin_user_detail_label_hubspot}
                      </Typography>
                      <Typography color='text.primary'>{data.client.hubspotCompanyId || GH_INTERNAL_MESSAGES.admin_user_detail_no_hubspot}</Typography>
                    </div>
                  </div>
                </div>
                <div className='flex gap-4 justify-center'>
                  <Button variant='contained' startIcon={<i className='tabler-mail-forward' />}>
                    {GH_INTERNAL_MESSAGES.admin_user_detail_resend_onboarding}
                  </Button>
                  <Button variant='tonal' color='warning' startIcon={<i className='tabler-user-cancel' />}>
                    {GH_INTERNAL_MESSAGES.admin_user_detail_review_access}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Typography variant='h6'>{GH_INTERNAL_MESSAGES.admin_user_detail_context_title}</Typography>
                  <Box>
                    <Stack direction='row' justifyContent='space-between' alignItems='center' className='mbe-1'>
                      <Typography color='text.primary'>{GH_INTERNAL_MESSAGES.admin_user_detail_project_coverage}</Typography>
                      <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_user_detail_active_projects(data.projectScopes.length)}</Typography>
                    </Stack>
                    <LinearProgress value={projectProgress} variant='determinate' color='primary' />
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      {GH_INTERNAL_MESSAGES.admin_user_detail_route_groups}
                    </Typography>
                    <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1 }}>
                      {data.routeGroups.map(routeGroup => (
                        <Chip key={routeGroup} size='small' label={toTitleCase(routeGroup)} variant='outlined' />
                      ))}
                      {data.routeGroups.length === 0 ? <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_user_detail_no_route_groups}</Typography> : null}
                    </Stack>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      {GH_INTERNAL_MESSAGES.admin_user_detail_feature_flags}
                    </Typography>
                    <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1 }}>
                      {data.client.featureFlags.map(flag => (
                        <Chip key={flag} size='small' color='info' variant='tonal' label={toTitleCase(flag)} />
                      ))}
                      {data.client.featureFlags.length === 0 ? <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_user_detail_no_feature_flags}</Typography> : null}
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <TabContext value={activeTab}>
          <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
              <CustomTabList onChange={(_, value) => setActiveTab(value)} variant='scrollable' pill='true'>
                <Tab
                  icon={<i className='tabler-user-circle' />}
                  value='overview'
                  label={GH_INTERNAL_MESSAGES.admin_user_detail_tab_overview}
                  iconPosition='start'
                />
                <Tab
                  icon={<i className='tabler-lock' />}
                  value='security'
                  label={GH_INTERNAL_MESSAGES.admin_user_detail_tab_security}
                  iconPosition='start'
                />
                <Tab
                  icon={<i className='tabler-building-bank' />}
                  value='tenant'
                  label={GH_INTERNAL_MESSAGES.admin_user_detail_tab_tenant}
                  iconPosition='start'
                />
                <Tab
                  icon={<i className='tabler-file-invoice' />}
                  value='billing'
                  label={GH_INTERNAL_MESSAGES.admin_user_detail_tab_billing}
                  iconPosition='start'
                />
              </CustomTabList>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TabPanel value={activeTab} className='p-0'>
                {activeTab === 'overview' ? (
                  <Grid container spacing={6}>
                    <Grid size={{ xs: 12, xl: 7 }}>
                      <UserProjectListTable data={data} />
                    </Grid>
                    <Grid size={{ xs: 12, xl: 5 }}>
                      <UserActivityTimeline data={data} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={3}>
                            <Typography variant='h6'>{GH_INTERNAL_MESSAGES.admin_user_detail_campaign_context_title}</Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {GH_INTERNAL_MESSAGES.admin_user_detail_campaign_count(data.campaignScopes.length)}
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
                              {data.campaignScopes.length === 0 ? (
                                <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_user_detail_no_campaign_scopes}</Typography>
                              ) : null}
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                ) : null}

                {activeTab === 'security' ? (
                  <Grid container spacing={6}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={2.5}>
                            <Typography variant='h6'>{GH_INTERNAL_MESSAGES.admin_user_detail_access_profile_title}</Typography>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                {GH_INTERNAL_MESSAGES.admin_user_detail_auth_mode}
                              </Typography>
                              <Typography>{toTitleCase(data.authMode)}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                {GH_INTERNAL_MESSAGES.admin_user_detail_password_algorithm}
                              </Typography>
                              <Typography>{data.passwordAlgorithm || 'N/A'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                {GH_INTERNAL_MESSAGES.admin_user_detail_last_login}
                              </Typography>
                              <Typography>{formatDateTime(data.lastLoginAt)}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                {GH_INTERNAL_MESSAGES.admin_user_detail_invited_at}
                              </Typography>
                              <Typography>{formatDateTime(data.invitedAt)}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                {GH_INTERNAL_MESSAGES.admin_user_detail_roles}
                              </Typography>
                              <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1 }}>
                                {data.roleCodes.map(roleCode => (
                                  <Chip
                                    key={roleCode}
                                    size='small'
                                    variant='tonal'
                                    color={roleColorFor(roleCode)}
                                    icon={<i className={roleIconFor(roleCode)} />}
                                    label={toTitleCase(roleCode)}
                                  />
                                ))}
                                {data.roleCodes.length === 0 ? <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_user_detail_no_roles}</Typography> : null}
                              </Stack>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={2.5}>
                            <Typography variant='h6'>{GH_INTERNAL_MESSAGES.admin_user_detail_audit_title}</Typography>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                {GH_INTERNAL_MESSAGES.admin_user_detail_created}
                              </Typography>
                              <Typography>{formatDateTime(data.createdAt)}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                {GH_INTERNAL_MESSAGES.admin_user_detail_updated}
                              </Typography>
                              <Typography>{formatDateTime(data.updatedAt)}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                {GH_INTERNAL_MESSAGES.admin_user_detail_route_groups}
                              </Typography>
                              <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1 }}>
                                {data.routeGroups.map(routeGroup => (
                                  <Chip key={routeGroup} size='small' variant='outlined' label={toTitleCase(routeGroup)} />
                                ))}
                                {data.routeGroups.length === 0 ? (
                                  <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_user_detail_no_route_groups}</Typography>
                                ) : null}
                              </Stack>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                ) : null}

                {activeTab === 'tenant' ? (
                  <Grid container spacing={6}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={3}>
                            <Typography variant='h6'>{GH_INTERNAL_MESSAGES.admin_user_detail_tenant_relationship_title}</Typography>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                {GH_INTERNAL_MESSAGES.admin_user_detail_label_client}
                              </Typography>
                              <Typography>{data.client.clientName}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                {GH_INTERNAL_MESSAGES.admin_user_detail_primary_contact}
                              </Typography>
                              <Typography>{data.client.primaryContactEmail || GH_INTERNAL_MESSAGES.admin_user_detail_no_contact}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                {GH_INTERNAL_MESSAGES.admin_user_detail_label_hubspot}
                              </Typography>
                              <Typography>{data.client.hubspotCompanyId || GH_INTERNAL_MESSAGES.admin_user_detail_no_hubspot}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                {GH_INTERNAL_MESSAGES.admin_user_detail_space_id}
                              </Typography>
                              <Typography>{data.client.publicId || data.client.clientId}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='body2' color='text.secondary'>
                                {GH_INTERNAL_MESSAGES.admin_user_detail_internal_key}
                              </Typography>
                              <Typography>{data.client.clientId}</Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={3}>
                            <Typography variant='h6'>{GH_INTERNAL_MESSAGES.admin_user_detail_platform_features_title}</Typography>
                            <Typography color='text.secondary'>
                              {GH_INTERNAL_MESSAGES.admin_user_detail_platform_features_subtitle}
                            </Typography>
                            <Stack direction='row' gap={1} flexWrap='wrap'>
                              {data.client.featureFlags.map(flag => (
                                <Chip key={flag} size='small' variant='tonal' color='info' label={toTitleCase(flag)} />
                              ))}
                              {data.client.featureFlags.length === 0 ? (
                                <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_user_detail_no_active_feature_flags}</Typography>
                              ) : null}
                            </Stack>
                            <Divider />
                            <Typography variant='body2' color='text.secondary'>
                              {GH_INTERNAL_MESSAGES.admin_user_detail_current_home}
                            </Typography>
                            <Typography>{data.defaultPortalHomePath || '--'}</Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                ) : null}

                {activeTab === 'billing' ? (
                  <Grid container spacing={6}>
                    <Grid size={{ xs: 12, md: 5 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={3}>
                            <Chip
                              size='small'
                              variant='tonal'
                              color='primary'
                              label={GH_INTERNAL_MESSAGES.admin_user_detail_commercial_chip}
                              sx={{ width: 'fit-content' }}
                            />
                            <Typography variant='h2' color='primary.main'>
                              {data.client.hubspotCompanyId
                                ? GH_INTERNAL_MESSAGES.admin_user_detail_commercial_ready
                                : GH_INTERNAL_MESSAGES.admin_user_detail_commercial_pending}
                            </Typography>
                            <Typography color='text.secondary'>
                              {GH_INTERNAL_MESSAGES.admin_user_detail_commercial_subtitle}
                            </Typography>
                            <Box>
                              <Stack direction='row' justifyContent='space-between' alignItems='center' className='mbe-1'>
                                <Typography color='text.primary'>{GH_INTERNAL_MESSAGES.admin_user_detail_commercial_readiness}</Typography>
                                <Typography color='text.secondary'>{data.client.primaryContactEmail ? '65%' : '35%'}</Typography>
                              </Stack>
                              <LinearProgress variant='determinate' value={data.client.primaryContactEmail ? 65 : 35} />
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, md: 7 }}>
                      <Card>
                        <CardContent>
                          <Stack spacing={3}>
                            <Typography variant='h6'>{GH_INTERNAL_MESSAGES.admin_user_detail_commercial_title}</Typography>
                            <Typography color='text.secondary'>
                              {GH_INTERNAL_MESSAGES.admin_user_detail_commercial_body}
                            </Typography>
                            <Divider />
                            <Grid container spacing={4}>
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant='body2' color='text.secondary'>
                                  {GH_INTERNAL_MESSAGES.admin_user_detail_label_client}
                                </Typography>
                                <Typography>{data.client.clientName}</Typography>
                              </Grid>
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant='body2' color='text.secondary'>
                                  {GH_INTERNAL_MESSAGES.admin_user_detail_primary_contact_label}
                                </Typography>
                                <Typography>{data.client.primaryContactEmail || GH_INTERNAL_MESSAGES.admin_user_detail_no_contact}</Typography>
                              </Grid>
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant='body2' color='text.secondary'>
                                  {GH_INTERNAL_MESSAGES.admin_user_detail_label_hubspot}
                                </Typography>
                                <Typography>{data.client.hubspotCompanyId || GH_INTERNAL_MESSAGES.admin_user_detail_no_hubspot}</Typography>
                              </Grid>
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant='body2' color='text.secondary'>
                                  {GH_INTERNAL_MESSAGES.admin_user_detail_current_status}
                                </Typography>
                                <Typography>{GH_INTERNAL_MESSAGES.admin_user_detail_no_invoices}</Typography>
                              </Grid>
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant='body2' color='text.secondary'>
                                  {GH_INTERNAL_MESSAGES.admin_user_detail_auth_mode}
                                </Typography>
                                <Typography>{toTitleCase(data.authMode)}</Typography>
                              </Grid>
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant='body2' color='text.secondary'>
                                  {GH_INTERNAL_MESSAGES.admin_user_detail_tenant_type}
                                </Typography>
                                <Typography>{toTitleCase(data.tenantType)}</Typography>
                              </Grid>
                            </Grid>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                ) : null}
              </TabPanel>
            </Grid>
          </Grid>
        </TabContext>
      </Grid>
    </Grid>
  )
}

export default GreenhouseAdminUserDetail
