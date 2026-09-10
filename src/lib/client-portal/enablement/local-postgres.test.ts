import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as EnablementAccess from './access'

/** Real PostgreSQL tests, explicitly opt-in to a private UNIX socket. Never uses Cloud SQL. */

import { closeGreenhousePostgres, getDb, query } from '@/lib/db'
import { enableClientPortalModule } from '@/lib/client-portal/commands/enable-module'
import { pauseClientPortalModule, resumeClientPortalModule } from '@/lib/client-portal/commands/pause-resume'
import { resolveOrganizationCanonicalBusinessLines } from '@/lib/client-portal/commands/resolve-org-business-line'

import { applyServiceEnablement, rollbackServiceEnablement } from './commands'
import { previewServiceEnablement } from './reader'

vi.mock('./access', async original => ({
  ...await original<typeof EnablementAccess>(),
  // Only authentication is substituted here; SQL, locks, readers, commands, audit and outbox are real.
  authorizeServiceEnablement: vi.fn(async (userId: string) => ({ userId }))
}))

const socket = process.env.TASK1852_LOCAL_PG_SOCKET
const request = { organizationId: 'org-a', targets: [{ serviceId: 'service-a', moduleKey: 'module-a' }], personIds: ['person-a'] }

const input = async (idempotencyKey = 'apply-key-a') => ({ proposal: request,
  fingerprint: (await previewServiceEnablement(request)).fingerprint, idempotencyKey })

const counts = async () => (await query<{ assignments: number; audit: number; outbox: number; commands: number }>(`
  SELECT (SELECT count(*)::int FROM greenhouse_client_portal.module_assignments) assignments,
  (SELECT count(*)::int FROM greenhouse_client_portal.module_assignment_events) audit,
  (SELECT count(*)::int FROM greenhouse_sync.outbox_events) outbox,
  (SELECT count(*)::int FROM greenhouse_core.api_platform_command_executions) commands`))[0]

describe.skipIf(!socket)('TASK-1852 private PostgreSQL integration', () => {
  beforeAll(async () => {
    if (!socket?.startsWith('/') || !socket.endsWith('/.captures/task-1852/pg-socket')) {
      throw new Error('Only the TASK-1852 private local socket is allowed')
    }

    for (const [key, value] of Object.entries({
      GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME: '', GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF: '',
      GREENHOUSE_POSTGRES_PASSWORD: 'local-test-only', GREENHOUSE_POSTGRES_SSL: 'false',
      GREENHOUSE_POSTGRES_HOST: socket, GREENHOUSE_POSTGRES_PORT: '55452',
      GREENHOUSE_POSTGRES_DATABASE: 'task_1852_test', GREENHOUSE_POSTGRES_USER: process.env.USER ?? '',
      CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED: 'true'
    })) vi.stubEnv(key, value)

    await closeGreenhousePostgres()
    const [server] = await query<{ local: boolean; database: string }>('SELECT inet_server_addr() IS NULL AS local, current_database() AS database')

    if (!server.local || server.database !== 'task_1852_test') throw new Error('Refusing a non-local test database')

    await query(`
      CREATE SCHEMA IF NOT EXISTS greenhouse_core;
      CREATE SCHEMA IF NOT EXISTS greenhouse_client_portal;
      CREATE SCHEMA IF NOT EXISTS greenhouse_commercial;
      CREATE SCHEMA IF NOT EXISTS greenhouse_serving;
      CREATE SCHEMA IF NOT EXISTS greenhouse_notifications;
      CREATE SCHEMA IF NOT EXISTS greenhouse_growth;
      CREATE SCHEMA IF NOT EXISTS greenhouse_sync;
      CREATE TABLE IF NOT EXISTS greenhouse_core.organizations(organization_id text PRIMARY KEY, active boolean NOT NULL DEFAULT true);
      CREATE TABLE IF NOT EXISTS greenhouse_core.spaces(space_id text PRIMARY KEY, organization_id text REFERENCES greenhouse_core.organizations, client_id text, active boolean DEFAULT true);
      CREATE TABLE IF NOT EXISTS greenhouse_core.service_modules(module_id text PRIMARY KEY, module_code text, module_kind text);
      CREATE TABLE IF NOT EXISTS greenhouse_core.client_service_modules(client_id text, module_id text REFERENCES greenhouse_core.service_modules, active boolean);
      CREATE TABLE IF NOT EXISTS greenhouse_core.services(service_id text PRIMARY KEY, organization_id text REFERENCES greenhouse_core.organizations, space_id text, active boolean, status text, start_date date, target_end_date date);
      CREATE TABLE IF NOT EXISTS greenhouse_commercial.engagement_commercial_terms(terms_id text PRIMARY KEY, service_id text REFERENCES greenhouse_core.services, bundled_modules text[], effective_from date, effective_to date);
      CREATE TABLE IF NOT EXISTS greenhouse_client_portal.modules(module_key text PRIMARY KEY, applicability_scope text, tier text, effective_from date, effective_to date, view_codes text[], data_sources text[]);
      CREATE TABLE IF NOT EXISTS greenhouse_client_portal.module_assignments(
        assignment_id text PRIMARY KEY, organization_id text REFERENCES greenhouse_core.organizations, module_key text REFERENCES greenhouse_client_portal.modules,
        status text, source text, source_ref_json jsonb DEFAULT '{}', metadata_json jsonb DEFAULT '{}', effective_from date, effective_to date,
        expires_at timestamptz, approved_by_user_id text, approved_at timestamptz, updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
        CHECK(effective_to > effective_from), CHECK(status <> 'pilot' OR expires_at IS NOT NULL));
      CREATE UNIQUE INDEX IF NOT EXISTS module_assignments_one_active ON greenhouse_client_portal.module_assignments(organization_id,module_key) WHERE effective_to IS NULL;
      CREATE TABLE IF NOT EXISTS greenhouse_client_portal.module_assignment_events(event_id text PRIMARY KEY, assignment_id text REFERENCES greenhouse_client_portal.module_assignments,
        event_kind text, from_status text, to_status text, payload_json jsonb, actor_user_id text, occurred_at timestamptz);
      CREATE TABLE IF NOT EXISTS greenhouse_sync.outbox_events(event_id text PRIMARY KEY, aggregate_type text, aggregate_id text, event_type text, payload_json jsonb, status text, occurred_at timestamptz);
      CREATE TABLE IF NOT EXISTS greenhouse_core.client_users(user_id text PRIMARY KEY, email text, email_undeliverable boolean, microsoft_oid text);
      CREATE TABLE IF NOT EXISTS greenhouse_serving.session_360(user_id text, organization_id text, active boolean, status text, identity_profile_id text, last_login_at timestamptz, tenant_type text);
      CREATE TABLE IF NOT EXISTS greenhouse_core.user_view_overrides(user_id text, view_code text, override_type text, expires_at timestamptz);
      CREATE TABLE IF NOT EXISTS greenhouse_notifications.notification_preferences(user_id text, category text, email_enabled boolean, in_app_enabled boolean, muted_until timestamptz);
      CREATE TABLE IF NOT EXISTS greenhouse_core.notion_workspaces(space_id text PRIMARY KEY, client_id text);
      CREATE TABLE IF NOT EXISTS greenhouse_core.notion_workspace_source_bindings(binding_id text PRIMARY KEY, space_id text, source_object_id text, active boolean);
      CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_targets(seo_target_id text, organization_id text, status text, root_domain text);
      CREATE TABLE IF NOT EXISTS greenhouse_core.teams_notification_channels(channel_code text, channel_kind text, provisioning_status text, disabled_at timestamptz, space_id text, recipient_user_id text);
      CREATE TABLE IF NOT EXISTS greenhouse_core.api_platform_command_executions(command_execution_id text PRIMARY KEY, lane text, principal_kind text, principal_id text, consumer_id text,
        app_session_id text, user_id text, route_key text, request_method text, request_path text, greenhouse_scope_type text, organization_id text, client_id text, space_id text,
        idempotency_key text, request_fingerprint text, status text, expires_at timestamptz, response_status int, response_body jsonb, error_code text, completed_at timestamptz,
        updated_at timestamptz DEFAULT CURRENT_TIMESTAMP, replay_count int DEFAULT 0);
      CREATE UNIQUE INDEX IF NOT EXISTS api_command_key ON greenhouse_core.api_platform_command_executions(principal_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
    `)
  })

  beforeEach(async () => {
    await query(`TRUNCATE greenhouse_core.organizations, greenhouse_core.spaces, greenhouse_core.service_modules,
      greenhouse_core.client_service_modules, greenhouse_core.services, greenhouse_commercial.engagement_commercial_terms,
      greenhouse_client_portal.modules, greenhouse_client_portal.module_assignments, greenhouse_client_portal.module_assignment_events,
      greenhouse_sync.outbox_events, greenhouse_core.client_users, greenhouse_serving.session_360, greenhouse_core.user_view_overrides,
      greenhouse_notifications.notification_preferences, greenhouse_core.notion_workspaces, greenhouse_core.notion_workspace_source_bindings,
      greenhouse_growth.seo_targets, greenhouse_core.teams_notification_channels, greenhouse_core.api_platform_command_executions;
      DROP TRIGGER IF EXISTS fail_outbox ON greenhouse_sync.outbox_events;
      DROP TRIGGER IF EXISTS fail_receipt ON greenhouse_core.api_platform_command_executions;
      INSERT INTO greenhouse_core.organizations VALUES ('org-a',true),('org-b',true);
      INSERT INTO greenhouse_core.spaces VALUES ('space-a','org-a','client-a',true),('space-b','org-b','client-b',true);
      INSERT INTO greenhouse_core.service_modules VALUES ('id-globe','globe','business_line'),('id-wave','wave','business_line');
      INSERT INTO greenhouse_core.client_service_modules VALUES ('client-a','id-globe',true),('client-b','id-wave',true);
      INSERT INTO greenhouse_core.services VALUES ('service-a','org-a','space-a',true,'active','2026-01-01',null),('service-b','org-b','space-b',true,'active','2026-01-01',null);
      INSERT INTO greenhouse_commercial.engagement_commercial_terms VALUES ('terms-a','service-a',ARRAY['module-a','module-second'],'2026-01-01',null),('terms-b','service-b',ARRAY['module-b'],'2026-01-01',null);
      INSERT INTO greenhouse_client_portal.modules VALUES ('module-a','globe','standard','2026-01-01',null,ARRAY['cliente.proyectos'],ARRAY['delivery']),
        ('module-second','globe','standard','2026-01-01',null,ARRAY['cliente.reviews'],ARRAY['delivery']),
        ('module-b','wave','standard','2026-01-01',null,ARRAY['cliente.growth_seo_dashboard'],ARRAY['growth']);
      INSERT INTO greenhouse_core.client_users VALUES ('person-a','a@example.invalid',false,'graph-a'),('person-b','b@example.invalid',false,'graph-b');
      INSERT INTO greenhouse_serving.session_360 VALUES ('person-a','org-a',true,'active','identity-a',CURRENT_TIMESTAMP,'client'),('person-b','org-b',true,'active','identity-b',CURRENT_TIMESTAMP,'client');
      INSERT INTO greenhouse_core.notion_workspaces VALUES ('notion-a','client-a'),('notion-b','client-b');
      INSERT INTO greenhouse_core.notion_workspace_source_bindings VALUES ('binding-a','notion-a','database-a',true),('binding-b','notion-b','database-b',true);
      INSERT INTO greenhouse_core.teams_notification_channels VALUES ('channel-a','bot','ready',null,null,'graph-a'),('channel-b','bot','ready',null,'notion-b',null);
    `)
  })

  afterAll(async () => { await closeGreenhousePostgres(); vi.unstubAllEnvs() })

  it('executes the FK join, isolates two organizations and resolves the Notion and Graph bridges', async () => {
    const db = await getDb()

    expect(await resolveOrganizationCanonicalBusinessLines('org-a', db)).toEqual(['globe'])
    expect(await resolveOrganizationCanonicalBusinessLines('org-b', db)).toEqual(['wave'])
    const before = await counts()
    const preview = await previewServiceEnablement(request)

    expect(preview.canApply).toBe(true)
    expect(preview.inventory.services.map(item => item.id)).toEqual(['service-a'])
    expect(preview.inventory.sources.map(item => item.id)).toEqual(['binding-a'])
    expect(preview.inventory.channels.map(item => item.id)).toEqual(['channel-a'])
    expect(await counts()).toEqual(before)
  })

  it('rejects foreign service/person references and never manufactures commercial evidence', async () => {
    const preview = await previewServiceEnablement({ ...request, targets: [{ moduleKey: 'module-b', serviceId: 'service-b' }], personIds: ['person-b'] })

    expect(preview.canApply).toBe(false)
    expect(preview.blockers.map(item => item.code)).toContain('person_not_authorized_in_organization')
    expect(preview.blockers.map(item => item.code)).toContain('commercial_mapping_unresolved')
    expect(preview.inventory.people).toEqual([])
  })

  it('serializes duplicate legacy enables without duplicate audit/outbox', async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => enableClientPortalModule({
      organizationId: 'org-a', moduleKey: 'module-a', source: 'manual_admin', effectiveFrom: '2026-09-09', approvedByUserId: 'admin'
    })))

    expect(results.filter(item => !item.idempotent)).toHaveLength(1)
    expect(await counts()).toMatchObject({ assignments: 1, audit: 1, outbox: 1 })
  })

  it('replays concurrent apply and a retry after the caller loses the response', async () => {
    const command = await input()
    const [first, second] = await Promise.all([applyServiceEnablement(command, 'admin'), applyServiceEnablement(command, 'admin')])

    expect(first.data).toEqual(second.data)
    expect([first.replayed, second.replayed].sort()).toEqual([false, true])
    expect((await applyServiceEnablement(command, 'admin')).data).toEqual(first.data)
    expect(await counts()).toEqual({ assignments: 1, audit: 2, outbox: 1, commands: 1 })
    await expect(applyServiceEnablement({ ...command, proposal: { ...request, personIds: [] } }, 'admin')).rejects.toMatchObject({ statusCode: 409, errorCode: 'idempotency_conflict' })
  })

  it('rejects drift since preview without claiming a command or applying any changes', async () => {
    const command = await input()

    await query("UPDATE greenhouse_core.services SET active=false WHERE service_id='service-a'")
    await expect(applyServiceEnablement(command, 'admin')).rejects.toMatchObject({ statusCode: 409, errorCode: 'service_enablement_preview_stale' })
    expect(await counts()).toEqual({ assignments: 0, audit: 0, outbox: 0, commands: 0 })
  })

  it('rolls back assignments, audit and claim when an outbox write fails', async () => {
    const command = await input()

    await query(`CREATE OR REPLACE FUNCTION greenhouse_sync.fail_test_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture failure'; END $$;
      CREATE TRIGGER fail_outbox BEFORE INSERT ON greenhouse_sync.outbox_events FOR EACH ROW EXECUTE FUNCTION greenhouse_sync.fail_test_outbox();`)
    await expect(applyServiceEnablement(command, 'admin')).rejects.toThrow('fixture failure')
    expect(await counts()).toEqual({ assignments: 0, audit: 0, outbox: 0, commands: 0 })
    await query('DROP TRIGGER fail_outbox ON greenhouse_sync.outbox_events')
    expect((await applyServiceEnablement(command, 'admin')).data.created).toHaveLength(1)
  })

  it('rolls back business effects if persisting the final response fails, then retries safely', async () => {
    const command = await input()

    await query(`CREATE OR REPLACE FUNCTION greenhouse_core.fail_test_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'response persistence failure'; END $$;
      CREATE TRIGGER fail_receipt BEFORE UPDATE ON greenhouse_core.api_platform_command_executions FOR EACH ROW EXECUTE FUNCTION greenhouse_core.fail_test_receipt();`)
    await expect(applyServiceEnablement(command, 'admin')).rejects.toThrow('response persistence failure')
    expect(await counts()).toEqual({ assignments: 0, audit: 0, outbox: 0, commands: 0 })
    await query('DROP TRIGGER fail_receipt ON greenhouse_core.api_platform_command_executions')
    expect((await applyServiceEnablement(command, 'admin')).data.created).toHaveLength(1)
  })

  it('rejects an invited recipient as invitation pending (never as a non-member) and predicts no access', async () => {
    await query("UPDATE greenhouse_serving.session_360 SET status='invited' WHERE user_id='person-a'")
    const preview = await previewServiceEnablement(request)

    expect(preview.canApply).toBe(false)
    expect(preview.blockers).toContainEqual({ code: 'person_invitation_pending', subject: 'person-a', owner: 'Identity' })
    expect(preview.blockers.filter(item => item.subject === 'person-a')).toHaveLength(1)
    expect(preview.people[0].views[0]).toMatchObject({ before: false, after: false })

    // A person who is not a member of the organization at all is still a different blocker.
    const stranger = await previewServiceEnablement({ ...request, personIds: ['person-a', 'person-nobody'] })

    expect(stranger.blockers).toContainEqual({ code: 'person_not_authorized_in_organization', subject: 'person-nobody', owner: 'Identity' })
  })

  it('compensates only owned assignments on the same day and replays compensation', async () => {
    const previous = await enableClientPortalModule({ organizationId: 'org-a', moduleKey: 'module-second', source: 'manual_admin', effectiveFrom: '2026-01-01', approvedByUserId: 'other-admin' })
    const proposal = { ...request, targets: [...request.targets, { serviceId: 'service-a', moduleKey: 'module-second' }] }
    const applied = await applyServiceEnablement({ proposal, fingerprint: (await previewServiceEnablement(proposal)).fingerprint, idempotencyKey: 'mixed-key' }, 'admin')
    const rollback = { organizationId: 'org-a', operationId: applied.data.operationId, idempotencyKey: 'rollback-key' }
    const result = await rollbackServiceEnablement(rollback, 'admin')

    expect(result.data.paused).toEqual(applied.data.created.map(item => item.assignmentId))
    expect((await rollbackServiceEnablement(rollback, 'admin')).replayed).toBe(true)
    const rows = await query<{ assignment_id: string; status: string }>('SELECT assignment_id,status FROM greenhouse_client_portal.module_assignments')

    expect(rows.find(row => row.assignment_id === previous.assignmentId)?.status).toBe('active')
    expect(rows.find(row => row.assignment_id !== previous.assignmentId)?.status).toBe('paused')
    await expect(rollbackServiceEnablement({ ...rollback, organizationId: 'org-b', idempotencyKey: 'other-org-key' }, 'admin')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejects compensation after another actor paused and resumed the assignment', async () => {
    const applied = await applyServiceEnablement(await input(), 'admin')
    const assignmentId = applied.data.created[0].assignmentId

    await pauseClientPortalModule({ assignmentId, actorUserId: 'other-admin' })
    await resumeClientPortalModule({ assignmentId, actorUserId: 'other-admin' })
    await expect(rollbackServiceEnablement({ organizationId: 'org-a', operationId: applied.data.operationId, idempotencyKey: 'rollback-key' }, 'admin')).rejects.toMatchObject({ statusCode: 409, errorCode: 'service_enablement_compensation_conflict' })
    expect(await counts()).toMatchObject({ audit: 4, outbox: 3, commands: 1 })
  })

  it('keeps the compensation receipt after transport idempotency cleanup', async () => {
    const applied = await applyServiceEnablement(await input(), 'admin')

    await query('DELETE FROM greenhouse_core.api_platform_command_executions')
    const rollback = await rollbackServiceEnablement({ organizationId: 'org-a', operationId: applied.data.operationId, idempotencyKey: 'retained-receipt' }, 'admin')

    expect(rollback.data.paused).toEqual(applied.data.created.map(item => item.assignmentId))
  })

  it('respects person revocations in both current and proposed visibility', async () => {
    await query("INSERT INTO greenhouse_core.user_view_overrides VALUES ('person-a','cliente.proyectos','revoke',null)")
    const preview = await previewServiceEnablement(request)

    expect(preview.people[0].views).toEqual([{ viewCode: 'cliente.proyectos', before: false, after: false }])
    const before = preview.fingerprint

    await query("UPDATE greenhouse_core.user_view_overrides SET expires_at='2026-01-01'")
    const after = await previewServiceEnablement(request)

    expect(after.people[0].views[0].after).toBe(true)
    expect(after.fingerprint).not.toBe(before)
  })

  it('fails the entire multi-module batch when the second outbox write fails', async () => {
    const proposal = { ...request, targets: [...request.targets, { serviceId: 'service-a', moduleKey: 'module-second' }] }
    const fingerprint = (await previewServiceEnablement(proposal)).fingerprint

    await query(`CREATE OR REPLACE FUNCTION greenhouse_sync.fail_test_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.payload_json->>'moduleKey' = 'module-second' THEN RAISE EXCEPTION 'second module failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER fail_outbox BEFORE INSERT ON greenhouse_sync.outbox_events FOR EACH ROW EXECUTE FUNCTION greenhouse_sync.fail_test_outbox();`)
    await expect(applyServiceEnablement({ proposal, fingerprint, idempotencyKey: 'batch-key' }, 'admin')).rejects.toThrow('second module failure')
    expect(await counts()).toEqual({ assignments: 0, audit: 0, outbox: 0, commands: 0 })
  })

  it('does not interpret missing contracts or failed reads as a valid empty inventory', async () => {
    await query('DELETE FROM greenhouse_commercial.engagement_commercial_terms')
    const preview = await previewServiceEnablement(request)

    expect(preview.canApply).toBe(false)
    expect(preview.blockers.map(item => item.code)).toContain('commercial_mapping_unresolved')
    await query('ALTER TABLE greenhouse_core.services RENAME TO services_unavailable')

    try {
      await expect(previewServiceEnablement(request)).rejects.toThrow()
    } finally {
      await query('ALTER TABLE greenhouse_core.services_unavailable RENAME TO services')
    }
  })
})
