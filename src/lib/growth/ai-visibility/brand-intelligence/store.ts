import 'server-only'

/**
 * TASK-1288 Slice 4 — Growth AI Visibility · Brand Intelligence · store.
 *
 * Persist + read the versioned grounded snapshot. A new read supersedes the prior active
 * one in a single transaction (provenance preserved; one 'active' per profile enforced by
 * the partial unique index). Reads via `runGreenhousePostgresQuery` (canonical helper).
 */

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import {
  type BrandBusinessModel,
  type BrandIntelligenceFields,
  type BrandIntelligenceMetadata
} from './contracts'

export interface BrandIntelligenceSnapshot {
  brandIntelligenceId: string
  profileId: string
  version: number
  whatTheBrandDoes: string | null
  candidateCategoryNode: string | null
  fineCategory: string | null
  candidateBusinessModel: BrandBusinessModel | null
  signalsUsed: string[]
  confidence: number | null
  model: string | null
  provider: string | null
  status: 'active' | 'superseded'
  createdAt: string
}

type RawSnapshot = Record<string, unknown>

const projectSnapshot = (row: RawSnapshot): BrandIntelligenceSnapshot => ({
  brandIntelligenceId: String(row.brand_intelligence_id),
  profileId: String(row.profile_id),
  version: Number(row.version),
  whatTheBrandDoes: (row.what_the_brand_does as string | null) ?? null,
  candidateCategoryNode: (row.candidate_category_node as string | null) ?? null,
  fineCategory: (row.fine_category as string | null) ?? null,
  candidateBusinessModel: (row.candidate_business_model as BrandBusinessModel | null) ?? null,
  signalsUsed: Array.isArray(row.signals_used) ? (row.signals_used as string[]) : [],
  confidence: row.confidence != null ? Number(row.confidence) : null,
  model: (row.model as string | null) ?? null,
  provider: (row.provider as string | null) ?? null,
  status: row.status === 'superseded' ? 'superseded' : 'active',
  createdAt: String(row.created_at)
})

/** Current grounded snapshot for a profile (or null). */
export const getActiveBrandIntelligence = async (
  profileId: string
): Promise<BrandIntelligenceSnapshot | null> => {
  const rows = await runGreenhousePostgresQuery<RawSnapshot>(
    `SELECT * FROM greenhouse_growth.grader_brand_intelligence
      WHERE profile_id = $1 AND status = 'active'
      LIMIT 1`,
    [profileId]
  )

  return rows[0] ? projectSnapshot(rows[0]) : null
}

/**
 * Persist a new grounded snapshot version (supersedes the prior active one atomically).
 * Returns the new active snapshot.
 */
export const persistBrandIntelligence = async (
  profileId: string,
  fields: BrandIntelligenceFields,
  metadata: Pick<BrandIntelligenceMetadata, 'providerId' | 'model'>
): Promise<BrandIntelligenceSnapshot> =>
  withGreenhousePostgresTransaction(async client => {
    await client.query(
      `UPDATE greenhouse_growth.grader_brand_intelligence
          SET status = 'superseded'
        WHERE profile_id = $1 AND status = 'active'`,
      [profileId]
    )

    const nextVersionResult = await client.query<{ next_version: number }>(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next_version
         FROM greenhouse_growth.grader_brand_intelligence
        WHERE profile_id = $1`,
      [profileId]
    )

    const nextVersion = nextVersionResult.rows[0]?.next_version ?? 1

    const inserted = await client.query<RawSnapshot>(
      `INSERT INTO greenhouse_growth.grader_brand_intelligence
         (profile_id, version, what_the_brand_does, candidate_category_node, fine_category,
          candidate_business_model, signals_used, confidence, model, provider, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
       RETURNING *`,
      [
        profileId,
        nextVersion,
        fields.whatTheBrandDoes,
        fields.candidateCategoryNode,
        fields.fineCategory,
        fields.candidateBusinessModel,
        JSON.stringify(fields.signalsUsed),
        fields.confidence,
        metadata.model,
        metadata.providerId
      ]
    )

    return projectSnapshot(inserted.rows[0])
  })
