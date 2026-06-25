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
})
