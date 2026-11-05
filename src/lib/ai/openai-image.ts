import 'server-only'

import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'

import sharp from 'sharp'

import type { SecretResolutionSource } from '@/lib/secrets/secret-manager'

import type { EnvSource } from '@/types/env-source'

import { resolveOpenAIApiKey } from './openai-api-key'

export type OpenAIImageModel =
  | 'gpt-image-2.6-sunburst'
  | 'gpt-image-2.6-flare'
  | 'gpt-image-2.5-sunburst'
  | 'gpt-image-2.5-sunburst-2026-09-08'
  | 'gpt-image-2.5-flare'
  | 'gpt-image-2.5-flare-2026-09-08'
  | 'gpt-image-2'
  | 'gpt-image-2-2026-04-21'
  | 'gpt-image-1.5'
  | 'gpt-image-1'
  | 'gpt-image-1-mini'
export type OpenAIImageQuality = 'auto' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
/** Formatos raster (los únicos que admiten imágenes de entrada, transparencia y compresión). */
export type OpenAIImageFormat = 'png' | 'webp' | 'jpeg'
/** Formato de salida completo: los raster más GIF animado y SVG vectorial, exclusivos de GPT Image 2.6. */
export type OpenAIImageOutputFormat = OpenAIImageFormat | 'gif' | 'svg'
/** `complexity` de GPT Image 2.6: esfuerzo de planificación, separado de `quality`; si se omite, OpenAI usa `high`. */
export type OpenAIImageComplexity = 'low' | 'medium' | 'high'
export type OpenAIImageModeration = 'auto' | 'low'
export type OpenAIImageSvgReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'

/** SVG de GPT Image 2.6: OpenAI exige `svg.model` (verificado 2026-11-05: sin él responde 400). */
export interface OpenAIImageSvgOptions {
  /** Modelo de texto que escribe el SVG a partir del raster de referencia; se cobra aparte (`svgUsage`). */
  model: string
  reasoningEffort?: OpenAIImageSvgReasoningEffort
}

/** GIF animado de GPT Image 2.6. `size` es el tamaño de CADA cuadro; los cuadros van en una hoja interna. */
export interface OpenAIImageGifOptions {
  frameCount?: number
  frameDurationMs?: number
}
export type OpenAIImageBackground = 'auto' | 'opaque' | 'transparent'
export type OpenAIImageInputFidelity = 'low' | 'high'
export type OpenAIImageOperation = 'generate' | 'edit' | 'responses'
export type OpenAIImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
export type OpenAIImageSize =
  | 'auto'
  | '1024x1024'
  | '1024x1536'
  | '1536x1024'
  | '1152x2048'
  | '2048x1152'
  | '1536x2048'
  | '2048x1536'
  | '2048x2048'

/** Parámetros opcionales comunes a generar y editar; cada uno se valida contra la capacidad del modelo. */
interface OpenAIImageRequestOptions {
  /** GPT Image 2.6. Sin cargo propio; menor = ediciones acotadas, mayor = texto denso y layouts [oficial]. */
  complexity?: OpenAIImageComplexity
  /** 0–100, sólo `jpeg` y `webp`. */
  outputCompression?: number
  moderation?: OpenAIImageModeration
  /** Requerido cuando `format` es `svg`. */
  svg?: OpenAIImageSvgOptions
  /** Sólo cuando `format` es `gif`. */
  gif?: OpenAIImageGifOptions
}

export interface GenerateOpenAIImageInput extends OpenAIImageRequestOptions {
  prompt: string
  model?: OpenAIImageModel
  size?: OpenAIImageSize
  aspectRatio?: OpenAIImageAspectRatio
  quality?: OpenAIImageQuality
  format?: OpenAIImageOutputFormat
  background?: OpenAIImageBackground
  numberOfImages?: number
  timeoutMs?: number
}

/** Uso del modelo que escribe el SVG; se cobra a la tarifa de ESE modelo, aparte de `usage`. */
export interface OpenAIImageSvgUsage {
  model?: string
  input_tokens?: number
  output_tokens?: number
  reasoning_tokens?: number
  total_tokens?: number
}

export interface GenerateOpenAIImageOutput {
  imageBytesBase64: string
  operation: 'generate'
  model: OpenAIImageModel
  requestedModel: OpenAIImageModel
  modelFallbackReason: string | null
  size: OpenAIImageSize
  quality: OpenAIImageQuality
  format: OpenAIImageOutputFormat
  background: OpenAIImageBackground | null
  revisedPrompt: string | null
  usage: OpenAIImageUsage | null
  svgUsage: OpenAIImageSvgUsage | null
  secretSource: SecretResolutionSource
  /** Perfil de clave que pagó la llamada (`default` = greenhouse-openai-api-key). */
  keyProfile: string
}

export interface EditOpenAIImageInput extends Omit<OpenAIImageRequestOptions, 'svg'> {
  prompt: string
  image: OpenAIImageFileInput | OpenAIImageFileInput[]
  mask?: OpenAIImageFileInput
  /**
   * Capa de anotaciones (PNG transparente, mismo tamaño que la primera imagen, SIN aplanar) para edición guiada por
   * marcas. GPT Image 2.5 y 2.6 [verificado 2026-11-05 en Flare 2.5 y 2.6]. No se combina con `mask`.
   */
  markup?: OpenAIImageFileInput
  model?: OpenAIImageModel
  size?: OpenAIImageSize
  aspectRatio?: OpenAIImageAspectRatio
  quality?: OpenAIImageQuality
  /** Raster o `gif` (GIF sobre edits verificado 2026-11-05); `svg` no existe en edits. */
  format?: OpenAIImageFormat | 'gif'
  background?: OpenAIImageBackground
  inputFidelity?: OpenAIImageInputFidelity
  numberOfImages?: number
  timeoutMs?: number
}

export interface EditOpenAIImageOutput extends Omit<GenerateOpenAIImageOutput, 'operation'> {
  operation: 'edit'
}

export type OpenAIImageFileInput =
  | {
      path: string
      filename?: string
      mimeType?: string
    }
  | {
      bytes: Uint8Array | ArrayBuffer
      filename: string
      mimeType: string
    }

export type OpenAIResponsesImageInput =
  | {
      type: 'url'
      url: string
    }
  | {
      type: 'data_url'
      dataUrl: string
    }
  | {
      type: 'file_id'
      fileId: string
    }

export interface RunOpenAIImageToolInput {
  prompt: string
  model?: string
  /**
   * Modelo de imagen del tool (`tool.model`). Sin él decide OpenAI. Con 2.6, la ficha oficial dice que Responses no
   * está soportado, pero `gpt-image-2.6-flare` respondió 200 y generó el 2026-11-05: tratarlo como no garantizado.
   */
  imageModel?: OpenAIImageModel
  previousResponseId?: string
  imageInputs?: OpenAIResponsesImageInput[]
  imageGenerationCallIds?: string[]
  maskFileId?: string
  quality?: OpenAIImageQuality
  size?: OpenAIImageSize
  aspectRatio?: OpenAIImageAspectRatio
  format?: OpenAIImageFormat
  background?: OpenAIImageBackground
  action?: 'auto' | 'generate' | 'edit'
  partialImages?: 0 | 1 | 2 | 3
  timeoutMs?: number
}

export interface RunOpenAIImageToolOutput {
  imageBytesBase64: string
  operation: 'responses'
  model: string
  responseId: string | null
  imageGenerationCallId: string | null
  size: OpenAIImageSize
  quality: OpenAIImageQuality
  format: OpenAIImageFormat
  background: OpenAIImageBackground | null
  usage: OpenAIImageUsage | null
  secretSource: SecretResolutionSource
  /** Perfil de clave que pagó la llamada (`default` = greenhouse-openai-api-key). */
  keyProfile: string
}

interface OpenAIImageUsage {
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
  input_tokens_details?: {
    image_tokens?: number
    text_tokens?: number
  }
}

interface OpenAIImagesResponse {
  background?: 'opaque' | 'transparent'
  data?: Array<{
    b64_json?: string
    revised_prompt?: string
  }>
  usage?: OpenAIImageUsage
  svg_usage?: OpenAIImageSvgUsage
}

interface OpenAIResponsesImageResponse {
  id?: string
  output?: Array<{
    id?: string
    type?: string
    result?: string
  }>
  usage?: OpenAIImageUsage
}

interface OpenAIErrorResponse {
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

const OPENAI_IMAGES_GENERATIONS_URL = 'https://api.openai.com/v1/images/generations'
const OPENAI_IMAGES_EDITS_URL = 'https://api.openai.com/v1/images/edits'
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_OPENAI_IMAGE_MODEL: OpenAIImageModel = 'gpt-image-2'
const DEFAULT_OPENAI_IMAGE_RESPONSES_MODEL = 'gpt-5.5'
const DEFAULT_OPENAI_IMAGE_QUALITY: OpenAIImageQuality = 'medium'
const DEFAULT_OPENAI_IMAGE_FORMAT: OpenAIImageFormat = 'png'
const DEFAULT_OPENAI_IMAGE_TIMEOUT_MS = 125_000

/**
 * Capacidades declaradas por modelo.
 *
 * Es un `Record` y no un `Set` a propósito: TypeScript obliga a declarar las capacidades de cada modelo
 * nuevo, así que agregar uno no puede volver a degradar en silencio por olvidar un literal en una rama
 * (que es exactamente como `gpt-image-2.5-*` terminaba resuelto con la grilla de tamaños legacy).
 */
interface OpenAIImageModelCapabilities {
  /** Grilla de tamaños ampliada (2048x1152, 2048x2048, …) en vez de la legacy de tres tamaños. */
  extendedSizeGrid: boolean
  /** Escalones de calidad `xhigh` y `max`, exclusivos de las familias 2.5 y 2.6. */
  premiumQualityTiers: boolean
  /**
   * `input_fidelity` en `/v1/images/edits`. La guía de OpenAI lo ubica bajo "Earlier GPT Image models"
   * con la frase explícita "not Sunburst or Flare": NUNCA debe viajar con un modelo 2.5, aunque siga
   * presente en el enum del schema. En 2.5 la preservación de identidad se pide por prompt.
   */
  inputFidelity: boolean
  /** `complexity` (esfuerzo de planificación). Exclusivo de 2.6 [oficial 2026-11-05]. */
  complexity: boolean
  /** `output_format: "svg"` (sólo generations, exige `svg.model`). Exclusivo de 2.6 [verificado 2026-11-05]. */
  svgOutput: boolean
  /** `output_format: "gif"` (generations y edits). Exclusivo de 2.6 [verificado 2026-11-05]. */
  gifOutput: boolean
  /** `markup` en `/v1/images/edits`. 2.5 y 2.6 [verificado 2026-11-05 en Flare 2.5 y Flare 2.6]. */
  markup: boolean
  /**
   * Familia de la grilla de tokens de salida para estimar el costo. `null` = sin estimación. 2.6 NO reutiliza la de
   * 2.5: a la misma tarifa gasta 4,2× en `low` y 3,3× en `medium` (medido 2026-11-05).
   */
  tokenFamily: 'gpt-image-2' | 'gpt-image-2.5' | 'gpt-image-2.6' | null
  /** Fecha (ISO) en que OpenAI apaga el modelo; desde ese día el helper corta antes de la red. */
  shutdownDate: string | null
}

const GPT_IMAGE_2_6: OpenAIImageModelCapabilities = {
  extendedSizeGrid: true,
  premiumQualityTiers: true,
  inputFidelity: false,
  complexity: true,
  svgOutput: true,
  gifOutput: true,
  markup: true,
  tokenFamily: 'gpt-image-2.6',
  shutdownDate: null
}

const GPT_IMAGE_2_5: OpenAIImageModelCapabilities = {
  ...GPT_IMAGE_2_6,
  complexity: false,
  svgOutput: false,
  gifOutput: false,
  tokenFamily: 'gpt-image-2.5'
}

const GPT_IMAGE_2: OpenAIImageModelCapabilities = {
  ...GPT_IMAGE_2_5,
  premiumQualityTiers: false,
  markup: false,
  tokenFamily: 'gpt-image-2'
}

const GPT_IMAGE_1X: OpenAIImageModelCapabilities = {
  ...GPT_IMAGE_2,
  extendedSizeGrid: false,
  inputFidelity: true,
  tokenFamily: null,
  shutdownDate: '2026-12-01'
}

const OPENAI_IMAGE_MODEL_CAPABILITIES: Record<OpenAIImageModel, OpenAIImageModelCapabilities> = {
  'gpt-image-2.6-sunburst': GPT_IMAGE_2_6,
  'gpt-image-2.6-flare': GPT_IMAGE_2_6,
  'gpt-image-2.5-sunburst': GPT_IMAGE_2_5,
  'gpt-image-2.5-sunburst-2026-09-08': GPT_IMAGE_2_5,
  'gpt-image-2.5-flare': GPT_IMAGE_2_5,
  'gpt-image-2.5-flare-2026-09-08': GPT_IMAGE_2_5,
  'gpt-image-2': GPT_IMAGE_2,
  'gpt-image-2-2026-04-21': GPT_IMAGE_2,
  'gpt-image-1.5': GPT_IMAGE_1X,
  'gpt-image-1': { ...GPT_IMAGE_1X, shutdownDate: '2026-10-23' },
  'gpt-image-1-mini': GPT_IMAGE_1X
}

const OPENAI_IMAGE_MODELS = new Set<OpenAIImageModel>(
  Object.keys(OPENAI_IMAGE_MODEL_CAPABILITIES) as OpenAIImageModel[]
)

const PREMIUM_OPENAI_IMAGE_QUALITIES = new Set<OpenAIImageQuality>(['xhigh', 'max'])

/** Fuente única de los identificadores válidos, para el allowlist, el CLI y los mensajes de error. */
export const OPENAI_IMAGE_MODEL_IDS = Object.keys(OPENAI_IMAGE_MODEL_CAPABILITIES) as OpenAIImageModel[]

export const OPENAI_IMAGE_QUALITIES: OpenAIImageQuality[] = ['auto', 'low', 'medium', 'high', 'xhigh', 'max']

export const isOpenAIImageQuality = (value: string): value is OpenAIImageQuality =>
  (OPENAI_IMAGE_QUALITIES as string[]).includes(value)

export const OPENAI_IMAGE_BACKGROUNDS: OpenAIImageBackground[] = ['auto', 'opaque', 'transparent']

export const isOpenAIImageBackground = (value: string): value is OpenAIImageBackground =>
  (OPENAI_IMAGE_BACKGROUNDS as string[]).includes(value)

export const OPENAI_IMAGE_FORMATS: OpenAIImageFormat[] = ['png', 'jpeg', 'webp']

export const isOpenAIImageFormat = (value: string): value is OpenAIImageFormat =>
  (OPENAI_IMAGE_FORMATS as string[]).includes(value)

export const OPENAI_IMAGE_OUTPUT_FORMATS: OpenAIImageOutputFormat[] = [...OPENAI_IMAGE_FORMATS, 'gif', 'svg']

export const isOpenAIImageOutputFormat = (value: string): value is OpenAIImageOutputFormat =>
  (OPENAI_IMAGE_OUTPUT_FORMATS as string[]).includes(value)

export const OPENAI_IMAGE_COMPLEXITIES: OpenAIImageComplexity[] = ['low', 'medium', 'high']

export const isOpenAIImageComplexity = (value: string): value is OpenAIImageComplexity =>
  (OPENAI_IMAGE_COMPLEXITIES as string[]).includes(value)

export const OPENAI_IMAGE_MODERATIONS: OpenAIImageModeration[] = ['auto', 'low']

export const isOpenAIImageModeration = (value: string): value is OpenAIImageModeration =>
  (OPENAI_IMAGE_MODERATIONS as string[]).includes(value)

export const OPENAI_IMAGE_SVG_REASONING_EFFORTS: OpenAIImageSvgReasoningEffort[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']

export const isOpenAIImageSvgReasoningEffort = (value: string): value is OpenAIImageSvgReasoningEffort =>
  (OPENAI_IMAGE_SVG_REASONING_EFFORTS as string[]).includes(value)

/**
 * Rango de cuadros del GIF. La guía de OpenAI dice 2–64 y la referencia del endpoint 2–16 (contradicción oficial,
 * 2026-11-05): se acepta 2–64 y el CLI avisa sobre 16. El tope real lo pone la hoja interna (ver
 * `assertOpenAIImageSizeSupported`).
 */
export const OPENAI_IMAGE_GIF_FRAME_RANGE = { min: 2, max: 64, referenceMax: 16 } as const
export const OPENAI_IMAGE_GIF_FRAME_DURATION_RANGE = { min: 20, max: 2000 } as const

/**
 * Contrato de tamaños custom de la grilla extendida (GPT Image 2, 2.5 y 2.6; 2.6 verificado a 2048×1152 el 2026-11-05), según la guía de OpenAI (2026-09-16): ambos
 * lados múltiplos de 16, borde máximo 3840, relación entre 1:3 y 3:1, área entre 655.360 y 8.294.400 píxeles (sobre
 * 2560×1440 OpenAI lo marca experimental). Los modelos anteriores sólo aceptan la grilla legacy.
 *
 * Por qué: el CLI casteaba `--size` sin validar y un tamaño inválido viajaba al API; si OpenAI lo rechaza antes o
 * después de cobrar es [sin dato], así que se corta en local.
 */
export const assertOpenAIImageSizeSupported = ({
  model,
  size,
  format
}: {
  model: OpenAIImageModel
  size: string
  /**
   * Con `gif`, `size` es cada CUADRO y el área mínima rige la hoja interna, no el cuadro: 640×640 con 9 cuadros
   * pasó (409.600 px por cuadro, bajo el mínimo). Se validan sólo múltiplos de 16 y el borde; si la hoja no cabe,
   * OpenAI responde 400 antes de generar («No supported sheet fits N GIF frames…», verificado 2026-11-05).
   */
  format?: OpenAIImageOutputFormat
}): void => {
  if (size === 'auto') return

  if (format === 'gif') {
    const gif = /^(\d+)x(\d+)$/.exec(size)

    if (!gif) throw new Error(`--size "${size}" no es válido: usa ANCHOxALTO para el tamaño de cada cuadro del GIF.`)

    const [frameWidth, frameHeight] = [Number(gif[1]), Number(gif[2])]

    if (frameWidth % 16 !== 0 || frameHeight % 16 !== 0 || Math.max(frameWidth, frameHeight) > 3840) {
      throw new Error(`--size "${size}" no es válido para un GIF: cada cuadro debe medir múltiplos de 16 y no superar 3840.`)
    }

    return
  }

  const match = /^(\d+)x(\d+)$/.exec(size)

  if (!match) throw new Error(`--size "${size}" no es válido: usa auto o ANCHOxALTO (p. ej. 1536x1024).`)

  const width = Number(match[1])
  const height = Number(match[2])
  const { extendedSizeGrid } = OPENAI_IMAGE_MODEL_CAPABILITIES[model]

  if (!extendedSizeGrid) {
    if (!LEGACY_OPENAI_IMAGE_SIZES.has(size as OpenAIImageSize)) {
      throw new Error(`"${model}" sólo acepta ${[...LEGACY_OPENAI_IMAGE_SIZES].join(', ')}; "${size}" requiere GPT Image 2, 2.5 o 2.6.`)
    }

    return
  }

  const problems: string[] = []

  if (width % 16 !== 0 || height % 16 !== 0) problems.push('ambos lados deben ser múltiplos de 16')
  if (Math.max(width, height) > 3840) problems.push('el borde mayor no puede superar 3840')
  if (Math.max(width, height) / Math.min(width, height) > 3) problems.push('la relación no puede superar 3:1')

  const area = width * height

  if (area < 655_360 || area > 8_294_400) problems.push('el área debe estar entre 655.360 y 8.294.400 píxeles')

  if (problems.length) throw new Error(`--size "${size}" no es válido para "${model}": ${problems.join('; ')}.`)
}

/** Lado largo de la grilla de tokens por calidad (código de la calculadora oficial de OpenAI, 2026-09-16). */
const OPENAI_IMAGE_TOKEN_GRID: Readonly<Record<'gpt-image-2' | 'gpt-image-2.5', Partial<Record<OpenAIImageQuality, number>>>> = {
  'gpt-image-2': { low: 16, medium: 48, high: 96 },
  'gpt-image-2.5': { low: 16, medium: 24, high: 48, xhigh: 64, max: 96 }
}

/**
 * GPT Image 2.6 gasta más tokens de salida que 2.5 a la MISMA tarifa, y la fórmula de grilla no lo reproduce. Factor
 * empírico sobre los tokens de 2.5, medido el 2026-11-05 (`ai-generations/2026-11-05_gpt-image-2-6-canary/`):
 * `low` 824 vs 196 a 1024² y 660 vs 157 a 2048×1152 (4,2×) · `medium` 1.449 vs 439 (3,3×) · `high` 1.758 vs 1.756 ·
 * `xhigh` 3.122 vs 3.122 · `max` 7.024 vs 7.024. Flare y Sunburst gastan lo mismo. Hipótesis de 7 puntos: revalidar
 * con cada corrida (el CLI imprime el `usage` real).
 */
const GPT_IMAGE_2_6_TOKEN_FACTOR: Readonly<Partial<Record<OpenAIImageQuality, number>>> = {
  low: 4.2,
  medium: 3.3,
  high: 1,
  xhigh: 1,
  max: 1
}

/** USD por millón de tokens de imagen de salida (Standard) — iguales para GPT Image 2, 2.5 y 2.6 (2026-11-05). */
export const OPENAI_IMAGE_OUTPUT_USD_PER_MILLION = 30

/** Redondeo del lado corto como la calculadora de OpenAI: .5 va al par. */
const roundHalfToEven = (value: number): number => {
  const floor = Math.floor(value)
  const diff = value - floor

  if (Math.abs(diff - 0.5) < 1e-9) return floor % 2 === 0 ? floor : floor + 1

  return Math.round(value)
}

const gridOutputTokens = (family: 'gpt-image-2' | 'gpt-image-2.5', quality: OpenAIImageQuality, width: number, height: number): number | null => {
  const longSide = OPENAI_IMAGE_TOKEN_GRID[family][quality]

  if (!longSide) return null

  const shortSide = roundHalfToEven(longSide / (Math.max(width, height) / Math.min(width, height)))

  return Math.ceil((longSide * shortSide * (2_000_000 + width * height)) / 4_000_000)
}

/**
 * Tokens de imagen de SALIDA. GPT Image 2 y 2.5 con la fórmula oficial (reproduce 2.5 a 1024×1024 = 196 `low`, 1.756
 * `high`, 7.024 `max`); 2.6 con el factor medido sobre 2.5. `null` con `auto`, modelos sin grilla y `gif` (la hoja de
 * cuadros no sigue la fórmula: 2 cuadros de 816² = 987, 9 de 640² = 1.529, medido). Un `svg` cuesta el raster de
 * referencia (así se estima) más el modelo autor, que se cobra aparte.
 */
export const estimateOpenAIImageOutputTokens = ({
  model,
  quality,
  size,
  format
}: {
  model: OpenAIImageModel
  quality: OpenAIImageQuality
  size: string
  format?: OpenAIImageOutputFormat
}): number | null => {
  const { tokenFamily } = OPENAI_IMAGE_MODEL_CAPABILITIES[model]
  const match = /^(\d+)x(\d+)$/.exec(size)

  if (!tokenFamily || !match || format === 'gif') return null

  const width = Number(match[1])
  const height = Number(match[2])

  if (tokenFamily !== 'gpt-image-2.6') return gridOutputTokens(tokenFamily, quality, width, height)

  const base = gridOutputTokens('gpt-image-2.5', quality, width, height)
  const factor = GPT_IMAGE_2_6_TOKEN_FACTOR[quality]

  return base === null || factor === undefined ? null : Math.ceil(base * factor)
}

/** Costo estimado de salida en USD por imagen; no incluye tokens de entrada (texto, imágenes de referencia, máscara). */
export const estimateOpenAIImageOutputUsd = (params: {
  model: OpenAIImageModel
  quality: OpenAIImageQuality
  size: string
  format?: OpenAIImageOutputFormat
}): number | null => {
  const tokens = estimateOpenAIImageOutputTokens(params)

  return tokens === null ? null : Math.round(((tokens * OPENAI_IMAGE_OUTPUT_USD_PER_MILLION) / 1_000_000) * 10_000) / 10_000
}

export const getOpenAIImageModelCapabilities = (model: OpenAIImageModel): OpenAIImageModelCapabilities =>
  OPENAI_IMAGE_MODEL_CAPABILITIES[model]

/** Modelos que declaran una capacidad: fuente única para la ayuda del CLI y los mensajes de error. */
type OpenAIImageBooleanCapability = {
  [K in keyof OpenAIImageModelCapabilities]: OpenAIImageModelCapabilities[K] extends boolean ? K : never
}[keyof OpenAIImageModelCapabilities]

export const openAIImageModelsWith = (capability: OpenAIImageBooleanCapability): OpenAIImageModel[] =>
  OPENAI_IMAGE_MODEL_IDS.filter(model => OPENAI_IMAGE_MODEL_CAPABILITIES[model][capability])

/**
 * Corta antes de la red un modelo que OpenAI ya apagó (`gpt-image-1` el 2026-10-23; 1.5 y 1-mini el 2026-12-01).
 * `today` es inyectable para test.
 */
export const assertOpenAIImageModelAvailable = (model: OpenAIImageModel, today: string = new Date().toISOString().slice(0, 10)) => {
  const { shutdownDate } = OPENAI_IMAGE_MODEL_CAPABILITIES[model]

  if (shutdownDate && today >= shutdownDate) {
    throw new Error(`"${model}" se apagó el ${shutdownDate} (deprecación de OpenAI). Usa gpt-image-2.5-flare o gpt-image-2.6-flare.`)
  }
}

const describeModels = (capability: OpenAIImageBooleanCapability) => openAIImageModelsWith(capability).join(', ')

/**
 * Valida, antes de la red, las opciones nuevas contra la capacidad declarada del modelo. Es la fuente única que usan
 * el helper, el CLI `ai:image` y el adaptador de `ai:inpaint`: un pedido que el modelo no soporta falla acá con la
 * alternativa, en vez de viajar y gastar (o de descartarse en silencio, que es peor).
 */
export const assertOpenAIImageOptionsSupported = ({
  model,
  operation,
  format = DEFAULT_OPENAI_IMAGE_FORMAT,
  background,
  complexity,
  outputCompression,
  moderation,
  svg,
  gif,
  hasMask = false,
  hasMarkup = false
}: OpenAIImageRequestOptions & {
  model: OpenAIImageModel
  operation: 'generate' | 'edit'
  format?: OpenAIImageOutputFormat
  background?: OpenAIImageBackground
  hasMask?: boolean
  hasMarkup?: boolean
}) => {
  const capabilities = OPENAI_IMAGE_MODEL_CAPABILITIES[model]

  if (!isOpenAIImageOutputFormat(format)) {
    throw new Error(`Formato "${format}" no válido. Opciones: ${OPENAI_IMAGE_OUTPUT_FORMATS.join(', ')}.`)
  }

  if (complexity !== undefined) {
    if (!isOpenAIImageComplexity(complexity)) throw new Error(`complexity "${complexity}" no válida. Opciones: ${OPENAI_IMAGE_COMPLEXITIES.join(', ')}.`)
    if (!capabilities.complexity) throw new Error(`"${model}" no acepta complexity; sólo ${describeModels('complexity')}.`)
  }

  if (moderation !== undefined && !isOpenAIImageModeration(moderation)) {
    throw new Error(`moderation "${moderation}" no válida. Opciones: ${OPENAI_IMAGE_MODERATIONS.join(', ')}.`)
  }

  if (outputCompression !== undefined) {
    if (!Number.isInteger(outputCompression) || outputCompression < 0 || outputCompression > 100) {
      throw new Error(`output_compression debe ser un entero entre 0 y 100 (recibido: ${outputCompression}).`)
    }

    if (format !== 'jpeg' && format !== 'webp') throw new Error(`output_compression sólo aplica a jpeg y webp (formato: ${format}).`)
  }

  if (format === 'svg') {
    if (!capabilities.svgOutput) throw new Error(`"${model}" no genera SVG; sólo ${describeModels('svgOutput')}.`)
    if (operation === 'edit') throw new Error('SVG sólo existe al generar: /v1/images/edits no devuelve SVG.')
    if (!svg?.model?.trim()) throw new Error('SVG exige svg.model, el modelo de texto que escribe el vector (p. ej. gpt-5.5).')

    if (svg.reasoningEffort !== undefined && !isOpenAIImageSvgReasoningEffort(svg.reasoningEffort)) {
      throw new Error(`svg.reasoning.effort "${svg.reasoningEffort}" no válido. Opciones: ${OPENAI_IMAGE_SVG_REASONING_EFFORTS.join(', ')}.`)
    }
  } else if (svg) {
    throw new Error('Las opciones svg sólo aplican con formato svg.')
  }

  if (format === 'gif') {
    if (!capabilities.gifOutput) throw new Error(`"${model}" no genera GIF; sólo ${describeModels('gifOutput')}.`)
    if (hasMask || hasMarkup) throw new Error('El GIF no admite mask ni markup.')

    const { frameCount, frameDurationMs } = gif ?? {}

    if (frameCount !== undefined && (!Number.isInteger(frameCount) || frameCount < OPENAI_IMAGE_GIF_FRAME_RANGE.min || frameCount > OPENAI_IMAGE_GIF_FRAME_RANGE.max)) {
      throw new Error(`frame_count debe ser un entero entre ${OPENAI_IMAGE_GIF_FRAME_RANGE.min} y ${OPENAI_IMAGE_GIF_FRAME_RANGE.max} (recibido: ${frameCount}).`)
    }

    if (
      frameDurationMs !== undefined &&
      (!Number.isInteger(frameDurationMs) || frameDurationMs < OPENAI_IMAGE_GIF_FRAME_DURATION_RANGE.min || frameDurationMs > OPENAI_IMAGE_GIF_FRAME_DURATION_RANGE.max)
    ) {
      throw new Error(
        `frame_duration_ms debe ser un entero entre ${OPENAI_IMAGE_GIF_FRAME_DURATION_RANGE.min} y ${OPENAI_IMAGE_GIF_FRAME_DURATION_RANGE.max} (recibido: ${frameDurationMs}).`
      )
    }
  } else if (gif) {
    throw new Error('Las opciones de GIF (cuadros, duración) sólo aplican con formato gif.')
  }

  if (background === 'transparent' && format === 'jpeg') {
    throw new Error('Transparent OpenAI image output requires PNG or WebP; JPEG cannot preserve alpha.')
  }

  if (hasMarkup) {
    if (operation !== 'edit') throw new Error('markup sólo existe al editar: pásalo junto a la imagen base.')
    if (!capabilities.markup) throw new Error(`"${model}" no acepta markup; sólo ${describeModels('markup')}.`)
    if (hasMask) throw new Error('markup no se combina con mask (regla de OpenAI): usa una de las dos.')
  }
}

export const OPENAI_IMAGE_INPUT_FIDELITIES: OpenAIImageInputFidelity[] = ['low', 'high']

export const isOpenAIImageInputFidelity = (value: string): value is OpenAIImageInputFidelity =>
  (OPENAI_IMAGE_INPUT_FIDELITIES as string[]).includes(value)

/**
 * `input_fidelity` sólo existe en los modelos que lo declaran. Antes se descartaba en silencio con la familia 2.5: el
 * pedido salía sin el parámetro y quien lo pidió creía que la fidelidad estaba aplicada (así llegó «--input-fidelity
 * high» a un método canónico, a sus tokens y a su documentación, el 2026-09-27). Ahora falla acá, antes de la red, con
 * la alternativa: en 2.5 la preservación se pide por prompt.
 */
export const assertOpenAIImageInputFidelitySupported = ({
  model,
  inputFidelity
}: {
  model: OpenAIImageModel
  inputFidelity?: OpenAIImageInputFidelity
}) => {
  if (inputFidelity === undefined) return

  if (!isOpenAIImageInputFidelity(inputFidelity)) {
    throw new Error(`OpenAI image input fidelity "${inputFidelity}" is not valid. Use one of: ${OPENAI_IMAGE_INPUT_FIDELITIES.join(', ')}.`)
  }

  if (OPENAI_IMAGE_MODEL_CAPABILITIES[model].inputFidelity) return

  throw new Error(
    `"${model}" does not accept input_fidelity; ask for preservation in the prompt instead (e.g. "keep the exact silhouette"). Models with input_fidelity: ${openAIImageModelsWith('inputFidelity').join(', ')}.`
  )
}

/**
 * `xhigh` y `max` existen sólo en las familias 2.5 y 2.6. Pedirlos a un modelo anterior falla acá, antes de la red,
 * en vez de gastar un request que el proveedor rechaza.
 */
export const assertOpenAIImageQualitySupported = ({
  model,
  quality
}: {
  model: OpenAIImageModel
  quality: OpenAIImageQuality
}) => {
  if (!PREMIUM_OPENAI_IMAGE_QUALITIES.has(quality)) return
  if (OPENAI_IMAGE_MODEL_CAPABILITIES[model].premiumQualityTiers) return

  const supported = (Object.keys(OPENAI_IMAGE_MODEL_CAPABILITIES) as OpenAIImageModel[]).filter(
    candidate => OPENAI_IMAGE_MODEL_CAPABILITIES[candidate].premiumQualityTiers
  )

  throw new Error(
    `OpenAI image quality "${quality}" only exists on the GPT Image 2.5 and 2.6 families; "${model}" supports up to "high". Models with "${quality}": ${supported.join(', ')}.`
  )
}

const LEGACY_OPENAI_IMAGE_SIZES = new Set<OpenAIImageSize>(['auto', '1024x1024', '1024x1536', '1536x1024'])
const MAX_OPENAI_IMAGE_INPUTS = 16
const MAX_OPENAI_IMAGE_INPUT_BYTES = 50 * 1024 * 1024

const sanitizeEnvValue = (value: string | undefined) => value?.trim() || null

export const isOpenAIImageModel = (value: string): value is OpenAIImageModel =>
  OPENAI_IMAGE_MODELS.has(value as OpenAIImageModel)

/**
 * Un `OPENAI_IMAGE_MODEL` desconocido **lanza**. Antes devolvía el default en silencio, así que pedir
 * `gpt-image-2.5-flare` generaba con `gpt-image-2` y se pagaba otro modelo del que se creía. Fallar acá es
 * ruidoso al arranque del consumer, que es exactamente donde se quiere descubrir una env mal escrita.
 */
export const getOpenAIImageModel = (env: EnvSource = process.env): OpenAIImageModel => {
  const requested = sanitizeEnvValue(env.OPENAI_IMAGE_MODEL)

  if (!requested) return DEFAULT_OPENAI_IMAGE_MODEL
  if (isOpenAIImageModel(requested)) return requested

  throw new Error(
    `OPENAI_IMAGE_MODEL="${requested}" is not a supported OpenAI image model. Valid models: ${OPENAI_IMAGE_MODEL_IDS.join(', ')}.`
  )
}

export const getOpenAIImageResponsesModel = (env: EnvSource = process.env): string =>
  sanitizeEnvValue(env.OPENAI_IMAGE_RESPONSES_MODEL) || DEFAULT_OPENAI_IMAGE_RESPONSES_MODEL

export const resolveOpenAIImageSize = ({
  model,
  size,
  aspectRatio = '16:9'
}: {
  model: OpenAIImageModel
  size?: OpenAIImageSize
  aspectRatio?: OpenAIImageAspectRatio
}): OpenAIImageSize => {
  const { extendedSizeGrid } = OPENAI_IMAGE_MODEL_CAPABILITIES[model]

  if (size) {
    if (extendedSizeGrid || LEGACY_OPENAI_IMAGE_SIZES.has(size)) {
      return size
    }

    return size.includes('1536x') ? '1024x1536' : size.includes('x1536') ? '1536x1024' : 'auto'
  }

  if (!extendedSizeGrid) {
    switch (aspectRatio) {
      case '1:1':
        return '1024x1024'
      case '9:16':
      case '3:4':
        return '1024x1536'
      case '16:9':
      case '4:3':
      default:
        return '1536x1024'
    }
  }

  switch (aspectRatio) {
    case '1:1':
      return '2048x2048'
    case '9:16':
      return '1152x2048'
    case '3:4':
      return '1536x2048'
    case '4:3':
      return '2048x1536'
    case '16:9':
    default:
      return '2048x1152'
  }
}

export const resolveOpenAIImageBackground = ({
  background
}: {
  model: OpenAIImageModel
  background?: OpenAIImageBackground
}): OpenAIImageBackground | null => {
  return background ?? null
}

export const resolveOpenAIImageRequestModel = ({
  model
}: {
  model: OpenAIImageModel
  background?: OpenAIImageBackground
}): {
  model: OpenAIImageModel
  requestedModel: OpenAIImageModel
  modelFallbackReason: string | null
} => {
  return {
    model,
    requestedModel: model,
    modelFallbackReason: null
  }
}

const assertSingleImageRequest = (value: number | undefined) => {
  if (value === undefined || value === 1) return

  throw new Error('This OpenAI image helper returns one image. Use one request per output instead of numberOfImages > 1.')
}

const assertBackgroundFormatCompatibility = (
  background: OpenAIImageBackground | undefined,
  format: OpenAIImageOutputFormat
) => {
  if (background === 'transparent' && format === 'jpeg') {
    throw new Error('Transparent OpenAI image output requires PNG or WebP; JPEG cannot preserve alpha.')
  }
}

const mimeTypeFromFilename = (filename: string): string => {
  switch (extname(filename).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    case '.png':
    default:
      return 'image/png'
  }
}

const resolveOpenAIImageFile = async (input: OpenAIImageFileInput) => {
  if ('path' in input) {
    const bytes = await readFile(input.path)
    const filename = input.filename?.trim() || basename(input.path)
    const mimeType = input.mimeType?.trim() || mimeTypeFromFilename(filename)

    if (bytes.byteLength > MAX_OPENAI_IMAGE_INPUT_BYTES) {
      throw new Error(`OpenAI image input "${filename}" exceeds the 50MB limit.`)
    }

    return {
      bytes: new Uint8Array(bytes),
      blob: new Blob([new Uint8Array(bytes)], { type: mimeType }),
      filename,
      mimeType
    }
  }

  const bytes = input.bytes instanceof ArrayBuffer ? new Uint8Array(input.bytes) : input.bytes

  if (bytes.byteLength > MAX_OPENAI_IMAGE_INPUT_BYTES) {
    throw new Error(`OpenAI image input "${input.filename}" exceeds the 50MB limit.`)
  }

  return {
    bytes: new Uint8Array(bytes),
    blob: new Blob([new Uint8Array(bytes)], { type: input.mimeType }),
    filename: input.filename,
    mimeType: input.mimeType
  }
}

const assertMaskMatchesPrimaryImage = async ({
  image,
  mask
}: {
  image: Awaited<ReturnType<typeof resolveOpenAIImageFile>>
  mask: Awaited<ReturnType<typeof resolveOpenAIImageFile>>
}) => {
  if (image.mimeType !== mask.mimeType) {
    throw new Error('OpenAI image mask must use the same format as the first image input.')
  }

  const [imageMetadata, maskMetadata] = await Promise.all([
    sharp(image.bytes).metadata(),
    sharp(mask.bytes).metadata()
  ])

  if (!imageMetadata.width || !imageMetadata.height || !maskMetadata.width || !maskMetadata.height) {
    throw new Error('OpenAI image mask and first image must have readable dimensions.')
  }

  if (imageMetadata.width !== maskMetadata.width || imageMetadata.height !== maskMetadata.height) {
    throw new Error('OpenAI image mask must have the same dimensions as the first image input.')
  }
}

/**
 * La capa de markup va a la escala de la primera imagen y con alfa: aplanada sobre la foto, OpenAI no puede separar
 * la anotación de la escena (regla de la guía). Se valida antes de gastar.
 */
const assertMarkupMatchesPrimaryImage = async ({
  image,
  markup
}: {
  image: Awaited<ReturnType<typeof resolveOpenAIImageFile>>
  markup: Awaited<ReturnType<typeof resolveOpenAIImageFile>>
}) => {
  const [imageMetadata, markupMetadata] = await Promise.all([sharp(image.bytes).metadata(), sharp(markup.bytes).metadata()])

  if (markupMetadata.format !== 'png' || !markupMetadata.hasAlpha) {
    throw new Error('markup debe ser un PNG con canal alfa (anotaciones sobre fondo transparente), sin aplanar sobre la foto.')
  }

  if (imageMetadata.width !== markupMetadata.width || imageMetadata.height !== markupMetadata.height) {
    throw new Error(
      `markup debe medir lo mismo que la primera imagen (${imageMetadata.width}x${imageMetadata.height}); mide ${markupMetadata.width}x${markupMetadata.height}.`
    )
  }

  if ((markupMetadata.width ?? 0) * (markupMetadata.height ?? 0) > 16_777_216) {
    throw new Error('markup supera 16.777.216 píxeles (límite de OpenAI).')
  }
}

/** Campos opcionales del cuerpo: sólo viajan cuando se piden, para no alterar los pedidos existentes. */
const optionalRequestFields = ({
  complexity,
  outputCompression,
  moderation,
  svg,
  gif
}: OpenAIImageRequestOptions): Record<string, unknown> => ({
  ...(complexity ? { complexity } : {}),
  ...(outputCompression !== undefined ? { output_compression: outputCompression } : {}),
  ...(moderation ? { moderation } : {}),
  ...(svg ? { svg: { model: svg.model.trim(), ...(svg.reasoningEffort ? { reasoning: { effort: svg.reasoningEffort } } : {}) } } : {}),
  ...(gif?.frameCount !== undefined ? { frame_count: gif.frameCount } : {}),
  ...(gif?.frameDurationMs !== undefined ? { frame_duration_ms: gif.frameDurationMs } : {})
})

const parseOpenAIError = async (response: Response) => {
  const body = await response.text().catch(() => '')

  if (!body) {
    return `OpenAI image generation failed with HTTP ${response.status}.`
  }

  try {
    const parsed = JSON.parse(body) as OpenAIErrorResponse
    const message = parsed.error?.message?.trim()
    const type = parsed.error?.type?.trim()
    const code = parsed.error?.code?.trim()
    const suffix = [type, code].filter(Boolean).join('/')

    return suffix ? `OpenAI image generation failed: ${message || response.statusText} (${suffix}).` : `OpenAI image generation failed: ${message || response.statusText}.`
  } catch {
    return `OpenAI image generation failed with HTTP ${response.status}.`
  }
}

const postOpenAIJson = async <TResponse>({
  apiKey,
  body,
  timeoutMs,
  url
}: {
  apiKey: string
  body: unknown
  timeoutMs: number
  url: string
}): Promise<TResponse> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  })

  if (!response.ok) {
    throw new Error(await parseOpenAIError(response))
  }

  return await response.json() as TResponse
}

const postOpenAIFormData = async <TResponse>({
  apiKey,
  formData,
  timeoutMs,
  url
}: {
  apiKey: string
  formData: FormData
  timeoutMs: number
  url: string
}): Promise<TResponse> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData,
    signal: AbortSignal.timeout(timeoutMs)
  })

  if (!response.ok) {
    throw new Error(await parseOpenAIError(response))
  }

  return await response.json() as TResponse
}

const firstImageFromImagesResponse = (payload: OpenAIImagesResponse) => {
  const firstImage = payload.data?.[0]
  const imageBytesBase64 = firstImage?.b64_json?.trim()

  if (!imageBytesBase64) {
    throw new Error('OpenAI returned no image data. The prompt may have been filtered by safety controls.')
  }

  return {
    imageBytesBase64,
    revisedPrompt: firstImage?.revised_prompt?.trim() || null
  }
}

const buildResponsesInput = ({
  prompt,
  imageInputs = [],
  imageGenerationCallIds = []
}: Pick<RunOpenAIImageToolInput, 'prompt' | 'imageInputs' | 'imageGenerationCallIds'>) => {
  const content: Array<Record<string, string>> = [{ type: 'input_text', text: prompt }]

  for (const imageInput of imageInputs) {
    if (imageInput.type === 'file_id') {
      content.push({ type: 'input_image', file_id: imageInput.fileId })
    } else {
      content.push({
        type: 'input_image',
        image_url: imageInput.type === 'url' ? imageInput.url : imageInput.dataUrl
      })
    }
  }

  const callReferences = imageGenerationCallIds.map(id => ({
    type: 'image_generation_call',
    id
  }))

  if (!imageInputs.length && !callReferences.length) {
    return prompt
  }

  return [
    {
      role: 'user',
      content
    },
    ...callReferences
  ]
}

export const generateOpenAIImage = async ({
  prompt,
  model = getOpenAIImageModel(),
  aspectRatio,
  size,
  quality = DEFAULT_OPENAI_IMAGE_QUALITY,
  format = DEFAULT_OPENAI_IMAGE_FORMAT,
  background,
  numberOfImages = 1,
  timeoutMs = DEFAULT_OPENAI_IMAGE_TIMEOUT_MS,
  ...options
}: GenerateOpenAIImageInput): Promise<GenerateOpenAIImageOutput> => {
  const normalizedPrompt = prompt.trim()

  if (!normalizedPrompt) {
    throw new Error('OpenAI image generation requires a non-empty prompt.')
  }

  assertSingleImageRequest(numberOfImages)
  assertBackgroundFormatCompatibility(background, format)

  const resolvedRequest = resolveOpenAIImageRequestModel({ model, background })

  assertOpenAIImageModelAvailable(resolvedRequest.model)
  assertOpenAIImageQualitySupported({ model: resolvedRequest.model, quality })
  assertOpenAIImageOptionsSupported({ model: resolvedRequest.model, operation: 'generate', format, background, ...options })

  const resolvedSize = resolveOpenAIImageSize({ model: resolvedRequest.model, size, aspectRatio })

  const resolvedBackground = resolveOpenAIImageBackground({
    model: resolvedRequest.model,
    background
  })

  const apiKeyResolution = await resolveOpenAIApiKey()

  const payload = await postOpenAIJson<OpenAIImagesResponse>({
    url: OPENAI_IMAGES_GENERATIONS_URL,
    apiKey: apiKeyResolution.value,
    timeoutMs,
    body: {
      model: resolvedRequest.model,
      prompt: normalizedPrompt,
      n: 1,
      size: resolvedSize,
      quality,
      output_format: format,
      ...(resolvedBackground ? { background: resolvedBackground } : {}),
      ...optionalRequestFields(options)
    }
  })

  const generated = firstImageFromImagesResponse(payload)

  return {
    imageBytesBase64: generated.imageBytesBase64,
    operation: 'generate',
    model: resolvedRequest.model,
    requestedModel: resolvedRequest.requestedModel,
    modelFallbackReason: resolvedRequest.modelFallbackReason,
    size: resolvedSize,
    quality,
    format,
    background: payload.background ?? resolvedBackground,
    revisedPrompt: generated.revisedPrompt,
    usage: payload.usage ?? null,
    svgUsage: payload.svg_usage ?? null,
    secretSource: apiKeyResolution.source,
    keyProfile: apiKeyResolution.profile
  }
}

export const editOpenAIImage = async ({
  prompt,
  image,
  mask,
  markup,
  model = getOpenAIImageModel(),
  aspectRatio,
  size,
  quality = DEFAULT_OPENAI_IMAGE_QUALITY,
  format = DEFAULT_OPENAI_IMAGE_FORMAT,
  background,
  inputFidelity,
  numberOfImages = 1,
  timeoutMs = DEFAULT_OPENAI_IMAGE_TIMEOUT_MS,
  ...options
}: EditOpenAIImageInput): Promise<EditOpenAIImageOutput> => {
  const normalizedPrompt = prompt.trim()

  if (!normalizedPrompt) {
    throw new Error('OpenAI image editing requires a non-empty prompt.')
  }


  assertSingleImageRequest(numberOfImages)
  assertBackgroundFormatCompatibility(background, format)

  const imageInputs = Array.isArray(image) ? image : [image]

  if (!imageInputs.length) {
    throw new Error('OpenAI image editing requires at least one image input.')
  }

  if (imageInputs.length > MAX_OPENAI_IMAGE_INPUTS) {
    throw new Error(`OpenAI image editing supports at most ${MAX_OPENAI_IMAGE_INPUTS} input images per request.`)
  }

  const resolvedRequest = resolveOpenAIImageRequestModel({ model, background })

  assertOpenAIImageModelAvailable(resolvedRequest.model)
  assertOpenAIImageQualitySupported({ model: resolvedRequest.model, quality })
  assertOpenAIImageInputFidelitySupported({ model: resolvedRequest.model, inputFidelity })
  assertOpenAIImageOptionsSupported({
    model: resolvedRequest.model,
    operation: 'edit',
    format,
    background,
    hasMask: Boolean(mask),
    hasMarkup: Boolean(markup),
    ...options
  })

  const resolvedSize = resolveOpenAIImageSize({ model: resolvedRequest.model, size, aspectRatio })

  const resolvedBackground = resolveOpenAIImageBackground({
    model: resolvedRequest.model,
    background
  })

  const apiKeyResolution = await resolveOpenAIApiKey()
  const formData = new FormData()

  formData.append('model', resolvedRequest.model)
  formData.append('prompt', normalizedPrompt)
  formData.append('n', '1')
  formData.append('size', resolvedSize)
  formData.append('quality', quality)
  formData.append('output_format', format)

  if (resolvedBackground) {
    formData.append('background', resolvedBackground)
  }

  if (inputFidelity) {
    formData.append('input_fidelity', inputFidelity)
  }

  for (const [field, value] of Object.entries(optionalRequestFields(options))) {
    formData.append(field, String(value))
  }

  const resolvedImageInputs = await Promise.all(imageInputs.map(resolveOpenAIImageFile))

  for (const file of resolvedImageInputs) {

    formData.append(imageInputs.length > 1 ? 'image[]' : 'image', file.blob, file.filename)
  }

  if (mask) {
    const maskFile = await resolveOpenAIImageFile(mask)

    await assertMaskMatchesPrimaryImage({ image: resolvedImageInputs[0], mask: maskFile })

    formData.append('mask', maskFile.blob, maskFile.filename)
  }

  if (markup) {
    const markupFile = await resolveOpenAIImageFile(markup)

    await assertMarkupMatchesPrimaryImage({ image: resolvedImageInputs[0], markup: markupFile })

    formData.append('markup', markupFile.blob, markupFile.filename)
  }

  const payload = await postOpenAIFormData<OpenAIImagesResponse>({
    url: OPENAI_IMAGES_EDITS_URL,
    apiKey: apiKeyResolution.value,
    timeoutMs,
    formData
  })

  const edited = firstImageFromImagesResponse(payload)

  return {
    imageBytesBase64: edited.imageBytesBase64,
    operation: 'edit',
    model: resolvedRequest.model,
    requestedModel: resolvedRequest.requestedModel,
    modelFallbackReason: resolvedRequest.modelFallbackReason,
    size: resolvedSize,
    quality,
    format,
    background: payload.background ?? resolvedBackground,
    revisedPrompt: edited.revisedPrompt,
    usage: payload.usage ?? null,
    svgUsage: null,
    secretSource: apiKeyResolution.source,
    keyProfile: apiKeyResolution.profile
  }
}

export const runOpenAIImageTool = async ({
  prompt,
  model = getOpenAIImageResponsesModel(),
  imageModel,
  previousResponseId,
  imageInputs,
  imageGenerationCallIds,
  maskFileId,
  quality = DEFAULT_OPENAI_IMAGE_QUALITY,
  aspectRatio,
  size,
  format = DEFAULT_OPENAI_IMAGE_FORMAT,
  background,
  action = 'auto',
  partialImages,
  timeoutMs = DEFAULT_OPENAI_IMAGE_TIMEOUT_MS
}: RunOpenAIImageToolInput): Promise<RunOpenAIImageToolOutput> => {
  const normalizedPrompt = prompt.trim()

  if (!normalizedPrompt) {
    throw new Error('OpenAI Responses image generation requires a non-empty prompt.')
  }


  assertBackgroundFormatCompatibility(background, format)

  if (partialImages && partialImages > 0) {
    throw new Error('OpenAI partial images require an SSE streaming transport, which this final-result helper does not implement.')
  }

  const resolvedSize = size ?? resolveOpenAIImageSize({ model: 'gpt-image-2', aspectRatio })
  const apiKeyResolution = await resolveOpenAIApiKey()

  const tool: Record<string, unknown> = {
    type: 'image_generation',
    quality,
    size: resolvedSize,
    output_format: format,
    action
  }

  if (imageModel) {
    assertOpenAIImageModelAvailable(imageModel)
    tool.model = imageModel
  }

  if (background) {
    tool.background = background
  }

  if (maskFileId?.trim()) {
    tool.input_image_mask = { file_id: maskFileId.trim() }
  }

  const payload = await postOpenAIJson<OpenAIResponsesImageResponse>({
    url: OPENAI_RESPONSES_URL,
    apiKey: apiKeyResolution.value,
    timeoutMs,
    body: {
      model,
      input: buildResponsesInput({
        prompt: normalizedPrompt,
        imageInputs,
        imageGenerationCallIds
      }),
      tools: [tool],
      ...(previousResponseId?.trim() ? { previous_response_id: previousResponseId.trim() } : {})
    }
  })

  const imageCall = payload.output?.find(output => output.type === 'image_generation_call')
  const imageBytesBase64 = imageCall?.result?.trim()

  if (!imageBytesBase64) {
    throw new Error('OpenAI Responses returned no image generation result.')
  }

  return {
    imageBytesBase64,
    operation: 'responses',
    model,
    responseId: payload.id?.trim() || null,
    imageGenerationCallId: imageCall?.id?.trim() || null,
    size: resolvedSize,
    quality,
    format,
    background: background ?? null,
    usage: payload.usage ?? null,
    secretSource: apiKeyResolution.source,
    keyProfile: apiKeyResolution.profile
  }
}
