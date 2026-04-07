import 'server-only'

import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { generateAnimation, type GenerateAnimationOptions } from '@/lib/ai/image-generator'

export const dynamic = 'force-dynamic'

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

    const options: GenerateAnimationOptions = {}

    if (typeof body.filename === 'string' && body.filename.trim()) {
      options.filename = body.filename.trim()
    }

    if (typeof body.width === 'number' && body.width > 0) {
      options.width = body.width
    }

    if (typeof body.height === 'number' && body.height > 0) {
      options.height = body.height
    }

    const result = await generateAnimation(prompt, options)

    console.info('[generate-animation]', JSON.stringify({
      prompt: prompt.slice(0, 100),
      path: result.path,
      sizeBytes: result.sizeBytes,
      userId: tenant.userId
    }))

    return NextResponse.json({
      path: result.path,
      filename: result.filename,
      svgContent: result.svgContent,
      sizeBytes: result.sizeBytes
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/internal/generate-animation failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Animation generation failed' },
      { status: 500 }
    )
  }
}
