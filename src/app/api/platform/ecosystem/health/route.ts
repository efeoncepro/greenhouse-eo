import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemPlatformHealth } from '@/lib/api-platform/resources/platform-health'

export const dynamic = 'force-dynamic'

/**
 * Platform Health V1 — ecosystem-facing preflight contract.
 *
 * Returns the redacted, summary-trimmed `PlatformHealthV1` payload for
 * external agents, MCP, Teams bot and CI tooling. Full evidence detail
 * is gated behind the admin lane until TASK-658 lands the
 * `platform.health.detail` capability bridge.
 *
 * Spec: docs/tasks/in-progress/TASK-672-platform-health-api-contract.md
 */
export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.health',
    handler: async () => getEcosystemPlatformHealth(request)
  })
}
