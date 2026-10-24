// @vitest-environment jsdom

/**
 * TASK-2054 — Presentación `inline_pill` del renderer: los cinco estados del canvas, teclado, errores
 * en línea, lista de espera y estado compartido entre instancias del mismo formulario. El aspecto se
 * verifica aparte con capturas contra el canvas (`scripts/growth/forms/fixtures/`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RendererApiConfig } from '../api-client'
import type { RenderContract } from '../contract'
import { eventInlinePillContractFixture, glitchInlinePillContractFixture, staticContractFixture } from '../fixtures'
import { FormRenderer } from '../renderer'
import { GROWTH_FORM_SUCCESS_EVENT } from '../telemetry'

const api: RendererApiConfig = { baseUrl: 'https://gh.test', slug: 'glitch-newsletter' }

type FetchResponse = { status: number; body: Record<string, unknown> } | 'network_error'

const fetchStub = (...responses: FetchResponse[]) => {
  const queue = [...responses]

  return vi.fn(async () => {
    const next = queue.shift() ?? { status: 202, body: { outcome: 'accepted', submissionId: 'fsub-x' } }

    if (next === 'network_error') throw new TypeError('Failed to fetch')

    return new Response(JSON.stringify(next.body), { status: next.status, headers: { 'content-type': 'application/json' } })
  })
}

const mount = (contract: RenderContract = glitchInlinePillContractFixture(), fetchImpl = fetchStub(), extra: { initialValues?: Record<string, string> } = {}) => {
  const root = document.createElement('div')

  document.body.appendChild(root)
  const renderer = new FormRenderer({ root, contract, api, doc: document, fetchImpl, ...extra })

  renderer.mount()

  return { root, renderer, fetchImpl }
}

const q = <T extends Element = HTMLElement>(root: HTMLElement, part: string) => root.querySelector<T>(`[data-ghf-part="${part}"]`)!
const state = (root: HTMLElement) => q(root, 'inline-pill').getAttribute('data-ghf-inline-state')

const flush = async () => {
  for (let i = 0; i < 6; i += 1) await vi.advanceTimersByTimeAsync(0)
}

const openAndType = async (root: HTMLElement, value: string) => {
  q<HTMLButtonElement>(root, 'inline-open').click()
  await vi.advanceTimersByTimeAsync(260)
  const input = q<HTMLInputElement>(root, 'inline-input')

  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))

  return input
}

const submit = (root: HTMLElement) =>
  root.querySelector('form.ghf-inline-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

beforeEach(() => {
  document.body.replaceChildren()
  vi.useFakeTimers()
})

afterEach(() => vi.useRealTimers())

describe('TASK-2054 · reposo', () => {
  it('dibuja la píldora en reposo con la etiqueta del contrato y el campo fuera del orden de foco', () => {
    const { root } = mount()

    expect(root.getAttribute('data-ghf-presentation')).toBe('inline_pill')
    expect(root.querySelector('form.ghf-form')).toBeNull()
    expect(state(root)).toBe('idle')

    const open = q<HTMLButtonElement>(root, 'inline-open')

    expect(open.textContent).toContain('Suscríbete a Glitch')
    expect(open.getAttribute('aria-expanded')).toBe('false')
    expect(open.getAttribute('tabindex')).toBe('0')
    expect(q(root, 'inline-input').getAttribute('tabindex')).toBe('-1')
    expect(root.querySelector('form.ghf-inline-form')!.getAttribute('aria-hidden')).toBe('true')
    expect(q(root, 'inline-input').getAttribute('placeholder')).toBe('tu@empresa.com')
    expect(root.querySelector('label[for]')!.textContent).toBe('Tu correo de trabajo')
  })

  it('sin etiquetas en el contrato usa las del locale por tipo de formulario', () => {
    const { root } = mount(eventInlinePillContractFixture({ inlinePill: undefined }))

    expect(q(root, 'inline-open').textContent).toContain('Reservar mi lugar')
    expect(q(root, 'inline').getAttribute('data-ghf-inline-kind')).toBe('event')
  })

  it('un formulario estándar no cambia: sin píldora ni atributo de presentación', () => {
    const { root } = mount(staticContractFixture())

    expect(root.querySelector('form.ghf-form')).not.toBeNull()
    expect(root.querySelector('.ghf-inline')).toBeNull()
    expect(root.hasAttribute('data-ghf-presentation')).toBe(false)
  })
})

describe('TASK-2054 · abrir, teclado y cerrar', () => {
  it('abre en el campo y le pasa el foco a los 260 ms', async () => {
    const { root } = mount()

    q<HTMLButtonElement>(root, 'inline-open').click()
    expect(state(root)).toBe('open')
    expect(q(root, 'inline-open').getAttribute('aria-expanded')).toBe('true')
    expect(q(root, 'inline-open').getAttribute('tabindex')).toBe('-1')
    expect(q(root, 'inline-input').getAttribute('tabindex')).toBe('0')
    expect(document.activeElement).not.toBe(q(root, 'inline-input'))

    await vi.advanceTimersByTimeAsync(260)
    expect(document.activeElement).toBe(q(root, 'inline-input'))
  })

  it('Esc con el campo vacío cierra y devuelve el foco al botón', async () => {
    const { root } = mount()
    const input = await openAndType(root, '')

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(state(root)).toBe('idle')
    await vi.advanceTimersByTimeAsync(60)
    expect(document.activeElement).toBe(q(root, 'inline-open'))
  })

  it('Esc con texto escrito no cierra (no se pierde lo escrito)', async () => {
    const { root } = mount()
    const input = await openAndType(root, 'ana@')

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(state(root)).toBe('open')
    expect(input.value).toBe('ana@')
  })
})

describe('TASK-2054 · envío', () => {
  it('un correo inválido queda en línea, sin enviar, con el foco en el campo', async () => {
    const { root, fetchImpl } = mount()
    const input = await openAndType(root, 'no-es-correo')

    submit(root)
    await flush()

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(state(root)).toBe('open')
    expect(q(root, 'inline-error').hidden).toBe(false)
    expect(root.querySelector('[role="alert"]')!.textContent).not.toBe('')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(input)
  })

  it('enviando → éxito → listo, con el mismo envío del formulario estándar', async () => {
    const fetchImpl = fetchStub({ status: 202, body: { outcome: 'accepted', submissionId: 'fsub-1', registrationStatus: 'confirmed' } })
    const { root } = mount(eventInlinePillContractFixture(), fetchImpl, { initialValues: { event_key: 'otro-evento' } })

    await openAndType(root, 'ana@empresa.com')
    submit(root)
    expect(state(root)).toBe('loading')
    expect(q(root, 'inline-send').getAttribute('aria-busy')).toBe('true')

    await flush()
    expect(state(root)).toBe('success')
    expect(q(root, 'inline-ok').textContent).toContain('¡Lugar reservado!')
    expect(document.activeElement).toBe(q(root, 'inline-ok'))

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(String(init.body))

    expect(url).toBe('https://gh.test/api/public/growth/forms/glitch-newsletter/submit')
    expect(body.fields).toEqual({ email: 'ana@empresa.com', event_key: 'webinar-aeo-chatgpt-2026-11-12' })
    expect(body.consent).toBe(true)
    expect(body.consentCheckboxes).toEqual([])

    await vi.advanceTimersByTimeAsync(1399)
    expect(state(root)).toBe('success')
    await vi.advanceTimersByTimeAsync(1)
    expect(state(root)).toBe('done')
    expect(root.querySelector('.ghf-inline-t2')!.textContent).toBe('Te esperamos el 12 de noviembre')
  })

  it('en lista de espera confirma con su propio texto', async () => {
    const fetchImpl = fetchStub({ status: 202, body: { outcome: 'accepted', submissionId: 'fsub-2', registrationStatus: 'waitlisted' } })
    const { root } = mount(eventInlinePillContractFixture(), fetchImpl)

    await openAndType(root, 'ana@empresa.com')
    submit(root)
    await flush()
    await vi.advanceTimersByTimeAsync(1400)

    expect(state(root)).toBe('done')
    expect(q(root, 'inline-pill').hasAttribute('data-ghf-inline-waitlisted')).toBe(true)
    expect(root.querySelector('.ghf-inline-t1')!.textContent).toBe('¡Estás en la lista!')
    expect(root.querySelector('.ghf-inline-t2')!.textContent).toBe('Te avisamos si se libera un lugar')
  })

  it('error de red: vuelve al campo con el mensaje y «Reintentar», que reenvía', async () => {
    const fetchImpl = fetchStub('network_error', { status: 202, body: { outcome: 'accepted', submissionId: 'fsub-3' } })
    const { root } = mount(glitchInlinePillContractFixture(), fetchImpl)

    const input = await openAndType(root, 'ana@empresa.com')

    submit(root)
    await flush()

    expect(state(root)).toBe('open')
    expect(q(root, 'inline-error').textContent).toContain('No pudimos enviar')
    expect(q(root, 'inline-retry').hidden).toBe(false)
    expect(input.hasAttribute('aria-invalid')).toBe(false)

    q<HTMLButtonElement>(root, 'inline-retry').click()
    await flush()
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(state(root)).toBe('success')
  })

  it('cupo lleno: mensaje sin «Reintentar» (reintentar no lo resuelve)', async () => {
    const fetchImpl = fetchStub({ status: 409, body: { outcome: 'capacity_full', message: 'Ya no quedan cupos para este evento.' } })
    const { root } = mount(eventInlinePillContractFixture(), fetchImpl)

    await openAndType(root, 'ana@empresa.com')
    submit(root)
    await flush()

    expect(state(root)).toBe('open')
    expect(q(root, 'inline-error').textContent).toContain('Ya no quedan cupos para este evento.')
    expect(q(root, 'inline-retry').hidden).toBe(true)
  })

  it('no hace doble envío si se reenvía mientras está enviando', async () => {
    const fetchImpl = fetchStub()
    const { root } = mount(glitchInlinePillContractFixture(), fetchImpl)

    await openAndType(root, 'ana@empresa.com')
    submit(root)
    submit(root)
    await flush()

    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})

describe('TASK-2054 · instancias del mismo formulario', () => {
  it('cuando una confirma, la otra pasa a «listo» sin enviar; un formulario distinto no cambia', async () => {
    const fetchA = fetchStub()
    const fetchB = fetchStub()
    const fetchOther = fetchStub()
    const a = mount(glitchInlinePillContractFixture(), fetchA)
    const b = mount(glitchInlinePillContractFixture(), fetchB)
    const other = mount(eventInlinePillContractFixture(), fetchOther)

    const events: Event[] = []

    document.addEventListener(GROWTH_FORM_SUCCESS_EVENT, event => events.push(event))

    await openAndType(a.root, 'ana@empresa.com')
    submit(a.root)
    await flush()

    expect(state(a.root)).toBe('success')
    expect(state(b.root)).toBe('done')
    expect(b.root.querySelector('.ghf-inline-t2')!.textContent).toBe('Ya estás suscrito a Glitch')
    expect(fetchB).not.toHaveBeenCalled()
    expect(state(other.root)).toBe('idle')

    expect(events).toHaveLength(1)
    expect((events[0] as CustomEvent).detail).toEqual({
      formKey: '00000000-0000-4000-8000-000000002054',
      formSlug: 'glitch-newsletter',
      instanceId: expect.any(String)
    })
    expect(JSON.stringify((events[0] as CustomEvent).detail)).not.toContain('ana@empresa.com')
  })

  it('un formulario estándar del mismo formKey también muestra su éxito', async () => {
    const pill = mount(glitchInlinePillContractFixture())

    const standard = mount(
      staticContractFixture({ form: { ...glitchInlinePillContractFixture().form }, presentation: undefined, inlinePill: undefined })
    )

    await openAndType(pill.root, 'ana@empresa.com')
    submit(pill.root)
    await flush()

    expect(standard.root.querySelector('.ghf-status--success')).not.toBeNull()
  })

  it('destroy deja de escuchar', async () => {
    const a = mount(glitchInlinePillContractFixture())
    const b = mount(glitchInlinePillContractFixture())

    b.renderer.destroy()
    await openAndType(a.root, 'ana@empresa.com')
    submit(a.root)
    await flush()

    expect(b.root.childElementCount).toBe(0)
  })
})
