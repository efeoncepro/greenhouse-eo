import { captureWithDomain } from '@/lib/observability/capture'
import {
  INSIGHT_SHARE_PUBLIC_HEADERS,
  readInsightShareClientHint,
  readInsightShareClientIp,
  sharedInsightDenialResponse
} from '@/lib/efeonce-insights/sharing/http'
import { readSharedInsightClientLogo } from '@/lib/efeonce-insights/sharing/public'

/**
 * TASK-1875 — `GET /api/public/insights/shared/[token]/logo` → logo del cliente sellado en la portada del plan.
 *
 * Mismo gate que la lectura del informe: revocar el enlace corta también el logo. Nunca una URL de storage.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  try {
    const result = await readSharedInsightClientLogo({
      token,
      clientIp: readInsightShareClientIp(request),
      clientHint: readInsightShareClientHint(request)
    })

    if (result.status !== 'ok') return sharedInsightDenialResponse(result.status)

    return new Response(result.bytes, { status: 200, headers: { ...INSIGHT_SHARE_PUBLIC_HEADERS, 'Content-Type': result.contentType } })
  } catch (error) {
    captureWithDomain(error, 'insights', { tags: { source: 'insights_share_public_logo' } })

    return Response.json(
      { error: 'No pudimos cargar el logo. Intenta de nuevo en unos minutos.', code: 'unavailable' },
      { status: 503, headers: INSIGHT_SHARE_PUBLIC_HEADERS }
    )
  }
}
