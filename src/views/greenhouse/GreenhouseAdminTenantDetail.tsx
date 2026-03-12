'use client'

import { useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import type { AdminTenantDetail } from '@/lib/admin/get-admin-tenant-detail'
import type { TenantCapabilityRecord } from '@/lib/admin/tenant-capability-types'
import { buildUserPublicId } from '@/lib/ids/greenhouse-ids'
import {
  chunkTenantContactIds,
  MAX_TENANT_CONTACT_PROVISIONING_BATCH_SIZE,
  mergeTenantContactsProvisioningSummaries,
  type TenantContactsProvisioningSummary
} from '@/lib/admin/tenant-member-provisioning-shared'
import TenantCapabilityManager from '@views/greenhouse/admin/tenants/TenantCapabilityManager'

type Props = {
  data: AdminTenantDetail
}

const formatDateTime = (value: string | null) => {
  if (!value) {
    return 'Sin registro'
  }

  return new Date(value).toLocaleString('es-CL')
}

const normalizeEmailValue = (value: string | null | undefined) => value?.trim().toLowerCase() || null

const flagTone = (status: string) => {
  if (status === 'enabled') return 'success'
  if (status === 'staged') return 'warning'

  return 'default'
}

const getDisplayNote = (notes: string | null, hubspotCompanyId: string | null) => {
  if (!notes) {
    return hubspotCompanyId ? 'Space importado desde CRM. Revisar contacto principal y capabilities activas.' : null
  }

  if (/closedwon/i.test(notes) || /Bootstrap client imported/i.test(notes)) {
    return hubspotCompanyId ? 'Space importado desde CRM. Revisar contacto principal y capabilities activas.' : notes
  }

  return notes
}

const buildProvisionFeedback = (summary: TenantContactsProvisioningSummary) => {
  const fragments = [
    `${summary.created} creados`,
    `${summary.reconciled} reconciliados`,
    `${summary.conflicts} conflictos`,
    `${summary.invalid} invalidos`,
    `${summary.errors} errores`
  ]

  const message = `Provision CRM ejecutado sobre ${summary.requested} contactos: ${fragments.join(' · ')}.`

  if (summary.errors > 0) {
    return { tone: 'error' as const, message }
  }

  if (summary.conflicts > 0 || summary.invalid > 0) {
    return { tone: 'warning' as const, message }
  }

  if (summary.created > 0 || summary.reconciled > 0) {
    return { tone: 'success' as const, message }
  }

  return { tone: 'info' as const, message }
}

const GreenhouseAdminTenantDetail = ({ data }: Props) => {
  const router = useRouter()
  const [capabilities, setCapabilities] = useState<TenantCapabilityRecord[]>(data.capabilities)
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
  const displayNote = getDisplayNote(data.notes, data.hubspotCompanyId)
  const liveCompany = data.liveHubspot.company
  const liveOwner = data.liveHubspot.owner
  const liveContacts = data.liveHubspot.contacts
  const liveMode = data.liveHubspot.contract?.realtime.mode || 'polling_or_on_demand'
  const liveIsRealtime = data.liveHubspot.contract?.realtime.supported === true

  const usersByEmail = data.users.reduce<Map<string, AdminTenantDetail['users']>>((map, user) => {
    const normalizedEmail = normalizeEmailValue(user.email)

    if (!normalizedEmail) {
      return map
    }

    const current = map.get(normalizedEmail) || []

    current.push(user)
    map.set(normalizedEmail, current)

    return map
  }, new Map())

  const usersByHubspotContactId = data.users.reduce<Map<string, AdminTenantDetail['users']>>((map, user) => {
    user.hubspotContactIds.forEach(contactId => {
      const current = map.get(contactId) || []

      current.push(user)
      map.set(contactId, current)
    })

    return map
  }, new Map())

  const duplicateUsersByEmail = Array.from(usersByEmail.entries())
    .filter(([, users]) => users.length > 1)
    .map(([email, users]) => ({ email, users }))

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

  const handleProvisionMissingContacts = async () => {
    if (missingLiveContacts.length === 0) {
      return
    }

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
          headers: {
            'Content-Type': 'application/json'
          },
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
            message:
              `${payload?.error || 'No pudimos provisionar un lote de contactos CRM.'} ` +
              `Se completaron ${processedContacts} de ${contactIds.length} contactos antes del error.`
          })

          if (processedContacts > 0) {
            router.refresh()
          }

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
    } catch (error) {
      setProvisionFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Unknown provisioning error.'
      })
    } finally {
      setIsProvisioningContacts(false)
      setProvisionProgress(null)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Box
              sx={{
                display: 'grid',
                gap: 4,
                alignItems: 'start',
                gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.35fr) minmax(0, 0.95fr)' }
              }}
            >
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant='overline' sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.08em' }}>
                    Tenant admin
                  </Typography>
                  <Typography variant='h4' sx={{ mt: 0.5 }}>
                    {data.clientName}
                  </Typography>
                  <Typography variant='body1' color='text.secondary' sx={{ mt: 1.25, maxWidth: 760 }}>
                    Administra acceso, alcance y capabilities visibles del space desde una sola vista.
                  </Typography>
                </Box>

                <Stack direction='row' gap={1} flexWrap='wrap'>
                  <Chip size='small' variant='tonal' color='secondary' label={data.publicId} />
                  <Chip size='small' variant='tonal' color={data.active ? 'success' : 'default'} label={data.status} />
                  <Chip size='small' variant='outlined' label={data.authMode} />
                  {data.hubspotCompanyId ? <Chip size='small' variant='outlined' label={`CRM ${data.hubspotCompanyId}`} /> : null}
                </Stack>

                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }
                  }}
                >
                  {[
                    ['Contacto principal', data.primaryContactEmail || 'Sin contacto principal'],
                    ['Portal home', data.portalHomePath || '--'],
                    ['Timezone', data.timezone || '--'],
                    ['Ultimo acceso', formatDateTime(data.lastLoginAt)]
                  ].map(([label, value]) => (
                    <Box key={label}>
                      <Typography variant='body2' color='text.secondary'>
                        {label}
                      </Typography>
                      <Typography color='text.primary'>{value}</Typography>
                    </Box>
                  ))}
                </Box>
              </Stack>

              <Stack spacing={2.5}>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))', xl: 'repeat(2, minmax(0, 1fr))' }
                  }}
                >
                  {[
                    ['Usuarios activos', data.activeUsers],
                    ['Proyectos scoped', data.scopedProjects],
                    ['Business lines', businessLines.length],
                    ['Service modules', serviceModules.length]
                  ].map(([label, value]) => (
                    <Box
                      key={label}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        border: theme => `1px solid ${theme.palette.divider}`,
                        backgroundColor: theme => theme.palette.background.default
                      }}
                    >
                      <Typography variant='body2' color='text.secondary'>
                        {label}
                      </Typography>
                      <Typography variant='h4' sx={{ mt: 1 }}>
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: theme => `1px solid ${theme.palette.divider}`
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} justifyContent='space-between' alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <Box>
                      <Typography variant='subtitle1'>Revision del tenant</Typography>
                      <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
                        Usa la vista real del cliente para validar contenido, permisos y jerarquia visual.
                      </Typography>
                    </Box>
                    <Button component={Link} href={`/admin/tenants/${data.clientId}/view-as/dashboard`} variant='contained'>
                      Ver como cliente
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <TenantCapabilityManager
          clientId={data.clientId}
          hubspotCompanyId={data.hubspotCompanyId}
          initialCapabilities={data.capabilities}
          onCapabilitiesChange={setCapabilities}
        />
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack spacing={2.5}>
                  <Typography variant='h6'>Identidad del space</Typography>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Space ID
                    </Typography>
                    <Typography color='text.primary'>{data.publicId}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Internal key
                    </Typography>
                    <Typography color='text.primary'>{data.clientId}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Registro CRM
                    </Typography>
                    <Typography color='text.primary'>{data.hubspotCompanyId || 'Sin company mapping'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Creado
                    </Typography>
                    <Typography color='text.primary'>{formatDateTime(data.createdAt)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Ultima actualizacion
                    </Typography>
                    <Typography color='text.primary'>{formatDateTime(data.updatedAt)}</Typography>
                  </Box>
                  {displayNote ? (
                    <Box>
                      <Typography variant='body2' color='text.secondary'>
                        Nota operativa
                      </Typography>
                      <Typography color='text.primary'>{displayNote}</Typography>
                    </Box>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant='h6'>Lectura live desde HubSpot</Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
                      Este bloque consulta el servicio CRM bajo demanda. Company y owner pueden reflejar cambios de HubSpot
                      apenas Greenhouse vuelve a leer; capabilities siguen siendo sincronizacion explicita.
                    </Typography>
                  </Box>

                  <Stack direction='row' gap={1} flexWrap='wrap'>
                    <Chip
                      size='small'
                      variant='tonal'
                      color={data.liveHubspot.serviceConfigured ? 'success' : 'default'}
                      label={data.liveHubspot.serviceConfigured ? 'Servicio conectado' : 'Servicio no configurado'}
                    />
                    <Chip
                      size='small'
                      variant='outlined'
                      color={liveIsRealtime ? 'success' : 'warning'}
                      label={liveIsRealtime ? 'Realtime' : liveMode}
                    />
                  </Stack>

                  {data.liveHubspot.error ? <Alert severity='warning'>{data.liveHubspot.error}</Alert> : null}

                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Company profile
                    </Typography>
                    <Stack spacing={0.75} sx={{ mt: 1 }}>
                      <Typography color='text.primary'>{liveCompany?.identity.name || 'Sin lectura live'}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {liveCompany?.identity.domain || '--'} | {liveCompany?.identity.industry || '--'}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {liveCompany?.identity.city || '--'}, {liveCompany?.identity.country || '--'}
                      </Typography>
                    </Stack>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Owner actual en HubSpot
                    </Typography>
                    <Stack spacing={0.75} sx={{ mt: 1 }}>
                      <Typography color='text.primary'>{liveOwner?.ownerDisplayName || 'Sin owner asignado'}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {liveOwner?.ownerEmail || '--'}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        HubSpot owner ID: {liveOwner?.hubspotOwnerId || liveCompany?.owner.hubspotOwnerId || '--'}
                      </Typography>
                    </Stack>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Capabilities visibles en HubSpot
                    </Typography>
                    <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1 }}>
                      {liveCompany?.capabilities.businessLines.map(code => (
                        <Chip key={`live-bl-${code}`} size='small' color='info' variant='outlined' label={code} />
                      ))}
                      {liveCompany?.capabilities.serviceModules.map(code => (
                        <Chip key={`live-sm-${code}`} size='small' variant='outlined' label={code} />
                      ))}
                      {!liveCompany?.capabilities.businessLines.length && !liveCompany?.capabilities.serviceModules.length ? (
                        <Typography color='text.secondary'>Sin capabilities live registradas.</Typography>
                      ) : null}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Contactos asociados en HubSpot
                    </Typography>
                    <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1 }}>
                      <Chip size='small' variant='tonal' color='info' label={`${liveContacts.length} contactos`} />
                      <Chip size='small' variant='outlined' color='success' label={`${provisionedLiveContacts.length} ya existen`} />
                      <Chip size='small' variant='outlined' color='warning' label={`${missingLiveContacts.length} por provisionar`} />
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Ultima lectura
                    </Typography>
                    <Typography color='text.primary'>{formatDateTime(data.liveHubspot.fetchedAt)}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      <Grid size={{ xs: 12, lg: 8 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Typography variant='h6'>Estado de acceso</Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 3,
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
                    }}
                  >
                    {[
                      ['Usuarios activos', data.activeUsers],
                      ['Pendientes de activar', data.invitedUsers],
                      ['Proyectos scoped', data.scopedProjects],
                      ['Proyectos base', data.notionProjectCount]
                    ].map(([label, value]) => (
                      <Box key={label} sx={{ p: 3, borderRadius: 3, border: theme => `1px solid ${theme.palette.divider}` }}>
                        <Typography variant='body2' color='text.secondary'>
                          {label}
                        </Typography>
                        <Typography variant='h4'>{value}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Typography variant='h6'>Configuracion comercial</Typography>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Business lines
                    </Typography>
                    <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1 }}>
                      {businessLines.map(capability => (
                        <Chip key={capability.moduleCode} size='small' color='info' variant='outlined' label={capability.moduleLabel} />
                      ))}
                      {businessLines.length === 0 ? <Typography color='text.secondary'>Sin business lines.</Typography> : null}
                    </Stack>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Service modules
                    </Typography>
                    <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1 }}>
                      {serviceModules.map(capability => (
                        <Chip key={capability.moduleCode} size='small' variant='outlined' label={capability.moduleLabel} />
                      ))}
                      {serviceModules.length === 0 ? <Typography color='text.secondary'>Sin service modules.</Typography> : null}
                    </Stack>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Feature flags
                    </Typography>
                    <Stack direction='row' gap={1} flexWrap='wrap' sx={{ mt: 1 }}>
                      {data.featureFlags.map(flag => (
                        <Chip key={flag.featureCode} size='small' color={flagTone(flag.status)} variant='tonal' label={flag.featureCode} />
                      ))}
                      {data.featureFlags.length === 0 ? <Typography color='text.secondary'>Sin feature flags activos.</Typography> : null}
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', md: 'row' }} gap={2} justifyContent='space-between' alignItems={{ xs: 'stretch', md: 'center' }}>
                    <Box>
                      <Typography variant='h6'>Contactos CRM asociados (fuente)</Typography>
                      <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
                        Esta tabla es la lectura live de HubSpot. No representa un segundo padron de usuarios: cada
                        contacto se reconcilia contra su acceso real en Greenhouse para mostrar si ya existe, si falta
                        provisionar o si hay una coincidencia ambigua.
                      </Typography>
                    </Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} flexWrap='wrap' alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <Stack direction='row' gap={1} flexWrap='wrap'>
                        <Chip size='small' variant='tonal' color='info' label={`${liveContacts.length} en HubSpot`} />
                        <Chip size='small' variant='outlined' color='success' label={`${provisionedLiveContacts.length} reconciliados`} />
                        <Chip size='small' variant='outlined' color='warning' label={`${missingLiveContacts.length} pendientes`} />
                        {ambiguousLiveContacts.length > 0 ? (
                          <Chip size='small' variant='outlined' color='error' label={`${ambiguousLiveContacts.length} ambiguos`} />
                        ) : null}
                        {contactsWithoutEmail.length > 0 ? (
                          <Chip size='small' variant='outlined' color='default' label={`${contactsWithoutEmail.length} sin email`} />
                        ) : null}
                      </Stack>
                      <Button
                        variant='contained'
                        color='warning'
                        disabled={
                          isProvisioningContacts ||
                          missingLiveContacts.length === 0 ||
                          !data.liveHubspot.serviceConfigured ||
                          Boolean(data.liveHubspot.error)
                        }
                        onClick={handleProvisionMissingContacts}
                        startIcon={isProvisioningContacts ? <CircularProgress color='inherit' size={16} /> : null}
                      >
                        {isProvisioningContacts
                          ? `Provisionando ${provisionProgress?.processedContacts || 0}/${provisionProgress?.totalContacts || missingLiveContacts.length}...`
                          : `Provisionar ${missingLiveContacts.length || ''}`.trim()}
                      </Button>
                    </Stack>
                  </Stack>

                  <Alert severity='info'>
                    Provisionar crea o reconcilia accesos del space en `greenhouse.client_users` con estado `invited`,
                    rol `client_executive` y scopes base. `Invited` no es otra categoria de persona: es el estado del
                    mismo usuario provisionado antes de su activacion. Para evitar timeouts, los lotes se ejecutan de a{' '}
                    {MAX_TENANT_CONTACT_PROVISIONING_BATCH_SIZE} contactos por request.
                  </Alert>

                  {duplicateUsersByEmail.length > 0 || ambiguousLiveContacts.length > 0 ? (
                    <Alert severity='warning'>
                      Se detectaron brechas de reconciliacion.
                      {duplicateUsersByEmail.length > 0
                        ? ` Emails repetidos en el space: ${duplicateUsersByEmail.map(item => item.email).join(', ')}.`
                        : ''}
                      {ambiguousLiveContacts.length > 0
                        ? ` Contactos CRM con mas de un usuario candidato: ${ambiguousLiveContacts.map(item => item.contact.hubspotContactId).join(', ')}.`
                        : ''}
                    </Alert>
                  ) : null}

                  {provisionProgress ? (
                    <Alert severity='info'>
                      Ejecutando lote {provisionProgress.completedBatches + 1 > provisionProgress.totalBatches
                        ? provisionProgress.totalBatches
                        : provisionProgress.completedBatches + 1}{' '}
                      de {provisionProgress.totalBatches}. Procesados {provisionProgress.processedContacts} de{' '}
                      {provisionProgress.totalContacts} contactos.
                    </Alert>
                  ) : null}

                  {provisionFeedback ? <Alert severity={provisionFeedback.tone}>{provisionFeedback.message}</Alert> : null}

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Contacto</TableCell>
                          <TableCell>Cargo</TableCell>
                          <TableCell>Ciclo</TableCell>
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
                              ? 'Coincidencia ambigua'
                              : matchedUsers.length === 1
                                ? 'Provisionado'
                                : normalizedEmail
                                  ? 'Pendiente'
                                  : 'Sin email'

                          return (
                            <TableRow key={contact.hubspotContactId} hover>
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
                                <Typography variant='body2'>{contact.jobTitle || 'Sin cargo'}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant='body2'>
                                  {contact.lifecyclestage || '--'}
                                  {contact.hsLeadStatus ? ` | ${contact.hsLeadStatus}` : ''}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {matchedUsers.length === 1 ? (
                                  <Stack spacing={0.75}>
                                    <Typography
                                      component={Link}
                                      href={`/admin/users/${matchedUsers[0].userId}`}
                                      color='text.primary'
                                      className='font-medium'
                                    >
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
                                      Todavia no existe acceso Greenhouse para este contacto.
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

                  {liveContacts.length === 0 ? (
                    <Typography color='text.secondary'>No hay contactos asociados en HubSpot para este space.</Typography>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant='h6'>Accesos provisionados del space</Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.75 }}>
                      Esta tabla sale de `greenhouse.client_users`. Si el origen fue HubSpot, se muestra el contacto
                      asociado; si no, el acceso se considera manual o interno.
                    </Typography>
                  </Box>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Usuario</TableCell>
                          <TableCell>Origen</TableCell>
                          <TableCell>Roles</TableCell>
                          <TableCell>Acceso</TableCell>
                          <TableCell>Scopes</TableCell>
                          <TableCell>Ultimo login</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.users.map(user => (
                          <TableRow key={user.userId} hover>
                            <TableCell>
                              <Stack spacing={0.75}>
                                <Typography component={Link} href={`/admin/users/${user.userId}`} color='text.primary' className='font-medium'>
                                  {user.fullName}
                                </Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  {user.publicUserId} | {user.email}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              {user.hubspotContactIds.length === 0 ? (
                                <Chip size='small' variant='outlined' label='Manual o interno' />
                              ) : user.hubspotContactIds.length === 1 ? (
                                <Chip size='small' variant='outlined' color='info' label={`HubSpot ${user.hubspotContactIds[0]}`} />
                              ) : (
                                <Stack spacing={0.75}>
                                  <Chip size='small' variant='outlined' color='warning' label='Multiples contactos HubSpot' />
                                  <Typography variant='body2' color='text.secondary'>
                                    {user.hubspotContactIds.join(', ')}
                                  </Typography>
                                </Stack>
                              )}
                            </TableCell>
                            <TableCell>
                              <Stack direction='row' gap={1} flexWrap='wrap'>
                                {user.roleCodes.map(roleCode => (
                                  <Chip key={roleCode} size='small' variant='outlined' label={roleCode} />
                                ))}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack direction='row' gap={1} flexWrap='wrap'>
                                <Chip size='small' variant='tonal' color={user.active ? 'success' : 'default'} label={user.status} />
                                <Chip size='small' variant='outlined' label={user.authMode} />
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>
                                {user.projectScopeCount} proyectos | {user.routeGroups.join(', ') || 'sin route groups'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>{formatDateTime(user.lastLoginAt)}</Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Stack spacing={3}>
                  <Typography variant='h6'>Visibilidad de proyectos</Typography>
                  <Box sx={{ display: 'grid', gap: 2 }}>
                    {data.projects.map(project => (
                      <Box
                        key={project.projectId}
                        sx={{
                          p: 3,
                          borderRadius: 3,
                          border: theme => `1px solid ${theme.palette.divider}`,
                          display: 'grid',
                          gap: 1.5
                        }}
                      >
                        <Stack direction='row' justifyContent='space-between' gap={2} flexWrap='wrap'>
                          <Typography color='text.primary' className='font-medium'>
                            {project.projectName}
                          </Typography>
                          <Chip size='small' variant='outlined' label={`${project.assignedUsers} usuarios`} />
                        </Stack>
                        <Typography variant='body2' color='text.secondary'>
                          {project.projectId}
                        </Typography>
                        {project.pageUrl ? (
                          <Typography component={Link} href={project.pageUrl} target='_blank' color='primary'>
                            Abrir origen en Notion
                          </Typography>
                        ) : null}
                      </Box>
                    ))}
                    {data.projects.length === 0 ? (
                      <Typography color='text.secondary'>Este space aun no tiene proyectos visibles en scope.</Typography>
                    ) : null}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}

export default GreenhouseAdminTenantDetail
