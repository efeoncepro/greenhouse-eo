import { describe, expect, it } from 'vitest'

import { evaluateContractorClosureReadiness } from './readiness'
import type { ContractorClosureReadinessInputs } from './types'

const baseInputs = (
  overrides: Partial<ContractorClosureReadinessInputs> = {}
): ContractorClosureReadinessInputs => ({
  openWorkSubmissionsCount: 0,
  openPayablesCount: 0,
  providerOwned: false,
  providerTerminationRefPresent: false,
  classificationRiskBlocking: false,
  hasPortalMember: false,
  acknowledgedBlockerCodes: [],
  ...overrides
})

const NOW = '2026-06-01T00:00:00.000Z'

describe('evaluateContractorClosureReadiness', () => {
  it('is ready with zero open items and no blockers', () => {
    const result = evaluateContractorClosureReadiness(baseInputs(), NOW)

    expect(result.ready).toBe(true)
    expect(result.blockers).toHaveLength(0)
    expect(result.advisories).toHaveLength(0)
    expect(result.evaluatedAt).toBe(NOW)
  })

  it('blocks on open work submissions (unacknowledged)', () => {
    const result = evaluateContractorClosureReadiness(
      baseInputs({ openWorkSubmissionsCount: 3 }),
      NOW
    )

    expect(result.ready).toBe(false)
    expect(result.blockers).toHaveLength(1)
    expect(result.blockers[0].code).toBe('open_work_submissions')
    expect(result.blockers[0].acknowledged).toBe(false)
  })

  it('blocks on open payables (unacknowledged)', () => {
    const result = evaluateContractorClosureReadiness(baseInputs({ openPayablesCount: 1 }), NOW)

    expect(result.ready).toBe(false)
    expect(result.blockers.map((b) => b.code)).toContain('open_payables')
  })

  it('becomes ready when all blockers are acknowledged', () => {
    const result = evaluateContractorClosureReadiness(
      baseInputs({
        openWorkSubmissionsCount: 2,
        openPayablesCount: 1,
        acknowledgedBlockerCodes: ['open_work_submissions', 'open_payables']
      }),
      NOW
    )

    expect(result.ready).toBe(true)
    expect(result.blockers).toHaveLength(2)
    expect(result.blockers.every((b) => b.acknowledged)).toBe(true)
  })

  it('requires provider termination ref only for provider-owned engagements', () => {
    const providerMissing = evaluateContractorClosureReadiness(
      baseInputs({ providerOwned: true, providerTerminationRefPresent: false }),
      NOW
    )

    expect(providerMissing.blockers.map((b) => b.code)).toContain('provider_termination_ref_missing')

    const providerPresent = evaluateContractorClosureReadiness(
      baseInputs({ providerOwned: true, providerTerminationRefPresent: true }),
      NOW
    )

    expect(providerPresent.blockers).toHaveLength(0)

    const notProviderOwned = evaluateContractorClosureReadiness(
      baseInputs({ providerOwned: false, providerTerminationRefPresent: false }),
      NOW
    )

    expect(notProviderOwned.blockers).toHaveLength(0)
  })

  it('blocks on blocking classification risk (acknowledgeable)', () => {
    const unack = evaluateContractorClosureReadiness(
      baseInputs({ classificationRiskBlocking: true }),
      NOW
    )

    expect(unack.ready).toBe(false)
    expect(unack.blockers.map((b) => b.code)).toContain('classification_risk_blocking')

    const ack = evaluateContractorClosureReadiness(
      baseInputs({
        classificationRiskBlocking: true,
        acknowledgedBlockerCodes: ['classification_risk_blocking']
      }),
      NOW
    )

    expect(ack.ready).toBe(true)
  })

  it('emits access handoff advisory only when a portal member exists — never blocking', () => {
    const withMember = evaluateContractorClosureReadiness(baseInputs({ hasPortalMember: true }), NOW)

    expect(withMember.ready).toBe(true)
    expect(withMember.advisories.map((a) => a.code)).toContain('access_handoff_reminder')

    const withoutMember = evaluateContractorClosureReadiness(
      baseInputs({ hasPortalMember: false }),
      NOW
    )

    expect(withoutMember.advisories).toHaveLength(0)
  })

  it('partial acknowledgement leaves engagement not ready', () => {
    const result = evaluateContractorClosureReadiness(
      baseInputs({
        openWorkSubmissionsCount: 1,
        openPayablesCount: 1,
        acknowledgedBlockerCodes: ['open_work_submissions']
      }),
      NOW
    )

    expect(result.ready).toBe(false)
    expect(result.blockers.find((b) => b.code === 'open_payables')?.acknowledged).toBe(false)
    expect(result.blockers.find((b) => b.code === 'open_work_submissions')?.acknowledged).toBe(true)
  })
})
