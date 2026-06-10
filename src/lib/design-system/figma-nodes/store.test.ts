import { describe, expect, it, vi } from 'vitest'

import { DesignSystemFigmaLinkError, linkDesignSystemFigmaNode } from './store'

// The validation portion (surface-key shape, parse, AXIS allowlist) runs BEFORE
// any DB call, so these fail-closed paths are testable without a live database.
// The happy-path upsert/supersede/audit is verified by the live smoke (TASK-1072
// Slice 1) and the runtime SSOT verification (Slice 3).
//
// Guard: if any of these throws reaches the DB layer the test would hang/throw a
// connection error instead of the typed DesignSystemFigmaLinkError — so a green
// run also proves the fail-closed checks short-circuit before the transaction.
vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn(async () => {
    throw new Error('DB must not be touched on a fail-closed path')
  }),
  withGreenhousePostgresTransaction: vi.fn(async () => {
    throw new Error('DB must not be touched on a fail-closed path')
  })
}))

const AXIS_URL = '@https://www.figma.com/design/yyMksCoijfMaIoYplXKZaR/Design-System-%7C-Vuexy-%3E-AXIS?node-id=11669-40645&m=dev'

describe('linkDesignSystemFigmaNode — fail-closed validation (TASK-1072)', () => {
  it('rejects an invalid surface key before parsing', async () => {
    await expect(
      linkDesignSystemFigmaNode({ surfaceKey: '/finance/expenses', url: AXIS_URL, actorUserId: 'u' })
    ).rejects.toMatchObject({ code: 'invalid_surface_key' } satisfies Partial<DesignSystemFigmaLinkError>)
  })

  it('rejects a non-Figma / unparseable URL', async () => {
    await expect(
      linkDesignSystemFigmaNode({ surfaceKey: '/design-system/typography', url: 'not a url', actorUserId: 'u' })
    ).rejects.toMatchObject({ code: 'invalid_figma_url' })
  })

  it('rejects a Figma node from a non-AXIS file (allowlist fail-closed)', async () => {
    await expect(
      linkDesignSystemFigmaNode({
        surfaceKey: '/design-system/typography',
        url: 'https://www.figma.com/design/SOMEOTHERFILE/Proj?node-id=10-20',
        actorUserId: 'u'
      })
    ).rejects.toMatchObject({ code: 'figma_node_not_axis' })
  })

  it('throws DesignSystemFigmaLinkError instances (typed code surface)', async () => {
    const err = await linkDesignSystemFigmaNode({
      surfaceKey: '/design-system/typography',
      url: 'garbage',
      actorUserId: 'u'
    }).catch(e => e)

    expect(err).toBeInstanceOf(DesignSystemFigmaLinkError)
  })
})
