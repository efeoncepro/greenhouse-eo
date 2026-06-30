import { NextResponse } from 'next/server'

import {
  FixItArtifactsError,
  generateFixItArtifactsForPublicToken
} from '@/lib/growth/ai-visibility/fix-it'
import { checkPublicReadAllowed } from '@/lib/growth/ai-visibility/public-delivery/read-guard'
import { captureWithDomain } from '@/lib/observability/capture'

const getClientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null

/**
 * TASK-1269 — `GET /api/public/growth/ai-visibility/report/[token]/fix-it`
 *
 * Entrega artefactos fix-it public-safe desde un snapshot público ya publicado.
 * Sin sesión: el token del reporte sigue siendo la autenticación. No recomputa el
 * reporte público, sólo usa el `run_id` del snapshot para derivar archivos desde
 * profile/probes existentes.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  try {
    if (!(await checkPublicReadAllowed(getClientIp(request), 'report'))) {
      return NextResponse.json({ error: 'Demasiadas lecturas de reporte. Intenta nuevamente más tarde.' }, { status: 429 })
    }

    const result = await generateFixItArtifactsForPublicToken({ reportToken: token })

    if (!result) {
      return NextResponse.json(
        { error: 'Este reporte no existe o el enlace expiró.' },
        { status: 404 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof FixItArtifactsError && error.code === 'fix_it_disabled') {
      return NextResponse.json({ error: 'Artefactos no disponibles.' }, { status: 404 })
    }

    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_public_fix_it_route' } })

    return NextResponse.json({ error: 'No fue posible generar los artefactos. Intenta de nuevo en unos minutos.' }, { status: 502 })
  }
}
