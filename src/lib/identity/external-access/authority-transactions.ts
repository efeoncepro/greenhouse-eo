/** Shared identity authority mutations. Caller owns one transaction and its population-specific authorization. */
import type { PoolClient } from 'pg'

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { buildExternalAuditId } from './ids'
import { ExternalAccessError } from './errors'

export type AuthorityPopulation = 'external' | 'internal'
export type AuthorityBinding = {
  bindingId: string
  environmentId: string
  organizationId: string
  population: AuthorityPopulation
}
export type AuditEventType =
  | 'binding_reconciled'
  | 'grant_reconciled'
  | 'internal_member_linked'
  | 'environment_upserted'
  | 'organization_bound'
  | 'capability_granted'
  | 'invitation_issued'
  | 'invitation_linked'
  | 'binding_revoked'
  | 'grant_revoked'
  | 'member_revoked'
  | 'invitation_revoked'

export type AuditInput = {
  eventType: AuditEventType
  environmentId?: string | null
  bindingId?: string | null
  grantId?: string | null
  invitationId?: string | null
  organizationId?: string | null
  profileId?: string | null
  performedBy: string
  reason?: string | null
  metadata?: Record<string, unknown>
}

export const appendAudit = async (client: PoolClient, input: AuditInput) => {
  await client.query(
    `INSERT INTO greenhouse_core.external_identity_audit_log (
       audit_id, event_type, environment_id, binding_id, grant_id, invitation_id, organization_id,
       profile_id, performed_by, reason, outcome, metadata_json
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'applied', $11::jsonb)`,
    [
      buildExternalAuditId(),
      input.eventType,
      input.environmentId ?? null,
      input.bindingId ?? null,
      input.grantId ?? null,
      input.invitationId ?? null,
      input.organizationId ?? null,
      input.profileId ?? null,
      input.performedBy,
      input.reason ?? null,
      JSON.stringify(input.metadata ?? {})
    ]
  )
}

export const bumpGrantsVersion = async (client: PoolClient, bindingId: string): Promise<number> => {
  const { rows } = await client.query<{ grants_version: number | string }>(
    `UPDATE greenhouse_core.external_organization_bindings
        SET grants_version = grants_version + 1, updated_at = CURRENT_TIMESTAMP
      WHERE binding_id = $1
      RETURNING grants_version`,
    [bindingId]
  )

  return Number(rows[0]?.grants_version ?? 0)
}

export const insertAuthorityBinding = async (
  client: PoolClient,
  input: AuthorityBinding & {
    externalOrganizationRef: string
    actorId: string
    reason: string | null
    designatedAdminProfileId?: string | null
  }
) => {
  await client.query(
    `INSERT INTO greenhouse_core.external_organization_bindings
    (binding_id,organization_id,environment_id,external_organization_ref,population,status,grants_version,reason,bound_by,designated_admin_profile_id)
    VALUES ($1,$2,$3,$4,$5,'active',1,$6,$7,$8)`,
    [
      input.bindingId,
      input.organizationId,
      input.environmentId,
      input.externalOrganizationRef,
      input.population,
      input.reason,
      input.actorId,
      input.designatedAdminProfileId ?? null
    ]
  )
  await appendAudit(client, {
    eventType: 'organization_bound',
    environmentId: input.environmentId,
    bindingId: input.bindingId,
    organizationId: input.organizationId,
    profileId: input.designatedAdminProfileId,
    performedBy: input.actorId,
    reason: input.reason,
    metadata: { population: input.population, externalOrganizationRef: input.externalOrganizationRef, grantsVersion: 1 }
  })
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.externalIdentityBinding,
      aggregateId: input.bindingId,
      eventType: EVENT_TYPES.externalBindingBound,
      payload: {
        schemaVersion: 1,
        bindingId: input.bindingId,
        organizationId: input.organizationId,
        environmentId: input.environmentId,
        population: input.population,
        grantsVersion: 1,
        designatedAdminProfileId: input.designatedAdminProfileId ?? null,
        changedByUserId: input.actorId
      }
    },
    client
  )
}

/** Membership is checked by population within the caller transaction; internal grants never use binding-wide defaults. */
export const insertAuthorityGrant = async (
  client: PoolClient,
  input: AuthorityBinding & {
    grantId: string
    profileId: string | null
    capability: string
    actorId: string
    reason: string | null
    expiresAt?: Date | null
  }
) => {
  await lockAuthorityBinding(client, input)

  const membership =
    input.population === 'internal'
      ? `SELECT enrollment_id AS membership_id FROM greenhouse_core.internal_native_enrollments
       WHERE binding_id=$1 AND profile_id=$2 AND environment_id=$3 AND status='active'`
      : `SELECT invitation_id AS membership_id FROM greenhouse_core.external_member_invitations
       WHERE binding_id=$1 AND profile_id=$2 AND status='linked'`

  if (
    input.population === 'internal' &&
    (!input.profileId || !input.expiresAt || input.expiresAt.getTime() <= Date.now())
  )
    throw new ExternalAccessError('invalid_request', 'internal grants require a person and expiry')

  if (input.profileId) {
    const result = await client.query(
      membership,
      input.population === 'internal'
        ? [input.bindingId, input.profileId, input.environmentId]
        : [input.bindingId, input.profileId]
    )

    if (result.rows.length !== 1) throw new ExternalAccessError('invalid_request', 'authority membership missing')
  }

  await client.query(
    `INSERT INTO greenhouse_core.external_capability_grants
    (grant_id,binding_id,capability,profile_id,status,reason,granted_by,expires_at)
    VALUES ($1,$2,$3,$4,'active',$5,$6,$7)`,
    [
      input.grantId,
      input.bindingId,
      input.capability,
      input.profileId,
      input.reason,
      input.actorId,
      input.expiresAt ?? null
    ]
  )
  const grantsVersion = await bumpGrantsVersion(client, input.bindingId)

  await appendAudit(client, {
    eventType: 'capability_granted',
    environmentId: input.environmentId,
    bindingId: input.bindingId,
    grantId: input.grantId,
    organizationId: input.organizationId,
    profileId: input.profileId,
    performedBy: input.actorId,
    reason: input.reason,
    metadata: {
      population: input.population,
      capability: input.capability,
      grantsVersion,
      expiresAt: input.expiresAt?.toISOString() ?? null
    }
  })
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.externalIdentityBinding,
      aggregateId: input.bindingId,
      eventType: EVENT_TYPES.externalGrantGranted,
      payload: {
        schemaVersion: 1,
        bindingId: input.bindingId,
        grantId: input.grantId,
        organizationId: input.organizationId,
        environmentId: input.environmentId,
        population: input.population,
        capability: input.capability,
        profileId: input.profileId,
        grantsVersion,
        changedByUserId: input.actorId
      }
    },
    client
  )
  
return grantsVersion
}

export const revokeAuthorityGrant = async (
  client: PoolClient,
  input: AuthorityBinding & { grantId: string; profileId: string; capability: string; actorId: string; reason: string }
) => {
  await lockAuthorityBinding(client, input, true)

  const changed = await client.query(
    `UPDATE greenhouse_core.external_capability_grants SET status='revoked',revoked_at=NOW(),revoked_by=$2,revoke_reason=$3,updated_at=NOW()
    WHERE grant_id=$1 AND binding_id=$4 AND profile_id=$5 AND status='active'`,
    [input.grantId, input.actorId, input.reason, input.bindingId, input.profileId]
  )

  if (changed.rowCount !== 1) throw new ExternalAccessError('conflict', 'grant changed concurrently')
  const grantsVersion = await bumpGrantsVersion(client, input.bindingId)

  await appendAudit(client, {
    eventType: 'grant_revoked',
    environmentId: input.environmentId,
    bindingId: input.bindingId,
    grantId: input.grantId,
    organizationId: input.organizationId,
    profileId: input.profileId,
    performedBy: input.actorId,
    reason: input.reason,
    metadata: { population: input.population, capability: input.capability, grantsVersion }
  })
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.externalIdentityBinding,
      aggregateId: input.bindingId,
      eventType: EVENT_TYPES.externalAccessRevoked,
      payload: {
        schemaVersion: 1,
        scope: 'grant',
        bindingId: input.bindingId,
        grantId: input.grantId,
        environmentId: input.environmentId,
        organizationId: input.organizationId,
        population: input.population,
        profileId: input.profileId,
        grantsVersion,
        changedByUserId: input.actorId
      }
    },
    client
  )
}

/** Source namespace is shared; reject cross-population recovery instead of silently replacing corporate provenance. */
export const protectInternalSourceLinks = async (client: PoolClient, environmentId: string, profileId: string) => {
  const result = await client.query(
    `SELECT enrollment_id FROM greenhouse_core.internal_native_enrollments WHERE environment_id=$1 AND profile_id=$2 AND status='active' FOR UPDATE`,
    [environmentId, profileId]
  )

  if (result.rows.length) throw new ExternalAccessError('conflict', 'profile has corporate enrollment')
}

export const insertInternalSourceLink = async (
  client: PoolClient,
  input: AuthorityBinding & { linkId: string; profileId: string; subject: string }
) => {
  if (input.population !== 'internal') throw new ExternalAccessError('invalid_request', 'corporate population required')
  await lockAuthorityBinding(client, input)
  await client.query(
    `INSERT INTO greenhouse_core.identity_profile_source_links
    (link_id,profile_id,source_system,source_object_type,source_object_id,source_user_id,active,is_login_identity)
    VALUES ($1,$2,$3,'subject',$4,$4,TRUE,TRUE)`,
    [input.linkId, input.profileId, `external_idp:${input.environmentId}`, input.subject]
  )
}

export const revokeInternalSourceLink = async (
  client: PoolClient,
  input: {
    linkId: string
    bindingId: string
    enrollmentId: string
    environmentId: string
    profileId: string
    actorId: string
    reason: string
    organizationId: string
  }
) => {
  await lockAuthorityBinding(client, { ...input, population: 'internal' }, true)

  const changed = await client.query(
    `UPDATE greenhouse_core.identity_profile_source_links SET active=FALSE,is_login_identity=FALSE,updated_at=NOW() WHERE link_id=$1`,
    [input.linkId]
  )

  if (changed.rowCount !== 1) throw new ExternalAccessError('conflict', 'source link changed concurrently')
  const grantsVersion = await bumpGrantsVersion(client, input.bindingId)

  await appendAudit(client, {
    eventType: 'member_revoked',
    environmentId: input.environmentId,
    bindingId: input.bindingId,
    organizationId: input.organizationId,
    profileId: input.profileId,
    performedBy: input.actorId,
    reason: input.reason,
    metadata: { population: 'internal', enrollmentId: input.enrollmentId, grantsVersion }
  })
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.externalIdentityBinding,
      aggregateId: input.bindingId,
      eventType: EVENT_TYPES.externalAccessRevoked,
      payload: {
        schemaVersion: 1,
        scope: 'member',
        bindingId: input.bindingId,
        environmentId: input.environmentId,
        organizationId: input.organizationId,
        population: 'internal',
        profileId: input.profileId,
        grantsVersion,
        changedByUserId: input.actorId
      }
    },
    client
  )
}

export const lockAuthorityBinding = async (client: PoolClient, input: AuthorityBinding, allowInactive = false) => {
  const environment = await client.query<{ status: string }>(
    `SELECT status FROM greenhouse_core.external_identity_environments WHERE environment_id=$1 FOR UPDATE`,
    [input.environmentId]
  )

  if (
    environment.rows.length !== 1 ||
    (!allowInactive && input.population === 'internal' && environment.rows[0].status !== 'active')
  )
    throw new ExternalAccessError('environment_not_active', 'authority environment unavailable')

  const { rows } = await client.query(
    `SELECT binding_id FROM greenhouse_core.external_organization_bindings
 WHERE binding_id=$1 AND environment_id=$2 AND organization_id=$3 AND population=$4 AND ($5::boolean OR status='active') FOR UPDATE`,
    [input.bindingId, input.environmentId, input.organizationId, input.population, allowInactive]
  )

  if (rows.length !== 1) throw new ExternalAccessError('binding_not_active', 'authority binding mismatch')
}

export const recordInternalMembership = async (
  client: PoolClient,
  input: AuthorityBinding & { enrollmentId: string; profileId: string; actorId: string; reason: string }
) => {
  if (input.population !== 'internal') throw new ExternalAccessError('invalid_request', 'corporate population required')
  await lockAuthorityBinding(client, input)
  const grantsVersion = await bumpGrantsVersion(client, input.bindingId)

  await appendAudit(client, {
    eventType: 'internal_member_linked',
    environmentId: input.environmentId,
    bindingId: input.bindingId,
    organizationId: input.organizationId,
    profileId: input.profileId,
    performedBy: input.actorId,
    reason: input.reason,
    metadata: { population: 'internal', enrollmentId: input.enrollmentId, grantsVersion }
  })
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.externalIdentityBinding,
      aggregateId: input.bindingId,
      eventType: EVENT_TYPES.internalAuthorityMemberEnrolled,
      payload: {
        schemaVersion: 1,
        population: 'internal',
        bindingId: input.bindingId,
        enrollmentId: input.enrollmentId,
        environmentId: input.environmentId,
        organizationId: input.organizationId,
        profileId: input.profileId,
        grantsVersion,
        changedByUserId: input.actorId
      }
    },
    client
  )
}
