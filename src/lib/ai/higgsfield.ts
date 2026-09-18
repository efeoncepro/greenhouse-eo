import 'server-only'

import { resolveSecret, type SecretResolutionSource } from '@/lib/secrets/secret-manager'

// Canonical Higgsfield API client. Sibling of fal.ts / openai.ts / google-genai.ts. NEVER instantiate a parallel
// Higgsfield fetch inside a domain module — extend this client. The secret resolves server-side via
// HIGGSFIELD_API_KEY / HIGGSFIELD_API_KEY_SECRET_REF (Secret Manager: `greenhouse-higgsfield-api-key`).
// No official SDK dependency → fetch wrapper against the REST API (same canonical pattern as fal.ts).
//
// Higgsfield keys are shaped `<key_id>:<key_secret>` and travel in `Authorization: Key <value>` (NOT Bearer).
// One account fronts many model families (Soul, Marketing Studio, Seedance, Kling, Wan, Recraft…), so the client is
// model-agnostic: callers pass the endpoint id (e.g. 'higgsfield-ai/soul/v2/standard') + its input.
//
// Contract verified 2026-09-16 against docs.higgsfield.ai and the live API:
// - POST /<endpoint> → { status: 'queued', request_id, status_url, cancel_url }
// - GET  /requests/<id>/status → { status, request_id, images? | video? | audio?, error? }
// - Terminal states: completed · failed · nsfw · canceled. failed/nsfw/canceled are refunded.
// - POST /estimate/<endpoint> (same body) → { type: 'estimate', credits, usd, discount } or
//   { type: 'description', pricing_description } for token/resolution-metered models. Validates the body; never charges.
// - Concurrency limit answers 400 "Maximum number of concurrent requests (N) has been reached" (no 429/Retry-After).
// - Output URLs are retained ≥ 7 days only: callers must copy results to their own storage.
// - Submissions accept no idempotency key: a generation POST is NEVER retried automatically.

const HIGGSFIELD_API_BASE_URL = 'https://api.higgsfield.ai'

/** Polling recomendado por el proveedor: empieza en 2 s y crece hasta 10 s, con jitter. */
const HIGGSFIELD_DEFAULT_POLL_TIMEOUT_MS = 180_000
const HIGGSFIELD_DEFAULT_POLL_INTERVAL_MS = 2_000
const HIGGSFIELD_MAX_POLL_INTERVAL_MS = 10_000

/** Reintentos consecutivos de un GET de estado ante red caída o 5xx, antes de rendirse (el trabajo sigue en el proveedor). */
const HIGGSFIELD_STATUS_RETRY_LIMIT = 5

export const HIGGSFIELD_REQUEST_STATES = ['queued', 'in_progress', 'completed', 'failed', 'nsfw', 'canceled'] as const

export type HiggsfieldRequestState = (typeof HIGGSFIELD_REQUEST_STATES)[number]

export const isHiggsfieldTerminalState = (status: string | null | undefined): boolean =>
  status === 'completed' || status === 'failed' || status === 'nsfw' || status === 'canceled'

/** Tipos de contenido que acepta la subida prefirmada del proveedor. */
export const HIGGSFIELD_UPLOAD_CONTENT_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'audio/wav',
  'audio/x-wav',
  'video/mp4'
] as const

export interface HiggsfieldModelResult<TOutput = Record<string, unknown>> {
  ok: boolean
  httpStatus: number
  model: string
  requestId: string | null
  /** Último estado conocido del request; null si nunca se aceptó. */
  status: HiggsfieldRequestState | null
  /** Cuerpo del estado terminal `completed` (trae `images`, `video` o `audio`). Null si no terminó bien. */
  output: TOutput | null
  /** Detalle saneado del proveedor (validación, NSFW, concurrencia, fallo de generación). */
  errorDetail: string | null
  /** `X-Correlation-ID` de la última respuesta: soporte lo pide junto al request_id. */
  correlationId: string | null
  latencyMs: number
  secretSource: SecretResolutionSource
}

interface HiggsfieldKey {
  value: string
  source: SecretResolutionSource
}

const resolveHiggsfieldKey = async (): Promise<HiggsfieldKey> => {
  const resolution = await resolveSecret({ envVarName: 'HIGGSFIELD_API_KEY' })
  const value = resolution.value?.trim()

  if (!value) {
    throw new Error('Higgsfield no está configurado. Define HIGGSFIELD_API_KEY o HIGGSFIELD_API_KEY_SECRET_REF.')
  }

  return { value, source: resolution.source }
}

export const isHiggsfieldConfigured = async (): Promise<boolean> => {
  try {
    await resolveHiggsfieldKey()

    return true
  } catch {
    return false
  }
}

const authHeaders = (apiKey: string, json = true): Record<string, string> => ({
  Authorization: `Key ${apiKey}`,
  ...(json ? { 'Content-Type': 'application/json' } : {})
})

/** Envelope FastAPI: `detail` string o lista de errores de validación. Nunca devuelve el cuerpo crudo. */
const extractErrorDetail = (body: unknown): string | null => {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    const detail = record.detail

    if (typeof detail === 'string') return detail

    if (Array.isArray(detail)) {
      return detail
        .map(item => {
          const entry = (item ?? {}) as Record<string, unknown>
          const location = Array.isArray(entry.loc) ? entry.loc.join('.') : null

          return typeof entry.msg === 'string' ? `${location ? `${location}: ` : ''}${entry.msg}` : JSON.stringify(item)
        })
        .join('; ')
    }

    if (typeof record.error === 'string') return record.error
  }

  return null
}

/** El proveedor responde 400 (no 429) al tope de concurrencia de la cuenta. */
export const isHiggsfieldConcurrencyLimit = (httpStatus: number, detail: string | null | undefined): boolean =>
  httpStatus === 400 && /concurrent requests/i.test(detail ?? '')

/** 403 = créditos de API insuficientes (`not_enough_credits`). Se rechaza ANTES de encolar: no cobra. */
export const isHiggsfieldInsufficientCredits = (httpStatus: number, detail: string | null | undefined): boolean =>
  httpStatus === 403 && /credit/i.test(detail ?? '')

const readJson = async (response: Response): Promise<Record<string, unknown> | null> =>
  (await response.json().catch(() => null)) as Record<string, unknown> | null

const endpointPath = (model: string) => model.trim().replace(/^\/+|\/+$/g, '')

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

const asState = (value: unknown): HiggsfieldRequestState | null =>
  typeof value === 'string' && (HIGGSFIELD_REQUEST_STATES as readonly string[]).includes(value)
    ? (value as HiggsfieldRequestState)
    : null

// ── Estimación ───────────────────────────────────────────────────────────────────────────────────

export interface HiggsfieldCostEstimate {
  ok: boolean
  httpStatus: number
  /** Precio final en USD (ya con descuento aplicado). Null cuando el modelo sólo publica una fórmula. */
  usd: number | null
  credits: number | null
  /** Ahorro en USD del descuento vigente, si lo hay. */
  discountUsd: number | null
  discountPercentage: number | null
  /** Fórmula de precio para modelos medidos por tokens o resolución (`type: description`). */
  pricingDescription: string | null
  /** Error de validación o de acceso: el cuerpo no se aceptaría tampoco al encolar. */
  errorDetail: string | null
  correlationId: string | null
}

const toNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN

  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Pide el precio de un request SIN generarlo ni cobrarlo. El proveedor valida el cuerpo con el mismo esquema que al
 * encolar, así que un `ok:false` acá significa que la generación también sería rechazada.
 */
export const estimateHiggsfieldCost = async (params: {
  model: string
  input: Record<string, unknown>
}): Promise<HiggsfieldCostEstimate> => {
  const key = await resolveHiggsfieldKey()

  const response = await fetch(`${HIGGSFIELD_API_BASE_URL}/estimate/${endpointPath(params.model)}`, {
    method: 'POST',
    headers: authHeaders(key.value),
    body: JSON.stringify(params.input)
  })

  const body = await readJson(response)
  const correlationId = response.headers.get('x-correlation-id')
  const discount = (body?.discount ?? null) as Record<string, unknown> | null

  if (!response.ok) {
    return {
      ok: false,
      httpStatus: response.status,
      usd: null,
      credits: null,
      discountUsd: null,
      discountPercentage: null,
      pricingDescription: null,
      errorDetail: extractErrorDetail(body) ?? `Higgsfield respondió HTTP ${response.status} al estimar.`,
      correlationId
    }
  }

  return {
    ok: true,
    httpStatus: response.status,
    usd: body?.type === 'estimate' ? toNumber(body.usd) : null,
    credits: body?.type === 'estimate' ? toNumber(body.credits) : null,
    discountUsd: discount ? toNumber(discount.usd) : null,
    discountPercentage: discount ? toNumber(discount.percentage) : null,
    pricingDescription: typeof body?.pricing_description === 'string' ? body.pricing_description : null,
    errorDetail: null,
    correlationId
  }
}

// ── Cola ─────────────────────────────────────────────────────────────────────────────────────────

export interface HiggsfieldQueueHandle {
  requestId: string
  statusUrl: string
  cancelUrl: string
}

/** URLs del request. El proveedor las direcciona por id, sin el endpoint: se pueden reconstruir para retomar. */
export const resolveHiggsfieldQueueHandle = (requestId: string): HiggsfieldQueueHandle => ({
  requestId,
  statusUrl: `${HIGGSFIELD_API_BASE_URL}/requests/${requestId}/status`,
  cancelUrl: `${HIGGSFIELD_API_BASE_URL}/requests/${requestId}/cancel`
})

const failure = <TOutput>(params: {
  model: string
  httpStatus: number
  requestId: string | null
  status: HiggsfieldRequestState | null
  errorDetail: string | null
  correlationId: string | null
  started: number
  source: SecretResolutionSource
}): HiggsfieldModelResult<TOutput> => ({
  ok: false,
  httpStatus: params.httpStatus,
  model: params.model,
  requestId: params.requestId,
  status: params.status,
  output: null,
  errorDetail: params.errorDetail,
  correlationId: params.correlationId,
  latencyMs: Date.now() - params.started,
  secretSource: params.source
})

/**
 * Encola un modelo de Higgsfield y espera su estado terminal. No lanza ante HTTP-not-ok: devuelve `ok:false` con
 * `errorDetail` saneado (mismo contrato que `runFalModel`).
 *
 * `onEnqueued` avisa apenas el proveedor acepta el trabajo: un video sigue corriendo (y cobrando) aunque el polling
 * local se rinda, así que el llamador necesita el `requestId` ANTES de esperar para retomarlo con `awaitHiggsfieldRequest`.
 */
export const runHiggsfieldModel = async <TOutput = Record<string, unknown>>(params: {
  model: string
  input: Record<string, unknown>
  pollTimeoutMs?: number
  pollIntervalMs?: number
  onEnqueued?: (handle: HiggsfieldQueueHandle) => void
  /** Encola y vuelve sin esperar (HTTP 202, `output: null`). Se recupera con `awaitHiggsfieldRequest`. */
  detach?: boolean
}): Promise<HiggsfieldModelResult<TOutput>> => {
  const key = await resolveHiggsfieldKey()
  const model = endpointPath(params.model)
  const started = Date.now()

  // Un solo intento: sin clave de idempotencia, repetir un POST ambiguo podría generar (y cobrar) dos veces.
  const submit = await fetch(`${HIGGSFIELD_API_BASE_URL}/${model}`, {
    method: 'POST',
    headers: authHeaders(key.value),
    body: JSON.stringify(params.input)
  })

  const submitBody = await readJson(submit)
  const correlationId = submit.headers.get('x-correlation-id')
  const requestId = typeof submitBody?.request_id === 'string' ? submitBody.request_id : null

  if (!submit.ok || !requestId) {
    return failure<TOutput>({
      model,
      httpStatus: submit.status,
      requestId,
      status: asState(submitBody?.status),
      errorDetail:
        extractErrorDetail(submitBody) ?? (submit.ok ? 'Higgsfield no devolvió request_id al encolar.' : `HTTP ${submit.status}`),
      correlationId,
      started,
      source: key.source
    })
  }

  const fallback = resolveHiggsfieldQueueHandle(requestId)

  // Las URLs del submit mandan: la documentación pide no construirlas a mano mientras existan.
  const handle: HiggsfieldQueueHandle = {
    requestId,
    statusUrl: typeof submitBody?.status_url === 'string' ? submitBody.status_url : fallback.statusUrl,
    cancelUrl: typeof submitBody?.cancel_url === 'string' ? submitBody.cancel_url : fallback.cancelUrl
  }

  params.onEnqueued?.(handle)

  if (params.detach) {
    return {
      ok: true,
      httpStatus: 202,
      model,
      requestId,
      status: asState(submitBody?.status) ?? 'queued',
      output: null,
      errorDetail: null,
      correlationId,
      latencyMs: Date.now() - started,
      secretSource: key.source
    }
  }

  return pollHiggsfieldRequest<TOutput>({
    model,
    handle,
    key,
    started,
    pollTimeoutMs: params.pollTimeoutMs ?? HIGGSFIELD_DEFAULT_POLL_TIMEOUT_MS,
    pollIntervalMs: params.pollIntervalMs ?? HIGGSFIELD_DEFAULT_POLL_INTERVAL_MS
  })
}

export interface HiggsfieldRequestStatus {
  status: HiggsfieldRequestState | null
  httpStatus: number
  errorDetail: string | null
  correlationId: string | null
  /** Cuerpo completo del estado (en `completed` trae los medios). */
  body: Record<string, unknown> | null
}

/** Consulta una vez el estado de un request, sin esperar ni descargar. No cobra. */
export const getHiggsfieldRequestStatus = async (params: { requestId: string }): Promise<HiggsfieldRequestStatus> => {
  const key = await resolveHiggsfieldKey()
  const response = await fetch(resolveHiggsfieldQueueHandle(params.requestId.trim()).statusUrl, { headers: authHeaders(key.value, false) })
  const body = await readJson(response)

  return {
    status: response.ok ? asState(body?.status) : null,
    httpStatus: response.status,
    errorDetail: response.ok ? (typeof body?.error === 'string' ? body.error : null) : extractErrorDetail(body),
    correlationId: response.headers.get('x-correlation-id'),
    body
  }
}

/** Retoma un request ya encolado (por ejemplo, tras un timeout local) sin volver a enviarlo ni pagarlo. */
export const awaitHiggsfieldRequest = async <TOutput = Record<string, unknown>>(params: {
  requestId: string
  /** Endpoint original: sólo para etiquetar el resultado; el proveedor direcciona el request por id. */
  model?: string
  pollTimeoutMs?: number
  pollIntervalMs?: number
}): Promise<HiggsfieldModelResult<TOutput>> => {
  const key = await resolveHiggsfieldKey()

  return pollHiggsfieldRequest<TOutput>({
    model: params.model ? endpointPath(params.model) : 'higgsfield',
    handle: resolveHiggsfieldQueueHandle(params.requestId.trim()),
    key,
    started: Date.now(),
    pollTimeoutMs: params.pollTimeoutMs ?? HIGGSFIELD_DEFAULT_POLL_TIMEOUT_MS,
    pollIntervalMs: params.pollIntervalMs ?? HIGGSFIELD_DEFAULT_POLL_INTERVAL_MS
  })
}

export interface HiggsfieldCancelResult {
  ok: boolean
  httpStatus: number
  errorDetail: string | null
}

/** Cancela un request mientras siga en cola (202). Si ya empezó, el proveedor responde 400 y sigue cobrando. */
export const cancelHiggsfieldRequest = async (params: { requestId: string }): Promise<HiggsfieldCancelResult> => {
  const key = await resolveHiggsfieldKey()

  const response = await fetch(resolveHiggsfieldQueueHandle(params.requestId.trim()).cancelUrl, {
    method: 'POST',
    headers: authHeaders(key.value, false)
  })

  return {
    ok: response.ok,
    httpStatus: response.status,
    errorDetail: response.ok ? null : extractErrorDetail(await readJson(response)) ?? `HTTP ${response.status}`
  }
}

const pollHiggsfieldRequest = async <TOutput>(params: {
  model: string
  handle: HiggsfieldQueueHandle
  key: HiggsfieldKey
  started: number
  pollTimeoutMs: number
  pollIntervalMs: number
}): Promise<HiggsfieldModelResult<TOutput>> => {
  const { model, handle, key, started } = params
  let delay = params.pollIntervalMs
  let status: HiggsfieldRequestState | null = 'queued'
  let correlationId: string | null = null
  let transientFailures = 0

  const fail = (httpStatus: number, errorDetail: string | null) =>
    failure<TOutput>({ model, httpStatus, requestId: handle.requestId, status, errorDetail, correlationId, started, source: key.source })

  while (Date.now() - started < params.pollTimeoutMs) {
    let response: Response | null = null

    try {
      response = await fetch(handle.statusUrl, { headers: authHeaders(key.value, false) })
    } catch {
      response = null
    }

    // Red caída o 5xx: el GET de estado es seguro de reintentar; el trabajo sigue en el proveedor.
    if (!response || response.status >= 500) {
      transientFailures += 1

      if (transientFailures > HIGGSFIELD_STATUS_RETRY_LIMIT) {
        return fail(response?.status ?? 0, 'No se pudo consultar el estado en Higgsfield tras varios reintentos; el trabajo puede seguir corriendo.')
      }

      await sleep(delay)
      delay = Math.min(delay * 1.5, Math.max(params.pollIntervalMs, HIGGSFIELD_MAX_POLL_INTERVAL_MS))
      continue
    }

    transientFailures = 0
    correlationId = response.headers.get('x-correlation-id') ?? correlationId

    const body = await readJson(response)

    if (!response.ok) return fail(response.status, extractErrorDetail(body))

    status = asState(body?.status)

    if (status === 'completed') {
      return {
        ok: true,
        httpStatus: response.status,
        model,
        requestId: handle.requestId,
        status,
        output: body as TOutput,
        errorDetail: null,
        correlationId,
        latencyMs: Date.now() - started,
        secretSource: key.source
      }
    }

    if (status === 'failed') return fail(response.status, typeof body?.error === 'string' ? body.error : 'La generación falló en Higgsfield (no se cobra).')
    if (status === 'nsfw') return fail(response.status, 'Higgsfield rechazó la entrada o la salida por moderación de contenido (no se cobra).')
    if (status === 'canceled') return fail(response.status, 'El request fue cancelado antes de procesarse (se reembolsa).')

    if (status !== 'queued' && status !== 'in_progress') {
      return fail(response.status, `Estado inesperado de Higgsfield: ${String(body?.status ?? 'desconocido')}.`)
    }

    // Jitter acotado al 25 % del intervalo: evita sincronizar polls sin frenar intervalos cortos.
    await sleep(delay + Math.random() * Math.min(500, delay * 0.25))
    delay = Math.min(delay * 1.5, Math.max(params.pollIntervalMs, HIGGSFIELD_MAX_POLL_INTERVAL_MS))
  }

  return fail(408, `Higgsfield no completó el trabajo dentro de ${params.pollTimeoutMs} ms; sigue corriendo y se cobra si termina.`)
}

// ── Subida de archivos ───────────────────────────────────────────────────────────────────────────

export interface HiggsfieldUploadResult {
  url: string
  secretSource: SecretResolutionSource
}

/**
 * Sube bytes al storage del proveedor y devuelve la URL pública que los modelos aceptan como entrada (`image_url`,
 * `video_url`, `audio_urls`…). La URL prefirmada vence en una hora; las credenciales NUNCA viajan al PUT.
 */
export const uploadHiggsfieldFile = async (params: { bytes: Uint8Array; contentType: string }): Promise<HiggsfieldUploadResult> => {
  if (!(HIGGSFIELD_UPLOAD_CONTENT_TYPES as readonly string[]).includes(params.contentType)) {
    throw new Error(
      `Higgsfield no acepta subir ${params.contentType}. Tipos válidos: ${HIGGSFIELD_UPLOAD_CONTENT_TYPES.join(', ')}. ` +
        'Convierte el archivo o pásalo como URL pública.'
    )
  }

  const key = await resolveHiggsfieldKey()

  const initiate = await fetch(`${HIGGSFIELD_API_BASE_URL}/files/generate-upload-url`, {
    method: 'POST',
    headers: authHeaders(key.value),
    body: JSON.stringify({ content_type: params.contentType })
  })

  const body = await readJson(initiate)

  if (!initiate.ok || typeof body?.upload_url !== 'string' || typeof body?.public_url !== 'string') {
    throw new Error(`Higgsfield upload initiate failed (HTTP ${initiate.status})${extractErrorDetail(body) ? `: ${extractErrorDetail(body)}` : ''}`)
  }

  const uploadHeaders =
    body.upload_headers && typeof body.upload_headers === 'object'
      ? Object.fromEntries(Object.entries(body.upload_headers as Record<string, unknown>).map(([name, value]) => [name, String(value)]))
      : { 'Content-Type': params.contentType }

  const put = await fetch(body.upload_url, {
    method: 'PUT',
    headers: uploadHeaders,
    // Buffer de Node satisface BodyInit por su vista subyacente; se copia para no exponer el pool.
    body: new Uint8Array(params.bytes) as unknown as BodyInit
  })

  if (!put.ok) throw new Error(`Higgsfield upload PUT failed (HTTP ${put.status})`)

  return { url: body.public_url, secretSource: key.source }
}
