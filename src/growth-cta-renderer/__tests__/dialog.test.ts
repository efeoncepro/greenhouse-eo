// @vitest-environment jsdom
/**
 * TASK-2045 — open_growth_form en diálogo. jsdom no implementa top layer ni inert: el verificador real de
 * foco encerrado, Escape nativo y velo es el navegador (escenario GVC del fixture `partnerDialog`). Acá se
 * fija el contrato del controller y del renderer: montaje al abrir, conservación entre cierres, cierre
 * bloqueado durante el envío, retorno de foco, `ghf:dismiss` y telemetría con activation_mode.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveCtaSystemCopy } from '../copy'
import { FormDialogController } from '../dialog'
import { CTA_FIXTURES } from '../fixtures'
import { CtaRenderer } from '../renderer'
import { RENDERER_GTM_EVENTS, type RendererGtmEvent, type TelemetryPayload } from '../telemetry'

const media = (matches: boolean) =>
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }))

const fakeForm = (slot: HTMLElement): HTMLElement => {
  const form = document.createElement('greenhouse-form')

  form.innerHTML = '<div class="ghf-root"><form class="ghf-form"><input name="fullName"><textarea name="offer"></textarea></form></div>'
  slot.replaceChildren(form)

  return form
}

const makeController = (mountForm = vi.fn(async (slot: HTMLElement) => (fakeForm(slot), true))) => {
  const invoker = document.createElement('button')

  document.body.appendChild(invoker)

  const controller = new FormDialogController({
    doc: document,
    copy: resolveCtaSystemCopy(),
    header: { eyebrow: '¿Eres una plataforma?', title: 'Sumémonos', lead: '<b>Cuéntanos</b> qué ofreces.' },
    mountForm,
  })

  return { controller, invoker, mountForm }
}

const dialogEl = () => document.querySelector('dialog.ghc-form-surface') as HTMLDialogElement

beforeEach(() => {
  document.body.innerHTML = ''
  document.documentElement.style.overflow = ''
  media(false)
})

describe('FormDialogController', () => {
  it('no monta el formulario antes de abrir; lo monta una vez y lo conserva entre cierres', async () => {
    const { controller, invoker, mountForm } = makeController()

    expect(document.querySelector('greenhouse-form')).toBeNull()
    await expect(controller.open(invoker)).resolves.toBe(true)

    const form = dialogEl().querySelector('greenhouse-form')

    expect(dialogEl().open).toBe(true)
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.activeElement?.getAttribute('name')).toBe('fullName')

    controller.close()
    expect(document.documentElement.style.overflow).toBe('')
    expect(document.activeElement).toBe(invoker)

    await controller.open(invoker)
    expect(mountForm).toHaveBeenCalledTimes(1)
    expect(dialogEl().querySelector('greenhouse-form')).toBe(form)
    controller.dispose()
  })

  it('el encabezado es texto plano y nombra el diálogo', async () => {
    const { controller, invoker } = makeController()

    await controller.open(invoker)

    const dialog = dialogEl()
    const title = dialog.querySelector('[data-ghcta-dialog-title]')!

    expect(dialog.querySelector('[data-ghcta-dialog-eyebrow]')?.textContent).toBe('¿Eres una plataforma?')
    expect(title.textContent).toBe('Sumémonos')
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id)
    expect(dialog.querySelector('[data-ghcta-dialog-lead] b')).toBeNull()
    expect(dialog.querySelector('[data-ghcta-dialog-close]')?.getAttribute('aria-label')).toBe('Cerrar')
    controller.dispose()
  })

  it('Escape (cancel) cierra, salvo mientras el formulario envía', async () => {
    const { controller, invoker } = makeController()

    await controller.open(invoker)
    dialogEl().querySelector('.ghf-root')!.setAttribute('data-ghf-busy', '')
    dialogEl().dispatchEvent(new Event('cancel', { cancelable: true }))
    expect(dialogEl().open).toBe(true)

    dialogEl().querySelector('.ghf-root')!.removeAttribute('data-ghf-busy')
    dialogEl().dispatchEvent(new Event('cancel', { cancelable: true }))
    expect(dialogEl().open).toBe(false)
    controller.dispose()
  })

  it('ghf:dismiss desde el formulario («Cerrar» del éxito) cierra y devuelve el foco', async () => {
    const { controller, invoker } = makeController()

    await controller.open(invoker)
    dialogEl().querySelector('.ghf-root')!.dispatchEvent(new CustomEvent('ghf:dismiss', { bubbles: true, composed: true }))
    expect(dialogEl().open).toBe(false)
    expect(document.activeElement).toBe(invoker)
    controller.dispose()
  })

  it('si el formulario no carga, cierra sin dejar un diálogo vacío y reintenta en la próxima apertura', async () => {
    const mountForm = vi.fn(async () => false)
    const { controller, invoker } = makeController(mountForm)

    await expect(controller.open(invoker)).resolves.toBe(false)
    expect(dialogEl().open).toBe(false)
    await controller.open(invoker)
    expect(mountForm).toHaveBeenCalledTimes(2)
    controller.dispose()
  })

  it('en teléfono se presenta como hoja inferior', async () => {
    media(true)
    const { controller, invoker } = makeController()

    await controller.open(invoker)
    expect(dialogEl().hasAttribute('data-sheet')).toBe(true)
    controller.dispose()
  })
})

describe('CtaRenderer · presentation dialog', () => {
  it('abre el formulario en el diálogo (no en la tarjeta) y marca la telemetría con activation_mode', async () => {
    const root = document.createElement('greenhouse-cta') as HTMLElement

    document.body.appendChild(root)

    const emitted: Array<{ event: RendererGtmEvent; payload: TelemetryPayload }> = []
    const onPrimary = vi.fn(async (slot: HTMLElement) => (fakeForm(slot), true))

    const renderer = new CtaRenderer({
      root,
      contract: CTA_FIXTURES.partnerDialog.build(),
      copy: resolveCtaSystemCopy(),
      telemetry: { emit: (event, payload) => emitted.push({ event, payload }) },
      onPrimary,
      onIngest: () => undefined,
      emitViewedOnRender: false,
    })

    renderer.render()

    const primary = root.querySelector<HTMLButtonElement>('.ghc-primary')!

    expect(primary.getAttribute('aria-haspopup')).toBe('dialog')
    primary.click()
    await vi.waitFor(() => expect(onPrimary).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(emitted.map(e => e.event)).toContain(RENDERER_GTM_EVENTS.formOpened))

    expect(root.querySelector('.ghc-form-slot')).toBeNull()
    expect(dialogEl().querySelector('greenhouse-form')).not.toBeNull()
    expect(dialogEl().querySelector('[data-ghcta-dialog-title]')?.textContent).toBe('Sumémonos')

    for (const event of [RENDERER_GTM_EVENTS.clicked, RENDERER_GTM_EVENTS.formOpened]) {
      expect(emitted.find(e => e.event === event)?.payload).toMatchObject({ activation_mode: 'dialog' })
    }

    renderer.destroy()
    expect(dialogEl()).toBeNull()
  })

  it('un CTA inline no lleva activation_mode ni abre diálogo', () => {
    const root = document.createElement('greenhouse-cta') as HTMLElement

    document.body.appendChild(root)

    const emitted: Array<{ event: RendererGtmEvent; payload: TelemetryPayload }> = []

    new CtaRenderer({
      root,
      contract: CTA_FIXTURES.default.build(),
      copy: resolveCtaSystemCopy(),
      telemetry: { emit: (event, payload) => emitted.push({ event, payload }) },
      onPrimary: async () => true,
      onIngest: () => undefined,
    }).render()

    expect(root.querySelector('.ghc-primary')?.hasAttribute('aria-haspopup')).toBe(false)
    expect(emitted[0]?.payload).not.toHaveProperty('activation_mode')
  })
})

describe('FormDialogController · éxito', () => {
  it('retira el encabezado del diálogo cuando el formulario muestra su éxito', async () => {
    const { controller, invoker } = makeController()

    await controller.open(invoker)
    expect(dialogEl().hasAttribute('data-success')).toBe(false)

    const card = document.createElement('section')

    card.setAttribute('data-ghf-part', 'success-card')
    dialogEl().querySelector('.ghf-root')!.replaceChildren(card)
    await vi.waitFor(() => expect(dialogEl().hasAttribute('data-success')).toBe(true))
    controller.dispose()
  })
})
