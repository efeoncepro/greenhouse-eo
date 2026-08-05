import { describe, expect, it, vi } from 'vitest'

const runAppCommandRoute = vi.fn()
const runAppReadRoute = vi.fn()
const propose = vi.fn()
const confirm = vi.fn()
const status = vi.fn()
const preview = vi.fn()
const listOperations = vi.fn()
const getOperation = vi.fn()
const reconcileOperation = vi.fn()
const ensure = vi.fn()

vi.mock('@/lib/api-platform/core/app-auth', () => ({ runAppCommandRoute, runAppReadRoute }))
vi.mock('@/lib/api-platform/resources/app-globe-credit-funding', () => ({
  proposeAppGlobeCreditFunding: propose,
  confirmAppGlobeCreditFunding: confirm,
  getAppGlobeCreditCapacityStatus: status,
  previewAppGlobeCreditFunding: preview,
  listAppGlobeCreditFundingOperations: listOperations,
  getAppGlobeCreditFundingOperation: getOperation,
  reconcileAppGlobeCreditFundingOperation: reconcileOperation,
  ensureAppGlobeCreditFunding: ensure
}))

const { POST: proposePost } = await import('./propose/route')
const { POST: confirmPost } = await import('./confirm/route')
const { GET: statusGet } = await import('./status/route')
const { POST: previewPost } = await import('./preview/route')
const { GET: operationsGet } = await import('./operations/route')
const { GET: operationGet } = await import('./operations/[operationId]/route')
const { POST: reconcilePost } = await import('./operations/[operationId]/reconcile/route')
const { POST: ensurePost } = await import('./ensure/route')

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

  it('binds one-shot ensure to one end-to-end command route key', async () => {
    runAppCommandRoute.mockImplementationOnce(async input => input)
    const body = { authorityId: 'authority-1' }

    const request = new Request('https://greenhouse.example.test/api/platform/app/globe/credit-funding/ensure', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' }
    })

    await ensurePost(request)

    expect(runAppCommandRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        routeKey: 'platform.app.globe.credit_funding.ensure',
        body
      })
    )
  })

  it('binds status, preview and operation readback to read route keys', async () => {
    runAppReadRoute.mockImplementation(async input => input)
    const statusRequest = new Request('https://greenhouse.example.test/api/platform/app/globe/credit-funding/status')

    const previewRequest = new Request(
      'https://greenhouse.example.test/api/platform/app/globe/credit-funding/preview',
      {
        method: 'POST',
        body: JSON.stringify({ globeWorkspaceId: 'ws-1', requestedCredits: 10 })
      }
    )

    const listRequest = new Request('https://greenhouse.example.test/api/platform/app/globe/credit-funding/operations')

    const getRequest = new Request(
      'https://greenhouse.example.test/api/platform/app/globe/credit-funding/operations/op-1'
    )

    await statusGet(statusRequest)
    await previewPost(previewRequest)
    await operationsGet(listRequest)
    await operationGet(getRequest, { params: Promise.resolve({ operationId: 'op-1' }) })

    expect(runAppReadRoute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        routeKey: 'platform.app.globe.credit_funding.status'
      })
    )
    expect(runAppReadRoute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        routeKey: 'platform.app.globe.credit_funding.preview'
      })
    )
    expect(runAppReadRoute).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        routeKey: 'platform.app.globe.credit_funding.operations.list'
      })
    )
    expect(runAppReadRoute).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        routeKey: 'platform.app.globe.credit_funding.operations.get'
      })
    )
  })

  it('binds reconcile to the command wrapper with its own operation key', async () => {
    runAppCommandRoute.mockImplementationOnce(async input => input)

    const request = new Request(
      'https://greenhouse.example.test/api/platform/app/globe/credit-funding/operations/op-1/reconcile',
      {
        method: 'POST',
        body: JSON.stringify({ globeWorkspaceId: 'ws-1' }),
        headers: { 'content-type': 'application/json', 'idempotency-key': 'reconcile-key' }
      }
    )

    await reconcilePost(request, { params: Promise.resolve({ operationId: 'op-1' }) })

    expect(runAppCommandRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        routeKey: 'platform.app.globe.credit_funding.operations.reconcile',
        body: { globeWorkspaceId: 'ws-1' }
      })
    )
  })
})
