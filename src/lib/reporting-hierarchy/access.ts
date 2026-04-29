import 'server-only'

import { query } from '@/lib/db'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'
import { listReportingSubtree } from '@/lib/reporting-hierarchy/readers'
import {
  toSupervisorAccessSummary,
  type SupervisorAccessSummary,
  type SupervisorScopeRecord
} from '@/lib/reporting-hierarchy/types'

type TenantMemberRow = {
  member_id: string
}

type DirectReportCountRow = {
  direct_reports_count: number | string
}

type DelegatedSupervisorRow = {
  supervisor_member_id: string
}

const isInternalTenant = (tenant: TenantContext) => tenant.tenantType === 'efeonce_internal'

export const resolveTenantHierarchyMemberId = async (tenant: TenantContext): Promise<string | null> => {
  if (!isInternalTenant(tenant)) {
    return null
  }

  if (tenant.memberId) {
    return tenant.memberId
  }

  const rows = await query<TenantMemberRow>(
    `
      SELECT
        m.member_id
      FROM greenhouse_core.client_users AS u
      INNER JOIN greenhouse_core.members AS m
        ON (
          u.identity_profile_id IS NOT NULL
          AND m.identity_profile_id = u.identity_profile_id
        )
        OR (
          LOWER(COALESCE(m.primary_email, '')) = LOWER(COALESCE(u.email, ''))
        )
      WHERE u.user_id = $1
      ORDER BY
        CASE
          WHEN u.identity_profile_id IS NOT NULL AND m.identity_profile_id = u.identity_profile_id THEN 0
          ELSE 1
        END,
        m.active DESC,
        m.display_name ASC NULLS LAST,
        m.member_id ASC
      LIMIT 1
    `,
    [tenant.userId]
  )

  return rows[0]?.member_id ?? null
}

const getDirectReportCount = async (memberId: string) => {
  const rows = await query<DirectReportCountRow>(
    `
      SELECT
        COUNT(*)::int AS direct_reports_count
      FROM greenhouse_core.reporting_lines AS rl
      WHERE rl.supervisor_member_id = $1
        AND rl.effective_from <= CURRENT_TIMESTAMP
        AND (rl.effective_to IS NULL OR rl.effective_to > CURRENT_TIMESTAMP)
    `,
    [memberId]
  )

  return Number(rows[0]?.direct_reports_count ?? 0)
}

const listDelegatedSupervisorIds = async (memberId: string) => {
  const rows = await query<DelegatedSupervisorRow>(
    `
      SELECT DISTINCT
        r.scope_id AS supervisor_member_id
      FROM greenhouse_core.operational_responsibilities AS r
      WHERE r.member_id = $1
        AND r.responsibility_type = 'approval_delegate'
        AND r.scope_type = 'member'
        AND r.active = TRUE
        AND r.effective_from <= CURRENT_TIMESTAMP
        AND (r.effective_to IS NULL OR r.effective_to > CURRENT_TIMESTAMP)
    `,
    [memberId]
  )

  return rows
    .map(row => row.supervisor_member_id)
    .filter(Boolean)
}

export const getSupervisorScopeForTenant = async (tenant: TenantContext): Promise<SupervisorScopeRecord> => {
  const memberId = await resolveTenantHierarchyMemberId(tenant)

  if (!memberId) {
    return {
      memberId: null,
      directReportCount: 0,
      delegatedSupervisorIds: [],
      visibleMemberIds: [],
      hasDirectReports: false,
      hasDelegatedAuthority: false,
      canAccessSupervisorPeople: false,
      canAccessSupervisorLeave: false
    }
  }

  const [directReportCount, delegatedSupervisorIds, ownSubtree] = await Promise.all([
    getDirectReportCount(memberId),
    listDelegatedSupervisorIds(memberId),
    listReportingSubtree(memberId).catch(() => [])
  ])

  const delegatedSubtrees = delegatedSupervisorIds.length > 0
    ? await Promise.all(
        delegatedSupervisorIds.map(async supervisorMemberId =>
          listReportingSubtree(supervisorMemberId).catch(() => [])
        )
      )
    : []

  const visibleMemberIds = new Set<string>([memberId])

  for (const node of ownSubtree) {
    visibleMemberIds.add(node.memberId)
  }

  for (const subtree of delegatedSubtrees) {
    for (const node of subtree) {
      if (node.depth > 0) {
        visibleMemberIds.add(node.memberId)
      }
    }
  }

  const hasDirectReports = directReportCount > 0
  const hasDelegatedAuthority = delegatedSupervisorIds.length > 0

  return {
    memberId,
    directReportCount,
    delegatedSupervisorIds,
    visibleMemberIds: [...visibleMemberIds],
    hasDirectReports,
    hasDelegatedAuthority,
    canAccessSupervisorPeople: hasDirectReports || hasDelegatedAuthority,
    canAccessSupervisorLeave: hasDirectReports || hasDelegatedAuthority
  }
}

export const canViewMemberInSupervisorScope = async ({
  tenant,
  memberId
}: {
  tenant: TenantContext
  memberId: string
}) => {
  const scope = await getSupervisorScopeForTenant(tenant)

  return scope.visibleMemberIds.includes(memberId)
}

/**
 * TASK-727 — JWT-friendly resolver. Acepta el shape mínimo (userId/tenantType/memberId) que
 * está disponible en el JWT callback de NextAuth, sin requerir un TenantContext completo.
 *
 * Devuelve null para tenants no-internal, sesiones sin memberId resuelto, o cualquier error
 * (failsoft: el menú simplemente no muestra surfaces de supervisor — degradación honesta).
 */
export const resolveSupervisorAccessSummaryFromMinimalContext = async (input: {
  userId?: string | null
  tenantType?: string | null
  memberId?: string | null
}): Promise<SupervisorAccessSummary | null> => {
  if (input.tenantType !== 'efeonce_internal') {
    return null
  }

  if (!input.userId && !input.memberId) {
    return null
  }

  try {
    const partialTenant = {
      userId: input.userId ?? '',
      tenantType: 'efeonce_internal' as const,
      memberId: input.memberId ?? undefined
    } as Pick<TenantContext, 'userId' | 'tenantType' | 'memberId'>

    const scope = await getSupervisorScopeForTenant(partialTenant as TenantContext)

    if (!scope.memberId) {
      return null
    }

    return toSupervisorAccessSummary(scope)
  } catch {
    return null
  }
}
