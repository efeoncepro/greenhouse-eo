import 'server-only'

import { randomUUID } from 'node:crypto'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

import type { MemberCandidate, ReconciliationRunResult } from './types'
import { AUTO_LINK_THRESHOLD } from './types'
import { discoverUnlinkedNotionUsers } from './discovery-notion'
import { matchIdentity } from './matching-engine'
import { applyIdentityLink, insertProposal, updateProposalStatus } from './apply-link'

// ── Load member candidates from BigQuery ──────────────────────────────

async function loadMemberCandidates(): Promise<MemberCandidate[]> {
  const bq = getBigQueryClient()
  const projectId = getBigQueryProjectId()

  interface RawMemberRow {
    member_id: string
    display_name: string
    email: string | null
    identity_profile_id: string | null
    notion_user_id: string | null
    notion_display_name: string | null
    hubspot_owner_id: string | null
    azure_oid: string | null
    email_aliases: string | null
  }

  const [rows] = await bq.query({
    query: `
      SELECT
        member_id, display_name, email, identity_profile_id,
        notion_user_id, notion_display_name, hubspot_owner_id, azure_oid,
        TO_JSON_STRING(COALESCE(email_aliases, [])) AS email_aliases
      FROM \`${projectId}.greenhouse.team_members\`
      WHERE active = TRUE
    `
  }) as [RawMemberRow[], unknown]

  return rows.map(r => ({
    memberId: r.member_id,
    displayName: r.display_name,
    email: r.email || null,
    identityProfileId: r.identity_profile_id || null,
    notionUserId: r.notion_user_id || null,
    notionDisplayName: r.notion_display_name || null,
    hubspotOwnerId: r.hubspot_owner_id || null,
    azureOid: r.azure_oid || null,
    emailAliases: r.email_aliases ? JSON.parse(r.email_aliases) : []
  }))
}

// ── Orchestrator ──────────────────────────────────────────────────────

export async function runIdentityReconciliation(opts?: {
  dryRun?: boolean
  syncRunId?: string
}): Promise<ReconciliationRunResult> {
  const startMs = Date.now()
  const syncRunId = opts?.syncRunId || `recon-${randomUUID().slice(0, 8)}`
  const dryRun = opts?.dryRun ?? false

  const result: ReconciliationRunResult = {
    syncRunId,
    discoveredCount: 0,
    alreadyLinkedCount: 0,
    autoLinkedCount: 0,
    pendingReviewCount: 0,
    noMatchCount: 0,
    errors: [],
    durationMs: 0
  }

  try {
    // 1. Load all active members
    const candidates = await loadMemberCandidates()

    // 2. Discover unlinked identities (Notion first; add more discoverers here)
    const discovered = await discoverUnlinkedNotionUsers()

    result.discoveredCount = discovered.length

    if (discovered.length === 0) {
      result.durationMs = Date.now() - startMs

      return result
    }

    // 3. Match + propose/auto-link each
    for (const identity of discovered) {
      try {
        const match = matchIdentity(identity, candidates)

        const proposalId = `recon-${identity.sourceSystem}-${identity.sourceObjectId.slice(0, 8)}-${randomUUID().slice(0, 8)}`

        if (match.confidence >= AUTO_LINK_THRESHOLD && match.candidateMemberId && !dryRun) {
          // Auto-link: insert proposal as auto_linked + apply link
          const proposal = {
            proposalId,
            ...identity,
            candidateMemberId: match.candidateMemberId,
            candidateProfileId: match.candidateProfileId,
            candidateDisplayName: match.candidateDisplayName,
            matchConfidence: match.confidence,
            matchSignals: match.signals,
            status: 'auto_linked' as const,
            resolvedBy: 'system',
            syncRunId
          }

          await insertProposal({ ...proposal, sourceEmail: identity.sourceEmail })
          await applyIdentityLink(
            { ...proposal, resolvedAt: new Date().toISOString(), resolutionNote: null, createdAt: new Date().toISOString() },
            'system'
          )
          result.autoLinkedCount++
        } else if (match.confidence >= AUTO_LINK_THRESHOLD && match.candidateMemberId && dryRun) {
          // Dry run: would auto-link
          console.log(`[recon:dry-run] Would auto-link ${identity.sourceObjectId} → ${match.candidateMemberId} (${match.confidence})`)
          result.autoLinkedCount++
        } else {
          // Pending review or no match
          if (!dryRun) {
            await insertProposal({
              proposalId,
              ...identity,
              sourceEmail: identity.sourceEmail,
              candidateMemberId: match.candidateMemberId,
              candidateProfileId: match.candidateProfileId,
              candidateDisplayName: match.candidateDisplayName,
              matchConfidence: match.confidence,
              matchSignals: match.signals,
              status: 'pending',
              resolvedBy: null,
              syncRunId
            })
          }

          if (match.candidateMemberId) {
            result.pendingReviewCount++
          } else {
            result.noMatchCount++
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)

        result.errors.push(`${identity.sourceObjectId}: ${msg}`)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)

    result.errors.push(`Discovery failed: ${msg}`)
  }

  result.durationMs = Date.now() - startMs

  return result
}
