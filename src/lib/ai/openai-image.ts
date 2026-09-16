import 'server-only'

import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'

import sharp from 'sharp'

import { resolveSecret, type SecretResolutionSource } from '@/lib/secrets/secret-manager'

export type OpenAIImageModel =
  | 'gpt-image-2.5-sunburst'
  | 'gpt-image-2.5-sunburst-2026-09-08'
  | 'gpt-image-2.5-flare'
  | 'gpt-image-2.5-flare-2026-09-08'
  | 'gpt-image-2'
  | 'gpt-image-1.5'
  | 'gpt-image-1'
  | 'gpt-image-1-mini'
export type OpenAIImageQuality = 'auto' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export type OpenAIImageFormat = 'png' | 'webp' | 'jpeg'
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

export interface GenerateOpenAIImageInput {
  prompt: string
  model?: OpenAIImageModel
  size?: OpenAIImageSize
  aspectRatio?: OpenAIImageAspectRatio
  quality?: OpenAIImageQuality
  format?: OpenAIImageFormat
  background?: OpenAIImageBackground
  numberOfImages?: number
  timeoutMs?: number
}

export interface GenerateOpenAIImageOutput {
  imageBytesBase64: string
  operation: 'generate'
  model: OpenAIImageModel
  requestedModel: OpenAIImageModel
  modelFallbackReason: string | null
  size: OpenAIImageSize
  quality: OpenAIImageQuality
  format: OpenAIImageFormat
  background: OpenAIImageBackground | null
  revisedPrompt: string | null
  usage: OpenAIImageUsage | null
  secretSource: SecretResolutionSource
}

export interface EditOpenAIImageInput {
  prompt: string
  image: OpenAIImageFileInput | OpenAIImageFileInput[]
  mask?: OpenAIImageFileInput
  model?: OpenAIImageModel
  size?: OpenAIImageSize
  aspectRatio?: OpenAIImageAspectRatio
  quality?: OpenAIImageQuality
  format?: OpenAIImageFormat
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
  /** Escalones de calidad `xhigh` y `max`, exclusivos de la familia 2.5. */
  premiumQualityTiers: boolean
  /**
   * `input_fidelity` en `/v1/images/edits`. La guía de OpenAI lo ubica bajo "Earlier GPT Image models"
   * con la frase explícita "not Sunburst or Flare": NUNCA debe viajar con un modelo 2.5, aunque siga
   * presente en el enum del schema. En 2.5 la preservación de identidad se pide por prompt.
   */
  inputFidelity: boolean
}

const OPENAI_IMAGE_MODEL_CAPABILITIES: Record<OpenAIImageModel, OpenAIImageModelCapabilities> = {
  'gpt-image-2.5-sunburst': { extendedSizeGrid: true, premiumQualityTiers: true, inputFidelity: false },
  'gpt-image-2.5-sunburst-2026-09-08': { extendedSizeGrid: true, premiumQualityTiers: true, inputFidelity: false },
  'gpt-image-2.5-flare': { extendedSizeGrid: true, premiumQualityTiers: true, inputFidelity: false },
  'gpt-image-2.5-flare-2026-09-08': { extendedSizeGrid: true, premiumQualityTiers: true, inputFidelity: false },
  'gpt-image-2': { extendedSizeGrid: true, premiumQualityTiers: false, inputFidelity: false },
  'gpt-image-1.5': { extendedSizeGrid: false, premiumQualityTiers: false, inputFidelity: true },
  'gpt-image-1': { extendedSizeGrid: false, premiumQualityTiers: false, inputFidelity: true },
  'gpt-image-1-mini': { extendedSizeGrid: false, premiumQualityTiers: false, inputFidelity: true }
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

/**
 * Contrato de tamaños custom de la grilla extendida (GPT Image 2 y 2.5), según la guía de OpenAI (2026-09-16): ambos
 * lados múltiplos de 16, borde máximo 3840, relación entre 1:3 y 3:1, área entre 655.360 y 8.294.400 píxeles (sobre
 * 2560×1440 OpenAI lo marca experimental). Los modelos anteriores sólo aceptan la grilla legacy.
 *
 * Por qué: el CLI casteaba `--size` sin validar y un tamaño inválido viajaba al API; si OpenAI lo rechaza antes o
 * después de cobrar es [sin dato], así que se corta en local.
 */
export const assertOpenAIImageSizeSupported = ({ model, size }: { model: OpenAIImageModel; size: string }): void => {
  if (size === 'auto') return

  const match = /^(\d+)x(\d+)$/.exec(size)

  if (!match) throw new Error(`--size "${size}" no es válido: usa auto o ANCHOxALTO (p. ej. 1536x1024).`)

  const width = Number(match[1])
  const height = Number(match[2])
  const { extendedSizeGrid } = OPENAI_IMAGE_MODEL_CAPABILITIES[model]

  if (!extendedSizeGrid) {
    if (!LEGACY_OPENAI_IMAGE_SIZES.has(size as OpenAIImageSize)) {
      throw new Error(`"${model}" sólo acepta ${[...LEGACY_OPENAI_IMAGE_SIZES].join(', ')}; "${size}" requiere GPT Image 2 o 2.5.`)
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

/** USD por millón de tokens de imagen de salida (Standard) — iguales para GPT Image 2 y la familia 2.5 (2026-09-16). */
export const OPENAI_IMAGE_OUTPUT_USD_PER_MILLION = 30

/** Redondeo del lado corto como la calculadora de OpenAI: .5 va al par. */
const roundHalfToEven = (value: number): number => {
  const floor = Math.floor(value)
  const diff = value - floor

  if (Math.abs(diff - 0.5) < 1e-9) return floor % 2 === 0 ? floor : floor + 1

  return Math.round(value)
}

/**
 * Tokens de imagen de SALIDA con la fórmula oficial. Reproduce lo medido en el repo: 2.5 a 1024×1024 = 196 (`low`),
 * 1.756 (`high`) y 7.024 (`max`). `null` con `auto` (no estimable) o modelos sin grilla publicada.
 */
export const estimateOpenAIImageOutputTokens = ({
  model,
  quality,
  size
}: {
  model: OpenAIImageModel
  quality: OpenAIImageQuality
  size: string
}): number | null => {
  const family = model.startsWith('gpt-image-2.5') ? 'gpt-image-2.5' : model === 'gpt-image-2' ? 'gpt-image-2' : null
  const match = /^(\d+)x(\d+)$/.exec(size)

  if (!family || !match) return null

  const longSide = OPENAI_IMAGE_TOKEN_GRID[family][quality]

  if (!longSide) return null

  const width = Number(match[1])
  const height = Number(match[2])
  const shortSide = roundHalfToEven(longSide / (Math.max(width, height) / Math.min(width, height)))

  return Math.ceil((longSide * shortSide * (2_000_000 + width * height)) / 4_000_000)
}

/** Costo estimado de salida en USD por imagen; no incluye tokens de entrada (texto, imágenes de referencia, máscara). */
export const estimateOpenAIImageOutputUsd = (params: { model: OpenAIImageModel; quality: OpenAIImageQuality; size: string }): number | null => {
  const tokens = estimateOpenAIImageOutputTokens(params)

  return tokens === null ? null : Math.round(((tokens * OPENAI_IMAGE_OUTPUT_USD_PER_MILLION) / 1_000_000) * 10_000) / 10_000
}

export const getOpenAIImageModelCapabilities = (model: OpenAIImageModel): OpenAIImageModelCapabilities =>
  OPENAI_IMAGE_MODEL_CAPABILITIES[model]

/**
 * `xhigh` y `max` existen sólo en la familia 2.5. Pedirlos a un modelo anterior falla acá, antes de la red,
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
    `OpenAI image quality "${quality}" only exists on the GPT Image 2.5 family; "${model}" supports up to "high". Models with "${quality}": ${supported.join(', ')}.`
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
export const getOpenAIImageModel = (env: NodeJS.ProcessEnv = process.env): OpenAIImageModel => {
  const requested = sanitizeEnvValue(env.OPENAI_IMAGE_MODEL)

  if (!requested) return DEFAULT_OPENAI_IMAGE_MODEL
  if (isOpenAIImageModel(requested)) return requested

  throw new Error(
    `OPENAI_IMAGE_MODEL="${requested}" is not a supported OpenAI image model. Valid models: ${OPENAI_IMAGE_MODEL_IDS.join(', ')}.`
  )
}

export const getOpenAIImageResponsesModel = (env: NodeJS.ProcessEnv = process.env): string =>
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
  format: OpenAIImageFormat
) => {
  if (background === 'transparent' && format === 'jpeg') {
    throw new Error('Transparent OpenAI image output requires PNG or WebP; JPEG cannot preserve alpha.')
  }
}

const resolveOpenAIApiKey = async () => {
  const resolution = await resolveSecret({ envVarName: 'OPENAI_API_KEY' })
  const value = resolution.value

  if (!value) {
    throw new Error('OpenAI image generation is not configured. Set OPENAI_API_KEY or OPENAI_API_KEY_SECRET_REF.')
  }

  return {
    ...resolution,
    value
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
  timeoutMs = DEFAULT_OPENAI_IMAGE_TIMEOUT_MS
}: GenerateOpenAIImageInput): Promise<GenerateOpenAIImageOutput> => {
  const normalizedPrompt = prompt.trim()

  if (!normalizedPrompt) {
    throw new Error('OpenAI image generation requires a non-empty prompt.')
  }

  assertSingleImageRequest(numberOfImages)
  assertBackgroundFormatCompatibility(background, format)

  const resolvedRequest = resolveOpenAIImageRequestModel({ model, background })

  assertOpenAIImageQualitySupported({ model: resolvedRequest.model, quality })

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
      ...(resolvedBackground ? { background: resolvedBackground } : {})
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
    secretSource: apiKeyResolution.source
  }
}

export const editOpenAIImage = async ({
  prompt,
  image,
  mask,
  model = getOpenAIImageModel(),
  aspectRatio,
  size,
  quality = DEFAULT_OPENAI_IMAGE_QUALITY,
  format = DEFAULT_OPENAI_IMAGE_FORMAT,
  background,
  inputFidelity,
  numberOfImages = 1,
  timeoutMs = DEFAULT_OPENAI_IMAGE_TIMEOUT_MS
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

  assertOpenAIImageQualitySupported({ model: resolvedRequest.model, quality })

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

  if (inputFidelity && OPENAI_IMAGE_MODEL_CAPABILITIES[resolvedRequest.model].inputFidelity) {
    formData.append('input_fidelity', inputFidelity)
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
    secretSource: apiKeyResolution.source
  }
}

export const runOpenAIImageTool = async ({
  prompt,
  model = getOpenAIImageResponsesModel(),
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
    secretSource: apiKeyResolution.source
  }
}
