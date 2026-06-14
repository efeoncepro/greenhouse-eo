#!/usr/bin/env tsx
/**
 * TASK-1111 — Public website WordPress discovery.
 *
 * Read-only inventory for efeoncepro.com. This script only sends GET requests
 * to public WordPress REST endpoints and never resolves or prints secret values.
 *
 * Usage:
 *   pnpm public-website:discover
 *   pnpm public-website:discover -- --write
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

type JsonRecord = Record<string, unknown>

type EndpointProbe = {
  url: string
  status: number
  ok: boolean
  headers: Record<string, string | null>
  error?: string
  body?: unknown
}

type PublicWebsiteDiscoveryReport = {
  scannedAt: string
  baseUrl: string
  restIndex: {
    status: number
    siteName: string | null
    description: string | null
    url: string | null
    home: string | null
    namespaces: string[]
    authentication: string[]
    hasWpV2: boolean
    hasAbilitiesApi: boolean
    hasApplicationPasswords: boolean
  }
  hostingSignals: Record<string, string | null>
  contentInventory: {
    pagesTotal: number | null
    pagesSample: Array<{
      id: number | null
      slug: string | null
      status: string | null
      type: string | null
      modified: string | null
      link: string | null
      title: string | null
    }>
    postsTotal: number | null
    postsSample: Array<{
      id: number | null
      slug: string | null
      status: string | null
      type: string | null
      modified: string | null
      link: string | null
      title: string | null
    }>
    restTypes: Array<{
      key: string
      name: string | null
      restBase: string | null
    }>
  }
  abilities: {
    namespaceAdvertised: boolean
    routeIndexStatus: number | null
    routes: string[]
    listStatus: number | null
    listRequiresAuth: boolean
  }
  configurationReadiness: Array<{
    envVarName: string
    configured: boolean
    purpose: string
  }>
  nextSteps: string[]
}

const DEFAULT_BASE_URL = 'https://efeoncepro.com'

const JSON_HEADERS = {
  accept: 'application/json'
}

const REQUEST_TIMEOUT_MS = 15_000

const HEADERS_OF_INTEREST = [
  'server',
  'cf-cache-status',
  'x-kinsta-cache',
  'ki-cache-type',
  'ki-edge',
  'x-edge-location-klb',
  'x-robots-tag',
  'x-wp-total',
  'x-wp-totalpages',
  'allow',
  'link'
]

const envReadiness = [
  {
    envVarName: 'PUBLIC_WEBSITE_WORDPRESS_BASE_URL',
    purpose: 'Base URL del sitio publico; default seguro https://efeoncepro.com.'
  },
  {
    envVarName: 'PUBLIC_WEBSITE_WORDPRESS_USERNAME',
    purpose: 'Usuario tecnico WordPress para Application Passwords; no es secreto pero no debe ir al frontend.'
  },
  {
    envVarName: 'PUBLIC_WEBSITE_WORDPRESS_APPLICATION_PASSWORD_SECRET_REF',
    purpose: 'Secret Manager ref del application password WordPress para calls autenticados read/draft.'
  },
  {
    envVarName: 'PUBLIC_WEBSITE_KINSTA_API_TOKEN_SECRET_REF',
    purpose: 'Secret Manager ref del token Kinsta para inventario de ambiente/cache/backups.'
  },
  {
    envVarName: 'PUBLIC_WEBSITE_WORDPRESS_BRIDGE_SHARED_SECRET_SECRET_REF',
    purpose: 'Secret Manager ref futuro para firma HMAC del greenhouse-wp-bridge.'
  }
]

const asRecord = (value: unknown): JsonRecord => {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

const asString = (value: unknown): string | null => {
  return typeof value === 'string' ? value : null
}

const asNumber = (value: unknown): number | null => {
  return typeof value === 'number' ? value : null
}

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const buildUrl = (baseUrl: string, path: string) => {
  const base = stripTrailingSlash(baseUrl)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${base}${normalizedPath}`
}

const pickHeaders = (headers: Headers) => {
  return Object.fromEntries(HEADERS_OF_INTEREST.map(header => [header, headers.get(header)]))
}

const fetchJson = async (url: string): Promise<EndpointProbe> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: JSON_HEADERS,
      method: 'GET',
      signal: controller.signal
    })

    const text = await response.text()
    let body: unknown = null

    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = text.slice(0, 1_000)
      }
    }

    return {
      url,
      status: response.status,
      ok: response.ok,
      headers: pickHeaders(response.headers),
      body
    }
  } catch (error) {
    return {
      url,
      status: 0,
      ok: false,
      headers: {},
      error: error instanceof Error ? error.message : 'unknown_error'
    }
  } finally {
    clearTimeout(timeout)
  }
}

const getTitle = (value: unknown): string | null => {
  const title = asRecord(asRecord(value).title)

  return asString(title.rendered)
}

const summarizeContent = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map(item => {
    const record = asRecord(item)

    return {
      id: asNumber(record.id),
      slug: asString(record.slug),
      status: asString(record.status),
      type: asString(record.type),
      modified: asString(record.modified),
      link: asString(record.link),
      title: getTitle(record)
    }
  })
}

const summarizeTypes = (value: unknown) => {
  const record = asRecord(value)

  return Object.entries(record)
    .map(([key, raw]) => {
      const type = asRecord(raw)

      return {
        key,
        name: asString(type.name),
        restBase: asString(type.rest_base)
      }
    })
    .sort((a, b) => a.key.localeCompare(b.key))
}

const parseNamespaces = (restIndex: JsonRecord): string[] => {
  const namespaces = restIndex.namespaces

  return Array.isArray(namespaces) ? namespaces.filter((value): value is string => typeof value === 'string') : []
}

const parseAuthentication = (restIndex: JsonRecord): string[] => {
  const authentication = asRecord(restIndex.authentication)

  return Object.keys(authentication).sort()
}

const renderTable = (headers: string[], rows: string[][]) => {
  const headerLine = `| ${headers.join(' | ')} |`
  const separator = `| ${headers.map(() => '---').join(' | ')} |`
  const rowLines = rows.map(row => `| ${row.map(cell => cell || '-').join(' | ')} |`)

  return [headerLine, separator, ...rowLines].join('\n')
}

const renderReport = (report: PublicWebsiteDiscoveryReport) => {
  const pageRows = report.contentInventory.pagesSample.map(page => [
    String(page.id ?? ''),
    page.slug ?? '',
    page.status ?? '',
    page.modified ?? '',
    page.link ?? ''
  ])

  const typeRows = report.contentInventory.restTypes.map(type => [
    type.key,
    type.name ?? '',
    type.restBase ?? ''
  ])

  const configRows = report.configurationReadiness.map(item => [
    item.envVarName,
    item.configured ? 'yes' : 'no',
    item.purpose
  ])

  return `# Public Website WordPress Discovery

> Generated by \`pnpm public-website:discover -- --write\`
> Scanned at: ${report.scannedAt}
> Base URL: ${report.baseUrl}

## Summary

- Site: ${report.restIndex.siteName ?? 'unknown'} (${report.restIndex.url ?? 'unknown'})
- Description: ${report.restIndex.description ?? 'unknown'}
- REST \`wp/v2\`: ${report.restIndex.hasWpV2 ? 'available' : 'not advertised'}
- WordPress Abilities API: ${report.restIndex.hasAbilitiesApi ? 'advertised' : 'not advertised'}
- Application Passwords: ${report.restIndex.hasApplicationPasswords ? 'advertised' : 'not advertised'}
- Public pages observed: ${report.contentInventory.pagesTotal ?? 'unknown'}
- Public posts observed: ${report.contentInventory.postsTotal ?? 'unknown'}

## Hosting Signals

${renderTable(['Header', 'Value'], Object.entries(report.hostingSignals).map(([key, value]) => [key, value ?? '-']))}

## Public Pages Sample

${renderTable(['ID', 'Slug', 'Status', 'Modified', 'Link'], pageRows)}

## REST Types

${renderTable(['Key', 'Name', 'REST base'], typeRows)}

## Abilities API

- Namespace advertised: ${report.abilities.namespaceAdvertised ? 'yes' : 'no'}
- Route index status: ${report.abilities.routeIndexStatus ?? 'not checked'}
- Ability list status: ${report.abilities.listStatus ?? 'not checked'}
- Ability list requires auth: ${report.abilities.listRequiresAuth ? 'yes' : 'no'}
- Routes:
${report.abilities.routes.map(route => `  - \`${route}\``).join('\n') || '  - none'}

## Configuration Readiness

${renderTable(['Env var', 'Configured', 'Purpose'], configRows)}

## Next Steps

${report.nextSteps.map(step => `- ${step}`).join('\n')}
`
}

const writeReport = (report: PublicWebsiteDiscoveryReport) => {
  const date = report.scannedAt.slice(0, 10).replace(/-/g, '')

  const outputPath = resolve(
    process.cwd(),
    `docs/operations/discovery-public-website-wordpress-${date}.md`
  )

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, renderReport(report), 'utf8')

  return outputPath
}

const main = async () => {
  const args = process.argv.slice(2)
  const write = args.includes('--write')
  const baseUrl = stripTrailingSlash(process.env.PUBLIC_WEBSITE_WORDPRESS_BASE_URL || DEFAULT_BASE_URL)

  const [restIndexProbe, pagesProbe, postsProbe, typesProbe, abilitiesIndexProbe, abilitiesListProbe] = await Promise.all([
    fetchJson(buildUrl(baseUrl, '/wp-json/')),
    fetchJson(buildUrl(baseUrl, '/wp-json/wp/v2/pages?per_page=10&_fields=id,slug,status,link,modified,title,type')),
    fetchJson(buildUrl(baseUrl, '/wp-json/wp/v2/posts?per_page=10&_fields=id,slug,status,link,modified,title,type')),
    fetchJson(buildUrl(baseUrl, '/wp-json/wp/v2/types')),
    fetchJson(buildUrl(baseUrl, '/wp-json/wp-abilities/v1/')),
    fetchJson(buildUrl(baseUrl, '/wp-json/wp-abilities/v1/abilities?per_page=10'))
  ])

  const restIndex = asRecord(restIndexProbe.body)
  const namespaces = parseNamespaces(restIndex)
  const authentication = parseAuthentication(restIndex)
  const abilitiesIndex = asRecord(abilitiesIndexProbe.body)
  const routes = Object.keys(asRecord(abilitiesIndex.routes)).sort()
  const pagesTotal = Number.parseInt(pagesProbe.headers['x-wp-total'] ?? '', 10)
  const postsTotal = Number.parseInt(postsProbe.headers['x-wp-total'] ?? '', 10)

  const report: PublicWebsiteDiscoveryReport = {
    scannedAt: new Date().toISOString(),
    baseUrl,
    restIndex: {
      status: restIndexProbe.status,
      siteName: asString(restIndex.name),
      description: asString(restIndex.description),
      url: asString(restIndex.url),
      home: asString(restIndex.home),
      namespaces,
      authentication,
      hasWpV2: namespaces.includes('wp/v2'),
      hasAbilitiesApi: namespaces.includes('wp-abilities/v1'),
      hasApplicationPasswords: authentication.includes('application-passwords')
    },
    hostingSignals: restIndexProbe.headers,
    contentInventory: {
      pagesTotal: Number.isFinite(pagesTotal) ? pagesTotal : null,
      pagesSample: summarizeContent(pagesProbe.body),
      postsTotal: Number.isFinite(postsTotal) ? postsTotal : null,
      postsSample: summarizeContent(postsProbe.body),
      restTypes: summarizeTypes(typesProbe.body)
    },
    abilities: {
      namespaceAdvertised: namespaces.includes('wp-abilities/v1'),
      routeIndexStatus: abilitiesIndexProbe.status || null,
      routes,
      listStatus: abilitiesListProbe.status || null,
      listRequiresAuth: abilitiesListProbe.status === 401 || abilitiesListProbe.status === 403
    },
    configurationReadiness: envReadiness.map(item => ({
      ...item,
      configured: Boolean(process.env[item.envVarName]?.trim())
    })),
    nextSteps: [
      'Provisionar usuario tecnico WordPress de menor privilegio y application password; guardar solo el password en Secret Manager.',
      'Provisionar token Kinsta read-only si el plan/API scope lo permite; si no, documentar el scope minimo antes de cache clear.',
      'Correr discovery autenticada para listar abilities, tema/builder/plugins/SEO metadata y ambiente Kinsta sin escrituras.',
      'Disenar greenhouse-wp-bridge como plugin Abilities-first + REST compatibility antes de cualquier write path.',
      'Mantener publish/draft fuera de scope hasta tener staging/preview, audit log y rollback baseline.'
    ]
  }

  if (write) {
    const outputPath = writeReport(report)

    console.log(`Wrote ${outputPath}`)
  }

  console.log(JSON.stringify(report, null, 2))

  if (!restIndexProbe.ok || !report.restIndex.hasWpV2) {
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error('[public-website:discover] failed', error)
  process.exit(2)
})
