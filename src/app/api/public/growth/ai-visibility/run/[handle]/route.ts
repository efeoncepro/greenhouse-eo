import { NextResponse } from 'next/server'

import { publicFormsCorsHeaders, publicFormsOptionsResponse } from '@/app/api/public/growth/forms/cors'
import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'
import { checkPublicReadAllowed } from '@/lib/growth/ai-visibility/public-delivery/read-guard'
import { readPublicGraderRunStatus } from '@/lib/growth/ai-visibility/public-delivery/status-reader'
import { captureWithDomain } from '@/lib/observability/capture'

const getClientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null

/**
 * TASK-1245 — `GET /api/public/growth/ai-visibility/run/[handle]` (EPIC-020)
 *
 * Status público del run del lead magnet por POLL. SIN sesión: el `handle` (poll_token de alta
 * entropía o submission_id del motor) ES la auth — el `public_id` secuencial NUNCA resuelve acá.
 * READ-ONLY PURO: refleja estado y devuelve `reportToken` SÓLO cuando existe snapshot publicable;
 * NUNCA publica snapshots ni dispara writes (el auto-publish vive en el worker, Slice 2). El DTO
 * es bounded: sin email/PII, raw provider text, accuracy findings ni el motivo de `review_required`.
 *
 * `not_found` → 404 (sin distinguir handle inválido de inexistente). Todo otro estado → 200 con el
 * DTO de poll. Hardening de rate-limit por IP → Slice 3.
 */
export const dynamic = 'force-dynamic'

const METHODS = 'GET, OPTIONS'

export function OPTIONS(request: Request) {
  return publicFormsOptionsResponse(request, METHODS)
}

export async function GET(request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const headers = await publicFormsCorsHeaders(request, METHODS)

  try {
    // Rate-limit proporcional por IP (sin gasto LLM). El handle no enumerable es la protección de fondo.
    if (!(await checkPublicReadAllowed(getClientIp(request), 'status'))) {
      return NextResponse.json({ error: GH_GROWTH_AI_VISIBILITY.public_read_rate_limited }, { status: 429, headers })
    }

    const status = await readPublicGraderRunStatus(handle)

    return NextResponse.json(
      {
        status: status.status,
        reportToken: status.reportToken,
        message: status.reason,
        retryAfterSeconds: status.retryAfterSeconds,
      },
      { status: status.status === 'not_found' ? 404 : 200, headers },
    )
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_public_run_status_route' } })

    return NextResponse.json(
      { error: 'No fue posible consultar el estado. Intenta de nuevo en unos minutos.' },
      { status: 502, headers },
    )
  }
}
