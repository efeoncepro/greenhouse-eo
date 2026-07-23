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

type TurnstileWindow = Window & { turnstile?: TurnstileApi }

const SCRIPT_ID = 'greenhouse-meeting-turnstile-script'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let loadPromise: Promise<TurnstileApi> | null = null

const loadTurnstile = (win: TurnstileWindow): Promise<TurnstileApi> => {
  if (win.turnstile) return Promise.resolve(win.turnstile)
  if (loadPromise) return loadPromise

  loadPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const doc = win.document
    const existing = doc.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    const script = existing ?? doc.createElement('script')

    const cleanup = () => {
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
    }

    const onLoad = () => {
      cleanup()

      if (win.turnstile) resolve(win.turnstile)
      else {
        loadPromise = null
        reject(new Error('turnstile_api_unavailable'))
      }
    }

    const onError = () => {
      cleanup()
      loadPromise = null
      if (!existing) script.remove()
      reject(new Error('turnstile_script_failed'))
    }

    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })

    if (!existing) {
      script.id = SCRIPT_ID
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      ;(doc.head ?? doc.documentElement).appendChild(script)
    }
  })

  return loadPromise
}

export const resetMeetingTurnstileLoaderForTests = (): void => {
  loadPromise = null
}

export const createMeetingTurnstilePort = (win: TurnstileWindow = window): MeetingTurnstilePort => ({
  mount(input) {
    let api: TurnstileApi | null = null
    let widgetId: string | number | null = null
    let destroyed = false

    void loadTurnstile(win)
      .then(loadedApi => {
        if (destroyed) return

        api = loadedApi
        widgetId = loadedApi.render(input.container, {
          sitekey: input.siteKey,
          action: input.action,
          callback: input.onToken,
          'expired-callback': input.onExpired,
          'error-callback': input.onExpired,
        })
      })
      .catch(() => {
        if (!destroyed) input.onExpired()
      })

    return {
      destroy: () => {
        destroyed = true
        if (!api || widgetId === null) return

        try {
          api.remove?.(widgetId)
        } catch {
          api.reset?.(widgetId)
        }
      },
    }
  },
})
