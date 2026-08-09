import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  query: vi.fn()
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({
  query: mocks.query
}))

import { readLastReleasedRelease } from './last-released-reader'

/**
 * TASK-1676 / ISSUE-145 — El ancla del diff de release.
 *
 * El SQL además se ejercitó contra PG real (2026-08-09): devolvió
 * `e048ef3a47e9…` para `main` y `null` para `develop`, que no tiene manifests.
 * Los mocks de acá fijan el CONTRATO de la query; sólo la corrida contra PG
 * prueba que el SQL corre — por eso se hacen las dos cosas.
 */

beforeEach(() => {
  mocks.query.mockReset()
})

describe('readLastReleasedRelease', () => {
  it('filtra por estado released en el SQL, no en el caller', async () => {
    mocks.query.mockResolvedValue([])

    await readLastReleasedRelease({ targetBranch: 'main' })

    const [sql, params] = mocks.query.mock.calls[0] as [string, unknown[]]

    // El filtro por estado es load-bearing: `listRecentReleases` NO filtra, y en
    // este repo conviven dos manifests con el mismo target_sha, uno `aborted` y
    // uno `released`. Sin este WHERE, el ancla puede caer en el abortado.
    expect(sql).toContain("state = 'released'")
    expect(sql).toContain('ORDER BY started_at DESC')
    expect(sql).toContain('LIMIT 1')
    expect(params).toEqual(['main'])
  })

  it('devuelve el SHA, el release id y la fecha del último release desplegado', async () => {
    mocks.query.mockResolvedValue([
      {
        release_id: 'e048ef3a47e9-678ee642',
        target_sha: 'e048ef3a47e98aac1048ec36dc3c300d1042f146',
        started_at: new Date('2026-08-09T01:00:32.526Z')
      }
    ])

    await expect(readLastReleasedRelease({ targetBranch: 'main' })).resolves.toEqual({
      targetSha: 'e048ef3a47e98aac1048ec36dc3c300d1042f146',
      releaseId: 'e048ef3a47e9-678ee642',
      startedAt: '2026-08-09T01:00:32.526Z'
    })
  })

  it('normaliza started_at venga como Date o como string', async () => {
    mocks.query.mockResolvedValue([
      {
        release_id: 'r1',
        target_sha: 'a'.repeat(40),
        started_at: '2026-08-09T01:00:32.526Z'
      }
    ])

    const result = await readLastReleasedRelease({ targetBranch: 'main' })

    expect(result?.startedAt).toBe('2026-08-09T01:00:32.526Z')
  })

  it('sin releases para la rama devuelve null, no lanza', async () => {
    mocks.query.mockResolvedValue([])

    // Caso real: hoy los 75 manifests son de `main`; un preflight exploratorio
    // sobre `develop` cae acá.
    await expect(readLastReleasedRelease({ targetBranch: 'develop' })).resolves.toBeNull()
  })

  it('respeta la rama pedida', async () => {
    mocks.query.mockResolvedValue([])

    await readLastReleasedRelease({ targetBranch: 'develop' })

    expect(mocks.query.mock.calls[0]?.[1]).toEqual(['develop'])
  })
})
