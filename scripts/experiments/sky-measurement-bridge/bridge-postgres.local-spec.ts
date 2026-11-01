import { createConnection } from 'node:net'

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Only provider and transport I/O replaced: PG pool, domain commands/readers and SQL are real.
const transport = vi.hoisted(() => ({ publish: vi.fn(), services: vi.fn() }))

vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: transport.publish }))
vi.mock('@/lib/integrations/hubspot-greenhouse-service', () => ({ getHubSpotGreenhouseCompanyServices: transport.services }))

import { closeGreenhousePostgres, runGreenhousePostgresQuery as query, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { getSessionFromPostgresByUserId } from '@/lib/tenant/identity-store'
import { resolveFinanceClientContext } from '@/lib/finance/canonical'
import { resolveAccountScope } from '@/lib/account-360/resolve-scope'
import { getSpaceNotionSource, getSpaceNotionSourceByClientId } from '@/lib/space-notion/space-notion-store'
import { upsertServiceFromHubSpot } from '@/lib/services/upsert-service-from-hubspot'
import { syncServicesForCompany } from '@/lib/services/service-sync'
import { HUBSPOT_STAGE_ID_TO_GREENHOUSE } from '@/lib/services/service-lifecycle-mapper'
import { instantiateClientForParty } from '@/lib/commercial/party/commands/instantiate-client-for-party'
import { upsertInsightEvidenceSnapshot, sealInsightEvidenceSnapshot, getInsightEvidenceSnapshotByEdition } from '@/lib/efeonce-insights/stores/snapshot-store'

const activeStage = Object.entries(HUBSPOT_STAGE_ID_TO_GREENHOUSE).find(([, value]) => value.stage === 'active')![0]
const properties = { hs_name: 'Synthetic Blog', hs_pipeline_stage: activeStage, ef_linea_de_servicio: 'wave', ef_servicio_especifico: 'seo' }

beforeAll(async () => {
  const [row] = await query<{ local: boolean; database: string; role: string; superuser: boolean }>(`
    SELECT inet_server_addr() IS NULL AS local, current_database() AS database, current_user AS role,
      (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS superuser`)

  expect(row).toEqual({ local: true, database: 'sky_bridge_test', role: 'sky_test_app', superuser: false })
})
afterAll(async () => { await closeGreenhousePostgres() })

describe('isolation of this harness (not product authorization)', () => {
  it('OS denies IP sockets, including localhost; only owned UNIX PG is used', async () => {
    const code = await new Promise<string>(resolve => {
      const socket = createConnection({ host: '127.0.0.1', port: 9 })

      socket.once('error', error => resolve((error as NodeJS.ErrnoException).code ?? 'unknown'))
      socket.once('connect', () => { socket.destroy(); resolve('CONNECTED') })
    })

    expect(['EPERM', 'EACCES']).toContain(code)
  })
})

describe.each(['A-prime', 'B'] as const)('current real components with bridge %s', variant => {
  const seoClient = variant === 'A-prime' ? 'client-seo' : 'client-owner'
  const seoSpace = { space_id: 'space-seo', client_id: seoClient, organization_id: 'org-sky' }
  const designSpace = { space_id: 'space-design', client_id: 'client-owner', organization_id: 'org-sky' }

  beforeEach(async () => {
    transport.publish.mockReset()
    transport.services.mockReset()
    await query(`TRUNCATE greenhouse_core.organizations, greenhouse_core.clients,
      greenhouse_core.spaces, greenhouse_core.client_users, greenhouse_core.person_memberships,
      greenhouse_core.roles, greenhouse_core.user_role_assignments, greenhouse_core.client_feature_flags,
      greenhouse_core.service_modules, greenhouse_core.v_client_active_modules,
      greenhouse_finance.client_profiles, greenhouse_core.services, greenhouse_core.space_notion_sources CASCADE`)
    await query(`INSERT INTO greenhouse_core.organizations(organization_id,organization_name,hubspot_company_id)
      VALUES ('org-sky','Synthetic SKY','company-sky'),('org-control','Control','company-control');
      INSERT INTO greenhouse_core.clients(client_id,client_name,hubspot_company_id)
      VALUES ('client-owner','Commercial SKY','company-sky'),('client-seo','Operating candidate',null),('client-control','Control','company-control');`)
    await query(`INSERT INTO greenhouse_core.spaces(space_id,client_id,organization_id,updated_at)
      VALUES ('space-design','client-owner','org-sky','2026-01-01'),('space-seo',$1,'org-sky','2026-02-01'),
        ('space-control','client-control','org-control','2026-01-01')`, [seoClient])
    await query(`INSERT INTO greenhouse_finance.client_profiles(client_profile_id,client_id,organization_id,hubspot_company_id)
      VALUES ('profile-owner','client-owner','org-sky','company-sky');
      INSERT INTO greenhouse_core.client_users(user_id,email,client_id,identity_profile_id)
      VALUES ('user-both','synthetic@example.invalid','client-owner','person-both');
      INSERT INTO greenhouse_core.person_memberships(membership_id,profile_id,space_id,organization_id,is_primary)
      VALUES ('grant-design','person-both','space-design','org-sky',true),('grant-seo','person-both','space-seo','org-sky',false);
      INSERT INTO greenhouse_core.roles VALUES ('client_manager',ARRAY['client']);
      INSERT INTO greenhouse_core.user_role_assignments(user_id,role_code) VALUES ('user-both','client_manager');
      INSERT INTO greenhouse_core.service_modules VALUES ('module-design','design',null),('module-seo','seo',null);
      INSERT INTO greenhouse_core.v_client_active_modules VALUES ('client-owner','module-design','design');
      INSERT INTO greenhouse_core.space_notion_sources(source_id,space_id,notion_db_proyectos)
      VALUES ('source-design','space-design','db-design'),('source-seo','space-seo','db-seo');`)
    await query(`INSERT INTO greenhouse_core.v_client_active_modules VALUES ($1,'module-seo','seo')`, [seoClient])
  })

  it('characterizes actual session_360 default and module loading, rather than a modeled selector', async () => {
    const session = await getSessionFromPostgresByUserId('user-both')

    expect(session?.space_id).toBe(variant === 'A-prime' ? 'space-design' : 'space-seo')
    expect(session?.service_modules.sort()).toEqual(variant === 'A-prime' ? ['design'] : ['design', 'seo'])
    expect(session?.client_id).toBe('client-owner')
  })

  it('characterizes metadata changing the implicit default only for shared-client B', async () => {
    const before = await getSessionFromPostgresByUserId('user-both')

    await query(`UPDATE greenhouse_core.spaces SET updated_at='2026-03-01' WHERE space_id='space-design'`)
    const after = await getSessionFromPostgresByUserId('user-both')

    expect(after?.space_id).toBe('space-design')
    expect(before?.space_id === after?.space_id).toBe(variant === 'A-prime')
  })

  it('characterizes revoking memberships not revoking the bridge-derived session', async () => {
    await query(`UPDATE greenhouse_core.person_memberships SET active=false WHERE profile_id='person-both'`)
    const session = await getSessionFromPostgresByUserId('user-both')

    expect(session?.space_id).toBe(variant === 'A-prime' ? 'space-design' : 'space-seo')
    expect(session?.active).toBe(true)
  })

  it('preserves the existing Finance owner despite newer SEO metadata', async () => {
    const finance = await resolveFinanceClientContext({ organizationId: 'org-sky' })

    expect(finance.clientId).toBe('client-owner')
    expect(finance.clientProfileId).toBe('profile-owner')
    expect(finance.organizationId).toBe('org-sky')
    // Scope selection remains a separate concern, even when the owner is correct.
    expect(finance.spaceId).toBe('space-seo')
  })

  it('characterizes incomplete Finance context choosing the most recent bridge', async () => {
    await query(`DELETE FROM greenhouse_finance.client_profiles WHERE client_profile_id='profile-owner'`)
    const finance = await resolveFinanceClientContext({ organizationId: 'org-sky' })

    expect(finance.clientId).toBe(seoClient)
    expect(finance.spaceId).toBe('space-seo')
  })

  it('rejects a genuinely conflicting profile/client and leaves the profile unchanged', async () => {
    await expect(resolveFinanceClientContext({ clientProfileId: 'profile-owner', clientId: 'client-control' })).rejects.toThrow()
    expect((await query(`SELECT client_id FROM greenhouse_finance.client_profiles WHERE client_profile_id='profile-owner'`))[0]?.client_id).toBe('client-owner')
  })

  it('real commercial instantiation guard rejects another client, without adding a financial profile', async () => {
    await expect(instantiateClientForParty({ organizationId: 'org-sky', triggerEntity: { type: 'manual', id: 'synthetic' },
      actor: { userId: 'synthetic-operator', reason: 'local test' } })).rejects.toMatchObject({ code: 'ORGANIZATION_ALREADY_HAS_CLIENT' })
    expect(await query(`SELECT client_profile_id FROM greenhouse_finance.client_profiles`)).toEqual([{ client_profile_id: 'profile-owner' }])
    expect(await query(`SELECT count(*)::int AS count FROM greenhouse_core.clients`)).toEqual([{ count: 3 }])
  })

  it('characterizes Account360 aggregating both Spaces while excluding the control organization', async () => {
    const scope = await resolveAccountScope('org-sky')

    expect(scope?.spaceIds.sort()).toEqual(['space-design', 'space-seo'])
    expect(scope?.clientIds.sort()).toEqual(variant === 'A-prime' ? ['client-owner', 'client-seo'] : ['client-owner'])
    expect((await resolveAccountScope('org-control'))?.spaceIds).toEqual(['space-control'])
  })

  it('contrasts explicit Notion Space selection with cardinality hidden by client LIMIT 1', async () => {
    expect((await getSpaceNotionSource('space-seo'))?.notionDbProyectos).toBe('db-seo')

    const candidates = await query(`SELECT s.space_id FROM greenhouse_core.space_notion_sources n
      JOIN greenhouse_core.spaces s ON s.space_id=n.space_id WHERE s.client_id=$1 AND s.active AND n.sync_enabled`, [seoClient])

    expect(candidates).toHaveLength(variant === 'A-prime' ? 1 : 2)
    const selected = await getSpaceNotionSourceByClientId(seoClient)

    expect(candidates.map(row => row.space_id)).toContain(selected?.spaceId)
    // No ORDER BY: intentionally do not assert which arbitrary B candidate wins.
  })

  it('characterizes a canonical service replay preserving its ID but overwriting ownership', async () => {
    const first = await upsertServiceFromHubSpot({ hubspotServiceId: 'synthetic-blog', hubspotCompanyId: 'company-sky', space: seoSpace, properties, source: 'local' })
    const second = await upsertServiceFromHubSpot({ hubspotServiceId: 'synthetic-blog', hubspotCompanyId: 'company-sky', space: designSpace, properties, source: 'local-replay' })

    expect(first.action).toBe('created'); expect(second.action).toBe('updated')
    const rows = await query(`SELECT service_id,space_id FROM greenhouse_core.services`)

    expect(rows).toEqual([{ service_id: first.serviceId, space_id: 'space-design' }])
    expect(second.lifecycleChanged).toBe(false)
  })

  it('exercises the real cron adapter contract mismatch after a valid inbound upsert', async () => {
    await upsertServiceFromHubSpot({ hubspotServiceId: 'synthetic-blog', hubspotCompanyId: 'company-sky', space: seoSpace, properties, source: 'local-intake' })
    transport.services.mockResolvedValue({ services: [{ identity: { hubspotServiceId: 'synthetic-blog', name: 'Synthetic Blog' },
      classification: { lineaDeServicio: 'wave', servicioEspecifico: 'seo' },
      financial: {}, dates: {}, references: {} }] })
    await syncServicesForCompany('company-sky')
    const [row] = await query(`SELECT active,unmapped_reason,hubspot_company_id FROM greenhouse_core.services WHERE hubspot_service_id='synthetic-blog'`)

    expect(row?.active).toBe(false)
    expect(row?.unmapped_reason).toBe('unknown_pipeline_stage')
    expect(['client-owner', seoClient]).toContain(row?.hubspot_company_id)
  })

  it('verifies the real PG transaction helper rolls back a partial replay on error', async () => {
    await expect(withGreenhousePostgresTransaction(async client => {
      await client.query(`UPDATE greenhouse_finance.client_profiles SET client_id='client-seo' WHERE client_profile_id='profile-owner'`)
      throw new Error('injected-before-commit')
    })).rejects.toThrow('injected-before-commit')
    expect((await query(`SELECT client_id FROM greenhouse_finance.client_profiles WHERE client_profile_id='profile-owner'`))[0]?.client_id).toBe('client-owner')
    expect((await resolveAccountScope('org-control'))?.spaceIds).toEqual(['space-control'])
  })

  it('real snapshot store and migration triggers preserve sealed evidence through metadata changes and attempted rewrites', async () => {
    await query(`INSERT INTO greenhouse_insights.insight_editions VALUES ('edition-history') ON CONFLICT DO NOTHING`)

    const snapshot = await withGreenhousePostgresTransaction(async client => {
      const created = await upsertInsightEvidenceSnapshot(client, { organizationId: 'org-sky', editionId: 'edition-history',
        content: { facts: [], sources: [], rejections: [] } })


return sealInsightEvidenceSnapshot(client, { organizationId: 'org-sky', snapshotId: created.snapshotId })
    })

    expect(snapshot.snapshotHash).toMatch(/^[0-9a-f]{64}$/)
    await query(`UPDATE greenhouse_core.spaces SET updated_at=now() WHERE space_id='space-seo'`)
    await expect(withGreenhousePostgresTransaction(client => upsertInsightEvidenceSnapshot(client, {
      organizationId: 'org-sky', editionId: 'edition-history', content: { facts: [], sources: [], rejections: [] }
    }))).rejects.toThrow()
    await expect(query(`UPDATE greenhouse_insights.insight_evidence_snapshots SET facts_json='[]' WHERE snapshot_id=$1`, [snapshot.snapshotId])).rejects.toMatchObject({ code: '23514' })
    await expect(query(`DELETE FROM greenhouse_insights.insight_evidence_snapshots WHERE snapshot_id=$1`, [snapshot.snapshotId])).rejects.toMatchObject({ code: '23514' })
    expect((await getInsightEvidenceSnapshotByEdition(undefined, 'org-sky', 'edition-history'))?.snapshotHash).toBe(snapshot.snapshotHash)
    expect(await getInsightEvidenceSnapshotByEdition(undefined, 'org-control', 'edition-history')).toBeNull()
  })
})
