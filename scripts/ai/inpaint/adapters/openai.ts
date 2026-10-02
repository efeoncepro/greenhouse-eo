import {
  assertOpenAIImageQualitySupported,
  assertOpenAIImageSizeSupported,
  editOpenAIImage,
  estimateOpenAIImageOutputUsd,
  getOpenAIImageModelCapabilities,
  isOpenAIImageModel,
  isOpenAIImageQuality,
  OPENAI_IMAGE_MODEL_IDS,
  OPENAI_IMAGE_OUTPUT_USD_PER_MILLION,
  type OpenAIImageModel,
  type OpenAIImageQuality,
  type OpenAIImageSize
} from '@/lib/ai/openai-image'

import { pickGridSize, type PickTargetSize, type TargetSize } from '../crop'
import { toProviderMaskPng } from '../mask'

import type { ImageAdapterParams, InpaintImageAdapter } from './types'

/**
 * Adaptador OpenAI (`/v1/images/edits` con máscara) sobre el cliente canónico `editOpenAIImage`.
 *
 * Default `gpt-image-2.5-sunburst` · `high`: la guía de selección lo pone primero para edición precisa con máscara
 * (§5.1). Máscara en convención alfa: transparente = editable. El modelo redibuja la imagen entera aunque reciba la
 * máscara (medido 2026-09-17), por eso el pipeline recompone después.
 */
const DEFAULT_MODEL: OpenAIImageModel = 'gpt-image-2.5-sunburst'
const DEFAULT_QUALITY: OpenAIImageQuality = 'high'

/** Grilla extendida sin pasar a la zona experimental (> 2560×1440, guía de OpenAI 2026-09-16). */
const EXTENDED_GRID = { step: 16, minArea: 655_360, maxArea: 2560 * 1440, maxEdge: 3840, maxRatio: 3 }

const LEGACY_SIZES: readonly TargetSize[] = [
  { width: 1024, height: 1024 },
  { width: 1536, height: 1024 },
  { width: 1024, height: 1536 }
]

const asModel = (model: string): OpenAIImageModel => {
  if (!isOpenAIImageModel(model)) throw new Error(`Modelo OpenAI desconocido: "${model}". Válidos: ${OPENAI_IMAGE_MODEL_IDS.join(', ')}.`)

  return model
}

const asQuality = (quality: string | undefined): OpenAIImageQuality => {
  const value = quality ?? DEFAULT_QUALITY

  if (!isOpenAIImageQuality(value)) throw new Error(`Calidad OpenAI inválida: "${value}".`)

  return value
}

export const openAIPickSize = (model: string): PickTargetSize => {
  const { extendedSizeGrid } = getOpenAIImageModelCapabilities(asModel(model))

  if (extendedSizeGrid) return (aspect, area) => pickGridSize(aspect, area, EXTENDED_GRID)

  return aspect =>
    LEGACY_SIZES.reduce((best, size) => (Math.abs(Math.log(size.width / size.height / aspect)) < Math.abs(Math.log(best.width / best.height / aspect)) ? size : best))
}

const sizeString = (size: TargetSize) => `${size.width}x${size.height}` as OpenAIImageSize

export const openAIInpaintAdapter: InpaintImageAdapter = {
  id: 'openai',
  provider: 'openai',
  label: 'OpenAI GPT Image — edición con máscara',
  defaultModel: DEFAULT_MODEL,
  sendsMask: true,
  maskConvention: 'alpha-transparent-editable',
  // Edición con máscara medida con `pnpm ai:image --mask` (manual «editar una zona», 2026-09-16/17).
  verifiedAt: '2026-09-16',
  validate({ model, quality, seed }: ImageAdapterParams) {
    const resolved = asModel(model)

    assertOpenAIImageQualitySupported({ model: resolved, quality: asQuality(quality) })

    if (seed !== undefined) throw new Error('OpenAI no acepta semilla: quita --seed (cada candidato es una muestra distinta).')
  },
  pickSize: openAIPickSize,
  async estimate({ model, quality, size, count }) {
    const perImage = estimateOpenAIImageOutputUsd({ model: asModel(model), quality: asQuality(quality), size: sizeString(size) })

    if (perImage === null) return { usd: null, basis: `sin estimación para ${model} · ${quality ?? DEFAULT_QUALITY} · ${sizeString(size)}` }

    return {
      usd: Math.round(perImage * count * 10_000) / 10_000,
      basis: `${count} × salida ${sizeString(size)} ${quality ?? DEFAULT_QUALITY} (fórmula oficial de tokens × USD ${OPENAI_IMAGE_OUTPUT_USD_PER_MILLION}/1M; la entrada suma aparte)`
    }
  },
  async run({ prompt, image, mask, size, model, quality }) {
    const resolved = asModel(model)

    assertOpenAIImageSizeSupported({ model: resolved, size: sizeString(size) })

    const result = await editOpenAIImage({
      prompt,
      image: { bytes: image, filename: 'base.png', mimeType: 'image/png' },
      mask: { bytes: await toProviderMaskPng(mask, 'alpha-transparent-editable'), filename: 'mask.png', mimeType: 'image/png' },
      model: resolved,
      size: sizeString(size),
      quality: asQuality(quality),
      format: 'png',
      numberOfImages: 1
    })

    const outputTokens = typeof result.usage?.output_tokens === 'number' ? result.usage.output_tokens : null

    return {
      image: Buffer.from(result.imageBytesBase64, 'base64'),
      providerModel: result.model,
      outputUsd: outputTokens === null ? null : Math.round(((outputTokens * OPENAI_IMAGE_OUTPUT_USD_PER_MILLION) / 1_000_000) * 10_000) / 10_000,
      usage: (result.usage as Record<string, unknown> | null) ?? null,
      meta: { size: result.size, quality: result.quality, ...(result.modelFallbackReason ? { modelFallbackReason: result.modelFallbackReason } : {}) }
    }
  }
}
