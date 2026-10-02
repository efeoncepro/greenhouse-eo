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
  'seedream5-lite-edit': { step: 16, minArea: 1024 * 1024, maxArea: 1536 * 1536, maxEdge: 4096, maxRatio: 16 }
}

export const FAL_INPAINT_CAPABILITY_IDS = Object.keys(SIZE_RULES)

/** Arma el input del endpoint. Exportado para probar la forma del pedido sin red. */
export const buildFalInpaintInput = (capability: FalCapability, params: { prompt: string; imageUrl: string; maskUrl: string | null; size: TargetSize; seed?: number }) => {
  const input: Record<string, unknown> = { prompt: params.prompt, num_images: 1 }

  if (capability.inputMediaField === 'image_urls') input.image_urls = [params.imageUrl]
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
      const input = capability.id.startsWith('seedream') ? { image_size: { width: size.width, height: size.height } } : {}
      const estimate = estimateFalCost({ capability, input, sourceArea: area })

      return estimate.usd === null ? { usd: null, basis: estimate.basis } : { usd: Math.round(estimate.usd * count * 10_000) / 10_000, basis: `${count} × ${estimate.basis}` }
    },
    async run({ prompt, image, mask, size, seed }) {
      const uploadedImage = await uploadFalFile({ bytes: image, fileName: 'base.png', contentType: 'image/png' })

      const uploadedMask = capability.mask
        ? await uploadFalFile({ bytes: await toProviderMaskPng(mask, capability.mask.convention), fileName: 'mask.png', contentType: 'image/png' })
        : null

      const result = await runFalModel<Record<string, unknown>>({
        model: capability.slug,
        input: buildFalInpaintInput(capability, { prompt, imageUrl: uploadedImage.url, maskUrl: uploadedMask?.url ?? null, size, seed })
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
