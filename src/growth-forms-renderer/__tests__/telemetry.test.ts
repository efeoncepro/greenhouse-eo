// @vitest-environment jsdom

import { describe, expect, it, beforeEach } from 'vitest'

import { createTelemetryEmitter, sanitizeTelemetryPayload } from '../telemetry'

describe('growth-forms-renderer · telemetry', () => {
  beforeEach(() => {
    ;(window as unknown as { dataLayer?: unknown[] }).dataLayer = []
  })

  it('strips forbidden/raw keys, keeps only allowlisted scalars', () => {
    const out = sanitizeTelemetryPayload({
      form_slug: 'ai-visibility-intake',
      email: 'leak@x.com',
      hubspot_property: 'firstname',
      reason_class: 'email',
      nested: { a: 1 },
      surface_id: 'astro',
    })

    expect(out).toEqual({ form_slug: 'ai-visibility-intake', reason_class: 'email', surface_id: 'astro' })
    expect(out).not.toHaveProperty('email')
    expect(out).not.toHaveProperty('hubspot_property')
  })

  it('dispatches CustomEvent on host and pushes to dataLayer', () => {
    const host = document.createElement('div')
    const seen: string[] = []

    host.addEventListener('gh_form_viewed', e => seen.push((e as CustomEvent).type))
    const emitter = createTelemetryEmitter(host, { enabled: true, gtmDataLayer: true }, { form_slug: 's' })

    emitter.emit('gh_form_viewed', { email: 'leak@x.com', reason_class: 'ok' })

    expect(seen).toEqual(['gh_form_viewed'])
    const dl = (window as unknown as { dataLayer: Array<Record<string, unknown>> }).dataLayer

    expect(dl).toHaveLength(1)
    expect(dl[0]).toMatchObject({ event: 'gh_form_viewed', form_slug: 's', reason_class: 'ok' })
    expect(dl[0]).not.toHaveProperty('email')
  })

  it('respects disabled policy and dataLayer opt-out', () => {
    const host = document.createElement('div')

    createTelemetryEmitter(host, { enabled: false }, {}).emit('gh_form_viewed', {})
    createTelemetryEmitter(host, { enabled: true, gtmDataLayer: false }, {}).emit('gh_form_viewed', {})

    const dl = (window as unknown as { dataLayer: unknown[] }).dataLayer

    expect(dl).toHaveLength(0)
  })
})
