import { NextResponse } from 'next/server'

import { getCurrentAuthReadiness } from '@/lib/auth-secrets'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * TASK-742 Capa 2 — Public read-only auth provider health.
 *
 * Used by:
 *   - The login page UI (`src/views/login/...`) to hide/disable provider
 *     buttons when their underlying secret/discovery probe fails.
 *   - Platform Health composer (Capa 6 wires it as a source).
 *   - Smoke lane (`identity.auth.providers`) for synthetic monitoring.
 *
 * Security:
 *   - Read-only. Returns provider names, status, and failingStage only.
 *   - Never returns secret values or sensitive identifiers.
 */
export const GET = async () => {
  try {
    const snapshot = await getCurrentAuthReadiness()

    return NextResponse.json(snapshot, {
      headers: {
        // Cache for 30s on the edge to align with the in-process TTL.
        'cache-control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=60'
      }
    })
  } catch (error) {
    captureWithDomain(error, 'identity', {
      extra: { source: 'api.auth.health' }
    })

    return NextResponse.json(
      {
        contractVersion: 'auth-readiness.v1',
        generatedAt: new Date().toISOString(),
        providers: [],
        overallStatus: 'degraded' as const,
        nextAuthSecretReady: false,
        error: 'readiness_probe_failed'
      },
      { status: 503 }
    )
  }
}
