import 'server-only'

import sharp from 'sharp'

import { readOrganizationLogoVariants } from '@/lib/account-360/organization-logo-variants-reader'
import type {
  AiVisibilityReportPdfLogo,
  AiVisibilityReportPdfPresentationContext
} from '@/components/growth/ai-visibility/report-artifact/pdf/report-pdf-presentation'
import { captureWithDomain } from '@/lib/observability/capture'
import { readOrganizationLogoForRender } from '@/lib/storage/greenhouse-assets'

import {
  getOrganizationCommercialFacts,
  type OrganizationCommercialFacts
} from '../operator/organization-commercial-facts'
import { getGraderProfile, getGraderRun } from '../store'

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const RENDERABLE_LOGO_MIME_TYPES = new Set(['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'])

/**
 * Normalize only bytes from the ownership-checked system reader. React-PDF cannot
 * use private browser URLs or SVG/WebP directly. Pixel and byte limits bound decode.
 */
const readClientLogo = async (organizationId: string, organizationName: string): Promise<AiVisibilityReportPdfLogo | null> => {
  try {
    const variants = await readOrganizationLogoVariants(organizationId)
    const assetId = variants?.logoOnDarkAssetId ?? variants?.logoAssetId

    if (!assetId) return null

    const logo = await readOrganizationLogoForRender({
      organizationId,
      assetId,
      purpose: 'ai_visibility_report_cover',
      accessMetadata: { source: 'growth_ai_visibility_pdf_presentation' }
    })

    if (!RENDERABLE_LOGO_MIME_TYPES.has(logo.mimeType)) throw new Error('ai_visibility_pdf_logo_invalid_mime')
    const dataUri = logo.dataUri.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/)

    if (!dataUri || dataUri[1] !== logo.mimeType) throw new Error('ai_visibility_pdf_logo_invalid_data_uri')
    const bytes = Buffer.from(dataUri[2], 'base64')

    if (bytes.byteLength === 0 || bytes.byteLength > MAX_LOGO_BYTES) throw new Error('ai_visibility_pdf_logo_invalid_size')

    const data = await sharp(bytes, { limitInputPixels: 16_000_000 })
      .rotate()
      .resize({ width: 960, height: 480, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer()

    if (data.byteLength === 0 || data.byteLength > MAX_LOGO_BYTES) throw new Error('ai_visibility_pdf_logo_invalid_size')

    return { data, format: 'png', alt: organizationName, onDark: Boolean(variants?.logoOnDarkAssetId) }
  } catch {
    // Identity remains the verified organization name. No URL, asset ID, storage
    // path, or untrusted decode error reaches the PDF or observability payload.
    captureWithDomain(new Error('ai_visibility_pdf_logo_unavailable'), 'growth', {
      tags: { source: 'growth_ai_visibility_pdf_presentation', stage: 'logo' }
    })

    return null
  }
}

/**
 * Server-only metadata reader for an already authorized report. All callers arrive
 * after the existing snapshot/gate/consent/read checks; it grants no report access.
 * Commercial audience is resolved from the organization actually bound to the run,
 * independently of the frozen DTO's public disclosure audience.
 */
export const readAiVisibilityReportPdfPresentationContext = async (input: {
  runId: string
  locale?: string | null
  asOf?: string | null
  /** Reuse authoritative facts already read by the governed operator send path. */
  knownOrganization?: OrganizationCommercialFacts
}): Promise<AiVisibilityReportPdfPresentationContext> => {
  const run = await getGraderRun(input.runId)

  if (!run) throw new Error('ai_visibility_pdf_presentation_run_unavailable')
  const profile = await getGraderProfile(run.profileId)

  if (!profile) throw new Error('ai_visibility_pdf_presentation_profile_unavailable')
  const runOrganizationId = run.organizationId
  const profileOrganizationId = profile.organizationId

  if (runOrganizationId && profileOrganizationId && runOrganizationId !== profileOrganizationId) {
    throw new Error('ai_visibility_pdf_presentation_organization_mismatch')
  }

  const organizationId = runOrganizationId ?? profileOrganizationId
  const locale = input.locale ?? run.locale ?? profile.locale

  if (!organizationId) {
    if (input.knownOrganization) throw new Error('ai_visibility_pdf_presentation_organization_mismatch')

    return { audience: 'prospect', audienceSource: 'public_intake', locale, asOf: input.asOf }
  }

  if (input.knownOrganization && input.knownOrganization.organizationId !== organizationId) {
    throw new Error('ai_visibility_pdf_presentation_organization_mismatch')
  }

  const organization = input.knownOrganization ?? await getOrganizationCommercialFacts(organizationId)

  if (!organization) throw new Error('ai_visibility_pdf_presentation_organization_unavailable')

  if (!organization.isClient) {
    return { audience: 'prospect', audienceSource: 'organization_commercial_facts', locale, asOf: input.asOf }
  }

  return {
    audience: 'client',
    audienceSource: 'organization_commercial_facts',
    locale,
    asOf: input.asOf,
    clientLogo: await readClientLogo(organizationId, organization.organizationName),
    // Account lead uses the approved single configurable default in the pure
    // presentation helper. No agreed next-report date exists in this reader.
    nextReportDate: null
  }
}
