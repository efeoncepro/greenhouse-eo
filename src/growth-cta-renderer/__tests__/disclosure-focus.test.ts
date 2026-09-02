// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import { attachDisclosureFocus } from '../disclosure-focus'

/**
 * ISSUE-167 — el foco y la salida por teclado de una superficie revelada.
 *
 * Cada caso fija una decisión del contrato, no una implementación: si mañana la
 * primitive cambia por dentro estos siguen valiendo, y si alguien la degrada a lo
 * que había antes del 2026-09-01 (foco en `body`, Escape muerto) se ponen rojos.
 */

const build = (html: string) => {
  const trigger = document.createElement('button')

  trigger.textContent = 'Abrir'
  document.body.appendChild(trigger)
  trigger.focus()

  const container = document.createElement('div')

  container.innerHTML = html
  document.body.appendChild(container)

  return { trigger, container }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('attachDisclosureFocus (ISSUE-167)', () => {
  it('mueve el foco al primer control del contenido revelado, no al body', () => {
    const { trigger, container } = build('<input name="firstName" /><input name="email" />')

    const handle = attachDisclosureFocus({ doc: document, container, returnTo: trigger, onExit: () => {} })

    handle.enter()

    expect(document.activeElement).toBe(container.querySelector('input[name="firstName"]'))
    expect(document.activeElement).not.toBe(document.body)
  })

  it('sin nada enfocable adentro, enfoca el contenedor con tabindex -1 para que se anuncie', () => {
    const { trigger, container } = build('<p>Cargando…</p>')

    attachDisclosureFocus({ doc: document, container, returnTo: trigger }).enter()

    expect(document.activeElement).toBe(container)
    expect(container.getAttribute('tabindex')).toBe('-1')
  })

  it('Escape dentro del contenedor pide salir', () => {
    const { trigger, container } = build('<input />')

    let salidas = 0

    const handle = attachDisclosureFocus({
      doc: document,
      container,
      returnTo: trigger,
      onExit: () => {
        salidas += 1
      },
    })

    handle.enter()
    container.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(salidas).toBe(1)
  })

  it('NUNCA escucha Escape en el documento — un CTA incrustado no secuestra el Escape del host', () => {
    const { trigger, container } = build('<input />')

    let salidas = 0

    attachDisclosureFocus({
      doc: document,
      container,
      returnTo: trigger,
      onExit: () => {
        salidas += 1
      },
    }).enter()

    // Escape desde otra parte de la página del host: no es nuestro.
    const ajeno = document.createElement('input')

    document.body.appendChild(ajeno)
    ajeno.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(salidas).toBe(0)
  })

  it('release devuelve el foco al trigger', () => {
    const { trigger, container } = build('<input />')

    const handle = attachDisclosureFocus({ doc: document, container, returnTo: trigger })

    handle.enter()
    expect(document.activeElement).not.toBe(trigger)

    handle.release()
    expect(document.activeElement).toBe(trigger)
  })

  it('release NO roba el foco si el visitante ya se había ido a otra parte de la página', () => {
    const { trigger, container } = build('<input />')

    const handle = attachDisclosureFocus({ doc: document, container, returnTo: trigger })

    handle.enter()

    const otro = document.createElement('input')

    document.body.appendChild(otro)
    otro.focus()

    handle.release()

    expect(document.activeElement).toBe(otro)
  })

  it('release es idempotente y desarma el Escape', () => {
    const { trigger, container } = build('<input />')

    let salidas = 0

    const handle = attachDisclosureFocus({
      doc: document,
      container,
      returnTo: trigger,
      onExit: () => {
        salidas += 1
      },
    })

    handle.enter()
    handle.release()
    handle.release()

    container.querySelector('input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(salidas).toBe(0)
  })

  it('no atrapa el foco: es un disclosure, no un modal', () => {
    const { trigger, container } = build('<input />')

    attachDisclosureFocus({ doc: document, container, returnTo: trigger, onExit: () => {} }).enter()

    expect(container.getAttribute('aria-modal')).toBeNull()
    expect(container.getAttribute('role')).toBeNull()
  })
})
