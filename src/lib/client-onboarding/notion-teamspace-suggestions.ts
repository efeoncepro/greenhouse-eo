import 'server-only'

import { notionRequest } from '@/lib/space-notion/notion-client'

/**
 * TASK-997 Slice 3 — read API de la primitiva External Reference Association para
 * Notion. Busca las bases (databases) que la integración Greenhouse PRD puede ver
 * (`/v1/search`), para que el operador ANCLE el teamspace existente del cliente
 * (Tareas/Proyectos/Sprints) en vez de crear uno nuevo a ciegas (que duplica).
 *
 * Readiness (notion-platform Pillar 3): la integración solo ve teamspaces a los
 * que está conectada. Si el del cliente no está conectado, devuelve vacío → la UI
 * cae a "crear nuevo" (fallback async vía checklist provision_notion_workspace).
 * Si NOTION_TOKEN falta o la API falla, lanza → el endpoint degrada honesto.
 */
export type NotionTeamspaceSuggestion = {
  notionDatabaseId: string
  title: string
  parentType: string
  url: string | null
}

type NotionSearchResult = {
  object: string
  id: string
  url?: string | null
  parent?: { type?: string }
  title?: Array<{ plain_text?: string }>
}

type NotionSearchResponse = {
  results?: NotionSearchResult[]
}

const databaseTitle = (result: NotionSearchResult): string => {
  const text = (result.title ?? [])
    .map(part => part.plain_text ?? '')
    .join('')
    .trim()

  return text || result.id
}

/**
 * Busca databases en Notion por texto. Filtra a `object='database'` (las bases
 * Tareas/Proyectos/Sprints). Throttle no requerido (1 request, read-only).
 */
export const listNotionTeamspaceSuggestions = async (
  queryText: string
): Promise<NotionTeamspaceSuggestion[]> => {
  const response = await notionRequest<NotionSearchResponse>('/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: queryText.trim(),
      filter: { property: 'object', value: 'database' },
      page_size: 25
    })
  })

  return (response.results ?? [])
    .filter(result => result.object === 'database')
    .map(result => ({
      notionDatabaseId: result.id,
      title: databaseTitle(result),
      parentType: result.parent?.type ?? 'unknown',
      url: result.url ?? null
    }))
}
