import type { GlobeCreditsWorkbenchModel } from './GlobeCreditsOperationsWorkbenchView'

export const globeCreditsWorkbenchFixture: GlobeCreditsWorkbenchModel = {
  workspace: { id: 'greenhouse-org:efeonce', name: 'Efeonce · Workspace interno' },
  loadError: false,
  canEnsure: true,
  canReconcile: true,
  status: {
    schemaVersion: '1',
    state: 'ready',
    period: {
      timezone: 'UTC',
      start: '2026-08-01T00:00:00.000Z',
      end: '2026-09-01T00:00:00.000Z'
    },
    requestedCredits: 1,
    allowed: true,
    monthly: { cap: 1200, spent: 426, held: 118, remaining: 656 },
    project: { cap: 700, spent: 244, held: 82, remaining: 374 },
    eligibleFunding: 480,
    effectiveAvailable: 656,
    blockers: [],
    coverage: {
      periodStart: '2026-08-01T00:00:00.000Z',
      periodEnd: '2026-09-01T00:00:00.000Z',
      candidateCount: 3
    },
    freshnessSeconds: 14,
    asOf: '2026-08-01T15:42:00.000Z',
    historicalLedger: {
      allocated: 1400,
      reserved: 118,
      spent: 626,
      adjusted: 0,
      available: 656,
      asOf: '2026-08-01T15:42:00.000Z'
    }
  },
  operations: [
    {
      schemaVersion: '1',
      operationId: 'op-aug-capacity-003',
      proposalId: 'proposal-aug-capacity-003',
      state: 'completed',
      plan: {
        poolId: 'pool-internal-production',
        grantCredits: 400,
        monthlyCapAfter: 1200,
        monthlyCapBefore: 900,
        spentInPeriod: 426,
        policyAvailableBefore: 256,
        policyAvailableAfter: 656,
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-09-01T00:00:00.000Z'
      },
      receipt: { outcome: 'completed', reconciledAt: '2026-08-01T14:08:12.000Z' },
      expiresAt: '2026-08-01T14:18:00.000Z',
      createdAt: '2026-08-01T14:07:31.000Z',
      updatedAt: '2026-08-01T14:08:12.000Z'
    },
    {
      schemaVersion: '1',
      operationId: 'op-jul-readback-002',
      proposalId: 'proposal-jul-readback-002',
      state: 'reconciled',
      plan: {
        grantCredits: 0,
        monthlyCapAfter: 900,
        monthlyCapBefore: 900,
        spentInPeriod: 426,
        policyAvailableBefore: 256,
        policyAvailableAfter: 256,
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-09-01T00:00:00.000Z'
      },
      receipt: { outcome: 'no_effect', reasonCode: 'already_funded', reconciledAt: '2026-08-01T12:31:07.000Z' },
      expiresAt: '2026-08-01T12:40:00.000Z',
      createdAt: '2026-08-01T12:30:22.000Z',
      updatedAt: '2026-08-01T12:31:07.000Z'
    },
    {
      schemaVersion: '1',
      operationId: 'op-jul-recovery-001',
      proposalId: 'proposal-jul-recovery-001',
      state: 'outcome_unknown',
      plan: {
        poolId: 'pool-internal-production',
        grantCredits: 240,
        monthlyCapAfter: 900,
        monthlyCapBefore: 700,
        spentInPeriod: 401,
        policyAvailableBefore: 181,
        policyAvailableAfter: 421,
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-09-01T00:00:00.000Z'
      },
      expiresAt: '2026-08-01T11:20:00.000Z',
      createdAt: '2026-08-01T11:09:20.000Z',
      updatedAt: '2026-08-01T11:10:03.000Z'
    }
  ]
}
