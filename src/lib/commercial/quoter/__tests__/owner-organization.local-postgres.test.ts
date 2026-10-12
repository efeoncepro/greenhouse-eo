// The organization that owns every quote, resolved against the local cluster (TASK-2025, Slice 4).
//
// Runs only through `pnpm quoter:test:local`. Skipped otherwise, and skipped is not green.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Client } from 'pg'

import { QUOTER_OWNER_ORGANIZATION_PUBLIC_ID, resolveQuoterOwnerOrganizationId } from '../authz'
import { isQuoterError } from '../errors'

import { createLocalDatabase, localPgEnabled } from './local-pg'
import type { LocalDatabase } from './local-pg'

describe.skipIf(!localPgEnabled)('the owner of every quote (local cluster)', () => {
  let database: LocalDatabase
  let runtime: Client
  let ops: Client

  const failure = async () => {
    try {
      await resolveQuoterOwnerOrganizationId(runtime)
    } catch (error) {
      return isQuoterError(error) ? error.code : error
    }

    return 'resolved'
  }

  beforeAll(async () => {
    database = await createLocalDatabase()
    runtime = await database.connect('greenhouse_app')
    ops = await database.connect('greenhouse_ops')
  })

  afterAll(async () => database?.drop())

  it('is the row with the public id of Efeonce, and the quoter accepts it as the owner of a quote', async () => {
    const organizationId = await resolveQuoterOwnerOrganizationId(runtime)

    const { rows } = await runtime.query<{ public_id: string; is_operating_entity: boolean }>(
      `SELECT public_id, is_operating_entity FROM greenhouse_core.organizations WHERE organization_id = $1`,
      [organizationId]
    )

    expect(rows).toEqual([{ public_id: QUOTER_OWNER_ORGANIZATION_PUBLIC_ID, is_operating_entity: true }])

    // The database holds the same rule on its side: this row may own a quote.
    await runtime.query(
      `INSERT INTO greenhouse_commercial.quoter_quotes
         (owner_organization_id, data_origin, created_by_actor_kind, created_by_principal_id, command_execution_id)
       VALUES ($1, 'synthetic', 'service', 'owner-test', 'cmd-owner-test')`,
      [organizationId]
    )
  })

  it('fails closed when that row is not the active operating entity, or is not there', async () => {
    const set = (assignment: string) =>
      ops.query(`UPDATE greenhouse_core.organizations SET ${assignment} WHERE public_id = $1`, [QUOTER_OWNER_ORGANIZATION_PUBLIC_ID])

    for (const [broken, restored] of [
      ['is_operating_entity = FALSE', 'is_operating_entity = TRUE'],
      ['active = FALSE', 'active = TRUE'],
      [`status = 'inactive'`, `status = 'active'`],
      [`public_id = 'EO-ORG-MOVED'`, `public_id = '${QUOTER_OWNER_ORGANIZATION_PUBLIC_ID}'`]
    ]) {
      await set(broken)

      try {
        expect(await failure(), broken).toBe('owner_organization_unavailable')
      } finally {
        await ops.query(`UPDATE greenhouse_core.organizations SET ${restored} WHERE organization_name = 'Efeonce (local fixture)'`)
      }
    }

    expect(await failure()).toBe('resolved')
  })
})
