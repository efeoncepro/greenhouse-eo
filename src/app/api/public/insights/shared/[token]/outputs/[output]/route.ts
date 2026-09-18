import { captureWithDomain } from '@/lib/observability/capture'
import {
  INSIGHT_SHARE_PUBLIC_HEADERS,
  readInsightShareClientHint,
  readInsightShareClientIp,
  sharedInsightDenialResponse
} from '@/lib/efeonce-insights/sharing/http'
import { downloadSharedInsightOutput } from '@/lib/efeonce-insights/sharing/public'

/**
 * TASK-1848 — `GET /api/public/insights/shared/[token]/outputs/[output]` → PDF por proxy.
 *
 * El grant se revalida inmediatamente antes de leer los bytes del bucket privado; nunca se
 * entrega una URL de storage que permita saltarse la revocación. Lo ya descargado no es revocable.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ token: string; output: string }> }) {
  const { token, output } = await params

  try {
    const result = await downloadSharedInsightOutput({
      token,
      output,
      clientIp: readInsightShareClientIp(request),
      clientHint: readInsightShareClientHint(request)
    })

    if (result.status !== 'ok') return sharedInsightDenialResponse(result.status)

    return new Response(result.bytes, {
      status: 200,
      headers: {
        ...INSIGHT_SHARE_PUBLIC_HEADERS,
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`
      }
    })
  } catch (error) {
    captureWithDomain(error, 'insights', { tags: { source: 'insights_share_public_download' } })

    return Response.json(
      { error: 'No pudimos preparar la descarga. Intenta de nuevo en unos minutos.', code: 'unavailable' },
      { status: 503, headers: INSIGHT_SHARE_PUBLIC_HEADERS }
    )
  }
}
