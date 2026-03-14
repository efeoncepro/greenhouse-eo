'use client'

import { useState } from 'react'

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
import CardHeader from '@mui/material/CardHeader'
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

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTabList from '@core/components/mui/TabList'

import { BusinessLineBadge } from '@/components/greenhouse'
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
import TenantDetailEmptyState from '@views/greenhouse/admin/tenants/TenantDetailEmptyState'
import {
  formatDateTime,
  getFriendlyHubspotError,
  normalizeEmailValue,
  toTitleCase
} from '@views/greenhouse/admin/tenants/helpers'

type Props = {
  data: AdminTenantDetail
  capabilities: TenantCapabilityRecord[]
  isRefreshingHubSpot: boolean
  onRefreshHubSpot: () => void
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

const TenantCrmPanel = ({ data, capabilities, isRefreshingHubSpot, onRefreshHubSpot }: Props) => {
  const router = useRouter()
  const [activeCrmTab, setActiveCrmTab] = useState('contacto')
  const [isProvisioningContacts, setIsProvisioningContacts] = useState(false)

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

  const liveCompany = data.liveHubspot.company
  const liveOwner = data.liveHubspot.owner
  const liveContacts = data.liveHubspot.contacts
  const liveMode = data.liveHubspot.contract?.realtime.mode || 'polling_or_on_demand'
  const liveIsRealtime = data.liveHubspot.contract?.realtime.supported === true
  const hasFriendlyHubspotError = Boolean(data.liveHubspot.error)

  const usersByEmail = data.users.reduce<Map<string, typeof data.users>>((map, user) => {
    const email = normalizeEmailValue(user.email)

    if (!email) return map

    const current = map.get(email) || []

    current.push(user)
    map.set(email, current)

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

  const crmTabs = [
    { value: 'contacto', label: GH_INTERNAL_MESSAGES.admin_tenant_crm_tab_contact, icon: 'tabler-users' },
    { value: 'cuerpo', label: GH_INTERNAL_MESSAGES.admin_tenant_crm_tab_body, icon: 'tabler-id-badge-2' },
    { value: 'ciclo', label: GH_INTERNAL_MESSAGES.admin_tenant_crm_tab_cycle, icon: 'tabler-refresh-dot' },
    { value: 'proveedor', label: GH_INTERNAL_MESSAGES.admin_tenant_crm_tab_provider, icon: 'tabler-building-store' }
  ] as const

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

  return (
    <Grid container spacing={6}>
      {/* CRM Config */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardHeader
            avatar={
              <CustomAvatar variant='rounded' color='error' skin='filled' size={36}>
                <i className='tabler-building-store text-lg' />
              </CustomAvatar>
            }
            title={GH_INTERNAL_MESSAGES.admin_tenant_crm_config_title}
            subheader={GH_INTERNAL_MESSAGES.admin_tenant_crm_config_subtitle}
            titleTypographyProps={{ variant: 'h5' }}
            subheaderTypographyProps={{ variant: 'body2' }}
          />
          <Divider />
          <CardContent>
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, lg: 8 }}>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ p: 3, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}`, height: '100%' }}>
                      <Stack spacing={1.5}>
                        <Typography variant='overline' color='text.disabled'>
                          {GH_INTERNAL_MESSAGES.admin_tenant_crm_business_lines}
                        </Typography>
                        <Stack direction='row' gap={1} flexWrap='wrap'>
                          {businessLines.map(capability => (
                            <BusinessLineBadge key={capability.moduleCode} brand={capability.moduleLabel} />
                          ))}
                          {businessLines.length === 0 ? (
                            <Typography variant='body2' color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_tenant_crm_business_lines_empty}</Typography>
                          ) : null}
                        </Stack>
                      </Stack>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ p: 3, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}`, height: '100%' }}>
                      <Stack spacing={1.5}>
                        <Typography variant='overline' color='text.disabled'>
                          {GH_INTERNAL_MESSAGES.admin_tenant_crm_service_modules}
                        </Typography>
                        <Stack direction='row' gap={1} flexWrap='wrap'>
                          {serviceModules.map(capability => (
                            <CustomChip key={capability.moduleCode} round='true' size='small' variant='tonal' color='secondary' label={capability.moduleLabel} />
                          ))}
                          {serviceModules.length === 0 ? (
                            <Typography variant='body2' color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_tenant_crm_service_modules_empty}</Typography>
                          ) : null}
                        </Stack>
                      </Stack>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ p: 3, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}`, height: '100%' }}>
                      <Stack spacing={1.5}>
                        <Typography variant='overline' color='text.disabled'>
                          {GH_INTERNAL_MESSAGES.admin_tenant_crm_lifecycle}
                        </Typography>
                        <Typography variant='h6' sx={{ fontWeight: 600 }}>
                          {liveCompany?.lifecycle.lifecyclestage
                            ? toTitleCase(liveCompany.lifecycle.lifecyclestage)
                            : GH_INTERNAL_MESSAGES.admin_tenant_crm_lifecycle_empty}
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {liveCompany?.lifecycle.hs_current_customer || liveMode}
                        </Typography>
                      </Stack>
                    </Box>
                  </Grid>
                </Grid>
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
                    onClick={onRefreshHubSpot}
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

      {/* Contact Reconciliation */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardHeader
            avatar={
              <CustomAvatar variant='rounded' color='info' skin='filled' size={36}>
                <i className='tabler-users text-lg' />
              </CustomAvatar>
            }
            title={GH_INTERNAL_MESSAGES.admin_tenant_crm_contacts_title}
            subheader={GH_INTERNAL_MESSAGES.admin_tenant_crm_contacts_subtitle}
            titleTypographyProps={{ variant: 'h5' }}
            subheaderTypographyProps={{ variant: 'body2' }}
            action={
              <Stack direction='row' gap={1} flexWrap='wrap' alignItems='center' sx={{ pt: 1, pr: 1 }}>
                <CustomChip round='true' size='small' color='info' variant='tonal' label={GH_INTERNAL_MESSAGES.admin_tenant_crm_chip_hubspot(liveContacts.length)} />
                <CustomChip round='true' size='small' color='success' variant='tonal' label={GH_INTERNAL_MESSAGES.admin_tenant_crm_chip_reconciled(provisionedLiveContacts.length)} />
                <CustomChip round='true' size='small' color='warning' variant='tonal' label={GH_INTERNAL_MESSAGES.admin_tenant_crm_chip_pending(missingLiveContacts.length)} />
                {ambiguousLiveContacts.length > 0 ? (
                  <CustomChip round='true' size='small' color='error' variant='tonal' label={GH_INTERNAL_MESSAGES.admin_tenant_crm_chip_ambiguous(ambiguousLiveContacts.length)} />
                ) : null}
                {contactsWithoutEmail.length > 0 ? (
                  <CustomChip round='true' size='small' color='secondary' variant='tonal' label={GH_INTERNAL_MESSAGES.admin_tenant_crm_chip_no_email(contactsWithoutEmail.length)} />
                ) : null}
                <Button
                  variant='contained'
                  color='warning'
                  size='small'
                  disabled={
                    isProvisioningContacts ||
                    missingLiveContacts.length === 0 ||
                    !data.liveHubspot.serviceConfigured ||
                    hasFriendlyHubspotError
                  }
                  onClick={handleProvisionMissingContacts}
                  startIcon={isProvisioningContacts ? <CircularProgress color='inherit' size={14} /> : <i className='tabler-user-plus' />}
                >
                  {isProvisioningContacts
                    ? GH_INTERNAL_MESSAGES.admin_tenant_crm_provision_progress(
                        provisionProgress?.processedContacts || 0,
                        provisionProgress?.totalContacts || missingLiveContacts.length
                      )
                    : GH_INTERNAL_MESSAGES.admin_tenant_crm_provision_action(missingLiveContacts.length)}
                </Button>
              </Stack>
            }
          />
          <Divider />
          <CardContent>
            <Stack spacing={3}>
              <Alert severity='info'>
                {GH_INTERNAL_MESSAGES.admin_tenant_crm_provision_info}{' '}
                {GH_INTERNAL_MESSAGES.admin_tenant_crm_provision_batches(MAX_TENANT_CONTACT_PROVISIONING_BATCH_SIZE)}
              </Alert>

              {ambiguousLiveContacts.length > 0 ? (
                <Alert severity='warning'>{GH_INTERNAL_MESSAGES.admin_tenant_crm_reconciliation_warning}</Alert>
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
                  onAction={onRefreshHubSpot}
                  disabled={isRefreshingHubSpot}
                />
              ) : liveContacts.length === 0 ? (
                <TenantDetailEmptyState
                  icon='tabler-address-book-off'
                  title={GH_INTERNAL_MESSAGES.admin_tenant_crm_empty_no_contacts_title}
                  description={GH_INTERNAL_MESSAGES.admin_tenant_crm_empty_no_contacts_description}
                  actionLabel={GH_INTERNAL_MESSAGES.admin_tenant_crm_sync_now}
                  onAction={onRefreshHubSpot}
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
                                        <CustomChip
                                          round='true'
                                          size='small'
                                          color={matchedByContactId ? 'success' : 'warning'}
                                          variant='tonal'
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
                                    <CustomChip round='true' size='small' variant='tonal' color={provisionTone === 'default' ? 'secondary' : provisionTone} label={provisionLabel} />
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

      {/* HubSpot Raw Read */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<i className='tabler-chevron-down' />} sx={{ px: 4, py: 2 }}>
              <Stack direction='row' spacing={2} alignItems='center'>
                <CustomAvatar variant='rounded' color='secondary' skin='filled' size={36}>
                  <i className='tabler-database text-lg' />
                </CustomAvatar>
                <Box>
                  <Typography variant='h6'>{GH_INTERNAL_MESSAGES.admin_tenant_crm_hubspot_read_title}</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {GH_INTERNAL_MESSAGES.admin_tenant_crm_hubspot_read_subtitle}
                  </Typography>
                </Box>
              </Stack>
            </AccordionSummary>
            <Divider />
            <AccordionDetails sx={{ p: 4 }}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card variant='outlined'>
                    <CardContent>
                      <Stack spacing={1.5}>
                        <Typography variant='overline' color='text.disabled'>{GH_INTERNAL_MESSAGES.admin_tenant_crm_company_profile}</Typography>
                        <Typography color='text.primary'>{liveCompany?.identity.name || GH_INTERNAL_MESSAGES.admin_tenant_crm_company_profile_empty}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {liveCompany?.identity.domain || '--'} · {liveCompany?.identity.industry || '--'}
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
                        <Typography variant='overline' color='text.disabled'>{GH_INTERNAL_MESSAGES.admin_tenant_crm_owner}</Typography>
                        <Typography color='text.primary'>{liveOwner?.ownerDisplayName || GH_INTERNAL_MESSAGES.admin_tenant_crm_owner_empty}</Typography>
                        <Typography variant='body2' color='text.secondary'>{liveOwner?.ownerEmail || '--'}</Typography>
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
                        <Typography variant='overline' color='text.disabled'>{GH_INTERNAL_MESSAGES.admin_tenant_crm_sync}</Typography>
                        <Stack direction='row' gap={1} flexWrap='wrap'>
                          <CustomChip
                            round='true'
                            size='small'
                            color={data.liveHubspot.serviceConfigured ? 'success' : 'secondary'}
                            variant='tonal'
                            label={
                              data.liveHubspot.serviceConfigured
                                ? GH_INTERNAL_MESSAGES.admin_tenant_crm_sync_connected
                                : GH_INTERNAL_MESSAGES.admin_tenant_crm_sync_disconnected
                            }
                          />
                          <CustomChip round='true' size='small' color={liveIsRealtime ? 'success' : 'warning'} variant='tonal' label={liveIsRealtime ? 'Realtime' : liveMode} />
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
        </Card>
      </Grid>
    </Grid>
  )
}

export default TenantCrmPanel
