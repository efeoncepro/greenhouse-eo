import 'server-only'

import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { generateImage, type GenerateImageOptions } from '@/lib/ai/image-generator'

export const dynamic = 'force-dynamic'

const VALID_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const
const VALID_FORMATS = ['webp', 'png'] as const
const VALID_PROVIDERS = ['google-imagen', 'openai-image'] as const
const VALID_OPENAI_QUALITIES = ['auto', 'low', 'medium', 'high'] as const
const VALID_OPENAI_BACKGROUNDS = ['auto', 'opaque', 'transparent'] as const
const VALID_OPENAI_TRANSPARENT_STRATEGIES = ['fallback-to-gpt-image-1.5', 'throw', 'opaque'] as const

const VALID_OPENAI_SIZES = [
  'auto',
  '1024x1024',
  '1024x1536',
  '1536x1024',
  '1152x2048',
  '2048x1152',
  '1536x2048',
  '2048x1536',
  '2048x2048'
] as const

export async function POST(request: Request) {
  // Production guard
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_ASSET_GENERATOR !== 'true') {
    return NextResponse.json(
      { error: 'Asset generator is disabled in production' },
      { status: 403 }
    )
  }

  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => null)

    if (!body || typeof body.prompt !== 'string' || !body.prompt.trim()) {
      return NextResponse.json(
        { error: 'prompt is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    const prompt = body.prompt.trim()

    const options: GenerateImageOptions = {}

    if (body.aspectRatio && VALID_ASPECT_RATIOS.includes(body.aspectRatio)) {
      options.aspectRatio = body.aspectRatio
    }

    if (body.format && VALID_FORMATS.includes(body.format)) {
      options.format = body.format
    }

    if (body.provider && VALID_PROVIDERS.includes(body.provider)) {
      options.provider = body.provider
    }

    if (body.quality && VALID_OPENAI_QUALITIES.includes(body.quality)) {
      options.quality = body.quality
    }

    if (body.size && VALID_OPENAI_SIZES.includes(body.size)) {
      options.size = body.size
    }

    if (body.background && VALID_OPENAI_BACKGROUNDS.includes(body.background)) {
      options.background = body.background
    }

    if (
      body.transparentBackgroundStrategy &&
      VALID_OPENAI_TRANSPARENT_STRATEGIES.includes(body.transparentBackgroundStrategy)
    ) {
      options.transparentBackgroundStrategy = body.transparentBackgroundStrategy
    }

    if (typeof body.filename === 'string' && body.filename.trim()) {
      options.filename = body.filename.trim()
    }

    const result = await generateImage(prompt, options)

    console.info('[generate-image]', JSON.stringify({
      prompt: prompt.slice(0, 100),
      path: result.path,
      format: result.format,
      provider: result.provider,
      model: result.model,
      requestedModel: result.requestedModel,
      modelFallbackReason: result.modelFallbackReason,
      sizeBytes: result.sizeBytes,
      userId: tenant.userId
    }))

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('POST /api/internal/generate-image failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image generation failed' },
      { status: 500 }
    )
  }
}
