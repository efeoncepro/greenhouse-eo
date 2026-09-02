// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'

import { FormRenderer } from '../renderer'
import { staticContractFixture } from '../fixtures'

afterEach(() => {
  document.body.replaceChildren()
  localStorage.clear()
})
it('keeps the two-step content intake, validation, entered values and progress inside the canonical renderer', async () => {
  const root = document.createElement('div')

  document.body.append(root)
  const fetchImpl = vi.fn()

  const contract = staticContractFixture({
    styleVariant: 'content_marketing',
    composition: 'multi_step_light',
    copy: { 'step.identity.help': 'Tres datos y seguimos.' },
    fields: [
      { key: 'fullName', type: 'text', label: 'Nombre', required: true },
      { key: 'companyName', type: 'text', label: 'Empresa', required: true },
      { key: 'mode', type: 'select', label: 'Modo', options: [{ value: 'Content Engine', label: 'Content Engine' }] }
    ],
    steps: [
      { key: 'identity', label: 'Quién nos escribe', fieldKeys: ['fullName', 'companyName'] },
      { key: 'context', label: 'Tu contexto', fieldKeys: ['mode'] }
    ]
  })

  const renderer = new FormRenderer({
    root,
    contract,
    api: { baseUrl: 'https://test.invalid', slug: 'content-marketing' },
    doc: document,
    fetchImpl,
    initialValues: { mode: 'Content Engine' }
  })

  renderer.mount()
  expect(root.querySelector('.ghf-content-step-title')?.textContent).toBe('Quién nos escribe')
  expect(root.querySelector('.ghf-content-step-hint')?.textContent).toBe('Tres datos y seguimos.')
  ;(root.querySelector('[type="submit"]') as HTMLButtonElement).click()
  await vi.waitFor(() => expect(root.querySelector('[data-ghf-error-summary]')).not.toBeNull())

  for (const [name, value] of [
    ['fullName', 'Persona de prueba'],
    ['companyName', 'Empresa de prueba']
  ]) {
    const input = root.querySelector(`[name="${name}"]`) as HTMLInputElement

    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  ;(root.querySelector('[type="submit"]') as HTMLButtonElement).click()
  await vi.waitFor(() => expect(root.querySelector('.ghf-content-step-title')?.textContent).toBe('Tu contexto'))
  expect((root.querySelector('[name="mode"]') as HTMLSelectElement).value).toBe('Content Engine')
  ;(root.querySelector('.ghf-btn--ghost') as HTMLButtonElement).click()
  expect((root.querySelector('[name="fullName"]') as HTMLInputElement).value).toBe('Persona de prueba')
  expect(root.querySelectorAll('.ghf-content-step-dots [data-state="current"]')).toHaveLength(1)
  expect(fetchImpl).not.toHaveBeenCalled()
  renderer.destroy()
})
