import 'server-only'

import type {
  OffboardingNextStep,
  OffboardingNextStepCode,
  OffboardingWorkQueueActionDescriptor,
  OffboardingWorkQueueSeverity
} from './types'

/**
 * TASK-892 Slice 1 — Closure completeness aggregate.
 *
 * Modela el cierre real de un offboarding case como sintesis de 4 capas
 * ortogonales. Cuando emerge drift en cualquier capa, `pendingSteps[]`
 * declara los pasos que faltan en orden canonical (`STEP_PRIORITY`).
 *
 * El `primaryAction` del work-queue item se deriva de `pendingSteps[0]`
 * NO mas hardcoded por lane. Eso evita el bug class observado live
 * 2026-05-15: caso terminal mostrando boton de transition de capa ya
 * cerrada (e.g. Maria executed + boton "Cerrar con proveedor").
 *
 * Spec: docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md
 * Task: docs/tasks/in-progress/TASK-892-offboarding-closure-completeness-aggregate.md
 */

// ─── Step codes canonical ─────────────────────────────────────────────────

/**
 * Codigos canonicos para pendingSteps. Cada uno mapea a una capa especifica:
 *
 * - `case_lifecycle`: Layer 1 — el operador debe transicionar el case (refiere
 *   al `nextStep` del work-queue, e.g. upload_resignation_letter, calculate,
 *   external_provider_close, classify_case).
 * - `reconcile_drift`: Layer 3 — drift Person 360 detectado. Resuelve via
 *   TASK-891 dialog (/admin/identity/drift-reconciliation).
 * - `verify_payroll_exclusion`: Layer 4 — informational. El payroll scope
 *   esta excluyendo al member, pero operador puede querer confirmar (no
 *   actionable, solo hint).
 */
export type OffboardingClosureStepCode =
  | 'case_lifecycle'
  | 'reconcile_drift'
  | 'verify_payroll_exclusion'

/**
 * Orden canonical de prioridad. Si emerge step nuevo, agregarlo aqui con
 * position explicita. El `primaryAction` se deriva del primer step en este
 * orden cuya capa este pending.
 */
export const STEP_PRIORITY: readonly OffboardingClosureStepCode[] = Object.freeze([
  'case_lifecycle',         // 1. case lifecycle pending (most operator-relevant)
  'reconcile_drift',        // 2. Person 360 drift (post-terminal usually)
  'verify_payroll_exclusion'// 3. informational confirmation
] as const)

// ─── State enum canonical ─────────────────────────────────────────────────

/**
 * Closure state canonical (4 valores cerrados):
 *
 * - `pending`: case NO terminal — operador todavia trabaja en el. nextStep
 *   activo. closureCompleteness solo informa, no es bloqueante.
 * - `partial`: case terminal (executed/cancelled) AND pendingSteps.length > 0.
 *   Hay capas post-terminal sin alinear. Este es el bug class Maria.
 * - `complete`: case terminal AND pendingSteps.length === 0. Cierre real.
 * - `blocked`: case.status === 'blocked'. Operador debe resolver blocker
 *   antes de proceder.
 */
export type OffboardingClosureState = 'pending' | 'partial' | 'complete' | 'blocked'

// ─── Layer status enums ───────────────────────────────────────────────────

export type CaseLifecycleStatus = 'pending' | 'in_progress' | 'terminal' | 'blocked'

export type MemberRuntimeAlignment = 'aligned' | 'drift' | 'unknown'

export type PersonRelationshipAlignment = 'aligned' | 'drift' | 'not_applicable' | 'unknown'

export type PayrollScopeAlignment = 'in_scope' | 'excluded' | 'unknown'

// ─── Pending step shape ──────────────────────────────────────────────────

export interface OffboardingPendingStep {
  code: OffboardingClosureStepCode
  label: string
  /**
   * Capability requerida para ejecutar este step. UI esconde steps si la
   * sesion del operador no la tiene. `null` cuando el step es informational
   * (no requiere capability — e.g. `verify_payroll_exclusion`).
   */
  capability: string | null
  /**
   * Si `false`, UI muestra el step como hint informativo (no CTA). Si
   * `true`, UI muestra CTA y el step se considera `primaryAction` candidate.
   */
  actionable: boolean
  severity: OffboardingWorkQueueSeverity
  href: string | null
  /** Hint adicional es-CL para tooltip/aria-describedby. */
  hint: string | null
}

// ─── Completeness aggregate shape ────────────────────────────────────────

export interface OffboardingClosureCompleteness {
  caseLifecycle: CaseLifecycleStatus
  memberRuntime: MemberRuntimeAlignment
  personRelationship: PersonRelationshipAlignment
  payrollScope: PayrollScopeAlignment
  closureState: OffboardingClosureState
  pendingSteps: readonly OffboardingPendingStep[]
}

// ─── Input shape para el pure function ────────────────────────────────────

export interface ClosureCompletenessFacts {
  /** Status del case (Layer 1). */
  caseStatus:
    | 'draft'
    | 'needs_review'
    | 'approved'
    | 'scheduled'
    | 'blocked'
    | 'executed'
    | 'cancelled'

  /**
   * Next step canonical del work-queue (legacy derivation). Si presente y
   * caseStatus es non-terminal, se mapea a un step `case_lifecycle`.
   */
  nextStep: OffboardingNextStep

  /**
   * Layer 3 — drift Person 360 detectado.
   *   - `true`: member runtime declara contractor/Deel/honorarios pero la
   *     relacion legal activa sigue como `employee` (caso Maria).
   *   - `false`: sin drift (relacion alineada o no aplica).
   *   - `null`: no se pudo determinar (member sin identity_profile_id, etc).
   */
  personRelationshipDrift: boolean | null

  /**
   * Layer 2 — member runtime alineado con case lane.
   *   - `true`: member.contract_type matches el case rule_lane esperado.
   *   - `false`: drift entre member runtime y case lane.
   *   - `null`: indeterminado.
   *
   * V1.0 informational solamente (no genera step canonico). Se incluye para
   * futuras versiones que puedan disparar reconciliation member-side.
   */
  memberRuntimeAligned: boolean | null

  /**
   * Layer 4 — payroll scope.
   *   - `true`: member excluido de payroll scope per TASK-890 resolver.
   *   - `false`: member sigue en scope (NOT excluded).
   *   - `null`: indeterminado.
   *
   * V1.0 informational. Genera `verify_payroll_exclusion` step cuando la
   * exclusion no esta confirmada pero el case lifecycle es terminal.
   */
  payrollExcluded: boolean | null

  /** Label es-CL canonical para el case_lifecycle step. Tomado del nextStep. */
  caseLifecycleStepLabel: string

  /** Severity del nextStep, propagado al step `case_lifecycle`. */
  caseLifecycleStepSeverity: OffboardingWorkQueueSeverity

  /** memberId para construir el href del reconcile_drift step. */
  memberId: string | null
}

// ─── Microcopy es-CL (canonical) ──────────────────────────────────────────

const COPY = {
  reconcileDriftLabel: 'Reconciliar relación legal Person 360',
  reconcileDriftHint:
    'El member declara contractor/Deel pero la relación legal activa sigue como "employee". Resuelve via comando auditado.',
  verifyPayrollExclusionLabel: 'Confirmar exclusión de nómina',
  verifyPayrollExclusionHint:
    'Verifica que el colaborador haya sido excluido de la próxima nómina proyectada.'
}

// ─── Capability constants (single source of truth) ────────────────────────

const RECONCILE_DRIFT_CAPABILITY = 'person.legal_entity_relationships.reconcile_drift'

// ─── Step builders ────────────────────────────────────────────────────────

const NON_ACTIONABLE_NEXT_STEPS: ReadonlySet<OffboardingNextStepCode> = new Set([
  'completed',
  'none'
])

const buildCaseLifecycleStep = (facts: ClosureCompletenessFacts): OffboardingPendingStep | null => {
  // Cases en estado terminal no tienen case_lifecycle step (siempre que el
  // nextStep canonical lo refleje con 'completed' o 'none').
  if (NON_ACTIONABLE_NEXT_STEPS.has(facts.nextStep.code)) return null

  return {
    code: 'case_lifecycle',
    label: facts.caseLifecycleStepLabel,
    capability: 'hr.offboarding_case', // gate canonical TASK-867
    actionable: true,
    severity: facts.caseLifecycleStepSeverity,
    href: null,
    hint: null
  }
}

const buildReconcileDriftStep = (facts: ClosureCompletenessFacts): OffboardingPendingStep | null => {
  if (facts.personRelationshipDrift !== true) return null
  if (!facts.memberId) return null

  return {
    code: 'reconcile_drift',
    label: COPY.reconcileDriftLabel,
    capability: RECONCILE_DRIFT_CAPABILITY,
    actionable: true,
    severity: 'warning',
    href: `/admin/identity/drift-reconciliation?memberId=${encodeURIComponent(facts.memberId)}`,
    hint: COPY.reconcileDriftHint
  }
}

const buildVerifyPayrollExclusionStep = (facts: ClosureCompletenessFacts): OffboardingPendingStep | null => {
  // Solo emerge cuando case lifecycle es terminal AND payrollExcluded NO
  // es estrictamente true. Informational only.
  const caseIsTerminal = facts.caseStatus === 'executed' || facts.caseStatus === 'cancelled'

  if (!caseIsTerminal) return null
  if (facts.payrollExcluded === true) return null

  return {
    code: 'verify_payroll_exclusion',
    label: COPY.verifyPayrollExclusionLabel,
    capability: null, // informational, sin capability gate
    actionable: false,
    severity: 'info',
    href: '/hr/payroll/projected',
    hint: COPY.verifyPayrollExclusionHint
  }
}

// ─── Helper builders (per layer) ─────────────────────────────────────────

const deriveCaseLifecycleStatus = (
  caseStatus: ClosureCompletenessFacts['caseStatus']
): CaseLifecycleStatus => {
  if (caseStatus === 'executed' || caseStatus === 'cancelled') return 'terminal'
  if (caseStatus === 'blocked') return 'blocked'
  if (caseStatus === 'draft' || caseStatus === 'needs_review') return 'pending'

  return 'in_progress'
}

const deriveMemberRuntimeAlignment = (
  value: boolean | null
): MemberRuntimeAlignment => {
  if (value === null) return 'unknown'

  return value ? 'aligned' : 'drift'
}

const derivePersonRelationshipAlignment = (
  value: boolean | null
): PersonRelationshipAlignment => {
  if (value === null) return 'unknown'

  return value ? 'drift' : 'aligned'
}

const derivePayrollScopeAlignment = (
  value: boolean | null
): PayrollScopeAlignment => {
  if (value === null) return 'unknown'

  return value ? 'excluded' : 'in_scope'
}

// ─── Closure state derivation ─────────────────────────────────────────────

const deriveClosureState = (
  caseStatus: ClosureCompletenessFacts['caseStatus'],
  pendingStepsCount: number
): OffboardingClosureState => {
  if (caseStatus === 'blocked') return 'blocked'

  const isTerminal = caseStatus === 'executed' || caseStatus === 'cancelled'

  if (!isTerminal) return 'pending'
  if (pendingStepsCount === 0) return 'complete'

  return 'partial'
}

// ─── Pure aggregate function ──────────────────────────────────────────────

/**
 * Computes the closure completeness aggregate from layer facts.
 *
 * Pure function — NO IO, NO DB. 100% testable.
 *
 * Step ordering follows `STEP_PRIORITY` constant. Each builder returns a
 * step or null; nulls are filtered and the remaining steps are kept in
 * canonical priority order.
 */
export const computeClosureCompleteness = (
  facts: ClosureCompletenessFacts
): OffboardingClosureCompleteness => {
  const stepBuilders: Record<OffboardingClosureStepCode, (f: ClosureCompletenessFacts) => OffboardingPendingStep | null> = {
    case_lifecycle: buildCaseLifecycleStep,
    reconcile_drift: buildReconcileDriftStep,
    verify_payroll_exclusion: buildVerifyPayrollExclusionStep
  }

  const pendingSteps = STEP_PRIORITY.map(code => stepBuilders[code](facts)).filter(
    (step): step is OffboardingPendingStep => step !== null
  )

  return {
    caseLifecycle: deriveCaseLifecycleStatus(facts.caseStatus),
    memberRuntime: deriveMemberRuntimeAlignment(facts.memberRuntimeAligned),
    personRelationship: derivePersonRelationshipAlignment(facts.personRelationshipDrift),
    payrollScope: derivePayrollScopeAlignment(facts.payrollExcluded),
    closureState: deriveClosureState(facts.caseStatus, pendingSteps.length),
    pendingSteps
  }
}

// ─── primaryAction derivation ────────────────────────────────────────────

/**
 * Derives the primary action descriptor from the completeness aggregate.
 *
 * Rule: `primaryAction` = first actionable step in `pendingSteps[]`. If
 * no actionable step exists (all informational or list empty), returns
 * `null` (UI shows no CTA).
 *
 * NEVER returns a descriptor that maps to a transition the state machine
 * would reject. The case_lifecycle step is only generated when the nextStep
 * canonical is non-terminal.
 */
export const derivePrimaryActionFromCompleteness = (
  completeness: OffboardingClosureCompleteness,
  legacyAction: OffboardingWorkQueueActionDescriptor | null
): OffboardingWorkQueueActionDescriptor | null => {
  const firstActionable = completeness.pendingSteps.find(step => step.actionable)

  if (!firstActionable) return null

  // case_lifecycle step → use the legacy action descriptor (preserves
  // existing semantic: nextStep code, label, disabled state).
  if (firstActionable.code === 'case_lifecycle') return legacyAction

  // reconcile_drift step → return a new descriptor with href to TASK-891 dialog.
  if (firstActionable.code === 'reconcile_drift') {
    return {
      code: 'reconcile_drift_action',
      label: firstActionable.label,
      disabled: false,
      disabledReason: null,
      severity: firstActionable.severity,
      href: firstActionable.href
    }
  }

  // Should not reach: verify_payroll_exclusion is non-actionable.
  return null
}
