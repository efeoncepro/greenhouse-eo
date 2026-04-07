import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

interface MemberRow extends Record<string, unknown> {
  membership_id: string
  profile_id: string
  full_name: string | null
  email: string | null
  membership_type: string
  role_label: string | null
  department: string | null
  is_primary: boolean
  avatar_url: string | null
  job_title: string | null
  department_name: string | null
}

export async function GET() {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = tenant.organizationId

  if (!orgId) {
    return NextResponse.json({ error: 'No organization linked' }, { status: 404 })
  }

  try {
    const rows = await runGreenhousePostgresQuery<MemberRow>(
      `SELECT
        pm.membership_id,
        pm.profile_id,
        COALESCE(p360.resolved_display_name, ip.full_name, cu.full_name) AS full_name,
        COALESCE(ip.canonical_email, cu.email) AS email,
        pm.membership_type,
        COALESCE(p360.resolved_job_title, pm.role_label) AS role_label,
        COALESCE(p360.department_name, pm.department) AS department,
        pm.is_primary,
        p360.resolved_avatar_url AS avatar_url,
        p360.resolved_job_title AS job_title,
        p360.department_name
      FROM greenhouse_core.person_memberships pm
      LEFT JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = pm.profile_id
      LEFT JOIN greenhouse_core.client_users cu ON cu.identity_profile_id = pm.profile_id AND cu.active = TRUE
      LEFT JOIN greenhouse_serving.person_360 p360 ON p360.identity_profile_id = pm.profile_id
      WHERE pm.organization_id = $1
        AND pm.active = TRUE
      ORDER BY pm.is_primary DESC, COALESCE(p360.resolved_display_name, ip.full_name, cu.full_name, pm.role_label) ASC`,
      [orgId]
    )

    const members = rows.map(r => ({
      membershipId: r.membership_id,
      profileId: r.profile_id,
      fullName: r.full_name || 'Sin nombre',
      email: r.email || null,
      membershipType: r.membership_type,
      roleLabel: r.role_label,
      department: r.department,
      isPrimary: r.is_primary,
      avatarUrl: r.avatar_url || null,
      jobTitle: r.job_title || null,
      departmentName: r.department_name || null
    }))

    return NextResponse.json({ items: members, total: members.length })
  } catch (error) {
    console.error('GET /api/my/organization/members failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
