'use client'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
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

import { ExecutiveCardShell, ExecutiveMiniStatCard, GreenhouseRouteLink } from '@/components/greenhouse'
import GcpBillingCard from '@/components/greenhouse/admin/GcpBillingCard'
import NotionSyncOperationalCard from '@/components/greenhouse/admin/NotionSyncOperationalCard'
import { GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'
import type { NotionSyncOperationalOverview } from '@/lib/integrations/notion-sync-operational-overview'
import type { SisterPlatformBindingRecord } from '@/lib/sister-platforms/types'
import type { GcpBillingOverview } from '@/types/billing-export'
import type {
  IntegrationDataQualityOverview,
  IntegrationDataQualityRunResult,
  IntegrationDataQualityStatus
} from '@/types/integration-data-quality'
import type {
  NotionSyncOrchestrationOverview,
  NotionSyncOrchestrationStatus
} from '@/types/notion-sync-orchestration'
import type { IntegrationHealth, IntegrationReadiness, IntegrationType, IntegrationWithHealth } from '@/types/integrations'
import AdminOpsActionButton from './AdminOpsActionButton'

const TASK407_EMPTY_NO_SE_ENCONTRARON_INTEGRACIONES_EN_EL_REGISTRY_LA_TABLA = "No se encontraron integraciones en el registry. La tabla"


type Props = {
  integrations: IntegrationWithHealth[]
  notionDataQualityOverview: IntegrationDataQualityOverview | null
  notionOrchestrationOverview: NotionSyncOrchestrationOverview | null
  sisterPlatformBindings: SisterPlatformBindingRecord[]
  gcpBilling: GcpBillingOverview | null
  notionOperationalOverview: NotionSyncOperationalOverview | null
}

const typeLabel: Record<IntegrationType, string> = {
  system_upstream: 'System upstream',
  event_provider: 'Event provider',
  batch_file: 'Batch / file',
  api_connector: 'API connector',
  hybrid: 'Hybrid'
}

const typeColor: Record<IntegrationType, 'primary' | 'info' | 'warning' | 'secondary' | 'success'> = {
  system_upstream: 'primary',
  event_provider: 'info',
  batch_file: 'warning',
  api_connector: 'secondary',
  hybrid: 'success'
}

const readinessColor: Record<IntegrationReadiness, 'success' | 'warning' | 'error' | 'secondary'> = {
  ready: 'success',
  warning: 'warning',
  blocked: 'error',
  unknown: 'secondary'
}

const readinessLabel: Record<IntegrationReadiness, string> = {
  ready: 'Ready',
  warning: 'Warning',
  blocked: 'Blocked',
  unknown: 'Unknown'
}

const healthColor: Record<IntegrationHealth, 'success' | 'warning' | 'error' | 'secondary' | 'info'> = {
  healthy: 'success',
  degraded: 'warning',
  down: 'error',
  idle: 'secondary',
  not_configured: 'info'
}

const bindingStatusColor: Record<
  SisterPlatformBindingRecord['bindingStatus'],
  'success' | 'warning' | 'error' | 'secondary'
> = {
  active: 'success',
  draft: 'warning',
  suspended: 'error',
  deprecated: 'secondary'
}

const bindingScopeLabel = (binding: SisterPlatformBindingRecord) => {
  if (binding.greenhouseScopeType === 'internal') {
    return 'Ecosistema interno'
  }

  if (binding.spaceId) {
    return binding.spaceName ?? binding.spaceId
  }

  if (binding.clientId) {
    return binding.clientName ?? binding.clientId
  }

  return binding.organizationName ?? binding.organizationId ?? 'Sin scope'
}

const bindingExternalLabel = (binding: SisterPlatformBindingRecord) =>
  binding.externalDisplayName ?? binding.externalScopeId

const freshnessBarColor = (percent: number): 'success' | 'warning' | 'error' => {
  if (percent >= 75) return 'success'
  if (percent >= 40) return 'warning'

  return 'error'
}

const formatDateTime = (value: string | null) => {
  if (!value) return 'Sin registro'

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Santiago'
  }).format(new Date(value))
}

const dataQualityColor = (
  status: IntegrationDataQualityStatus
): 'success' | 'warning' | 'error' | 'secondary' => {
  if (status === 'healthy') return 'success'
  if (status === 'degraded') return 'warning'
  if (status === 'broken') return 'error'

  return 'secondary'
}

const orchestrationColor = (
  status: NotionSyncOrchestrationStatus | 'unknown'
): 'success' | 'warning' | 'error' | 'secondary' | 'info' => {
  if (status === 'sync_completed') return 'success'
  if (status === 'waiting_for_raw' || status === 'retry_scheduled') return 'warning'
  if (status === 'retry_running') return 'info'
  if (status === 'sync_failed' || status === 'cancelled') return 'error'

  return 'secondary'
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  if (typeof value === 'object' && value !== null && 'value' in value) {
    return toNumber((value as { value?: unknown }).value)
  }

  return 0
}

const getTopFindings = (runs: IntegrationDataQualityRunResult[]) => {
  const totals = new Map<string, number>()

  for (const run of runs.slice(0, 6)) {
    const bucketCounts = typeof run.summary.bucketCounts === 'object' && run.summary.bucketCounts !== null
      ? run.summary.bucketCounts as Record<string, unknown>
      : {}

    for (const [bucket, count] of Object.entries(bucketCounts)) {
      const normalizedCount = toNumber(count)

      if (normalizedCount > 0) {
        totals.set(bucket, (totals.get(bucket) ?? 0) + normalizedCount)
      }
    }
  }

  return [...totals.entries()]
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 4)
}

const AdminIntegrationGovernanceView = ({
  integrations,
  notionDataQualityOverview,
  notionOrchestrationOverview,
  sisterPlatformBindings,
  gcpBilling,
  notionOperationalOverview
}: Props) => {
  const activeCount = integrations.filter(i => i.active).length
  const readyCount = integrations.filter(i => i.readinessStatus === 'ready' && !i.pausedAt).length
  const pausedCount = integrations.filter(i => i.pausedAt).length
  const domains = [...new Set(integrations.flatMap(i => i.consumerDomains))]
  const syncableCount = integrations.filter(i => i.syncEndpoint && !i.pausedAt).length
  const activeBindingsCount = sisterPlatformBindings.filter(binding => binding.bindingStatus === 'active').length
  const draftBindingsCount = sisterPlatformBindings.filter(binding => binding.bindingStatus === 'draft').length
  const suspendedBindingsCount = sisterPlatformBindings.filter(binding => binding.bindingStatus === 'suspended').length
  const boundPlatforms = [...new Set(sisterPlatformBindings.map(binding => binding.sisterPlatformKey))]
  const boundScopes = [...new Set(sisterPlatformBindings.map(binding => `${binding.greenhouseScopeType}:${binding.organizationId}:${binding.clientId ?? '-'}:${binding.spaceId ?? '-'}`))]
  const notionLatestBySpace = notionDataQualityOverview?.latestBySpace ?? []
  const notionStatusTotals = notionDataQualityOverview?.totals ?? null
  const notionRecentRuns = notionDataQualityOverview?.recentRuns ?? []
  const notionTopFindings = getTopFindings(notionRecentRuns)
  const notionOrchestrationTotals = notionOrchestrationOverview?.totals ?? null
  const notionOrchestrationLatest = notionOrchestrationOverview?.latestBySpace ?? []

  return (
    <Stack spacing={6}>
      {/* Hero */}
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 4, md: 6 },
            background:
              'linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(168,85,247,0.12) 38%, rgba(15,23,42,0) 100%)'
          }}
        >
          <Stack spacing={2.5}>
            <Chip
              label={GH_INTERNAL_NAV.adminIntegrationGovernance.label}
              color='info'
              variant='outlined'
              sx={{ width: 'fit-content' }}
            />
            <Typography variant='h3'>{GH_INTERNAL_NAV.adminIntegrationGovernance.subtitle}</Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 980 }}>
              Inventario de integraciones nativas del platform layer.
              Cada upstream critico con taxonomia, ownership, readiness y health visibles.
              La fuente canonica es <code>greenhouse_sync.integration_registry</code>.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button component={GreenhouseRouteLink} href='/admin/cloud-integrations' variant='contained'>
                Cloud & Integrations
              </Button>
              <Button component={Link} href='/admin' variant='outlined'>
                Volver a Admin Center
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {integrations.length === 0 && (
        <Alert severity='info' variant='outlined'>
          {TASK407_EMPTY_NO_SE_ENCONTRARON_INTEGRACIONES_EN_EL_REGISTRY_LA_TABLA} <code>greenhouse_sync.integration_registry</code> puede
          estar vacia o la consulta fallo. Verifica que la migracion se haya aplicado correctamente.
        </Alert>
      )}

      {/* KPIs */}
      {integrations.length > 0 && <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        <ExecutiveMiniStatCard
          eyebrow='Registry'
          tone='info'
          title='Integraciones activas'
          value={String(activeCount)}
          detail='Integraciones nativas registradas y activas.'
          icon='tabler-plug-connected'
        />
        <ExecutiveMiniStatCard
          eyebrow='Readiness'
          tone='success'
          title='Ready'
          value={String(readyCount)}
          detail='Integraciones con readiness confirmada para downstream.'
          icon='tabler-circle-check'
        />
        <ExecutiveMiniStatCard
          eyebrow='Control'
          tone={pausedCount > 0 ? 'error' : 'success'}
          title={pausedCount > 0 ? 'Pausadas' : 'Sincronizables'}
          value={pausedCount > 0 ? String(pausedCount) : String(syncableCount)}
          detail={pausedCount > 0 ? 'Integraciones bloqueadas para downstream.' : 'Integraciones con sync endpoint activo.'}
          icon={pausedCount > 0 ? 'tabler-player-pause' : 'tabler-refresh'}
        />
        <ExecutiveMiniStatCard
          eyebrow='Coverage'
          tone='info'
          title='Dominios downstream'
          value={String(domains.length)}
          detail={domains.join(', ') || 'Sin dominios registrados.'}
          icon='tabler-topology-ring-3'
        />
      </Box>}

      {/* Notion sync operational overview (TASK-586) */}
      {notionOperationalOverview && (
        <NotionSyncOperationalCard overview={notionOperationalOverview} />
      )}

      {/* GCP cost spotlight desde Billing Export (TASK-586) */}
      {gcpBilling && <GcpBillingCard overview={gcpBilling} />}

      <ExecutiveCardShell
        title='Sister Platform Bindings'
        subtitle='Contrato operativo entre plataformas hermanas y los scopes Greenhouse. Aquí se ve qué tenant externo resuelve a qué organización, cliente o space antes de abrir sincronías más profundas.'
      >
        {sisterPlatformBindings.length === 0 ? (
          <Alert severity='info' variant='outlined'>
            Todavía no hay bindings sister-platform registrados. La base ya está lista para Kortex, Verk y futuras apps hermanas, pero aún no se ha declarado un enlace activo.
          </Alert>
        ) : (
          <Stack spacing={3}>
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
              }}
            >
              <ExecutiveMiniStatCard
                eyebrow='Active'
                tone={activeBindingsCount > 0 ? 'success' : 'warning'}
                title='Bindings activos'
                value={String(activeBindingsCount)}
                detail='Resoluciones habilitadas para consumo downstream.'
                icon='tabler-link-check'
              />
              <ExecutiveMiniStatCard
                eyebrow='Coverage'
                tone='info'
                title='Plataformas cubiertas'
                value={String(boundPlatforms.length)}
                detail={boundPlatforms.join(', ') || 'Sin plataformas registradas.'}
                icon='tabler-app-window'
              />
              <ExecutiveMiniStatCard
                eyebrow='Governance'
                tone={draftBindingsCount > 0 ? 'warning' : 'success'}
                title='Pendientes'
                value={String(draftBindingsCount)}
                detail='Bindings todavía en revisión o pendientes de activación.'
                icon='tabler-clock-hour-4'
              />
              <ExecutiveMiniStatCard
                eyebrow='Resilience'
                tone={suspendedBindingsCount > 0 ? 'error' : 'info'}
                title='Scopes enlazados'
                value={String(boundScopes.length)}
                detail={suspendedBindingsCount > 0 ? `${suspendedBindingsCount} binding(s) suspendido(s).` : 'Sin suspensiones vigentes.'}
                icon='tabler-topology-complex'
              />
            </Box>

            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Plataforma</TableCell>
                    <TableCell>Scope externo</TableCell>
                    <TableCell>Scope Greenhouse</TableCell>
                    <TableCell>Rol</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Verificación</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sisterPlatformBindings.map(binding => (
                    <TableRow key={binding.bindingId} hover>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant='body2' sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                            {binding.sisterPlatformKey}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {binding.publicId}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant='body2'>{bindingExternalLabel(binding)}</Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {binding.externalScopeType}: {binding.externalScopeId}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant='body2'>{bindingScopeLabel(binding)}</Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {binding.greenhouseScopeType}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip size='small' variant='outlined' label={binding.bindingRole} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={bindingStatusColor[binding.bindingStatus]}
                          label={binding.bindingStatus}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant='body2'>
                            {formatDateTime(binding.lastVerifiedAt ?? binding.updatedAt)}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {binding.lastVerifiedAt ? 'Última verificación' : 'Última actualización'}
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        )}
      </ExecutiveCardShell>

      {/* Registry Table */}
      <ExecutiveCardShell
        title='Integration Registry'
        subtitle='Inventario centralizado de integraciones nativas. Taxonomia, ownership, cadence y readiness por upstream.'
      >
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Integracion</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Cadencia</TableCell>
                <TableCell>Auth</TableCell>
                <TableCell>Dominios</TableCell>
                <TableCell>Readiness</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {integrations.map(entry => (
                <TableRow key={entry.integrationKey}>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant='body2' sx={{ fontWeight: 600 }}>
                        {entry.displayName}
                      </Typography>
                      <Typography variant='caption' color='text.secondary' sx={{ maxWidth: 280 }}>
                        {entry.description}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size='small'
                      variant='tonal'
                      color={typeColor[entry.integrationType]}
                      label={typeLabel[entry.integrationType]}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' color='text.secondary'>
                      {entry.owner ?? '\u2014'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' sx={{ fontSize: '0.8125rem' }}>
                      {entry.syncCadence ?? '\u2014'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' color='text.secondary'>
                      {entry.authMode ?? '\u2014'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction='row' spacing={0.5} flexWrap='wrap' useFlexGap>
                      {entry.consumerDomains.map(domain => (
                        <Chip key={domain} size='small' variant='outlined' label={domain} />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size='small'
                      variant='tonal'
                      color={readinessColor[entry.readinessStatus]}
                      label={readinessLabel[entry.readinessStatus]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </ExecutiveCardShell>

      {/* Health & Freshness */}
      <ExecutiveCardShell
        title='Health & Freshness'
        subtitle='Health refleja el estado actual segun la ultima senal valida y su frescura. Los fallos 24h se muestran aparte como contexto operativo, sin degradar por si solos una integracion ya recuperada.'
      >
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Integracion</TableCell>
                <TableCell>Health</TableCell>
                <TableCell sx={{ minWidth: 180 }}>Freshness</TableCell>
                <TableCell>Ultima senal</TableCell>
                <TableCell align='right'>Syncs 24h</TableCell>
                <TableCell align='right'>Fallos 24h</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {integrations.map(entry => {
                const h = entry.healthSnapshot

                return (
                  <TableRow key={entry.integrationKey}>
                    <TableCell>
                      <Typography variant='body2' sx={{ fontWeight: 500 }}>
                        {entry.displayName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.75} alignItems='flex-start'>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={healthColor[h.health]}
                          label={h.health}
                        />
                        {h.syncFailuresLast24h > 0 && (
                          <Typography variant='caption' color='warning.main'>
                            {h.syncFailuresLast24h} incidente(s) en 24h
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={h.freshnessLabel} arrow>
                        <Stack direction='row' alignItems='center' spacing={1.5}>
                          <LinearProgress
                            variant='determinate'
                            value={h.freshnessPercent}
                            color={freshnessBarColor(h.freshnessPercent)}
                            sx={{ flex: 1, height: 6, borderRadius: 999 }}
                          />
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{ minWidth: 56, textAlign: 'right' }}
                          >
                            {h.freshnessLabel}
                          </Typography>
                        </Stack>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant='caption' color='text.secondary'>
                        {formatDateTime(h.lastSyncAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2'>{h.syncRunsLast24h}</Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography
                        variant='body2'
                        color={h.syncFailuresLast24h > 0 ? 'error.main' : 'text.secondary'}
                      >
                        {h.syncFailuresLast24h}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </ExecutiveCardShell>

      <ExecutiveCardShell
        title='Notion Sync Orchestration'
        subtitle='Cierre operativo del tramo raw -> conformed. Muestra qué spaces siguen esperando raw, cuáles están en retry y dónde conviene intervenir antes de declarar el pipeline sano.'
      >
        {!notionOrchestrationTotals ? (
          <Alert severity='info' variant='outlined'>
            La orquestación todavía no tiene evidencia persistida. El primer bloqueo por frescura o el primer retry materializarán esta vista.
          </Alert>
        ) : (
          <Stack spacing={3}>
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }
              }}
            >
              <ExecutiveMiniStatCard
                eyebrow='Open'
                tone={notionOrchestrationTotals.openSpaces > 0 ? 'warning' : 'success'}
                title='Spaces abiertos'
                value={String(notionOrchestrationTotals.openSpaces)}
                detail='Spaces que todavía no convergen al writer canónico.'
                icon='tabler-loader-2'
              />
              <ExecutiveMiniStatCard
                eyebrow='Waiting Raw'
                tone={notionOrchestrationTotals.waitingForRaw > 0 ? 'warning' : 'success'}
                title='Esperando raw'
                value={String(notionOrchestrationTotals.waitingForRaw)}
                detail='Spaces bloqueados por frescura upstream en Notion/BigQuery.'
                icon='tabler-hourglass'
              />
              <ExecutiveMiniStatCard
                eyebrow='Retry'
                tone={
                  notionOrchestrationTotals.retryScheduled + notionOrchestrationTotals.retryRunning > 0
                    ? 'warning'
                    : 'success'
                }
                title='Reintentos activos'
                value={String(notionOrchestrationTotals.retryScheduled + notionOrchestrationTotals.retryRunning)}
                detail='Retries ya planificados o ejecutándose dentro de la ventana diaria.'
                icon='tabler-refresh'
              />
              <ExecutiveMiniStatCard
                eyebrow='Failed'
                tone={notionOrchestrationTotals.syncFailed > 0 ? 'error' : 'success'}
                title='Fallidos'
                value={String(notionOrchestrationTotals.syncFailed)}
                detail='Spaces que agotaron la ventana de retry o cerraron en error.'
                icon='tabler-alert-octagon'
              />
            </Box>

            {(notionOrchestrationTotals.syncFailed > 0 || notionOrchestrationTotals.unknownSpaces > 0) && (
              <Alert severity={notionOrchestrationTotals.syncFailed > 0 ? 'error' : 'warning'} variant='outlined'>
                {notionOrchestrationTotals.syncFailed > 0
                  ? 'Hay spaces que no convergieron dentro del presupuesto de retry. Revisa razón y próxima intervención antes de confiar en downstream.'
                  : 'Hay spaces activos sin evidencia de orquestación todavía. Eso suele indicar que el día aún no abrió corrida o que el control plane no ha materializado señal.'}
              </Alert>
            )}

            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Space</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align='right'>Retry</TableCell>
                    <TableCell>Próxima ventana</TableCell>
                    <TableCell>Última señal</TableCell>
                    <TableCell>Razón</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {notionOrchestrationLatest.map(space => (
                    <TableRow key={space.spaceId} hover>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {space.spaceName ?? space.spaceId}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {space.spaceId}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={orchestrationColor(space.orchestrationStatus)}
                          label={space.orchestrationStatus}
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>{space.retryAttempt}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary'>
                          {formatDateTime(space.nextRetryAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary'>
                          {formatDateTime(space.updatedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary'>
                          {space.waitingReason ?? 'Sin observaciones'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        )}
      </ExecutiveCardShell>

      <ExecutiveCardShell
        title='Notion Delivery Data Quality'
        subtitle='Monitor recurrente del contrato `Notion -> notion_ops -> greenhouse_conformed.delivery_tasks`. Señal separada de la health genérica de la integración.'
      >
        {!notionStatusTotals ? (
          <Alert severity='info' variant='outlined'>
            El monitor todavía no tiene corridas materializadas. Ejecuta el cron o espera el siguiente ciclo después de `sync-conformed`.
          </Alert>
        ) : (
          <Stack spacing={3}>
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }
              }}
            >
              <ExecutiveMiniStatCard
                eyebrow='Spaces'
                tone='info'
                title='Cobertura auditada'
                value={String(notionStatusTotals.totalSpaces)}
                detail='Spaces activos con binding Notion incluidos en el monitor.'
                icon='tabler-building-community'
              />
              <ExecutiveMiniStatCard
                eyebrow='Healthy'
                tone='success'
                title='Sanos'
                value={String(notionStatusTotals.healthySpaces)}
                detail='Spaces sin drift ni findings duros en la última corrida.'
                icon='tabler-shield-check'
              />
              <ExecutiveMiniStatCard
                eyebrow='Degraded'
                tone={notionStatusTotals.degradedSpaces > 0 ? 'warning' : 'success'}
                title='Degradados'
                value={String(notionStatusTotals.degradedSpaces)}
                detail='Mismatchs o hallazgos blandos que requieren seguimiento.'
                icon='tabler-alert-circle'
              />
              <ExecutiveMiniStatCard
                eyebrow='Broken'
                tone={notionStatusTotals.brokenSpaces > 0 ? 'error' : 'success'}
                title='Rotos'
                value={String(notionStatusTotals.brokenSpaces)}
                detail='Frescura o paridad rota; requiere intervención operativa.'
                icon='tabler-activity-heartbeat'
              />
            </Box>

            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Space</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Última corrida</TableCell>
                    <TableCell align='right'>Warnings</TableCell>
                    <TableCell align='right'>Errores</TableCell>
                    <TableCell align='right'>Diff</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {notionLatestBySpace.map(space => (
                    <TableRow key={space.spaceId} hover>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {space.spaceName ?? space.spaceId}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {space.spaceId}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={dataQualityColor(space.qualityStatus)}
                          label={space.qualityStatus}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary'>
                          {formatDateTime(space.checkedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>{space.warningChecks}</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography
                          variant='body2'
                          color={space.errorChecks > 0 ? 'error.main' : 'text.secondary'}
                        >
                          {space.errorChecks}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography
                          variant='body2'
                          color={space.diffCount > 0 ? 'warning.main' : 'text.secondary'}
                        >
                          {space.diffCount}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' }
              }}
            >
              <Card variant='outlined'>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography variant='h6'>Findings recurrentes</Typography>
                    {notionTopFindings.length > 0 ? (
                      notionTopFindings.map(finding => (
                        <Stack key={finding.bucket} direction='row' justifyContent='space-between' alignItems='center' gap={2}>
                          <Typography variant='body2' color='text.secondary'>
                            {finding.bucket}
                          </Typography>
                          <Chip size='small' variant='outlined' color='warning' label={`${finding.count} caso(s)`} />
                        </Stack>
                      ))
                    ) : (
                      <Typography variant='body2' color='text.secondary'>
                        Sin findings activos en las corridas recientes.
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              <Card variant='outlined'>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant='h6'>Historia corta</Typography>
                    <TableContainer>
                      <Table size='small'>
                        <TableHead>
                          <TableRow>
                            <TableCell>Space</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align='right'>Diff</TableCell>
                            <TableCell>Corrida</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {notionRecentRuns.slice(0, 6).map(run => (
                            <TableRow key={run.dataQualityRunId} hover>
                              <TableCell>
                                <Typography variant='body2' sx={{ fontSize: '0.8125rem' }}>
                                  {run.spaceId}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size='small'
                                  variant='tonal'
                                  color={dataQualityColor(run.qualityStatus)}
                                  label={run.qualityStatus}
                                />
                              </TableCell>
                              <TableCell align='right'>
                                <Typography
                                  variant='body2'
                                  color={toNumber(run.summary.diffCount) > 0 ? 'warning.main' : 'text.secondary'}
                                >
                                  {toNumber(run.summary.diffCount)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant='caption' color='text.secondary'>
                                  {formatDateTime(run.checkedAt)}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Stack>
        )}
      </ExecutiveCardShell>

      {/* Control Plane — Sync & Pause/Resume */}
      <ExecutiveCardShell
        title='Control plane'
        subtitle='Acciones operativas por integracion. Trigger sync on-demand, pausar o reanudar integraciones desde el registry.'
      >
        <Stack spacing={3}>
          {integrations.map(entry => (
            <Card key={entry.integrationKey} variant='outlined'>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction='row' justifyContent='space-between' alignItems='center' gap={2}>
                    <Stack direction='row' spacing={1.5} alignItems='center'>
                      <Typography variant='h6'>{entry.displayName}</Typography>
                      {entry.pausedAt ? (
                        <Chip size='small' variant='tonal' color='error' label='Pausada' />
                      ) : (
                        <Chip size='small' variant='tonal' color='success' label='Activa' />
                      )}
                    </Stack>
                    {entry.syncEndpoint ? (
                      <Typography variant='caption' color='text.secondary'>
                        {entry.syncEndpoint}
                      </Typography>
                    ) : (
                      <Typography variant='caption' color='text.secondary'>Sin sync endpoint (pasiva)</Typography>
                    )}
                  </Stack>

                  {entry.pausedAt && (
                    <Typography variant='body2' color='error.main'>
                      Pausada desde {formatDateTime(entry.pausedAt)}{entry.pausedReason ? ` — ${entry.pausedReason}` : ''}
                    </Typography>
                  )}

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    {entry.syncEndpoint && !entry.pausedAt && (
                      <AdminOpsActionButton
                        endpoint={`/api/admin/integrations/${entry.integrationKey}/sync`}
                        label={`Sincronizar ${entry.displayName}`}
                        helper='Trigger on-demand del pipeline de sync.'
                      />
                    )}
                    {entry.pausedAt ? (
                      <AdminOpsActionButton
                        endpoint={`/api/admin/integrations/${entry.integrationKey}/resume`}
                        label={`Reanudar ${entry.displayName}`}
                        helper='Desbloquea la integracion y vuelve a ready.'
                      />
                    ) : (
                      <AdminOpsActionButton
                        endpoint={`/api/admin/integrations/${entry.integrationKey}/pause`}
                        label={`Pausar ${entry.displayName}`}
                        helper='Bloquea la integracion. Downstream no consumira datos.'
                      />
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </ExecutiveCardShell>

      {/* Consumer Domain Map */}
      <ExecutiveCardShell
        title='Mapa de dominios consumidores'
        subtitle='Que dominios downstream dependen de cada integracion nativa. Visibilidad cruzada para impacto operativo.'
      >
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }
          }}
        >
          {integrations.map(entry => (
            <Card key={entry.integrationKey} variant='outlined'>
              <CardContent>
                <Stack spacing={1.5}>
                  <Stack direction='row' justifyContent='space-between' alignItems='center' gap={2}>
                    <Typography variant='h6'>{entry.displayName}</Typography>
                    <Chip
                      size='small'
                      variant='tonal'
                      color={readinessColor[entry.readinessStatus]}
                      label={readinessLabel[entry.readinessStatus]}
                    />
                  </Stack>
                  <Typography variant='body2' color='text.secondary'>
                    {entry.description}
                  </Typography>
                  <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                    {entry.consumerDomains.map(domain => (
                      <Chip key={domain} size='small' color='primary' variant='outlined' label={domain} />
                    ))}
                  </Stack>
                  <Stack spacing={0.5}>
                    <Typography variant='caption' color='text.secondary'>
                      Tipo: {typeLabel[entry.integrationType]} | Cadencia: {entry.syncCadence ?? 'N/A'} | Auth: {entry.authMode ?? 'N/A'}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      </ExecutiveCardShell>
    </Stack>
  )
}

export default AdminIntegrationGovernanceView
