import type { ScopeType } from '@/config/responsibility-codes'

export interface ReportingLineRecord {
  reportingLineId: string
  memberId: string
  memberName: string | null
  memberActive: boolean
  supervisorMemberId: string | null
  supervisorName: string | null
  supervisorActive: boolean | null
  effectiveFrom: string
  effectiveTo: string | null
  sourceSystem: string
  sourceMetadata: Record<string, unknown>
  changeReason: string
  changedByUserId: string | null
}

export interface ReportingSubtreeNode {
  memberId: string
  memberName: string | null
  supervisorMemberId: string | null
  depth: number
}

export interface EffectiveSupervisorRecord {
  memberId: string
  memberName: string | null
  supervisorMemberId: string | null
  supervisorName: string | null
  effectiveSupervisorMemberId: string | null
  effectiveSupervisorName: string | null
  delegated: boolean
  delegation: {
    responsibilityId: string
    delegateMemberId: string
    delegateMemberName: string | null
    scopeType: ScopeType
    scopeId: string
    effectiveFrom: string
    effectiveTo: string | null
  } | null
}

export interface UpsertReportingLineInput {
  memberId: string
  supervisorMemberId: string | null
  actorUserId?: string | null
  reason?: string | null
  sourceSystem?: string | null
  sourceMetadata?: Record<string, unknown> | null
  effectiveFrom?: string | null
}
