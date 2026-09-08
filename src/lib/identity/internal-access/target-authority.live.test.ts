/** Actual canonical SQL against transaction-owned TEMP fixtures. No shared identity or customer is mutated. */
import { describe, expect, it } from 'vitest'

import { getGreenhousePostgresPool, type query } from '@/lib/db'
import { server } from '@/mocks/node'
import { readInternalTargetAuthority } from './target-authority'

const hasPgConfig = Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME || process.env.GREENHOUSE_POSTGRES_HOST)
const capability = 'growth.seo.observation.read'

describe.skipIf(!hasPgConfig)('TASK-1844 canonical target SQL — temporary PostgreSQL fixtures', () => {
  it('covers A/B allow, C deny, role/assignment dates, overrides, multiple spaces and discovery pagination', async () => {
    server.close()
    const client = await (await getGreenhousePostgresPool()).connect()

    const tables = ['client_users','roles','user_role_assignments','role_view_assignments','view_registry','user_view_overrides',
      'user_permission_set_assignments','permission_sets','capabilities_registry','role_entitlement_defaults','user_entitlement_overrides',
      'organizations','spaces','client_team_assignments']

    let queue = Promise.resolve()

    const readQuery: typeof query = async (sql, values) => {
      const operation = queue.then(async () => (await client.query(sql.replaceAll('greenhouse_core.', 'pg_temp.'), values)).rows)

      queue = operation.then(() => undefined, () => undefined)

      return operation
    }

    const target = (organizationId: string) => readInternalTargetAuthority('task1844-profile', { intent: 'target', organizationId, capability }, { readQuery })
    const list = (limit = 20, afterOrganizationId?: string) => readInternalTargetAuthority('task1844-profile', { intent: 'organizations', limit, afterOrganizationId }, { readQuery })

    try {
      await client.query('BEGIN')
      await client.query("SET LOCAL statement_timeout='10s'")
      await client.query(tables.map(table => `CREATE TEMP TABLE ${table} ON COMMIT DROP AS SELECT * FROM greenhouse_core.${table} WITH NO DATA`).join(';'))
      await client.query(`
        INSERT INTO pg_temp.client_users (user_id,identity_profile_id,member_id,tenant_type,active,status)
          VALUES ('task1844-user','task1844-profile','task1844-member','efeonce_internal',TRUE,'active');
        INSERT INTO pg_temp.roles (role_code,tenant_type) VALUES ('efeonce_account','efeonce_internal'),('efeonce_admin','efeonce_internal');
        INSERT INTO pg_temp.user_role_assignments (user_id,role_code,active,status,effective_from)
          VALUES ('task1844-user','efeonce_account',TRUE,'active',now()-interval '1 hour');
        INSERT INTO pg_temp.capabilities_registry (capability_key) VALUES ('growth.seo.observation.read');
        INSERT INTO pg_temp.organizations (organization_id,organization_name,active,status)
          VALUES ('org-A','Example A',TRUE,'active'),('org-B','Example B',TRUE,'active'),('org-C','HIDDEN',TRUE,'active');
        INSERT INTO pg_temp.spaces (space_id,organization_id,client_id,active,status)
          VALUES ('space-A','org-A','client-A',TRUE,'active'),('space-B','org-B','client-B',TRUE,'active'),('space-C','org-C','client-C',TRUE,'active');
        INSERT INTO pg_temp.client_team_assignments (assignment_id,member_id,client_id,active,start_date)
          VALUES ('assignment-A','task1844-member','client-A',TRUE,CURRENT_DATE),('assignment-B','task1844-member','client-B',TRUE,CURRENT_DATE);
      `)
      for (const id of ['org-A','org-B']) expect(await target(id)).toMatchObject({ outcome: 'resolved', targets: [{ organizationId: id }] })
      expect(await target('org-C')).toEqual({ outcome: 'denied' })
      await client.query(`INSERT INTO pg_temp.role_entitlement_defaults (space_id,role_code,capability,action,scope,effect)
        VALUES ('space-A','efeonce_account','growth.seo.observation.read','read','tenant','revoke')`)
      expect(await target('org-A')).toEqual({ outcome: 'denied' })
      await client.query(`INSERT INTO pg_temp.user_entitlement_overrides (space_id,user_id,capability,action,scope,effect,approval_status)
        VALUES ('space-A','task1844-user','growth.seo.observation.read','read','tenant','grant','approved')`)
      expect(await target('org-A')).toMatchObject({ outcome: 'resolved' })
      await client.query('DELETE FROM pg_temp.role_entitlement_defaults; DELETE FROM pg_temp.user_entitlement_overrides')
      const first = await list(1)

      expect(first).toMatchObject({ outcome: 'resolved', targets: [{ organizationId: 'org-A' }], nextAfterOrganizationId: 'org-A' })
      expect(await list(1,'org-A')).toMatchObject({ outcome: 'resolved', targets: [{ organizationId: 'org-B' }], nextAfterOrganizationId: null })
      expect(JSON.stringify(await list())).not.toContain('HIDDEN')
      await client.query("UPDATE pg_temp.client_team_assignments SET active=FALSE WHERE client_id='client-B'")
      expect(await target('org-B')).toEqual({ outcome: 'denied' })
      expect(await list(1,'org-B')).toEqual({ outcome: 'denied' })
      expect(await target('org-A')).toMatchObject({ outcome: 'resolved' })
      await client.query("UPDATE pg_temp.client_team_assignments SET active=TRUE,start_date=CURRENT_DATE+1 WHERE client_id='client-B'")
      expect(await target('org-B')).toEqual({ outcome: 'denied' })
      await client.query("UPDATE pg_temp.client_team_assignments SET start_date=CURRENT_DATE,end_date=CURRENT_DATE-1 WHERE client_id='client-B'")
      expect(await target('org-B')).toEqual({ outcome: 'denied' })
      await client.query("UPDATE pg_temp.user_role_assignments SET effective_from=now()+interval '1 day'")
      expect(await target('org-A')).toEqual({ outcome: 'denied' })
      await client.query("UPDATE pg_temp.user_role_assignments SET effective_from=now()-interval '1 day',effective_to=now()-interval '1 second'")
      expect(await target('org-A')).toEqual({ outcome: 'denied' })
      await client.query("UPDATE pg_temp.user_role_assignments SET effective_to=NULL")
      await client.query(`INSERT INTO pg_temp.user_entitlement_overrides (space_id,user_id,capability,action,scope,effect,approval_status,expires_at)
        VALUES ('space-A','task1844-user','growth.seo.observation.read','read','tenant','revoke','approved',now()+interval '1 hour')`)
      expect(await target('org-A')).toEqual({ outcome: 'denied' })
      await client.query("UPDATE pg_temp.user_entitlement_overrides SET approval_status='pending_approval'")
      expect(await target('org-A')).toMatchObject({ outcome: 'resolved' })
      await client.query("UPDATE pg_temp.user_entitlement_overrides SET approval_status='approved',expires_at=now()-interval '1 second'")
      expect(await target('org-A')).toMatchObject({ outcome: 'resolved' })
      await client.query("INSERT INTO pg_temp.spaces (space_id,organization_id,client_id,active,status) VALUES ('space-A2','org-A','client-C',TRUE,'active')")
      expect(await target('org-A')).toEqual({ outcome: 'denied' })
      await client.query("UPDATE pg_temp.user_role_assignments SET role_code='efeonce_admin'")
      expect(await target('org-C')).toMatchObject({ outcome: 'resolved' })
      await client.query(`INSERT INTO pg_temp.user_entitlement_overrides (space_id,user_id,capability,action,scope,effect,approval_status)
        VALUES ('__platform__','task1844-user','organization.identity','read','all','revoke','approved')`)
      expect(await target('org-C')).toEqual({ outcome: 'denied' })
      await client.query("UPDATE pg_temp.client_users SET active=FALSE")
      expect(await list()).toEqual({ outcome: 'denied' })
    } finally {
      await client.query('ROLLBACK')
      client.release()
    }
  }, 90000)
})
