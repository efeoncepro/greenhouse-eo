import 'server-only'

/**
 * TASK-1240 — Growth AI Visibility · Lead store (EPIC-020 B, server-only).
 *
 * Persiste el lead capturado en el intake público. El email crudo vive SOLO aquí
 * (con consent + `consent_at`); NUNCA viaja a providers. El CHECK `consent = TRUE`
 * (migración) garantiza que sólo se persisten leads consentidos.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export interface InsertGraderLeadInput {
  email: string
  consent: boolean
  brandName: string
  websiteUrl: string | null
  market: string
  category: string
  industry: string | null
  persona: string | null
  companySize: string | null
  mainChallenge: string | null
  competitorsDeclared: string[]
  runId: string | null
  profileId: string | null
  ipHash: string | null
}

export const insertGraderLead = async (input: InsertGraderLeadInput): Promise<string> => {
  const rows = await runGreenhousePostgresQuery<{ lead_id: string }>(
    `INSERT INTO greenhouse_growth.grader_leads
       (email, consent, brand_name, website_url, market, category, industry, persona,
        company_size, main_challenge, competitors_declared, run_id, profile_id, ip_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING lead_id`,
    [
      input.email,
      input.consent,
      input.brandName,
      input.websiteUrl,
      input.market,
      input.category,
      input.industry,
      input.persona,
      input.companySize,
      input.mainChallenge,
      input.competitorsDeclared,
      input.runId,
      input.profileId,
      input.ipHash
    ]
  )

  return String(rows[0].lead_id)
}
