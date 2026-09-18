import { captureWithDomain } from '@/lib/observability/capture'
import {
  INSIGHT_SHARE_PUBLIC_HEADERS,
  readInsightShareClientHint,
  readInsightShareClientIp,
  sharedInsightDenialResponse
} from '@/lib/efeonce-insights/sharing/http'
import { resolveSharedInsightEdition } from '@/lib/efeonce-insights/sharing/public'

/**
 * TASK-1848 — `GET /api/public/insights/shared/[token]` → `InsightSharedEditionResponseV1`.
 *
 * Sin sesión: el token (256 bits, sólo su digest persistido) ES la autorización, acotada a UNA
 * edición emitida de audiencia cliente. Consumidor: `efeonce-think` (`/insights/r/<token>`), que
 * resuelve server-side por request. 404 = desconocido/expirado (indistinto), 410 = revocado o
 * retirado, 429 = rate limit. `private, no-store`: revocar corta la siguiente lectura.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  try {
    const result = await resolveSharedInsightEdition({
      token,
      clientIp: readInsightShareClientIp(request),
      clientHint: readInsightShareClientHint(request)
    })

    if (result.status !== 'ok') return sharedInsightDenialResponse(result.status)

    return Response.json(result.body, { status: 200, headers: INSIGHT_SHARE_PUBLIC_HEADERS })
  } catch (error) {
    captureWithDomain(error, 'insights', { tags: { source: 'insights_share_public_view' } })

    return Response.json(
      { error: 'No pudimos cargar este informe. Intenta de nuevo en unos minutos.', code: 'unavailable' },
      { status: 503, headers: INSIGHT_SHARE_PUBLIC_HEADERS }
    )
  }
}
