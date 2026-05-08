import { describe, expect, it } from 'vitest'

import { query, withTransaction } from '@/lib/db'

/**
 * TASK-838 Fase 4 — Live FK enforcement smoke test.
 *
 * Verifica que las constraints FK creadas por migración
 * 20260508115742046_task-838-fk-grants-to-capabilities-registry.sql
 * realmente bloquean inserts con capability inexistente en
 * `capabilities_registry`.
 *
 * Skip cuando no hay PG config (CI sin proxy, lint-only).
 */
const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

describe.skipIf(!hasPgConfig)('TASK-838 Fase 4 — FK enforcement live PG check', () => {
  it('rejects role_entitlement_defaults insert with capability NOT in registry', async () => {
    let fkViolated = false

    try {
      await withTransaction(async client => {
        await client.query(
          `INSERT INTO greenhouse_core.role_entitlement_defaults
             (default_id, space_id, role_code, capability, action, scope, effect, created_by, updated_by)
           VALUES
             ('task-838-test-zombie', 'space-test', 'efeonce_admin', 'organization.zombie_inexistente', 'read', 'tenant', 'grant', 'test-user', 'test-user')`
        )
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      if (/foreign key/i.test(message) || /violates foreign key/i.test(message)) {
        fkViolated = true
      } else {
        throw error
      }
    }

    expect(fkViolated, 'FK constraint should reject unknown capability').toBe(true)
  })

  it('accepts role_entitlement_defaults insert with capability IN registry (rollback in tx)', async () => {
    let inserted = false

    await withTransaction(async client => {
      const result = await client.query<{ default_id: string }>(
        `INSERT INTO greenhouse_core.role_entitlement_defaults
           (default_id, space_id, role_code, capability, action, scope, effect, created_by, updated_by)
         VALUES
           ('task-838-test-ok-' || gen_random_uuid()::text, 'space-test', 'efeonce_admin', 'organization.identity', 'read', 'tenant', 'grant', 'test-user', 'test-user')
         RETURNING default_id`
      )

      inserted = Boolean(result.rows[0]?.default_id)
      // Rollback intencional — no queremos persistir test data.
      throw new Error('rollback')
    }).catch(err => {
      if (!(err instanceof Error) || err.message !== 'rollback') throw err
    })

    expect(inserted, 'insert with valid capability should succeed pre-rollback').toBe(true)
  })

  it('confirms both FK constraints exist + are validated in pg_constraint', async () => {
    const rows = await query<{ conname: string; convalidated: boolean }>(`
      SELECT conname, convalidated
      FROM pg_constraint
      WHERE conname IN (
        'role_entitlement_defaults_capability_fk',
        'user_entitlement_overrides_capability_fk'
      )
        AND contype = 'f'
      ORDER BY conname
    `)

    expect(rows).toHaveLength(2)
    expect(rows[0].convalidated).toBe(true)
    expect(rows[1].convalidated).toBe(true)
  })
})
