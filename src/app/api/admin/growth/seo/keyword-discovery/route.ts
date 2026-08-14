import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import type { CanonicalErrorCode } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import type {
  SeoDiscoveryActionKind,
  SeoDiscoveryMethod,
  SeoDiscoveryRunStatus,
  SeoDiscoverySourceKind
} from '@/lib/growth/seo/keyword-discovery/contracts'
import {
  SEO_DISCOVERY_ACTION_KINDS,
  SEO_DISCOVERY_SOURCE_KINDS
} from '@/lib/growth/seo/keyword-discovery/contracts'
import {
  previewKeywordDiscovery,
  queueKeywordDiscovery,
  recordKeywordDiscoveryAction
} from '@/lib/growth/seo/keyword-discovery/queue'
import { readKeywordDiscovery } from '@/lib/growth/seo/keyword-discovery/reader'
import type { SeoSearchIntent } from '@/lib/growth/seo/keyword-market-data'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1664 — `POST/GET /api/admin/growth/seo/keyword-discovery`
 *
 * Contrato programático del keyword discovery (Full API Parity): la UI del workbench
 * (TASK-1665) es UN cliente de esta ruta, no su dueña. Acá vive sólo el transporte —
 * tenant, capability y error mapping; la regla de negocio (seeds, límites, costo, gate,
 * idempotencia, outbox) vive en los primitives `queueKeywordDiscovery` /
 * `readKeywordDiscovery` / `recordKeywordDiscoveryAction`, los MISMOS que consumen Nexa,
 * el lane ecosystem y MCP.
 *
 * ⚠️ Dos capabilities, dos planos: leer discovery exige `growth.seo.observation.read`;
 * encolar (que compromete gasto de proveedor) y registrar decisiones exige
 * `growth.seo.target.configure`. Un analista puede mirar candidatos sin poder gastar.
 *
 * POST discrimina por `intent`: `preview` (dry-run, cero inserts) · `queue` (encola y
 * responde 202: la corrida es async, un 200 sugeriría resultados listos) ·
 * `record_action` (log append-only de decisión; JAMÁS trackea por sí solo).
 */

export const dynamic = 'force-dynamic'

/** El contrato del primitive se traduce 1:1 a códigos canónicos: sin prosa inventada acá. */
const ERROR_CODE_MAP: Record<string, CanonicalErrorCode> = {
  seo_keyword_discovery_disabled: 'seo_module_disabled',
  forbidden: 'seo_not_entitled',
  target_not_found: 'seo_target_not_found',
  invalid_seed: 'seo_discovery_invalid_input',
  limit_exceeded: 'seo_discovery_invalid_input',
  budget_blocked: 'seo_budget_exhausted',
  provider_error: 'seo_provider_unavailable',
  busy: 'seo_provider_unavailable',
  run_not_found: 'seo_discovery_run_not_found'
}

interface DiscoveryPostBody {
  intent?: unknown
  organizationId?: unknown
  seoTargetId?: unknown
  market?: unknown
  seedSource?: unknown
  manualSeeds?: unknown
  mixedMeasuredSource?: unknown
  methods?: unknown
  idempotencyKey?: unknown
  candidateId?: unknown
  actionKind?: unknown
  metadata?: unknown
}

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const parseMethods = (value: unknown): Array<{ method: SeoDiscoveryMethod; resultsPerCall?: number }> => {
  if (!Array.isArray(value)) return []

  const methods: Array<{ method: SeoDiscoveryMethod; resultsPerCall?: number }> = []

  for (const entry of value) {
    if (typeof entry === 'string') {
      methods.push({ method: entry as SeoDiscoveryMethod })

      continue
    }

    if (typeof entry === 'object' && entry !== null && typeof (entry as { method?: unknown }).method === 'string') {
      const spec = entry as { method: string; resultsPerCall?: unknown }

      methods.push({
        method: spec.method as SeoDiscoveryMethod,
        resultsPerCall: typeof spec.resultsPerCall === 'number' ? spec.resultsPerCall : undefined
      })
    }
  }

  return methods
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.seo.target.configure', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.seo.target.configure' }
    })
  }

  let body: DiscoveryPostBody

  try {
    body = (await request.json()) as DiscoveryPostBody
  } catch {
    return canonicalErrorResponse('seo_discovery_invalid_input', { extra: { reason: 'invalid_json' } })
  }

  const intent = asString(body.intent) || 'queue'
  const organizationId = asString(body.organizationId)

  if (!organizationId) {
    return canonicalErrorResponse('seo_discovery_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['organizationId'] }
    })
  }

  try {
    if (intent === 'record_action') {
      const candidateId = asString(body.candidateId)
      const actionKind = asString(body.actionKind) as SeoDiscoveryActionKind

      if (!candidateId || !SEO_DISCOVERY_ACTION_KINDS.includes(actionKind)) {
        return canonicalErrorResponse('seo_discovery_invalid_input', {
          extra: { reason: 'missing_required_fields', required: ['candidateId', 'actionKind'] }
        })
      }

      const result = await recordKeywordDiscoveryAction({
        organizationId,
        candidateId,
        actionKind,
        actor: tenant.userId,
        idempotencyKey: asString(body.idempotencyKey) || undefined,
        metadata:
          typeof body.metadata === 'object' && body.metadata !== null
            ? (body.metadata as Record<string, unknown>)
            : undefined
      })

      if (!result.ok) {
        return canonicalErrorResponse(ERROR_CODE_MAP[result.errorCode] ?? 'internal_error', {
          extra: { candidateId }
        })
      }

      return NextResponse.json({ actionId: result.actionId, deduped: result.deduped })
    }

    const seedSource = asString(body.seedSource) as SeoDiscoverySourceKind

    if (!SEO_DISCOVERY_SOURCE_KINDS.includes(seedSource)) {
      return canonicalErrorResponse('seo_discovery_invalid_input', {
        extra: { reason: 'missing_required_fields', required: ['seedSource'] }
      })
    }

    const input = {
      organizationId,
      seoTargetId: asString(body.seoTargetId) || undefined,
      market: asString(body.market) || null,
      seedSource,
      manualSeeds: Array.isArray(body.manualSeeds)
        ? body.manualSeeds.filter((item): item is string => typeof item === 'string')
        : undefined,
      mixedMeasuredSource:
        asString(body.mixedMeasuredSource) === 'tracked_keywords' ? ('tracked_keywords' as const) : undefined,
      methods: parseMethods(body.methods),
      actor: tenant.userId,
      idempotencyKey: asString(body.idempotencyKey) || undefined
    }

    if (intent === 'preview') {
      const result = await previewKeywordDiscovery(input)

      if (!result.ok) {
        return canonicalErrorResponse(ERROR_CODE_MAP[result.errorCode] ?? 'internal_error', {
          extra: { reason: result.reason ?? null }
        })
      }

      return NextResponse.json(result)
    }

    const result = await queueKeywordDiscovery(input)

    if (!result.ok) {
      return canonicalErrorResponse(ERROR_CODE_MAP[result.errorCode] ?? 'internal_error', {
        extra: { reason: result.reason ?? result.blockedReason ?? null }
      })
    }

    // 202: la corrida quedó durable pero corre async en el ops-worker. Un 200 sugeriría
    // candidatos listos que todavía no existen.
    return NextResponse.json(result, { status: 202 })
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_keyword_discovery_route' },
      extra: { organizationId, intent }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.seo.observation.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.seo.observation.read' }
    })
  }

  const url = new URL(request.url)
  const organizationId = url.searchParams.get('organizationId')?.trim() ?? ''

  if (!organizationId) {
    return canonicalErrorResponse('seo_discovery_invalid_input', {
      extra: { reason: 'missing_required_fields', required: ['organizationId'] }
    })
  }

  const parseNumber = (value: string | null): number | undefined => {
    if (value === null || value.trim() === '') return undefined

    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : undefined
  }

  try {
    const result = await readKeywordDiscovery({
      organizationId,
      seoTargetId: url.searchParams.get('seoTargetId')?.trim() || undefined,
      runId: url.searchParams.get('runId')?.trim() || undefined,
      status: (url.searchParams.get('status')?.trim() || undefined) as SeoDiscoveryRunStatus | undefined,
      sourceEndpoint: (url.searchParams.get('sourceEndpoint')?.trim() || undefined) as SeoDiscoveryMethod | undefined,
      query: url.searchParams.get('query')?.trim() || undefined,
      intent: (url.searchParams.get('intent')?.trim() || undefined) as SeoSearchIntent | undefined,
      minSearchVolume: parseNumber(url.searchParams.get('minSearchVolume')),
      maxDifficulty: parseNumber(url.searchParams.get('maxDifficulty')),
      limit: parseNumber(url.searchParams.get('limit')),
      cursor: url.searchParams.get('cursor')
    })

    if (!result.ok) {
      return canonicalErrorResponse(ERROR_CODE_MAP[result.errorCode] ?? 'internal_error', {
        extra: { organizationId }
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_keyword_discovery_route' },
      extra: { organizationId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
