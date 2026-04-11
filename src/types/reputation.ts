// ---------------------------------------------------------------------------
// Evidence & Endorsements types — TASK-319
// ---------------------------------------------------------------------------

export const EVIDENCE_TYPES = [
  'project_highlight',
  'work_sample',
  'case_study',
  'publication',
  'award',
  'other'
] as const
export type EvidenceType = (typeof EVIDENCE_TYPES)[number]

export const EVIDENCE_VISIBILITY_VALUES = ['internal', 'client_visible'] as const
export type EvidenceVisibility = (typeof EVIDENCE_VISIBILITY_VALUES)[number]

export const ENDORSEMENT_STATUSES = ['active', 'moderated', 'removed'] as const
export type EndorsementStatus = (typeof ENDORSEMENT_STATUSES)[number]

/* ─── Evidence ─── */

export interface MemberEvidence {
  evidenceId: string
  memberId: string
  title: string
  description: string | null
  evidenceType: EvidenceType
  relatedSkillCode: string | null
  relatedSkillName: string | null
  relatedToolCode: string | null
  relatedToolName: string | null
  assetId: string | null
  assetDownloadUrl: string | null
  externalUrl: string | null
  visibility: EvidenceVisibility
  createdAt: string | null
  updatedAt: string | null
}

export interface CreateEvidenceInput {
  title: string
  description?: string | null
  evidenceType?: EvidenceType
  relatedSkillCode?: string | null
  relatedToolCode?: string | null
  assetId?: string | null
  externalUrl?: string | null
  visibility?: EvidenceVisibility
}

export interface UpdateEvidenceInput {
  title?: string
  description?: string | null
  evidenceType?: EvidenceType
  relatedSkillCode?: string | null
  relatedToolCode?: string | null
  assetId?: string | null
  externalUrl?: string | null
  visibility?: EvidenceVisibility
}

/* ─── Endorsements ─── */

export interface MemberEndorsement {
  endorsementId: string
  memberId: string
  endorsedByMemberId: string
  endorsedByDisplayName: string
  endorsedByAvatarUrl: string | null
  skillCode: string | null
  skillName: string | null
  toolCode: string | null
  toolName: string | null
  comment: string | null
  visibility: EvidenceVisibility
  status: EndorsementStatus
  createdAt: string | null
}

export interface CreateEndorsementInput {
  skillCode?: string | null
  toolCode?: string | null
  comment?: string | null
  visibility?: EvidenceVisibility
}
