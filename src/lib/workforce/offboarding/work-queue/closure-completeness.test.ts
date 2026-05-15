import { describe, expect, it } from 'vitest'

import {
  computeClosureCompleteness,
  derivePrimaryActionFromCompleteness,
  STEP_PRIORITY,
  type ClosureCompletenessFacts
} from './closure-completeness'
import type { OffboardingNextStep, OffboardingWorkQueueActionDescriptor } from './types'

/**
 * TASK-892 Slice 1.2 — Anti-regresion suite para `computeClosureCompleteness`.
 *
 * Cubre la matriz canonical:
 *
 *   1. Case `draft` + lane external_provider              → pending + case_lifecycle step (Maria pre-cierre)
 *   2. Case `executed` + drift Person 360                 → partial + reconcile_drift step (Maria post-cierre, bug class observado)
 *   3. Case `executed` + no drift + payroll excluido      → complete + zero pending steps
 *   4. Case `executed` + no drift + payroll NO confirmado → partial + verify_payroll_exclusion (informational)
 *   5. Case `blocked`                                     → blocked + zero actionable steps
 *   6. Case `executed` + drift + payroll en scope         → partial + 2 steps (drift first, verify second)
 *   7. Case `needs_review` (non-terminal, in_progress)    → pending + case_lifecycle step
 *   8. Case `cancelled` + no drift                        → complete
 *   9. Case `executed` + drift pero memberId NULL         → partial NO drift step (no se puede construir href)
 *  10. STEP_PRIORITY orden                                → case_lifecycle > reconcile_drift > verify_payroll_exclusion
 */

const makeNextStep = (
  code: OffboardingNextStep['code'],
  label: string,
  severity: OffboardingNextStep['severity'] = 'info'
): OffboardingNextStep => ({ code, label, severity })

const facts = (overrides: Partial<ClosureCompletenessFacts> = {}): ClosureCompletenessFacts => ({
  caseStatus: 'draft',
  nextStep: makeNextStep('upload_resignation_letter', 'Subir carta de renuncia'),
  personRelationshipDrift: null,
  memberRuntimeAligned: null,
  payrollExcluded: null,
  caseLifecycleStepLabel: 'Subir carta de renuncia',
  caseLifecycleStepSeverity: 'warning',
  memberId: 'member_abc',
  ...overrides
})

describe('STEP_PRIORITY constant', () => {
  it('preserva el orden canonical case_lifecycle > reconcile_drift > verify_payroll_exclusion', () => {
    expect(STEP_PRIORITY).toEqual(['case_lifecycle', 'reconcile_drift', 'verify_payroll_exclusion'])
  })

  it('es readonly — no permite mutation accidental', () => {
    expect(Object.isFrozen(STEP_PRIORITY)).toBe(true)
  })
})

describe('computeClosureCompleteness — case draft (non-terminal)', () => {
  it('caso 1: external_provider lane en draft → pending + case_lifecycle step (Maria pre-cierre)', () => {
    const result = computeClosureCompleteness(
      facts({
        caseStatus: 'draft',
        nextStep: makeNextStep('external_provider_close', 'Cerrar con proveedor', 'warning'),
        caseLifecycleStepLabel: 'Cerrar con proveedor',
        caseLifecycleStepSeverity: 'warning',
        personRelationshipDrift: false, // pre-cierre todavia sin drift detectado
        payrollExcluded: null
      })
    )

    expect(result.closureState).toBe('pending')
    expect(result.caseLifecycle).toBe('pending')
    expect(result.pendingSteps).toHaveLength(1)
    expect(result.pendingSteps[0]?.code).toBe('case_lifecycle')
    expect(result.pendingSteps[0]?.actionable).toBe(true)
    expect(result.pendingSteps[0]?.label).toBe('Cerrar con proveedor')
  })

  it('caso 7: needs_review (in_progress) → pending + case_lifecycle step', () => {
    const result = computeClosureCompleteness(
      facts({
        caseStatus: 'needs_review',
        nextStep: makeNextStep('classify_case', 'Clasificar caso')
      })
    )

    expect(result.closureState).toBe('pending')
    expect(result.caseLifecycle).toBe('pending')
    expect(result.pendingSteps.map(s => s.code)).toEqual(['case_lifecycle'])
  })
})

describe('computeClosureCompleteness — case executed (terminal, BUG CLASS MARIA)', () => {
  it('caso 2: executed + drift Person 360 → partial + reconcile_drift step', () => {
    const result = computeClosureCompleteness(
      facts({
        caseStatus: 'executed',
        nextStep: makeNextStep('completed', 'Completado'),
        personRelationshipDrift: true,
        payrollExcluded: true, // ya excluida — verify step no emerge
        memberId: 'maria_member_id'
      })
    )

    expect(result.closureState).toBe('partial')
    expect(result.caseLifecycle).toBe('terminal')
    expect(result.personRelationship).toBe('drift')
    expect(result.payrollScope).toBe('excluded')
    expect(result.pendingSteps).toHaveLength(1)
    expect(result.pendingSteps[0]?.code).toBe('reconcile_drift')
    expect(result.pendingSteps[0]?.actionable).toBe(true)
    expect(result.pendingSteps[0]?.capability).toBe('person.legal_entity_relationships.reconcile_drift')
    expect(result.pendingSteps[0]?.href).toBe('/admin/identity/drift-reconciliation?memberId=maria_member_id')
  })

  it('caso 3: executed + no drift + payroll excluido → complete + zero pending steps', () => {
    const result = computeClosureCompleteness(
      facts({
        caseStatus: 'executed',
        nextStep: makeNextStep('completed', 'Completado'),
        personRelationshipDrift: false,
        payrollExcluded: true
      })
    )

    expect(result.closureState).toBe('complete')
    expect(result.caseLifecycle).toBe('terminal')
    expect(result.personRelationship).toBe('aligned')
    expect(result.payrollScope).toBe('excluded')
    expect(result.pendingSteps).toHaveLength(0)
  })

  it('caso 4: executed + no drift + payroll NO confirmado → partial + verify_payroll_exclusion (informational)', () => {
    const result = computeClosureCompleteness(
      facts({
        caseStatus: 'executed',
        nextStep: makeNextStep('completed', 'Completado'),
        personRelationshipDrift: false,
        payrollExcluded: false // todavia en scope o indeterminado
      })
    )

    expect(result.closureState).toBe('partial')
    expect(result.pendingSteps).toHaveLength(1)
    expect(result.pendingSteps[0]?.code).toBe('verify_payroll_exclusion')
    expect(result.pendingSteps[0]?.actionable).toBe(false) // informational
    expect(result.pendingSteps[0]?.severity).toBe('info')
    expect(result.pendingSteps[0]?.capability).toBeNull()
  })

  it('caso 6: executed + drift + payroll en scope → partial con drift FIRST + verify SECOND', () => {
    const result = computeClosureCompleteness(
      facts({
        caseStatus: 'executed',
        nextStep: makeNextStep('completed', 'Completado'),
        personRelationshipDrift: true,
        payrollExcluded: false,
        memberId: 'mem_xyz'
      })
    )

    expect(result.closureState).toBe('partial')
    expect(result.pendingSteps).toHaveLength(2)
    expect(result.pendingSteps[0]?.code).toBe('reconcile_drift')
    expect(result.pendingSteps[1]?.code).toBe('verify_payroll_exclusion')
  })

  it('caso 9: executed + drift pero memberId NULL → no se construye reconcile_drift step (faltante href)', () => {
    const result = computeClosureCompleteness(
      facts({
        caseStatus: 'executed',
        nextStep: makeNextStep('completed', 'Completado'),
        personRelationshipDrift: true,
        payrollExcluded: true,
        memberId: null
      })
    )

    expect(result.closureState).toBe('complete') // no steps emerge
    expect(result.pendingSteps).toHaveLength(0)
    expect(result.personRelationship).toBe('drift') // status sigue reportando el drift
  })
})

describe('computeClosureCompleteness — case cancelled (terminal)', () => {
  it('caso 8: cancelled + no drift → complete', () => {
    const result = computeClosureCompleteness(
      facts({
        caseStatus: 'cancelled',
        nextStep: makeNextStep('completed', 'Cancelado'),
        personRelationshipDrift: false,
        payrollExcluded: true
      })
    )

    expect(result.closureState).toBe('complete')
    expect(result.caseLifecycle).toBe('terminal')
    expect(result.pendingSteps).toHaveLength(0)
  })
})

describe('computeClosureCompleteness — case blocked', () => {
  it('caso 5: blocked → blocked closureState + case_lifecycle step (operador resuelve blocker)', () => {
    const result = computeClosureCompleteness(
      facts({
        caseStatus: 'blocked',
        nextStep: makeNextStep('classify_case', 'Resolver blocker', 'error'),
        personRelationshipDrift: false
      })
    )

    expect(result.closureState).toBe('blocked')
    expect(result.caseLifecycle).toBe('blocked')
    expect(result.pendingSteps[0]?.code).toBe('case_lifecycle')
  })
})

describe('computeClosureCompleteness — null inputs (unknown)', () => {
  it('layer alignment fields = null mapean a "unknown"', () => {
    const result = computeClosureCompleteness(
      facts({
        caseStatus: 'executed',
        nextStep: makeNextStep('completed', 'Completado'),
        personRelationshipDrift: null,
        memberRuntimeAligned: null,
        payrollExcluded: null
      })
    )

    expect(result.memberRuntime).toBe('unknown')
    expect(result.personRelationship).toBe('unknown')
    expect(result.payrollScope).toBe('unknown')
  })

  it('caso unknown personRelationship NO genera reconcile_drift step (defensa-en-profundidad)', () => {
    const result = computeClosureCompleteness(
      facts({
        caseStatus: 'executed',
        nextStep: makeNextStep('completed', 'Completado'),
        personRelationshipDrift: null, // unknown — operador resuelve manualmente
        payrollExcluded: true
      })
    )

    expect(result.pendingSteps.some(s => s.code === 'reconcile_drift')).toBe(false)
    expect(result.closureState).toBe('complete')
  })
})

describe('derivePrimaryActionFromCompleteness', () => {
  const legacyAction: OffboardingWorkQueueActionDescriptor = {
    code: 'external_provider_close',
    label: 'Cerrar con proveedor',
    disabled: false,
    disabledReason: null,
    severity: 'warning',
    href: null
  }

  it('case_lifecycle pending → primaryAction = legacyAction (preserva semantica nextStep)', () => {
    const completeness = computeClosureCompleteness(
      facts({
        caseStatus: 'draft',
        nextStep: makeNextStep('external_provider_close', 'Cerrar con proveedor', 'warning'),
        caseLifecycleStepLabel: 'Cerrar con proveedor',
        caseLifecycleStepSeverity: 'warning'
      })
    )

    const action = derivePrimaryActionFromCompleteness(completeness, legacyAction)

    expect(action).toBe(legacyAction)
  })

  it('terminal + drift → primaryAction = reconcile_drift_action descriptor con href TASK-891', () => {
    const completeness = computeClosureCompleteness(
      facts({
        caseStatus: 'executed',
        nextStep: makeNextStep('completed', 'Completado'),
        personRelationshipDrift: true,
        payrollExcluded: true,
        memberId: 'mem_drift_test'
      })
    )

    const action = derivePrimaryActionFromCompleteness(completeness, legacyAction)

    expect(action).not.toBeNull()
    expect(action?.code).toBe('reconcile_drift_action')
    expect(action?.label).toBe('Reconciliar relación legal Person 360')
    expect(action?.disabled).toBe(false)
    expect(action?.href).toBe('/admin/identity/drift-reconciliation?memberId=mem_drift_test')
  })

  it('caso complete → primaryAction = null (no CTA)', () => {
    const completeness = computeClosureCompleteness(
      facts({
        caseStatus: 'executed',
        nextStep: makeNextStep('completed', 'Completado'),
        personRelationshipDrift: false,
        payrollExcluded: true
      })
    )

    const action = derivePrimaryActionFromCompleteness(completeness, null)

    expect(action).toBeNull()
  })

  it('caso partial con SOLO verify_payroll_exclusion (informational) → primaryAction = null', () => {
    const completeness = computeClosureCompleteness(
      facts({
        caseStatus: 'executed',
        nextStep: makeNextStep('completed', 'Completado'),
        personRelationshipDrift: false,
        payrollExcluded: false // genera step informational, no actionable
      })
    )

    expect(completeness.closureState).toBe('partial')
    expect(completeness.pendingSteps).toHaveLength(1)
    expect(completeness.pendingSteps[0]?.actionable).toBe(false)

    const action = derivePrimaryActionFromCompleteness(completeness, legacyAction)

    expect(action).toBeNull()
  })
})

describe('memberId URI encoding', () => {
  it('memberId con caracteres especiales se url-encode correctamente en href reconcile_drift', () => {
    const result = computeClosureCompleteness(
      facts({
        caseStatus: 'executed',
        nextStep: makeNextStep('completed', 'Completado'),
        personRelationshipDrift: true,
        memberId: 'member with spaces&special'
      })
    )

    const driftStep = result.pendingSteps.find(s => s.code === 'reconcile_drift')

    expect(driftStep?.href).toBe('/admin/identity/drift-reconciliation?memberId=member%20with%20spaces%26special')
  })
})
