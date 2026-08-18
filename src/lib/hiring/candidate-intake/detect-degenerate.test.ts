import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const runQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => runQuery(...args)
}))

import { detectDegenerateCandidateNames, isRemediableFinding } from './detect-degenerate'

// TASK-1736 Slice 3 — Detector READ-ONLY: clasifica el corpus (fixture con los casos reales
// ANONIMIZADOS de la auditoría 2026-08-16: lowercase, UPPER, bien formado, no latino,
// corregido-por-humano) sin escribir nada. Los nombres del fixture son sintéticos.

type FixtureRow = {
  profile_id: string
  public_id: string | null
  full_name: string | null
  latest_application_id: string | null
  has_human_correction: boolean
}

const CORPUS: FixtureRow[] = [
  // Degenerado evidente lowercase (el patrón del caso sintomático real).
  {
    profile_id: 'prof-lower',
    public_id: 'EO-CND-0001',
    full_name: 'valentina villa',
    latest_application_id: 'happ-1',
    has_human_correction: false
  },
  // Degenerado evidente UPPER.
  {
    profile_id: 'prof-upper',
    public_id: 'EO-CND-0002',
    full_name: 'MARÍA JOSÉ PÉREZ',
    latest_application_id: 'happ-2',
    has_human_correction: false
  },
  // Bien formado — nada que proponer.
  {
    profile_id: 'prof-ok',
    public_id: 'EO-CND-0003',
    full_name: 'Ada de los Ángeles Lovelace',
    latest_application_id: 'happ-3',
    has_human_correction: false
  },
  // Escritura no latina — el casing no aplica, jamás se translitera.
  {
    profile_id: 'prof-cjk',
    public_id: 'EO-CND-0004',
    full_name: '李 小龍',
    latest_application_id: null,
    has_human_correction: false
  },
  // Degenerado PERO con corrección humana previa registrada — excluido del universo remediable.
  {
    profile_id: 'prof-corrected',
    public_id: 'EO-CND-0005',
    full_name: 'carla soto',
    latest_application_id: 'happ-5',
    has_human_correction: true
  }
]

describe('detectDegenerateCandidateNames — detector read-only (Slice 3)', () => {
  beforeEach(() => {
    runQuery.mockReset()
    runQuery.mockResolvedValue(CORPUS)
  })

  it('es READ-ONLY: una sola query SELECT, sin UPDATE/INSERT/DELETE', async () => {
    await detectDegenerateCandidateNames()

    expect(runQuery).toHaveBeenCalledTimes(1)

    const [sql] = runQuery.mock.calls[0] as [string, unknown[]]

    expect(sql).toMatch(/^\s*SELECT/i)
    expect(sql).not.toMatch(/UPDATE|INSERT|DELETE/i)

    // Barre candidatos: external_contact CON candidate_facet vinculada.
    expect(sql).toContain("profile_type = 'external_contact'")
    expect(sql).toContain('greenhouse_hiring.candidate_facet')
  })

  it('clasifica el corpus completo y cuenta por clase', async () => {
    const report = await detectDegenerateCandidateNames()

    expect(report.totalCandidateProfiles).toBe(5)
    expect(report.countsByClassification).toEqual({
      degenerate_lower: 2, // valentina villa + carla soto (la corregida también clasifica)
      degenerate_upper: 1,
      well_formed: 1,
      non_latin: 1
    })
    expect(report.normalizationVersion).toBe('v1')
  })

  it('propone display SOLO para degenerados evidentes, con reglas conservadoras', async () => {
    const report = await detectDegenerateCandidateNames()
    const byId = new Map(report.findings.map(finding => [finding.profileId, finding]))

    expect(byId.get('prof-lower')).toMatchObject({
      classification: 'degenerate_lower',
      confidence: 'high_confidence',
      proposedDisplayName: 'Valentina Villa',
      hasHumanCorrection: false,
      latestApplicationId: 'happ-1'
    })

    // UPPER degenerado preserva diacríticos al proponer.
    expect(byId.get('prof-upper')).toMatchObject({
      classification: 'degenerate_upper',
      proposedDisplayName: 'María José Pérez'
    })

    // Bien formado y no latino: sin propuesta (no hay nada que proponer / la policy no adivina).
    expect(byId.get('prof-ok')?.proposedDisplayName).toBeNull()
    expect(byId.get('prof-cjk')).toMatchObject({
      classification: 'non_latin',
      confidence: 'needs_review',
      proposedDisplayName: null
    })
  })

  it('excluye del universo remediable a quien tiene corrección humana previa (SIEMPRE gana)', async () => {
    const report = await detectDegenerateCandidateNames()

    const corrected = report.findings.find(finding => finding.profileId === 'prof-corrected')

    expect(corrected?.hasHumanCorrection).toBe(true)
    expect(corrected && isRemediableFinding(corrected)).toBe(false)

    // Remediables = degenerados con propuesta y SIN corrección humana (lower + upper).
    expect(report.remediableCount).toBe(2)
    expect(report.excludedByHumanCorrectionCount).toBe(1)
    expect(report.findings.filter(isRemediableFinding).map(finding => finding.profileId)).toEqual([
      'prof-lower',
      'prof-upper'
    ])
  })

  it('acota el barrido a profileIds cuando se pasan (re-verificación de allowlist)', async () => {
    runQuery.mockResolvedValue([CORPUS[0]])

    await detectDegenerateCandidateNames({ profileIds: ['prof-lower'] })

    const [sql, params] = runQuery.mock.calls[0] as [string, unknown[]]

    expect(sql).toContain('ip.profile_id = ANY($1::text[])')
    expect(params).toEqual([['prof-lower']])
  })
})
