'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { ExecutiveCardShell, ExecutiveMiniStatCard } from '@/components/greenhouse'
import { GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'
import type { OperationsHealthStatus, OperationsOverview, OperationsSubsystem } from '@/lib/operations/get-operations-overview'
import AdminOperationalActionsPanel from './AdminOperationalActionsPanel'
import AdminOpsActionButton from './AdminOpsActionButton'

type Props = {
  data: OperationsOverview
}

type AdminHealth = 'ok' | 'warning' | 'failed' | 'stale'
type SecretGovernanceStatus = 'ok' | 'warning' | 'stale' | 'unverified'

const formatDateTime = (value: string | null) => {
  if (!value) return 'Sin registro'

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Santiago'
  }).format(new Date(value))
}

const toAdminHealth = (status: OperationsHealthStatus): AdminHealth => {
  if (status === 'healthy') return 'ok'
  if (status === 'down') return 'failed'
  if (status === 'idle') return 'stale'

  return 'warning'
}

const chipColor = (status: AdminHealth): 'success' | 'warning' | 'error' | 'secondary' => {
  if (status === 'ok') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'stale') return 'secondary'

  return 'warning'
}

const computeFreshness = (lastRun: string | null): { percent: number; label: string; tone: AdminHealth } => {
  if (!lastRun) return { percent: 0, label: 'Sin señal', tone: 'stale' }

  const hoursAgo = (Date.now() - new Date(lastRun).getTime()) / 3_600_000
  const percent = Math.max(0, Math.min(100, Math.round(100 - (hoursAgo / 48) * 100)))

  let tone: AdminHealth = 'ok'

  if (hoursAgo > 48) tone = 'failed'
  else if (hoursAgo > 24) tone = 'stale'
  else if (hoursAgo > 6) tone = 'warning'

  let label: string

  if (hoursAgo < 1) label = `hace ${Math.round(hoursAgo * 60)}min`
  else if (hoursAgo < 24) label = `hace ${Math.round(hoursAgo)}h`
  else label = `hace ${Math.round(hoursAgo / 24)}d`

  return { percent, label, tone }
}

const freshnessBarColor = (tone: AdminHealth): 'success' | 'warning' | 'error' | 'inherit' => {
  if (tone === 'ok') return 'success'
  if (tone === 'warning') return 'warning'

  return 'error'
}

const governanceChipColor = (status: SecretGovernanceStatus): 'success' | 'warning' | 'error' | 'secondary' => {
  if (status === 'ok') return 'success'
  if (status === 'warning') return 'warning'
  if (status === 'stale') return 'error'

  return 'secondary'
}

const governanceLabel = (status: SecretGovernanceStatus): string => {
  if (status === 'ok') return 'Vigente'
  if (status === 'warning') return 'Por vencer'
  if (status === 'stale') return 'Vencida'

  return 'Sin verificar'
}

const syncSubsystems = (subsystems: OperationsSubsystem[]) =>
  subsystems.filter(subsystem => ['Notion Sync', 'Services Sync', 'ICO Sync'].includes(subsystem.name))

const AdminCloudIntegrationsView = ({ data }: Props) => {
  const syncs = syncSubsystems(data.subsystems)
  const retryPressure = data.webhooks.deliveriesPending + data.webhooks.deliveriesRetryScheduled

  /* ── TASK-112: Integration health rows ── */
  const integrationRows = [
    ...syncs.map(sync => ({
      name: sync.name,
      health: toAdminHealth(sync.status),
      freshness: computeFreshness(sync.lastRun),
      lastSignal: sync.lastRun,
      processed: sync.processed,
      failed: sync.failed
    })),
    {
      name: 'Webhooks',
      health: toAdminHealth(
        !data.webhooks.schemaReady
          ? ('not_configured' as OperationsHealthStatus)
          : data.webhooks.deliveriesDeadLetter > 0
            ? ('degraded' as OperationsHealthStatus)
            : ('healthy' as OperationsHealthStatus)
      ),
      freshness: computeFreshness(data.webhooks.lastInboxAt ?? data.webhooks.lastDeliveryAt),
      lastSignal: data.webhooks.lastInboxAt ?? data.webhooks.lastDeliveryAt,
      processed: data.webhooks.inboxReceived24h,
      failed: data.webhooks.inboxFailed24h + data.webhooks.deliveriesDeadLetter
    }
  ]

  /* ── TASK-111: Secret ref governance rows ── */
  const inboundRefs = data.webhooks.secretRefs
    .filter(item => item.sourceKind === 'endpoint')
    .map(item => ({
      ...item,
      direction: 'Inbound' as const,
      owner: 'Inbound handler owner',
      scope: 'Webhook auth',
      governanceStatus: 'unverified' as SecretGovernanceStatus,
      lastVerifiedAt: null as string | null
    }))

  const outboundRefs = data.webhooks.secretRefs
    .filter(item => item.sourceKind === 'subscription')
    .map(item => ({
      ...item,
      direction: 'Outbound' as const,
      owner: 'Outbound subscriber owner',
      scope: 'Delivery auth',
      governanceStatus: 'unverified' as SecretGovernanceStatus,
      lastVerifiedAt: null as string | null
    }))

  const allCredentialRows = [...inboundRefs, ...outboundRefs]

  return (
    <Stack spacing={6}>
      {/* Hero */}
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 4, md: 6 },
            background:
              'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(14,165,233,0.12) 38%, rgba(15,23,42,0) 100%)'
          }}
        >
          <Stack spacing={2.5}>
            <Chip label={GH_INTERNAL_NAV.adminCloudIntegrations.label} color='success' variant='outlined' sx={{ width: 'fit-content' }} />
            <Typography variant='h3'>{GH_INTERNAL_NAV.adminCloudIntegrations.subtitle}</Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 980 }}>
              Estado Greenhouse-relevante de syncs, webhooks, jobs y readiness de credenciales.
              Detecta dónde mirar y qué dominio está degradado antes de navegar a una vista operativa más profunda.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button component={Link} href='/agency/operations' variant='contained'>
                Abrir operaciones extendidas
              </Button>
              <Button component={Link} href='/admin' variant='outlined'>
                Volver a Admin Center
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* KPIs */}
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        <ExecutiveMiniStatCard
          eyebrow='Syncs'
          tone='success'
          title='Fuentes activas'
          value={String(data.kpis.activeSyncs)}
          detail='Mappings habilitados para sync Greenhouse.'
          icon='tabler-refresh'
        />
        <ExecutiveMiniStatCard
          eyebrow='Webhooks'
          tone={data.webhooks.schemaReady ? 'info' : 'warning'}
          title='Subscriptions activas'
          value={String(data.webhooks.subscriptionsActive)}
          detail={data.webhooks.schemaReady ? 'Canales outbound disponibles.' : 'Infra de webhooks aún no está completa.'}
          icon='tabler-webhook'
        />
        <ExecutiveMiniStatCard
          eyebrow='Secrets'
          tone={data.webhooks.secretRefsRegistered > 0 ? 'info' : 'warning'}
          title='Secret refs'
          value={String(data.webhooks.secretRefsRegistered)}
          detail='Referencias registradas sin exponer valores.'
          icon='tabler-key'
        />
        <ExecutiveMiniStatCard
          eyebrow='Pressure'
          tone={retryPressure > 0 ? 'warning' : 'success'}
          title='Deliveries en cola'
          value={String(retryPressure)}
          detail={retryPressure > 0 ? 'Pendientes o esperando retry.' : 'Sin presión en deliveries webhook.'}
          icon='tabler-arrows-shuffle'
        />
      </Box>

      {/* TASK-112: Integration Health & Freshness */}
      <ExecutiveCardShell
        title='Salud e integración'
        subtitle='Freshness como señal primaria. Verde < 6h, amarillo 6-24h, rojo > 24h. Barra a 0% tras 48h sin señal.'
      >
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Integración</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell sx={{ minWidth: 180 }}>Freshness</TableCell>
                <TableCell>Última señal</TableCell>
                <TableCell align='right'>Registros</TableCell>
                <TableCell align='right'>Fallos</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {integrationRows.map(row => (
                <TableRow key={row.name}>
                  <TableCell>
                    <Typography variant='body2' sx={{ fontWeight: 500 }}>{row.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size='small' variant='tonal' color={chipColor(row.health)} label={row.health} />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={row.freshness.label} arrow>
                      <Stack direction='row' alignItems='center' spacing={1.5}>
                        <LinearProgress
                          variant='determinate'
                          value={row.freshness.percent}
                          color={freshnessBarColor(row.freshness.tone)}
                          sx={{ flex: 1, height: 6, borderRadius: 999 }}
                        />
                        <Typography variant='caption' color='text.secondary' sx={{ minWidth: 56, textAlign: 'right' }}>
                          {row.freshness.label}
                        </Typography>
                      </Stack>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant='caption' color='text.secondary'>
                      {formatDateTime(row.lastSignal)}
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2'>{row.processed}</Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2' color={row.failed > 0 ? 'error.main' : 'text.secondary'}>
                      {row.failed}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </ExecutiveCardShell>

      {/* Attendance lineage */}
      <ExecutiveCardShell
        title='Attendance lineage'
        subtitle='La fuente e integración objetivo de asistencia viven mejor aquí que dentro del flujo diario de Payroll.'
      >
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }
          }}
        >
          <Card variant='outlined'>
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction='row' justifyContent='space-between' alignItems='center' gap={2}>
                  <Typography variant='h6'>Fuente actual de asistencia</Typography>
                  <Chip size='small' variant='tonal' color='warning' label='legacy' />
                </Stack>
                <Typography variant='body2' color='text.secondary'>
                  Payroll hoy consume asistencia consolidada desde `attendance_daily` + `leave_requests`.
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Esta nota se mueve a Admin Center para dejar en nómina solo el impacto funcional sobre el cálculo.
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card variant='outlined'>
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction='row' justifyContent='space-between' alignItems='center' gap={2}>
                  <Typography variant='h6'>Integración objetivo</Typography>
                  <Chip size='small' variant='tonal' color='info' label='roadmap' />
                </Stack>
                <Typography variant='body2' color='text.secondary'>
                  La integración objetivo para asistencia sigue siendo Microsoft Teams como surface fuente.
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Cuando esta lane crezca, aquí debería vivir freshness, health de ingestión y diagnóstico del fallback.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </ExecutiveCardShell>

      {/* Webhooks y jobs */}
      <ExecutiveCardShell
        title='Webhooks y jobs'
        subtitle='Estado de entrada, salida y presión sobre la infraestructura de delivery.'
      >
        <Stack spacing={2.5}>
          <Card variant='outlined'>
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction='row' justifyContent='space-between' alignItems='center' gap={2}>
                  <Typography variant='h6'>Inbound + outbound</Typography>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={chipColor(data.webhooks.schemaReady ? 'ok' : 'warning')}
                    label={data.webhooks.schemaReady ? 'ok' : 'warning'}
                  />
                </Stack>
                <Typography variant='body2' color='text.secondary'>
                  {data.webhooks.endpointsActive} endpoints activos, {data.webhooks.subscriptionsActive} subscriptions activas,
                  {` ${data.webhooks.inboxReceived24h}`} inbox events en 24h y {data.webhooks.deliveriesDeadLetter} deliveries en dead-letter.
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Último inbox observado: {formatDateTime(data.webhooks.lastInboxAt)} · Última delivery observada: {formatDateTime(data.webhooks.lastDeliveryAt)}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card variant='outlined'>
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant='h6'>Acciones de delivery</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Estas acciones no sustituyen los cron canónicos, pero ayudan a destrabar retries y dispatch manual.
                </Typography>
                <AdminOpsActionButton
                  endpoint='/api/admin/ops/webhooks/dispatch'
                  label='Despachar webhooks pendientes'
                  helper='Ejecuta una pasada del dispatcher outbound.'
                />
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </ExecutiveCardShell>

      {/* TASK-111: Secret Ref Governance */}
      <ExecutiveCardShell
        title='Credenciales gobernadas'
        subtitle='Metadata de secret refs registradas sin exponer valores. Separadas por dirección con estado de governance.'
      >
        {allCredentialRows.length > 0 ? (
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Secret ref</TableCell>
                  <TableCell>Dirección</TableCell>
                  <TableCell>Auth</TableCell>
                  <TableCell>Owner</TableCell>
                  <TableCell>Scope</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Verificación</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allCredentialRows.map(item => (
                  <TableRow key={`${item.sourceKind}-${item.secretRef}`}>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                        {item.secretRef}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        variant='tonal'
                        color={item.direction === 'Inbound' ? 'info' : 'primary'}
                        label={item.direction}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {item.authMode || '\u2014'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {item.owner}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {item.scope}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        variant='tonal'
                        color={governanceChipColor(item.governanceStatus)}
                        label={governanceLabel(item.governanceStatus)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='caption' color='text.secondary'>
                        {item.lastVerifiedAt ? formatDateTime(item.lastVerifiedAt) : 'Sin verificación'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>
            No se observan secret refs registradas en la capa webhook. La tabla se poblará al crear endpoints o subscriptions con secret_ref.
          </Typography>
        )}
      </ExecutiveCardShell>

      {/* Acciones operativas */}
      <ExecutiveCardShell
        title='Acciones operativas'
        subtitle='Mutaciones manuales ya existentes en runtime, expuestas aquí con confirmación y sin depender del cron secret.'
      >
        <AdminOperationalActionsPanel
          title='Cloud runbooks'
          subtitle='Ejecuta solo acciones que ya existen como helpers canónicos. Este shell no crea otra capa de negocio.'
          actions={[
            {
              id: 'dispatch-webhooks',
              label: 'Despachar webhooks',
              description: 'Procesa deliveries pendientes o en retry de la cola outbound.',
              endpoint: '/api/admin/ops/webhook-dispatch',
              confirmTitle: '¿Despachar webhooks pendientes?',
              confirmDescription: 'Esto intenta entregar los webhooks pendientes o reintentables usando el dispatcher canónico.',
              confirmColor: 'warning'
            },
            {
              id: 'services-sync',
              label: 'Re-disparar services sync',
              description: 'Ejecuta manualmente la sincronización HubSpot -> Services para organizaciones activas.',
              endpoint: '/api/admin/ops/services-sync',
              confirmTitle: '¿Re-disparar services sync?',
              confirmDescription: 'Esto corre la sync operativa de servicios sobre las organizaciones con HubSpot activo.',
              confirmColor: 'primary'
            }
          ]}
        />
      </ExecutiveCardShell>
    </Stack>
  )
}

export default AdminCloudIntegrationsView
