import 'server-only'

import { randomUUID } from 'node:crypto'

import { query } from '@/lib/db'

import { applyIdentityLink, insertProposal, updateProposalStatus } from './apply-link'
import { matchIdentity } from './matching-engine'
import { listNotionWorkspaceUsers, NotionUsersDiscoveryUnavailableError } from './notion-users'
import type { DiscoveredIdentity, MatchSignal, MemberCandidate, ReconciliationProposal } from './types'

interface MemberCandidateRow extends Record<string, unknown> {
  member_id: string
  display_name: string | null
  primary_email: string | null
  identity_profile_id: string | null
  notion_user_id: string | null
  notion_display_name: string | null
  hubspot_owner_id: string | null
  azure_oid: string | null
  email_aliases: string[] | null
}

interface ActiveSourceConflictRow extends Record<string, unknown> {
  profile_id: string
  member_id: string | null
  display_name: string | null
}

export interface ExternalIdentityCandidate {
  readonly sourceSystem: 'notion'
  readonly sourceObjectType: 'user'
  readonly sourceObjectId: string
  readonly sourceDisplayName: string | null
  readonly sourceEmail: string | null
  readonly confidence: number
  readonly signals: readonly MatchSignal[]
  readonly alreadyLinkedToMemberId: string | null
  readonly alreadyLinkedToDisplayName: string | null
  readonly status: 'candidate' | 'conflict'
}

export interface MemberExternalIdentityResolution {
  readonly member: MemberCandidate
  readonly candidates: readonly ExternalIdentityCandidate[]
  readonly unavailable: boolean
  readonly unavailableReason: string | null
}

export type MemberExternalIdentityDecision = 'approve' | 'reject'

const toMemberCandidate = (row: MemberCandidateRow): MemberCandidate => ({
  memberId: row.member_id,
  displayName: row.display_name ?? 'Sin nombre',
  email: row.primary_email,
  identityProfileId: row.identity_profile_id,
  notionUserId: row.notion_user_id,
  notionDisplayName: row.notion_display_name,
  hubspotOwnerId: row.hubspot_owner_id,
  azureOid: row.azure_oid,
  emailAliases: row.email_aliases ?? []
})

export const loadMemberCandidate = async (memberId: string): Promise<MemberCandidate | null> => {
  const rows = await query<MemberCandidateRow>(
    `SELECT
       member_id,
       display_name,
       primary_email,
       identity_profile_id,
       notion_user_id,
       notion_display_name,
       hubspot_owner_id,
       azure_oid,
       COALESCE(email_aliases, ARRAY[]::text[]) AS email_aliases
     FROM greenhouse_core.members
     WHERE member_id = $1
     LIMIT 1`,
    [memberId]
  )

  return rows[0] ? toMemberCandidate(rows[0]) : null
}

const findActiveSourceConflict = async (
  identity: DiscoveredIdentity,
  targetProfileId: string | null
): Promise<ActiveSourceConflictRow | null> => {
  const rows = await query<ActiveSourceConflictRow>(
    `SELECT
       sl.profile_id,
       m.member_id,
       m.display_name
     FROM greenhouse_core.identity_profile_source_links sl
     LEFT JOIN greenhouse_core.members m
       ON m.identity_profile_id = sl.profile_id
     WHERE sl.source_system = $1
       AND sl.source_object_type = $2
       AND sl.source_object_id = $3
       AND sl.active = TRUE
       AND sl.profile_id IS DISTINCT FROM $4
     LIMIT 1`,
    [identity.sourceSystem, identity.sourceObjectType, identity.sourceObjectId, targetProfileId]
  )

  return rows[0] ?? null
}

export const listMemberExternalIdentityCandidates = async (
  memberId: string
): Promise<MemberExternalIdentityResolution> => {
  const member = await loadMemberCandidate(memberId)

  if (!member) {
    throw new Error(`Member ${memberId} not found`)
  }

  let discovered: DiscoveredIdentity[] = []

  try {
    discovered = await listNotionWorkspaceUsers()
  } catch (error) {
    if (error instanceof NotionUsersDiscoveryUnavailableError) {
      return {
        member,
        candidates: [],
        unavailable: true,
        unavailableReason: error.message
      }
    }

    throw error
  }

  const candidates: ExternalIdentityCandidate[] = []

  for (const identity of discovered) {
    const match = matchIdentity(identity, [member])

    if (match.confidence <= 0 && identity.sourceObjectId !== member.notionUserId) continue

    const conflict = await findActiveSourceConflict(identity, member.identityProfileId)

    candidates.push({
      sourceSystem: 'notion',
      sourceObjectType: 'user',
      sourceObjectId: identity.sourceObjectId,
      sourceDisplayName: identity.sourceDisplayName,
      sourceEmail: identity.sourceEmail,
      confidence: identity.sourceObjectId === member.notionUserId ? Math.max(match.confidence, 1) : match.confidence,
      signals: match.signals,
      alreadyLinkedToMemberId: conflict?.member_id ?? null,
      alreadyLinkedToDisplayName: conflict?.display_name ?? null,
      status: conflict ? 'conflict' : 'candidate'
    })
  }

  candidates.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'candidate' ? -1 : 1

    return b.confidence - a.confidence
  })

  return {
    member,
    candidates: candidates.slice(0, 10),
    unavailable: false,
    unavailableReason: null
  }
}

const buildProposal = (
  member: MemberCandidate,
  identity: DiscoveredIdentity,
  status: ReconciliationProposal['status'],
  resolvedBy: string | null,
  note: string | null
): ReconciliationProposal => ({
  proposalId: `recon-${identity.sourceSystem}-${identity.sourceObjectId.slice(0, 8)}-${randomUUID().slice(0, 8)}`,
  sourceSystem: identity.sourceSystem,
  sourceObjectType: identity.sourceObjectType,
  sourceObjectId: identity.sourceObjectId,
  sourceDisplayName: identity.sourceDisplayName,
  sourceEmail: identity.sourceEmail,
  discoveredIn: identity.discoveredIn,
  occurrenceCount: identity.occurrenceCount,
  candidateMemberId: member.memberId,
  candidateProfileId: member.identityProfileId,
  candidateDisplayName: member.displayName,
  matchConfidence: matchIdentity(identity, [member]).confidence,
  matchSignals: matchIdentity(identity, [member]).signals,
  status,
  resolvedBy,
  resolvedAt: status === 'pending' ? null : new Date().toISOString(),
  resolutionNote: note,
  syncRunId: null,
  createdAt: new Date().toISOString()
})

export const resolveMemberExternalIdentity = async ({
  memberId,
  sourceObjectId,
  decision,
  actor,
  note
}: {
  readonly memberId: string
  readonly sourceObjectId: string
  readonly decision: MemberExternalIdentityDecision
  readonly actor: string
  readonly note?: string | null
}): Promise<ReconciliationProposal> => {
  const member = await loadMemberCandidate(memberId)

  if (!member) {
    throw new Error(`Member ${memberId} not found`)
  }

  const identity = (await listNotionWorkspaceUsers()).find(item => item.sourceObjectId === sourceObjectId)

  if (!identity) {
    throw new Error(`Notion user ${sourceObjectId} was not found in workspace users.list`)
  }

  const conflict = await findActiveSourceConflict(identity, member.identityProfileId)

  if (conflict && decision === 'approve') {
    throw new Error(`Notion user ${sourceObjectId} is already linked to ${conflict.member_id ?? conflict.profile_id}`)
  }

  const status = decision === 'approve' ? 'admin_approved' : 'admin_rejected'
  const proposal = buildProposal(member, identity, 'pending', actor, note ?? null)

  await insertProposal({
    ...proposal,
    status: 'pending',
    resolvedBy: null
  })

  if (decision === 'approve') {
    await applyIdentityLink(proposal, { requireCanonicalPostgres: true })
  }

  await updateProposalStatus(proposal.proposalId, status, actor, note ?? undefined)

  return {
    ...proposal,
    status,
    resolvedBy: actor,
    resolvedAt: new Date().toISOString(),
    resolutionNote: note ?? null
  }
}
