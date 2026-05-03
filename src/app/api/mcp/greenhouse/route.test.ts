import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockHandleGreenhouseMcpRemoteRequest = vi.fn()

vi.mock('@/mcp/greenhouse/remote', () => ({
  handleGreenhouseMcpRemoteRequest: (...args: unknown[]) => mockHandleGreenhouseMcpRemoteRequest(...args)
}))

const route = await import('./route')

describe('/api/mcp/greenhouse route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHandleGreenhouseMcpRemoteRequest.mockResolvedValue(Response.json({ ok: true }))
  })

  it('routes POST, GET and DELETE through the shared remote MCP handler', async () => {
    const postRequest = new Request('https://example.com/api/mcp/greenhouse', { method: 'POST' })
    const getRequest = new Request('https://example.com/api/mcp/greenhouse', { method: 'GET' })
    const deleteRequest = new Request('https://example.com/api/mcp/greenhouse', { method: 'DELETE' })

    await route.POST(postRequest)
    await route.GET(getRequest)
    await route.DELETE(deleteRequest)

    expect(mockHandleGreenhouseMcpRemoteRequest).toHaveBeenNthCalledWith(1, postRequest)
    expect(mockHandleGreenhouseMcpRemoteRequest).toHaveBeenNthCalledWith(2, getRequest)
    expect(mockHandleGreenhouseMcpRemoteRequest).toHaveBeenNthCalledWith(3, deleteRequest)
  })

  it('declares node runtime and dynamic rendering for MCP transport compatibility', () => {
    expect(route.runtime).toBe('nodejs')
    expect(route.dynamic).toBe('force-dynamic')
  })
})
