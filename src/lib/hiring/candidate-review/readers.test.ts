import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  getApplication: vi.fn(),
  getOpening: vi.fn(),
  listApplications: vi.fn(),
  listAssessments: vi.fn(),
  documents: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: mocks.query }))
vi.mock('../store', () => ({
  getHiringApplicationById: mocks.getApplication,
  getHiringOpeningById: mocks.getOpening,
  listHiringApplications: mocks.listApplications
}))
vi.mock('../assessment', () => ({ listAssessmentsForApplication: mocks.listAssessments }))
vi.mock('../documents', () => ({ resolveHiringApplicationDocuments: mocks.documents }))

import { getCandidateReviewPacket } from './readers'

const application = {
  applicationId: 'application-1',
  openingId: 'opening-1',
  identityProfileId: 'profile-1',
  candidateFacetId: 'facet-1',
  stage: 'assessment',
  createdAt: '2026-08-16T00:00:00.000Z',
  updatedAt: '2026-08-16T00:01:00.000Z'
}

describe('candidate review packet reader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getApplication.mockResolvedValue(application)
    mocks.getOpening.mockResolvedValue({ openingId: 'opening-1', internalTitle: 'Content Creator' })
    mocks.listAssessments.mockResolvedValue([
      {
        publicId: 'EO-ASMT-1',
        method: 'candidate_test',
        status: 'submitted',
        submittedAt: '2026-08-16T00:02:00.000Z',
        updatedAt: '2026-08-16T00:02:00.000Z',
        answer: { secret: 'must-not-cross' }
      }
    ])
    mocks.documents.mockResolvedValue({
      applicationId: 'application-1',
      candidateFacetId: 'facet-1',
      quarantinedCount: 0,
      links: [{ kind: 'portfolio', url: 'https://portfolio.example.test' }],
      files: [
        {
          assetId: 'asset-1',
          kind: 'cv',
          status: 'available',
          scan: { verdict: 'clean' }
        }
      ]
    })
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('identity_profiles')) return [{ full_name: 'Candidate Name' }]

      if (sql.includes('candidate_document_review_projection')) {
        return [
          {
            content_hash: 'a'.repeat(64),
            status: 'ready',
            text_content: 'Redacted candidate evidence',
            source_updated_at: '2026-08-16T00:01:00.000Z',
            extracted_at: '2026-08-16T00:03:00.000Z',
            extraction_version: 'pdfjs-v1',
            redaction_policy_version: 'contact-v1'
          }
        ]
      }

      return []
    })
  })

  it('returns only the exact application packet and excludes answers/contact fields', async () => {
    const packet = await getCandidateReviewPacket({
      applicationId: 'application-1',
      purpose: 'screening_review',
      expectedContentHash: 'a'.repeat(64)
    })

    expect(mocks.documents).toHaveBeenCalledWith({ applicationId: 'application-1' })
    expect(packet.cv.text).toBe('Redacted candidate evidence')
    expect(packet.portfolioLinks[0]?.trust).toBe('untrusted_candidate_supplied')
    expect(JSON.stringify(packet)).not.toContain('must-not-cross')
    expect(packet).not.toHaveProperty('email')
    expect(packet).not.toHaveProperty('phone')
  })

  it('requires the caller to refresh when the expected hash no longer matches', async () => {
    await expect(
      getCandidateReviewPacket({
        applicationId: 'application-1',
        purpose: 'audit_review',
        expectedContentHash: 'b'.repeat(64)
      })
    ).rejects.toMatchObject({ code: 'candidate_review_stale', statusCode: 409 })
  })
})
