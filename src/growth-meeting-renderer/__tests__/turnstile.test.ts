// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createMeetingTurnstilePort,
  resetMeetingTurnstileLoaderForTests,
} from '../turnstile'

const turnstileWindow = () => window as Window & {
  turnstile?: {
    render(container: HTMLElement, options: Record<string, unknown>): string | number
    execute(widgetId: string | number): void
    remove(widgetId: string | number): void
    reset(widgetId: string | number): void
  }
}

describe('meeting Turnstile port', () => {
  afterEach(() => {
    document.getElementById('greenhouse-meeting-turnstile-script')?.remove()
    delete turnstileWindow().turnstile
    resetMeetingTurnstileLoaderForTests()
    vi.useRealTimers()
  })

  it('loads and executes Turnstile only when a booking requests a token', async () => {
    const container = document.createElement('div')
    let renderOptions: Record<string, unknown> = {}

    const render = vi.fn((_container: HTMLElement, options: Record<string, unknown>) => {
      renderOptions = options

      return 'meeting-widget'
    })

    const execute = vi.fn(() => {
      ;(renderOptions.callback as (token: string) => void)('meeting-token')
    })

    const handle = createMeetingTurnstilePort(turnstileWindow()).mount({
      container,
      siteKey: 'site-key',
      action: 'meeting_booking',
    })!

    expect(container.getAttribute('aria-hidden')).toBe('true')
    expect(document.getElementById('greenhouse-meeting-turnstile-script')).toBeNull()
    expect(render).not.toHaveBeenCalled()

    const tokenPromise = handle.execute()
    const script = document.getElementById('greenhouse-meeting-turnstile-script') as HTMLScriptElement

    expect(script.src).toBe('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit')
    turnstileWindow().turnstile = {
      render,
      execute,
      remove: vi.fn(),
      reset: vi.fn(),
    }
    script.dispatchEvent(new Event('load'))

    await expect(tokenPromise).resolves.toBe('meeting-token')
    expect(render).toHaveBeenCalledWith(container, expect.objectContaining({
      sitekey: 'site-key',
      action: 'meeting_booking',
      appearance: 'interaction-only',
      execution: 'execute',
    }))
    expect(execute).toHaveBeenCalledWith('meeting-widget')
  })

  it('rejects an active token request when the widget reports an error', async () => {
    let renderOptions: Record<string, unknown> = {}

    turnstileWindow().turnstile = {
      render: vi.fn((_container, options) => {
        renderOptions = options

        return 'meeting-widget'
      }),
      execute: vi.fn(() => {
        ;(renderOptions['error-callback'] as () => void)()
      }),
      remove: vi.fn(),
      reset: vi.fn(),
    }

    const handle = createMeetingTurnstilePort(turnstileWindow()).mount({
      container: document.createElement('div'),
      siteKey: 'site-key',
      action: 'meeting_booking',
    })!

    await expect(handle.execute()).rejects.toThrow('turnstile_token_failed')
  })

  it('does not render a widget when the host is destroyed while the API loads', async () => {
    const render = vi.fn(() => 'meeting-widget')

    const handle = createMeetingTurnstilePort(turnstileWindow()).mount({
      container: document.createElement('div'),
      siteKey: 'site-key',
      action: 'meeting_booking',
    })!

    const tokenPromise = handle.execute()
    const script = document.getElementById('greenhouse-meeting-turnstile-script') as HTMLScriptElement

    handle.destroy()
    turnstileWindow().turnstile = {
      render,
      execute: vi.fn(),
      remove: vi.fn(),
      reset: vi.fn(),
    }
    script.dispatchEvent(new Event('load'))

    await expect(tokenPromise).rejects.toThrow('turnstile_destroyed')
    expect(render).not.toHaveBeenCalled()
  })
})
