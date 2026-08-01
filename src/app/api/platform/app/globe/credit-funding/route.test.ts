import { describe, expect, it, vi } from 'vitest'

const runAppCommandRoute = vi.fn()
const propose = vi.fn()
const confirm = vi.fn()

vi.mock('@/lib/api-platform/core/app-auth', () => ({ runAppCommandRoute }))
vi.mock('@/lib/api-platform/resources/app-globe-credit-funding', () => ({
  proposeAppGlobeCreditFunding: propose,
  confirmAppGlobeCreditFunding: confirm
}))

const { POST: proposePost } = await import('./propose/route')
const { POST: confirmPost } = await import('./confirm/route')

describe('API Platform Globe credit funding routes', () => {
  it('binds propose to the app command/idempotency route wrapper', async () => {
    runAppCommandRoute.mockImplementationOnce(async input => input)

    const body = {
      globeWorkspaceId: 'ws-1',
      poolId: 'pool-1',
      grantCredits: 10,
      periodStart: '2026-08-01',
      periodEnd: '2026-09-01'
    }

    const request = new Request('https://greenhouse.example.test/api/platform/app/globe/credit-funding/propose', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json', 'idempotency-key': 'propose-key' }
    })

    await proposePost(request)

    expect(runAppCommandRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        routeKey: 'platform.app.globe.credit_funding.propose',
        body,
        handler: expect.any(Function)
      })
    )
  })

  it('binds confirm to a separate command route key', async () => {
    runAppCommandRoute.mockImplementationOnce(async input => input)

    const body = { globeWorkspaceId: 'ws-1', proposalId: 'p-1', fingerprint: 'f-1' }

    const request = new Request('https://greenhouse.example.test/api/platform/app/globe/credit-funding/confirm', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json', 'idempotency-key': 'confirm-key' }
    })

    await confirmPost(request)

    expect(runAppCommandRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        routeKey: 'platform.app.globe.credit_funding.confirm',
        body,
        handler: expect.any(Function)
      })
    )
  })
})
