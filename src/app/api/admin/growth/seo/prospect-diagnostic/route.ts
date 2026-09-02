/**
 * TASK-1709 — Lane app del diagnóstico de prospecto.
 *
 * POST dispara `runProspectDiagnostic` (capability `growth.seo.prospect_diagnostic.run`
 * — compromete gasto real con tope duro) y GET lee (`.read`). Ambos consumen el MISMO
 * primitive que el lane ecosystem/MCP: cero lógica duplicada por consumer.
 *
 * La corrida es inline (todas las fuentes live, segundos): maxDuration extendido en vez
 * de una cola — un scheduler que lea la tabla del carril está prohibido por regla dura.
 */

import { NextResponse } from 'next/server'

import type { CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import type { ProspectDiagnosticErrorCode } from '@/lib/growth/seo/prospect/command'
import { runProspectDiagnostic } from '@/lib/growth/seo/prospect/command'
import { listProspectDiagnostics, readProspectDiagnostic } from '@/lib/growth/seo/prospect/reader'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const ERROR_CODE_MAP: Record<ProspectDiagnosticErrorCode, CanonicalErrorCode> = {
  disabled: 'seo_module_disabled',
  invalid_domain: 'seo_prospect_invalid_input',
  unsupported_market: 'seo_prospect_invalid_input',
  daily_cap_exceeded: 'rate_limited',
  no_entitlement: 'seo_not_entitled',
  budget_exhausted: 'seo_budget_exhausted',
  cost_blocked: 'seo_prospect_cost_blocked',
  claim_conflict: 'seo_prospect_invalid_input',
  collect_failed: 'internal_error',
  etv_methodology_rejected: 'seo_etv_methodology_rejected'
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.seo.prospect_diagnostic.run', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.seo.prospect_diagnostic.run' }
    })
  }

  const body = (await request.json().catch(() => null)) as {
    rootDomain?: unknown
    market?: unknown
    competitorDomains?: unknown
  } | null

  if (!body || typeof body.rootDomain !== 'string' || typeof body.market !== 'string') {
    return canonicalErrorResponse('seo_prospect_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['rootDomain', 'market'] }
    })
  }

  const competitorDomains = Array.isArray(body.competitorDomains)
    ? body.competitorDomains.filter((domain): domain is string => typeof domain === 'string').slice(0, 5)
    : undefined

  try {
    const result = await runProspectDiagnostic({
      rootDomain: body.rootDomain,
      market: body.market,
      competitorDomains,
      actor: tenant.userId
    })

    if (!result.ok) {
      return canonicalErrorResponse(ERROR_CODE_MAP[result.errorCode] ?? 'internal_error', {
        extra: {
          prospectErrorCode: result.errorCode,
          ...(result.forecastUsd !== undefined ? { forecastUsd: result.forecastUsd } : {}),
          ...(result.effectiveBudgetUsd !== undefined ? { effectiveBudgetUsd: result.effectiveBudgetUsd } : {})
        }
      })
    }

    return NextResponse.json({ diagnostic: result.diagnostic, reused: result.reused })
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_prospect_diagnostic_route' }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.seo.prospect_diagnostic.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.seo.prospect_diagnostic.read' }
    })
  }

  const url = new URL(request.url)
  const diagnosticId = url.searchParams.get('diagnosticId')

  try {
    if (diagnosticId) {
      const result = await readProspectDiagnostic({ diagnosticId })

      if (!result.ok) {
        return canonicalErrorResponse(
          result.errorCode === 'disabled' ? 'seo_module_disabled' : 'seo_prospect_diagnostic_not_found'
        )
      }

      return NextResponse.json({ diagnostic: result.data })
    }

    const limitParam = Number.parseInt(url.searchParams.get('limit') ?? '', 10)

    const result = await listProspectDiagnostics({
      limit: Number.isFinite(limitParam) ? limitParam : undefined,
      rootDomain: url.searchParams.get('rootDomain') ?? undefined
    })

    if (!result.ok) {
      return canonicalErrorResponse('seo_module_disabled')
    }

    return NextResponse.json({ diagnostics: result.data })
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_prospect_diagnostic_route' }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
