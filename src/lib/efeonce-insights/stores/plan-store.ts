import 'server-only'

import type { EditorialPlanV1, PlanAuthoringProvenanceV1 } from '../contracts/plan'
import { InsightsNotFoundError, InsightsNotReadyError } from '../errors'
import { hashCanonical } from '../request-hash'
import { type InsightsDbClient, runInsightsQuery, toIso } from './db'
import type { EditorialPlanRecord } from './records'

interface PlanRow extends Record<string, unknown> {
  plan_id: string
  edition_id: string
  organization_id: string
  snapshot_id: string
  retention_class: string
  plan_json: EditorialPlanV1
  plan_hash: string | null
  authoring_mode: EditorialPlanRecord['authoringMode']
  model_id: string | null
  prompt_version: string | null
  model_usage_json: Record<string, unknown>
  frozen_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

const mapPlan = (row: PlanRow): EditorialPlanRecord => ({
  planId: row.plan_id,
  editionId: row.edition_id,
  organizationId: row.organization_id,
  snapshotId: row.snapshot_id,
  retentionClass: row.retention_class,
  plan: row.plan_json,
  planHash: row.plan_hash,
  authoringMode: row.authoring_mode,
  modelId: row.model_id,
  promptVersion: row.prompt_version,
  modelUsage: row.model_usage_json ?? {},
  frozenAt: toIso(row.frozen_at),
  createdAt: toIso(row.created_at) ?? '',
  updatedAt: toIso(row.updated_at) ?? ''
})

/** Crea o reemplaza (si NO está congelado) el plan de una edición sobre su snapshot sellado. */
export const upsertInsightEditorialPlan = async (
  client: InsightsDbClient,
  input: {
    organizationId: string
    editionId: string
    snapshotId: string
    plan: EditorialPlanV1
    provenance: PlanAuthoringProvenanceV1
  }
): Promise<EditorialPlanRecord> => {
  const rows = await runInsightsQuery<PlanRow>(
    client,
    `INSERT INTO greenhouse_insights.insight_editorial_plans
       (edition_id, organization_id, snapshot_id, plan_json, authoring_mode, model_id, prompt_version, model_usage_json)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb)
     ON CONFLICT (edition_id) DO UPDATE SET
       plan_json = EXCLUDED.plan_json,
       authoring_mode = EXCLUDED.authoring_mode,
       model_id = EXCLUDED.model_id,
       prompt_version = EXCLUDED.prompt_version,
       model_usage_json = EXCLUDED.model_usage_json
     WHERE greenhouse_insights.insight_editorial_plans.organization_id = EXCLUDED.organization_id
       AND greenhouse_insights.insight_editorial_plans.snapshot_id = EXCLUDED.snapshot_id
       AND greenhouse_insights.insight_editorial_plans.frozen_at IS NULL
     RETURNING *`,
    [
      input.editionId,
      input.organizationId,
      input.snapshotId,
      JSON.stringify(input.plan),
      input.provenance.mode,
      input.provenance.modelId,
      input.provenance.promptVersion,
      JSON.stringify(input.provenance.usage ?? {})
    ]
  )

  if (!rows[0]) throw new InsightsNotReadyError('El plan ya está congelado o no corresponde a este snapshot/organización')

  return mapPlan(rows[0])
}

export const freezeInsightEditorialPlan = async (
  client: InsightsDbClient,
  input: { organizationId: string; planId: string }
): Promise<EditorialPlanRecord> => {
  const current = await runInsightsQuery<PlanRow>(
    client,
    `SELECT * FROM greenhouse_insights.insight_editorial_plans WHERE organization_id = $1 AND plan_id = $2 FOR UPDATE`,
    [input.organizationId, input.planId]
  )

  if (!current[0]) throw new InsightsNotFoundError('editorial_plan', input.planId)
  if (current[0].frozen_at) return mapPlan(current[0])

  const hash = hashCanonical(current[0].plan_json)

  const rows = await runInsightsQuery<PlanRow>(
    client,
    `UPDATE greenhouse_insights.insight_editorial_plans SET plan_hash = $3, frozen_at = now()
      WHERE organization_id = $1 AND plan_id = $2 RETURNING *`,
    [input.organizationId, input.planId, hash]
  )

  return mapPlan(rows[0]!)
}

export const getInsightEditorialPlanByEdition = async (
  client: InsightsDbClient | undefined,
  organizationId: string,
  editionId: string
): Promise<EditorialPlanRecord | null> => {
  const rows = await runInsightsQuery<PlanRow>(
    client,
    `SELECT * FROM greenhouse_insights.insight_editorial_plans WHERE organization_id = $1 AND edition_id = $2`,
    [organizationId, editionId]
  )

  return rows[0] ? mapPlan(rows[0]) : null
}
