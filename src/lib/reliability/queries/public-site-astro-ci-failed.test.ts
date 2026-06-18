import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  composePublicSiteGithubControlPlanePacket: vi.fn(),
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/public-site/astro/github-control-plane', () => ({
  composePublicSiteGithubControlPlanePacket: () => mocks.composePublicSiteGithubControlPlanePacket()
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mocks.captureWithDomain(...args)
}))

const packet = (conclusion: string | null, status = 'completed') => ({
  confidence: 'high',
  commitCorrelation: {
    status: 'matched'
  },
  runs: [
    {
      id: 27657858751,
      workflowName: 'CI',
      branch: 'main',
      status,
      conclusion,
      shortHeadSha: '4d050fb'
    }
  ]
})

describe('getPublicSiteAstroCiFailedSignal', () => {
  it('is error when the latest main CI run failed', async () => {
    mocks.composePublicSiteGithubControlPlanePacket.mockResolvedValueOnce(packet('failure'))
    const { getPublicSiteAstroCiFailedSignal } = await import('./public-site-astro-ci-failed')

    const signal = await getPublicSiteAstroCiFailedSignal()

    expect(signal.signalId).toBe('public_site.astro_ci_failed')
    expect(signal.moduleKey).toBe('platform')
    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('failure')
  })

  it('is ok when the latest main CI run succeeds and correlation matches', async () => {
    mocks.composePublicSiteGithubControlPlanePacket.mockResolvedValueOnce(packet('success'))
    const { getPublicSiteAstroCiFailedSignal } = await import('./public-site-astro-ci-failed')

    const signal = await getPublicSiteAstroCiFailedSignal()

    expect(signal.severity).toBe('ok')
  })

  it('is unknown when CI is still running', async () => {
    mocks.composePublicSiteGithubControlPlanePacket.mockResolvedValueOnce(packet(null, 'in_progress'))
    const { getPublicSiteAstroCiFailedSignal } = await import('./public-site-astro-ci-failed')

    const signal = await getPublicSiteAstroCiFailedSignal()

    expect(signal.severity).toBe('unknown')
  })
})
