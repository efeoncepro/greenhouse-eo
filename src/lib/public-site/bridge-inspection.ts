import { execFileSync } from 'node:child_process'

export type PublicSiteBridgeSecretRef = {
  project: string
  secret: string
  version: string
}

export type PublicSiteBridgeInspectionOptions = {
  pageId: number
  includeCatalog?: boolean
  includeBlockDocument?: boolean
  baseUrl?: string
}

export type PublicSiteBridgeFetchResult = {
  status: number
  ok: boolean
  body: unknown
}

export type PublicSiteBridgeInspectionReport = {
  contractVersion: 'public-site-bridge-inspection.v1'
  generatedAt: string
  baseUrl: string
  pageId: number
  mode: 'read_only'
  auth: {
    usernameConfigured: boolean
    applicationPasswordSecretConfigured: boolean
    secretResolved: boolean
  }
  endpoints: {
    health: {
      status: number
      ok: boolean
      summary: ReturnType<typeof summarizeHealth>
    }
    elementorDocument: {
      status: number
      ok: boolean
      summary: ReturnType<typeof summarizeDocument>
    }
    blockDocument: {
      status: number
      ok: boolean
      summary: ReturnType<typeof summarizeBlockDocument>
    } | null
    ohioWidgetCatalog: {
      status: number
      ok: boolean
      summary: ReturnType<typeof summarizeCatalog>
    } | null
  }
  safetyPolicy: {
    writesWordPressContent: false
    publishesContent: false
    clearsCache: false
    createsBackup: false
    sendsSecretsToOutput: false
  }
}

export const DEFAULT_PUBLIC_SITE_WORDPRESS_BASE_URL = 'https://efeoncepro.com'

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const buildUrl = (baseUrl: string, path: string) => `${stripTrailingSlash(baseUrl)}${path}`

const withCacheBuster = (path: string, generatedAt: string) => {
  const separator = path.includes('?') ? '&' : '?'

  return `${path}${separator}greenhouseInspection=${encodeURIComponent(generatedAt)}`
}

export const parsePublicSiteBridgeSecretRef = (rawRef: string | undefined): PublicSiteBridgeSecretRef | null => {
  const value = rawRef?.trim()

  if (!value) return null

  const defaultProject =
    process.env.GOOGLE_CLOUD_PROJECT?.trim() || process.env.GCLOUD_PROJECT?.trim() || 'efeonce-group'

  if (value.startsWith('projects/')) {
    const parts = value.split('/').filter(Boolean)
    const projectIndex = parts.indexOf('projects')
    const secretsIndex = parts.indexOf('secrets')
    const versionsIndex = parts.indexOf('versions')

    if (projectIndex >= 0 && secretsIndex >= 0 && parts[secretsIndex + 1]) {
      return {
        project: parts[projectIndex + 1] || defaultProject,
        secret: parts[secretsIndex + 1],
        version: versionsIndex >= 0 ? parts[versionsIndex + 1] || 'latest' : 'latest'
      }
    }
  }

  const [secret, version = 'latest'] = value.split(':')

  return {
    project: defaultProject,
    secret,
    version
  }
}

const resolveSecretValue = (rawRef: string | undefined) => {
  const secretRef = parsePublicSiteBridgeSecretRef(rawRef)

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

const buildAuthorizationHeader = () => {
  const username = process.env.PUBLIC_WEBSITE_WORDPRESS_USERNAME?.trim()
  const resolvedSecret = resolveSecretValue(process.env.PUBLIC_WEBSITE_WORDPRESS_APPLICATION_PASSWORD_SECRET_REF)

  if (!username || !resolvedSecret.ok || !resolvedSecret.value) {
    return {
      header: null,
      secretResolved: resolvedSecret.ok,
      error: !username ? 'wordpress_username_not_configured' : resolvedSecret.error
    }
  }

  return {
    header: `Basic ${Buffer.from(`${username}:${resolvedSecret.value}`, 'utf8').toString('base64')}`,
    secretResolved: true,
    error: null
  }
}

const fetchJson = async (url: string, authorizationHeader: string): Promise<PublicSiteBridgeFetchResult> => {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      authorization: authorizationHeader
    }
  })

  const body = await response.json().catch(() => null)

  return {
    status: response.status,
    ok: response.ok,
    body
  }
}

export const summarizeHealth = (body: any) => ({
  plugin: body?.plugin ?? null,
  site: body?.site ?? null,
  theme: body?.theme ?? null,
  capabilities: body?.capabilities ?? null,
  security: body?.security ?? null
})

export const summarizeDocument = (body: any) => ({
  post: body?.post ?? null,
  elementor: body?.elementor ?? null,
  elementsSummary: body?.elementsSummary ?? null,
  semanticAnchors: Array.isArray(body?.semanticAnchors) ? body.semanticAnchors : [],
  ohioMetaKeys: body?.ohioMeta && typeof body.ohioMeta === 'object' ? Object.keys(body.ohioMeta) : [],
  inspectionWarning: body?.inspectionWarning ?? null
})

export const summarizeBlockDocument = (body: any) => ({
  post: body?.post ?? null,
  editor: body?.editor ?? null,
  blocksSummary: body?.blocksSummary ?? null,
  semanticAnchors: Array.isArray(body?.semanticAnchors) ? body.semanticAnchors : [],
  inspectionWarning: body?.inspectionWarning ?? null
})

export const summarizeCatalog = (body: any) => ({
  elementorLoaded: Boolean(body?.elementorLoaded),
  totalWidgets: Number(body?.totalWidgets ?? 0),
  ohioCount: Number(body?.ohioCount ?? 0),
  hubspotCount: Number(body?.hubspotCount ?? 0),
  ohioWidgets: Array.isArray(body?.ohioWidgets)
    ? body.ohioWidgets.map((widget: any) => ({ name: widget?.name, title: widget?.title }))
    : [],
  hubspotWidgets: Array.isArray(body?.hubspotWidgets)
    ? body.hubspotWidgets.map((widget: any) => ({ name: widget?.name, title: widget?.title }))
    : []
})

export const inspectPublicSiteBridge = async (
  options: PublicSiteBridgeInspectionOptions
): Promise<PublicSiteBridgeInspectionReport> => {
  if (!Number.isInteger(options.pageId) || options.pageId <= 0) {
    throw new Error('page_id_invalid')
  }

  const auth = buildAuthorizationHeader()

  if (!auth.header) {
    throw new Error(`wordpress_authentication_not_configured:${auth.error}`)
  }

  const baseUrl = stripTrailingSlash(
    options.baseUrl?.trim() ||
      process.env.PUBLIC_WEBSITE_WORDPRESS_BASE_URL?.trim() ||
      DEFAULT_PUBLIC_SITE_WORDPRESS_BASE_URL
  )

  const generatedAt = new Date().toISOString()

  const health = await fetchJson(
    buildUrl(baseUrl, withCacheBuster('/wp-json/greenhouse-wp-bridge/v1/health', generatedAt)),
    auth.header
  )

  const documentInspection = await fetchJson(
    buildUrl(
      baseUrl,
      withCacheBuster(`/wp-json/greenhouse-wp-bridge/v1/inspection/elementor-document/${options.pageId}`, generatedAt)
    ),
    auth.header
  )

  const blockInspection = options.includeBlockDocument === false
    ? null
    : await fetchJson(
        buildUrl(
          baseUrl,
          withCacheBuster(`/wp-json/greenhouse-wp-bridge/v1/inspection/block-document/${options.pageId}`, generatedAt)
        ),
        auth.header
      )

  const catalog = options.includeCatalog === false
    ? null
    : await fetchJson(
        buildUrl(baseUrl, withCacheBuster('/wp-json/greenhouse-wp-bridge/v1/inspection/ohio-widget-catalog', generatedAt)),
        auth.header
      )

  return {
    contractVersion: 'public-site-bridge-inspection.v1',
    generatedAt,
    baseUrl,
    pageId: options.pageId,
    mode: 'read_only',
    auth: {
      usernameConfigured: Boolean(process.env.PUBLIC_WEBSITE_WORDPRESS_USERNAME?.trim()),
      applicationPasswordSecretConfigured: Boolean(
        process.env.PUBLIC_WEBSITE_WORDPRESS_APPLICATION_PASSWORD_SECRET_REF?.trim()
      ),
      secretResolved: auth.secretResolved
    },
    endpoints: {
      health: {
        status: health.status,
        ok: health.ok,
        summary: summarizeHealth(health.body)
      },
      elementorDocument: {
        status: documentInspection.status,
        ok: documentInspection.ok,
        summary: summarizeDocument(documentInspection.body)
      },
      blockDocument: blockInspection
        ? {
            status: blockInspection.status,
            ok: blockInspection.ok,
            summary: summarizeBlockDocument(blockInspection.body)
          }
        : null,
      ohioWidgetCatalog: catalog
        ? {
            status: catalog.status,
            ok: catalog.ok,
            summary: summarizeCatalog(catalog.body)
          }
        : null
    },
    safetyPolicy: {
      writesWordPressContent: false,
      publishesContent: false,
      clearsCache: false,
      createsBackup: false,
      sendsSecretsToOutput: false
    }
  }
}
