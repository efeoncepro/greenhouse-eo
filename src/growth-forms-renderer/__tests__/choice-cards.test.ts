// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RendererFieldDefinition } from '../contract'
import { FormRenderer } from '../renderer'
import { staticContractFixture } from '../fixtures'

const radioField: RendererFieldDefinition = {
  key: 'mainBlocker',
  type: 'radio',
  label: '¿Qué te frena hoy?',
  required: true,
  options: [
    { value: 'demand-exceeds-capacity', label: 'Me piden más de lo que alcanzo' },
    { value: 'content-not-seen', label: 'Publicamos, pero nadie lo mira' }
  ]
}

describe('radio fields render as visible choices outside hubspot_pillar', () => {
  afterEach(() => { document.body.replaceChildren(); localStorage.clear() })

  it('renders a radiogroup of native radios (not a text input) under diagnostic_premium and keeps the value across steps', async () => {
    const root = document.createElement('div')

    document.body.appendChild(root)
    const fetchImpl = vi.fn()

    const contract = staticContractFixture({
      styleVariant: 'diagnostic_premium',
      composition: 'multi_step_light',
      fields: [radioField, { key: 'firstName', type: 'text', label: 'Nombre', required: true }],
      steps: [
        { key: 'operacion', label: 'Tu operación', fieldKeys: ['mainBlocker'] },
        { key: 'datos', label: 'Tus datos', fieldKeys: ['firstName'] }
      ]
    })

    const renderer = new FormRenderer({ root, contract, api: { baseUrl: 'https://test.invalid', slug: 'diag' }, doc: document, fetchImpl })

    renderer.mount()

    const group = root.querySelector('[role="radiogroup"]')

    expect(group?.getAttribute('aria-label')).toBe('¿Qué te frena hoy?')
    expect(group?.classList.contains('ghf-choice-group--cards')).toBe(true)
    expect(root.querySelector('input[name="mainBlocker"][type="text"]')).toBeNull()
    expect(root.querySelectorAll('input[name="mainBlocker"][type="radio"]')).toHaveLength(2)
    expect(root.querySelector('[data-ghf-field-key="mainBlocker"]')?.classList.contains('ghf-field--full')).toBe(true)

    // Required radio blocks the step until a choice is made.
    ;(root.querySelector('[type="submit"]') as HTMLButtonElement).click()
    await vi.waitFor(() => expect(root.querySelector('[data-ghf-error-summary]')).not.toBeNull())
    ;(root.querySelector('[name="mainBlocker"][value="content-not-seen"]') as HTMLInputElement).click()
    ;(root.querySelector('[type="submit"]') as HTMLButtonElement).click()
    await vi.waitFor(() => expect(root.querySelector('[name="firstName"]')).not.toBeNull())
    ;(root.querySelector('.ghf-btn--ghost') as HTMLButtonElement).click()
    expect((root.querySelector('[name="mainBlocker"][value="content-not-seen"]') as HTMLInputElement).checked).toBe(true)
    expect(fetchImpl).not.toHaveBeenCalled()
    renderer.destroy()
  })

  it('shows a readable privacy link label and keeps the URL only in href', () => {
    const root = document.createElement('div')

    document.body.appendChild(root)

    const contract = staticContractFixture({
      consent: {
        consentPolicyVersion: 'v1',
        privacyUrl: 'https://efeoncepro.com/politica-de-privacidad/',
        checkboxes: [{ key: 'contact_permission', label: 'Autorizo el contacto.', required: true }]
      }
    })

    const renderer = new FormRenderer({ root, contract, api: { baseUrl: 'https://test.invalid', slug: 'diag' }, doc: document, fetchImpl: vi.fn() })

    renderer.mount()
    const link = root.querySelector<HTMLAnchorElement>('a[href="https://efeoncepro.com/politica-de-privacidad/"]')

    expect(link?.textContent).toBe('Política de privacidad')
    expect(root.textContent).not.toContain('https://efeoncepro.com/politica-de-privacidad/')
    renderer.destroy()
  })
})
