import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { enqueueGraderDiagnostic, runGraderDiagnostic } from '@/lib/growth/ai-visibility/commands'
import {
  isGrowthAiVisibilityExecutionMode,
  isGrowthAiVisibilityProviderId,
  isGrowthAiVisibilityRunKind,
  type GrowthAiVisibilityProviderId
} from '@/lib/growth/ai-visibility/contracts'
import { isAsyncExecutionEnabled } from '@/lib/growth/ai-visibility/flags'
import { listGraderRuns } from '@/lib/growth/ai-visibility/store'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1226 — `/api/admin/growth/ai-visibility/runs`
 *
 * Endpoint interno del AI Visibility Grader (Full API parity: delega 100% en los
 * primitives `src/lib/growth/ai-visibility/**`, sin lógica ad-hoc).
 *
 * - GET: lista runs (capability `growth.ai_visibility.observation.read`).
 * - POST: dispara un run/smoke (capability `growth.ai_visibility.run.execute`).
 *   Con flags OFF (default) los adapters saltan limpio → run `skipped`, cero
 *   llamadas a providers, cero costo. El LLM nunca muta directo.
 *
 * Auth dual-gate: requireInternalTenantContext (clientes excluidos) + can().
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.ai_visibility.observation.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.ai_visibility.observation.read' }
    })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limitRaw = Number(searchParams.get('limit'))
    const profileId = searchParams.get('profileId') ?? undefined

    const runs = await listGraderRuns({
      limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined,
      profileId
    })

    return NextResponse.json({ items: runs, total: runs.length })
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_runs_route', method: 'GET' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}

interface RunBody {
  brandName?: unknown
  websiteUrl?: unknown
  market?: unknown
  locale?: unknown
  category?: unknown
  competitorsDeclared?: unknown
  mode?: unknown
  runKind?: unknown
  discoveryOnly?: unknown
  onlyProviders?: unknown
  idempotencyKey?: unknown
}

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.ai_visibility.run.execute', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.ai_visibility.run.execute' }
    })
  }

  let body: RunBody

  try {
    body = (await request.json()) as RunBody
  } catch {
    return canonicalErrorResponse('internal_error', { statusOverride: 400, extra: { reason: 'invalid_json' } })
  }

  const brandName = asNonEmptyString(body.brandName)
  const market = asNonEmptyString(body.market)
  const locale = asNonEmptyString(body.locale)
  const category = asNonEmptyString(body.category)
  const mode = body.mode
  const runKind = body.runKind ?? 'smoke'

  if (!brandName || !market || !locale || !category) {
    return canonicalErrorResponse('internal_error', {
      statusOverride: 400,
      extra: { reason: 'missing_required_fields', required: ['brandName', 'market', 'locale', 'category'] }
    })
  }

  if (!isGrowthAiVisibilityExecutionMode(mode)) {
    return canonicalErrorResponse('internal_error', { statusOverride: 400, extra: { reason: 'invalid_mode' } })
  }

  if (!isGrowthAiVisibilityRunKind(runKind)) {
    return canonicalErrorResponse('internal_error', { statusOverride: 400, extra: { reason: 'invalid_run_kind' } })
  }

  const competitorsDeclared = Array.isArray(body.competitorsDeclared)
    ? body.competitorsDeclared.filter((value): value is string => typeof value === 'string')
    : []

  const onlyProviders = Array.isArray(body.onlyProviders)
    ? body.onlyProviders.filter((value): value is GrowthAiVisibilityProviderId =>
        isGrowthAiVisibilityProviderId(value)
      )
    : undefined

  const diagnosticInput = {
    brandName,
    websiteUrl: asNonEmptyString(body.websiteUrl),
    market,
    locale,
    category,
    competitorsDeclared,
    mode,
    runKind,
    discoveryOnly: body.discoveryOnly === true,
    onlyProviders,
    idempotencyKey: asNonEmptyString(body.idempotencyKey)
  }

  try {
    // TASK-1234 — Cutover inline → async. Con el flag ON el run se ENCOLA (202 + runId)
    // y el worker Cloud Run lo ejecuta sin límite de duración; el GET detalle es el poll.
    // Default OFF: ejecución inline (sólo `light`/OpenAI cabe en el timeout Vercel).
    if (isAsyncExecutionEnabled()) {
      const enqueued = await enqueueGraderDiagnostic(diagnosticInput)

      return NextResponse.json(
        {
          run: enqueued.run,
          observationCount: 0,
          enqueued: true,
          idempotentHit: enqueued.idempotentHit
        },
        { status: enqueued.idempotentHit ? 200 : 202 }
      )
    }

    const result = await runGraderDiagnostic(diagnosticInput)

    return NextResponse.json(
      {
        run: result.run,
        observationCount: result.observations.length,
        enqueued: false,
        idempotentHit: result.idempotentHit,
        costGuardTripped: result.costGuardTripped
      },
      { status: result.idempotentHit ? 200 : 201 }
    )
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_runs_route', method: 'POST' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
