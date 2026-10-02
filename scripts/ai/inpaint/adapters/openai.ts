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
 * Adaptador OpenAI (`/v1/images/edits`) sobre el cliente canónico `editOpenAIImage`.
 *
 * Default `gpt-image-2.5-flare` · `medium`, con máscara. Sunburst es el modelo de las piezas más impactantes, pero
 * CON MÁSCARA devolvió la zona totalmente editable como un PANEL NEGRO PLANO en las tres pasadas medidas
 * (2026-09-23 y dos en el canario de TASK-1965 del 2026-10-02; no depende del color bajo el alfa). Por eso, con
 * `providerMask: 'auto'` Sunburst edita SIN máscara —por instrucción, la imagen entera— y el pipeline recompone sólo
 * la zona: se conserva su calidad sin la trampa. Máscara en convención alfa: transparente = editable. Con o sin
 * máscara el modelo redibuja todo (hasta 179/255 en la zona protegida, medido), así que recomponer no es opcional.
 */
const DEFAULT_MODEL: OpenAIImageModel = 'gpt-image-2.5-flare'
const DEFAULT_QUALITY: OpenAIImageQuality = 'medium'

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

const isSunburst = (model: string) => model.startsWith('gpt-image-2.5-sunburst')

/** `auto`: Sunburst sin máscara (su edición con máscara devuelve un panel negro); el resto, con máscara. */
export const resolveOpenAIProviderMask = (model: string, mode: ImageAdapterParams['providerMask']): boolean =>
  mode === 'on' ? true : mode === 'off' ? false : !isSunburst(model)

export const openAIInpaintAdapter: InpaintImageAdapter = {
  id: 'openai',
  provider: 'openai',
  label: 'OpenAI GPT Image — edición con máscara',
  defaultModel: DEFAULT_MODEL,
  sendsMask: true,
  maskConvention: 'alpha-transparent-editable',
  // Canario real con Flare a `medium`: planta puesta y zona protegida en delta 0 (TASK-1965, 2026-10-02).
  verifiedAt: '2026-10-02',
  revision: 1,
  validate({ model, quality, seed }: ImageAdapterParams) {
    const resolved = asModel(model)

    assertOpenAIImageQualitySupported({ model: resolved, quality: asQuality(quality) })

    if (seed !== undefined) throw new Error('OpenAI no acepta semilla: quita --seed (cada candidato es una muestra distinta).')
  },
  advisories({ model, providerMask }) {
    if (!isSunburst(model)) return []

    return resolveOpenAIProviderMask(model, providerMask)
      ? ['Sunburst CON máscara devolvió la zona editable como un panel negro plano en 3 de 3 pasadas medidas. Usa --provider-mask auto (default): edita sin máscara y el pipeline recompone.']
      : ['Sunburst edita sin máscara (por instrucción, la imagen entera); el pipeline recompone sólo la zona. Pide en el prompt que no cambie el encuadre.']
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
  async run({ prompt, image, extraImages = [], mask, size, model, quality, providerMask }) {
    const resolved = asModel(model)
    const sendMask = resolveOpenAIProviderMask(resolved, providerMask)

    assertOpenAIImageSizeSupported({ model: resolved, size: sizeString(size) })

    const result = await editOpenAIImage({
      prompt,
      // Varias imágenes: la máscara se aplica a la primera (guía de OpenAI); el resto son boceto y referencias.
      image: [image, ...extraImages].map((bytes, index) => ({ bytes, filename: index === 0 ? 'base.png' : `ref-${index}.png`, mimeType: 'image/png' })),
      ...(sendMask ? { mask: { bytes: await toProviderMaskPng(mask, 'alpha-transparent-editable'), filename: 'mask.png', mimeType: 'image/png' } } : {}),
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
      meta: { size: result.size, quality: result.quality, providerMask: sendMask, ...(result.modelFallbackReason ? { modelFallbackReason: result.modelFallbackReason } : {}) }
    }
  }
}
