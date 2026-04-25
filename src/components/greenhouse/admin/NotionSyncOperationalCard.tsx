'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { ExecutiveCardShell } from '@/components/greenhouse'
import type {
  NotionFlowStatus,
  NotionSyncOperationalOverview
} from '@/lib/integrations/notion-sync-operational-overview'

interface Props {
  overview: NotionSyncOperationalOverview
}

const STATUS_LABEL: Record<NotionFlowStatus, string> = {
  healthy: 'Sano',
  degraded: 'Atención',
  broken: 'Crítico',
  awaiting_data: 'Esperando datos',
  unknown: 'Sin estado'
}

const STATUS_COLOR: Record<NotionFlowStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  healthy: 'success',
  degraded: 'warning',
  broken: 'error',
  awaiting_data: 'info',
  unknown: 'default'
}

const formatHours = (hours: number | null): string => {
  if (hours === null) return 'sin timestamp'
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 24) return `${hours} h`

  const days = Math.round(hours / 24)

  return `${days} día${days === 1 ? '' : 's'}`
}

const Stage = ({
  title,
  state,
  helper
}: {
  title: string
  state: string
  helper: string
}) => (
  <Card variant='outlined' sx={{ flex: 1, minWidth: 200 }}>
    <CardContent sx={{ p: 2.5 }}>
      <Stack spacing={1}>
        <Typography variant='overline' color='text.secondary'>
          {title}
        </Typography>
        <Typography variant='subtitle2'>{state}</Typography>
        <Typography variant='caption' color='text.secondary'>
          {helper}
        </Typography>
      </Stack>
    </CardContent>
  </Card>
)

const NotionSyncOperationalCard = ({ overview }: Props) => {
  const upstreamState = overview.upstream.freshestRawSyncedAt
    ? `Hace ${formatHours(overview.upstream.ageHours)}`
    : 'Sin corridas'

  const upstreamHelper = overview.upstream.isStale
    ? `${overview.upstream.staleSpaceCount}/${overview.upstream.activeSpaceCount} space${overview.upstream.activeSpaceCount === 1 ? '' : 's'} stale`
    : `${overview.upstream.activeSpaceCount} space${overview.upstream.activeSpaceCount === 1 ? '' : 's'} activos`

  const orchestrationState =
    overview.orchestration.failedSpaces > 0
      ? `${overview.orchestration.failedSpaces} en sync_failed`
      : overview.orchestration.pendingSpaces > 0
        ? `${overview.orchestration.pendingSpaces} pendientes`
        : 'Estable'

  const orchestrationHelper = `Total ${overview.orchestration.totals.totalSpaces} · sync_completed ${overview.orchestration.totals.syncCompleted}`

  const dqState =
    overview.dataQuality.totals.brokenSpaces > 0
      ? `${overview.dataQuality.totals.brokenSpaces} rotos`
      : overview.dataQuality.totals.degradedSpaces > 0
        ? `${overview.dataQuality.totals.degradedSpaces} degradados`
        : `${overview.dataQuality.totals.healthySpaces} sanos`

  const dqHelper = overview.dataQuality.latestRunCheckedAt
    ? `Última auditoría: ${overview.dataQuality.latestRunCheckedAt.slice(0, 16).replace('T', ' ')}`
    : 'Sin corridas DQ todavía'

  return (
    <ExecutiveCardShell
      title='Flujo Notion end-to-end'
      subtitle='Síntesis del carril Notion → notion_ops → greenhouse_conformed.'
      action={
        <Chip
          size='small'
          color={STATUS_COLOR[overview.flowStatus]}
          label={STATUS_LABEL[overview.flowStatus]}
        />
      }
    >
      <Stack spacing={3}>
        <Typography variant='body2'>{overview.summary}</Typography>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          divider={
            <Typography variant='h6' color='text.secondary'>
              →
            </Typography>
          }
          alignItems='stretch'
        >
          <Stage
            title='1 · Upstream raw (notion-bq-sync)'
            state={upstreamState}
            helper={upstreamHelper}
          />
          <Stage
            title='2 · Orchestration raw → conformed'
            state={orchestrationState}
            helper={orchestrationHelper}
          />
          <Stage title='3 · Data quality' state={dqState} helper={dqHelper} />
        </Stack>

        {overview.notes.length > 0 && (
          <Stack spacing={0.5}>
            {overview.notes.map(note => (
              <Typography key={note} variant='caption' color='text.secondary'>
                · {note}
              </Typography>
            ))}
          </Stack>
        )}

        <Typography variant='caption' color='text.secondary'>
          Generado: {overview.generatedAt}
        </Typography>
      </Stack>
    </ExecutiveCardShell>
  )
}

export default NotionSyncOperationalCard
