import 'server-only'

import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { axisSemanticHex } from '@core/theme/axis-semantic'
import { getGoogleGenAIClient, getGreenhouseAgentModel } from '@/lib/ai/google-genai'
import {
  generateOpenAIImage,
  type OpenAIImageBackground,
  type OpenAIImageQuality,
  type OpenAIImageSize
} from '@/lib/ai/openai-image'

// ── Types ──

export type ImageGenerationProvider = 'google-gemini-image' | 'openai-image'

export interface GenerateImageOptions {
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  format?: 'webp' | 'png'
  filename?: string
  numberOfImages?: number
  provider?: ImageGenerationProvider
  quality?: OpenAIImageQuality
  size?: OpenAIImageSize
  background?: OpenAIImageBackground
  /**
   * Per-image timeout in ms for the `openai-image` provider. Omit → the canonical
   * 125s default (tuned for Vercel function limits). Raise it explicitly off-Vercel
   * (CLI, Cloud Run, batch) where `gpt-image-2 high` can exceed 125s — passthrough,
   * not a global default change. No effect on the `google-imagen` provider.
   */
  timeoutMs?: number
}

export interface GenerateImageResult {
  path: string
  filename: string
  format: string
  sizeBytes: number
  provider: ImageGenerationProvider
  model: string
  requestedModel?: string
  modelFallbackReason?: string | null
}

export interface GenerateAnimationOptions {
  filename?: string
  width?: number
  height?: number
}

export interface GenerateAnimationResult {
  path: string
  filename: string
  svgContent: string
  sizeBytes: number
}

// ── Constants ──

const IMAGES_OUTPUT_DIR = join(process.cwd(), 'public', 'images', 'generated')
const ANIMATIONS_OUTPUT_DIR = join(process.cwd(), 'public', 'animations', 'generated')

/**
 * Carril Google migrado de Imagen a Gemini Image (TASK-1851).
 *
 * `imagen-4.0-generate-001` fue retirado —discontinuación Vertex 2026-06-30, shutdown de la Gemini API
 * 2026-08-17— y el probe del 2026-09-16 contra `efeonce-group` devolvió 404 NOT_FOUND. La migración es de
 * PROVIDER, no de string: Imagen usaba `generateImages` (predict) y Gemini Image usa `generateContent` con
 * partes de contenido. Sustituir sólo el ID habría dejado el mismo retiro esperando a la vuelta de la esquina.
 */
const GEMINI_IMAGE_MODEL = process.env.GOOGLE_GEMINI_IMAGE_MODEL?.trim() || 'gemini-3.1-flash-image'

/**
 * El default apunta al motor probado. No puede apuntar a un carril cuyo modelo esté retirado: antes de esta
 * task, cualquier llamada sin `provider` explícito iba a Imagen y hoy habría fallado con 404.
 */
const DEFAULT_IMAGE_PROVIDER: ImageGenerationProvider = 'openai-image'

const SVG_SYSTEM_PROMPT = `You are an SVG animation specialist for the Greenhouse EO portal.
Generate a single valid SVG file with embedded CSS animations.

Rules:
- Output ONLY the SVG markup. No markdown fences, no explanation, no comments outside the SVG.
- The first character of your response must be "<svg" and the last must be "</svg>".
- Use CSS keyframes inside a <style> tag within the SVG.
- Use these exact brand colors:
  - Primary: #7367F0
  - Success: ${axisSemanticHex.success}
  - Warning: ${axisSemanticHex.warning}
  - Error: ${axisSemanticHex.error}
  - Info: ${axisSemanticHex.info}
  - Text primary: #4B465C
  - Text secondary: #808390
  - Background: #F8F7FA
- Include this accessibility rule in the <style>:
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }
- Use viewBox for responsive sizing (no fixed width/height on the root <svg> unless requested).
- Keep total SVG under 10KB.
- Animations should be smooth, professional, and subtle — not flashy or distracting.
- Use clean, semantic shapes. Prefer <path>, <circle>, <rect>, <line>, <polyline>.
- Do not use external fonts. Use system font stack: font-family: 'DM Sans', system-ui, sans-serif.
- Do not use JavaScript. CSS animations only.
- All animations must loop seamlessly if they are cyclical (loading spinners, pulses).`

// ── Helpers ──

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

const makeFilename = (prompt: string, userFilename: string | undefined, ext: string): string => {
  if (userFilename) return userFilename.endsWith(`.${ext}`) ? userFilename : `${userFilename}.${ext}`

  const slug = slugify(prompt)
  const ts = Math.floor(Date.now() / 1000)

  return `${slug}-${ts}.${ext}`
}

const ensureDir = async (dir: string) => {
  await mkdir(dir, { recursive: true })
}

/** Fuente única de los providers válidos: la consumen el guard, los mensajes de error y la ruta interna. */
export const IMAGE_GENERATION_PROVIDERS: readonly ImageGenerationProvider[] = ['openai-image', 'google-gemini-image']

export const isImageGenerationProvider = (value: string): value is ImageGenerationProvider =>
  (IMAGE_GENERATION_PROVIDERS as readonly string[]).includes(value)

/**
 * Cuarta puerta de entrada del mismo bug class que TASK-1851 cierra: un `GREENHOUSE_IMAGE_PROVIDER` con un
 * valor desconocido caía al default sin avisar, así que el motor real podía no ser el que el operador creía.
 */
export const getImageGenerationProvider = (requested?: ImageGenerationProvider): ImageGenerationProvider => {
  if (requested) return requested

  const envProvider = process.env.GREENHOUSE_IMAGE_PROVIDER?.trim()

  if (!envProvider) return DEFAULT_IMAGE_PROVIDER
  if (isImageGenerationProvider(envProvider)) return envProvider

  throw new Error(
    `GREENHOUSE_IMAGE_PROVIDER="${envProvider}" is not a supported image provider. Valid providers: ${IMAGE_GENERATION_PROVIDERS.join(', ')}.`
  )
}

// ── Image Generation ──

export const generateImage = async (
  prompt: string,
  options: GenerateImageOptions = {}
): Promise<GenerateImageResult> => {
  const {
    aspectRatio = '16:9',
    format = 'png',
    filename: userFilename,
    numberOfImages = 1
  } = options

  const provider = getImageGenerationProvider(options.provider)

  if (provider === 'openai-image') {
    const generated = await generateOpenAIImage({
      prompt,
      aspectRatio,
      format: format === 'webp' ? 'webp' : 'png',
      numberOfImages,
      quality: options.quality,
      size: options.size,
      background: options.background,
      timeoutMs: options.timeoutMs
    })

    const buffer = Buffer.from(generated.imageBytesBase64, 'base64')
    const filename = makeFilename(prompt, userFilename, generated.format)

    await ensureDir(IMAGES_OUTPUT_DIR)

    const filePath = join(IMAGES_OUTPUT_DIR, filename)

    await writeFile(filePath, buffer)

    return {
      path: `/images/generated/${filename}`,
      filename,
      format: generated.format,
      sizeBytes: buffer.length,
      provider,
      model: generated.model,
      requestedModel: generated.requestedModel,
      modelFallbackReason: generated.modelFallbackReason
    }
  }

  if (numberOfImages !== 1) {
    throw new Error(
      `The ${provider} lane returns one image per request; numberOfImages=${numberOfImages} is not supported. Issue one request per output.`
    )
  }

  const client = await getGoogleGenAIClient()

  const response = await client.models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: prompt,
    config: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio }
    }
  })

  const inlineImage = response.candidates
    ?.flatMap(candidate => candidate.content?.parts ?? [])
    .find(part => part.inlineData?.data)?.inlineData

  if (!inlineImage?.data) {
    // Falla nombrando provider y modelo: un carril que no sirve nunca degrada a otro provider en silencio.
    throw new Error(
      `${provider} (${GEMINI_IMAGE_MODEL}) returned no image data. The prompt may have been filtered by safety controls.`
    )
  }

  const buffer = Buffer.from(inlineImage.data, 'base64')
  const filename = makeFilename(prompt, userFilename, format)

  await ensureDir(IMAGES_OUTPUT_DIR)

  const filePath = join(IMAGES_OUTPUT_DIR, filename)

  await writeFile(filePath, buffer)

  return {
    path: `/images/generated/${filename}`,
    filename,
    format,
    sizeBytes: buffer.length,
    provider,
    model: GEMINI_IMAGE_MODEL,
    requestedModel: GEMINI_IMAGE_MODEL,
    modelFallbackReason: null
  }
}

// ── Animation Generation (Gemini → SVG) ──

export const generateAnimation = async (
  prompt: string,
  options: GenerateAnimationOptions = {}
): Promise<GenerateAnimationResult> => {
  const { filename: userFilename, width, height } = options

  const client = await getGoogleGenAIClient()

  const sizeInstruction = width && height
    ? `The SVG viewBox should be "0 0 ${width} ${height}".`
    : 'Use a viewBox appropriate for the content (typically 0 0 120 120 for icons, 0 0 400 120 for banners).'

  const response = await client.models.generateContent({
    model: getGreenhouseAgentModel(),
    contents: `${SVG_SYSTEM_PROMPT}\n\n${sizeInstruction}\n\nGenerate this SVG animation:\n${prompt.trim()}`,
    config: {
      temperature: 0.3
    }
  })

  let svgContent = response.text?.trim() ?? ''

  // Strip markdown fences if the model wraps them
  if (svgContent.startsWith('```')) {
    svgContent = svgContent.replace(/^```(?:svg|xml|html)?\n?/, '').replace(/\n?```$/, '').trim()
  }

  // Validate SVG structure
  if (!svgContent.startsWith('<svg') || !svgContent.includes('</svg>')) {
    throw new Error('Gemini did not return valid SVG. The response did not start with <svg or end with </svg>.')
  }

  const buffer = Buffer.from(svgContent, 'utf-8')
  const filename = makeFilename(prompt, userFilename, 'svg')

  await ensureDir(ANIMATIONS_OUTPUT_DIR)

  const filePath = join(ANIMATIONS_OUTPUT_DIR, filename)

  await writeFile(filePath, buffer)

  return {
    path: `/animations/generated/${filename}`,
    filename,
    svgContent,
    sizeBytes: buffer.length
  }
}
