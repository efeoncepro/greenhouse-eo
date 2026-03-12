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

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTabList from '@core/components/mui/TabList'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import OptionMenu from '@core/components/option-menu'

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
    { value: 'contacto', label: 'Contacto', icon: 'tabler-users' },
    { value: 'cuerpo', label: 'Cuerpo', icon: 'tabler-id-badge-2' },
    { value: 'ciclo', label: 'Ciclo', icon: 'tabler-refresh-dot' },
    { value: 'proveedor', label: 'Proveedor', icon: 'tabler-building-store' }
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
            message: `No pudimos completar el provisioning de contactos CRM. Se procesaron ${processedContacts} de ${contactIds.length} contactos antes del corte.`
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
          message: 'No habia contactos CRM por provisionar.'
        })

        return
      }

      setProvisionFeedback(buildProvisionFeedback(mergedSummary))
      router.refresh()
    } catch {
      setProvisionFeedback({
        tone: 'error',
        message: 'No pudimos completar el provisioning de contactos CRM. Reintenta en unos segundos.'
      })
    } finally {
      setIsProvisioningContacts(false)
      setProvisionProgress(null)
    }
  }

  const usersKpis = [
    {
      title: 'Usuarios',
      value: `${data.activeUsers} / ${data.users.length}`,
      subtitle: `${data.invitedUsers} invitados pendientes`
    },
    {
      title: 'Business lines',
      value: String(businessLines.length),
      subtitle: 'Activas para este space'
    },
    {
      title: 'Proyectos',
      value: String(data.scopedProjects),
      subtitle: `${data.notionProjectCount} detectados en Notion`
    },
    {
      title: 'Service modules',
      value: String(serviceModules.length),
      subtitle: 'Habilitados en governance'
    }
  ]

  const headerSection = (
    <Grid size={{ xs: 12 }}>
      <Card>
        <CardContent>
          <Grid container spacing={4} alignItems='center'>
            <Grid size={{ xs: 12, xl: 7 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }}>
                <CustomAvatar
                  skin='light'
                  variant='rounded'
                  size={88}
                  color={tenantStatusTone(data.status, data.active)}
                  sx={{ fontSize: '2rem', fontWeight: 700 }}
                >
                  {getInitials(data.clientName)}
                </CustomAvatar>

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
                    Estado completo de la cuenta: capabilities, usuarios, CRM y visibilidad operativa del space en una sola vista.
                  </Typography>

                  <Typography variant='body2' color='text.secondary'>
                    {`Space ID ${data.publicId}  |  CRM ${data.hubspotCompanyId || '--'}  |  Timezone ${data.timezone || '--'}  |  Ultima lectura HubSpot ${formatRelativeDate(data.liveHubspot.fetchedAt)}`}
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
                    Ver como cliente
                  </Button>
                  <Button
                    variant='tonal'
                    color='warning'
                    onClick={handleCapabilitySave}
                    disabled={isSavingCapabilities}
                    startIcon={isSavingCapabilities ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}
                  >
                    Guardar seleccion manual
                  </Button>
                  <OptionMenu
                    iconButtonProps={{ size: 'medium' }}
                    options={[
                      {
                        text: 'Refrescar lectura HubSpot',
                        icon: <i className='tabler-refresh text-base' />,
                        menuItemProps: {
                          className: 'flex items-center gap-2 text-textSecondary',
                          onClick: handleHubSpotRefresh
                        }
                      },
                      {
                        text: 'Abrir preview cliente',
                        icon: <i className='tabler-external-link text-base' />,
                        href: `/admin/tenants/${data.clientId}/view-as/dashboard`,
                        menuItemProps: { className: 'flex items-center gap-2 text-textSecondary' }
                      },
                      {
                        text: 'Desactivar space',
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
                <Typography variant='h5'>Business lines</Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
                  Familias comerciales activas del space con color operativo y origen de asignacion.
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
                            <Typography variant='h6'>{capability.moduleLabel}</Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {capability.publicModuleId}
                            </Typography>
                          </Box>
                          <Chip
                            size='small'
                            label={palette.label}
                            sx={{
                              color: palette.accent,
                              backgroundColor: palette.contrast
                            }}
                          />
                        </Stack>
                        <Stack direction='row' gap={1} flexWrap='wrap'>
                          <Chip
                            size='small'
                            variant='tonal'
                            color={capability.selected ? 'success' : 'secondary'}
                            label={capability.selected ? 'Active' : 'Available'}
                          />
                          <Chip
                            size='small'
                            variant='outlined'
                            color={getCapabilitySourceTone(capability)}
                            label={getCapabilitySourceLabel(capability)}
                          />
                        </Stack>
                        <Typography variant='body2' color='text.secondary'>
                          {capability.description || 'Sin descripcion operacional declarada.'}
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
              <Typography variant='h5'>Service modules</Typography>
              <Typography variant='body2' color='text.secondary'>
                Tabla compacta de modulos activos o disponibles para este tenant, con sorting y filtro local.
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
              <Typography variant='h6'>Feature flags</Typography>
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
                  <Typography color='text.secondary'>Sin feature flags activos.</Typography>
                ) : null}
              </Stack>
              <Divider />
              <Box>
                <Typography variant='body2' color='text.secondary'>
                  Registro de empresa
                </Typography>
                <Typography color='text.primary' sx={{ mt: 1 }}>
                  {data.hubspotCompanyId ? `EO-${data.hubspotCompanyId}` : 'Sin company mapping'}
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
              <Typography variant='h6'>Editar governance manual</Typography>
              <Typography variant='body2' color='text.secondary'>
                Mantiene la logica actual de precedencia manual vs sync externo, pero ahora dentro del tab correcto.
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
                    <Typography variant='h5'>Configuracion comercial</Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
                      Contexto compacto del registro comercial y la relacion actual con HubSpot.
                    </Typography>
                  </Box>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ p: 3, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
                        <Typography variant='body2' color='text.secondary'>
                          Business lines
                        </Typography>
                        <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1.5 }}>
                          {businessLines.map(capability => (
                            <Chip key={capability.moduleCode} size='small' label={capability.moduleLabel} />
                          ))}
                          {businessLines.length === 0 ? <Typography color='text.secondary'>Sin business lines.</Typography> : null}
                        </Stack>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ p: 3, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
                        <Typography variant='body2' color='text.secondary'>
                          Service modules
                        </Typography>
                        <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1.5 }}>
                          {serviceModules.map(capability => (
                            <Chip key={capability.moduleCode} size='small' variant='outlined' label={capability.moduleLabel} />
                          ))}
                          {serviceModules.length === 0 ? <Typography color='text.secondary'>Sin service modules.</Typography> : null}
                        </Stack>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ p: 3, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
                        <Typography variant='body2' color='text.secondary'>
                          Lifecycle
                        </Typography>
                        <Typography variant='h6' sx={{ mt: 1.5 }}>
                          {liveCompany?.lifecycle.lifecyclestage ? toTitleCase(liveCompany.lifecycle.lifecyclestage) : 'Sin lifecycle'}
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
                      : 'Lectura live de HubSpot operativa para company, owner y contactos asociados.'}
                  </Alert>
                  <Button
                    variant='tonal'
                    color='secondary'
                    onClick={handleHubSpotRefresh}
                    disabled={isRefreshingHubSpot}
                    startIcon={isRefreshingHubSpot ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-refresh' />}
                  >
                    Reintentar lectura live
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
                  <Typography variant='h5'>Contactos CRM</Typography>
                  <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
                    Lectura live de HubSpot reconciliada contra los accesos reales del space.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', md: 'row' }} gap={1} flexWrap='wrap'>
                  <Chip size='small' variant='tonal' color='info' label={`${liveContacts.length} en HubSpot`} />
                  <Chip size='small' variant='outlined' color='success' label={`${provisionedLiveContacts.length} reconciliados`} />
                  <Chip size='small' variant='outlined' color='warning' label={`${missingLiveContacts.length} pendientes`} />
                  {ambiguousLiveContacts.length > 0 ? (
                    <Chip size='small' variant='outlined' color='error' label={`${ambiguousLiveContacts.length} ambiguos`} />
                  ) : null}
                  {contactsWithoutEmail.length > 0 ? (
                    <Chip size='small' variant='outlined' color='secondary' label={`${contactsWithoutEmail.length} sin email`} />
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
                      ? `Provisionando ${provisionProgress?.processedContacts || 0}/${provisionProgress?.totalContacts || missingLiveContacts.length}`
                      : `Provisionar ${missingLiveContacts.length || ''}`.trim()}
                  </Button>
                </Stack>
              </Stack>

              <Alert severity='info'>
                Provisionar crea o reconcilia accesos `invited` en `greenhouse.client_users` con rol base `client_executive`.
                Los lotes se ejecutan de a {MAX_TENANT_CONTACT_PROVISIONING_BATCH_SIZE} contactos por request.
              </Alert>

              {duplicateUsersByEmail.length > 0 || ambiguousLiveContacts.length > 0 ? (
                <Alert severity='warning'>
                  Hay brechas de reconciliacion que conviene resolver antes de nuevas invitaciones.
                </Alert>
              ) : null}

              {provisionProgress ? (
                <Alert severity='info'>
                  Ejecutando lote {Math.min(provisionProgress.completedBatches + 1, provisionProgress.totalBatches)} de{' '}
                  {provisionProgress.totalBatches}. Procesados {provisionProgress.processedContacts} de{' '}
                  {provisionProgress.totalContacts} contactos.
                </Alert>
              ) : null}

              {provisionFeedback ? <Alert severity={provisionFeedback.tone}>{provisionFeedback.message}</Alert> : null}

              {hasFriendlyHubspotError ? (
                <TenantDetailEmptyState
                  icon='tabler-plug-connected-x'
                  title='No pudimos cargar los contactos CRM'
                  description='La lectura live de HubSpot devolvio una incidencia. Reintenta la consulta antes de provisionar contactos.'
                  actionLabel='Reintentar lectura live'
                  onAction={handleHubSpotRefresh}
                  disabled={isRefreshingHubSpot}
                />
              ) : liveContacts.length === 0 ? (
                <TenantDetailEmptyState
                  icon='tabler-address-book-off'
                  title='No hay contactos asociados en HubSpot'
                  description='Este space no tiene contactos company-level visibles en la lectura actual. Reintenta o revisa la asociacion CRM.'
                  actionLabel='Sincronizar ahora'
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
                              <TableCell>Contacto</TableCell>
                              <TableCell>{activeCrmTab === 'contacto' ? 'Canales' : activeCrmTab === 'cuerpo' ? 'Cargo' : activeCrmTab === 'ciclo' ? 'Ciclo' : 'Proveedor'}</TableCell>
                              <TableCell>Usuario Greenhouse</TableCell>
                              <TableCell>Estado</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {reconciledLiveContacts.map(({ contact, matchedUsers, matchedByContactId, normalizedEmail, expectedPublicUserId }) => {
                              const provisionTone =
                                matchedUsers.length > 1 ? 'error' : matchedUsers.length === 1 ? 'success' : normalizedEmail ? 'warning' : 'default'

                              const provisionLabel =
                                matchedUsers.length > 1
                                  ? 'Ambiguo'
                                  : matchedUsers.length === 1
                                    ? 'Provisionado'
                                    : normalizedEmail
                                      ? 'Pendiente'
                                      : 'Sin email'

                              return (
                                <TableRow key={`${activeCrmTab}-${contact.hubspotContactId}`} hover>
                                  <TableCell>
                                    <Stack spacing={0.75}>
                                      <Typography color='text.primary' className='font-medium'>
                                        {contact.displayName || contact.email || `Contacto ${contact.hubspotContactId}`}
                                      </Typography>
                                      <Typography variant='body2' color='text.secondary'>
                                        {contact.hubspotContactId} | {contact.email || 'Sin email'}
                                      </Typography>
                                    </Stack>
                                  </TableCell>
                                  <TableCell>
                                    {activeCrmTab === 'contacto' ? (
                                      <Stack spacing={0.75}>
                                        <Typography variant='body2'>{contact.phone || contact.mobilePhone || 'Sin telefono'}</Typography>
                                        <Typography variant='body2' color='text.secondary'>
                                          {contact.company || 'Sin company'}
                                        </Typography>
                                      </Stack>
                                    ) : null}
                                    {activeCrmTab === 'cuerpo' ? (
                                      <Stack spacing={0.75}>
                                        <Typography variant='body2'>{contact.jobTitle || 'Sin cargo'}</Typography>
                                        <Typography variant='body2' color='text.secondary'>
                                          {contact.company || 'Sin company'}
                                        </Typography>
                                      </Stack>
                                    ) : null}
                                    {activeCrmTab === 'ciclo' ? (
                                      <Stack spacing={0.75}>
                                        <Typography variant='body2'>{contact.lifecyclestage || 'Sin lifecycle'}</Typography>
                                        <Typography variant='body2' color='text.secondary'>
                                          {contact.hsLeadStatus || 'Sin lead status'}
                                        </Typography>
                                      </Stack>
                                    ) : null}
                                    {activeCrmTab === 'proveedor' ? (
                                      <Stack spacing={0.75}>
                                        <Typography variant='body2'>{matchedByContactId ? 'Match exacto HubSpot' : 'Reconciliacion por email'}</Typography>
                                        <Typography variant='body2' color='text.secondary'>
                                          ID esperado: {expectedPublicUserId}
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
                                          label={matchedByContactId ? 'Match exacto HubSpot' : 'Reconciliado por email'}
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
                                          Aun no existe acceso Greenhouse para este contacto.
                                        </Typography>
                                        <Typography variant='body2' color='text.secondary'>
                                          ID esperado: {expectedPublicUserId}
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
              <Typography variant='h6'>Lectura HubSpot</Typography>
              <Typography variant='body2' color='text.secondary'>
                Detalle tecnico y operativo del sync bajo demanda. Colapsado por defecto para no contaminar la lectura principal.
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant='outlined'>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Typography variant='subtitle1'>Company profile</Typography>
                      <Typography color='text.primary'>{liveCompany?.identity.name || 'Sin lectura live'}</Typography>
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
                      <Typography variant='subtitle1'>Owner</Typography>
                      <Typography color='text.primary'>{liveOwner?.ownerDisplayName || 'Sin owner asignado'}</Typography>
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
                      <Typography variant='subtitle1'>Sync</Typography>
                      <Stack direction='row' gap={1} flexWrap='wrap'>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={data.liveHubspot.serviceConfigured ? 'success' : 'secondary'}
                          label={data.liveHubspot.serviceConfigured ? 'Servicio conectado' : 'Servicio no configurado'}
                        />
                        <Chip size='small' variant='outlined' color={liveIsRealtime ? 'success' : 'warning'} label={liveIsRealtime ? 'Realtime' : liveMode} />
                      </Stack>
                      <Typography variant='body2' color='text.secondary'>
                        Ultima lectura: {formatDateTime(data.liveHubspot.fetchedAt)}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        Base URL: {data.liveHubspot.serviceBaseUrl || '--'}
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
            <Typography variant='h5'>Visibilidad de proyectos</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
              Proyectos visibles en scope para este space y su cobertura actual.
            </Typography>
          </Box>
          <Button variant='contained' startIcon={<i className='tabler-plus' />} disabled>
            Agregar proyecto al scope
          </Button>
        </Stack>
      </Grid>

      {data.projects.length === 0 ? (
        <Grid size={{ xs: 12 }}>
          <TenantDetailEmptyState
            icon='tabler-folder-off'
            title='No hay proyectos visibles en scope'
            description='Este space aun no tiene proyectos conectados a la visibilidad del tenant o no existen scopes activos.'
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
                        <Chip size='small' variant='outlined' label={`${project.assignedUsers} usuarios`} />
                      </Stack>
                      <Typography variant='body2' color='text.secondary'>
                        {project.projectId}
                      </Typography>
                      {project.pageUrl ? (
                        <Button component={Link} href={project.pageUrl} target='_blank' variant='text' sx={{ px: 0, width: 'fit-content' }}>
                          Abrir origen en Notion
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
                      <TableCell>Proyecto</TableCell>
                      <TableCell>ID</TableCell>
                      <TableCell>Usuarios asignados</TableCell>
                      <TableCell>Estado</TableCell>
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
                                Abrir origen en Notion
                              </Typography>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell>{project.projectId}</TableCell>
                        <TableCell>{project.assignedUsers}</TableCell>
                        <TableCell>
                          <Chip size='small' variant='tonal' color='info' label='Scoped' />
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
              <Typography variant='h6'>Identidad del space</Typography>
              {[
                ['Space ID', data.publicId],
                ['Internal key', data.clientId],
                ['HubSpot company', data.hubspotCompanyId || 'Sin company mapping'],
                ['Portal home', data.portalHomePath || '--'],
                ['Timezone', data.timezone || '--']
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
              <Typography variant='h6'>Estado de acceso</Typography>
              <HorizontalWithSubtitle
                title='Usuarios activos'
                stats={String(data.activeUsers)}
                avatarIcon='tabler-user-check'
                avatarColor='success'
                trend='neutral'
                trendNumber='0'
                subtitle={`${data.invitedUsers} invitados`}
              />
              <HorizontalWithSubtitle
                title='Proyectos scoped'
                stats={String(data.scopedProjects)}
                avatarIcon='tabler-folders'
                avatarColor='primary'
                trend='neutral'
                trendNumber='0'
                subtitle={`${data.notionProjectCount} detectados`}
              />
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, xl: 4 }}>
        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <Typography variant='h6'>Registro de empresa</Typography>
              <Stack direction='row' gap={1} flexWrap='wrap'>
                <Chip
                  size='small'
                  variant='tonal'
                  color={data.liveHubspot.serviceConfigured ? 'success' : 'secondary'}
                  label={data.liveHubspot.serviceConfigured ? 'Integrado con HubSpot' : 'Sin integracion activa'}
                />
                <Chip size='small' variant='outlined' color={liveIsRealtime ? 'success' : 'warning'} label={liveIsRealtime ? 'Realtime' : liveMode} />
              </Stack>
              <Box>
                <Typography variant='body2' color='text.secondary'>
                  Ultima sync live
                </Typography>
                <Typography color='text.primary'>{formatDateTime(data.liveHubspot.fetchedAt)}</Typography>
              </Box>
              <Box>
                <Typography variant='body2' color='text.secondary'>
                  Ultima actualizacion del tenant
                </Typography>
                <Typography color='text.primary'>{formatDateTime(data.updatedAt)}</Typography>
              </Box>
              <Box>
                <Typography variant='body2' color='text.secondary'>
                  Creado
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
              <Typography variant='h6'>Notas operativas</Typography>
              <CustomTextField
                multiline
                minRows={4}
                fullWidth
                value={displayNote || 'Sin nota operativa registrada para este space.'}
                slotProps={{
                  input: {
                    readOnly: true
                  }
                }}
                helperText='La mutacion de notas internas aun no esta expuesta en esta superficie.'
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
                <Tab icon={<i className='tabler-puzzle' />} value='capabilities' label='Capabilities' iconPosition='start' />
                <Tab icon={<i className='tabler-users' />} value='usuarios' label='Usuarios' iconPosition='start' />
                <Tab icon={<i className='tabler-building' />} value='crm' label='CRM' iconPosition='start' />
                <Tab icon={<i className='tabler-folder' />} value='proyectos' label='Proyectos' iconPosition='start' />
                <Tab icon={<i className='tabler-settings' />} value='configuracion' label='Configuracion' iconPosition='start' />
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
