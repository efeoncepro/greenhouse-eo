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

export interface SupervisorScopeRecord {
  memberId: string | null
  directReportCount: number
  delegatedSupervisorIds: string[]
  visibleMemberIds: string[]
  hasDirectReports: boolean
  hasDelegatedAuthority: boolean
  canAccessSupervisorPeople: boolean
  canAccessSupervisorLeave: boolean
}

/**
 * JWT-safe summary of supervisor authority. Subset de SupervisorScopeRecord pensado para
 * viajar en cookies/JWT sin inflar tamaño: NO incluye visibleMemberIds ni delegatedSupervisorIds
 * (arrays variables que se resuelven on-demand server-side via getSupervisorScopeForTenant).
 *
 * El menú lateral y cualquier surface "para supervisores" consume estos flags.
 */
export interface SupervisorAccessSummary {
  memberId: string | null
  directReportCount: number
  delegatedSupervisorCount: number
  hasDirectReports: boolean
  hasDelegatedAuthority: boolean
  canAccessSupervisorPeople: boolean
  canAccessSupervisorLeave: boolean
}

export const toSupervisorAccessSummary = (
  scope: SupervisorScopeRecord
): SupervisorAccessSummary => ({
  memberId: scope.memberId,
  directReportCount: scope.directReportCount,
  delegatedSupervisorCount: scope.delegatedSupervisorIds.length,
  hasDirectReports: scope.hasDirectReports,
  hasDelegatedAuthority: scope.hasDelegatedAuthority,
  canAccessSupervisorPeople: scope.canAccessSupervisorPeople,
  canAccessSupervisorLeave: scope.canAccessSupervisorLeave
})

export interface UpsertReportingLineInput {
  memberId: string
  supervisorMemberId: string | null
  actorUserId?: string | null
  reason?: string | null
  sourceSystem?: string | null
  sourceMetadata?: Record<string, unknown> | null
  effectiveFrom?: string | null
}
