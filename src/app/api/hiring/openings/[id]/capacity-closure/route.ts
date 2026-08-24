import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { toHiringErrorResponse } from '@/lib/hiring'
import { HiringNotFoundError } from '@/lib/hiring/errors'
import {
  confirmOpeningCapacityClosure,
  previewOpeningCapacityClosure,
  readLatestClosureRunForOpening
} from '@/lib/hiring/opening-capacity'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1762 Slice 5 — contrato programático del cierre por capacidad.
 *
 * `GET` devuelve el preview + el último run. `POST` confirma. Son adapters delgados sobre los
 * primitives del dominio: **no calculan cohorte, no computan el digest y no escriben tablas**. Un
 * consumidor nuevo —UI de `TASK-1763`, Nexa, MCP— reusa los mismos primitives, no reimplementa
 * reglas.
 *
 * **Dos capabilities separadas a propósito.** Ver el preview es inocuo; confirmar cambia el
 * desenlace de decenas de personas y —con su flag prendido— les escribe. Colapsarlas en una
 * dejaría que cualquiera que puede mirar, pueda ejecutar.
 *
 * 🔴 **El confirm NO se federa como acción de agente.** Bajo el AI Act, selección es alto riesgo
 * con supervisión humana obligatoria: un agente cerrando una cohorte es exactamente la decisión
 * automatizada que el marco prohíbe. El carril gobernado expone el `GET` (lectura); el `POST`
 * exige un actor humano con capability.
 */
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.opening.capacity.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.opening.capacity.read' } })
  }

  try {
    const { id } = await params
    const preview = await previewOpeningCapacityClosure(id)

    // Se reusa el error del dominio en vez de inventar un código canónico nuevo:
    // `toHiringErrorResponse` ya lo traduce a un 404 con prose es-CL.
    if (!preview) throw new HiringNotFoundError('La vacante no existe.', 'hiring_opening_not_found')

    const latestRun = await readLatestClosureRunForOpening(id)

    return NextResponse.json({ preview, latestRun })
  } catch (error) {
    return toHiringErrorResponse(error, 'opening_capacity_closure_preview')
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.opening.capacity.confirm', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'hiring.opening.capacity.confirm' }
    })
  }

  try {
    const { id } = await params

    const body = (await request.json()) as {
      effectDigest?: unknown
      idempotencyKey?: unknown
      includePaused?: unknown
      includeBackup?: unknown
    }

    const result = await confirmOpeningCapacityClosure({
      openingId: id,
      effectDigest: typeof body.effectDigest === 'string' ? body.effectDigest : '',
      idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '',
      // El actor viene del tenant server-side, NUNCA del body: quien confirma es quien está
      // autenticado, no quien el cliente diga que es.
      confirmedByUserId: tenant.userId,
      // Las inclusiones exigen `true` explícito. Cualquier otro valor —incluido `"true"` como
      // string— deja la categoría fuera: quien quiere cerrar una pausa o un respaldo lo declara.
      includePaused: body.includePaused === true,
      includeBackup: body.includeBackup === true
    })

    return NextResponse.json(result, { status: result.replayed ? 200 : 201 })
  } catch (error) {
    return toHiringErrorResponse(error, 'opening_capacity_closure_confirm')
  }
}
