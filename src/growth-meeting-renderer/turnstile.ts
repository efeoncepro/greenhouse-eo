export interface MeetingTurnstileHandle {
  destroy(): void
}

export interface MeetingTurnstilePort {
  mount(input: {
    container: HTMLElement
    siteKey: string
    action: string
    onToken(token: string): void
    onExpired(): void
  }): MeetingTurnstileHandle | null
}

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string | number
  remove?(widgetId: string | number): void
  reset?(widgetId: string | number): void
}

export const createMeetingTurnstilePort = (win: Window & { turnstile?: TurnstileApi } = window): MeetingTurnstilePort => ({
  mount(input) {
    if (!win.turnstile) return null

    const widgetId = win.turnstile.render(input.container, {
      sitekey: input.siteKey,
      action: input.action,
      callback: input.onToken,
      'expired-callback': input.onExpired,
      'error-callback': input.onExpired,
    })

    return {
      destroy: () => {
        try {
          win.turnstile?.remove?.(widgetId)
        } catch {
          win.turnstile?.reset?.(widgetId)
        }
      },
    }
  },
})
