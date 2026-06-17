import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  readPublicSiteAstroBinding: vi.fn(),
  captureWithDomain: vi.fn()
}))

vi.mock('@/lib/public-site/astro', () => ({
  readPublicSiteAstroBinding: () => mocks.readPublicSiteAstroBinding(),
  getPublicSiteAstroProductionDeploymentStatus: (packet: {
    vercel?: { deployments?: { environment: string }[] }
  }) => packet.vercel?.deployments?.find(deploy => deploy.environment === 'production') ?? null
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mocks.captureWithDomain(...args)
}))

const packet = (status: string) => ({
  binding: {
    vercel: {
      projectName: 'efeonce-web',
      projectId: 'prj_i52CnPvaoNB0Lweqk7L7cLimv7W9'
    }
  },
  vercel: {
    deployments: [
      {
        environment: 'production',
        status,
        uid: 'dpl_123'
      }
    ]
  }
})

describe('getPublicSiteAstroDeployFailedSignal', () => {
  it('is ok when the latest production deploy is READY', async () => {
    mocks.readPublicSiteAstroBinding.mockResolvedValueOnce(packet('READY'))
    const { getPublicSiteAstroDeployFailedSignal } = await import('./public-site-astro-deploy-failed')

    const signal = await getPublicSiteAstroDeployFailedSignal()

    expect(signal.signalId).toBe('public_site.astro_deploy_failed')
    expect(signal.moduleKey).toBe('platform')
    expect(signal.severity).toBe('ok')
  })

  it('is error when the latest production deploy is ERROR', async () => {
    mocks.readPublicSiteAstroBinding.mockResolvedValueOnce(packet('ERROR'))
    const { getPublicSiteAstroDeployFailedSignal } = await import('./public-site-astro-deploy-failed')

    const signal = await getPublicSiteAstroDeployFailedSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('ERROR')
  })
})
