import type { PersonAccess, PersonTab } from '@/types/people'

const personTabOrder: PersonTab[] = ['assignments', 'activity', 'compensation', 'payroll', 'finance', 'memberships']

export const getPersonAccess = (roleCodes: string[]): PersonAccess => {
  const isAdmin = roleCodes.includes('efeonce_admin')
  const isOps = roleCodes.includes('efeonce_operations')
  const isHrPayroll = roleCodes.includes('hr_payroll')
  const isHrManager = roleCodes.includes('hr_manager')
  const isPeopleViewer = roleCodes.includes('people_viewer')

  const canViewAssignments = isAdmin || isOps || isPeopleViewer
  const canViewActivity = isAdmin || isOps || isPeopleViewer
  const canViewCompensation = isAdmin || isHrPayroll || isHrManager
  const canViewPayroll = isAdmin || isHrPayroll || isHrManager
  const canViewFinance = isAdmin || isOps || isHrPayroll
  const canViewMemberships = isAdmin || isOps

  return {
    canViewAssignments,
    canViewActivity,
    canViewCompensation,
    canViewPayroll,
    canViewFinance,
    visibleTabs: personTabOrder.filter(tab => {
      if (tab === 'assignments') return canViewAssignments
      if (tab === 'activity') return canViewActivity
      if (tab === 'compensation') return canViewCompensation
      if (tab === 'finance') return canViewFinance
      if (tab === 'memberships') return canViewMemberships

      return canViewPayroll
    })
  }
}
