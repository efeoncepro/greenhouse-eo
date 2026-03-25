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
        COALESCE(ip.full_name, cu.full_name) AS full_name,
        COALESCE(ip.canonical_email, cu.email) AS email,
        pm.membership_type,
        pm.role_label,
        pm.department,
        pm.is_primary
      FROM greenhouse_core.person_memberships pm
      LEFT JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = pm.profile_id
      LEFT JOIN greenhouse_core.client_users cu ON cu.identity_profile_id = pm.profile_id AND cu.active = TRUE
      WHERE pm.organization_id = $1
        AND pm.active = TRUE
      ORDER BY pm.is_primary DESC, COALESCE(ip.full_name, cu.full_name, pm.role_label) ASC`,
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
      isPrimary: r.is_primary
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
