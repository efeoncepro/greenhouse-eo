type TurnstileWidgetId = string | number

export interface MeetingTurnstileHandle {
  execute(): Promise<string>
  reset(): void
  destroy(): void
}

export interface MeetingTurnstilePort {
  mount(input: {
    container: HTMLElement
    siteKey: string
    action: string
  }): MeetingTurnstileHandle | null
}

interface TurnstileRenderOptions {
  sitekey: string
  action: string
  appearance: 'interaction-only'
  execution: 'execute'
  callback(token: string): void
  'expired-callback'(): void
  'error-callback'(): void
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): TurnstileWidgetId
  execute(widgetId: TurnstileWidgetId): void
  remove?(widgetId: TurnstileWidgetId): void
  reset(widgetId: TurnstileWidgetId): void
}

type TurnstileWindow = Window & { turnstile?: TurnstileApi }

const SCRIPT_ID = 'greenhouse-meeting-turnstile-script'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const TOKEN_TIMEOUT_MS = 15_000

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
    let widgetId: TurnstileWidgetId | null = null
    let destroyed = false
    let pending: {
      resolve(token: string): void
      reject(error: Error): void
      timeout: ReturnType<typeof setTimeout>
    } | null = null

    input.container.setAttribute('aria-hidden', 'true')

    const rejectToken = (error: Error): void => {
      if (!pending) return

      const current = pending

      clearTimeout(current.timeout)
      pending = null
      current.reject(error)
    }

    const resolveToken = (token: string): void => {
      if (!pending) return

      const current = pending

      clearTimeout(current.timeout)
      pending = null
      if (token) current.resolve(token)
      else current.reject(new Error('turnstile_token_empty'))
    }

    const ensureWidget = async (): Promise<TurnstileApi> => {
      if (destroyed) throw new Error('turnstile_destroyed')
      if (api && widgetId !== null) return api

      const loadedApi = await loadTurnstile(win)

      if (destroyed) throw new Error('turnstile_destroyed')

      api = loadedApi
      widgetId = loadedApi.render(input.container, {
        sitekey: input.siteKey,
        action: input.action,
        appearance: 'interaction-only',
        execution: 'execute',
        callback: resolveToken,
        'expired-callback': () => rejectToken(new Error('turnstile_token_expired')),
        'error-callback': () => rejectToken(new Error('turnstile_token_failed')),
      })

      return loadedApi
    }

    return {
      execute: async () => {
        const loadedApi = await ensureWidget()

        if (pending) rejectToken(new Error('turnstile_execute_interrupted'))

        return new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => {
            pending = null
            reject(new Error('turnstile_token_timeout'))
          }, TOKEN_TIMEOUT_MS)

          pending = { resolve, reject, timeout }
          loadedApi.execute(widgetId!)
        })
      },
      reset: () => {
        if (api && widgetId !== null) api.reset(widgetId)
      },
      destroy: () => {
        destroyed = true
        rejectToken(new Error('turnstile_destroyed'))

        if (!api || widgetId === null) return

        try {
          api.remove?.(widgetId)
        } catch {
          api.reset(widgetId)
        }
      },
    }
  },
})
