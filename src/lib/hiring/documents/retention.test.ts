import { beforeEach, describe, expect, it, vi } from 'vitest'

const runGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery }))

const { CANDIDATE_DOCUMENT_RETENTION_MONTHS, listOverdueCandidateRetentions, resolveRetentionMonths } = await import(
  './retention'
)

beforeEach(() => {
  vi.clearAllMocks()
  runGreenhousePostgresQuery.mockResolvedValue([])
})

describe('resolveRetentionMonths', () => {
  it('usa la ventana declarada por defecto', () => {
    expect(resolveRetentionMonths(null)).toBe(CANDIDATE_DOCUMENT_RETENTION_MONTHS)
    expect(CANDIDATE_DOCUMENT_RETENTION_MONTHS).toBe(12)
  })

  it('acepta el override explícito por candidato', () => {
    expect(resolveRetentionMonths('retain_months:24')).toBe(24)
    expect(resolveRetentionMonths('  retain_months:6  ')).toBe(6)
  })

  it('ignora políticas que no matchean el formato, en vez de conservar PII para siempre', () => {
    // Un valor basura NUNCA puede traducirse en "retener indefinidamente".
    for (const policy of ['forever', 'retain_months:0', 'retain_months:-5', 'retain_months:abc', '']) {
      expect(resolveRetentionMonths(policy)).toBe(CANDIDATE_DOCUMENT_RETENTION_MONTHS)
    }
  })
})

describe('listOverdueCandidateRetentions', () => {
  it('consulta con la ventana declarada por defecto', async () => {
    await listOverdueCandidateRetentions()

    expect(runGreenhousePostgresQuery.mock.calls[0][1]).toEqual([12])
  })

  it('acepta una ventana explícita', async () => {
    await listOverdueCandidateRetentions(24)

    expect(runGreenhousePostgresQuery.mock.calls[0][1]).toEqual([24])
  })

  it('mapea las filas a la forma de dominio', async () => {
    runGreenhousePostgresQuery.mockResolvedValue([
      {
        candidate_facet_id: 'cndf-1',
        identity_profile_id: 'identity-1',
        reason: 'consent_withdrawn',
        closed_at: '2025-01-10T00:00:00.000Z',
        document_count: 2,
      },
    ])

    expect(await listOverdueCandidateRetentions()).toEqual([
      {
        candidateFacetId: 'cndf-1',
        identityProfileId: 'identity-1',
        reason: 'consent_withdrawn',
        closedAt: '2025-01-10T00:00:00.000Z',
        documentCount: 2,
      },
    ])
  })

  it('propaga el fallo de la query en vez de reportar cero deuda de PII', async () => {
    runGreenhousePostgresQuery.mockRejectedValue(new Error('pg down'))

    await expect(listOverdueCandidateRetentions()).rejects.toThrow('pg down')
  })

  it('no muta nada: este módulo detecta la deuda de PII, no la borra', async () => {
    await listOverdueCandidateRetentions()

    const [sql] = runGreenhousePostgresQuery.mock.calls[0]
    const normalized = String(sql).toUpperCase()

    // Ojo: la query filtra por `status <> 'deleted'`, así que buscar la subcadena
    // "DELETE" da falso positivo. Lo que importa son los verbos de mutación.
    for (const verb of ['DELETE FROM', 'UPDATE ', 'INSERT INTO', 'TRUNCATE']) {
      expect(normalized).not.toContain(verb)
    }
  })
})
