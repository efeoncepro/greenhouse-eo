import 'server-only'

import { buildApiPlatformEtag, isApiPlatformConditionalMatch } from '@/lib/api-platform/core/freshness'
import { getPlatformHealth } from '@/lib/platform-health/composer'
import type { PlatformHealthAudience, PlatformHealthV1 } from '@/types/platform-health'

/**
 * API Platform resource — ecosystem-facing Platform Health snapshot.
 *
 * Responds with the redacted, summary-trimmed `PlatformHealthV1` payload
 * suitable for external agents and MCP. The composer enforces audience
 * differences (admin vs ecosystem); the resource only wires it into the
 * envelope + freshness contract.
 *
 * Read-only by design. The route is GET only and the contract surfaces
 * NO mutation hints — only `recommendedChecks[]` (which are advisory
 * commands the operator runs separately).
 *
 * Spec: docs/tasks/in-progress/TASK-672-platform-health-api-contract.md
 */
export const getEcosystemPlatformHealth = async (request: Request) => {
  return getPlatformHealthApiResponse(request, 'ecosystem')
}

export const getAdminPlatformHealth = async (request: Request) => {
  return getPlatformHealthApiResponse(request, 'admin')
}

const getPlatformHealthApiResponse = async (
  request: Request,
  audience: PlatformHealthAudience
) => {
  const data: PlatformHealthV1 = await getPlatformHealth({ audience })

  const etag = buildApiPlatformEtag({
    contractVersion: data.contractVersion,
    overallStatus: data.overallStatus,
    confidence: data.confidence,
    safeModes: data.safeModes,
    moduleStatuses: data.modules.map(m => ({ key: m.moduleKey, status: m.status })),
    degradedSourceCount: data.degradedSources.length,
    blockingIssueCount: data.blockingIssues.length
  })

  return {
    data,
    meta: {
      contractVersion: data.contractVersion,
      audience,
      freshness: {
        etag,
        lastModified: data.generatedAt,
        source: 'platform_health_composer',
        conditionalRequests: ['If-None-Match'],
        policy:
          'snapshot composed on demand from reliability, operations, runtime, integration, synthetic and webhook sources; cached in-process for 30s'
      },
      sourceFreshness: data.modules.reduce<Record<string, Record<string, string | null>>>(
        (acc, module) => {
          acc[module.moduleKey] = module.sourceFreshness
          
return acc
        },
        {}
      ),
      degradedSources: data.degradedSources.map(source => ({
        source: source.source,
        status: source.status
      }))
    },
    cacheControl: 'private, max-age=0, must-revalidate',
    etag,
    lastModified: data.generatedAt,
    notModified: isApiPlatformConditionalMatch({ request, etag, lastModified: data.generatedAt })
  }
}
