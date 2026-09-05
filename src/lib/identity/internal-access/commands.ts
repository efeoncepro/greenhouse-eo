import { randomBytes, randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import {
  recordInternalMembership,
  insertAuthorityBinding,
  insertAuthorityGrant,
  revokeAuthorityGrant,
  insertInternalSourceLink,
  revokeInternalSourceLink
} from '../external-access/authority-transactions'

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
  environment_id: string
  organization_id: string
  binding_environment_id: string
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
      `SELECT e.*,n.source_object_id AS subject,n.active AS native_active,n.is_login_identity AS native_login,(b.status='active' AND b.population='internal') AS binding_active,b.organization_id AS organization_id,b.environment_id AS binding_environment_id FROM greenhouse_core.internal_native_enrollments e
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
        e.organization_id !== candidate.organization_id ||
        e.binding_environment_id !== input.environmentId ||
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

    const bindings = await client.query<{ binding_id: string; population: string }>(
      `SELECT binding_id,population FROM greenhouse_core.external_organization_bindings WHERE environment_id=$1 AND organization_id=$2 AND status='active' FOR UPDATE`,
      [input.environmentId, candidate.organization_id]
    )

    if (bindings.rows.some(b => b.population !== 'internal')) throw new InternalAccessError('conflict')
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
      await insertAuthorityBinding(client, {
        bindingId,
        organizationId: candidate.organization_id,
        environmentId: input.environmentId,
        externalOrganizationRef: `internal:${candidate.organization_id}`,
        population: 'internal',
        actorId: input.actorId,
        reason: input.reason
      })
    }

    const subject = randomBytes(24).toString('base64url'),
      nativeLinkId = `identity-source-link-${randomUUID()}`,
      enrollmentId = `ine-${randomUUID()}`

    await insertInternalSourceLink(client, {
      bindingId,
      organizationId: candidate.organization_id,
      population: 'internal',
      linkId: nativeLinkId,
      profileId: input.profileId,
      environmentId: input.environmentId,
      subject
    })
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
    await recordInternalMembership(client, {
      bindingId,
      environmentId: input.environmentId,
      organizationId: candidate.organization_id,
      population: 'internal',
      enrollmentId,
      profileId: input.profileId,
      actorId: input.actorId,
      reason: input.reason
    })
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
    await lockEnrollmentEnvironment(client, input.enrollmentId)

    const result = await client.query<Enrollment>(
      `SELECT e.*,b.organization_id FROM greenhouse_core.internal_native_enrollments e JOIN greenhouse_core.external_organization_bindings b ON b.binding_id=e.binding_id AND b.population='internal' WHERE e.enrollment_id=$1 FOR UPDATE OF e`,
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
    await revokeInternalSourceLink(client, {
      linkId: e.native_link_id,
      bindingId: e.binding_id,
      enrollmentId: input.enrollmentId,
      environmentId: e.environment_id,
      profileId: e.profile_id,
      organizationId: e.organization_id,
      actorId: input.actorId,
      reason: input.reason
    })
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
    await lockEnrollmentEnvironment(client, input.enrollmentId)

    const enrollment = await client.query<Enrollment>(
      `SELECT e.*,b.organization_id FROM greenhouse_core.internal_native_enrollments e JOIN greenhouse_core.external_organization_bindings b ON b.binding_id=e.binding_id AND b.population='internal' WHERE e.enrollment_id=$1 FOR UPDATE OF e`,
      [input.enrollmentId]
    )

    const e = enrollment.rows[0]

    if (!e || (input.active && e.status !== 'active')) throw new InternalAccessError('ineligible')

    const candidate = input.active
      ? await loadEnrollmentCandidate(client, {
          profileId: e.profile_id,
          tenantId: e.tenant_id,
          objectId: e.object_id
        })
      : { organization_id: e.organization_id, upstream_link_id: e.upstream_link_id }

    if (!candidate || candidate.upstream_link_id !== e.upstream_link_id) throw new InternalAccessError('ineligible')

    const binding = await client.query(
      `SELECT binding_id FROM greenhouse_core.external_organization_bindings WHERE binding_id=$1 AND ($4::boolean OR status='active') AND population='internal' AND organization_id=$2 AND environment_id=$3 FOR UPDATE`,
      [e.binding_id, candidate.organization_id, e.environment_id, !input.active]
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

    const bindingAuthority = {
      bindingId: e.binding_id,
      environmentId: e.environment_id,
      organizationId: candidate.organization_id,
      population: 'internal' as const,
      profileId: e.profile_id,
      capability: input.capability,
      actorId: input.actorId,
      reason: input.reason
    }

    if (g) await revokeAuthorityGrant(client, { ...bindingAuthority, grantId: g.grant_id })
    const grantId = input.active ? `xcg-${randomUUID()}` : (g?.grant_id ?? null)

    if (input.active)
      await insertAuthorityGrant(client, { ...bindingAuthority, grantId: grantId!, expiresAt: input.expiresAt })
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

const lockEnrollmentEnvironment = async (client: PoolClient, enrollmentId: string) => {
  const lookup = await client.query<{ environment_id: string }>(
    `SELECT environment_id FROM greenhouse_core.internal_native_enrollments WHERE enrollment_id=$1`,
    [enrollmentId]
  )

  if (!lookup.rows[0]) throw new InternalAccessError('not_found')
  await client.query(
    `SELECT environment_id FROM greenhouse_core.external_identity_environments WHERE environment_id=$1 FOR UPDATE`,
    [lookup.rows[0].environment_id]
  )
}
