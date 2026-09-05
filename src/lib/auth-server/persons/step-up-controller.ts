import type { AUTH_STEP_UP_COPY } from '@/lib/copy/auth-server-step-up'

/** Serialized into this page only. Keep all browser helpers inside this function. */
export function installStepUpController(
  root: HTMLElement,
  copy: typeof AUTH_STEP_UP_COPY,
  deps: {
    fetch: typeof fetch
    credentials: Pick<CredentialsContainer, 'get'> | undefined
    navigate: (url: string) => void
    renderQr?: (value: string) => Promise<string>
  }
) {
  const status = root.querySelector<HTMLElement>('[data-step-status]')!
  const returnTo = root.querySelector<HTMLInputElement>('[name="return_to"]')!.value
  const setup = root.querySelector<HTMLElement>('[data-step-setup]')!
  let busy = false
  let enrolled = false

  const clearSecrets = () => {
    root.querySelector<HTMLImageElement>('[data-step-qr]')!.removeAttribute('src')
    root.querySelector<HTMLImageElement>('[data-step-qr]')!.hidden = true
    root.querySelector<HTMLElement>('[data-step-secret]')!.textContent = ''
    root.querySelector<HTMLElement>('[data-step-backups]')!.textContent = ''
    root.querySelector<HTMLInputElement>('[name="code"]')!.value = ''
    root.querySelector<HTMLInputElement>('[name="saved"]')!.checked = false
  }

  const post = async (path: string, body: unknown) => {
    const response = await deps.fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store'
    })

    const data = (await response.json()) as Record<string, unknown>

    if (!response.ok)
      throw new Error(
        response.status === 429
          ? 'limited'
          : response.status === 503
            ? 'unavailable'
            : data.status === 'unauthenticated' || data.status === 'access_revoked'
              ? 'expired'
              : 'rejected'
      )

    return data
  }

  const finish = () => {
    const target = new URL(returnTo, root.ownerDocument.location.origin)

    if (target.origin !== root.ownerDocument.location.origin || target.pathname !== '/oauth/authorize' || target.hash)
      throw new Error('rejected')
    clearSecrets()
    deps.navigate(target.pathname + target.search)
  }

  const run = async (work: () => Promise<void>) => {
    if (busy) return
    busy = true
    root.setAttribute('aria-busy', 'true')
    status.textContent = copy.pending

    try {
      await work()
    } catch (error) {
      const reason = error instanceof Error ? error.message : ''

      status.textContent =
        reason === 'limited'
          ? copy.limited
          : reason === 'expired'
            ? copy.expired
            : reason === 'unavailable'
              ? copy.unavailable
              : reason === 'saveRequired'
                ? copy.saveRequired
                : reason === 'unsupported'
                  ? copy.unsupported
                  : error instanceof Error && error.name === 'NotAllowedError'
                    ? copy.cancelled
                    : copy.rejected
      if (reason === 'expired') clearSecrets()
    } finally {
      busy = false
      root.removeAttribute('aria-busy')
    }
  }

  root.querySelector<HTMLFormElement>('[data-step-code]')!.addEventListener('submit', event => {
    event.preventDefault()
    void run(async () => {
      if (enrolled && !root.querySelector<HTMLInputElement>('[name="saved"]')!.checked) throw new Error('saveRequired')

      const data = await post(enrolled ? '/auth/totp/enroll/finish' : '/auth/totp/verify', {
        code: root.querySelector<HTMLInputElement>('[name="code"]')!.value
      })

      if (data.status !== 'verified') throw new Error('rejected')
      finish()
    })
  })
  root.querySelector('[data-step-enroll]')?.addEventListener(
    'click',
    () =>
      void run(async () => {
        const data = await post('/auth/totp/enroll/start', {})

        if (
          data.status !== 'ready' ||
          typeof data.secret !== 'string' ||
          !Array.isArray(data.backupCodes) ||
          !data.backupCodes.every(code => typeof code === 'string')
        )
          throw new Error('unavailable')
        enrolled = true
        root.querySelector<HTMLElement>('[data-step-secret]')!.textContent = data.secret
        root.querySelector<HTMLElement>('[data-step-backups]')!.textContent = data.backupCodes.join('\n')

        if (deps.renderQr && typeof data.otpauthUri === 'string' && data.otpauthUri.startsWith('otpauth://totp/')) {
          const source = await deps.renderQr(data.otpauthUri)

          if (!source.startsWith('data:image/')) throw new Error('unavailable')
          const image = root.querySelector<HTMLImageElement>('[data-step-qr]')!

          image.src = source
          image.hidden = false
        }

        setup.hidden = false
        root.querySelector<HTMLFormElement>('[data-step-code]')!.hidden = false
        root.querySelector<HTMLElement>('[data-step-code-label]')!.textContent = copy.setupCode
        root.querySelector<HTMLButtonElement>('[data-step-submit]')!.textContent = copy.confirm
        root.querySelector<HTMLButtonElement>('[data-step-enroll]')!.hidden = true
        status.textContent = copy.setup
      })
  )

  const decode = (value: string) =>
    Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

  const encode = (value: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(value)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

  root.querySelector('[data-step-passkey]')?.addEventListener(
    'click',
    () =>
      void run(async () => {
        if (!deps.credentials) throw new Error('unsupported')
        const data = await post('/auth/passkeys/step-up/start', {})

        const options = data.options as {
          challenge: string
          rpId?: string
          timeout?: number
          userVerification?: UserVerificationRequirement
          allowCredentials?: { id: string; type: 'public-key' }[]
        }

        if (data.status !== 'ready' || typeof options?.challenge !== 'string') throw new Error('unavailable')

        const { challenge, allowCredentials, ...requestOptions } = options

        const credential = (await deps.credentials.get({
          publicKey: {
            ...requestOptions,
            challenge: decode(challenge),
            ...(allowCredentials
              ? { allowCredentials: allowCredentials.map(item => ({ ...item, id: decode(item.id) })) }
              : {})
          }
        })) as PublicKeyCredential | null

        if (!credential) throw new Error('rejected')
        const response = credential.response as AuthenticatorAssertionResponse

        const result = await post('/auth/passkeys/step-up/finish', {
          challenge: options.challenge,
          response: {
            id: credential.id,
            rawId: encode(credential.rawId),
            type: credential.type,
            clientExtensionResults: credential.getClientExtensionResults(),
            response: {
              authenticatorData: encode(response.authenticatorData),
              clientDataJSON: encode(response.clientDataJSON),
              signature: encode(response.signature),
              userHandle: response.userHandle ? encode(response.userHandle) : null
            }
          }
        })

        if (result.status !== 'verified') throw new Error('rejected')
        finish()
      })
  )
  root.querySelector('[data-step-cancel]')?.addEventListener('click', clearSecrets)
  root.ownerDocument.defaultView?.addEventListener('pagehide', clearSecrets)
}
