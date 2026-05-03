/**
 * TASK-775 Slice 1 — tests del cron handler wrapper canónico.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockCaptureWithDomain = vi.fn()

const mockRedactErrorForResponse = vi.fn((err: unknown) =>
  err instanceof Error ? err.message : String(err)
)

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

vi.mock('@/lib/observability/redact', () => ({
  redactErrorForResponse: (err: unknown) => mockRedactErrorForResponse(err)
}))

import { wrapCronHandler } from './cron-handler-wrapper'

const buildRes = () => {
  const written: Array<{ status: number; body: string }> = []
  let currentStatus = 200

  const res = {
    writeHead: vi.fn((status: number) => {
      currentStatus = status
    }),
    end: vi.fn((body: string) => {
      written.push({ status: currentStatus, body })
    })
  } as unknown as ServerResponse & {
    writeHead: ReturnType<typeof vi.fn>
    end: ReturnType<typeof vi.fn>
  }

  return { res, written }
}

const buildReq = (body?: string): IncomingMessage => {
  const handlers: Record<string, ((arg: unknown) => void)[]> = {}

  return {
    on: (event: string, handler: (arg: unknown) => void) => {
      handlers[event] = handlers[event] || []
      handlers[event].push(handler)

      // Simulate body chunks immediately
      if (event === 'data' && body) {
        handler(Buffer.from(body, 'utf8'))
      }

      // Trigger 'end' after data handlers registered
      if (event === 'end') {
        setImmediate(() => handler(undefined))
      }
    }
  } as unknown as IncomingMessage
}

beforeEach(() => {
  mockCaptureWithDomain.mockReset()
  mockRedactErrorForResponse.mockClear()
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('wrapCronHandler — TASK-775 canonical helper', () => {
  it('returns 200 OK with merged result + runId + durationMs', async () => {
    const handler = wrapCronHandler({
      name: 'test-cron',
      domain: 'sync',
      run: async () => ({ processed: 5, skipped: 2 })
    })

    const { res, written } = buildRes()
    const req = buildReq()

    await handler(req, res)

    expect(written).toHaveLength(1)
    expect(written[0].status).toBe(200)

    const parsed = JSON.parse(written[0].body)

    expect(parsed.ok).toBe(true)
    expect(parsed.processed).toBe(5)
    expect(parsed.skipped).toBe(2)
    expect(parsed.runId).toMatch(/^test-cron-/)
    expect(typeof parsed.durationMs).toBe('number')
    expect(mockCaptureWithDomain).not.toHaveBeenCalled()
  })

  it('returns 502 + emits Sentry when run() throws', async () => {
    const error = new Error('something broke')

    const handler = wrapCronHandler({
      name: 'fail-cron',
      domain: 'integrations.hubspot',
      run: async () => {
        throw error
      }
    })

    const { res, written } = buildRes()
    const req = buildReq()

    await handler(req, res)

    expect(written).toHaveLength(1)
    expect(written[0].status).toBe(502)

    const parsed = JSON.parse(written[0].body)

    expect(parsed.ok).toBe(false)
    expect(parsed.error).toBe('something broke')
    expect(parsed.runId).toMatch(/^fail-cron-/)

    expect(mockCaptureWithDomain).toHaveBeenCalledTimes(1)
    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      error,
      'integrations.hubspot',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'ops_worker_cron_fail_cron' }),
        extra: expect.objectContaining({ runId: expect.stringMatching(/^fail-cron-/) })
      })
    )
  })

  it('handles void result (no merge needed)', async () => {
    const handler = wrapCronHandler({
      name: 'void-cron',
      domain: 'sync',
      run: async () => undefined
    })

    const { res, written } = buildRes()
    const req = buildReq()

    await handler(req, res)

    const parsed = JSON.parse(written[0].body)

    expect(parsed.ok).toBe(true)
    expect(parsed.runId).toBeDefined()
  })

  it('passes parsed body to run()', async () => {
    let received: Record<string, unknown> = {}

    const handler = wrapCronHandler({
      name: 'body-cron',
      domain: 'sync',
      run: async body => {
        received = body

        return { received: true }
      }
    })

    const { res } = buildRes()
    const req = buildReq('{"customParam":"value","limit":10}')

    await handler(req, res)

    expect(received).toEqual({ customParam: 'value', limit: 10 })
  })
})
