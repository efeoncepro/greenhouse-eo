import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const runQuery = vi.fn()
const clientQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runQuery(...args),
  withGreenhousePostgresTransaction: (cb: (client: unknown) => unknown) => cb({ query: clientQuery })
}))

import { HiringValidationError } from '../errors'
import {
  applyCandidateIdentityRemediation,
  planCandidateIdentityRemediation,
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

  it('si el nombre ya fue corregido a la forma canónica entre dry-run y apply → skipped sin mutar', async () => {
    setupReconcileDb({ 'prof-1': { fullName: 'Valentina Villa' } })

    const summary = await applyCandidateIdentityRemediation({
      entries: [entryFor('prof-1', 'valentina villa', 'Valentina Villa')],
      ...applyDefaults
    })

    expect(summary.results[0]).toMatchObject({ outcome: 'skipped', reasonCode: 'already_canonical' })
    expect(mutationCalls()).toHaveLength(0)
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
