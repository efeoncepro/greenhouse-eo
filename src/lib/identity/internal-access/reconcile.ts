/** Current-time reconciliation of the pre-population pilot. Never fabricates historic creation events. */
import { withTransaction } from '@/lib/db'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { appendAudit } from '../external-access/authority-transactions'
import { InternalAccessError, type InternalAccessCommandDependencies } from './commands'

export const reconcileInternalAuthority = async (
  input: { bindingId: string; actorId: string; reason: string; dryRun?: boolean },
  deps: InternalAccessCommandDependencies
) => {
  if (
    !input.actorId?.trim() ||
    !input.bindingId?.trim() ||
    (input.reason?.trim().length ?? 0) < 10 ||
    input.reason.length > 2000
  )
    throw new InternalAccessError('invalid_request')
  if (
    !(await deps.authorize(input.actorId, 'identity.internal_access.enroll')) ||
    !(await deps.authorize(input.actorId, 'identity.internal_access.grant'))
  )
    throw new InternalAccessError('forbidden')
  
return withTransaction(async client => {
    const lookup = await client.query<{ environment_id: string }>(
      `SELECT environment_id FROM greenhouse_core.external_organization_bindings WHERE binding_id=$1`,
      [input.bindingId]
    )

    if (!lookup.rows[0]) throw new InternalAccessError('not_found')
    await client.query(
      `SELECT environment_id FROM greenhouse_core.external_identity_environments WHERE environment_id=$1 FOR UPDATE`,
      [lookup.rows[0].environment_id]
    )

    const { rows: bindings } = await client.query<{
      binding_id: string
      organization_id: string
      environment_id: string
      grants_version: string | number
      status: string
    }>(
      `SELECT b.* FROM greenhouse_core.external_organization_bindings b JOIN greenhouse_core.organizations o ON o.organization_id=b.organization_id
       WHERE b.binding_id=$1 AND b.population='internal' AND o.public_id='EO-ORG-0007' AND o.is_operating_entity=TRUE FOR UPDATE OF b`,
      [input.bindingId]
    )

    const binding = bindings[0]

    if (bindings.length !== 1) throw new InternalAccessError('ineligible')

    const { rows: enrollments } = await client.query<{ enrollment_id: string; profile_id: string }>(
      `SELECT e.enrollment_id,e.profile_id FROM greenhouse_core.internal_native_enrollments e
       JOIN greenhouse_core.identity_profile_source_links n ON n.link_id=e.native_link_id AND n.profile_id=e.profile_id
         AND n.source_system='external_idp:'||e.environment_id AND n.source_object_type='subject'
       JOIN greenhouse_core.identity_profile_source_links u ON u.link_id=e.upstream_link_id AND u.profile_id=e.profile_id
         AND u.source_system='azure_ad' AND u.source_object_type='user' AND lower(u.source_object_id)=e.object_id::text
       WHERE e.binding_id=$1 AND e.environment_id=$2 FOR UPDATE OF e`,
      [input.bindingId, binding.environment_id]
    )

    if (!enrollments.length) throw new InternalAccessError('ineligible')

    const { rows: allEnrollments } = await client.query(
      `SELECT enrollment_id FROM greenhouse_core.internal_native_enrollments WHERE binding_id=$1`,
      [input.bindingId]
    )

    if (allEnrollments.length !== enrollments.length) throw new InternalAccessError('conflict')

    const { rows: invitations } = await client.query(
      `SELECT invitation_id FROM greenhouse_core.external_member_invitations WHERE binding_id=$1`,
      [input.bindingId]
    )

    if (invitations.length) throw new InternalAccessError('conflict')

    const { rows: grants } = await client.query<{
      grant_id: string
      profile_id: string | null
      capability: string
      status: string
      expires_at: Date | null
    }>(
      `SELECT grant_id,profile_id,capability,status,expires_at FROM greenhouse_core.external_capability_grants WHERE binding_id=$1 FOR UPDATE`,
      [input.bindingId]
    )

    const { rows: original } = await client.query<{
      audit_id: string
      event_type: string
      enrollment_id: string
      metadata_json: { grantId?: string }
    }>(
      `SELECT audit_id,event_type,enrollment_id,metadata_json FROM greenhouse_core.internal_native_access_audit WHERE enrollment_id=ANY($1::text[]) ORDER BY created_at,audit_id`,
      [enrollments.map(e => e.enrollment_id)]
    )

    for (const e of enrollments)
      if (!original.some(a => a.enrollment_id === e.enrollment_id && a.event_type === 'enrolled'))
        throw new InternalAccessError('conflict')
    for (const g of grants)
      if (
        !g.profile_id ||
        !enrollments.some(e => e.profile_id === g.profile_id) ||
        !original.some(
          a =>
            a.event_type === 'capability_granted' &&
            a.metadata_json.grantId === g.grant_id &&
            enrollments.some(e => e.enrollment_id === a.enrollment_id && e.profile_id === g.profile_id)
        )
      )
        throw new InternalAccessError('conflict')

    const { rows: previous } = await client.query<{
      event_type: string
      grant_id: string | null
      metadata_json?: { population?: unknown; reconciliationVersion?: unknown }
    }>(
      `SELECT event_type,grant_id,metadata_json FROM greenhouse_core.external_identity_audit_log WHERE binding_id=$1 AND outcome='applied'
       AND (event_type IN ('organization_bound','capability_granted') OR (event_type IN ('binding_reconciled','grant_reconciled') AND metadata_json @> '{"population":"internal","reconciliationVersion":1}'::jsonb))`,
      [input.bindingId]
    )

    const canonicalPrevious = previous.filter(
      a =>
        a.event_type === 'organization_bound' ||
        a.event_type === 'capability_granted' ||
        (a.metadata_json?.population === 'internal' && a.metadata_json.reconciliationVersion === 1)
    )

    const missingBinding = !canonicalPrevious.some(
      a => a.event_type === 'organization_bound' || a.event_type === 'binding_reconciled'
    )

    const missingGrants = grants.filter(
      g =>
        !canonicalPrevious.some(
          a =>
            a.grant_id === g.grant_id && (a.event_type === 'capability_granted' || a.event_type === 'grant_reconciled')
        )
    )

    const planned = {
      bindingRecords: missingBinding ? 1 : 0,
      grantRecords: missingGrants.length,
      grantsVersion: Number(binding.grants_version)
    }

    if (input.dryRun !== false) return { applied: false, ...planned }

    const common = {
      environmentId: binding.environment_id,
      bindingId: input.bindingId,
      organizationId: binding.organization_id,
      performedBy: input.actorId,
      reason: input.reason
    }

    const metadata = {
      population: 'internal',
      reconciliationVersion: 1,
      grantsVersion: Number(binding.grants_version),
      originalInternalAuditIds: original.map(a => a.audit_id)
    }

    if (missingBinding) {
      await appendAudit(client, {
        ...common,
        eventType: 'binding_reconciled',
        metadata: { ...metadata, status: binding.status }
      })
      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.externalIdentityBinding,
          aggregateId: input.bindingId,
          eventType: EVENT_TYPES.externalBindingReconciled,
          payload: {
            schemaVersion: 1,
            changedByUserId: input.actorId,
            bindingId: input.bindingId,
            environmentId: binding.environment_id,
            organizationId: binding.organization_id,
            ...metadata
          }
        },
        client
      )
    }

    for (const g of missingGrants) {
      await appendAudit(client, {
        ...common,
        eventType: 'grant_reconciled',
        grantId: g.grant_id,
        profileId: g.profile_id,
        metadata: {
          ...metadata,
          status: g.status,
          capability: g.capability,
          expiresAt: g.expires_at?.toISOString() ?? null
        }
      })
      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.externalIdentityBinding,
          aggregateId: input.bindingId,
          eventType: EVENT_TYPES.externalGrantReconciled,
          payload: {
            schemaVersion: 1,
            changedByUserId: input.actorId,
            bindingId: input.bindingId,
            grantId: g.grant_id,
            environmentId: binding.environment_id,
            organizationId: binding.organization_id,
            ...metadata
          }
        },
        client
      )
    }

    
return { applied: missingBinding || missingGrants.length > 0, ...planned }
  })
}
