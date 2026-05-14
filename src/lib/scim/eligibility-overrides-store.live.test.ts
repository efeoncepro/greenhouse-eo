import { afterAll, describe, expect, it } from 'vitest'

import { query } from '@/lib/db'

import {
  ScimEligibilityOverrideValidationError,
  createScimEligibilityOverride,
  getScimEligibilityOverrideById,
  listActiveOverridesForTenantMapping,
  listAllOverridesForTenantMapping,
  supersedeScimEligibilityOverride
} from './eligibility-overrides-store'

/**
 * Live PG test — usa el real scim-tm-efeonce tenant mapping. Runtime user
 * tiene SELECT/INSERT/UPDATE en overrides (NO DELETE), por diseño canónico.
 *
 * Cleanup strategy: supersede via UPDATE (runtime CAN do) con effective_to.
 * Test data permanece para audit history (intentional — canonical pattern).
 *
 * Match values usan suffix único por test-run para evitar colisiones UNIQUE.
 */
const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) || Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

const MAPPING_ID = 'scim-tm-efeonce'
const TEST_RUN_ID = `t872-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const TEST_EMAIL_PREFIX = `${TEST_RUN_ID}-`

const createdOverrideIds: string[] = []

const trackCreated = <T extends { overrideId: string }>(row: T): T => {
  createdOverrideIds.push(row.overrideId)
  
return row
}

const cleanupViaSupersede = async () => {
  for (const id of createdOverrideIds) {
    try {
      await supersedeScimEligibilityOverride({ overrideId: id, actorUserId: 'test-cleanup' })
    } catch {
      // best-effort; idempotent
    }
  }
}

describe.skipIf(!hasPgConfig)('scim_eligibility_overrides store — live PG', () => {
  afterAll(async () => {
    await cleanupViaSupersede()
  })

  describe('createScimEligibilityOverride', () => {
    it('inserts row + audit change atomically + normalizes match_value lowercase', async () => {
      const email = `${TEST_EMAIL_PREFIX}create@efeoncepro.com`

      const row = trackCreated(
        await createScimEligibilityOverride({
          scimTenantMappingId: MAPPING_ID,
          matchType: 'email',
          matchValue: email.toUpperCase(), // input uppercase
          effect: 'allow',
          reason: 'Test create — Q3 2026 promo testing eligibility override',
          grantedBy: 'admin-test-001'
        })
      )

      expect(row.overrideId).toMatch(/^scim-override-/)
      expect(row.matchValue).toBe(email) // normalized to lowercase
      expect(row.effect).toBe('allow')
      expect(row.effectiveTo).toBeNull()

      const changeRows = await query<{ change_kind: string; actor_user_id: string }>(
        `SELECT change_kind, actor_user_id FROM greenhouse_core.scim_eligibility_override_changes
         WHERE override_id = $1`,
        [row.overrideId]
      )

      expect(changeRows).toHaveLength(1)
      expect(changeRows[0].change_kind).toBe('created')
      expect(changeRows[0].actor_user_id).toBe('admin-test-001')
    })

    it('rejects reason < 20 chars (ScimEligibilityOverrideValidationError)', async () => {
      await expect(
        createScimEligibilityOverride({
          scimTenantMappingId: MAPPING_ID,
          matchType: 'email',
          matchValue: `${TEST_EMAIL_PREFIX}short-reason@efeoncepro.com`,
          effect: 'deny',
          reason: 'too short',
          grantedBy: 'admin-test-001'
        })
      ).rejects.toThrow(ScimEligibilityOverrideValidationError)
    })

    it('rejects empty grantedBy', async () => {
      await expect(
        createScimEligibilityOverride({
          scimTenantMappingId: MAPPING_ID,
          matchType: 'email',
          matchValue: `${TEST_EMAIL_PREFIX}empty-actor@efeoncepro.com`,
          effect: 'deny',
          reason: 'Reason longer than twenty chars please',
          grantedBy: ''
        })
      ).rejects.toThrow(ScimEligibilityOverrideValidationError)
    })

    it('rejects duplicate active (UNIQUE partial) with 409', async () => {
      const email = `${TEST_EMAIL_PREFIX}dup@efeoncepro.com`

      trackCreated(
        await createScimEligibilityOverride({
          scimTenantMappingId: MAPPING_ID,
          matchType: 'email',
          matchValue: email,
          effect: 'allow',
          reason: 'First override — gives temporary access for QA scenario',
          grantedBy: 'admin-test-001'
        })
      )

      try {
        await createScimEligibilityOverride({
          scimTenantMappingId: MAPPING_ID,
          matchType: 'email',
          matchValue: email,
          effect: 'allow',
          reason: 'Second override — duplicate should fail with conflict',
          grantedBy: 'admin-test-001'
        })
        expect.fail('expected duplicate to throw')
      } catch (err) {
        expect(err).toBeInstanceOf(ScimEligibilityOverrideValidationError)
        expect((err as ScimEligibilityOverrideValidationError).statusCode).toBe(409)
      }
    })

    it('allows (allow, deny) simultaneous for same target (UNIQUE partial only collapses same effect)', async () => {
      const email = `${TEST_EMAIL_PREFIX}allow-deny-coexist@efeoncepro.com`

      const allow = trackCreated(
        await createScimEligibilityOverride({
          scimTenantMappingId: MAPPING_ID,
          matchType: 'email',
          matchValue: email,
          effect: 'allow',
          reason: 'Allow override first — testing deny-wins precedence',
          grantedBy: 'admin-test-001'
        })
      )

      const deny = trackCreated(
        await createScimEligibilityOverride({
          scimTenantMappingId: MAPPING_ID,
          matchType: 'email',
          matchValue: email,
          effect: 'deny',
          reason: 'Deny override — should coexist with allow row above',
          grantedBy: 'admin-test-002'
        })
      )

      expect(allow.overrideId).not.toBe(deny.overrideId)

      const active = await listActiveOverridesForTenantMapping(MAPPING_ID)
      const sameTarget = active.filter(o => o.matchValue === email)

      expect(sameTarget).toHaveLength(2)
    })
  })

  describe('supersedeScimEligibilityOverride', () => {
    it('sets effective_to + inserts audit change row', async () => {
      const created = trackCreated(
        await createScimEligibilityOverride({
          scimTenantMappingId: MAPPING_ID,
          matchType: 'email',
          matchValue: `${TEST_EMAIL_PREFIX}to-revoke@efeoncepro.com`,
          effect: 'allow',
          reason: 'Will be revoked shortly — testing supersede flow live',
          grantedBy: 'admin-test-001'
        })
      )

      const superseded = await supersedeScimEligibilityOverride({
        overrideId: created.overrideId,
        actorUserId: 'admin-test-002',
        reason: 'Revoked per security review test'
      })

      expect(superseded).not.toBeNull()
      expect(superseded!.effectiveTo).not.toBeNull()

      const fetched = await getScimEligibilityOverrideById(created.overrideId)

      expect(fetched!.effectiveTo).not.toBeNull()

      const changes = await query<{ change_kind: string; actor_user_id: string }>(
        `SELECT change_kind, actor_user_id FROM greenhouse_core.scim_eligibility_override_changes
         WHERE override_id = $1 ORDER BY occurred_at ASC`,
        [created.overrideId]
      )

      expect(changes).toHaveLength(2)
      expect(changes[0].change_kind).toBe('created')
      expect(changes[1].change_kind).toBe('superseded')
      expect(changes[1].actor_user_id).toBe('admin-test-002')
    })

    it('idempotent: returns null on already-superseded override', async () => {
      const created = trackCreated(
        await createScimEligibilityOverride({
          scimTenantMappingId: MAPPING_ID,
          matchType: 'email',
          matchValue: `${TEST_EMAIL_PREFIX}idempotent@efeoncepro.com`,
          effect: 'allow',
          reason: 'Testing idempotent supersede flow — second call no-op',
          grantedBy: 'admin-test-001'
        })
      )

      await supersedeScimEligibilityOverride({ overrideId: created.overrideId, actorUserId: 'admin-test-001' })

      const second = await supersedeScimEligibilityOverride({
        overrideId: created.overrideId,
        actorUserId: 'admin-test-001',
        reason: 'Should be no-op'
      })

      expect(second).toBeNull()

      const changes = await query<{ change_kind: string }>(
        `SELECT change_kind FROM greenhouse_core.scim_eligibility_override_changes WHERE override_id = $1`,
        [created.overrideId]
      )

      expect(changes).toHaveLength(2)
    })
  })

  describe('audit log append-only trigger', () => {
    it('rejects UPDATE on scim_eligibility_override_changes', async () => {
      const row = trackCreated(
        await createScimEligibilityOverride({
          scimTenantMappingId: MAPPING_ID,
          matchType: 'email',
          matchValue: `${TEST_EMAIL_PREFIX}append-only-update@efeoncepro.com`,
          effect: 'allow',
          reason: 'Testing append-only enforcement on audit log table',
          grantedBy: 'admin-test-001'
        })
      )

      await expect(
        query(
          `UPDATE greenhouse_core.scim_eligibility_override_changes
           SET reason = 'tampered'
           WHERE override_id = $1`,
          [row.overrideId]
        )
      ).rejects.toThrow(/append-only/i)
    })

    it('rejects DELETE on scim_eligibility_override_changes', async () => {
      const row = trackCreated(
        await createScimEligibilityOverride({
          scimTenantMappingId: MAPPING_ID,
          matchType: 'email',
          matchValue: `${TEST_EMAIL_PREFIX}append-only-delete@efeoncepro.com`,
          effect: 'allow',
          reason: 'Testing DELETE rejection on audit table via trigger',
          grantedBy: 'admin-test-001'
        })
      )

      await expect(
        query(`DELETE FROM greenhouse_core.scim_eligibility_override_changes WHERE override_id = $1`, [row.overrideId])
      ).rejects.toThrow(/append-only|permission denied/i)
    })
  })

  describe('listActiveOverridesForTenantMapping', () => {
    it('excludes superseded and expired rows', async () => {
      const activeEmail = `${TEST_EMAIL_PREFIX}list-active@efeoncepro.com`
      const expiredEmail = `${TEST_EMAIL_PREFIX}list-expired@efeoncepro.com`
      const supersededEmail = `${TEST_EMAIL_PREFIX}list-superseded@efeoncepro.com`

      trackCreated(
        await createScimEligibilityOverride({
          scimTenantMappingId: MAPPING_ID,
          matchType: 'email',
          matchValue: activeEmail,
          effect: 'allow',
          reason: 'Active forever — should appear in list filtered view',
          grantedBy: 'admin-test-001'
        })
      )

      trackCreated(
        await createScimEligibilityOverride({
          scimTenantMappingId: MAPPING_ID,
          matchType: 'email',
          matchValue: expiredEmail,
          effect: 'allow',
          reason: 'Expired already — should NOT appear in active list',
          grantedBy: 'admin-test-001',
          expiresAt: '2020-01-01T00:00:00Z'
        })
      )

      const toSupersede = trackCreated(
        await createScimEligibilityOverride({
          scimTenantMappingId: MAPPING_ID,
          matchType: 'email',
          matchValue: supersededEmail,
          effect: 'allow',
          reason: 'Created then immediately superseded for list filter test',
          grantedBy: 'admin-test-001'
        })
      )

      await supersedeScimEligibilityOverride({ overrideId: toSupersede.overrideId, actorUserId: 'admin-test-001' })

      const active = await listActiveOverridesForTenantMapping(MAPPING_ID)
      const values = active.map(o => o.matchValue)

      expect(values).toContain(activeEmail)
      expect(values).not.toContain(expiredEmail)
      expect(values).not.toContain(supersededEmail)
    })
  })

  describe('listAllOverridesForTenantMapping', () => {
    it('returns full history when includeSuperseded + includeExpired', async () => {
      const email = `${TEST_EMAIL_PREFIX}full-history@efeoncepro.com`

      const created = trackCreated(
        await createScimEligibilityOverride({
          scimTenantMappingId: MAPPING_ID,
          matchType: 'email',
          matchValue: email,
          effect: 'deny',
          reason: 'Full history reader test — entry will be superseded',
          grantedBy: 'admin-test-001'
        })
      )

      await supersedeScimEligibilityOverride({ overrideId: created.overrideId, actorUserId: 'admin-test-002' })

      const all = await listAllOverridesForTenantMapping(MAPPING_ID, { includeSuperseded: true, includeExpired: true })

      expect(all.some(r => r.overrideId === created.overrideId && r.effectiveTo !== null)).toBe(true)

      const activeOnly = await listAllOverridesForTenantMapping(MAPPING_ID)

      expect(activeOnly.some(r => r.overrideId === created.overrideId)).toBe(false)
    })
  })
})
