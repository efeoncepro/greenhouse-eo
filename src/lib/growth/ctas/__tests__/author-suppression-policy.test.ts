import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as StoreModule from '../store'

/**
 * TASK-1430 — `authorDraftCta` acepta `suppressionPolicy` opcional (el paso
 * targeting/supresión del cockpit lo persiste): inválido ⇒ `suppression_policy_invalid`;
 * válido ⇒ llega al store; ausente ⇒ backward-compatible (el store persiste `{}`).
 */

const storeMock = vi.hoisted(() => ({ insertCtaDraft: vi.fn() }))

vi.mock('../store', async importOriginal => ({
  ...(await importOriginal<typeof StoreModule>()),
  insertCtaDraft: storeMock.insertCtaDraft,
}))

import { authorDraftCta } from '../commands'

const BASE_INPUT = {
  slug: 'demo-cta',
  name: 'Demo',
  purpose: 'lead_magnet',
  placement: 'slide_in' as const,
  content: { headline: 'Hola', ctaLabel: 'Descargar' },
  actionPolicy: { kind: 'link_url', url: '/recursos/guia' },
}

beforeEach(() => {
  vi.clearAllMocks()
  storeMock.insertCtaDraft.mockResolvedValue({ ctaId: 'c1', ctaVersionId: 'v1', version: 1 })
})

describe('authorDraftCta — suppressionPolicy (TASK-1430)', () => {
  it('rechaza una suppression policy inválida con detail estable', async () => {
    const result = await authorDraftCta({
      ...BASE_INPUT,
      suppressionPolicy: { dismissCooldownDays: -4 },
    })

    expect(result).toEqual({ ok: false, reason: 'invalid_input', details: ['suppression_policy_invalid'] })
    expect(storeMock.insertCtaDraft).not.toHaveBeenCalled()
  })

  it('pasa la policy válida al store', async () => {
    const suppressionPolicy = {
      dismissCooldownDays: 30,
      suppressAfterConversion: true,
      maxImpressionsPerWindow: 1,
      windowHours: 168,
    }

    const result = await authorDraftCta({ ...BASE_INPUT, suppressionPolicy })

    expect(result.ok).toBe(true)
    expect(storeMock.insertCtaDraft).toHaveBeenCalledWith(
      expect.objectContaining({ suppressionPolicy }),
    )
  })

  it('sin suppressionPolicy sigue siendo válido (backward compatible)', async () => {
    const result = await authorDraftCta(BASE_INPUT)

    expect(result.ok).toBe(true)
    expect(storeMock.insertCtaDraft).toHaveBeenCalledWith(
      expect.objectContaining({ suppressionPolicy: undefined }),
    )
  })
})
