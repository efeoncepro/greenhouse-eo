import 'server-only'

import { getEffectiveSupervisor } from '@/lib/reporting-hierarchy/readers'

import {
  getApprovalStageDefinition,
  getApprovalWorkflowDefinition,
  getNextApprovalStageCode
} from '@/lib/approval-authority/config'
import type {
  ApprovalAuthorityResolution,
  ApprovalStageCode,
  ApprovalWorkflowDomain
} from '@/lib/approval-authority/types'

const buildFallbackPayload = ({
  workflowDomain,
  stageCode,
  fallbackRoleCodes
}: {
  workflowDomain: ApprovalWorkflowDomain
  stageCode: ApprovalStageCode
  fallbackRoleCodes: string[]
}) => ({
  workflowDomain,
  stageCode,
  resolutionMode: 'domain_fallback',
  fallbackRoleCodes
})

export const resolveApprovalAuthorityForStage = async ({
  workflowDomain,
  subjectMemberId,
  stageCode
}: {
  workflowDomain: ApprovalWorkflowDomain
  subjectMemberId: string
  stageCode: ApprovalStageCode
}): Promise<ApprovalAuthorityResolution> => {
  const stage = getApprovalStageDefinition({ workflowDomain, stageCode })

  if (stage.resolutionStrategy === 'role_fallback') {
    return {
      workflowDomain,
      stageCode,
      authoritySource: 'domain_fallback',
      formalApproverMemberId: null,
      formalApproverName: null,
      effectiveApproverMemberId: null,
      effectiveApproverName: null,
      delegateMemberId: null,
      delegateMemberName: null,
      delegateResponsibilityId: null,
      fallbackRoleCodes: [...stage.fallbackRoleCodes],
      delegated: false,
      snapshotPayload: buildFallbackPayload({
        workflowDomain,
        stageCode,
        fallbackRoleCodes: stage.fallbackRoleCodes
      })
    }
  }

  const effectiveSupervisor = await getEffectiveSupervisor(subjectMemberId)

  if (effectiveSupervisor?.effectiveSupervisorMemberId) {
    return {
      workflowDomain,
      stageCode,
      authoritySource: effectiveSupervisor.delegated ? 'delegation' : 'reporting_hierarchy',
      formalApproverMemberId: effectiveSupervisor.supervisorMemberId,
      formalApproverName: effectiveSupervisor.supervisorName,
      effectiveApproverMemberId: effectiveSupervisor.effectiveSupervisorMemberId,
      effectiveApproverName: effectiveSupervisor.effectiveSupervisorName,
      delegateMemberId: effectiveSupervisor.delegation?.delegateMemberId ?? null,
      delegateMemberName: effectiveSupervisor.delegation?.delegateMemberName ?? null,
      delegateResponsibilityId: effectiveSupervisor.delegation?.responsibilityId ?? null,
      fallbackRoleCodes: [...stage.fallbackRoleCodes],
      delegated: effectiveSupervisor.delegated,
      snapshotPayload: {
        workflowDomain,
        stageCode,
        resolutionMode: effectiveSupervisor.delegated ? 'delegation' : 'reporting_hierarchy',
        supervisorMemberId: effectiveSupervisor.supervisorMemberId,
        effectiveSupervisorMemberId: effectiveSupervisor.effectiveSupervisorMemberId,
        delegation: effectiveSupervisor.delegation
      }
    }
  }

  if (stage.fallbackStageCode) {
    return resolveApprovalAuthorityForStage({
      workflowDomain,
      subjectMemberId,
      stageCode: stage.fallbackStageCode
    })
  }

  return {
    workflowDomain,
    stageCode,
    authoritySource: 'domain_fallback',
    formalApproverMemberId: null,
    formalApproverName: null,
    effectiveApproverMemberId: null,
    effectiveApproverName: null,
    delegateMemberId: null,
    delegateMemberName: null,
    delegateResponsibilityId: null,
    fallbackRoleCodes: [...stage.fallbackRoleCodes],
    delegated: false,
    snapshotPayload: buildFallbackPayload({
      workflowDomain,
      stageCode,
      fallbackRoleCodes: stage.fallbackRoleCodes
    })
  }
}

export const resolveInitialApprovalAuthority = async ({
  workflowDomain,
  subjectMemberId
}: {
  workflowDomain: ApprovalWorkflowDomain
  subjectMemberId: string
}) =>
  resolveApprovalAuthorityForStage({
    workflowDomain,
    subjectMemberId,
    stageCode: getApprovalWorkflowDefinition(workflowDomain).initialStageCode
  })

export const getNextApprovalAuthority = async ({
  workflowDomain,
  subjectMemberId,
  stageCode
}: {
  workflowDomain: ApprovalWorkflowDomain
  subjectMemberId: string
  stageCode: ApprovalStageCode
}) => {
  const nextStageCode = getNextApprovalStageCode({ workflowDomain, stageCode })

  if (!nextStageCode) {
    return null
  }

  return resolveApprovalAuthorityForStage({
    workflowDomain,
    subjectMemberId,
    stageCode: nextStageCode
  })
}
