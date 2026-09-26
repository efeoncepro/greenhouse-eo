/** Google Cloud Gemini Omni 1.1 Interactions contract for the local, out-of-band CLI. */
export const OMNI_CLOUD_MODEL = 'gemini-omni-1.1-flash-preview' as const
export const OMNI_CLOUD_LOCATION = 'global' as const

export type OmniTask = 'text' | 'image' | 'frames' | 'reference' | 'edit' | 'extend'
export type OmniResolution = '360p' | '720p' | '1080p' | '4k'
export type OmniAspect = '16:9' | '9:16'

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
}

const TASK_NAMES: Record<OmniTask, string> = {
  text: 'text_to_video',
  image: 'image_to_video',
  frames: 'image_to_video',
  reference: 'reference_to_video',
  edit: 'edit',
  extend: 'extend'
}

const OUTPUT_TOKENS_PER_SECOND: Record<OmniResolution, number> = {
  '360p': 1931,
  '720p': 5792,
  '1080p': 8688,
  '4k': 17376
}

export function assertGcsUri(uri: string, label: string): void {
  if (!/^gs:\/\/[a-z0-9][a-z0-9._-]{1,220}\/.+/i.test(uri) || uri.includes('?') || uri.includes('#')) {
    throw new Error(`${label} debe ser una URI gs://bucket/ruta sin parámetros.`)
  }
}

export function validateOmniRequest(options: OmniRequestOptions): void {
  if (!options.prompt.trim()) throw new Error('Falta --prompt o --prompt-file.')

  if (!Number.isInteger(options.duration) || options.duration < 3 || options.duration > 10) {
    throw new Error('--duration debe ser un entero de 3 a 10 segundos.')
  }

  if (!['16:9', '9:16'].includes(options.aspect)) throw new Error('--aspect debe ser 16:9 o 9:16.')

  if (!Object.hasOwn(OUTPUT_TOKENS_PER_SECOND, options.resolution)) {
    throw new Error('--resolution debe ser 360p, 720p, 1080p o 4k.')
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

  const invalid = {
    text: count.images !== 0 || count.videos !== 0,
    image: count.images !== 1 || count.videos !== 0,
    frames: count.images !== 2 || count.videos !== 0,
    reference: count.images + count.videos < 1 || count.images > 10 || count.videos > 3,
    edit: count.images > 10 || count.videos !== 1,
    extend: count.images !== 0 || count.videos !== 1
  }

  if (invalid[options.task]) {
    throw new Error(`Entradas inválidas para ${options.task}: ${count.images} imagen(es), ${count.videos} video(s).`)
  }
}

export function buildOmniRequest(options: OmniRequestOptions) {
  validateOmniRequest(options)

  const input = [
    { type: 'text', text: options.prompt },
    ...options.images.map(image => ({ type: 'image', uri: image.uri, mime_type: image.mimeType })),
    ...options.videos.map(video => ({ type: 'video', uri: video.uri, mime_type: video.mimeType }))
  ]

  const responseFormat = {
    type: 'video',
    delivery: 'uri',
    gcs_uri: options.gcsOutput,
    ...(options.task !== 'edit' && options.task !== 'extend' ? { aspect_ratio: options.aspect } : {}),
    resolution: options.resolution,
    ...(options.task !== 'edit' ? { duration: `${options.duration}s` } : {})
  }

  return {
    model: OMNI_CLOUD_MODEL,
    background: true,
    store: true,
    input,
    response_format: [responseFormat],
    generation_config: { video_config: { task: TASK_NAMES[options.task] } }
  }
}

/** Published video-output component only. Input, thoughts, taxes and rounding are extra. */
export function estimateOmniVideoOutputUsd(resolution: OmniResolution, duration: number): number {
  if (!Object.hasOwn(OUTPUT_TOKENS_PER_SECOND, resolution)) throw new Error('Resolución inválida.')
  if (!Number.isInteger(duration) || duration < 3 || duration > 10) throw new Error('Duración inválida.')

  return (OUTPUT_TOKENS_PER_SECOND[resolution] * duration * 17.5) / 1_000_000
}

export function omniInteractionUrl(project: string, interactionId?: string): string {
  if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(project)) throw new Error('ID de proyecto GCP inválido.')
  const base = `https://aiplatform.googleapis.com/v1beta1/projects/${project}/locations/${OMNI_CLOUD_LOCATION}/interactions`

  if (!interactionId) return base
  // Interaction IDs are opaque. Encode rather than guessing their provider-owned syntax.
  if (!interactionId.trim() || interactionId.length > 1024) throw new Error('ID de interacción inválido.')

  return `${base}/${encodeURIComponent(interactionId)}`
}

export interface OmniInteractionSummary {
  id: string
  status: string
  model?: string
  videos: OmniMedia[]
  inlineVideos: { data: string; mimeType: string }[]
  usage?: unknown
}

export function summarizeOmniInteraction(raw: unknown): OmniInteractionSummary {
  if (!raw || typeof raw !== 'object') throw new Error('Respuesta de interacción inválida.')
  const data = raw as Record<string, unknown>

  if (typeof data.id !== 'string' || !data.id) throw new Error('La respuesta no contiene interaction id.')
  if (typeof data.status !== 'string') throw new Error('La respuesta no contiene status.')

  if (typeof data.model === 'string' && data.model !== OMNI_CLOUD_MODEL) {
    throw new Error('La identidad del modelo en la respuesta no coincide con Omni 1.1 Cloud.')
  }

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
    model: typeof data.model === 'string' ? data.model : undefined,
    videos,
    inlineVideos,
    usage: data.usage
  }
}
