import 'server-only'

import { resolveSecret, type SecretResolutionSource } from '@/lib/secrets/secret-manager'

// Canonical fal.ai client. Sibling of openai.ts / anthropic.ts / google-genai.ts /
// perplexity.ts. NEVER instantiate a parallel fal.ai fetch inside a domain module —
// extend this client. Secret resolves server-side via FAL_API_KEY / FAL_API_KEY_SECRET_REF.
// No official SDK dependency → fetch wrapper against the queue API (canonical pattern).
//
// fal.ai keys are shaped `<key_id>:<key_secret>` and travel in `Authorization: Key <value>`.
// A single fal account fronts many model families (image: flux, video, audio, LoRA), so this
// client is model-agnostic: callers pass the model slug (e.g. 'fal-ai/flux/schnell') + its input.
// Higher-level orchestrators (image-generator.ts, a future media module) compose on top of it.

const FAL_QUEUE_BASE_URL = 'https://queue.fal.run'

/** Default polling budget while the queued job runs. Off-Vercel batch jobs can raise it. */
const FAL_DEFAULT_POLL_TIMEOUT_MS = 120_000
const FAL_DEFAULT_POLL_INTERVAL_MS = 1_500

export interface FalModelResult<TOutput = unknown> {
  ok: boolean
  httpStatus: number
  model: string
  requestId: string | null
  /** Model output payload (shape depends on the model). Null when the call failed. */
  output: TOutput | null
  /** Sanitized error detail surfaced by fal (e.g. exhausted balance, validation). */
  errorDetail: string | null
  latencyMs: number
  secretSource: SecretResolutionSource
}

export const isFalConfigured = async (): Promise<boolean> => {
  try {
    const resolution = await resolveSecret({ envVarName: 'FAL_API_KEY' })

    return Boolean(resolution.value)
  } catch {
    return false
  }
}

const resolveFalApiKey = async () => {
  const resolution = await resolveSecret({ envVarName: 'FAL_API_KEY' })

  if (!resolution.value) {
    throw new Error('fal.ai no está configurado. Define FAL_API_KEY o FAL_API_KEY_SECRET_REF.')
  }

  return { ...resolution, value: resolution.value }
}

const authHeaders = (apiKey: string) => ({
  Authorization: `Key ${apiKey}`,
  'Content-Type': 'application/json'
})

/** Best-effort extraction of fal's `{ detail }` error prose without leaking raw bodies. */
const extractErrorDetail = (body: unknown): string | null => {
  if (body && typeof body === 'object') {
    const detail = (body as Record<string, unknown>).detail

    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map(item => JSON.stringify(item)).join('; ')
  }

  return null
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export interface FalQueueHandle {
  requestId: string
  statusUrl: string
  resultUrl: string
}

/**
 * Reconstruye las URLs de cola de un request ya encolado, para retomarlo sin volver a pagar.
 *
 * fal direcciona la cola por la APP (`owner/app`, los dos primeros segmentos del slug), no por el slug
 * completo: `minimax/h3/text-to-video` encola bajo `minimax/h3/requests/<id>`. Construir desde el slug
 * entero da 405. Cuando existe, `status_url`/`response_url` del submit mandan; esto es sólo para retomar.
 */
export const resolveFalQueueHandle = (model: string, requestId: string): FalQueueHandle => {
  const app = model.trim().split('/').slice(0, 2).join('/')

  return {
    requestId,
    statusUrl: `${FAL_QUEUE_BASE_URL}/${app}/requests/${requestId}/status`,
    resultUrl: `${FAL_QUEUE_BASE_URL}/${app}/requests/${requestId}`
  }
}

/**
 * Submit a fal.ai model to the queue and poll to completion. Model-agnostic: `model` is the
 * fal slug (e.g. 'fal-ai/flux/schnell'), `input` is that model's input schema. Does NOT throw
 * on HTTP-not-ok — returns `ok:false` with sanitized `errorDetail` (mirrors runPerplexitySearch).
 *
 * `onEnqueued` avisa apenas fal acepta el trabajo: un video o un entrenamiento siguen corriendo (y
 * cobrando) aunque el polling local se rinda, así que el llamador necesita el `requestId` ANTES de
 * esperar para poder retomarlo con `awaitFalRequest`.
 */
export const runFalModel = async <TOutput = unknown>(params: {
  model: string
  input: Record<string, unknown>
  pollTimeoutMs?: number
  pollIntervalMs?: number
  onEnqueued?: (handle: FalQueueHandle) => void
}): Promise<FalModelResult<TOutput>> => {
  const apiKey = await resolveFalApiKey()
  const model = params.model.trim()
  const started = Date.now()

  // 1. Enqueue the job.
  const submitResponse = await fetch(`${FAL_QUEUE_BASE_URL}/${model}`, {
    method: 'POST',
    headers: authHeaders(apiKey.value),
    body: JSON.stringify(params.input)
  })

  const submitBody = (await submitResponse.json().catch(() => null)) as Record<string, unknown> | null

  if (!submitResponse.ok) {
    return failure<TOutput>(model, submitResponse.status, null, extractErrorDetail(submitBody), started, apiKey.source)
  }

  const requestId = typeof submitBody?.request_id === 'string' ? submitBody.request_id : null

  if (!requestId) {
    return failure<TOutput>(
      model,
      submitResponse.status,
      null,
      'fal.ai no devolvió request_id al encolar el trabajo.',
      started,
      apiKey.source
    )
  }

  // fal returns the canonical polling URLs in the submit response. For models with a sub-path
  // (e.g. `fal-ai/flux/schnell`) these resolve to the PARENT app (`fal-ai/flux/requests/...`),
  // so reconstructing from the full slug yields a 405. Always prefer fal's URLs.
  const fallback = resolveFalQueueHandle(model, requestId)

  const handle: FalQueueHandle = {
    requestId,
    statusUrl: typeof submitBody?.status_url === 'string' ? submitBody.status_url : fallback.statusUrl,
    resultUrl: typeof submitBody?.response_url === 'string' ? submitBody.response_url : fallback.resultUrl
  }

  params.onEnqueued?.(handle)

  return pollFalRequest<TOutput>({
    model,
    handle,
    apiKey,
    started,
    pollTimeoutMs: params.pollTimeoutMs ?? FAL_DEFAULT_POLL_TIMEOUT_MS,
    pollIntervalMs: params.pollIntervalMs ?? FAL_DEFAULT_POLL_INTERVAL_MS
  })
}

/**
 * Retoma un request ya encolado (por ejemplo, tras un timeout local) sin volver a enviarlo ni pagarlo.
 */
export const awaitFalRequest = async <TOutput = unknown>(params: {
  model: string
  requestId: string
  pollTimeoutMs?: number
  pollIntervalMs?: number
}): Promise<FalModelResult<TOutput>> => {
  const apiKey = await resolveFalApiKey()
  const model = params.model.trim()

  return pollFalRequest<TOutput>({
    model,
    handle: resolveFalQueueHandle(model, params.requestId.trim()),
    apiKey,
    started: Date.now(),
    pollTimeoutMs: params.pollTimeoutMs ?? FAL_DEFAULT_POLL_TIMEOUT_MS,
    pollIntervalMs: params.pollIntervalMs ?? FAL_DEFAULT_POLL_INTERVAL_MS
  })
}

const failure = <TOutput>(
  model: string,
  httpStatus: number,
  requestId: string | null,
  errorDetail: string | null,
  started: number,
  secretSource: SecretResolutionSource
): FalModelResult<TOutput> => ({
  ok: false,
  httpStatus,
  model,
  requestId,
  output: null,
  errorDetail,
  latencyMs: Date.now() - started,
  secretSource
})

const pollFalRequest = async <TOutput>(params: {
  model: string
  handle: FalQueueHandle
  apiKey: { value: string; source: SecretResolutionSource }
  started: number
  pollTimeoutMs: number
  pollIntervalMs: number
}): Promise<FalModelResult<TOutput>> => {
  const { model, handle, apiKey, started } = params

  const fail = (httpStatus: number, errorDetail: string | null) =>
    failure<TOutput>(model, httpStatus, handle.requestId, errorDetail, started, apiKey.source)

  // 2. Poll status until COMPLETED / failure / timeout.
  let completed = false

  while (Date.now() - started < params.pollTimeoutMs) {
    const statusResponse = await fetch(handle.statusUrl, { headers: authHeaders(apiKey.value) })
    const statusBody = (await statusResponse.json().catch(() => null)) as Record<string, unknown> | null

    if (!statusResponse.ok) {
      return fail(statusResponse.status, extractErrorDetail(statusBody))
    }

    const status = typeof statusBody?.status === 'string' ? statusBody.status : ''

    if (status === 'COMPLETED') {
      completed = true
      break
    }

    if (status !== 'IN_QUEUE' && status !== 'IN_PROGRESS') {
      return fail(statusResponse.status, `Estado inesperado de fal.ai: ${status || 'desconocido'}.`)
    }

    await sleep(params.pollIntervalMs)
  }

  if (!completed) {
    return fail(408, `fal.ai no completó el trabajo dentro de ${params.pollTimeoutMs} ms.`)
  }

  // 3. Fetch the final result.
  const resultResponse = await fetch(handle.resultUrl, { headers: authHeaders(apiKey.value) })
  const resultBody = (await resultResponse.json().catch(() => null)) as TOutput | null

  if (!resultResponse.ok) {
    return fail(resultResponse.status, extractErrorDetail(resultBody))
  }

  return {
    ok: true,
    httpStatus: resultResponse.status,
    model,
    requestId: handle.requestId,
    output: resultBody,
    errorDetail: null,
    latencyMs: Date.now() - started,
    secretSource: apiKey.source
  }
}

const FAL_UPLOAD_INITIATE_URL = 'https://rest.alpha.fal.ai/storage/upload/initiate'

export interface FalUploadResult {
  url: string
  secretSource: SecretResolutionSource
}

/**
 * Sube bytes al storage de fal y devuelve la URL pública que los modelos aceptan como entrada.
 *
 * Hace falta porque los endpoints de edición y de layerize piden `image_url`/`image_urls`, no bytes: un
 * archivo local no se puede mandar directo. Los data URI grandes resultaron poco confiables en el puente
 * real, así que el camino canónico es este upload de ciclo corto.
 *
 * Contrato verificado el 2026-09-16: `POST /storage/upload/initiate` con `{content_type, file_name}`
 * devuelve `{file_url, upload_url}`; los bytes van por `PUT` a `upload_url` y el modelo consume `file_url`.
 */
export const uploadFalFile = async (params: {
  bytes: Uint8Array
  fileName: string
  contentType: string
}): Promise<FalUploadResult> => {
  const apiKey = await resolveFalApiKey()

  const initiateResponse = await fetch(FAL_UPLOAD_INITIATE_URL, {
    method: 'POST',
    headers: authHeaders(apiKey.value),
    body: JSON.stringify({ content_type: params.contentType, file_name: params.fileName })
  })

  const initiateBody = (await initiateResponse.json().catch(() => null)) as Record<string, unknown> | null

  if (!initiateResponse.ok || typeof initiateBody?.upload_url !== 'string' || typeof initiateBody?.file_url !== 'string') {
    throw new Error(
      `fal upload initiate failed (HTTP ${initiateResponse.status})${
        extractErrorDetail(initiateBody) ? `: ${extractErrorDetail(initiateBody)}` : ''
      }`
    )
  }

  const putResponse = await fetch(initiateBody.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': params.contentType },
    // Buffer de Node satisface BodyInit por su vista subyacente; se copia para no exponer el pool.
    body: new Uint8Array(params.bytes) as unknown as BodyInit
  })

  if (!putResponse.ok) {
    throw new Error(`fal upload PUT failed (HTTP ${putResponse.status}) for ${params.fileName}`)
  }

  return { url: initiateBody.file_url, secretSource: apiKey.source }
}
