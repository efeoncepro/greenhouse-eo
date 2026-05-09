import 'server-only'

import { query } from '@/lib/db'

import type { SampleSprintRuntimeTeamMember } from './runtime-projection-types'
import type { SampleSprintTeamMemberInput } from './store'

/**
 * TASK-835 — Team enrichment para Sample Sprints.
 *
 * Enriquece `commitment_terms_json.proposedTeam` con `display_name` y
 * `role_title` desde `greenhouse_core.members`. Members archivados o IDs
 * stale quedan con `unresolved=true` y la projection emite degraded warning
 * `team_enrichment_failed`.
 *
 * Pattern: server-only helper canónico — la projection NO hace JOIN inline,
 * delega aquí. Si emerge segundo consumer con misma necesidad (e.g. payroll
 * staffing report), el helper queda listo para reuso.
 */

interface MemberRow extends Record<string, unknown> {
  member_id: string
  display_name: string | null
  role_title: string | null
}

export interface EnrichTeamResult {
  team: SampleSprintRuntimeTeamMember[]
  /** True cuando ≥1 member quedó unresolved. La projection lo eleva a degraded. */
  hasUnresolvedMembers: boolean
}

export const enrichProposedTeam = async (
  proposedTeam: readonly SampleSprintTeamMemberInput[]
): Promise<EnrichTeamResult> => {
  if (!Array.isArray(proposedTeam) || proposedTeam.length === 0) {
    return { team: [], hasUnresolvedMembers: false }
  }

  const memberIds = Array.from(new Set(
    proposedTeam
      .map(member => member.memberId)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
  ))

  if (memberIds.length === 0) {
    return { team: [], hasUnresolvedMembers: false }
  }

  const rows = await query<MemberRow>(
    `SELECT member_id, display_name, role_title
     FROM greenhouse_core.members
     WHERE member_id = ANY($1::text[])
       AND active = TRUE`,
    [memberIds]
  )

  const byMemberId = new Map<string, MemberRow>()

  for (const row of rows) byMemberId.set(row.member_id, row)

  let hasUnresolvedMembers = false

  const team: SampleSprintRuntimeTeamMember[] = proposedTeam.map(member => {
    const enriched = byMemberId.get(member.memberId)

    if (!enriched) {
      hasUnresolvedMembers = true

      return {
        memberId: member.memberId,
        displayName: null,
        roleTitle: null,
        proposedFte: member.proposedFte,
        commitmentRole: member.role ?? null,
        unresolved: true
      }
    }

    return {
      memberId: member.memberId,
      displayName: enriched.display_name ?? null,
      roleTitle: enriched.role_title ?? null,
      proposedFte: member.proposedFte,
      commitmentRole: member.role ?? null,
      unresolved: false
    }
  })

  return { team, hasUnresolvedMembers }
}
