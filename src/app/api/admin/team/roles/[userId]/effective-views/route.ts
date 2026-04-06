import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { getUserRoleAssignments } from '@/lib/admin/role-management'
import { getUserPermissionSets, resolvePermissionSetViews } from '@/lib/admin/permission-sets'
import { VIEW_REGISTRY } from '@/lib/admin/view-access-catalog'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { ROLE_CODES } from '@/config/role-codes'
import { deriveRouteGroupsForSingleRole } from '@/lib/tenant/role-route-mapping'
import type { EffectiveViewEntry, EffectiveViewSource, EffectiveViewsResponse } from '@/types/permission-sets'

export const dynamic = 'force-dynamic'

type RoleAssignmentRow = {
  role_code: string
  view_code: string
  granted: boolean
}

type UserOverrideRow = {
  view_code: string
  override_type: 'grant' | 'revoke'
}

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await params

  try {
    // Fetch all data in parallel
    const [roleAssignments, userPermissionSets, permSetViewCodes, roleViewRows, userOverrideRows] = await Promise.all([
      getUserRoleAssignments(userId),
      getUserPermissionSets(userId),
      resolvePermissionSetViews(userId),
      runGreenhousePostgresQuery<RoleAssignmentRow>(
        'SELECT role_code, view_code, granted FROM greenhouse_core.role_view_assignments'
      ).catch(() => [] as RoleAssignmentRow[]),
      runGreenhousePostgresQuery<UserOverrideRow>(
        `SELECT view_code, override_type
         FROM greenhouse_core.user_view_overrides
         WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
        [userId]
      ).catch(() => [] as UserOverrideRow[])
    ])

    const roleCodes = roleAssignments.map(a => a.roleCode)
    const userTenantType = 'efeonce_internal' as const // admin context = internal

    // Build persisted role→view map
    const persistedByRole = new Map<string, Map<string, boolean>>()

    for (const row of roleViewRows) {
      const m = persistedByRole.get(row.role_code) ?? new Map<string, boolean>()

      m.set(row.view_code, row.granted)
      persistedByRole.set(row.role_code, m)
    }

    // Build permission set view→set map (for source attribution)
    const permSetViewSourceMap = new Map<string, { setId: string; setName: string }>()

    for (const ps of userPermissionSets) {
      for (const vc of ps.viewCodes) {
        if (!permSetViewSourceMap.has(vc)) {
          permSetViewSourceMap.set(vc, { setId: ps.setId, setName: ps.setName })
        }
      }
    }

    // Build user override map
    const userOverrideMap = new Map<string, 'grant' | 'revoke'>()

    for (const row of userOverrideRows) {
      userOverrideMap.set(row.view_code, row.override_type)
    }

    // Permission set view codes as a Set for quick lookup
    const permSetViewCodeSet = new Set(permSetViewCodes)

    // Resolve effective views with source attribution
    const effectiveViews: EffectiveViewEntry[] = []

    for (const view of VIEW_REGISTRY) {
      const overrideType = userOverrideMap.get(view.viewCode)

      // If explicitly revoked by user override, skip
      if (overrideType === 'revoke') continue

      let source: EffectiveViewSource | null = null
      let sourceId: string | null = null
      let sourceName: string | null = null

      // Check if granted by user override
      if (overrideType === 'grant') {
        source = 'user_override'
        sourceName = 'Override manual'
      }

      // Check role-based access (persisted or fallback)
      if (!source) {
        for (const roleCode of roleCodes) {
          const roleAssignment = persistedByRole.get(roleCode)
          const derivedRouteGroups = deriveRouteGroupsForSingleRole(roleCode, userTenantType)

          if (roleAssignment?.has(view.viewCode)) {
            if (roleAssignment.get(view.viewCode)) {
              source = 'role'
              sourceId = roleCode
              sourceName = roleAssignments.find(a => a.roleCode === roleCode)?.roleName || roleCode
              break
            }
          } else {
            // Fallback check
            const isAdmin = roleCode === ROLE_CODES.EFEONCE_ADMIN
            const isInternal = derivedRouteGroups.includes('internal')

            const fallbackGranted =
              derivedRouteGroups.includes(view.routeGroup) ||
              (isAdmin && ['admin', 'finance', 'hr', 'people', 'ai_tooling', 'internal'].includes(view.routeGroup)) ||
              (view.routeGroup === 'people' && (roleCode === ROLE_CODES.EFEONCE_OPERATIONS || roleCode === ROLE_CODES.HR_PAYROLL)) ||
              (view.routeGroup === 'internal' && isInternal)

            if (fallbackGranted) {
              source = 'role_fallback'
              sourceId = roleCode
              sourceName = roleAssignments.find(a => a.roleCode === roleCode)?.roleName || roleCode
              break
            }
          }
        }
      }

      // Check permission set access
      if (!source && permSetViewCodeSet.has(view.viewCode)) {
        const setInfo = permSetViewSourceMap.get(view.viewCode)

        source = 'permission_set'
        sourceId = setInfo?.setId || null
        sourceName = setInfo?.setName || null
      }

      if (source) {
        effectiveViews.push({
          viewCode: view.viewCode,
          label: view.label,
          section: view.section,
          routeGroup: view.routeGroup,
          source,
          sourceId,
          sourceName
        })
      }
    }

    const summary = {
      totalViews: effectiveViews.length,
      fromRoles: effectiveViews.filter(v => v.source === 'role').length,
      fromRoleFallback: effectiveViews.filter(v => v.source === 'role_fallback').length,
      fromPermissionSets: effectiveViews.filter(v => v.source === 'permission_set').length,
      fromOverrides: effectiveViews.filter(v => v.source === 'user_override').length
    }

    const response: EffectiveViewsResponse = { userId, effectiveViews, summary }

    return NextResponse.json(response)
  } catch (error) {
    console.error(`[admin/team/roles/${userId}/effective-views] GET error:`, error)

    return NextResponse.json({ error: 'No se pudo resolver las vistas efectivas.' }, { status: 500 })
  }
}
