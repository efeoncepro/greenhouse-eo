import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import type * as NodeChildProcessModule from 'node:child_process'
import type { ChildProcess as NodeChildProcess } from 'node:child_process'

import { describe, expect, it, vi } from 'vitest'

import {
  resolveSentrySourcemapUploadTimeoutMs,
  runSentrySourcemapUploadWithTimeout
} from './sourcemap-upload-timeout'

const require = createRequire(import.meta.url)

describe('sentry sourcemap upload timeout', () => {
  it('uses a bounded timeout from env-like input', () => {
    expect(resolveSentrySourcemapUploadTimeoutMs()).toBe(60_000)
    expect(resolveSentrySourcemapUploadTimeoutMs('not-a-number')).toBe(60_000)
    expect(resolveSentrySourcemapUploadTimeoutMs('1000')).toBe(5_000)
    expect(resolveSentrySourcemapUploadTimeoutMs('999999')).toBe(240_000)
    expect(resolveSentrySourcemapUploadTimeoutMs('90000')).toBe(90_000)
  })

  it('returns completed when the upload finishes inside the budget', async () => {
    const logger = { warn: vi.fn() }

    const result = await runSentrySourcemapUploadWithTimeout(() => Promise.resolve(), {
      logger,
      timeoutMs: 50
    })

    expect(result).toEqual({ status: 'completed' })
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('degrades when the upload promise hangs', async () => {
    const logger = { warn: vi.fn() }

    const result = await runSentrySourcemapUploadWithTimeout(() => new Promise(() => undefined), {
      logger,
      timeoutMs: 20
    })

    expect(result.status).toBe('degraded')
    expect(result).toMatchObject({ timedOut: true })
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Continuing deployment'))
  })

  it('kills a tracked sentry-cli subprocess when the upload times out', async () => {
    const logger = { warn: vi.fn() }
    const childProcess = require('node:child_process') as typeof NodeChildProcessModule
    const originalSpawn = childProcess.spawn
    const fakeChildState = { killed: false }

    const fakeChild = Object.assign(new EventEmitter(), {
      killed: fakeChildState.killed,
      kill: vi.fn((signal?: NodeJS.Signals) => {
        fakeChildState.killed = true
        fakeChild.emit('exit', null, signal)

        return true
      })
    }) as unknown as NodeChildProcess & { kill: ReturnType<typeof vi.fn> }

    try {
      childProcess.spawn = vi.fn(() => fakeChild) as unknown as typeof childProcess.spawn

      const result = await runSentrySourcemapUploadWithTimeout(
        () => {
          childProcess.spawn('/tmp/sentry-cli', ['--version'])

          return new Promise(() => undefined)
        },
        {
          logger,
          timeoutMs: 20
        }
      )

      expect(result.status).toBe('degraded')
      expect(fakeChild.kill).toHaveBeenCalledWith('SIGTERM')
      expect(fakeChildState.killed).toBe(true)
    } finally {
      childProcess.spawn = originalSpawn
    }
  })
})
