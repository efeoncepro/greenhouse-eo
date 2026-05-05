import 'server-only'

import { query } from '@/lib/db'

import type { RoleTitleSource } from './types'

/**
 * TASK-785 — Reader para surfaces HR que muestran el contrato de governance
 * de role_title (cargo) sobre un miembro.
 *
 * Devuelve en una sola lectura: cargo actual + source + identity_profiles
 * (Entra) + drift status + pending proposal id (si existe). Ese shape es
 * lo que consumen tanto la UI individual de un miembro como la global queue.
 */

interface RoleTitleGovernanceRow {
  member_id: string
  role_title: string | null
  role_title_source: string
  role_title_updated_at: Date | null
  role_title_updated_by_user_id: string | null
  last_human_update_at: Date | null
  identity_job_title: string | null
  pending_proposal_id: string | null
  pending_proposal_proposed_role_title: string | null
  pending_proposal_first_detected_at: Date | null
  pending_proposal_last_detected_at: Date | null
  pending_proposal_occurrence_count: number | null
  [key: string]: unknown
}

export interface RoleTitleGovernanceDto {
  memberId: string
  current: {
    roleTitle: string | null
    source: RoleTitleSource
    updatedAt: string | null
    updatedByUserId: string | null
    lastHumanUpdateAt: string | null
  }
  entra: {
    jobTitle: string | null
  }
  drift: {
    hasDriftWithEntra: boolean
    pendingProposalId: string | null
    pendingProposalProposedRoleTitle: string | null
    pendingProposalFirstDetectedAt: string | null
    pendingProposalLastDetectedAt: string | null
    pendingProposalOccurrenceCount: number | null
  }
}

const isAssignedSource = (s: string): s is RoleTitleSource =>
  s === 'unset' ||
  s === 'entra' ||
  s === 'hr_manual' ||
  s === 'migration' ||
  s === 'self_declared_pending'

export const getRoleTitleGovernanceForMember = async (
  memberId: string
): Promise<RoleTitleGovernanceDto | null> => {
  const rows = await query<RoleTitleGovernanceRow>(
    `SELECT
       m.member_id,
       m.role_title,
       m.role_title_source,
       m.role_title_updated_at,
       m.role_title_updated_by_user_id,
       m.last_human_update_at,
       ip.job_title AS identity_job_title,
       p.proposal_id AS pending_proposal_id,
       p.proposed_role_title AS pending_proposal_proposed_role_title,
       p.first_detected_at AS pending_proposal_first_detected_at,
       p.last_detected_at AS pending_proposal_last_detected_at,
       p.occurrence_count AS pending_proposal_occurrence_count
     FROM greenhouse_core.members m
     LEFT JOIN greenhouse_core.identity_profiles ip
       ON ip.profile_id = m.identity_profile_id
     LEFT JOIN LATERAL (
       SELECT proposal_id, proposed_role_title, first_detected_at, last_detected_at, occurrence_count
         FROM greenhouse_sync.member_role_title_drift_proposals
        WHERE member_id = m.member_id AND status = 'pending'
        ORDER BY last_detected_at DESC
        LIMIT 1
     ) p ON TRUE
     WHERE m.member_id = $1
     LIMIT 1`,
    [memberId]
  )

  const row = rows[0]

  if (!row) return null

  const source = isAssignedSource(row.role_title_source) ? row.role_title_source : 'unset'

  const hasDriftWithEntra =
    row.role_title !== null &&
    row.identity_job_title !== null &&
    row.role_title !== row.identity_job_title &&
    source === 'hr_manual'

  return {
    memberId: row.member_id,
    current: {
      roleTitle: row.role_title,
      source,
      updatedAt: row.role_title_updated_at?.toISOString() ?? null,
      updatedByUserId: row.role_title_updated_by_user_id,
      lastHumanUpdateAt: row.last_human_update_at?.toISOString() ?? null
    },
    entra: {
      jobTitle: row.identity_job_title
    },
    drift: {
      hasDriftWithEntra,
      pendingProposalId: row.pending_proposal_id,
      pendingProposalProposedRoleTitle: row.pending_proposal_proposed_role_title,
      pendingProposalFirstDetectedAt: row.pending_proposal_first_detected_at?.toISOString() ?? null,
      pendingProposalLastDetectedAt: row.pending_proposal_last_detected_at?.toISOString() ?? null,
      pendingProposalOccurrenceCount: row.pending_proposal_occurrence_count
    }
  }
}
