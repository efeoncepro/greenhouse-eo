import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { TeamsChannelRecord, TeamsSendOptions } from './types'

export const writeTeamsSendRunStart = async ({
  runId,
  channel,
  syncMode,
  triggeredBy,
  correlationId,
  sourceObjectId
}: {
  runId: string
  channel: TeamsChannelRecord
  syncMode: TeamsSendOptions['syncMode']
  triggeredBy: string
  correlationId?: string
  sourceObjectId?: string
}) => {
  const baseNote = `channel=${channel.channel_code}; kind=${channel.channel_kind}`
  const correlationNote = correlationId ? `correlation=${correlationId}; ` : ''
  const sourceNote = sourceObjectId ? `source_object_id=${sourceObjectId}; ` : ''

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.source_sync_runs (
      sync_run_id, source_system, source_object_type, sync_mode,
      status, records_read, records_written_raw, triggered_by, notes, started_at
    )
    VALUES ($1, 'teams_notification', 'teams_channel', $2, 'running', 0, 0, $3, $4, CURRENT_TIMESTAMP)
    ON CONFLICT (sync_run_id) DO NOTHING`,
    [
      runId,
      syncMode || 'reactive',
      triggeredBy,
      `${correlationNote}${sourceNote}${baseNote}`.slice(0, 2000)
    ]
  )
}

export const writeTeamsSendRunOutcome = async ({
  runId,
  status,
  notes,
  recordsWritten
}: {
  runId: string
  status: 'succeeded' | 'failed'
  notes: string
  recordsWritten: number
}) => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.source_sync_runs
     SET status = $2,
         records_written_raw = $3,
         notes = $4,
         finished_at = CURRENT_TIMESTAMP
     WHERE sync_run_id = $1`,
    [runId, status, recordsWritten, notes.slice(0, 2000)]
  )
}
