import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const runQuery = vi.fn()
const clientQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runQuery(...args),
  withGreenhousePostgresTransaction: (cb: (client: unknown) => unknown) => cb({ query: clientQuery })
}))

import { HiringNotFoundError, HiringValidationError } from '../errors'
import {
  applyCandidateIdentityRemediation,
  planCandidateIdentityRemediation,
  rollbackCandidateIdentityRemediation,
  type CandidateIdentityRemediationAllowlistEntry
} from './remediate'

// TASK-1736 Slice 3 — Flujo del CLI (dry-run → allowlist → apply, ADR D4) sobre la única puerta
// de mutación `reconcileCandidateIdentityDisplayName`. Nombres del fixture: sintéticos.

// ── Estado simulado de la DB para el reconcile (por profileId) ───────────────────────────────────

type ProfileState = {
  fullName: string | null
  humanCorrection?: boolean
  casRowCount?: number
}

const setupReconcileDb = (profiles: Record<string, ProfileState>) => {
  clientQuery.mockImplementation(async (sql: string, params: unknown[]) => {
    const profileId = String(params[0])
    const state = profiles[profileId]

    if (sql.includes('FROM greenhouse_core.identity_profiles') && sql.includes('FOR UPDATE')) {
      return state ? { rows: [{ full_name: state.fullName }], rowCount: 1 } : { rows: [], rowCount: 0 }
    }

    if (sql.includes("source = 'human'")) {
      return state?.humanCorrection ? { rows: [{ ok: 1 }], rowCount: 1 } : { rows: [], rowCount: 0 }
    }

    if (sql.includes('UPDATE greenhouse_core.identity_profiles')) {
      return { rows: [], rowCount: state?.casRowCount ?? 1 }
    }

    if (sql.includes('INSERT INTO greenhouse_hiring.candidate_identity_display_audit')) {
      return { rows: [], rowCount: 1 }
    }

    throw new Error(`query inesperada: ${sql}`)
  })
}

const mutationCalls = () =>
  clientQuery.mock.calls.filter(([sql]) => String(sql).includes('UPDATE greenhouse_core.identity_profiles'))

const entryFor = (
  profileId: string,
  beforeFullName: string,
  proposedFullName: string,
  overrides: Partial<CandidateIdentityRemediationAllowlistEntry> = {}
): CandidateIdentityRemediationAllowlistEntry => ({
  profileId,
  publicId: `pub-${profileId}`,
  applicationId: `happ-${profileId}`,
  beforeFullName,
  proposedFullName,
  classification: 'degenerate_lower',
  normalizationVersion: 'v1',
  ...overrides
})

const applyDefaults = { actorUserId: 'user-operator-1', reason: 'TASK-1736 remediación casing histórico' }

beforeEach(() => {
  runQuery.mockReset()
  clientQuery.mockReset()
})

// ── Dry-run / plan ───────────────────────────────────────────────────────────────────────────────

describe('planCandidateIdentityRemediation — dry-run read-only', () => {
  it('deriva la allowlist propuesta SIN mutar nada (cero writes, cero transacciones)', async () => {
    runQuery.mockResolvedValue([
      {
        profile_id: 'prof-lower',
        public_id: 'EO-CND-0001',
        full_name: 'valentina villa',
        latest_application_id: 'happ-1',
        has_human_correction: false
      },
      {
        profile_id: 'prof-corrected',
        public_id: 'EO-CND-0005',
        full_name: 'carla soto',
        latest_application_id: 'happ-5',
        has_human_correction: true
      },
      {
        profile_id: 'prof-ok',
        public_id: 'EO-CND-0003',
        full_name: 'Ada Lovelace',
        latest_application_id: null,
        has_human_correction: false
      }
    ])

    const plan = await planCandidateIdentityRemediation()

    // Sólo el degenerado sin corrección humana entra a la allowlist propuesta.
    expect(plan.allowlistEntries).toEqual([
      {
        profileId: 'prof-lower',
        publicId: 'EO-CND-0001',
        applicationId: 'happ-1',
        beforeFullName: 'valentina villa',
        proposedFullName: 'Valentina Villa',
        classification: 'degenerate_lower',
        normalizationVersion: 'v1'
      }
    ])
    expect(plan.excludedByHumanCorrectionCount).toBe(1)
    expect(plan.totalCandidateProfiles).toBe(3)

    // READ-ONLY: una SELECT y ninguna transacción/mutación.
    expect(runQuery).toHaveBeenCalledTimes(1)
    expect(String(runQuery.mock.calls[0][0])).not.toMatch(/UPDATE|INSERT|DELETE/i)
    expect(clientQuery).not.toHaveBeenCalled()
  })
})

// ── Apply — validaciones de entrada ──────────────────────────────────────────────────────────────

describe('applyCandidateIdentityRemediation — validaciones', () => {
  const validEntry = entryFor('prof-1', 'valentina villa', 'Valentina Villa')

  it('exige actor', async () => {
    await expect(
      applyCandidateIdentityRemediation({ entries: [validEntry], actorUserId: '', reason: applyDefaults.reason })
    ).rejects.toBeInstanceOf(HiringValidationError)
  })

  it('exige reason ≥10 chars', async () => {
    await expect(
      applyCandidateIdentityRemediation({ entries: [validEntry], actorUserId: 'user-1', reason: 'corto' })
    ).rejects.toBeInstanceOf(HiringValidationError)
  })

  it('exige allowlist no vacía', async () => {
    await expect(applyCandidateIdentityRemediation({ entries: [], ...applyDefaults })).rejects.toBeInstanceOf(
      HiringValidationError
    )
  })

  it('rechaza profileIds duplicados en la allowlist', async () => {
    await expect(
      applyCandidateIdentityRemediation({ entries: [validEntry, { ...validEntry }], ...applyDefaults })
    ).rejects.toBeInstanceOf(HiringValidationError)
  })
})

// ── Apply — flujo gobernado ──────────────────────────────────────────────────────────────────────

describe('applyCandidateIdentityRemediation — apply allowlisted (lotes de 1, CAS)', () => {
  it('aplica exactamente la allowlist vía el reconcile (CAS con before-value exacto)', async () => {
    setupReconcileDb({ 'prof-1': { fullName: 'valentina villa' } })

    const summary = await applyCandidateIdentityRemediation({
      entries: [entryFor('prof-1', 'valentina villa', 'Valentina Villa')],
      ...applyDefaults
    })

    expect(summary).toMatchObject({
      expected: 1,
      applied: 1,
      skipped: 0,
      needsReview: 0,
      countMatchesExpected: true
    })
    expect(summary.results[0]).toEqual({
      profileId: 'prof-1',
      publicId: 'pub-prof-1',
      outcome: 'applied',
      reasonCode: 'display_refreshed'
    })

    // La ÚNICA mutación es el CAS del reconcile, con propuesta + before-value exacto.
    const [sql, params] = mutationCalls()[0]

    expect(String(sql)).toContain('full_name IS NOT DISTINCT FROM $3')
    expect(params).toEqual(['prof-1', 'Valentina Villa', 'valentina villa'])
  })

  it('si el nombre cambió SUSTANTIVAMENTE entre dry-run y apply → needs_review sin mutar', async () => {
    // El dry-run vio "valentina villa"; la DB hoy tiene otra persona/nombre.
    setupReconcileDb({ 'prof-1': { fullName: 'Carla Soto' } })

    const summary = await applyCandidateIdentityRemediation({
      entries: [entryFor('prof-1', 'valentina villa', 'Valentina Villa')],
      ...applyDefaults
    })

    expect(summary.results[0]).toMatchObject({ outcome: 'needs_review', reasonCode: 'substantive_name_discrepancy' })
    expect(summary.countMatchesExpected).toBe(false)
    expect(mutationCalls()).toHaveLength(0)
  })

  it('A1 — el audit del apply lleva actor y razón (no sólo los valida)', async () => {
    setupReconcileDb({ 'prof-1': { fullName: 'valentina villa' } })

    await applyCandidateIdentityRemediation({
      entries: [entryFor('prof-1', 'valentina villa', 'Valentina Villa')],
      ...applyDefaults
    })

    const auditCall = clientQuery.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO greenhouse_hiring.candidate_identity_display_audit')
    )

    expect(auditCall).toBeDefined()

    const params = auditCall?.[1] as unknown[]

    // [6]=reason (code + motivo del apply), [7]=actor_user_id — la mutación histórica queda
    // atribuida al humano que la autorizó, no como automatismo anónimo.
    expect(params[6]).toBe('display_refreshed — TASK-1736 remediación casing histórico')
    expect(params[7]).toBe('user-operator-1')
  })

  it('si el nombre ya fue corregido a la forma canónica entre dry-run y apply → skipped sin mutar', async () => {
    setupReconcileDb({ 'prof-1': { fullName: 'Valentina Villa' } })

    const summary = await applyCandidateIdentityRemediation({
      entries: [entryFor('prof-1', 'valentina villa', 'Valentina Villa')],
      ...applyDefaults
    })

    expect(summary.results[0]).toMatchObject({ outcome: 'skipped', reasonCode: 'already_canonical' })
    expect(mutationCalls()).toHaveLength(0)
  })

  it('A6 — retry de un apply exitoso es idempotente: already_canonical cuenta como éxito (exit 0)', async () => {
    // Todo el universo ya quedó en la propuesta (primer apply exitoso); el retry no aborta.
    setupReconcileDb({
      'prof-1': { fullName: 'Valentina Villa' },
      'prof-2': { fullName: 'Ana Mora' }
    })

    const summary = await applyCandidateIdentityRemediation({
      entries: [
        entryFor('prof-1', 'valentina villa', 'Valentina Villa'),
        entryFor('prof-2', 'ANA MORA', 'Ana Mora', { classification: 'degenerate_upper' })
      ],
      ...applyDefaults
    })

    expect(summary).toMatchObject({
      expected: 2,
      applied: 0,
      skipped: 2,
      skippedAlreadyCanonical: 2,
      needsReview: 0,
      countMatchesExpected: true
    })
    expect(mutationCalls()).toHaveLength(0)
  })

  it('A6 — mezcla applied + already_canonical alcanza el estado prometido (no aborta)', async () => {
    setupReconcileDb({
      'prof-1': { fullName: 'valentina villa' },
      'prof-2': { fullName: 'Ana Mora' }
    })

    const summary = await applyCandidateIdentityRemediation({
      entries: [
        entryFor('prof-1', 'valentina villa', 'Valentina Villa'),
        entryFor('prof-2', 'ANA MORA', 'Ana Mora', { classification: 'degenerate_upper' })
      ],
      ...applyDefaults
    })

    expect(summary).toMatchObject({ applied: 1, skippedAlreadyCanonical: 1, countMatchesExpected: true })
  })

  it('conflicto concurrente del CAS (rowCount 0) → needs_review, jamás last-write-wins', async () => {
    setupReconcileDb({ 'prof-1': { fullName: 'valentina villa', casRowCount: 0 } })

    const summary = await applyCandidateIdentityRemediation({
      entries: [entryFor('prof-1', 'valentina villa', 'Valentina Villa')],
      ...applyDefaults
    })

    expect(summary.results[0]).toMatchObject({ outcome: 'needs_review', reasonCode: 'cas_conflict' })
    expect(summary.countMatchesExpected).toBe(false)
  })

  it('una corrección humana registrada DESPUÉS del dry-run SIEMPRE gana → skipped sin mutar', async () => {
    setupReconcileDb({ 'prof-1': { fullName: 'valentina villa', humanCorrection: true } })

    const summary = await applyCandidateIdentityRemediation({
      entries: [entryFor('prof-1', 'valentina villa', 'Valentina Villa')],
      ...applyDefaults
    })

    expect(summary.results[0]).toMatchObject({ outcome: 'skipped', reasonCode: 'human_correction_present' })
    expect(summary.countMatchesExpected).toBe(false)
    expect(mutationCalls()).toHaveLength(0)
  })

  it('aborta en drift de conteo: 2 entries, 1 aplica y 1 conflicto → countMatchesExpected=false', async () => {
    setupReconcileDb({
      'prof-1': { fullName: 'valentina villa' },
      'prof-2': { fullName: 'ANA MORA', casRowCount: 0 }
    })

    const summary = await applyCandidateIdentityRemediation({
      entries: [
        entryFor('prof-1', 'valentina villa', 'Valentina Villa'),
        entryFor('prof-2', 'ANA MORA', 'Ana Mora', { classification: 'degenerate_upper' })
      ],
      ...applyDefaults
    })

    expect(summary).toMatchObject({ expected: 2, applied: 1, needsReview: 1, countMatchesExpected: false })
  })

  it('allowlist adulterada (propuesta no re-derivable de la policy) → needs_review sin tocar DB', async () => {
    setupReconcileDb({ 'prof-1': { fullName: 'valentina villa' } })

    const summary = await applyCandidateIdentityRemediation({
      entries: [entryFor('prof-1', 'valentina villa', 'Valentina VILLA')],
      ...applyDefaults
    })

    expect(summary.results[0]).toMatchObject({ outcome: 'needs_review', reasonCode: 'allowlist_proposal_drift' })
    expect(clientQuery).not.toHaveBeenCalled()
  })

  it('allowlist de otra versión de policy → needs_review sin tocar DB (regenerar dry-run)', async () => {
    setupReconcileDb({ 'prof-1': { fullName: 'valentina villa' } })

    const summary = await applyCandidateIdentityRemediation({
      entries: [entryFor('prof-1', 'valentina villa', 'Valentina Villa', { normalizationVersion: 'v0' })],
      ...applyDefaults
    })

    expect(summary.results[0]).toMatchObject({ outcome: 'needs_review', reasonCode: 'allowlist_version_drift' })
    expect(clientQuery).not.toHaveBeenCalled()
  })
})

// ── Rollback per-record (A2 — CAS del before-value del audit) ────────────────────────────────────

type RollbackDbState = {
  audit?: {
    audit_id: string
    identity_profile_id: string
    application_id: string | null
    before_full_name: string | null
    after_full_name: string | null
    normalization_version: string
  } | null
  currentFullName?: string | null
  profileExists?: boolean
  casRowCount?: number
}

const setupRollbackDb = ({ audit = null, currentFullName = null, profileExists = true, casRowCount = 1 }: RollbackDbState) => {
  clientQuery.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM greenhouse_hiring.candidate_identity_display_audit') && sql.includes("source = 'reconcile'")) {
      return audit ? { rows: [audit], rowCount: 1 } : { rows: [], rowCount: 0 }
    }

    if (sql.includes('FROM greenhouse_core.identity_profiles') && sql.includes('FOR UPDATE')) {
      return { rows: profileExists ? [{ full_name: currentFullName }] : [], rowCount: profileExists ? 1 : 0 }
    }

    if (sql.includes('UPDATE greenhouse_core.identity_profiles')) {
      return { rows: [], rowCount: casRowCount }
    }

    if (sql.includes('INSERT INTO greenhouse_hiring.candidate_identity_display_audit')) {
      return { rows: [], rowCount: 1 }
    }

    throw new Error(`query inesperada: ${sql}`)
  })
}

const rollbackAuditRow = (overrides: Partial<NonNullable<RollbackDbState['audit']>> = {}) => ({
  audit_id: 'cida-1',
  identity_profile_id: 'prof-1',
  application_id: 'happ-1',
  before_full_name: 'valentina villa',
  after_full_name: 'Valentina Villa',
  normalization_version: 'v1',
  ...overrides
})

const rollbackDefaults = { auditId: 'cida-1', actorUserId: 'user-operator-1', reason: 'TASK-1736 rollback ensayo' }

const rollbackAuditInsertCalls = () =>
  clientQuery.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO greenhouse_hiring.candidate_identity_display_audit'))

describe('rollbackCandidateIdentityRemediation — reversión per-record (A2)', () => {
  it('exige auditId, actor y reason ≥10 chars', async () => {
    await expect(
      rollbackCandidateIdentityRemediation({ ...rollbackDefaults, auditId: '' })
    ).rejects.toBeInstanceOf(HiringValidationError)
    await expect(
      rollbackCandidateIdentityRemediation({ ...rollbackDefaults, actorUserId: '' })
    ).rejects.toBeInstanceOf(HiringValidationError)
    await expect(
      rollbackCandidateIdentityRemediation({ ...rollbackDefaults, reason: 'corto' })
    ).rejects.toBeInstanceOf(HiringValidationError)
  })

  it('audit inexistente (o no reconcile/applied) → HiringNotFoundError sin mutar', async () => {
    setupRollbackDb({ audit: null })

    await expect(rollbackCandidateIdentityRemediation(rollbackDefaults)).rejects.toBeInstanceOf(HiringNotFoundError)
    expect(mutationCalls()).toHaveLength(0)
  })

  it('CAS OK: el vigente sigue siendo el after del apply → restaura el before-value exacto', async () => {
    setupRollbackDb({ audit: rollbackAuditRow(), currentFullName: 'Valentina Villa' })

    const result = await rollbackCandidateIdentityRemediation(rollbackDefaults)

    expect(result).toEqual({
      auditId: 'cida-1',
      profileId: 'prof-1',
      outcome: 'applied',
      reasonCode: 'rollback_applied',
      restoredFullName: 'valentina villa'
    })

    // El UPDATE es CAS: restaura el before del audit condicionado al vigente exacto.
    const [sql, params] = mutationCalls()[0]

    expect(String(sql)).toContain('full_name IS NOT DISTINCT FROM $3')
    expect(params).toEqual(['prof-1', 'valentina villa', 'Valentina Villa'])

    // La reversión queda registrada como corrección HUMANA con actor + razón (bloquea automatismos).
    const [auditSql, auditParams] = rollbackAuditInsertCalls()[0]

    expect(String(auditSql)).toContain("'human'")
    expect(auditParams[2]).toBe('applied')
    expect(auditParams[4]).toBe('valentina villa') // after de la fila nueva = valor restaurado
    expect(String(auditParams[5])).toContain('TASK-1736 rollback ensayo')
    expect(auditParams[6]).toBe('user-operator-1')
  })

  it('el vigente YA NO es el after del apply → needs_review SIN mutar (jamás last-write-wins)', async () => {
    setupRollbackDb({ audit: rollbackAuditRow(), currentFullName: 'Valentina Villa Soto' })

    const result = await rollbackCandidateIdentityRemediation(rollbackDefaults)

    expect(result).toMatchObject({ outcome: 'needs_review', reasonCode: 'rollback_cas_mismatch', restoredFullName: null })
    expect(mutationCalls()).toHaveLength(0)
    // La rama sin mutación TAMBIÉN escribe audit (trazabilidad del intento).
    expect(rollbackAuditInsertCalls()).toHaveLength(1)
  })

  it('before-value vacío (empty_display_filled) → needs_review sin materializar display invisible', async () => {
    setupRollbackDb({
      audit: rollbackAuditRow({ before_full_name: null }),
      currentFullName: 'Valentina Villa'
    })

    const result = await rollbackCandidateIdentityRemediation(rollbackDefaults)

    expect(result).toMatchObject({ outcome: 'needs_review', reasonCode: 'rollback_before_value_unavailable' })
    expect(mutationCalls()).toHaveLength(0)
  })

  it('carrera del CAS (rowCount 0 pese al FOR UPDATE) → needs_review', async () => {
    setupRollbackDb({ audit: rollbackAuditRow(), currentFullName: 'Valentina Villa', casRowCount: 0 })

    const result = await rollbackCandidateIdentityRemediation(rollbackDefaults)

    expect(result).toMatchObject({ outcome: 'needs_review', reasonCode: 'rollback_cas_mismatch' })
  })
})
