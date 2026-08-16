export const CANDIDATE_REVIEW_PURPOSES = [
  'screening_review',
  'interview_preparation',
  'evidence_comparison',
  'audit_review'
] as const

export type CandidateReviewPurpose = (typeof CANDIDATE_REVIEW_PURPOSES)[number]
export type CandidateReviewCvStatus = 'pending' | 'ready' | 'unavailable' | 'blocked' | 'stale' | 'ocr_required'

export type CandidateReviewApplicationSummary = {
  applicationId: string
  openingId: string
  openingTitle: string
  stage: string
  appliedAt: string
  candidate: { displayName: string }
  cvStatus: CandidateReviewCvStatus
}

export type CandidateReviewApplicationList = {
  items: CandidateReviewApplicationSummary[]
  nextOffset: number | null
}

export type CandidateReviewPacket = {
  schemaVersion: 'candidate-review-packet.v1'
  application: {
    applicationId: string
    openingId: string
    openingTitle: string
    stage: string
    appliedAt: string
  }
  candidate: { displayName: string }
  portfolioLinks: Array<{ kind: 'portfolio' | 'linkedin'; url: string; trust: 'untrusted_candidate_supplied' }>
  assessments: Array<{
    assessmentId: string
    method: string
    status: string
    submittedAt: string | null
    updatedAt: string
  }>
  cv: {
    status: CandidateReviewCvStatus
    trust: 'untrusted_candidate_supplied'
    contentHash: string | null
    chunkIndex: number | null
    chunkCount: number
    text: string | null
  }
  freshness: {
    sourceUpdatedAt: string
    projectedAt: string | null
    extractionVersion: string | null
    redactionPolicyVersion: string | null
  }
}

export type CandidateReviewAccessAuditInput = {
  outcome: 'allowed' | 'denied'
  routeKind: 'application_list' | 'review_packet'
  reasonCode:
    | 'authorized'
    | 'runtime_capability_denied'
    | 'delegated_scope_denied'
    | 'delegated_context_invalid'
    | 'reader_disabled'
    | 'resource_not_found'
    | 'stale_content'
  purpose: CandidateReviewPurpose | null
  agentHost: string | null
  actorUserId: string
  oauthClientId: string
  oauthAccessTokenId: string | null
  correlationId: string | null
  applicationId?: string | null
  fieldClasses?: string[]
}
