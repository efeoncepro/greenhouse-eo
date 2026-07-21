// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MeetingActivationController } from '../meeting-action'
import { resolveCtaSystemCopy } from '../copy'

const action = {
  kind: 'open_meeting_scheduler' as const,
  meetingSurfaceId: 'efeonce-public-site',
  schedulerKey: 'efeonce-discovery-30',
  fallbackHref: 'https://meetings.hubspot.com/efeonce/diagnostico',
}

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  document.documentElement.style.overflow = ''

  if (!customElements.get('efeonce-meeting-scheduler')) {
    customElements.define('efeonce-meeting-scheduler', class extends HTMLElement {})
  }

  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

describe('MeetingActivationController', () => {
  it('no monta el scheduler antes de activar y conserva la misma instancia al cerrar/reabrir', async () => {
    const invoker = document.createElement('button')

    document.body.appendChild(invoker)

    const controller = new MeetingActivationController({
      doc: document,
      action,
      baseUrl: 'https://greenhouse.efeoncepro.com',
      placement: 'growth_cta_embedded',
      copy: resolveCtaSystemCopy(),
    })

    expect(document.querySelector('efeonce-meeting-scheduler')).toBeNull()

    await expect(controller.open(invoker)).resolves.toBe(true)
    const dialog = document.querySelector('dialog.ghc-meeting-surface') as HTMLDialogElement
    const scheduler = dialog.querySelector('efeonce-meeting-scheduler') as HTMLElement

    expect(dialog.open).toBe(true)
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(scheduler.getAttribute('activation-mode')).toBe('dialog')
    expect(scheduler.getAttribute('scheduler-key')).toBe('efeonce-discovery-30')
    expect(scheduler.querySelector('a')).toBeNull()
    expect(dialog.textContent).not.toContain('agenda alternativa')

    controller.close()
    expect(document.documentElement.style.overflow).toBe('')
    await controller.open(invoker)

    expect(dialog.querySelector('efeonce-meeting-scheduler')).toBe(scheduler)
    controller.dispose()
  })

  it('usa full-screen + guided en viewport móvil sin crear otro controller', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    const invoker = document.createElement('button')

    document.body.appendChild(invoker)

    const controller = new MeetingActivationController({
      doc: document, action, baseUrl: 'https://greenhouse.efeoncepro.com', placement: 'growth_cta_embedded', copy: resolveCtaSystemCopy(),
    })

    await controller.open(invoker)

    const dialog = document.querySelector('dialog.ghc-meeting-surface') as HTMLDialogElement
    const scheduler = dialog.querySelector('efeonce-meeting-scheduler') as HTMLElement

    expect(dialog.hasAttribute('data-full-screen')).toBe(true)
    expect(scheduler.getAttribute('activation-mode')).toBe('full_screen')
    expect(scheduler.getAttribute('max-recipe')).toBe('guided')
    controller.dispose()
  })
})
