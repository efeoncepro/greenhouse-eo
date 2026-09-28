import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import sanitizeHtml from 'sanitize-html'

import { resolveCatalogExecution, type DataForSeoCatalogEndpoint } from '../../src/lib/ai/dataforseo-catalog'

const SOURCE_URL = 'https://docs.dataforseo.com/v3/wp-json/wp/v2/pages'
const DOCUMENTATION_ROOT = 'https://docs.dataforseo.com/v3/'
const OUTPUT_PATH = path.resolve(process.cwd(), 'data/dataforseo/endpoints.v3.json')

interface WpPage {
  id: number
  modified: string
  slug: string
  link: string
  title: { rendered: string }
  content: { rendered: string }
}

const decodeHtml = (value: string): string =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))

const text = (html: string): string =>
  decodeHtml(
    sanitizeHtml(html, {
      allowedTags: [],
      allowedAttributes: {}
    })
  )
    .replace(/\[(?:\/?vc_[^\]]+|\/vc_[^\]]+)\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const stableId = (method: string, endpointPath: string) =>
  `${method.toLowerCase()}:${endpointPath
    .replace(/^\/v3\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')}`

const resolveMode = (endpointPath: string): DataForSeoCatalogEndpoint['mode'] => {
  if (/\/live(?:\/|$)/.test(endpointPath)) return 'live'
  if (/\/task_post(?:\/|$)/.test(endpointPath)) return 'task_post'
  if (/\/task_get(?:\/|$)/.test(endpointPath) || /\/summary\/\{/.test(endpointPath)) return 'task_get'
  if (/\/tasks_ready(?:\/|$)/.test(endpointPath)) return 'tasks_ready'
  if (/\/(?:status|user_data|errors)(?:\/|$)/.test(endpointPath)) return 'status'
  if (/\/(?:locations|languages|categories|technologies)(?:\/|$)/.test(endpointPath)) return 'catalog'

  return 'other'
}

const extractRequestFields = (html: string): DataForSeoCatalogEndpoint['requestFields'] => {
  const requestStart = html.indexOf('dfs-doc-request')

  if (requestStart < 0) return []

  const responseStart = html.indexOf('dfs-doc-response', requestStart)
  const requestHtml = html.slice(requestStart, responseStart < 0 ? undefined : responseStart)
  const rows = [...requestHtml.matchAll(/<tr[^>]*data-doc-id="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/gi)]

  return rows.flatMap(match => {
    const cells = [...match[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => text(cell[1]))

    if (cells.length < 2 || !cells[0] || cells[0].includes('tasks-')) return []

    const description = cells.slice(2).join(' ')

    return [
      {
        name: cells[0].replace(/^\s+/, ''),
        type: cells[1] || null,
        required: /required field|required parameter|mandatory/i.test(description),
        description
      }
    ]
  })
}

const extractExample = (html: string): unknown | null => {
  const rawMatch = html.match(/--data-raw\s+(?:&#0*39;|')([\s\S]*?)(?:&#0*39;|')/i)

  if (!rawMatch) return null

  const candidate = decodeHtml(text(rawMatch[1])).trim()

  try {
    return JSON.parse(candidate)
  } catch {
    return candidate.length <= 4_000 ? candidate : null
  }
}

const extractBatchLimit = (pageText: string): number | null => {
  const patterns = [
    /up to\s+([\d,]+)\s+tasks? (?:in|per) (?:the|a|one) (?:single )?api call/i,
    /maximum (?:number|amount) of tasks[^\d]{0,80}([\d,]+)/i,
    /limit of\s+([\d,]+)\s+tasks/i
  ]

  for (const pattern of patterns) {
    const value = pageText.match(pattern)?.[1]

    if (value) return Number(value.replace(/,/g, ''))
  }

  return null
}

const extractDescription = (html: string): string => {
  const afterHeading = html.split(/<h[12][^>]*>[\s\S]*?<\/h[12]>/i)[1] ?? html
  const paragraphs = [...afterHeading.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(match => text(match[1]))

  return paragraphs.find(value => value.length >= 30 && !value.startsWith('Pricing'))?.slice(0, 1_000) ?? ''
}

const normalizeEndpointPath = (url: string): string => {
  const parsed = new URL(decodeHtml(url))

  return parsed.pathname.replace(/\{\{([^}]+)\}\}/g, '{$1}').replace(/\/$/, '')
}

export const parseOfficialPage = (page: WpPage): DataForSeoCatalogEndpoint[] => {
  const html = page.content.rendered
  const endpointBlocks = [...html.matchAll(/<div class="endpoint">([\s\S]*?)<\/div>/gi)]
  const pageText = text(html)
  const description = extractDescription(html)
  const requestFields = extractRequestFields(html)
  const example = extractExample(html)
  const batchLimit = extractBatchLimit(pageText)

  return endpointBlocks.flatMap(block => {
    const method = block[1].match(/\b(GET|POST)\b/i)?.[1]?.toUpperCase()
    const href = block[1].match(/data-href="([^"]+)"/i)?.[1]

    if ((method !== 'GET' && method !== 'POST') || !href) return []

    const endpointPath = normalizeEndpointPath(href)

    if (!endpointPath.startsWith('/v3/')) return []

    const pathTemplate = endpointPath.replace(/\{[^}]+\}/g, '{param}')
    const family = endpointPath.split('/').filter(Boolean)[1] ?? 'unknown'

    return [
      {
        id: stableId(method, pathTemplate),
        method,
        path: endpointPath,
        pathTemplate,
        family,
        title: text(page.title.rendered),
        description,
        mode: resolveMode(endpointPath),
        batchLimit,
        free: /account will not be charged|free of charge|no charge/i.test(pageText),
        requestFields,
        example,
        documentationUrl: page.link,
        sourcePageId: page.id,
        sourceModifiedAt: new Date(`${page.modified}Z`).toISOString(),
        execution: resolveCatalogExecution(endpointPath)
      }
    ] satisfies DataForSeoCatalogEndpoint[]
  })
}

const fetchAllPages = async (): Promise<WpPage[]> => {
  const fields = 'id,modified,slug,link,title,content'
  const first = await fetch(`${SOURCE_URL}?per_page=100&page=1&_fields=${fields}`)

  if (!first.ok) throw new Error(`DataForSEO docs respondió HTTP ${first.status}.`)

  const totalPages = Number(first.headers.get('x-wp-totalpages') ?? '1')

  const parsePages = async (response: Response): Promise<WpPage[]> => {
    const raw = await response.text()
    // La instalación oficial de WordPress antepone CSS inline en algunas páginas del
    // paginado. El payload JSON empieza de forma estable en `[{"id":`; conservar este
    // saneamiento aquí hace reproducible la fuente sin fingir que existe un OpenAPI.
    const jsonStart = raw.indexOf('[{"id":')

    if (jsonStart < 0) throw new Error('La fuente oficial no devolvió el arreglo de páginas esperado.')

    return JSON.parse(raw.slice(jsonStart)) as WpPage[]
  }

  const pages = await parsePages(first)

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await fetch(`${SOURCE_URL}?per_page=100&page=${page}&_fields=${fields}`)

    if (!response.ok) throw new Error(`DataForSEO docs página ${page} respondió HTTP ${response.status}.`)
    pages.push(...(await parsePages(response)))
  }

  return pages
}

const mapConcurrent = async <T, R>(items: T[], concurrency: number, work: (item: T) => Promise<R>): Promise<R[]> => {
  const results = new Array<R>(items.length)
  let cursor = 0

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor

      cursor += 1
      results[index] = await work(items[index])
    }
  })

  await Promise.all(workers)

  return results
}

const fetchRenderedDocumentation = async (pages: WpPage[]): Promise<WpPage[]> => {
  const response = await fetch(DOCUMENTATION_ROOT)

  if (!response.ok) throw new Error(`La portada oficial de DataForSEO respondió HTTP ${response.status}.`)

  const home = await response.text()

  const links = [...home.matchAll(/href=["']([^"']+)["']/gi)]
    .map(match => decodeHtml(match[1]))
    .filter(href => href.startsWith('/v3/') && !href.includes('/wp-'))
    .map(href => new URL(href, DOCUMENTATION_ROOT))
    .map(url => {
      url.search = ''
      url.hash = ''

      return url.toString()
    })
    .filter((url, index, all) => all.indexOf(url) === index)
    .sort()

  const pageById = new Map(pages.map(page => [page.id, page]))

  return mapConcurrent(links, 18, async link => {
    const renderedResponse = await fetch(link)

    if (!renderedResponse.ok) throw new Error(`${link} respondió HTTP ${renderedResponse.status}.`)

    const html = await renderedResponse.text()
    const sourceId = Number(html.match(/wp-json\/wp\/v2\/pages\/(\d+)/)?.[1] ?? '0')
    const source = pageById.get(sourceId)
    const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? new URL(link).pathname

    return {
      id: sourceId,
      modified: source?.modified ?? '1970-01-01T00:00:00',
      slug: new URL(link).pathname,
      link,
      title: { rendered: title.replace(/\s+[–-]\s+DataForSEO API v\.3.*$/i, '') },
      content: { rendered: html }
    }
  })
}

const buildSnapshot = (pages: WpPage[], documentationPages: WpPage[], generatedAt: string) => {
  const endpoints = documentationPages
    .flatMap(parseOfficialPage)
    .filter((endpoint, index, all) => all.findIndex(other => other.id === endpoint.id) === index)
    .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))

  const contentDigest = createHash('sha256')
    .update(JSON.stringify(pages.map(page => [page.id, page.modified, page.content.rendered])))
    .digest('hex')

  const latestModifiedAt = pages.reduce((latest, page) => Math.max(latest, new Date(`${page.modified}Z`).getTime()), 0)

  return {
    schemaVersion: 1 as const,
    providerApiVersion: 'v3' as const,
    source: {
      type: 'official-wordpress-rest' as const,
      url: SOURCE_URL,
      pageCount: pages.length,
      documentationPageCount: documentationPages.length,
      latestModifiedAt: new Date(latestModifiedAt).toISOString(),
      contentDigest
    },
    generatedAt,
    endpoints
  }
}

const main = async () => {
  const check = process.argv.includes('--check')
  const pages = await fetchAllPages()
  const documentationPages = await fetchRenderedDocumentation(pages)
  const existing = JSON.parse(await readFile(OUTPUT_PATH, 'utf8')) as { generatedAt?: string }

  const snapshot = buildSnapshot(
    pages,
    documentationPages,
    check ? (existing.generatedAt ?? new Date().toISOString()) : new Date().toISOString()
  )

  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`

  if (check) {
    const current = await readFile(OUTPUT_PATH, 'utf8')

    if (current !== serialized) {
      throw new Error('El catálogo DataForSEO tiene drift. Ejecuta pnpm dataforseo:catalog:sync y revisa el diff.')
    }

    console.log(
      `Catálogo vigente: ${snapshot.endpoints.length} endpoints desde ${documentationPages.length} páginas de documentación.`
    )

    return
  }

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await writeFile(OUTPUT_PATH, serialized)
  console.log(
    `Catálogo sincronizado: ${snapshot.endpoints.length} endpoints desde ${documentationPages.length} páginas de documentación.`
  )
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
