import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  flags: vi.fn(),
  list: vi.fn(),
  packet: vi.fn(),
  audit: vi.fn()
}))

vi.mock('@/lib/entitlements/runtime', () => ({ can: mocks.can }))
vi.mock('@/lib/hiring/candidate-review', () => ({
  CANDIDATE_REVIEW_PURPOSES: [
    'screening_review',
    'interview_preparation',
    'evidence_comparison',
    'audit_review'
  ],
  candidateReviewFlags: mocks.flags,
  listCandidateReviewApplications: mocks.list,
  getCandidateReviewPacket: mocks.packet,
  recordCandidateReviewAccess: mocks.audit
}))

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'

import { getAppCandidateReviewPacket, listAppCandidateReviewApplications } from './app-hiring-candidate-review'

const context = {
  requestId: 'request-1',
  routeKey: 'route',
  version: '2026-08-01',
  tenant: {
    userId: 'user-1',
    tenantType: 'efeonce_internal',
    roleCodes: ['hr_manager'],
    primaryRoleCode: 'hr_manager',
    routeGroups: ['internal'],
    authorizedViews: [],
    projectScopes: [],
    campaignScopes: [],
    businessLines: [],
    serviceModules: [],
    portalHomePath: '/agency'
  },
  appSessionId: null,
  authSource: 'sister_platform_oauth',
  oauthCapabilities: ['hiring.candidate.review.read'],
  oauthWorkspaceBindings: [],
  oauthClientId: 'efeonce-mcp-hiring-review',
  oauthAccessTokenId: 'token-1',
  oauthCorrelationId: 'corr-1',
  rateLimit: { limit: 120, remaining: 119, resetAt: '2026-08-16T00:01:00.000Z' }
} as unknown as AppPlatformRequestContext

const request = (path: string, purpose = 'screening_review') =>
  new Request(`https://greenhouse.test${path}`, {
    headers: { 'x-greenhouse-purpose': purpose, 'x-greenhouse-agent-host': 'codex' }
  })

describe('delegated candidate review App API', () => {
  beforeEach(() => {
    vi.stubEnv('NEXTAUTH_SECRET', 'a'.repeat(64))
    vi.clearAllMocks()
    mocks.can.mockReturnValue(true)
    mocks.flags.mockReturnValue({ reader: true, projection: true })
    mocks.list.mockResolvedValue({ items: [], nextOffset: null })
    mocks.packet.mockResolvedValue({ schemaVersion: 'candidate-review-packet.v1' })
    mocks.audit.mockResolvedValue(undefined)
  })

  it('records an allow only after the exact list reader succeeds', async () => {
    await expect(
      listAppCandidateReviewApplications({
        context,
        request: request('/api/platform/app/hiring/applications/review?openingId=opening-1')
      })
    ).resolves.toEqual({ items: [], nextCursor: null })
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ openingId: 'opening-1' }))
    expect(mocks.audit).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: 'allowed', purpose: 'screening_review' }))
  })

  it('exposes only an opaque cursor bound to the actor and exact review query', async () => {
    mocks.list.mockResolvedValueOnce({ items: [], nextOffset: 25 }).mockResolvedValueOnce({ items: [], nextOffset: null })

    const first = await listAppCandidateReviewApplications({
      context,
      request: request('/api/platform/app/hiring/applications/review?openingId=opening-1&stage=shortlisted')
    })

    expect(first.nextCursor).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    await expect(
      listAppCandidateReviewApplications({
        context,
        request: request(
          `/api/platform/app/hiring/applications/review?openingId=opening-1&stage=shortlisted&cursor=${encodeURIComponent(first.nextCursor!)}`
        )
      })
    ).resolves.toEqual({ items: [], nextCursor: null })
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 25 }))

    await expect(
      listAppCandidateReviewApplications({
        context: { ...context, tenant: { ...context.tenant, userId: 'user-2' } },
        request: request(
          `/api/platform/app/hiring/applications/review?openingId=opening-1&stage=shortlisted&cursor=${encodeURIComponent(first.nextCursor!)}`
        )
      })
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('denies an open-ended purpose before any candidate data reader runs', async () => {
    await expect(
      getAppCandidateReviewPacket({
        context,
        request: request('/api/platform/app/hiring/applications/application-1/review-packet', 'general_research'),
        applicationId: 'application-1'
      })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'invalid_delegated_context' })
    expect(mocks.packet).not.toHaveBeenCalled()
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'denied', reasonCode: 'delegated_context_invalid' })
    )
  })

  it('does not let a cookie session substitute the delegated OAuth lane', async () => {
    await expect(
      getAppCandidateReviewPacket({
        context: { ...context, authSource: 'cookie_session' },
        request: request('/api/platform/app/hiring/applications/application-1/review-packet'),
        applicationId: 'application-1'
      })
    ).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.packet).not.toHaveBeenCalled()
  })
})
