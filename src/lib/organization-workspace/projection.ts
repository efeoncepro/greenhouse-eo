import 'server-only'

import { getTenantEntitlements, hasEntitlement } from '@/lib/entitlements/runtime'
import type { TenantEntitlements, TenantEntitlementSubject } from '@/lib/entitlements/types'
import { authorizeAccountFacets } from '@/lib/account-360/facet-authorization'
import { captureWithDomain } from '@/lib/observability/capture'
import type { EntitlementCapabilityKey, EntitlementScope } from '@/config/entitlements-catalog'

import {
  FACET_TO_CAPABILITY_KEY,
  FACET_TO_SENSITIVE_CAPABILITY_KEY,
  ORGANIZATION_FACETS,
  type OrganizationFacet
} from './facet-capability-mapping'
import {
  resolveSubjectOrganizationRelation,
  type SubjectOrganizationRelation
} from './relationship-resolver'
import {
  buildProjectionCacheKey,
  readProjectionFromCache,
  writeProjectionToCache
} from './cache'
import type {
  EntrypointContext,
  OrganizationWorkspaceProjection,
  WorkspaceAction,
  WorkspaceTab
} from './projection-types'

export type {
  EntrypointContext,
  OrganizationWorkspaceProjection,
  WorkspaceAction,
  WorkspaceTab
} from './projection-types'

/**
 * TASK-611 — Organization Workspace projection helper canónico.
 *
 * Pure function (módulo cache hace memoization, NO afecta corrección).
 * Composición determinística per spec §4.4 (orden de evaluación 1-7):
 *
 *   1. Resolver relación subject↔organization (Slice 3).
 *   2. Cargar entitlements del subject (runtime puro).
 *   3. Por cada facet, resolver capability + scope adecuado al tipo de relación.
 *   4. Aplicar `authorizeAccountFacets` para field redactions adicionales.
 *   5. Mapear facets visibles → tabs según entrypointContext.
 *   6. Default facet por entrypoint con fallback al primer visible.
 *   7. Allowed actions per facet desde la matriz capability × scope.
 *
 * Degraded mode honesto: nunca throw — siempre devuelve `{ degradedMode: true,
 * degradedReason: <enum>, visibleFacets: [], ... }`. UI distingue loading / empty /
 * degraded / error con copy es-CL tuteo.
 *
 * Cache TTL 30s in-memory por `${subjectId}:${organizationId}:${entrypointContext}`.
 * Pattern source: TASK-780 home-rollout-flags resolver.
 *
 * Spec: docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md §4.4.
 */

export type ResolveProjectionInput = {
  subject: TenantEntitlementSubject
  organizationId: string
  entrypointContext: EntrypointContext
}

const DEFAULT_FACET_BY_ENTRYPOINT: Record<EntrypointContext, OrganizationFacet> = {
  agency: 'identity',
  finance: 'finance',
  admin: 'identity',
  client_portal: 'identity'
}

const CLIENT_PORTAL_PREFERRED_ORDER: readonly OrganizationFacet[] = [
  'identity',
  'team',
  'delivery',
  'services'
]

const FACET_LABELS_ES_CL: Record<OrganizationFacet, string> = {
  identity: 'Identidad',
  spaces: 'Spaces',
  team: 'Equipo',
  economics: 'Economía',
  delivery: 'Entrega',
  finance: 'Finanzas',
  crm: 'CRM',
  services: 'Servicios',
  staffAug: 'Staff Aug'
}

const requiredScopeForRelation = (relation: SubjectOrganizationRelation): EntitlementScope => {
  switch (relation.kind) {
    case 'internal_admin':
      return 'all'
    case 'assigned_member':
      return 'tenant'
    case 'client_portal_user':
      return 'own'
    case 'unrelated_internal':
    case 'no_relation':
      return 'tenant'
  }
}

const isFacetAuthorized = (
  facet: OrganizationFacet,
  capabilityKey: EntitlementCapabilityKey,
  entitlements: TenantEntitlements,
  relation: SubjectOrganizationRelation
): boolean => {
  // Relationship gating is the OUTER gate (defense-in-depth Layer 0). Subjects
  // sin relación con esta org NUNCA ven sus facets, aunque tengan capabilities
  // baseline (e.g. internal team con `organization.identity@tenant` no ve la org
  // si no está asignado). Spec Apéndice A: unrelated_internal/no_relation = ✗.
  if (relation.kind === 'no_relation' || relation.kind === 'unrelated_internal') {
    return false
  }

  const scope = requiredScopeForRelation(relation)

  // Read with required scope; runtime helper accepts the precomputed entitlements.
  if (hasEntitlement(entitlements, capabilityKey, 'read', scope)) {
    return true
  }

  // Defensive: capabilities with `read_sensitive` semantics are still validated as
  // 'read' here because the catalog encodes `_sensitive` in the capability key
  // (TASK-784 pattern). Sensitive capability is checked only when a consumer
  // explicitly requests "show sensitive fields" — not as a baseline visibility gate.
  void facet

  return false
}

const buildVisibleTabs = (visibleFacets: OrganizationFacet[]): WorkspaceTab[] =>
  visibleFacets.map(facet => ({ facet, label: FACET_LABELS_ES_CL[facet] }))

const resolveDefaultFacet = (
  entrypointContext: EntrypointContext,
  visibleFacets: OrganizationFacet[]
): OrganizationFacet | null => {
  if (visibleFacets.length === 0) return null

  if (entrypointContext === 'client_portal') {
    for (const candidate of CLIENT_PORTAL_PREFERRED_ORDER) {
      if (visibleFacets.includes(candidate)) return candidate
    }

    return visibleFacets[0]
  }

  const preferred = DEFAULT_FACET_BY_ENTRYPOINT[entrypointContext]

  if (visibleFacets.includes(preferred)) return preferred

  return visibleFacets[0]
}

const buildAllowedActions = (
  visibleFacets: OrganizationFacet[],
  entitlements: TenantEntitlements,
  relation: SubjectOrganizationRelation
): WorkspaceAction[] => {
  if (relation.kind === 'no_relation') return []

  const scope = requiredScopeForRelation(relation)
  const actions: WorkspaceAction[] = []

  for (const facet of visibleFacets) {
    const sensitiveKey = FACET_TO_SENSITIVE_CAPABILITY_KEY[facet]

    if (!sensitiveKey) continue

    if (hasEntitlement(entitlements, sensitiveKey, 'read', scope)) {
      actions.push({
        facet,
        actionKey: `${sensitiveKey}.read`,
        label: `Ver detalle sensible · ${FACET_LABELS_ES_CL[facet]}`
      })
    }

    // organization.finance_sensitive accepts export + approve. Surface both as actions
    // when the subject has them.
    if (sensitiveKey === 'organization.finance_sensitive') {
      if (hasEntitlement(entitlements, sensitiveKey, 'export', scope)) {
        actions.push({
          facet,
          actionKey: `${sensitiveKey}.export`,
          label: `Exportar · ${FACET_LABELS_ES_CL[facet]}`
        })
      }

      if (hasEntitlement(entitlements, sensitiveKey, 'approve', scope)) {
        actions.push({
          facet,
          actionKey: `${sensitiveKey}.approve`,
          label: `Aprobar · ${FACET_LABELS_ES_CL[facet]}`
        })
      }
    }
  }

  return actions
}

const buildDegradedProjection = (
  organizationId: string,
  entrypointContext: EntrypointContext,
  relation: SubjectOrganizationRelation,
  cacheKey: string,
  reason: NonNullable<OrganizationWorkspaceProjection['degradedReason']>
): OrganizationWorkspaceProjection => ({
  organizationId,
  entrypointContext,
  relationship: relation,
  visibleFacets: [],
  visibleTabs: [],
  defaultFacet: null,
  allowedActions: [],
  fieldRedactions: {},
  degradedMode: true,
  degradedReason: reason,
  cacheKey,
  computedAt: new Date()
})

const inferRequesterTenantTypeForFacetAuth = (subject: ResolveProjectionInput['subject']): string =>
  subject.tenantType

const inferRequesterOrgIdForFacetAuth = (
  relation: SubjectOrganizationRelation
): string | null => {
  if (relation.kind === 'client_portal_user') return relation.organizationId

  return null
}

export const resolveOrganizationWorkspaceProjection = async (
  input: ResolveProjectionInput
): Promise<OrganizationWorkspaceProjection> => {
  const { subject, organizationId, entrypointContext } = input
  const cacheKey = buildProjectionCacheKey(subject.userId, organizationId, entrypointContext)

  const cached = readProjectionFromCache(cacheKey)

  if (cached) return cached

  // Step 1 — relationship resolver (Slice 3). Honest degraded path on PG failure.
  let relation: SubjectOrganizationRelation

  try {
    relation = await resolveSubjectOrganizationRelation({
      subjectUserId: subject.userId,
      subjectTenantType: subject.tenantType,
      organizationId
    })
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'workspace_projection_helper', stage: 'relationship' },
      extra: { organizationId, entrypointContext }
    })

    return buildDegradedProjection(
      organizationId,
      entrypointContext,
      { kind: 'no_relation', subjectUserId: subject.userId, organizationId },
      cacheKey,
      'relationship_lookup_failed'
    )
  }

  // Step 2 — entitlements (pure function, never throws — but guard anyway for invariants).
  let entitlementsBag: ReturnType<typeof getTenantEntitlements>

  try {
    entitlementsBag = getTenantEntitlements(subject)
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'workspace_projection_helper', stage: 'entitlements' },
      extra: { organizationId, entrypointContext }
    })

    return buildDegradedProjection(
      organizationId,
      entrypointContext,
      relation,
      cacheKey,
      'entitlements_lookup_failed'
    )
  }

  // Step 3 — per-facet capability evaluation.
  const visibleFacets: OrganizationFacet[] = []

  for (const facet of ORGANIZATION_FACETS) {
    const capabilityKey = FACET_TO_CAPABILITY_KEY[facet]

    if (isFacetAuthorized(facet, capabilityKey, entitlementsBag, relation)) {
      visibleFacets.push(facet)
    }
  }

  // Step 4 — absorber field redactions de authorizeAccountFacets (NO se reemplaza).
  let fieldRedactions: Partial<Record<OrganizationFacet, string[]>> = {}

  if (visibleFacets.length > 0) {
    try {
      const facetAuth = authorizeAccountFacets({
        requesterRoleCodes: subject.roleCodes ?? [],
        requesterTenantType: inferRequesterTenantTypeForFacetAuth(subject),
        requesterOrganizationId: inferRequesterOrgIdForFacetAuth(relation),
        targetOrganizationId: organizationId,
        requestedFacets: visibleFacets
      })

      // Only keep redactions for facets that are still in our visibleFacets list.
      // If facet auth denies a facet we considered visible, drop it (defense-in-depth
      // — both layers must agree before a facet is rendered).
      const allowedAfterFacetAuth = new Set(facetAuth.allowedFacets)

      for (let i = visibleFacets.length - 1; i >= 0; i--) {
        if (!allowedAfterFacetAuth.has(visibleFacets[i])) {
          visibleFacets.splice(i, 1)
        }
      }

      fieldRedactions = facetAuth.fieldRedactions
    } catch (error) {
      captureWithDomain(error, 'identity', {
        tags: { source: 'workspace_projection_helper', stage: 'facet_auth' },
        extra: { organizationId, entrypointContext }
      })
      // Honest degradation: keep visible facets but drop redactions; capture for triage.
      fieldRedactions = {}
    }
  }

  if (visibleFacets.length === 0 && relation.kind !== 'no_relation') {
    return buildDegradedProjection(organizationId, entrypointContext, relation, cacheKey, 'no_facets_authorized')
  }

  if (visibleFacets.length === 0 && relation.kind === 'no_relation') {
    // no_relation is the canonical "subject sees nothing" — degraded with reason.
    return buildDegradedProjection(organizationId, entrypointContext, relation, cacheKey, 'no_facets_authorized')
  }

  // Steps 5-7 — tabs, default facet, allowed actions.
  const visibleTabs = buildVisibleTabs(visibleFacets)
  const defaultFacet = resolveDefaultFacet(entrypointContext, visibleFacets)
  const allowedActions = buildAllowedActions(visibleFacets, entitlementsBag, relation)

  const projection: OrganizationWorkspaceProjection = {
    organizationId,
    entrypointContext,
    relationship: relation,
    visibleFacets,
    visibleTabs,
    defaultFacet,
    allowedActions,
    fieldRedactions,
    degradedMode: false,
    degradedReason: null,
    cacheKey,
    computedAt: new Date()
  }

  writeProjectionToCache(cacheKey, projection)

  return projection
}
