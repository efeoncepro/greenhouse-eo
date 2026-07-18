import { describe, expect, it } from 'vitest'

import { RENDERER_ALLOWED_PAYLOAD_KEYS, RENDERER_GTM_EVENTS } from '@/growth-cta-renderer/telemetry'

import { CTA_GTM_EVENT_NAMES, CTA_TELEMETRY_ALLOWED_PAYLOAD_KEYS } from '../contracts'

/**
 * TASK-1340 — Paridad SoT server ↔ espejo renderer de la telemetría CTA.
 * El SoT vive en `src/lib/growth/ctas/contracts.ts`; el bundle público lleva su
 * espejo (no puede importar server code). Este test los mantiene idénticos —
 * agregar un evento/param en un solo lado rompe acá, no en producción.
 */
describe('growth-cta telemetry SoT parity', () => {
  it('los nombres de evento del renderer son exactamente los del SoT', () => {
    expect([...Object.values(RENDERER_GTM_EVENTS)].sort()).toEqual([...CTA_GTM_EVENT_NAMES].sort())
  })

  it('la allowlist del renderer es exactamente la del SoT', () => {
    expect([...RENDERER_ALLOWED_PAYLOAD_KEYS].sort()).toEqual([...CTA_TELEMETRY_ALLOWED_PAYLOAD_KEYS].sort())
  })
})
