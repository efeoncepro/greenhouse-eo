import { NextResponse } from 'next/server'

import { query } from '@/lib/db'
import { errorResponse } from '@/lib/email/error-envelope'
import { resolveQuotationIdentity } from '@/lib/finance/pricing'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface QuoteOrgRow extends Record<string, unknown> {
  organization_id: string | null
  organization_name: string | null
  legal_name: string | null
  hubspot_company_id: string | null
}

interface ContactRow extends Record<string, unknown> {
  contact_record_id: string
  display_name: string
  email: string | null
  job_title: string | null
  hubspot_contact_id: string
  hubspot_primary_company_id: string | null
}

/**
 * GET /api/finance/quotes/[id]/share/contacts
 *
 * Returns the list of contacts associated with the quote's organization.
 * Sources from `greenhouse_crm.contacts` filtered by primary HubSpot company id.
 * Marks the contact whose HubSpot id matches the org's `hubspot_company_id`
 * as primary.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, errorResponse: authError } = await requireFinanceTenantContext()

  if (!tenant) {
    return (
      authError
      || errorResponse({ code: 'unauthorized', message: 'Unauthorized' })
    )
  }

  const { id } = await params
  const identity = await resolveQuotationIdentity(id)

  if (!identity) {
    return errorResponse({ code: 'not_found', message: 'Quotation not found' })
  }

  const orgRows = await query<QuoteOrgRow>(
    `SELECT q.organization_id,
            o.organization_name,
            o.legal_name,
            o.hubspot_company_id
       FROM greenhouse_commercial.quotations q
       LEFT JOIN greenhouse_core.organizations o
         ON o.organization_id = q.organization_id
       WHERE q.quotation_id = $1`,
    [identity.quotationId]
  )

  const org = orgRows[0]

  if (!org?.organization_id) {
    return NextResponse.json({
      organization: null,
      contacts: []
    })
  }

  let contacts: ContactRow[] = []

  if (org.hubspot_company_id) {
    contacts = await query<ContactRow>(
      `SELECT c.contact_record_id,
              c.display_name,
              c.email,
              c.job_title,
              c.hubspot_contact_id,
              c.hubspot_primary_company_id
         FROM greenhouse_crm.contacts c
         WHERE c.is_deleted = false
           AND c.active = true
           AND c.email IS NOT NULL
           AND (
             c.hubspot_primary_company_id = $1
             OR $1 = ANY(c.hubspot_associated_company_ids)
           )
         ORDER BY
           CASE WHEN c.hubspot_primary_company_id = $1 THEN 0 ELSE 1 END,
           c.display_name ASC`,
      [org.hubspot_company_id]
    )
  }

  return NextResponse.json({
    organization: {
      id: org.organization_id,
      name: org.organization_name || org.legal_name || 'Organization',
      hubspotCompanyId: org.hubspot_company_id
    },
    contacts: contacts.map(c => ({
      contactId: c.contact_record_id,
      email: c.email,
      name: c.display_name,
      role: c.job_title,
      isPrimary: c.hubspot_primary_company_id === org.hubspot_company_id,
      hubspotContactId: c.hubspot_contact_id
    }))
  })
}
