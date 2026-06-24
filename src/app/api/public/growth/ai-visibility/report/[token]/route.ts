import { NextResponse } from 'next/server'

import { readPublicGraderReport } from '@/lib/growth/ai-visibility/report/snapshot'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * TASK-1239 — `GET /api/public/growth/ai-visibility/report/[token]`
 *
 * Sirve el snapshot público INMUTABLE de un reporte por token (EPIC-020 A). SIN
 * sesión: el token (no enumerable, 256 bits) ES la autenticación. Respeta `expires_at`
 * (expirado o inexistente → 404, sin distinguir para no filtrar existencia). NUNCA
 * recomputa ni expone raw provider text (sirve el `PublicGraderReport` congelado).
 *
 * Hardening pendiente (follow-up): rate-limit por IP en esta lectura. Hoy la protección
 * es el token no enumerable + read-only (sin gasto LLM; eso vive en TASK-1240).
 */

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  try {
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
