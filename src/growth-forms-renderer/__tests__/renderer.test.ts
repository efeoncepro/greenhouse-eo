// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { RendererApiConfig } from '../api-client'
import { FormRenderer } from '../renderer'
import { conditionalContractFixture, multiStepContractFixture, staticContractFixture } from '../fixtures'

const api: RendererApiConfig = { baseUrl: 'https://gh.test', slug: 'ai-visibility-intake', surfaceId: 'wordpress-public' }

const okFetch = (outcome = 'accepted', submissionId = 'sub_1') =>
  vi.fn(async () => new Response(JSON.stringify({ outcome, submissionId }), { status: 202 })) as unknown as typeof fetch

const mountInto = (contract = staticContractFixture(), fetchImpl = okFetch()) => {
  const root = document.createElement('div')

  document.body.appendChild(root)
  const renderer = new FormRenderer({ root, contract, api, fetchImpl, doc: document })

  renderer.mount()

  return { root, renderer }
}

describe('growth-forms-renderer · FormRenderer', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    ;(window as unknown as { dataLayer?: unknown[] }).dataLayer = []
  })

  it('renders labels above inputs with autocomplete + inputmode from the contract', () => {
    const { root } = mountInto()
    const email = root.querySelector<HTMLInputElement>('[name="work_email"]')!

    expect(email.getAttribute('autocomplete')).toBe('email')
    expect(email.getAttribute('inputmode')).toBe('email')
    const label = root.querySelector('label[for$="work_email"]')

    expect(label?.classList.contains('ghf-label')).toBe(true)
    // label precede al input en el DOM (label-above).
    expect(label!.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('keeps submit enabled and focuses + describes the first invalid field on submit', () => {
    const { root } = mountInto()
    const form = root.querySelector('form')!
    const primary = root.querySelector<HTMLButtonElement>('[data-ghf-primary]')!

    expect(primary.getAttribute('aria-disabled')).toBeNull()
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))

    const email = root.querySelector<HTMLInputElement>('[name="work_email"]')!

    expect(email.getAttribute('aria-invalid')).toBe('true')
    const errorId = email.getAttribute('aria-describedby')!.split(' ').pop()!
    const errorNode = root.querySelector(`#${errorId}`)!

    expect(errorNode.getAttribute('role')).toBe('alert')
    expect(errorNode.textContent).toBeTruthy()
  })

  it('submits raw values, emits the funnel, and shows inline success', async () => {
    const fetchImpl = okFetch()
    const { root } = mountInto(staticContractFixture(), fetchImpl)
    const events: string[] = []

    root.addEventListener('gh_form_submitted', () => events.push('submitted'))
    root.addEventListener('gh_form_submission_accepted', () => events.push('accepted'))

    root.querySelector<HTMLInputElement>('[name="work_email"]')!.value = 'lead@brand.com'
    root.querySelector<HTMLInputElement>('[name="work_email"]')!.dispatchEvent(new Event('input'))
    root.querySelector<HTMLInputElement>('[name="brand"]')!.value = 'Brand'
    root.querySelector<HTMLInputElement>('[name="brand"]')!.dispatchEvent(new Event('input'))
    // máscara de teléfono: tipea formateado, se envía crudo
    const phone = root.querySelector<HTMLInputElement>('[name="phone"]')!

    phone.value = '+56 9 1234 5678'
    phone.dispatchEvent(new Event('input'))
    const consent = root.querySelector<HTMLInputElement>('[data-ghf-consent="tos"]')!

    consent.checked = true
    consent.dispatchEvent(new Event('change'))

    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    await vi.waitFor(() => expect(events).toContain('accepted'))

    const calls = (fetchImpl as unknown as { mock: { calls: Array<[string, { body: string }]> } }).mock.calls
    const body = JSON.parse(calls[0][1].body)

    expect(body.fields.work_email).toBe('lead@brand.com')
    expect(body.fields.phone).toBe('+56912345678') // crudo, no enmascarado
    expect(body.consentCheckboxes).toEqual(['tos'])
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Listo')
  })

  it('blocks submit until required consent is checked', async () => {
    const { root } = mountInto()

    root.querySelector<HTMLInputElement>('[name="work_email"]')!.value = 'a@b.com'
    root.querySelector<HTMLInputElement>('[name="work_email"]')!.dispatchEvent(new Event('input'))
    root.querySelector<HTMLInputElement>('[name="brand"]')!.value = 'B'
    root.querySelector<HTMLInputElement>('[name="brand"]')!.dispatchEvent(new Event('input'))

    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    await Promise.resolve()

    expect(root.querySelector('[data-ghf-summary]')?.textContent).toBe('Necesitas aceptar para continuar.')
  })

  it('conditional_simple reveals a field when its condition matches', () => {
    const { root } = mountInto(conditionalContractFixture())

    expect(root.querySelector('[name="budget"]')).toBeNull()
    const select = root.querySelector<HTMLSelectElement>('[name="interest"]')!

    select.value = 'growth'
    select.dispatchEvent(new Event('change'))
    expect(root.querySelector('[name="budget"]')).not.toBeNull()
  })

  it('multi_step_light advances per step and preserves data going back', () => {
    const { root } = mountInto(multiStepContractFixture())

    expect(root.querySelector('.ghf-progress')?.textContent).toBe('Paso 1 de 2')
    root.querySelector<HTMLInputElement>('[name="work_email"]')!.value = 'a@b.com'
    root.querySelector<HTMLInputElement>('[name="work_email"]')!.dispatchEvent(new Event('input'))

    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
    expect(root.querySelector('.ghf-progress')?.textContent).toBe('Paso 2 de 2')

    // Atrás preserva el dato del paso 1.
    root.querySelector<HTMLButtonElement>('.ghf-btn--ghost')!.click()
    expect(root.querySelector<HTMLInputElement>('[name="work_email"]')!.value).toBe('a@b.com')
  })

  it('does not submit when honeypot would be filled by a bot (still posts; server rejects)', async () => {
    // El honeypot se envía tal cual; verificamos que el campo existe y está oculto/no-tab.
    const { root } = mountInto()
    const honey = root.querySelector<HTMLInputElement>('[data-ghf-honeypot]')!

    expect(honey.getAttribute('tabindex')).toBe('-1')
    expect(honey.getAttribute('autocomplete')).toBe('off')
    expect(honey.closest('.ghf-honeypot')).not.toBeNull()
  })

  // ─── TASK-1256 Slice 2 — submit-gating del email corporativo ────────────────

  const flush = async () => {
    // verifyPublicEmail encadena `await fetch` + `await response.json()`; varias
    // vueltas de macrotask vacían la cola de microtasks entre medio de forma robusta.
    for (let i = 0; i < 5; i += 1) await new Promise(resolve => setTimeout(resolve, 0))
  }

  /** fetch que enruta verify-email a `verify()` y el submit a `accepted`. */
  const routingFetch = (verify: () => Response | Promise<Response>) =>
    vi.fn(async (url: string) => {
      if (String(url).includes('/verify-email')) return verify()

      return new Response(JSON.stringify({ outcome: 'accepted', submissionId: 'sub_1' }), { status: 202 })
    }) as unknown as typeof fetch

  const okVerdict = (over: Record<string, unknown> = {}) =>
    new Response(
      JSON.stringify({
        outcome: 'ok',
        syntaxValid: true,
        isCorporate: true,
        isDisposable: false,
        isRoleBased: false,
        isFreeProvider: false,
        deliverable: 'deliverable',
        quality: 'verified',
        suggestion: null,
        reasonCode: null,
        ...over,
      }),
      { status: 200 },
    )

  const gatedContract = () =>
    staticContractFixture({
      fields: [{ key: 'work_email', type: 'email', label: 'Correo', required: true, validator: 'corporate_email', autocomplete: 'email' }],
      consent: undefined,
    })

  const typeEmailAndBlur = (root: HTMLElement, value: string) => {
    const email = root.querySelector<HTMLInputElement>('[name="work_email"]')!

    email.value = value
    email.dispatchEvent(new Event('input'))
    email.dispatchEvent(new Event('blur'))
  }

  it('shows verifying state and disables submit while /verify-email is in flight', async () => {
    let resolveVerify: (r: Response) => void = () => undefined

    const pending = new Promise<Response>(resolve => {
      resolveVerify = resolve
    })

    const { root } = mountInto(gatedContract(), routingFetch(() => pending))

    typeEmailAndBlur(root, 'ana@empresa.com')

    // El estado verificando + el disable del submit se aplican síncronamente al disparar.
    expect(root.querySelector('.ghf-verify-status')?.textContent).toContain('Verificando')
    expect(root.querySelector('[data-ghf-primary]')?.getAttribute('aria-disabled')).toBe('true')

    resolveVerify(okVerdict())
    await flush()

    expect(root.querySelector('.ghf-verify-status')).toBeNull()
    expect(root.querySelector('[data-ghf-primary]')?.getAttribute('aria-disabled')).toBeNull()
  })

  it('degrades honest when /verify-email is disabled (flag OFF, 404): no trap', async () => {
    const { root } = mountInto(gatedContract(), routingFetch(() => new Response(JSON.stringify({ outcome: 'disabled' }), { status: 404 })))

    typeEmailAndBlur(root, 'ana@empresa.com')
    await flush()

    // Sin estado verificando ni submit trabado: el gate vive en el server.
    expect(root.querySelector('.ghf-verify-status')).toBeNull()
    expect(root.querySelector('[data-ghf-primary]')?.getAttribute('aria-disabled')).toBeNull()
    expect(root.querySelector('.ghf-error')).toBeNull()
  })

  it('blocks a corporate-gated field when the verdict says not corporate + offers typo-suggest', async () => {
    const { root } = mountInto(
      gatedContract(),
      routingFetch(() => okVerdict({ isCorporate: false, quality: 'suspect', reasonCode: 'email_not_corporate', suggestion: 'ana@empresa.com' })),
    )

    typeEmailAndBlur(root, 'ana@gmial.com')
    await flush()

    const error = root.querySelector('.ghf-error')

    expect(error?.textContent).toContain('correo de tu empresa')
    const suggest = root.querySelector<HTMLButtonElement>('.ghf-verify-suggest')

    expect(suggest?.textContent).toContain('¿Quisiste decir ana@empresa.com?')
    suggest!.click()
    expect(root.querySelector<HTMLInputElement>('[name="work_email"]')!.value).toBe('ana@empresa.com')
  })

  it('does not block a non-gated email field even if the verdict is not corporate (advisory only)', async () => {
    const contract = staticContractFixture({
      fields: [{ key: 'work_email', type: 'email', label: 'Correo', required: true, autocomplete: 'email' }],
      consent: undefined,
    })

    const { root } = mountInto(
      contract,
      routingFetch(() => okVerdict({ isCorporate: false, quality: 'suspect', reasonCode: 'email_not_corporate', suggestion: 'ana@gmail.com' })),
    )

    typeEmailAndBlur(root, 'ana@gmail.com')
    await flush()

    // Campo no gateado: la verificación es advisory → typo-suggest sí, bloqueo no.
    expect(root.querySelector('.ghf-error')).toBeNull()
    expect(root.querySelector('.ghf-verify-suggest')).not.toBeNull()
  })
})
