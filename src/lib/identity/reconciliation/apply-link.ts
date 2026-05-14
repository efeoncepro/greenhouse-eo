import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { isGreenhousePostgresConfigured, runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { buildIdentitySourceLinkId } from '@/lib/ids/greenhouse-ids'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { SourceSystem, ReconciliationProposal, ProposalStatus } from './types'
import { SOURCE_MEMBER_COLUMN } from './types'

export interface ApplyIdentityLinkOptions {
  readonly requireCanonicalPostgres?: boolean
}

const assertNoActiveSourceConflict = async (proposal: ReconciliationProposal): Promise<void> => {
  if (!proposal.candidateProfileId) return

  const conflicts = await runGreenhousePostgresQuery<{ profile_id: string; source_display_name: string | null }>(
    `SELECT profile_id, source_display_name
     FROM greenhouse_core.identity_profile_source_links
     WHERE source_system = $1
       AND source_object_type = $2
       AND source_object_id = $3
       AND active = TRUE
       AND profile_id IS DISTINCT FROM $4
     LIMIT 1`,
    [
      proposal.sourceSystem,
      proposal.sourceObjectType,
      proposal.sourceObjectId,
      proposal.candidateProfileId
    ]
  )

  if (conflicts.length > 0) {
    throw new Error(
      `Cannot apply link: ${proposal.sourceSystem}:${proposal.sourceObjectId} is already active for profile ${conflicts[0].profile_id}`
    )
  }
}

const upsertCanonicalPostgresIdentityLink = async (
  proposal: ReconciliationProposal,
  memberColumn: string
): Promise<void> => {
  if (proposal.candidateProfileId) {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_core.identity_profile_source_links (
         link_id, profile_id, source_system, source_object_type, source_object_id,
         source_user_id, source_email, source_display_name, is_primary,
         is_login_identity, active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, FALSE, TRUE)
       ON CONFLICT (profile_id, source_system, source_object_type, source_object_id)
       DO UPDATE SET
         source_user_id = EXCLUDED.source_user_id,
         source_email = EXCLUDED.source_email,
         source_display_name = EXCLUDED.source_display_name,
         is_primary = COALESCE(greenhouse_core.identity_profile_source_links.is_primary, EXCLUDED.is_primary),
         is_login_identity = COALESCE(greenhouse_core.identity_profile_source_links.is_login_identity, EXCLUDED.is_login_identity),
         active = TRUE,
         updated_at = NOW()`,
      [
        buildIdentitySourceLinkId({
          profileId: proposal.candidateProfileId,
          sourceSystem: proposal.sourceSystem,
          sourceObjectType: proposal.sourceObjectType,
          sourceObjectId: proposal.sourceObjectId
        }),
        proposal.candidateProfileId,
        proposal.sourceSystem,
        proposal.sourceObjectType,
        proposal.sourceObjectId,
        proposal.sourceObjectId,
        proposal.sourceEmail,
        proposal.sourceDisplayName
      ]
    )

    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_core.client_users
       SET member_id = $1, updated_at = NOW()
       WHERE identity_profile_id = $2
         AND (member_id IS NULL OR TRIM(member_id) = '')`,
      [proposal.candidateMemberId, proposal.candidateProfileId]
    )
  }

  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_core.members
     SET ${memberColumn} = $1,
         notion_display_name = CASE
           WHEN $4 = 'notion' THEN COALESCE(notion_display_name, $2)
           ELSE notion_display_name
         END,
         updated_at = NOW()
     WHERE member_id = $3
       AND (${memberColumn} IS NULL OR TRIM(${memberColumn}) = '')`,
    [proposal.sourceObjectId, proposal.sourceDisplayName, proposal.candidateMemberId, proposal.sourceSystem]
  )
}

// ── Apply a confirmed identity link ───────────────────────────────────

/**
 * Persist an identity link for a reconciliation proposal:
 *   1. Update team_members.<source_column> in BigQuery
 *   2. MERGE identity_profile_source_links in BigQuery
 *   3. Upsert greenhouse_core.identity_profile_source_links in Postgres (if available)
 *   4. Update greenhouse_core.members.<source_column> in Postgres (if available)
 *   5. Backfill greenhouse_core.client_users.member_id from the same identity profile (if available)
 *   6. Update proposal status in Postgres
 */
export async function applyIdentityLink(
  proposal: ReconciliationProposal,
  options: ApplyIdentityLinkOptions = {}
): Promise<void> {
  if (!proposal.candidateMemberId) {
    throw new Error(`Cannot apply link: proposal ${proposal.proposalId} has no candidate member`)
  }

  if (options.requireCanonicalPostgres && !isGreenhousePostgresConfigured()) {
    throw new Error(`Cannot apply link: canonical Postgres is required for proposal ${proposal.proposalId}`)
  }

  if (isGreenhousePostgresConfigured()) {
    await assertNoActiveSourceConflict(proposal)
  }

  const bq = getBigQueryClient()
  const projectId = getBigQueryProjectId()
  const memberColumn = SOURCE_MEMBER_COLUMN[proposal.sourceSystem]

  if (options.requireCanonicalPostgres) {
    await upsertCanonicalPostgresIdentityLink(proposal, memberColumn)
  }

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
            @sourceUserId AS source_user_id,
            @sourceEmail AS source_email,
            @sourceDisplayName AS source_display_name,
            @isPrimary AS is_primary,
            @isLoginIdentity AS is_login_identity
        ) AS source
        ON target.profile_id = source.profile_id
           AND target.source_system = source.source_system
           AND target.source_object_type = source.source_object_type
           AND COALESCE(target.source_object_id, '') = COALESCE(source.source_object_id, '')
        WHEN MATCHED THEN
          UPDATE SET
            source_user_id = source.source_user_id,
            source_email = source.source_email,
            source_display_name = source.source_display_name,
            is_primary = COALESCE(target.is_primary, source.is_primary),
            is_login_identity = COALESCE(target.is_login_identity, source.is_login_identity),
            active = TRUE
        WHEN NOT MATCHED THEN
          INSERT (
            link_id, profile_id, source_system, source_object_type, source_object_id,
            source_user_id, source_email, source_display_name, is_primary,
            is_login_identity, active
          )
          VALUES (
            source.link_id, source.profile_id, source.source_system, source.source_object_type, source.source_object_id,
            source.source_user_id, source.source_email, source.source_display_name, source.is_primary,
            source.is_login_identity, TRUE
          )
      `,
      params: {
        linkId,
        profileId: proposal.candidateProfileId,
        sourceSystem: proposal.sourceSystem,
        sourceObjectType: proposal.sourceObjectType,
        sourceObjectId: proposal.sourceObjectId,
        sourceUserId: proposal.sourceObjectId,
        sourceEmail: proposal.sourceEmail,
        sourceDisplayName: proposal.sourceDisplayName,
        isPrimary: false,
        isLoginIdentity: false
      },
      types: {
        linkId: 'STRING',
        profileId: 'STRING',
        sourceSystem: 'STRING',
        sourceObjectType: 'STRING',
        sourceObjectId: 'STRING',
        sourceUserId: 'STRING',
        sourceEmail: 'STRING',
        sourceDisplayName: 'STRING',
        isPrimary: 'BOOL',
        isLoginIdentity: 'BOOL'
      }
    })
  }

  // 3. Publish outbox event
  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.identityProfile,
    aggregateId: proposal.candidateProfileId || proposal.candidateMemberId!,
    eventType: EVENT_TYPES.profileLinked,
    payload: {
      proposalId: proposal.proposalId,
      profileId: proposal.candidateProfileId,
      memberId: proposal.candidateMemberId,
      sourceSystem: proposal.sourceSystem,
      sourceObjectId: proposal.sourceObjectId
    }
  })

  // 4-5. Update canonical Postgres identity state (if available)
  if (isGreenhousePostgresConfigured() && !options.requireCanonicalPostgres) {
    try {
      await upsertCanonicalPostgresIdentityLink(proposal, memberColumn)
    } catch {
      // Postgres may not have this member yet — non-critical for legacy batch jobs.
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

  const eventType = status === 'admin_approved' || status === 'auto_linked'
    ? EVENT_TYPES.reconciliationApproved
    : status === 'admin_rejected' || status === 'dismissed'
      ? EVENT_TYPES.reconciliationRejected
      : EVENT_TYPES.reconciliationProposed

  await publishOutboxEvent({
    aggregateType: AGGREGATE_TYPES.identityReconciliation,
    aggregateId: proposalId,
    eventType,
    payload: { proposalId, status, resolvedBy }
  })
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
