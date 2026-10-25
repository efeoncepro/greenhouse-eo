import type { AUTH_LOGIN_COPY } from '@/lib/copy/auth-server-login'

/**
 * Controlador del login por passkey (`/login`). Se serializa dentro de ESA página y se sirve con
 * nonce; todo lo que toque el navegador vive dentro de esta función.
 *
 * Por qué el botón nace oculto en el HTML: sin JavaScript no hay ceremonia WebAuthn posible, así que
 * un botón server-rendered visible sería un control que no puede cumplir. El servidor lo manda
 * oculto y este controlador lo revela SÓLO si el navegador tiene la API. Sin JS, la persona ve el
 * camino que sí funciona —el enlace por correo— y ninguno que no.
 */
export function installLoginController(
  root: HTMLElement,
  copy: typeof AUTH_LOGIN_COPY,
  deps: {
    fetch: typeof fetch
    credentials: Pick<CredentialsContainer, 'get'> | undefined
    supported: boolean
    navigate: (url: string) => void
  }
) {
  const status = root.querySelector<HTMLElement>('[data-login-status]')!
  const button = root.querySelector<HTMLButtonElement>('[data-login-passkey]')!
  const returnTo = root.querySelector<HTMLInputElement>('[name="return_to"]')?.value ?? ''
  let busy = false

  if (!deps.supported || !deps.credentials) {
    // `unsupported` es del dispositivo: se retira el control y NO se ofrece reintento (reintentar
    // acá manda a la persona a revisar lo que no es). El enlace por correo queda como único camino.
    button.remove()
    status.textContent = copy.unsupported

    return
  }

  button.hidden = false

  const decode = (value: string) =>
    Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

  const encode = (value: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(value)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

  const post = async (path: string, body: unknown) => {
    const response = await deps.fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store'
    })

    const data = (await response.json()) as Record<string, unknown>

    if (!response.ok) throw new Error(response.status === 429 ? 'limited' : 'failed')

    return data
  }

  /**
   * Destino tras autenticar. Sólo dos rutas del PROPIO origen: volver al authorize que trajo a la
   * persona, o su sesión. Cualquier otra cosa —otro origen, otro path, un fragmento— se descarta:
   * `return_to` llega por query y un redirect abierto acá entregaría la sesión recién creada.
   */
  const finish = () => {
    const origin = root.ownerDocument.location.origin
    const fallback = '/auth/session'

    if (!returnTo) return deps.navigate(fallback)

    let target: URL

    try {
      target = new URL(returnTo, origin)
    } catch {
      return deps.navigate(fallback)
    }

    const allowed = target.origin === origin && !target.hash && ['/oauth/authorize', fallback].includes(target.pathname)

    deps.navigate(allowed ? target.pathname + target.search : fallback)
  }

  button.addEventListener('click', () => {
    if (busy) return
    busy = true
    button.setAttribute('aria-busy', 'true')
    button.disabled = true
    status.textContent = copy.pending

    void (async () => {
      try {
        const started = await post('/auth/passkeys/authenticate/start', {})

        const options = started.options as {
          challenge: string
          rpId?: string
          timeout?: number
          userVerification?: UserVerificationRequirement
        }

        if (started.status !== 'ready' || typeof options?.challenge !== 'string') throw new Error('failed')

        // Sin `allowCredentials` a propósito: la credencial la elige el autenticador. Pedirle la
        // lista al servidor antes de autenticar sería un oráculo de qué correos existen.
        const credential = (await deps.credentials!.get({
          publicKey: { ...options, challenge: decode(options.challenge) }
        })) as PublicKeyCredential | null

        if (!credential) throw new Error('failed')
        const assertion = credential.response as AuthenticatorAssertionResponse

        const result = await post('/auth/passkeys/authenticate/finish', {
          challenge: options.challenge,
          response: {
            id: credential.id,
            rawId: encode(credential.rawId),
            type: credential.type,
            clientExtensionResults: credential.getClientExtensionResults(),
            response: {
              authenticatorData: encode(assertion.authenticatorData),
              clientDataJSON: encode(assertion.clientDataJSON),
              signature: encode(assertion.signature),
              userHandle: assertion.userHandle ? encode(assertion.userHandle) : null
            }
          }
        })

        if (result.status !== 'authenticated') throw new Error('failed')
        finish()
      } catch (error) {
        status.textContent = error instanceof Error && error.message === 'limited' ? copy.limited : copy.failed
      } finally {
        busy = false
        button.removeAttribute('aria-busy')
        button.disabled = false
      }
    })()
  })
}

/** Small native adapter for the V4 editorial carousel; no dependency on auth success or remote data. */
export function installLoginCarousel(
  root: HTMLElement | null,
  copy: { pause: string; play: string },
  options: { reducedMotion: boolean; intervalMs: number }
) {
  if (!root) return
  const slides = [...root.querySelectorAll<HTMLElement>('[data-login-slide]')]
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-login-slide-index]')]
  const pause = root.querySelector<HTMLButtonElement>('[data-login-carousel-pause]')

  if (slides.length < 2 || !pause) return
  let current = 0
  let manualPause = options.reducedMotion
  let hover = false
  let focused = false
  const win = root.ownerDocument.defaultView!
  const doc = root.ownerDocument

  const updatePause = () => {
    pause.setAttribute('aria-label', manualPause ? copy.play : copy.pause)
    pause.setAttribute('aria-pressed', String(manualPause))
    pause.textContent = manualPause ? '▶' : 'Ⅱ'
    root.setAttribute('aria-live', manualPause ? 'polite' : 'off')
  }

  const select = (next: number) => {
    current = next
    slides.forEach((slide, index) => { slide.hidden = index !== current })
    tabs.forEach((tab, index) => tab.setAttribute('aria-current', String(index === current)))
  }

  tabs.forEach((tab, index) => tab.addEventListener('click', () => {
    select(index)
    manualPause = true
    updatePause()
  }))
  pause.addEventListener('click', () => { manualPause = !manualPause; updatePause() })
  root.addEventListener('mouseenter', () => { hover = true })
  root.addEventListener('mouseleave', () => { hover = false })
  root.addEventListener('focusin', () => { focused = true })
  root.addEventListener('focusout', event => { focused = !!event.relatedTarget && root.contains(event.relatedTarget as Node) })

  const timer = win.setInterval(() => {
    if (!manualPause && !hover && !focused && !doc.hidden) select((current + 1) % slides.length)
  }, options.intervalMs)

  win.addEventListener('pagehide', () => win.clearInterval(timer), { once: true })
  updatePause()
}

/** Keep the same source lens geometry at every viewport; CSS remains nonce/hash governed. */
export function installLoginLenses(root: Document, anatomy: { ringAirRatio: number; zoom: number; sphereRadiusScale: number; endDeg: number }): void {
  for (const svg of root.querySelectorAll<SVGSVGElement>('[data-login-lens]')) {
    const update = () => {
      const { width, height } = svg.getBoundingClientRect()

      if (!width || !height) return
      const cx = width * Number(svg.dataset.lensX) / 100
      const cy = height * Number(svg.dataset.lensY) / 100
      const radius = Math.min(width, height) * Number(svg.dataset.lensRadius)
      const ring = radius * (1 + anatomy.ringAirRatio)
      const angle = anatomy.endDeg * Math.PI / 180

      const set = (element: Element | null, attrs: Record<string, number | string>) => {
        for (const [name, value] of Object.entries(attrs)) element?.setAttribute(name, String(value))
      }

      set(svg, { viewBox: `0 0 ${width} ${height}` })
      for (const image of svg.querySelectorAll('image')) set(image, { width, height })
      set(svg.querySelector('clipPath circle'), { cx, cy, r: radius })
      set(svg.querySelector('.id-v4-lens-ring'), { cx, cy, r: ring })
      set(svg.querySelector('.id-v4-lens-arc'), { transform: `translate(${cx} ${cy}) scale(${ring})` })
      set(svg.querySelector('.id-v4-lens-sphere'), { cx: cx + ring * Math.cos(angle), cy: cy + ring * Math.sin(angle), r: anatomy.sphereRadiusScale * width })
      set(svg.querySelector('.id-v4-lens-inside'), { transform: `translate(${cx} ${cy}) scale(${anatomy.zoom}) translate(${-cx} ${-cy})` })
    }

    update()
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(update).observe(svg)
  }
}
