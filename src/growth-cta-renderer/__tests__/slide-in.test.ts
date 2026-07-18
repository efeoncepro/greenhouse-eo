// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CTA_FIXTURES } from '../fixtures'
import { resolveCtaSystemCopy } from '../copy'
import { SlideInController } from '../slide-in'
import { markLocallyDismissed } from '../visitor'

/**
 * TASK-1429 — controller del slide_in: waiting sin DOM focusable, apertura pasiva
 * sin robar foco, Escape con focus dentro, dismiss persiste ANTES de la salida
 * visual (DOM retenido para el exit CSS), guard local de sesión y focus return.
 */

const makeController = (overrides: { triggerMode?: 'default' | 'immediate' } = {}) => {
  const host = document.createElement('greenhouse-cta') as HTMLElement

  document.body.appendChild(host)

  const emitted: string[] = []
  const ingested: string[] = []

  const controller = new SlideInController({
    doc: document,
    host,
    contract: CTA_FIXTURES.slideIn.build(),
    copy: resolveCtaSystemCopy(),
    telemetry: { emit: event => emitted.push(event) },
    ctaLocation: 'interruptive_test',
    onPrimary: async () => true,
    onIngest: eventKind => ingested.push(eventKind),
    triggerMode: overrides.triggerMode ?? 'immediate',
  })

  return { host, controller, emitted, ingested }
}

beforeEach(() => {
  document.body.innerHTML = ''
  sessionStorage.clear()
  localStorage.clear()
})

describe('SlideInController', () => {
  it('waiting (trigger default) → shell montado SIN contenido focusable ni foco robado', () => {
    const { host, controller } = makeController({ triggerMode: 'default' })

    controller.arm()

    const shell = host.querySelector('.ghc-slidein') as HTMLElement

    expect(shell).not.toBeNull()
    expect(shell.dataset.ghcState).toBe('waiting')
    expect(shell.querySelector('button')).toBeNull()
    expect(shell.getAttribute('role')).toBe('complementary')
    expect(shell.getAttribute('aria-modal')).toBeNull()

    controller.destroy()
  })

  it('apertura (immediate) → card completo, no modal, sin focus steal', () => {
    const anchor = document.createElement('button')

    document.body.appendChild(anchor)
    anchor.focus()

    const { host, controller } = makeController()

    controller.arm()

    const shell = host.querySelector('.ghc-slidein') as HTMLElement

    expect(shell.dataset.ghcState).toBe('visible')
    expect(shell.querySelector('.ghc-headline')).not.toBeNull()
    expect(shell.querySelector('.ghc-primary')).not.toBeNull()
    expect(shell.querySelector('.ghc-dismiss')).not.toBeNull()
    expect(shell.getAttribute('aria-modal')).toBeNull()

    // Passive reveal: el foco NO se movió al abrir.
    expect(document.activeElement).toBe(anchor)

    controller.destroy()
  })

  it('dismiss → persistencia (ingest + guard local) ANTES del estado visual; DOM retenido para el exit CSS', () => {
    const { host, controller, ingested } = makeController()

    controller.arm()

    const shell = host.querySelector('.ghc-slidein') as HTMLElement

    ;(shell.querySelector('.ghc-dismiss') as HTMLButtonElement).click()

    expect(ingested).toContain('dismissed')
    expect(shell.dataset.ghcState).toBe('dismissed')

    // DOM retenido (retainDomOnDismiss): el CSS pinta la salida hacia display:none.
    expect(shell.querySelector('.ghc-card')).not.toBeNull()

    // Guard local: re-armar en la MISMA sesión no reabre.
    const again = makeController()

    again.controller.arm()
    expect(again.host.querySelector('.ghc-slidein')).toBeNull()

    controller.destroy()
    again.controller.destroy()
  })

  it('Escape con foco dentro → dismiss + focus return al elemento previo', () => {
    const anchor = document.createElement('button')

    document.body.appendChild(anchor)
    anchor.focus()

    const { host, controller } = makeController()

    controller.arm()

    const shell = host.querySelector('.ghc-slidein') as HTMLElement
    const primary = shell.querySelector('.ghc-primary') as HTMLButtonElement

    primary.focus()
    expect(document.activeElement).toBe(primary)

    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(shell.dataset.ghcState).toBe('dismissed')
    expect(document.activeElement).toBe(anchor)

    controller.destroy()
  })

  it('guard local pre-existente → arm() no monta shell (cero DOM)', () => {
    markLocallyDismissed(CTA_FIXTURES.slideIn.build().cta.ctaId)

    const { host, controller } = makeController()

    controller.arm()

    expect(host.querySelector('.ghc-slidein')).toBeNull()

    controller.destroy()
  })

  it('trigger por dwell: abre tras el timeout gobernado del bundle', () => {
    vi.useFakeTimers()

    try {
      const { host, controller } = makeController({ triggerMode: 'default' })

      controller.arm()

      const shell = host.querySelector('.ghc-slidein') as HTMLElement

      expect(shell.dataset.ghcState).toBe('waiting')

      vi.advanceTimersByTime(8000)

      expect(shell.dataset.ghcState).toBe('visible')

      controller.destroy()
    } finally {
      vi.useRealTimers()
    }
  })
})
