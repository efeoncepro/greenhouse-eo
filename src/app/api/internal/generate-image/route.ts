import 'server-only'

import { NextResponse } from 'next/server'

import { requireAdminTenantContext } from '@/lib/tenant/authorization'
import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { IMAGE_GENERATION_PROVIDERS, generateImage, type GenerateImageOptions } from '@/lib/ai/image-generator'
import { OPENAI_IMAGE_QUALITIES } from '@/lib/ai/openai-image'

export const dynamic = 'force-dynamic'

const VALID_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const
const VALID_FORMATS = ['webp', 'png'] as const
// provider y quality NO se redeclaran acá: sus dueños son image-generator.ts y openai-image.ts.
// Duplicarlos ya había producido drift — esta lista todavía nombraba `google-imagen`, retirado, y se
// quedaba en `high`, así que un `quality: "max"` legítimo se descartaba en silencio.
const VALID_PROVIDERS = IMAGE_GENERATION_PROVIDERS
const VALID_OPENAI_QUALITIES = OPENAI_IMAGE_QUALITIES
const VALID_OPENAI_BACKGROUNDS = ['auto', 'opaque', 'transparent'] as const

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

/**
 * Un campo ausente se omite; uno presente pero inválido responde 400 accionable.
 *
 * Antes, el patrón `if (body.x && VALID.includes(body.x))` descartaba el valor y seguía con el default:
 * quien pedía `quality: "max"` recibía `medium` y una imagen que parecía correcta sin serlo.
 */
const readEnumField = <T extends string>(
  field: string,
  value: unknown,
  allowed: readonly T[]
): { ok: true; value: T | undefined } | { ok: false; response: ReturnType<typeof canonicalErrorResponse> } => {
  if (value === undefined || value === null) return { ok: true, value: undefined }

  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return { ok: true, value: value as T }
  }

  return {
    ok: false,
    response: canonicalErrorResponse('invalid_request', {
      extra: { field, received: typeof value === 'string' ? value : typeof value, allowed: [...allowed] }
    })
  }
}

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

    const fields = [
      ['aspectRatio', body.aspectRatio, VALID_ASPECT_RATIOS],
      ['format', body.format, VALID_FORMATS],
      ['provider', body.provider, VALID_PROVIDERS],
      ['quality', body.quality, VALID_OPENAI_QUALITIES],
      ['size', body.size, VALID_OPENAI_SIZES],
      ['background', body.background, VALID_OPENAI_BACKGROUNDS]
    ] as const

    for (const [field, value, allowed] of fields) {
      const parsed = readEnumField(field, value, allowed)

      if (!parsed.ok) return parsed.response
      if (parsed.value === undefined) continue

      Object.assign(options, { [field]: parsed.value })
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
