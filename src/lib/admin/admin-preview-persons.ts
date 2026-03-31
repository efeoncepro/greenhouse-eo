import 'server-only'

import {
  getCanonicalPersonsByUserIds,
  type CanonicalPersonPortalAccessState,
  type CanonicalPersonResolutionSource
} from '@/lib/identity/canonical-person'

export type AdminGovernanceUserPreview = {
  previewKey: string
  previewMode: 'person' | 'portal_principal'
  userId: string | null
  linkedUserIds: string[]
  portalPrincipalCount: number
  canManageOverrides: boolean
  fullName: string
  email: string
  tenantType: 'client' | 'efeonce_internal'
  roleCodes: string[]
  routeGroups: string[]
  identityProfileId: string | null
  memberId: string | null
  portalAccessState: CanonicalPersonPortalAccessState
  resolutionSource: CanonicalPersonResolutionSource
}

export type GovernancePreviewBaselineUser = {
  userId: string
  fullName: string
  email: string
  tenantType: 'client' | 'efeonce_internal'
  roleCodes: string[]
  routeGroups: string[]
}

const PORTAL_ACCESS_PRIORITY: Record<CanonicalPersonPortalAccessState, number> = {
  active: 4,
  inactive: 3,
  degraded_link: 2,
  missing_principal: 1
}

const RESOLUTION_SOURCE_PRIORITY: Record<CanonicalPersonResolutionSource, number> = {
  person_360: 4,
  direct_user: 3,
  direct_member: 2,
  fallback: 1
}

type GovernancePreviewCandidate = GovernancePreviewBaselineUser & {
  identityProfileId: string | null
  memberId: string | null
  portalAccessState: CanonicalPersonPortalAccessState
  resolutionSource: CanonicalPersonResolutionSource
}

const comparePreviewCandidates = (
  left: GovernancePreviewCandidate,
  right: GovernancePreviewCandidate
) => {
  const accessDiff = PORTAL_ACCESS_PRIORITY[right.portalAccessState] - PORTAL_ACCESS_PRIORITY[left.portalAccessState]

  if (accessDiff !== 0) {
    return accessDiff
  }

  const resolutionDiff =
    RESOLUTION_SOURCE_PRIORITY[right.resolutionSource] - RESOLUTION_SOURCE_PRIORITY[left.resolutionSource]

  if (resolutionDiff !== 0) {
    return resolutionDiff
  }

  return left.fullName.localeCompare(right.fullName)
}

export const enrichGovernancePreviewUsers = async (
  users: GovernancePreviewBaselineUser[]
): Promise<AdminGovernanceUserPreview[]> => {
  const canonicalByUserId = await getCanonicalPersonsByUserIds(users.map(user => user.userId))

  const candidates: GovernancePreviewCandidate[] = users.map(user => {
    const canonical = canonicalByUserId.get(user.userId)

    return {
      ...user,
      fullName: canonical?.displayName ?? user.fullName,
      email: canonical?.canonicalEmail ?? user.email,
      tenantType: canonical?.tenantType ?? user.tenantType,
      identityProfileId: canonical?.identityProfileId ?? null,
      memberId: canonical?.memberId ?? null,
      portalAccessState: canonical?.portalAccessState ?? 'degraded_link',
      resolutionSource: canonical?.resolutionSource ?? 'fallback'
    }
  })

  const grouped = new Map<string, GovernancePreviewCandidate[]>()

  for (const candidate of candidates) {
    const previewKey = candidate.identityProfileId
      ? `person:${candidate.identityProfileId}`
      : `user:${candidate.userId}`

    const current = grouped.get(previewKey) ?? []

    current.push(candidate)
    grouped.set(previewKey, current)
  }

  return Array.from(grouped.entries())
    .map(([previewKey, groupedCandidates]) => {
      const ranked = [...groupedCandidates].sort(comparePreviewCandidates)
      const primary = ranked[0]

      const roleCodes = Array.from(
        new Set(groupedCandidates.flatMap(candidate => candidate.roleCodes))
      ).sort()

      const routeGroups = Array.from(
        new Set(groupedCandidates.flatMap(candidate => candidate.routeGroups))
      ).sort()

      const linkedUserIds = Array.from(
        new Set(groupedCandidates.map(candidate => candidate.userId).filter(Boolean))
      ).sort()

      return {
        previewKey,
        previewMode: (primary.identityProfileId ? 'person' : 'portal_principal') as AdminGovernanceUserPreview['previewMode'],
        userId: primary.userId,
        linkedUserIds,
        portalPrincipalCount: linkedUserIds.length,
        canManageOverrides: Boolean(primary.userId),
        fullName: primary.fullName,
        email: primary.email,
        tenantType: primary.tenantType,
        roleCodes,
        routeGroups,
        identityProfileId: primary.identityProfileId,
        memberId: primary.memberId,
        portalAccessState: primary.portalAccessState,
        resolutionSource: primary.resolutionSource
      }
    })
    .sort((left, right) => left.fullName.localeCompare(right.fullName))
}
