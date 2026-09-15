import 'server-only'

import type { EvidenceSnapshotContentV1 } from '../contracts/evidence'
import { InsightsNotFoundError, InsightsNotReadyError } from '../errors'
import { hashCanonical } from '../request-hash'
import { type InsightsDbClient, runInsightsQuery, toIso } from './db'
import type { EvidenceSnapshotRecord } from './records'

interface SnapshotRow extends Record<string, unknown> {
  snapshot_id: string
  edition_id: string
  organization_id: string
  retention_class: string
  facts_json: EvidenceSnapshotRecord['facts']
  sources_json: EvidenceSnapshotRecord['sources']
  rejections_json: EvidenceSnapshotRecord['rejections']
  as_of_min: Date | string | null
  as_of_max: Date | string | null
  snapshot_hash: string | null
  sealed_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

const mapSnapshot = (row: SnapshotRow): EvidenceSnapshotRecord => ({
  snapshotId: row.snapshot_id,
  editionId: row.edition_id,
  organizationId: row.organization_id,
  retentionClass: row.retention_class,
  facts: row.facts_json ?? [],
  sources: row.sources_json ?? [],
  rejections: row.rejections_json ?? [],
  asOfMin: toIso(row.as_of_min),
  asOfMax: toIso(row.as_of_max),
  snapshotHash: row.snapshot_hash,
  sealedAt: toIso(row.sealed_at),
  createdAt: toIso(row.created_at) ?? '',
  updatedAt: toIso(row.updated_at) ?? ''
})

const asOfBounds = (content: EvidenceSnapshotContentV1): { min: string | null; max: string | null } => {
  const dates = [...content.facts.map(fact => fact.freshness.asOf), ...content.sources.map(source => source.asOf)]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map(value => (value.length === 10 ? `${value}T00:00:00.000Z` : value))
    .sort()

  return { min: dates[0] ?? null, max: dates[dates.length - 1] ?? null }
}

/** Crea (o reemplaza, si aún NO está sellado) el contenido del snapshot de una edición. */
export const upsertInsightEvidenceSnapshot = async (
  client: InsightsDbClient,
  input: { organizationId: string; editionId: string; content: EvidenceSnapshotContentV1 }
): Promise<EvidenceSnapshotRecord> => {
  const bounds = asOfBounds(input.content)

  const rows = await runInsightsQuery<SnapshotRow>(
    client,
    `INSERT INTO greenhouse_insights.insight_evidence_snapshots
       (edition_id, organization_id, facts_json, sources_json, rejections_json, as_of_min, as_of_max)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::timestamptz, $7::timestamptz)
     ON CONFLICT (edition_id) DO UPDATE SET
       facts_json = EXCLUDED.facts_json,
       sources_json = EXCLUDED.sources_json,
       rejections_json = EXCLUDED.rejections_json,
       as_of_min = EXCLUDED.as_of_min,
       as_of_max = EXCLUDED.as_of_max
     WHERE greenhouse_insights.insight_evidence_snapshots.organization_id = EXCLUDED.organization_id
       AND greenhouse_insights.insight_evidence_snapshots.sealed_at IS NULL
     RETURNING *`,
    [
      input.editionId,
      input.organizationId,
      JSON.stringify(input.content.facts),
      JSON.stringify(input.content.sources),
      JSON.stringify(input.content.rejections),
      bounds.min,
      bounds.max
    ]
  )

  if (!rows[0]) throw new InsightsNotReadyError('El snapshot ya está sellado o pertenece a otra organización')

  return mapSnapshot(rows[0])
}

/** Sella el snapshot: hash canónico del contenido; desde aquí la DB lo vuelve inmutable. */
export const sealInsightEvidenceSnapshot = async (
  client: InsightsDbClient,
  input: { organizationId: string; snapshotId: string }
): Promise<EvidenceSnapshotRecord> => {
  const current = await runInsightsQuery<SnapshotRow>(
    client,
    `SELECT * FROM greenhouse_insights.insight_evidence_snapshots WHERE organization_id = $1 AND snapshot_id = $2 FOR UPDATE`,
    [input.organizationId, input.snapshotId]
  )

  if (!current[0]) throw new InsightsNotFoundError('evidence_snapshot', input.snapshotId)
  if (current[0].sealed_at) return mapSnapshot(current[0])

  const content: EvidenceSnapshotContentV1 = {
    facts: current[0].facts_json ?? [],
    sources: current[0].sources_json ?? [],
    rejections: current[0].rejections_json ?? []
  }

  const hash = hashCanonical(content)

  const rows = await runInsightsQuery<SnapshotRow>(
    client,
    `UPDATE greenhouse_insights.insight_evidence_snapshots
        SET snapshot_hash = $3, sealed_at = now()
      WHERE organization_id = $1 AND snapshot_id = $2
      RETURNING *`,
    [input.organizationId, input.snapshotId, hash]
  )

  return mapSnapshot(rows[0]!)
}

export const getInsightEvidenceSnapshotByEdition = async (
  client: InsightsDbClient | undefined,
  organizationId: string,
  editionId: string
): Promise<EvidenceSnapshotRecord | null> => {
  const rows = await runInsightsQuery<SnapshotRow>(
    client,
    `SELECT * FROM greenhouse_insights.insight_evidence_snapshots WHERE organization_id = $1 AND edition_id = $2`,
    [organizationId, editionId]
  )

  return rows[0] ? mapSnapshot(rows[0]) : null
}
