import 'server-only'

/**
 * TASK-1227 — Growth AI Visibility · Findings + scores store (Slice 4, server-only).
 *
 * Persistencia de derivados en greenhouse_growth. Findings son recomputables →
 * upsert por (run_id, prompt_id, provider, schema_version). Scores versionados →
 * upsert por (run_id, score_version): recomputar el mismo run+versión reemplaza
 * (no duplica el score vigente).
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { type NormalizedFinding } from '../normalization/contracts'
import { type GraderScoreStatus } from './config'
import { type DimensionScore, type PersistedGraderScore } from './engine'

type RawFinding = Record<string, unknown>
type RawScore = Record<string, unknown>

const projectFinding = (row: RawFinding): NormalizedFinding => ({
  findingId: String(row.finding_id),
  runId: String(row.run_id),
  promptId: String(row.prompt_id),
  provider: row.provider as NormalizedFinding['provider'],
  brandMentioned: row.brand_mentioned as NormalizedFinding['brandMentioned'],
  brandRank: row.brand_rank != null ? Number(row.brand_rank) : null,
  competitorsMentioned: (row.competitors_mentioned as string[] | null) ?? [],
  sentimentLabel: row.sentiment_label as NormalizedFinding['sentimentLabel'],
  sentimentScore: row.sentiment_score != null ? Number(row.sentiment_score) : null,
  categoryAssociations: (row.category_associations as string[] | null) ?? [],
  messageDriftClaims: (row.message_drift_claims as string[] | null) ?? [],
  citationDomains: (row.citation_domains as string[] | null) ?? [],
  sourceTypes: (row.source_types as NormalizedFinding['sourceTypes'] | null) ?? [],
  commercialIntentMatch: row.commercial_intent_match as NormalizedFinding['commercialIntentMatch'],
  confidence: Number(row.confidence ?? 0),
  trustSignal: (row.trust_signal as string | null) ?? null,
  schemaVersion: row.schema_version as NormalizedFinding['schemaVersion']
})

const projectScore = (row: RawScore): PersistedGraderScore => ({
  scoreVersion: row.score_version as PersistedGraderScore['scoreVersion'],
  runId: String(row.run_id),
  overallScore: row.overall_score != null ? Number(row.overall_score) : null,
  scoreStatus: row.score_status as GraderScoreStatus,
  autoReleasable: Boolean(row.auto_releasable),
  dimensions: (row.dimensions as DimensionScore[] | null) ?? [],
  confidence: Number(row.confidence ?? 0),
  evidenceCount: Number(row.evidence_count ?? 0),
  coverage: (row.coverage as PersistedGraderScore['coverage'] | null) ?? {
    successfulObservations: 0,
    promptFamilies: 0
  },
  reviewReasons: (row.review_reasons as string[] | null) ?? []
})

/** Upsert idempotente de findings (recomputables) por (run, prompt, provider, schema). */
export const upsertNormalizedFindings = async (findings: NormalizedFinding[]): Promise<number> => {
  for (const f of findings) {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_growth.normalized_findings
         (finding_id, run_id, prompt_id, provider, brand_mentioned, brand_rank,
          competitors_mentioned, sentiment_label, sentiment_score, category_associations,
          message_drift_claims, citation_domains, source_types, commercial_intent_match,
          confidence, trust_signal, schema_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (run_id, prompt_id, provider, schema_version) DO UPDATE SET
         brand_mentioned = EXCLUDED.brand_mentioned,
         brand_rank = EXCLUDED.brand_rank,
         competitors_mentioned = EXCLUDED.competitors_mentioned,
         sentiment_label = EXCLUDED.sentiment_label,
         sentiment_score = EXCLUDED.sentiment_score,
         category_associations = EXCLUDED.category_associations,
         message_drift_claims = EXCLUDED.message_drift_claims,
         citation_domains = EXCLUDED.citation_domains,
         source_types = EXCLUDED.source_types,
         commercial_intent_match = EXCLUDED.commercial_intent_match,
         confidence = EXCLUDED.confidence,
         trust_signal = EXCLUDED.trust_signal,
         updated_at = NOW()`,
      [
        f.findingId,
        f.runId,
        f.promptId,
        f.provider,
        f.brandMentioned,
        f.brandRank,
        f.competitorsMentioned,
        f.sentimentLabel,
        f.sentimentScore,
        f.categoryAssociations,
        f.messageDriftClaims,
        f.citationDomains,
        f.sourceTypes,
        f.commercialIntentMatch,
        f.confidence,
        f.trustSignal,
        f.schemaVersion
      ]
    )
  }

  return findings.length
}

export const getNormalizedFindings = async (runId: string): Promise<NormalizedFinding[]> => {
  const rows = await runGreenhousePostgresQuery<RawFinding>(
    `SELECT * FROM greenhouse_growth.normalized_findings WHERE run_id = $1 ORDER BY created_at ASC`,
    [runId]
  )

  return rows.map(projectFinding)
}

/** Upsert idempotente del score por (run, score_version): recompute reemplaza. */
export const upsertGraderScore = async (score: PersistedGraderScore): Promise<PersistedGraderScore> => {
  const rows = await runGreenhousePostgresQuery<RawScore>(
    `INSERT INTO greenhouse_growth.grader_scores
       (run_id, score_version, overall_score, score_status, auto_releasable,
        dimensions, confidence, evidence_count, coverage, review_reasons)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, $10)
     ON CONFLICT (run_id, score_version) DO UPDATE SET
       overall_score = EXCLUDED.overall_score,
       score_status = EXCLUDED.score_status,
       auto_releasable = EXCLUDED.auto_releasable,
       dimensions = EXCLUDED.dimensions,
       confidence = EXCLUDED.confidence,
       evidence_count = EXCLUDED.evidence_count,
       coverage = EXCLUDED.coverage,
       review_reasons = EXCLUDED.review_reasons,
       updated_at = NOW()
     RETURNING *`,
    [
      score.runId,
      score.scoreVersion,
      score.overallScore,
      score.scoreStatus,
      score.autoReleasable,
      JSON.stringify(score.dimensions),
      score.confidence,
      score.evidenceCount,
      JSON.stringify(score.coverage),
      score.reviewReasons
    ]
  )

  return projectScore(rows[0])
}

export const getGraderScore = async (
  runId: string,
  scoreVersion?: string
): Promise<PersistedGraderScore | null> => {
  const rows = scoreVersion
    ? await runGreenhousePostgresQuery<RawScore>(
        `SELECT * FROM greenhouse_growth.grader_scores WHERE run_id = $1 AND score_version = $2 LIMIT 1`,
        [runId, scoreVersion]
      )
    : await runGreenhousePostgresQuery<RawScore>(
        `SELECT * FROM greenhouse_growth.grader_scores WHERE run_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [runId]
      )

  return rows[0] ? projectScore(rows[0]) : null
}
