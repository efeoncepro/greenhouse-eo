import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { resolveSecretByRef } from '@/lib/secrets/secret-manager'

/**
 * TASK-1088 — Cliente Notion para Knowledge (block content).
 *
 * Lee el árbol de bloques de una página Notion (`GET /v1/blocks/{id}/children`,
 * paginado + recursivo) + la metadata de provenance (`GET /v1/pages/{id}`).
 * Token resuelto server-side vía Secret Manager (NUNCA en repo/logs). Integración
 * Notion DEDICADA de knowledge (Notion Integrations Registry, CLAUDE.md) — el token
 * está scoped al teamspace de conocimiento, no se reusa de otra integración.
 *
 * Es ingesta operada por script/ops (snapshot antes de publicar), NO runtime del
 * portal ni Notion live para una respuesta de Nexa.
 */

const NOTION_API = 'https://api.notion.com/v1'
/** Versión canónica de la API Notion (TASK-1003). */
const NOTION_VERSION = '2026-03-11'

/** Env var que apunta al secret del token de knowledge (`notion-integration-token-greenhouse-knowledge`). */
export const NOTION_KNOWLEDGE_TOKEN_SECRET_REF_ENV = 'NOTION_KNOWLEDGE_TOKEN_SECRET_REF'

const PAGE_SIZE = 100
const REQUEST_TIMEOUT_MS = 20_000
const MAX_RATE_LIMIT_RETRIES = 3
/** Guard anti-runaway: tope de bloques por documento y profundidad de anidación. */
const MAX_BLOCKS_PER_DOCUMENT = 5_000
const MAX_NESTING_DEPTH = 12

export interface NotionRichTextAnnotations {
  bold?: boolean
  italic?: boolean
  code?: boolean
  strikethrough?: boolean
  underline?: boolean
}

export interface NotionRichText {
  plain_text: string
  href: string | null
  annotations: NotionRichTextAnnotations
}

/** Subset de bloque Notion que consumimos; el payload type-specific se lee en blocks→markdown. */
export interface NotionBlock {
  id: string
  type: string
  has_children: boolean
  /** Canónico desde Notion-Version 2026-03-11 (`archived` deprecado). `DELETE /v1/blocks` lo setea. */
  in_trash?: boolean
  /** Hidratado por el fetcher (recursión de children). */
  children?: NotionBlock[]
  [key: string]: unknown
}

export interface NotionPageProvenance {
  pageId: string
  title: string
  url: string | null
  createdTime: string | null
  lastEditedTime: string | null
  /** data_source id del parent si la página es fila de una Wiki (null si no). Gate de gobernanza (TASK-1094). */
  parentDataSourceId: string | null
  /** `true` si la página está soft-deleted en Notion (deprecación defensiva, TASK-1094). */
  inTrash: boolean
}

/** Fila (artículo) de una Wiki/data_source: la página + su provenance. */
export interface NotionDataSourceRow {
  pageId: string
  title: string
  url: string | null
  createdTime: string | null
  lastEditedTime: string | null
}

export interface NotionDataSourceQueryResult {
  rows: NotionDataSourceRow[]
  /** `true` si Notion truncó a 10k filas (cap Apr 2026, `request_status.incomplete`). */
  hitResultLimit: boolean
}

interface NotionQueryPage {
  id: string
  in_trash?: boolean
  url?: string
  created_time?: string
  last_edited_time?: string
  properties?: Record<string, { type?: string; title?: Array<{ plain_text?: string }> }>
}

interface NotionDataSourceQueryResponse {
  results?: NotionQueryPage[]
  has_more?: boolean
  next_cursor?: string | null
  request_status?: { type?: string }
}

const extractPageTitle = (page: NotionQueryPage): string => {
  const props = page.properties ?? {}

  for (const key of Object.keys(props)) {
    const prop = props[key]

    if (prop?.type === 'title' && Array.isArray(prop.title)) {
      const text = prop.title.map(t => t?.plain_text ?? '').join('').trim()

      if (text) return text
    }
  }

  return '(sin título)'
}

/** Error sanitizado del cliente Notion de knowledge — NUNCA incluye el token. */
export class NotionKnowledgeClientError extends Error {
  readonly statusCode: number | null

  constructor(message: string, statusCode: number | null = null) {
    super(message)
    this.name = 'NotionKnowledgeClientError'
    this.statusCode = statusCode
  }
}

interface NotionChildrenResponse {
  results?: NotionBlock[]
  has_more?: boolean
  next_cursor?: string | null
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

export interface NotionKnowledgeClientOptions {
  fetchImpl?: typeof fetch
  /** Override del token para tests; en runtime se resuelve del secret. */
  tokenOverride?: string | null
}

export class NotionKnowledgeClient {
  private readonly fetchImpl: typeof fetch
  private readonly tokenOverride: string | null | undefined
  private cachedToken: string | null | undefined

  constructor(options: NotionKnowledgeClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch
    this.tokenOverride = options.tokenOverride
  }

  /** Resuelve el token (cacheado por instancia + por el cache de resolveSecretByRef). */
  private async resolveToken(): Promise<string | null> {
    if (this.tokenOverride !== undefined) {
      return this.tokenOverride
    }

    if (this.cachedToken !== undefined) {
      return this.cachedToken
    }

    const ref = process.env[NOTION_KNOWLEDGE_TOKEN_SECRET_REF_ENV]

    this.cachedToken = ref ? await resolveSecretByRef(ref) : null

    return this.cachedToken
  }

  /** ¿El token de knowledge está provisionado? (gate de disponibilidad del connector). */
  async isConfigured(): Promise<boolean> {
    return (await this.resolveToken()) !== null
  }

  private async request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
    const token = await this.resolveToken()

    if (!token) {
      throw new NotionKnowledgeClientError('Notion knowledge token no configurado.', null)
    }

    const method = init?.method ?? 'GET'
    const hasBody = init?.body !== undefined

    for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
      let response: Response

      try {
        response = await this.fetchImpl(`${NOTION_API}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': NOTION_VERSION,
            ...(hasBody ? { 'Content-Type': 'application/json' } : {})
          },
          ...(hasBody ? { body: JSON.stringify(init?.body) } : {}),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        })
      } catch (error) {
        // Errores de red/timeout — sanitizados (NUNCA incluir el token).
        captureWithDomain(error, 'integrations.notion', { tags: { source: 'knowledge_notion_client' } })
        throw new NotionKnowledgeClientError('No se pudo conectar con Notion.', null)
      }

      if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
        const retryAfter = Number(response.headers.get('Retry-After')) || 1

        await sleep(Math.min(retryAfter, 10) * 1000)
        continue
      }

      if (response.status === 401 || response.status === 403) {
        throw new NotionKnowledgeClientError('Notion rechazó el token de knowledge (auth).', response.status)
      }

      if (response.status === 404) {
        throw new NotionKnowledgeClientError('Página o bloque Notion no encontrado.', 404)
      }

      if (!response.ok) {
        throw new NotionKnowledgeClientError(`Notion respondió ${response.status}.`, response.status)
      }

      return (await response.json()) as T
    }

    throw new NotionKnowledgeClientError('Notion rate-limit excedido tras reintentos.', 429)
  }

  /** Metadata de provenance de una página (created/edited/url/parent/in_trash). */
  async fetchPageProvenance(pageId: string): Promise<NotionPageProvenance> {
    const page = await this.request<
      NotionQueryPage & {
        url?: string
        created_time?: string
        last_edited_time?: string
        parent?: { type?: string; data_source_id?: string; database_id?: string }
      }
    >(`/pages/${encodeURIComponent(pageId)}`)

    return {
      pageId,
      title: extractPageTitle(page),
      url: page.url ?? null,
      createdTime: page.created_time ?? null,
      lastEditedTime: page.last_edited_time ?? null,
      parentDataSourceId: page.parent?.data_source_id ?? null,
      inTrash: page.in_trash === true
    }
  }

  /**
   * Enumera las filas (artículos) de una Wiki/data_source vía
   * `POST /v1/data_sources/{id}/query` (canónico, NO `/databases/{id}/query`).
   * Pagina con cursor opaco, filtra `in_trash`, y detecta el cap 10k (`request_status`).
   */
  async queryDataSourcePages(dataSourceId: string): Promise<NotionDataSourceQueryResult> {
    const rows: NotionDataSourceRow[] = []
    let cursor: string | undefined
    let hitResultLimit = false

    do {
      const body: Record<string, unknown> = { page_size: PAGE_SIZE }

      if (cursor) body.start_cursor = cursor

      const json = await this.request<NotionDataSourceQueryResponse>(
        `/data_sources/${encodeURIComponent(dataSourceId)}/query`,
        { method: 'POST', body }
      )

      for (const page of json.results ?? []) {
        // Filas soft-deleted no deben ingerirse.
        if (page.in_trash === true) continue
        rows.push({
          pageId: page.id,
          title: extractPageTitle(page),
          url: page.url ?? null,
          createdTime: page.created_time ?? null,
          lastEditedTime: page.last_edited_time ?? null
        })
      }

      // Cap 10k (Apr 2026): Notion trunca y marca request_status.incomplete.
      if (json.request_status?.type === 'incomplete') {
        hitResultLimit = true
        break
      }

      cursor = json.has_more ? json.next_cursor ?? undefined : undefined
    } while (cursor)

    return { rows, hitResultLimit }
  }

  private async fetchChildren(blockId: string): Promise<NotionBlock[]> {
    const blocks: NotionBlock[] = []
    let cursor: string | undefined

    do {
      const queryString = new URLSearchParams({ page_size: String(PAGE_SIZE) })

      if (cursor) queryString.set('start_cursor', cursor)

      const json = await this.request<NotionChildrenResponse>(
        `/blocks/${encodeURIComponent(blockId)}/children?${queryString.toString()}`
      )

      for (const block of json.results ?? []) {
        // Bloques soft-deleted (`in_trash`) no deben ingerirse.
        if (block.in_trash === true) continue
        blocks.push(block)
      }

      cursor = json.has_more ? json.next_cursor ?? undefined : undefined
    } while (cursor)

    return blocks
  }

  /**
   * Árbol de bloques de una página (recursivo). Cada bloque con `has_children`
   * se hidrata con sus children. Guard anti-runaway por conteo + profundidad.
   */
  async fetchBlockTree(pageId: string): Promise<NotionBlock[]> {
    let total = 0

    const hydrate = async (blockId: string, depth: number): Promise<NotionBlock[]> => {
      if (depth > MAX_NESTING_DEPTH) {
        return []
      }

      const children = await this.fetchChildren(blockId)

      total += children.length

      if (total > MAX_BLOCKS_PER_DOCUMENT) {
        throw new NotionKnowledgeClientError(
          `Documento Notion excede el tope de ${MAX_BLOCKS_PER_DOCUMENT} bloques.`,
          null
        )
      }

      for (const block of children) {
        if (block.has_children) {
          block.children = await hydrate(block.id, depth + 1)
        }
      }

      return children
    }

    return hydrate(pageId, 0)
  }
}
