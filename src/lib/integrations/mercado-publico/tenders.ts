import { createHash } from 'node:crypto'

import { resolveSecret, resolveSecretByRef } from '@/lib/secrets/secret-manager'

const API_BASE_URL = 'https://api.mercadopublico.cl/servicios/v1/publico'
const PUBLIC_WEB_BASE_URL = 'https://www.mercadopublico.cl'
const DEFAULT_TICKET_SECRET_REF = 'greenhouse-mercado-publico-ticket'
const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_RETRIES = 2
const DEFAULT_USER_AGENT = 'GreenhouseEO/1.0 mercado-publico-integration'

type FetchLike = typeof fetch

export type MercadoPublicoSource =
  | 'mercado_publico_api_v1'
  | 'mercado_publico_public_web'

export type MercadoPublicoTenderDetail = {
  source: 'mercado_publico_api_v1'
  codigoExterno: string
  nombre: string | null
  estado: string | null
  codigoEstado: number | null
  tipo: string | null
  moneda: string | null
  comprador: Record<string, unknown> | null
  fechas: Record<string, unknown> | null
  itemsCount: number | null
  raw: Record<string, unknown>
}

export type MercadoPublicoTenderDocumentReference = {
  source: 'mercado_publico_public_web'
  tenderCode: string
  filename: string
  documentType: string | null
  description: string | null
  publishedAt: string | null
  sourcePageUrl: string
  downloadControlName: string
  sourcePageFingerprint: string
}

export type MercadoPublicoTenderDocumentFile = MercadoPublicoTenderDocumentReference & {
  contentType: string
  contentDisposition: string | null
  sizeBytes: number
  sha256: string
  bytes: Buffer
}

export type MercadoPublicoTenderHydration = {
  tender: MercadoPublicoTenderDetail
  documents: MercadoPublicoTenderDocumentFile[]
}

type MercadoPublicoClientOptions = {
  ticket?: string
  fetcher?: FetchLike
  timeoutMs?: number
  retries?: number
  userAgent?: string
  env?: NodeJS.ProcessEnv
}

type ParsedForm = {
  actionUrl: string
  hiddenFields: URLSearchParams
}

export class MercadoPublicoIntegrationError extends Error {
  code: string
  retryable: boolean
  status?: number

  constructor(message: string, options: { code: string; retryable?: boolean; status?: number }) {
    super(message)
    this.name = 'MercadoPublicoIntegrationError'
    this.code = options.code
    this.retryable = options.retryable ?? false
    this.status = options.status
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const normalizeTenderCode = (value: string) => value.trim().toUpperCase()

const assertTenderCode = (value: string) => {
  const normalized = normalizeTenderCode(value)

  if (!/^\d+-\d+-[A-Z0-9]+$/.test(normalized)) {
    throw new MercadoPublicoIntegrationError('Invalid Mercado Publico tender code.', {
      code: 'invalid_tender_code'
    })
  }

  return normalized
}

const normalizeText = (value: string | null | undefined) => {
  const normalized = decodeHtmlEntities(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))

const stripTags = (value: string) => decodeHtmlEntities(value.replace(/<[^>]+>/g, ' '))

const sha256Hex = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')

const resolveUrl = (href: string, baseUrl: string) => {
  const decoded = decodeHtmlEntities(href)

  return new URL(decoded, baseUrl).toString()
}

const getFetch = (options: MercadoPublicoClientOptions) => options.fetcher ?? fetch

const getTimeoutMs = (options: MercadoPublicoClientOptions) => options.timeoutMs ?? DEFAULT_TIMEOUT_MS

const getRetries = (options: MercadoPublicoClientOptions) => options.retries ?? DEFAULT_RETRIES

const getUserAgent = (options: MercadoPublicoClientOptions) => options.userAgent ?? DEFAULT_USER_AGENT

const fetchWithRetry = async (
  input: string,
  options: MercadoPublicoClientOptions & {
    method?: 'GET' | 'POST'
    headers?: HeadersInit
    body?: BodyInit
    expectedContentType?: 'json' | 'html' | 'binary'
  } = {}
) => {
  const fetcher = getFetch(options)
  const retries = getRetries(options)
  const timeoutMs = getTimeoutMs(options)
  const headers = new Headers(options.headers)

  headers.set('user-agent', getUserAgent(options))

  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetcher(input, {
        method: options.method ?? 'GET',
        headers,
        body: options.body,
        signal: controller.signal,
        redirect: 'follow'
      })

      if (response.ok) {
        return response
      }

      if (![408, 429, 500, 502, 503, 504].includes(response.status) || attempt === retries) {
        throw new MercadoPublicoIntegrationError('Mercado Publico request failed.', {
          code: 'request_failed',
          retryable: response.status >= 500 || response.status === 429,
          status: response.status
        })
      }

      lastError = new MercadoPublicoIntegrationError('Mercado Publico transient request failure.', {
        code: 'request_retry',
        retryable: true,
        status: response.status
      })
    } catch (error) {
      lastError = error

      if (error instanceof MercadoPublicoIntegrationError && !error.retryable) {
        throw error
      }

      if (attempt === retries) {
        break
      }
    } finally {
      clearTimeout(timeout)
    }

    await sleep(200 * 2 ** attempt)
  }

  if (lastError instanceof MercadoPublicoIntegrationError) {
    throw lastError
  }

  throw new MercadoPublicoIntegrationError('Mercado Publico request failed before receiving a response.', {
    code: 'request_error',
    retryable: true
  })
}

export const resolveMercadoPublicoTicket = async (options: MercadoPublicoClientOptions = {}) => {
  if (options.ticket?.trim()) {
    return options.ticket.trim()
  }

  const resolution = await resolveSecret({
    envVarName: 'MERCADO_PUBLICO_TICKET',
    env: options.env
  })

  if (resolution.value) {
    return resolution.value
  }

  const fallback = await resolveSecretByRef(DEFAULT_TICKET_SECRET_REF, { env: options.env })

  if (fallback) {
    return fallback
  }

  throw new MercadoPublicoIntegrationError('Mercado Publico ticket is not configured.', {
    code: 'ticket_unconfigured'
  })
}

export const getMercadoPublicoTenderDetail = async (
  tenderCode: string,
  options: MercadoPublicoClientOptions = {}
): Promise<MercadoPublicoTenderDetail> => {
  const code = assertTenderCode(tenderCode)
  const ticket = await resolveMercadoPublicoTicket(options)
  const url = new URL(`${API_BASE_URL}/licitaciones.json`)

  url.searchParams.set('codigo', code)
  url.searchParams.set('ticket', ticket)

  const response = await fetchWithRetry(url.toString(), {
    ...options,
    expectedContentType: 'json'
  })

  const payload = await response.json() as Record<string, unknown>
  const listado = Array.isArray(payload.Listado) ? payload.Listado : []
  const item = listado[0]

  if (!item || typeof item !== 'object') {
    throw new MercadoPublicoIntegrationError('Mercado Publico tender detail was not found.', {
      code: 'tender_not_found',
      status: response.status
    })
  }

  const raw = item as Record<string, unknown>
  const items = raw.Items && typeof raw.Items === 'object' ? raw.Items as Record<string, unknown> : null

  return {
    source: 'mercado_publico_api_v1',
    codigoExterno: String(raw.CodigoExterno ?? code),
    nombre: typeof raw.Nombre === 'string' ? raw.Nombre : null,
    estado: typeof raw.Estado === 'string' ? raw.Estado : null,
    codigoEstado: Number.isFinite(Number(raw.CodigoEstado)) ? Number(raw.CodigoEstado) : null,
    tipo: typeof raw.Tipo === 'string' ? raw.Tipo : null,
    moneda: typeof raw.Moneda === 'string' ? raw.Moneda : null,
    comprador: raw.Comprador && typeof raw.Comprador === 'object' ? raw.Comprador as Record<string, unknown> : null,
    fechas: raw.Fechas && typeof raw.Fechas === 'object' ? raw.Fechas as Record<string, unknown> : null,
    itemsCount: Number.isFinite(Number(items?.Cantidad)) ? Number(items?.Cantidad) : null,
    raw
  }
}

const parseAttributes = (tag: string) => {
  const attrs: Record<string, string> = {}

  for (const match of tag.matchAll(/([\w:.-]+)=("[^"]*"|'[^']*')/g)) {
    attrs[match[1]] = decodeHtmlEntities(match[2].slice(1, -1))
  }

  return attrs
}

const parseHiddenFields = (html: string) => {
  const fields = new URLSearchParams()

  for (const match of html.matchAll(/<input[^>]+>/gi)) {
    const attrs = parseAttributes(match[0])

    if (attrs.name && attrs.type?.toLowerCase() === 'hidden') {
      fields.set(attrs.name, attrs.value ?? '')
    }
  }

  return fields
}

const parseForm = (html: string, pageUrl: string): ParsedForm => {
  const formTag = html.match(/<form[^>]*>/i)?.[0]
  const attrs = formTag ? parseAttributes(formTag) : {}
  const actionUrl = attrs.action ? resolveUrl(attrs.action, pageUrl) : pageUrl

  return {
    actionUrl,
    hiddenFields: parseHiddenFields(html)
  }
}

export const parseTenderDocumentPageUrls = (html: string, pageUrl: string) => {
  const urls = new Set<string>()

  for (const match of html.matchAll(/(?:\.\.\/)?Attachment\/VerAntecedentes\.aspx\?enc=([A-Za-z0-9%._~+=-]+)/gi)) {
    const encoded = match[1]

    if (encoded) {
      urls.add(resolveUrl(`../Attachment/VerAntecedentes.aspx?enc=${encoded}`, pageUrl))
    }
  }

  return [...urls]
}

const parseAttachmentRows = (html: string) => {
  const rows: Array<{
    filename: string
    documentType: string | null
    description: string | null
    publishedAt: string | null
    downloadControlName: string
  }> = []

  for (const rowMatch of html.matchAll(/<tr[^>]*class=["'][^"']*cssFwkItemStyle[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowHtml = rowMatch[1]
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(match => normalizeText(stripTags(match[1])))
    const inputTag = rowHtml.match(/<input[^>]+title=["']Ver Anexo["'][^>]*>|<input[^>]+name=["'][^"']*grdIbtnView["'][^>]*>/i)?.[0]
    const inputAttrs = inputTag ? parseAttributes(inputTag) : {}
    const filename = cells[0]

    if (!filename || !inputAttrs.name) {
      continue
    }

    rows.push({
      filename,
      documentType: cells[1],
      description: cells[2],
      publishedAt: cells[3],
      downloadControlName: inputAttrs.name
    })
  }

  return rows
}

const fetchTenderWebPage = async (tenderCode: string, options: MercadoPublicoClientOptions = {}) => {
  const code = assertTenderCode(tenderCode)
  const url = `${PUBLIC_WEB_BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${encodeURIComponent(code)}`

  const response = await fetchWithRetry(url, {
    ...options,
    expectedContentType: 'html'
  })

  return {
    url,
    html: await response.text()
  }
}

export const listMercadoPublicoTenderDocumentReferences = async (
  tenderCode: string,
  options: MercadoPublicoClientOptions = {}
): Promise<MercadoPublicoTenderDocumentReference[]> => {
  const code = assertTenderCode(tenderCode)
  const tenderPage = await fetchTenderWebPage(code, options)
  const documentPageUrls = parseTenderDocumentPageUrls(tenderPage.html, tenderPage.url)
  const references: MercadoPublicoTenderDocumentReference[] = []

  for (const sourcePageUrl of documentPageUrls) {
    const response = await fetchWithRetry(sourcePageUrl, {
      ...options,
      headers: {
        referer: tenderPage.url
      },
      expectedContentType: 'html'
    })

    const html = await response.text()
    const sourcePageFingerprint = sha256Hex(html)

    for (const row of parseAttachmentRows(html)) {
      references.push({
        source: 'mercado_publico_public_web',
        tenderCode: code,
        filename: row.filename,
        documentType: row.documentType,
        description: row.description,
        publishedAt: row.publishedAt,
        sourcePageUrl,
        downloadControlName: row.downloadControlName,
        sourcePageFingerprint
      })
    }
  }

  const seen = new Set<string>()

  return references.filter(reference => {
    const key = [
      reference.tenderCode,
      reference.filename,
      reference.documentType,
      reference.description,
      reference.publishedAt
    ].join('|')

    if (seen.has(key)) {
      return false
    }

    seen.add(key)

    return true
  })
}

export const downloadMercadoPublicoTenderDocument = async (
  reference: MercadoPublicoTenderDocumentReference,
  options: MercadoPublicoClientOptions = {}
): Promise<MercadoPublicoTenderDocumentFile> => {
  const sourcePageResponse = await fetchWithRetry(reference.sourcePageUrl, {
    ...options,
    expectedContentType: 'html'
  })

  const sourcePageHtml = await sourcePageResponse.text()
  const form = parseForm(sourcePageHtml, reference.sourcePageUrl)
  const body = new URLSearchParams(form.hiddenFields)

  body.set(`${reference.downloadControlName}.x`, '8')
  body.set(`${reference.downloadControlName}.y`, '8')

  const response = await fetchWithRetry(form.actionUrl, {
    ...options,
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      referer: reference.sourcePageUrl
    },
    body,
    expectedContentType: 'binary'
  })

  const bytes = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
  const contentDisposition = response.headers.get('content-disposition')

  if (contentType.includes('text/html')) {
    throw new MercadoPublicoIntegrationError('Mercado Publico returned HTML instead of a document.', {
      code: 'document_download_returned_html',
      retryable: true,
      status: response.status
    })
  }

  return {
    ...reference,
    contentType,
    contentDisposition,
    sizeBytes: bytes.byteLength,
    sha256: sha256Hex(bytes),
    bytes
  }
}

export const hydrateMercadoPublicoTenderWithDocuments = async (
  tenderCode: string,
  options: MercadoPublicoClientOptions = {}
): Promise<MercadoPublicoTenderHydration> => {
  const tender = await getMercadoPublicoTenderDetail(tenderCode, options)
  const references = await listMercadoPublicoTenderDocumentReferences(tender.codigoExterno, options)
  const documents: MercadoPublicoTenderDocumentFile[] = []

  for (const reference of references) {
    documents.push(await downloadMercadoPublicoTenderDocument(reference, options))
  }

  return {
    tender,
    documents
  }
}
