import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import {
  FixItArtifactsError,
  generateFixItArtifactsForRun
} from '@/lib/growth/ai-visibility/fix-it'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1269 — `POST /api/admin/growth/ai-visibility/runs/[runId]/fix-it`
 *
 * Genera artefactos fix-it deterministas public-safe (JSON-LD, llms.txt, brief)
 * desde el reporte + probe findings existentes. Capability dedicada:
 * `growth.ai_visibility.fix_it.generate`. No muta el sitio del prospecto.
 */

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'growth.ai_visibility.fix_it.generate', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'growth.ai_visibility.fix_it.generate' }
    })
  }

  const { runId } = await params

  try {
    const result = await generateFixItArtifactsForRun({ runId })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof FixItArtifactsError) {
      if (error.code === 'fix_it_disabled') {
        return canonicalErrorResponse('grader_run_not_found', { extra: { reason: error.code } })
      }

      if (error.code === 'run_not_found' || error.code === 'profile_not_found') {
        return canonicalErrorResponse('grader_run_not_found', { extra: { reason: error.code } })
      }
    }

    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_fix_it_route' },
      extra: { runId }
    })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
