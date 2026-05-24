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

// ── TASK-916: productive property writeback (sibling de patchNotionDemoPage) ──
//
// Notion API NO tiene endpoint bulk canonical (`/v1/pages/bulk` no existe — ver
// notion-platform skill §0). Cada page se actualiza con un single PATCH. El
// caller (writeback consumer) DEBE throttle si el volumen crece (Notion rate
// limit ~3 req/sec). Usa el token productivo `NOTION_TOKEN` (Efeonce + Sky) +
// Notion-Version `2022-06-28` (default canonical de `notionRequest`, mirror del
// demo `patchNotionDemoPage`).

export interface NotionPropertyValue {
  // Notion property update shape canonical V1. RpA V2 writeback es number-only.
  // Forward-compat: agregar shapes para rich_text, select, multi_select, etc.
  number?: number | null

  // TASK-903 — FTR writeback usa select (`[GH] FTR` = Pass/Fail/N/A). Notion
  // PATCH shape: `{ select: { name: 'Pass' } }` o `{ select: null }` para limpiar.
  select?: { name: string } | null
}

/**
 * PATCH /v1/pages/{pageId} — actualiza properties de una page productiva
 * (Efeonce/Sky). Idempotente (Notion API es idempotent para mismo body).
 *
 * @param pageId Notion page UUID productivo
 * @param properties Map de property name → value canonical Notion shape
 * @returns Notion API response (page object)
 *
 * @throws Error (con `.status`) si Notion API rechaza — el caller decide retry
 *   exponencial vía outbox. `notionRequest` ya resuelve `NOTION_TOKEN` y lanza
 *   "NOTION_TOKEN not configured" si falta (el writeback consumer está gated por
 *   `NOTION_RPA_WRITEBACK_ENABLED` antes de llegar acá).
 */
export const patchNotionPage = async (
  pageId: string,
  properties: Record<string, NotionPropertyValue>
): Promise<unknown> => {
  return notionRequest<unknown>(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties })
  })
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

// ── TASK-921: productive due-date re-fetch (sibling de fetchPageStatus) ───────
//
// Mismo patrón canonical re-fetch (notion-platform Pillar 1): los webhooks Notion
// NO mandan valores → re-fetch GET de la página como source of truth. Lee la
// fecha límite vigente + la fecha límite original (baseline seed histórico) + el
// motivo de reprogramación confirmado por el operador + el estado + el data
// source autoritativo. Sibling físicamente separado de fetchPageStatus: cada
// consumer reactivo re-fetchea por su cuenta; tipos limpios por dominio.

/**
 * Nombres canónicos de la propiedad de fecha límite vigente (date) en las DB
 * `Tareas` productivas. Verificado vía sync conformado (`fecha_límite`).
 */
export const DUE_DATE_PROPERTY_NAMES: ReadonlySet<string> = new Set(['Fecha límite', 'Fecha Límite'])

/**
 * Nombres canónicos de la fecha límite original (date) — baseline seed para
 * reconstruir best-effort el primer cambio histórico (`fecha_límite_original`).
 */
export const ORIGINAL_DUE_DATE_PROPERTY_NAMES: ReadonlySet<string> = new Set([
  'Fecha límite original',
  'Fecha Límite original'
])

export interface ProductivePageReschedule {
  /** Fecha límite vigente `YYYY-MM-DD` (date.start) o null si no seteada. */
  dueDate: string | null
  /** Fecha límite original `YYYY-MM-DD` (baseline seed) o null. */
  originalDueDate: string | null
  /** Estado canonical-raw al momento del re-fetch (input de la inferencia). */
  statusName: string | null
  /**
   * Label del select `Motivo de reprogramación` que el operador confirmó en
   * Notion (o null si vacío). El consumer lo mapea a `reason_code` canonical.
   */
  rescheduleReasonLabel: string | null
  lastEditedTime: string | null
  lastEditedBy: string | null
  /** Data source autoritativo del parent (resolución de workspace productivo). */
  parentDataSourceId: string | null
}

const NOTION_DATE_START = (
  prop: { type?: string; date?: { start?: string | null } | null } | undefined
): string | null => {
  if (prop?.type !== 'date') {
    return null
  }

  const start = prop.date?.start ?? null

  // Notion date.start puede venir como `YYYY-MM-DD` o ISO datetime — normalizamos
  // a fecha calendario (los 10 primeros chars) para alinear con la columna DATE.
  return start ? start.slice(0, 10) : null
}

/**
 * GET /v1/pages/{pageId} y lee fecha límite vigente + original + motivo de
 * reprogramación + estado + data source del parent. Mismo contrato de error que
 * fetchPageStatus: `null` si 404 (borrada), throw para otros (retry vía outbox).
 *
 * Usa el token productivo `NOTION_TOKEN` (acceso a Efeonce + Sky).
 */
export const fetchPageDueDate = async (pageId: string): Promise<ProductivePageReschedule | null> => {
  const token = process.env.NOTION_TOKEN?.trim()

  if (!token) {
    throw new Error('NOTION_TOKEN not configured (cannot re-fetch productive page due-date)')
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
    properties?: Record<
      string,
      {
        type?: string
        date?: { start?: string | null } | null
        status?: { name?: string } | null
        select?: { name?: string } | null
      }
    >
  }

  let dueDate: string | null = null
  let originalDueDate: string | null = null
  let statusName: string | null = null
  let rescheduleReasonLabel: string | null = null

  for (const [name, prop] of Object.entries(body.properties ?? {})) {
    if (DUE_DATE_PROPERTY_NAMES.has(name)) {
      dueDate = NOTION_DATE_START(prop)
    } else if (ORIGINAL_DUE_DATE_PROPERTY_NAMES.has(name)) {
      originalDueDate = NOTION_DATE_START(prop)
    } else if (prop?.type === 'status' && STATUS_PROPERTY_NAMES.has(name)) {
      statusName = prop.status?.name ?? null
    } else if (prop?.type === 'select' && name === 'Motivo de reprogramación') {
      rescheduleReasonLabel = prop.select?.name ?? null
    }
  }

  return {
    dueDate,
    originalDueDate,
    statusName,
    rescheduleReasonLabel,
    lastEditedTime: body.last_edited_time ?? null,
    lastEditedBy: body.last_edited_by?.id ?? null,
    parentDataSourceId: body.parent?.data_source_id ?? body.parent?.database_id ?? null
  }
}
