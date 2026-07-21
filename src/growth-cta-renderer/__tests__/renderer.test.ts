// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CTA_FIXTURES } from '../fixtures'
import { CtaRenderer, resolveStyleVariant, resolveVisualUrl } from '../renderer'
import { resolveCtaSystemCopy } from '../copy'
import { RENDERER_GTM_EVENTS, type RendererGtmEvent, type TelemetryPayload } from '../telemetry'

const makeRenderer = (overrides: {
  fixture?: keyof typeof CTA_FIXTURES
  onPrimary?: (slot: HTMLElement) => Promise<boolean>
  onTaskPrimary?: (invoker: HTMLButtonElement) => Promise<boolean>
  onTaskIntent?: () => void
  emitViewedOnRender?: boolean
} = {}) => {
  const root = document.createElement('greenhouse-cta') as HTMLElement

  document.body.appendChild(root)

  const emitted: Array<{ event: RendererGtmEvent; payload: TelemetryPayload }> = []
  const ingested: Array<{ eventKind: string; extra?: Record<string, unknown> }> = []

  const renderer = new CtaRenderer({
    root,
    contract: CTA_FIXTURES[overrides.fixture ?? 'default'].build(),
    copy: resolveCtaSystemCopy(),
    telemetry: { emit: (event, payload) => emitted.push({ event, payload }) },
    ctaLocation: 'report_followup',
    pageUri: '/blog/post',
    onPrimary: overrides.onPrimary ?? (async () => true),
    onTaskPrimary: overrides.onTaskPrimary,
    onTaskIntent: overrides.onTaskIntent,
    onIngest: (eventKind, extra) => ingested.push({ eventKind, extra: extra as Record<string, unknown> | undefined }),
    emitViewedOnRender: overrides.emitViewedOnRender,
  })

  return { root, renderer, emitted, ingested }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('CtaRenderer', () => {
  it('pinta el card con copy del contrato + emite viewed (dataLayer + ingest Tier B, TASK-1428/1429)', () => {
    const { root, renderer, emitted, ingested } = makeRenderer()

    renderer.render()

    expect(root.dataset.ghcState).toBe('visible')
    expect(root.querySelector('.ghc-headline')?.textContent).toBe('¿Cómo ve la IA a tu marca?')
    expect(root.querySelector('.ghc-primary')?.textContent).toBe('Haz el diagnóstico gratis')
    expect(root.querySelector('.ghc-dismiss')?.getAttribute('aria-label')).toBe('Ahora no')

    expect(emitted.map(e => e.event)).toEqual([RENDERER_GTM_EVENTS.viewed])
    expect(emitted[0].payload).toMatchObject({ cta_location: 'report_followup', placement: 'embedded' })

    // viewed va al ingest como Tier B (rollup agregado server-side, jamás el ledger).
    expect(ingested.map(i => i.eventKind)).toEqual(['viewed'])
  })

  it('emitViewedOnRender=false → viewed queda gated hasta notifyViewed (visibility-gated, una sola vez)', () => {
    const { root, renderer, emitted, ingested } = makeRenderer({ emitViewedOnRender: false })

    renderer.render()

    expect(root.dataset.ghcState).toBe('visible')
    expect(emitted).toHaveLength(0)
    expect(ingested).toHaveLength(0)

    renderer.notifyViewed()
    renderer.notifyViewed()

    expect(emitted.map(e => e.event)).toEqual([RENDERER_GTM_EVENTS.viewed])
    expect(ingested.map(i => i.eventKind)).toEqual(['viewed'])
  })

  it('click primary → clicked + form_opened (telemetría + ingest) y monta el slot del form', async () => {
    const { root, renderer, emitted, ingested } = makeRenderer()

    renderer.render()
    ;(root.querySelector('.ghc-primary') as HTMLButtonElement).click()
    await vi.waitFor(() => expect(root.dataset.ghcState).toBe('form_open'))

    expect(emitted.map(e => e.event)).toEqual([
      RENDERER_GTM_EVENTS.viewed,
      RENDERER_GTM_EVENTS.clicked,
      RENDERER_GTM_EVENTS.formOpened,
    ])
    expect(ingested.map(i => i.eventKind)).toEqual(['viewed', 'clicked', 'form_opened'])
    expect(root.querySelector('.ghc-form-slot')).not.toBeNull()
  })

  it('handoff roto (onPrimary false) → restaura el CTA + error fail-closed', async () => {
    const { root, renderer, emitted, ingested } = makeRenderer({ onPrimary: async () => false })

    renderer.render()
    ;(root.querySelector('.ghc-primary') as HTMLButtonElement).click()
    await vi.waitFor(() =>
      expect(emitted.map(e => e.event)).toContain(RENDERER_GTM_EVENTS.error),
    )

    expect(root.dataset.ghcState).toBe('visible')
    expect(root.querySelector('.ghc-form-slot')).toBeNull()
    expect((root.querySelector('.ghc-primary') as HTMLButtonElement).disabled).toBe(false)
    expect(ingested.at(-1)).toMatchObject({ eventKind: 'error', extra: { reason: 'form_handoff_failed' } })
  })

  it('dismiss → colapsa + telemetría + ingest', () => {
    const { root, renderer, emitted, ingested } = makeRenderer()

    renderer.render()
    ;(root.querySelector('.ghc-dismiss') as HTMLButtonElement).click()

    expect(root.dataset.ghcState).toBe('dismissed')
    expect(root.children).toHaveLength(0)
    expect(emitted.at(-1)?.event).toBe(RENDERER_GTM_EVENTS.dismissed)
    expect(ingested.at(-1)?.eventKind).toBe('dismissed')
  })

  it('notifyFormSubmitted propaga el join form_submission_id', () => {
    const { renderer, emitted, ingested } = makeRenderer()

    renderer.render()
    renderer.notifyFormSubmitted('fsub-123')

    expect(emitted.at(-1)?.event).toBe(RENDERER_GTM_EVENTS.formSubmitted)
    expect(emitted.at(-1)?.payload).toMatchObject({ form_submission_id: 'fsub-123' })
    expect(ingested.at(-1)).toMatchObject({ eventKind: 'form_submitted', extra: { formSubmissionId: 'fsub-123' } })
  })

  it('style variants: conocida se respeta, desconocida colapsa a default', () => {
    const { root, renderer } = makeRenderer({ fixture: 'spotlight' })

    renderer.render()
    expect(root.dataset.ghcVariant).toBe('spotlight')

    expect(resolveStyleVariant('minimal')).toBe('minimal')
    expect(resolveStyleVariant('glitter-2027')).toBe('default')
    expect(resolveStyleVariant(undefined)).toBe('default')
  })

  it('el slot visual solo acepta URLs https/relativas', () => {
    expect(resolveVisualUrl('https://cdn.example.com/x.webp')).toBe('https://cdn.example.com/x.webp')
    expect(resolveVisualUrl('/images/x.webp')).toBe('/images/x.webp')
    expect(resolveVisualUrl('gs://bucket/x.webp')).toBeNull()
    expect(resolveVisualUrl(undefined)).toBeNull()
  })

  it('scheduler nativo abre una task surface sin reemplazar ni expandir el CTA', async () => {
    const opened = vi.fn(async () => true)
    const intent = vi.fn()

    const { root, renderer, emitted, ingested } = makeRenderer({
      fixture: 'nativeMeetingScheduler',
      onTaskPrimary: opened,
      onTaskIntent: intent,
    })

    renderer.render()
    const primary = root.querySelector('.ghc-primary') as HTMLButtonElement

    primary.dispatchEvent(new Event('focus'))
    primary.click()
    await vi.waitFor(() => expect(opened).toHaveBeenCalledTimes(1))

    expect(intent).toHaveBeenCalledTimes(1)
    expect(root.dataset.ghcState).toBe('visible')
    expect(root.querySelector('.ghc-form-slot')).toBeNull()
    expect(emitted.map(item => item.event)).toEqual([
      RENDERER_GTM_EVENTS.viewed,
      RENDERER_GTM_EVENTS.clicked,
      RENDERER_GTM_EVENTS.actionStarted,
    ])
    expect(ingested.map(item => item.eventKind)).toEqual(['viewed', 'clicked', 'action_started'])

    primary.click()
    await vi.waitFor(() => expect(opened).toHaveBeenCalledTimes(2))
    expect(emitted.filter(item => item.event === RENDERER_GTM_EVENTS.clicked)).toHaveLength(1)
    expect(emitted.filter(item => item.event === RENDERER_GTM_EVENTS.actionStarted)).toHaveLength(1)
  })
})

/**
 * TASK-1431 — familia navigate: el primary es un `<a href>` REAL (semántica nativa
 * de link), telemetría sale ANTES de navegar, pending es single-dispatch accesible
 * con recovery acotado, y todo contrato fuera del espejo falla closed.
 */
describe('CtaRenderer — familia navigate (TASK-1431)', () => {
  const preventNav = (event: Event) => event.preventDefault()

  const makeNavigate = (
    overrides: {
      fixture?: keyof typeof CTA_FIXTURES
      action?: Record<string, unknown>
      inertNavigation?: boolean
    } = {},
  ) => {
    const root = document.createElement('greenhouse-cta') as HTMLElement

    document.body.appendChild(root)

    const contract = CTA_FIXTURES[overrides.fixture ?? 'linkUrlInternal'].build()

    if (overrides.action) {
      ;(contract as { action: unknown }).action = overrides.action
    }

    const emitted: Array<{ event: RendererGtmEvent; payload: TelemetryPayload }> = []
    const ingested: Array<{ eventKind: string; extra?: Record<string, unknown> }> = []

    const renderer = new CtaRenderer({
      root,
      contract,
      copy: resolveCtaSystemCopy(),
      telemetry: { emit: (event, payload) => emitted.push({ event, payload }) },
      onPrimary: async () => true,
      onIngest: (eventKind, extra) => ingested.push({ eventKind, extra: extra as Record<string, unknown> | undefined }),
      inertNavigation: overrides.inertNavigation,
    })

    return { root, renderer, emitted, ingested }
  }

  beforeEach(() => {
    // jsdom no implementa navegación: cancelar el default evita el ruido sin tocar
    // el handler del renderer (que corre antes en la fase de bubbling).
    document.addEventListener('click', preventNav)
  })

  afterEach(() => {
    document.removeEventListener('click', preventNav)
    vi.useRealTimers()
  })

  it('interno same-context: anchor real con href, sin target ni rel', () => {
    const { root, renderer } = makeNavigate()

    renderer.render()

    const anchor = root.querySelector('.ghc-primary') as HTMLAnchorElement

    expect(anchor.tagName).toBe('A')
    expect(anchor.getAttribute('href')).toBe('/servicios/aeo')
    expect(anchor.getAttribute('target')).toBeNull()
    expect(anchor.getAttribute('rel')).toBeNull()
    expect(root.dataset.ghcState).toBe('visible')
  })

  it('externo + newContext: target=_blank + rel seguro + affordance sr-only de pestaña nueva', () => {
    const { root, renderer } = makeNavigate({ fixture: 'linkUrlExternalNewTab' })

    renderer.render()

    const anchor = root.querySelector('.ghc-primary') as HTMLAnchorElement

    expect(anchor.getAttribute('href')).toBe('https://efeoncepro.com/blog/')
    expect(anchor.target).toBe('_blank')
    expect(anchor.rel).toBe('noopener noreferrer')
    expect(anchor.querySelector('.ghc-sr-only')?.textContent).toContain('pestaña nueva')
  })

  it('externo same-context: rel seguro igual (referrer no cruza a terceros)', () => {
    const { root, renderer } = makeNavigate({
      action: { kind: 'link_url', href: 'https://efeoncepro.com/servicios', newContext: false },
    })

    renderer.render()

    const anchor = root.querySelector('.ghc-primary') as HTMLAnchorElement

    expect(anchor.getAttribute('target')).toBeNull()
    expect(anchor.rel).toBe('noopener noreferrer')
  })

  it('click plain same-context: clicked UNA vez (telemetría + ingest antes de navegar) + pending accesible + guard doble activación', () => {
    vi.useFakeTimers()

    const { root, renderer, emitted, ingested } = makeNavigate()

    renderer.render()

    const anchor = root.querySelector('.ghc-primary') as HTMLAnchorElement

    anchor.click()

    expect(emitted.map(e => e.event)).toEqual([RENDERER_GTM_EVENTS.viewed, RENDERER_GTM_EVENTS.clicked])
    expect(ingested.map(i => i.eventKind)).toEqual(['viewed', 'clicked'])
    expect(anchor.getAttribute('aria-disabled')).toBe('true')
    expect(anchor.dataset.ghcPending).toBe('true')
    expect(root.querySelector('[role="status"]')?.textContent).toBe('Abriendo el enlace…')

    // Doble activación bloqueada mientras el dispatch está en vuelo.
    anchor.click()
    expect(emitted.filter(e => e.event === RENDERER_GTM_EVENTS.clicked)).toHaveLength(1)
    expect(ingested.filter(i => i.eventKind === 'clicked')).toHaveLength(1)
  })

  it('recovery acotado: si la página sigue acá tras el timeout, restaura control + error navigation_stalled', () => {
    vi.useFakeTimers()

    const { root, renderer, emitted, ingested } = makeNavigate()

    renderer.render()

    const anchor = root.querySelector('.ghc-primary') as HTMLAnchorElement

    anchor.click()
    vi.advanceTimersByTime(4000)

    expect(anchor.getAttribute('aria-disabled')).toBeNull()
    expect(anchor.dataset.ghcPending).toBeUndefined()
    expect(root.querySelector('[role="status"]')).toBeNull()
    expect(emitted.at(-1)?.event).toBe(RENDERER_GTM_EVENTS.error)
    expect(emitted.at(-1)?.payload).toMatchObject({ reason_class: 'navigation_stalled' })
    expect(ingested.at(-1)).toMatchObject({ eventKind: 'error', extra: { reason: 'navigation_stalled' } })

    // Restaurado: una nueva activación vuelve a despachar.
    anchor.click()
    expect(ingested.filter(i => i.eventKind === 'clicked')).toHaveLength(2)
  })

  it('newContext (target=_blank): la página actual permanece usable, sin pending', () => {
    const { root, renderer } = makeNavigate({ fixture: 'linkUrlExternalNewTab' })

    renderer.render()

    const anchor = root.querySelector('.ghc-primary') as HTMLAnchorElement

    anchor.click()

    expect(anchor.getAttribute('aria-disabled')).toBeNull()
    expect(anchor.dataset.ghcPending).toBeUndefined()
  })

  it('kind desconocido (contrato más nuevo que el bundle): fail-closed sin card + action_unsupported', () => {
    const { root, renderer, emitted, ingested } = makeNavigate({
      action: { kind: 'download_asset', href: 'https://x.dev/a.pdf', newContext: false },
    })

    renderer.render()

    expect(root.dataset.ghcState).toBe('empty')
    expect(root.querySelector('.ghc-card')).toBeNull()
    expect(emitted.at(-1)?.payload).toMatchObject({ reason_class: 'action_unsupported' })
    expect(ingested.at(-1)).toMatchObject({ eventKind: 'error', extra: { reason: 'action_unsupported' } })
  })

  it('href fuera del contrato (defensa en profundidad): fail-closed + action_destination_invalid', () => {
    for (const href of ['javascript:alert(1)', '//evil.com/x', 'http://plain.example.com/']) {
      document.body.innerHTML = ''

      const { root, renderer } = makeNavigate({ action: { kind: 'link_url', href, newContext: false } })

      renderer.render()

      expect(root.dataset.ghcState).toBe('empty')
      expect(root.querySelector('.ghc-card')).toBeNull()
    }
  })

  it('inertNavigation (preview): telemetría intacta, pending demo y restore SIN error de navegación', () => {
    vi.useFakeTimers()

    const { root, renderer, emitted, ingested } = makeNavigate({ inertNavigation: true })

    renderer.render()

    const anchor = root.querySelector('.ghc-primary') as HTMLAnchorElement

    anchor.click()

    expect(ingested.filter(i => i.eventKind === 'clicked')).toHaveLength(1)
    expect(anchor.dataset.ghcPending).toBe('true')

    vi.advanceTimersByTime(4000)

    expect(anchor.dataset.ghcPending).toBeUndefined()
    expect(emitted.filter(e => e.event === RENDERER_GTM_EVENTS.error)).toHaveLength(0)
  })
})
