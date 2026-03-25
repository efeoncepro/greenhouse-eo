import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

interface OrgRow extends Record<string, unknown> {
  organization_id: string
  organization_name: string
  legal_name: string | null
  industry: string | null
  country: string | null
  status: string
  space_count: string | number
  member_count: string | number
}

export async function GET() {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = tenant.organizationId

  if (!orgId) {
    return NextResponse.json({ error: 'No organization linked to this account' }, { status: 404 })
  }

  try {
    const rows = await runGreenhousePostgresQuery<OrgRow>(
      `SELECT
        o.organization_id,
        o.organization_name,
        o.legal_name,
        o.industry,
        o.country,
        o.status,
        (SELECT COUNT(*) FROM greenhouse_core.spaces s WHERE s.organization_id = o.organization_id AND s.active = TRUE) AS space_count,
        (SELECT COUNT(*) FROM greenhouse_core.person_memberships pm WHERE pm.organization_id = o.organization_id AND pm.active = TRUE) AS member_count
      FROM greenhouse_core.organizations o
      WHERE o.organization_id = $1`,
      [orgId]
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const org = rows[0]

    return NextResponse.json({
      organizationId: org.organization_id,
      organizationName: org.organization_name,
      legalName: org.legal_name,
      industry: org.industry,
      country: org.country,
      status: org.status,
      spaceCount: Number(org.space_count),
      memberCount: Number(org.member_count)
    })
  } catch (error) {
    console.error('GET /api/my/organization failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
