import 'server-only'

import { generateOpenAIImage } from '@/lib/ai/openai-image'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { createPrivatePendingAsset } from '@/lib/storage/greenhouse-assets'
import type { GreenhouseAssetRecord } from '@/types/assets'

import { OrganizationBrandAssetError } from './organization-brand-assets'

/**
 * AI logo generation for client organizations (TASK-999 brand-asset foundation).
 *
 * RECREATES the company's REAL brand logo with OpenAI gpt-image-2 (opaque background — the operator
 * chose max precision over transparency) from the model's own knowledge of that company, and
 * persists it as an `organization_logo_draft` private asset. It does NOT attach the logo — the
 * operator reviews the result (it is an AI approximation of the real mark) and then applies it
 * through the existing `attachOrganizationLogoAsset` flow (which re-checks the operating-entity
 * guardrail). For the exact, pixel-perfect official logo the operator can still use the URL/upload
 * paths in the same pop-up.
 *
 * Hard guardrails:
 * - Reuses the canonical `organization.brand_asset` capability gate at the route boundary.
 * - Fails fast (before spending an OpenAI call) when the org is an operating entity — Efeonce /
 *   Greenhouse / operating-entity logos are never generated or replaced here.
 * - Targets CLIENT organizations only and renders the result for internal account display; the
 *   operator reviews before committing. (This deliberately overrides the greenhouse-ai-image-generator
 *   default of "never reproduce a real trademark" per explicit operator decision: the org avatar
 *   should show the client's actual brand, not an invented mark.)
 */

type OrganizationLogoOrgRow = {
  organization_id: string
  organization_name: string
  industry: string | null
  is_operating_entity: boolean
}

export type GenerateOrganizationLogoInput = {
  organizationId: string
  actorUserId: string
  /** Operator free-text art-direction hint (optional — the org name alone is enough). */
  styleHint?: string | null
}

export type GenerateOrganizationLogoResult = {
  asset: GreenhouseAssetRecord
  downloadUrl: string
  model: string
  requestedModel: string
  modelFallbackReason: string | null
  revisedPrompt: string | null
}

const sanitizeHint = (hint: string | null | undefined): string => {
  if (typeof hint !== 'string') return ''

  // Keep it a short style hint, never an instruction channel into the model.
  return hint.replace(/\s+/g, ' ').trim().slice(0, 240)
}

const buildLogoPrompt = ({
  organizationName,
  industry,
  hint
}: {
  organizationName: string
  industry: string | null
  hint: string
}): string => {
  const industryClause = industry ? ` (a company in the ${industry} sector)` : ''
  const hintClause = hint ? ` Operator note: ${hint}.` : ''

  return [
    `Recreate the REAL, official brand logo of the company "${organizationName}"${industryClause}, as accurately and faithfully as you know it from your own knowledge.`,
    'Reproduce the genuine logo — its actual logomark/symbol, real brand colors, proportions and visual style. Do NOT invent a new, alternative or stylized design; assign the authentic brand identity.',
    'Center the logo on a solid flat opaque background with generous even padding, presented cleanly as a square brand avatar icon.',
    'If the brand logo includes its name as a wordmark, render that text crisply and correctly in the brand’s actual typographic style; if you are unsure of the exact letterforms, favor the brand’s iconic symbol or monogram rather than guessing text.',
    hintClause,
    'No mockup scene, no extra invented graphics, no drop shadows, no border frame, no watermark, no caption text.'
  ]
    .filter(Boolean)
    .join(' ')
}

export const generateOrganizationLogoDraft = async (
  input: GenerateOrganizationLogoInput
): Promise<GenerateOrganizationLogoResult> => {
  const rows = await runGreenhousePostgresQuery<OrganizationLogoOrgRow>(
    `SELECT organization_id, organization_name, industry, is_operating_entity
     FROM greenhouse_core.organizations
     WHERE organization_id = $1 OR public_id = $1
     LIMIT 1`,
    [input.organizationId]
  )

  const organization = rows[0]

  if (!organization) {
    throw new OrganizationBrandAssetError('organization_not_found')
  }

  // Fail fast BEFORE the paid OpenAI call — operating-entity logos are never generated here.
  if (organization.is_operating_entity) {
    throw new OrganizationBrandAssetError('operating_entity_forbidden')
  }

  const prompt = buildLogoPrompt({
    organizationName: organization.organization_name,
    industry: organization.industry,
    hint: sanitizeHint(input.styleHint)
  })

  let generated

  try {
    generated = await generateOpenAIImage({
      prompt,
      model: 'gpt-image-2',
      background: 'opaque',
      format: 'png',
      size: '1024x1024',
      // A flat geometric logo mark does not need the 'high' photographic tier (which can exceed the
      // 125s default timeout). 'medium' keeps the precise gpt-image-2 model with a popup-friendly
      // latency; the extended timeout gives headroom for slow generations.
      quality: 'medium',
      timeoutMs: 180_000
    })
  } catch (error) {
    captureWithDomain(error, 'agency', {
      tags: { source: 'organization_logo_ai_generate', stage: 'openai' },
      extra: { organizationId: organization.organization_id }
    })

    throw error
  }

  const bytes = Buffer.from(generated.imageBytesBase64, 'base64')

  const asset = await createPrivatePendingAsset({
    contextType: 'organization_logo_draft',
    uploadedByUserId: input.actorUserId,
    fileName: `${organization.organization_id}-ai-logo.png`,
    contentType: 'image/png',
    bytes,
    metadata: {
      source: 'ai_generated',
      provider: 'openai-image',
      model: generated.model,
      requestedModel: generated.requestedModel,
      organizationId: organization.organization_id
    }
  })

  return {
    asset,
    downloadUrl: `/api/assets/private/${encodeURIComponent(asset.assetId)}`,
    model: generated.model,
    requestedModel: generated.requestedModel,
    modelFallbackReason: generated.modelFallbackReason,
    revisedPrompt: generated.revisedPrompt
  }
}
