import 'server-only'

import { resolveSecret, type SecretResolutionSource } from '@/lib/secrets/secret-manager'

// Canonical fal.ai client. Sibling of openai.ts / anthropic.ts / google-genai.ts /
// perplexity.ts. NEVER instantiate a parallel fal.ai fetch inside a domain module —
// extend this client. Secrets resolve server-side via FAL_API_KEY / FAL_API_KEY_SECRET_REF and, for the second
// account, FAL_API_KEY_B / FAL_API_KEY_B_SECRET_REF (see "Cuentas" below).
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
  /** Cuenta que ejecutó (o intentó ejecutar) el trabajo. Nombre de la variable, nunca la clave. */
  account: FalAccountName | null
}

// ── Cuentas ──────────────────────────────────────────────────────────────────────────────────────
//
// Greenhouse opera con más de una cuenta de fal. Incidente 2026-09-16: se recargaron USD 50 en una cuenta distinta
// de la dueña de FAL_API_KEY, que quedó en −3,86 y bloqueada ("User is locked"). En vez de depender de recargar la
// cuenta correcta, el cliente conoce todas las claves configuradas, las ordena por saldo y, si fal bloquea una
// por saldo, pasa a la siguiente. Nunca expone ni loguea claves: sólo el nombre de la variable.

/** Variables de clave en orden declarado. Sumar una cuenta = sumar su nombre acá y su `*_SECRET_REF`. */
export const FAL_ACCOUNT_ENV_VARS = ['FAL_API_KEY', 'FAL_API_KEY_B'] as const

export type FalAccountName = (typeof FAL_ACCOUNT_ENV_VARS)[number]

interface FalAccount {
  name: FalAccountName
  value: string
  source: SecretResolutionSource
}

const FAL_BALANCE_URL = 'https://rest.alpha.fal.ai/billing/user_balance'

const resolveFalAccounts = async (): Promise<FalAccount[]> => {
  const accounts: FalAccount[] = []

  for (const name of FAL_ACCOUNT_ENV_VARS) {
    try {
      const resolution = await resolveSecret({ envVarName: name })

      if (resolution.value) accounts.push({ name, value: resolution.value.trim(), source: resolution.source })
    } catch {
      // Una cuenta mal configurada no tumba a las demás; si no queda ninguna, falla abajo.
    }
  }

  if (!accounts.length) {
    throw new Error('fal.ai no está configurado. Define FAL_API_KEY o FAL_API_KEY_SECRET_REF (y opcional FAL_API_KEY_B).')
  }

  return accounts
}

export const isFalConfigured = async (): Promise<boolean> => {
  try {
    return (await resolveFalAccounts()).length > 0
  } catch {
    return false
  }
}

/** Un 403 de fal por falta de saldo ("User is locked. Reason: Exhausted balance" o "TOP_UP"). */
export const isFalBalanceLock = (httpStatus: number, detail: string | null | undefined): boolean =>
  httpStatus === 403 && /locked|exhausted balance|top.?up/i.test(detail ?? '')

const fetchAccountBalance = async (account: FalAccount): Promise<number | null> => {
  try {
    const response = await fetch(FAL_BALANCE_URL, { headers: authHeaders(account.value) })
    const balance = Number((await response.text()).trim())

    return response.ok && Number.isFinite(balance) ? balance : null
  } catch {
    return null
  }
}

let rankedAccounts: Promise<FalAccount[]> | null = null

/**
 * Cuentas ordenadas para este proceso: primero las que tienen saldo positivo (de mayor a menor), después las
 * demás en el orden declarado. Si el saldo no se puede leer, esa cuenta conserva su lugar declarado. Se calcula una
 * vez por proceso: el CLI es de corta vida y el bloqueo real se maneja en caliente con `isFalBalanceLock`.
 */
const rankFalAccounts = (): Promise<FalAccount[]> => {
  rankedAccounts ??= (async () => {
    const accounts = await resolveFalAccounts()

    if (accounts.length === 1) return accounts

    const balances = await Promise.all(accounts.map(fetchAccountBalance))
    const indexed = accounts.map((account, index) => ({ account, index, balance: balances[index] }))

    const funded = indexed
      .filter(item => item.balance !== null && item.balance > 0)
      .sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))

    const rest = indexed.filter(item => !funded.includes(item)).sort((a, b) => a.index - b.index)

    return [...funded, ...rest].map(item => item.account)
  })()

  return rankedAccounts
}

/** Sólo tests: el orden de cuentas se memoiza por proceso. */
export const resetFalAccountsForTests = () => {
  rankedAccounts = null
}

/**
 * Precio unitario de un endpoint según `GET https://api.fal.ai/v1/models/pricing` (clave normal, sin costo). Ojo: es
 * el escalón más bajo; las reglas de `FAL_PRICING_RULES` corrigen por resolución. `null` si fal no responde.
 */
export const getFalEndpointPricing = async (slug: string): Promise<{ unitPrice: number; unit: string } | null> => {
  try {
    const [account] = await rankFalAccounts()

    const response = await fetch(`https://api.fal.ai/v1/models/pricing?endpoint_id=${encodeURIComponent(slug)}`, {
      headers: authHeaders(account.value)
    })

    if (!response.ok) return null

    const body = (await response.json().catch(() => null)) as { prices?: { unit_price?: number; unit?: string }[] } | null
    const price = body?.prices?.[0]

    return typeof price?.unit_price === 'number' ? { unitPrice: price.unit_price, unit: price.unit ?? '' } : null
  } catch {
    return null
  }
}

export interface FalAccountBalance {
  account: FalAccountName
  balance: number | null
}

/** Saldo USD de cada cuenta configurada, en orden declarado. Funciona con claves normales (no ADMIN). */
export const getFalAccountBalances = async (): Promise<FalAccountBalance[]> => {
  const accounts = await resolveFalAccounts()
  const balances = await Promise.all(accounts.map(fetchAccountBalance))

  return accounts.map((account, index) => ({ account: account.name, balance: balances[index] }))
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
  onEnqueued?: (handle: FalQueueHandle & { account: FalAccountName }) => void
  /** Fuerza una cuenta (sin failover). Omitido = la de más saldo, con failover ante bloqueo por saldo. */
  account?: FalAccountName
  /**
   * Encola y vuelve sin esperar (HTTP 202, `output: null`). El trabajo sigue en fal; se recupera con
   * `awaitFalRequest` o se consulta con `getFalRequestStatus`. Alternativa local al webhook de fal, que exigiría
   * una URL pública.
   */
  detach?: boolean
}): Promise<FalModelResult<TOutput>> => {
  const ranked = await rankFalAccounts()
  const candidates = params.account ? ranked.filter(item => item.name === params.account) : ranked
  const model = params.model.trim()
  const started = Date.now()

  if (!candidates.length) {
    throw new Error(`La cuenta de fal ${params.account} no está configurada.`)
  }

  let apiKey = candidates[0]
  let submitResponse: Response | null = null
  let submitBody: Record<string, unknown> | null = null

  // 1. Enqueue the job. Un bloqueo por saldo ocurre ANTES de encolar (no cobra): se prueba la siguiente cuenta.
  for (const account of candidates) {
    apiKey = account

    submitResponse = await fetch(`${FAL_QUEUE_BASE_URL}/${model}`, {
      method: 'POST',
      headers: authHeaders(account.value),
      body: JSON.stringify(params.input)
    })

    submitBody = (await submitResponse.json().catch(() => null)) as Record<string, unknown> | null

    if (!isFalBalanceLock(submitResponse.status, extractErrorDetail(submitBody))) break
  }

  if (!submitResponse || !submitResponse.ok) {
    return failure<TOutput>(
      model,
      submitResponse?.status ?? 0,
      null,
      extractErrorDetail(submitBody),
      started,
      apiKey.source,
      apiKey.name
    )
  }

  const requestId = typeof submitBody?.request_id === 'string' ? submitBody.request_id : null

  if (!requestId) {
    return failure<TOutput>(
      model,
      submitResponse.status,
      null,
      'fal.ai no devolvió request_id al encolar el trabajo.',
      started,
      apiKey.source,
      apiKey.name
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

  params.onEnqueued?.({ ...handle, account: apiKey.name })

  if (params.detach) {
    return {
      ok: true,
      httpStatus: 202,
      model,
      requestId,
      output: null,
      errorDetail: null,
      latencyMs: Date.now() - started,
      secretSource: apiKey.source,
      account: apiKey.name
    }
  }

  return pollFalRequest<TOutput>({
    model,
    handle,
    apiKey,
    started,
    pollTimeoutMs: params.pollTimeoutMs ?? FAL_DEFAULT_POLL_TIMEOUT_MS,
    pollIntervalMs: params.pollIntervalMs ?? FAL_DEFAULT_POLL_INTERVAL_MS
  })
}

/** Un request sólo existe en la cuenta que lo creó: se prueba cada candidata hasta que su estado responda. */
const findRequestAccount = async (handle: FalQueueHandle, candidates: FalAccount[], forced: boolean): Promise<FalAccount> => {
  if (forced || candidates.length === 1) return candidates[0]

  for (const account of candidates) {
    const probe = await fetch(handle.statusUrl, { headers: authHeaders(account.value) })

    if (probe.ok) return account
  }

  return candidates[0]
}

export interface FalRequestStatus {
  /** IN_QUEUE · IN_PROGRESS · COMPLETED, o null si fal no lo encontró. */
  status: string | null
  queuePosition: number | null
  httpStatus: number
  account: FalAccountName
  errorDetail: string | null
}

/** Consulta una vez el estado de un request encolado, sin esperar ni descargar. No cobra. */
export const getFalRequestStatus = async (params: {
  model: string
  requestId: string
  account?: FalAccountName
}): Promise<FalRequestStatus> => {
  const ranked = await rankFalAccounts()
  const candidates = params.account ? ranked.filter(item => item.name === params.account) : ranked

  if (!candidates.length) throw new Error(`La cuenta de fal ${params.account} no está configurada.`)

  const handle = resolveFalQueueHandle(params.model.trim(), params.requestId.trim())
  const account = await findRequestAccount(handle, candidates, Boolean(params.account))
  const response = await fetch(handle.statusUrl, { headers: authHeaders(account.value) })
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null

  return {
    status: response.ok && typeof body?.status === 'string' ? body.status : null,
    queuePosition: typeof body?.queue_position === 'number' ? body.queue_position : null,
    httpStatus: response.status,
    account: account.name,
    errorDetail: response.ok ? null : extractErrorDetail(body)
  }
}

/**
 * Retoma un request ya encolado (por ejemplo, tras un timeout local) sin volver a enviarlo ni pagarlo.
 */
export const awaitFalRequest = async <TOutput = unknown>(params: {
  model: string
  requestId: string
  pollTimeoutMs?: number
  pollIntervalMs?: number
  /** Cuenta donde se encoló. Omitido = se busca: el request sólo existe en la cuenta que lo creó. */
  account?: FalAccountName
}): Promise<FalModelResult<TOutput>> => {
  const ranked = await rankFalAccounts()
  const model = params.model.trim()
  const handle = resolveFalQueueHandle(model, params.requestId.trim())
  const candidates = params.account ? ranked.filter(item => item.name === params.account) : ranked

  if (!candidates.length) {
    throw new Error(`La cuenta de fal ${params.account} no está configurada.`)
  }

  const apiKey = await findRequestAccount(handle, candidates, Boolean(params.account))

  return pollFalRequest<TOutput>({
    model,
    handle,
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
  secretSource: SecretResolutionSource,
  account: FalAccountName | null
): FalModelResult<TOutput> => ({
  ok: false,
  httpStatus,
  model,
  requestId,
  output: null,
  errorDetail,
  latencyMs: Date.now() - started,
  secretSource,
  account
})

const pollFalRequest = async <TOutput>(params: {
  model: string
  handle: FalQueueHandle
  apiKey: FalAccount
  started: number
  pollTimeoutMs: number
  pollIntervalMs: number
}): Promise<FalModelResult<TOutput>> => {
  const { model, handle, apiKey, started } = params

  const fail = (httpStatus: number, errorDetail: string | null) =>
    failure<TOutput>(model, httpStatus, handle.requestId, errorDetail, started, apiKey.source, apiKey.name)

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
    secretSource: apiKey.source,
    account: apiKey.name
  }
}

const FAL_UPLOAD_INITIATE_URL = 'https://rest.alpha.fal.ai/storage/upload/initiate'

export interface FalUploadResult {
  url: string
  secretSource: SecretResolutionSource
  account: FalAccountName
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
  const ranked = await rankFalAccounts()
  let apiKey = ranked[0]
  let initiateResponse: Response | null = null
  let initiateBody: Record<string, unknown> | null = null

  // El storage también se bloquea por saldo (visto 2026-09-16 incluso con la cola ya habilitada): misma rotación.
  for (const account of ranked) {
    apiKey = account

    initiateResponse = await fetch(FAL_UPLOAD_INITIATE_URL, {
      method: 'POST',
      headers: authHeaders(account.value),
      body: JSON.stringify({ content_type: params.contentType, file_name: params.fileName })
    })

    initiateBody = (await initiateResponse.json().catch(() => null)) as Record<string, unknown> | null

    if (!isFalBalanceLock(initiateResponse.status, extractErrorDetail(initiateBody))) break
  }

  if (!initiateResponse || !initiateResponse.ok || typeof initiateBody?.upload_url !== 'string' || typeof initiateBody?.file_url !== 'string') {
    throw new Error(
      `fal upload initiate failed (HTTP ${initiateResponse?.status ?? 0}, cuenta ${apiKey.name})${
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

  return { url: initiateBody.file_url, secretSource: apiKey.source, account: apiKey.name }
}
