import 'server-only'

import { NextResponse } from 'next/server'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

import { HiringNotFoundError, HiringValidationError } from './errors'

/**
 * TASK-353 — Mapeo canónico de errores del dominio Hiring / ATS a respuestas API.
 *
 * Los errores de dominio (HiringValidationError / HiringNotFoundError) llevan mensaje
 * es-CL seguro + code estable → se exponen verbatim (cumple el contrato canónico de error:
 * prosa es-CL, sin inglés, sin stack). Todo lo inesperado se sanitiza vía
 * `redactErrorForResponse` + `captureWithDomain('hiring', …)` y NUNCA filtra
 * `error.message`/`error.stack` al cliente.
 */
export const toHiringErrorResponse = (
  error: unknown,
  source: string,
): NextResponse<{ error: string; code: string; actionable: boolean }> => {
  if (error instanceof HiringValidationError) {
    return NextResponse.json(
      { error: error.message, code: error.code, actionable: error.statusCode >= 500 },
      { status: error.statusCode },
    )
  }

  if (error instanceof HiringNotFoundError) {
    return NextResponse.json({ error: error.message, code: error.code, actionable: false }, { status: 404 })
  }

  captureWithDomain(error, 'hiring', { tags: { source: `hiring:${source}` } })
  
return NextResponse.json(
    {
      error: 'No se pudo completar la operación de Hiring.',
      code: 'hiring_internal_error',
      actionable: true,
      detail: redactErrorForResponse(error),
    },
    { status: 500 },
  )
}

/** Respuesta canónica es-CL para un body que no es JSON válido (shape {error, code, actionable}). */
export const hiringInvalidBodyResponse = (): NextResponse<{ error: string; code: string; actionable: boolean }> =>
  NextResponse.json(
    { error: 'El cuerpo de la solicitud no es JSON válido.', code: 'hiring_invalid_input', actionable: false },
    { status: 400 },
  )

/** Respuesta canónica es-CL 404 para un recurso Hiring inexistente (shape {error, code, actionable}). */
export const hiringNotFoundResponse = (
  message: string,
  code: string,
): NextResponse<{ error: string; code: string; actionable: boolean }> =>
  NextResponse.json({ error: message, code, actionable: false }, { status: 404 })
