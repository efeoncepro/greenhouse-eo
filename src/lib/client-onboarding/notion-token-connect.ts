import 'server-only'

/**
 * TASK-998 — Notion teamspace linking via per-client scoped integration token.
 *
 * Diseño canónico (validado live con Grupo Berel 2026-06-03):
 * el operador crea en Notion una integración interna scoped SOLO al teamspace del
 * cliente y pega su token. Como el token ya está acotado a ese teamspace, un
 * `POST /v1/search` con él devuelve EXCLUSIVAMENTE las DBs de ese cliente — cero
 * cross-tenant. Auto-clasificamos Tareas/Proyectos/Sprints por título y el
 * operador confirma cuáles conectar. El token nunca se persiste crudo: va a GCP
 * Secret Manager y `space_notion_sources` guarda sólo el `*_SECRET_REF`.
 *
 * Este módulo SÓLO descubre + clasifica (lectura). El connect/register (escribir
 * el secret + `space_notion_sources`) vive en su endpoint canónico.
 */

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2026-03-11'

export type NotionDbClassification = 'tareas' | 'proyectos' | 'sprints' | 'revisiones' | 'otras'

export interface DiscoveredNotionDatabase {
  databaseId: string
  title: string
  classification: NotionDbClassification
  url: string
}

export interface NotionTokenDiscoveryResult {
  ok: boolean
  /** Razón es-CL cuando ok=false (token inválido, sin DBs, error de red). */
  reason?: string
  /** Toda DB que el token puede ver (scoped al teamspace del cliente). */
  databases: DiscoveredNotionDatabase[]
  /** Pre-selección sugerida por auto-clasificación (el operador confirma). */
  suggested: {
    tareas: string | null
    proyectos: string | null
    sprints: string | null
    revisiones: string | null
  }
}

const stripAccents = (s: string): string => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

/**
 * Clasifica una DB por su título. Tolerante a mayúsculas, acentos y espacios
 * (Notion usa "Sprints " con espacio final en varios teamspaces).
 */
export const classifyNotionDatabaseTitle = (rawTitle: string): NotionDbClassification => {
  const t = stripAccents((rawTitle || '').trim().toLowerCase())

  if (t === 'tareas' || t === 'tasks') return 'tareas'
  if (t === 'proyectos' || t === 'projects') return 'proyectos'
  if (t === 'sprints' || t === 'sprint' || t === 'ciclos') return 'sprints'
  if (t === 'revisiones' || t === 'rondas de revision' || t === 'revisions') return 'revisiones'

  return 'otras'
}

const extractTitle = (result: Record<string, unknown>): string => {
  const title = result.title

  if (Array.isArray(title)) {
    return title.map(part => (part as { plain_text?: string })?.plain_text ?? '').join('').trim()
  }

  return ''
}

/**
 * Descubre + clasifica las DBs visibles para un token de integración Notion
 * scoped a un teamspace. Hace `POST /v1/search` (filtro data_source) paginado.
 * NO persiste nada. NO loggea el token.
 */
export const discoverNotionDatabasesForToken = async (token: string): Promise<NotionTokenDiscoveryResult> => {
  const trimmed = (token || '').trim()

  const empty: NotionTokenDiscoveryResult = {
    ok: false,
    databases: [],
    suggested: { tareas: null, proyectos: null, sprints: null, revisiones: null }
  }

  if (!trimmed || !trimmed.startsWith('ntn_')) {
    return { ...empty, reason: 'El token no parece válido. Debe empezar con "ntn_".' }
  }

  const databases: DiscoveredNotionDatabase[] = []
  let cursor: string | undefined
  let pages = 0

  try {
    do {
      const body: Record<string, unknown> = {
        filter: { property: 'object', value: 'data_source' },
        page_size: 100
      }

      if (cursor) body.start_cursor = cursor

      const res = await fetch(`${NOTION_API}/search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${trimmed}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000)
      })

      if (res.status === 401) {
        return { ...empty, reason: 'El token fue rechazado por Notion (401). Verifica que lo copiaste completo.' }
      }

      if (!res.ok) {
        return { ...empty, reason: `Notion respondió ${res.status} al validar el token. Intenta de nuevo.` }
      }

      const json = (await res.json()) as { results?: Array<Record<string, unknown>>; has_more?: boolean; next_cursor?: string | null }

      for (const r of json.results ?? []) {
        const databaseId = String(r.id ?? '')

        if (!databaseId) continue
        const title = extractTitle(r)

        databases.push({
          databaseId,
          title,
          classification: classifyNotionDatabaseTitle(title),
          url: String(r.url ?? '')
        })
      }

      cursor = json.has_more ? json.next_cursor ?? undefined : undefined
      pages += 1
    } while (cursor && pages < 10)
  } catch {
    return { ...empty, reason: 'No pudimos conectar con Notion para validar el token. Verifica tu conexión.' }
  }

  if (databases.length === 0) {
    return {
      ...empty,
      reason: 'El token es válido pero no ve ninguna base de datos. Conecta la integración al teamspace del cliente en Notion.'
    }
  }

  const firstOf = (c: NotionDbClassification): string | null =>
    databases.find(d => d.classification === c)?.databaseId ?? null

  return {
    ok: true,
    databases,
    suggested: {
      tareas: firstOf('tareas'),
      proyectos: firstOf('proyectos'),
      sprints: firstOf('sprints'),
      revisiones: firstOf('revisiones')
    }
  }
}
