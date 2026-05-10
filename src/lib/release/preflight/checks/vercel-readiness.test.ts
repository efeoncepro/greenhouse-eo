import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { checkVercelReadiness } from './vercel-readiness'

const buildInput = () => ({
  targetSha: 'abc123',
  targetBranch: 'main',
  githubRepo: { owner: 'efeoncepro', repo: 'greenhouse-eo' },
  triggeredBy: null,
  overrideBatchPolicy: false
})

describe('checkVercelReadiness', () => {
  const originalToken = process.env.VERCEL_TOKEN
  const originalFetch = global.fetch

  beforeEach(() => {
    delete process.env.VERCEL_TOKEN
    global.fetch = vi.fn()
  })

  afterEach(() => {
    if (originalToken !== undefined) process.env.VERCEL_TOKEN = originalToken
    global.fetch = originalFetch
  })

  it('severity unknown when VERCEL_TOKEN missing', async () => {
    const result = await checkVercelReadiness(buildInput())

    expect(result.severity).toBe('unknown')
    expect(result.status).toBe('not_configured')
  })

  it('severity ok when production + staging both READY', async () => {
    process.env.VERCEL_TOKEN = 'fake'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        deployments: [{ uid: 'dpl_1', url: 'x.vercel.app', state: 'READY', target: 'production', createdAt: 1 }]
      })
    })) as never

    const result = await checkVercelReadiness(buildInput())

    expect(result.severity).toBe('ok')
  })

  it('severity error when latest production NOT READY', async () => {
    process.env.VERCEL_TOKEN = 'fake'
    let callCount = 0

    global.fetch = vi.fn(async () => {
      callCount += 1

      if (callCount === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            deployments: [{ uid: 'dpl_1', url: 'x.vercel.app', state: 'ERROR', target: 'production', createdAt: 1 }]
          })
        }
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ deployments: [] })
      }
    }) as never

    const result = await checkVercelReadiness(buildInput())

    expect(result.severity).toBe('error')
    expect(result.summary).toContain('ERROR')
  })

  it('severity warning when no production deploys found', async () => {
    process.env.VERCEL_TOKEN = 'fake'
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ deployments: [] })
    })) as never

    const result = await checkVercelReadiness(buildInput())

    expect(result.severity).toBe('warning')
    expect(result.summary).toContain('Sin deployments')
  })

  it('severity unknown when API throws', async () => {
    process.env.VERCEL_TOKEN = 'fake'
    global.fetch = vi.fn(async () => {
      throw new Error('network')
    }) as never

    const result = await checkVercelReadiness(buildInput())

    expect(result.severity).toBe('unknown')
    expect(result.error).toContain('network')
  })
})
