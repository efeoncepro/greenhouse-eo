import 'server-only'

import type { WorkforceActivationMemberSnapshot } from './types'

export type WorkforceExternalIdentityRequirementReason =
  | 'assignable_operational_member'
  | 'not_assignable'
  | 'inactive'
  | 'already_completed'

export interface WorkforceExternalIdentityRequirement {
  readonly sourceSystem: 'notion'
  readonly required: boolean
  readonly reason: WorkforceExternalIdentityRequirementReason
  readonly detail: string
}

export const resolveWorkforceExternalIdentityRequirement = (
  member: Pick<WorkforceActivationMemberSnapshot, 'active' | 'assignable' | 'workforceIntakeStatus'>
): WorkforceExternalIdentityRequirement => {
  if (!member.active) {
    return {
      sourceSystem: 'notion',
      required: false,
      reason: 'inactive',
      detail: 'Member inactivo; no requiere identidad operacional externa para activación.'
    }
  }

  if (member.workforceIntakeStatus === 'completed') {
    return {
      sourceSystem: 'notion',
      required: false,
      reason: 'already_completed',
      detail: 'Ficha ya completada; no bloquea la activación vigente.'
    }
  }

  if (!member.assignable) {
    return {
      sourceSystem: 'notion',
      required: false,
      reason: 'not_assignable',
      detail: 'Member no asignable; no requiere usuario Notion operacional.'
    }
  }

  return {
    sourceSystem: 'notion',
    required: true,
    reason: 'assignable_operational_member',
    detail: 'Member asignable en activación; requiere usuario Notion reconciliado antes de cerrar intake.'
  }
}
