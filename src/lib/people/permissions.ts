import type { PersonAccess, PersonTab } from '@/types/people'

const personTabOrder: PersonTab[] = ['profile', 'activity', 'memberships', 'economy', 'ai-tools']

export const getPersonAccess = (roleCodes: string[]): PersonAccess => {
  const isAdmin = roleCodes.includes('efeonce_admin')
  const isOps = roleCodes.includes('efeonce_operations')
  const isHrPayroll = roleCodes.includes('hr_payroll')
  const isHrManager = roleCodes.includes('hr_manager')
  const isFinance = roleCodes.includes('finance_manager')
  const isPeopleViewer = roleCodes.includes('people_viewer')

  const canViewMemberships = isAdmin || isOps
  const canViewAssignments = isAdmin || isOps || isPeopleViewer
  const canViewActivity = isAdmin || isOps || isPeopleViewer
  const canViewCompensation = isAdmin || isHrPayroll || isHrManager
  const canViewPayroll = isAdmin || isHrPayroll || isHrManager
  const canViewFinance = isAdmin || isOps || isHrPayroll || isFinance
  const canViewHrProfile = isAdmin || isHrPayroll || isHrManager
  const canViewAiTools = isAdmin || isOps
  const canViewIdentityContext = isAdmin || isOps || isHrPayroll
  const canViewAccessContext = isAdmin || isOps

  return {
    canViewMemberships,
    canViewAssignments,
    canViewActivity,
    canViewCompensation,
    canViewPayroll,
    canViewFinance,
    canViewHrProfile,
    canViewAiTools,
    canViewIdentityContext,
    canViewAccessContext,
    visibleTabs: personTabOrder.filter(tab => {
      if (tab === 'profile') return canViewIdentityContext || canViewHrProfile
      if (tab === 'activity') return canViewActivity
      if (tab === 'memberships') return canViewMemberships
      if (tab === 'economy') return canViewCompensation || canViewPayroll || canViewFinance
      if (tab === 'ai-tools') return canViewAiTools

      return false
    })
  }
}
