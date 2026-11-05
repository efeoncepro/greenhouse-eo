/**
 * Google Cloud Gemini Omni Interactions contract for the local, out-of-band CLI.
 *
 * Default model: Gemini Omni 1.2 Flash (GA, 2026-11-05). Omni 1.1 Flash Preview stays selectable
 * with `--model 1.1` for reproducibility of earlier clips. Limits per model and task come from the
 * Google Cloud model pages and how-to pages verified 2026-11-05.
 */
export const OMNI_CLOUD_LOCATION = 'global' as const

export type OmniModelKey = '1.2' | '1.1'
export type OmniTask = 'text' | 'image' | 'frames' | 'reference' | 'edit' | 'extend' | 'upscale'
export type OmniResolution = '360p' | '720p' | '1080p' | '4k'
export type OmniAspect = '16:9' | '9:16'

export const OMNI_TASKS: readonly OmniTask[] = ['text', 'image', 'frames', 'reference', 'edit', 'extend', 'upscale']

export interface OmniModelSpec {
  key: OmniModelKey
  id: string
  label: string
  stage: 'GA' | 'Preview'
  /** USD per 1M output video tokens. 1.2: $12 (derived from the published $0.07/s at 720p). */
  videoOutputUsdPerMillionTokens: number
  /** Max output seconds for text, image and reference generation (and edit). */
  maxGenerationSeconds: number
  /** Max local input video seconds for edit/upscale/reference before upload. */
  maxInputVideoSeconds: number
  /** Extend accepts any input length on 1.2 (uses the last 10s). */
  extendAcceptsAnyInputLength: boolean
  supportsUpscale: boolean
  maxEditReferenceImages: number
  maxExtendReferenceImages: number
}

export const OMNI_MODELS: Record<OmniModelKey, OmniModelSpec> = {
  '1.2': {
    key: '1.2',
    id: 'gemini-omni-1.2-flash',
    label: 'Omni 1.2 Flash',
    stage: 'GA',
    videoOutputUsdPerMillionTokens: 12,
    maxGenerationSeconds: 15,
    maxInputVideoSeconds: 15,
    extendAcceptsAnyInputLength: true,
    supportsUpscale: true,
    maxEditReferenceImages: 2,
    maxExtendReferenceImages: 2
  },
  '1.1': {
    key: '1.1',
    id: 'gemini-omni-1.1-flash-preview',
    label: 'Omni 1.1 Flash Preview',
    stage: 'Preview',
    videoOutputUsdPerMillionTokens: 17.5,
    maxGenerationSeconds: 10,
    maxInputVideoSeconds: 10,
    extendAcceptsAnyInputLength: false,
    supportsUpscale: false,
    maxEditReferenceImages: 10,
    maxExtendReferenceImages: 0
  }
}

export const OMNI_DEFAULT_MODEL: OmniModelKey = '1.2'
/** Kept for callers that only need the default Cloud identity. */
export const OMNI_CLOUD_MODEL = OMNI_MODELS[OMNI_DEFAULT_MODEL].id
export const OMNI_KNOWN_MODEL_IDS: readonly string[] = Object.values(OMNI_MODELS).map(model => model.id)

export function resolveOmniModel(value: string | undefined): OmniModelSpec {
  const key = (value ?? OMNI_DEFAULT_MODEL).trim()
  const byKey = OMNI_MODELS[key as OmniModelKey]

  if (byKey) return byKey
  const byId = Object.values(OMNI_MODELS).find(model => model.id === key)

  if (byId) return byId
  throw new Error(`--model debe ser 1.2, 1.1 o un ID exacto (${OMNI_KNOWN_MODEL_IDS.join(', ')}).`)
}

export interface OmniMedia {
  uri: string
  mimeType: string
}

export interface OmniRequestOptions {
  task: OmniTask
  prompt: string
  images: OmniMedia[]
  videos: OmniMedia[]
  gcsOutput: string
  aspect: OmniAspect
  resolution: OmniResolution
  duration: number
  /** Defaults to Omni 1.2 Flash. */
  model?: OmniModelKey
  /** Stateful follow-up turn (edit/upscale over the previous interaction's video). */
  previousInteractionId?: string
  /** Upscale only: the source clip resolution (360p or 720p). Validates the transition and prices it. */
  sourceResolution?: OmniResolution
}

const TASK_NAMES: Record<OmniTask, string> = {
  text: 'text_to_video',
  image: 'image_to_video',
  frames: 'image_to_video',
  reference: 'reference_to_video',
  edit: 'edit',
  extend: 'extend',
  upscale: 'upscale'
}

/** Output video tokens per second; the same rate on 1.1 and 1.2 (only the token price changed). */
const OUTPUT_TOKENS_PER_SECOND: Record<OmniResolution, number> = {
  '360p': 1931,
  '720p': 5792,
  '1080p': 8688,
  '4k': 17376
}

/** Upscale output tokens per second by transition (Cloud upscale page, 2026-11-05). Input tokens are 0. */
const UPSCALE_TOKENS_PER_SECOND: Record<string, number> = {
  '360p>720p': 2896,
  '360p>1080p': 5792,
  '720p>1080p': 2896,
  '720p>4k': 11584
}

export function assertGcsUri(uri: string, label: string): void {
  if (!/^gs:\/\/[a-z0-9][a-z0-9._-]{1,220}\/.+/i.test(uri) || uri.includes('?') || uri.includes('#')) {
    throw new Error(`${label} debe ser una URI gs://bucket/ruta sin parámetros.`)
  }
}

/** Max output seconds for one task on one model. */
export function omniMaxDuration(task: OmniTask, model: OmniModelSpec): number {
  if (task === 'frames' || task === 'extend') return 10

  return model.maxGenerationSeconds
}

export function assertOmniInteractionId(id: string, label = 'ID de interacción'): void {
  // Interaction IDs are opaque. Bound them rather than guessing provider-owned syntax.
  if (!id.trim() || id.length > 1024 || /\s/.test(id)) throw new Error(`${label} inválido.`)
}

function assertUpscaleTransition(source: OmniResolution | undefined, target: OmniResolution): string {
  if (!source) throw new Error('upscale exige --source-resolution 360p|720p (la resolución del clip fuente).')
  const key = `${source}>${target}`

  if (!Object.hasOwn(UPSCALE_TOKENS_PER_SECOND, key)) {
    throw new Error('upscale admite 360p→720p|1080p y 720p→1080p|4k; 360p→4k y 1080p→4k no existen.')
  }

  return key
}

export function validateOmniRequest(options: OmniRequestOptions): void {
  const model = OMNI_MODELS[options.model ?? OMNI_DEFAULT_MODEL]

  if (!model) throw new Error('Modelo Omni desconocido.')
  if (!OMNI_TASKS.includes(options.task)) throw new Error(`Elige --task ${OMNI_TASKS.join('|')}.`)
  if (!options.prompt.trim() && options.task !== 'upscale') throw new Error('Falta --prompt o --prompt-file.')

  if (options.task === 'upscale' && !model.supportsUpscale) {
    throw new Error(`${model.label} no admite upscale; usa --model 1.2.`)
  }

  if (options.task === 'upscale') {
    assertUpscaleTransition(options.sourceResolution, options.resolution)
  } else if (options.sourceResolution) {
    throw new Error('--source-resolution sólo aplica a --task upscale.')
  }

  const maxDuration = omniMaxDuration(options.task, model)

  if (!Number.isInteger(options.duration) || options.duration < 3 || options.duration > maxDuration) {
    throw new Error(`--duration debe ser un entero de 3 a ${maxDuration} segundos para ${options.task} en ${model.label}.`)
  }

  if (!['16:9', '9:16'].includes(options.aspect)) throw new Error('--aspect debe ser 16:9 o 9:16.')

  if (!Object.hasOwn(OUTPUT_TOKENS_PER_SECOND, options.resolution)) {
    throw new Error('--resolution debe ser 360p, 720p, 1080p o 4k.')
  }

  if (options.previousInteractionId !== undefined) {
    assertOmniInteractionId(options.previousInteractionId, '--previous')

    if (options.task !== 'edit' && options.task !== 'upscale') {
      throw new Error('--previous sólo aplica a edit y upscale (continuar sobre el clip del turno anterior).')
    }
  }

  assertGcsUri(options.gcsOutput, '--gcs-output')

  for (const image of options.images) {
    assertGcsUri(image.uri, '--image')

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(image.mimeType)) {
      throw new Error('Omni acepta aquí imágenes PNG, JPEG o WebP.')
    }
  }

  for (const video of options.videos) {
    assertGcsUri(video.uri, '--video')
    if (video.mimeType !== 'video/mp4') throw new Error('Omni acepta aquí videos MP4.')
  }

  const count = { images: options.images.length, videos: options.videos.length }
  const chained = options.previousInteractionId !== undefined
  // 1.2 references: 11–15s clips accept 1 reference video; 3–10s clips up to 3.
  const maxReferenceVideos = model.key === '1.2' && options.duration > 10 ? 1 : 3
  const maxReferenceImages = model.key === '1.2' ? 6 : 10
  const sourceVideos = chained ? 0 : 1

  const invalid: Record<OmniTask, boolean> = {
    text: count.images !== 0 || count.videos !== 0,
    image: count.images !== 1 || count.videos !== 0,
    frames: count.images !== 2 || count.videos !== 0,
    reference:
      count.images + count.videos < 1 || count.images > maxReferenceImages || count.videos > maxReferenceVideos,
    edit: count.images > model.maxEditReferenceImages || count.videos !== sourceVideos,
    extend: count.images > model.maxExtendReferenceImages || count.videos !== 1,
    upscale: count.images !== 0 || count.videos !== sourceVideos
  }

  if (invalid[options.task]) {
    throw new Error(
      `Entradas inválidas para ${options.task} en ${model.label}: ${count.images} imagen(es), ${count.videos} video(s)` +
        (chained ? ' (con --previous el video fuente es el del turno anterior).' : '.')
    )
  }
}

export function buildOmniRequest(options: OmniRequestOptions) {
  validateOmniRequest(options)
  const model = OMNI_MODELS[options.model ?? OMNI_DEFAULT_MODEL]
  const chained = options.previousInteractionId !== undefined

  const parts = [
    ...(options.prompt.trim() || chained ? [{ type: 'text', text: options.prompt.trim() || 'Upsample video.' }] : []),
    ...options.images.map(image => ({ type: 'image', uri: image.uri, mime_type: image.mimeType })),
    ...options.videos.map(video => ({ type: 'video', uri: video.uri, mime_type: video.mimeType }))
  ]

  const keepsSourceShape = ['edit', 'extend', 'upscale'].includes(options.task)

  const responseFormat = {
    type: 'video',
    delivery: 'uri',
    gcs_uri: options.gcsOutput,
    ...(keepsSourceShape ? {} : { aspect_ratio: options.aspect }),
    resolution: options.resolution,
    ...(options.task !== 'edit' && options.task !== 'upscale' ? { duration: `${options.duration}s` } : {})
  }

  return {
    model: model.id,
    background: true,
    store: true,
    // A stateful follow-up wraps its parts in a user_input turn (Cloud upscale page example).
    ...(chained ? { previous_interaction_id: options.previousInteractionId } : {}),
    input: chained ? [{ type: 'user_input', content: parts }] : parts,
    response_format: [responseFormat],
    generation_config: { video_config: { task: TASK_NAMES[options.task] } }
  }
}

export interface OmniEstimateInput {
  model?: OmniModelKey
  task?: OmniTask
  resolution: OmniResolution
  duration: number
  sourceResolution?: OmniResolution
}

/** Published video-output component only. Input, thoughts, taxes and rounding are extra. */
export function estimateOmniVideoOutputUsd(input: OmniEstimateInput): number {
  const model = OMNI_MODELS[input.model ?? OMNI_DEFAULT_MODEL]

  if (!model) throw new Error('Modelo inválido.')
  if (!Object.hasOwn(OUTPUT_TOKENS_PER_SECOND, input.resolution)) throw new Error('Resolución inválida.')

  if (!Number.isInteger(input.duration) || input.duration < 1 || input.duration > model.maxGenerationSeconds) {
    throw new Error('Duración inválida.')
  }

  const tokensPerSecond =
    input.task === 'upscale'
      ? UPSCALE_TOKENS_PER_SECOND[assertUpscaleTransition(input.sourceResolution, input.resolution)]
      : OUTPUT_TOKENS_PER_SECOND[input.resolution]

  return (tokensPerSecond * input.duration * model.videoOutputUsdPerMillionTokens) / 1_000_000
}

export function omniInteractionUrl(project: string, interactionId?: string): string {
  if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(project)) throw new Error('ID de proyecto GCP inválido.')
  const base = `https://aiplatform.googleapis.com/v1beta1/projects/${project}/locations/${OMNI_CLOUD_LOCATION}/interactions`

  if (!interactionId) return base
  assertOmniInteractionId(interactionId)

  return `${base}/${encodeURIComponent(interactionId)}`
}

export interface OmniInteractionSummary {
  id: string
  status: string
  model?: string
  /** Set when the response names a model outside the known Omni identities. */
  unexpectedModel?: boolean
  videos: OmniMedia[]
  inlineVideos: { data: string; mimeType: string }[]
  usage?: unknown
}

/**
 * Parses an interaction. A foreign model identity is flagged, never thrown: after a paid submit,
 * throwing would hide the interaction ID the operator needs to recover the clip.
 */
export function summarizeOmniInteraction(raw: unknown): OmniInteractionSummary {
  if (!raw || typeof raw !== 'object') throw new Error('Respuesta de interacción inválida.')
  const data = raw as Record<string, unknown>

  if (typeof data.id !== 'string' || !data.id) throw new Error('La respuesta no contiene interaction id.')
  if (typeof data.status !== 'string') throw new Error('La respuesta no contiene status.')

  const model = typeof data.model === 'string' ? data.model : undefined
  const videos: OmniMedia[] = []
  const inlineVideos: { data: string; mimeType: string }[] = []

  for (const step of Array.isArray(data.steps) ? data.steps : []) {
    if (!step || typeof step !== 'object' || (step as { type?: unknown }).type !== 'model_output') continue

    for (const part of Array.isArray((step as { content?: unknown }).content)
      ? (step as { content: unknown[] }).content
      : []) {
      if (!part || typeof part !== 'object' || (part as { type?: unknown }).type !== 'video') continue
      const item = part as Record<string, unknown>
      const mimeType = item.mime_type === 'video/mp4' ? 'video/mp4' : ''

      if (!mimeType) throw new Error('La salida no declara video/mp4.')

      if (typeof item.uri === 'string') {
        assertGcsUri(item.uri, 'URI de salida')
        videos.push({ uri: item.uri, mimeType })
      } else if (typeof item.data === 'string') {
        inlineVideos.push({ data: item.data, mimeType })
      }
    }
  }

  return {
    id: data.id,
    status: data.status,
    model,
    ...(model && !OMNI_KNOWN_MODEL_IDS.includes(model) ? { unexpectedModel: true } : {}),
    videos,
    inlineVideos,
    usage: data.usage
  }
}
