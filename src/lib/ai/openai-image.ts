import 'server-only'

import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'

import sharp from 'sharp'

import { resolveSecret, type SecretResolutionSource } from '@/lib/secrets/secret-manager'

export type OpenAIImageModel = 'gpt-image-2' | 'gpt-image-1.5' | 'gpt-image-1' | 'gpt-image-1-mini'
export type OpenAIImageQuality = 'auto' | 'low' | 'medium' | 'high'
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

const OPENAI_IMAGE_MODELS = new Set<OpenAIImageModel>([
  'gpt-image-2',
  'gpt-image-1.5',
  'gpt-image-1',
  'gpt-image-1-mini'
])

const LEGACY_OPENAI_IMAGE_SIZES = new Set<OpenAIImageSize>(['auto', '1024x1024', '1024x1536', '1536x1024'])
const MAX_OPENAI_IMAGE_INPUTS = 16
const MAX_OPENAI_IMAGE_INPUT_BYTES = 50 * 1024 * 1024

const sanitizeEnvValue = (value: string | undefined) => value?.trim() || null

export const isOpenAIImageModel = (value: string): value is OpenAIImageModel =>
  OPENAI_IMAGE_MODELS.has(value as OpenAIImageModel)

export const getOpenAIImageModel = (env: NodeJS.ProcessEnv = process.env): OpenAIImageModel => {
  const requested = sanitizeEnvValue(env.OPENAI_IMAGE_MODEL)

  return requested && isOpenAIImageModel(requested) ? requested : DEFAULT_OPENAI_IMAGE_MODEL
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
  if (size) {
    if (model === 'gpt-image-2' || LEGACY_OPENAI_IMAGE_SIZES.has(size)) {
      return size
    }

    return size.includes('1536x') ? '1024x1536' : size.includes('x1536') ? '1536x1024' : 'auto'
  }

  if (model !== 'gpt-image-2') {
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

  if (inputFidelity && resolvedRequest.model !== 'gpt-image-2') {
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
