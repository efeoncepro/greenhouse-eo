import 'server-only'

import { sql } from 'kysely'

import { ApiPlatformError } from '@/lib/api-platform/core/errors'

import { resolveOrganizationCanonicalBusinessLines } from '@/lib/client-portal/commands/resolve-org-business-line'
import type { AssignmentTransaction } from '@/lib/client-portal/commands/transaction'
import { getDb } from '@/lib/db'

import type { EnablementInventory, ServiceEnablementRequest, ServiceEnablementReceipt } from './types'
import { serviceEnablementRequestSchema } from './validation'
import { buildServiceEnablementPreview } from './preview'

const iso = (value: Date | string | null): string | null => value === null ? null : new Date(value).toISOString()

/** No external calls and no business writes. All reads share the caller's database snapshot. */
export const readServiceEnablementInventory = async (
  input: ServiceEnablementRequest, tx: AssignmentTransaction
): Promise<EnablementInventory> => {
  const organization = await tx.selectFrom('greenhouse_core.organizations')
    .select(['organization_id', 'active']).where('organization_id', '=', input.organizationId).executeTakeFirst()

  if (!organization) throw new ApiPlatformError('Organization not found.', { statusCode: 404, errorCode: 'not_found' })

  const { rows: clock } = await sql<{ now: Date }>`SELECT CURRENT_TIMESTAMP AS now`.execute(tx)

  const services = await tx.selectFrom('greenhouse_core.services')
    .select(['service_id', 'space_id', 'active', 'status', sql<string | null>`start_date::text`.as('start_date'), sql<string | null>`target_end_date::text`.as('target_end_date')])
    .where('organization_id', '=', input.organizationId).orderBy('service_id').execute()

  const terms = await tx.selectFrom('greenhouse_commercial.engagement_commercial_terms as t')
    .innerJoin('greenhouse_core.services as s', 's.service_id', 't.service_id')
    .select(['t.terms_id', 't.service_id', 't.bundled_modules', sql<string>`t.effective_from::text`.as('effective_from'), sql<string | null>`t.effective_to::text`.as('effective_to')])
    .where('s.organization_id', '=', input.organizationId).orderBy('t.terms_id').execute()

  const assignments = await tx.selectFrom('greenhouse_client_portal.module_assignments as a')
    .select(['a.assignment_id', 'a.module_key', 'a.status', sql<string>`a.effective_from::text`.as('effective_from'), sql<string | null>`a.effective_to::text`.as('effective_to'), 'a.expires_at',
      sql<string>`md5(concat_ws('|', row_to_json(a)::text, (SELECT string_agg(e.event_id, ',' ORDER BY e.event_id)
        FROM greenhouse_client_portal.module_assignment_events e WHERE e.assignment_id = a.assignment_id
          AND e.event_kind <> 'enablement_receipt')))`.as('revision')])
    .where('a.organization_id', '=', input.organizationId).orderBy('a.assignment_id').execute()

  const moduleKeys = [...new Set([...input.targets.map(item => item.moduleKey), ...assignments.map(item => item.module_key)])]

  const modules = await tx.selectFrom('greenhouse_client_portal.modules')
    .select(['module_key', 'applicability_scope', sql<string>`effective_from::text`.as('effective_from'), sql<string | null>`effective_to::text`.as('effective_to'), 'view_codes', 'data_sources'])
    .where('module_key', 'in', moduleKeys).orderBy('module_key').execute()

  const users = input.personIds.length ? await tx.selectFrom('greenhouse_serving.session_360 as s')
    .innerJoin('greenhouse_core.client_users as u', 'u.user_id', 's.user_id')
    .select(['u.user_id', 's.active', 's.status', 's.identity_profile_id', 's.last_login_at', 'u.email_undeliverable',
      sql<boolean>`u.email IS NOT NULL`.as('has_email')])
    .where('s.organization_id', '=', input.organizationId).where('s.tenant_type', '=', 'client')
    .where('u.user_id', 'in', input.personIds).orderBy('u.user_id').execute() : []

  const people: EnablementInventory['people'] = []

  for (const user of users) {
    const revocations = await tx.selectFrom('greenhouse_core.user_view_overrides')
      .select('view_code').where('user_id', '=', user.user_id).where('override_type', '=', 'revoke')
      .where(eb => eb.or([eb('expires_at', 'is', null), eb('expires_at', '>', sql<Date>`CURRENT_TIMESTAMP`)]))
      .orderBy('view_code').execute()

    const preferences = await tx.selectFrom('greenhouse_notifications.notification_preferences')
      .select(['category', 'email_enabled', 'in_app_enabled', 'muted_until'])
      .where('user_id', '=', user.user_id).orderBy('category').execute()

    people.push({ id: user.user_id, active: user.active === true, status: user.status,
      identityLinked: user.identity_profile_id !== null, lastLoginAt: iso(user.last_login_at),
      emailDeliverable: user.has_email && !user.email_undeliverable,
      revokedViewCodes: revocations.map(row => row.view_code),
      preferences: preferences.map(row => ({ category: row.category, email: row.email_enabled,
        inApp: row.in_app_enabled, mutedUntil: iso(row.muted_until) })) })
  }

  // Notion binding.space_id belongs to the workspace namespace; bridge using client_id.
  const notion = await tx.selectFrom('greenhouse_core.spaces as s')
    .innerJoin('greenhouse_core.notion_workspaces as w', 'w.client_id', 's.client_id')
    .innerJoin('greenhouse_core.notion_workspace_source_bindings as b', 'b.space_id', 'w.space_id')
    .select(['b.binding_id', 'b.active', 'b.source_object_id'])
    .where('s.organization_id', '=', input.organizationId).where('s.active', '=', true)
    .orderBy('b.binding_id').execute()

  const seo = await tx.selectFrom('greenhouse_growth.seo_targets')
    .select(['seo_target_id', 'status', 'root_domain']).where('organization_id', '=', input.organizationId)
    .orderBy('seo_target_id').execute()

  const channels = await tx.selectFrom('greenhouse_core.teams_notification_channels as c')
    .select(['c.channel_code', 'c.channel_kind', 'c.provisioning_status', 'c.disabled_at'])
    .where(eb => eb.or([
      eb('c.space_id', 'in', eb.selectFrom('greenhouse_core.spaces').select('space_id').where('organization_id', '=', input.organizationId)),
      eb('c.space_id', 'in', eb.selectFrom('greenhouse_core.spaces as s')
        .innerJoin('greenhouse_core.notion_workspaces as w', 'w.client_id', 's.client_id')
        .select('w.space_id').where('s.organization_id', '=', input.organizationId)),
      // Static Teams recipient_user_id is the Graph id, never the Greenhouse user_id.
      eb('c.recipient_user_id', 'in', eb.selectFrom('greenhouse_core.client_users as u')
        .innerJoin('greenhouse_serving.session_360 as s', 's.user_id', 'u.user_id')
        .select('u.microsoft_oid').where('s.organization_id', '=', input.organizationId)
        .where('u.microsoft_oid', 'is not', null))
    ])).orderBy('c.channel_code').execute()

  return {
    organization: { id: organization.organization_id, active: organization.active },
    observedAt: iso(clock[0].now)!, businessLines: await resolveOrganizationCanonicalBusinessLines(input.organizationId, tx),
    services: services.map(row => ({ id: row.service_id, spaceId: row.space_id, active: row.active, status: row.status, startsAt: row.start_date, endsAt: row.target_end_date })),
    terms: terms.map(row => ({ id: row.terms_id, serviceId: row.service_id, moduleKeys: [...row.bundled_modules ?? []].sort(), startsAt: row.effective_from, endsAt: row.effective_to })),
    modules: modules.map(row => ({ key: row.module_key, scope: row.applicability_scope, startsAt: row.effective_from, endsAt: row.effective_to, viewCodes: [...row.view_codes].sort(), dataSources: [...row.data_sources].sort() })),
    assignments: assignments.map(row => ({ id: row.assignment_id, moduleKey: row.module_key, status: row.status, startsAt: row.effective_from, endsAt: row.effective_to, expiresAt: iso(row.expires_at), revision: row.revision })),
    people, sources: [
      ...notion.map(row => ({ id: row.binding_id, kind: 'notion' as const, active: row.active, reference: row.source_object_id })),
      ...seo.map(row => ({ id: row.seo_target_id, kind: 'seo' as const, active: row.status === 'active', reference: row.root_domain }))
    ],
    channels: channels.map(row => ({ id: row.channel_code, kind: row.channel_kind, provisioningStatus: row.provisioning_status, disabled: row.disabled_at !== null }))
  }
}

export const previewServiceEnablement = async (raw: ServiceEnablementRequest) => {
  const input = serviceEnablementRequestSchema.parse(raw)
  const db = await getDb()

  return db.transaction().setIsolationLevel('repeatable read').execute(async tx => {
    await sql`SET TRANSACTION READ ONLY`.execute(tx)
    await sql`SET LOCAL statement_timeout = '15s'`.execute(tx)

    return buildServiceEnablementPreview(input, await readServiceEnablementInventory(input, tx))
  })
}

/** Server-owned receipt, scoped to the exact organization. No client-supplied assignment list. */
export const readServiceEnablementReceipt = async (organizationId: string, operationId: string, tx?: AssignmentTransaction): Promise<ServiceEnablementReceipt> => {
  const db = tx ?? await getDb()

  const execution = await db.selectFrom('greenhouse_core.api_platform_command_executions')
    .select('response_body').where('command_execution_id', '=', operationId)
    .where('organization_id', '=', organizationId).where('route_key', '=', 'client-services.enablement.apply')
    .where('status', '=', 'completed').executeTakeFirst()

  // The immutable assignment audit survives transport idempotency retention/cleanup.
  const audit = execution ? null : await db.selectFrom('greenhouse_client_portal.module_assignment_events as e')
    .innerJoin('greenhouse_client_portal.module_assignments as a', 'a.assignment_id', 'e.assignment_id')
    .select(sql<ServiceEnablementReceipt>`e.payload_json->'receipt'`.as('receipt'))
    .where('a.organization_id', '=', organizationId).where('e.event_kind', '=', 'enablement_receipt')
    .where(sql<string>`e.payload_json->'receipt'->>'operationId'`, '=', operationId).executeTakeFirst()

  const receipt = (execution?.response_body ?? audit?.receipt) as unknown as ServiceEnablementReceipt | undefined

  if (!receipt) throw new ApiPlatformError('Enablement receipt not found for this organization.', { statusCode: 404, errorCode: 'not_found' })

  return receipt
}
