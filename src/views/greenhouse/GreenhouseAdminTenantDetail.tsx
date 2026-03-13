'use client'

import { useMemo, useRef, useState, useTransition } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomTabList from '@core/components/mui/TabList'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import OptionMenu from '@core/components/option-menu'

import { BusinessLineBadge, BrandWordmark, IdentityImageUploader } from '@/components/greenhouse'
import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import type { AdminTenantDetail } from '@/lib/admin/get-admin-tenant-detail'
import type { TenantCapabilityRecord } from '@/lib/admin/tenant-capability-types'
import { buildUserPublicId } from '@/lib/ids/greenhouse-ids'
import {
  chunkTenantContactIds,
  MAX_TENANT_CONTACT_PROVISIONING_BATCH_SIZE,
  mergeTenantContactsProvisioningSummaries,
  type TenantContactsProvisioningSummary
} from '@/lib/admin/tenant-member-provisioning-shared'
import { getInitials } from '@/utils/getInitials'
import TenantCapabilityManager, {
  type TenantCapabilityManagerHandle
} from '@views/greenhouse/admin/tenants/TenantCapabilityManager'
import TenantDetailEmptyState from '@views/greenhouse/admin/tenants/TenantDetailEmptyState'
import TenantDetailErrorBoundary from '@views/greenhouse/admin/tenants/TenantDetailErrorBoundary'
import TenantServiceModulesTable from '@views/greenhouse/admin/tenants/TenantServiceModulesTable'
import TenantUsersTable from '@views/greenhouse/admin/tenants/TenantUsersTable'
import {
  flagTone,
  formatDateTime,
  formatRelativeDate,
  getCapabilityPalette,
  getCapabilitySourceLabel,
  getCapabilitySourceTone,
  getDisplayNote,
  getFriendlyHubspotError,
  normalizeEmailValue,
  tenantStatusTone,
  toTitleCase
} from '@views/greenhouse/admin/tenants/helpers'

type Props = {
  data: AdminTenantDetail
}

const buildProvisionFeedback = (summary: TenantContactsProvisioningSummary) => {
  const fragments = [
    `${summary.created} creados`,
    `${summary.reconciled} reconciliados`,
    `${summary.conflicts} conflictos`,
    `${summary.invalid} invalidos`,
    `${summary.errors} errores`
  ]

  const message = `Provision CRM ejecutado sobre ${summary.requested} contactos: ${fragments.join(' | ')}.`

  if (summary.errors > 0) return { tone: 'error' as const, message }
  if (summary.conflicts > 0 || summary.invalid > 0) return { tone: 'warning' as const, message }
  if (summary.created > 0 || summary.reconciled > 0) return { tone: 'success' as const, message }

  return { tone: 'info' as const, message }
}

const GreenhouseAdminTenantDetail = ({ data }: Props) => {
  const router = useRouter()
  const capabilityManagerRef = useRef<TenantCapabilityManagerHandle>(null)
  const [activeTab, setActiveTab] = useState('capabilities')
  const [activeCrmTab, setActiveCrmTab] = useState('contacto')
  const [capabilities, setCapabilities] = useState<TenantCapabilityRecord[]>(data.capabilities)
  const [isProvisioningContacts, setIsProvisioningContacts] = useState(false)
  const [isRefreshingHubSpot, startHubSpotRefresh] = useTransition()
  const [isSavingCapabilities, startCapabilitySave] = useTransition()

  const [provisionProgress, setProvisionProgress] = useState<{
    completedBatches: number
    totalBatches: number
    processedContacts: number
    totalContacts: number
  } | null>(null)

  const [provisionFeedback, setProvisionFeedback] = useState<{
    tone: 'success' | 'info' | 'warning' | 'error'
    message: string
  } | null>(null)

  const businessLines = capabilities.filter(item => item.moduleKind === 'business_line' && item.selected)
  const serviceModules = capabilities.filter(item => item.moduleKind === 'service_module' && item.selected)
  const displayNote = getDisplayNote(data.notes, data.hubspotCompanyId)
  const liveCompany = data.liveHubspot.company
  const liveOwner = data.liveHubspot.owner
  const liveContacts = data.liveHubspot.contacts
  const liveMode = data.liveHubspot.contract?.realtime.mode || 'polling_or_on_demand'
  const liveIsRealtime = data.liveHubspot.contract?.realtime.supported === true
  const hasFriendlyHubspotError = Boolean(data.liveHubspot.error)

  const usersByEmail = data.users.reduce<Map<string, typeof data.users>>((map, user) => {
    const normalizedEmail = normalizeEmailValue(user.email)

    if (!normalizedEmail) return map

    const current = map.get(normalizedEmail) || []

    current.push(user)
    map.set(normalizedEmail, current)

    return map
  }, new Map())

  const usersByHubspotContactId = data.users.reduce<Map<string, typeof data.users>>((map, user) => {
    user.hubspotContactIds.forEach(contactId => {
      const current = map.get(contactId) || []

      current.push(user)
      map.set(contactId, current)
    })

    return map
  }, new Map())

  const reconciledLiveContacts = liveContacts.map(contact => {
    const normalizedEmail = normalizeEmailValue(contact.email)
    const matchedByContactId = usersByHubspotContactId.get(contact.hubspotContactId) || []
    const matchedByEmail = normalizedEmail ? usersByEmail.get(normalizedEmail) || [] : []
    const matchedUsers = Array.from(new Map([...matchedByContactId, ...matchedByEmail].map(user => [user.userId, user])).values())

    return {
      contact,
      normalizedEmail,
      matchedUsers,
      matchedByContactId: matchedByContactId.length > 0,
      expectedPublicUserId: buildUserPublicId({ userId: `user-hubspot-contact-${contact.hubspotContactId}` })
    }
  })

  const provisionedLiveContacts = reconciledLiveContacts.filter(item => item.matchedUsers.length === 1)
  const ambiguousLiveContacts = reconciledLiveContacts.filter(item => item.matchedUsers.length > 1)
  const missingLiveContacts = reconciledLiveContacts.filter(item => Boolean(item.normalizedEmail) && item.matchedUsers.length === 0)
  const contactsWithoutEmail = reconciledLiveContacts.filter(item => !item.normalizedEmail)

  const duplicateUsersByEmail = Array.from(usersByEmail.entries())
    .filter(([, users]) => users.length > 1)
    .map(([email, users]) => ({ email, users }))

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

  const crmTabs = [
    { value: 'contacto', label: GH_INTERNAL_MESSAGES.admin_tenant_crm_tab_contact, icon: 'tabler-users' },
    { value: 'cuerpo', label: GH_INTERNAL_MESSAGES.admin_tenant_crm_tab_body, icon: 'tabler-id-badge-2' },
    { value: 'ciclo', label: GH_INTERNAL_MESSAGES.admin_tenant_crm_tab_cycle, icon: 'tabler-refresh-dot' },
    { value: 'proveedor', label: GH_INTERNAL_MESSAGES.admin_tenant_crm_tab_provider, icon: 'tabler-building-store' }
  ] as const

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

  const handleProvisionMissingContacts = async () => {
    if (missingLiveContacts.length === 0) return

    setProvisionFeedback(null)
    setIsProvisioningContacts(true)

    try {
      const contactIds = missingLiveContacts.map(item => item.contact.hubspotContactId)
      const batches = chunkTenantContactIds(contactIds)
      const summaries: TenantContactsProvisioningSummary[] = []

      setProvisionProgress({
        completedBatches: 0,
        totalBatches: batches.length,
        processedContacts: 0,
        totalContacts: contactIds.length
      })

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
        const batch = batches[batchIndex]

        const response = await fetch(`/api/admin/tenants/${data.clientId}/contacts/provision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactIds: batch,
            contactsSnapshotToken: data.contactsSnapshotToken
          })
        })

        const payload = (await response.json().catch(() => null)) as
          | (TenantContactsProvisioningSummary & { error?: string })
          | null

                      if (!response.ok || !payload) {
          const mergedSummary = mergeTenantContactsProvisioningSummaries(summaries)
          const processedContacts = mergedSummary?.requested || 0

          setProvisionFeedback({
            tone: 'error',
            message: GH_INTERNAL_MESSAGES.admin_tenant_crm_provision_error_partial(processedContacts, contactIds.length)
          })

          if (processedContacts > 0) router.refresh()

          return
        }

        summaries.push(payload)

        setProvisionProgress({
          completedBatches: batchIndex + 1,
          totalBatches: batches.length,
          processedContacts: summaries.reduce((total, summary) => total + summary.requested, 0),
          totalContacts: contactIds.length
        })
      }

      const mergedSummary = mergeTenantContactsProvisioningSummaries(summaries)

      if (!mergedSummary) {
        setProvisionFeedback({
          tone: 'info',
          message: GH_INTERNAL_MESSAGES.admin_tenant_crm_no_contacts
        })

        return
      }

      setProvisionFeedback(buildProvisionFeedback(mergedSummary))
      router.refresh()
    } catch {
      setProvisionFeedback({
        tone: 'error',
        message: GH_INTERNAL_MESSAGES.admin_tenant_crm_provision_error
      })
    } finally {
      setIsProvisioningContacts(false)
      setProvisionProgress(null)
    }
  }

  const usersKpis = [
    {
      title: GH_INTERNAL_MESSAGES.admin_tenant_detail_kpi_users,
      value: `${data.activeUsers} / ${data.users.length}`,
      subtitle: GH_INTERNAL_MESSAGES.admin_tenant_detail_kpi_users_subtitle(data.invitedUsers)
    },
    {
      title: GH_INTERNAL_MESSAGES.admin_tenant_detail_kpi_business_lines,
      value: String(businessLines.length),
      subtitle: GH_INTERNAL_MESSAGES.admin_tenant_detail_kpi_business_lines_subtitle
    },
    {
      title: GH_INTERNAL_MESSAGES.admin_tenant_detail_kpi_projects,
      value: String(data.scopedProjects),
      subtitle: GH_INTERNAL_MESSAGES.admin_tenant_detail_kpi_projects_subtitle(data.notionProjectCount)
    },
    {
      title: GH_INTERNAL_MESSAGES.admin_tenant_detail_kpi_modules,
      value: String(serviceModules.length),
      subtitle: GH_INTERNAL_MESSAGES.admin_tenant_detail_kpi_modules_subtitle
    }
  ]

  const headerSection = (
    <Grid size={{ xs: 12 }}>
      <Card>
        <CardContent>
          <Grid container spacing={4} alignItems='center'>
            <Grid size={{ xs: 12, xl: 7 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }}>
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
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }} flexWrap='wrap'>
                    <Typography variant='h4'>{data.clientName}</Typography>
                    <Chip
                      size='small'
                      variant='tonal'
                      color={tenantStatusTone(data.status, data.active)}
                      label={toTitleCase(data.active ? data.status : 'inactive')}
                    />
                  </Stack>

                  <Typography color='text.secondary' sx={{ maxWidth: 780 }}>
                    {GH_INTERNAL_MESSAGES.admin_tenant_detail_header_summary}
                  </Typography>

                  <Typography variant='body2' color='text.secondary'>
                    {GH_INTERNAL_MESSAGES.admin_tenant_detail_header_meta(
                      data.publicId,
                      data.hubspotCompanyId,
                      data.timezone,
                      formatRelativeDate(data.liveHubspot.fetchedAt)
                    )}
                  </Typography>
                </Stack>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, xl: 5 }}>
              <Stack spacing={2.5}>
                <Grid container spacing={2}>
                  {usersKpis.map(item => (
                    <Grid key={item.title} size={{ xs: 6 }}>
                      <Box
                        sx={{
                          p: 2.5,
                          borderRadius: 3,
                          border: theme => `1px solid ${theme.palette.divider}`,
                          backgroundColor: 'background.default',
                          minHeight: 104
                        }}
                      >
                        <Typography variant='body2' color='text.secondary'>
                          {item.title}
                        </Typography>
                        <Typography variant='h4' sx={{ mt: 1 }}>
                          {item.value}
                        </Typography>
                        <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                          {item.subtitle}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent='flex-end' alignItems={{ xs: 'stretch', sm: 'center' }}>
                  <Button component={Link} href={`/admin/tenants/${data.clientId}/view-as/dashboard`} variant='contained'>
                    {GH_INTERNAL_MESSAGES.admin_tenant_detail_view_as_client}
                  </Button>
                  <Button
                    variant='tonal'
                    color='warning'
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
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  )

  const capabilitiesPanel = (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant='h5'>{GH_INTERNAL_MESSAGES.admin_tenant_capabilities_business_lines_title}</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
                  {GH_INTERNAL_MESSAGES.admin_tenant_capabilities_business_lines_subtitle}
                </Typography>
              </Box>
              <Grid container spacing={3}>
                {businessLineCards.map(({ capability, palette }) => (
                  <Grid key={capability.moduleCode} size={{ xs: 12, md: 6, xl: 3 }}>
                    <Box
                      sx={{
                        p: 3,
                        height: '100%',
                        borderRadius: 4,
                        border: `1px solid ${palette.soft}`,
                        background: `linear-gradient(180deg, ${palette.soft} 0%, rgba(255,255,255,0) 100%)`
                      }}
                    >
                      <Stack spacing={2}>
                        <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
                          <Box>
                            <Box sx={{ minHeight: 28, display: 'flex', alignItems: 'center' }}>
                              <BrandWordmark brand={capability.moduleLabel} height={22} maxWidth={110} />
                            </Box>
                            <Typography variant='body2' color='text.secondary'>
                              {capability.publicModuleId}
                            </Typography>
                          </Box>
                          <BusinessLineBadge brand={palette.label} height={16} />
                        </Stack>
                        <Stack direction='row' gap={1} flexWrap='wrap'>
                          <Chip
                            size='small'
                            variant='tonal'
                            color={capability.selected ? 'success' : 'secondary'}
                            label={
                              capability.selected
                                ? GH_INTERNAL_MESSAGES.admin_tenant_capability_state_active
                                : GH_INTERNAL_MESSAGES.admin_tenant_capability_state_available
                            }
                          />
                          <Chip
                            size='small'
                            variant='outlined'
                            color={getCapabilitySourceTone(capability)}
                            label={getCapabilitySourceLabel(capability)}
                          />
                        </Stack>
                        <Typography variant='body2' color='text.secondary'>
                          {capability.description || GH_INTERNAL_MESSAGES.admin_tenant_capability_description_empty}
                        </Typography>
                      </Stack>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, xl: 8 }}>
        <Card>
          <CardContent sx={{ pb: 0 }}>
            <Stack spacing={1}>
              <Typography variant='h5'>{GH_INTERNAL_MESSAGES.admin_tenant_capabilities_service_modules_title}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {GH_INTERNAL_MESSAGES.admin_tenant_capabilities_service_modules_subtitle}
              </Typography>
            </Stack>
          </CardContent>
          <TenantServiceModulesTable capabilities={capabilities} />
        </Card>
      </Grid>

      <Grid size={{ xs: 12, xl: 4 }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Typography variant='h6'>{GH_INTERNAL_MESSAGES.admin_tenant_capabilities_feature_flags_title}</Typography>
              <Stack direction='row' gap={1} flexWrap='wrap'>
                {data.featureFlags.map(flag => (
                  <Chip
                    key={flag.featureCode}
                    size='small'
                    color={flagTone(flag.status)}
                    variant='tonal'
                    label={flag.featureCode}
                  />
                ))}
                {data.featureFlags.length === 0 ? (
                  <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_tenant_capabilities_feature_flags_empty}</Typography>
                ) : null}
              </Stack>
              <Divider />
              <Box>
                <Typography variant='body2' color='text.secondary'>
                  {GH_INTERNAL_MESSAGES.admin_tenant_capabilities_company_record}
                </Typography>
                <Typography color='text.primary' sx={{ mt: 1 }}>
                  {data.hubspotCompanyId ? `EO-${data.hubspotCompanyId}` : GH_INTERNAL_MESSAGES.admin_tenant_capabilities_company_record_empty}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Accordion disableGutters defaultExpanded>
          <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
            <Box>
              <Typography variant='h6'>{GH_INTERNAL_MESSAGES.admin_tenant_capabilities_edit_title}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {GH_INTERNAL_MESSAGES.admin_tenant_capabilities_edit_subtitle}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <TenantCapabilityManager
              ref={capabilityManagerRef}
              clientId={data.clientId}
              hubspotCompanyId={data.hubspotCompanyId}
              initialCapabilities={data.capabilities}
              onCapabilitiesChange={setCapabilities}
            />
          </AccordionDetails>
        </Accordion>
      </Grid>
    </Grid>
  )

  const crmPanel = (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, lg: 8 }}>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant='h5'>{GH_INTERNAL_MESSAGES.admin_tenant_crm_config_title}</Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
                      {GH_INTERNAL_MESSAGES.admin_tenant_crm_config_subtitle}
                    </Typography>
                  </Box>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ p: 3, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
                        <Typography variant='body2' color='text.secondary'>
                          {GH_INTERNAL_MESSAGES.admin_tenant_crm_business_lines}
                        </Typography>
                        <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1.5 }}>
                          {businessLines.map(capability => (
                            <BusinessLineBadge key={capability.moduleCode} brand={capability.moduleLabel} />
                          ))}
                          {businessLines.length === 0 ? <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_tenant_crm_business_lines_empty}</Typography> : null}
                        </Stack>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ p: 3, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
                        <Typography variant='body2' color='text.secondary'>
                          {GH_INTERNAL_MESSAGES.admin_tenant_crm_service_modules}
                        </Typography>
                        <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1.5 }}>
                          {serviceModules.map(capability => (
                            <Chip key={capability.moduleCode} size='small' variant='outlined' label={capability.moduleLabel} />
                          ))}
                          {serviceModules.length === 0 ? <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_tenant_crm_service_modules_empty}</Typography> : null}
                        </Stack>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ p: 3, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
                        <Typography variant='body2' color='text.secondary'>
                          {GH_INTERNAL_MESSAGES.admin_tenant_crm_lifecycle}
                        </Typography>
                        <Typography variant='h6' sx={{ mt: 1.5 }}>
                          {liveCompany?.lifecycle.lifecyclestage
                            ? toTitleCase(liveCompany.lifecycle.lifecyclestage)
                            : GH_INTERNAL_MESSAGES.admin_tenant_crm_lifecycle_empty}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {liveCompany?.lifecycle.hs_current_customer || liveMode}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, lg: 4 }}>
                <Stack spacing={2}>
                  <Alert severity={hasFriendlyHubspotError ? 'warning' : 'success'}>
                    {hasFriendlyHubspotError
                      ? getFriendlyHubspotError()
                      : GH_INTERNAL_MESSAGES.admin_tenant_crm_live_ok}
                  </Alert>
                  <Button
                    variant='tonal'
                    color='secondary'
                    onClick={handleHubSpotRefresh}
                    disabled={isRefreshingHubSpot}
                    startIcon={isRefreshingHubSpot ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-refresh' />}
                  >
                    {GH_INTERNAL_MESSAGES.admin_tenant_crm_retry_live}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', xl: 'row' }} gap={2} justifyContent='space-between' alignItems={{ xs: 'stretch', xl: 'center' }}>
                <Box>
                  <Typography variant='h5'>{GH_INTERNAL_MESSAGES.admin_tenant_crm_contacts_title}</Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
                    {GH_INTERNAL_MESSAGES.admin_tenant_crm_contacts_subtitle}
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', md: 'row' }} gap={1} flexWrap='wrap'>
                  <Chip size='small' variant='tonal' color='info' label={GH_INTERNAL_MESSAGES.admin_tenant_crm_chip_hubspot(liveContacts.length)} />
                  <Chip
                    size='small'
                    variant='outlined'
                    color='success'
                    label={GH_INTERNAL_MESSAGES.admin_tenant_crm_chip_reconciled(provisionedLiveContacts.length)}
                  />
                  <Chip
                    size='small'
                    variant='outlined'
                    color='warning'
                    label={GH_INTERNAL_MESSAGES.admin_tenant_crm_chip_pending(missingLiveContacts.length)}
                  />
                  {ambiguousLiveContacts.length > 0 ? (
                    <Chip
                      size='small'
                      variant='outlined'
                      color='error'
                      label={GH_INTERNAL_MESSAGES.admin_tenant_crm_chip_ambiguous(ambiguousLiveContacts.length)}
                    />
                  ) : null}
                  {contactsWithoutEmail.length > 0 ? (
                    <Chip
                      size='small'
                      variant='outlined'
                      color='secondary'
                      label={GH_INTERNAL_MESSAGES.admin_tenant_crm_chip_no_email(contactsWithoutEmail.length)}
                    />
                  ) : null}
                  <Button
                    variant='contained'
                    color='warning'
                    disabled={
                      isProvisioningContacts ||
                      missingLiveContacts.length === 0 ||
                      !data.liveHubspot.serviceConfigured ||
                      hasFriendlyHubspotError
                    }
                    onClick={handleProvisionMissingContacts}
                    startIcon={isProvisioningContacts ? <CircularProgress color='inherit' size={16} /> : <i className='tabler-user-plus' />}
                  >
                    {isProvisioningContacts
                      ? GH_INTERNAL_MESSAGES.admin_tenant_crm_provision_progress(
                          provisionProgress?.processedContacts || 0,
                          provisionProgress?.totalContacts || missingLiveContacts.length
                        )
                      : GH_INTERNAL_MESSAGES.admin_tenant_crm_provision_action(missingLiveContacts.length)}
                  </Button>
                </Stack>
              </Stack>

              <Alert severity='info'>
                {GH_INTERNAL_MESSAGES.admin_tenant_crm_provision_info} {GH_INTERNAL_MESSAGES.admin_tenant_crm_provision_batches(
                  MAX_TENANT_CONTACT_PROVISIONING_BATCH_SIZE
                )}
              </Alert>

              {duplicateUsersByEmail.length > 0 || ambiguousLiveContacts.length > 0 ? (
                <Alert severity='warning'>
                  {GH_INTERNAL_MESSAGES.admin_tenant_crm_reconciliation_warning}
                </Alert>
              ) : null}

              {provisionProgress ? (
                <Alert severity='info'>
                  {GH_INTERNAL_MESSAGES.admin_tenant_crm_batch_progress(
                    Math.min(provisionProgress.completedBatches + 1, provisionProgress.totalBatches),
                    provisionProgress.totalBatches,
                    provisionProgress.processedContacts,
                    provisionProgress.totalContacts
                  )}
                </Alert>
              ) : null}

              {provisionFeedback ? <Alert severity={provisionFeedback.tone}>{provisionFeedback.message}</Alert> : null}

              {hasFriendlyHubspotError ? (
                <TenantDetailEmptyState
                  icon='tabler-plug-connected-x'
                  title={GH_INTERNAL_MESSAGES.admin_tenant_crm_empty_load_title}
                  description={GH_INTERNAL_MESSAGES.admin_tenant_crm_empty_load_description}
                  actionLabel={GH_INTERNAL_MESSAGES.admin_tenant_crm_retry_live}
                  onAction={handleHubSpotRefresh}
                  disabled={isRefreshingHubSpot}
                />
              ) : liveContacts.length === 0 ? (
                <TenantDetailEmptyState
                  icon='tabler-address-book-off'
                  title={GH_INTERNAL_MESSAGES.admin_tenant_crm_empty_no_contacts_title}
                  description={GH_INTERNAL_MESSAGES.admin_tenant_crm_empty_no_contacts_description}
                  actionLabel={GH_INTERNAL_MESSAGES.admin_tenant_crm_sync_now}
                  onAction={handleHubSpotRefresh}
                  disabled={isRefreshingHubSpot}
                />
              ) : (
                <TabContext value={activeCrmTab}>
                  <Stack spacing={3}>
                    <CustomTabList onChange={(_, value) => setActiveCrmTab(value)} variant='scrollable' pill='true'>
                      {crmTabs.map(tab => (
                        <Tab key={tab.value} icon={<i className={tab.icon} />} value={tab.value} label={tab.label} iconPosition='start' />
                      ))}
                    </CustomTabList>

                    <TabPanel value={activeCrmTab} className='p-0'>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>{GH_INTERNAL_MESSAGES.admin_tenant_crm_header_contact}</TableCell>
                              <TableCell>
                                {activeCrmTab === 'contacto'
                                  ? GH_INTERNAL_MESSAGES.admin_tenant_crm_header_channels
                                  : activeCrmTab === 'cuerpo'
                                    ? GH_INTERNAL_MESSAGES.admin_tenant_crm_header_role
                                    : activeCrmTab === 'ciclo'
                                      ? GH_INTERNAL_MESSAGES.admin_tenant_crm_header_cycle
                                      : GH_INTERNAL_MESSAGES.admin_tenant_crm_header_provider}
                              </TableCell>
                              <TableCell>{GH_INTERNAL_MESSAGES.admin_tenant_crm_header_user}</TableCell>
                              <TableCell>{GH_INTERNAL_MESSAGES.admin_tenant_crm_header_status}</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {reconciledLiveContacts.map(({ contact, matchedUsers, matchedByContactId, normalizedEmail, expectedPublicUserId }) => {
                              const provisionTone =
                                matchedUsers.length > 1 ? 'error' : matchedUsers.length === 1 ? 'success' : normalizedEmail ? 'warning' : 'default'

                              const provisionLabel =
                                matchedUsers.length > 1
                                  ? GH_INTERNAL_MESSAGES.admin_tenant_crm_status_ambiguous
                                  : matchedUsers.length === 1
                                    ? GH_INTERNAL_MESSAGES.admin_tenant_crm_status_provisioned
                                    : normalizedEmail
                                      ? GH_INTERNAL_MESSAGES.admin_tenant_crm_status_pending
                                      : GH_INTERNAL_MESSAGES.admin_tenant_crm_status_no_email

                              return (
                                <TableRow key={`${activeCrmTab}-${contact.hubspotContactId}`} hover>
                                  <TableCell>
                                    <Stack spacing={0.75}>
                                      <Typography color='text.primary' className='font-medium'>
                                        {contact.displayName || contact.email || `Contacto ${contact.hubspotContactId}`}
                                      </Typography>
                                      <Typography variant='body2' color='text.secondary'>
                                        {contact.hubspotContactId} | {contact.email || GH_INTERNAL_MESSAGES.admin_tenant_crm_status_no_email}
                                      </Typography>
                                    </Stack>
                                  </TableCell>
                                  <TableCell>
                                    {activeCrmTab === 'contacto' ? (
                                      <Stack spacing={0.75}>
                                        <Typography variant='body2'>
                                          {contact.phone || contact.mobilePhone || GH_INTERNAL_MESSAGES.admin_tenant_crm_phone_empty}
                                        </Typography>
                                        <Typography variant='body2' color='text.secondary'>
                                          {contact.company || GH_INTERNAL_MESSAGES.admin_tenant_crm_company_empty}
                                        </Typography>
                                      </Stack>
                                    ) : null}
                                    {activeCrmTab === 'cuerpo' ? (
                                      <Stack spacing={0.75}>
                                        <Typography variant='body2'>{contact.jobTitle || GH_INTERNAL_MESSAGES.admin_tenant_crm_job_empty}</Typography>
                                        <Typography variant='body2' color='text.secondary'>
                                          {contact.company || GH_INTERNAL_MESSAGES.admin_tenant_crm_company_empty}
                                        </Typography>
                                      </Stack>
                                    ) : null}
                                    {activeCrmTab === 'ciclo' ? (
                                      <Stack spacing={0.75}>
                                        <Typography variant='body2'>
                                          {contact.lifecyclestage || GH_INTERNAL_MESSAGES.admin_tenant_crm_lead_stage_empty}
                                        </Typography>
                                        <Typography variant='body2' color='text.secondary'>
                                          {contact.hsLeadStatus || GH_INTERNAL_MESSAGES.admin_tenant_crm_lead_status_empty}
                                        </Typography>
                                      </Stack>
                                    ) : null}
                                    {activeCrmTab === 'proveedor' ? (
                                      <Stack spacing={0.75}>
                                        <Typography variant='body2'>
                                          {matchedByContactId
                                            ? GH_INTERNAL_MESSAGES.admin_tenant_crm_exact_match
                                            : GH_INTERNAL_MESSAGES.admin_tenant_crm_reconciled_email}
                                        </Typography>
                                        <Typography variant='body2' color='text.secondary'>
                                          {GH_INTERNAL_MESSAGES.admin_tenant_crm_expected_id(expectedPublicUserId)}
                                        </Typography>
                                      </Stack>
                                    ) : null}
                                  </TableCell>
                                  <TableCell>
                                    {matchedUsers.length === 1 ? (
                                      <Stack spacing={0.75}>
                                        <Typography component={Link} href={`/admin/users/${matchedUsers[0].userId}`} color='text.primary' className='font-medium'>
                                          {matchedUsers[0].fullName}
                                        </Typography>
                                        <Typography variant='body2' color='text.secondary'>
                                          {matchedUsers[0].publicUserId} | {matchedUsers[0].email}
                                        </Typography>
                                        <Chip
                                          size='small'
                                          variant='outlined'
                                          color={matchedByContactId ? 'success' : 'warning'}
                                          label={
                                            matchedByContactId
                                              ? GH_INTERNAL_MESSAGES.admin_tenant_crm_reconciled_label_exact
                                              : GH_INTERNAL_MESSAGES.admin_tenant_crm_reconciled_label_email
                                          }
                                          sx={{ width: 'fit-content' }}
                                        />
                                      </Stack>
                                    ) : matchedUsers.length > 1 ? (
                                      <Stack spacing={0.75}>
                                        {matchedUsers.map(user => (
                                          <Typography key={user.userId} variant='body2' color='text.secondary'>
                                            {user.publicUserId} | {user.email}
                                          </Typography>
                                        ))}
                                      </Stack>
                                    ) : (
                                      <Stack spacing={0.75}>
                                        <Typography variant='body2' color='text.secondary'>
                                          {GH_INTERNAL_MESSAGES.admin_tenant_crm_no_access}
                                        </Typography>
                                        <Typography variant='body2' color='text.secondary'>
                                          {GH_INTERNAL_MESSAGES.admin_tenant_crm_expected_id(expectedPublicUserId)}
                                        </Typography>
                                      </Stack>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Chip size='small' variant='tonal' color={provisionTone} label={provisionLabel} />
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </TabPanel>
                  </Stack>
                </TabContext>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Accordion>
          <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
            <Box>
              <Typography variant='h6'>{GH_INTERNAL_MESSAGES.admin_tenant_crm_hubspot_read_title}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {GH_INTERNAL_MESSAGES.admin_tenant_crm_hubspot_read_subtitle}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant='outlined'>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Typography variant='subtitle1'>{GH_INTERNAL_MESSAGES.admin_tenant_crm_company_profile}</Typography>
                      <Typography color='text.primary'>{liveCompany?.identity.name || GH_INTERNAL_MESSAGES.admin_tenant_crm_company_profile_empty}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {liveCompany?.identity.domain || '--'} | {liveCompany?.identity.industry || '--'}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {liveCompany?.identity.city || '--'}, {liveCompany?.identity.country || '--'}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant='outlined'>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Typography variant='subtitle1'>{GH_INTERNAL_MESSAGES.admin_tenant_crm_owner}</Typography>
                      <Typography color='text.primary'>{liveOwner?.ownerDisplayName || GH_INTERNAL_MESSAGES.admin_tenant_crm_owner_empty}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {liveOwner?.ownerEmail || '--'}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        HubSpot owner ID: {liveOwner?.hubspotOwnerId || liveCompany?.owner.hubspotOwnerId || '--'}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant='outlined'>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Typography variant='subtitle1'>{GH_INTERNAL_MESSAGES.admin_tenant_crm_sync}</Typography>
                      <Stack direction='row' gap={1} flexWrap='wrap'>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={data.liveHubspot.serviceConfigured ? 'success' : 'secondary'}
                          label={
                            data.liveHubspot.serviceConfigured
                              ? GH_INTERNAL_MESSAGES.admin_tenant_crm_sync_connected
                              : GH_INTERNAL_MESSAGES.admin_tenant_crm_sync_disconnected
                          }
                        />
                        <Chip size='small' variant='outlined' color={liveIsRealtime ? 'success' : 'warning'} label={liveIsRealtime ? 'Realtime' : liveMode} />
                      </Stack>
                      <Typography variant='body2' color='text.secondary'>
                        {GH_INTERNAL_MESSAGES.admin_tenant_crm_last_read(formatDateTime(data.liveHubspot.fetchedAt))}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {GH_INTERNAL_MESSAGES.admin_tenant_crm_base_url(data.liveHubspot.serviceBaseUrl || '--')}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Grid>
    </Grid>
  )

  const projectsPanel = (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={2} justifyContent='space-between' alignItems={{ xs: 'stretch', md: 'center' }}>
          <Box>
            <Typography variant='h5'>{GH_INTERNAL_MESSAGES.admin_tenant_projects_title}</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
              {GH_INTERNAL_MESSAGES.admin_tenant_projects_subtitle}
            </Typography>
          </Box>
          <Button variant='contained' startIcon={<i className='tabler-plus' />} disabled>
            {GH_INTERNAL_MESSAGES.admin_tenant_projects_add}
          </Button>
        </Stack>
      </Grid>

      {data.projects.length === 0 ? (
        <Grid size={{ xs: 12 }}>
          <TenantDetailEmptyState
            icon='tabler-folder-off'
            title={GH_INTERNAL_MESSAGES.admin_tenant_projects_empty_title}
            description={GH_INTERNAL_MESSAGES.admin_tenant_projects_empty_description}
          />
        </Grid>
      ) : null}

      {data.projects.length > 0 && data.projects.length <= 3 ? (
        <Grid size={{ xs: 12 }}>
          <Grid container spacing={3}>
            {data.projects.map(project => (
              <Grid key={project.projectId} size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction='row' justifyContent='space-between' gap={2}>
                        <Typography variant='h6'>{project.projectName}</Typography>
                        <Chip size='small' variant='outlined' label={GH_INTERNAL_MESSAGES.admin_tenant_projects_users(project.assignedUsers)} />
                      </Stack>
                      <Typography variant='body2' color='text.secondary'>
                        {project.projectId}
                      </Typography>
                      {project.pageUrl ? (
                        <Button component={Link} href={project.pageUrl} target='_blank' variant='text' sx={{ px: 0, width: 'fit-content' }}>
                          {GH_INTERNAL_MESSAGES.admin_tenant_projects_open_source}
                        </Button>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      ) : null}

      {data.projects.length > 3 ? (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{GH_INTERNAL_MESSAGES.admin_tenant_projects_header_project}</TableCell>
                      <TableCell>{GH_INTERNAL_MESSAGES.admin_tenant_projects_header_id}</TableCell>
                      <TableCell>{GH_INTERNAL_MESSAGES.admin_tenant_projects_header_users}</TableCell>
                      <TableCell>{GH_INTERNAL_MESSAGES.admin_tenant_projects_header_state}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.projects.map(project => (
                      <TableRow key={project.projectId} hover>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography color='text.primary'>{project.projectName}</Typography>
                            {project.pageUrl ? (
                              <Typography component={Link} href={project.pageUrl} target='_blank' color='primary'>
                                {GH_INTERNAL_MESSAGES.admin_tenant_projects_open_source}
                              </Typography>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell>{project.projectId}</TableCell>
                        <TableCell>{project.assignedUsers}</TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            variant='tonal'
                            color='info'
                            label={GH_INTERNAL_MESSAGES.admin_tenant_projects_state_scoped}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      ) : null}
    </Grid>
  )

  const settingsPanel = (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, xl: 4 }}>
        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <Typography variant='h6'>{GH_INTERNAL_MESSAGES.admin_tenant_settings_identity_title}</Typography>
              {[
                [GH_INTERNAL_MESSAGES.admin_tenant_settings_label_space_id, data.publicId],
                [GH_INTERNAL_MESSAGES.admin_tenant_settings_label_internal_key, data.clientId],
                [GH_INTERNAL_MESSAGES.admin_tenant_settings_label_hubspot, data.hubspotCompanyId || GH_INTERNAL_MESSAGES.admin_tenant_capabilities_company_record_empty],
                [GH_INTERNAL_MESSAGES.admin_tenant_settings_label_home, data.portalHomePath || '--'],
                [GH_INTERNAL_MESSAGES.admin_tenant_settings_label_timezone, data.timezone || '--']
              ].map(([label, value]) => (
                <Box key={label}>
                  <Typography variant='body2' color='text.secondary'>
                    {label}
                  </Typography>
                  <Typography color='text.primary'>{value}</Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, xl: 4 }}>
        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <Typography variant='h6'>{GH_INTERNAL_MESSAGES.admin_tenant_settings_access_title}</Typography>
              <HorizontalWithSubtitle
                title={GH_INTERNAL_MESSAGES.admin_tenant_settings_active_users}
                stats={String(data.activeUsers)}
                avatarIcon='tabler-user-check'
                avatarColor='success'
                trend='neutral'
                trendNumber='0'
                subtitle={GH_INTERNAL_MESSAGES.admin_tenant_settings_active_users_subtitle(data.invitedUsers)}
              />
              <HorizontalWithSubtitle
                title={GH_INTERNAL_MESSAGES.admin_tenant_settings_scoped_projects}
                stats={String(data.scopedProjects)}
                avatarIcon='tabler-folders'
                avatarColor='primary'
                trend='neutral'
                trendNumber='0'
                subtitle={GH_INTERNAL_MESSAGES.admin_tenant_settings_scoped_projects_subtitle(data.notionProjectCount)}
              />
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, xl: 4 }}>
        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <Typography variant='h6'>{GH_INTERNAL_MESSAGES.admin_tenant_settings_company_record_title}</Typography>
              <Stack direction='row' gap={1} flexWrap='wrap'>
                <Chip
                  size='small'
                  variant='tonal'
                  color={data.liveHubspot.serviceConfigured ? 'success' : 'secondary'}
                  label={
                    data.liveHubspot.serviceConfigured
                      ? GH_INTERNAL_MESSAGES.admin_tenant_settings_company_connected
                      : GH_INTERNAL_MESSAGES.admin_tenant_settings_company_disconnected
                  }
                />
                <Chip size='small' variant='outlined' color={liveIsRealtime ? 'success' : 'warning'} label={liveIsRealtime ? 'Realtime' : liveMode} />
              </Stack>
              <Box>
                <Typography variant='body2' color='text.secondary'>
                  {GH_INTERNAL_MESSAGES.admin_tenant_settings_live_sync}
                </Typography>
                <Typography color='text.primary'>{formatDateTime(data.liveHubspot.fetchedAt)}</Typography>
              </Box>
              <Box>
                <Typography variant='body2' color='text.secondary'>
                  {GH_INTERNAL_MESSAGES.admin_tenant_settings_tenant_updated}
                </Typography>
                <Typography color='text.primary'>{formatDateTime(data.updatedAt)}</Typography>
              </Box>
              <Box>
                <Typography variant='body2' color='text.secondary'>
                  {GH_INTERNAL_MESSAGES.admin_tenant_settings_created}
                </Typography>
                <Typography color='text.primary'>{formatDateTime(data.createdAt)}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant='h6'>{GH_INTERNAL_MESSAGES.admin_tenant_settings_notes_title}</Typography>
              <CustomTextField
                multiline
                minRows={4}
                fullWidth
                value={displayNote || GH_INTERNAL_MESSAGES.admin_tenant_settings_notes_empty}
                slotProps={{
                  input: {
                    readOnly: true
                  }
                }}
                helperText={GH_INTERNAL_MESSAGES.admin_tenant_settings_notes_helper}
              />
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )

  return (
    <Grid container spacing={6}>
      {headerSection}

      <Grid size={{ xs: 12 }}>
        <TabContext value={activeTab}>
          <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
              <CustomTabList onChange={(_, value) => setActiveTab(value)} variant='scrollable' pill='true'>
                <Tab
                  icon={<i className='tabler-puzzle' />}
                  value='capabilities'
                  label={GH_INTERNAL_MESSAGES.admin_tenant_tabs_capabilities}
                  iconPosition='start'
                />
                <Tab icon={<i className='tabler-users' />} value='usuarios' label={GH_INTERNAL_MESSAGES.admin_tenant_tabs_users} iconPosition='start' />
                <Tab icon={<i className='tabler-building' />} value='crm' label={GH_INTERNAL_MESSAGES.admin_tenant_tabs_crm} iconPosition='start' />
                <Tab
                  icon={<i className='tabler-folder' />}
                  value='proyectos'
                  label={GH_INTERNAL_MESSAGES.admin_tenant_tabs_projects}
                  iconPosition='start'
                />
                <Tab
                  icon={<i className='tabler-settings' />}
                  value='configuracion'
                  label={GH_INTERNAL_MESSAGES.admin_tenant_tabs_settings}
                  iconPosition='start'
                />
              </CustomTabList>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TenantDetailErrorBoundary onRetry={() => router.refresh()}>
                <TabPanel value={activeTab} className='p-0'>
                  {activeTab === 'capabilities' ? capabilitiesPanel : null}
                  {activeTab === 'usuarios' ? (
                    <Grid container spacing={6}>
                      <Grid size={{ xs: 12 }}>
                        <TenantUsersTable users={data.users} />
                      </Grid>
                    </Grid>
                  ) : null}
                  {activeTab === 'crm' ? crmPanel : null}
                  {activeTab === 'proyectos' ? projectsPanel : null}
                  {activeTab === 'configuracion' ? settingsPanel : null}
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
