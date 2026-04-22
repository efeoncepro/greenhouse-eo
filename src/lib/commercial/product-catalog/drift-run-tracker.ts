import 'server-only'

import { randomUUID } from 'node:crypto'

import { query } from '@/lib/db'

export type ProductCatalogDriftRunStatus = 'running' | 'succeeded' | 'failed' | 'partial' | 'cancelled'

export interface ProductCatalogDriftRunSummary {
  hubspotItemsRead: number
  greenhouseItemsRead: number
  conflictsDetected: number
  conflictsInserted: number
  conflictsRefreshed: number
  autoHealed: number
  alertsSent: number
  durationMs: number
}

const SOURCE_SYSTEM = 'product_catalog_drift_detect'
const SOURCE_OBJECT_TYPE = 'hubspot_products'

export const generateProductCatalogDriftRunId = () => `product-drift-${randomUUID()}`

export const writeProductCatalogDriftRunStart = async ({
  runId,
  triggeredBy,
  notes
}: {
  runId: string
  triggeredBy: string
  notes?: string | null
}) => {
  await query(
    `INSERT INTO greenhouse_sync.source_sync_runs (
      sync_run_id,
      source_system,
      source_object_type,
      sync_mode,
      status,
      records_read,
      records_written_raw,
      records_projected_postgres,
      triggered_by,
      notes,
      finished_at
    ) VALUES (
      $1,
      $2,
      $3,
      'batch',
      'running',
      0,
      0,
      0,
      $4,
      $5,
      NULL
    )
    ON CONFLICT (sync_run_id) DO NOTHING`,
    [runId, SOURCE_SYSTEM, SOURCE_OBJECT_TYPE, triggeredBy, notes ?? null]
  )
}

export const writeProductCatalogDriftRunComplete = async ({
  runId,
  status,
  summary,
  notes
}: {
  runId: string
  status: Exclude<ProductCatalogDriftRunStatus, 'running'>
  summary: ProductCatalogDriftRunSummary
  notes?: string | null
}) => {
  await query(
    `UPDATE greenhouse_sync.source_sync_runs
        SET status = $2,
            records_read = $3,
            records_written_raw = $4,
            records_projected_postgres = $5,
            notes = $6,
            finished_at = CURRENT_TIMESTAMP
      WHERE sync_run_id = $1`,
    [
      runId,
      status,
      summary.hubspotItemsRead + summary.greenhouseItemsRead,
      summary.conflictsDetected,
      summary.autoHealed,
      notes ??
        `hubspot=${summary.hubspotItemsRead} greenhouse=${summary.greenhouseItemsRead} conflicts=${summary.conflictsDetected} inserted=${summary.conflictsInserted} refreshed=${summary.conflictsRefreshed} autoHealed=${summary.autoHealed} alerts=${summary.alertsSent} durationMs=${summary.durationMs}`
    ]
  )
}

export const writeProductCatalogDriftRunFailure = async ({
  runId,
  error
}: {
  runId: string
  error: unknown
}) => {
  const message = error instanceof Error ? error.message : String(error)

  await query(
    `UPDATE greenhouse_sync.source_sync_runs
        SET status = 'failed',
            notes = $2,
            finished_at = CURRENT_TIMESTAMP
      WHERE sync_run_id = $1`,
    [runId, message.slice(0, 500)]
  )
}
