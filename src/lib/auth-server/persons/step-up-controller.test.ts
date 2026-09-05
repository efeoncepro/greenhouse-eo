import { JSDOM } from 'jsdom'
import { describe, expect, it, vi } from 'vitest'

import { renderStepUpPage } from './step-up-page'
import { installStepUpController } from './step-up-controller'
import { AUTH_STEP_UP_COPY } from '@/lib/copy/auth-server-step-up'

const model = {
  returnTo: '/oauth/authorize?client_id=test&state=state',
  authLevel: 'primary' as const,
  hasTotp: true,
  hasPasskey: true
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const domFixture = (options = { ...model }) => {
  const response = renderStepUpPage(options)
  const dom = new JSDOM(response.body, { url: 'https://auth.example/login/step-up' })
  const root = dom.window.document.querySelector<HTMLElement>('[data-capture="auth-step-up"]')!
  const fetcher = vi.fn<typeof fetch>()
  const navigate = vi.fn()

  installStepUpController(root, AUTH_STEP_UP_COPY, { fetch: fetcher, credentials: undefined, navigate })

  return { dom, root, fetcher, navigate, response }
}

describe('step-up browser behavior', () => {
  it('verifies alphanumeric backup code and returns only after verified status', async () => {
    const f = domFixture()

    expect(f.root.querySelector('[data-step-code-label]')!.textContent).toBe(AUTH_STEP_UP_COPY.codeLabel)

    f.fetcher
      .mockResolvedValueOnce(reply({ status: 'rejected' }, 400))
      .mockResolvedValueOnce(reply({ status: 'verified' }))
    const code = f.root.querySelector<HTMLInputElement>('[name=code]')!
    const form = f.root.querySelector('form')!

    code.value = 'ABCD-EFGH'
    form.dispatchEvent(new f.dom.window.Event('submit', { cancelable: true }))
    await flush()
    expect(f.navigate).not.toHaveBeenCalled()
    expect(f.root.textContent).toContain(AUTH_STEP_UP_COPY.rejected)
    form.dispatchEvent(new f.dom.window.Event('submit', { cancelable: true }))
    await flush()
    expect(f.fetcher.mock.calls[1]?.[0]).toBe('/auth/totp/verify')
    expect(JSON.parse(String(f.fetcher.mock.calls[1]?.[1]?.body))).toEqual({ code: 'ABCD-EFGH' })
    expect(f.navigate).toHaveBeenCalledWith(model.returnTo)
    expect(code.value).toBe('')
    f.dom.window.close()
  })
  it('executes the exact serialized HTML script, safely displays enrollment secrets, and requires saved codes', async () => {
    const response = renderStepUpPage({ ...model, hasTotp: false, hasPasskey: false })

    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      reply({
        status: 'ready',
        secret: '<img src=x>',
        otpauthUri: 'otpauth://totp/Efeonce?secret=JBSWY3DPEHPK3PXP',
        backupCodes: ['BACKUP-CODE']
      })
    )

    const errors: unknown[] = []

    const dom = new JSDOM(response.body, {
      url: 'https://auth.example/login/step-up',
      runScripts: 'dangerously',
      beforeParse(window) {
        window.fetch = fetcher
        window.addEventListener('error', event => errors.push(event.error))
      }
    })

    const document = dom.window.document

    document.querySelector<HTMLButtonElement>('[data-step-enroll]')!.click()
    await flush()
    expect(errors).toEqual([])
    expect(document.querySelector('[data-step-code-label]')!.textContent).toBe(AUTH_STEP_UP_COPY.setupCode)
    expect(document.querySelector<HTMLImageElement>('[data-step-qr]')!.src).toMatch(/^data:image\/svg\+xml/)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[data-step-secret]')!.textContent).toBe('<img src=x>')
    expect(document.querySelector('[data-step-secret] img')).toBeNull()
    document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { cancelable: true }))
    await flush()
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[data-step-status]')!.textContent).toBe(AUTH_STEP_UP_COPY.saveRequired)
    expect(dom.window.localStorage.length).toBe(0)
    expect(dom.window.sessionStorage.length).toBe(0)
    dom.window.dispatchEvent(new dom.window.Event('pagehide'))
    expect(document.querySelector('[data-step-secret]')!.textContent).toBe('')
    expect(document.querySelector('[data-step-backups]')!.textContent).toBe('')
    expect(response.headers['Content-Security-Policy']).not.toContain('unsafe-inline')
    const nonce = document.querySelector('script')!.getAttribute('nonce')

    expect(response.headers['Content-Security-Policy']).toContain(`script-src 'nonce-${nonce}'`)
    expect(response.headers['Content-Security-Policy']).toContain("connect-src 'self'")
    dom.window.close()
  })
  it('uses only the bound step-up ceremony and does not navigate after cancellation', async () => {
    const f = domFixture()
    // Install on a fresh DOM to avoid duplicate listeners from the helper.
    const dom = new JSDOM(f.response.body, { url: 'https://auth.example/login/step-up' })
    const root = dom.window.document.querySelector<HTMLElement>('[data-capture="auth-step-up"]')!
    const get = vi.fn().mockRejectedValue(Object.assign(new Error('cancel'), { name: 'NotAllowedError' }))

    f.fetcher.mockResolvedValueOnce(
      reply({ status: 'ready', options: { challenge: 'YQ', userVerification: 'required' } })
    )
    installStepUpController(root, AUTH_STEP_UP_COPY, { fetch: f.fetcher, credentials: { get }, navigate: f.navigate })
    root.querySelector<HTMLButtonElement>('[data-step-passkey]')!.click()
    await flush()
    expect(f.fetcher).toHaveBeenCalledTimes(1)
    expect(f.fetcher.mock.calls[0]?.[0]).toBe('/auth/passkeys/step-up/start')
    expect(get).toHaveBeenCalled()
    expect(f.navigate).not.toHaveBeenCalled()
    expect(root.textContent).toContain(AUTH_STEP_UP_COPY.cancelled)
    dom.window.close()
    f.dom.window.close()
  })
  it('completes saved enrollment before returning and clears sensitive DOM', async () => {
    const f = domFixture({ ...model, hasTotp: false, hasPasskey: false })

    f.fetcher
      .mockResolvedValueOnce(reply({ status: 'ready', secret: 'SECRET', backupCodes: ['BACKUP'] }))
      .mockResolvedValueOnce(reply({ status: 'verified' }))
    f.root.querySelector<HTMLButtonElement>('[data-step-enroll]')!.click()
    await flush()
    f.root.querySelector<HTMLInputElement>('[name=saved]')!.checked = true
    f.root.querySelector<HTMLInputElement>('[name=code]')!.value = '123456'
    f.root.querySelector('form')!.dispatchEvent(new f.dom.window.Event('submit', { cancelable: true }))
    await flush()
    expect(f.fetcher.mock.calls[1]?.[0]).toBe('/auth/totp/enroll/finish')
    expect(f.navigate).toHaveBeenCalledWith(model.returnTo)
    expect(f.root.querySelector('[data-step-secret]')!.textContent).toBe('')
    expect(f.root.querySelector('[data-step-backups]')!.textContent).toBe('')
    f.dom.window.close()
  })

  it('submits a credential only to step-up finish and navigates after verified response', async () => {
    const response = renderStepUpPage(model)
    const dom = new JSDOM(response.body, { url: 'https://auth.example/login/step-up' })
    const root = dom.window.document.querySelector<HTMLElement>('[data-capture="auth-step-up"]')!

    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply({ status: 'ready', options: { challenge: 'YQ', userVerification: 'required' } }))
      .mockResolvedValueOnce(reply({ status: 'verified' }))

    const buffer = new Uint8Array([1, 2, 3]).buffer

    const get = vi.fn().mockResolvedValue({
      id: 'cred',
      rawId: buffer,
      type: 'public-key',
      getClientExtensionResults: () => ({}),
      response: { authenticatorData: buffer, clientDataJSON: buffer, signature: buffer, userHandle: null }
    })

    const navigate = vi.fn()

    installStepUpController(root, AUTH_STEP_UP_COPY, { fetch: fetcher, credentials: { get }, navigate })
    root.querySelector<HTMLButtonElement>('[data-step-passkey]')!.click()
    await flush()
    expect(fetcher.mock.calls.map(call => call[0])).toEqual([
      '/auth/passkeys/step-up/start',
      '/auth/passkeys/step-up/finish'
    ])
    expect(navigate).toHaveBeenCalledWith(model.returnTo)
    dom.window.close()
  })
})
