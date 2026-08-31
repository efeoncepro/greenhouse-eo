// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FormRenderer } from '../renderer'
import { staticContractFixture } from '../fixtures'

describe('HubSpot pillar contract presentation', () => {
  afterEach(() => { document.body.replaceChildren(); localStorage.clear() })
  it('keeps native radio and multiple selections when going forward and back without submitting', async () => {
    const root = document.createElement('div')

    document.body.appendChild(root)
    const fetchImpl = vi.fn()

    const contract = staticContractFixture({ styleVariant: 'hubspot_pillar', composition: 'multi_step_light', fields: [
      { key: 'scenario', type: 'radio', label: 'Situación', required: true, options: [{value:'evaluating',label:'Evaluando'},{value:'existing',label:'Ya lo tengo'}] },
      { key: 'hubs', type: 'multiselect', label: 'Hubs', options: [{value:'sales',label:'Sales'},{value:'service',label:'Service'}], visibleWhen: [{field:'scenario',equals:'existing'}] },
      { key: 'name', type: 'text', label: 'Nombre', required: true }
    ], steps: [{key:'one',label:'Tu situación',fieldKeys:['scenario','hubs']},{key:'two',label:'Contacto',fieldKeys:['name']}] })

    const renderer = new FormRenderer({root,contract,api:{baseUrl:'https://test.invalid',slug:'hubspot'},doc:document,fetchImpl})

    renderer.mount()
    ;(root.querySelector('[type="submit"]') as HTMLButtonElement).click()
    await vi.waitFor(() => expect(root.querySelector('[data-ghf-error-summary]')).not.toBeNull())
    expect(root.querySelector('[name="hubs"]')).toBeNull()
    ;(root.querySelector('[name="scenario"][value="existing"]') as HTMLInputElement).click()
    ;(root.querySelector('[name="hubs"][value="sales"]') as HTMLInputElement).click()
    ;(root.querySelector('[name="hubs"][value="service"]') as HTMLInputElement).click()
    ;(root.querySelector('[type="submit"]') as HTMLButtonElement).click()
    await vi.waitFor(() => expect(root.querySelector('[name="name"]')).not.toBeNull())
    expect(root.querySelector('[data-ghf-error-summary]')).toBeNull()
    ;(root.querySelector('.ghf-btn--ghost') as HTMLButtonElement).click()
    expect((root.querySelector('[name="scenario"][value="existing"]') as HTMLInputElement).checked).toBe(true)
    expect([...root.querySelectorAll<HTMLInputElement>('[name="hubs"]:checked')].map(x=>x.value)).toEqual(['sales','service'])
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(root.querySelector('[role="radiogroup"]')?.getAttribute('aria-label')).toBe('Situación')
    renderer.destroy()
  })
})
