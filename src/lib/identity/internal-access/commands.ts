import { randomBytes, randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { loadEnrollmentCandidate, validUpstream } from './store'

export type InternalAccessCapability =
  | 'identity.internal_access.enroll'
  | 'identity.internal_access.revoke'
  | 'identity.internal_access.grant'
/** Server-owned adapter must resolve the actor's current fine-grained entitlement, never request booleans. */
export type InternalAccessCommandDependencies = {
  authorize: (actorId: string, capability: InternalAccessCapability) => Promise<boolean>
  /** Resolves current provider/Greenhouse authority of the target; absent adapter denies grants. */
  canDelegate?: (profileId: string, capability: string) => Promise<boolean>
}
export class InternalAccessError extends Error {
  constructor(readonly code: 'forbidden' | 'invalid_request' | 'ineligible' | 'conflict' | 'not_found') {
    super(code)
    this.name = 'InternalAccessError'
  }
}

const guard = async (
  input: { actorId: string; reason: string },
  cap: InternalAccessCapability,
  deps: InternalAccessCommandDependencies
) => {
  if (!input.actorId?.trim() || !input.reason?.trim() || input.reason.trim().length < 10 || input.reason.length > 2000)
    throw new InternalAccessError('invalid_request')
  if (!(await deps.authorize(input.actorId, cap))) throw new InternalAccessError('forbidden')
}

const INTERNAL_ACCESS_EVENTS = {
  enrolled: EVENT_TYPES.internalAccessEnrolled,
  revoked: EVENT_TYPES.internalAccessRevoked,
  capability_granted: EVENT_TYPES.internalAccessCapabilityGranted,
  capability_revoked: EVENT_TYPES.internalAccessCapabilityRevoked
} as const

const audit = async (
  client: PoolClient,
  input: {
    id: string
    actorId: string
    reason: string
    event: keyof typeof INTERNAL_ACCESS_EVENTS
    metadata?: Record<string, unknown>
  }
) => {
  await client.query(
    `INSERT INTO greenhouse_core.internal_native_access_audit
 (audit_id,event_type,enrollment_id,actor_id,reason,metadata_json,created_at) VALUES ($1,$2,$3,$4,$5,$6::jsonb,NOW())`,
    [`ina-${randomUUID()}`, input.event, input.id, input.actorId, input.reason, JSON.stringify(input.metadata ?? {})]
  )
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.internalNativeEnrollment,
      aggregateId: input.id,
      eventType: INTERNAL_ACCESS_EVENTS[input.event],
      payload: { enrollmentId: input.id, actorId: input.actorId }
    },
    client
  )
}

type Enrollment = {
  enrollment_id: string
  profile_id: string
  binding_id: string
  native_link_id: string
  upstream_link_id: string
  tenant_id: string
  object_id: string
  status: string
  subject: string
  native_active: boolean
  native_login: boolean
  binding_active: boolean
}

export const enrollInternalNativeIdentity = async (
  input: {
    environmentId: string
    profileId: string
    tenantId: string
    objectId: string
    issuer: string
    actorId: string
    reason: string
    dryRun?: boolean
  },
  deps: InternalAccessCommandDependencies
) => {
  await guard(input, 'identity.internal_access.enroll', deps)
  if (
    !validUpstream(input.tenantId, input.objectId, input.issuer) ||
    !/^[a-z0-9][a-z0-9_-]{2,63}$/.test(input.environmentId)
  )
    throw new InternalAccessError('invalid_request')

  return withTransaction(async client => {
    // The environment serializes organization binding creation and enrollment collisions, including different profiles for one upstream.
    const env = await client.query(
      `SELECT environment_id FROM greenhouse_core.external_identity_environments WHERE environment_id=$1 AND status='active' FOR UPDATE`,
      [input.environmentId]
    )

    if (env.rows.length !== 1) throw new InternalAccessError('ineligible')
    const candidate = await loadEnrollmentCandidate(client, input)

    if (!candidate) throw new InternalAccessError('ineligible')

    const existing = await client.query<Enrollment>(
      `SELECT e.*,n.source_object_id AS subject,n.active AS native_active,n.is_login_identity AS native_login,b.status='active' AS binding_active FROM greenhouse_core.internal_native_enrollments e
 JOIN greenhouse_core.identity_profile_source_links n ON n.link_id=e.native_link_id
 JOIN greenhouse_core.external_organization_bindings b ON b.binding_id=e.binding_id
 WHERE e.environment_id=$1 AND (e.profile_id=$2 OR (e.tenant_id=$3::uuid AND e.object_id=$4::uuid)) FOR UPDATE OF e`,
      [input.environmentId, input.profileId, input.tenantId, input.objectId]
    )

    if (existing.rows.length) {
      const e = existing.rows[0]

      if (
        existing.rows.length !== 1 ||
        e.status !== 'active' ||
        !e.native_active ||
        !e.native_login ||
        !e.binding_active ||
        e.profile_id !== input.profileId ||
        e.tenant_id !== input.tenantId.toLowerCase() ||
        e.object_id !== input.objectId.toLowerCase() ||
        e.upstream_link_id !== candidate.upstream_link_id
      )
        throw new InternalAccessError('conflict')

      return {
        applied: false,
        idempotent: true,
        enrollmentId: e.enrollment_id,
        subject: e.subject,
        bindingId: e.binding_id,
        nativeLinkId: e.native_link_id,
        upstreamLinkId: e.upstream_link_id,
        profileId: e.profile_id,
        organizationId: candidate.organization_id
      }
    }

    // Never silently reuse an external native login: it would couple corporate and external recovery paths.
    const native = await client.query(
      `SELECT link_id FROM greenhouse_core.identity_profile_source_links WHERE profile_id=$1 AND source_system=$2 AND source_object_type='subject' AND active=TRUE`,
      [input.profileId, `external_idp:${input.environmentId}`]
    )

    if (native.rows.length) throw new InternalAccessError('conflict')

    const bindings = await client.query<{ binding_id: string }>(
      `SELECT binding_id FROM greenhouse_core.external_organization_bindings WHERE environment_id=$1 AND organization_id=$2 AND status='active' FOR UPDATE`,
      [input.environmentId, candidate.organization_id]
    )

    if (input.dryRun)
      return {
        applied: false,
        idempotent: false,
        profileId: input.profileId,
        organizationId: candidate.organization_id,
        upstreamLinkId: candidate.upstream_link_id
      }
    let bindingId = bindings.rows[0]?.binding_id

    if (!bindingId) {
      bindingId = `xob-${randomUUID()}`
      await client.query(
        `INSERT INTO greenhouse_core.external_organization_bindings
 (binding_id,organization_id,environment_id,external_organization_ref,status,grants_version,reason,bound_by)
 VALUES ($1,$2,$3,$4,'active',1,$5,$6)`,
        [
          bindingId,
          candidate.organization_id,
          input.environmentId,
          `internal:${candidate.organization_id}`,
          input.reason,
          input.actorId
        ]
      )
    }

    const subject = randomBytes(24).toString('base64url'),
      nativeLinkId = `identity-source-link-${randomUUID()}`,
      enrollmentId = `ine-${randomUUID()}`

    await client.query(
      `INSERT INTO greenhouse_core.identity_profile_source_links
 (link_id,profile_id,source_system,source_object_type,source_object_id,source_user_id,active,is_login_identity)
 VALUES ($1,$2,$3,'subject',$4,$4,TRUE,TRUE)`,
      [nativeLinkId, input.profileId, `external_idp:${input.environmentId}`, subject]
    )
    await client.query(
      `INSERT INTO greenhouse_core.internal_native_enrollments
 (enrollment_id,environment_id,profile_id,binding_id,upstream_link_id,native_link_id,tenant_id,object_id,status,enrolled_by,reason,enrolled_at)
 VALUES ($1,$2,$3,$4,$5,$6,$7::uuid,$8::uuid,'active',$9,$10,NOW())`,
      [
        enrollmentId,
        input.environmentId,
        input.profileId,
        bindingId,
        candidate.upstream_link_id,
        nativeLinkId,
        input.tenantId,
        input.objectId,
        input.actorId,
        input.reason
      ]
    )
    await audit(client, { id: enrollmentId, actorId: input.actorId, reason: input.reason, event: 'enrolled' })

    return {
      applied: true,
      idempotent: false,
      enrollmentId,
      subject,
      bindingId,
      nativeLinkId,
      upstreamLinkId: candidate.upstream_link_id,
      profileId: input.profileId,
      organizationId: candidate.organization_id
    }
  })
}

export const revokeInternalNativeIdentity = async (
  input: { enrollmentId: string; actorId: string; reason: string; dryRun?: boolean },
  deps: InternalAccessCommandDependencies
) => {
  await guard(input, 'identity.internal_access.revoke', deps)

  return withTransaction(async client => {
    const result = await client.query<Enrollment>(
      'SELECT * FROM greenhouse_core.internal_native_enrollments WHERE enrollment_id=$1 FOR UPDATE',
      [input.enrollmentId]
    )

    const e = result.rows[0]

    if (!e) throw new InternalAccessError('not_found')
    if (e.status === 'revoked') return { applied: false, idempotent: true }
    if (input.dryRun) return { applied: false, idempotent: false }
    await client.query(
      `UPDATE greenhouse_core.internal_native_enrollments SET status='revoked',revoked_at=NOW(),revoked_by=$2 WHERE enrollment_id=$1`,
      [input.enrollmentId, input.actorId]
    )
    await client.query(
      `UPDATE greenhouse_core.identity_profile_source_links SET active=FALSE,is_login_identity=FALSE,updated_at=NOW() WHERE link_id=$1`,
      [e.native_link_id]
    )
    await client.query(
      `UPDATE greenhouse_core.external_organization_bindings SET grants_version=grants_version+1,updated_at=NOW() WHERE binding_id=$1`,
      [e.binding_id]
    )
    await audit(client, { id: input.enrollmentId, actorId: input.actorId, reason: input.reason, event: 'revoked' })

    return { applied: true, idempotent: false }
  })
}

/** Explicit personal delegation. Does not borrow external invitations or organization-wide defaults. */
export const setInternalCapabilityGrant = async (
  input: {
    enrollmentId: string
    capability: string
    active: boolean
    expiresAt?: Date
    actorId: string
    reason: string
    dryRun?: boolean
  },
  deps: InternalAccessCommandDependencies
) => {
  await guard(input, 'identity.internal_access.grant', deps)
  if (
    !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(input.capability) ||
    (input.active &&
      (!input.expiresAt || !Number.isFinite(input.expiresAt.getTime()) || input.expiresAt.getTime() <= Date.now()))
  )
    throw new InternalAccessError('invalid_request')

  return withTransaction(async client => {
    const enrollment = await client.query<Enrollment>(
      `SELECT * FROM greenhouse_core.internal_native_enrollments WHERE enrollment_id=$1 FOR UPDATE`,
      [input.enrollmentId]
    )

    const e = enrollment.rows[0]

    if (!e || e.status !== 'active') throw new InternalAccessError('ineligible')

    const candidate = await loadEnrollmentCandidate(client, {
      profileId: e.profile_id,
      tenantId: e.tenant_id,
      objectId: e.object_id
    })

    if (!candidate || candidate.upstream_link_id !== e.upstream_link_id) throw new InternalAccessError('ineligible')

    const binding = await client.query(
      `SELECT binding_id FROM greenhouse_core.external_organization_bindings WHERE binding_id=$1 AND status='active' AND organization_id=$2 FOR UPDATE`,
      [e.binding_id, candidate.organization_id]
    )

    if (binding.rows.length !== 1) throw new InternalAccessError('ineligible')
    if (input.active && !(await deps.canDelegate?.(e.profile_id, input.capability)))
      throw new InternalAccessError('forbidden')

    const existing = await client.query<{ grant_id: string; expires_at: Date | string | null }>(
      `SELECT grant_id,expires_at FROM greenhouse_core.external_capability_grants WHERE binding_id=$1 AND profile_id=$2 AND capability=$3 AND status='active' FOR UPDATE`,
      [e.binding_id, e.profile_id, input.capability]
    )

    const g = existing.rows[0]

    if (
      (!input.active && !g) ||
      (input.active && g?.expires_at && new Date(g.expires_at).getTime() === input.expiresAt!.getTime())
    )
      return { applied: false, idempotent: true, grantId: g?.grant_id ?? null }
    if (input.dryRun) return { applied: false, idempotent: false, grantId: g?.grant_id ?? null }
    if (g)
      await client.query(
        `UPDATE greenhouse_core.external_capability_grants SET status='revoked',revoked_at=NOW(),revoked_by=$2,revoke_reason=$3,updated_at=NOW() WHERE grant_id=$1`,
        [g.grant_id, input.actorId, input.reason]
      )
    const grantId = input.active ? `xcg-${randomUUID()}` : (g?.grant_id ?? null)

    if (input.active)
      await client.query(
        `INSERT INTO greenhouse_core.external_capability_grants (grant_id,binding_id,profile_id,capability,status,granted_by,reason,expires_at) VALUES ($1,$2,$3,$4,'active',$5,$6,$7)`,
        [grantId, e.binding_id, e.profile_id, input.capability, input.actorId, input.reason, input.expiresAt]
      )
    await client.query(
      `UPDATE greenhouse_core.external_organization_bindings SET grants_version=grants_version+1,updated_at=NOW() WHERE binding_id=$1`,
      [e.binding_id]
    )
    await audit(client, {
      id: input.enrollmentId,
      actorId: input.actorId,
      reason: input.reason,
      event: input.active ? 'capability_granted' : 'capability_revoked',
      metadata: {
        capability: input.capability,
        grantId,
        previousGrantId: g?.grant_id ?? null,
        expiresAt: input.expiresAt?.toISOString() ?? null
      }
    })

    return { applied: true, idempotent: false, grantId }
  })
}
