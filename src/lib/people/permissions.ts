import type { PersonAccess, PersonTab } from '@/types/people'

const personTabOrder: PersonTab[] = ['assignments', 'activity', 'compensation', 'payroll']

export const getPersonAccess = (roleCodes: string[]): PersonAccess => {
  const canViewAssignments = roleCodes.includes('efeonce_admin') || roleCodes.includes('efeonce_operations')
  const canViewActivity = canViewAssignments
  const canViewCompensation = roleCodes.includes('efeonce_admin') || roleCodes.includes('hr_payroll')
  const canViewPayroll = canViewCompensation

  return {
    canViewAssignments,
    canViewActivity,
    canViewCompensation,
    canViewPayroll,
    visibleTabs: personTabOrder.filter(tab => {
      if (tab === 'assignments') return canViewAssignments
      if (tab === 'activity') return canViewActivity
      if (tab === 'compensation') return canViewCompensation

      return canViewPayroll
    })
  }
}

