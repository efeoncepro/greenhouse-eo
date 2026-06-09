import 'server-only'

import { generateOpenAIImage } from '@/lib/ai/openai-image'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { createPrivatePendingAsset, type GreenhouseAssetRecord } from '@/lib/storage/greenhouse-assets'

import { OrganizationBrandAssetError } from './organization-brand-assets'

/**
 * AI logo generation for client organizations (TASK-999 brand-asset foundation).
 *
 * Produces an ORIGINAL brand mark with OpenAI gpt-image-2 (opaque background — the operator chose
 * max precision over transparency) and persists it as an `organization_logo_draft` private asset.
 * It does NOT attach the logo — the operator reviews the result and then applies it through the
 * existing `attachOrganizationLogoAsset` flow (which re-checks the operating-entity guardrail).
 *
 * Hard guardrails:
 * - Reuses the canonical `organization.brand_asset` capability gate at the route boundary.
 * - Fails fast (before spending an OpenAI call) when the org is an operating entity — Efeonce /
 *   Greenhouse / operating-entity logos are never generated or replaced here.
 * - Generates an ORIGINAL mark inspired by the name/sector; the prompt explicitly forbids copying
 *   any real-world trademark (greenhouse-ai-image-generator skill constraint) and forbids rendered
 *   text (image models garble it).
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
  const industryClause = industry ? ` operating in the ${industry} sector` : ''
  const hintClause = hint ? ` Operator art direction: ${hint}.` : ''

  return [
    `Design a single, original, modern, minimalist brand logo MARK (one abstract geometric symbol or emblem) for a company called "${organizationName}"${industryClause}.`,
    'The mark must be ORIGINAL — inspired by the name and sector, NOT a reproduction of any existing real-world brand, trademark or logo.',
    'Center one clean iconic symbol on a solid flat opaque background with generous even padding and balanced negative space.',
    'Flat vector aesthetic, crisp clean edges, a restrained palette of at most three colors, geometric, professional, enterprise and trustworthy, instantly recognizable as a small app or avatar icon.',
    hintClause,
    'Do NOT render any text, letters, words, monograms, initials, numbers or taglines. No photographic realism, no busy 3D, no heavy gradients, no drop shadows, no mockup scene, no border frame, no watermark.'
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
      quality: 'high'
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
