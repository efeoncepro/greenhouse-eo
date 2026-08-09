import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import type { CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { queueSiteAudit } from '@/lib/growth/seo/site-audit/queue-audit'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1309 — `POST /api/admin/growth/seo/audit/run`
 *
 * Contrato programático de "Correr auditoría" (Full API Parity): la UI operador es UN
 * cliente de esta ruta, no su dueña. Acá vive sólo el plano de transporte — tenant,
 * capability y contrato de error; toda la regla de negocio (idempotencia anti
 * doble-encolado, gate de costo `enforceSeoRunEntitlement`, techo de páginas, persistencia
 * del run y outbox) vive en el primitive `queueSiteAudit`, para que Nexa y el lane MCP
 * obtengan exactamente el mismo comportamiento sin reimplementar nada.
 *
 * ⚠️ La capability es `growth.seo.audit.run` (execute), NO `observation.read`: leer el
 * diagnóstico y gastarle al proveedor son dos permisos distintos. Un analista puede
 * diagnosticar sin poder hacer crecer la factura del cliente.
 */

export const dynamic = 'force-dynamic'

interface RunAuditBody {
  seoTargetId?: unknown
}

/** El contrato del primitive se traduce 1:1 a códigos canónicos: sin prosa inventada acá. */
const ERROR_CODE_MAP: Record<string, CanonicalErrorCode> = {
  disabled: 'seo_module_disabled',
  target_not_found: 'seo_target_not_found',
  target_not_active: 'seo_target_not_active',
  audit_already_running: 'seo_audit_already_running',
  already_captured_today: 'seo_audit_already_captured_today',
  no_entitlement: 'seo_not_entitled',
  expired: 'seo_not_entitled',
  quota_exhausted: 'seo_quota_exhausted',
  budget_exhausted: 'seo_budget_exhausted',
  breaker_open: 'seo_provider_unavailable',
  provider_error: 'seo_provider_unavailable'
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.seo.audit.run', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.seo.audit.run' }
    })
  }

  let body: RunAuditBody

  try {
    body = (await request.json()) as RunAuditBody
  } catch {
    return canonicalErrorResponse('seo_audit_invalid_input', { extra: { reason: 'invalid_json' } })
  }

  const seoTargetId = typeof body.seoTargetId === 'string' ? body.seoTargetId.trim() : ''

  if (!seoTargetId) {
    return canonicalErrorResponse('seo_audit_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['seoTargetId'] }
    })
  }

  try {
    const result = await queueSiteAudit(seoTargetId, tenant.userId)

    if (!result.ok) {
      return canonicalErrorResponse(ERROR_CODE_MAP[result.errorCode] ?? 'internal_error', { extra: { seoTargetId } })
    }

    // 202: el crawl NO terminó — quedó encolado en el proveedor y lo recoge el collect del
    // ops-worker. Devolver 200 sugeriría un reporte listo que todavía no existe.
    return NextResponse.json(
      {
        auditRunId: result.auditRunId,
        seoTargetId: result.seoTargetId,
        captureDate: result.captureDate,
        status: 'running'
      },
      { status: 202 }
    )
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_run_audit_route' },
      extra: { seoTargetId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
