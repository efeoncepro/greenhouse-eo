import 'server-only'

import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { generateImage, type GenerateImageOptions } from '@/lib/ai/image-generator'

export const dynamic = 'force-dynamic'

const VALID_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const
const VALID_FORMATS = ['webp', 'png'] as const

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

    if (typeof body.filename === 'string' && body.filename.trim()) {
      options.filename = body.filename.trim()
    }

    const result = await generateImage(prompt, options)

    console.info('[generate-image]', JSON.stringify({
      prompt: prompt.slice(0, 100),
      path: result.path,
      format: result.format,
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
