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
import type { IntegrationHealth, IntegrationReadiness, IntegrationType, IntegrationWithHealth } from '@/types/integrations'

type Props = {
  integrations: IntegrationWithHealth[]
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

const AdminIntegrationGovernanceView = ({ integrations }: Props) => {
  const activeCount = integrations.filter(i => i.active).length
  const readyCount = integrations.filter(i => i.readinessStatus === 'ready').length
  const warningCount = integrations.filter(i => i.readinessStatus === 'warning' || i.readinessStatus === 'blocked').length
  const domains = [...new Set(integrations.flatMap(i => i.consumerDomains))]

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
              <Button component={Link} href='/admin/cloud-integrations' variant='contained'>
                Cloud & Integrations
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
          eyebrow='Attention'
          tone={warningCount > 0 ? 'warning' : 'success'}
          title='Requieren atencion'
          value={String(warningCount)}
          detail={warningCount > 0 ? 'Integraciones con readiness degradada.' : 'Todas las integraciones operativas.'}
          icon='tabler-alert-triangle'
        />
        <ExecutiveMiniStatCard
          eyebrow='Coverage'
          tone='info'
          title='Dominios downstream'
          value={String(domains.length)}
          detail={domains.join(', ') || 'Sin dominios registrados.'}
          icon='tabler-topology-ring-3'
        />
      </Box>

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
                    <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
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
        subtitle='Estado operativo derivado de sync runs, freshness y senales de cada integracion. Verde < 6h, amarillo 6-24h, rojo > 24h.'
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
                      <Chip
                        size='small'
                        variant='tonal'
                        color={healthColor[h.health]}
                        label={h.health}
                      />
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
