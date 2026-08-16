import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const clientQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: (cb: (client: unknown) => unknown) => cb({ query: clientQuery })
}))

import { HiringNotFoundError } from '../errors'
import { normalizeCandidateIdentityInput } from './index'
import { reconcileCandidateIdentityDisplayName } from './reconcile-display'

// TASK-1736 Slice 2 — CAS del reconcile (ADR D3): TODAS las precondiciones, fail-closed a humano,
// y el invariante "SIEMPRE se escribe una fila de audit con fuente reconcile".

type DbSetup = {
  currentFullName?: string | null
  profileExists?: boolean
  humanCorrection?: boolean
  casRowCount?: number
}

const setupDb = ({ currentFullName = null, profileExists = true, humanCorrection = false, casRowCount = 1 }: DbSetup) => {
  clientQuery.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM greenhouse_core.identity_profiles') && sql.includes('FOR UPDATE')) {
      return { rows: profileExists ? [{ full_name: currentFullName }] : [], rowCount: profileExists ? 1 : 0 }
    }

    if (sql.includes("source = 'human'")) {
      return { rows: humanCorrection ? [{ ok: 1 }] : [], rowCount: humanCorrection ? 1 : 0 }
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

const auditCalls = () =>
  clientQuery.mock.calls.filter(([sql]) => String(sql).includes('candidate_identity_display_audit') && String(sql).includes('INSERT'))

const casCalls = () => clientQuery.mock.calls.filter(([sql]) => String(sql).includes('UPDATE greenhouse_core.identity_profiles'))

const intakeFor = (firstName: string, lastName: string) => normalizeCandidateIdentityInput({ firstName, lastName })

const run = (intake: ReturnType<typeof normalizeCandidateIdentityInput>) =>
  reconcileCandidateIdentityDisplayName({ identityProfileId: 'prof-1', applicationId: 'happ-1', intake })

describe('reconcileCandidateIdentityDisplayName — precondiciones D3', () => {
  beforeEach(() => {
    clientQuery.mockReset()
  })

  it('APLICA la propuesta high_confidence cuando difiere sólo en casing del vigente (CAS exitoso)', async () => {
    setupDb({ currentFullName: 'valentina villa' })

    const result = await run(intakeFor('valentina', 'villa'))

    expect(result).toEqual({
      outcome: 'applied',
      reasonCode: 'display_refreshed',
      beforeFullName: 'valentina villa',
      afterFullName: 'Valentina Villa'
    })

    // El CAS lleva propuesta + before-value exacto; jamás last-write-wins ciego.
    const [sql, params] = casCalls()[0]

    expect(String(sql)).toContain('full_name IS NOT DISTINCT FROM $3')
    expect(params).toEqual(['prof-1', 'Valentina Villa', 'valentina villa'])

    // Audit fuente reconcile con outcome applied.
    expect(auditCalls()).toHaveLength(1)
    expect(auditCalls()[0][1][2]).toBe('applied')
  })

  it('una corrección humana previa SIEMPRE gana: skipped sin mutar aunque la propuesta exista', async () => {
    setupDb({ currentFullName: 'valentina villa', humanCorrection: true })

    const result = await run(intakeFor('valentina', 'villa'))

    expect(result.outcome).toBe('skipped')
    expect(result.reasonCode).toBe('human_correction_present')
    expect(casCalls()).toHaveLength(0)
    expect(auditCalls()).toHaveLength(1)
  })

  it('discrepancia SUSTANTIVA (tokens distintos bajo searchKey) → needs_review SIN mutar', async () => {
    setupDb({ currentFullName: 'Carla Soto' })

    const result = await run(intakeFor('valentina', 'villa'))

    expect(result.outcome).toBe('needs_review')
    expect(result.reasonCode).toBe('substantive_name_discrepancy')
    expect(result.beforeFullName).toBe('Carla Soto')
    expect(result.afterFullName).toBeNull()
    expect(casCalls()).toHaveLength(0)
    expect(auditCalls()).toHaveLength(1)
    expect(auditCalls()[0][1][2]).toBe('needs_review')
  })

  it('clasificación no elegible (mixed_ambiguous, sin propuesta) → skipped, la policy no adivina', async () => {
    setupDb({ currentFullName: 'dEsiree smith' })

    const result = await run(intakeFor('dEsiree', 'smith'))

    expect(result.outcome).toBe('skipped')
    expect(result.reasonCode).toBe('not_high_confidence')
    expect(casCalls()).toHaveLength(0)
    expect(auditCalls()).toHaveLength(1)
  })

  it('vigente ya canónico (propuesta === actual) → skipped already_canonical', async () => {
    setupDb({ currentFullName: 'Valentina Villa' })

    // Intake degenerado cuya propuesta coincide EXACTO con el display vigente.
    const result = await run(intakeFor('valentina', 'villa'))

    expect(result.outcome).toBe('skipped')
    expect(result.reasonCode).toBe('already_canonical')
    expect(casCalls()).toHaveLength(0)
  })

  it('nombre bien formado sin delta → skipped already_canonical (no hay nada que proponer)', async () => {
    setupDb({ currentFullName: 'Ada Lovelace' })

    const result = await run(intakeFor('Ada', 'Lovelace'))

    expect(result.outcome).toBe('skipped')
    expect(result.reasonCode).toBe('already_canonical')
    expect(casCalls()).toHaveLength(0)
    expect(auditCalls()).toHaveLength(1)
  })

  it('conflicto concurrente del CAS (rowCount 0) → needs_review, nunca last-write-wins', async () => {
    setupDb({ currentFullName: 'valentina villa', casRowCount: 0 })

    const result = await run(intakeFor('valentina', 'villa'))

    expect(result.outcome).toBe('needs_review')
    expect(result.reasonCode).toBe('cas_conflict')
    expect(result.afterFullName).toBeNull()
    expect(auditCalls()).toHaveLength(1)
  })

  it('vigente vacío/placeholder → se materializa el display del intake (empty_display_filled)', async () => {
    setupDb({ currentFullName: null })

    const result = await run(intakeFor('valentina', 'villa'))

    expect(result.outcome).toBe('applied')
    expect(result.reasonCode).toBe('empty_display_filled')
    expect(result.afterFullName).toBe('Valentina Villa')
  })

  it('identidad inexistente → HiringNotFoundError (jamás crea Person desde acá)', async () => {
    setupDb({ profileExists: false })

    await expect(run(intakeFor('valentina', 'villa'))).rejects.toBeInstanceOf(HiringNotFoundError)
  })

  it('TODAS las ramas escriben audit fuente reconcile (invariante ADR D3)', async () => {
    // La fila de audit lleva source='reconcile' inline en el SQL y actor NULL.
    setupDb({ currentFullName: 'valentina villa' })
    await run(intakeFor('valentina', 'villa'))

    const [sql, params] = auditCalls()[0]

    expect(String(sql)).toContain("'reconcile'")
    expect(String(sql)).toContain('NULL')
    // application_id viaja para el lineage exacto.
    expect(params[1]).toBe('happ-1')
  })
})
