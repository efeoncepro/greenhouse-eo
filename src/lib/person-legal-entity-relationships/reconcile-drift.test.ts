/**
 * TASK-891 Slice 2 — tests para `reconcileMemberContractDrift`.
 *
 * 8 casos cubriendo el matrix completo:
 *
 * 1. Happy path: member active + 1 employee relationship activa + reason válido
 *    → cierra legacy + abre contractor + ambos eventos emitidos en misma tx.
 * 2. reason < 20 chars → throws `reason_too_short` ANTES de tocar la DB.
 * 3. invalid contractorSubtype → throws `invalid_contractor_subtype`.
 * 4. member no existe → throws `member_not_found`.
 * 5. member inactive (active=FALSE) → throws `member_inactive`.
 * 6. member sin identity_profile_id → throws `member_missing_identity_profile`.
 * 7. cero employee relationships activas → throws `no_active_employee_relationship`.
 * 8. múltiples employee relationships activas → throws `multiple_active_employee_relationships`.
 *
 * Estrategia de mocking: mockear `withGreenhousePostgresTransaction` para inyectar
 * un fake client + mockear los helpers existentes (`endPersonLegalEntityRelationship`
 * + `createContractorLegalEntityRelationship`) — REUSE > recrear.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mocks BEFORE imports of subject under test ─────────────────────────────

const withTransactionMock = vi.fn()

vi.mock('@/lib/db', () => ({
  withGreenhousePostgresTransaction: (callback: any) => withTransactionMock(callback)
}))

const captureWithDomainMock = vi.fn()

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureWithDomainMock(...args)
}))

const endRelationshipMock = vi.fn()
const createContractorRelationshipMock = vi.fn()

vi.mock('./store', () => ({
  endPersonLegalEntityRelationship: (...args: unknown[]) => endRelationshipMock(...args),
  createContractorLegalEntityRelationship: (...args: unknown[]) => createContractorRelationshipMock(...args)
}))

import {
  MIN_RECONCILIATION_REASON_CHARS,
  PersonRelationshipReconciliationError,
  reconcileMemberContractDrift
} from './reconcile-drift'

// ─── Test fixtures ───────────────────────────────────────────────────────────

const PROFILE_ID = 'profile-test-001'
const LEGACY_RELATIONSHIP_ID = 'rel-legacy-employee'
const NEW_RELATIONSHIP_ID = 'rel-new-contractor'
const ORG_ID = 'org-efeonce'
const ACTOR_USER_ID = 'user-admin-001'

const buildMemberRow = (overrides: { active?: boolean; identity_profile_id?: string | null } = {}) => ({
  member_id: 'member-test-001',
  active: overrides.active ?? true,
  identity_profile_id: overrides.identity_profile_id !== undefined ? overrides.identity_profile_id : PROFILE_ID
})

const buildActiveEmployeeRow = (overrides: { effective_from?: string } = {}) => ({
  relationship_id: LEGACY_RELATIONSHIP_ID,
  profile_id: PROFILE_ID,
  legal_entity_organization_id: ORG_ID,
  space_id: null,
  effective_from: overrides.effective_from ?? '2025-01-01'
})

const buildReconcileInput = (overrides: Partial<Parameters<typeof reconcileMemberContractDrift>[0]> = {}) => ({
  memberId: 'member-test-001',
  contractorSubtype: 'contractor' as const,
  reason: 'Transición a contractor via Deel — operador HR aprobó cierre 2026-05-14',
  actorUserId: ACTOR_USER_ID,
  externalCloseDate: undefined,
  ...overrides
})

/**
 * Build a fake PoolClient that returns canned `query()` responses based on the
 * order of expected calls (LIFO stack pop). Each query result must be pre-stacked
 * via `pushQueryResult`.
 */
type CannedQueryResult = { rows: unknown[] }

const makeFakeClient = (cannedResults: CannedQueryResult[]) => {
  const remaining = [...cannedResults]

  const client = {
    query: vi.fn().mockImplementation(async () => {
      const next = remaining.shift()

      if (!next) throw new Error('test fixture exhausted — more queries called than stubs provided')

      return next
    })
  }

  return client
}

beforeEach(() => {
  withTransactionMock.mockReset()
  captureWithDomainMock.mockReset()
  endRelationshipMock.mockReset()
  createContractorRelationshipMock.mockReset()

  // Default helper mocks return canonical snapshots
  endRelationshipMock.mockResolvedValue({
    relationshipId: LEGACY_RELATIONSHIP_ID,
    publicId: 'EO-PLR-0001',
    profileId: PROFILE_ID,
    legalEntityOrganizationId: ORG_ID,
    spaceId: null,
    relationshipType: 'employee',
    status: 'ended',
    sourceOfTruth: 'operating_entity_member_runtime',
    sourceRecordType: null,
    sourceRecordId: null,
    roleLabel: null,
    notes: '[TASK-891 reconciled ...] ...',
    effectiveFrom: '2025-01-01',
    effectiveTo: '2026-05-15',
    metadata: {},
    createdByUserId: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z'
  })

  createContractorRelationshipMock.mockResolvedValue({
    relationshipId: NEW_RELATIONSHIP_ID,
    publicId: 'EO-PLR-0002',
    profileId: PROFILE_ID,
    legalEntityOrganizationId: ORG_ID,
    spaceId: null,
    relationshipType: 'contractor',
    status: 'active',
    sourceOfTruth: 'operator_reconciliation',
    sourceRecordType: 'person_legal_entity_relationship',
    sourceRecordId: LEGACY_RELATIONSHIP_ID,
    roleLabel: null,
    notes: 'Reconciled from employee via TASK-891 ...',
    effectiveFrom: '2026-05-15',
    effectiveTo: null,
    metadata: { reconciliationContext: { supersededRelationshipId: LEGACY_RELATIONSHIP_ID } },
    createdByUserId: ACTOR_USER_ID,
    createdAt: '2026-05-15T00:00:00.000Z',
    updatedAt: '2026-05-15T00:00:00.000Z'
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─── 1. Happy path ───────────────────────────────────────────────────────────

describe('reconcileMemberContractDrift — happy path', () => {
  it('closes legacy employee + opens contractor in atomic tx + returns snapshots', async () => {
    const fakeClient = makeFakeClient([
      { rows: [buildMemberRow()] }, // fetchMemberRow
      { rows: [buildActiveEmployeeRow()] } // fetchActiveEmployeeRelationships (locked)
    ])

    withTransactionMock.mockImplementation(async (callback: any) => callback(fakeClient))

    const result = await reconcileMemberContractDrift(buildReconcileInput())

    expect(result.closedRelationshipId).toBe(LEGACY_RELATIONSHIP_ID)
    expect(result.openedRelationshipId).toBe(NEW_RELATIONSHIP_ID)
    expect(result.beforeSnapshot.status).toBe('ended')
    expect(result.afterSnapshot.status).toBe('active')
    expect(result.afterSnapshot.sourceOfTruth).toBe('operator_reconciliation')

    // Both canonical primitives invoked once each
    expect(endRelationshipMock).toHaveBeenCalledOnce()
    expect(createContractorRelationshipMock).toHaveBeenCalledOnce()

    // endRelationship received the marker notes + metadataPatch
    const endCall = endRelationshipMock.mock.calls[0][1]

    expect(endCall.relationshipId).toBe(LEGACY_RELATIONSHIP_ID)
    expect(endCall.actorUserId).toBe(ACTOR_USER_ID)
    expect(endCall.notes).toContain('TASK-891 reconciled by actor=')
    expect(endCall.notes).toContain('Transición a contractor')
    expect(endCall.metadataPatch.reconciliationContext.contractorSubtype).toBe('contractor')

    // createContractor received correct profile + org + subtype
    const createCall = createContractorRelationshipMock.mock.calls[0][1]

    expect(createCall.profileId).toBe(PROFILE_ID)
    expect(createCall.legalEntityOrganizationId).toBe(ORG_ID)
    expect(createCall.subtype).toBe('contractor')
    expect(createCall.sourceOfTruth).toBe('operator_reconciliation')
    expect(createCall.sourceRecordId).toBe(LEGACY_RELATIONSHIP_ID)
    expect(createCall.metadata.reconciliationContext.supersededRelationshipId).toBe(LEGACY_RELATIONSHIP_ID)
    expect(createCall.metadata.reconciliationContext.supersededRelationshipType).toBe('employee')
  })

  it('respects externalCloseDate when provided', async () => {
    const fakeClient = makeFakeClient([
      { rows: [buildMemberRow()] },
      { rows: [buildActiveEmployeeRow({ effective_from: '2024-01-01' })] }
    ])

    withTransactionMock.mockImplementation(async (callback: any) => callback(fakeClient))

    await reconcileMemberContractDrift(
      buildReconcileInput({
        externalCloseDate: '2026-05-14'
      })
    )

    const endCall = endRelationshipMock.mock.calls[0][1]

    expect(endCall.effectiveTo).toBe('2026-05-14')

    const createCall = createContractorRelationshipMock.mock.calls[0][1]

    expect(createCall.effectiveFrom).toBe('2026-05-14')
    expect(createCall.metadata.reconciliationContext.externalCloseDate).toBe('2026-05-14')
  })

  it('supports contractorSubtype="honorarios"', async () => {
    const fakeClient = makeFakeClient([
      { rows: [buildMemberRow()] },
      { rows: [buildActiveEmployeeRow()] }
    ])

    withTransactionMock.mockImplementation(async (callback: any) => callback(fakeClient))

    await reconcileMemberContractDrift(buildReconcileInput({ contractorSubtype: 'honorarios' }))

    const createCall = createContractorRelationshipMock.mock.calls[0][1]

    expect(createCall.subtype).toBe('honorarios')
    expect(createCall.metadata.reconciliationContext.contractorSubtype).toBe('honorarios')
  })
})

// ─── 2-3. Validation errors (no DB roundtrip) ────────────────────────────────

describe('reconcileMemberContractDrift — pre-DB validation', () => {
  it('throws reason_too_short when reason < 20 chars', async () => {
    await expect(reconcileMemberContractDrift(buildReconcileInput({ reason: 'too short' }))).rejects.toThrow(
      PersonRelationshipReconciliationError
    )

    try {
      await reconcileMemberContractDrift(buildReconcileInput({ reason: 'too short' }))
    } catch (error) {
      expect((error as PersonRelationshipReconciliationError).code).toBe('reason_too_short')
      expect((error as PersonRelationshipReconciliationError).statusCode).toBe(400)
    }

    // Validation throws BEFORE entering tx
    expect(withTransactionMock).not.toHaveBeenCalled()
  })

  it('throws reason_too_short when reason has trailing spaces only', async () => {
    // 19 effective chars + trailing whitespace
    const reason = '1234567890123456789                  '

    await expect(reconcileMemberContractDrift(buildReconcileInput({ reason }))).rejects.toThrow(
      PersonRelationshipReconciliationError
    )
  })

  it('accepts reason of exactly MIN_RECONCILIATION_REASON_CHARS chars', async () => {
    const reason = 'a'.repeat(MIN_RECONCILIATION_REASON_CHARS)

    const fakeClient = makeFakeClient([
      { rows: [buildMemberRow()] },
      { rows: [buildActiveEmployeeRow()] }
    ])

    withTransactionMock.mockImplementation(async (callback: any) => callback(fakeClient))

    await expect(reconcileMemberContractDrift(buildReconcileInput({ reason }))).resolves.toBeDefined()
  })

  it('throws invalid_contractor_subtype when subtype is not in enum', async () => {
    const input = buildReconcileInput({ contractorSubtype: 'invalid_subtype' as any })

    await expect(reconcileMemberContractDrift(input)).rejects.toThrow(PersonRelationshipReconciliationError)

    try {
      await reconcileMemberContractDrift(input)
    } catch (error) {
      expect((error as PersonRelationshipReconciliationError).code).toBe('invalid_contractor_subtype')
    }

    expect(withTransactionMock).not.toHaveBeenCalled()
  })
})

// ─── 4-6. Member state validation (inside tx) ────────────────────────────────

describe('reconcileMemberContractDrift — member state validation', () => {
  it('throws member_not_found when fetchMemberRow returns no rows', async () => {
    const fakeClient = makeFakeClient([{ rows: [] }])

    withTransactionMock.mockImplementation(async (callback: any) => callback(fakeClient))

    await expect(reconcileMemberContractDrift(buildReconcileInput())).rejects.toMatchObject({
      code: 'member_not_found',
      statusCode: 404
    })

    expect(endRelationshipMock).not.toHaveBeenCalled()
    expect(createContractorRelationshipMock).not.toHaveBeenCalled()
  })

  it('throws member_inactive when member.active=FALSE', async () => {
    const fakeClient = makeFakeClient([{ rows: [buildMemberRow({ active: false })] }])

    withTransactionMock.mockImplementation(async (callback: any) => callback(fakeClient))

    await expect(reconcileMemberContractDrift(buildReconcileInput())).rejects.toMatchObject({
      code: 'member_inactive',
      statusCode: 409
    })

    expect(endRelationshipMock).not.toHaveBeenCalled()
    expect(createContractorRelationshipMock).not.toHaveBeenCalled()
  })

  it('throws member_missing_identity_profile when identity_profile_id is null', async () => {
    const fakeClient = makeFakeClient([{ rows: [buildMemberRow({ identity_profile_id: null })] }])

    withTransactionMock.mockImplementation(async (callback: any) => callback(fakeClient))

    await expect(reconcileMemberContractDrift(buildReconcileInput())).rejects.toMatchObject({
      code: 'member_missing_identity_profile',
      statusCode: 409
    })

    expect(endRelationshipMock).not.toHaveBeenCalled()
  })
})

// ─── 7-8. Relationship state validation ──────────────────────────────────────

describe('reconcileMemberContractDrift — relationship state validation', () => {
  it('throws no_active_employee_relationship when zero employee rows', async () => {
    const fakeClient = makeFakeClient([
      { rows: [buildMemberRow()] },
      { rows: [] } // no active employee relationships
    ])

    withTransactionMock.mockImplementation(async (callback: any) => callback(fakeClient))

    await expect(reconcileMemberContractDrift(buildReconcileInput())).rejects.toMatchObject({
      code: 'no_active_employee_relationship',
      statusCode: 409
    })

    expect(endRelationshipMock).not.toHaveBeenCalled()
    expect(createContractorRelationshipMock).not.toHaveBeenCalled()
  })

  it('throws multiple_active_employee_relationships when >1 active rows', async () => {
    const fakeClient = makeFakeClient([
      { rows: [buildMemberRow()] },
      {
        rows: [
          buildActiveEmployeeRow(),
          { ...buildActiveEmployeeRow(), relationship_id: 'rel-legacy-employee-2' }
        ]
      }
    ])

    withTransactionMock.mockImplementation(async (callback: any) => callback(fakeClient))

    await expect(reconcileMemberContractDrift(buildReconcileInput())).rejects.toMatchObject({
      code: 'multiple_active_employee_relationships',
      statusCode: 409
    })

    expect(endRelationshipMock).not.toHaveBeenCalled()
  })
})

// ─── External close date edge cases ──────────────────────────────────────────

describe('reconcileMemberContractDrift — externalCloseDate validation', () => {
  it('throws invalid_external_close_date when date is malformed', async () => {
    const fakeClient = makeFakeClient([
      { rows: [buildMemberRow()] },
      { rows: [buildActiveEmployeeRow()] }
    ])

    withTransactionMock.mockImplementation(async (callback: any) => callback(fakeClient))

    await expect(
      reconcileMemberContractDrift(buildReconcileInput({ externalCloseDate: 'not-a-date' }))
    ).rejects.toMatchObject({ code: 'invalid_external_close_date' })
  })

  it('throws invalid_external_close_date when date is in the future', async () => {
    const fakeClient = makeFakeClient([
      { rows: [buildMemberRow()] },
      { rows: [buildActiveEmployeeRow()] }
    ])

    withTransactionMock.mockImplementation(async (callback: any) => callback(fakeClient))

    await expect(
      reconcileMemberContractDrift(buildReconcileInput({ externalCloseDate: '2999-01-01' }))
    ).rejects.toMatchObject({ code: 'invalid_external_close_date' })
  })

  it('throws invalid_external_close_date when date < effective_from', async () => {
    const fakeClient = makeFakeClient([
      { rows: [buildMemberRow()] },
      { rows: [buildActiveEmployeeRow({ effective_from: '2025-06-01' })] }
    ])

    withTransactionMock.mockImplementation(async (callback: any) => callback(fakeClient))

    await expect(
      reconcileMemberContractDrift(buildReconcileInput({ externalCloseDate: '2025-01-01' }))
    ).rejects.toMatchObject({ code: 'invalid_external_close_date' })
  })
})

// ─── Atomicity: unknown failure captures + re-throws ─────────────────────────

describe('reconcileMemberContractDrift — atomicity + observability', () => {
  it('captures unknown errors to identity domain + re-throws', async () => {
    const fakeClient = makeFakeClient([{ rows: [buildMemberRow()] }, { rows: [buildActiveEmployeeRow()] }])

    withTransactionMock.mockImplementation(async (callback: any) => callback(fakeClient))

    // Simulate failure inside createContractor (e.g. DB constraint)
    const dbError = new Error('unique constraint violation')

    createContractorRelationshipMock.mockRejectedValueOnce(dbError)

    await expect(reconcileMemberContractDrift(buildReconcileInput())).rejects.toThrow('unique constraint')

    expect(captureWithDomainMock).toHaveBeenCalledWith(
      dbError,
      'identity',
      expect.objectContaining({
        tags: { source: 'person_relationship_reconcile_drift' }
      })
    )
  })

  it('does NOT capture canonical errors to Sentry (they are sanitizable at boundary)', async () => {
    const fakeClient = makeFakeClient([{ rows: [] }]) // member not found

    withTransactionMock.mockImplementation(async (callback: any) => callback(fakeClient))

    await expect(reconcileMemberContractDrift(buildReconcileInput())).rejects.toBeInstanceOf(
      PersonRelationshipReconciliationError
    )

    expect(captureWithDomainMock).not.toHaveBeenCalled()
  })
})
