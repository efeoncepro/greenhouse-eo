import 'server-only'

/**
 * TASK-1888 — acceso a datos de la portada preferida. Escribe sólo `greenhouse_insights.insight_cover_preferences`
 * (una fila por organización; sin fila = `auto`). Última escritura gana, con actor y `updated_at`.
 */

import type { InsightCoverPreference } from '../contracts/cover'
import type { InsightActor } from '../contracts/states'
import { runInsightsQuery, toIso, type InsightsDbClient } from './db'

export interface InsightCoverPreferenceRecord {
  organizationId: string
  coverTheme: InsightCoverPreference
  updatedByActorKind: string
  updatedByUserId: string | null
  updatedAt: string
}

const mapRow = (row: Record<string, unknown>): InsightCoverPreferenceRecord => ({
  organizationId: row.organization_id as string,
  coverTheme: row.cover_theme as InsightCoverPreference,
  updatedByActorKind: row.updated_by_actor_kind as string,
  updatedByUserId: (row.updated_by_user_id as string | null) ?? null,
  updatedAt: toIso(row.updated_at) ?? ''
})

export const getInsightCoverPreferenceRow = async (
  client: InsightsDbClient | undefined,
  organizationId: string,
  options: { forUpdate?: boolean } = {}
): Promise<InsightCoverPreferenceRecord | null> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    client,
    `SELECT organization_id, cover_theme, updated_by_actor_kind, updated_by_user_id, updated_at
       FROM greenhouse_insights.insight_cover_preferences
      WHERE organization_id = $1${options.forUpdate ? '\n      FOR UPDATE' : ''}`,
    [organizationId]
  )

  return rows[0] ? mapRow(rows[0]) : null
}

export const upsertInsightCoverPreference = async (
  client: InsightsDbClient,
  input: { organizationId: string; coverTheme: InsightCoverPreference; actor: InsightActor }
): Promise<InsightCoverPreferenceRecord> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    client,
    `INSERT INTO greenhouse_insights.insight_cover_preferences
       (organization_id, cover_theme, updated_by_actor_kind, updated_by_user_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (organization_id) DO UPDATE SET
       cover_theme = EXCLUDED.cover_theme,
       updated_by_actor_kind = EXCLUDED.updated_by_actor_kind,
       updated_by_user_id = EXCLUDED.updated_by_user_id,
       updated_at = NOW()
     RETURNING organization_id, cover_theme, updated_by_actor_kind, updated_by_user_id, updated_at`,
    [input.organizationId, input.coverTheme, input.actor.kind, input.actor.userId]
  )

  return mapRow(rows[0]!)
}
