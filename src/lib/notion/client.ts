import 'server-only'

/**
 * Notion API client for Greenhouse.
 *
 * Provides database discovery, sample querying, and workspace search.
 * Used by the onboarding flow to find Proyectos/Tareas/Sprints databases
 * when registering a new Space.
 */

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

function getNotionToken(): string {
  const token = (process.env.NOTION_TOKEN || '').trim()
  if (!token) throw new Error('NOTION_TOKEN environment variable is not set')
  return token
}

function notionHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getNotionToken()}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION
  }
}

// ─── Types ───

export interface NotionDatabase {
  databaseId: string
  title: string
  classification: NotionDbClassification | null
  parentType: string
  parentId: string
  url: string
  createdTime: string
  lastEditedTime: string
}

export type NotionDbClassification = 'proyectos' | 'tareas' | 'sprints' | 'revisiones'

export interface NotionDatabaseGroup {
  parentKey: string
  databases: NotionDatabase[]
  hasCoreDatabases: boolean
  classificationsFound: string[]
}

export interface NotionDiscoveryResult {
  totalDatabases: number
  groups: NotionDatabaseGroup[]
  filter: string | null
}

export interface NotionSampleRecord {
  pageId: string
  properties: Record<string, unknown>
}

// ─── Classification ───

function classifyDatabase(titleLower: string): NotionDbClassification | null {
  if (titleLower === 'tareas' || titleLower === 'tasks') return 'tareas'
  if (titleLower === 'proyectos' || titleLower === 'projects' || titleLower === 'campañas' || titleLower === 'campaigns') return 'proyectos'
  if (titleLower === 'sprints' || titleLower === 'ciclos' || titleLower === 'cycles') return 'sprints'
  if (titleLower === 'revisiones' || titleLower === 'reviews') return 'revisiones'

  if (titleLower.includes('tarea') || titleLower.includes('task')) return 'tareas'
  if (titleLower.includes('proyecto') || titleLower.includes('project') || titleLower.includes('campaña')) return 'proyectos'
  if (titleLower.includes('sprint') || titleLower.includes('ciclo')) return 'sprints'
  if (titleLower.includes('revision') || titleLower.includes('review')) return 'revisiones'

  return null
}

// ─── Property extraction (for samples) ───

function extractPropPreview(prop: Record<string, unknown>): unknown {
  const ptype = prop.type as string

  if (ptype === 'title') {
    const parts = prop.title as Array<{ plain_text?: string }> | undefined
    return (parts || []).map(t => t.plain_text || '').join('')
  }
  if (ptype === 'rich_text') {
    const parts = prop.rich_text as Array<{ plain_text?: string }> | undefined
    return (parts || []).map(t => t.plain_text || '').join('')
  }
  if (ptype === 'number') return prop.number
  if (ptype === 'select') {
    const sel = prop.select as { name?: string } | null
    return sel?.name ?? null
  }
  if (ptype === 'multi_select') {
    const items = prop.multi_select as Array<{ name?: string }> | undefined
    return (items || []).map(s => s.name)
  }
  if (ptype === 'status') {
    const st = prop.status as { name?: string } | null
    return st?.name ?? null
  }
  if (ptype === 'date') {
    const d = prop.date as { start?: string } | null
    return d?.start ?? null
  }
  if (ptype === 'checkbox') return prop.checkbox
  if (ptype === 'url') return prop.url
  if (ptype === 'people') {
    const people = prop.people as Array<{ name?: string; id?: string }> | undefined
    return (people || []).map(p => p.name || p.id || '')
  }
  if (ptype === 'relation') {
    const rels = prop.relation as Array<{ id?: string }> | undefined
    return (rels || []).map(r => (r.id || '').replace(/-/g, ''))
  }
  if (ptype === 'formula') {
    const f = prop.formula as Record<string, unknown> | undefined
    if (!f) return null
    return f[f.type as string] ?? null
  }

  return `[${ptype}]`
}

// ─── Public API ───

/**
 * Search the Notion workspace for all databases, classify them,
 * and group by parent (teamspace/page).
 */
export async function discoverDatabases(keyword?: string): Promise<NotionDiscoveryResult> {
  const kw = (keyword || '').trim().toLowerCase()
  const allDbs: NotionDatabase[] = []
  let startCursor: string | undefined

  while (true) {
    const body: Record<string, unknown> = {
      filter: { value: 'database', property: 'object' },
      page_size: 100
    }
    if (startCursor) body.start_cursor = startCursor

    const resp = await fetch(`${NOTION_API}/search`, {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify(body)
    })
    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`Notion search failed (${resp.status}): ${text}`)
    }

    const data = await resp.json() as {
      results: Array<{
        id: string
        title?: Array<{ plain_text?: string }>
        parent?: Record<string, unknown>
        url?: string
        created_time?: string
        last_edited_time?: string
      }>
      has_more: boolean
      next_cursor?: string
    }

    for (const db of data.results) {
      const title = (db.title || []).map(t => t.plain_text || '').join('').trim()
      if (!title) continue
      if (kw && !title.toLowerCase().includes(kw)) continue

      const parent = db.parent || {}
      const parentType = (parent.type as string) || 'unknown'
      const parentId = (parent[parentType] as string) || ''

      allDbs.push({
        databaseId: db.id.replace(/-/g, ''),
        title,
        classification: classifyDatabase(title.toLowerCase()),
        parentType,
        parentId: typeof parentId === 'string' ? parentId : '',
        url: db.url || '',
        createdTime: db.created_time || '',
        lastEditedTime: db.last_edited_time || ''
      })
    }

    if (!data.has_more) break
    startCursor = data.next_cursor
  }

  // Group by parent
  const parentMap = new Map<string, NotionDatabase[]>()
  for (const db of allDbs) {
    const key = `${db.parentType}:${db.parentId}`
    const list = parentMap.get(key) || []
    list.push(db)
    parentMap.set(key, list)
  }

  const groups: NotionDatabaseGroup[] = []
  for (const [parentKey, dbs] of parentMap) {
    const classifications = new Set(dbs.map(d => d.classification).filter(Boolean) as string[])
    const hasCore = classifications.has('tareas') && classifications.has('proyectos')

    groups.push({
      parentKey,
      databases: dbs.sort((a, b) => (a.classification || 'zzz').localeCompare(b.classification || 'zzz')),
      hasCoreDatabases: hasCore,
      classificationsFound: [...classifications].sort()
    })
  }

  groups.sort((a, b) => {
    if (a.hasCoreDatabases !== b.hasCoreDatabases) return a.hasCoreDatabases ? -1 : 1
    return a.parentKey.localeCompare(b.parentKey)
  })

  return {
    totalDatabases: allDbs.length,
    groups,
    filter: kw || null
  }
}

/**
 * Query a Notion database and return sample records for verification.
 */
export async function sampleDatabase(databaseId: string, limit = 5): Promise<NotionSampleRecord[]> {
  let dbId = databaseId.trim()
  if (dbId.length === 32 && !dbId.includes('-')) {
    dbId = `${dbId.slice(0, 8)}-${dbId.slice(8, 12)}-${dbId.slice(12, 16)}-${dbId.slice(16, 20)}-${dbId.slice(20)}`
  }

  const resp = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({ page_size: Math.min(limit, 20) })
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Notion query failed (${resp.status}): ${text}`)
  }

  const data = await resp.json() as {
    results: Array<{
      id: string
      properties: Record<string, Record<string, unknown>>
    }>
  }

  return data.results.map(page => {
    const props: Record<string, unknown> = {}
    for (const [propName, propVal] of Object.entries(page.properties)) {
      props[propName] = extractPropPreview(propVal)
    }
    return {
      pageId: page.id.replace(/-/g, ''),
      properties: props
    }
  })
}
