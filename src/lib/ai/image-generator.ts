import 'server-only'

import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { getGoogleGenAIClient, getGreenhouseAgentModel } from '@/lib/ai/google-genai'

// ── Types ──

export interface GenerateImageOptions {
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  format?: 'webp' | 'png'
  filename?: string
  numberOfImages?: number
}

export interface GenerateImageResult {
  path: string
  filename: string
  format: string
  sizeBytes: number
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

// Use the latest frontier model available. Falls back gracefully if not enabled in the GCP project.
const IMAGEN_MODEL = process.env.IMAGEN_MODEL?.trim() || 'imagen-4.0-generate-001'

const SVG_SYSTEM_PROMPT = `You are an SVG animation specialist for the Greenhouse EO portal.
Generate a single valid SVG file with embedded CSS animations.

Rules:
- Output ONLY the SVG markup. No markdown fences, no explanation, no comments outside the SVG.
- The first character of your response must be "<svg" and the last must be "</svg>".
- Use CSS keyframes inside a <style> tag within the SVG.
- Use these exact brand colors:
  - Primary: #7367F0
  - Success: #6EC207
  - Warning: #FF6500
  - Error: #BB1954
  - Info: #00BAD1
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

// ── Image Generation (Imagen 3) ──

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

  const client = await getGoogleGenAIClient()

  const response = await client.models.generateImages({
    model: IMAGEN_MODEL,
    prompt,
    config: {
      numberOfImages,
      aspectRatio
    }
  })

  const generated = response.generatedImages?.[0]

  if (!generated?.image?.imageBytes) {
    throw new Error('Imagen returned no image data. The prompt may have been filtered by safety controls.')
  }

  const buffer = Buffer.from(generated.image.imageBytes, 'base64')
  const filename = makeFilename(prompt, userFilename, format)

  await ensureDir(IMAGES_OUTPUT_DIR)

  const filePath = join(IMAGES_OUTPUT_DIR, filename)

  await writeFile(filePath, buffer)

  return {
    path: `/images/generated/${filename}`,
    filename,
    format,
    sizeBytes: buffer.length
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
