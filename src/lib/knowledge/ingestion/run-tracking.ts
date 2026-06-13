import 'server-only'

import { query } from '@/lib/db'

import type { KnowledgeRunKind } from '../types'

/**
 * TASK-1082 — Ingestion sync-run tracking sobre knowledge_publication_runs.
 * begin (status='running') → complete (running → terminal). La tabla permite
 * UPDATE running→terminal y bloquea DELETE (forensic, TASK-1081).
 */

export const beginKnowledgeRun = async (input: {
  sourceId: string | null
  runKind: KnowledgeRunKind
  actor?: string | null
}): Promise<string> => {
  const rows = await query<{ run_id: string; [column: string]: unknown }>(
    `INSERT INTO greenhouse_knowledge.knowledge_publication_runs
       (source_id, run_kind, status, actor, started_at)
     VALUES ($1, $2, 'running', $3, NOW())
     RETURNING run_id`,
    [input.sourceId, input.runKind, input.actor ?? null]
  )

  return rows[0].run_id
}

export const completeKnowledgeRun = async (input: {
  runId: string
  status: 'succeeded' | 'failed' | 'skipped'
  details?: Record<string, unknown>
  errorSummary?: string | null
}): Promise<void> => {
  await query(
    `UPDATE greenhouse_knowledge.knowledge_publication_runs
     SET status = $2, finished_at = NOW(), details_json = $3::jsonb, error_summary = $4
     WHERE run_id = $1`,
    [input.runId, input.status, JSON.stringify(input.details ?? {}), input.errorSummary ?? null]
  )
}
