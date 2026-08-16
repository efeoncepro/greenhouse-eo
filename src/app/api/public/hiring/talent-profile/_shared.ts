import { NextResponse } from 'next/server'

import { isHiringError } from '@/lib/hiring/errors'
import { captureWithDomain } from '@/lib/observability/capture'

export const TALENT_POOL_PUBLIC_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }

export const clientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null

export const unavailable = () =>
  NextResponse.json(
    { ok: false, code: 'talent_pool_link_unavailable', message: 'Este enlace ya no está disponible.' },
    { status: 404, headers: TALENT_POOL_PUBLIC_HEADERS }
  )

export const toTalentPoolPublicError = (error: unknown) => {
  if (isHiringError(error)) {
    if (error.statusCode === 404) return unavailable()
    const status = error.statusCode === 409 ? 409 : error.statusCode >= 400 && error.statusCode < 500 ? 400 : 502

    return NextResponse.json(
      {
        ok: false,
        code: status === 409 ? 'talent_pool_conflict' : 'talent_pool_invalid_request',
        message:
          status === 409
            ? 'El estado cambió. Actualiza la página e intenta nuevamente.'
            : 'No pudimos procesar esta solicitud.'
      },
      { status, headers: TALENT_POOL_PUBLIC_HEADERS }
    )
  }

  captureWithDomain(error, 'hiring', { tags: { source: 'talent_pool_public_route' } })

  return NextResponse.json(
    { ok: false, code: 'talent_pool_public_error', message: 'No pudimos completar la operación.' },
    { status: 502, headers: TALENT_POOL_PUBLIC_HEADERS }
  )
}
