#!/usr/bin/env tsx
/**
 * TASK-1111 — Public website WordPress discovery.
 *
 * Read-only inventory for efeoncepro.com. Default mode only sends GET requests
 * to public WordPress REST endpoints. Authenticated and WP-CLI modes are opt-in,
 * read-only, and never print secret values.
 *
 * Usage:
 *   pnpm public-website:discover
 *   pnpm public-website:discover -- --write
 *   pnpm public-website:discover -- --authenticated --wpcli --write
 */

import { execFileSync } from 'node:child_process'
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

type ContentSummaryItem = {
  id: number | null
  slug: string | null
  status: string | null
  type: string | null
  modified: string | null
  link: string | null
  title: string | null
}

type RestTypeSummaryItem = {
  key: string
  name: string | null
  restBase: string | null
}

type AuthenticatedDiscoveryReport = {
  enabled: boolean
  configured: boolean
  usernameConfigured: boolean
  applicationPasswordSecretConfigured: boolean
  secretResolved: boolean
  user: {
    status: number | null
    id: number | null
    slug: string | null
    name: string | null
    roles: string[]
  }
  abilities: {
    status: number | null
    total: number | null
    sample: Array<{
      name: string
      label: string | null
      description: string | null
    }>
  }
  contentEditInventory: {
    pagesStatus: number | null
    pagesSample: ContentSummaryItem[]
    restTypesStatus: number | null
    restTypes: RestTypeSummaryItem[]
  }
  pluginsEndpoint: {
    status: number | null
    available: boolean
    plugins: Array<{
      plugin: string | null
      status: string | null
      name: string | null
      version: string | null
    }>
  }
  errors: string[]
}

type WpCliDiscoveryReport = {
  enabled: boolean
  configured: boolean
  status: 'not_configured' | 'ok' | 'failed'
  wordpressPath: string | null
  wordpressVersion: string | null
  home: string | null
  siteUrl: string | null
  blogPublic: string | null
  environmentType: string | null
  themes: Array<{
    name: string | null
    status: string | null
    update: string | null
    version: string | null
  }>
  plugins: Array<{
    name: string | null
    status: string | null
    update: string | null
    version: string | null
  }>
  postTypes: Array<{
    name: string | null
    label: string | null
    public: boolean | null
    showUi: boolean | null
    restBase: string | null
  }>
  errors: string[]
}

type PublicWebsiteDiscoveryReport = {
  scannedAt: string
  baseUrl: string
  modes: {
    public: boolean
    authenticated: boolean
    wpcli: boolean
  }
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
    pagesSample: ContentSummaryItem[]
    postsTotal: number | null
    postsSample: ContentSummaryItem[]
    restTypes: RestTypeSummaryItem[]
  }
  abilities: {
    namespaceAdvertised: boolean
    routeIndexStatus: number | null
    routes: string[]
    listStatus: number | null
    listRequiresAuth: boolean
  }
  authenticatedDiscovery: AuthenticatedDiscoveryReport
  wpCliDiscovery: WpCliDiscoveryReport
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
    envVarName: 'PUBLIC_WEBSITE_KINSTA_SSH_HOST',
    purpose: 'Host SSH/SFTP Kinsta para inspeccion WP-CLI read-only.'
  },
  {
    envVarName: 'PUBLIC_WEBSITE_KINSTA_SSH_PORT',
    purpose: 'Puerto SSH/SFTP Kinsta para inspeccion WP-CLI read-only.'
  },
  {
    envVarName: 'PUBLIC_WEBSITE_KINSTA_SSH_USER',
    purpose: 'Usuario SSH/SFTP Kinsta para inspeccion WP-CLI read-only.'
  },
  {
    envVarName: 'PUBLIC_WEBSITE_KINSTA_SSH_AUTH_METHOD',
    purpose: 'Metodo esperado para SSH Kinsta; usar public key en agentes, no passwords.'
  },
  {
    envVarName: 'PUBLIC_WEBSITE_KINSTA_SSH_KEY_PATH',
    purpose: 'Ruta local opcional de clave SSH Kinsta para discovery WP-CLI read-only.'
  },
  {
    envVarName: 'PUBLIC_WEBSITE_KINSTA_WORDPRESS_PATH',
    purpose: 'Ruta absoluta del docroot WordPress en Kinsta para ejecutar WP-CLI read-only.'
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

const fetchJson = async (url: string, headers: Record<string, string> = {}): Promise<EndpointProbe> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: {
        ...JSON_HEADERS,
        ...headers
      },
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

const asStringArray = (value: unknown): string[] => {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

const asBoolean = (value: unknown): boolean | null => {
  return typeof value === 'boolean' ? value : null
}

const summarizeAbilities = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.slice(0, 30).map(item => {
    const record = asRecord(item)

    return {
      name: asString(record.name) ?? asString(record.slug) ?? asString(record.id) ?? 'unknown',
      label: asString(record.label) ?? asString(record.title),
      description: asString(record.description)
    }
  })
}

const summarizePlugins = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map(item => {
    const record = asRecord(item)

    return {
      plugin: asString(record.plugin),
      status: asString(record.status),
      name: asString(record.name),
      version: asString(record.version)
    }
  })
}

type SecretRef = {
  project: string
  secret: string
  version: string
}

const parseSecretRef = (rawRef: string | undefined): SecretRef | null => {
  const value = rawRef?.trim()

  if (!value) {
    return null
  }

  const fullRef = value.match(/^projects\/([^/]+)\/secrets\/([^/]+)(?:\/versions\/([^/]+))?$/)

  if (fullRef) {
    return {
      project: fullRef[1],
      secret: fullRef[2],
      version: fullRef[3] ?? 'latest'
    }
  }

  const [secret, version] = value.split(':')

  return {
    project: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'efeonce-group',
    secret,
    version: version || 'latest'
  }
}

const resolveSecretValue = (rawRef: string | undefined) => {
  const secretRef = parseSecretRef(rawRef)

  if (!secretRef) {
    return {
      ok: false,
      value: null,
      error: 'secret_ref_not_configured'
    }
  }

  try {
    const value = execFileSync(
      'gcloud',
      ['secrets', 'versions', 'access', secretRef.version, '--secret', secretRef.secret, '--project', secretRef.project],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    ).trim()

    return {
      ok: Boolean(value),
      value: value || null,
      error: value ? null : 'secret_empty'
    }
  } catch {
    return {
      ok: false,
      value: null,
      error: 'secret_lookup_failed'
    }
  }
}

const buildAuthorizationHeader = (username: string | undefined, secretRef: string | undefined) => {
  const trimmedUsername = username?.trim()
  const resolvedSecret = resolveSecretValue(secretRef)

  if (!trimmedUsername || !resolvedSecret.ok || !resolvedSecret.value) {
    return {
      header: null,
      secretResolved: resolvedSecret.ok,
      error: !trimmedUsername ? 'wordpress_username_not_configured' : resolvedSecret.error
    }
  }

  return {
    header: `Basic ${Buffer.from(`${trimmedUsername}:${resolvedSecret.value}`, 'utf8').toString('base64')}`,
    secretResolved: true,
    error: null
  }
}

const emptyAuthenticatedDiscovery = (enabled: boolean, errors: string[] = []): AuthenticatedDiscoveryReport => ({
  enabled,
  configured: false,
  usernameConfigured: Boolean(process.env.PUBLIC_WEBSITE_WORDPRESS_USERNAME?.trim()),
  applicationPasswordSecretConfigured: Boolean(process.env.PUBLIC_WEBSITE_WORDPRESS_APPLICATION_PASSWORD_SECRET_REF?.trim()),
  secretResolved: false,
  user: {
    status: null,
    id: null,
    slug: null,
    name: null,
    roles: []
  },
  abilities: {
    status: null,
    total: null,
    sample: []
  },
  contentEditInventory: {
    pagesStatus: null,
    pagesSample: [],
    restTypesStatus: null,
    restTypes: []
  },
  pluginsEndpoint: {
    status: null,
    available: false,
    plugins: []
  },
  errors
})

const runAuthenticatedDiscovery = async (baseUrl: string, enabled: boolean): Promise<AuthenticatedDiscoveryReport> => {
  if (!enabled) {
    return emptyAuthenticatedDiscovery(false)
  }

  const auth = buildAuthorizationHeader(
    process.env.PUBLIC_WEBSITE_WORDPRESS_USERNAME,
    process.env.PUBLIC_WEBSITE_WORDPRESS_APPLICATION_PASSWORD_SECRET_REF
  )

  if (!auth.header) {
    return {
      ...emptyAuthenticatedDiscovery(true, auth.error ? [auth.error] : []),
      secretResolved: auth.secretResolved
    }
  }

  const authorizationHeaders = {
    authorization: auth.header
  }

  const [userProbe, abilitiesProbe, editPagesProbe, editTypesProbe, pluginsProbe] = await Promise.all([
    fetchJson(buildUrl(baseUrl, '/wp-json/wp/v2/users/me?context=edit&_fields=id,slug,name,roles'), authorizationHeaders),
    fetchJson(buildUrl(baseUrl, '/wp-json/wp-abilities/v1/abilities?per_page=100'), authorizationHeaders),
    fetchJson(
      buildUrl(baseUrl, '/wp-json/wp/v2/pages?context=edit&status=any&per_page=20&_fields=id,slug,status,link,modified,title,type'),
      authorizationHeaders
    ),
    fetchJson(buildUrl(baseUrl, '/wp-json/wp/v2/types?context=edit'), authorizationHeaders),
    fetchJson(buildUrl(baseUrl, '/wp-json/wp/v2/plugins'), authorizationHeaders)
  ])

  const user = asRecord(userProbe.body)
  const totalAbilities = Number.parseInt(abilitiesProbe.headers['x-wp-total'] ?? '', 10)

  return {
    enabled: true,
    configured: true,
    usernameConfigured: true,
    applicationPasswordSecretConfigured: true,
    secretResolved: true,
    user: {
      status: userProbe.status || null,
      id: asNumber(user.id),
      slug: asString(user.slug),
      name: asString(user.name),
      roles: asStringArray(user.roles)
    },
    abilities: {
      status: abilitiesProbe.status || null,
      total: Number.isFinite(totalAbilities) ? totalAbilities : null,
      sample: summarizeAbilities(abilitiesProbe.body)
    },
    contentEditInventory: {
      pagesStatus: editPagesProbe.status || null,
      pagesSample: summarizeContent(editPagesProbe.body),
      restTypesStatus: editTypesProbe.status || null,
      restTypes: summarizeTypes(editTypesProbe.body)
    },
    pluginsEndpoint: {
      status: pluginsProbe.status || null,
      available: pluginsProbe.ok,
      plugins: summarizePlugins(pluginsProbe.body)
    },
    errors: [userProbe, abilitiesProbe, editPagesProbe, editTypesProbe, pluginsProbe]
      .filter(probe => probe.error)
      .map(probe => `${probe.url}: ${probe.error}`)
  }
}

const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`

const parseJsonArray = (value: string): unknown[] => {
  try {
    const parsed = JSON.parse(value)

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const emptyWpCliDiscovery = (enabled: boolean, errors: string[] = []): WpCliDiscoveryReport => ({
  enabled,
  configured: false,
  status: enabled ? 'not_configured' : 'not_configured',
  wordpressPath: process.env.PUBLIC_WEBSITE_KINSTA_WORDPRESS_PATH?.trim() || null,
  wordpressVersion: null,
  home: null,
  siteUrl: null,
  blogPublic: null,
  environmentType: null,
  themes: [],
  plugins: [],
  postTypes: [],
  errors
})

const runWpCliDiscovery = (enabled: boolean): WpCliDiscoveryReport => {
  if (!enabled) {
    return emptyWpCliDiscovery(false)
  }

  const host = process.env.PUBLIC_WEBSITE_KINSTA_SSH_HOST?.trim()
  const port = process.env.PUBLIC_WEBSITE_KINSTA_SSH_PORT?.trim()
  const user = process.env.PUBLIC_WEBSITE_KINSTA_SSH_USER?.trim()
  const keyPath = process.env.PUBLIC_WEBSITE_KINSTA_SSH_KEY_PATH?.trim()
  const wordpressPath = process.env.PUBLIC_WEBSITE_KINSTA_WORDPRESS_PATH?.trim()

  if (!host || !port || !user || !keyPath || !wordpressPath) {
    return emptyWpCliDiscovery(true, ['wpcli_ssh_env_not_configured'])
  }

  const runWp = (args: string[]) => {
    const remoteCommand = `cd ${shellQuote(wordpressPath)} && wp ${args.map(shellQuote).join(' ')}`

    return execFileSync(
      'ssh',
      [
        '-i',
        keyPath,
        '-o',
        'BatchMode=yes',
        '-o',
        'IdentitiesOnly=yes',
        '-o',
        'StrictHostKeyChecking=accept-new',
        '-o',
        'ConnectTimeout=10',
        '-p',
        port,
        `${user}@${host}`,
        remoteCommand
      ],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 30_000
      }
    ).trim()
  }

  const errors: string[] = []

  const tryRun = (label: string, args: string[]) => {
    try {
      return runWp(args)
    } catch {
      errors.push(label)

      return null
    }
  }

  const wordpressVersion = tryRun('wp_core_version_failed', ['core', 'version'])
  const home = tryRun('wp_option_home_failed', ['option', 'get', 'home'])
  const siteUrl = tryRun('wp_option_siteurl_failed', ['option', 'get', 'siteurl'])
  const blogPublic = tryRun('wp_option_blog_public_failed', ['option', 'get', 'blog_public'])
  const environmentType = tryRun('wp_config_environment_type_failed', ['config', 'get', 'WP_ENVIRONMENT_TYPE'])
  const rawThemes = tryRun('wp_theme_list_failed', ['theme', 'list', '--format=json'])
  const rawPlugins = tryRun('wp_plugin_list_failed', ['plugin', 'list', '--format=json'])
  const rawPostTypes = tryRun('wp_post_type_list_failed', ['post-type', 'list', '--format=json'])
  const requiredCommandsOk = Boolean(wordpressVersion && home && siteUrl && rawThemes && rawPlugins && rawPostTypes)

  const themes = parseJsonArray(rawThemes ?? '').map(item => {
    const record = asRecord(item)

    return {
      name: asString(record.name),
      status: asString(record.status),
      update: asString(record.update),
      version: asString(record.version)
    }
  })

  const plugins = parseJsonArray(rawPlugins ?? '').map(item => {
    const record = asRecord(item)

    return {
      name: asString(record.name),
      status: asString(record.status),
      update: asString(record.update),
      version: asString(record.version)
    }
  })

  const postTypes = parseJsonArray(rawPostTypes ?? '').map(item => {
    const record = asRecord(item)

    return {
      name: asString(record.name),
      label: asString(record.label),
      public: asBoolean(record.public),
      showUi: asBoolean(record.show_ui),
      restBase: asString(record.rest_base)
    }
  })

  return {
    enabled: true,
    configured: true,
    status: requiredCommandsOk ? 'ok' : 'failed',
    wordpressPath,
    wordpressVersion,
    home,
    siteUrl,
    blogPublic,
    environmentType,
    themes,
    plugins,
    postTypes,
    errors
  }
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

  const authenticatedAbilityRows = report.authenticatedDiscovery.abilities.sample.map(ability => [
    ability.name,
    ability.label ?? '',
    ability.description ?? ''
  ])

  const authenticatedTypeRows = report.authenticatedDiscovery.contentEditInventory.restTypes.map(type => [
    type.key,
    type.name ?? '',
    type.restBase ?? ''
  ])

  const authenticatedPluginRows = report.authenticatedDiscovery.pluginsEndpoint.plugins.map(plugin => [
    plugin.plugin ?? '',
    plugin.status ?? '',
    plugin.name ?? '',
    plugin.version ?? ''
  ])

  const wpCliThemeRows = report.wpCliDiscovery.themes.map(theme => [
    theme.name ?? '',
    theme.status ?? '',
    theme.update ?? '',
    theme.version ?? ''
  ])

  const wpCliPluginRows = report.wpCliDiscovery.plugins.map(plugin => [
    plugin.name ?? '',
    plugin.status ?? '',
    plugin.update ?? '',
    plugin.version ?? ''
  ])

  const wpCliPostTypeRows = report.wpCliDiscovery.postTypes.map(postType => [
    postType.name ?? '',
    postType.label ?? '',
    postType.public === null ? '' : String(postType.public),
    postType.showUi === null ? '' : String(postType.showUi),
    postType.restBase ?? ''
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
- Authenticated discovery: ${report.authenticatedDiscovery.enabled ? report.authenticatedDiscovery.configured ? 'enabled' : 'enabled but not configured' : 'disabled'}
- WP-CLI discovery: ${report.wpCliDiscovery.enabled ? report.wpCliDiscovery.status : 'disabled'}

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

## Authenticated WordPress Read-only

- Enabled: ${report.authenticatedDiscovery.enabled ? 'yes' : 'no'}
- Configured: ${report.authenticatedDiscovery.configured ? 'yes' : 'no'}
- Username configured: ${report.authenticatedDiscovery.usernameConfigured ? 'yes' : 'no'}
- Application password secret configured: ${report.authenticatedDiscovery.applicationPasswordSecretConfigured ? 'yes' : 'no'}
- Application password secret resolved: ${report.authenticatedDiscovery.secretResolved ? 'yes' : 'no'}
- Current user status: ${report.authenticatedDiscovery.user.status ?? 'not checked'}
- Current user: ${report.authenticatedDiscovery.user.name ?? 'unknown'} (${report.authenticatedDiscovery.user.slug ?? 'unknown'})
- Current user roles: ${report.authenticatedDiscovery.user.roles.join(', ') || 'unknown'}
- Abilities status: ${report.authenticatedDiscovery.abilities.status ?? 'not checked'}
- Abilities total: ${report.authenticatedDiscovery.abilities.total ?? 'unknown'}
- Editable pages status: ${report.authenticatedDiscovery.contentEditInventory.pagesStatus ?? 'not checked'}
- Editable REST types status: ${report.authenticatedDiscovery.contentEditInventory.restTypesStatus ?? 'not checked'}
- Plugins endpoint status: ${report.authenticatedDiscovery.pluginsEndpoint.status ?? 'not checked'}
- Errors: ${report.authenticatedDiscovery.errors.join(', ') || 'none'}

### Authenticated Abilities Sample

${renderTable(['Name', 'Label', 'Description'], authenticatedAbilityRows)}

### Authenticated REST Types

${renderTable(['Key', 'Name', 'REST base'], authenticatedTypeRows)}

### Authenticated Plugins Endpoint

${renderTable(['Plugin', 'Status', 'Name', 'Version'], authenticatedPluginRows)}

## WP-CLI Read-only

- Enabled: ${report.wpCliDiscovery.enabled ? 'yes' : 'no'}
- Configured: ${report.wpCliDiscovery.configured ? 'yes' : 'no'}
- Status: ${report.wpCliDiscovery.status}
- WordPress path: ${report.wpCliDiscovery.wordpressPath ?? 'not configured'}
- WordPress version: ${report.wpCliDiscovery.wordpressVersion ?? 'unknown'}
- Home: ${report.wpCliDiscovery.home ?? 'unknown'}
- Site URL: ${report.wpCliDiscovery.siteUrl ?? 'unknown'}
- Blog public: ${report.wpCliDiscovery.blogPublic ?? 'unknown'}
- Environment type: ${report.wpCliDiscovery.environmentType ?? 'unknown'}
- Errors: ${report.wpCliDiscovery.errors.join(', ') || 'none'}

### WP-CLI Themes

${renderTable(['Name', 'Status', 'Update', 'Version'], wpCliThemeRows)}

### WP-CLI Plugins

${renderTable(['Name', 'Status', 'Update', 'Version'], wpCliPluginRows)}

### WP-CLI Post Types

${renderTable(['Name', 'Label', 'Public', 'Show UI', 'REST base'], wpCliPostTypeRows)}

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
  const authenticated = args.includes('--authenticated')
  const wpcli = args.includes('--wpcli')
  const baseUrl = stripTrailingSlash(process.env.PUBLIC_WEBSITE_WORDPRESS_BASE_URL || DEFAULT_BASE_URL)

  const [
    restIndexProbe,
    pagesProbe,
    postsProbe,
    typesProbe,
    abilitiesIndexProbe,
    abilitiesListProbe,
    authenticatedDiscovery
  ] = await Promise.all([
    fetchJson(buildUrl(baseUrl, '/wp-json/')),
    fetchJson(buildUrl(baseUrl, '/wp-json/wp/v2/pages?per_page=10&_fields=id,slug,status,link,modified,title,type')),
    fetchJson(buildUrl(baseUrl, '/wp-json/wp/v2/posts?per_page=10&_fields=id,slug,status,link,modified,title,type')),
    fetchJson(buildUrl(baseUrl, '/wp-json/wp/v2/types')),
    fetchJson(buildUrl(baseUrl, '/wp-json/wp-abilities/v1/')),
    fetchJson(buildUrl(baseUrl, '/wp-json/wp-abilities/v1/abilities?per_page=10')),
    runAuthenticatedDiscovery(baseUrl, authenticated)
  ])

  const restIndex = asRecord(restIndexProbe.body)
  const namespaces = parseNamespaces(restIndex)
  const authentication = parseAuthentication(restIndex)
  const abilitiesIndex = asRecord(abilitiesIndexProbe.body)
  const routes = Object.keys(asRecord(abilitiesIndex.routes)).sort()
  const pagesTotal = Number.parseInt(pagesProbe.headers['x-wp-total'] ?? '', 10)
  const postsTotal = Number.parseInt(postsProbe.headers['x-wp-total'] ?? '', 10)
  const wpCliDiscovery = runWpCliDiscovery(wpcli)

  const authenticatedOk = Boolean(
    authenticatedDiscovery.user.status && authenticatedDiscovery.user.status >= 200 && authenticatedDiscovery.user.status < 300
  )

  const report: PublicWebsiteDiscoveryReport = {
    scannedAt: new Date().toISOString(),
    baseUrl,
    modes: {
      public: true,
      authenticated,
      wpcli
    },
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
    authenticatedDiscovery,
    wpCliDiscovery,
    configurationReadiness: envReadiness.map(item => ({
      ...item,
      configured: Boolean(process.env[item.envVarName]?.trim())
    })),
    nextSteps: [
      authenticatedOk
        ? 'Mantener el usuario tecnico WordPress como read/draft least-privilege; no usarlo para publish hasta bridge + audit + staging.'
        : 'Corregir/provisionar usuario tecnico WordPress de menor privilegio y application password; guardar solo el password en Secret Manager.',
      wpCliDiscovery.configured
        ? 'Usar WP-CLI read-only como fallback auditado para theme/plugin/post-type inventory mientras no exista token Kinsta API.'
        : 'Configurar metadata SSH/WP-CLI si se requiere inspeccion repetible de theme/plugin/post-types sin portal Kinsta.',
      'Provisionar token Kinsta read-only si el plan/API scope lo permite; si no, documentar el scope minimo antes de cache clear.',
      'Crear TASK del greenhouse-wp-bridge draft-only foundation antes de cualquier write path.',
      'Mantener publish, cache clear y production rollout fuera de scope hasta tener staging/preview, audit log y rollback baseline.'
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
