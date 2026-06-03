import { NextResponse } from 'next/server'

import { authorizeLifecycle, mapLifecycleError } from '@/lib/client-lifecycle/api-helpers'
import { resolveClientCompleteness } from '@/lib/client-lifecycle/queries/resolve-client-completeness'

export const dynamic = 'force-dynamic'

// GET /api/admin/clients/lifecycle/completeness?organizationId=<id>
// El wizard lo llama cuando se selecciona una org existente (picker HubSpot o
// gate de duplicado) para detectar si el cliente quedó incompleto y adaptar el
// CTA ("Completar cliente" vs "Crear cliente" vs "Ir a la ficha"). Read-only.
export async function GET(request: Request) {
  const { tenant, errorResponse } = await authorizeLifecycle('client.lifecycle.case.read')

  if (!tenant) return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const organizationId = new URL(request.url).searchParams.get('organizationId')?.trim()

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Falta organizationId.', code: 'invalid_input', actionable: false },
        { status: 400 }
      )
    }

    const completeness = await resolveClientCompleteness(organizationId)

    return NextResponse.json({ completeness })
  } catch (error) {
    return mapLifecycleError(error, 'client_completeness')
  }
}
