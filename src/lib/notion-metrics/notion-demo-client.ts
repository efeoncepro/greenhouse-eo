import 'server-only'

import { resolveSecretByRef } from '@/lib/secrets/secret-manager'

/**
 * TASK-913 Slice 2 — Notion API client canonical demo-only (defense in depth).
 *
 * **Sibling físicamente separado** de `@/lib/space-notion/notion-client` (que
 * usa `NOTION_TOKEN` productive Efeonce/Sky). Este client:
 *
 * 1. **Token separado**: resuelve via `NOTION_METRICS_DEMO_TOKEN_SECRET_REF`
 *    env var → GCP Secret Manager `notion-integration-token-greenhouse-metrics-demo`.
 *    Integration token con permisos SOLO sobre el teamspace `Demo Greenhouse`
 *    (TASK-910 page ID `36339c2f-efe7-814c-a0f5-0042863dbb5a`). NUNCA tiene
 *    acceso a Efeonce / Sky databases.
 *
 * 2. **Fallback NULL honest**: si secret no configurado o lookup falla, throw
 *    typed error `NotionDemoClientUnavailableError`. Caller (writeback consumer)
 *    captura warning + skip + reliability signal alerta. NUNCA degrada
 *    silenciosamente a token productive.
 *
 * 3. **PATCH /v1/pages/{id} canonical**: Notion API NO tiene bulk endpoint
 *    canonical para writeback de properties. Cada page se actualiza con
 *    single request. Rate limit Notion ~3 req/sec — el caller (writeback
 *    consumer) DEBE throttle (V1 demo: low volume <10/day, no throttle
 *    needed; V2 productive: Cloud Tasks queue con rate=3/s).
 *
 * 4. **Notion-Version pin**: `2022-06-28` (canonical productive); bump
 *    coordinado cuando productive sibling lo haga.
 *
 * Cross-refs:
 * - Productive sibling: src/lib/space-notion/notion-client.ts (NOTION_TOKEN)
 * - Spec: docs/tasks/in-progress/TASK-913-rpa-v2-demo-pipeline-end-to-end.md
 * - Secret governance: docs/architecture/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md
 */

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

const SECRET_REF_ENV = 'NOTION_METRICS_DEMO_TOKEN_SECRET_REF'

export class NotionDemoClientUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotionDemoClientUnavailableError'
  }
}

let cachedToken: { value: string; resolvedAt: number } | null = null
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000 // 5 min

const resolveDemoToken = async (): Promise<string> => {
  const now = Date.now()

  if (cachedToken && now - cachedToken.resolvedAt < TOKEN_CACHE_TTL_MS) {
    return cachedToken.value
  }

  const secretRef = process.env[SECRET_REF_ENV]?.trim()

  if (!secretRef) {
    throw new NotionDemoClientUnavailableError(
      `${SECRET_REF_ENV} env var not configured — demo Notion writeback unavailable`
    )
  }

  const token = await resolveSecretByRef(secretRef)

  if (!token) {
    throw new NotionDemoClientUnavailableError(
      `Demo Notion integration token resolution failed for ref ${secretRef} (secret missing or content corrupt)`
    )
  }

  cachedToken = { value: token, resolvedAt: now }

  return token
}

/**
 * Reset cache — exported for testing only.
 */
export const __testing_resetDemoTokenCache = () => {
  cachedToken = null
}

/**
 * Predicate canonical: ¿está configurado el demo Notion writeback?
 * Use en reliability signals + dashboards para reportar readiness honesta.
 */
export const isDemoNotionWritebackConfigured = (): boolean => {
  const secretRef = process.env[SECRET_REF_ENV]?.trim()

  return Boolean(secretRef)
}

export interface NotionPropertyValue {
  // Notion property update shape canonical V1. RpA V2 demo escribe number-only.
  // Forward-compat: agregar shapes para rich_text, select, multi_select, etc.
  number?: number | null
}

/**
 * PATCH /v1/pages/{pageId} canonical helper — actualiza properties de una
 * page demo Notion. Idempotente (Notion API es idempotent para mismo body).
 *
 * @param pageId Notion page UUID del demo teamspace
 * @param properties Map de property name → value canonical Notion shape
 * @returns Notion API response (page object)
 *
 * @throws NotionDemoClientUnavailableError si token no resuelto
 * @throws Error con status code si Notion API rechaza (caller retry exponencial)
 */
export const patchNotionDemoPage = async (
  pageId: string,
  properties: Record<string, NotionPropertyValue>
): Promise<unknown> => {
  const token = await resolveDemoToken()

  const response = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION
    },
    body: JSON.stringify({ properties }),
    signal: AbortSignal.timeout(30_000)
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')

    const error = new Error(`Notion API PATCH ${response.status}: ${text}`)

    // Tag for caller observability + retry policy
    ;(error as Error & { status?: number }).status = response.status
    throw error
  }

  return response.json()
}
