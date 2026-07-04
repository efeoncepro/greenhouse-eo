import { NextResponse } from 'next/server'

import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'
import { checkPublicReadAllowed } from '@/lib/growth/ai-visibility/public-delivery/read-guard'
import {
  resolveAiVisibilityReportShortLink,
  trackAiVisibilityReportShortLinkUse
} from '@/lib/growth/ai-visibility/report/short-link'
import { captureWithDomain } from '@/lib/observability/capture'

const getClientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null

/**
 * TASK-1330 — `GET /api/public/growth/ai-visibility/report/short-link/[code]`
 *
 * Resuelve un short code a su reporte y devuelve `{ status: 'active', reportToken }`. Contrato
 * pensado para **render-in-place** en el hub: `efeonce-think` `/s/[code].astro` resuelve el código
 * server-side y hace `Astro.rewrite('/brand-visibility/r/<token>')` → el informe se renderiza bajo
 * `/s/<code>` (la URL corta se conserva en el address bar) reusando la página del token existente
 * SIN duplicar el render. El token viaja server-to-server (Think SSR) y NUNCA aparece en el browser
 * ni en el copy compartido. Estados distinguidos: 200 activo · 404 desconocido · 410 revocado/expirado
 * (honra también el expiry del reporte subyacente). Rate-limit volumétrico reusa el read-guard; el
 * tracking de uso es best-effort (no bloquea el resolve).
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

    if (resolved.status !== 'active' || !resolved.reportToken) {
      return NextResponse.json({ error: 'Este enlace expiró o fue revocado.' }, { status: 410 })
    }

    // Best-effort, NO bloqueante: nunca convierte el resolve en un write-on-read que falle.
    void trackAiVisibilityReportShortLinkUse(code)

    return NextResponse.json({ status: 'active', reportToken: resolved.reportToken })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_short_link_route' } })

    return NextResponse.json(
      { error: 'No fue posible resolver el enlace. Intenta de nuevo en unos minutos.' },
      { status: 502 }
    )
  }
}
