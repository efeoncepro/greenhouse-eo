import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const query = vi.hoisted(() => vi.fn())

vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: query }))

import { getTalentPoolProfile, searchTalentPool } from './readers'

const row = (id: string, updatedAt: string) => ({
  public_id: id,
  lifecycle_status: 'active_process',
  aggregate_version: 1,
  future_consent_expires_at: null,
  availability: null,
  seniority: null,
  country_code: null,
  full_name: `Candidate ${id}`,
  updated_at: updatedAt
})

describe('Talent Pool cursor contract', () => {
  beforeEach(() => {
    vi.stubEnv('NEXTAUTH_SECRET', 'a'.repeat(64))
    query.mockReset()
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM greenhouse_hiring.talent_pool_membership m') && sql.includes('LIMIT')) {
        return [row('EO-TLP-2', '2026-08-16T10:00:00.000Z'), row('EO-TLP-1', '2026-08-16T09:00:00.000Z')]
      }

      return []
    })
  })

  it('signs and binds pagination to actor, filters, policy and a fixed snapshot', async () => {
    const first = await searchTalentPool({ query: 'content', cursorBinding: 'user-1:client-1', limit: 1 })

    expect(first.nextCursor).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    await expect(
      searchTalentPool({ query: 'content', cursorBinding: 'user-1:client-1', cursor: first.nextCursor!, limit: 1 })
    ).resolves.toBeDefined()
    await expect(
      searchTalentPool({ query: 'account', cursorBinding: 'user-1:client-1', cursor: first.nextCursor!, limit: 1 })
    ).rejects.toMatchObject({ code: 'talent_pool_invalid_cursor' })
    await expect(
      searchTalentPool({ query: 'content', cursorBinding: 'user-2:client-1', cursor: first.nextCursor!, limit: 1 })
    ).rejects.toMatchObject({ code: 'talent_pool_invalid_cursor' })
  })
})

describe('TASK-1748 — filtro de procedencia del Banco de Talento', () => {
  beforeEach(() => {
    vi.stubEnv('NEXTAUTH_SECRET', 'a'.repeat(64))
    query.mockReset()
    query.mockResolvedValue([])
  })

  const sqlOf = (call: number) => String(query.mock.calls[call]?.[0] ?? '')

  it('con el flag ON excluye por PROCEDENCIA, no por ciclo de vida', async () => {
    vi.stubEnv('HIRING_SYNTHETIC_DATA_FILTER_ENABLED', 'true')
    await searchTalentPool({ cursorBinding: 'user-1' })

    // El predicado sale del contrato canonico de data-origin y viaja sobre la PERSONA: la ficha no
    // tiene `data_origin` propio.
    expect(sqlOf(0)).toContain("ip.data_origin = 'real'")

    // Y no reemplaza al filtro de ciclo de vida: son dos preguntas distintas y las dos siguen vivas.
    expect(sqlOf(0)).toContain("m.lifecycle_status IN ('active_process', 'pool_eligible', 'paused')")
  })

  it('con el flag OFF se comporta exactamente como antes', async () => {
    vi.stubEnv('HIRING_SYNTHETIC_DATA_FILTER_ENABLED', 'false')
    await searchTalentPool({ cursorBinding: 'user-1' })
    expect(sqlOf(0)).not.toContain('data_origin')
  })

  it('el opt-in explicito del caller gana sobre el flag, en los dos sentidos', async () => {
    vi.stubEnv('HIRING_SYNTHETIC_DATA_FILTER_ENABLED', 'true')
    await searchTalentPool({ cursorBinding: 'user-1', includeSynthetic: true })
    expect(sqlOf(0)).not.toContain('data_origin')

    query.mockReset()
    query.mockResolvedValue([])
    vi.stubEnv('HIRING_SYNTHETIC_DATA_FILTER_ENABLED', 'false')
    await searchTalentPool({ cursorBinding: 'user-1', includeSynthetic: false })
    expect(sqlOf(0)).toContain("ip.data_origin = 'real'")
  })

  it('el perfil individual aplica el mismo filtro que la busqueda', async () => {
    vi.stubEnv('HIRING_SYNTHETIC_DATA_FILTER_ENABLED', 'true')
    await expect(getTalentPoolProfile('EO-TLP-1')).rejects.toMatchObject({
      code: 'talent_pool_profile_not_found'
    })
    expect(sqlOf(0)).toContain("ip.data_origin = 'real'")
  })

  it('el cursor firma la procedencia: no se continua una pagina con otro filtro', async () => {
    vi.stubEnv('HIRING_SYNTHETIC_DATA_FILTER_ENABLED', 'true')
    query.mockImplementation(async (sql: string) =>
      sql.includes('FROM greenhouse_hiring.talent_pool_membership m') && sql.includes('LIMIT')
        ? [row('EO-TLP-2', '2026-08-16T10:00:00.000Z'), row('EO-TLP-1', '2026-08-16T09:00:00.000Z')]
        : []
    )

    const first = await searchTalentPool({ cursorBinding: 'user-1', limit: 1 })

    expect(first.nextCursor).toBeTruthy()

    // Mismo actor, mismos filtros visibles, distinta procedencia => el cursor deja de ser valido.
    await expect(
      searchTalentPool({ cursorBinding: 'user-1', cursor: first.nextCursor!, limit: 1, includeSynthetic: true })
    ).rejects.toMatchObject({ code: 'talent_pool_invalid_cursor' })
  })
})
