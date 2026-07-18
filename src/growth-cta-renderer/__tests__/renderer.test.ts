// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CTA_FIXTURES } from '../fixtures'
import { CtaRenderer, resolveStyleVariant, resolveVisualUrl } from '../renderer'
import { resolveCtaSystemCopy } from '../copy'
import { RENDERER_GTM_EVENTS, type RendererGtmEvent, type TelemetryPayload } from '../telemetry'

const makeRenderer = (overrides: {
  fixture?: keyof typeof CTA_FIXTURES
  onPrimary?: (slot: HTMLElement) => Promise<boolean>
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
    onIngest: (eventKind, extra) => ingested.push({ eventKind, extra: extra as Record<string, unknown> | undefined }),
  })

  return { root, renderer, emitted, ingested }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('CtaRenderer', () => {
  it('pinta el card con copy del contrato + emite viewed SOLO direccional (sin ingest)', () => {
    const { root, renderer, emitted, ingested } = makeRenderer()

    renderer.render()

    expect(root.dataset.ghcState).toBe('visible')
    expect(root.querySelector('.ghc-headline')?.textContent).toBe('¿Cómo ve la IA a tu marca?')
    expect(root.querySelector('.ghc-primary')?.textContent).toBe('Haz el diagnóstico gratis')
    expect(root.querySelector('.ghc-dismiss')?.getAttribute('aria-label')).toBe('Ahora no')

    expect(emitted.map(e => e.event)).toEqual([RENDERER_GTM_EVENTS.viewed])
    expect(emitted[0].payload).toMatchObject({ cta_location: 'report_followup', placement: 'embedded' })
    expect(ingested).toHaveLength(0)
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
    expect(ingested.map(i => i.eventKind)).toEqual(['clicked', 'form_opened'])
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
})
