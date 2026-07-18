// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { createTelemetryEmitter, RENDERER_GTM_EVENTS, sanitizeTelemetryPayload } from '../telemetry'

describe('growth-cta telemetry — allowlist dura (no-leak)', () => {
  it('descarta claves no allowlisted y valores no escalares', () => {
    const clean = sanitizeTelemetryPayload({
      cta_id: 'cdef-1',
      cta_slug: 'followup',
      email: 'leak@example.com',
      visitor_name: 'Juan Pérez',
      targeting: { routes: ['/**'] },
      priority_score: 100,
      nested: ['a'],
      placement: 'embedded',
    })

    expect(clean).toHaveProperty('cta_id', 'cdef-1')
    expect(clean).toHaveProperty('placement', 'embedded')
    expect(clean).not.toHaveProperty('email')
    expect(clean).not.toHaveProperty('visitor_name')
    expect(clean).not.toHaveProperty('targeting')
    expect(clean).not.toHaveProperty('priority_score')
    expect(clean).not.toHaveProperty('nested')
  })

  it('emite CustomEvent + dataLayer con payload sanitizado', () => {
    const host = document.createElement('div')
    const win = { dataLayer: [] as Array<Record<string, unknown>> } as Window & { dataLayer: Array<Record<string, unknown>> }
    const emitter = createTelemetryEmitter(host, {}, win)

    let detail: Record<string, unknown> | null = null

    host.addEventListener(RENDERER_GTM_EVENTS.clicked, event => {
      detail = (event as CustomEvent<Record<string, unknown>>).detail
    })

    emitter.emit(RENDERER_GTM_EVENTS.clicked, {
      cta_slug: 'followup',
      // @ts-expect-error — simula un caller malicioso/descuidado
      email: 'leak@example.com',
    })

    expect(detail).not.toBeNull()
    expect(detail!).toHaveProperty('event', RENDERER_GTM_EVENTS.clicked)
    expect(detail!).toHaveProperty('cta_slug', 'followup')
    expect(detail!).not.toHaveProperty('email')

    expect(win.dataLayer).toHaveLength(1)
    expect(win.dataLayer[0]).toEqual(detail)
  })

  it('respeta el opt-out de dataLayer (CustomEvent siempre sale)', () => {
    const host = document.createElement('div')
    const win = { dataLayer: [] as Array<Record<string, unknown>> } as Window & { dataLayer: Array<Record<string, unknown>> }
    const emitter = createTelemetryEmitter(host, { gtmDataLayer: false }, win)

    let received = false

    host.addEventListener(RENDERER_GTM_EVENTS.viewed, () => {
      received = true
    })

    emitter.emit(RENDERER_GTM_EVENTS.viewed, { cta_slug: 'followup' })

    expect(received).toBe(true)
    expect(win.dataLayer).toHaveLength(0)
  })

  it('los nombres de evento usan el namespace canónico greenhouse_cta_* (arch §13)', () => {
    for (const eventName of Object.values(RENDERER_GTM_EVENTS)) {
      expect(eventName).toMatch(/^greenhouse_cta_[a-z_]+$/)
    }
  })
})
