import { runFalModel, uploadFalFile } from '@/lib/ai/fal'
import { findFalCapability, type FalCapability } from '@/lib/ai/fal-capabilities'
import { estimateFalCost } from '@/lib/ai/fal-pricing'

/**
 * Motores de edición de video de `pnpm ai:inpaint video` (TASK-1965), desde el catálogo `fal-capabilities.ts`.
 * Editan por instrucción: la máscara no viaja; el pipeline recompone cuadro a cuadro después.
 */
export interface VideoEditRequest {
  prompt: string
  video: Buffer
  durationSeconds: number
  /** Cuadro de referencia ya editado (estrategia `first-frame`); sólo motores que aceptan imágenes. */
  referenceImage?: Buffer
}

export interface VideoEditEngine {
  id: string
  label: string
  slug: string
  acceptsReferenceImage: boolean
  /** Tope de duración del origen que el endpoint acepta, en segundos. */
  maxSourceSeconds: number
  maxSourceBytes: number
  /** Generación real verificada con este pipeline (YYYY-MM-DD); null = contrato del catálogo, sin canario propio. */
  verifiedAt: string | null
  revision: number
  estimate(durationSeconds: number): { usd: number | null; basis: string }
  run(request: VideoEditRequest): Promise<{ video: Buffer; meta: Record<string, unknown> }>
}

const capabilityOrThrow = (id: string): FalCapability => {
  const capability = findFalCapability(id)

  if (!capability) throw new Error(`La capacidad fal "${id}" no existe en el catálogo.`)

  return capability
}

const fileUrl = (value: unknown): string | null => {
  if (value && typeof value === 'object' && typeof (value as { url?: unknown }).url === 'string') return (value as { url: string }).url

  return null
}

const download = async (url: string): Promise<Buffer> => {
  const response = await fetch(url)

  if (!response.ok) throw new Error(`No se pudo descargar la salida de fal (HTTP ${response.status}).`)

  return Buffer.from(await response.arrayBuffer())
}

/** Input del endpoint; exportado para probar la forma del pedido sin red. */
export const buildVideoEditInput = (engineId: string, params: { prompt: string; videoUrl: string; imageUrl?: string; durationSeconds: number }) => {
  if (engineId === 'flux3-edit') return { prompt: params.prompt, video_url: params.videoUrl }

  // Seedance 2.5 reference-to-video con task=editing: el video va como referencia y la duración se acota al contrato.
  return {
    prompt: params.prompt,
    task: 'editing',
    video_urls: [params.videoUrl],
    ...(params.imageUrl ? { image_urls: [params.imageUrl] } : {}),
    duration: String(Math.min(30, Math.max(4, Math.round(params.durationSeconds)))),
    resolution: '720p'
  }
}

const createEngine = (catalogId: string, overrides: Pick<VideoEditEngine, 'id' | 'acceptsReferenceImage' | 'maxSourceSeconds' | 'maxSourceBytes' | 'verifiedAt'>): VideoEditEngine => {
  const capability = capabilityOrThrow(catalogId)

  return {
    ...overrides,
    label: capability.label,
    slug: capability.slug,
    revision: 1,
    estimate(durationSeconds) {
      const input = catalogId === 'flux3-edit' ? {} : { resolution: '720p', duration: String(Math.min(30, Math.max(4, Math.round(durationSeconds)))) }
      const estimate = estimateFalCost({ capability, input, sourceSeconds: catalogId === 'flux3-edit' ? durationSeconds : null })

      return { usd: estimate.usd, basis: estimate.basis }
    },
    async run({ prompt, video, durationSeconds, referenceImage }) {
      const uploadedVideo = await uploadFalFile({ bytes: video, fileName: 'source.mp4', contentType: 'video/mp4' })
      const uploadedImage = referenceImage ? await uploadFalFile({ bytes: referenceImage, fileName: 'reference.png', contentType: 'image/png' }) : null

      const result = await runFalModel<Record<string, unknown>>({
        model: capability.slug,
        input: buildVideoEditInput(overrides.id, { prompt, videoUrl: uploadedVideo.url, imageUrl: uploadedImage?.url, durationSeconds }),
        pollTimeoutMs: 20 * 60_000
      })

      if (!result.ok || !result.output) {
        throw new Error(`fal ${capability.slug} falló (HTTP ${result.httpStatus})${result.errorDetail ? `: ${result.errorDetail}` : ''}`)
      }

      const url = fileUrl(result.output.video) ?? (Array.isArray(result.output.videos) ? fileUrl(result.output.videos[0]) : null)

      if (!url) throw new Error(`fal ${capability.slug} no devolvió "video".`)

      return { video: await download(url), meta: { requestId: result.requestId, account: result.account } }
    }
  }
}

/** Contratos del esquema OpenAPI de cada endpoint (2026-10-02). */
const ENGINES: Record<string, () => VideoEditEngine> = {
  // «MP4, under 50 MB and under 15 seconds»; edición por prompt; USD 0,03 por segundo del origen.
  'fal:flux3-edit': () =>
    // Canario real 2026-10-02 (TASK-1965): 5 s cámara quieta, objeto estable en 120 cuadros, deriva 11,16/255, delta 0.
    createEngine('flux3-edit', { id: 'flux3-edit', acceptsReferenceImage: false, maxSourceSeconds: 15, maxSourceBytes: 50 * 1024 * 1024, verifiedAt: '2026-10-02' }),
  // Seedance 2.5 task=editing: hasta 30 s; acepta imágenes de referencia (estrategia first-frame). Sin canario propio.
  'fal:seedance25-edit': () =>
    createEngine('seedance25-r2v', { id: 'seedance25-edit', acceptsReferenceImage: true, maxSourceSeconds: 30, maxSourceBytes: 50 * 1024 * 1024, verifiedAt: null })
}

export const VIDEO_ENGINE_IDS = Object.keys(ENGINES)

export const resolveVideoEngine = (id: string | undefined): VideoEditEngine => {
  const factory = ENGINES[id ?? 'fal:flux3-edit']

  if (!factory) throw new Error(`Motor de video desconocido: "${id}". Disponibles: ${VIDEO_ENGINE_IDS.join(', ')}.`)

  return factory()
}
