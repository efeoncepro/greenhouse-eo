import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { CONTRACTOR_EXCLUSION_ENGAGED_STATUSES, type ContractorExclusionEngagedStatus, type ContractorExclusionFacts } from './types'

type ContractorExclusionRow = {
  member_id: string
  engagement_public_id: string | null
  engagement_status: string | null
}

const ENGAGED_STATUS_SET: ReadonlySet<string> = new Set(CONTRACTOR_EXCLUSION_ENGAGED_STATUSES)

const normalizeStatus = (value: string | null): ContractorExclusionEngagedStatus | null =>
  value && ENGAGED_STATUS_SET.has(value) ? (value as ContractorExclusionEngagedStatus) : null

/**
 * Bridge canónico member ↔ engagement: `members.identity_profile_id` ↔
 * `contractor_engagements.profile_id`. Solo trae engagements en estado "engaged"
 * (active/paused/ending). `DISTINCT ON (m.member_id)` con ORDER por prioridad de
 * estado garantiza un verdict por member aunque tenga varios engagements.
 *
 * Bulk-first: O(N) con `WHERE m.member_id = ANY($1)`. Index: members PK +
 * contractor_engagements(profile_id, status).
 */
const FETCH_CONTRACTOR_EXCLUSION_SQL = `
  SELECT DISTINCT ON (m.member_id)
    m.member_id,
    e.public_id AS engagement_public_id,
    e.status AS engagement_status
  FROM greenhouse_core.members AS m
  JOIN greenhouse_hr.contractor_engagements AS e
    ON e.profile_id = m.identity_profile_id
  WHERE m.member_id = ANY($1::text[])
    AND e.status = ANY($2::text[])
  ORDER BY
    m.member_id,
    CASE e.status
      WHEN 'active' THEN 1
      WHEN 'ending' THEN 2
      WHEN 'paused' THEN 3
      ELSE 4
    END,
    e.created_at DESC
`

/**
 * Fetch los facts de exclusión para un batch de members. Devuelve solo los
 * members que TIENEN un engagement "engaged" (los demás simplemente no aparecen
 * en el Map → el caller los trata como no-excluidos).
 */
export const fetchContractorExclusionFactsForMembers = async (
  memberIds: ReadonlyArray<string>
): Promise<Map<string, ContractorExclusionFacts>> => {
  if (memberIds.length === 0) return new Map()

  const rows = await runGreenhousePostgresQuery<ContractorExclusionRow>(FETCH_CONTRACTOR_EXCLUSION_SQL, [
    [...memberIds],
    [...CONTRACTOR_EXCLUSION_ENGAGED_STATUSES]
  ])

  const facts = new Map<string, ContractorExclusionFacts>()

  for (const row of rows) {
    facts.set(row.member_id, {
      memberId: row.member_id,
      engagementPublicId: row.engagement_public_id,
      engagementStatus: normalizeStatus(row.engagement_status)
    })
  }

  return facts
}
