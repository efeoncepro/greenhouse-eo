import 'server-only'

import { NextResponse } from 'next/server'

import { z } from 'zod'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

import type { MarketActor } from './markets/commands'
import { marketDomainErrorResponse } from './markets/http'
import { OverrideCategoryError } from './override-category'
import { PromptSetCommandError } from './prompt-packs/prompt-set-command'
import { PromptSetLifecycleError } from './prompt-packs/prompt-set-store'

/**
 * TASK-1962 — rutas admin de configuración del perfil AEO (categoría, set de preguntas). Misma sesión interna y
 * errores canónicos que las rutas de mercado, más el mapeo de estos commands: sin permiso → 403, recurso inexistente →
 * 404, transición inválida → 409, dato inválido → 400. Nunca el mensaje interno al cliente.
 */
export const handleProfileRequest = async (work: (actor: MarketActor) => Promise<unknown>, status = 200) => {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  try {
    return NextResponse.json(await work({ subject: tenant, actor: tenant.userId }), { status })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return canonicalErrorResponse('invalid_request')
    if (error instanceof PromptSetCommandError) return canonicalErrorResponse('forbidden')

    if (error instanceof OverrideCategoryError) {
      return error.code === 'forbidden'
        ? canonicalErrorResponse('forbidden')
        : canonicalErrorResponse('invalid_request', { statusOverride: error.code === 'profile_not_found' ? 404 : 400 })
    }

    if (error instanceof PromptSetLifecycleError) {
      return canonicalErrorResponse('invalid_request', { statusOverride: error.code === 'not_found' ? 404 : 409 })
    }

    const market = marketDomainErrorResponse(error)

    if (market) return market
    captureWithDomain(error, 'growth', { tags: { source: 'aeo_profile_api' } })

    return canonicalErrorResponse('internal_error')
  }
}
