import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: vi.fn() }))
vi.mock('@/lib/hiring/documents/access', () => ({ canAccessHiringCandidateDocument: vi.fn() }))
vi.mock('@/lib/commercial/tenders/proposals/access', () => ({ canAccessProposalDocument: vi.fn() }))
vi.mock('@/lib/brand-surfaces/production/access', () => ({ canAccessBrandRenderAsset: vi.fn() }))
vi.mock('@/lib/tenant/authorization', () => ({ hasRoleCode: vi.fn(), hasRouteGroup: vi.fn() }))
vi.mock('@/lib/bigquery', () => ({ getBigQueryProjectId: vi.fn() }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: vi.fn() }))
vi.mock('@/lib/storage/asset-scan/store', () => ({ getLatestScanResultsForAssets: vi.fn() }))
vi.mock('@/lib/storage/greenhouse-media', () => ({
  downloadGreenhouseStorageObject: vi.fn(),
  uploadGreenhouseStorageObject: vi.fn(),
  deleteGreenhouseStorageObject: vi.fn()
}))

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { readOrganizationLogoForRender } from '../greenhouse-assets'
import { downloadGreenhouseStorageObject } from '../greenhouse-media'

const asset = {
  asset_id: 'logo-1', public_id: 'EO-ASSET-00001', visibility: 'private', status: 'attached',
  bucket_name: 'private-media', object_path: 'organization-logo/logo-1.png', filename: 'logo.png',
  mime_type: 'image/png', size_bytes: 4, retention_class: 'organization',
  owner_aggregate_type: 'organization_logo', owner_aggregate_id: 'org-1'
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(runGreenhousePostgresQuery).mockResolvedValueOnce([asset] as never).mockResolvedValue([])
  vi.mocked(downloadGreenhouseStorageObject).mockResolvedValue({
    arrayBuffer: Uint8Array.from([1, 2, 3, 4]).buffer
  } as never)
})

describe('organization logo system renderer purpose', () => {
  it.each([
    { purpose: undefined, expected: 'insights_render_cover' },
    { purpose: 'ai_visibility_report_cover' as const, expected: 'ai_visibility_report_cover' }
  ])('audits the permitted purpose without broadening attached ownership', async ({ purpose, expected }) => {
    expect(await readOrganizationLogoForRender({
      organizationId: 'org-1', assetId: 'logo-1', purpose,
      accessMetadata: { purpose: 'attempted_override' }
    })).toEqual({ mimeType: 'image/png', dataUri: 'data:image/png;base64,AQIDBA==' })

    const auditParameters = vi.mocked(runGreenhousePostgresQuery).mock.calls[1][1] as unknown[]

    expect(JSON.parse(auditParameters[4] as string)).toMatchObject({
      purpose: expected, ownerAggregateType: 'organization_logo', ownerAggregateId: 'org-1'
    })
  })

  it('rejects an unsupported purpose before resolving an asset', async () => {
    await expect(readOrganizationLogoForRender({
      organizationId: 'org-1', assetId: 'logo-1', purpose: 'public_logo_download' as never
    })).rejects.toThrow('organization_logo_invalid_render_purpose')

    expect(runGreenhousePostgresQuery).not.toHaveBeenCalled()
    expect(downloadGreenhouseStorageObject).not.toHaveBeenCalled()
  })

  it.each([
    { owner_aggregate_id: 'org-other' },
    { owner_aggregate_type: 'proposal_deliverable' },
    { status: 'quarantined' },
    { mime_type: 'application/pdf' },
    { size_bytes: 2 * 1024 * 1024 + 1 }
  ])('preserves ownership, attachment, MIME and size enforcement for the new purpose', async invalid => {
    vi.mocked(runGreenhousePostgresQuery).mockReset().mockResolvedValueOnce([{ ...asset, ...invalid }] as never)

    await expect(readOrganizationLogoForRender({
      organizationId: 'org-1', assetId: 'logo-1', purpose: 'ai_visibility_report_cover'
    })).rejects.toThrow('organization_logo_not_renderable')

    expect(downloadGreenhouseStorageObject).not.toHaveBeenCalled()
    expect(runGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
  })
})
