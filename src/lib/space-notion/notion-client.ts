import 'server-only'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

const notionHeaders = () => {
  const token = process.env.NOTION_TOKEN?.trim()

  if (!token) {
    throw new Error('NOTION_TOKEN not configured')
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION
  }
}

const buildUrl = (path: string, searchParams?: URLSearchParams) => {
  const url = new URL(`${NOTION_API}${path}`)

  if (searchParams) {
    url.search = searchParams.toString()
  }

  return url.toString()
}

export async function notionRequest<T>(
  path: string,
  init?: RequestInit & { searchParams?: URLSearchParams }
): Promise<T> {
  const response = await fetch(buildUrl(path, init?.searchParams), {
    ...init,
    headers: {
      ...notionHeaders(),
      ...(init?.headers ?? {})
    },
    signal: AbortSignal.timeout(30_000)
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')

    throw new Error(`Notion API ${response.status}: ${text}`)
  }

  if (response.status === 204) {
    return null as T
  }

  return response.json() as Promise<T>
}

// ── TASK-912: productive status re-fetch (sibling de notion-demo-client) ──────
//
// Notion webhooks NO incluyen valores de propiedad (solo IDs de las que
// cambiaron). El estado actual + el data source autoritativo son source of truth
// en la página → re-fetch GET. Anti-pattern prohibido: confiar el payload del
// webhook (notion-platform Pillar 1, Hard rule #2). Read version 2026-03-11
// requerida para que `parent.data_source_id` venga poblado (>=2025-09-03).

const NOTION_READ_VERSION = '2026-03-11'

/**
 * Nombres canónicos de la propiedad de estado en las DB `Tareas` productivas
 * (`Estado` actual + `Estado 1` legacy tolerado). Verificado vía Notion fetch
 * 2026-05-21: Efeonce y Sky ya usan `Estado` canónico. `Estado 1` queda como
 * red defensiva.
 */
export const STATUS_PROPERTY_NAMES: ReadonlySet<string> = new Set(['Estado', 'Estado 1'])

export interface ProductivePageStatus {
  statusName: string | null
  lastEditedTime: string | null
  lastEditedBy: string | null
  /**
   * Data source autoritativo del parent de la página (read version 2026-03-11).
   * El consumer lo usa para resolver el workspace productivo (Efeonce/Sky) —
   * NUNCA confía el `parent.id` del webhook (shape no garantizado).
   */
  parentDataSourceId: string | null
}

/**
 * GET /v1/pages/{pageId} y lee el valor actual de la propiedad de estado
 * (source of truth del `to` de la transición) + el data source del parent
 * (autoritativo para resolver workspace). Las keys de `properties` en la
 * respuesta son NOMBRES (a diferencia del webhook que manda IDs), así que
 * matcheamos por nombre canónico.
 *
 * Usa el token productivo `NOTION_TOKEN` (acceso a Efeonce + Sky).
 *
 * @returns `{ statusName, lastEditedTime, lastEditedBy, parentDataSourceId }` o
 *   `null` si la página no existe (404 — borrada). Otros errores Notion → throw
 *   (caller reintenta vía outbox retry exponencial).
 */
export const fetchPageStatus = async (pageId: string): Promise<ProductivePageStatus | null> => {
  const token = process.env.NOTION_TOKEN?.trim()

  if (!token) {
    throw new Error('NOTION_TOKEN not configured (cannot re-fetch productive page status)')
  }

  const response = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_READ_VERSION
    },
    signal: AbortSignal.timeout(15_000)
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const error = new Error(`Notion API GET page ${response.status}`)

    ;(error as Error & { status?: number }).status = response.status
    throw error
  }

  const body = (await response.json()) as {
    last_edited_time?: string
    last_edited_by?: { id?: string }
    parent?: { type?: string; data_source_id?: string; database_id?: string }
    properties?: Record<string, { type?: string; status?: { name?: string } | null }>
  }

  let statusName: string | null = null

  for (const [name, prop] of Object.entries(body.properties ?? {})) {
    if (prop?.type === 'status' && STATUS_PROPERTY_NAMES.has(name)) {
      statusName = prop.status?.name ?? null
      break
    }
  }

  return {
    statusName,
    lastEditedTime: body.last_edited_time ?? null,
    lastEditedBy: body.last_edited_by?.id ?? null,
    parentDataSourceId: body.parent?.data_source_id ?? body.parent?.database_id ?? null
  }
}
