import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { isGreenhousePostgresConfigured, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { buildIdentitySourceLinkId } from '@/lib/ids/greenhouse-ids'

import type { SourceSystem, ReconciliationProposal, ProposalStatus } from './types'
import { SOURCE_MEMBER_COLUMN } from './types'

// ── Apply a confirmed identity link ───────────────────────────────────

/**
 * Persist an identity link for a reconciliation proposal:
 *   1. Update team_members.<source_column> in BigQuery
 *   2. MERGE identity_profile_source_links in BigQuery
 *   3. Update greenhouse_core.members.<source_column> in Postgres (if available)
 *   4. Update proposal status in Postgres
 */
export async function applyIdentityLink(proposal: ReconciliationProposal, resolvedBy: string): Promise<void> {
  if (!proposal.candidateMemberId) {
    throw new Error(`Cannot apply link: proposal ${proposal.proposalId} has no candidate member`)
  }

  const bq = getBigQueryClient()
  const projectId = getBigQueryProjectId()
  const memberColumn = SOURCE_MEMBER_COLUMN[proposal.sourceSystem]

  // 1. Update team_members source column
  await bq.query({
    query: `
      UPDATE \`${projectId}.greenhouse.team_members\`
      SET ${memberColumn} = @sourceObjectId
      WHERE member_id = @memberId
        AND (${memberColumn} IS NULL OR TRIM(${memberColumn}) = '')
    `,
    params: {
      sourceObjectId: proposal.sourceObjectId,
      memberId: proposal.candidateMemberId
    },
    types: { sourceObjectId: 'STRING', memberId: 'STRING' }
  })

  // 2. MERGE identity_profile_source_links (only if candidate has an identity_profile)
  if (proposal.candidateProfileId) {
    const linkId = buildIdentitySourceLinkId({
      profileId: proposal.candidateProfileId,
      sourceSystem: proposal.sourceSystem,
      sourceObjectType: proposal.sourceObjectType,
      sourceObjectId: proposal.sourceObjectId
    })

    await bq.query({
      query: `
        MERGE \`${projectId}.greenhouse.identity_profile_source_links\` AS target
        USING (
          SELECT
            @linkId AS link_id,
            @profileId AS profile_id,
            @sourceSystem AS source_system,
            @sourceObjectType AS source_object_type,
            @sourceObjectId AS source_object_id,
            @sourceDisplayName AS source_display_name
        ) AS source
        ON target.profile_id = source.profile_id
           AND target.source_system = source.source_system
           AND target.source_object_type = source.source_object_type
           AND COALESCE(target.source_object_id, '') = COALESCE(source.source_object_id, '')
        WHEN MATCHED THEN
          UPDATE SET
            source_display_name = source.source_display_name,
            active = TRUE
        WHEN NOT MATCHED THEN
          INSERT (link_id, profile_id, source_system, source_object_type, source_object_id, source_display_name, active)
          VALUES (source.link_id, source.profile_id, source.source_system, source.source_object_type, source.source_object_id, source.source_display_name, TRUE)
      `,
      params: {
        linkId,
        profileId: proposal.candidateProfileId,
        sourceSystem: proposal.sourceSystem,
        sourceObjectType: proposal.sourceObjectType,
        sourceObjectId: proposal.sourceObjectId,
        sourceDisplayName: proposal.sourceDisplayName
      },
      types: {
        linkId: 'STRING',
        profileId: 'STRING',
        sourceSystem: 'STRING',
        sourceObjectType: 'STRING',
        sourceObjectId: 'STRING',
        sourceDisplayName: 'STRING'
      }
    })
  }

  // 3. Update Postgres members table (if available)
  if (isGreenhousePostgresConfigured()) {
    try {
      await runGreenhousePostgresQuery(
        `UPDATE greenhouse_core.members SET ${memberColumn} = $1, updated_at = NOW() WHERE member_id = $2 AND (${memberColumn} IS NULL OR TRIM(${memberColumn}) = '')`,
        [proposal.sourceObjectId, proposal.candidateMemberId]
      )
    } catch {
      // Postgres may not have this member yet — non-critical
    }
  }
}

// ── Update proposal status ────────────────────────────────────────────

export async function updateProposalStatus(
  proposalId: string,
  status: ProposalStatus,
  resolvedBy: string,
  note?: string
): Promise<void> {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.identity_reconciliation_proposals
     SET status = $1, resolved_by = $2, resolved_at = NOW(), resolution_note = $3, updated_at = NOW()
     WHERE proposal_id = $4`,
    [status, resolvedBy, note || null, proposalId]
  )
}

// ── Insert proposal ───────────────────────────────────────────────────

export async function insertProposal(proposal: {
  proposalId: string
  sourceSystem: SourceSystem
  sourceObjectType: string
  sourceObjectId: string
  sourceDisplayName: string | null
  sourceEmail: string | null
  discoveredIn: string
  occurrenceCount: number
  candidateMemberId: string | null
  candidateProfileId: string | null
  candidateDisplayName: string | null
  matchConfidence: number
  matchSignals: unknown[]
  status: ProposalStatus
  resolvedBy: string | null
  syncRunId: string | null
}): Promise<void> {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.identity_reconciliation_proposals (
       proposal_id, source_system, source_object_type, source_object_id,
       source_display_name, source_email, discovered_in, occurrence_count,
       candidate_member_id, candidate_profile_id, candidate_display_name,
       match_confidence, match_signals, status, resolved_by, resolved_at, sync_run_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT DO NOTHING`,
    [
      proposal.proposalId,
      proposal.sourceSystem,
      proposal.sourceObjectType,
      proposal.sourceObjectId,
      proposal.sourceDisplayName,
      proposal.sourceEmail,
      proposal.discoveredIn,
      proposal.occurrenceCount,
      proposal.candidateMemberId,
      proposal.candidateProfileId,
      proposal.candidateDisplayName,
      proposal.matchConfidence,
      JSON.stringify(proposal.matchSignals),
      proposal.status,
      proposal.resolvedBy,
      proposal.status === 'auto_linked' ? new Date().toISOString() : null,
      proposal.syncRunId
    ]
  )
}
