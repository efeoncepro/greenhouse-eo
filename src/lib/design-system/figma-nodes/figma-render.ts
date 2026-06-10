import 'server-only'

import { resolveSecret } from '@/lib/secrets/secret-manager'
import { captureWithDomain } from '@/lib/observability/capture'

/**
 * Figma node render client (TASK-1072 Slice 4) — enrichment, degrades honest.
 *
 * Fetches the real PNG render of an AXIS node (Figma REST `/v1/images`) + its node
 * name (`/v1/files/{key}/nodes`) to show in the link editor preview. Server-only:
 * the Figma token NEVER reaches the client. Every failure mode (no token, API down,
 * timeout, node not found) degrades to `status:'unavailable'` so the editor falls
 * back to the AXIS identity preview — the link itself never depends on this.
 *
 * Token: `resolveSecret({ envVarName: 'FIGMA_API_TOKEN' })` resolves from
 * `FIGMA_API_TOKEN` env or `FIGMA_API_TOKEN_SECRET_REF` → GCP Secret Manager
 * (canonical secret `greenhouse-figma-api-token`). NUNCA hardcodear el token.
 */

const FIGMA_API_BASE = 'https://api.figma.com'
const FIGMA_FETCH_TIMEOUT_MS = 6000
// Figma image URLs are temporary; the editor preview is transient so the URL is
// used immediately. Durable thumbnail caching (download → asset) is a further
// enhancement, only needed if a long-lived thumbnail surface emerges.

export interface FigmaNodeRender {
  imageUrl: string | null
  nodeName: string | null
  /** `ready` = render available · `unavailable` = no token / API failure (honest fallback). */
  status: 'ready' | 'unavailable'
}

const UNAVAILABLE: FigmaNodeRender = { imageUrl: null, nodeName: null, status: 'unavailable' }

const resolveFigmaToken = async (): Promise<string | null> => {
  try {
    const resolution = await resolveSecret({ envVarName: 'FIGMA_API_TOKEN' })

    return resolution.value ?? null
  } catch {
    // resolveSecret already degrades; never throw from the token path.
    return null
  }
}

const fetchFigmaJson = async <T>(path: string, token: string): Promise<T | null> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FIGMA_FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(`${FIGMA_API_BASE}${path}`, {
      headers: { 'X-Figma-Token': token },
      signal: controller.signal,
      cache: 'no-store'
    })

    if (!res.ok) {
      return null
    }

    return (await res.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

interface FigmaImagesResponse {
  err: string | null
  images: Record<string, string | null>
}

interface FigmaNodesResponse {
  nodes: Record<string, { document?: { name?: string } } | undefined>
}

/**
 * Resolve the real render + name of an AXIS node. Degrades to `unavailable` on any
 * failure (no token, API error, timeout, node missing) — the editor then shows the
 * AXIS identity preview instead. `fileKey` must already be validated as AXIS by the caller.
 */
export const getFigmaNodeRender = async ({
  fileKey,
  nodeId
}: {
  fileKey: string
  nodeId: string
}): Promise<FigmaNodeRender> => {
  const token = await resolveFigmaToken()

  if (!token) {
    // Not configured yet — honest degrade, NOT an error. No Sentry noise.
    return UNAVAILABLE
  }

  // The Figma API matches node ids in their raw `NNN:MMM` form in the `ids` query
  // param; URL-encoding the colon (`%3A`) makes `/v1/images` fail to match → null.
  // `nodeId` is already shape-validated (`^\d+:\d+$`) by callers, so it is URL-safe.
  try {
    const [images, nodes] = await Promise.all([
      fetchFigmaJson<FigmaImagesResponse>(`/v1/images/${fileKey}?ids=${nodeId}&format=png&scale=2`, token),
      fetchFigmaJson<FigmaNodesResponse>(`/v1/files/${fileKey}/nodes?ids=${nodeId}`, token)
    ])

    const imageUrl = images?.images?.[nodeId] ?? null
    const nodeName = nodes?.nodes?.[nodeId]?.document?.name ?? null

    if (!imageUrl && !nodeName) {
      return UNAVAILABLE
    }

    return { imageUrl, nodeName, status: imageUrl ? 'ready' : 'unavailable' }
  } catch (error) {
    // A configured token that still fails IS worth a warning (rate limit, revoked, etc.).
    captureWithDomain(error, 'identity', {
      level: 'warning',
      tags: { source: 'figma_node_render', stage: 'fetch' }
    })

    return UNAVAILABLE
  }
}
