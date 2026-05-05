import 'server-only'

import { query, withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { writeRoleTitleAuditEntry } from './audit'
import { RoleTitleError } from './errors'

/**
 * TASK-785 — HR drift review queue helpers.
 *
 * - listPendingRoleTitleDriftProposals(): retorna drift proposals pendientes
 *   con metadata del member para que HR pueda revisar.
 * - resolveRoleTitleDriftProposal({ proposalId, decision, ... }): cierra
 *   una propuesta. Si decision='accept_entra', aplica el valor de Entra
 *   al member.role_title (con source='entra'). Si 'keep_hr', mantiene el
 *   valor HR actual (solo dismiss). Si 'dismissed', sin cambio + nota.
 */

interface DriftProposalRow {
  proposal_id: string
  member_id: string
  source_system: string
  drift_kind: string
  current_role_title: string | null
  current_source: string | null
  proposed_role_title: string | null
  status: string
  policy_action: string
  first_detected_at: Date
  last_detected_at: Date
  occurrence_count: number
  evidence_json: unknown
  created_at: Date
  // member metadata
  display_name: string | null
  primary_email: string | null
  [key: string]: unknown
}

export interface DriftProposalDto {
  proposalId: string
  memberId: string
  memberDisplayName: string | null
  memberPrimaryEmail: string | null
  driftKind: string
  currentRoleTitle: string | null
  currentSource: string | null
  proposedRoleTitle: string | null
  occurrenceCount: number
  firstDetectedAt: string
  lastDetectedAt: string
}

export const listPendingRoleTitleDriftProposals = async (): Promise<DriftProposalDto[]> => {
  const rows = await query<DriftProposalRow>(
    `SELECT
       p.proposal_id,
       p.member_id,
       p.source_system,
       p.drift_kind,
       p.current_role_title,
       p.current_source,
       p.proposed_role_title,
       p.status,
       p.policy_action,
       p.first_detected_at,
       p.last_detected_at,
       p.occurrence_count,
       p.evidence_json,
       p.created_at,
       m.display_name,
       m.primary_email
     FROM greenhouse_sync.member_role_title_drift_proposals p
     LEFT JOIN greenhouse_core.members m ON m.member_id = p.member_id
     WHERE p.status = 'pending'
     ORDER BY p.last_detected_at DESC
     LIMIT 200`
  )

  return rows.map(r => ({
    proposalId: r.proposal_id,
    memberId: r.member_id,
    memberDisplayName: r.display_name,
    memberPrimaryEmail: r.primary_email,
    driftKind: r.drift_kind,
    currentRoleTitle: r.current_role_title,
    currentSource: r.current_source,
    proposedRoleTitle: r.proposed_role_title,
    occurrenceCount: r.occurrence_count,
    firstDetectedAt: r.first_detected_at.toISOString(),
    lastDetectedAt: r.last_detected_at.toISOString()
  }))
}

export type DriftDecision = 'accept_entra' | 'keep_hr' | 'dismissed'

interface ResolveDriftInput {
  proposalId: string
  decision: DriftDecision
  resolutionNote: string
  actorUserId: string
  actorEmail?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

export const resolveRoleTitleDriftProposal = async (
  input: ResolveDriftInput
): Promise<{ proposalId: string; auditId: string | null; eventId: string }> => {
  if (!input.resolutionNote || input.resolutionNote.trim().length < 10) {
    throw new RoleTitleError(
      'Nota de resolucion requerida (minimo 10 caracteres)',
      'reason_required',
      400
    )
  }

  return withTransaction(async client => {
    const lookup = await client.query<DriftProposalRow>(
      `SELECT *
         FROM greenhouse_sync.member_role_title_drift_proposals
        WHERE proposal_id = $1
        FOR UPDATE`,
      [input.proposalId]
    )

    const proposal = lookup.rows[0]

    if (!proposal) {
      throw new RoleTitleError('Drift proposal no existe', 'invalid_input', 404)
    }

    if (proposal.status !== 'pending') {
      throw new RoleTitleError(
        `Drift proposal ya fue resuelta (status=${proposal.status})`,
        'no_change',
        409
      )
    }

    const newStatus =
      input.decision === 'accept_entra'
        ? 'approved'
        : input.decision === 'keep_hr'
          ? 'rejected'
          : 'dismissed'

    let auditId: string | null = null

    if (input.decision === 'accept_entra' && proposal.proposed_role_title !== null) {
      // Apply Entra value to member.role_title (overwriting HR override).
      await client.query(
        `UPDATE greenhouse_core.members
            SET role_title = $1,
                role_title_source = 'entra',
                role_title_updated_by_user_id = $2,
                role_title_updated_at = NOW(),
                last_human_update_at = NULL,
                updated_at = NOW()
          WHERE member_id = $3`,
        [proposal.proposed_role_title, input.actorUserId, proposal.member_id]
      )

      auditId = await writeRoleTitleAuditEntry(client, {
        memberId: proposal.member_id,
        action: 'drift_accepted_entra',
        source: 'entra',
        oldRoleTitle: proposal.current_role_title,
        newRoleTitle: proposal.proposed_role_title,
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail ?? null,
        reason: input.resolutionNote.trim(),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        diff: { proposalId: input.proposalId, decision: 'accept_entra' }
      })
    } else if (input.decision === 'keep_hr') {
      auditId = await writeRoleTitleAuditEntry(client, {
        memberId: proposal.member_id,
        action: 'drift_kept_hr',
        source: 'hr_manual',
        oldRoleTitle: proposal.current_role_title,
        newRoleTitle: proposal.current_role_title,
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail ?? null,
        reason: input.resolutionNote.trim(),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        diff: { proposalId: input.proposalId, decision: 'keep_hr' }
      })
    } else {
      auditId = await writeRoleTitleAuditEntry(client, {
        memberId: proposal.member_id,
        action: 'drift_dismissed',
        source: 'system',
        oldRoleTitle: proposal.current_role_title,
        newRoleTitle: proposal.current_role_title,
        actorUserId: input.actorUserId,
        actorEmail: input.actorEmail ?? null,
        reason: input.resolutionNote.trim(),
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        diff: { proposalId: input.proposalId, decision: 'dismissed' }
      })
    }

    await client.query(
      `UPDATE greenhouse_sync.member_role_title_drift_proposals
          SET status = $1,
              resolved_at = NOW(),
              resolved_by_user_id = $2,
              resolution_note = $3
        WHERE proposal_id = $4`,
      [newStatus, input.actorUserId, input.resolutionNote.trim(), input.proposalId]
    )

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'member',
        aggregateId: proposal.member_id,
        eventType: 'member.role_title.drift_resolved',
        payload: {
          proposalId: input.proposalId,
          memberId: proposal.member_id,
          decision: input.decision,
          actorUserId: input.actorUserId,
          resolutionNote: input.resolutionNote.trim()
        }
      },
      client
    )

    return { proposalId: input.proposalId, auditId, eventId }
  })
}
