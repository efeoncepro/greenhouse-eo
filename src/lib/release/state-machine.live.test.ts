import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { RELEASE_STATES } from './state-machine'

/**
 * TASK-851 — State machine TS↔SQL live parity test.
 *
 * Lee la CHECK constraint canonica `release_manifests_state_canonical_check`
 * de `pg_constraint` y verifica que el enum TS `RELEASE_STATES` matchea
 * EXACTAMENTE los valores aceptados por la DB.
 *
 * Si la migration agrega/quita un estado sin actualizar el TS, este test
 * rompe build hasta que el TS se sincronice.
 *
 * Skipea automaticamente cuando no hay DB conectada (CI sin pg:connect, lint
 * runs, etc.) — la unit test `state-machine.test.ts` cubre el contrato TS-only.
 */

const requiresLiveDb = (): boolean => {
  return Boolean(
    process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME ||
      process.env.GREENHOUSE_POSTGRES_HOST
  )
}

describe.runIf(requiresLiveDb())('state machine TS↔SQL parity (live DB)', () => {
  type QueryFn = <T>(sql: string, params?: unknown[]) => Promise<T[]>

  let runQuery: QueryFn | null = null

  beforeAll(async () => {
    const { query } = await import('@/lib/db')

    runQuery = query as QueryFn
  })

  afterAll(() => {
    runQuery = null
  })

  it('CHECK constraint accepts exactly the 8 canonical states', async () => {
    if (!runQuery) throw new Error('runQuery not initialized')

    const rows = await runQuery<{ src: string }>(
      `SELECT pg_get_constraintdef(oid) AS src
         FROM pg_constraint
         WHERE conname = 'release_manifests_state_canonical_check'`,
      []
    )

    expect(rows.length).toBeGreaterThan(0)

    const src = rows[0]?.src ?? ''

    for (const state of RELEASE_STATES) {
      expect(src).toContain(`'${state}'`)
    }

    const stateMatches = src.match(/'([a-z_]+)'/g) ?? []
    const dbStates = new Set(stateMatches.map(s => s.replace(/'/g, '')))

    expect(dbStates.size).toBe(RELEASE_STATES.length)

    for (const state of RELEASE_STATES) {
      expect(dbStates.has(state)).toBe(true)
    }
  })
})

describe.skipIf(requiresLiveDb())('state machine TS↔SQL parity (skipped — no DB)', () => {
  it('skipped because GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME is not set', () => {
    expect(true).toBe(true)
  })
})
