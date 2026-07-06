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

/**
 * Submit a fal.ai model to the queue and poll to completion. Model-agnostic: `model` is the
 * fal slug (e.g. 'fal-ai/flux/schnell'), `input` is that model's input schema. Does NOT throw
 * on HTTP-not-ok — returns `ok:false` with sanitized `errorDetail` (mirrors runPerplexitySearch).
 */
export const runFalModel = async <TOutput = unknown>(params: {
  model: string
  input: Record<string, unknown>
  pollTimeoutMs?: number
  pollIntervalMs?: number
}): Promise<FalModelResult<TOutput>> => {
  const apiKey = await resolveFalApiKey()
  const model = params.model.trim()
  const pollTimeoutMs = params.pollTimeoutMs ?? FAL_DEFAULT_POLL_TIMEOUT_MS
  const pollIntervalMs = params.pollIntervalMs ?? FAL_DEFAULT_POLL_INTERVAL_MS
  const started = Date.now()

  const fail = (httpStatus: number, requestId: string | null, errorDetail: string | null): FalModelResult<TOutput> => ({
    ok: false,
    httpStatus,
    model,
    requestId,
    output: null,
    errorDetail,
    latencyMs: Date.now() - started,
    secretSource: apiKey.source
  })

  // 1. Enqueue the job.
  const submitResponse = await fetch(`${FAL_QUEUE_BASE_URL}/${model}`, {
    method: 'POST',
    headers: authHeaders(apiKey.value),
    body: JSON.stringify(params.input)
  })

  const submitBody = (await submitResponse.json().catch(() => null)) as Record<string, unknown> | null

  if (!submitResponse.ok) {
    return fail(submitResponse.status, null, extractErrorDetail(submitBody))
  }

  const requestId = typeof submitBody?.request_id === 'string' ? submitBody.request_id : null

  if (!requestId) {
    return fail(submitResponse.status, null, 'fal.ai no devolvió request_id al encolar el trabajo.')
  }

  // fal returns the canonical polling URLs in the submit response. For models with a sub-path
  // (e.g. `fal-ai/flux/schnell`) these resolve to the PARENT app (`fal-ai/flux/requests/...`),
  // so reconstructing from `model` yields a 405. Always prefer fal's URLs; reconstruct only as
  // a last-resort fallback for the flat-slug case.
  const statusUrl =
    typeof submitBody?.status_url === 'string'
      ? submitBody.status_url
      : `${FAL_QUEUE_BASE_URL}/${model}/requests/${requestId}/status`

  const resultUrl =
    typeof submitBody?.response_url === 'string'
      ? submitBody.response_url
      : `${FAL_QUEUE_BASE_URL}/${model}/requests/${requestId}`

  // 2. Poll status until COMPLETED / failure / timeout.
  while (Date.now() - started < pollTimeoutMs) {
    await sleep(pollIntervalMs)

    const statusResponse = await fetch(statusUrl, { headers: authHeaders(apiKey.value) })
    const statusBody = (await statusResponse.json().catch(() => null)) as Record<string, unknown> | null

    if (!statusResponse.ok) {
      return fail(statusResponse.status, requestId, extractErrorDetail(statusBody))
    }

    const status = typeof statusBody?.status === 'string' ? statusBody.status : ''

    if (status === 'COMPLETED') break

    if (status !== 'IN_QUEUE' && status !== 'IN_PROGRESS') {
      return fail(statusResponse.status, requestId, `Estado inesperado de fal.ai: ${status || 'desconocido'}.`)
    }
  }

  if (Date.now() - started >= pollTimeoutMs) {
    return fail(408, requestId, `fal.ai no completó el trabajo dentro de ${pollTimeoutMs} ms.`)
  }

  // 3. Fetch the final result.
  const resultResponse = await fetch(resultUrl, { headers: authHeaders(apiKey.value) })
  const resultBody = (await resultResponse.json().catch(() => null)) as TOutput | null

  if (!resultResponse.ok) {
    return fail(resultResponse.status, requestId, extractErrorDetail(resultBody))
  }

  return {
    ok: true,
    httpStatus: resultResponse.status,
    model,
    requestId,
    output: resultBody,
    errorDetail: null,
    latencyMs: Date.now() - started,
    secretSource: apiKey.source
  }
}
