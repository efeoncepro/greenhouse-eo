import 'server-only'

import { resolveSecret, type SecretResolutionSource } from '@/lib/secrets/secret-manager'

// Cliente canónico de LicitaLAB (lectura sobre Mercado Público y compras públicas de PE/CO).
// NUNCA instanciar un fetch paralelo a LicitaLAB dentro de otro módulo: extender este cliente.
//
// Transporte: el servidor MCP de LicitaLAB (Streamable HTTP, JSON-RPC por POST). Con API key NO hay OAuth ni sesión:
// cada request es independiente y la key viaja en `Authorization: Bearer <key>` (`x-api-key` responde 401).
// La REST `api2.licitalab.cl` NO acepta esta key (usa JWT de login), por eso el cliente habla MCP.
//
// Alcance de la API key (verificado 2026-09-17): listOpportunityDocumentsTool, getOpportunityDocumentTool y
// searchSupportTool operan; findOpportunityTool y providerReportTool responden `status: unsupported` porque exigen
// la sesión OAuth de un usuario. `tools/list` las sigue listando: el inventario no prueba que operen con la key.
//
// Secreto: LICITALAB_API_KEY / LICITALAB_API_KEY_SECRET_REF (Secret Manager `greenhouse-licitalab-api-key`).
// Nunca se loguea ni se devuelve la key.

export const LICITALAB_MCP_URL = 'https://aiagents.licitalab.cl/api/mcp/licitalab-mcp-server/mcp'

const LICITALAB_DEFAULT_TIMEOUT_MS = 60_000
const ERROR_DETAIL_MAX_CHARS = 500

export type LicitalabCountry = 'CL' | 'PE' | 'CO'

export const LICITALAB_COUNTRIES: readonly LicitalabCountry[] = ['CL', 'PE', 'CO']

export const LICITALAB_TIME_PERIODS = [
  'sc_last_10_days',
  'sc_last_month',
  'sc_last_3_months',
  'sc_last_6_months',
  'sc_last_year'
] as const

export type LicitalabTimePeriod = (typeof LICITALAB_TIME_PERIODS)[number]

export const LICITALAB_OPPORTUNITY_TYPES = [
  'all',
  'tenders',
  'agile',
  'marco_agreement',
  'quotes',
  'big_purchases',
  'direct_purchase',
  'market_query',
  'minor_buying'
] as const

export type LicitalabOpportunityType = (typeof LICITALAB_OPPORTUNITY_TYPES)[number]

export const LICITALAB_APPLICATION_MODES = ['all', 'awarded', 'not_awarded', 'offered', 'registered'] as const

export type LicitalabApplicationMode = (typeof LICITALAB_APPLICATION_MODES)[number]

export const LICITALAB_PROVIDER_INCLUDES = ['top_competitors', 'recent_awarded_items', 'lost_items_pricing'] as const

export type LicitalabProviderInclude = (typeof LICITALAB_PROVIDER_INCLUDES)[number]

export interface LicitalabToolDefinition {
  name: string
  description: string | null
  inputSchema: Record<string, unknown> | null
}

export interface LicitalabToolResult<TPayload = unknown> {
  ok: boolean
  httpStatus: number
  tool: string
  /** Contenido de la tool: JSON parseado cuando el texto es JSON; si no, el texto tal cual. Null si falló. */
  payload: TPayload | null
  /**
   * `status` que la tool declara en su body, si lo trae. RAG documental: ok | partial | indexing | empty |
   * unsupported | error. `partial`, `indexing` y `empty` son respuestas válidas que el consumer debe comunicar tal cual.
   */
  status: string | null
  /** Detalle saneado del error (HTTP, JSON-RPC, `isError` o `status` de fallo). Nunca contiene la key. */
  errorDetail: string | null
  latencyMs: number
  secretSource: SecretResolutionSource
}

export class LicitalabConfigurationError extends Error {
  constructor() {
    super('LicitaLAB no está configurado. Define LICITALAB_API_KEY o LICITALAB_API_KEY_SECRET_REF.')
    this.name = 'LicitalabConfigurationError'
  }
}

export interface LicitalabRequestOptions {
  timeoutMs?: number
  fetchImpl?: typeof fetch
  /**
   * Access token OAuth de un usuario de LicitaLAB. Si viene, reemplaza a la API key: es la única credencial con la que
   * operan findOpportunityTool y providerReportTool. El dominio no persiste ni refresca tokens (el servidor no emite
   * refresh token); quien lo obtiene lo gestiona — hoy `scripts/commercial/licitalab-oauth.ts`, sólo local.
   */
  userAccessToken?: string
}

interface JsonRpcResponse {
  result?: unknown
  error?: { code?: number; message?: string }
}

const resolveLicitalabApiKey = async () => {
  const resolution = await resolveSecret({ envVarName: 'LICITALAB_API_KEY' })

  if (!resolution.value) {
    throw new LicitalabConfigurationError()
  }

  return resolution
}

export const isLicitalabConfigured = async (): Promise<boolean> => {
  try {
    const resolution = await resolveSecret({ envVarName: 'LICITALAB_API_KEY' })

    return Boolean(resolution.value)
  } catch {
    return false
  }
}

const truncate = (value: string) =>
  value.length > ERROR_DETAIL_MAX_CHARS ? `${value.slice(0, ERROR_DETAIL_MAX_CHARS)}…` : value

/** Elimina cualquier aparición de la key de un texto antes de exponerlo. */
const redact = (value: string, apiKey: string) => (apiKey ? value.split(apiKey).join('<redacted>') : value)

/**
 * El servidor responde `application/json`, pero Streamable HTTP permite `text/event-stream`.
 * Soporta ambos: en SSE toma el último `data:` que traiga un mensaje JSON-RPC.
 */
export const parseJsonRpcBody = (body: string, contentType: string | null): JsonRpcResponse | null => {
  const tryParse = (raw: string): JsonRpcResponse | null => {
    try {
      const parsed = JSON.parse(raw) as unknown

      return parsed && typeof parsed === 'object' ? (parsed as JsonRpcResponse) : null
    } catch {
      return null
    }
  }

  if (contentType?.includes('text/event-stream')) {
    const messages = body
      .split(/\r?\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => tryParse(line.slice(5).trim()))
      .filter((message): message is JsonRpcResponse => message !== null)

    return messages.at(-1) ?? null
  }

  return tryParse(body)
}

/** Status de body que significan que la tool no entregó datos. */
export const LICITALAB_FAILURE_STATUSES: ReadonlySet<string> = new Set(['unsupported', 'error'])

const readPayloadStatus = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null

  const status = (payload as { status?: unknown }).status

  return typeof status === 'string' ? status : null
}

let requestCounter = 0

const callJsonRpc = async (
  method: string,
  params: Record<string, unknown>,
  options: LicitalabRequestOptions = {}
): Promise<{ httpStatus: number; response: JsonRpcResponse | null; errorDetail: string | null; latencyMs: number; secretSource: SecretResolutionSource }> => {
  const resolution = options.userAccessToken
    ? { source: 'env' as SecretResolutionSource, value: options.userAccessToken }
    : await resolveLicitalabApiKey()

  const apiKey = resolution.value as string
  const fetchImpl = options.fetchImpl ?? fetch
  const startedAt = Date.now()

  requestCounter += 1

  try {
    const res = await fetchImpl(LICITALAB_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: requestCounter, method, params }),
      signal: AbortSignal.timeout(options.timeoutMs ?? LICITALAB_DEFAULT_TIMEOUT_MS)
    })

    const body = await res.text()
    const response = parseJsonRpcBody(body, res.headers.get('content-type'))
    const latencyMs = Date.now() - startedAt

    if (!res.ok) {
      const detail = response?.error?.message ?? body

      if (res.status === 401 && options.userAccessToken) {
        return {
          httpStatus: res.status,
          response,
          errorDetail: 'La sesión OAuth de LicitaLAB venció o fue revocada. Vuelve a autorizar (pnpm licitalab login).',
          latencyMs,
          secretSource: resolution.source
        }
      }

      return {
        httpStatus: res.status,
        response,
        errorDetail: truncate(redact(`HTTP ${res.status}: ${detail || res.statusText}`, apiKey)),
        latencyMs,
        secretSource: resolution.source
      }
    }

    if (!response) {
      return {
        httpStatus: res.status,
        response: null,
        errorDetail: 'Respuesta de LicitaLAB sin JSON-RPC legible.',
        latencyMs,
        secretSource: resolution.source
      }
    }

    if (response.error) {
      return {
        httpStatus: res.status,
        response,
        errorDetail: truncate(redact(`JSON-RPC ${response.error.code ?? ''}: ${response.error.message ?? 'error'}`.trim(), apiKey)),
        latencyMs,
        secretSource: resolution.source
      }
    }

    return { httpStatus: res.status, response, errorDetail: null, latencyMs, secretSource: resolution.source }
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown_error'

    return {
      httpStatus: 0,
      response: null,
      errorDetail: truncate(redact(message, apiKey)),
      latencyMs: Date.now() - startedAt,
      secretSource: resolution.source
    }
  }
}

export const listLicitalabTools = async (options?: LicitalabRequestOptions): Promise<LicitalabToolResult<LicitalabToolDefinition[]>> => {
  const call = await callJsonRpc('tools/list', {}, options)
  const rawTools = (call.response?.result as { tools?: unknown } | undefined)?.tools

  const tools = Array.isArray(rawTools)
    ? rawTools.map(tool => {
        const t = tool as Record<string, unknown>

        return {
          name: String(t.name ?? ''),
          description: typeof t.description === 'string' ? t.description : null,
          inputSchema: (t.inputSchema as Record<string, unknown> | undefined) ?? null
        }
      })
    : null

  return {
    ok: call.errorDetail === null && tools !== null,
    httpStatus: call.httpStatus,
    tool: 'tools/list',
    status: null,
    payload: tools,
    errorDetail: call.errorDetail ?? (tools === null ? 'tools/list sin lista de tools.' : null),
    latencyMs: call.latencyMs,
    secretSource: call.secretSource
  }
}

/** Llama cualquier tool de LicitaLAB. Los wrappers tipados de abajo son la vía preferida. */
export const callLicitalabTool = async <TPayload = unknown>(
  tool: string,
  args: Record<string, unknown>,
  options?: LicitalabRequestOptions
): Promise<LicitalabToolResult<TPayload>> => {
  const cleanArgs = Object.fromEntries(Object.entries(args).filter(([, value]) => value !== undefined))
  const call = await callJsonRpc('tools/call', { name: tool, arguments: cleanArgs }, options)

  const base = { httpStatus: call.httpStatus, tool, latencyMs: call.latencyMs, secretSource: call.secretSource }

  if (call.errorDetail) {
    return { ...base, ok: false, status: null, payload: null, errorDetail: call.errorDetail }
  }

  const result = (call.response?.result ?? {}) as { content?: Array<{ type?: string; text?: string }>; isError?: boolean }

  const text = (result.content ?? [])
    .filter(item => item.type === 'text' && typeof item.text === 'string')
    .map(item => item.text as string)
    .join('\n')

  let payload: unknown = text

  try {
    payload = JSON.parse(text)
  } catch {
    // La tool devolvió texto plano: se expone tal cual.
  }

  if (result.isError) {
    return { ...base, ok: false, status: null, payload: null, errorDetail: truncate(text || 'La tool reportó un error sin detalle.') }
  }

  const status = readPayloadStatus(payload)

  // Las tools reportan fallos de negocio con isError=false y `status` en el body. `unsupported` incluye las tools
  // que exigen sesión OAuth y no operan con API key (findOpportunityTool, providerReportTool al 2026-09-17).
  if (status && LICITALAB_FAILURE_STATUSES.has(status)) {
    const message = (payload as { error?: unknown }).error

    return {
      ...base,
      ok: false,
      status,
      payload: payload as TPayload,
      errorDetail: truncate(typeof message === 'string' && message ? message : `La tool respondió status=${status}.`)
    }
  }

  return { ...base, ok: true, status, payload: payload as TPayload, errorDetail: null }
}

// ── Wrappers tipados ────────────────────────────────────────────────────────────────────────────────

export const findLicitalabOpportunity = (
  input: { code: string; country?: LicitalabCountry; type?: string; buyer?: string },
  options?: LicitalabRequestOptions
) => callLicitalabTool('findOpportunityTool', input, options)

export const listLicitalabOpportunityDocuments = (
  input: { code: string; country?: LicitalabCountry },
  options?: LicitalabRequestOptions
) => callLicitalabTool('listOpportunityDocumentsTool', input, options)

export const searchLicitalabOpportunityDocuments = (
  input: { code: string; query: string; country?: LicitalabCountry; topK?: number },
  options?: LicitalabRequestOptions
) => callLicitalabTool('getOpportunityDocumentTool', input, options)

export const getLicitalabProviderReport = (
  input: {
    taxNumber: string
    country?: LicitalabCountry
    timePeriod?: LicitalabTimePeriod
    opportunityType?: LicitalabOpportunityType
    applicationMode?: LicitalabApplicationMode
    include?: LicitalabProviderInclude[]
    cursor?: string
    limit?: number
    orderBy?: 'recent' | 'amount'
  },
  options?: LicitalabRequestOptions
) => callLicitalabTool('providerReportTool', input, options)

/** La tool de soporte usa otro vocabulario de país (`chile`/`peru`) que las de oportunidades. */
export const searchLicitalabSupport = (
  input: { question: string; country?: LicitalabCountry },
  options?: LicitalabRequestOptions
) => {
  const supportCountry = input.country === 'CL' ? 'chile' : input.country === 'PE' ? 'peru' : undefined

  return callLicitalabTool('searchSupportTool', { question: input.question, country: supportCountry }, options)
}
