import 'server-only'

import { randomUUID } from 'node:crypto'

import { BYTEPLUS_TASK_ID_PATTERN } from '@/lib/ai/byteplus-catalog'
import { resolveSecret } from '@/lib/secrets/secret-manager'

export const BYTEPLUS_ARK_BASE = 'https://ark.ap-southeast.bytepluses.com/api/v3'
export const BYTEPLUS_SPEECH_BASE = 'https://voice.ap-southeast-1.bytepluses.com'
export type BytePlusLane = 'ark' | 'speech'
export interface BytePlusImageOutput {
  url?: string; b64_json?: string; size?: string; z_index?: number; name?: string; description?: string
  bounding_box?: { absolute?: number[]; normalized?: number[] }
  error?: { code?: string }
}
export interface BytePlusImageResponse {
  data: BytePlusImageOutput[]
  model?: string
  usage?: Record<string, number>
}
/** Causas reconocidas en mensajes del proveedor; el mensaje crudo nunca se expone (puede traer referencias o URLs). */
export type BytePlusErrorCause = 'asset_service_not_activated'

export class BytePlusError extends Error {
  constructor(readonly status: number, readonly code: string, readonly requestId: string | null,
    readonly param: string | null = null, readonly cause_: BytePlusErrorCause | null = null) {
    super(`BytePlus HTTP ${status} (${code}${param ? ` en ${param}` : ''}); requestId=${requestId ?? 'sin dato'}`)
  }
}

export const classifyBytePlusErrorMessage = (message: unknown): BytePlusErrorCause | null =>
  typeof message === 'string' && /not activated the Asset Service/i.test(message) ? 'asset_service_not_activated' : null

export const bytePlusHeaders = async (lane: BytePlusLane, resource?: string, requestId: string = randomUUID()): Promise<Record<string, string>> => {
  const envVarName = lane === 'ark' ? 'BYTEPLUS_API_KEY' : 'BYTEPLUS_SPEECH_API_KEY'
  const ref = lane === 'ark' ? 'greenhouse-byteplus-api-key' : 'greenhouse-byteplus-speech-api-key'

  const secret = await resolveSecret({ envVarName, env: {
    ...process.env,
    [`${envVarName}_SECRET_REF`]: process.env[`${envVarName}_SECRET_REF`] ?? `projects/efeonce-group/secrets/${ref}/versions/latest`
  } })

  if (!secret.value) throw new Error(`${envVarName} no configurada o inaccesible en Secret Manager.`)

  return lane === 'ark'
    ? { Authorization: `Bearer ${secret.value}`, 'Content-Type': 'application/json' }
    : { 'X-Api-Key': secret.value, 'X-Api-Request-Id': requestId, 'Content-Type': 'application/json', ...(resource ? { 'X-Api-Resource-Id': resource } : {}) }
}

/** Nunca reintenta POSTs ni expone mensajes/bodies upstream, que pueden contener credenciales o referencias. */
export const bytePlusRequest = async <T>(lane: BytePlusLane, path: string, options: {
  method?: 'GET' | 'POST'; body?: unknown; resource?: string; requestId?: string; timeoutMs?: number
} = {}): Promise<{ data: T; requestId: string | null; statusCode: string | null }> => {
  if (!path.startsWith('/') || path.includes('://') || path.includes('?')) throw new Error('Ruta BytePlus inválida.')

  const response = await fetch(`${lane === 'ark' ? BYTEPLUS_ARK_BASE : BYTEPLUS_SPEECH_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: await bytePlusHeaders(lane, options.resource, options.requestId),
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    signal: AbortSignal.timeout(options.timeoutMs ?? 180_000),
    redirect: 'error'
  })

  const requestId = response.headers.get('x-request-id') ?? response.headers.get('x-tt-logid')
  const statusCode = response.headers.get('x-api-status-code')
  let data: T & { error?: { code?: string; param?: string; message?: string } }

  try { data = await response.json() as T & { error?: { code?: string; param?: string; message?: string } } }
  catch { throw new BytePlusError(response.status, 'invalid_json_response', requestId) }

  if (!response.ok || (data.error && !(data as { status?: string }).status)) {
    const safeCode = String(data.error?.code ?? 'provider_error').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0,100)

    const safeParam = typeof data.error?.param === 'string' ? data.error.param.replace(/[^a-zA-Z0-9_.[\]-]/g, '').slice(0,100) || null : null

    throw new BytePlusError(response.status, safeCode, requestId, safeParam, classifyBytePlusErrorMessage(data.error?.message))
  }

  return { data, requestId, statusCode }
}

export const generateBytePlusImages = (input: Record<string, unknown>) =>
  // Standard Pro + múltiples referencias puede tardar más de tres minutos. Sin reintento automático.
  bytePlusRequest<BytePlusImageResponse>('ark', '/images/generations', { method: 'POST', body: input, timeoutMs: 600_000 })
export interface BytePlusVideoTask {
  id: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'expired'
  model?: string
  content?: { video_url?: string; last_frame_url?: string }
  usage?: Record<string, number>
  error?: { code?: string }
  /** Segundos Unix. Ancla la vigencia de un borrador. */
  created_at?: number
  draft?: boolean
  duration?: number
  ratio?: string
  resolution?: string
}
export const createBytePlusVideo = (input: Record<string, unknown>) =>
  bytePlusRequest<{ id: string }>('ark', '/contents/generations/tasks', { method: 'POST', body: input })

export const getBytePlusVideo = (id: string) => {
  if (!BYTEPLUS_TASK_ID_PATTERN.test(id)) throw new Error('Task ID inválido.')

  return bytePlusRequest<BytePlusVideoTask>('ark', `/contents/generations/tasks/${id}`)
}

/** Sólo readback de autenticación; no genera, no cobra, no inspecciona prompts de tareas. */
export const bytePlusDoctor = async () => {
  const ark = await bytePlusRequest<{ items?: unknown[] }>('ark', '/contents/generations/tasks')

  // Consulta de una tarea ASR inexistente: readback sin enviar audio, sin crear tarea ni cobrar.
  const speechResponse = await fetch(`${BYTEPLUS_SPEECH_BASE}/api/v3/auc/bigmodel/query`, {
    method: 'POST', headers: { ...await bytePlusHeaders('speech', 'volc.seedasr.auc'), 'X-Api-Sequence': '-1' },
    body: '{}', redirect: 'error', signal: AbortSignal.timeout(30_000)
  })

  const providerStatus = speechResponse.headers.get('x-api-status-code')

  if (speechResponse.status === 401 || speechResponse.status === 403) throw new BytePlusError(speechResponse.status, 'speech_authentication_failed', speechResponse.headers.get('x-tt-logid'))
  await speechResponse.body?.cancel()

  return { ark: { authenticated: true, requestId: ark.requestId }, speech: { credentialResolved: true, queryHttpStatus: speechResponse.status, providerStatus, requestId:speechResponse.headers.get('x-tt-logid') } }
}

export const readBytePlusOutput = async (item: BytePlusImageOutput): Promise<Buffer> => {
  if (item.b64_json) return Buffer.from(item.b64_json, 'base64')
  if (!item.url) throw new Error('BytePlus no devolvió bytes ni URL de salida.')
  const url = new URL(item.url)

  if (url.protocol !== 'https:') throw new Error('URL de salida BytePlus inválida.')
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) })

  if (!response.ok) throw new Error(`Descarga BytePlus HTTP ${response.status}.`)

  return Buffer.from(await response.arrayBuffer())
}
