import 'server-only'

import { createHash } from 'node:crypto'

import { query } from '@/lib/db'
import { ENTITLEMENT_CAPABILITY_MAP, type EntitlementCapabilityKey } from '@/config/entitlements-catalog'
import { readEffectiveEntitlements, readEffectiveEntitlementFacts, PLATFORM_ENTITLEMENT_SPACE_ID } from '@/lib/entitlements/effective-reader'
import { hasEntitlement } from '@/lib/entitlements/runtime'
import type { TenantEntitlement, TenantEntitlements } from '@/lib/entitlements/types'
import { getCurrentInternalEntitlementSubject } from '@/lib/tenant/current-internal-subject'
import { resolveSubjectOrganizationRelations, type SubjectOrganizationRelation } from '@/lib/organization-workspace/relationship-resolver'

/** V2 introduces target selection, not new provider capabilities or write authority. */
export const INTERNAL_MULTI_ORG_CAPABILITIES = ['growth.seo.observation.read'] as const
export type InternalTarget = {
  organizationId: string
  organizationName: string
  capabilities: string[]
  authorityRevision: string
}
export type InternalTargetRequest =
  | { intent: 'target'; organizationId: string; capability: string }
  | { intent: 'organizations'; limit?: number; afterOrganizationId?: string; capability?: string }
  | { intent: 'catalog' }
export type InternalTargetResolution =
  | { outcome: 'denied' }
  | { outcome: 'resolved'; targets: InternalTarget[]; capabilities: string[]; nextAfterOrganizationId: string | null }

type SpaceAuthority = {
  spaceId: string
  userId: string
  relation: SubjectOrganizationRelation
  platformEntries: readonly TenantEntitlement[]
  spaceEntries: readonly TenantEntitlement[]
}

const canRead = (entries: readonly TenantEntitlement[], capability: EntitlementCapabilityKey, scope: 'all' | 'tenant') =>
  hasEntitlement({ entries } as TenantEntitlements, capability, 'read', scope)

/** The organization-wide reader cannot union a permitted space with a denied space. */
export const evaluateInternalTarget = (input: {
  profileId: string
  organizationId: string
  activeCapabilities: readonly string[]
  spaces: readonly SpaceAuthority[]
}): Omit<InternalTarget, 'organizationName'> | null => {
  if (!input.spaces.length || new Set(input.spaces.map(space => space.spaceId)).size !== input.spaces.length) return null

  const capabilities = INTERNAL_MULTI_ORG_CAPABILITIES.filter(capability =>
    input.activeCapabilities.includes(capability) && input.spaces.every(space => {
      const relation = space.relation

      if (relation.subjectUserId !== space.userId || relation.organizationId !== input.organizationId) return false
      if (relation.kind !== 'internal_admin' && relation.kind !== 'assigned_member') return false
      if (relation.kind === 'internal_admin' &&
        (!canRead(space.platformEntries, 'organization.identity', 'all') ||
          !canRead(space.spaceEntries, 'organization.identity', 'all'))) return false

      const definition = ENTITLEMENT_CAPABILITY_MAP[capability]

      return definition.actions.every(action =>
        hasEntitlement({ entries: space.platformEntries } as TenantEntitlements, capability, action, definition.defaultScope) &&
        hasEntitlement({ entries: space.spaceEntries } as TenantEntitlements, capability, action, definition.defaultScope))
    }))

  if (!capabilities.length) return null

  const relevantEntries = (entries: readonly TenantEntitlement[]) => entries
    .filter(entry => entry.capability === 'organization.identity' || capabilities.includes(entry.capability as typeof capabilities[number]))
    .map(({ capability, action, scope }) => `${capability}:${action}:${scope}`).sort()

  const authorityRevision = createHash('sha256').update(JSON.stringify({
    version: 2, profileId: input.profileId, organizationId: input.organizationId, capabilities,
    spaces: [...input.spaces].sort((a, b) => a.spaceId.localeCompare(b.spaceId)).map(space => ({
      spaceId: space.spaceId, relation: space.relation.kind,
      platform: relevantEntries(space.platformEntries), target: relevantEntries(space.spaceEntries)
    }))
  })).digest('base64url')

  return { organizationId: input.organizationId, capabilities: [...capabilities], authorityRevision }
}

/** Caller owns one repeatable-read transaction, including actor/context and token-ledger checks. */
export const readInternalTargetAuthority = async (
  profileId: string,
  request: InternalTargetRequest,
  { readQuery = query, now = new Date() }: { readQuery?: typeof query; now?: Date } = {}
): Promise<InternalTargetResolution> => {
  if ('capability' in request && request.capability !== undefined &&
    !(INTERNAL_MULTI_ORG_CAPABILITIES as readonly string[]).includes(request.capability)) return { outcome: 'denied' }
  const limit = request.intent === 'organizations' ? (request.limit ?? 20) : 1

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return { outcome: 'denied' }
  const actor = await getCurrentInternalEntitlementSubject(profileId, { readQuery, now })

  if (!actor) return { outcome: 'denied' }

  const active = await readQuery<{ capability_key: string }>(
    `SELECT capability_key FROM greenhouse_core.capabilities_registry
      WHERE capability_key=ANY($1::text[]) AND deprecated_at IS NULL`, [[...INTERNAL_MULTI_ORG_CAPABILITIES]]
  )

  const activeCapabilities = active.map(row => row.capability_key)

  const readTargets = async (organizationIds: string[]): Promise<Map<string, InternalTarget>> => {
    const spaces = await readQuery<{ organization_id: string; space_id: string; client_id: string | null }>(
      `SELECT s.organization_id,s.space_id,s.client_id FROM greenhouse_core.spaces s
         JOIN greenhouse_core.organizations o ON o.organization_id=s.organization_id
        WHERE o.organization_id=ANY($1::text[]) AND o.active=TRUE AND o.status='active'
          AND s.active=TRUE AND s.status='active' ORDER BY s.organization_id,s.space_id`, [organizationIds]
    )

    if (spaces.length > 500) throw new Error('internal_reader_batch_limit')
    const subjects = new Map<string, NonNullable<Awaited<ReturnType<typeof getCurrentInternalEntitlementSubject>>>>()

    for (const space of spaces) {
      if (!space.client_id || subjects.has(space.client_id)) continue
      const subject = await getCurrentInternalEntitlementSubject(profileId, { clientId: space.client_id, readQuery, now })

      if (subject && subject.userId === actor.userId && subject.memberId === actor.memberId) subjects.set(space.client_id, subject)
    }

    const relations = await resolveSubjectOrganizationRelations({ subjectUserId: actor.userId, subjectTenantType: actor.tenantType,
      targets: spaces.map(space => ({ organizationId: space.organization_id, spaceId: space.space_id })) }, { readQuery })

    const effective = await readEffectiveEntitlementFacts({ userId: actor.userId,
      roleCodes: [...new Set([...subjects.values()].flatMap(subject => subject.roleCodes))].sort(),
      spaceIds: [PLATFORM_ENTITLEMENT_SPACE_ID, ...spaces.map(space => space.space_id)]
    }, { readQuery })

    const permitted = new Map<string, Omit<InternalTarget, 'organizationName'>>()

    for (const organizationId of organizationIds) {
      const orgSpaces = spaces.filter(space => space.organization_id === organizationId)
      const facts: SpaceAuthority[] = []

      for (const space of orgSpaces) {
        const subject = space.client_id ? subjects.get(space.client_id) : undefined
        const relation = relations.get(space.space_id)

        if (!subject || !relation) break
        facts.push({ spaceId: space.space_id, userId: subject.userId, relation,
          platformEntries: effective(subject), spaceEntries: effective(subject, space.space_id) })
      }

      if (facts.length !== orgSpaces.length) continue
      const target = evaluateInternalTarget({ profileId, organizationId, spaces: facts, activeCapabilities })

      if (target && (!('capability' in request) || !request.capability || target.capabilities.includes(request.capability))) permitted.set(organizationId, target)
    }

    if (!permitted.size) return new Map()

    // Names never enter the projection until authority has succeeded for every applicable space.
    const names = await readQuery<{ organization_id: string; organization_name: string }>(
      `SELECT organization_id,organization_name FROM greenhouse_core.organizations WHERE organization_id=ANY($1::text[])`, [[...permitted.keys()]]
    )

    const result = new Map<string, InternalTarget>()

    for (const row of names) {
      const target = permitted.get(row.organization_id)

      if (!target || typeof row.organization_name !== 'string' || !row.organization_name.trim() || row.organization_name.length > 1024 || result.has(row.organization_id)) {
        throw new Error('invalid_authorized_organization_projection')
      }

      result.set(row.organization_id, { ...target, organizationName: row.organization_name })
    }

    if (result.size !== permitted.size) throw new Error('invalid_authorized_organization_projection')

    return result
  }

  const readTarget = async (organizationId: string) => (await readTargets([organizationId])).get(organizationId)

  if (request.intent === 'target') {
    if (!request.organizationId || request.organizationId.trim() !== request.organizationId) return { outcome: 'denied' }
    const target = await readTarget(request.organizationId)

    return target ? { outcome: 'resolved', targets: [target], capabilities: target.capabilities, nextAfterOrganizationId: null }
      : { outcome: 'denied' }
  }

  let after = request.intent === 'organizations' ? request.afterOrganizationId ?? '' : ''

  if (after && !await readTarget(after)) return { outcome: 'denied' }
  const targets: InternalTarget[] = []
  const platform = await readEffectiveEntitlements(actor, { readQuery })
  const adminCandidate = actor.roleCodes.includes('efeonce_admin') && canRead(platform, 'organization.identity', 'all')

  // Candidate IDs stay server-side. Only a reauthorized returned ID can be a client continuation.
  while (targets.length <= limit) {
    const candidates = await readQuery<{ organization_id: string }>(
      `SELECT o.organization_id FROM greenhouse_core.organizations o
        WHERE o.active=TRUE AND o.status='active' AND o.organization_id COLLATE "C">$1
          AND EXISTS (SELECT 1 FROM greenhouse_core.spaces s WHERE s.organization_id=o.organization_id
            AND s.active=TRUE AND s.status='active' AND s.client_id IS NOT NULL
            AND ($2::boolean OR EXISTS (SELECT 1 FROM greenhouse_core.client_team_assignments a
              WHERE a.client_id=s.client_id AND a.member_id=$3 AND a.active=TRUE
                AND (a.start_date IS NULL OR a.start_date<=CURRENT_DATE)
                AND (a.end_date IS NULL OR a.end_date>=CURRENT_DATE))))
        ORDER BY o.organization_id COLLATE "C" LIMIT 50`, [after, adminCandidate, actor.memberId]
    )

    if (!candidates.length) break
    const permitted = await readTargets(candidates.map(candidate => candidate.organization_id))

    for (const candidate of candidates) {
      after = candidate.organization_id
      const target = permitted.get(after)

      if (target) targets.push(target)
      if (targets.length > limit || (request.intent === 'catalog' && targets.length > 0)) break
    }

    if (candidates.length < 50 || (request.intent === 'catalog' && targets.length > 0)) break
  }

  const page = targets.slice(0, limit)

  return {
    outcome: 'resolved', targets: request.intent === 'catalog' ? [] : page,
    capabilities: [...new Set(page.flatMap(target => target.capabilities))].sort(),
    nextAfterOrganizationId: request.intent !== 'catalog' && targets.length > limit ? page.at(-1)!.organizationId : null
  }
}
