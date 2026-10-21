import 'server-only'

import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

import {
  assertInlineBudget,
  buildMediaPart,
  GEMINI_MEDIA_DEFAULT_MODEL,
  isGcsUri,
  type ListenArgs,
  type MediaSource,
  mimeForPath,
  shortHash,
  type ThinkingLevelName
} from '@/lib/ai/gemini-media-analysis-cli'
import { getGoogleGenAIClient } from '@/lib/ai/google-genai'

/**
 * Revisión de medios contra Vertex `v1beta1` del cliente canónico: el modo agéntico (`mediaProcessing: AGENTIC`) da
 * «Unknown name» en `v1` y responde en `v1beta1` (verificado 2026-10-21).
 */
const getMediaAnalysisClient = () => getGoogleGenAIClient({ apiVersion: 'v1beta1' })

const THINKING_LEVEL: Record<ThinkingLevelName, string> = { low: 'LOW', medium: 'MEDIUM', high: 'HIGH' }

export interface PreparedMedia {
  sources: MediaSource[]
  staged: string[]
  hashes: Array<{ path: string; sha256: string }>
}

const runGcloud = (args: string[]) => {
  const result = spawnSync('gcloud', args, { encoding: 'utf8', timeout: 300_000 })

  if (result.error || result.status !== 0) {
    throw new Error(`gcloud ${args.slice(0, 2).join(' ')} falló: ${(result.stderr || String(result.error)).slice(-240)}. Revisa la sesión de gcloud y el acceso al bucket.`)
  }
}

/** Lee o sube los archivos: inline si caben, por URI gs:// si se pasó --gcs o si ya son gs://. */
export const prepareMedia = async (files: string[], gcs?: string): Promise<PreparedMedia> => {
  const sources: MediaSource[] = []
  const staged: string[] = []
  const hashes: Array<{ path: string; sha256: string }> = []
  const inlineSizes: number[] = []

  for (const path of files) {
    const mimeType = mimeForPath(path)

    if (isGcsUri(path)) {
      sources.push({ path, mimeType, uri: path })
      continue
    }

    const buffer = await readFile(path)

    hashes.push({ path, sha256: shortHash(buffer) })

    if (gcs) {
      const uri = `${gcs.replace(/\/?$/, '/')}${randomUUID()}-${basename(path)}`

      runGcloud(['storage', 'cp', resolve(path), uri])
      staged.push(uri)
      sources.push({ path, mimeType, uri })
    } else {
      inlineSizes.push(buffer.byteLength)
      sources.push({ path, mimeType, data: buffer.toString('base64') })
    }
  }

  assertInlineBudget(inlineSizes)

  return { sources, staged, hashes }
}

export const cleanupStaged = (uris: string[]) => {
  for (const uri of uris) {
    try {
      runGcloud(['storage', 'rm', uri])
    } catch {
      // El borrado es higiene: si falla, se informa en el log del llamador y el archivo queda en el prefijo de staging.
    }
  }
}

type RequestOptions = Pick<ListenArgs, 'fps' | 'clip' | 'resolution' | 'agentic' | 'model'> & {
  thinking: ThinkingLevelName
  prompt: string
  schema?: object
  onRetry?: (attempt: number, waitMs: number) => void
}

const buildContents = (sources: MediaSource[], options: RequestOptions) => [
  { role: 'user', parts: [...sources.map(source => buildMediaPart(source, options)), { text: options.prompt }] }
]

/** Reintenta ante cuota agotada (429) o servicio no disponible (503): ambos son transitorios en Vertex y suelen pasar en segundos. */
export const QUOTA_RETRY_DELAYS_MS = [20_000, 40_000]

const isTransientError = (error: unknown) => /\b(429|503)\b|RESOURCE_EXHAUSTED|UNAVAILABLE/.test(error instanceof Error ? error.message : String(error))

export const withQuotaRetry = async <T>(call: () => Promise<T>, onRetry?: (attempt: number, waitMs: number) => void, delays = QUOTA_RETRY_DELAYS_MS): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call()
    } catch (error) {
      if (!isTransientError(error) || attempt >= delays.length) throw error
      onRetry?.(attempt + 1, delays[attempt])
      await new Promise(resolveWait => setTimeout(resolveWait, delays[attempt]))
    }
  }
}

export interface GeminiMediaAnalysisResult {
  model: string
  text: string
  usage: { inputTokens: number; outputTokens: number; thoughtTokens: number }
  latencyMs: number
}

/**
 * Envía los medios a Gemini (Vertex) con los controles de video y razonamiento. LANZA en error de SDK, credencial o
 * respuesta vacía. No envía `temperature`: Gemini 3.x la ignora.
 */
export const analyzeMedia = async (sources: MediaSource[], options: RequestOptions): Promise<GeminiMediaAnalysisResult> => {
  const client = await getMediaAnalysisClient()
  const model = options.model?.trim() || GEMINI_MEDIA_DEFAULT_MODEL
  const started = Date.now()

  const request = {
    model,
    contents: buildContents(sources, options) as never,
    config: {
      thinkingConfig: { thinkingLevel: THINKING_LEVEL[options.thinking] as never },
      ...(options.schema ? { responseMimeType: 'application/json', responseJsonSchema: options.schema } : {})
    }
  }

  const response = await withQuotaRetry(() => client.models.generateContent(request), options.onRetry)

  const text = response.text?.trim()

  if (!text) throw new Error(`Gemini (${model}) devolvió una respuesta vacía.`)

  const usage = response.usageMetadata

  return {
    model,
    text,
    usage: {
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      thoughtTokens: usage?.thoughtsTokenCount ?? 0
    },
    latencyMs: Date.now() - started
  }
}

/** Cuenta los tokens de entrada sin generar. */
export const countMediaTokens = async (sources: MediaSource[], options: RequestOptions): Promise<number> => {
  const client = await getMediaAnalysisClient()

  const response = await client.models.countTokens({
    model: options.model?.trim() || GEMINI_MEDIA_DEFAULT_MODEL,
    contents: buildContents(sources, options) as never
  })

  return response.totalTokens ?? 0
}

/** Compatibilidad con la API previa (`analyzeMediaWithGemini`): inline, sin controles de video. */
export const analyzeMediaWithGemini = async (input: { files: string[]; prompt: string; model?: string; thinking?: ThinkingLevelName }) => {
  const { sources } = await prepareMedia(input.files)

  return analyzeMedia(sources, { model: input.model ?? GEMINI_MEDIA_DEFAULT_MODEL, thinking: input.thinking ?? 'medium', prompt: input.prompt, agentic: false })
}
