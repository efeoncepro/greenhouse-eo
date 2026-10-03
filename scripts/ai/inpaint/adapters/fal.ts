import { runFalModel, uploadFalFile } from '@/lib/ai/fal'
import { findFalCapability, type FalCapability } from '@/lib/ai/fal-capabilities'
import { estimateFalCost } from '@/lib/ai/fal-pricing'

import { pickGridSize, type PickTargetSize, type TargetSize } from '../crop'
import { toProviderMaskPng } from '../mask'

import type { ImageAdapterParams, InpaintImageAdapter } from './types'

/**
 * Adaptadores fal de `pnpm ai:inpaint image` (TASK-1965), construidos DESDE el catálogo `fal-capabilities.ts`: el
 * slug, la máscara, la semilla y el precio salen de la fila verificada, nunca de este archivo.
 *
 * - Con máscara (`capability.mask`): la máscara viaja convertida a la convención del endpoint.
 * - Sin máscara (Seedream edit): el endpoint edita por instrucción; la máscara sólo recompone después.
 */

/** Grillas de tamaño por endpoint, del esquema OpenAPI (2026-10-02). */
const SIZE_RULES: Readonly<Record<string, Parameters<typeof pickGridSize>[2]>> = {
  // Sin tope publicado: se acota a ~2 MP para no pagar megapíxeles que el recorte no necesita.
  'flux-pro-fill': { step: 16, minArea: 512 * 512, maxArea: 1440 * 1440, maxEdge: 2048, maxRatio: 3 },
  // «Total pixels between 1024x1024 and 2048x2048, aspect ratio between 1/16 and 16»; tope en 1536² = escalón barato.
  'seedream5-pro-edit': { step: 16, minArea: 1024 * 1024, maxArea: 1536 * 1536, maxEdge: 4096, maxRatio: 16 },
  'seedream5-lite-edit': { step: 16, minArea: 1024 * 1024, maxArea: 1536 * 1536, maxEdge: 4096, maxRatio: 16 },
  // Relight (2026-10-03): IC-Light cobra por megapíxel; se acota a ~1 MP. El relighting por estilos no expone tamaño.
  // 1 MP justo: fal redondea los megapíxeles hacia arriba (1024² = 1,05 MP se cobra como 2).
  'iclight-v2': { step: 8, minArea: 512 * 512, maxArea: 1_000_000, maxEdge: 2048, maxRatio: 4 },
  'image-apps-relighting': { step: 16, minArea: 512 * 512, maxArea: 2048 * 2048, maxEdge: 4096, maxRatio: 4 }
}

/** Estilos del relighting de image-apps v2 (OpenAPI 2026-10-03): el `--prompt` debe ser uno de ellos. */
export const RELIGHTING_STYLES = [
  'natural', 'studio', 'golden_hour', 'blue_hour', 'dramatic', 'soft', 'hard', 'backlight', 'side_light', 'front_light',
  'rim_light', 'sunset', 'sunrise', 'neon', 'candlelight', 'moonlight', 'spotlight', 'ambient'
] as const

/** Dirección de la luz de IC-Light, leída del prompt («light from the left») — el endpoint la recibe aparte. */
const iclightDirection = (prompt: string): string => {
  const match = /\b(?:light|lit|sun|sunlight)\s+(?:coming\s+)?from\s+(?:the\s+)?(left|right|top|above|bottom|below)\b/i.exec(prompt)
  const side = match?.[1].toLowerCase()

  return side === 'left' ? 'Left' : side === 'right' ? 'Right' : side === 'top' || side === 'above' ? 'Top' : side === 'bottom' || side === 'below' ? 'Bottom' : 'None'
}

export const FAL_INPAINT_CAPABILITY_IDS = Object.keys(SIZE_RULES)

/** Espera máxima por un trabajo de fal: los de relight tardan más que el default de 120 s del cliente. */
export const FAL_INPAINT_POLL_TIMEOUT_MS = 600_000

/** Arma el input del endpoint. Exportado para probar la forma del pedido sin red. */
export const buildFalInpaintInput = (
  capability: FalCapability,
  params: { prompt: string; imageUrl: string; extraUrls?: string[]; maskUrl: string | null; size: TargetSize; seed?: number }
) => {
  if (capability.id === 'image-apps-relighting') {
    const style = params.prompt.trim().toLowerCase()

    if (!(RELIGHTING_STYLES as readonly string[]).includes(style)) {
      throw new Error(`fal:image-apps-relighting recibe un estilo de luz como --prompt: ${RELIGHTING_STYLES.join(', ')}.`)
    }

    return { image_url: params.imageUrl, lighting_style: style }
  }

  const input: Record<string, unknown> = { prompt: params.prompt, num_images: 1 }

  if (capability.id === 'iclight-v2') {
    input.image_size = { width: params.size.width, height: params.size.height }
    input.initial_latent = iclightDirection(params.prompt)
  }

  if (capability.inputMediaField === 'image_urls') input.image_urls = [params.imageUrl, ...(params.extraUrls ?? [])]
  else input.image_url = params.imageUrl

  if (capability.mask) {
    if (!params.maskUrl) throw new Error(`${capability.id} exige máscara.`)
    input[capability.mask.field] = params.maskUrl
  }

  // Seedream recibe el tamaño; Fill sale al tamaño de la entrada (ya enviada al tamaño elegido).
  if (capability.id.startsWith('seedream')) input.image_size = { width: params.size.width, height: params.size.height }
  if (capability.imageOutput?.formats.includes('png')) input.output_format = 'png'
  if (params.seed !== undefined) input.seed = params.seed

  return input
}

const firstImageUrl = (output: unknown): string => {
  const images = (output as { images?: Array<{ url?: unknown }> } | null)?.images
  const url = Array.isArray(images) ? images[0]?.url : undefined

  if (typeof url !== 'string') throw new Error('fal no devolvió una imagen en "images".')

  return url
}

export const createFalInpaintAdapter = (capabilityId: string): InpaintImageAdapter => {
  const capability = findFalCapability(capabilityId)
  const rules = SIZE_RULES[capabilityId]

  if (!capability || !rules) {
    throw new Error(`fal:${capabilityId} no es un adaptador de inpainting. Disponibles: ${FAL_INPAINT_CAPABILITY_IDS.map(id => `fal:${id}`).join(', ')}.`)
  }

  const pickSize: PickTargetSize = (aspect, area) => pickGridSize(aspect, area, rules)

  return {
    id: `fal:${capability.id}`,
    provider: 'fal',
    label: capability.label,
    defaultModel: capability.slug,
    sendsMask: Boolean(capability.mask),
    maskConvention: capability.mask?.convention ?? null,
    maxExtraImages: capability.inputMedia === 'many' ? undefined : 0,
    verifiedAt: capability.verifiedAt,
    revision: 1,
    validate({ model, quality, seed, providerMask }: ImageAdapterParams) {
      if (providerMask && providerMask !== 'auto') throw new Error(`fal:${capability.id} no admite --provider-mask: ${capability.mask ? 'su máscara siempre viaja' : 'edita sin máscara'}.`)

      if (model !== capability.slug) throw new Error(`fal:${capability.id} usa ${capability.slug}; quita --model.`)
      if (quality !== undefined) throw new Error(`fal:${capability.id} no tiene --quality.`)
      if (seed !== undefined && !capability.acceptsSeed) throw new Error(`fal:${capability.id} no declara semilla en su OpenAPI: quita --seed.`)
    },
    pickSize: () => pickSize,
    async estimate({ size, count }) {
      const area = size.width * size.height
      const input = capability.id.startsWith('seedream') || capability.id === 'iclight-v2' ? { image_size: { width: size.width, height: size.height } } : {}
      const estimate = estimateFalCost({ capability, input, sourceArea: area })

      return estimate.usd === null ? { usd: null, basis: estimate.basis } : { usd: Math.round(estimate.usd * count * 10_000) / 10_000, basis: `${count} × ${estimate.basis}` }
    },
    async run({ prompt, image, extraImages = [], mask, size, seed }) {
      if (extraImages.length && capability.inputMedia !== 'many') throw new Error(`fal:${capability.id} no admite boceto ni referencias: usa openai o fal:seedream5-pro-edit.`)
      if (extraImages.length + 1 > (capability.maxInputImages ?? 10)) throw new Error(`fal:${capability.id} usa como máximo ${capability.maxInputImages ?? 10} imágenes.`)

      const uploadedImage = await uploadFalFile({ bytes: image, fileName: 'base.png', contentType: 'image/png' })
      const uploadedExtras = await Promise.all(extraImages.map((bytes, index) => uploadFalFile({ bytes, fileName: `ref-${index + 1}.png`, contentType: 'image/png' })))

      const uploadedMask = capability.mask
        ? await uploadFalFile({ bytes: await toProviderMaskPng(mask, capability.mask.convention), fileName: 'mask.png', contentType: 'image/png' })
        : null

      const result = await runFalModel<Record<string, unknown>>({
        model: capability.slug,
        // IC-Light superó los 120 s por defecto en el canario del 2026-10-03 (HTTP 408 con el trabajo ya en fal).
        pollTimeoutMs: FAL_INPAINT_POLL_TIMEOUT_MS,
        // Si la espera vence, el id permite recuperar el trabajo (ya pagado) con awaitFalRequest.
        onEnqueued: handle => process.stderr.write(`    · fal encolado: ${capability.slug} · request ${handle.requestId}\n`),
        input: buildFalInpaintInput(capability, { prompt, imageUrl: uploadedImage.url, extraUrls: uploadedExtras.map(item => item.url), maskUrl: uploadedMask?.url ?? null, size, seed })
      })

      if (!result.ok || !result.output) {
        throw new Error(`fal ${capability.slug} falló (HTTP ${result.httpStatus})${result.errorDetail ? `: ${result.errorDetail}` : ''}`)
      }

      const response = await fetch(firstImageUrl(result.output))

      if (!response.ok) throw new Error(`No se pudo descargar la salida de fal (HTTP ${response.status}).`)

      const outputSeed = (result.output as { seed?: unknown } | null)?.seed

      return {
        image: Buffer.from(await response.arrayBuffer()),
        providerModel: capability.slug,
        outputUsd: null,
        usage: null,
        // Sólo el id del request y la semilla efectiva: las URLs de storage no se guardan.
        meta: { requestId: result.requestId, account: result.account, ...(typeof outputSeed === 'number' ? { seed: outputSeed } : {}) }
      }
    }
  }
}
