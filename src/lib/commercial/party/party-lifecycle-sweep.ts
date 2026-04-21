import 'server-only'

import { query } from '@/lib/db'

import { materializePartyLifecycleSnapshot } from './party-lifecycle-snapshot-store'
import { promoteParty } from './commands/promote-party'

interface SweepCandidateRow extends Record<string, unknown> {
  organization_id: string
  commercial_party_id: string
  organization_name: string
  lifecycle_stage_since: string | Date
  last_quote_at: string | Date | null
  last_contract_at: string | Date | null
}

export interface PartyLifecycleSweepCandidate {
  organizationId: string
  commercialPartyId: string
  organizationName: string
  lifecycleStageSince: string
  lastQuoteAt: string | null
  lastContractAt: string | null
}

export interface RunPartyLifecycleSweepOptions {
  dryRun?: boolean
  limit?: number
  inactivityMonths?: number
}

export interface RunPartyLifecycleSweepResult {
  dryRun: boolean
  inactivityMonths: number
  considered: number
  transitioned: number
  candidates: PartyLifecycleSweepCandidate[]
  errors: string[]
}

const ACTIVE_QUOTE_STATUSES = ['issued', 'approved', 'sent'] as const

const toIsoString = (value: string | Date | null | undefined): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

const mapCandidateRow = (row: SweepCandidateRow): PartyLifecycleSweepCandidate => ({
  organizationId: row.organization_id,
  commercialPartyId: row.commercial_party_id,
  organizationName: row.organization_name,
  lifecycleStageSince: toIsoString(row.lifecycle_stage_since) ?? new Date(0).toISOString(),
  lastQuoteAt: toIsoString(row.last_quote_at),
  lastContractAt: toIsoString(row.last_contract_at)
})

export const listPartyLifecycleSweepCandidates = async ({
  limit = 200,
  inactivityMonths = 6
}: {
  limit?: number
  inactivityMonths?: number
} = {}): Promise<PartyLifecycleSweepCandidate[]> => {
  const rows = await query<SweepCandidateRow>(
    `WITH quote_summary AS (
       SELECT
         q.organization_id,
         MAX(COALESCE(q.issued_at, q.quote_date::timestamp, q.created_at)) FILTER (
           WHERE q.status = ANY($1::text[])
         ) AS last_quote_at
       FROM greenhouse_commercial.quotations q
       WHERE q.organization_id IS NOT NULL
       GROUP BY q.organization_id
     ),
     contract_summary AS (
       SELECT
         c.organization_id,
         COUNT(*) FILTER (
           WHERE c.status = 'active'
             AND (c.end_date IS NULL OR c.end_date > CURRENT_DATE)
         )::integer AS active_contracts_count,
         MAX(COALESCE(c.signed_at, c.start_date::timestamp, c.created_at)) AS last_contract_at
       FROM greenhouse_commercial.contracts c
       WHERE c.organization_id IS NOT NULL
       GROUP BY c.organization_id
     )
     SELECT
       o.organization_id,
       o.commercial_party_id::text AS commercial_party_id,
       o.organization_name,
       o.lifecycle_stage_since,
       qs.last_quote_at,
       cs.last_contract_at
     FROM greenhouse_core.organizations o
     LEFT JOIN quote_summary qs
       ON qs.organization_id = o.organization_id
     LEFT JOIN contract_summary cs
       ON cs.organization_id = o.organization_id
     WHERE o.active = TRUE
       AND o.lifecycle_stage = 'active_client'
       AND COALESCE(cs.active_contracts_count, 0) = 0
       AND (
         qs.last_quote_at IS NULL
         OR qs.last_quote_at < NOW() - make_interval(months => $2::integer)
       )
     ORDER BY COALESCE(qs.last_quote_at, cs.last_contract_at, o.lifecycle_stage_since) ASC
     LIMIT $3`,
    [[...ACTIVE_QUOTE_STATUSES], inactivityMonths, limit]
  )

  return rows.map(mapCandidateRow)
}

export const runPartyLifecycleInactivitySweep = async (
  options: RunPartyLifecycleSweepOptions = {}
): Promise<RunPartyLifecycleSweepResult> => {
  const dryRun = options.dryRun !== false
  const inactivityMonths = Math.max(1, options.inactivityMonths ?? 6)

  const candidates = await listPartyLifecycleSweepCandidates({
    limit: Math.max(1, Math.min(options.limit ?? 200, 500)),
    inactivityMonths
  })

  const errors: string[] = []
  let transitioned = 0

  if (!dryRun) {
    for (const candidate of candidates) {
      try {
        await promoteParty({
          organizationId: candidate.organizationId,
          toStage: 'inactive',
          source: 'inactivity_sweep',
          actor: {
            system: true,
            reason: 'party_lifecycle_inactivity_sweep'
          },
          triggerEntity: {
            type: 'manual',
            id: `party-lifecycle-sweep:${candidate.organizationId}:${Date.now()}`
          },
          metadata: {
            inactivityMonths,
            lastQuoteAt: candidate.lastQuoteAt,
            lastContractAt: candidate.lastContractAt
          }
        })

        transitioned += 1
        await materializePartyLifecycleSnapshot(candidate.organizationId)
      } catch (error) {
        errors.push(
          `${candidate.organizationId}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
  }

  return {
    dryRun,
    inactivityMonths,
    considered: candidates.length,
    transitioned,
    candidates,
    errors
  }
}
