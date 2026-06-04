import { NextResponse } from 'next/server'

import { authorizeLifecycle } from '@/lib/client-lifecycle/api-helpers'
import { listFinanceContactSuggestionsForCompany } from '@/lib/client-onboarding/finance-contact-suggestions'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

// GET /api/admin/clients/lifecycle/finance-contacts?hubspotCompanyId=<id>
// TASK-997 Slice 2 — sugiere contactos de finanzas desde la proyección
// greenhouse_crm.contacts para el wizard de alta. Degradación honesta: si la
// lectura falla, devuelve degraded=true + items vacío (la UI cae a manual).
export async function GET(request: Request) {
  const { tenant, errorResponse } = await authorizeLifecycle('client.lifecycle.case.read')

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const hubspotCompanyId = searchParams.get('hubspotCompanyId')

  try {
    const items = await listFinanceContactSuggestionsForCompany(hubspotCompanyId)

    return NextResponse.json({ items, degraded: false })
  } catch (error) {
    captureWithDomain(error, 'commercial', {
      tags: { source: 'client_lifecycle_finance_contacts_suggest' }
    })

    // Degradación honesta: el wizard nunca se rompe por esto — el operador
    // siempre puede ingresar el contacto manualmente.
    return NextResponse.json({ items: [], degraded: true })
  }
}
