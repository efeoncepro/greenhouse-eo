import 'server-only'

// ── Source systems ────────────────────────────────────────────────────

export type SourceSystem = 'notion' | 'hubspot_crm' | 'azure_ad'

export const SOURCE_MEMBER_COLUMN: Record<SourceSystem, string> = {
  notion: 'notion_user_id',
  hubspot_crm: 'hubspot_owner_id',
  azure_ad: 'azure_oid'
}

// ── Discovery ─────────────────────────────────────────────────────────

export interface DiscoveredIdentity {
  sourceSystem: SourceSystem
  sourceObjectType: string
  sourceObjectId: string
  sourceDisplayName: string | null
  sourceEmail: string | null
  discoveredIn: string
  occurrenceCount: number
}

// ── Matching ──────────────────────────────────────────────────────────

export interface MemberCandidate {
  memberId: string
  displayName: string
  email: string | null
  identityProfileId: string | null
  notionUserId: string | null
  notionDisplayName: string | null
  hubspotOwnerId: string | null
  azureOid: string | null
  emailAliases: string[]
}

export interface MatchSignal {
  signal: string
  weight: number
  value: string
}

export interface MatchResult {
  candidateMemberId: string | null
  candidateProfileId: string | null
  candidateDisplayName: string | null
  confidence: number
  signals: MatchSignal[]
}

// ── Proposals ─────────────────────────────────────────────────────────

export type ProposalStatus = 'pending' | 'auto_linked' | 'admin_approved' | 'admin_rejected' | 'dismissed'

export interface ReconciliationProposal {
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
  matchSignals: MatchSignal[]
  status: ProposalStatus
  resolvedBy: string | null
  resolvedAt: string | null
  resolutionNote: string | null
  syncRunId: string | null
  createdAt: string
}

// ── Orchestrator result ───────────────────────────────────────────────

export interface ReconciliationRunResult {
  syncRunId: string
  discoveredCount: number
  alreadyLinkedCount: number
  autoLinkedCount: number
  pendingReviewCount: number
  noMatchCount: number
  errors: string[]
  durationMs: number
}

// ── Thresholds ────────────────────────────────────────────────────────

export const AUTO_LINK_THRESHOLD = 0.85
export const REVIEW_THRESHOLD = 0.40
