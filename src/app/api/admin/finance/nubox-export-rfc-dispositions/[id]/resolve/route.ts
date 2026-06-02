import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import {
  NuboxExportDispositionError,
  resolveNuboxExportRfcDisposition
} from '@/lib/finance/nubox-export-rfc-disposition/store'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-990 Slice 4 — Resuelve una disposición de factura de exportación Nubox:
 * la vincula a la organización canónica (`action: 'link'` + `organizationId`) o
 * la descarta (`action: 'dismiss'`). Razón >= 10 chars en ambos casos. Audit
 * append-only vía outbox `finance.nubox_export.rfc_disposition_resolved v1`.
 * Gated por capability finance.nubox_export.review_disposition.
 */
interface ResolveBody {
  action?: unknown
  organizationId?: unknown
  reason?: unknown
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'finance.nubox_export.review_disposition', 'update', 'tenant')) {
    return NextResponse.json(
      { error: 'No tienes permiso para resolver disposiciones de exportación Nubox.', code: 'forbidden' },
      { status: 403 }
    )
  }

  const { id: dispositionId } = await params

  if (!dispositionId) {
    return NextResponse.json(
      { error: 'disposition_id requerido en path', code: 'validation_error' },
      { status: 400 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as ResolveBody
  const action = body.action === 'link' || body.action === 'dismiss' ? body.action : null
  const reason = typeof body.reason === 'string' ? body.reason : ''
  const organizationId = typeof body.organizationId === 'string' ? body.organizationId : ''

  if (!action) {
    return NextResponse.json(
      { error: "action debe ser 'link' o 'dismiss'.", code: 'validation_error' },
      { status: 400 }
    )
  }

  try {
    const result =
      action === 'link'
        ? await resolveNuboxExportRfcDisposition({
            dispositionId,
            action: 'link',
            organizationId,
            reason,
            actorUserId: tenant.userId
          })
        : await resolveNuboxExportRfcDisposition({
            dispositionId,
            action: 'dismiss',
            reason,
            actorUserId: tenant.userId
          })

    return NextResponse.json({ ok: true, disposition: result })
  } catch (error) {
    if (error instanceof NuboxExportDispositionError) {
      const status = error.code === 'disposition_not_found' ? 404 : 422

      return NextResponse.json({ error: error.message, code: error.code }, { status })
    }

    captureWithDomain(error, 'finance', {
      tags: { source: 'nubox_export_rfc_disposition_resolve_endpoint' },
      extra: { dispositionId }
    })

    return NextResponse.json(
      { error: 'No fue posible resolver la disposición. Revisa los logs.', code: 'resolve_failed' },
      { status: 500 }
    )
  }
}
