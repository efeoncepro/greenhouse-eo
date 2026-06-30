import { NextResponse } from 'next/server'

import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'
import { checkPublicReadAllowed } from '@/lib/growth/ai-visibility/public-delivery/read-guard'
import { readPublicGraderReport } from '@/lib/growth/ai-visibility/report/snapshot'
import { captureWithDomain } from '@/lib/observability/capture'

const getClientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null

/**
 * TASK-1239 — `GET /api/public/growth/ai-visibility/report/[token]`
 *
 * Sirve el snapshot público INMUTABLE de un reporte por token (EPIC-020 A). SIN
 * sesión: el token (no enumerable, 256 bits) ES la autenticación. Respeta `expires_at`
 * (expirado o inexistente → 404, sin distinguir para no filtrar existencia). NUNCA
 * recomputa ni expone raw provider text (sirve el `PublicGraderReport` congelado).
 *
 * Rate-limit proporcional por IP (TASK-1245 Slice 3): protección volumétrica sin gasto LLM;
 * la protección de fondo sigue siendo el token no enumerable (256 bits) + read-only.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  try {
    if (!(await checkPublicReadAllowed(getClientIp(request), 'report'))) {
      return NextResponse.json({ error: GH_GROWTH_AI_VISIBILITY.public_read_rate_limited }, { status: 429 })
    }

    const snapshot = await readPublicGraderReport(token)

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Este reporte no existe o el enlace expiró.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      report: snapshot.publicReport,
      asOf: snapshot.asOf,
      expiresAt: snapshot.expiresAt
    })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_public_report_route' } })

    return NextResponse.json({ error: 'No fue posible cargar el reporte. Intenta de nuevo en unos minutos.' }, { status: 502 })
  }
}
