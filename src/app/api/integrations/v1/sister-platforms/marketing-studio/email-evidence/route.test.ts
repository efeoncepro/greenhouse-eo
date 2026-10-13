import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as EvidenceModule from '@/lib/marketing-studio/email-evidence'

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  token: vi.fn(),
  context: {
    consumer: { sisterPlatformKey: 'marketing-studio' },
    binding: { sisterPlatformKey: 'marketing-studio', greenhouseScopeType: 'organization', organizationId: 'org-a' }
  }
}))

vi.mock('@/lib/sister-platforms/external-auth', () => ({
  runSisterPlatformReadRoute: ({ handler }: { handler: (ctx: unknown) => Promise<Response> }) => handler(mocks.context),
  SisterPlatformExternalApiError: class extends Error {
    constructor(
      message: string,
      public options: unknown
    ) {
      super(message)
    }
  }
}))
vi.mock('@/lib/hubspot/access-token', () => ({ getHubSpotAccessToken: mocks.token }))
vi.mock('@/lib/resend', () => ({ resolveResendApiKey: mocks.token }))
vi.mock('@/lib/marketing-studio/email-evidence', async importOriginal => ({
  ...(await importOriginal<typeof EvidenceModule>()),
  readHubSpotEvidence: mocks.read,
  readResendEvidence: mocks.read
}))
import { GET } from './route'

describe('scoped email evidence transport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('GREENHOUSE_STUDIO_EMAIL_EVIDENCE_ENABLED', 'true')
    vi.stubEnv(
      'GREENHOUSE_STUDIO_EMAIL_EVIDENCE_BINDINGS',
      JSON.stringify([{ organizationId: 'org-a', provider: 'resend', accountRef: 'team' }])
    )
    mocks.token.mockResolvedValue('fixture')
    mocks.read.mockResolvedValue({ items: [], nextCursor: null })
  })
  it('returns the scoped envelope without exposing credentials', async () => {
    const response = await GET(
      new Request('https://greenhouse.test/evidence?organizationId=org-a&provider=resend&accountRef=team')
    )

    expect(await response.json()).toEqual({
      organizationId: 'org-a',
      provider: 'resend',
      accountRef: 'team',
      complete: true,
      items: [],
      nextCursor: null
    })
  })
  it('rejects foreign organization and OFF before resolving secrets or contacting providers', async () => {
    await expect(
      GET(new Request('https://greenhouse.test/evidence?organizationId=org-b&provider=resend&accountRef=team'))
    ).rejects.toMatchObject({ options: { statusCode: 404 } })
    vi.stubEnv('GREENHOUSE_STUDIO_EMAIL_EVIDENCE_ENABLED', 'false')
    await expect(
      GET(new Request('https://greenhouse.test/evidence?organizationId=org-a&provider=resend&accountRef=team'))
    ).rejects.toMatchObject({ options: { statusCode: 404 } })
    expect(mocks.token).not.toHaveBeenCalled()
    expect(mocks.read).not.toHaveBeenCalled()
  })
  it('redacts provider and resolver failures', async () => {
    mocks.token.mockRejectedValue(new Error('private-token-detail'))
    await expect(
      GET(new Request('https://greenhouse.test/evidence?organizationId=org-a&provider=resend&accountRef=team'))
    ).rejects.toMatchObject({
      message: 'La evidencia de correo no está disponible.',
      options: { statusCode: 503, errorCode: 'provider_unavailable' }
    })
  })
})
