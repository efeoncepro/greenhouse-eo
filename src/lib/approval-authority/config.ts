import { ROLE_CODES, type RoleCode } from '@/config/role-codes'

import type { ApprovalStageCode, ApprovalWorkflowDomain } from '@/lib/approval-authority/types'

type ResolutionStrategy = 'effective_supervisor' | 'role_fallback'

export interface ApprovalStageDefinition {
  stageCode: ApprovalStageCode
  label: string
  resolutionStrategy: ResolutionStrategy
  fallbackRoleCodes: RoleCode[]
  fallbackStageCode?: ApprovalStageCode | null
  nextStageCode?: ApprovalStageCode | null

  /**
   * TASK-1020 — política per-stage de delegación de aprobación.
   *
   * Cuando un stage usa `resolutionStrategy: 'effective_supervisor'`, decide si
   * honra una responsabilidad operacional GENÉRICA
   * `operational_responsibilities.responsibility_type='approval_delegate'` como
   * fuente de autoridad efectiva.
   *
   * Default tratado como `false`: el `approval_delegate` genérico NO transfiere
   * autoridad de aprobación (decisión canónica D1/D2 — ver
   * `GREENHOUSE_IDENTITY_ACCESS_V2.md` Delta 2026-06-07). El resolver pasa
   * `delegationPolicy: 'ignore'` a `getEffectiveSupervisor`, dejando
   * `effectiveApproverMemberId === formalApproverMemberId` y
   * `authoritySource='reporting_hierarchy'` (NUNCA `'delegation'`).
   *
   * Solo se setea `true` con decisión documentada explícita por stage. La
   * delegación real de aprobación (cobertura por vacaciones, etc.) renace como
   * contrato domain-scoped separado (ADR follow-up), NO via este flag.
   */
  honorGenericApprovalDelegate?: boolean
}

export interface ApprovalWorkflowDefinition {
  workflowDomain: ApprovalWorkflowDomain
  label: string
  initialStageCode: ApprovalStageCode
  stages: Partial<Record<ApprovalStageCode, ApprovalStageDefinition>>
}

const HR_FALLBACK_ROLE_CODES: RoleCode[] = [
  ROLE_CODES.HR_MANAGER,
  ROLE_CODES.HR_PAYROLL,
  ROLE_CODES.EFEONCE_ADMIN
]

const FINANCE_FALLBACK_ROLE_CODES: RoleCode[] = [
  ROLE_CODES.FINANCE_ADMIN,
  ROLE_CODES.EFEONCE_ADMIN
]

export const APPROVAL_WORKFLOW_DEFINITIONS: Record<ApprovalWorkflowDomain, ApprovalWorkflowDefinition> = {
  leave: {
    workflowDomain: 'leave',
    label: 'Permisos',
    initialStageCode: 'supervisor_review',
    stages: {
      supervisor_review: {
        stageCode: 'supervisor_review',
        label: 'Revisión de supervisor',
        resolutionStrategy: 'effective_supervisor',
        // TASK-1020 D1/D2 — permisos NO honran el approval_delegate genérico.
        honorGenericApprovalDelegate: false,
        fallbackRoleCodes: HR_FALLBACK_ROLE_CODES,
        fallbackStageCode: 'hr_review',
        nextStageCode: 'hr_review'
      },
      hr_review: {
        stageCode: 'hr_review',
        label: 'Revisión HR',
        resolutionStrategy: 'role_fallback',
        fallbackRoleCodes: HR_FALLBACK_ROLE_CODES,
        nextStageCode: null
      }
    }
  },
  expense_report: {
    workflowDomain: 'expense_report',
    label: 'Gastos y reembolsos',
    initialStageCode: 'supervisor_review',
    stages: {
      supervisor_review: {
        stageCode: 'supervisor_review',
        label: 'Revisión de supervisor',
        resolutionStrategy: 'effective_supervisor',
        // TASK-1020 D2 — aprobar reembolsos = autoridad financiera; no honra el
        // approval_delegate genérico (gate de datos limpio: 0 snapshots delegados).
        honorGenericApprovalDelegate: false,
        fallbackRoleCodes: FINANCE_FALLBACK_ROLE_CODES,
        fallbackStageCode: 'finance_review',
        nextStageCode: 'finance_review'
      },
      finance_review: {
        stageCode: 'finance_review',
        label: 'Revisión financiera',
        resolutionStrategy: 'role_fallback',
        fallbackRoleCodes: FINANCE_FALLBACK_ROLE_CODES,
        nextStageCode: null
      }
    }
  },
  onboarding: {
    workflowDomain: 'onboarding',
    label: 'Onboarding',
    initialStageCode: 'hr_review',
    stages: {
      hr_review: {
        stageCode: 'hr_review',
        label: 'Revisión HR',
        resolutionStrategy: 'role_fallback',
        fallbackRoleCodes: HR_FALLBACK_ROLE_CODES,
        nextStageCode: null
      }
    }
  },
  offboarding: {
    workflowDomain: 'offboarding',
    label: 'Offboarding',
    initialStageCode: 'hr_review',
    stages: {
      hr_review: {
        stageCode: 'hr_review',
        label: 'Revisión HR',
        resolutionStrategy: 'role_fallback',
        fallbackRoleCodes: HR_FALLBACK_ROLE_CODES,
        nextStageCode: null
      }
    }
  },
  performance_evaluation: {
    workflowDomain: 'performance_evaluation',
    label: 'Evaluaciones',
    initialStageCode: 'supervisor_review',
    stages: {
      supervisor_review: {
        stageCode: 'supervisor_review',
        label: 'Revisión de supervisor',
        resolutionStrategy: 'effective_supervisor',
        // TASK-1020 D2 — aprobar evaluaciones = autoridad HR; no honra el
        // approval_delegate genérico (gate de datos limpio: 0 snapshots delegados).
        honorGenericApprovalDelegate: false,
        fallbackRoleCodes: HR_FALLBACK_ROLE_CODES,
        fallbackStageCode: 'hr_review',
        nextStageCode: 'hr_review'
      },
      hr_review: {
        stageCode: 'hr_review',
        label: 'Revisión HR',
        resolutionStrategy: 'role_fallback',
        fallbackRoleCodes: HR_FALLBACK_ROLE_CODES,
        nextStageCode: null
      }
    }
  }
}

export const getApprovalWorkflowDefinition = (workflowDomain: ApprovalWorkflowDomain) => {
  const definition = APPROVAL_WORKFLOW_DEFINITIONS[workflowDomain]

  if (!definition) {
    throw new Error(`Unsupported approval workflow domain: ${workflowDomain}`)
  }

  return definition
}

export const getApprovalStageDefinition = ({
  workflowDomain,
  stageCode
}: {
  workflowDomain: ApprovalWorkflowDomain
  stageCode: ApprovalStageCode
}) => {
  const definition = getApprovalWorkflowDefinition(workflowDomain)
  const stage = definition.stages[stageCode]

  if (!stage) {
    throw new Error(`Unsupported approval stage '${stageCode}' for domain '${workflowDomain}'.`)
  }

  return stage
}

export const getNextApprovalStageCode = ({
  workflowDomain,
  stageCode
}: {
  workflowDomain: ApprovalWorkflowDomain
  stageCode: ApprovalStageCode
}) => getApprovalStageDefinition({ workflowDomain, stageCode }).nextStageCode ?? null
