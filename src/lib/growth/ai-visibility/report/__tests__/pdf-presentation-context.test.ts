import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/growth/ai-visibility/store', () => ({ getGraderRun: vi.fn(), getGraderProfile: vi.fn() }))
vi.mock('@/lib/growth/ai-visibility/operator/organization-commercial-facts', () => ({ getOrganizationCommercialFacts: vi.fn() }))
vi.mock('@/lib/account-360/organization-logo-variants-reader', () => ({ readOrganizationLogoVariants: vi.fn() }))
vi.mock('@/lib/storage/greenhouse-assets', () => ({ readOrganizationLogoForRender: vi.fn() }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import { readOrganizationLogoVariants } from '@/lib/account-360/organization-logo-variants-reader'
import { captureWithDomain } from '@/lib/observability/capture'
import { readOrganizationLogoForRender } from '@/lib/storage/greenhouse-assets'

import { getOrganizationCommercialFacts } from '../../operator/organization-commercial-facts'
import { getGraderProfile, getGraderRun } from '../../store'
import { readAiVisibilityReportPdfPresentationContext } from '../pdf-presentation-context'

const organization = {
  organizationId: 'org-client', organizationName: 'Client Brand', websiteUrl: 'https://example.com', hubspotCompanyId: null, isClient: true
}

const run = { runId: 'run-frozen', profileId: 'profile-bound', organizationId: null, locale: 'es-CL' }
const profile = { profileId: 'profile-bound', organizationId: null, locale: 'es-CL' }
const input = { runId: 'run-frozen', locale: 'en-US', asOf: '2026-05-19T12:00:00.000Z' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getGraderRun).mockResolvedValue({ ...run } as never)
  vi.mocked(getGraderProfile).mockResolvedValue({ ...profile } as never)
  vi.mocked(getOrganizationCommercialFacts).mockResolvedValue({ ...organization })
  vi.mocked(readOrganizationLogoVariants).mockResolvedValue(null)
})

describe('PDF presentation context — verified commercial identity', () => {
  it('preserves a public report as prospect without consulting unrelated organizations or logos', async () => {
    expect(await readAiVisibilityReportPdfPresentationContext(input)).toEqual({
      audience: 'prospect', audienceSource: 'public_intake', locale: input.locale, asOf: input.asOf
    })
    expect(getGraderRun).toHaveBeenCalledWith('run-frozen')
    expect(getGraderProfile).toHaveBeenCalledWith('profile-bound')
    expect(getOrganizationCommercialFacts).not.toHaveBeenCalled()
    expect(readOrganizationLogoForRender).not.toHaveBeenCalled()
  })

  it('supports legacy unbound runs and falls back to profile locale only when the frozen locale is absent', async () => {
    vi.mocked(getGraderRun).mockResolvedValue({ ...run, organizationId: null, locale: null } as never)
    vi.mocked(getGraderProfile).mockResolvedValue({ ...profile, locale: 'pt-BR' } as never)

    expect(await readAiVisibilityReportPdfPresentationContext({ runId: run.runId, asOf: input.asOf })).toEqual({
      audience: 'prospect', audienceSource: 'public_intake', locale: 'pt-BR', asOf: input.asOf
    })
    expect(getOrganizationCommercialFacts).not.toHaveBeenCalled()
  })

  it('does not equate a linked organization with an actual client', async () => {
    vi.mocked(getGraderProfile).mockResolvedValue({ ...profile, organizationId: organization.organizationId } as never)
    vi.mocked(getOrganizationCommercialFacts).mockResolvedValue({ ...organization, isClient: false })

    expect(await readAiVisibilityReportPdfPresentationContext(input)).toMatchObject({
      audience: 'prospect', audienceSource: 'organization_commercial_facts'
    })
    expect(readOrganizationLogoVariants).not.toHaveBeenCalled()
  })

  it('reuses authoritative operator facts only for the actual bound organization and normalizes owned bytes', async () => {
    const png = await sharp({ create: { width: 8, height: 4, channels: 4, background: '#ffffff' } }).png().toBuffer()

    vi.mocked(getGraderRun).mockResolvedValue({ ...run, organizationId: organization.organizationId } as never)
    vi.mocked(getGraderProfile).mockResolvedValue({ ...profile, organizationId: organization.organizationId } as never)
    vi.mocked(readOrganizationLogoVariants).mockResolvedValue({ logoAssetId: 'asset-default', logoOnDarkAssetId: 'asset-dark' })
    vi.mocked(readOrganizationLogoForRender).mockResolvedValue({ mimeType: 'image/png', dataUri: `data:image/png;base64,${png.toString('base64')}` })

    const result = await readAiVisibilityReportPdfPresentationContext({ ...input, knownOrganization: organization })

    expect(result.audience).toBe('client')
    expect(getOrganizationCommercialFacts).not.toHaveBeenCalled()
    expect(readOrganizationLogoForRender).toHaveBeenCalledWith({
      organizationId: 'org-client', assetId: 'asset-dark', purpose: 'ai_visibility_report_cover',
      accessMetadata: { source: 'growth_ai_visibility_pdf_presentation' }
    })
    expect(result.clientLogo?.format).toBe('png')
    expect(result.clientLogo?.onDark).toBe(true)
    expect(result.clientLogo?.data).toBeInstanceOf(Buffer)
    expect((await sharp(result.clientLogo!.data).metadata()).format).toBe('png')
    expect(result.nextReportDate).toBeNull()
    expect(JSON.stringify(result)).not.toContain('asset-dark')
    expect(JSON.stringify(result)).not.toContain('org-client')
  })

  it('flags an ordinary logo for a clear plate rather than recoloring the client identity', async () => {
    const png = await sharp({ create: { width: 8, height: 4, channels: 4, background: '#000000' } }).png().toBuffer()

    vi.mocked(getGraderProfile).mockResolvedValue({ ...profile, organizationId: organization.organizationId } as never)
    vi.mocked(readOrganizationLogoVariants).mockResolvedValue({ logoAssetId: 'asset-default', logoOnDarkAssetId: null })
    vi.mocked(readOrganizationLogoForRender).mockResolvedValue({ mimeType: 'image/png', dataUri: `data:image/png;base64,${png.toString('base64')}` })

    expect((await readAiVisibilityReportPdfPresentationContext(input)).clientLogo?.onDark).toBe(false)
  })

  it('fails closed on a run/profile organization mismatch before loading commercial facts or assets', async () => {
    vi.mocked(getGraderRun).mockResolvedValue({ ...run, organizationId: 'org-a' } as never)
    vi.mocked(getGraderProfile).mockResolvedValue({ ...profile, organizationId: 'org-b' } as never)

    await expect(readAiVisibilityReportPdfPresentationContext(input)).rejects.toThrow('ai_visibility_pdf_presentation_organization_mismatch')
    expect(getOrganizationCommercialFacts).not.toHaveBeenCalled()
    expect(readOrganizationLogoForRender).not.toHaveBeenCalled()
  })

  it('rejects supplied operator facts for an unrelated or unbound organization', async () => {
    await expect(readAiVisibilityReportPdfPresentationContext({ ...input, knownOrganization: organization })).rejects.toThrow('ai_visibility_pdf_presentation_organization_mismatch')

    vi.mocked(getGraderProfile).mockResolvedValue({ ...profile, organizationId: 'different-org' } as never)

    await expect(readAiVisibilityReportPdfPresentationContext({ ...input, knownOrganization: organization })).rejects.toThrow('ai_visibility_pdf_presentation_organization_mismatch')
  })

  it('does not silently convert unavailable commercial metadata into a prospect offer', async () => {
    vi.mocked(getGraderRun).mockResolvedValue(null)

    await expect(readAiVisibilityReportPdfPresentationContext(input)).rejects.toThrow('ai_visibility_pdf_presentation_run_unavailable')

    vi.mocked(getGraderRun).mockResolvedValue({ ...run } as never)
    vi.mocked(getGraderProfile).mockResolvedValue(null)

    await expect(readAiVisibilityReportPdfPresentationContext(input)).rejects.toThrow('ai_visibility_pdf_presentation_profile_unavailable')

    vi.mocked(getGraderProfile).mockResolvedValue({ ...profile, organizationId: organization.organizationId } as never)
    vi.mocked(getOrganizationCommercialFacts).mockResolvedValue(null)

    await expect(readAiVisibilityReportPdfPresentationContext(input)).rejects.toThrow('ai_visibility_pdf_presentation_organization_unavailable')
  })

  it('keeps verified client audience when a private/quarantined asset fails, and logs no private error details', async () => {
    vi.mocked(getGraderProfile).mockResolvedValue({ ...profile, organizationId: organization.organizationId } as never)
    vi.mocked(readOrganizationLogoVariants).mockResolvedValue({ logoAssetId: 'asset-private', logoOnDarkAssetId: null })
    vi.mocked(readOrganizationLogoForRender).mockRejectedValue(new Error('quarantined https://storage.example.com/private?token=secret'))

    expect(await readAiVisibilityReportPdfPresentationContext(input)).toMatchObject({ audience: 'client', clientLogo: null })
    expect(captureWithDomain).toHaveBeenCalledWith(new Error('ai_visibility_pdf_logo_unavailable'), 'growth', {
      tags: { source: 'growth_ai_visibility_pdf_presentation', stage: 'logo' }
    })
    expect(JSON.stringify(vi.mocked(captureWithDomain).mock.calls)).not.toContain('secret')
  })

  it.each([
    { mimeType: 'text/plain', dataUri: 'data:text/plain;base64,AAAA' },
    { mimeType: 'image/png', dataUri: 'https://example.com/private-logo' },
    { mimeType: 'image/png', dataUri: `data:image/png;base64,${Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64')}` }
  ])('rejects unsupported resources and oversized decode input', async invalidLogo => {
    vi.mocked(getGraderProfile).mockResolvedValue({ ...profile, organizationId: organization.organizationId } as never)
    vi.mocked(readOrganizationLogoVariants).mockResolvedValue({ logoAssetId: 'asset-private', logoOnDarkAssetId: null })
    vi.mocked(readOrganizationLogoForRender).mockResolvedValue(invalidLogo)

    expect((await readAiVisibilityReportPdfPresentationContext(input)).clientLogo).toBeNull()
  })
})
