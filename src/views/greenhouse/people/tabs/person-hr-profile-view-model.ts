import type { IcoMetricSnapshot } from '@/lib/ico-engine/read-metrics'
import type { PersonHrContext } from '@/lib/person-360/get-person-hr'
import type { HrMemberProfile } from '@/types/hr-core'
import type { PersonOperationalMetrics } from '@/types/people'

export type PersonHrOperationalSource = 'ico' | 'people_operational' | 'none'

type BuildPersonHrProfileViewModelInput = {
  hrContext: PersonHrContext | null
  supplementalProfile: HrMemberProfile | null
  icoSnapshot: IcoMetricSnapshot | null
  fallbackOperationalMetrics: PersonOperationalMetrics | null
}

export type PersonHrProfileViewModel = {
  hasAnyData: boolean
  employment: {
    departmentName: string | null
    supervisorName: string | null
    jobLevel: string | null
    employmentType: string | null
    hireDate: string | null
    contractEndDate: string | null
    dailyRequired: boolean | null
    payRegime: string | null
    payrollVia: string | null
    deelContractId: string | null
    currency: string | null
    baseSalary: number | null
    contractType: string | null
  }
  leave: {
    available: number
    used: number
    reserved: number
    annualAllowance: number
    carriedOver: number
    personalAllowance: number
    personalUsed: number
    pendingRequests: number
    approvedRequestsThisYear: number
    totalApprovedDaysThisYear: number
    hasData: boolean
  }
  operational: {
    source: PersonHrOperationalSource
    sourceLabel: string
    periodLabel: string | null
    volume: number | null
    throughput: number | null
    otdPercent: number | null
    rpa: number | null
  }
  personal: {
    phone: string | null
    documentType: string | null
    documentNumberMasked: string | null
    emergencyContactName: string | null
    emergencyContactPhone: string | null
    healthSystem: string | null
    isapreName: string | null
    bankName: string | null
    bankAccountType: string | null
    bankAccountNumberMasked: string | null
    hasData: boolean
  }
  supplemental: {
    skills: string[]
    tools: string[]
    aiSuites: string[]
    strengths: string[]
    improvementAreas: string[]
    pieceTypes: string[]
    linkedinUrl: string | null
    portfolioUrl: string | null
    cvUrl: string | null
    notes: string | null
    hasSkillsTools: boolean
    hasStrengths: boolean
    hasProductionLinks: boolean
    hasNotes: boolean
  }
}

const getMetricValue = (snapshot: IcoMetricSnapshot, metricId: string): number | null =>
  snapshot.metrics.find(metric => metric.metricId === metricId)?.value ?? null

const formatPeriodLabel = (year: number, month: number) =>
  new Intl.DateTimeFormat('es-CL', {
    month: 'short',
    year: 'numeric'
  }).format(new Date(year, month - 1, 1))

const hasPersonalData = (profile: HrMemberProfile | null) => {
  if (!profile) return false

  return Boolean(
    profile.phone ||
      profile.identityDocumentNumberMasked ||
      profile.emergencyContactName ||
      profile.emergencyContactPhone ||
      profile.healthSystem ||
      profile.isapreName ||
      profile.bankName ||
      profile.bankAccountNumberMasked
  )
}

export const buildPersonHrProfileViewModel = ({
  hrContext,
  supplementalProfile,
  icoSnapshot,
  fallbackOperationalMetrics
}: BuildPersonHrProfileViewModelInput): PersonHrProfileViewModel => {
  const operational = icoSnapshot
    ? {
        source: 'ico' as const,
        sourceLabel: 'Fuente ICO',
        periodLabel: formatPeriodLabel(icoSnapshot.periodYear, icoSnapshot.periodMonth),
        volume: icoSnapshot.context.totalTasks,
        throughput: getMetricValue(icoSnapshot, 'throughput'),
        otdPercent: getMetricValue(icoSnapshot, 'otd_pct'),
        rpa: getMetricValue(icoSnapshot, 'rpa')
      }
    : fallbackOperationalMetrics
      ? {
          source: 'people_operational' as const,
          sourceLabel: 'Fallback 30 días',
          periodLabel: 'Últimos 30 días',
          volume: fallbackOperationalMetrics.tasksCompleted30d,
          throughput: null,
          otdPercent: fallbackOperationalMetrics.otdPercent30d,
          rpa: fallbackOperationalMetrics.rpaAvg30d
        }
      : {
          source: 'none' as const,
          sourceLabel: 'Sin señal operativa',
          periodLabel: null,
          volume: null,
          throughput: null,
          otdPercent: null,
          rpa: null
        }

  const leave = hrContext
    ? {
        available: hrContext.leave.vacationAvailable,
        used: hrContext.leave.vacationUsed,
        reserved: hrContext.leave.vacationReserved,
        annualAllowance: hrContext.leave.vacationAllowance,
        carriedOver: hrContext.leave.vacationCarried,
        personalAllowance: hrContext.leave.personalAllowance,
        personalUsed: hrContext.leave.personalUsed,
        pendingRequests: hrContext.leave.pendingRequests,
        approvedRequestsThisYear: hrContext.leave.approvedRequestsThisYear,
        totalApprovedDaysThisYear: hrContext.leave.totalApprovedDaysThisYear,
        hasData: true
      }
    : {
        available: 0,
        used: 0,
        reserved: 0,
        annualAllowance: 0,
        carriedOver: 0,
        personalAllowance: 0,
        personalUsed: 0,
        pendingRequests: 0,
        approvedRequestsThisYear: 0,
        totalApprovedDaysThisYear: 0,
        hasData: false
      }

  const personal = {
    phone: supplementalProfile?.phone ?? null,
    documentType: supplementalProfile?.identityDocumentType ?? null,
    documentNumberMasked: supplementalProfile?.identityDocumentNumberMasked ?? null,
    emergencyContactName: supplementalProfile?.emergencyContactName ?? null,
    emergencyContactPhone: supplementalProfile?.emergencyContactPhone ?? null,
    healthSystem: supplementalProfile?.healthSystem ?? null,
    isapreName: supplementalProfile?.isapreName ?? null,
    bankName: supplementalProfile?.bankName ?? null,
    bankAccountType: supplementalProfile?.bankAccountType ?? null,
    bankAccountNumberMasked: supplementalProfile?.bankAccountNumberMasked ?? null,
    hasData: hasPersonalData(supplementalProfile)
  }

  const supplemental = {
    skills: supplementalProfile?.skills ?? [],
    tools: supplementalProfile?.tools ?? [],
    aiSuites: supplementalProfile?.aiSuites ?? [],
    strengths: supplementalProfile?.strengths ?? [],
    improvementAreas: supplementalProfile?.improvementAreas ?? [],
    pieceTypes: supplementalProfile?.pieceTypes ?? [],
    linkedinUrl: supplementalProfile?.linkedinUrl ?? null,
    portfolioUrl: supplementalProfile?.portfolioUrl ?? null,
    cvUrl: supplementalProfile?.cvUrl ?? null,
    notes: supplementalProfile?.notes ?? null,
    hasSkillsTools: Boolean(
      (supplementalProfile?.skills?.length ?? 0) > 0 ||
        (supplementalProfile?.tools?.length ?? 0) > 0 ||
        (supplementalProfile?.aiSuites?.length ?? 0) > 0
    ),
    hasStrengths: Boolean(
      (supplementalProfile?.strengths?.length ?? 0) > 0 ||
        (supplementalProfile?.improvementAreas?.length ?? 0) > 0
    ),
    hasProductionLinks: Boolean(
      (supplementalProfile?.pieceTypes?.length ?? 0) > 0 ||
        supplementalProfile?.linkedinUrl ||
        supplementalProfile?.portfolioUrl ||
        supplementalProfile?.cvUrl
    ),
    hasNotes: Boolean(supplementalProfile?.notes)
  }

  const employment = {
    departmentName: hrContext?.departmentName ?? supplementalProfile?.departmentName ?? null,
    supervisorName: hrContext?.supervisorName ?? supplementalProfile?.reportsToName ?? null,
    jobLevel: hrContext?.jobLevel ?? supplementalProfile?.jobLevel ?? null,
    employmentType: hrContext?.employmentType ?? supplementalProfile?.employmentType ?? null,
    hireDate: hrContext?.hireDate ?? supplementalProfile?.hireDate ?? null,
    contractEndDate: hrContext?.contractEndDate ?? supplementalProfile?.contractEndDate ?? null,
    dailyRequired: hrContext ? hrContext.dailyRequired : (supplementalProfile?.dailyRequired ?? null),
    payRegime: hrContext?.payRegime ?? hrContext?.compensation.payRegime ?? null,
    payrollVia: hrContext?.payrollVia ?? null,
    deelContractId: hrContext?.deelContractId ?? null,
    currency: hrContext?.compensation.currency ?? null,
    baseSalary: hrContext?.compensation.baseSalary ?? null,
    contractType: hrContext?.contractType ?? hrContext?.compensation.contractType ?? null
  }

  const hasEmploymentData = Boolean(
    employment.departmentName ||
      employment.supervisorName ||
      employment.jobLevel ||
      employment.employmentType ||
      employment.hireDate ||
      employment.contractEndDate ||
      employment.payRegime ||
      employment.payrollVia ||
      employment.currency ||
      employment.baseSalary !== null ||
      employment.contractType ||
      employment.deelContractId ||
      employment.dailyRequired !== null
  )

  const hasOperationalData = Boolean(
    operational.volume !== null ||
      operational.throughput !== null ||
      operational.otdPercent !== null ||
      operational.rpa !== null
  )

  return {
    hasAnyData: hasEmploymentData || leave.hasData || personal.hasData || hasOperationalData || supplemental.hasSkillsTools || supplemental.hasStrengths || supplemental.hasProductionLinks || supplemental.hasNotes,
    employment,
    leave,
    operational,
    personal,
    supplemental
  }
}
