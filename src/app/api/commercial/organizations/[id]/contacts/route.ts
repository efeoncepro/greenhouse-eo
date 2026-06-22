import { NextResponse } from 'next/server'

import { getOrganizationDetail } from '@/lib/account-360/organization-store'
import { syncOrganizationHubSpotContacts } from '@/lib/account-360/sync-organization-hubspot-contacts'
import { query } from '@/lib/db'
import { canAccessFinanceQuoteOrganization } from '@/lib/finance/quotation-canonical-store'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

// TASK-486: lista los contactos (identity_profile persona) asociados a una organización que
// son candidatos válidos para anclar una cotización. Filtro canónico:
//   - person_memberships activas hacia la org
//   - membership_type comercial (excluye team_member interno y contractor vendor)
// Devuelve ordenado por is_primary DESC, luego full_name. El dropdown de contacto del Quote
// Builder consume este endpoint.

const QUOTE_CONTACT_MEMBERSHIP_TYPES = [
  'client_contact',
  'client_user',
  'contact',
  'billing',
  'partner',
  'advisor'
]

interface ContactRow extends Record<string, unknown> {
  identity_profile_id: string
  full_name: string | null
  canonical_email: string | null
  job_title: string | null
  role_label: string | null
  department: string | null
  membership_type: string
  is_primary: boolean
}

const listQuoteOrganizationContacts = async (organizationId: string) =>
  query<ContactRow>(
    `SELECT
       ip.profile_id AS identity_profile_id,
       ip.full_name,
       ip.canonical_email,
       ip.job_title,
       pm.role_label,
       pm.department,
       pm.membership_type,
       pm.is_primary
     FROM greenhouse_core.person_memberships pm
     JOIN greenhouse_core.identity_profiles ip
       ON ip.profile_id = pm.profile_id
      AND ip.active = TRUE
     WHERE pm.organization_id = $1
       AND pm.active = TRUE
       AND pm.membership_type = ANY($2::text[])
     ORDER BY pm.is_primary DESC, ip.full_name NULLS LAST`,
    [organizationId, QUOTE_CONTACT_MEMBERSHIP_TYPES]
  )

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: organizationId } = await params

  if (!organizationId || !organizationId.trim()) {
    return NextResponse.json({ error: 'organization id is required' }, { status: 400 })
  }

  // Tenant isolation — la org solicitada debe ser visible al tenant. Reutilizamos el resolver
  // canónico (mismo usado por la lista de quotes) para no duplicar lógica de scoping.
  const normalizedOrganizationId = organizationId.trim()
  const canAccessOrganization = await canAccessFinanceQuoteOrganization(tenant, normalizedOrganizationId)

  if (!canAccessOrganization) {
    return NextResponse.json({ error: 'Organization not visible to this tenant.' }, { status: 403 })
  }

  const url = new URL(request.url)
  const refreshMode = url.searchParams.get('refresh') === '1' || url.searchParams.get('sync') === '1'

  let rows = await listQuoteOrganizationContacts(normalizedOrganizationId)
  let refreshedFromHubSpot = false

  if (refreshMode) {
    const organization = await getOrganizationDetail(normalizedOrganizationId)

    if (organization?.hubspotCompanyId) {
      try {
        await syncOrganizationHubSpotContacts({ organizationId: normalizedOrganizationId })
        rows = await listQuoteOrganizationContacts(normalizedOrganizationId)
        refreshedFromHubSpot = true
      } catch (error) {
        console.warn('[commercial organization contacts] hubspot refresh failed', {
          organizationId: normalizedOrganizationId,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
  }

  const items = rows.map(row => ({
    identityProfileId: String(row.identity_profile_id),
    fullName: row.full_name ? String(row.full_name) : null,
    canonicalEmail: row.canonical_email ? String(row.canonical_email) : null,
    jobTitle: row.job_title ? String(row.job_title) : null,
    roleLabel: row.role_label ? String(row.role_label) : null,
    department: row.department ? String(row.department) : null,
    membershipType: String(row.membership_type),
    isPrimary: Boolean(row.is_primary)
  }))

  return NextResponse.json({
    items,
    total: items.length,
    refresh: {
      mode: refreshMode ? 'hubspot' : 'cached',
      refreshedFromHubSpot
    }
  })
}
