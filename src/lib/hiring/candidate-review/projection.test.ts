import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  read: vi.fn(),
  flags: vi.fn(),
  hash: vi.fn(),
  parse: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: mocks.query }))
vi.mock('@/lib/storage/greenhouse-assets', () => ({
  readCleanHiringApplicationCvForProjection: mocks.read
}))
vi.mock('./config', () => ({ candidateReviewFlags: mocks.flags }))
vi.mock('./parser', () => ({
  CANDIDATE_REVIEW_EXTRACTION_VERSION: 'test-extraction-v1',
  CANDIDATE_REVIEW_REDACTION_VERSION: 'test-redaction-v1',
  hashCandidateDocument: mocks.hash,
  parseCandidatePdf: mocks.parse
}))

import { invalidateCandidateReviewProjection, materializeCandidateReviewProjection } from './projection'

const asset = {
  assetId: 'asset-1',
  ownerAggregateId: 'application-1',
  attachedAt: '2026-08-16T12:00:00.000Z',
  uploadedAt: '2026-08-16T11:59:00.000Z',
  createdAt: '2026-08-16T11:58:00.000Z'
}

describe('candidate review projection lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.flags.mockReturnValue({ projection: true, reader: true })
    mocks.read.mockResolvedValue({ asset, file: { arrayBuffer: new Uint8Array([1, 2, 3]).buffer } })
    mocks.hash.mockReturnValue('a'.repeat(64))
    mocks.parse.mockResolvedValue({ status: 'ready', text: 'Experiencia redactada', pageCount: 1 })
    mocks.query.mockResolvedValue([])
  })

  it('does not read or persist bytes while the projection flag is off', async () => {
    mocks.flags.mockReturnValue({ projection: false, reader: false })

    await expect(materializeCandidateReviewProjection('asset-1')).resolves.toEqual({ outcome: 'disabled' })
    expect(mocks.read).not.toHaveBeenCalled()
    expect(mocks.query).not.toHaveBeenCalled()
  })

  it('stales older application assets before upserting the exact clean CV projection', async () => {
    await expect(materializeCandidateReviewProjection('asset-1')).resolves.toEqual({
      outcome: 'ready',
      applicationId: 'application-1',
      contentHash: 'a'.repeat(64)
    })

    expect(mocks.read).toHaveBeenCalledWith('asset-1')
    expect(mocks.query).toHaveBeenCalledTimes(2)
    expect(mocks.query.mock.calls[0]?.[0]).toContain("SET status='stale', text_content=NULL")
    expect(mocks.query.mock.calls[0]?.[1]).toEqual(['application-1', 'asset-1'])
    expect(mocks.query.mock.calls[1]?.[0]).toContain('INSERT INTO greenhouse_hiring.candidate_document_review_projection')
    expect(mocks.query.mock.calls[1]?.[1]).toEqual([
      'asset-1',
      'application-1',
      'a'.repeat(64),
      'test-extraction-v1',
      'test-redaction-v1',
      'ready',
      'Experiencia redactada',
      1,
      '2026-08-16T12:00:00.000Z'
    ])
  })

  it('persists parser failures as blocked without retaining document text', async () => {
    mocks.parse.mockRejectedValue(new Error('malformed_pdf'))

    await expect(materializeCandidateReviewProjection('asset-1')).resolves.toMatchObject({ outcome: 'blocked' })
    expect(mocks.query.mock.calls[1]?.[1]).toEqual(
      expect.arrayContaining(['blocked', null, null])
    )
  })

  it('invalidates an asset by clearing projected text', async () => {
    await invalidateCandidateReviewProjection('asset-1')

    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("SET status='stale', text_content=NULL"), [
      'asset-1'
    ])
  })
})
