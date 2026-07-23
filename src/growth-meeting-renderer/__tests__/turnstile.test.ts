// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createMeetingTurnstilePort,
  resetMeetingTurnstileLoaderForTests,
} from '../turnstile'

const turnstileWindow = () => window as Window & {
  turnstile?: {
    render(container: HTMLElement, options: Record<string, unknown>): string | number
    remove(widgetId: string | number): void
    reset(widgetId: string | number): void
  }
}

describe('meeting Turnstile port', () => {
  afterEach(() => {
    document.getElementById('greenhouse-meeting-turnstile-script')?.remove()
    delete turnstileWindow().turnstile
    resetMeetingTurnstileLoaderForTests()
  })

  it('loads the explicit Turnstile API before rendering the widget', async () => {
    const container = document.createElement('div')
    const onToken = vi.fn()
    const onExpired = vi.fn()

    Object.defineProperty(container, 'clientWidth', { value: 420 })

    const render = vi.fn((container: HTMLElement, options: Record<string, unknown>) => {
      void container
      void options

      return 'meeting-widget'
    })

    const remove = vi.fn((widgetId: string | number) => {
      void widgetId
    })

    const reset = vi.fn((widgetId: string | number) => {
      void widgetId
    })

    createMeetingTurnstilePort(turnstileWindow()).mount({
      container,
      siteKey: 'site-key',
      action: 'meeting_booking',
      onToken,
      onExpired,
    })

    const script = document.getElementById('greenhouse-meeting-turnstile-script') as HTMLScriptElement

    expect(script.src).toBe('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit')
    expect(render).not.toHaveBeenCalled()

    turnstileWindow().turnstile = { render, remove, reset }
    script.dispatchEvent(new Event('load'))
    await Promise.resolve()

    expect(render).toHaveBeenCalledWith(container, expect.objectContaining({
      sitekey: 'site-key',
      action: 'meeting_booking',
      size: 'flexible',
      callback: onToken,
      'expired-callback': onExpired,
      'error-callback': onExpired,
    }))
  })

  it('uses the compact widget when the form cannot fit the normal width', async () => {
    const container = document.createElement('div')

    const render = vi.fn((container: HTMLElement, options: Record<string, unknown>) => {
      void container
      void options

      return 'meeting-widget'
    })

    Object.defineProperty(container, 'clientWidth', { value: 240 })
    turnstileWindow().turnstile = {
      render,
      remove: vi.fn((widgetId: string | number) => {
        void widgetId
      }),
      reset: vi.fn((widgetId: string | number) => {
        void widgetId
      }),
    }

    createMeetingTurnstilePort(turnstileWindow()).mount({
      container,
      siteKey: 'site-key',
      action: 'meeting_booking',
      onToken: vi.fn(),
      onExpired: vi.fn(),
    })
    await Promise.resolve()

    expect(render).toHaveBeenCalledWith(container, expect.objectContaining({ size: 'compact' }))
  })

  it('does not render a widget when the host is destroyed while the API loads', async () => {
    const render = vi.fn((container: HTMLElement, options: Record<string, unknown>) => {
      void container
      void options

      return 'meeting-widget'
    })

    const handle = createMeetingTurnstilePort(turnstileWindow()).mount({
      container: document.createElement('div'),
      siteKey: 'site-key',
      action: 'meeting_booking',
      onToken: vi.fn(),
      onExpired: vi.fn(),
    })

    const script = document.getElementById('greenhouse-meeting-turnstile-script') as HTMLScriptElement

    handle?.destroy()
    turnstileWindow().turnstile = {
      render,
      remove: vi.fn((widgetId: string | number) => {
        void widgetId
      }),
      reset: vi.fn((widgetId: string | number) => {
        void widgetId
      }),
    }
    script.dispatchEvent(new Event('load'))
    await Promise.resolve()

    expect(render).not.toHaveBeenCalled()
  })
})
