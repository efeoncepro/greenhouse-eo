import { NextResponse } from 'next/server'

import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'
import { checkPublicReadAllowed } from '@/lib/growth/ai-visibility/public-delivery/read-guard'
import { buildPublicReportShortUrl } from '@/lib/growth/ai-visibility/public-report-url'
import { buildPublicReportResponseBody } from '@/lib/growth/ai-visibility/report/public-report-response'
import {
  resolveAiVisibilityReportShortLink,
  trackAiVisibilityReportShortLinkUse
} from '@/lib/growth/ai-visibility/report/short-link'
import { readPublicGraderReport } from '@/lib/growth/ai-visibility/report/snapshot'
import { captureWithDomain } from '@/lib/observability/capture'

const getClientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null

/**
 * TASK-1330 — `GET /api/public/growth/ai-visibility/report/short-link/[code]`
 *
 * Resuelve un short code a su reporte público y sirve el MISMO payload headless que la ruta del
 * token (assembler compartido) → render-in-place: `efeonce-think` renderiza bajo `/s/<code>` sin
 * que el token largo llegue nunca al browser (se resuelve server-to-server acá). `shareFacts.reportUrl`
 * queda con el URL CORTO. Estados distinguidos: 200 activo · 404 desconocido · 410 revocado/expirado
 * (honra también el expiry del reporte subyacente). Rate-limit volumétrico reusa el read-guard.
 * El tracking de uso es best-effort (no bloquea el resolve).
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  try {
    if (!(await checkPublicReadAllowed(getClientIp(request), 'report'))) {
      return NextResponse.json({ error: GH_GROWTH_AI_VISIBILITY.public_read_rate_limited }, { status: 429 })
    }

    const resolved = await resolveAiVisibilityReportShortLink(code)

    if (resolved.status === 'unknown') {
      return NextResponse.json({ error: 'Este enlace no existe.' }, { status: 404 })
    }

    if (resolved.status === 'revoked' || resolved.status === 'expired' || !resolved.reportToken) {
      return NextResponse.json({ error: 'Este enlace expiró o fue revocado.' }, { status: 410 })
    }

    const snapshot = await readPublicGraderReport(resolved.reportToken)

    if (!snapshot) {
      // Código activo pero el snapshot ya no está (expirado/borrado): trátalo como link muerto.
      return NextResponse.json({ error: 'Este enlace expiró o fue revocado.' }, { status: 410 })
    }

    // Best-effort, NO bloqueante: nunca convierte el resolve en un write-on-read que falle.
    void trackAiVisibilityReportShortLinkUse(code)

    return NextResponse.json(
      buildPublicReportResponseBody({ snapshot, reportUrl: buildPublicReportShortUrl(code) })
    )
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_short_link_route' } })

    return NextResponse.json(
      { error: 'No fue posible cargar el reporte. Intenta de nuevo en unos minutos.' },
      { status: 502 }
    )
  }
}
