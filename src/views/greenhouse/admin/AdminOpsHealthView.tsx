'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import MuiTimeline from '@mui/lab/Timeline'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import { styled } from '@mui/material/styles'
import type { TimelineProps } from '@mui/lab/Timeline'

import { ExecutiveCardShell, ExecutiveMiniStatCard } from '@/components/greenhouse'
import { GH_INTERNAL_NAV } from '@/config/greenhouse-nomenclature'
import type { OperationsHealthStatus, OperationsOverview, OperationsSubsystem } from '@/lib/operations/get-operations-overview'
import AdminOperationalActionsPanel from './AdminOperationalActionsPanel'
import AdminOpsActionButton from './AdminOpsActionButton'

type Props = {
  data: OperationsOverview
}

type AdminHealth = 'ok' | 'warning' | 'failed' | 'stale'

type AuditEvent = {
  id: string
  color: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary'
  title: string
  detail: string
  timestamp: string | null
  result: string
  resultTone: AdminHealth
  actorLabel: string
  followUp: string | null
}

const formatDateTime = (value: string | null) => {
  if (!value) return 'Sin registro'

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Santiago'
  }).format(new Date(value))
}

const trimId = (value: string) => (value.length > 18 ? `${value.slice(0, 18)}...` : value)

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

const sentryStatusColor = (
  status: OperationsOverview['cloud']['observability']['incidents']['status']
): 'success' | 'warning' | 'error' | 'secondary' => {
  if (status === 'ok') return 'success'
  if (status === 'warning') return 'warning'
  if (status === 'unconfigured') return 'secondary'

  return 'error'
}

const sentryLevelColor = (level: string): 'success' | 'warning' | 'error' | 'secondary' => {
  if (level === 'fatal' || level === 'error') return 'error'
  if (level === 'warning') return 'warning'
  if (level === 'info' || level === 'debug') return 'secondary'

  return 'warning'
}

const healthSubsystems = (subsystems: OperationsSubsystem[]) =>
  subsystems.filter(subsystem => ['Outbox', 'Proyecciones', 'Notificaciones', 'Finance Data Quality'].includes(subsystem.name))

/* ── TASK-113: Styled Timeline (Vuexy pattern) ── */
const Timeline = styled(MuiTimeline)<TimelineProps>({
  paddingLeft: 0,
  paddingRight: 0,
  '& .MuiTimelineItem-root': {
    width: '100%',
    '&:before': {
      display: 'none'
    }
  }
})

const buildAuditEvents = (data: OperationsOverview): AuditEvent[] => {
  const fromEvents: AuditEvent[] = data.recentEvents.slice(0, 6).map((event, i) => ({
    id: `evt-${i}`,
    color: event.status === 'processed' ? 'success' : event.status === 'failed' ? 'error' : 'info',
    title: event.eventType,
    detail: `${event.aggregateType}:${trimId(event.aggregateId)}`,
    timestamp: event.occurredAt,
    result: event.status,
    resultTone: (event.status === 'processed' ? 'ok' : event.status === 'failed' ? 'failed' : 'warning') as AdminHealth,
    actorLabel: 'Sistema',
    followUp: event.status === 'failed' ? 'Verificar handler reactivo o reencolar desde el panel de acciones' : null
  }))

  const fromHandlers: AuditEvent[] = data.failedHandlers.slice(0, 4).map((handler, i) => ({
    id: `handler-${i}`,
    color: handler.result === 'dead-letter' ? 'error' : 'warning',
    title: handler.handler,
    detail: handler.lastError,
    timestamp: handler.reactedAt,
    result: handler.result,
    resultTone: (handler.result === 'dead-letter' ? 'failed' : 'warning') as AdminHealth,
    actorLabel: 'Sistema',
    followUp: handler.result === 'dead-letter'
      ? 'Requiere intervención manual o replay'
      : `Retry automático (${handler.retries} intentos)`
  }))

  return [...fromEvents, ...fromHandlers]
    .sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0

      return timeB - timeA
    })
    .slice(0, 10)
}

const AdminOpsHealthView = ({ data }: Props) => {
  const subsystems = healthSubsystems(data.subsystems)
  const uniqueRecentEventTypes = Array.from(new Set(data.recentEvents.map(event => event.eventType))).slice(0, 8)
  const auditEvents = buildAuditEvents(data)
  const cloudAlerts = data.cloud.posture.controls.filter(control => control.status !== 'ok')
  const sentryIncidents = data.cloud.observability.incidents

  return (
    <Stack spacing={6}>
      {/* Hero */}
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 4, md: 6 },
            background:
              'linear-gradient(135deg, rgba(249,115,22,0.14) 0%, rgba(14,165,233,0.12) 36%, rgba(15,23,42,0) 100%)'
          }}
        >
          <Stack spacing={2.5}>
            <Chip label={GH_INTERNAL_NAV.adminOpsHealth.label} color='warning' variant='outlined' sx={{ width: 'fit-content' }} />
            <Typography variant='h3'>{GH_INTERNAL_NAV.adminOpsHealth.subtitle}</Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 980 }}>
              Health del control plane separado de las vistas de negocio. Presión sobre outbox, cola reactiva,
              señales recientes y handlers fallidos para decidir si hace falta retry, replay o navegación profunda.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button component={Link} href='/agency/operations' variant='contained'>
                Abrir operaciones extendidas
              </Button>
              <Button component={Link} href='/admin/cloud-integrations' variant='outlined'>
                Ver Cloud & Integrations
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
          eyebrow='Outbox'
          tone='info'
          title='Eventos 24h'
          value={String(data.kpis.outboxEvents24h)}
          detail='Flujo observado en el bus operativo del portal.'
          icon='tabler-send'
        />
        <ExecutiveMiniStatCard
          eyebrow='Reactive'
          tone={data.kpis.pendingProjections > 0 ? 'warning' : 'success'}
          title='Proyecciones pendientes'
          value={String(data.kpis.pendingProjections)}
          detail={data.kpis.pendingProjections > 0 ? 'Hay refreshes todavía en cola.' : 'Sin cola pendiente visible.'}
          icon='tabler-refresh'
        />
        <ExecutiveMiniStatCard
          eyebrow='Failures'
          tone={data.kpis.failedHandlers > 0 ? 'error' : 'success'}
          title='Handlers degradados'
          value={String(data.kpis.failedHandlers)}
          detail={data.kpis.failedHandlers > 0 ? 'Retries o dead-letters visibles en el ledger reactivo.' : 'Sin degradación visible en handlers reactivos.'}
          icon='tabler-alert-triangle'
        />
        <ExecutiveMiniStatCard
          eyebrow='Notifications'
          tone='info'
          title='Notificaciones 24h'
          value={String(data.kpis.notificationsSent24h)}
          detail='Volumen reciente del delivery transaccional.'
          icon='tabler-bell-ringing'
        />
      </Box>

      {/* Salud del control plane */}
      <ExecutiveCardShell
        title='Salud del control plane'
        subtitle='Lenguaje uniforme para leer si el runtime está ok, warning, failed o stale.'
      >
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, minmax(0, 1fr))' }
          }}
        >
          {subsystems.map(subsystem => {
            const health = toAdminHealth(subsystem.status)

            return (
              <Card key={subsystem.name} variant='outlined'>
                <CardContent>
                  <Stack spacing={2.5}>
                    <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
                      <Stack spacing={0.75}>
                        <Typography variant='h6'>{subsystem.name}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          Última señal: {formatDateTime(subsystem.lastRun)}
                        </Typography>
                      </Stack>
                      <Chip size='small' variant='tonal' color={chipColor(health)} label={health} />
                    </Stack>
                    <Typography variant='body2' color='text.secondary'>
                      {subsystem.failed > 0
                        ? `${subsystem.failed} fallos visibles sobre ${subsystem.processed} registros observados.`
                        : `${subsystem.processed} registros observados sin fallos activos visibles.`}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      </ExecutiveCardShell>

      <ExecutiveCardShell
        title='Cloud runtime'
        subtitle='Conexión directa con la baseline de `src/lib/cloud/*`: checks compartidos y postura institucional de plataforma.'
      >
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
                <Stack direction='row' justifyContent='space-between' alignItems='center' gap={2}>
                  <Typography variant='h6'>Health checks</Typography>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={data.cloud.posture.overallStatus === 'ok' ? 'success' : data.cloud.posture.overallStatus === 'warning' ? 'warning' : 'error'}
                    label={data.cloud.posture.overallStatus}
                  />
                </Stack>
                {data.cloud.health.checks.map(check => (
                  <Stack key={check.name} spacing={0.5}>
                    <Stack direction='row' justifyContent='space-between' alignItems='center' gap={2}>
                      <Typography variant='body2'>{check.name}</Typography>
                      <Chip
                        size='small'
                        variant='outlined'
                        color={check.ok ? 'success' : check.status === 'not_configured' ? 'warning' : 'error'}
                        label={check.ok ? 'ok' : check.status}
                      />
                    </Stack>
                    <Typography variant='caption' color='text.secondary'>
                      {check.summary}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card variant='outlined'>
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant='h6'>Cloud controls con atención</Typography>
                {cloudAlerts.length > 0 ? (
                  cloudAlerts.map(control => (
                    <Stack key={control.key} spacing={0.5}>
                      <Stack direction='row' justifyContent='space-between' alignItems='center' gap={2}>
                        <Typography variant='body2'>{control.label}</Typography>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={control.status === 'failed' ? 'error' : 'warning'}
                          label={control.status}
                        />
                      </Stack>
                      <Typography variant='caption' color='text.secondary'>
                        {control.summary}
                      </Typography>
                    </Stack>
                  ))
                ) : (
                  <Typography variant='body2' color='text.secondary'>
                    No hay controles cloud degradados. El runtime base de plataforma está sano.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </ExecutiveCardShell>

      <ExecutiveCardShell
        title='Incidentes Sentry'
        subtitle='Errores abiertos o recientes ya detectados por observabilidad externa para no depender solo del ledger interno.'
      >
        <Stack spacing={3}>
          <Card variant='outlined'>
            <CardContent>
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }
                }}
              >
                <Stack spacing={0.75}>
                  <Typography variant='overline' color='text.secondary'>
                    Estado
                  </Typography>
                  <Stack direction='row' spacing={1.5} alignItems='center'>
                    <Chip size='small' variant='tonal' color={sentryStatusColor(sentryIncidents.status)} label={sentryIncidents.status} />
                    <Typography variant='body2' color='text.secondary'>
                      {sentryIncidents.summary}
                    </Typography>
                  </Stack>
                </Stack>
                <Stack spacing={0.75}>
                  <Typography variant='overline' color='text.secondary'>
                    Observability posture
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {data.cloud.observability.posture.summary}
                  </Typography>
                </Stack>
                <Stack spacing={0.75}>
                  <Typography variant='overline' color='text.secondary'>
                    Última consulta
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {formatDateTime(sentryIncidents.fetchedAt)}
                  </Typography>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          {sentryIncidents.incidents.length === 0 ? (
            <Card variant='outlined'>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>
                  {sentryIncidents.status === 'unconfigured'
                    ? 'Falta token o metadata base de Sentry para leer incidentes desde Ops Health.'
                    : !sentryIncidents.available
                      ? `Sentry no respondió en esta consulta. ${sentryIncidents.error ?? 'El portal sigue operativo y puedes reintentar más tarde.'}`
                      : 'No hay incidentes Sentry abiertos en este momento.'}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' }
              }}
            >
              {sentryIncidents.incidents.map(incident => (
                <Card key={incident.id} variant='outlined'>
                  <CardContent>
                    <Stack spacing={1.25}>
                      <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
                        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                          <Typography variant='h6'>{incident.title}</Typography>
                          <Typography variant='body2' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                            {incident.location}
                          </Typography>
                        </Stack>
                        <Stack direction='row' spacing={1} flexWrap='wrap' justifyContent='flex-end'>
                          <Chip size='small' variant='tonal' color={sentryLevelColor(incident.level)} label={incident.level} />
                          <Chip size='small' variant='outlined' label={incident.environment || 'sin env'} />
                        </Stack>
                      </Stack>
                      <Typography variant='body2' color='text.secondary'>
                        {incident.shortId || 'Sentry'} · {incident.release || 'sin release'} · {incident.count} eventos · {incident.userCount} usuarios
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        First seen: {formatDateTime(incident.firstSeen)} · Last seen: {formatDateTime(incident.lastSeen)}
                      </Typography>
                      {incident.permalink ? (
                        <Button component='a' href={incident.permalink} target='_blank' rel='noreferrer' variant='outlined' size='small'>
                          Abrir issue en Sentry
                        </Button>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Stack>
      </ExecutiveCardShell>

      {/* Señales reactivas + Focos */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.2fr 0.8fr' } }}>
        <ExecutiveCardShell
          title='Señales reactivas recientes'
          subtitle='Qué eventos estuvieron moviendo el runtime y qué aggregates quedaron implicados.'
        >
          <Stack spacing={2}>
            {data.recentEvents.length === 0 ? (
              <Typography variant='body2' color='text.secondary'>
                No hay eventos recientes visibles en el outbox.
              </Typography>
            ) : (
              data.recentEvents.slice(0, 8).map(event => (
                <Card key={`${event.eventType}-${event.aggregateId}-${event.occurredAt}`} variant='outlined'>
                  <CardContent>
                    <Stack spacing={1.25}>
                      <Stack direction='row' justifyContent='space-between' alignItems='center' gap={2}>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                          {event.eventType}
                        </Typography>
                        <Chip size='small' variant='outlined' label={event.status} />
                      </Stack>
                      <Typography variant='body2' color='text.secondary'>
                        {event.aggregateType}:{trimId(event.aggregateId)}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {formatDateTime(event.occurredAt)}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        </ExecutiveCardShell>

        <ExecutiveCardShell
          title='Focos actuales'
          subtitle='Resumen corto para decidir el siguiente salto operativo.'
        >
          <Stack spacing={2.5}>
            <Card variant='outlined'>
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography variant='h6'>Event types observados</Typography>
                  <Stack direction='row' gap={1} flexWrap='wrap'>
                    {uniqueRecentEventTypes.length > 0 ? (
                      uniqueRecentEventTypes.map(eventType => (
                        <Chip key={eventType} size='small' variant='outlined' label={eventType} sx={{ fontFamily: 'monospace' }} />
                      ))
                    ) : (
                      <Typography variant='body2' color='text.secondary'>
                        Sin eventos recientes.
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card variant='outlined'>
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography variant='h6'>Acciones operativas</Typography>
                  <AdminOpsActionButton
                    endpoint='/api/admin/ops/outbox/publish'
                    label='Publicar outbox'
                    helper='Empuja eventos pendientes desde Postgres al consumer de publicación.'
                  />
                  <AdminOpsActionButton
                    endpoint='/api/admin/ops/reactive/run'
                    label='Correr reactive consumer'
                    helper='Procesa eventos publicados y dispara refresh de projections.'
                  />
                  <AdminOpsActionButton
                    endpoint='/api/admin/ops/projections/requeue-failed'
                    label='Reencolar failed projections'
                    helper='Devuelve a pending las proyecciones fallidas para un nuevo intento.'
                  />
                  <AdminOpsActionButton
                    endpoint='/api/admin/ops/email-delivery/retry-failed'
                    label='Retry email delivery'
                    helper='Reintenta deliveries fallidas elegibles usando el payload persistido.'
                  />
                </Stack>
              </CardContent>
            </Card>

            <Button component={Link} href='/admin/email-delivery' variant='outlined'>
              Ir a Delivery governance
            </Button>
          </Stack>
        </ExecutiveCardShell>
      </Box>

      {/* Failed projections + Reactive handlers */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' } }}>
        <ExecutiveCardShell
          title='Failed projections'
          subtitle='Errores visibles en la cola reactiva para orientar replay o debugging.'
        >
          <Stack spacing={2}>
            {data.failedProjections.length === 0 ? (
              <Typography variant='body2' color='text.secondary'>
                No hay proyecciones fallidas visibles en este momento.
              </Typography>
            ) : (
              data.failedProjections.map(item => (
                <Card key={`${item.projectionName}-${item.entityId}-${item.failedAt}`} variant='outlined'>
                  <CardContent>
                    <Stack spacing={1.25}>
                      <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
                        <Stack spacing={0.5}>
                          <Typography variant='h6'>{item.projectionName}</Typography>
                          <Typography variant='body2' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                            {item.entityType}:{trimId(item.entityId)}
                          </Typography>
                        </Stack>
                        <Chip size='small' variant='tonal' color='error' label='failed' />
                      </Stack>
                      <Typography variant='body2' color='error.main'>
                        {item.errorMessage}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {formatDateTime(item.failedAt)}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        </ExecutiveCardShell>

        <ExecutiveCardShell
          title='Reactive handlers'
          subtitle='Ledger de retries y dead-letters para identificar handlers degradados sin abrir SQL.'
        >
          <Stack spacing={2}>
            {data.failedHandlers.length === 0 ? (
              <Typography variant='body2' color='text.secondary'>
                No hay handlers degradados visibles en este momento.
              </Typography>
            ) : (
              data.failedHandlers.map(item => (
                <Card key={`${item.handler}-${item.reactedAt}`} variant='outlined'>
                  <CardContent>
                    <Stack spacing={1.25}>
                      <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
                        <Typography variant='h6'>{item.handler}</Typography>
                        <Chip size='small' variant='tonal' color={item.result === 'dead-letter' ? 'error' : 'warning'} label={item.result} />
                      </Stack>
                      <Typography variant='body2' color='text.secondary'>
                        Retries: {item.retries}
                      </Typography>
                      <Typography variant='body2' color='error.main'>
                        {item.lastError}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {formatDateTime(item.reactedAt)}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        </ExecutiveCardShell>
      </Box>

      {/* TASK-113: Ops Audit Trail */}
      <ExecutiveCardShell
        title='Audit trail operativo'
        subtitle='Historial de acciones y eventos recientes con actor, resultado y siguiente paso recomendado.'
      >
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.4fr 0.6fr' } }}>
          {auditEvents.length > 0 ? (
            <Timeline>
              {auditEvents.map((event, index) => (
                <TimelineItem key={event.id}>
                  <TimelineSeparator>
                    <TimelineDot color={event.color} variant='outlined' />
                    {index < auditEvents.length - 1 ? <TimelineConnector /> : null}
                  </TimelineSeparator>
                  <TimelineContent>
                    <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2} sx={{ mb: 0.5 }}>
                      <Typography variant='body2' sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                        {event.title}
                      </Typography>
                      <Chip size='small' variant='tonal' color={chipColor(event.resultTone)} label={event.result} />
                    </Stack>
                    <Typography variant='body2' color='text.secondary'>
                      {event.detail}
                    </Typography>
                    <Stack direction='row' gap={2} alignItems='center' sx={{ mt: 0.75 }}>
                      <Typography variant='caption' color='text.secondary'>
                        {formatDateTime(event.timestamp)}
                      </Typography>
                      <Chip size='small' variant='outlined' label={event.actorLabel} sx={{ height: 20, fontSize: '0.7rem' }} />
                    </Stack>
                    {event.followUp ? (
                      <Typography variant='caption' color='warning.main' sx={{ mt: 0.5, display: 'block' }}>
                        → {event.followUp}
                      </Typography>
                    ) : null}
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          ) : (
            <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>
              No hay eventos recientes en el bus operativo. El audit trail se poblará con actividad del runtime.
            </Typography>
          )}

          <Stack spacing={2.5}>
            <Card variant='outlined'>
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography variant='h6'>Acciones manuales</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Las acciones ejecutadas desde botones de governance aparecerán aquí cuando exista un ledger de auditoría persistido.
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Hoy el audit trail refleja eventos del bus operativo y handlers degradados del runtime.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card variant='outlined'>
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography variant='h6'>Leyenda</Typography>
                  <Stack spacing={1}>
                    <Stack direction='row' alignItems='center' gap={1}>
                      <TimelineDot color='success' sx={{ m: 0 }} />
                      <Typography variant='caption'>Procesado correctamente</Typography>
                    </Stack>
                    <Stack direction='row' alignItems='center' gap={1}>
                      <TimelineDot color='warning' sx={{ m: 0 }} />
                      <Typography variant='caption'>En retry o pendiente</Typography>
                    </Stack>
                    <Stack direction='row' alignItems='center' gap={1}>
                      <TimelineDot color='error' sx={{ m: 0 }} />
                      <Typography variant='caption'>Fallido o dead-letter</Typography>
                    </Stack>
                    <Stack direction='row' alignItems='center' gap={1}>
                      <TimelineDot color='info' sx={{ m: 0 }} />
                      <Typography variant='caption'>Evento informativo</Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </ExecutiveCardShell>

      {/* Acciones operativas */}
      <ExecutiveCardShell
        title='Acciones operativas'
        subtitle='Runbooks manuales para replay y retry sobre infraestructura ya existente.'
      >
        <AdminOperationalActionsPanel
          title='Ops runbooks'
          subtitle='Estas acciones mutan el runtime operacional. Se exponen con confirmación para mantener el patrón del repo.'
          actions={[
            {
              id: 'replay-reactive',
              label: 'Replay reactive',
              description: 'Ejecuta el consumer reactivo para procesar eventos publicados y refrescar proyecciones.',
              endpoint: '/api/admin/ops/replay-reactive',
              confirmTitle: '¿Reprocesar eventos reactivos?',
              confirmDescription: 'Esto corre el consumer reactivo canónico y puede disparar refreshes downstream.',
              confirmColor: 'warning'
            },
            {
              id: 'retry-email-delivery',
              label: 'Retry failed emails',
              description: 'Procesa manualmente deliveries fallidas elegibles dentro de la ventana activa de retry.',
              endpoint: '/api/admin/ops/email-delivery-retry',
              confirmTitle: '¿Reintentar correos fallidos?',
              confirmDescription: 'Esto usa la capa canónica de email delivery para reprocesar deliveries fallidas elegibles.',
              confirmColor: 'primary'
            }
          ]}
        />
      </ExecutiveCardShell>
    </Stack>
  )
}

export default AdminOpsHealthView
