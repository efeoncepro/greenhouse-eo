import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({ query: vi.fn() }))

vi.mock('@/lib/db', () => db)

import { BRAND_RENDER_STUCK_SIGNAL_ID, getBrandRenderStuckSignal } from './brand-render-stuck'

beforeEach(() => vi.clearAllMocks())

describe('brand.render.stuck_job', () => {
  it('steady 0 → ok', async () => {
    db.query.mockResolvedValueOnce([{ en_cola: 0, lease_vencido: 0 }])

    const signal = await getBrandRenderStuckSignal()

    expect(signal).toMatchObject({ signalId: BRAND_RENDER_STUCK_SIGNAL_ID, moduleKey: 'brand_render', kind: 'data_quality', severity: 'ok' })
  })

  it('1-2 → warning; >2 → error, y el resumen nombra ambas poblaciones', async () => {
    db.query.mockResolvedValueOnce([{ en_cola: 1, lease_vencido: 1 }])

    const warning = await getBrandRenderStuckSignal()

    expect(warning.severity).toBe('warning')
    expect(warning.summary).toContain('1 en cola')
    expect(warning.summary).toContain('1 en proceso')

    db.query.mockResolvedValueOnce([{ en_cola: 3, lease_vencido: 0 }])

    expect((await getBrandRenderStuckSignal()).severity).toBe('error')
  })
})
