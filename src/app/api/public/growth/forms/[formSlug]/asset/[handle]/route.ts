import { NextResponse } from 'next/server'

import { checkPublicReadAllowed } from '@/lib/growth/ai-visibility/public-delivery/read-guard'
import { resolveFormAssetDelivery } from '@/lib/growth/forms/asset-delivery'
import { isFormsPublicApiEnabled } from '@/lib/growth/forms/flags'
import { captureWithDomain } from '@/lib/observability/capture'
import { downloadGreenhouseStorageObject } from '@/lib/storage/greenhouse-media'

/**
 * TASK-1375 — `GET /api/public/growth/forms/[formSlug]/asset/[handle]`.
 *
 * Descarga GATED del asset entregable de un lead magnet (ebook PDF). El `handle` es el
 * `submission_id` no enumerable que el submit aceptado devuelve al browser: sin form
 * completado no hay handle → no hay descarga. Valida submission aceptada + dentro del TTL,
 * resuelve el objeto SERVER-ONLY (`form_asset`) y stremea desde el bucket privado con
 * credenciales de app (proxy-stream; NO 302 a signed-URL — no hay infra de signing). El
 * `formSlug` del path es informativo: la autorización es el handle. Gateado por
 * `GROWTH_FORMS_PUBLIC_API_ENABLED` (default OFF → 404). Reusable por todos los ebooks.
 */
export const dynamic = 'force-dynamic'

const getClientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null

export async function GET(request: Request, { params }: { params: Promise<{ formSlug: string; handle: string }> }) {
  const { handle } = await params

  try {
    if (!isFormsPublicApiEnabled()) {
      return NextResponse.json({ error: 'No disponible.' }, { status: 404 })
    }

    if (!(await checkPublicReadAllowed(getClientIp(request), 'report'))) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta nuevamente en unos segundos.' },
        { status: 429 },
      )
    }

    const delivery = await resolveFormAssetDelivery(handle)

    if (!delivery.ok) {
      const status = delivery.reason === 'not_ready' ? 409 : delivery.reason === 'expired' ? 410 : 404

      const message =
        delivery.reason === 'not_ready'
          ? 'Tu descarga aún no está lista. Vuelve a intentar en unos segundos.'
          : delivery.reason === 'expired'
            ? 'El enlace de descarga expiró. Vuelve a solicitar el ebook.'
            : 'No encontramos este ebook o el enlace no es válido.'

      return NextResponse.json({ error: message }, { status })
    }

    const object = await downloadGreenhouseStorageObject({
      bucketName: delivery.bucketName,
      objectName: delivery.objectName,
    })

    const bytes = new Uint8Array(object.arrayBuffer)

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${delivery.fileName}"`,
        'Content-Length': String(bytes.byteLength),
        'Content-Type': delivery.contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_forms_public_asset_download_route' } })

    return NextResponse.json(
      { error: 'No fue posible entregar el ebook. Intenta de nuevo en unos minutos.' },
      { status: 502 },
    )
  }
}
