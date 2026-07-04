import { NextResponse } from 'next/server'

import { buildAiVisibilityReportAttachment } from '@/lib/growth/ai-visibility/public-delivery/email/build-report-attachment'
import { checkPublicReadAllowed } from '@/lib/growth/ai-visibility/public-delivery/read-guard'
import { buildReportHeader } from '@/lib/growth/ai-visibility/report/report-header'
import { readPublicGraderReport } from '@/lib/growth/ai-visibility/report/snapshot'
import { captureWithDomain } from '@/lib/observability/capture'

const getClientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null

/**
 * GET /api/public/growth/ai-visibility/report/[token]/pdf
 *
 * Descarga portable del snapshot público. Reusa el mismo token no enumerable del informe web,
 * el mismo public-safe snapshot congelado y el renderer PDF del email. No recalcula scoring,
 * no toca provider raw answers y no expone campos internos.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  try {
    if (!(await checkPublicReadAllowed(getClientIp(request), 'report'))) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta nuevamente en unos segundos.' }, { status: 429 })
    }

    const snapshot = await readPublicGraderReport(token)

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Este reporte no existe o el enlace expiró.' },
        { status: 404 },
      )
    }

    const header = buildReportHeader({ organizationName: snapshot.brandName, asOf: snapshot.asOf })

    const attachment = await buildAiVisibilityReportAttachment({
      publicReport: snapshot.publicReport,
      header,
    })

    return new NextResponse(new Uint8Array(attachment.content), {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${attachment.filename}"`,
        'Content-Length': String(attachment.byteLength),
        'Content-Type': attachment.contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_public_report_pdf_route' } })

    return NextResponse.json({ error: 'No fue posible generar el PDF. Intenta de nuevo en unos minutos.' }, { status: 502 })
  }
}
