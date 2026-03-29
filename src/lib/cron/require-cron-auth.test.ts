import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireCronAuth } from '@/lib/cron/require-cron-auth'

describe('requireCronAuth', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('rejects requests without cron auth', async () => {
    vi.stubEnv('CRON_SECRET', 'super-secret')

    const { authorized, errorResponse } = requireCronAuth(new Request('https://example.com/api/cron/test'))

    expect(authorized).toBe(false)
    expect(errorResponse?.status).toBe(401)
    await expect(errorResponse?.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('accepts the correct bearer token', () => {
    vi.stubEnv('CRON_SECRET', 'super-secret')

    const { authorized, errorResponse } = requireCronAuth(new Request('https://example.com/api/cron/test', {
      headers: {
        authorization: 'Bearer super-secret'
      }
    }))

    expect(authorized).toBe(true)
    expect(errorResponse).toBeNull()
  })

  it('rejects an incorrect bearer token', async () => {
    vi.stubEnv('CRON_SECRET', 'super-secret')

    const { authorized, errorResponse } = requireCronAuth(new Request('https://example.com/api/cron/test', {
      headers: {
        authorization: 'Bearer wrong-secret'
      }
    }))

    expect(authorized).toBe(false)
    expect(errorResponse?.status).toBe(401)
    await expect(errorResponse?.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('accepts vercel cron headers as the secondary factor', () => {
    vi.stubEnv('CRON_SECRET', 'super-secret')

    const { authorized, errorResponse } = requireCronAuth(new Request('https://example.com/api/cron/test', {
      headers: {
        'x-vercel-cron': '1'
      }
    }))

    expect(authorized).toBe(true)
    expect(errorResponse).toBeNull()
  })

  it('accepts vercel cron user agents as the secondary factor', () => {
    vi.stubEnv('CRON_SECRET', 'super-secret')

    const { authorized, errorResponse } = requireCronAuth(new Request('https://example.com/api/cron/test', {
      headers: {
        'user-agent': 'vercel-cron/1.0'
      }
    }))

    expect(authorized).toBe(true)
    expect(errorResponse).toBeNull()
  })

  it('fails closed when CRON_SECRET is missing', async () => {
    vi.stubEnv('CRON_SECRET', '')

    const { authorized, errorResponse } = requireCronAuth(new Request('https://example.com/api/cron/test', {
      headers: {
        'x-vercel-cron': '1'
      }
    }))

    expect(authorized).toBe(false)
    expect(errorResponse?.status).toBe(503)
    await expect(errorResponse?.json()).resolves.toEqual({ error: 'Server misconfiguration' })
  })
})
